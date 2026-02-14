"use client";

import React, { useState } from "react";
import { 
  Heart, 
  MessageSquare, 
  Edit3, 
  Trash2, 
  MoreHorizontal,
  Copy,
  Pin,
  Reply,
  Smile
} from "lucide-react";
import { MatrixEvent } from "matrix-js-sdk";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { useModal } from "@/hooks/use-modal-store";
import { cn } from "@/lib/utils";
import { canEditMessage, canDeleteMessage, addReaction } from "../../services/matrix-message";
import { useMatrixClient } from "@/hooks/use-matrix-client";

// =============================================================================
// Types & Interfaces
// =============================================================================

export interface MessageActionsProps {
  /**
   * Matrix event for the message
   */
  event: MatrixEvent;
  
  /**
   * Room ID where the message was sent
   */
  roomId: string;
  
  /**
   * Whether to show the actions (typically on hover)
   */
  show: boolean;
  
  /**
   * Current user's Matrix ID
   */
  currentUserId?: string;
  
  /**
   * Callback when reply is clicked
   */
  onReply?: (event: MatrixEvent) => void;
  
  /**
   * Callback when edit is clicked
   */
  onEdit?: (event: MatrixEvent) => void;
  
  /**
   * Callback when reaction is added
   */
  onReaction?: (emoji: string) => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

// Quick reaction emojis for easy access
const QUICK_REACTIONS = ["👍", "👎", "❤️", "😂", "😮", "😢", "🎉"];

// =============================================================================
// Hook for permissions checking
// =============================================================================

function useMessagePermissions(event: MatrixEvent, roomId: string, currentUserId?: string) {
  const [permissions, setPermissions] = React.useReducer(
    (state: any, action: any) => ({ ...state, ...action }),
    {
      canEdit: false,
      canDelete: false,
      canReact: true, // Generally everyone can react
      canReply: true, // Generally everyone can reply
      isOwnMessage: false,
      loading: true
    }
  );

  React.useEffect(() => {
    const checkPermissions = async () => {
      if (!currentUserId || !event.getId()) {
        setPermissions({ loading: false });
        return;
      }

      const isOwn = event.getSender() === currentUserId;
      
      try {
        const canEdit = await canEditMessage(roomId, event.getId()!);
        const canDelete = await canDeleteMessage(roomId, event.getId()!);
        
        setPermissions({
          canEdit,
          canDelete,
          canReact: true,
          canReply: true,
          isOwnMessage: isOwn,
          loading: false
        });
      } catch (error) {
        console.error("Error checking message permissions:", error);
        setPermissions({
          canEdit: isOwn, // Fallback: can edit own messages
          canDelete: isOwn, // Fallback: can delete own messages
          canReact: true,
          canReply: true,
          isOwnMessage: isOwn,
          loading: false
        });
      }
    };

    checkPermissions();
  }, [event, roomId, currentUserId]);

  return permissions;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Copy message text to clipboard
 */
async function copyMessageToClipboard(event: MatrixEvent): Promise<boolean> {
  try {
    const content = event.getContent();
    const text = content.body || "";
    
    if (!text) {
      return false;
    }
    
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error("Failed to copy message:", error);
    return false;
  }
}

/**
 * Generate Matrix permalink for a message
 */
function getMessagePermalink(roomId: string, eventId: string): string {
  return `https://matrix.to/#/${roomId}/${eventId}`;
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Message action buttons that appear on hover over messages
 * Provides quick access to common message actions like react, reply, edit, delete
 */
export function MessageActions({
  event,
  roomId,
  show,
  currentUserId,
  onReply,
  onEdit,
  onReaction,
  className
}: MessageActionsProps) {
  const { onOpen } = useModal();
  const { client } = useMatrixClient();
  const [isLoading, setIsLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  const permissions = useMessagePermissions(event, roomId, currentUserId);
  
  const eventId = event.getId();
  const messageContent = event.getContent();

  // Don't render if we don't have required data
  if (!eventId || !messageContent) {
    return null;
  }

  // =============================================================================
  // Action Handlers
  // =============================================================================

  const handleReaction = async (emoji: string) => {
    if (!client || isLoading) return;
    
    try {
      setIsLoading(true);
      await addReaction(roomId, eventId, emoji);
      onReaction?.(emoji);
    } catch (error) {
      console.error("Failed to add reaction:", error);
      // TODO: Show error toast
    } finally {
      setIsLoading(false);
    }
  };

  const handleReply = () => {
    onReply?.(event);
  };

  const handleEdit = () => {
    onEdit?.(event);
  };

  const handleDelete = () => {
    // Open confirmation modal with Matrix integration
    onOpen("deleteMessage", {
      roomId,
      query: { eventId },
      // For Matrix integration, we'll need to update the modal
      apiUrl: undefined // Matrix service will be used instead of API
    });
  };

  const handleCopy = async () => {
    const success = await copyMessageToClipboard(event);
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handlePin = () => {
    // TODO: Implement message pinning
    console.log("Pin message:", eventId);
  };

  const handleThreadStart = () => {
    // TODO: Implement thread starting
    console.log("Start thread from message:", eventId);
  };

  const handleCopyLink = async () => {
    try {
      const permalink = getMessagePermalink(roomId, eventId);
      await navigator.clipboard.writeText(permalink);
      // TODO: Show success toast
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  // =============================================================================
  // Quick Reaction Buttons
  // =============================================================================

  const QuickReactionButton = ({ emoji }: { emoji: string }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            onClick={() => handleReaction(emoji)}
            disabled={isLoading || !permissions.canReact}
          >
            <span className="text-base">{emoji}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Add {emoji} reaction</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  // =============================================================================
  // Main Action Buttons
  // =============================================================================

  const MainActionButton = ({ 
    icon: Icon, 
    label, 
    onClick, 
    disabled = false,
    variant = "ghost" as const
  }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    onClick: () => void;
    disabled?: boolean;
    variant?: "ghost" | "default";
  }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size="sm"
            className="h-8 w-8 p-0 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            onClick={onClick}
            disabled={disabled || isLoading}
          >
            <Icon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  // Don't render anything if not shown or still loading permissions
  if (!show || permissions.loading) {
    return null;
  }

  return (
    <div 
      className={cn(
        "absolute right-4 top-1 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 px-2 py-1 flex items-center gap-1 z-10",
        "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
        show && "opacity-100",
        className
      )}
    >
      {/* Quick Reactions */}
      <div className="flex items-center gap-0.5 mr-2">
        {QUICK_REACTIONS.slice(0, 3).map((emoji) => (
          <QuickReactionButton key={emoji} emoji={emoji} />
        ))}
      </div>

      <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-600 mx-1" />

      {/* Main Actions */}
      <div className="flex items-center gap-0.5">
        {/* Reply */}
        {permissions.canReply && (
          <MainActionButton
            icon={Reply}
            label="Reply"
            onClick={handleReply}
          />
        )}

        {/* Edit (only for own messages) */}
        {permissions.canEdit && (
          <MainActionButton
            icon={Edit3}
            label="Edit message"
            onClick={handleEdit}
          />
        )}

        {/* Delete (only for own messages or with permissions) */}
        {permissions.canDelete && (
          <MainActionButton
            icon={Trash2}
            label="Delete message"
            onClick={handleDelete}
          />
        )}

        {/* More actions dropdown */}
        <DropdownMenu>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>More actions</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenuContent 
            align="end" 
            className="w-48 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
          >
            {/* Additional reactions */}
            <div className="px-2 py-1">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Quick Reactions
              </p>
              <div className="flex gap-1 flex-wrap">
                {QUICK_REACTIONS.slice(3).map((emoji) => (
                  <button
                    key={emoji}
                    className="w-6 h-6 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors"
                    onClick={() => handleReaction(emoji)}
                    disabled={!permissions.canReact}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <DropdownMenuSeparator />

            {/* Copy message */}
            <DropdownMenuItem
              onClick={handleCopy}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              {copySuccess ? "Copied!" : "Copy text"}
            </DropdownMenuItem>

            {/* Copy link */}
            <DropdownMenuItem
              onClick={handleCopyLink}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy message link
            </DropdownMenuItem>

            {/* Pin message (placeholder for future implementation) */}
            <DropdownMenuItem
              onClick={handlePin}
              className="flex items-center gap-2"
              disabled={true} // TODO: Enable when pinning is implemented
            >
              <Pin className="h-4 w-4" />
              Pin message
            </DropdownMenuItem>

            {/* Start thread (placeholder for future implementation) */}
            <DropdownMenuItem
              onClick={handleThreadStart}
              className="flex items-center gap-2"
              disabled={true} // TODO: Enable when threads are implemented
            >
              <MessageSquare className="h-4 w-4" />
              Start thread
            </DropdownMenuItem>

            {permissions.canEdit && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleEdit}
                  className="flex items-center gap-2"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit message
                </DropdownMenuItem>
              </>
            )}

            {permissions.canDelete && (
              <DropdownMenuItem
                onClick={handleDelete}
                className="flex items-center gap-2 text-red-600 dark:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
                Delete message
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default MessageActions;