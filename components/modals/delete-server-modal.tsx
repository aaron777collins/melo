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
import { deleteServer } from "@/lib/matrix/delete-server";
import { useToast } from "@/hooks/use-toast";

export function DeleteServerModal() {
  const { isOpen, onClose, type, data } = useModal();
  const router = useRouter();
  const { toast } = useToast();

  const isModalOpen = isOpen && type === "deleteServer";
  const { server, space } = data;

  // Get name from either server or space
  const serverName = server?.name || space?.name || "this server";
  const serverId = server?.id || space?.id;

  const [isLoading, setIsLoading] = useState(false);

  const onClick = async () => {
    if (!serverId) {
      toast.error("No server ID found");
      return;
    }
    
    setIsLoading(true);
    const loadingToast = toast.loading("Deleting server...");
    
    try {
      const result = await deleteServer({
        serverId: serverId
      });

      toast.dismiss(loadingToast);

      if (result.success) {
        if (result.warning) {
          toast.error(`Server deleted but with warnings: ${result.warning}`, {
            duration: 10000
          });
        } else {
          toast.success("Successfully deleted server");
        }
        
        onClose();
        router.refresh();
        router.push("/");
      } else {
        const errorMessage = result.error?.message || "Failed to delete server";
        const retryAction = result.error?.retryable ? {
          label: "Retry",
          onClick: () => onClick()
        } : undefined;
        
        toast.error(`Failed to delete server: ${errorMessage}`, {
          action: retryAction,
          duration: 10000
        });
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(`Failed to delete server: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
