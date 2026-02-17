/**
 * Recovery Key Modal
 * 
 * Displays the generated recovery key to the user and provides options to copy
 * or download it. Requires user confirmation before allowing dismissal.
 */

"use client";

import { useState, useCallback } from "react";
import { Copy, Download, Shield, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

import { useModal } from "@/hooks/use-modal-store";

export function RecoveryKeyModal() {
  const { isOpen, onClose, type, data } = useModal();
  const [hasConfirmedSaved, setHasConfirmedSaved] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const isModalOpen = isOpen && type === "recoveryKey";
  const { recoveryKey, onRecoveryKeySaved } = data;

  const handleCopy = useCallback(async () => {
    if (!recoveryKey) return;

    try {
      await navigator.clipboard.writeText(recoveryKey);
      toast.success("Recovery key copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy recovery key:", error);
      toast.error("Failed to copy recovery key");
    }
  }, [recoveryKey]);

  const handleDownload = useCallback(async () => {
    if (!recoveryKey) return;

    setIsDownloading(true);
    try {
      // Create a text file with the recovery key
      const content = `HAOS Recovery Key
Generated: ${new Date().toLocaleString()}

Your recovery key:
${recoveryKey}

⚠️ IMPORTANT:
- Keep this key safe and secure
- You'll need it to recover your account if you lose access
- Anyone with this key can access your encrypted messages
- Store it in a password manager or secure location
`;

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `haos-recovery-key-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      toast.success("Recovery key downloaded successfully!");
    } catch (error) {
      console.error("Failed to download recovery key:", error);
      toast.error("Failed to download recovery key");
    } finally {
      setIsDownloading(false);
    }
  }, [recoveryKey]);

  const handleClose = useCallback(() => {
    if (!hasConfirmedSaved) {
      toast.error("Please confirm you have saved your recovery key before continuing");
      return;
    }

    // Call the callback if provided
    onRecoveryKeySaved?.();
    
    // Reset state
    setHasConfirmedSaved(false);
    onClose();
  }, [hasConfirmedSaved, onRecoveryKeySaved, onClose]);

  if (!recoveryKey) return null;

  return (
    <Dialog 
      open={isModalOpen} 
      onOpenChange={(open) => {
        if (!open) {
          handleClose();
        }
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full">
              <Shield className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          
          <DialogTitle className="text-xl text-center font-bold">
            Save Your Recovery Key
          </DialogTitle>
          
          <DialogDescription className="text-center">
            Your encryption recovery key has been generated. Save it securely to recover your account if needed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Security warning */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="space-y-1">
              <div className="font-medium">Important Security Information:</div>
              <ul className="list-disc list-inside space-y-1 text-sm mt-2">
                <li>Keep this recovery key safe and secure</li>
                <li>Anyone with this key can access your encrypted messages</li>
                <li>You'll need it to recover your account if you lose access</li>
                <li>Store it in a password manager or secure location</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Recovery key display */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Your Recovery Key</Label>
            <div className="flex gap-2">
              <Input
                value={recoveryKey}
                readOnly
                className="font-mono text-sm bg-gray-50 dark:bg-gray-900"
                type="password"
                id="recovery-key-input"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const input = document.getElementById('recovery-key-input') as HTMLInputElement;
                  if (input) {
                    input.type = input.type === 'password' ? 'text' : 'password';
                  }
                }}
                className="shrink-0"
              >
                👁️
              </Button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCopy}
              className="flex-1"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy to Clipboard
            </Button>
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              {isDownloading ? "Downloading..." : "Download as File"}
            </Button>
          </div>

          <Separator />

          {/* Confirmation checkbox */}
          <div className="flex items-start space-x-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <Checkbox
              id="confirm-saved"
              checked={hasConfirmedSaved}
              onCheckedChange={(checked) => setHasConfirmedSaved(!!checked)}
            />
            <div className="space-y-1 leading-none">
              <label
                htmlFor="confirm-saved"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                I have safely stored my recovery key
              </label>
              <p className="text-xs text-muted-foreground">
                You must confirm that you have saved your recovery key before continuing.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleClose}
            disabled={!hasConfirmedSaved}
            className="w-full"
          >
            <ShieldCheck className="h-4 w-4 mr-2" />
            I've Saved My Recovery Key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}