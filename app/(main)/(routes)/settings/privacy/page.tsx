/**
 * Privacy & Safety Settings Page
 * 
 * Comprehensive privacy controls and safety features
 */

import React from "react";
import { currentProfile } from "@/lib/current-profile";
import { redirect } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield } from "lucide-react";
import { SettingsHeader } from "@/components/settings/settings-header";

export default async function PrivacySettingsPage() {
  const profile = await currentProfile();
  if (!profile) {
    return redirect("/");
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

        {/* Direct Messages */}
        <Card>
          <CardHeader>
            <CardTitle>Direct Messages</CardTitle>
            <CardDescription>
              Control who can send you direct messages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="dm-everyone">Allow direct messages from server members</Label>
                <p className="text-sm text-muted-foreground">
                  Members of servers you share can message you directly
                </p>
              </div>
              <Switch id="dm-everyone" defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="dm-friends">Allow direct messages from friends</Label>
                <p className="text-sm text-muted-foreground">
                  People you&apos;ve added as friends can message you
                </p>
              </div>
              <Switch id="dm-friends" defaultChecked />
            </div>

            <div className="space-y-3">
              <Label>Friend requests</Label>
              <Select defaultValue="everyone">
                <SelectTrigger>
                  <SelectValue placeholder="Select who can send friend requests" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">Everyone</SelectItem>
                  <SelectItem value="friends-of-friends">Friends of Friends</SelectItem>
                  <SelectItem value="server-members">Server Members Only</SelectItem>
                  <SelectItem value="none">No One</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Server Privacy */}
        <Card>
          <CardHeader>
            <CardTitle>Server Privacy</CardTitle>
            <CardDescription>
              Control your visibility and interactions in servers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="server-activity">Show current activity</Label>
                <p className="text-sm text-muted-foreground">
                  Display what you&apos;re doing in your status
                </p>
              </div>
              <Switch id="server-activity" defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="typing-indicator">Show typing indicator</Label>
                <p className="text-sm text-muted-foreground">
                  Let others know when you&apos;re typing a message
                </p>
              </div>
              <Switch id="typing-indicator" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="read-receipts">Send read receipts</Label>
                <p className="text-sm text-muted-foreground">
                  Let others know when you&apos;ve read their messages
                </p>
              </div>
              <Switch id="read-receipts" />
            </div>
          </CardContent>
        </Card>

        {/* Data & Privacy */}
        <Card>
          <CardHeader>
            <CardTitle>Data & Privacy</CardTitle>
            <CardDescription>
              Manage how your data is collected and used
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="analytics">Allow analytics</Label>
                <p className="text-sm text-muted-foreground">
                  Help improve the platform with anonymous usage data
                </p>
              </div>
              <Switch id="analytics" defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="personalized-tips">Personalized tips</Label>
                <p className="text-sm text-muted-foreground">
                  Receive tips and suggestions based on your usage
                </p>
              </div>
              <Switch id="personalized-tips" defaultChecked />
            </div>

            <div className="space-y-3">
              <Label>Data download</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Request a copy of your data stored on our servers
              </p>
              <button className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors">
                Request Data Package
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}