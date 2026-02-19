"use client";

import React, { useState, useEffect } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useModal } from "@/hooks/use-modal-store";
import { getClient } from "@/lib/matrix/client";
import { createInviteService, InviteLink } from "@/lib/matrix/invites";

export function InviteModal() {
  const { isOpen, onOpen, onClose, type, data } = useModal();
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<InviteLink | null>(null);

  const isModalOpen = isOpen && type === "invite";
  const { server, space, inviteUrl: existingInviteUrl } = data;

  // Get name and ID from either server or space
  const serverName = server?.name || space?.name || "this server";
  const serverId = server?.id || space?.id;

  // Generate invite when modal opens
  useEffect(() => {
    if (isModalOpen && serverId && !existingInviteUrl) {
      generateInvite();
    }
  }, [isModalOpen, serverId, existingInviteUrl]);

  const generateInvite = async () => {
    if (!serverId) return;
    
    const client = getClient();
    if (!client) return;

    setIsLoading(true);
    try {
      const inviteService = createInviteService(client);
      const decodedServerId = decodeURIComponent(serverId);
      const result = await inviteService.createInvite(decodedServerId);
      
      if (result.success && result.invite) {
        setInviteLink(result.invite);
      }
    } catch (error) {
      console.error("Failed to generate invite:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Compute the invite URL
  const inviteUrl = existingInviteUrl || 
    (inviteLink?.url) || 
    (serverId ? `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${encodeURIComponent(serverId)}` : "");

  const onCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1000);
  };

  const onNew = async () => {
    await generateInvite();
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#313338] text-white p-0 overflow-hidden">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold text-white">
            Invite Friends
          </DialogTitle>
        </DialogHeader>
        <div className="p-6">
          <Label className="uppercase text-xs font-bold text-zinc-300">
            Server invite link
          </Label>
          <div className="flex items-center mt-2 gap-x-2">
            <Input
              readOnly
              disabled={isLoading}
              value={inviteUrl}
              className="bg-[#2B2D31] border-0 focus-visible:ring-0 text-white focus-visible:ring-offset-0"
            />
            <Button disabled={isLoading} onClick={onCopy} size="icon" className="bg-[#5865F2] hover:bg-[#4752C4] text-white">
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
          <Button
            disabled={isLoading}
            onClick={onNew}
            variant="link"
            size="sm"
            className="text-xs text-zinc-400 mt-4 hover:text-zinc-300"
          >
            Generate a new link
            <RefreshCw className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
