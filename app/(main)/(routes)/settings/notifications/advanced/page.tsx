/**
 * Advanced Notification Settings Page
 * 
 * Comprehensive notification configuration including:
 * - Notification center management
 * - Email notification settings
 * - Push notification setup
 * - Template customization
 * - Advanced preferences
 */

import React from "react";
import { redirect } from "next/navigation";
import { Bell, Mail, Smartphone, Palette, Settings, ArrowLeft } from "lucide-react";
import Link from "next/link";

import { currentProfile } from "@/lib/current-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { NotificationTemplates } from "@/components/notifications/notification-templates";

export const metadata = {
  title: "Advanced Notification Settings - HAOS",
  description: "Configure advanced notification preferences, templates, and integrations"
};

// Email Settings Component (placeholder for future implementation)
function EmailNotificationSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Notifications
        </CardTitle>
        <CardDescription>
          Get email notifications when you're offline or away
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-8">
          <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Email Notifications</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Email notification support is coming soon. You'll be able to receive
            email summaries when you're offline.
          </p>
          <div className="space-y-2 text-left max-w-md mx-auto">
            <div className="text-sm">
              <strong>Planned features:</strong>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Email summaries for missed direct messages</li>
              <li>• Weekly digest of important mentions</li>
              <li>• Room invitation notifications via email</li>
              <li>• Customizable email templates</li>
              <li>• Smart batching to avoid spam</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Push Settings Component (placeholder for future implementation)
function PushNotificationSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Receive push notifications on mobile and desktop
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center py-8">
          <Smartphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Push Notifications</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Push notification support is being developed. This will enable
            notifications even when HAOS is closed.
          </p>
          <div className="space-y-2 text-left max-w-md mx-auto">
            <div className="text-sm">
              <strong>Framework ready for:</strong>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Web Push API integration</li>
              <li>• Service worker background notifications</li>
              <li>• Multi-device push synchronization</li>
              <li>• Notification actions (reply, dismiss)</li>
              <li>• Push provider extensibility</li>
            </ul>
          </div>
          <Button className="mt-4" disabled>
            Service Worker Framework Ready
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function AdvancedNotificationsPage() {
  const profile = await currentProfile();
  
  if (!profile) {
    return redirect("/");
  }

  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/settings/notifications">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Basic Settings
              </Button>
            </Link>
          </div>
          
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Advanced Notification Settings</h1>
          </div>
          <p className="text-muted-foreground">
            Configure advanced notification features, templates, and integrations.
          </p>
        </div>

        <Separator />

        {/* Main Content */}
        <Tabs defaultValue="center" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="center" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Center
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="push" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Push
            </TabsTrigger>
          </TabsList>

          {/* Notification Center Tab */}
          <TabsContent value="center" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-lg font-semibold mb-4">Live Notification Center</h3>
                <NotificationCenter />
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Notification Center Features</h3>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-sm font-medium">Real-time Updates</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Notifications appear instantly as messages arrive
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        <span className="text-sm font-medium">Smart Filtering</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Filter by type: mentions, DMs, invitations, and more
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full" />
                        <span className="text-sm font-medium">Quick Actions</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Mark as read, navigate to rooms, and manage notifications
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full" />
                        <span className="text-sm font-medium">Persistent Storage</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Notifications persist across sessions and page reloads
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <NotificationTemplates />
          </TabsContent>

          {/* Email Tab */}
          <TabsContent value="email" className="space-y-6">
            <EmailNotificationSettings />
          </TabsContent>

          {/* Push Tab */}
          <TabsContent value="push" className="space-y-6">
            <PushNotificationSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}