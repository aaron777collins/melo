"use client";

/**
 * Mobile Settings Toggle
 *
 * Provides mobile access to settings sidebar navigation using Sheet overlay.
 * Similar pattern to MobileToggle but specifically for settings pages.
 */

import React from "react";
import { Menu } from "lucide-react";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";
import { type MatrixProfile } from "@/lib/current-profile";

interface MobileSettingsToggleProps {
  profile: MatrixProfile;
}

export function MobileSettingsToggle({ profile }: MobileSettingsToggleProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0">
        <SettingsSidebar profile={profile} />
      </SheetContent>
    </Sheet>
  );
}