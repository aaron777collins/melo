"use client";

/**
 * Settings Search
 *
 * Provides quick search functionality across all settings pages.
 * Uses Command Dialog pattern similar to ServerSearch.
 */

import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";

// =============================================================================
// Types  
// =============================================================================

interface SettingsSearchItem {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  category: string;
}

// =============================================================================
// Data
// =============================================================================

/**
 * Get all searchable settings items
 */
function getSearchableSettings(): SettingsSearchItem[] {
  return [
    // User Settings
    {
      id: "profile",
      title: "My Account", 
      description: "Manage your profile information and account settings",
      href: "/settings/profile",
      icon: <span className="text-lg">👤</span>,
      category: "User Settings"
    },
    {
      id: "privacy",
      title: "Privacy & Safety",
      description: "Control who can contact you and how your data is used", 
      href: "/settings/privacy",
      icon: <span className="text-lg">🛡️</span>,
      category: "User Settings"
    },
    {
      id: "notifications",
      title: "Notifications",
      description: "Manage notification preferences for servers and channels",
      href: "/settings/notifications", 
      icon: <span className="text-lg">🔔</span>,
      category: "User Settings"
    },
    {
      id: "security",
      title: "Security",
      description: "Manage passwords, two-factor authentication, and sessions",
      href: "/settings/security",
      icon: <span className="text-lg">🔐</span>,
      category: "User Settings"
    },
    
    // App Settings
    {
      id: "appearance",
      title: "Appearance", 
      description: "Customize themes, colors, and visual preferences",
      href: "/settings/appearance",
      icon: <span className="text-lg">🎨</span>,
      category: "App Settings"
    },
    {
      id: "accessibility",
      title: "Accessibility",
      description: "Configure accessibility features and accommodations", 
      href: "/settings/accessibility",
      icon: <span className="text-lg">♿</span>,
      category: "App Settings"
    },
    {
      id: "voice-video", 
      title: "Voice & Video",
      description: "Configure microphone, camera, and audio settings",
      href: "/settings/voice-video",
      icon: <span className="text-lg">🎙️</span>,
      category: "App Settings"
    },
    {
      id: "text-images",
      title: "Text & Images", 
      description: "Control message formatting and image display",
      href: "/settings/text-images",
      icon: <span className="text-lg">💬</span>,
      category: "App Settings"
    },
    {
      id: "language",
      title: "Language",
      description: "Set your preferred language and regional settings", 
      href: "/settings/language",
      icon: <span className="text-lg">🌐</span>,
      category: "App Settings"
    },
    
    // Advanced
    {
      id: "keybinds",
      title: "Keybinds",
      description: "Customize keyboard shortcuts and hotkeys", 
      href: "/settings/keybinds",
      icon: <span className="text-lg">⌨️</span>,
      category: "Advanced"
    },
    {
      id: "devices", 
      title: "Registered Devices",
      description: "Manage signed-in devices and sessions",
      href: "/settings/devices",
      icon: <span className="text-lg">📱</span>,
      category: "Advanced"
    }
  ];
}

// =============================================================================
// Component
// =============================================================================

export function SettingsSearch() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  
  const searchableSettings = getSearchableSettings();
  
  // Group settings by category
  const groupedSettings = searchableSettings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, SettingsSearchItem[]>);

  /**
   * Handle keyboard shortcut (Ctrl/Cmd + K)
   */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  /**
   * Navigate to selected setting
   */
  const handleSelect = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      {/* Search Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="group px-3 py-2 rounded-md flex items-center gap-x-2 w-full hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 transition-colors"
      >
        <Search className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
        <p className="font-medium text-sm text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
          Search Settings
        </p>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-zinc-100 dark:bg-zinc-800 px-1.5 font-mono text-[10px] font-medium text-zinc-600 dark:text-zinc-400 ml-auto">
          <span className="text-xs">⌘</span>
          <span className="text-lg">K</span>
        </kbd>
      </button>

      {/* Search Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search settings..." />
        <CommandList>
          <CommandEmpty>No settings found.</CommandEmpty>
          
          {Object.entries(groupedSettings).map(([category, settings]) => (
            <CommandGroup key={category} heading={category}>
              {settings.map((setting) => (
                <CommandItem
                  key={setting.id}
                  onSelect={() => handleSelect(setting.href)}
                  className="flex items-start gap-3 p-3"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {setting.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-zinc-900 dark:text-white">
                      {setting.title}
                    </div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                      {setting.description}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}