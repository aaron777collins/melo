/**
 * Account Deletion Settings Page
 *
 * Provides a comprehensive account deletion flow with multiple confirmation steps,
 * clear warnings about consequences, and data retention options.
 */

import React from "react";
import { redirect } from "next/navigation";

import { currentProfile } from "@/lib/current-profile";
import { AccountDeletionFlow } from "@/components/settings/account-deletion-flow";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, UserMinus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const metadata = {
  title: "Delete Account - HAOS",
  description: "Permanently delete your HAOS account and Matrix profile"
};

export default async function AccountDeletionPage() {
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
            <UserMinus className="h-6 w-6 text-red-500" />
            <h1 className="text-2xl font-bold">Delete Account</h1>
          </div>
          <p className="text-muted-foreground">
            Permanently delete your HAOS account and Matrix profile. This action cannot be undone.
          </p>
        </div>

        <Separator />

        {/* Critical Warning */}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Warning:</strong> Account deletion is permanent and irreversible. 
            Once deleted, you cannot recover your account, messages, or any associated data.
          </AlertDescription>
        </Alert>

        {/* Account Deletion Flow */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <UserMinus className="h-5 w-5" />
              Delete Your Account
            </CardTitle>
            <CardDescription>
              This will permanently delete your account from both HAOS and the Matrix network.
              Please review the consequences carefully before proceeding.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AccountDeletionFlow profile={profile} />
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle>What happens when you delete your account?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-semibold text-red-600">Immediate Effects</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Logged out of all devices immediately</li>
                  <li>• Removed from all rooms and spaces</li>
                  <li>• Profile information deleted</li>
                  <li>• Unable to receive new messages</li>
                  <li>• Account becomes permanently inaccessible</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-amber-600">Data Considerations</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Past messages may remain visible to others</li>
                  <li>• Room history preservation depends on room settings</li>
                  <li>• Some metadata may persist on the homeserver</li>
                  <li>• Files uploaded to rooms may remain accessible</li>
                  <li>• Recovery is not possible after deletion</li>
                </ul>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <h4 className="font-semibold">Before you delete your account:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Export your data if you want to keep a copy</li>
                <li>• Inform important contacts about your account deletion</li>
                <li>• Transfer ownership of any rooms you manage</li>
                <li>• Save any important conversations or files</li>
                <li>• Consider deactivating temporarily instead of permanent deletion</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}