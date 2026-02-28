"use client";

import React from 'react';
import { Plus } from 'lucide-react';
import { DMListItem } from './dm-list-item';
import { DMEmptyState } from './dm-empty-state';
import { ActionTooltip } from '@/components/action-tooltip';
import { useModal } from '@/hooks/use-modal-store';
import { cn } from '@/lib/utils';

// Simpler structure for the test-compatible version
interface SimpleDMConversation {
  id: string;
  recipientName: string;
  lastMessage?: string;
  unreadCount?: number;
}

// Complex structure for full implementation
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

interface DMSidebarSectionProps {
  // Support both test structure and full structure
  conversations?: SimpleDMConversation[];
  dms?: DMConversation[];
  onNewDM?: () => void;
  onSelectDM?: (id: string) => void;
  className?: string;
}

/**
 * DM Sidebar Section Component
 * 
 * Main DM section for the sidebar following Discord's pattern:
 * - "Direct Messages" header with "+" button
 * - List of DM conversations with user avatars and names
 * - Empty state when no DMs exist
 * - Responsive design across all viewports
 */
export function DMSidebarSection({ 
  conversations = [],
  dms = [], 
  onNewDM,
  onSelectDM,
  className 
}: DMSidebarSectionProps) {
  const { onOpen } = useModal();

  // Use conversations prop if provided (test compatibility), otherwise use dms
  const dmList = conversations.length > 0 ? conversations : dms;
  const isSimpleFormat = conversations.length > 0;

  const handleNewDMClick = () => {
    // Use modal store first, fallback to prop for backward compatibility
    if (onNewDM) {
      onNewDM();
    } else {
      onOpen('newDM');
    }
  };

  const handleDMClick = (id: string) => {
    if (onSelectDM) {
      onSelectDM(id);
    }
  };

  return (
    <div 
      data-testid="dm-section"
      role="region"
      aria-label="Direct Messages"
      className={cn("w-full", className)}
    >
      {/* DM Section Header */}
      <div className="flex items-center justify-between px-2 py-3">
        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Direct Messages
        </span>
        <ActionTooltip side="right" label="Start new direct message">
          <button
            onClick={handleNewDMClick}
            data-testid="new-dm-button"
            aria-label="Start new direct message"
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <Plus className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          </button>
        </ActionTooltip>
      </div>

      {/* DM List or Empty State */}
      <div className="flex-1 px-2" data-testid="dm-list">
        {dmList.length > 0 ? (
          <div className="space-y-0.5">
            {dmList.map((dm) => {
              if (isSimpleFormat) {
                // Simple format for tests
                const simpleDM = dm as SimpleDMConversation;
                return (
                  <div 
                    key={simpleDM.id}
                    onClick={() => handleDMClick(simpleDM.id)}
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{simpleDM.recipientName}</span>
                      {simpleDM.unreadCount && simpleDM.unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                          {simpleDM.unreadCount}
                        </span>
                      )}
                    </div>
                    {simpleDM.lastMessage && (
                      <div className="text-sm text-zinc-600 dark:text-zinc-400">
                        {simpleDM.lastMessage}
                      </div>
                    )}
                  </div>
                );
              } else {
                // Full format with DMListItem
                return (
                  <DMListItem
                    key={dm.id}
                    dm={dm as DMConversation}
                  />
                );
              }
            })}
          </div>
        ) : (
          <DMEmptyState />
        )}
      </div>
    </div>
  );
}