"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface TwoFactorPromptProps {
  /**
   * Called when 2FA verification succeeds
   */
  onVerificationSuccess: (session: any, user: any) => void;
  /**
   * Called when user cancels 2FA
   */
  onCancel: () => void;
  /**
   * Whether the verification is in progress
   */
  loading?: boolean;
}

export function TwoFactorPrompt({ 
  onVerificationSuccess, 
  onCancel,
  loading: externalLoading = false 
}: TwoFactorPromptProps) {
  const [code, setCode] = useState("");
  const [isBackupCode, setIsBackupCode] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loading = externalLoading || internalLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      setError("Please enter a verification code");
      return;
    }

    setInternalLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Two-factor authentication verified!");
        onVerificationSuccess(result.data.session, result.data.user);
      } else {
        const errorMessage = result.error?.message || "Invalid verification code";
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      const errorMessage = "Verification failed. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("2FA verification error:", error);
    } finally {
      setInternalLoading(false);
    }
  };

  const handleCancel = () => {
    setCode("");
    setError(null);
    onCancel();
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <Shield className="h-12 w-12 text-blue-600" />
        </div>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <CardDescription>
          Enter the verification code from your authenticator app or use a backup code.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 text-red-600 bg-red-50 border border-red-200 rounded">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="verification-code">
              {isBackupCode ? "Backup Code" : "Verification Code"}
            </Label>
            <Input
              id="verification-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(null);
              }}
              placeholder={isBackupCode ? "Enter backup code" : "000000"}
              maxLength={isBackupCode ? 8 : 6}
              className="text-center font-mono text-lg"
              autoComplete="one-time-code"
              autoFocus
            />
          </div>

          <div className="flex flex-col space-y-2">
            <Button type="submit" disabled={loading || !code.trim()}>
              {loading ? "Verifying..." : "Verify"}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBackupCode(!isBackupCode)}
              disabled={loading}
            >
              {isBackupCode 
                ? "Use Authenticator Code Instead" 
                : "Use Backup Code Instead"
              }
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>

        <div className="text-xs text-muted-foreground space-y-1">
          {!isBackupCode ? (
            <>
              <p>• Open your authenticator app (Google Authenticator, Authy, etc.)</p>
              <p>• Find your HAOS account entry</p>
              <p>• Enter the 6-digit code shown</p>
            </>
          ) : (
            <>
              <p>• Enter one of the backup codes you saved during setup</p>
              <p>• Each backup code can only be used once</p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default TwoFactorPrompt;