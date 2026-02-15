"use client";

import { useEffect, useState } from "react";
import { Copy, QrCode, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import { useModal } from "@/hooks/use-modal-store";
import { useMatrix } from "@/components/providers/matrix-provider";
import { createInviteService, InviteLink } from "@/lib/matrix/invites";

export function InviteModal() {
  const { isOpen, onClose, type, data } = useModal();
  const { client } = useMatrix();
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);

  const isModalOpen = isOpen && type === "invite";
  const { space, inviteUrl } = data;

  // Generate a quick invite when modal opens if no invite URL provided
  useEffect(() => {
    if (isModalOpen && client && space && !inviteUrl) {
      generateQuickInvite();
    }
  }, [isModalOpen, client, space, inviteUrl]);

  const generateQuickInvite = async () => {
    if (!client || !space) return;

    try {
      const inviteService = createInviteService(client);
      const result = await inviteService.createInvite(space.id);
      
      if (result.success && result.invite) {
        // Generate QR code for the invite
        await generateQRCode(result.invite);
      }
    } catch (error) {
      console.error("Failed to generate quick invite:", error);
    }
  };

  const generateQRCode = async (invite: InviteLink) => {
    if (!client) return;
    
    setIsGeneratingQR(true);
    try {
      const inviteService = createInviteService(client);
      const qrResult = await inviteService.generateQRCode(invite);
      
      if (qrResult.success) {
        setQrCodeUrl(qrResult.dataUrl || null);
      }
    } catch (error) {
      console.error("Failed to generate QR code:", error);
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const handleCopy = async () => {
    const url = inviteUrl || (space ? `${window.location.origin}/rooms/${space.id}` : "");
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Invite link copied to clipboard!");
    } catch {
      toast.error("Failed to copy invite link");
    }
  };

  const handleExternalLink = () => {
    const url = inviteUrl || (space ? `${window.location.origin}/rooms/${space.id}` : "");
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleClose = () => {
    setQrCodeUrl(null);
    onClose();
  };

  const displayUrl = inviteUrl || (space ? `${window.location.origin}/rooms/${space.id}` : "");

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite to {space?.name}</DialogTitle>
          <DialogDescription>
            Share this link to let people join your space.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Invite Link</Label>
            <div className="flex gap-2">
              <Input
                value={displayUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="shrink-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExternalLink}
                className="shrink-0"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {qrCodeUrl && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  QR Code
                </Label>
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img
                    src={qrCodeUrl}
                    alt="Invite QR Code"
                    className="w-48 h-48"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Scan with a phone to join {space?.name}
                </p>
              </div>
            </>
          )}

          {!qrCodeUrl && !isGeneratingQR && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (space) {
                  generateQuickInvite();
                }
              }}
              className="w-full"
            >
              <QrCode className="h-4 w-4 mr-2" />
              Generate QR Code
            </Button>
          )}

          {isGeneratingQR && (
            <div className="text-center text-sm text-muted-foreground">
              Generating QR code...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}