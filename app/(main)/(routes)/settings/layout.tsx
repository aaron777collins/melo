/**
 * Settings Layout
 * 
 * Provides the layout for all user settings pages with sidebar navigation.
 */

import React from "react";
import { redirect } from "next/navigation";

import { currentProfile } from "@/lib/current-profile";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default async function SettingsLayout({
  children
}: SettingsLayoutProps) {
  // Get current user profile
  const profile = await currentProfile();
  if (!profile) {
    return redirect("/");
  }

  return (
    <div className="h-full flex">
      {/* Settings Sidebar */}
      <SettingsSidebar profile={profile} />

      {/* Main Content */}
      <div className="flex-1 bg-white dark:bg-[#313338] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}