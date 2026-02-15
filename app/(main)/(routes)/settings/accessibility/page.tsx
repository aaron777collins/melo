/**
 * Accessibility Settings Page
 * 
 * Accessibility features and accommodations for improved usability
 */

import React from "react";
import { currentProfile } from "@/lib/current-profile";
import { redirect } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Accessibility } from "lucide-react";

export default async function AccessibilitySettingsPage() {
  const profile = await currentProfile();
  if (!profile) {
    return redirect("/");
  }

  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Accessibility className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Accessibility</h1>
          </div>
          <p className="text-muted-foreground">
            Configure accessibility features and accommodations to improve your experience.
          </p>
        </div>

        <Separator />

        {/* Vision */}
        <Card>
          <CardHeader>
            <CardTitle>Vision</CardTitle>
            <CardDescription>
              Settings for users with visual impairments or preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="high-contrast">High contrast mode</Label>
                <p className="text-sm text-muted-foreground">
                  Increase contrast ratios for better visibility
                </p>
              </div>
              <Switch id="high-contrast" />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="reduce-transparency">Reduce transparency</Label>
                <p className="text-sm text-muted-foreground">
                  Make backgrounds more opaque for clarity
                </p>
              </div>
              <Switch id="reduce-transparency" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="font-size">Font size</Label>
                <span className="text-sm text-muted-foreground">16px</span>
              </div>
              <Slider
                id="font-size"
                min={12}
                max={24}
                step={1}
                defaultValue={[16]}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Adjust text size across the interface
              </p>
            </div>

            <div className="space-y-3">
              <Label>Color vision</Label>
              <Select defaultValue="none">
                <SelectTrigger>
                  <SelectValue placeholder="Select color vision type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No color vision issues</SelectItem>
                  <SelectItem value="protanopia">Protanopia (red-blind)</SelectItem>
                  <SelectItem value="deuteranopia">Deuteranopia (green-blind)</SelectItem>
                  <SelectItem value="tritanopia">Tritanopia (blue-blind)</SelectItem>
                  <SelectItem value="monochromacy">Monochromacy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Motor */}
        <Card>
          <CardHeader>
            <CardTitle>Motor & Input</CardTitle>
            <CardDescription>
              Settings for users with motor impairments or input preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sticky-keys">Sticky keys</Label>
                <p className="text-sm text-muted-foreground">
                  Use modifier keys without holding them down
                </p>
              </div>
              <Switch id="sticky-keys" />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="slow-keys">Slow keys</Label>
                <p className="text-sm text-muted-foreground">
                  Require keys to be held briefly before registering
                </p>
              </div>
              <Switch id="slow-keys" />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="click-assistance">Click assistance</Label>
                <p className="text-sm text-muted-foreground">
                  Perform secondary click by holding primary click
                </p>
              </div>
              <Switch id="click-assistance" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="double-click-speed">Double-click speed</Label>
                <span className="text-sm text-muted-foreground">Medium</span>
              </div>
              <Slider
                id="double-click-speed"
                min={1}
                max={5}
                step={1}
                defaultValue={[3]}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Audio */}
        <Card>
          <CardHeader>
            <CardTitle>Audio & Hearing</CardTitle>
            <CardDescription>
              Settings for users with hearing impairments or audio preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="visual-notifications">Visual notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Flash the screen or window for notifications
                </p>
              </div>
              <Switch id="visual-notifications" />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sound-captions">Sound captions</Label>
                <p className="text-sm text-muted-foreground">
                  Show text descriptions of audio events
                </p>
              </div>
              <Switch id="sound-captions" />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="mono-audio">Mono audio</Label>
                <p className="text-sm text-muted-foreground">
                  Play all audio in both ears identically
                </p>
              </div>
              <Switch id="mono-audio" />
            </div>
          </CardContent>
        </Card>

        {/* Cognitive */}
        <Card>
          <CardHeader>
            <CardTitle>Cognitive & Focus</CardTitle>
            <CardDescription>
              Settings to reduce distractions and improve focus
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="reduce-motion">Reduce motion</Label>
                <p className="text-sm text-muted-foreground">
                  Minimize animations and moving elements
                </p>
              </div>
              <Switch id="reduce-motion" />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="simple-layout">Simplified layout</Label>
                <p className="text-sm text-muted-foreground">
                  Use cleaner, less cluttered interfaces
                </p>
              </div>
              <Switch id="simple-layout" />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="focus-mode">Focus mode</Label>
                <p className="text-sm text-muted-foreground">
                  Hide distracting elements during important tasks
                </p>
              </div>
              <Switch id="focus-mode" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}