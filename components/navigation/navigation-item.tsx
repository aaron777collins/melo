"use client";

import React from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { ActionTooltip } from "@/components/action-tooltip";
import { getSpaceInitials } from "@/lib/matrix/types/space";

interface NavigationItemProps {
  /** Space/Server ID */
  id: string;
  /** Avatar image URL (can be null for fallback) */
  imageUrl: string | null;
  /** Display name */
  name: string;
  /** Whether there are unread messages */
  hasUnread?: boolean;
  /** Number of unread mentions */
  mentionCount?: number;
}

/**
 * Server/Space icon in the navigation sidebar
 * Features:
 * - Round → square corners on hover
 * - Letter fallback when no image
 * - Active indicator pill on left
 * - Unread/mention badges
 */
export function NavigationItem({
  id,
  imageUrl,
  name,
  hasUnread = false,
  mentionCount = 0,
}: NavigationItemProps) {
  const params = useParams();
  const router = useRouter();

  const isActive = params?.serverId === id;

  const onClick = () => {
    router.push(`/servers/${id}`);
  };

  const initials = getSpaceInitials(name);

  return (
    <ActionTooltip side="right" align="center" label={name}>
      <button onClick={onClick} className="group relative flex items-center">
        {/* Active/hover indicator pill on left */}
        <div
          className={cn(
            "absolute left-0 bg-primary rounded-r-full transition-all w-[4px]",
            !isActive && !hasUnread && "group-hover:h-[20px]",
            hasUnread && !isActive && "h-[8px]",
            isActive && "h-[36px]"
          )}
        />

        {/* Server icon container */}
        <div
          className={cn(
            "relative group flex mx-3 h-[48px] w-[48px] rounded-[24px]",
            "group-hover:rounded-[16px] transition-all overflow-hidden",
            "items-center justify-center",
            isActive && "rounded-[16px]",
            // Background color for fallback
            !imageUrl && "bg-neutral-700 dark:bg-neutral-700",
            !imageUrl && "group-hover:bg-indigo-500",
            !imageUrl && isActive && "bg-indigo-500"
          )}
        >
          {imageUrl ? (
            <Image
              fill
              src={imageUrl}
              alt={name}
              className="object-cover"
            />
          ) : (
            <span
              className={cn(
                "text-lg font-semibold transition",
                "text-white",
                "group-hover:text-white",
                isActive && "text-white"
              )}
            >
              {initials}
            </span>
          )}
        </div>

        {/* Mention count badge */}
        {mentionCount > 0 && (
          <div className="absolute -bottom-1 right-0 flex items-center justify-center min-w-[20px] h-5 px-1 bg-red-500 text-white text-xs font-bold rounded-full border-4 border-[#1e1f22]">
            {mentionCount > 99 ? "99+" : mentionCount}
          </div>
        )}
      </button>
    </ActionTooltip>
  );
}
