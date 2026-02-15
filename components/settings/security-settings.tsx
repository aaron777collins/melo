/**
 * Security Settings Component
 *
 * Provides comprehensive security management for Matrix E2EE including
 * cross-signing setup, device verification, and key backup management.
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Key,
  Smartphone,
  Users,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Lock,
  Unlock,
  Settings as SettingsIcon,
  Download,
  Upload
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
// Note: Using simple console logging instead of toast notifications

import {
  getCrossSigningStatus,
  bootstrapCrossSigning,
  isCrossSigningReady,
  resetCrossSigning,
  type CrossSigningStatus,
  type CrossSigningBootstrapResult
} from "@/lib/matrix/crypto/cross-signing";
import {
  getSecretStorageStatus,
  isSecretStorageReady,
  setupSecretStorage,
  resetSecretStorage,
  type SecretStorageStatus,
} from "@/lib/matrix/crypto/secrets";
import { getCryptoState, isCryptoReady } from "@/lib/matrix/client";
import { SecuritySetupModal } from "@/components/modals/security-setup-modal";
import { DeviceManagement } from "./device-management";
import { useSecurityPrompt } from "@/hooks/use-security-prompt";

// =============================================================================
// Types
// =============================================================================

interface SecuritySettingsProps {
  className?: string;
}

// =============================================================================
// Components
// =============================================================================

/**
 * Cross-signing status indicator
 */
function CrossSigningStatusCard() {
  const [status, setStatus] = useState<CrossSigningStatus>({
    isSetUp: false,
    isMasterKeyTrusted: false,
    hasSelfSigningKey: false,
    hasUserSigningKey: false
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const refreshStatus = useCallback(async () => {
    setRefreshing(true);
    try {
      const newStatus = await getCrossSigningStatus();
      setStatus(newStatus);
    } catch (error) {
      console.error("Failed to get cross-signing status:", error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const getStatusIcon = () => {
    if (status.error) {
      return <ShieldOff className="h-5 w-5 text-destructive" />;
    }
    if (status.isSetUp && status.isMasterKeyTrusted) {
      return <ShieldCheck className="h-5 w-5 text-green-600" />;
    }
    if (status.isSetUp) {
      return <ShieldAlert className="h-5 w-5 text-amber-600" />;
    }
    return <Shield className="h-5 w-5 text-muted-foreground" />;
  };

  const getStatusText = () => {
    if (status.error) {
      return "Error";
    }
    if (status.isSetUp && status.isMasterKeyTrusted) {
      return "Active";
    }
    if (status.isSetUp) {
      return "Not Trusted";
    }
    return "Not Set Up";
  };

  const getStatusDescription = () => {
    if (status.error) {
      return `Unable to check cross-signing status: ${status.error}`;
    }
    if (status.isSetUp && status.isMasterKeyTrusted) {
      return "Cross-signing is active. Your devices can verify each other automatically.";
    }
    if (status.isSetUp) {
      return "Cross-signing keys exist but are not trusted. Please verify your identity.";
    }
    return "Cross-signing is not set up. Your devices cannot verify each other automatically.";
  };

  const getStatusColor = () => {
    if (status.error) return "border-red-200 bg-red-50";
    if (status.isSetUp && status.isMasterKeyTrusted) return "border-green-200 bg-green-50";
    if (status.isSetUp) return "border-amber-200 bg-amber-50";
    return "border-gray-200 bg-gray-50";
  };

  if (loading && !refreshing) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          <span className="text-muted-foreground">Checking security status...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={getStatusColor()}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle className="text-lg">Cross-Signing</CardTitle>
            <Badge variant={status.isSetUp && status.isMasterKeyTrusted ? "default" : "secondary"}>
              {getStatusText()}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshStatus}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <CardDescription>
          {getStatusDescription()}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Key Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-2 p-2 rounded border">
            <Key className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Master Key</div>
              <div className="text-xs text-muted-foreground">
                {status.isSetUp ? (status.isMasterKeyTrusted ? "Trusted" : "Not Trusted") : "Missing"}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 rounded border">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Self-Signing</div>
              <div className="text-xs text-muted-foreground">
                {status.hasSelfSigningKey ? "Available" : "Missing"}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 rounded border">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">User-Signing</div>
              <div className="text-xs text-muted-foreground">
                {status.hasUserSigningKey ? "Available" : "Missing"}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {!status.isSetUp && (
            <CrossSigningBootstrapDialog onComplete={refreshStatus} />
          )}
          
          {status.isSetUp && !status.isMasterKeyTrusted && (
            <Button variant="outline" size="sm">
              <Key className="h-4 w-4 mr-2" />
              Verify Identity
            </Button>
          )}
          
          {status.isSetUp && (
            <CrossSigningResetDialog onComplete={refreshStatus} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Cross-signing bootstrap dialog
 */
function CrossSigningBootstrapDialog({ onComplete }: { onComplete: () => void }) {
  const [open, setOpen] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [setupSecretStorage, setSetupSecretStorage] = useState(true);
  const [result, setResult] = useState<CrossSigningBootstrapResult | null>(null);

  const handleBootstrap = useCallback(async () => {
    setBootstrapping(true);
    try {
      const bootstrapResult = await bootstrapCrossSigning({
        setupSecretStorage
      });
      setResult(bootstrapResult);
      
      if (bootstrapResult.success) {
        setTimeout(() => {
          setOpen(false);
          onComplete();
        }, 2000);
      }
    } catch (error) {
      console.error("Bootstrap failed:", error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setBootstrapping(false);
    }
  }, [setupSecretStorage, onComplete]);

  const resetDialog = () => {
    setResult(null);
    setBootstrapping(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button onClick={resetDialog}>
          <Shield className="h-4 w-4 mr-2" />
          Set Up Cross-Signing
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Up Cross-Signing</DialogTitle>
          <DialogDescription>
            Cross-signing enables automatic device verification and improves security.
            This process will generate cryptographic keys for your account.
          </DialogDescription>
        </DialogHeader>

        {!result && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>What this does:</strong>
                <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
                  <li>Creates master signing keys for your account</li>
                  <li>Enables automatic device verification</li>
                  <li>Allows you to verify other users securely</li>
                  {setupSecretStorage && <li>Sets up secure key backup</li>}
                </ul>
              </AlertDescription>
            </Alert>

            <div className="flex items-center space-x-2">
              <Switch
                id="secret-storage"
                checked={setupSecretStorage}
                onCheckedChange={setSetupSecretStorage}
              />
              <Label htmlFor="secret-storage" className="text-sm">
                Set up secure key backup (recommended)
              </Label>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.success ? (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Success!</strong> Cross-signing has been set up for your account.
                  {result.alreadySetup && " (Cross-signing was already configured)"}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Setup failed:</strong> {result.error}
                </AlertDescription>
              </Alert>
            )}

            {result.success && result.recoveryKey && (
              <Alert>
                <Key className="h-4 w-4" />
                <AlertDescription>
                  <strong>Save your recovery key:</strong>
                  <Textarea
                    value={result.recoveryKey}
                    readOnly
                    className="mt-2 font-mono text-xs"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Store this key safely. You&apos;ll need it to recover your encrypted messages if you lose access to all your devices.
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          {!result && (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleBootstrap} disabled={bootstrapping}>
                {bootstrapping ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Setting Up...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Set Up Cross-Signing
                  </>
                )}
              </Button>
            </>
          )}
          
          {result && (
            <Button onClick={() => setOpen(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Cross-signing reset dialog
 */
function CrossSigningResetDialog({ onComplete }: { onComplete: () => void }) {
  const { requestDestructiveConfirmation } = useSecurityPrompt();

  const handleReset = useCallback(async () => {
    requestDestructiveConfirmation(
      "Reset Cross-Signing",
      "This will remove your cross-signing keys and reset your security setup.",
      [
        "Your cross-signing keys will be deleted",
        "Device verification will be disabled",
        "Other users may see security warnings",
        "You'll need to set up cross-signing again",
        "This action cannot be undone"
      ],
      "Reset Cross-Signing",
      async () => {
        try {
          const success = await resetCrossSigning();
          if (success) {
            onComplete();
            return true;
          }
          return false;
        } catch (error) {
          console.error("Reset failed:", error);
          return false;
        }
      }
    );
  }, [onComplete, requestDestructiveConfirmation]);

  return (
    <Button variant="outline" size="sm" onClick={handleReset}>
      <RefreshCw className="h-4 w-4 mr-2" />
      Reset
    </Button>
  );
}

/**
 * Crypto status overview
 */
function CryptoStatusCard() {
  const [cryptoState, setCryptoState] = useState(getCryptoState());
  const [loading, setLoading] = useState(false);

  const refreshCryptoState = useCallback(async () => {
    setLoading(true);
    try {
      // Give it a moment to ensure state is current
      await new Promise(resolve => setTimeout(resolve, 100));
      setCryptoState(getCryptoState());
    } finally {
      setLoading(false);
    }
  }, []);

  const getCryptoStatusIcon = () => {
    switch (cryptoState.status) {
      case "ready":
        return cryptoState.isEncryptionSupported ? 
          <Lock className="h-5 w-5 text-green-600" /> : 
          <Unlock className="h-5 w-5 text-amber-600" />;
      case "initializing":
        return <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />;
      case "error":
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      default:
        return <Unlock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getCryptoStatusText = () => {
    switch (cryptoState.status) {
      case "ready":
        return cryptoState.isEncryptionSupported ? "Encryption Ready" : "Limited Support";
      case "initializing":
        return "Initializing...";
      case "error":
        return "Error";
      default:
        return "Not Initialized";
    }
  };

  const getCryptoDescription = () => {
    switch (cryptoState.status) {
      case "ready":
        return cryptoState.isEncryptionSupported ? 
          "End-to-end encryption is fully supported and ready to use." :
          "Encryption is partially supported. Some features may not be available.";
      case "initializing":
        return "Setting up encryption support...";
      case "error":
        return `Encryption initialization failed: ${cryptoState.error?.message || "Unknown error"}`;
      default:
        return "Encryption has not been initialized for this session.";
    }
  };

  const getStatusColor = () => {
    switch (cryptoState.status) {
      case "ready":
        return cryptoState.isEncryptionSupported ? 
          "border-green-200 bg-green-50" : 
          "border-amber-200 bg-amber-50";
      case "error":
        return "border-red-200 bg-red-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  return (
    <Card className={getStatusColor()}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getCryptoStatusIcon()}
            <CardTitle className="text-lg">Encryption Status</CardTitle>
            <Badge variant={cryptoState.status === "ready" ? "default" : "secondary"}>
              {getCryptoStatusText()}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshCryptoState}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <CardDescription>
          {getCryptoDescription()}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Complete security settings panel component
 */
export function SecuritySettings({ className }: SecuritySettingsProps) {
  return (
    <div className={`space-y-6 ${className || ""}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Security Settings
          </CardTitle>
          <CardDescription>
            Manage your Matrix account security, device verification, and encryption settings
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Crypto Status */}
      <CryptoStatusCard />

      <Separator />

      {/* Cross-signing */}
      <CrossSigningStatusCard />

      <Separator />

      {/* Device Management */}
      <DeviceManagement />

      <Separator />

      {/* Secret Storage */}
      <SecretStorageCard />

      <Separator />

      {/* Additional security info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Security Best Practices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span>Set up cross-signing to enable automatic device verification</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span>Verify new devices when prompted using emoji or QR codes</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span>Keep your recovery key safe in case you lose access to your devices</span>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <span>Regularly verify other users you communicate with frequently</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Secret Storage (4S) management card
 */
function SecretStorageCard() {
  const [status, setStatus] = useState<SecretStorageStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const { requestDestructiveConfirmation } = useSecurityPrompt();

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const currentStatus = await getSecretStorageStatus();
      setStatus(currentStatus);
    } catch (error) {
      console.error("Failed to load secret storage status:", error);
      setStatus({
        isSetUp: false,
        hasDefaultKey: false,
        hasRecoveryKey: false,
        keyIds: [],
        error: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleReset = useCallback(async () => {
    requestDestructiveConfirmation(
      "Reset Secret Storage",
      "This will remove your secure backup and reset your secret storage.",
      [
        "Your secure backup will be deleted",
        "You may lose access to encrypted messages",
        "Key recovery will no longer be possible",
        "You'll need to set up backup again",
        "This action cannot be undone"
      ],
      "Reset Backup",
      async () => {
        try {
          const success = await resetSecretStorage();
          if (success) {
            await loadStatus();
            console.log("Secret Storage Reset: Your secure backup has been reset");
            return true;
          } else {
            console.error("Reset Failed: Failed to reset secret storage");
            return false;
          }
        } catch (error) {
          console.error("Reset Failed:", error instanceof Error ? error.message : "Unknown error");
          return false;
        }
      }
    );
  }, [loadStatus, requestDestructiveConfirmation]);

  const handleSetupComplete = useCallback(() => {
    loadStatus();
    console.log("Setup Complete: Your secure backup is now active");
  }, [loadStatus]);

  const getStatusIcon = () => {
    if (loading) {
      return <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />;
    }
    
    if (status?.error) {
      return <ShieldAlert className="h-5 w-5 text-destructive" />;
    }
    
    if (status?.isSetUp && status?.hasRecoveryKey) {
      return <ShieldCheck className="h-5 w-5 text-green-600" />;
    }
    
    if (status?.isSetUp) {
      return <Shield className="h-5 w-5 text-amber-600" />;
    }
    
    return <ShieldOff className="h-5 w-5 text-muted-foreground" />;
  };

  const getStatusText = () => {
    if (loading) return "Loading...";
    if (status?.error) return "Error";
    if (status?.isSetUp && status?.hasRecoveryKey) return "Active";
    if (status?.isSetUp) return "Needs Access";
    return "Not Set Up";
  };

  const getStatusDescription = () => {
    if (status?.error) {
      return `Error: ${status.error}`;
    }
    
    if (status?.isSetUp && status?.hasRecoveryKey) {
      return "Secure backup is active and protecting your encrypted messages.";
    }
    
    if (status?.isSetUp) {
      return "Secure backup is set up but you need to enter your recovery key or security phrase.";
    }
    
    return "Secure backup protects your encrypted messages and lets you access them from any device.";
  };

  const getStatusColor = () => {
    if (status?.error) {
      return "border-red-200 bg-red-50";
    }
    
    if (status?.isSetUp && status?.hasRecoveryKey) {
      return "border-green-200 bg-green-50";
    }
    
    if (status?.isSetUp) {
      return "border-amber-200 bg-amber-50";
    }
    
    return "border-gray-200 bg-gray-50";
  };

  return (
    <>
      <Card className={getStatusColor()}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <CardTitle className="text-lg">Secure Backup</CardTitle>
              <Badge variant={status?.isSetUp && status?.hasRecoveryKey ? "default" : "secondary"}>
                {getStatusText()}
              </Badge>
            </div>
            <Button
              onClick={() => setShowSetupModal(true)}
              variant={status?.isSetUp ? "outline" : "default"}
              size="sm"
              disabled={loading}
            >
              {status?.isSetUp ? (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  Manage Backup
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Set Up Backup
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {getStatusDescription()}
          </p>
          
          {status && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Secret Storage Set Up:</span>
                <Badge variant={status.isSetUp ? "default" : "secondary"} className="text-xs">
                  {status.isSetUp ? "Yes" : "No"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span>Recovery Key Access:</span>
                <Badge variant={status.hasRecoveryKey ? "default" : "secondary"} className="text-xs">
                  {status.hasRecoveryKey ? "Available" : "Needed"}
                </Badge>
              </div>
              
              {status.keyIds.length > 0 && (
                <div className="flex items-center justify-between">
                  <span>Storage Keys:</span>
                  <Badge variant="outline" className="text-xs">
                    {status.keyIds.length} key{status.keyIds.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              )}
            </div>
          )}

          {status?.isSetUp && (
            <div className="mt-4 pt-4 border-t">
              <Button
                onClick={handleReset}
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset Backup
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <SecuritySetupModal
        open={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        onComplete={handleSetupComplete}
      />
    </>
  );
}

export default SecuritySettings;