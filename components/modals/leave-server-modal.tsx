"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

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

export function LeaveServerModal() {
  const { isOpen, onClose, type, data } = useModal();
  const router = useRouter();

  const isModalOpen = isOpen && type === "leaveServer";
  const { server, space } = data;

  // Get name from either server or space
  const serverName = server?.name || space?.name || "this server";
  const serverId = server?.id || space?.id;

  const [isLoading, setIsLoading] = useState(false);

  const onClick = async () => {
    if (!serverId) return;
    
    try {
      setIsLoading(true);

      const client = getClient();
      if (!client) {
        throw new Error("Matrix client not initialized");
      }

      const decodedServerId = decodeURIComponent(serverId);
      
      // Leave the Matrix space/room
      await client.leave(decodedServerId);

      // Also leave all child rooms if this is a space
      const room = client.getRoom(decodedServerId);
      if (room) {
        const spaceChildEvents = room.currentState.getStateEvents("m.space.child");
        for (const event of spaceChildEvents) {
          const childRoomId = event.getStateKey();
          if (childRoomId) {
            try {
              await client.leave(childRoomId);
            } catch (e) {
              // Ignore errors leaving child rooms
              console.warn("Failed to leave child room:", childRoomId, e);
            }
          }
        }
      }

      onClose();
      router.refresh();
      router.push("/");
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent 
        data-testid="leave-server-modal" 
        className="bg-[#313338] text-white p-0 overflow-hidden"
      >
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold text-white">
            Leave Server
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-400">
            Are you sure? You want to leave{" "}
            <span className="font-semibold text-yellow-400">
              {serverName}
            </span>
            ?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="bg-[#2B2D31] px-6 py-4">
          <div className="flex items-center justify-between w-full">
            <Button variant="ghost" disabled={isLoading} onClick={onClose} className="text-white hover:bg-zinc-700">
              Cancel
            </Button>
            <Button 
              data-testid="confirm-leave-button"
              disabled={isLoading} 
              onClick={onClick} 
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              Confirm
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
