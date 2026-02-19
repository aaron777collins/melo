"use client";

import React, { useState, useEffect } from "react";
import { 
  Settings, 
  Mic, 
  MicOff, 
  Headphones, 
  VolumeX, 
  LogOut, 
  User,
  Bell,
  Shield,
  MessageCircle,
  Phone,
  Video
} from "lucide-react";

import { ActionTooltip } from "@/components/action-tooltip";
import { UserAvatar } from "@/components/user-avatar";
import { useMatrixAuth } from "@/components/providers/matrix-auth-provider";
import { useMatrixClient } from "@/hooks/use-matrix-client";
import { useModal } from "@/hooks/use-modal-store";
import { useUnreadCounts } from "@/hooks/use-unread-counts";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UserSidebarProps {
  className?: string;
}

interface UserStats {
  totalServers: number;
  totalFriends: number;
  totalDMs: number;
  totalUnreadMessages: number;
}

interface UserPresence {
  status: 'online' | 'away' | 'busy' | 'offline';
  statusMessage?: string;
  lastSeen?: Date;
}

/**
 * Discord-style user sidebar component that displays comprehensive user information
 * and controls. This replaces the simple user-panel with a full sidebar experience.
 * 
 * Features:
 * - User profile with avatar, name, and status
 * - Online presence management with Matrix integration
 * - Voice/audio controls integrated with Matrix calling
 * - User statistics and quick access to key features
 * - Settings and logout functionality
 * - Notification indicators using Matrix hooks
 */
export function UserSidebar({ className }: UserSidebarProps) {
  const { user, isLoading, logout } = useMatrixAuth();
  const { client } = useMatrixClient();
  const { onOpen } = useModal();
  const { unreadCounts } = useUnreadCounts();

  // Audio state management (will integrate with Matrix voice system)
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isInCall, setIsInCall] = useState(false);

  // User statistics state
  const [userStats, setUserStats] = useState<UserStats>({
    totalServers: 0,
    totalFriends: 0,
    totalDMs: 0,
    totalUnreadMessages: 0
  });

  // User presence state
  const [userPresence, setUserPresence] = useState<UserPresence>({
    status: 'online',
    statusMessage: undefined,
    lastSeen: undefined
  });

  // Load user statistics using Matrix client
  useEffect(() => {
    if (!client) return;

    const loadUserStats = async () => {
      try {
        const rooms = client.getRooms();
        const joinedRooms = rooms.filter(room => room.getMyMembership() === 'join');
        
        // Count spaces (servers)
        const spaces = joinedRooms.filter(room => room.isSpaceRoom());
        
        // Count DM rooms
        const dmRooms = joinedRooms.filter(room => {
          const isDm = room.getType() === 'm.room' && room.getDMInviter();
          return isDm || (room.currentState.getStateEvents('m.room.create')[0]?.getContent()?.type === 'm.room');
        });

        // Calculate total unread messages
        const totalUnread = Object.values(unreadCounts.channels).reduce((total, room) => total + (room?.totalUnread || 0), 0) +
                           Object.values(unreadCounts.directMessages).reduce((total, dm) => total + (dm?.totalUnread || 0), 0);

        setUserStats({
          totalServers: spaces.length,
          totalFriends: 0, // TODO: Implement friends count when friends system is ready
          totalDMs: dmRooms.length,
          totalUnreadMessages: totalUnread
        });
      } catch (error) {
        console.error('Failed to load user stats:', error);
      }
    };

    loadUserStats();
  }, [client, unreadCounts]);

  // Load and track user presence
  useEffect(() => {
    if (!client || !user?.userId) return;

    const updatePresence = () => {
      const presence = client.getUser(user.userId)?.presence;
      const presenceEvent = client.getUser(user.userId)?.presenceStatusMsg;
      
      setUserPresence({
        status: presence === 'online' ? 'online' : 
                presence === 'unavailable' ? 'away' : 'offline',
        statusMessage: presenceEvent || undefined,
        lastSeen: presence === 'offline' ? new Date() : undefined
      });
    };

    // Update presence immediately
    updatePresence();

    // Listen for presence changes
    client.on('User.presence', updatePresence);

    return () => {
      client.off('User.presence', updatePresence);
    };
  }, [client, user?.userId]);

  // Monitor call state
  useEffect(() => {
    if (!client) return;

    const handleCallStateChange = () => {
      const calls = client.callEventHandler?.calls;
      setIsInCall(calls && calls.size > 0);
    };

    client.on('Call.incoming', handleCallStateChange);
    client.on('Call.hangup', handleCallStateChange);

    return () => {
      client.off('Call.incoming', handleCallStateChange);
      client.off('Call.hangup', handleCallStateChange);
    };
  }, [client]);

  // Handle button actions
  const handleSettings = () => {
    onOpen("userSettings");
  };

  const handleProfile = () => {
    onOpen("userSettings"); // Opens to profile tab
  };

  const handlePresenceChange = (newStatus: UserPresence['status']) => {
    if (!client) return;
    
    const presenceState = newStatus === 'online' ? 'online' : 
                         newStatus === 'away' ? 'unavailable' : 'offline';
    
    client.setPresence({ presence: presenceState }).catch(error => {
      console.error('Failed to update presence:', error);
    });
  };

  const handleMute = () => {
    setIsMuted(!isMuted);
    // TODO: Integrate with Matrix voice system when available
    console.log('Mute toggled:', !isMuted);
  };

  const handleDeafen = () => {
    const newDeafened = !isDeafened;
    setIsDeafened(newDeafened);
    if (newDeafened) {
      setIsMuted(true); // Deafening also mutes
    }
    // TODO: Integrate with Matrix voice system when available
    console.log('Deafen toggled:', newDeafened);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleStartVoiceCall = () => {
    // TODO: Start voice call using Matrix calling
    console.log('Starting voice call');
  };

  const handleStartVideoCall = () => {
    // TODO: Start video call using Matrix calling
    console.log('Starting video call');
  };

  // Get presence color
  const getPresenceColor = (status: UserPresence['status']) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'busy':
        return 'bg-red-500';
      case 'offline':
      default:
        return 'bg-gray-500';
    }
  };

  // Get display name with fallback
  const displayName = user?.displayName || user?.userId?.split(':')[0]?.replace('@', '') || 'Unknown User';

  if (isLoading) {
    return (
      <div className={cn("flex flex-col h-full w-60 bg-[#f2f3f5] dark:bg-[#2b2d31] border-r border-zinc-200 dark:border-zinc-800", className)}>
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-zinc-700/50 animate-pulse" />
            <div className="flex-1">
              <div className="h-4 bg-zinc-700/50 rounded animate-pulse mb-2" />
              <div className="h-3 bg-zinc-700/50 rounded animate-pulse w-20" />
            </div>
          </div>
        </div>
        <div className="flex-1 p-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-12 bg-zinc-700/50 rounded-md animate-pulse mb-2" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={cn("flex flex-col h-full w-60 bg-[#f2f3f5] dark:bg-[#2b2d31] border-r border-zinc-200 dark:border-zinc-800", className)}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="h-16 w-16 rounded-full bg-zinc-600 flex items-center justify-center mx-auto mb-4">
              <User className="h-8 w-8 text-zinc-400" />
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Not logged in</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full w-60 bg-[#f2f3f5] dark:bg-[#2b2d31] border-r border-zinc-200 dark:border-zinc-800", className)}>
      {/* User Profile Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <ActionTooltip label="View Profile" side="right">
          <button 
            onClick={handleProfile}
            className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <div className="relative">
              <UserAvatar
                src={user.avatarUrl || undefined}
                className="h-10 w-10"
              />
              <div className={cn(
                "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-[#2b2d31]",
                getPresenceColor(userPresence.status)
              )} />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {displayName}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                {userPresence.statusMessage || 
                 (userPresence.status === 'online' ? 'Online' : 
                  userPresence.status === 'away' ? 'Away' : 
                  userPresence.status === 'busy' ? 'Busy' : 'Offline')}
              </p>
            </div>
          </button>
        </ActionTooltip>

        {/* Presence Status Selector */}
        <div className="flex gap-1 mt-3">
          {(['online', 'away', 'busy', 'offline'] as const).map(status => (
            <ActionTooltip key={status} label={status.charAt(0).toUpperCase() + status.slice(1)} side="top">
              <button
                onClick={() => handlePresenceChange(status)}
                className={cn(
                  "h-6 w-6 rounded-full border-2 border-white dark:border-[#2b2d31] transition-all",
                  getPresenceColor(status),
                  userPresence.status === status ? "ring-2 ring-zinc-400 dark:ring-zinc-300" : "opacity-70 hover:opacity-100"
                )}
              />
            </ActionTooltip>
          ))}
        </div>
      </div>

      {/* User Statistics */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
          Statistics
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">Servers</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{userStats.totalServers}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-600 dark:text-zinc-300">DMs</span>
            <div className="flex items-center gap-2">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{userStats.totalDMs}</span>
              {userStats.totalUnreadMessages > 0 && (
                <div className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] flex items-center justify-center">
                  {userStats.totalUnreadMessages}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex-1 p-4">
        <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
          Quick Actions
        </h3>
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpen("createServer")}
            className="w-full justify-start h-8 px-2 text-left"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Create Server
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStartVoiceCall}
            className="w-full justify-start h-8 px-2 text-left"
            disabled={isInCall}
          >
            <Phone className="h-4 w-4 mr-2" />
            {isInCall ? "In Call" : "Start Voice Call"}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStartVideoCall}
            className="w-full justify-start h-8 px-2 text-left"
            disabled={isInCall}
          >
            <Video className="h-4 w-4 mr-2" />
            {isInCall ? "In Call" : "Start Video Call"}
          </Button>
        </div>
      </div>

      <Separator className="mx-4" />

      {/* Audio Controls */}
      <div className="p-4">
        <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-3">
          Audio Controls
        </h3>
        <div className="flex gap-2">
          <ActionTooltip label={isMuted ? "Unmute" : "Mute"} side="top">
            <Button
              variant={isMuted ? "destructive" : "ghost"}
              size="sm"
              onClick={handleMute}
              className="flex-1"
            >
              {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          </ActionTooltip>
          
          <ActionTooltip label={isDeafened ? "Undeafen" : "Deafen"} side="top">
            <Button
              variant={isDeafened ? "destructive" : "ghost"}
              size="sm"
              onClick={handleDeafen}
              className="flex-1"
            >
              {isDeafened ? <VolumeX className="h-4 w-4" /> : <Headphones className="h-4 w-4" />}
            </Button>
          </ActionTooltip>
        </div>
      </div>

      <Separator className="mx-4" />

      {/* Bottom Controls */}
      <div className="p-4">
        <div className="flex gap-2">
          <ActionTooltip label="Settings" side="top">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSettings}
              className="flex-1"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </ActionTooltip>
          
          <ActionTooltip label="Log Out" side="top">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="flex-1 hover:bg-red-500/10 hover:text-red-500"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </ActionTooltip>
        </div>
      </div>
    </div>
  );
}