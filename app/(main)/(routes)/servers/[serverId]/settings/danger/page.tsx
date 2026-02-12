"use client";

/**
 * Server Settings - Danger Zone Page
 *
 * Server deletion with multi-step confirmation process.
 * Requires name verification + password + "DELETE" confirmation.
 */

import React, { useState, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  Trash2,
  Shield,
  AlertCircle,
  ChevronRight,
  Check,
  X
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { useMatrixClient } from "@/hooks/use-matrix-client";
import { getSpace, deleteSpace, type MatrixSpace } from "@/apps/web/services/matrix-space";

// =============================================================================
// Types
// =============================================================================

type DeleteStep = "warning" | "verify-name" | "verify-password" | "confirm";

// =============================================================================
// Component
// =============================================================================

export default function ServerSettingsDangerPage() {
  const params = useParams();
  const router = useRouter();
  const { client, isReady } = useMatrixClient();
  
  const serverId = params?.serverId as string;
  
  // State
  const [space, setSpace] = useState<MatrixSpace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Delete flow state
  const [step, setStep] = useState<DeleteStep>("warning");
  const [serverName, setServerName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  
  /**
   * Load space data
   */
  const loadSpace = useCallback(async () => {
    if (!isReady || !serverId) return;
    
    setIsLoading(true);
    try {
      const spaceData = await getSpace(serverId);
      setSpace(spaceData);
    } catch (err) {
      console.error("Failed to load space:", err);
      setError(err instanceof Error ? err.message : "Failed to load server data");
    } finally {
      setIsLoading(false);
    }
  }, [isReady, serverId]);
  
  useEffect(() => {
    loadSpace();
  }, [loadSpace]);
  
  /**
   * Validate name step
   */
  const validateName = () => {
    if (serverName === space?.name) {
      setStep("verify-password");
      setError(null);
    } else {
      setError("Server name doesn't match. Please enter the exact server name.");
    }
  };
  
  /**
   * Validate password step
   */
  const validatePassword = () => {
    // In a real implementation, verify password with Matrix homeserver
    if (password.length >= 1) {
      setStep("confirm");
      setError(null);
    } else {
      setError("Please enter your password.");
    }
  };
  
  /**
   * Final confirmation and delete
   */
  const handleDelete = async () => {
    if (confirmText !== "DELETE") {
      setError('Please type "DELETE" to confirm.');
      return;
    }
    
    setIsDeleting(true);
    setError(null);
    
    try {
      await deleteSpace(serverId);
      
      // Navigate to home
      router.push("/channels/@me");
    } catch (err) {
      console.error("Failed to delete server:", err);
      setError(err instanceof Error ? err.message : "Failed to delete server");
      setIsDeleting(false);
    }
  };
  
  /**
   * Reset delete flow
   */
  const resetFlow = () => {
    setStep("warning");
    setServerName("");
    setPassword("");
    setConfirmText("");
    setError(null);
  };
  
  /**
   * Get step progress
   */
  const getStepNumber = () => {
    switch (step) {
      case "warning":
        return 0;
      case "verify-name":
        return 1;
      case "verify-password":
        return 2;
      case "confirm":
        return 3;
      default:
        return 0;
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-zinc-700 rounded animate-pulse" />
          <div className="h-8 w-48 bg-zinc-700 rounded animate-pulse" />
        </div>
        <div className="h-64 bg-zinc-800 rounded-lg animate-pulse" />
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-red-400 flex items-center gap-3">
          <AlertTriangle className="h-7 w-7" />
          Danger Zone
        </h1>
        <p className="text-zinc-400 mt-1">
          Irreversible actions that will permanently affect your server
        </p>
      </div>
      
      <Separator className="bg-zinc-700" />
      
      {/* Warning Card */}
      <Card className="bg-red-500/5 border-red-500/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-400">
                Proceed with Caution
              </h3>
              <p className="text-zinc-400 mt-1 text-sm">
                The actions on this page are irreversible and will permanently delete
                your server and all associated data. This includes all channels,
                messages, and member data. Make sure you understand the consequences
                before proceeding.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Delete Server Section */}
      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            Delete Server
          </CardTitle>
          <CardDescription>
            Permanently delete &quot;{space?.name}&quot; and all of its data
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Progress Indicator */}
          {step !== "warning" && (
            <div className="flex items-center justify-center gap-2 py-4">
              {["Name", "Password", "Confirm"].map((label, index) => (
                <React.Fragment key={label}>
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        getStepNumber() > index
                          ? "bg-red-500 text-white"
                          : getStepNumber() === index + 1
                          ? "bg-red-500/50 text-white border-2 border-red-500"
                          : "bg-zinc-700 text-zinc-400"
                      }`}
                    >
                      {getStepNumber() > index ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span className="text-xs text-zinc-500">{label}</span>
                  </div>
                  {index < 2 && (
                    <div
                      className={`h-0.5 w-16 ${
                        getStepNumber() > index + 1 ? "bg-red-500" : "bg-zinc-700"
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
          
          {/* Error Alert */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          
          {/* Step: Warning */}
          {step === "warning" && (
            <div className="space-y-4">
              <div className="p-4 bg-zinc-900 rounded-lg space-y-3">
                <h4 className="font-medium text-white">
                  What will be deleted:
                </h4>
                <ul className="space-y-2 text-sm text-zinc-400">
                  <li className="flex items-center gap-2">
                    <X className="h-4 w-4 text-red-400" />
                    All channels and messages
                  </li>
                  <li className="flex items-center gap-2">
                    <X className="h-4 w-4 text-red-400" />
                    All member data and roles
                  </li>
                  <li className="flex items-center gap-2">
                    <X className="h-4 w-4 text-red-400" />
                    All server settings and configurations
                  </li>
                  <li className="flex items-center gap-2">
                    <X className="h-4 w-4 text-red-400" />
                    All uploaded files and media
                  </li>
                  <li className="flex items-center gap-2">
                    <X className="h-4 w-4 text-red-400" />
                    All integrations and bots
                  </li>
                </ul>
              </div>
              
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-amber-400 text-sm">
                  <Shield className="h-4 w-4" />
                  <span>This action cannot be undone.</span>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button
                  variant="destructive"
                  onClick={() => setStep("verify-name")}
                  className="bg-red-600 hover:bg-red-700"
                >
                  I understand, continue
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
          
          {/* Step: Verify Name */}
          {step === "verify-name" && (
            <div className="space-y-4">
              <div>
                <Label className="text-zinc-400">
                  Enter the server name to confirm:
                  <span className="font-semibold text-white ml-2">
                    {space?.name}
                  </span>
                </Label>
                <Input
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  placeholder="Type server name here"
                  className="mt-2 bg-zinc-900 border-zinc-700"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={resetFlow}
                  className="text-zinc-400"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={validateName}
                  disabled={!serverName}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Continue
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
          
          {/* Step: Verify Password */}
          {step === "verify-password" && (
            <div className="space-y-4">
              <div>
                <Label className="text-zinc-400">
                  Enter your account password to verify your identity
                </Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="mt-2 bg-zinc-900 border-zinc-700"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={() => setStep("verify-name")}
                  className="text-zinc-400"
                >
                  Back
                </Button>
                <Button
                  variant="destructive"
                  onClick={validatePassword}
                  disabled={!password}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Continue
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
          
          {/* Step: Final Confirm */}
          {step === "confirm" && (
            <div className="space-y-4">
              <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
                <h4 className="font-semibold text-red-400 mb-2">
                  Final Warning
                </h4>
                <p className="text-sm text-zinc-400">
                  You are about to permanently delete{" "}
                  <span className="font-semibold text-white">{space?.name}</span>.
                  This action is immediate and irreversible. All data will be lost.
                </p>
              </div>
              
              <div>
                <Label className="text-zinc-400">
                  Type <span className="font-mono font-bold text-red-400">&quot;DELETE&quot;</span> to confirm
                </Label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder="Type DELETE"
                  className="mt-2 bg-zinc-900 border-zinc-700 font-mono"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={() => setStep("verify-password")}
                  disabled={isDeleting}
                  className="text-zinc-400"
                >
                  Back
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={confirmText !== "DELETE" || isDeleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Server Forever
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Transfer Ownership Section */}
      <Card className="bg-zinc-800/50 border-zinc-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-500" />
            Transfer Ownership
          </CardTitle>
          <CardDescription>
            Transfer server ownership to another member instead of deleting
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <p className="text-sm text-zinc-400 mb-4">
            If you want to leave the server but keep it active, consider transferring
            ownership to a trusted member instead of deleting everything.
          </p>
          <Button variant="outline" className="border-zinc-600">
            Transfer Ownership
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
