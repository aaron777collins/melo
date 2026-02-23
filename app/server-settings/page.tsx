"use client";

/**
 * Server Settings Page
 * 
 * Main server settings page that allows users to edit server name,
 * description, and avatar. Integrates with Matrix API.
 */

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Settings, ChevronLeft, Loader2, AlertCircle, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ServerSettingsForm } from "@/components/server-settings/server-settings-form";
import { getServerSettings, checkServerSettingsPermissions } from "@/lib/matrix/server-settings";
import { getClient } from "@/lib/matrix/client";
import type { ServerSettings, ServerSettingsPermissions } from "@/lib/matrix/types/server-settings";

// =============================================================================
// Types
// =============================================================================

interface PageState {
  status: "loading" | "loaded" | "error" | "no-server";
  settings: ServerSettings | null;
  permissions: ServerSettingsPermissions | null;
  roomId: string | null;
  serverName: string | null;
  error: string | null;
}

// =============================================================================
// Component
// =============================================================================

export default function ServerSettingsPage() {
  const router = useRouter();
  
  const [pageState, setPageState] = useState<PageState>({
    status: "loading",
    settings: null,
    permissions: null,
    roomId: null,
    serverName: null,
    error: null,
  });

  // =============================================================================
  // Load Server Settings
  // =============================================================================

  const loadServerSettings = useCallback(async () => {
    try {
      const client = getClient();
      if (!client) {
        setPageState(prev => ({
          ...prev,
          status: "error",
          error: "Matrix client not available. Please sign in.",
        }));
        return;
      }

      // Get the user's rooms/spaces
      const rooms = client.getRooms();
      
      // Find the first space (server) the user is in
      // In a real implementation, this would be the selected/current server
      const spaces = rooms.filter(room => {
        const createEvent = room.currentState.getStateEvents("m.room.create", "");
        const roomType = createEvent?.getContent()?.type;
        return roomType === "m.space";
      });

      if (spaces.length === 0) {
        // Try to find any room if no spaces
        const firstRoom = rooms[0];
        if (!firstRoom) {
          setPageState(prev => ({
            ...prev,
            status: "no-server",
            error: null,
          }));
          return;
        }

        // Use the first room
        const roomId = firstRoom.roomId;
        const userId = client.getUserId();

        const [settings, permissions] = await Promise.all([
          getServerSettings(roomId),
          userId ? checkServerSettingsPermissions(roomId, userId) : null,
        ]);

        setPageState({
          status: "loaded",
          settings,
          permissions: permissions || {
            canEditName: false,
            canEditDescription: false,
            canEditAvatar: false,
            canEditAll: false,
          },
          roomId,
          serverName: settings.name,
          error: null,
        });
      } else {
        // Use the first space
        const space = spaces[0];
        const roomId = space.roomId;
        const userId = client.getUserId();

        const [settings, permissions] = await Promise.all([
          getServerSettings(roomId),
          userId ? checkServerSettingsPermissions(roomId, userId) : null,
        ]);

        setPageState({
          status: "loaded",
          settings,
          permissions: permissions || {
            canEditName: false,
            canEditDescription: false,
            canEditAvatar: false,
            canEditAll: false,
          },
          roomId,
          serverName: settings.name,
          error: null,
        });
      }
    } catch (error: any) {
      console.error("Failed to load server settings:", error);
      setPageState(prev => ({
        ...prev,
        status: "error",
        error: error.message || "Failed to load server settings",
      }));
    }
  }, []);

  useEffect(() => {
    loadServerSettings();
  }, [loadServerSettings]);

  // =============================================================================
  // Handlers
  // =============================================================================

  const handleSettingsUpdated = useCallback((newSettings: ServerSettings) => {
    setPageState(prev => ({
      ...prev,
      settings: newSettings,
      serverName: newSettings.name,
    }));
  }, []);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // =============================================================================
  // Render Loading State
  // =============================================================================

  if (pageState.status === "loading") {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <header className="h-12 flex items-center px-4 border-b border-zinc-800 bg-[#2B2D31]">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-zinc-400" />
            <h1 className="text-white font-semibold">Server Settings</h1>
          </div>
        </header>

        {/* Loading Content */}
        <div
          data-testid="loading-indicator"
          className="flex-1 flex items-center justify-center"
        >
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
            <p className="text-zinc-400">Loading server settings...</p>
          </div>
        </div>
      </div>
    );
  }

  // =============================================================================
  // Render Error State
  // =============================================================================

  if (pageState.status === "error") {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <header className="h-12 flex items-center px-4 border-b border-zinc-800 bg-[#2B2D31]">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="text-zinc-400 hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Settings className="h-5 w-5 text-zinc-400" />
            <h1 className="text-white font-semibold">Server Settings</h1>
          </div>
        </header>

        {/* Error Content */}
        <div
          data-testid="error-state"
          className="flex-1 flex items-center justify-center p-6"
        >
          <div className="text-center max-w-md">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Unable to Load Settings
            </h2>
            <p className="text-zinc-400 mb-6">{pageState.error}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={handleBack}>
                Go Back
              </Button>
              <Button onClick={() => loadServerSettings()}>
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =============================================================================
  // Render No Server State
  // =============================================================================

  if (pageState.status === "no-server") {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <header className="h-12 flex items-center px-4 border-b border-zinc-800 bg-[#2B2D31]">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="text-zinc-400 hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Settings className="h-5 w-5 text-zinc-400" />
            <h1 className="text-white font-semibold">Server Settings</h1>
          </div>
        </header>

        {/* No Server Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <Server className="h-12 w-12 text-zinc-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              No Server Selected
            </h2>
            <p className="text-zinc-400 mb-6">
              You need to select a server to edit its settings. Join or create a server first.
            </p>
            <Button onClick={() => router.push("/")}>
              Go to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // =============================================================================
  // Render Main Content
  // =============================================================================

  return (
    <div className="h-full flex flex-col" data-testid="main-content">
      {/* Header */}
      <header className="h-12 flex items-center px-4 border-b border-zinc-800 bg-[#2B2D31] flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="text-zinc-400 hover:text-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Settings className="h-5 w-5 text-zinc-400" />
          <h1 className="text-white font-semibold">Server Settings</h1>
          {pageState.serverName && (
            <span className="text-zinc-400 text-sm">
              — {pageState.serverName}
            </span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto p-6 md:p-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">
              Server Settings
            </h1>
            <p className="text-zinc-400">
              Manage your server&apos;s name, description, and appearance.
            </p>
          </div>

          {/* Settings Form */}
          {pageState.settings && pageState.roomId && (
            <ServerSettingsForm
              roomId={pageState.roomId}
              initialSettings={pageState.settings}
              permissions={pageState.permissions || undefined}
              onSettingsUpdated={handleSettingsUpdated}
            />
          )}

          {/* Footer Info */}
          <div className="mt-12 p-4 bg-zinc-800/30 rounded-lg border border-zinc-700/50">
            <p className="text-zinc-500 text-sm">
              Changes to server settings are saved immediately and synced to all members.
              Some settings may require specific permissions to modify.
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
