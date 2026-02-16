/**
 * Data Export Settings Page
 * 
 * GDPR-compliant data export page allowing users to download their Matrix data 
 * in JSON or CSV formats with progress indication and comprehensive information.
 */

"use client";

import React from "react";
import { Separator } from "@/components/ui/separator";
import { SettingsHeader } from "@/components/settings/settings-header";
import { ExportControls } from "@/components/settings/export-controls";
import { Download } from "lucide-react";

export default function DataExportPage() {
  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <SettingsHeader
          title="Data Export"
          description="Download your personal data in compliance with GDPR regulations. Export your messages, rooms, and profile information."
          icon={<Download className="h-6 w-6" />}
        />

        <Separator />

        {/* Export Controls */}
        <ExportControls />
      </div>
    </div>
  );
}