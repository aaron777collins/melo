/**
 * Server Audit Log Page
 * 
 * Displays audit log for server moderation actions, role changes,
 * and other administrative events with filtering capabilities.
 */

import React from "react";
import { redirect } from "next/navigation";

import { currentProfile } from "@/lib/current-profile";
import { AuditLog } from "@/components/server/audit-log";

interface ServerAuditLogPageProps {
  params: {
    serverId: string;
  };
}

/**
 * Server audit log page component
 */
export default async function ServerAuditLogPage({ params }: ServerAuditLogPageProps) {
  const { serverId } = params;

  // Get current user profile
  const profile = await currentProfile();
  if (!profile) {
    return redirect("/");
  }

  // TODO: Check user's role in this server from Matrix power levels
  // For now, we'll assume they have moderator permissions if they can access settings
  // In a full implementation, verify the user has at least moderator privileges
  
  return (
    <div className="h-full p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Audit Log
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            View moderation actions, role changes, and other administrative events for this server.
            Use filters to search for specific actions or users.
          </p>
        </div>

        {/* Audit Log Component */}
        <AuditLog serverId={serverId} />
      </div>
    </div>
  );
}