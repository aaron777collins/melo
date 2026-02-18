'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus, MessageCircle, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpaces } from '@/hooks/use-spaces';
import { NotificationBadge } from '@/components/notification/notification-badge';
import { ActionTooltip } from '@/components/action-tooltip';

interface SpaceAvatarProps {
  space: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  isActive: boolean;
  hasUnread: boolean;
  mentionCount: number;
}

function SpaceAvatar({ space, isActive, hasUnread, mentionCount }: SpaceAvatarProps) {
  const initials = space.name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative">
      <div
        className={cn(
          "relative group flex items-center justify-center w-12 h-12 rounded-[24px] transition-all duration-200 overflow-hidden",
          "hover:rounded-[16px] hover:bg-primary/10",
          isActive 
            ? "bg-primary text-white rounded-[16px]" 
            : "bg-gray-700 text-gray-300 hover:bg-gray-600",
          hasUnread && !isActive && "bg-gray-600"
        )}
        data-testid="space-avatar"
      >
        {space.avatarUrl ? (
          <img 
            src={space.avatarUrl} 
            alt={space.name} 
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <span 
            className="font-bold text-sm" 
            data-testid="space-initials"
          >
            {initials}
          </span>
        )}

        {/* Active indicator pill */}
        <div
          className={cn(
            "absolute left-0 top-1/2 transform -translate-y-1/2 w-1 bg-white rounded-r-full transition-all duration-200",
            isActive ? "h-10" : hasUnread ? "h-2" : "h-0 opacity-0"
          )}
        />
      </div>

      {/* Notification badges */}
      {mentionCount > 0 && (
        <NotificationBadge 
          count={mentionCount}
          type="mention"
          className="absolute -top-1 -right-1"
        />
      )}
      {hasUnread && mentionCount === 0 && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
      )}
    </div>
  );
}

function SpaceItem({ space, isActive }: { space: any; isActive: boolean }) {
  return (
    <ActionTooltip label={space.name} side="right">
      <Link
        href={`/servers/${encodeURIComponent(space.id)}`}
        className={cn(
          "block w-12 h-12 mb-2 transition-all duration-200",
          isActive && "transform scale-105"
        )}
        data-testid="space-item"
        data-space-id={space.id}
        data-active={isActive}
        role="button"
        aria-label={`Navigate to ${space.name}${space.hasUnread ? ' (has unread messages)' : ''}${space.mentionCount > 0 ? ` (${space.mentionCount} mentions)` : ''}`}
        aria-describedby={space.hasUnread ? `space-${space.id}-unread` : undefined}
      >
        <SpaceAvatar 
          space={space}
          isActive={isActive}
          hasUnread={space.hasUnread}
          mentionCount={space.mentionCount}
        />
      </Link>
      
      {/* Hidden description for screen readers */}
      {space.hasUnread && (
        <div id={`space-${space.id}-unread`} className="sr-only">
          Has unread messages
          {space.mentionCount > 0 && ` and ${space.mentionCount} mentions`}
        </div>
      )}
      
      {/* Hidden space name for testing */}
      <div className="sr-only" data-testid="space-name">{space.name}</div>
    </ActionTooltip>
  );
}

function DirectMessagesButton({ isActive }: { isActive: boolean }) {
  return (
    <ActionTooltip label="Direct Messages" side="right">
      <Link
        href="/channels/@me"
        className={cn(
          "flex items-center justify-center w-12 h-12 rounded-[24px] transition-all duration-200 mb-2",
          "hover:rounded-[16px] hover:bg-primary/10",
          isActive 
            ? "bg-primary text-white rounded-[16px]" 
            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
        )}
        data-testid="dm-navigation-button"
        role="button"
        aria-label="Navigate to Direct Messages"
      >
        <MessageCircle className="w-6 h-6" />
      </Link>
    </ActionTooltip>
  );
}

function AddServerButton() {
  return (
    <ActionTooltip label="Add a Server" side="right">
      <button
        className={cn(
          "flex items-center justify-center w-12 h-12 rounded-[24px] transition-all duration-200",
          "hover:rounded-[16px] bg-gray-700 text-gray-400 hover:bg-green-600 hover:text-white border-2 border-dashed border-gray-600 hover:border-green-600"
        )}
        data-testid="add-server-button"
        role="button"
        aria-label="Add a Server"
        onClick={() => {
          // TODO: Open server creation/join modal
          console.log('Add server clicked');
        }}
      >
        <Plus className="w-6 h-6" />
      </button>
    </ActionTooltip>
  );
}

export function SpacesNavigation() {
  const { spaces, directMessages, isLoading, error } = useSpaces();
  const pathname = usePathname();

  // Determine which space is currently active
  const currentSpaceId = pathname?.match(/^\/servers\/([^\/]+)/)?.[1];
  const decodedSpaceId = currentSpaceId ? decodeURIComponent(currentSpaceId) : null;
  const isDMActive = pathname?.startsWith('/channels/@me') ?? false;

  if (isLoading) {
    return (
      <div className="h-full w-full bg-[#1e1f22] flex flex-col items-center justify-center" data-testid="spaces-loading">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full bg-[#1e1f22] flex flex-col items-center justify-center" data-testid="spaces-error">
        <ActionTooltip label={`Error loading spaces: ${error.message}`} side="right">
          <div className="text-red-400 p-2 rounded">
            <AlertCircle className="h-6 w-6" />
          </div>
        </ActionTooltip>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
          data-testid="spaces-retry"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 flex flex-col h-full items-center text-primary w-full dark:bg-[#1e1f22] bg-[#e3e5e8] py-3" data-testid="spaces-list">
      {/* Direct Messages */}
      <DirectMessagesButton isActive={isDMActive} />

      {/* Separator */}
      <div className="w-8 h-px bg-gray-700 my-2" />

      {/* Spaces */}
      {spaces.map((space) => (
        <SpaceItem 
          key={space.id}
          space={space}
          isActive={decodedSpaceId === space.id}
        />
      ))}

      {/* Empty state */}
      {spaces.length === 0 && (
        <div className="px-2 py-4 text-center" data-testid="spaces-empty-state">
          <div className="text-gray-500 text-xs mb-2">No spaces yet</div>
          <div className="text-gray-600 text-xs">Join or create a space to get started</div>
        </div>
      )}

      {/* Add Server Button */}
      <div className="mt-auto pb-2">
        <AddServerButton />
      </div>
    </div>
  );
}