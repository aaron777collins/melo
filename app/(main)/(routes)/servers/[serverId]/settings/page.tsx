/**
 * Server Settings Overview Page
 * 
 * Main server settings page with general server configuration options.
 */

import React from "react";
import { redirect } from "next/navigation";
import { Settings, Users, Shield, Activity } from "lucide-react";

import { currentProfile } from "@/lib/current-profile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ServerSettingsPageProps {
  params: {
    serverId: string;
  };
}

export default async function ServerSettingsPage({ params }: ServerSettingsPageProps) {
  const { serverId } = params;

  // Get current user profile
  const profile = await currentProfile();
  if (!profile) {
    return redirect("/");
  }

  // TODO: Get actual server stats from Matrix
  const serverStats = {
    memberCount: 0,
    channelCount: 0,
    onlineMembers: 0,
    bannedUsers: 0
  };

  return (
    <div className="h-full p-6">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Server Settings
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Manage your server settings, roles, moderation, and more.
          </p>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Members
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{serverStats.memberCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Online Now
              </CardTitle>
              <Activity className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{serverStats.onlineMembers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Channels
              </CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{serverStats.channelCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Banned Users
              </CardTitle>
              <Shield className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{serverStats.bannedUsers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Server Overview</CardTitle>
              <CardDescription>
                Basic information and statistics about your server.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Use the sidebar to navigate to different settings sections:
              </p>
              <ul className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 list-disc list-inside space-y-1">
                <li><strong>Roles</strong> - Manage user permissions and role hierarchy</li>
                <li><strong>Members</strong> - View and manage server members</li>
                <li><strong>Moderation</strong> - Moderation tools and settings</li>
                <li><strong>Bans</strong> - View and manage banned users</li>
                <li><strong>Audit Log</strong> - Review moderation actions and changes</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}