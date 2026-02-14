"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { 
  Hash, 
  Volume2, 
  Video, 
  Megaphone, 
  Search, 
  Pin, 
  Users, 
  MoreHorizontal,
  Lock,
  Settings,
  Bell,
  BellOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ActionTooltip } from '@/components/action-tooltip';
import { useRoom } from '@/hooks/use-room';
import { useMatrixClient } from '@/hooks/use-matrix-client';
import { useModal } from '@/hooks/use-modal-store';
import type { ChannelType } from '@/lib/matrix/types/space';

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface ChatHeaderProps {
  /** Matrix room ID for the current channel */
  roomId: string;
  /** Current channel name (fallback if room not loaded) */
  name?: string;
  /** Channel type for icon display */
  type?: ChannelType;
  /** Whether the user can manage this channel */
  canManage?: boolean;
  /** Whether the member list sidebar is visible */
  showMemberList?: boolean;
  /** Callback when member list toggle is clicked */
  onToggleMemberList?: () => void;
  /** Whether the search panel is visible */
  showSearch?: boolean;
  /** Callback when search toggle is clicked */
  onToggleSearch?: () => void;
  /** Whether the pins panel is visible */
  showPins?: boolean;
  /** Callback when pins toggle is clicked */
  onTogglePins?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export interface ChannelHeaderInfo {
  /** Channel display name */
  name: string;
  /** Channel topic/description */
  topic?: string | null;
  /** Channel type for icon */
  type: ChannelType;
  /** Number of active members */
  memberCount: number;
  /** Whether channel is private/invite-only */
  isPrivate: boolean;
}

// =============================================================================
// Constants and Helpers
// =============================================================================

/**
 * Get the appropriate icon component for a channel type
 */
function getChannelIcon(type: ChannelType, className?: string) {
  const iconProps = { className: cn('h-4 w-4', className) };
  
  switch (type) {
    case 'text':
      return <Hash {...iconProps} />;
    case 'voice':
      return <Volume2 {...iconProps} />;
    case 'video':
      return <Video {...iconProps} />;
    case 'announcement':
      return <Megaphone {...iconProps} />;
    default:
      return <Hash {...iconProps} />;
  }
}

/**
 * Determine channel type from Matrix room
 */
function getChannelTypeFromRoom(room: any): ChannelType {
  if (!room) return 'text';

  // Check for custom state events that indicate channel type
  const powerLevels = room.currentState?.getStateEvents('m.room.power_levels', '');
  const roomType = room.currentState?.getStateEvents('m.room.create', '')?.getContent()?.type;
  
  // Check for LiveKit configuration (indicates voice/video)
  const liveKitConfig = room.currentState?.getStateEvents('io.element.livekit', '');
  if (liveKitConfig) {
    // Default to video for LiveKit rooms (cameras off by default as per requirements)
    return 'video';
  }
  
  // Check for announcement/read-only rooms
  if (powerLevels) {
    const eventsDefault = powerLevels.getContent()?.events_default || 0;
    const usersDefault = powerLevels.getContent()?.users_default || 0;
    
    // If regular users can't send messages, likely announcement channel
    if (eventsDefault > usersDefault) {
      return 'announcement';
    }
  }
  
  // Default to text channel
  return 'text';
}

/**
 * Check if a room is private (invite-only)
 */
function isRoomPrivate(room: any): boolean {
  if (!room) return false;
  
  const joinRules = room.currentState?.getStateEvents('m.room.join_rules', '');
  const joinRule = joinRules?.getContent()?.join_rule || 'invite';
  
  return joinRule === 'invite' || joinRule === 'knock';
}

/**
 * Truncate topic text gracefully
 */
function truncateText(text: string | null, maxLength: number = 60): string {
  if (!text) return '';
  
  if (text.length <= maxLength) return text;
  
  // Find last space before the limit to avoid cutting words
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '…';
  }
  
  return truncated + '…';
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * ChatHeader - Discord-style channel header with info and controls
 * 
 * Features:
 * - Channel name with type icon (text #, voice 🔊, video 📹, announcement 📢)
 * - Topic/description (truncated gracefully)  
 * - Live member count display
 * - Search, pins, members toggle buttons
 * - Private channel lock indicator
 * - Responsive design that adapts to smaller screens
 */
export function ChatHeader({
  roomId,
  name: fallbackName,
  type: fallbackType,
  canManage = false,
  showMemberList = false,
  onToggleMemberList,
  showSearch = false,
  onToggleSearch,
  showPins = false,
  onTogglePins,
  className
}: ChatHeaderProps) {
  // =============================================================================
  // Hooks and State
  // =============================================================================

  const { client, isReady } = useMatrixClient();
  const { room, members, isLoading } = useRoom(roomId);
  const { onOpen } = useModal();

  // =============================================================================
  // Derived Data
  // =============================================================================

  const headerInfo: ChannelHeaderInfo = useMemo(() => {
    if (room && isReady) {
      // Use real room data when available
      const roomName = room.name || fallbackName || 'Unknown Channel';
      const roomTopic = room.currentState?.getStateEvents('m.room.topic', '')?.getContent()?.topic;
      const channelType = getChannelTypeFromRoom(room);
      const activeMembers = members.filter(member => member.membership === 'join');
      const privateRoom = isRoomPrivate(room);

      return {
        name: roomName,
        topic: roomTopic,
        type: channelType,
        memberCount: activeMembers.length,
        isPrivate: privateRoom
      };
    } else {
      // Fallback data while loading or if room unavailable
      return {
        name: fallbackName || 'Loading...',
        topic: null,
        type: fallbackType || 'text',
        memberCount: 0,
        isPrivate: false
      };
    }
  }, [room, members, isReady, fallbackName, fallbackType]);

  // =============================================================================
  // Event Handlers
  // =============================================================================

  const handleSearchToggle = useCallback(() => {
    if (onToggleSearch) {
      onToggleSearch();
    } else {
      // Fallback: open search modal if no toggle handler provided
      onOpen('search', { roomId });
    }
  }, [onToggleSearch, onOpen, roomId]);

  const handlePinsToggle = useCallback(() => {
    if (onTogglePins) {
      onTogglePins();
    } else {
      // Fallback: open pins modal if no toggle handler provided
      onOpen('pinnedMessages', { roomId });
    }
  }, [onTogglePins, onOpen, roomId]);

  const handleMemberListToggle = useCallback(() => {
    if (onToggleMemberList) {
      onToggleMemberList();
    }
    // Note: No fallback for member list as it's typically a sidebar toggle
  }, [onToggleMemberList]);

  const handleChannelSettings = useCallback(() => {
    if (room) {
      onOpen('editChannel', { room });
    }
  }, [onOpen, room]);

  const handleNotificationSettings = useCallback(() => {
    if (room) {
      onOpen('notificationSettings', { roomId });
    }
  }, [onOpen, roomId]);

  // =============================================================================
  // Render Helpers
  // =============================================================================

  const renderChannelInfo = () => (
    <div className="flex items-center space-x-3 min-w-0 flex-1">
      {/* Channel Icon */}
      <div className="flex items-center space-x-1">
        {getChannelIcon(headerInfo.type, 'text-zinc-500 dark:text-zinc-400')}
        {headerInfo.isPrivate && (
          <Lock className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
        )}
      </div>

      {/* Channel Name and Topic */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center space-x-2">
          <h1 className="text-base font-semibold text-zinc-800 dark:text-zinc-100 truncate">
            {headerInfo.name}
          </h1>
          
          {/* Member Count */}
          {headerInfo.memberCount > 0 && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
              {headerInfo.memberCount} member{headerInfo.memberCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Topic/Description */}
        {headerInfo.topic && (
          <p className="text-xs text-zinc-600 dark:text-zinc-300 truncate mt-0.5">
            {truncateText(headerInfo.topic)}
          </p>
        )}
      </div>
    </div>
  );

  const renderActionButtons = () => (
    <div className="flex items-center space-x-1">
      {/* Search Button */}
      <ActionTooltip label="Search" side="bottom">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSearchToggle}
          className={cn(
            'h-8 w-8 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200',
            'hover:bg-zinc-200 dark:hover:bg-zinc-700',
            showSearch && 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200'
          )}
        >
          <Search className="h-4 w-4" />
        </Button>
      </ActionTooltip>

      {/* Pins Button */}
      <ActionTooltip label="Pinned Messages" side="bottom">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePinsToggle}
          className={cn(
            'h-8 w-8 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200',
            'hover:bg-zinc-200 dark:hover:bg-zinc-700',
            showPins && 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200'
          )}
        >
          <Pin className="h-4 w-4" />
        </Button>
      </ActionTooltip>

      {/* Member List Toggle */}
      <ActionTooltip label={showMemberList ? "Hide Member List" : "Show Member List"} side="bottom">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleMemberListToggle}
          className={cn(
            'h-8 w-8 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200',
            'hover:bg-zinc-200 dark:hover:bg-zinc-700',
            showMemberList && 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200'
          )}
        >
          <Users className="h-4 w-4" />
        </Button>
      </ActionTooltip>

      {/* Additional Actions (More Menu) */}
      {canManage && (
        <>
          {/* Channel Settings */}
          <ActionTooltip label="Channel Settings" side="bottom">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleChannelSettings}
              className="h-8 w-8 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </ActionTooltip>

          {/* Notification Settings */}
          <ActionTooltip label="Notification Settings" side="bottom">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNotificationSettings}
              className="h-8 w-8 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            >
              <Bell className="h-4 w-4" />
            </Button>
          </ActionTooltip>
        </>
      )}
    </div>
  );

  // =============================================================================
  // Main Render
  // =============================================================================

  return (
    <header 
      className={cn(
        'flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700',
        'bg-white dark:bg-zinc-800 min-h-[64px]',
        'sticky top-0 z-10', // Keeps header visible while scrolling
        className
      )}
    >
      {/* Left Side - Channel Info */}
      {renderChannelInfo()}

      {/* Right Side - Action Buttons */}
      {renderActionButtons()}
    </header>
  );
}

export default ChatHeader;