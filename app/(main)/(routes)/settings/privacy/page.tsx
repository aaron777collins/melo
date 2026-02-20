/**
 * Privacy & Safety Settings Page
 * 
 * Comprehensive privacy controls and safety features with Matrix account data integration
 */

"use client";

import React from "react";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, MessageCircle, Eye, Activity, Users } from "lucide-react";
import { SettingsHeader } from "@/components/settings/settings-header";
import { BlockedUsersList } from "@/components/privacy/blocked-users-list";
import { UserSearchBlock } from "@/components/privacy/user-search-block";
import { usePrivacySettings } from "@/hooks/use-privacy-settings";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ClientWrapper } from "@/components/client-wrapper";

export default function PrivacySettingsPage() {
  return (
    <ClientWrapper fallback={
      <div className="h-full p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="space-y-3">
            <div className="h-8 w-64 bg-gray-200 animate-pulse rounded"></div>
            <div className="h-4 w-96 bg-gray-200 animate-pulse rounded"></div>
          </div>
          <hr className="border-gray-200" />
          <div className="h-48 w-full bg-gray-200 animate-pulse rounded"></div>
          <div className="h-32 w-full bg-gray-200 animate-pulse rounded"></div>
        </div>
      </div>
    }>
      <PrivacySettingsContent />
    </ClientWrapper>
  );
}

function PrivacySettingsContent() {
  const { settings, isLoading, error, updateSetting } = usePrivacySettings();

  if (isLoading) {
    return (
      <div className="h-full p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Separator />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <SettingsHeader
            title="Privacy & Safety"
            description="Control who can contact you and how your data is used across the platform."
            icon={<Shield className="h-6 w-6" />}
          />
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load privacy settings: {error}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!settings) {
    return null;
  }

  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <SettingsHeader
          title="Privacy & Safety"
          description="Control who can contact you and how your data is used across the platform."
          icon={<Shield className="h-6 w-6" />}
        />

        <Separator />

        {/* Direct Messages Privacy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Direct Messages
            </CardTitle>
            <CardDescription>
              Control who can send you direct messages and friend requests
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* DM Privacy Level */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Who can send you direct messages</Label>
              <Select 
                value={settings.dmPrivacy} 
                onValueChange={(value: 'everyone' | 'friends' | 'nobody') => 
                  updateSetting('dmPrivacy', value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select DM privacy level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">Everyone</SelectItem>
                  <SelectItem value="friends">Friends Only</SelectItem>
                  <SelectItem value="nobody">Nobody</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {settings.dmPrivacy === 'everyone' && "Anyone can send you direct messages"}
                {settings.dmPrivacy === 'friends' && "Only people you&apos;ve added as friends can message you"}
                {settings.dmPrivacy === 'nobody' && "No one can send you direct messages"}
              </p>
            </div>

            {/* Friend Requests */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Who can send you friend requests</Label>
              <Select 
                value={settings.friendRequestPrivacy} 
                onValueChange={(value: 'everyone' | 'friends-of-friends' | 'server-members' | 'nobody') => 
                  updateSetting('friendRequestPrivacy', value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select friend request privacy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">Everyone</SelectItem>
                  <SelectItem value="friends-of-friends">Friends of Friends</SelectItem>
                  <SelectItem value="server-members">Server Members Only</SelectItem>
                  <SelectItem value="nobody">Nobody</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Online Status & Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Online Status & Visibility
            </CardTitle>
            <CardDescription>
              Control what others can see about your online presence
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="online-status">Show online status</Label>
                <p className="text-sm text-muted-foreground">
                  Let others see when you&apos;re online, away, or offline
                </p>
              </div>
              <Switch 
                id="online-status" 
                checked={settings.showOnlineStatus}
                onCheckedChange={(checked) => updateSetting('showOnlineStatus', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="activity-status">Share activity status</Label>
                <p className="text-sm text-muted-foreground">
                  Display what you&apos;re doing in your status (e.g., &quot;Playing a game&quot;)
                </p>
              </div>
              <Switch 
                id="activity-status" 
                checked={settings.shareActivityStatus}
                onCheckedChange={(checked) => updateSetting('shareActivityStatus', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Message Privacy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Message Privacy
            </CardTitle>
            <CardDescription>
              Control message-related privacy features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="read-receipts">Send read receipts</Label>
                <p className="text-sm text-muted-foreground">
                  Let others know when you&apos;ve read their messages
                </p>
              </div>
              <Switch 
                id="read-receipts" 
                checked={settings.showReadReceipts}
                onCheckedChange={(checked) => updateSetting('showReadReceipts', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="typing-indicator">Show typing indicator</Label>
                <p className="text-sm text-muted-foreground">
                  Let others know when you&apos;re typing a message
                </p>
              </div>
              <Switch 
                id="typing-indicator" 
                checked={settings.showTypingIndicator}
                onCheckedChange={(checked) => updateSetting('showTypingIndicator', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Block/Unblock Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>
              Block or unblock users to control who can interact with you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add User to Block */}
            <UserSearchBlock />
            
            <Separator />
            
            {/* Blocked Users List */}
            <BlockedUsersList />
          </CardContent>
        </Card>

        {/* Data Privacy Notice */}
        <Card>
          <CardHeader>
            <CardTitle>Data & Privacy Notice</CardTitle>
            <CardDescription>
              Information about how your privacy settings are stored
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                • Your privacy settings are securely stored using Matrix account data and synchronized across your devices.
              </p>
              <p>
                • Blocked users are maintained using the Matrix ignored users list for compatibility across Matrix clients.
              </p>
              <p>
                • Privacy settings only affect interactions within this Melo instance and may not apply to other Matrix clients.
              </p>
              <p>
                • Some settings may take a few moments to take effect across all your devices.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}