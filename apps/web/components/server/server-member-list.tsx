"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Users, 
  ChevronDown, 
  ChevronRight,
  Crown
} from "lucide-react";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserAvatar } from "@/components/user-avatar";
import { ActionTooltip } from "@/components/action-tooltip";
import { usePresence } from "@/hooks/use-presence";
import { useMxcUrl } from "@/hooks/use-mxc-url";
import { useModal } from "@/hooks/use-modal-store";
import { 
  getMembers, 
  type Member, 
  type MemberRole 
} from "@/services/matrix-member";
import { useMatrix } from "@/components/providers/matrix-provider";

// =============================================================================
// Types & Constants
// =============================================================================

interface ServerMemberListProps {
  roomId: string;
  className?: string;
}

/**
 * Role hierarchy (highest to lowest power level)
 */
const ROLE_HIERARCHY: MemberRole[] = [
  'owner',
  'admin', 
  'moderator',
  'member',
  'restricted'
];

/**
 * Role display configuration
 */
const ROLE_CONFIG = {
  owner: {
    label: 'Owner',
    icon: <Crown className="h-3 w-3 text-yellow-500" />,
    color: 'text-yellow-500'
  },
  admin: {
    label: 'Administrators', 
    icon: <ShieldAlert className="h-3 w-3 text-rose-500" />,
    color: 'text-rose-500'
  },
  moderator: {
    label: 'Moderators',
    icon: <ShieldCheck className="h-3 w-3 text-indigo-500" />,
    color: 'text-indigo-500'
  },
  member: {
    label: 'Members',
    icon: <Shield className="h-3 w-3 text-zinc-500" />,
    color: 'text-zinc-500'
  },
  restricted: {
    label: 'Restricted',
    icon: <Shield className="h-3 w-3 text-red-500" />,
    color: 'text-red-500'
  }
} as const;

/**
 * Presence indicator colors
 */
const PRESENCE_COLORS = {
  online: 'bg-green-500',
  unavailable: 'bg-yellow-500',
  offline: 'bg-zinc-500'
} as const;

// =============================================================================
// Member Item Component  
// =============================================================================

interface MemberItemProps {
  member: Member;
  onClick: () => void;
}

function MemberItem({ member, onClick }: MemberItemProps) {
  const { presence } = usePresence(member.userId);
  const avatarUrl = useMxcUrl(member.avatarUrl || '', 64, 64);
  const roleConfig = ROLE_CONFIG[member.role];

  const displayName = member.displayName || member.userId.split(':')[0].slice(1);
  const isTyping = member.isTyping;

  return (
    <ActionTooltip 
      label={`${displayName} (${roleConfig.label})`}
      side="left"
    >
      <button
        onClick={onClick}
        className={cn(
          "group w-full flex items-center gap-x-2 px-2 py-1.5 rounded-md",
          "hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 transition-colors",
          "text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300"
        )}
      >
        {/* Avatar with presence indicator */}
        <div className="relative">
          <UserAvatar 
            src={avatarUrl || undefined}
            className="h-6 w-6"
          />
          {/* Presence dot */}
          <div
            className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white dark:border-[#2b2d31] rounded-full",
              PRESENCE_COLORS[presence]
            )}
          />
        </div>

        {/* Member info */}
        <div className="flex-1 flex flex-col items-start min-w-0">
          <div className="flex items-center gap-x-1 w-full">
            <span 
              className={cn(
                "text-sm font-medium truncate",
                isTyping && "text-green-500"
              )}
            >
              {displayName}
            </span>
            {/* Role icon */}
            {roleConfig.icon}
          </div>
          
          {/* Typing indicator */}
          {isTyping && (
            <span className="text-xs text-green-500 italic">
              typing...
            </span>
          )}
        </div>
      </button>
    </ActionTooltip>
  );
}

// =============================================================================
// Role Section Component
// =============================================================================

interface RoleSectionProps {
  role: MemberRole;
  members: Member[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onMemberClick: (member: Member) => void;
}

function RoleSection({ 
  role, 
  members, 
  isCollapsed, 
  onToggleCollapse,
  onMemberClick 
}: RoleSectionProps) {
  const roleConfig = ROLE_CONFIG[role];
  
  // Split into online/offline
  const onlineMembers = members.filter(m => m.isOnline);
  const offlineMembers = members.filter(m => !m.isOnline);

  if (members.length === 0) return null;

  return (
    <div className="mb-3">
      {/* Role Header */}
      <button
        onClick={onToggleCollapse}
        className="group w-full flex items-center justify-between px-2 py-1 hover:bg-zinc-700/10 dark:hover:bg-zinc-700/20 rounded transition-colors"
      >
        <div className="flex items-center gap-x-2">
          {/* Collapse chevron */}
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3 text-zinc-500" />
          ) : (
            <ChevronDown className="h-3 w-3 text-zinc-500" />
          )}
          
          {/* Role label and icon */}
          <span className="text-xs uppercase font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-x-1">
            {roleConfig.label}
            {roleConfig.icon}
          </span>
        </div>
        
        {/* Member count */}
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {members.length}
        </span>
      </button>

      {/* Members List */}
      {!isCollapsed && (
        <div className="mt-1 space-y-0.5">
          {/* Online Members */}
          {onlineMembers.length > 0 && (
            <>
              <div className="px-2 py-1">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  Online — {onlineMembers.length}
                </span>
              </div>
              <div className="space-y-0.5">
                {onlineMembers.map((member) => (
                  <MemberItem
                    key={member.userId}
                    member={member}
                    onClick={() => onMemberClick(member)}
                  />
                ))}
              </div>
            </>
          )}

          {/* Offline Members */}
          {offlineMembers.length > 0 && (
            <>
              {onlineMembers.length > 0 && <div className="h-2" />}
              <div className="px-2 py-1">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  Offline — {offlineMembers.length}
                </span>
              </div>
              <div className="space-y-0.5 opacity-60">
                {offlineMembers.map((member) => (
                  <MemberItem
                    key={member.userId}
                    member={member}
                    onClick={() => onMemberClick(member)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ServerMemberList({ roomId, className }: ServerMemberListProps) {
  const { isReady } = useMatrix();
  const { onOpen } = useModal();
  
  // State
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsedRoles, setCollapsedRoles] = useState<Set<MemberRole>>(new Set());

  // Fetch members
  useEffect(() => {
    if (!isReady || !roomId) {
      return;
    }

    const fetchMembers = async () => {
      try {
        setLoading(true);
        setError(null);
        const membersList = await getMembers(roomId);
        setMembers(membersList);
      } catch (err) {
        console.error('Failed to load members:', err);
        setError(err instanceof Error ? err.message : 'Failed to load members');
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [roomId, isReady]);

  // Group members by role
  const membersByRole = useMemo(() => {
    const grouped: Record<MemberRole, Member[]> = {
      owner: [],
      admin: [], 
      moderator: [],
      member: [],
      restricted: []
    };

    members.forEach(member => {
      grouped[member.role].push(member);
    });

    return grouped;
  }, [members]);

  // Handle role section toggle
  const toggleRoleCollapse = (role: MemberRole) => {
    const newCollapsed = new Set(collapsedRoles);
    if (newCollapsed.has(role)) {
      newCollapsed.delete(role);
    } else {
      newCollapsed.add(role);
    }
    setCollapsedRoles(newCollapsed);
  };

  // Handle member profile click
  const handleMemberClick = (member: Member) => {
    // TODO: Add member profile modal type to modal store
    // For now, open members modal with member data
    onOpen("members", { 
      // This will need to be updated when we add user profile modal
      server: { id: roomId } as any 
    });
  };

  // Calculate total counts
  const totalMembers = members.length;
  const onlineMembers = members.filter(m => m.isOnline).length;

  if (loading) {
    return (
      <div className={cn("w-60 bg-[#f2f3f5] dark:bg-[#2b2d31] flex flex-col", className)}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            Loading members...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("w-60 bg-[#f2f3f5] dark:bg-[#2b2d31] flex flex-col", className)}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-red-500">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-60 bg-[#f2f3f5] dark:bg-[#2b2d31] flex flex-col", className)}>
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-x-2">
          <Users className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Members
          </span>
        </div>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {onlineMembers}/{totalMembers}
        </span>
      </div>

      {/* Members List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {ROLE_HIERARCHY.map((role) => (
            <RoleSection
              key={role}
              role={role}
              members={membersByRole[role]}
              isCollapsed={collapsedRoles.has(role)}
              onToggleCollapse={() => toggleRoleCollapse(role)}
              onMemberClick={handleMemberClick}
            />
          ))}

          {totalMembers === 0 && (
            <div className="text-center py-8">
              <Users className="h-8 w-8 text-zinc-400 mx-auto mb-2" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No members found
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}