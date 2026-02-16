"use client";

import { BarChart3, Users, Clock, LinkIcon, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

import { InviteAnalytics, InviteWithStatus } from "@/hooks/use-invite-management";

interface InviteAnalyticsProps {
  analytics: InviteAnalytics;
  invites: InviteWithStatus[];
  formatTimeUntilExpiry: (timeMs: number) => string;
}

export function InviteAnalyticsComponent({ 
  analytics, 
  invites, 
  formatTimeUntilExpiry 
}: InviteAnalyticsProps) {
  const getExpiryBadgeVariant = (status: 'active' | 'expiring-soon' | 'expired') => {
    switch (status) {
      case 'active': return 'default';
      case 'expiring-soon': return 'secondary';
      case 'expired': return 'destructive';
      default: return 'outline';
    }
  };

  const getExpiryStatusText = (invite: InviteWithStatus) => {
    if (invite.isExpired) return 'Expired';
    if (!invite.expiresAt) return 'Never expires';
    if (invite.expiryStatus === 'expiring-soon') {
      return `Expires in ${formatTimeUntilExpiry(invite.timeUntilExpiry!)}`;
    }
    return `Expires ${invite.expiresAt.toLocaleDateString()}`;
  };

  const calculateUsagePercentage = (invite: InviteWithStatus) => {
    if (!invite.maxUses || invite.maxUses === 0) return 0;
    return Math.min((invite.currentUses / invite.maxUses) * 100, 100);
  };

  return (
    <div className="space-y-6">
      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invites</CardTitle>
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalInvites}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.activeInvites} active, {analytics.expiredInvites} expired
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Uses</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalUses}</div>
            <p className="text-xs text-muted-foreground">
              People joined via invites
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Invites</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.activeInvites}</div>
            <p className="text-xs text-muted-foreground">
              Currently usable links
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.mostUsedInvite?.currentUses || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.mostUsedInvite 
                ? (analytics.mostUsedInvite.slug || "Standard link") 
                : "No uses yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Invite Status */}
      {invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Invite Performance
            </CardTitle>
            <CardDescription>
              Detailed usage and status information for each invite
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invites.map((invite, index) => (
                <div key={index} className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">
                          {invite.slug || "Standard Link"}
                        </h4>
                        <Badge 
                          variant={getExpiryBadgeVariant(invite.expiryStatus)}
                          className="text-xs"
                        >
                          {invite.expiryStatus === 'expired' ? 'Expired' : 
                           invite.expiryStatus === 'expiring-soon' ? 'Expiring Soon' : 'Active'}
                        </Badge>
                        {invite.alias && (
                          <Badge variant="outline" className="text-xs">
                            Has Alias
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Created {invite.createdAt.toLocaleDateString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {getExpiryStatusText(invite)}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="font-bold text-lg">
                        {invite.currentUses}
                        {invite.maxUses && invite.maxUses > 0 && (
                          <span className="text-sm font-normal text-muted-foreground">
                            /{invite.maxUses}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {invite.currentUses === 1 ? 'use' : 'uses'}
                      </p>
                    </div>
                  </div>

                  {/* Usage Progress Bar (if maxUses is set) */}
                  {invite.maxUses && invite.maxUses > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Usage Progress</span>
                        <span className="font-medium">
                          {Math.round(calculateUsagePercentage(invite))}%
                        </span>
                      </div>
                      <Progress 
                        value={calculateUsagePercentage(invite)} 
                        className="h-2"
                      />
                    </div>
                  )}

                  {/* Separator except for last item */}
                  {index < invites.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {invites.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No invite data yet</h3>
            <p className="text-sm text-muted-foreground">
              Create some invites to see analytics and usage statistics here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}