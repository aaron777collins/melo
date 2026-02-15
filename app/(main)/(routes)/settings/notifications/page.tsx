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
import { Separator } from "@/components/ui/separator";
import { Bell } from "lucide-react";

export const metadata = {
  title: "Notification Settings - HAOS",
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
          <div className="flex items-center gap-2">
            <Bell className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Notification Settings</h1>
          </div>
          <p className="text-muted-foreground">
            Manage notification preferences for servers and channels. Set per-server defaults and override settings for specific channels.
          </p>
        </div>

        <Separator />

        {/* Notification Form */}
        <NotificationForm profile={profile} />
      </div>
    </div>
  );
}