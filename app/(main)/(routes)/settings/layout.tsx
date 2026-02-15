/**
 * Settings Layout
 * 
 * Provides the layout for all user settings pages with sidebar navigation.
 * Mobile-responsive with collapsible sidebar navigation.
 */

import React from "react";
import { redirect } from "next/navigation";

import { currentProfile } from "@/lib/current-profile";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";
import { MobileSettingsToggle } from "@/components/settings/mobile-settings-toggle";
import { SectionErrorBoundary, PageErrorBoundary } from "@/components/error-boundary";

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
      {/* Settings Sidebar - Hidden on mobile */}
      <SectionErrorBoundary name="settings-sidebar">
        <div className="hidden lg:flex">
          <SettingsSidebar profile={profile} />
        </div>
      </SectionErrorBoundary>

      {/* Main Content */}
      <div className="flex-1 bg-white dark:bg-[#313338] overflow-y-auto">
        {/* Mobile Settings Toggle - Only shown on mobile */}
        <div className="lg:hidden p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#313338]">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">Settings</h1>
            <SectionErrorBoundary name="mobile-settings-toggle">
              <MobileSettingsToggle profile={profile} />
            </SectionErrorBoundary>
          </div>
        </div>

        <PageErrorBoundary name="settings-content">
          {children}
        </PageErrorBoundary>
      </div>
    </div>
  );
}