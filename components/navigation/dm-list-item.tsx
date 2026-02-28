"use client";

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ActionTooltip } from '@/components/action-tooltip';
import { cn } from '@/lib/utils';

interface LastMessage {
  text: string;
  timestamp: number;
  senderId: string;
}

interface DMConversation {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  lastMessage?: LastMessage;
  unreadCount: number;
  isOnline: boolean;
}

interface DMListItemProps {
  dm: DMConversation;
  className?: string;
}

/**
 * DM List Item Component
 * 
 * Individual DM conversation item displaying:
 * - User avatar with online status indicator
 * - Display name and last message preview
 * - Unread count badge
 * - Relative timestamp
 * - Click navigation to DM conversation
 */
export function DMListItem({ dm, className }: DMListItemProps) {
  const router = useRouter();

  const handleClick = useCallback(() => {
    router.push(`/channels/@me/${dm.id}`);
  }, [router, dm.id]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  const formatTimestamp = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  }, []);

  const truncateMessage = useCallback((text: string, maxLength = 40) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }, []);

  const getInitials = useCallback((name: string) => {
    return name.charAt(0).toUpperCase();
  }, []);

  return (
    <ActionTooltip side="right" label={dm.displayName}>
      <button
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        data-testid="dm-list-item"
        tabIndex={0}
        className={cn(
          "flex items-center gap-3 p-3 mx-1 rounded-md cursor-pointer w-full text-left",
          "hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50",
          "focus:bg-zinc-700/20 dark:focus:bg-zinc-700/70",
          "active:bg-zinc-700/30 dark:active:bg-zinc-700/80", // Mobile touch feedback
          "transition-colors duration-200 group",
          "min-h-[44px]", // Minimum touch target size for accessibility
          // Mobile-specific enhancements
          "touch-manipulation", // Optimize for touch
          "select-none", // Prevent text selection on mobile
          className
        )}
      >
        {/* Avatar with online indicator */}
        <div className="relative">
          <Avatar className="h-8 w-8">
            <AvatarImage src={dm.avatarUrl} />
            <AvatarFallback className="bg-zinc-500 text-white text-sm">
              {getInitials(dm.displayName)}
            </AvatarFallback>
          </Avatar>
          
          {/* Online status indicator */}
          {dm.isOnline && (
            <div 
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#1e1f22] rounded-full"
              data-testid="online-indicator"
            />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="font-medium text-sm truncate text-zinc-900 dark:text-zinc-100">
              {dm.displayName}
            </div>
            {dm.lastMessage && (
              <div 
                className="text-xs text-zinc-500 dark:text-zinc-400 ml-2 flex-shrink-0"
                data-testid="timestamp"
              >
                {formatTimestamp(dm.lastMessage.timestamp)}
              </div>
            )}
          </div>
          
          {dm.lastMessage && (
            <div 
              className="text-xs text-zinc-600 dark:text-zinc-400 truncate"
              data-testid="last-message"
            >
              {truncateMessage(dm.lastMessage.text)}
            </div>
          )}
        </div>

        {/* Unread count badge */}
        {dm.unreadCount > 0 && (
          <div className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {dm.unreadCount > 99 ? "99+" : dm.unreadCount}
          </div>
        )}
      </button>
    </ActionTooltip>
  );
}