import React from "react";
/**
 * Server Members Settings Page
 *
 * Server settings page for managing server members and bulk role assignment.
 * Provides comprehensive member management with multi-select operations.
 */

import { redirect } from "next/navigation";
import { currentProfile } from "@/lib/current-profile";
import { MembersSettingsClient } from "./members-settings-client";

interface MembersSettingsPageProps {
  params: {
    serverId: string;
  };
}

export default async function MembersSettingsPage({
  params
}: MembersSettingsPageProps) {
  const { serverId } = params;

  // Get current user profile
  const profile = await currentProfile();
  if (!profile) {
    return redirect("/");
  }

  // TODO: Verify user has permission to access server settings
  // For now, we'll handle this in the client component

  return (
    <div className="h-full">
      <MembersSettingsClient 
        serverId={serverId} 
        currentUserId={profile.userId}
      />
    </div>
  );
}