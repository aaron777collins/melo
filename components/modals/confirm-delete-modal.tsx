"use client";

import React, { useState } from "react";
import { MatrixEvent } from "matrix-js-sdk";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useModal } from "@/hooks/use-modal-store";
import { useMatrixClient } from "@/hooks/use-matrix-client";
import { createModerationService } from "@/lib/matrix/moderation";

/**
 * Confirmation modal for message deletion
 * Shows before deleting a message and handles the actual deletion logic
 */
export function ConfirmDeleteModal() {
  const { isOpen, onClose, type, data } = useModal();
  const { client } = useMatrixClient();
  const [isLoading, setIsLoading] = useState(false);

  const isModalOpen = isOpen && type === "deleteMessage";
  const { eventId, roomId, currentUserId, isOwnMessage, canModerate } = data;

  /**
   * Handle the actual message deletion
   */
  const handleDelete = async () => {
    if (!client || !eventId || !roomId || !currentUserId) {
      console.error("Missing required data for message deletion");
      return;
    }

    try {
      setIsLoading(true);
      
      // Use the new moderation service for consistent logging and permissions
      const moderationService = createModerationService(client);
      const reason = isOwnMessage 
        ? "Message deleted by author" 
        : "Message removed by moderator";
      
      const result = await moderationService.deleteMessage(
        roomId,
        eventId,
        currentUserId,
        reason
      );

      if (result.success) {
        console.log(`Message ${eventId} deleted successfully`);
        onClose();
      } else {
        console.error("Failed to delete message:", result.error);
        // TODO: Show user-friendly error toast with result.error
      }

    } catch (error: any) {
      console.error("Failed to delete message:", error);
      
      // TODO: Show user-friendly error toast
      let errorMessage = "Failed to delete message";
      if (error.errcode === 'M_FORBIDDEN') {
        errorMessage = "You don't have permission to delete this message";
      } else if (error.errcode === 'M_NOT_FOUND') {
        errorMessage = "Message not found";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // For now, just log the error - could show toast notification
      console.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Determine the dialog title and description based on permissions
  const isModeratorDeletion = !isOwnMessage && canModerate;
  const title = isModeratorDeletion ? "Delete Message" : "Delete Message";
  const description = isModeratorDeletion 
    ? "Are you sure you want to delete this message? This action cannot be undone and will be visible to other moderators."
    : "Are you sure you want to delete your message? This action cannot be undone.";

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-zinc-900 text-black dark:text-white p-0 overflow-hidden max-w-md">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-xl text-center font-bold">
            {title}
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-500 dark:text-zinc-400">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="bg-gray-100 dark:bg-zinc-800 px-6 py-4">
          <div className="flex items-center justify-between w-full gap-3">
            <Button 
              variant="ghost" 
              disabled={isLoading} 
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              disabled={isLoading} 
              onClick={handleDelete}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}