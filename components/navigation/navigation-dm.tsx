"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";

import { cn } from "@/lib/utils";
import { ActionTooltip } from "@/components/action-tooltip";

interface NavigationDMProps {
  /** Number of unread DMs */
  unreadCount?: number;
}

/**
 * DM shortcut button at top of navigation sidebar
 * Discord-style "Home" button that shows Direct Messages
 */
export function NavigationDM({ unreadCount = 0 }: NavigationDMProps) {
  const params = useParams();
  const router = useRouter();

  // DM section is active when we're in the /channels/@me route
  const isActive = params?.serverId === "@me";

  const onClick = () => {
    router.push("/channels/@me");
  };

  return (
    <ActionTooltip side="right" align="center" label="Direct Messages">
      <button onClick={onClick} className="group relative flex items-center">
        {/* Active indicator pill */}
        <div
          className={cn(
            "absolute left-0 bg-primary rounded-r-full transition-all w-[4px]",
            !isActive && "group-hover:h-[20px]",
            isActive ? "h-[36px]" : "h-[8px]"
          )}
        />

        {/* Icon container */}
        <div
          className={cn(
            "relative group flex mx-3 h-[48px] w-[48px] rounded-[24px]",
            "group-hover:rounded-[16px] transition-all overflow-hidden",
            "items-center justify-center",
            "bg-neutral-200 dark:bg-neutral-700",
            "group-hover:bg-indigo-500",
            isActive && "bg-indigo-500 rounded-[16px]"
          )}
        >
          <MessageSquare
            className={cn(
              "h-6 w-6 transition",
              "text-neutral-500 dark:text-neutral-300",
              "group-hover:text-white",
              isActive && "text-white"
            )}
          />
        </div>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <div className="absolute -bottom-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 bg-red-500 text-white text-xs font-bold rounded-full border-4 border-[#1e1f22]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </div>
        )}
      </button>
    </ActionTooltip>
  );
}
