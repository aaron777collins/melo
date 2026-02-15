/**
 * Profile Settings Page
 * 
 * Comprehensive user profile management with Matrix integration
 */

import React from "react";
import { currentProfile } from "@/lib/current-profile";
import { redirect } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ProfileForm from "@/components/settings/profile-form";

export default async function ProfileSettingsPage() {
  const profile = await currentProfile();
  if (!profile) {
    return redirect("/");
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          My Account
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
          Manage your profile information and account settings
        </p>
      </div>

      <Separator />

      {/* Profile Form */}
      <ProfileForm profile={profile} />

      {/* Account Status */}
      <Card>
        <CardHeader>
          <CardTitle>Account Status</CardTitle>
          <CardDescription>
            Information about your Matrix account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">
                Account Status
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Your Matrix account is active and connected
              </p>
            </div>
            <div className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-sm rounded-full">
              Active
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}