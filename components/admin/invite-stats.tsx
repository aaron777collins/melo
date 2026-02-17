/**
 * Invite Statistics Component
 * 
 * Shows detailed statistics about invite usage and trends.
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Calendar, User } from "lucide-react";

interface AdminInvite {
  id: string;
  invitedUserId: string;
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  used: boolean;
  usedAt?: string;
  notes?: string;
}

interface InviteStatsData {
  totalInvites: number;
  activeInvites: number;
  usedInvites: number;
  expiredInvites: number;
}

interface InviteStatsProps {
  stats: InviteStatsData | null;
  invites: AdminInvite[];
}

export function InviteStats({ stats, invites }: InviteStatsProps) {
  if (!stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>No Statistics Available</CardTitle>
            <CardDescription>No invite data to analyze</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Calculate additional stats from invites
  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const recentInvites = invites.filter(
    invite => new Date(invite.createdAt) > last7Days
  ).length;

  const recentlyUsed = invites.filter(
    invite => invite.usedAt && new Date(invite.usedAt) > last7Days
  ).length;

  const expiringSoon = invites.filter(invite => {
    if (!invite.expiresAt || invite.used) return false;
    const expiresAt = new Date(invite.expiresAt);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return expiresAt < sevenDaysFromNow;
  }).length;

  const usageRate = stats.totalInvites > 0 
    ? Math.round((stats.usedInvites / stats.totalInvites) * 100)
    : 0;

  // Group invites by creator
  const invitesByCreator = invites.reduce((acc, invite) => {
    acc[invite.createdBy] = (acc[invite.createdBy] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topCreators = Object.entries(invitesByCreator)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usage Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.usedInvites} of {stats.totalInvites} invites used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentInvites}</div>
            <p className="text-xs text-muted-foreground">
              Invites created in last 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Usage</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentlyUsed}</div>
            <p className="text-xs text-muted-foreground">
              Invites used in last 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{expiringSoon}</div>
            <p className="text-xs text-muted-foreground">
              Expiring within 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Invite Status Breakdown</CardTitle>
            <CardDescription>Distribution of invite statuses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Active Invites</span>
                <span className="text-sm font-medium text-blue-600">{stats.activeInvites}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500"
                  style={{ width: `${stats.totalInvites > 0 ? (stats.activeInvites / stats.totalInvites) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Used Invites</span>
                <span className="text-sm font-medium text-green-600">{stats.usedInvites}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500"
                  style={{ width: `${stats.totalInvites > 0 ? (stats.usedInvites / stats.totalInvites) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Expired Invites</span>
                <span className="text-sm font-medium text-red-600">{stats.expiredInvites}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500"
                  style={{ width: `${stats.totalInvites > 0 ? (stats.expiredInvites / stats.totalInvites) * 100 : 0}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Invite Creators</CardTitle>
            <CardDescription>Users who have created the most invites</CardDescription>
          </CardHeader>
          <CardContent>
            {topCreators.length > 0 ? (
              <div className="space-y-3">
                {topCreators.map(([userId, count], index) => (
                  <div key={userId} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">#{index + 1}</span>
                      <span className="text-sm truncate max-w-[200px]" title={userId}>
                        {userId.split(':')[0].replace('@', '')}
                      </span>
                    </div>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No invite creators yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}