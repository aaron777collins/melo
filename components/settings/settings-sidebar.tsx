"use client";

/**
 * Settings Sidebar
 *
 * Discord-style left navigation for user settings pages.
 * Groups settings into logical sections with proper routing.
 */

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  User,
  Bell,
  Lock,
  Shield,
  Accessibility,
  Palette,
  Monitor,
  Mic,
  Speaker,
  Video,
  Keyboard,
  MessageCircle,
  Globe,
  Smartphone,
  ChevronLeft,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { type MatrixProfile } from "@/lib/current-profile";

// =============================================================================
// Types
// =============================================================================

interface SettingsNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  /** Badge text (e.g., "NEW", "BETA") */
  badge?: string;
  /** Whether this is a danger zone item */
  isDanger?: boolean;
}

interface SettingsNavSection {
  title: string | null;
  items: SettingsNavItem[];
}

interface SettingsSidebarProps {
  profile: MatrixProfile;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Get navigation sections for user settings
 */
function getNavSections(): SettingsNavSection[] {
  const basePath = `/settings`;
  
  const sections: SettingsNavSection[] = [
    // User Settings section
    {
      title: "USER SETTINGS",
      items: [
        {
          id: "profile",
          label: "My Account",
          icon: User,
          href: `${basePath}/profile`,
        },
        {
          id: "privacy",
          label: "Privacy & Safety",
          icon: Shield,
          href: `${basePath}/privacy`,
        },
        {
          id: "notifications",
          label: "Notifications",
          icon: Bell,
          href: `${basePath}/notifications`,
        },
        {
          id: "security",
          label: "Security",
          icon: Lock,
          href: `${basePath}/security`,
        },
      ],
    },
    
    // App Settings section
    {
      title: "APP SETTINGS",
      items: [
        {
          id: "appearance",
          label: "Appearance",
          icon: Palette,
          href: `${basePath}/appearance`,
        },
        {
          id: "accessibility",
          label: "Accessibility",
          icon: Accessibility,
          href: `${basePath}/accessibility`,
        },
        {
          id: "voice-video",
          label: "Voice & Video",
          icon: Mic,
          href: `${basePath}/voice-video`,
        },
        {
          id: "text-images",
          label: "Text & Images",
          icon: MessageCircle,
          href: `${basePath}/text-images`,
        },
        {
          id: "language",
          label: "Language",
          icon: Globe,
          href: `${basePath}/language`,
        },
      ],
    },
    
    // Advanced section  
    {
      title: "ADVANCED",
      items: [
        {
          id: "keybinds",
          label: "Keybinds",
          icon: Keyboard,
          href: `${basePath}/keybinds`,
        },
        {
          id: "devices",
          label: "Registered Devices",
          icon: Smartphone,
          href: `${basePath}/devices`,
        },
      ],
    },
  ];
  
  return sections;
}

// =============================================================================
// Component
// =============================================================================

export function SettingsSidebar({
  profile,
}: SettingsSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  
  const navSections = getNavSections();
  
  /**
   * Check if a nav item is currently active
   */
  const isActive = (href: string) => {
    return pathname?.startsWith(href) ?? false;
  };
  
  /**
   * Navigate back to main app
   */
  const handleClose = () => {
    router.push("/");
  };
  
  /**
   * Get user display name
   */
  const getDisplayName = () => {
    return profile.name || profile.userId.split(":")[0].replace("@", "");
  };
  
  /**
   * Get user initials
   */
  const getInitials = () => {
    const name = getDisplayName();
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };
  
  return (
    <div className="flex flex-col h-full w-60 bg-[#2B2D31] dark:bg-[#2B2D31]">
      {/* Header with close button */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-zinc-800 shadow-sm">
        <h1 className="text-white font-semibold text-sm">User Settings</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50 p-1.5 h-auto w-auto"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* User info */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            {profile.imageUrl ? (
              <AvatarImage src={profile.imageUrl} alt={getDisplayName()} />
            ) : null}
            <AvatarFallback className="bg-indigo-500 text-white text-sm font-semibold">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-medium text-sm truncate">
              {getDisplayName()}
            </h2>
            <p className="text-zinc-400 text-xs truncate">
              {profile.userId}
            </p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-2">
        <nav className="space-y-1">
          {navSections.map((section, sectionIndex) => (
            <div key={section.title || `section-${sectionIndex}`} className="mb-2">
              {section.title && (
                <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2 py-2">
                  {section.title}
                </h3>
              )}
              
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                
                return (
                  <button
                    key={item.id}
                    onClick={() => router.push(item.href)}
                    className={cn(
                      "w-full flex items-center gap-3 px-2 py-1.5 rounded-md text-sm font-medium transition-colors",
                      active
                        ? "bg-zinc-700/60 text-white"
                        : item.isDanger
                        ? "text-red-400 hover:bg-red-500/10 hover:text-red-300"
                        : "text-zinc-400 hover:bg-zinc-700/40 hover:text-zinc-200"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 flex-shrink-0",
                        active
                          ? "text-white"
                          : item.isDanger
                          ? "text-red-400"
                          : "text-zinc-400"
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-500 text-white rounded">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
              
              {sectionIndex < navSections.length - 1 && (
                <Separator className="my-2 bg-zinc-700/50" />
              )}
            </div>
          ))}
        </nav>
      </ScrollArea>
      
      {/* Footer with ESC hint */}
      <div className="p-3 border-t border-zinc-800">
        <div className="flex items-center justify-center gap-2 text-zinc-500 text-xs">
          <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px] font-mono">
            ESC
          </kbd>
          <span>to close settings</span>
        </div>
      </div>
    </div>
  );
}

export default SettingsSidebar;