"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useModal } from "@/hooks/use-modal-store";
import { useToast } from "@/hooks/use-toast";
import { deleteRoom } from "@/lib/matrix/delete-room";

export function DeleteChannelModal() {
  const { isOpen, onClose, type, data } = useModal();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const isModalOpen = isOpen && type === "deleteChannel";
  const { server, channel, space, spaceChannel } = data;

  const [isLoading, setIsLoading] = useState(false);
  const [nameConfirmation, setNameConfirmation] = useState("");

  // Get channel name for confirmation
  const channelName = channel?.name || spaceChannel?.name || "this channel";
  
  // Enable delete button only when name matches exactly and not loading
  const isDeleteEnabled = nameConfirmation === channelName && !isLoading;

  // Enhanced deletion function with toast notifications and retry
  const performDeletion = async () => {
    const channelId = channel?.id || spaceChannel?.roomId;
    const serverId = server?.id || space?.id;

    if (!channelId) {
      toast.error("No channel ID found");
      return false;
    }

    const loadingToastId = toast.loading("Deleting channel...");

    try {
      const result = await deleteRoom({
        roomId: channelId,
        spaceId: serverId
      });

      toast.dismiss(loadingToastId);

      if (result.success) {
        toast.success("Channel deleted successfully");
        
        // Close modal and navigate
        onClose();
        router.refresh();
        
        // Navigate back to server
        if (serverId) {
          router.push(`/servers/${encodeURIComponent(serverId)}`);
        } else if (params?.serverId) {
          router.push(`/servers/${params.serverId}`);
        } else {
          router.push("/");
        }
        
        return true;
      } else if (result.error) {
        // Handle error with conditional retry option
        const errorMessage = `Failed to delete channel: ${result.error.message}`;
        
        if (result.error.retryable) {
          toast.error(errorMessage, {
            action: {
              label: "Retry",
              onClick: performDeletion
            },
            duration: 10000
          });
        } else {
          toast.error(errorMessage, {
            duration: 8000
          });
        }
        
        return false;
      }
    } catch (error) {
      toast.dismiss(loadingToastId);
      toast.error(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        action: {
          label: "Retry",
          onClick: performDeletion
        },
        duration: 10000
      });
      return false;
    }
  };

  const onClick = async () => {
    if (isLoading) return; // Prevent multiple clicks
    
    try {
      setIsLoading(true);
      await performDeletion();
    } finally {
      setIsLoading(false);
    }
  };

  // Reset name confirmation when modal closes
  const handleClose = () => {
    setNameConfirmation("");
    onClose();
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[#313338] text-white p-0 overflow-hidden">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold text-white">
            Delete Channel
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-400 space-y-2">
            <div>
              Are you sure you want to delete this channel?
            </div>
            <div>
              <span className="font-semibold text-red-400">
                #{channelName}
              </span>{" "}
              channel will be permanently deleted.
            </div>
            <div className="text-red-400 font-medium mt-4">
              ⚠️ This action cannot be undone.
            </div>
            <div className="text-red-300 text-sm">
              All messages and history will be permanently lost.
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4">
          <div className="space-y-4">
            <div className="text-sm text-zinc-300">
              Type <span className="font-semibold text-white">&quot;{channelName}&quot;</span> to confirm deletion:
            </div>
            <Input
              placeholder="Type channel name to confirm"
              value={nameConfirmation}
              onChange={(e) => setNameConfirmation(e.target.value)}
              disabled={isLoading}
              className="bg-[#1e1f22] border-[#3f3f46] text-white focus:border-red-500"
              autoComplete="off"
              autoFocus
            />
            {nameConfirmation && nameConfirmation !== channelName && (
              <div className="text-red-400 text-sm">
                Channel name does not match. Please type &quot;{channelName}&quot; exactly.
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="bg-[#2B2D31] px-6 py-4">
          <div className="flex items-center justify-between w-full">
            <Button 
              variant="ghost" 
              disabled={isLoading} 
              onClick={handleClose} 
              className="text-white hover:bg-zinc-700"
            >
              Cancel
            </Button>
            <Button 
              disabled={!isDeleteEnabled || isLoading} 
              onClick={onClick} 
              className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Deleting..." : "Delete Channel"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}