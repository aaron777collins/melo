/**
 * Appearance Settings Page
 * 
 * Theme, color, and visual customization options
 */

import React from "react";
import { currentProfile } from "@/lib/current-profile";
import { redirect } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Palette } from "lucide-react";

export default async function AppearanceSettingsPage() {
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
            <Palette className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Appearance</h1>
          </div>
          <p className="text-muted-foreground">
            Customize the look and feel of your interface with themes, colors, and visual preferences.
          </p>
        </div>

        <Separator />

        {/* Theme */}
        <Card>
          <CardHeader>
            <CardTitle>Theme</CardTitle>
            <CardDescription>
              Choose between light, dark, or system theme
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup defaultValue="system" className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="light" id="light" />
                <Label htmlFor="light" className="flex flex-col gap-2 cursor-pointer">
                  <div className="w-full h-20 bg-gray-100 border-2 border-gray-200 rounded-lg flex items-center justify-center">
                    <div className="w-8 h-8 bg-white border border-gray-300 rounded shadow-sm"></div>
                  </div>
                  <span className="text-sm font-medium">Light</span>
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dark" id="dark" />
                <Label htmlFor="dark" className="flex flex-col gap-2 cursor-pointer">
                  <div className="w-full h-20 bg-gray-800 border-2 border-gray-700 rounded-lg flex items-center justify-center">
                    <div className="w-8 h-8 bg-gray-900 border border-gray-600 rounded shadow-sm"></div>
                  </div>
                  <span className="text-sm font-medium">Dark</span>
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="system" id="system" />
                <Label htmlFor="system" className="flex flex-col gap-2 cursor-pointer">
                  <div className="w-full h-20 bg-gradient-to-r from-gray-100 to-gray-800 border-2 border-gray-400 rounded-lg flex items-center justify-center">
                    <div className="w-8 h-8 bg-gradient-to-r from-white to-gray-900 border border-gray-400 rounded shadow-sm"></div>
                  </div>
                  <span className="text-sm font-medium">System</span>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Message Display */}
        <Card>
          <CardHeader>
            <CardTitle>Message Display</CardTitle>
            <CardDescription>
              Customize how messages appear in chat
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Message grouping</Label>
              <RadioGroup defaultValue="cozy" className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cozy" id="cozy" />
                  <Label htmlFor="cozy">Cozy - Modern spacing with profile pictures</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="compact" id="compact" />
                  <Label htmlFor="compact">Compact - Fits more messages on screen</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-timestamps">Show message timestamps</Label>
                <p className="text-sm text-muted-foreground">
                  Display timestamps on hover or always visible
                </p>
              </div>
              <Switch id="show-timestamps" defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-reactions">Show emoji reactions</Label>
                <p className="text-sm text-muted-foreground">
                  Display emoji reactions on messages
                </p>
              </div>
              <Switch id="show-reactions" defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Advanced */}
        <Card>
          <CardHeader>
            <CardTitle>Advanced</CardTitle>
            <CardDescription>
              Fine-tune the visual experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="zoom-level">Interface zoom level</Label>
                <span className="text-sm text-muted-foreground">100%</span>
              </div>
              <Slider
                id="zoom-level"
                min={75}
                max={125}
                step={5}
                defaultValue={[100]}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Adjust the overall size of the interface
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="reduce-motion">Reduce motion</Label>
                <p className="text-sm text-muted-foreground">
                  Minimize animations and transitions
                </p>
              </div>
              <Switch id="reduce-motion" />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="high-contrast">High contrast mode</Label>
                <p className="text-sm text-muted-foreground">
                  Increase contrast for better visibility
                </p>
              </div>
              <Switch id="high-contrast" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}