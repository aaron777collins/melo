/**
 * Notification Settings Page
 *
 * Comprehensive notification settings page with per-server preferences
 * and per-channel overrides. Settings are stored in Matrix account data.
 */

import React from "react";
import { redirect } from "next/navigation";

import { currentProfile } from "@/lib/current-profile";
import { NotificationForm } from "@/components/settings/notification-form";
import { PushSettings } from "@/components/notifications/push-settings";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Bell, Settings, ArrowRight, Smartphone } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Notification Settings - Melo",
  description: "Manage notification preferences for servers and channels"
};

export default async function NotificationsPage() {
  const profile = await currentProfile();
  
  if (!profile) {
    return redirect("/");
  }

  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Notification Settings</h1>
            </div>
            
            <Link href="/settings/notifications/advanced">
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Advanced Settings
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
          <p className="text-muted-foreground">
            Manage notification preferences for servers and channels. Set per-server defaults and override settings for specific channels.
          </p>
        </div>

        <Separator />

        {/* Push Notification Settings */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Push Notifications</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Receive notifications even when Melo is closed or in the background.
          </p>
        </div>
        
        <PushSettings />
        
        <Separator />

        {/* In-App Notification Settings */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <h2 className="text-lg font-semibold">In-App Notifications</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure which events trigger notifications and how they appear.
          </p>
        </div>

        {/* Notification Form */}
        <NotificationForm profile={profile} />
      </div>
    </div>
  );
}