/**
 * Language Settings Page
 * 
 * Language and regional preferences
 */

import React from "react";
import { currentProfile } from "@/lib/current-profile";
import { redirect } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Globe } from "lucide-react";

export default async function LanguageSettingsPage() {
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
            <Globe className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Language</h1>
          </div>
          <p className="text-muted-foreground">
            Set your preferred language and regional settings for the best experience.
          </p>
        </div>

        <Separator />

        {/* Language Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Interface Language</CardTitle>
            <CardDescription>
              Choose the language for menus, buttons, and interface text
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Language</Label>
              <Select defaultValue="en-US">
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-US">English (United States)</SelectItem>
                  <SelectItem value="en-GB">English (United Kingdom)</SelectItem>
                  <SelectItem value="es-ES">Español (España)</SelectItem>
                  <SelectItem value="es-MX">Español (México)</SelectItem>
                  <SelectItem value="fr-FR">Français (France)</SelectItem>
                  <SelectItem value="de-DE">Deutsch (Deutschland)</SelectItem>
                  <SelectItem value="it-IT">Italiano (Italia)</SelectItem>
                  <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                  <SelectItem value="ru-RU">Русский (Россия)</SelectItem>
                  <SelectItem value="ja-JP">日本語 (日本)</SelectItem>
                  <SelectItem value="ko-KR">한국어 (대한민국)</SelectItem>
                  <SelectItem value="zh-CN">中文 (简体)</SelectItem>
                  <SelectItem value="zh-TW">中文 (繁體)</SelectItem>
                  <SelectItem value="ar-SA">العربية (السعودية)</SelectItem>
                  <SelectItem value="hi-IN">हिन्दी (भारत)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Changes will take effect after refreshing the page
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Regional Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Regional Settings</CardTitle>
            <CardDescription>
              Configure date, time, and number formats
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Region</Label>
              <Select defaultValue="US">
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">United States</SelectItem>
                  <SelectItem value="CA">Canada</SelectItem>
                  <SelectItem value="GB">United Kingdom</SelectItem>
                  <SelectItem value="AU">Australia</SelectItem>
                  <SelectItem value="DE">Germany</SelectItem>
                  <SelectItem value="FR">France</SelectItem>
                  <SelectItem value="IT">Italy</SelectItem>
                  <SelectItem value="ES">Spain</SelectItem>
                  <SelectItem value="JP">Japan</SelectItem>
                  <SelectItem value="KR">South Korea</SelectItem>
                  <SelectItem value="CN">China</SelectItem>
                  <SelectItem value="IN">India</SelectItem>
                  <SelectItem value="BR">Brazil</SelectItem>
                  <SelectItem value="MX">Mexico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date format</Label>
              <Select defaultValue="MM/DD/YYYY">
                <SelectTrigger>
                  <SelectValue placeholder="Select date format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</SelectItem>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</SelectItem>
                  <SelectItem value="DD MMM YYYY">DD MMM YYYY (31 Dec 2024)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Time format</Label>
              <Select defaultValue="12h">
                <SelectTrigger>
                  <SelectValue placeholder="Select time format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12h">12-hour (2:30 PM)</SelectItem>
                  <SelectItem value="24h">24-hour (14:30)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Number format</Label>
              <Select defaultValue="1,234.56">
                <SelectTrigger>
                  <SelectValue placeholder="Select number format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1,234.56">1,234.56 (US/UK)</SelectItem>
                  <SelectItem value="1.234,56">1.234,56 (European)</SelectItem>
                  <SelectItem value="1 234,56">1 234,56 (French)</SelectItem>
                  <SelectItem value="1234.56">1234.56 (No separator)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Options */}
        <Card>
          <CardHeader>
            <CardTitle>Advanced</CardTitle>
            <CardDescription>
              Additional language and localization options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-translate">Auto-translate messages</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically translate messages in other languages
                </p>
              </div>
              <Switch id="auto-translate" />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="spell-check">Spell check</Label>
                <p className="text-sm text-muted-foreground">
                  Check spelling in messages as you type
                </p>
              </div>
              <Switch id="spell-check" defaultChecked />
            </div>

            <div className="space-y-2">
              <Label>Spell check language</Label>
              <Select defaultValue="en-US">
                <SelectTrigger>
                  <SelectValue placeholder="Select spell check language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="en-GB">English (UK)</SelectItem>
                  <SelectItem value="es-ES">Spanish</SelectItem>
                  <SelectItem value="fr-FR">French</SelectItem>
                  <SelectItem value="de-DE">German</SelectItem>
                  <SelectItem value="it-IT">Italian</SelectItem>
                  <SelectItem value="pt-BR">Portuguese</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="keyboard-layout">Detect keyboard layout</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically detect and adapt to your keyboard layout
                </p>
              </div>
              <Switch id="keyboard-layout" defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}