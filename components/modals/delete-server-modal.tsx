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

export function DeleteServerModal() {
  const { isOpen, onClose, type, data } = useModal();
  const router = useRouter();

  const isModalOpen = isOpen && type === "deleteServer";
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
      
      // For Matrix, we need to remove all users and mark the room as "dead"
      // Since we can't truly delete a Matrix room, we'll leave it
      // First, kick all other members if we have permission
      const room = client.getRoom(decodedServerId);
      if (room) {
        const userId = client.getUserId();
        
        // Get all child rooms and leave/delete them too
        const spaceChildEvents = room.currentState.getStateEvents("m.space.child");
        for (const event of spaceChildEvents) {
          const childRoomId = event.getStateKey();
          if (childRoomId) {
            try {
              // Remove child from space first
              await client.sendStateEvent(
                decodedServerId,
                "m.space.child" as any,
                {},
                childRoomId
              );
              // Then leave the child room
              await client.leave(childRoomId);
            } catch (e) {
              console.warn("Failed to remove child room:", childRoomId, e);
            }
          }
        }

        // Try to kick all other members (requires admin power level)
        const members = room.getJoinedMembers();
        for (const member of members) {
          if (member.userId !== userId) {
            try {
              await client.kick(decodedServerId, member.userId, "Server deleted");
            } catch (e) {
              // Ignore if we can't kick
            }
          }
        }
      }

      // Finally leave the space ourselves
      await client.leave(decodedServerId);

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
      <DialogContent className="bg-[#313338] text-white p-0 overflow-hidden">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold text-white">
            Delete Server
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-400">
            Are you sure you want to do this?
            <br />
            <span className="font-semibold text-red-400">
              {serverName}
            </span>{" "}
            will be permanently deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="bg-[#2B2D31] px-6 py-4">
          <div className="flex items-center justify-between w-full">
            <Button variant="ghost" disabled={isLoading} onClick={onClose} className="text-white hover:bg-zinc-700">
              Cancel
            </Button>
            <Button disabled={isLoading} onClick={onClick} className="bg-red-600 hover:bg-red-700 text-white">
              Confirm
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
