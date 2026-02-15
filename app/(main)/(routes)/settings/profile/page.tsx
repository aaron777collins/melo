/**
 * Profile Settings Page
 * 
 * User account management and profile settings
 */

import React from "react";
import { currentProfile } from "@/lib/current-profile";
import { redirect } from "next/navigation";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

export default async function ProfileSettingsPage() {
  const profile = await currentProfile();
  if (!profile) {
    return redirect("/");
  }

  const getDisplayName = () => {
    return profile.name || profile.userId.split(":")[0].replace("@", "");
  };

  const getInitials = () => {
    const name = getDisplayName();
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          My Account
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
          Manage your account settings and profile information
        </p>
      </div>

      <Separator />

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Your profile information is synced with your Matrix account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Avatar Section */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              {profile.imageUrl ? (
                <AvatarImage src={profile.imageUrl} alt={getDisplayName()} />
              ) : null}
              <AvatarFallback className="bg-indigo-500 text-white text-xl font-semibold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Button variant="outline" size="sm">
                Change Avatar
              </Button>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Recommended: Square image, at least 128x128px
              </p>
            </div>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name</Label>
            <Input
              id="display-name"
              value={getDisplayName()}
              placeholder="Enter your display name"
              disabled
            />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              This is synced with your Matrix display name
            </p>
          </div>

          {/* Matrix User ID */}
          <div className="space-y-2">
            <Label htmlFor="user-id">Matrix User ID</Label>
            <Input
              id="user-id"
              value={profile.userId}
              disabled
              className="font-mono text-sm"
            />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Your unique Matrix identifier
            </p>
          </div>
        </CardContent>
      </Card>

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

          <Separator />

          <div className="space-y-4">
            <Button variant="outline" className="w-full">
              Sync Profile from Matrix
            </Button>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
              Profile changes must be made through your Matrix client and will sync automatically
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}