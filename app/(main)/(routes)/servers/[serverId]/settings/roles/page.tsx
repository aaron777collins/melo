/**
 * Server Roles Settings Page
 * 
 * Comprehensive role management interface for Matrix spaces.
 * Provides Discord-style role management with Matrix power level integration.
 */

import React from "react";
import { redirect } from "next/navigation";
import { Metadata } from "next";

import { currentProfile } from "@/lib/current-profile";
import { RolesPageClient } from "./roles-page-client";

// =============================================================================
// Types
// =============================================================================

interface RolesPageProps {
  params: {
    serverId: string;
  };
}

// =============================================================================
// Metadata
// =============================================================================

export const metadata: Metadata = {
  title: "Server Roles - Melo",
  description: "Manage server roles and permissions",
};

// =============================================================================
// Component
// =============================================================================

export default async function RolesPage({ params }: RolesPageProps) {
  const { serverId } = params;
  
  // Get current user profile
  const profile = await currentProfile();
  if (!profile) {
    return redirect("/");
  }

  // TODO: Get user's actual power level in this space from Matrix
  // For now, assume moderator level (50) for demo purposes
  const userPowerLevel = 50;

  // TODO: Fetch actual space data from Matrix
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
    <RolesPageClient 
      serverId={serverId}
      userPowerLevel={userPowerLevel}
      space={space}
    />
  );
}