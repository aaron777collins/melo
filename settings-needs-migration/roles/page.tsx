"use client";

/**
 * Server Settings - Roles Page
 *
 * Comprehensive role management with Matrix power levels integration.
 * Allows creating, editing, and managing roles with Discord-style hierarchy.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Shield,
  Plus,
  GripVertical,
  Trash2,
  ChevronRight,
  Crown,
  Users,
  Settings2,
  MessageSquare,
  AlertCircle,
  Check,
  Edit2,
  Copy,
  MoreHorizontal
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { useMatrixClient } from "@/hooks/use-matrix-client";
import {
  getMembers,
  getMembersByRole,
  setPowerLevel,
  POWER_LEVELS,
  type Member,
  type MemberRole
} from "@/apps/web/services/matrix-member";

// =============================================================================
// Types
// =============================================================================

interface RoleDefinition {
  id: string;
  name: string;
  powerLevel: number;
  color: string;
  description: string;
  memberCount: number;
  isDefault: boolean;
  permissions: RolePermissions;
}

interface RolePermissions {
  // General
  viewChannels: boolean;
  manageChannels: boolean;
  manageRoles: boolean;
  manageServer: boolean;
  // Membership
  createInvites: boolean;
  kickMembers: boolean;
  banMembers: boolean;
  // Messages
  sendMessages: boolean;
  manageMessages: boolean;
  mentionEveryone: boolean;
  // Voice
  connect: boolean;
  speak: boolean;
  muteMembers: boolean;
  deafenMembers: boolean;
  moveMembers: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_ROLES: RoleDefinition[] = [
  {
    id: "owner",
    name: "Owner",
    powerLevel: 100,
    color: "#e91e63",
    description: "Full control over the server",
    memberCount: 0,
    isDefault: true,
    permissions: {
      viewChannels: true,
      manageChannels: true,
      manageRoles: true,
      manageServer: true,
      createInvites: true,
      kickMembers: true,
      banMembers: true,
      sendMessages: true,
      manageMessages: true,
      mentionEveryone: true,
      connect: true,
      speak: true,
      muteMembers: true,
      deafenMembers: true,
      moveMembers: true,
    },
  },
  {
    id: "admin",
    name: "Admin",
    powerLevel: 75,
    color: "#ff9800",
    description: "Can manage most server settings",
    memberCount: 0,
    isDefault: true,
    permissions: {
      viewChannels: true,
      manageChannels: true,
      manageRoles: false,
      manageServer: true,
      createInvites: true,
      kickMembers: true,
      banMembers: true,
      sendMessages: true,
      manageMessages: true,
      mentionEveryone: true,
      connect: true,
      speak: true,
      muteMembers: true,
      deafenMembers: true,
      moveMembers: true,
    },
  },
  {
    id: "moderator",
    name: "Moderator",
    powerLevel: 50,
    color: "#4caf50",
    description: "Can moderate members and messages",
    memberCount: 0,
    isDefault: true,
    permissions: {
      viewChannels: true,
      manageChannels: false,
      manageRoles: false,
      manageServer: false,
      createInvites: true,
      kickMembers: true,
      banMembers: false,
      sendMessages: true,
      manageMessages: true,
      mentionEveryone: true,
      connect: true,
      speak: true,
      muteMembers: true,
      deafenMembers: true,
      moveMembers: true,
    },
  },
  {
    id: "member",
    name: "Member",
    powerLevel: 0,
    color: "#9e9e9e",
    description: "Default role for all members",
    memberCount: 0,
    isDefault: true,
    permissions: {
      viewChannels: true,
      manageChannels: false,
      manageRoles: false,
      manageServer: false,
      createInvites: true,
      kickMembers: false,
      banMembers: false,
      sendMessages: true,
      manageMessages: false,
      mentionEveryone: false,
      connect: true,
      speak: true,
      muteMembers: false,
      deafenMembers: false,
      moveMembers: false,
    },
  },
  {
    id: "restricted",
    name: "Restricted",
    powerLevel: -1,
    color: "#607d8b",
    description: "Limited permissions",
    memberCount: 0,
    isDefault: true,
    permissions: {
      viewChannels: true,
      manageChannels: false,
      manageRoles: false,
      manageServer: false,
      createInvites: false,
      kickMembers: false,
      banMembers: false,
      sendMessages: false,
      manageMessages: false,
      mentionEveryone: false,
      connect: false,
      speak: false,
      muteMembers: false,
      deafenMembers: false,
      moveMembers: false,
    },
  },
];

const ROLE_COLORS = [
  "#e91e63", // Pink
  "#f44336", // Red
  "#ff9800", // Orange
  "#ffc107", // Amber
  "#4caf50", // Green
  "#009688", // Teal
  "#00bcd4", // Cyan
  "#2196f3", // Blue
  "#3f51b5", // Indigo
  "#9c27b0", // Purple
  "#607d8b", // Blue Grey
  "#795548", // Brown
];

// =============================================================================
// Permission Groups
// =============================================================================

interface PermissionGroup {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  permissions: {
    key: keyof RolePermissions;
    name: string;
    description: string;
    requiredLevel: number;
  }[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    name: "General Server Permissions",
    icon: Settings2,
    permissions: [
      {
        key: "viewChannels",
        name: "View Channels",
        description: "Allows members to view channels by default",
        requiredLevel: -1,
      },
      {
        key: "manageChannels",
        name: "Manage Channels",
        description: "Create, edit, and delete channels",
        requiredLevel: 50,
      },
      {
        key: "manageRoles",
        name: "Manage Roles",
        description: "Create and manage roles below their highest role",
        requiredLevel: 100,
      },
      {
        key: "manageServer",
        name: "Manage Server",
        description: "Edit server name, avatar, and settings",
        requiredLevel: 75,
      },
    ],
  },
  {
    name: "Membership Permissions",
    icon: Users,
    permissions: [
      {
        key: "createInvites",
        name: "Create Invites",
        description: "Create invite links to this server",
        requiredLevel: 0,
      },
      {
        key: "kickMembers",
        name: "Kick Members",
        description: "Remove members from the server",
        requiredLevel: 50,
      },
      {
        key: "banMembers",
        name: "Ban Members",
        description: "Permanently ban members from the server",
        requiredLevel: 50,
      },
    ],
  },
  {
    name: "Text Channel Permissions",
    icon: MessageSquare,
    permissions: [
      {
        key: "sendMessages",
        name: "Send Messages",
        description: "Send messages in text channels",
        requiredLevel: 0,
      },
      {
        key: "manageMessages",
        name: "Manage Messages",
        description: "Delete and pin messages from other members",
        requiredLevel: 50,
      },
      {
        key: "mentionEveryone",
        name: "Mention @everyone",
        description: "Use @everyone and @here mentions",
        requiredLevel: 50,
      },
    ],
  },
];

// =============================================================================
// Component
// =============================================================================

export default function ServerSettingsRolesPage() {
  const params = useParams();
  const { client, isReady } = useMatrixClient();
  
  const serverId = params?.serverId as string;
  
  // State
  const [roles, setRoles] = useState<RoleDefinition[]>(DEFAULT_ROLES);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>("owner");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [editedPermissions, setEditedPermissions] = useState<RolePermissions | null>(null);
  
  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  
  /**
   * Load members and count by role
   */
  const loadData = useCallback(async () => {
    if (!isReady || !serverId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const membersData = await getMembers(serverId);
      setMembers(membersData);
      
      // Count members per role
      const updatedRoles = DEFAULT_ROLES.map((role) => ({
        ...role,
        memberCount: membersData.filter((m) => m.role === role.id).length,
      }));
      
      setRoles(updatedRoles);
    } catch (err) {
      console.error("Failed to load members:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [isReady, serverId]);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  /**
   * Initialize edited permissions when role selection changes
   */
  useEffect(() => {
    if (selectedRole) {
      setEditedPermissions({ ...selectedRole.permissions });
    }
  }, [selectedRole]);
  
  /**
   * Handle permission toggle
   */
  const handlePermissionToggle = (key: keyof RolePermissions) => {
    if (!editedPermissions || !selectedRole) return;
    
    // Can't edit default roles' core permissions
    if (selectedRole.isDefault && selectedRole.id === "owner") {
      return;
    }
    
    setEditedPermissions((prev) => ({
      ...prev!,
      [key]: !prev![key],
    }));
  };
  
  /**
   * Save role permissions
   */
  const handleSavePermissions = async () => {
    if (!client || !selectedRole || !editedPermissions) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      // In Matrix, permissions are controlled via power levels
      // We'd need to update the m.room.power_levels event
      // For now, we'll just update local state
      
      setRoles((prev) =>
        prev.map((r) =>
          r.id === selectedRole.id
            ? { ...r, permissions: editedPermissions }
            : r
        )
      );
      
      // In a real implementation, update power levels:
      // await client.sendStateEvent(serverId, 'm.room.power_levels', { ... }, '');
      
    } catch (err) {
      console.error("Failed to save permissions:", err);
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };
  
  /**
   * Create new custom role
   */
  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    
    // Custom roles would need Matrix state events
    const newRole: RoleDefinition = {
      id: `custom-${Date.now()}`,
      name: newRoleName.trim(),
      powerLevel: 25, // Between member and moderator
      color: ROLE_COLORS[Math.floor(Math.random() * ROLE_COLORS.length)],
      description: "Custom role",
      memberCount: 0,
      isDefault: false,
      permissions: { ...DEFAULT_ROLES.find((r) => r.id === "member")!.permissions },
    };
    
    setRoles((prev) => [...prev.slice(0, -1), newRole, prev[prev.length - 1]]);
    setNewRoleName("");
    setShowCreateDialog(false);
    setSelectedRoleId(newRole.id);
  };
  
  /**
   * Check if current user can edit this role
   */
  const canEditRole = (role: RoleDefinition) => {
    // Can't edit owner role (power level 100)
    if (role.powerLevel === 100) return false;
    
    // Check if user's power level is higher than role's
    const userPowerLevel = client?.getRoom(serverId)?.currentState
      .getStateEvents('m.room.power_levels', '')
      ?.getContent()?.users?.[client.getUserId()!] || 0;
    
    return userPowerLevel > role.powerLevel;
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-zinc-700 rounded animate-pulse" />
          <div className="h-8 w-48 bg-zinc-700 rounded animate-pulse" />
        </div>
        <div className="h-96 bg-zinc-800 rounded-lg animate-pulse" />
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Shield className="h-7 w-7" />
            Roles
          </h1>
          <p className="text-zinc-400 mt-1">
            Manage roles and permissions using Matrix power levels
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-700">
            <DialogHeader>
              <DialogTitle className="text-white">Create New Role</DialogTitle>
              <DialogDescription>
                Add a new role to your server&apos;s hierarchy
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="roleName" className="text-zinc-400">
                Role Name
              </Label>
              <Input
                id="roleName"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="Enter role name"
                className="mt-2 bg-zinc-800 border-zinc-700"
              />
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateRole}
                disabled={!newRoleName.trim()}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Create Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Separator className="bg-zinc-700" />
      
      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
      
      {/* Power Levels Info */}
      <Card className="bg-indigo-500/10 border-indigo-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-indigo-400 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-indigo-300">
                Matrix Power Levels
              </h4>
              <p className="text-xs text-indigo-400/80 mt-1">
                Roles in Matrix are based on power levels (0-100). Higher power levels
                can manage users with lower levels. Owner has power level 100, Admin 75,
                Moderator 50, and Member 0.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-12 gap-6">
        {/* Role List */}
        <div className="col-span-4">
          <Card className="bg-zinc-800/50 border-zinc-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-zinc-400 font-medium">
                ROLES — {roles.length}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="p-2 space-y-1">
                  {roles.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRoleId(role.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                        selectedRoleId === role.id
                          ? "bg-zinc-700"
                          : "hover:bg-zinc-700/50"
                      }`}
                    >
                      <div
                        className="h-3 w-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: role.color }}
                      />
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white truncate">
                            {role.name}
                          </span>
                          {role.id === "owner" && (
                            <Crown className="h-3 w-3 text-yellow-500" />
                          )}
                        </div>
                        <span className="text-xs text-zinc-500">
                          {role.memberCount} member{role.memberCount !== 1 && "s"}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs bg-zinc-800">
                        {role.powerLevel}
                      </Badge>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
        
        {/* Role Details */}
        <div className="col-span-8">
          {selectedRole ? (
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-5 w-5 rounded-full"
                      style={{ backgroundColor: selectedRole.color }}
                    />
                    <div>
                      <CardTitle className="text-white flex items-center gap-2">
                        {selectedRole.name}
                        {selectedRole.id === "owner" && (
                          <Crown className="h-4 w-4 text-yellow-500" />
                        )}
                      </CardTitle>
                      <CardDescription>
                        Power Level: {selectedRole.powerLevel}
                      </CardDescription>
                    </div>
                  </div>
                  
                  {!selectedRole.isDefault && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate Role
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-400">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Role
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Role Info */}
                <div className="p-4 bg-zinc-900 rounded-lg">
                  <p className="text-sm text-zinc-400">{selectedRole.description}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Users className="h-3 w-3" />
                      {selectedRole.memberCount} members
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Shield className="h-3 w-3" />
                      Power Level {selectedRole.powerLevel}
                    </div>
                  </div>
                </div>
                
                {/* Permissions */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-400 uppercase mb-4">
                    Permissions
                  </h3>
                  
                  <ScrollArea className="h-[350px] pr-4">
                    <div className="space-y-4">
                      {PERMISSION_GROUPS.map((group) => {
                        const Icon = group.icon;
                        return (
                          <Collapsible key={group.name} defaultOpen>
                            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 hover:bg-zinc-700/30 rounded-md transition-colors">
                              <ChevronRight className="h-4 w-4 text-zinc-400 transition-transform data-[state=open]:rotate-90" />
                              <Icon className="h-4 w-4 text-zinc-400" />
                              <span className="text-sm font-medium text-zinc-300">
                                {group.name}
                              </span>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="pl-8 space-y-2 mt-2">
                              {group.permissions.map((perm) => (
                                <div
                                  key={perm.key}
                                  className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg"
                                >
                                  <div>
                                    <div className="text-sm font-medium text-white">
                                      {perm.name}
                                    </div>
                                    <div className="text-xs text-zinc-500 mt-0.5">
                                      {perm.description}
                                    </div>
                                    {selectedRole.powerLevel < perm.requiredLevel && (
                                      <div className="text-xs text-amber-500 mt-1">
                                        Requires power level {perm.requiredLevel}+
                                      </div>
                                    )}
                                  </div>
                                  <Switch
                                    checked={editedPermissions?.[perm.key] ?? false}
                                    onCheckedChange={() => handlePermissionToggle(perm.key)}
                                    disabled={
                                      selectedRole.id === "owner" ||
                                      !canEditRole(selectedRole) ||
                                      selectedRole.powerLevel < perm.requiredLevel
                                    }
                                  />
                                </div>
                              ))}
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
                
                {/* Save Button */}
                {canEditRole(selectedRole) && (
                  <div className="flex justify-end pt-4 border-t border-zinc-700">
                    <Button
                      onClick={handleSavePermissions}
                      disabled={isSaving}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {isSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-zinc-800/50 border-zinc-700 h-full">
              <CardContent className="flex items-center justify-center h-full">
                <p className="text-zinc-500">Select a role to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
