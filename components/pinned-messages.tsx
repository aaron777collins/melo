"use client";

import React from "react";
import { 
  Pin, 
  PinOff, 
  X, 
  MessageSquare,
  Clock,
  User
} from "lucide-react";
import { format } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useModal } from "@/hooks/use-modal-store";
import { usePins } from "@/hooks/use-pins";
import { useMatrixClient } from "@/hooks/use-matrix-client";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface PinnedMessagesProps {
  /** Room ID to display pinned messages for */
  roomId?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Modal component for displaying and managing pinned messages in a room.
 * Allows users to view all pinned messages and unpin them if they have permissions.
 */
export function PinnedMessages({ roomId }: PinnedMessagesProps) {
  const { isOpen, onClose, type, data } = useModal();
  const { client } = useMatrixClient();
  
  const isModalOpen = isOpen && type === "pinnedMessages";
  const effectiveRoomId = roomId || data.roomId || "";
  
  const { 
    pinnedMessages, 
    unpinMessage, 
    canPin, 
    loading,
    hasPins 
  } = usePins(effectiveRoomId);
  
  const currentUserId = client?.getUserId();
  
  // =============================================================================
  // Event Handlers
  // =============================================================================
  
  /**
   * Handle unpinning a message
   */
  const handleUnpin = async (eventId: string) => {
    try {
      const success = await unpinMessage(eventId);
      if (!success) {
        console.error("Failed to unpin message");
      }
    } catch (error) {
      console.error("Failed to unpin message:", error);
    }
  };
  
  /**
   * Navigate to a pinned message (jump to message in timeline)
   */
  const handleJumpToMessage = (eventId: string) => {
    // TODO: Implement message navigation
    console.log("Jump to message:", eventId);
    onClose();
  };
  
  /**
   * Get user display name from Matrix client
   */
  const getUserDisplayName = (userId: string): string => {
    if (!client || !effectiveRoomId) return userId;
    
    try {
      const room = client.getRoom(effectiveRoomId);
      const member = room?.getMember(userId);
      return member?.name || member?.rawDisplayName || userId;
    } catch {
      return userId;
    }
  };
  
  /**
   * Get user avatar URL from Matrix client
   */
  const getUserAvatarUrl = (userId: string): string | undefined => {
    // TODO: Implement proper avatar URL extraction from Matrix user profile
    // For now, return undefined to use fallback initials
    return undefined;
  };
  
  // Don't render if not the pinned messages modal
  if (!isModalOpen) {
    return null;
  }
  
  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Pin className="h-5 w-5" />
            Pinned Messages
            {hasPins && (
              <span className="text-sm text-zinc-500 font-normal">
                ({pinnedMessages.length})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 p-6">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-zinc-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-zinc-500" />
                Loading pinned messages...
              </div>
            </div>
          )}
          
          {!loading && !hasPins && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Pin className="h-12 w-12 text-zinc-300 mb-4" />
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                No pinned messages
              </h3>
              <p className="text-zinc-500 text-sm max-w-md">
                Pin important messages to keep them easily accessible at the top of the channel.
                Only users with permission can pin messages.
              </p>
            </div>
          )}
          
          {!loading && hasPins && (
            <div className="space-y-4">
              {pinnedMessages.map((pin) => (
                <div
                  key={pin.eventId}
                  className="flex gap-3 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  {/* User Avatar */}
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={getUserAvatarUrl(pin.sender)} />
                    <AvatarFallback>
                      {getUserDisplayName(pin.sender).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Message Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                        {getUserDisplayName(pin.sender)}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {format(new Date(pin.timestamp), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                      <Pin className="h-3 w-3 text-zinc-400" />
                    </div>
                    
                    {/* Message Body */}
                    <div className="text-sm text-zinc-700 dark:text-zinc-300 break-words">
                      {pin.event ? (
                        <div>
                          {pin.content || (
                            <span className="italic text-zinc-500">
                              {pin.event.isRedacted() ? "Message deleted" : "No text content"}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="italic text-zinc-500">
                          Message could not be loaded
                        </span>
                      )}
                    </div>
                    
                    {/* Pin Metadata */}
                    <div className="flex items-center gap-1 mt-2 text-xs text-zinc-500">
                      <Clock className="h-3 w-3" />
                      <span>
                        Pinned {format(new Date(pin.pinnedAt), "MMM d 'at' h:mm a")}
                      </span>
                      {pin.pinnedBy && pin.pinnedBy !== pin.sender && (
                        <>
                          <span>•</span>
                          <User className="h-3 w-3" />
                          <span>by {getUserDisplayName(pin.pinnedBy)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-start gap-1">
                    {/* Jump to Message */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      onClick={() => handleJumpToMessage(pin.eventId)}
                      title="Jump to message"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    
                    {/* Unpin Message */}
                    {canPin() && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600"
                        onClick={() => handleUnpin(pin.eventId)}
                        title="Unpin message"
                      >
                        <PinOff className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t bg-zinc-50 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <div className="text-xs text-zinc-500">
              {canPin() ? (
                "You can pin messages from the message actions menu"
              ) : (
                "Only users with permission can pin and unpin messages"
              )}
            </div>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PinnedMessages;