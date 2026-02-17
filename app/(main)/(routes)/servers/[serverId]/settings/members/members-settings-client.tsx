"use client";

/**
 * Members Settings Client Component
 *
 * Comprehensive member management interface with bulk role assignment capabilities.
 * Features multi-select operations and integrates with Matrix role system.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useMatrixClient } from "@/hooks/use-matrix-client";
import { useModal } from "@/hooks/use-modal-store";
import { Member, MemberRole, Profile } from "@/lib/melo-types";
import { MatrixRole } from "@/components/server/role-manager";
import rolesService from "@/lib/matrix/roles";
import { createModerationService } from "@/lib/matrix/moderation";
import { UserAvatar } from "@/components/user-avatar";
import { ActionTooltip } from "@/components/action-tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  CheckSquare,
  Square,
  AlertTriangle,
  Info,
  Trash2,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface MembersSettingsClientProps {
  serverId: string;
  currentUserId: string;
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
 * Individual member item with selection capability
 */
interface MemberItemProps {
  member: MemberWithRoles;
  isSelected: boolean;
  onToggleSelect: (memberId: string) => void;
  onRoleEdit: (member: MemberWithRoles) => void;
  onMemberKick: (member: MemberWithRoles) => void;
  onMemberBan: (member: MemberWithRoles) => void;
  currentUserId: string;
}

function MemberItem({ 
  member, 
  isSelected, 
  onToggleSelect, 
  onRoleEdit, 
  onMemberKick, 
  onMemberBan, 
  currentUserId 
}: MemberItemProps) {
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
    <div 
      className={cn(
        "group flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer",
        isSelected 
          ? "bg-indigo-500/20 border border-indigo-500/30" 
          : "bg-zinc-800/30 hover:bg-zinc-800/50",
        !member.canManage && "opacity-75"
      )}
      onClick={() => member.canManage && onToggleSelect(member.id)}
    >
      {/* Selection Checkbox */}
      {member.canManage && (
        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(member.id)}
            className="data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
          />
        </div>
      )}

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

      {/* Individual Actions */}
      {member.canManage && !isCurrentUser && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
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
    </div>
  );
}

/**
 * Bulk actions toolbar
 */
interface BulkActionsProps {
  selectedMembers: MemberWithRoles[];
  availableRoles: MatrixRole[];
  onBulkRoleAssign: (roleId: string) => void;
  onBulkKick: () => void;
  onBulkBan: () => void;
  onClearSelection: () => void;
  isLoading: boolean;
}

function BulkActions({ 
  selectedMembers, 
  availableRoles, 
  onBulkRoleAssign, 
  onBulkKick,
  onBulkBan,
  onClearSelection,
  isLoading 
}: BulkActionsProps) {
  if (selectedMembers.length === 0) return null;

  return (
    <Card className="bg-indigo-500/10 border-indigo-500/30">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-400">
                {selectedMembers.length} selected
              </Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClearSelection}
                className="text-zinc-400 hover:text-white"
              >
                Clear selection
              </Button>
            </div>

            {/* Bulk Role Assignment */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-300">Assign role:</span>
              <Select onValueChange={onBulkRoleAssign} disabled={isLoading}>
                <SelectTrigger className="w-40 h-8 bg-zinc-700 border-zinc-600">
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => {
                    const Icon = getRoleIcon(role.powerLevel);
                    return (
                      <SelectItem key={role.id} value={role.id}>
                        <div className="flex items-center gap-2">
                          <Icon 
                            className="h-3 w-3" 
                            style={{ color: role.color }}
                          />
                          <span>{role.name}</span>
                          <Badge variant="outline" className="text-xs ml-auto">
                            {role.powerLevel}
                          </Badge>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bulk Moderation Actions */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={onBulkKick}
              disabled={isLoading}
              className="text-yellow-400 border-yellow-400/30 hover:bg-yellow-400/10"
            >
              <UserX className="h-4 w-4 mr-1" />
              Kick Selected
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onBulkBan}
              disabled={isLoading}
              className="text-red-400 border-red-400/30 hover:bg-red-400/10"
            >
              <Ban className="h-4 w-4 mr-1" />
              Ban Selected
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function MembersSettingsClient({ serverId, currentUserId }: MembersSettingsClientProps) {
  const { client } = useMatrixClient();
  const { onOpen } = useModal();
  
  // State
  const [members, setMembers] = useState<MemberWithRoles[]>([]);
  const [availableRoles, setAvailableRoles] = useState<MatrixRole[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("role");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [userPowerLevel, setUserPowerLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Load members and roles
  const loadData = useCallback(async () => {
    if (!client || !serverId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const room = client.getRoom(serverId);
      if (!room) {
        throw new Error("Room not found");
      }

      // Get current user's power level
      const currentUserPowerLevel = room.getMember(currentUserId)?.powerLevel || 0;
      setUserPowerLevel(currentUserPowerLevel);

      // Load members
      const roomMembers = room.getMembers();
      const customRoles = await rolesService.getCustomRoles(serverId);
      const moderationService = createModerationService(client);
      
      // Add default roles
      const defaultRoles: MatrixRole[] = [
        {
          id: "admin",
          name: "Administrator",
          color: "#f04747",
          powerLevel: 100,
          memberCount: 0,
          isHoist: true,
          isMentionable: true,
          position: 3,
          isDefault: true,
          permissions: rolesService.ROLE_PERMISSION_TEMPLATES[100],
        },
        {
          id: "moderator",
          name: "Moderator", 
          color: "#7289da",
          powerLevel: 50,
          memberCount: 0,
          isHoist: true,
          isMentionable: true,
          position: 2,
          isDefault: true,
          permissions: rolesService.ROLE_PERMISSION_TEMPLATES[50],
        },
        {
          id: "member",
          name: "Member",
          color: "#99aab5",
          powerLevel: 0,
          memberCount: 0,
          isHoist: false,
          isMentionable: false,
          position: 1,
          isDefault: true,
          permissions: rolesService.ROLE_PERMISSION_TEMPLATES[0],
        },
      ];

      const allRoles = [...customRoles, ...defaultRoles]
        .sort((a, b) => b.powerLevel - a.powerLevel);
      
      setAvailableRoles(allRoles);
      
      const membersWithRoles: MemberWithRoles[] = await Promise.all(
        roomMembers.map(async (roomMember) => {
          const userId = roomMember.userId;
          const powerLevel = room.getMember(userId)?.powerLevel || 0;
          
          // Find roles for this user
          const userRoles = allRoles.filter(role => role.powerLevel === powerLevel);
          
          // Check if current user can manage this member
          const canManage = currentUserId !== userId && 
                           currentUserPowerLevel > powerLevel &&
                           await moderationService.hasPermission(serverId, currentUserId, 'KICK', userId);
          
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
    } catch (err) {
      console.error("Failed to load data:", err);
      setError("Failed to load member data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [client, serverId, currentUserId]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter and sort members
  const filteredMembers = React.useMemo(() => {
    let filtered = filterMembers(members, filterBy);
    
    if (searchQuery.trim()) {
      filtered = filtered.filter(member =>
        member.profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.roles.some(role => role.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    return sortMembers(filtered, sortBy);
  }, [members, filterBy, searchQuery, sortBy]);

  // Selected members
  const selectedMembers = filteredMembers.filter(m => selectedMemberIds.has(m.id));

  // Selection handlers
  const handleToggleSelect = useCallback((memberId: string) => {
    setSelectedMemberIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const selectableMembers = filteredMembers.filter(m => m.canManage);
    setSelectedMemberIds(new Set(selectableMembers.map(m => m.id)));
  }, [filteredMembers]);

  const handleClearSelection = useCallback(() => {
    setSelectedMemberIds(new Set());
  }, []);

  // Bulk operations
  const handleBulkRoleAssign = useCallback(async (roleId: string) => {
    if (selectedMembers.length === 0 || !client) return;

    const role = availableRoles.find(r => r.id === roleId);
    if (!role) return;

    setBulkLoading(true);
    setError(null);

    try {
      await Promise.all(
        selectedMembers.map(member => 
          rolesService.setUserPowerLevel(serverId, member.id, role.powerLevel)
        )
      );
      
      // Clear selection and reload data
      setSelectedMemberIds(new Set());
      await loadData();
      
    } catch (err) {
      console.error("Failed bulk role assignment:", err);
      setError("Failed to assign roles to selected members. Please try again.");
    } finally {
      setBulkLoading(false);
    }
  }, [selectedMembers, availableRoles, client, serverId, loadData]);

  const handleBulkKick = useCallback(() => {
    if (selectedMembers.length === 0) return;

    const targetUsers = selectedMembers.map(member => ({
      id: member.id,
      name: member.profile.name,
      avatarUrl: member.profile.imageUrl
    }));

    onOpen("bulkKickUsers", {
      targetUsers,
      serverId,
      onSuccess: () => {
        setSelectedMemberIds(new Set());
        loadData();
      }
    });
  }, [selectedMembers, serverId, onOpen, loadData]);

  const handleBulkBan = useCallback(() => {
    if (selectedMembers.length === 0) return;

    const targetUsers = selectedMembers.map(member => ({
      id: member.id,
      name: member.profile.name,
      avatarUrl: member.profile.imageUrl
    }));

    onOpen("bulkBanUsers", {
      targetUsers,
      serverId,
      onSuccess: () => {
        setSelectedMemberIds(new Set());
        loadData();
      }
    });
  }, [selectedMembers, serverId, onOpen, loadData]);

  // Duplicate handlers removed - using the ones defined above

  // Individual handlers
  const handleRoleEdit = (member: MemberWithRoles) => {
    onOpen("memberRoleEditor", {
      member,
      serverId,
      userPowerLevel,
      onSuccess: loadData,
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

  if (!canManageRoles) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You do not have permission to manage members in this server.
            Moderator level (50) or higher is required.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Members</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Manage server members and assign roles. Use bulk operations for efficient management.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Controls */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Member Management</CardTitle>
              <CardDescription>
                {members.length} members • {selectedMembers.length} selected
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={handleSelectAll}
                disabled={loading || filteredMembers.filter(m => m.canManage).length === 0}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Select All
              </Button>
              <Button 
                onClick={() => onOpen("invite", { serverId })}
                className="bg-indigo-500 hover:bg-indigo-600"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite People
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="flex items-center gap-4">
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

          {/* Bulk Actions */}
          <BulkActions 
            selectedMembers={selectedMembers}
            availableRoles={availableRoles}
            onBulkRoleAssign={handleBulkRoleAssign}
            onBulkKick={handleBulkKick}
            onBulkBan={handleBulkBan}
            onClearSelection={handleClearSelection}
            isLoading={bulkLoading}
          />
        </CardContent>
      </Card>

      {/* Member List */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px] p-4">
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
                    isSelected={selectedMemberIds.has(member.id)}
                    onToggleSelect={handleToggleSelect}
                    onRoleEdit={handleRoleEdit}
                    onMemberKick={handleMemberKick}
                    onMemberBan={handleMemberBan}
                    currentUserId={currentUserId}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}