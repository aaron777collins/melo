"use client";

/**
 * Server Settings Layout
 *
 * Provides the layout structure for all server settings pages.
 * Includes the settings sidebar and main content area.
 */

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { X } from "lucide-react";

import { ServerSettingsSidebar } from "@/components/server/settings/server-settings-sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMatrixClient } from "@/hooks/use-matrix-client";
import { getSpace, type MatrixSpace } from "@/apps/web/services/matrix-space";
import { POWER_LEVELS, getMemberRole } from "@/apps/web/services/matrix-member";

// =============================================================================
// Types
// =============================================================================

interface SettingsLayoutProps {
  children: React.ReactNode;
}

// =============================================================================
// Component
// =============================================================================

export default function ServerSettingsLayout({ children }: SettingsLayoutProps) {
  const router = useRouter();
  const params = useParams();
  const { client, isReady } = useMatrixClient();
  
  const serverId = params?.serverId as string;
  
  // State
  const [space, setSpace] = useState<MatrixSpace | null>(null);
  const [userPowerLevel, setUserPowerLevel] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  /**
   * Load space data and user permissions
   */
  const loadSpaceData = useCallback(async () => {
    if (!isReady || !client || !serverId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get space data
      const spaceData = await getSpace(serverId);
      setSpace(spaceData);
      
      // Get user power level
      const userId = client.getUserId();
      if (userId) {
        const room = client.getRoom(serverId);
        if (room) {
          const powerLevelsEvent = room.currentState.getStateEvents('m.room.power_levels', '');
          const powerLevels = powerLevelsEvent?.getContent() || {};
          const level = powerLevels.users?.[userId] || powerLevels.users_default || 0;
          setUserPowerLevel(level);
          
          // Check if user has permission to access settings (at least moderator)
          if (level < POWER_LEVELS.MODERATOR) {
            setError("You don't have permission to access server settings");
            return;
          }
        }
      }
    } catch (err) {
      console.error("Failed to load space data:", err);
      setError(err instanceof Error ? err.message : "Failed to load server data");
    } finally {
      setIsLoading(false);
    }
  }, [client, isReady, serverId]);
  
  useEffect(() => {
    loadSpaceData();
  }, [loadSpaceData]);
  
  /**
   * Handle ESC key to close settings
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        router.push(`/servers/${serverId}`);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, serverId]);
  
  /**
   * Navigate back to server
   */
  const handleClose = () => {
    router.push(`/servers/${serverId}`);
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#313338]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
          <p className="text-zinc-400 text-sm">Loading settings...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error || !space) {
    return (
      <div className="flex h-full items-center justify-center bg-[#313338]">
        <div className="flex flex-col items-center gap-4 max-w-md text-center px-4">
          <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <X className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-white">
            Unable to Access Settings
          </h2>
          <p className="text-zinc-400 text-sm">
            {error || "Server not found or you don't have permission to view settings."}
          </p>
          <Button onClick={handleClose} variant="secondary">
            Return to Server
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex h-full bg-[#313338]">
      {/* Settings Sidebar */}
      <ServerSettingsSidebar
        space={space}
        serverId={serverId}
        userPowerLevel={userPowerLevel}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Close Button (top-right) */}
        <div className="absolute top-4 right-8 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-9 w-9 rounded-full border border-zinc-600 bg-zinc-800/50 hover:bg-zinc-700 text-zinc-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-1 mt-1 justify-center">
            <kbd className="px-1 py-0.5 text-[10px] text-zinc-500 bg-zinc-800 rounded font-mono">
              ESC
            </kbd>
          </div>
        </div>
        
        {/* Content with scroll */}
        <ScrollArea className="flex-1">
          <div className="max-w-3xl mx-auto px-10 py-16 pb-32">
            {children}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
