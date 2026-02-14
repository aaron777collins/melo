/**
 * Security Setup Modal
 *
 * Provides UI for setting up Matrix secret storage (4S) with security phrase
 * or recovery key. Handles the initial setup flow and recovery key display.
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Shield,
  Key,
  Copy,
  Download,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  Loader2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
// Note: Using simple console logging instead of toast notifications

import {
  setupSecretStorage,
  getSecretStorageStatus,
  accessSecretStorage,
  type SecretStorageSetupResult,
  type SecretStorageStatus,
} from "@/lib/matrix/crypto/secrets";

// =============================================================================
// Types
// =============================================================================

export interface SecuritySetupModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Called when the modal should close */
  onClose: () => void;
  /** Called when setup is completed successfully */
  onComplete?: (recoveryKey?: string) => void;
}

type SetupStep = 
  | "choice"      // Choose setup method
  | "phrase"      // Enter security phrase
  | "recovery"    // Enter existing recovery key  
  | "generating"  // Setting up secret storage
  | "complete"    // Show recovery key and completion

interface SetupState {
  step: SetupStep;
  securityPhrase: string;
  recoveryKey: string;
  generatedRecoveryKey?: string;
  showRecoveryKey: boolean;
  error?: string;
  loading: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function SecuritySetupModal({ open, onClose, onComplete }: SecuritySetupModalProps) {
  const [state, setState] = useState<SetupState>({
    step: "choice",
    securityPhrase: "",
    recoveryKey: "",
    showRecoveryKey: false,
    loading: false,
  });

  const [status, setStatus] = useState<SecretStorageStatus | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const currentStatus = await getSecretStorageStatus();
      setStatus(currentStatus);
      
      // If already set up, go directly to access flow
      if (currentStatus.isSetUp && !currentStatus.hasRecoveryKey) {
        setState(prev => ({ ...prev, step: "recovery" }));
      }
    } catch (error) {
      console.error("Failed to load secret storage status:", error);
    }
  }, []);

  // Load current status when modal opens
  useEffect(() => {
    if (open) {
      loadStatus();
      // Reset state when modal opens
      setState({
        step: "choice",
        securityPhrase: "",
        recoveryKey: "",
        showRecoveryKey: false,
        loading: false,
      });
    }
  }, [open, loadStatus]);

  const handleSetupWithPhrase = useCallback(async () => {
    const phrase = state.securityPhrase.trim();
    
    if (!phrase) {
      setState(prev => ({ ...prev, error: "Please enter a security phrase" }));
      return;
    }
    
    // @security: Enforce minimum phrase strength
    if (phrase.length < 8) {
      setState(prev => ({ ...prev, error: "Security phrase must be at least 8 characters" }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: undefined, step: "generating" }));

    try {
      const result = await setupSecretStorage({
        securityPhrase: state.securityPhrase,
        backupExistingKeys: true,
      });

      if (result.success) {
        setState(prev => ({
          ...prev,
          loading: false,
          step: "complete",
          generatedRecoveryKey: result.recoveryKey,
        }));
        
        console.log("Security Setup Complete: Secret storage has been set up successfully");
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          step: "phrase",
          error: result.error || "Setup failed",
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        step: "phrase",
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  }, [state.securityPhrase]);

  const handleAccessWithRecovery = useCallback(async () => {
    if (!state.recoveryKey.trim()) {
      setState(prev => ({ ...prev, error: "Please enter your recovery key" }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: undefined }));

    try {
      const success = await accessSecretStorage({
        recoveryKey: state.recoveryKey,
      });

      if (success) {
        setState(prev => ({ ...prev, loading: false, step: "complete" }));
        console.log("Secret Storage Unlocked: You now have access to your encrypted secrets");
        onComplete?.();
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: "Invalid recovery key",
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  }, [state.recoveryKey, onComplete]);

  const handleCopyRecoveryKey = useCallback(() => {
    if (state.generatedRecoveryKey) {
      navigator.clipboard.writeText(state.generatedRecoveryKey);
      console.log("Copied to Clipboard: Recovery key has been copied to your clipboard");
    }
  }, [state.generatedRecoveryKey]);

  const handleDownloadRecoveryKey = useCallback(() => {
    if (state.generatedRecoveryKey) {
      const blob = new Blob([
        `HAOS Matrix Recovery Key\n` +
        `Generated: ${new Date().toISOString()}\n\n` +
        `Recovery Key:\n${state.generatedRecoveryKey}\n\n` +
        `Keep this key safe! You'll need it to access your encrypted messages ` +
        `if you lose access to all your devices.`
      ], { type: "text/plain" });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `haos-recovery-key-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      
      console.log("Recovery Key Downloaded: Keep this file safe - you'll need it to recover your encrypted data");
    }
  }, [state.generatedRecoveryKey]);

  const handleComplete = useCallback(() => {
    onComplete?.(state.generatedRecoveryKey);
    onClose();
  }, [onComplete, onClose, state.generatedRecoveryKey]);

  const renderStep = () => {
    switch (state.step) {
      case "choice":
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Shield className="mx-auto h-12 w-12 text-blue-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Set Up Secure Backup</h3>
              <p className="text-sm text-muted-foreground">
                Secure backup protects your encrypted messages and lets you access them from any device.
              </p>
            </div>

            {status && status.isSetUp ? (
              <Alert>
                <Key className="h-4 w-4" />
                <AlertDescription>
                  Secret storage is already set up. Enter your recovery key to gain access.
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-3">
              <Button 
                onClick={() => setState(prev => ({ ...prev, step: "phrase" }))}
                className="w-full justify-start h-auto p-4"
                variant="outline"
              >
                <Key className="mr-3 h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Set up with Security Phrase</div>
                  <div className="text-sm text-muted-foreground">
                    Create a new secure backup with a memorable phrase
                  </div>
                </div>
              </Button>

              <Button
                onClick={() => setState(prev => ({ ...prev, step: "recovery" }))}
                className="w-full justify-start h-auto p-4"
                variant="outline"
              >
                <Download className="mr-3 h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Enter Recovery Key</div>
                  <div className="text-sm text-muted-foreground">
                    I have an existing recovery key
                  </div>
                </div>
              </Button>
            </div>
          </div>
        );

      case "phrase":
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Key className="mx-auto h-8 w-8 text-blue-500 mb-2" />
              <h3 className="font-semibold">Create Security Phrase</h3>
              <p className="text-sm text-muted-foreground">
                Choose a secure phrase you can remember
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="security-phrase">Security Phrase</Label>
                <Input
                  id="security-phrase"
                  type="password"
                  value={state.securityPhrase}
                  onChange={(e) => setState(prev => ({ ...prev, securityPhrase: e.target.value, error: undefined }))}
                  placeholder="Enter a secure phrase..."
                  className="mt-1"
                />
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Requirements:</strong> At least 8 characters. We recommend using a passphrase 
                  with multiple words that you can remember. You&apos;ll need this to access your backup
                  from other devices.
                </AlertDescription>
              </Alert>
              
              {state.securityPhrase.length > 0 && state.securityPhrase.length < 8 && (
                <div className="text-xs text-amber-600">
                  ⚠️ Too short ({state.securityPhrase.length}/8 characters minimum)
                </div>
              )}
              
              {state.securityPhrase.length >= 8 && state.securityPhrase.length < 12 && (
                <div className="text-xs text-amber-600">
                  ✓ Acceptable, but consider using a longer phrase for better security
                </div>
              )}
              
              {state.securityPhrase.length >= 12 && (
                <div className="text-xs text-green-600">
                  ✓ Good phrase length
                </div>
              )}
            </div>
          </div>
        );

      case "recovery":
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Key className="mx-auto h-8 w-8 text-blue-500 mb-2" />
              <h3 className="font-semibold">Enter Recovery Key</h3>
              <p className="text-sm text-muted-foreground">
                Enter your existing recovery key to access secure backup
              </p>
            </div>

            <div>
              <Label htmlFor="recovery-key">Recovery Key</Label>
              <Textarea
                id="recovery-key"
                value={state.recoveryKey}
                onChange={(e) => setState(prev => ({ ...prev, recoveryKey: e.target.value, error: undefined }))}
                placeholder="Enter your recovery key..."
                className="mt-1 font-mono text-sm"
                rows={4}
              />
            </div>
          </div>
        );

      case "generating":
        return (
          <div className="text-center space-y-4">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-500" />
            <div>
              <h3 className="font-semibold">Setting Up Secure Backup</h3>
              <p className="text-sm text-muted-foreground">
                This may take a moment...
              </p>
            </div>
          </div>
        );

      case "complete":
        return (
          <div className="space-y-4">
            <div className="text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold">Setup Complete!</h3>
              <p className="text-sm text-muted-foreground">
                Your secure backup is now active
              </p>
            </div>

            {state.generatedRecoveryKey && (
              <>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important:</strong> Save your recovery key in a safe place. 
                    You&apos;ll need it to access your encrypted messages if you lose all your devices.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <Label>Your Recovery Key</Label>
                  <div className="relative">
                    <Textarea
                      value={state.generatedRecoveryKey}
                      readOnly
                      className="font-mono text-sm pr-20"
                      rows={4}
                      style={{ filter: state.showRecoveryKey ? "none" : "blur(4px)" }}
                    />
                    <Button
                      onClick={() => setState(prev => ({ ...prev, showRecoveryKey: !prev.showRecoveryKey }))}
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                    >
                      {state.showRecoveryKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleCopyRecoveryKey} variant="outline" size="sm">
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                    <Button onClick={handleDownloadRecoveryKey} variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {state.step === "complete" ? "Backup Complete" : "Secure Backup"}
          </DialogTitle>
          <DialogDescription>
            {state.step === "complete" 
              ? "Your encrypted messages are now backed up securely"
              : "Set up secure backup to protect your encrypted messages"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {renderStep()}

          {state.error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          {state.step === "choice" && (
            <Button onClick={onClose} variant="outline">
              Cancel
            </Button>
          )}

          {state.step === "phrase" && (
            <>
              <Button 
                onClick={() => setState(prev => ({ ...prev, step: "choice" }))} 
                variant="outline"
              >
                Back
              </Button>
              <Button 
                onClick={handleSetupWithPhrase}
                disabled={state.loading || !state.securityPhrase.trim()}
              >
                {state.loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Set Up Backup
              </Button>
            </>
          )}

          {state.step === "recovery" && (
            <>
              <Button 
                onClick={() => setState(prev => ({ ...prev, step: "choice" }))} 
                variant="outline"
              >
                Back
              </Button>
              <Button 
                onClick={handleAccessWithRecovery}
                disabled={state.loading || !state.recoveryKey.trim()}
              >
                {state.loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Access Backup
              </Button>
            </>
          )}

          {state.step === "complete" && (
            <Button onClick={handleComplete}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}