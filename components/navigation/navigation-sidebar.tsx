"use client";

import React, { useId } from "react";

import { NavigationAction } from "@/components/navigation/navigation-action";
import { NavigationDM } from "@/components/navigation/navigation-dm";
import { NavigationItem } from "@/components/navigation/navigation-item";
import { UserPanel } from "@/components/navigation/user-panel";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ModeToggle } from "@/components/mode-toggle";
import { useSpaces, useUnreadDMCount } from "@/hooks/use-spaces";
import { useAccessibility } from "@/src/hooks/use-accessibility";
import { cn } from "@/lib/utils";

/**
 * Discord-style navigation sidebar
 * 
 * Features:
 * - DM shortcut at top
 * - Separator
 * - Scrollable list of joined servers/spaces
 * - Add server button at bottom of list
 * - Mode toggle and user avatar at very bottom
 * 
 * Layout matches Discord:
 * [DM Button]
 * [Separator]
 * [Server 1]
 * [Server 2]
 * [...]
 * [Add Server +]
 * [---spacer---]
 * [Mode Toggle]
 * [User Avatar]
 */
export function NavigationSidebar() {
  const { spaces, isLoading } = useSpaces();
  const unreadDMCount = useUnreadDMCount();
  const { effectivePreferences, announceNavigation } = useAccessibility();
  
  // Generate unique IDs for accessibility
  const sidebarId = useId();
  const serverListId = useId();
  const toolbarId = useId();

  return (
    <div
      id={sidebarId}
      role="navigation"
      aria-label="Server and channel navigation"
      className={cn(
        "space-y-4 flex flex-col h-full items-center",
        "text-primary w-full py-3",
        "dark:bg-[#1e1f22] bg-[#e3e5e8]",
        effectivePreferences.highContrast && "high-contrast-bg high-contrast-border",
        effectivePreferences.enhancedFocus && "keyboard-navigable"
      )}
    >
      {/* DM Shortcut Button */}
      <div role="button" tabIndex={0} aria-describedby={`${sidebarId}-dm-help`}>
        <NavigationDM unreadCount={unreadDMCount} />
      </div>
      <div id={`${sidebarId}-dm-help`} className="sr-only">
        Direct messages. {unreadDMCount > 0 ? `${unreadDMCount} unread messages.` : 'No unread messages.'}
      </div>

      {/* Separator */}
      <Separator 
        className="h-[2px] bg-zinc-300 dark:bg-zinc-700 rounded-md w-10 mx-auto" 
        role="separator"
        aria-label="Separator between direct messages and servers"
      />

      {/* Scrollable Server List */}
      <ScrollArea 
        className={`flex-1 w-full scrollable-area ${effectivePreferences.enhancedFocus ? 'keyboard-navigable' : ''}`}
        role="region"
        aria-labelledby={`${serverListId}-title`}
      >
        <h2 id={`${serverListId}-title`} className="sr-only">Server list</h2>
        
        {isLoading ? (
          // Loading skeleton with accessibility
          <div className="flex flex-col items-center gap-4" role="status" aria-live="polite">
            <span className="sr-only">Loading servers...</span>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`mx-3 h-[48px] w-[48px] rounded-[24px] bg-zinc-700/50 ${effectivePreferences.reducedMotion ? '' : 'animate-pulse'}`}
                aria-hidden="true"
              />
            ))}
          </div>
        ) : spaces.length > 0 ? (
          // Server list
          <div 
            className="flex flex-col items-center gap-2" 
            role="list"
            aria-label={`${spaces.length} servers`}
          >
            {spaces.map((space, index) => (
              <div key={space.id} role="listitem" tabIndex={0}>
                <NavigationItem
                  id={space.id}
                  imageUrl={space.avatarUrl}
                  name={space.name}
                  hasUnread={space.hasUnread}
                  mentionCount={space.mentionCount}
                />
              </div>
            ))}
          </div>
        ) : (
          // Empty state - no servers yet
          <div className="flex flex-col items-center px-2 py-4" role="status">
            <p className={`text-xs text-zinc-500 dark:text-zinc-400 text-center ${effectivePreferences.highContrast ? 'high-contrast-text' : ''}`}>
              No servers yet
            </p>
          </div>
        )}

        {/* Add Server Button - at bottom of scrollable area */}
        <div className="mt-4" role="button" tabIndex={0}>
          <NavigationAction />
        </div>
      </ScrollArea>

      {/* Bottom section - Mode toggle and user panel */}
      <div 
        className="pb-3 mt-auto w-full"
        role="toolbar"
        aria-label="User settings and preferences"
        id={toolbarId}
      >
        <div className="flex justify-center mb-4">
          <ModeToggle />
        </div>

        {/* User Panel */}
        <UserPanel />
      </div>
    </div>
  );
}
