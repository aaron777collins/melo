"use client";

import React, { useState } from "react";
import { 
  MessageSquare, 
  MoreHorizontal, 
  Pin, 
  Reply, 
  Trash, 
  Edit, 
  Copy,
  Flag,
  Hash
} from "lucide-react";
import { MatrixEvent } from "matrix-js-sdk";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useMatrixClient } from "@/hooks/use-matrix-client";
import { useModal } from "@/hooks/use-modal-store";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface MessageActionsProps {
  /**
   * Matrix event for the message
   */
  event: MatrixEvent;
  
  /**
   * Room ID where the message exists
   */
  roomId: string;
  
  /**
   * Whether to show the actions (usually on hover)
   */
  show: boolean;
  
  /**
   * Current user's Matrix ID for permission checks
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
}

// =============================================================================
// Component
// =============================================================================

/**
 * Message actions dropdown component for Discord-style message interactions.
 * Provides options like reply, thread, pin, edit, delete based on permissions.
 */
export function MessageActions({
  event,
  roomId,
  show,
  currentUserId,
  onReply,
  onEdit,
  onReaction,
}: MessageActionsProps) {
  const { client } = useMatrixClient();
  const { onOpen } = useModal();
  const [isOpen, setIsOpen] = useState(false);
  
  // Check if current user is the message sender
  const isOwnMessage = event.getSender() === currentUserId;
  
  // Check if current user can moderate (admin/moderator)
  // TODO: Implement proper role checking
  const canModerate = false;
  
  // =============================================================================
  // Action Handlers
  // =============================================================================
  
  /**
   * Start a new thread from this message
   */
  const handleStartThread = async () => {
    try {
      const messageId = event.getId();
      if (!messageId || !client) return;
      
      // Navigate to thread view - create thread on first reply
      // TODO: Implement thread routing
      onOpen("threadView", { 
        originalEventId: messageId, 
        roomId 
      });
      
    } catch (error) {
      console.error("Failed to start thread:", error);
    }
    setIsOpen(false);
  };
  
  /**
   * Reply to message (quote reply, not thread)
   */
  const handleReply = () => {
    onReply?.(event);
    setIsOpen(false);
  };
  
  /**
   * Pin/unpin message
   */
  const handlePin = async () => {
    // TODO: Implement message pinning with Matrix
    console.log("Pin message:", event.getId());
    setIsOpen(false);
  };
  
  /**
   * Edit message (own messages only)
   */
  const handleEdit = () => {
    if (!isOwnMessage) return;
    onEdit?.(event);
    setIsOpen(false);
  };
  
  /**
   * Delete message
   */
  const handleDelete = async () => {
    try {
      if (!client || !event.getId()) return;
      
      const eventId = event.getId()!;
      
      if (isOwnMessage) {
        // Redact own message
        await client.redactEvent(roomId, eventId);
      } else if (canModerate) {
        // Moderator delete with reason
        await client.redactEvent(roomId, eventId, undefined, {
          reason: "Message removed by moderator"
        });
      }
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
    setIsOpen(false);
  };
  
  /**
   * Copy message content to clipboard
   */
  const handleCopy = async () => {
    try {
      const content = event.getContent();
      const text = content.body || "";
      
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error("Failed to copy message:", error);
    }
    setIsOpen(false);
  };
  
  /**
   * Copy message link (permalink)
   */
  const handleCopyLink = async () => {
    try {
      const eventId = event.getId();
      if (!eventId) return;
      
      // Create Matrix permalink
      const homeserver = client?.getHomeserverUrl() || "matrix.org";
      const link = `https://matrix.to/#/${roomId}/${eventId}`;
      
      await navigator.clipboard.writeText(link);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
    setIsOpen(false);
  };
  
  /**
   * Report message
   */
  const handleReport = () => {
    onOpen("reportMessage", { 
      eventId: event.getId()!, 
      roomId,
      senderId: event.getSender()!
    });
    setIsOpen(false);
  };
  
  // Don't render if not shown and not open
  if (!show && !isOpen) {
    return null;
  }
  
  return (
    <div className={cn(
      "absolute -top-4 right-2 z-10 flex items-center bg-white dark:bg-zinc-800 rounded-md shadow-md border border-zinc-200 dark:border-zinc-700 transition-opacity",
      show || isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
    )}>
      {/* Quick Actions */}
      <div className="flex items-center">
        {/* Add Reaction */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-700"
          onClick={() => onReaction?.("👍")}
        >
          <span className="text-sm">👍</span>
        </Button>
        
        {/* Reply */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-700"
          onClick={handleReply}
        >
          <Reply className="h-4 w-4" />
        </Button>
        
        {/* Start Thread */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-700"
          onClick={handleStartThread}
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
      </div>
      
      {/* More Actions Dropdown */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-700 border-l border-zinc-200 dark:border-zinc-600"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-48">
          {/* Pin Message */}
          {(canModerate || isOwnMessage) && (
            <>
              <DropdownMenuItem onClick={handlePin}>
                <Pin className="h-4 w-4 mr-2" />
                Pin Message
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          
          {/* Edit (own messages only) */}
          {isOwnMessage && (
            <DropdownMenuItem onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Message
            </DropdownMenuItem>
          )}
          
          {/* Copy Actions */}
          <DropdownMenuItem onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Text
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleCopyLink}>
            <Hash className="h-4 w-4 mr-2" />
            Copy Message Link
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* Delete (own messages or moderator) */}
          {(isOwnMessage || canModerate) && (
            <DropdownMenuItem 
              onClick={handleDelete}
              className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
            >
              <Trash className="h-4 w-4 mr-2" />
              Delete Message
            </DropdownMenuItem>
          )}
          
          {/* Report (other users' messages) */}
          {!isOwnMessage && (
            <DropdownMenuItem 
              onClick={handleReport}
              className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
            >
              <Flag className="h-4 w-4 mr-2" />
              Report Message
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default MessageActions;