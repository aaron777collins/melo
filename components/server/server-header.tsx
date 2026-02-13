"use client";

import React from "react";
import {
  ChevronDown,
  LogOutIcon,
  PlusCircle,
  Rocket,
  Settings,
  Trash,
  UserPlus,
  Users,
  Shield,
  Bell,
  FolderPlus,
  Pencil,
  Link,
  Hash
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useModal } from "@/hooks/use-modal-store";

// =============================================================================
// Types
// =============================================================================

/**
 * Matrix power level thresholds for role determination
 */
const POWER_LEVELS = {
  ADMIN: 100,
  MODERATOR: 50,
  MEMBER: 0
} as const;

/**
 * Role types for the server header
 * Maps to Matrix power levels but uses familiar Discord terminology
 */
export type ServerRole = "admin" | "moderator" | "member" | "guest";

/**
 * Server/Space data for the header
 * Works with both Matrix spaces and legacy Prisma data
 */
export interface ServerHeaderData {
  /** Server/Space ID */
  id: string;
  /** Server/Space name */
  name: string;
  /** Invite code (for invite modal) */
  inviteCode?: string;
  /** Avatar URL (for future use) */
  imageUrl?: string | null;
  /** Server boost level (0-3, Discord-style) */
  boostLevel?: number;
  /** Number of boosts */
  boostCount?: number;
  /** Whether this is a verified server */
  isVerified?: boolean;
  /** Whether this is a partnered server */
  isPartnered?: boolean;
  /** Canonical alias for Matrix spaces */
  canonicalAlias?: string | null;
}

interface ServerHeaderProps {
  /** Server data */
  server: ServerHeaderData;
  /** User's role in the server (derived from power levels) */
  role?: ServerRole;
  /** User's power level (for Matrix spaces) */
  powerLevel?: number;
  /** Whether to show the boost indicator */
  showBoostIndicator?: boolean;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Derive role from Matrix power level
 */
export function getRoleFromPowerLevel(powerLevel: number): ServerRole {
  if (powerLevel >= POWER_LEVELS.ADMIN) return "admin";
  if (powerLevel >= POWER_LEVELS.MODERATOR) return "moderator";
  if (powerLevel >= POWER_LEVELS.MEMBER) return "member";
  return "guest";
}

/**
 * Check if user has admin permissions
 */
function isAdmin(role: ServerRole | undefined, powerLevel?: number): boolean {
  if (powerLevel !== undefined) {
    return powerLevel >= POWER_LEVELS.ADMIN;
  }
  return role === "admin";
}

/**
 * Check if user has moderator or higher permissions
 */
function isModerator(role: ServerRole | undefined, powerLevel?: number): boolean {
  if (powerLevel !== undefined) {
    return powerLevel >= POWER_LEVELS.MODERATOR;
  }
  return role === "admin" || role === "moderator";
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Server boost indicator badge
 */
function BoostIndicator({ 
  level, 
  count 
}: { 
  level: number; 
  count?: number;
}) {
  if (level === 0) return null;

  return (
    <div className="flex items-center gap-1 ml-1">
      <Rocket 
        className="h-4 w-4 text-[#ff73fa] fill-current"
      />
      {level > 1 && (
        <span className="text-xs font-medium text-[#ff73fa]">
          {level}
        </span>
      )}
    </div>
  );
}

/**
 * Server verification badge
 */
function VerificationBadge({ 
  isVerified, 
  isPartnered 
}: { 
  isVerified?: boolean; 
  isPartnered?: boolean;
}) {
  if (!isVerified && !isPartnered) return null;

  return (
    <Shield 
      className={`h-4 w-4 ml-1 ${
        isPartnered ? "text-[#5865f2] fill-[#5865f2]" : "text-zinc-400"
      }`}
    />
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Server Header Component
 * 
 * Displays the server name with a dropdown menu containing server actions.
 * Actions are permission-based using either explicit roles or Matrix power levels.
 * 
 * Features:
 * - Server name with dropdown arrow
 * - Role-based action menu (invite, settings, members, channels, delete/leave)
 * - Optional boost level indicator
 * - Optional verification/partner badge
 * - Discord-style styling with hover effects
 * 
 * @example
 * ```tsx
 * // With explicit role
 * <ServerHeader server={serverData} role="admin" />
 * 
 * // With Matrix power level (role auto-derived)
 * <ServerHeader server={serverData} powerLevel={100} />
 * ```
 */
export function ServerHeader({ 
  server, 
  role, 
  powerLevel,
  showBoostIndicator = true
}: ServerHeaderProps) {
  const { onOpen } = useModal();

  // Derive role from power level if not explicitly provided
  const effectiveRole = role || (powerLevel !== undefined ? getRoleFromPowerLevel(powerLevel) : "member");
  
  const hasAdminPerms = isAdmin(effectiveRole, powerLevel);
  const hasModeratorPerms = isModerator(effectiveRole, powerLevel);

  const handleCopyLink = () => {
    const link = server.canonicalAlias || `https://matrix.to/#/${server.id}`;
    navigator.clipboard.writeText(link);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus:outline-none" asChild>
        <button 
          className="w-full text-md font-semibold px-3 flex items-center h-12 border-neutral-200 dark:border-neutral-800 border-b-2 hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 transition"
          aria-label={`${server.name} server options`}
        >
          <span className="truncate">{server.name}</span>
          
          {/* Verification/Partner badge */}
          <VerificationBadge 
            isVerified={server.isVerified} 
            isPartnered={server.isPartnered} 
          />
          
          {/* Boost indicator */}
          {showBoostIndicator && server.boostLevel !== undefined && server.boostLevel > 0 && (
            <BoostIndicator 
              level={server.boostLevel} 
              count={server.boostCount} 
            />
          )}
          
          <ChevronDown className="h-5 w-5 ml-auto flex-shrink-0" />
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        className="w-56 text-xs font-medium text-black dark:text-neutral-400 space-y-[2px]"
      >
        {/* Boost Server - Always visible (Discord-style) */}
        <DropdownMenuItem
          onClick={() => onOpen("serverBoost", { server } as any)}
          className="text-[#ff73fa] px-3 py-2 text-sm cursor-pointer"
        >
          Server Boost
          <Rocket className="h-4 w-4 ml-auto" />
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Invite People - Moderator+ */}
        {hasModeratorPerms && (
          <DropdownMenuItem
            onClick={() => onOpen("invite", { server } as any)}
            className="text-indigo-600 dark:text-indigo-400 px-3 py-2 text-sm cursor-pointer"
          >
            Invite People
            <UserPlus className="h-4 w-4 ml-auto" />
          </DropdownMenuItem>
        )}

        {/* Server Settings - Admin only */}
        {hasAdminPerms && (
          <DropdownMenuItem
            onClick={() => onOpen("editServer", { server } as any)}
            className="px-3 py-2 text-sm cursor-pointer"
          >
            Server Settings
            <Settings className="h-4 w-4 ml-auto" />
          </DropdownMenuItem>
        )}

        {/* Manage Members - Admin only */}
        {hasAdminPerms && (
          <DropdownMenuItem
            onClick={() => onOpen("members", { server } as any)}
            className="px-3 py-2 text-sm cursor-pointer"
          >
            Manage Members
            <Users className="h-4 w-4 ml-auto" />
          </DropdownMenuItem>
        )}

        {/* Create Channel - Moderator+ */}
        {hasModeratorPerms && (
          <DropdownMenuItem
            onClick={() => onOpen("createChannel")}
            className="px-3 py-2 text-sm cursor-pointer"
          >
            Create Channel
            <PlusCircle className="h-4 w-4 ml-auto" />
          </DropdownMenuItem>
        )}

        {/* Create Category - Admin only */}
        {hasAdminPerms && (
          <DropdownMenuItem
            onClick={() => onOpen("createCategory" as any)}
            className="px-3 py-2 text-sm cursor-pointer"
          >
            Create Category
            <FolderPlus className="h-4 w-4 ml-auto" />
          </DropdownMenuItem>
        )}

        {/* Copy Server Link */}
        <DropdownMenuItem
          onClick={handleCopyLink}
          className="px-3 py-2 text-sm cursor-pointer"
        >
          Copy Server Link
          <Link className="h-4 w-4 ml-auto" />
        </DropdownMenuItem>

        {hasModeratorPerms && <DropdownMenuSeparator />}

        {/* Server Settings - Admin only */}
        {hasAdminPerms && (
          <DropdownMenuItem
            onClick={() => onOpen("serverSettings", { 
              space: {
                id: server.id,
                name: server.name,
                avatarUrl: server.imageUrl || null,
                topic: null,
                memberCount: 0,
                isOwner: false,
                childRoomIds: [],
                joinRule: 'invite' as const,
                canonicalAlias: server.canonicalAlias || null,
                currentUserPowerLevel: 0,
                hasUnread: false,
                unreadMentionCount: 0
              }
            })}
            className="px-3 py-2 text-sm cursor-pointer"
          >
            Server Settings
            <Settings className="h-4 w-4 ml-auto" />
          </DropdownMenuItem>
        )}

        {/* Notification Settings - All users */}
        <DropdownMenuItem
          onClick={() => onOpen("notificationSettings" as any, { server: server as any })}
          className="px-3 py-2 text-sm cursor-pointer"
        >
          Notification Settings
          <Bell className="h-4 w-4 ml-auto" />
        </DropdownMenuItem>

        {/* Edit Server Profile - All users */}
        <DropdownMenuItem
          onClick={() => onOpen("editServerProfile" as any, { 
            server: {
              ...server,
              imageUrl: server.imageUrl || '',
              inviteCode: server.inviteCode || '',
              profileId: '',
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })}
          className="px-3 py-2 text-sm cursor-pointer"
        >
          Edit Server Profile
          <Pencil className="h-4 w-4 ml-auto" />
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Delete Server - Admin only */}
        {hasAdminPerms && (
          <DropdownMenuItem
            onClick={() => onOpen("deleteServer", { server } as any)}
            className="px-3 py-2 text-sm cursor-pointer text-rose-500"
          >
            Delete Server
            <Trash className="h-4 w-4 ml-auto" />
          </DropdownMenuItem>
        )}

        {/* Leave Server - Non-admins only */}
        {!hasAdminPerms && (
          <DropdownMenuItem
            onClick={() => onOpen("leaveServer", { server } as any)}
            className="px-3 py-2 text-sm cursor-pointer text-rose-500"
          >
            Leave Server
            <LogOutIcon className="h-4 w-4 ml-auto" />
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// =============================================================================
// Legacy Compatibility
// =============================================================================

/**
 * Adapter for legacy Prisma-based server data
 * Converts old format to new ServerHeaderData format
 */
export function fromPrismaServer(server: any, role?: string): { 
  server: ServerHeaderData; 
  role: ServerRole;
} {
  return {
    server: {
      id: server.id,
      name: server.name,
      inviteCode: server.inviteCode,
      imageUrl: server.imageUrl,
      boostLevel: 0,
      boostCount: 0
    },
    role: role === "ADMIN" ? "admin" 
        : role === "MODERATOR" ? "moderator" 
        : "member"
  };
}
