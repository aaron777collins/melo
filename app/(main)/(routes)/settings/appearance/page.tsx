/**
 * Appearance Settings Page
 * 
 * Theme, color, and visual customization options with visual indicators for unsaved changes
 */

import React from "react";
import { currentProfile } from "@/lib/current-profile";
import { redirect } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Palette } from "lucide-react";
import { AppearanceForm } from "@/components/settings/appearance-form";

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

        {/* Appearance Form with Visual Indicators */}
        <AppearanceForm />
      </div>
    </div>
  );
}