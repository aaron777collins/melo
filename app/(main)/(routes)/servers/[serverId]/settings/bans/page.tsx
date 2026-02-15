/**
 * Server Bans Settings Page
 * 
 * Shows the list of banned users and provides unban functionality
 * for moderators and administrators.
 */

import React from "react";
import { redirect } from "next/navigation";

import { currentProfile } from "@/lib/current-profile";
import { BanList } from "@/components/server/ban-list";

interface ServerBansPageProps {
  params: {
    serverId: string;
  };
}

/**
 * Server bans settings page component
 */
export default async function ServerBansPage({ params }: ServerBansPageProps) {
  const { serverId } = params;

  // Get current user profile
  const profile = await currentProfile();
  if (!profile) {
    return redirect("/");
  }

  // TODO: Get user's role in this server from Matrix power levels
  // For now, we'll assume they have moderator permissions if they can access settings
  const userRole: 'admin' | 'moderator' | 'member' = 'moderator';

  return (
    <div className="h-full p-6">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Server Bans
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Manage banned users for this server. You can view the ban list and unban users.
          </p>
        </div>

        {/* Ban List Component */}
        <BanList serverId={serverId} userRole={userRole} />
      </div>
    </div>
  );
}