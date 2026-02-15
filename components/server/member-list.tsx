"use client";

/**
 * Server Member List Component
 *
 * Displays and manages members in a server/space context with role assignment capabilities.
 * Integrates with Matrix power levels and custom role system.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useMatrixClient } from "@/hooks/use-matrix-client";
import { useModal } from "@/hooks/use-modal-store";
import { Member, MemberRole, Profile } from "@/lib/haos-types";
import { MatrixRole } from "@/components/server/role-manager";
import rolesService from "@/lib/matrix/roles";
import { createModerationService } from "@/lib/matrix/moderation";
import { UserAvatar } from "@/components/user-avatar";
import { ActionTooltip } from "@/components/action-tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Search,
  MoreVertical,
  Shield,
  Crown,
  Hammer,
  Users,
  UserX,
  Ban,
  Settings,
  UserPlus,
  Filter,
  ChevronDown,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface MemberListProps {
  /** Server/Space ID */
  serverId: string;
  /** Current user's power level */
  userPowerLevel: number;
  /** Space name for display */
  spaceName: string;
}

interface MemberWithRoles extends Member {
  profile: Profile;
  powerLevel: number;
  roles: MatrixRole[];
  canManage: boolean;
}

type SortOption = "name" | "role" | "joined";
type FilterOption = "all" | "admin" | "moderator" | "member";

// =============================================================================
// Utility Functions  
// =============================================================================

/**
 * Get role icon based on power level
 */
function getRoleIcon(powerLevel: number) {
  if (powerLevel >= 100) return Crown;
  if (powerLevel >= 50) return Hammer;  
  if (powerLevel >= 25) return Shield;
  return Users;
}

/**
 * Get highest role color for user
 */
function getHighestRoleColor(roles: MatrixRole[]): string {
  if (roles.length === 0) return "#99aab5";
  
  return roles.reduce((highest, role) => 
    role.powerLevel > highest.powerLevel ? role : highest
  ).color;
}

/**
 * Sort members by different criteria
 */
function sortMembers(members: MemberWithRoles[], sortBy: SortOption): MemberWithRoles[] {
  return [...members].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.profile.name.localeCompare(b.profile.name);
      case "role":
        return b.powerLevel - a.powerLevel;
      case "joined":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:
        return 0;
    }
  });
}

/**
 * Filter members by role
 */
function filterMembers(members: MemberWithRoles[], filter: FilterOption): MemberWithRoles[] {
  switch (filter) {
    case "admin":
      return members.filter(m => m.powerLevel >= 100);
    case "moderator":
      return members.filter(m => m.powerLevel >= 50 && m.powerLevel < 100);
    case "member":
      return members.filter(m => m.powerLevel < 50);
    case "all":
    default:
      return members;
  }
}

// =============================================================================
// Components
// =============================================================================

/**
 * Individual member item with role badges and management options
 */
interface MemberItemProps {
  member: MemberWithRoles;
  onRoleEdit: (member: MemberWithRoles) => void;
  onMemberKick: (member: MemberWithRoles) => void;
  onMemberBan: (member: MemberWithRoles) => void;
}

function MemberItem({ member, onRoleEdit, onMemberKick, onMemberBan }: MemberItemProps) {
  const { client } = useMatrixClient();
  const currentUserId = client?.getUserId();
  const Icon = getRoleIcon(member.powerLevel);
  const highestRoleColor = getHighestRoleColor(member.roles);
  const isCurrentUser = currentUserId === member.id;

  // Get role display text
  const getRoleText = () => {
    if (member.powerLevel >= 100) return "Administrator";
    if (member.powerLevel >= 50) return "Moderator";
    return "Member";
  };

  return (
    <div className="group flex items-center gap-3 p-3 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors">
      {/* Avatar */}
      <UserAvatar
        src={member.profile.imageUrl}
        className="h-10 w-10"
      />

      {/* Member Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 
            className="font-semibold text-sm text-white truncate"
            style={{ color: member.roles.length > 0 ? highestRoleColor : undefined }}
          >
            {member.profile.name}
          </h3>
          
          {/* Power Level Icon */}
          <ActionTooltip label={`Power Level: ${member.powerLevel}`}>
            <Icon 
              className="h-4 w-4"
              style={{ color: highestRoleColor }}
            />
          </ActionTooltip>
          
          {isCurrentUser && (
            <Badge variant="secondary" className="text-xs">
              You
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-zinc-400">
            {getRoleText()}
          </span>
          
          {/* Role Badges */}
          {member.roles.length > 0 && (
            <div className="flex items-center gap-1">
              {member.roles.slice(0, 3).map((role) => (
                <Badge 
                  key={role.id}
                  variant="outline" 
                  className="text-xs px-1 py-0"
                  style={{ 
                    borderColor: role.color + "40",
                    color: role.color,
                    backgroundColor: role.color + "10"
                  }}
                >
                  {role.name}
                </Badge>
              ))}
              {member.roles.length > 3 && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  +{member.roles.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Member Actions */}
      {member.canManage && !isCurrentUser && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onRoleEdit(member)}>
                <Settings className="h-4 w-4 mr-2" />
                Manage Roles
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={() => onMemberKick(member)}
                className="text-yellow-400 focus:text-yellow-300"
              >
                <UserX className="h-4 w-4 mr-2" />
                Kick Member
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={() => onMemberBan(member)}
                className="text-red-400 focus:text-red-300"
              >
                <Ban className="h-4 w-4 mr-2" />
                Ban Member
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Role Edit Button for manageable members */}
      {member.canManage && (
        <Button
          variant="outline" 
          size="sm"
          onClick={() => onRoleEdit(member)}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Settings className="h-4 w-4 mr-1" />
          Roles
        </Button>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function MemberList({ serverId, userPowerLevel, spaceName }: MemberListProps) {
  const { client } = useMatrixClient();
  const { onOpen } = useModal();
  const [members, setMembers] = useState<MemberWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("role");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  
  // Load members with roles and power levels
  const loadMembers = useCallback(async () => {
    if (!client || !serverId) return;
    
    setLoading(true);
    try {
      const room = client.getRoom(serverId);
      if (!room) {
        console.error("Room not found:", serverId);
        return;
      }

      const roomMembers = room.getMembers();
      const customRoles = await rolesService.getCustomRoles(serverId);
      const moderationService = createModerationService(client);
      const currentUserId = client.getUserId();
      
      const membersWithRoles: MemberWithRoles[] = await Promise.all(
        roomMembers.map(async (roomMember) => {
          const userId = roomMember.userId;
          const powerLevel = room.getMember(userId)?.powerLevel || 0;
          
          // Find roles for this user
          const userRoles = customRoles.filter(role => role.powerLevel === powerLevel);
          
          // Check if current user can manage this member
          const canManage = currentUserId !== userId && 
                           userPowerLevel > powerLevel &&
                           await moderationService.hasPermission(serverId, currentUserId!, 'KICK', userId);
          
          return {
            id: userId,
            role: powerLevel >= 100 ? MemberRole.ADMIN : 
                  powerLevel >= 50 ? MemberRole.MODERATOR : MemberRole.GUEST,
            profileId: userId,
            serverId,
            createdAt: new Date(),
            updatedAt: new Date(),
            profile: {
              id: userId,
              userId,
              name: roomMember.name || userId.split(':')[0].slice(1),
              imageUrl: roomMember.getAvatarUrl(client.baseUrl, 256, 256, "crop", false, true) || "",
              email: "",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            powerLevel,
            roles: userRoles,
            canManage,
          };
        })
      );
      
      setMembers(membersWithRoles);
    } catch (error) {
      console.error("Failed to load members:", error);
    } finally {
      setLoading(false);
    }
  }, [client, serverId, userPowerLevel]);

  // Load members on mount
  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Filter and sort members
  const filteredMembers = React.useMemo(() => {
    let filtered = filterMembers(members, filterBy);
    
    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(member =>
        member.profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.roles.some(role => role.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    return sortMembers(filtered, sortBy);
  }, [members, filterBy, searchQuery, sortBy]);

  // Event handlers
  const handleRoleEdit = (member: MemberWithRoles) => {
    onOpen("memberRoleEditor", {
      member,
      serverId,
      userPowerLevel,
      onSuccess: loadMembers,
    });
  };

  const handleMemberKick = (member: MemberWithRoles) => {
    onOpen("kickUser", {
      targetUser: {
        id: member.id,
        name: member.profile.name,
        avatarUrl: member.profile.imageUrl,
      },
      serverId,
    });
  };

  const handleMemberBan = (member: MemberWithRoles) => {
    onOpen("banUser", {
      targetUser: {
        id: member.id,
        name: member.profile.name,
        avatarUrl: member.profile.imageUrl,
      },
      serverId,
    });
  };

  const canManageRoles = userPowerLevel >= 50; // Moderator+

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Members</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Manage members and assign roles in {spaceName}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {members.length} members
          </Badge>
          {canManageRoles && (
            <Button 
              onClick={() => onOpen("invite", { serverId })}
              className="bg-indigo-500 hover:bg-indigo-600"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Invite People
            </Button>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 bg-zinc-800/30 p-4 rounded-lg">
        {/* Search */}
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-zinc-700/50 border-zinc-600"
            />
          </div>
        </div>

        {/* Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="border-zinc-600">
              <Filter className="h-4 w-4 mr-2" />
              Filter: {filterBy}
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setFilterBy("all")}>
              All Members
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterBy("admin")}>
              Administrators
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterBy("moderator")}>
              Moderators
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterBy("member")}>
              Members
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="border-zinc-600">
              Sort: {sortBy}
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setSortBy("role")}>
              By Role
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("name")}>
              By Name
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("joined")}>
              By Join Date
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Member List */}
      <ScrollArea className="h-[600px]">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-zinc-400">Loading members...</div>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center p-8">
            <Users className="h-12 w-12 text-zinc-500 mx-auto mb-4" />
            <p className="text-zinc-400 mb-2">
              {searchQuery ? "No members found" : "No members in this server"}
            </p>
            {searchQuery && (
              <p className="text-xs text-zinc-500">
                Try adjusting your search or filter criteria
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMembers.map((member) => (
              <MemberItem
                key={member.id}
                member={member}
                onRoleEdit={handleRoleEdit}
                onMemberKick={handleMemberKick}
                onMemberBan={handleMemberBan}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}