"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Copy, RefreshCw, AlertTriangle, CheckCircle, X } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import QRCode from "qrcode";
import * as OTPAuth from "otplib";
import { useMatrixClient } from "@/hooks/use-matrix-client";

interface TwoFactorFormProps {
  profile: any; // TODO: Type this properly
}

interface TwoFactorData {
  enabled: boolean;
  secret?: string;
  backupCodes?: string[];
  setupComplete?: boolean;
}

interface SetupStep {
  id: 'generate' | 'verify' | 'backup' | 'complete';
  title: string;
  completed: boolean;
}

export function TwoFactorForm({ profile }: TwoFactorFormProps) {
  const { client, isReady } = useMatrixClient();
  const [loading, setLoading] = useState(false);
  const [twoFactorData, setTwoFactorData] = useState<TwoFactorData | null>(null);
  const [setupMode, setSetupMode] = useState(false);
  const [disableMode, setDisableMode] = useState(false);
  
  // Setup state
  const [secret, setSecret] = useState<string>("");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [disableCode, setDisableCode] = useState("");

  const steps: SetupStep[] = [
    { id: 'generate', title: 'Setup Authenticator', completed: false },
    { id: 'verify', title: 'Verify Code', completed: false },
    { id: 'backup', title: 'Save Backup Codes', completed: false },
    { id: 'complete', title: 'Complete Setup', completed: false }
  ];

  // Load 2FA status from Matrix account data
  const load2FAData = useCallback(async () => {
    if (!client || !isReady) return;
    
    try {
      const accountData = client.getAccountData('im.haos.two_factor');
      const data = accountData?.getContent() as TwoFactorData;
      setTwoFactorData(data || { enabled: false });
    } catch (error) {
      console.error('Failed to load 2FA data:', error);
      setTwoFactorData({ enabled: false });
    }
  }, [client, isReady]);

  useEffect(() => {
    load2FAData();
  }, [load2FAData]);

  // Save 2FA data to Matrix account data
  const save2FAData = async (data: TwoFactorData) => {
    if (!client || !isReady) return;
    
    try {
      await client.setAccountData('im.haos.two_factor', data);
      setTwoFactorData(data);
      toast.success('2FA settings updated');
    } catch (error) {
      console.error('Failed to save 2FA data:', error);
      toast.error('Failed to update 2FA settings');
      throw error;
    }
  };

  // Generate secret and QR code
  const generateSecret = async () => {
    setLoading(true);
    try {
      const newSecret = OTPAuth.authenticator.generateSecret();
      const user = client?.getUserId() || 'user';
      const service = 'HAOS';
      
      const otpUrl = OTPAuth.authenticator.keyuri(user, service, newSecret);
      const qrUrl = await QRCode.toDataURL(otpUrl);
      
      setSecret(newSecret);
      setQrCodeUrl(qrUrl);
      setCurrentStep(1);
      
      toast.success('QR code generated. Scan with your authenticator app.');
    } catch (error) {
      console.error('Failed to generate secret:', error);
      toast.error('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  // Verify TOTP code
  const verifyCode = async () => {
    if (!verificationCode.trim() || !secret) return;
    
    setLoading(true);
    try {
      const isValid = OTPAuth.authenticator.verify({
        token: verificationCode.replace(/\s/g, ''),
        secret: secret
      });

      if (isValid) {
        // Generate backup codes
        const codes = Array.from({ length: 10 }, () => 
          Math.random().toString(36).substring(2, 8).toUpperCase()
        );
        
        setBackupCodes(codes);
        setCurrentStep(2);
        toast.success('Code verified! Please save your backup codes.');
      } else {
        toast.error('Invalid verification code. Please try again.');
      }
    } catch (error) {
      console.error('Verification failed:', error);
      toast.error('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Complete 2FA setup
  const complete2FASetup = async () => {
    if (!secret || backupCodes.length === 0) return;
    
    setLoading(true);
    try {
      const newData: TwoFactorData = {
        enabled: true,
        secret: secret,
        backupCodes: backupCodes,
        setupComplete: true
      };
      
      await save2FAData(newData);
      
      setSetupMode(false);
      setCurrentStep(0);
      setSecret("");
      setQrCodeUrl("");
      setVerificationCode("");
      setBackupCodes([]);
      
      toast.success('Two-Factor Authentication enabled successfully!');
    } catch (error) {
      toast.error('Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  // Disable 2FA
  const disable2FA = async () => {
    if (!disableCode.trim() || !twoFactorData?.secret) return;
    
    setLoading(true);
    try {
      // Verify current TOTP code or check if it's a backup code
      const isValidTOTP = OTPAuth.authenticator.verify({
        token: disableCode.replace(/\s/g, ''),
        secret: twoFactorData.secret
      });
      
      const isValidBackup = twoFactorData.backupCodes?.includes(disableCode.toUpperCase());
      
      if (!isValidTOTP && !isValidBackup) {
        toast.error('Invalid code. Please try again.');
        return;
      }
      
      const newData: TwoFactorData = {
        enabled: false,
        setupComplete: false
      };
      
      await save2FAData(newData);
      
      setDisableMode(false);
      setDisableCode("");
      toast.success('Two-Factor Authentication disabled');
    } catch (error) {
      toast.error('Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  // Regenerate backup codes
  const regenerateBackupCodes = async () => {
    if (!twoFactorData?.secret) return;
    
    setLoading(true);
    try {
      const newCodes = Array.from({ length: 10 }, () => 
        Math.random().toString(36).substring(2, 8).toUpperCase()
      );
      
      const updatedData: TwoFactorData = {
        ...twoFactorData,
        backupCodes: newCodes
      };
      
      await save2FAData(updatedData);
      toast.success('Backup codes regenerated. Please save the new codes.');
    } catch (error) {
      toast.error('Failed to regenerate backup codes');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (!isReady) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-4 border rounded-lg">
          <Shield className="h-8 w-8 text-gray-400 mt-1" />
          <div>
            <h3 className="font-medium">Two-Factor Authentication</h3>
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Setup Mode */}
      {setupMode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Set up Two-Factor Authentication
            </CardTitle>
            <CardDescription>
              Add an extra layer of security to your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step Progress */}
            <div className="flex justify-between mb-6">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index <= currentStep ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {index < currentStep ? <CheckCircle className="h-4 w-4" /> : index + 1}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-0.5 ml-2 ${
                      index < currentStep ? 'bg-blue-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Generate QR Code */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <h4 className="font-medium">Step 1: Setup your authenticator app</h4>
                <p className="text-sm text-muted-foreground">
                  We&apos;ll generate a QR code that you can scan with your authenticator app like Google Authenticator, Authy, or 1Password.
                </p>
                <Button onClick={generateSecret} disabled={loading}>
                  Generate QR Code
                </Button>
              </div>
            )}

            {/* Step 2: Show QR Code and Verify */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h4 className="font-medium">Step 2: Scan QR Code and Verify</h4>
                <div className="flex flex-col items-center space-y-4">
                  {qrCodeUrl && (
                    <div className="p-4 bg-white rounded-lg border">
                      <Image src={qrCodeUrl} alt="2FA QR Code" width={192} height={192} className="w-48 h-48" />
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      Can&apos;t scan? Enter this code manually:
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                        {secret}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(secret)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="verify-code">Enter verification code from your app:</Label>
                  <div className="flex gap-2">
                    <Input
                      id="verify-code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="000000"
                      maxLength={6}
                      className="text-center"
                    />
                    <Button onClick={verifyCode} disabled={loading || !verificationCode.trim()}>
                      Verify
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Backup Codes */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <h4 className="font-medium">Step 3: Save Your Backup Codes</h4>
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">Important!</p>
                      <p className="text-sm text-yellow-700">
                        Save these backup codes in a secure place. You can use them to access your account if you lose your authenticator device.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <code className="font-mono text-sm">{code}</code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(code)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(backupCodes.join('\n'))}
                  >
                    Copy All Codes
                  </Button>
                  <Button onClick={() => setCurrentStep(3)}>
                    I&apos;ve Saved My Codes
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Complete */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <h4 className="font-medium">Step 4: Complete Setup</h4>
                <p className="text-sm text-muted-foreground">
                  You&apos;re all set! Two-Factor Authentication will be enabled for your account.
                </p>
                <Button onClick={complete2FASetup} disabled={loading}>
                  Complete Setup
                </Button>
              </div>
            )}

            <div className="flex justify-start">
              <Button variant="outline" onClick={() => setSetupMode(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disable Mode */}
      {disableMode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Disable Two-Factor Authentication</CardTitle>
            <CardDescription>
              Enter your current TOTP code or a backup code to disable 2FA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="disable-code">Verification Code:</Label>
              <Input
                id="disable-code"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                placeholder="Enter TOTP code or backup code"
                className="text-center"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={disable2FA}
                disabled={loading || !disableCode.trim()}
              >
                Disable 2FA
              </Button>
              <Button variant="outline" onClick={() => setDisableMode(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main 2FA Status */}
      {!setupMode && !disableMode && (
        <div className="flex items-start gap-4 p-4 border rounded-lg">
          <Shield className={`h-8 w-8 mt-1 ${twoFactorData?.enabled ? 'text-green-600' : 'text-amber-600'}`} />
          <div className="flex-1">
            <h3 className="font-medium">Two-Factor Authentication</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add an extra layer of security to your account by requiring a second factor in addition to your password.
            </p>
            <div className="mt-4 space-y-2">
              <div className="text-sm">
                <span className="font-medium">Status: </span>
                <span className={twoFactorData?.enabled ? 'text-green-600' : 'text-amber-600'}>
                  {twoFactorData?.enabled ? 'Enabled' : 'Not configured'}
                </span>
              </div>
              <div className="flex gap-2">
                {!twoFactorData?.enabled ? (
                  <Button onClick={() => setSetupMode(true)} disabled={loading}>
                    Set up Two-Factor Authentication
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={regenerateBackupCodes}
                      disabled={loading}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Regenerate Backup Codes
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setDisableMode(true)}
                      disabled={loading}
                    >
                      Disable 2FA
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}