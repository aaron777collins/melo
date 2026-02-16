"use client";

/**
 * Mobile Settings Toggle
 *
 * Provides mobile access to settings sidebar navigation using Sheet overlay.
 * Similar pattern to MobileToggle but specifically for settings pages.
 * Enhanced with swipe-to-close gesture support for better mobile UX.
 */

import React, { useState } from "react";
import { Menu } from "lucide-react";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";
import { useModalSwipeGestures } from "@/hooks/use-swipe-gestures";
import { type MatrixProfile } from "@/lib/current-profile";

interface MobileSettingsToggleProps {
  profile: MatrixProfile;
}

export function MobileSettingsToggle({ profile }: MobileSettingsToggleProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Swipe gesture to close settings sheet
  const swipeRef = useModalSwipeGestures({
    onClose: () => setIsOpen(false)
  });

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0">
        <div ref={swipeRef} className="h-full">
          <SettingsSidebar profile={profile} />
        </div>
      </SheetContent>
    </Sheet>
  );
}