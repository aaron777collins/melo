/**
 * Message Reactions Component
 * 
 * Renders emoji reactions for Matrix messages with add/remove functionality.
 * Supports real-time updates and emoji picker integration.
 */

"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Smile, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { useMatrixClient } from '@/hooks/use-matrix-client';
import { 
  ReactionHandler, 
  MessageReactions, 
  MessageReaction,
  ReactionOptions 
} from '@/lib/matrix/chat/reaction-handler';

// =============================================================================
// Types
// =============================================================================

interface MessageReactionsProps {
  /** Room ID containing the message */
  roomId: string;
  /** Event ID of the message */
  eventId: string;
  /** Whether to show add reaction button */
  showAddButton?: boolean;
  /** Maximum reactions to display */
  maxReactions?: number;
  /** Additional CSS classes */
  className?: string;
  /** Custom reaction options */
  reactionOptions?: ReactionOptions;
  /** Callback when reaction state changes */
  onReactionChange?: (reactions: MessageReactions) => void;
}

interface ReactionBadgeProps {
  /** Reaction data */
  reaction: MessageReaction;
  /** Whether current user has this reaction */
  isCurrentUser: boolean;
  /** Callback to toggle reaction */
  onToggle: () => void;
  /** List of users for tooltip */
  userList: string[];
}

interface EmojiPickerProps {
  /** Callback when emoji is selected */
  onEmojiSelect: (emoji: string) => void;
  /** Whether picker is open */
  open: boolean;
  /** Callback to close picker */
  onClose: () => void;
}

// =============================================================================
// Common emoji list (can be expanded)
// =============================================================================
const COMMON_EMOJIS = [
  '👍', '👎', '❤️', '😄', '😢', '😡', '😮', '👏',
  '🎉', '🔥', '💯', '⚡', '⭐', '✅', '❌', '❓'
];

// =============================================================================
// Reaction Badge Component
// =============================================================================

const ReactionBadge: React.FC<ReactionBadgeProps> = ({
  reaction,
  isCurrentUser,
  onToggle,
  userList,
}) => {
  const getUserDisplayName = useCallback((userId: string) => {
    return userId.split(':')[0].replace('@', '');
  }, []);

  const tooltipContent = useMemo(() => {
    if (userList.length === 0) return '';
    
    if (userList.length === 1) {
      return `${getUserDisplayName(userList[0])} reacted with ${reaction.key}`;
    } else if (userList.length <= 3) {
      const names = userList.map(getUserDisplayName).join(', ');
      return `${names} reacted with ${reaction.key}`;
    } else {
      const displayNames = userList.slice(0, 2).map(getUserDisplayName);
      const remainingCount = userList.length - 2;
      return `${displayNames.join(', ')} and ${remainingCount} others reacted with ${reaction.key}`;
    }
  }, [userList, reaction.key, getUserDisplayName]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isCurrentUser ? "default" : "outline"}
            size="sm"
            onClick={onToggle}
            className={`
              h-7 px-2 py-1 text-xs gap-1 hover:scale-105 transition-transform
              ${isCurrentUser ? 'bg-primary/10 border-primary' : ''}
            `}
          >
            <span className="text-base leading-none">{reaction.key}</span>
            <span className="font-medium">{reaction.count}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// =============================================================================
// Simple Emoji Picker Component
// =============================================================================

const EmojiPicker: React.FC<EmojiPickerProps> = ({
  onEmojiSelect,
  open,
  onClose,
}) => {
  const handleEmojiClick = useCallback((emoji: string) => {
    onEmojiSelect(emoji);
    onClose();
  }, [onEmojiSelect, onClose]);

  if (!open) return null;

  return (
    <div className="grid grid-cols-8 gap-1 p-2 max-w-64">
      {COMMON_EMOJIS.map((emoji) => (
        <Button
          key={emoji}
          variant="ghost"
          size="sm"
          onClick={() => handleEmojiClick(emoji)}
          className="h-8 w-8 p-0 text-lg hover:bg-muted hover:scale-110 transition-all"
        >
          {emoji}
        </Button>
      ))}
    </div>
  );
};

// =============================================================================
// Custom Hook for Message Reactions
// =============================================================================

export function useMessageReactions(
  roomId: string, 
  eventId: string,
  options: ReactionOptions = {}
) {
  const { client, isReady } = useMatrixClient();
  const [reactionHandler, setReactionHandler] = useState<ReactionHandler | null>(null);
  const [reactions, setReactions] = useState<MessageReactions | null>(null);
  const [loading, setLoading] = useState(false);

  // Initialize reaction handler
  useEffect(() => {
    if (client && isReady) {
      import('@/lib/matrix/chat/reaction-handler').then(({ ReactionHandler }) => {
        const handler = new ReactionHandler(client);
        setReactionHandler(handler);
      });
    }
  }, [client, isReady]);

  // Load reactions
  const loadReactions = useCallback(async () => {
    if (!reactionHandler || !roomId || !eventId) return;

    setLoading(true);
    try {
      const messageReactions = await reactionHandler.getMessageReactions(roomId, eventId, options);
      setReactions(messageReactions);
    } catch (error) {
      console.error('Failed to load reactions:', error);
    } finally {
      setLoading(false);
    }
  }, [reactionHandler, roomId, eventId, options]);

  // Load reactions when dependencies change
  useEffect(() => {
    loadReactions();
  }, [loadReactions]);

  // Add reaction
  const addReaction = useCallback(async (emoji: string) => {
    if (!reactionHandler) return false;

    const result = await reactionHandler.addReaction(roomId, eventId, emoji);
    if (result.success) {
      loadReactions(); // Refresh reactions
    }
    return result.success;
  }, [reactionHandler, roomId, eventId, loadReactions]);

  // Remove reaction
  const removeReaction = useCallback(async (emoji: string) => {
    if (!reactionHandler) return false;

    const result = await reactionHandler.removeReaction(roomId, eventId, emoji);
    if (result.success) {
      loadReactions(); // Refresh reactions
    }
    return result.success;
  }, [reactionHandler, roomId, eventId, loadReactions]);

  // Toggle reaction
  const toggleReaction = useCallback(async (emoji: string) => {
    if (!reactionHandler) return false;

    const result = await reactionHandler.toggleReaction(roomId, eventId, emoji);
    if (result.success) {
      loadReactions(); // Refresh reactions
    }
    return result.success;
  }, [reactionHandler, roomId, eventId, loadReactions]);

  return {
    reactions,
    loading,
    addReaction,
    removeReaction,
    toggleReaction,
    refreshReactions: loadReactions,
  };
}

// =============================================================================
// Main Message Reactions Component
// =============================================================================

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  roomId,
  eventId,
  showAddButton = true,
  maxReactions = 10,
  className = '',
  reactionOptions = {},
  onReactionChange,
}) => {
  const { client } = useMatrixClient();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const {
    reactions,
    loading,
    toggleReaction,
  } = useMessageReactions(roomId, eventId, {
    maxReactions,
    ...reactionOptions,
  });

  const currentUserId = client?.getUserId();

  // Notify parent of reaction changes
  useEffect(() => {
    if (reactions && onReactionChange) {
      onReactionChange(reactions);
    }
  }, [reactions, onReactionChange]);

  // Handle reaction toggle
  const handleReactionToggle = useCallback(async (emoji: string) => {
    await toggleReaction(emoji);
  }, [toggleReaction]);

  // Handle emoji selection from picker
  const handleEmojiSelect = useCallback(async (emoji: string) => {
    await toggleReaction(emoji);
    setShowEmojiPicker(false);
  }, [toggleReaction]);

  // Convert reaction data for rendering
  const reactionList = useMemo(() => {
    if (!reactions) return [];

    return Array.from(reactions.reactions.entries()).map(([emoji, reaction]) => ({
      emoji,
      reaction,
      userList: Array.from(reaction.users),
      isCurrentUser: reaction.currentUserReacted,
    }));
  }, [reactions]);

  // Don't render if no reactions and add button is hidden
  if (!loading && (!reactions || reactions.totalCount === 0) && !showAddButton) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {/* Existing Reactions */}
      {reactionList.map(({ emoji, reaction, userList, isCurrentUser }) => (
        <ReactionBadge
          key={emoji}
          reaction={reaction}
          isCurrentUser={isCurrentUser}
          onToggle={() => handleReactionToggle(emoji)}
          userList={userList}
        />
      ))}

      {/* Add Reaction Button */}
      {showAddButton && (
        <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:scale-105 transition-transform"
            >
              <Plus className="w-3 h-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <EmojiPicker
              onEmojiSelect={handleEmojiSelect}
              open={showEmojiPicker}
              onClose={() => setShowEmojiPicker(false)}
            />
          </PopoverContent>
        </Popover>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="text-xs text-muted-foreground">
          Loading reactions...
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Exports
// =============================================================================

export default MessageReactions;
export type { MessageReactionsProps };