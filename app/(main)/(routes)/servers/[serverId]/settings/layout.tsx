/**
 * Server Settings Layout
 * 
 * Provides the layout for all server settings pages with sidebar navigation.
 */

import React from "react";
import { redirect } from "next/navigation";

import { currentProfile } from "@/lib/current-profile";
import { ServerSettingsSidebar } from "@/components/server/settings/server-settings-sidebar";

interface ServerSettingsLayoutProps {
  children: React.ReactNode;
  params: {
    serverId: string;
  };
}

export default async function ServerSettingsLayout({
  children,
  params
}: ServerSettingsLayoutProps) {
  const { serverId } = params;

  // Get current user profile
  const profile = await currentProfile();
  if (!profile) {
    return redirect("/");
  }

  // TODO: Get user's power level in this space from Matrix
  // For now, assume moderator level (50)
  const userPowerLevel = 50;

  // TODO: Get space details from Matrix
  // For now, create a mock space object
  const space = {
    id: serverId,
    name: "Server Name", // This should come from Matrix space
    avatarUrl: null,
    topic: null,
    memberCount: 0,
    isOwner: false,
    childRoomIds: [],
    joinRule: "invite" as const,
    canonicalAlias: null,
    currentUserPowerLevel: userPowerLevel,
    hasUnread: false,
    unreadMentionCount: 0
  };

  return (
    <div className="h-full flex">
      {/* Settings Sidebar */}
      <ServerSettingsSidebar 
        space={space}
        serverId={serverId}
        userPowerLevel={userPowerLevel}
      />

      {/* Main Content */}
      <div className="flex-1 bg-white dark:bg-[#36393f] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}