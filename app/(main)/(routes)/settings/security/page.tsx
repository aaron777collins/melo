/**
 * Security Settings Page
 *
 * Comprehensive security settings page with device management, 
 * password change, and 2FA setup functionality.
 */

import React from "react";
import { redirect } from "next/navigation";

import { currentProfile } from "@/lib/current-profile";
import { SecuritySettings } from "@/components/settings/security-settings";
import { DeviceManager } from "@/components/settings/device-manager";
import { PasswordForm } from "@/components/settings/password-form";
import { TwoFactorForm } from "@/components/settings/two-factor-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Shield, Smartphone, Lock, Key } from "lucide-react";

export const metadata = {
  title: "Security Settings - Melo",
  description: "Manage your account security, device sessions, and authentication settings"
};

export default async function SecurityPage() {
  const profile = await currentProfile();
  
  if (!profile) {
    return redirect("/");
  }

  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Security Settings</h1>
          </div>
          <p className="text-muted-foreground">
            Manage your account security, device sessions, and authentication settings.
          </p>
        </div>

        <Separator />

        {/* Password & Authentication */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Password & Authentication
            </CardTitle>
            <CardDescription>
              Change your password and set up two-factor authentication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <PasswordForm profile={profile} />
            <Separator />
            <TwoFactorForm profile={profile} />
          </CardContent>
        </Card>

        {/* Device Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Device Management
            </CardTitle>
            <CardDescription>
              View and manage your logged-in devices and sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeviceManager profile={profile} />
          </CardContent>
        </Card>

        {/* Matrix Encryption Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Encryption & Matrix Security
            </CardTitle>
            <CardDescription>
              Matrix end-to-end encryption, cross-signing, and key backup
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SecuritySettings />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}