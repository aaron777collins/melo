"use client";

import React, { useState, useEffect } from "react";
import { ChannelType, MemberRole } from "@/lib/melo-types";
import { ChevronRight, Plus, Settings } from "lucide-react";

import { ServerWithMembersWithProfiles } from "@/types";
import { ActionTooltip } from "@/components/action-tooltip";
import { useModal } from "@/hooks/use-modal-store";
import { cn } from "@/lib/utils";

interface ServerSectionProps {
  label: string;
  role?: MemberRole;
  sectionType: "channels" | "members";
  channelType?: ChannelType;
  server?: ServerWithMembersWithProfiles;
  serverId?: string;
  children?: React.ReactNode;
  defaultCollapsed?: boolean;
}

export function ServerSection({
  channelType,
  label,
  sectionType,
  role,
  server,
  serverId,
  children,
  defaultCollapsed = false
}: ServerSectionProps) {
  const { onOpen } = useModal();
  
  // Create unique storage key for persistent state
  const storageKey = React.useMemo(() => {
    const serverIdToUse = serverId || server?.id;
    if (!serverIdToUse) return null;
    
    const channelTypeSuffix = channelType ? `-${channelType}` : "";
    return `melo-collapse-${serverIdToUse}-${sectionType}${channelTypeSuffix}`;
  }, [serverId, server?.id, sectionType, channelType]);
  
  // Load initial collapse state from localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined" || !storageKey) return defaultCollapsed;
    
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : defaultCollapsed;
    } catch {
      return defaultCollapsed;
    }
  });
  
  // Save collapse state to localStorage when it changes
  useEffect(() => {
    if (typeof window === "undefined" || !storageKey) return;
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(isCollapsed));
    } catch (error) {
      // Silently fail if localStorage is unavailable
      console.warn("Failed to save section collapse state:", error);
    }
  }, [isCollapsed, storageKey]);

  return (
    <div className="mb-2">
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="mr-1 text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300 transition"
          >
            <ChevronRight 
              className={cn(
                "h-3 w-3 transition-transform",
                !isCollapsed && "rotate-90"
              )}
            />
          </button>
          <p className="text-xs uppercase font-semibold text-zinc-500 dark:text-zinc-400">
            {label}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {role !== MemberRole.GUEST && sectionType === "channels" && (
            <ActionTooltip label="Create Channel" side="top">
              <button
                onClick={() => onOpen("createChannel", { channelType })}
                className="text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300 transition"
              >
                <Plus className="h-4 w-4" />
              </button>
            </ActionTooltip>
          )}
          {role === MemberRole.ADMIN && sectionType === "members" && (
            <ActionTooltip label="Manage Members" side="top">
              <button
                onClick={() => onOpen("members", { server })}
                className="text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300 transition"
              >
                <Settings className="h-4 w-4" />
              </button>
            </ActionTooltip>
          )}
        </div>
      </div>
      {!isCollapsed && children && (
        <div className="space-y-[2px]">
          {children}
        </div>
      )}
    </div>
  );
}
