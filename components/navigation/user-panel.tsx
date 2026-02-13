"use client";

import React, { useState } from "react";
import { Settings, Mic, MicOff, Headphones, VolumeX, LogOut } from "lucide-react";

import { ActionTooltip } from "@/components/action-tooltip";
import { UserAvatar } from "@/components/user-avatar";
import { useMatrixAuth } from "@/components/providers/matrix-auth-provider";
import { useModal } from "@/hooks/use-modal-store";
import { cn } from "@/lib/utils";

/**
 * Discord-style user panel at bottom of navigation sidebar
 * 
 * Features:
 * - User avatar and display name
 * - Online status indicator
 * - Settings button (opens user settings modal)
 * - Mute button (toggles microphone)
 * - Deafen button (toggles audio output)
 * 
 * Layout:
 * [Avatar] [Name + Status] [Settings] [Mute] [Deafen]
 */
export function UserPanel() {
  const { user, isLoading, logout } = useMatrixAuth();
  const { onOpen } = useModal();

  // Audio state management (TODO: integrate with actual voice system)
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  // Handle button clicks
  const handleSettings = () => {
    onOpen("userSettings");
  };

  // Handle avatar click to open profile (self)
  const handleAvatarClick = () => {
    onOpen("userSettings"); // Opens to profile tab by default
  };

  const handleMute = () => {
    setIsMuted(!isMuted);
    // TODO: Integrate with actual voice/audio system
  };

  const handleDeafen = () => {
    setIsDeafened(!isDeafened);
    // TODO: Integrate with actual voice/audio system
    // Note: Deafening should also mute
    if (!isDeafened) {
      setIsMuted(true);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      // User will be redirected automatically by auth state change
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Get presence status color
  const getPresenceColor = (presence: string | undefined) => {
    switch (presence) {
      case 'online':
        return 'bg-green-500';
      case 'unavailable':
        return 'bg-yellow-500';
      case 'offline':
      default:
        return 'bg-gray-500';
    }
  };

  // Get display name with fallback
  const displayName = user?.displayName || user?.userId?.split(':')[0]?.replace('@', '') || 'Unknown User';

  if (isLoading) {
    // Loading skeleton
    return (
      <div className="flex items-center gap-2 p-2 bg-zinc-800/50 mx-2 rounded-md">
        <div className="relative">
          <div className="h-8 w-8 rounded-full bg-zinc-700/50 animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="h-3 bg-zinc-700/50 rounded animate-pulse mb-1" />
          <div className="h-2 bg-zinc-700/50 rounded animate-pulse w-16" />
        </div>
        <div className="flex gap-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-8 rounded bg-zinc-700/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    // Not logged in state
    return (
      <div className="flex items-center gap-2 p-2 bg-zinc-800/50 mx-2 rounded-md">
        <div className="relative">
          <div className="h-8 w-8 rounded-full bg-zinc-600 flex items-center justify-center">
            <span className="text-zinc-400 text-xs">?</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-400 truncate">Not logged in</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-zinc-800/50 mx-2 rounded-md hover:bg-zinc-700/50 transition-colors">
      {/* User Avatar with Status - Clickable to open profile */}
      <ActionTooltip label="Your Profile" side="top">
        <button 
          onClick={handleAvatarClick}
          className="relative cursor-pointer hover:opacity-80 transition-opacity"
        >
          <UserAvatar
            src={user.avatarUrl || undefined}
            className="h-8 w-8"
          />
          {/* Online Status Indicator */}
          <div className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-zinc-800",
            getPresenceColor(user.presence)
          )} />
        </button>
      </ActionTooltip>

      {/* User Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate">
          {displayName}
        </p>
        <p className="text-xs text-zinc-400 truncate">
          {user.presence === 'online' ? 'Online' : 
           user.presence === 'unavailable' ? 'Away' : 'Offline'}
        </p>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-1">
        {/* Logout Button */}
        <ActionTooltip label="Log Out" side="top">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center h-8 w-8 rounded hover:bg-red-600/50 transition-colors"
          >
            <LogOut className="h-4 w-4 text-zinc-400 hover:text-red-300" />
          </button>
        </ActionTooltip>

        {/* Settings Button */}
        <ActionTooltip label="User Settings" side="top">
          <button
            onClick={handleSettings}
            className="flex items-center justify-center h-8 w-8 rounded hover:bg-zinc-600/50 transition-colors"
          >
            <Settings className="h-4 w-4 text-zinc-400 hover:text-zinc-300" />
          </button>
        </ActionTooltip>

        {/* Mute Button */}
        <ActionTooltip label={isMuted ? "Unmute" : "Mute"} side="top">
          <button
            onClick={handleMute}
            className={cn(
              "flex items-center justify-center h-8 w-8 rounded transition-colors",
              isMuted 
                ? "bg-red-500 hover:bg-red-600 text-white" 
                : "hover:bg-zinc-600/50 text-zinc-400 hover:text-zinc-300"
            )}
          >
            {isMuted ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </button>
        </ActionTooltip>

        {/* Deafen Button */}
        <ActionTooltip label={isDeafened ? "Undeafen" : "Deafen"} side="top">
          <button
            onClick={handleDeafen}
            className={cn(
              "flex items-center justify-center h-8 w-8 rounded transition-colors",
              isDeafened 
                ? "bg-red-500 hover:bg-red-600 text-white" 
                : "hover:bg-zinc-600/50 text-zinc-400 hover:text-zinc-300"
            )}
          >
            {isDeafened ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Headphones className="h-4 w-4" />
            )}
          </button>
        </ActionTooltip>
      </div>
    </div>
  );
}