"use client";

import { useState } from "react";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
  AlertDialogCancel
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

import { useModal } from "@/hooks/use-modal-store";
import { useMatrix } from "@/components/providers/matrix-provider";
import { createInviteService, InviteLink } from "@/lib/matrix/invites";
import { toast } from "sonner";

export function RevokeInviteModal() {
  const { isOpen, onClose, type, data } = useModal();
  const { client } = useMatrix();
  const [isLoading, setIsLoading] = useState(false);

  const isModalOpen = isOpen && type === "revokeInvite";
  const { inviteToRevoke, onInviteRevoked } = data;

  if (!inviteToRevoke) return null;

  const handleRevoke = async () => {
    if (!client) return;

    setIsLoading(true);
    try {
      const inviteService = createInviteService(client);
      inviteService.deleteInvite(inviteToRevoke.roomId, inviteToRevoke.url);
      
      toast.success("Invite revoked successfully");
      onInviteRevoked?.();
      onClose();
    } catch (error) {
      console.error("Failed to revoke invite:", error);
      toast.error("Failed to revoke invite");
    } finally {
      setIsLoading(false);
    }
  };

  const formatInviteInfo = (invite: InviteLink) => {
    const info = [];
    
    if (invite.slug) {
      info.push(`Custom slug: ${invite.slug}`);
    }
    
    if (invite.alias) {
      info.push(`Matrix alias: ${invite.alias}`);
    }
    
    if (invite.currentUses > 0) {
      info.push(`Used ${invite.currentUses} time${invite.currentUses === 1 ? '' : 's'}`);
    }
    
    if (invite.expiresAt) {
      const isExpired = invite.expiresAt < new Date();
      info.push(`${isExpired ? 'Expired' : 'Expires'}: ${invite.expiresAt.toLocaleDateString()}`);
    }
    
    return info;
  };

  const consequences = [
    "The invite link will become invalid immediately",
    "People with this link will no longer be able to join",
    "This action cannot be undone",
  ];

  if (inviteToRevoke.currentUses > 0) {
    consequences.push("Analytics data for this invite will be lost");
  }

  return (
    <AlertDialog open={isModalOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full">
              <Trash2 className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          </div>
          
          <AlertDialogTitle className="text-xl text-center font-bold">
            Revoke Invite Link
          </AlertDialogTitle>
          
          <AlertDialogDescription className="text-center">
            Are you sure you want to revoke this invite link?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Invite Details */}
          <div className="p-3 border rounded-lg bg-muted/50">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {inviteToRevoke.slug || "Standard Link"}
                </span>
                {inviteToRevoke.alias && (
                  <Badge variant="secondary" className="text-xs">Alias</Badge>
                )}
                {inviteToRevoke.currentUses > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {inviteToRevoke.currentUses} use{inviteToRevoke.currentUses === 1 ? '' : 's'}
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                {formatInviteInfo(inviteToRevoke).map((info, index) => (
                  <div key={index}>• {info}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Consequences warning */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-2">This action will:</div>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {consequences.map((consequence, index) => (
                  <li key={index}>{consequence}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRevoke}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Revoke Invite
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}