"use client";

/**
 * Settings Header
 *
 * Provides a consistent header for settings pages with breadcrumb navigation
 * and mobile-friendly design.
 */

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface SettingsHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
}

// =============================================================================
// Utils
// =============================================================================

/**
 * Get all settings pages for navigation
 */
function getSettingsPages() {
  return [
    { id: "profile", title: "My Account", href: "/settings/profile" },
    { id: "privacy", title: "Privacy & Safety", href: "/settings/privacy" },
    { id: "notifications", title: "Notifications", href: "/settings/notifications" },
    { id: "security", title: "Security", href: "/settings/security" },
    { id: "appearance", title: "Appearance", href: "/settings/appearance" },
    { id: "accessibility", title: "Accessibility", href: "/settings/accessibility" },
    { id: "voice-video", title: "Voice & Video", href: "/settings/voice-video" },
    { id: "text-images", title: "Text & Images", href: "/settings/text-images" },
    { id: "language", title: "Language", href: "/settings/language" },
    { id: "keybinds", title: "Keybinds", href: "/settings/keybinds" },
    { id: "devices", title: "Registered Devices", href: "/settings/devices" },
  ];
}

// =============================================================================
// Component
// =============================================================================

export function SettingsHeader({ 
  title, 
  description, 
  icon, 
  className 
}: SettingsHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  
  const settingsPages = getSettingsPages();
  
  // Find current page index for navigation
  const currentIndex = settingsPages.findIndex(page => page.href === pathname);
  const prevPage = currentIndex > 0 ? settingsPages[currentIndex - 1] : null;
  const nextPage = currentIndex < settingsPages.length - 1 ? settingsPages[currentIndex + 1] : null;
  
  /**
   * Navigate to the main settings (close current page)
   */
  const handleGoBack = () => {
    router.push("/");
  };

  /**
   * Navigate to previous/next settings page
   */
  const handleNavigation = (href: string) => {
    router.push(href);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Breadcrumb and Back Button */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGoBack}
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Settings</span>
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium text-foreground">{title}</span>
        </div>
      </div>

      {/* Page Title and Description */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex-shrink-0">
              {icon}
            </div>
          )}
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
        
        {description && (
          <p className="text-muted-foreground max-w-2xl">
            {description}
          </p>
        )}
      </div>

      {/* Page Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => prevPage && handleNavigation(prevPage.href)}
          disabled={!prevPage}
          className="text-sm"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {prevPage ? prevPage.title : "Previous"}
        </Button>

        <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
          <span>{currentIndex + 1}</span>
          <span>of</span>
          <span>{settingsPages.length}</span>
          <span>settings</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => nextPage && handleNavigation(nextPage.href)}
          disabled={!nextPage}
          className="text-sm"
        >
          {nextPage ? nextPage.title : "Next"}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}