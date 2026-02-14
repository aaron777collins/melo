"use client";

import React, { useState } from "react";

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
import { deleteMessage } from "@/apps/web/services/matrix-message";

export function DeleteMessageModal() {
  const {
    isOpen,
    onClose,
    type,
    data: { roomId, query }
  } = useModal();

  const isModalOpen = isOpen && type === "deleteMessage";
  const eventId = query?.eventId;

  const [isLoading, setIsLoading] = useState(false);

  const onClick = async () => {
    if (!roomId || !eventId) {
      console.error("Missing roomId or eventId for message deletion");
      return;
    }

    try {
      setIsLoading(true);

      await deleteMessage(roomId, eventId, "Message deleted by user");

      onClose();
    } catch (error) {
      console.error("Failed to delete message:", error);
      // TODO: Show error toast notification
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white text-black p-0 overflow-hidden">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold">
            Delete Message
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-500">
            Are you sure you want to do this?
            <br />
            The message will be permanently deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="bg-gray-100 px-6 py-4">
          <div className="flex items-center justify-between w-full">
            <Button variant="ghost" disabled={isLoading} onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={isLoading}
              onClick={onClick}
            >
              Confirm
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
