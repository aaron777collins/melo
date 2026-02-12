"use client";

import React from "react";

import { NavigationAction } from "@/components/navigation/navigation-action";
import { NavigationDM } from "@/components/navigation/navigation-dm";
import { NavigationItem } from "@/components/navigation/navigation-item";
import { UserPanel } from "@/components/navigation/user-panel";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ModeToggle } from "@/components/mode-toggle";
import { useSpaces, useUnreadDMCount } from "@/hooks/use-spaces";
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

  return (
    <div
      className={cn(
        "space-y-4 flex flex-col h-full items-center",
        "text-primary w-full py-3",
        "dark:bg-[#1e1f22] bg-[#e3e5e8]"
      )}
    >
      {/* DM Shortcut Button */}
      <NavigationDM unreadCount={unreadDMCount} />

      {/* Separator */}
      <Separator className="h-[2px] bg-zinc-300 dark:bg-zinc-700 rounded-md w-10 mx-auto" />

      {/* Scrollable Server List */}
      <ScrollArea className="flex-1 w-full">
        {isLoading ? (
          // Loading skeleton
          <div className="flex flex-col items-center gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="mx-3 h-[48px] w-[48px] rounded-[24px] bg-zinc-700/50 animate-pulse"
              />
            ))}
          </div>
        ) : spaces.length > 0 ? (
          // Server list
          <div className="flex flex-col items-center gap-2">
            {spaces.map((space) => (
              <NavigationItem
                key={space.id}
                id={space.id}
                imageUrl={space.avatarUrl}
                name={space.name}
                hasUnread={space.hasUnread}
                mentionCount={space.mentionCount}
              />
            ))}
          </div>
        ) : (
          // Empty state - no servers yet
          <div className="flex flex-col items-center px-2 py-4">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
              No servers yet
            </p>
          </div>
        )}

        {/* Add Server Button - at bottom of scrollable area */}
        <div className="mt-4">
          <NavigationAction />
        </div>
      </ScrollArea>

      {/* Bottom section - Mode toggle and user panel */}
      <div className="pb-3 mt-auto w-full">
        <div className="flex justify-center mb-4">
          <ModeToggle />
        </div>

        {/* User Panel */}
        <UserPanel />
      </div>
    </div>
  );
}
