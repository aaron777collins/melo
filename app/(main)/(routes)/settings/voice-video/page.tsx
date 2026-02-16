/**
 * Voice & Video Settings Page
 * 
 * Audio input/output device selection, quality controls, and test functionality
 */

import React from "react";
import { currentProfile } from "@/lib/current-profile";
import { redirect } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Mic } from "lucide-react";
import { VoiceVideoForm } from "@/components/settings/voice-video-form";

export default async function VoiceVideoSettingsPage() {
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
            <Mic className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Voice & Video</h1>
          </div>
          <p className="text-muted-foreground">
            Configure audio and video devices, quality settings, and test your microphone and camera.
          </p>
        </div>

        <Separator />

        {/* Voice & Video Form */}
        <VoiceVideoForm />
      </div>
    </div>
  );
}