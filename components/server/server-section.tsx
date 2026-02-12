"use client";

import React, { useState } from "react";
import { ChannelType, MemberRole } from "@prisma/client";
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
  children?: React.ReactNode;
  defaultCollapsed?: boolean;
}

export function ServerSection({
  channelType,
  label,
  sectionType,
  role,
  server,
  children,
  defaultCollapsed = false
}: ServerSectionProps) {
  const { onOpen } = useModal();
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

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
