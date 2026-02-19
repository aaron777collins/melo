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
import { useModal } from "@/hooks/use-modal-store";
import { getClient } from "@/lib/matrix/client";

export function DeleteChannelModal() {
  const { isOpen, onClose, type, data } = useModal();
  const router = useRouter();
  const params = useParams();

  const isModalOpen = isOpen && type === "deleteChannel";
  const { server, channel, space, spaceChannel } = data;

  const [isLoading, setIsLoading] = useState(false);

  const onClick = async () => {
    try {
      setIsLoading(true);

      const client = getClient();
      if (!client) {
        console.error("Matrix client not initialized");
        return;
      }

      // Get channel/room ID for Matrix operations
      const channelId = channel?.id || spaceChannel?.roomId;
      const serverId = server?.id || space?.id;
      
      if (!channelId) {
        console.error("No channel ID found");
        return;
      }

      // Leave and forget the Matrix room (delete for this user)
      await client.leave(decodeURIComponent(channelId));
      await client.forget(decodeURIComponent(channelId));

      // If this is a space child, remove it from the space
      if (serverId) {
        try {
          await client.sendStateEvent(
            decodeURIComponent(serverId),
            "m.space.child" as any,
            {},
            decodeURIComponent(channelId)
          );
        } catch (e) {
          console.warn("Failed to remove channel from space:", e);
        }
      }

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
    } catch (error) {
      console.error("Failed to delete channel:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const channelName = channel?.name || spaceChannel?.name || "this channel";

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white text-black p-0 overflow-hidden">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold">
            Delete Channel
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-500">
            Are you sure you want to do this?
            <br />
            <span className="font-semibold text-indigo-500">
              #{channelName}
            </span>{" "}
            will be permanently deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="bg-gray-100 px-6 py-4">
          <div className="flex items-center justify-between w-full">
            <Button variant="ghost" disabled={isLoading} onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" disabled={isLoading} onClick={onClick}>
              Confirm
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}