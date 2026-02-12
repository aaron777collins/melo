"use client";

/**
 * Server Roles Settings Page
 * 
 * Manage server roles and permissions:
 * - View role hierarchy with Matrix power levels
 * - Edit role permissions and power levels
 * - Assign/change member roles
 * - Role templates and presets
 * 
 * Extracted from server-settings-modal.tsx roles functionality.
 */

import React, { useState } from "react";
import { 
  Shield, 
  Crown, 
  Users, 
  Settings, 
  Plus, 
  MoreHorizontal,
  AlertCircle,
  Loader2,
  UserPlus,
  UserMinus,
  ChevronDown,
  ChevronRight
} from "lucide-react";

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Matrix Services
import { 
  setPowerLevel,
  type Member,
  type MemberRole 
} from "@/apps/web/services/matrix-member";

// Types
import type { ServerSettingsContextData } from "./server-settings";

// =============================================================================
// Types and Constants
// =============================================================================

const POWER_LEVELS = {
  OWNER: 100,
  ADMIN: 75,
  MODERATOR: 50,
  MEMBER: 0,
  RESTRICTED: -1
} as const;

interface RoleConfig {
  name: string;
  color: string;
  powerLevel: number;
  description: string;
  permissions: string[];
  icon: React.ComponentType<{ className?: string }>;
}

const ROLE_CONFIGS: Record<MemberRole, RoleConfig> = {
  owner: {
    name: "Owner",
    color: "bg-red-500 text-white",
    powerLevel: POWER_LEVELS.OWNER,
    description: "Full control over the server",
    icon: Crown,
    permissions: [
      "All permissions",
      "Delete server",
      "Transfer ownership",
      "Manage all roles",
      "Manage server settings"
    ]
  },
  admin: {
    name: "Administrator", 
    color: "bg-orange-500 text-white",
    powerLevel: POWER_LEVELS.ADMIN,
    description: "Can manage most server settings",
    icon: Settings,
    permissions: [
      "Manage server settings",
      "Manage roles (below Admin)",
      "Manage channels",
      "Ban/kick members",
      "View audit log"
    ]
  },
  moderator: {
    name: "Moderator",
    color: "bg-green-500 text-white", 
    powerLevel: POWER_LEVELS.MODERATOR,
    description: "Can moderate members and channels",
    icon: Shield,
    permissions: [
      "Kick members",
      "Manage messages",
      "Timeout members",
      "Manage nicknames",
      "View moderation logs"
    ]
  },
  member: {
    name: "Member",
    color: "bg-gray-500 text-white",
    powerLevel: POWER_LEVELS.MEMBER,
    description: "Regular server member",
    icon: Users,
    permissions: [
      "Send messages",
      "Join voice channels",
      "Add reactions",
      "Use external emojis",
      "Read message history"
    ]
  },
  restricted: {
    name: "Restricted",
    color: "bg-gray-700 text-white",
    powerLevel: POWER_LEVELS.RESTRICTED,
    description: "Limited permissions",
    icon: UserMinus,
    permissions: [
      "Read messages only",
      "Limited channel access",
      "No voice permissions",
      "Cannot use reactions"
    ]
  }
} as const;

// =============================================================================
// Component
// =============================================================================

export function ServerRoles({
  space,
  currentMember,
  members,
  isLoading: parentLoading,
  error: parentError,
  refreshData
}: ServerSettingsContextData) {
  
  // State
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [expandedRole, setExpandedRole] = useState<MemberRole | null>("owner");
  
  // Calculate user permissions
  const userPowerLevel = currentMember?.powerLevel || 0;
  const isOwner = userPowerLevel >= POWER_LEVELS.OWNER;
  const isAdmin = userPowerLevel >= POWER_LEVELS.ADMIN;
  
  // Group members by role
  const membersByRole = React.useMemo(() => {
    if (!members) return {};
    
    return members.reduce((acc, member) => {
      const role = member.role;
      if (!acc[role]) acc[role] = [];
      acc[role].push(member);
      return acc;
    }, {} as Record<MemberRole, Member[]>);
  }, [members]);
  
  // Handle role change
  const handleRoleChange = async (userId: string, currentRole: MemberRole, newRole: MemberRole) => {
    if (!space || !isAdmin) return;
    
    // Prevent users from promoting someone to owner unless they're owner
    if (newRole === "owner" && !isOwner) {
      setUpdateError("Only owners can promote members to owner");
      return;
    }
    
    // Prevent users from demoting owners unless they're owner
    if (currentRole === "owner" && !isOwner) {
      setUpdateError("Only owners can change owner roles");
      return;
    }
    
    setIsUpdating(true);
    setUpdateError(null);
    
    try {
      const newPowerLevel = ROLE_CONFIGS[newRole].powerLevel;
      await setPowerLevel(space.id, userId, newPowerLevel);
      
      // Refresh data to show updated roles
      await refreshData();
      
    } catch (err) {
      console.error("Failed to change role:", err);
      setUpdateError(err instanceof Error ? err.message : "Failed to change role");
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Check if user can manage a specific role
  const canManageRole = (targetRole: MemberRole): boolean => {
    if (!currentMember) return false;
    
    const targetPowerLevel = ROLE_CONFIGS[targetRole].powerLevel;
    const userPowerLevel = currentMember.powerLevel;
    
    // Users can only manage roles below their own power level
    return userPowerLevel > targetPowerLevel;
  };
  
  if (!space) {
    return null;
  }
  
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Roles & Permissions</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Manage roles and permissions for your server members
        </p>
      </div>
      
      {/* Error Alert */}
      {(parentError || updateError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {parentError || updateError}
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Role Hierarchy */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Role Hierarchy
              </CardTitle>
              <CardDescription>
                Roles are ordered by power level. Higher roles inherit permissions from lower roles.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(ROLE_CONFIGS).map(([roleKey, config]) => {
                  const role = roleKey as MemberRole;
                  const roleMembers = membersByRole[role] || [];
                  const Icon = config.icon;
                  const isExpanded = expandedRole === role;
                  
                  return (
                    <Collapsible 
                      key={role} 
                      open={isExpanded}
                      onOpenChange={(open) => setExpandedRole(open ? role : null)}
                    >
                      <Card className="border-zinc-200 dark:border-zinc-700">
                        <CollapsibleTrigger asChild>
                          <CardHeader className="pb-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-lg ${config.color}`}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-medium">{config.name}</h3>
                                    <Badge variant="secondary" className="text-xs">
                                      Power Level {config.powerLevel}
                                    </Badge>
                                    {roleMembers.length > 0 && (
                                      <Badge variant="outline" className="text-xs">
                                        {roleMembers.length} member{roleMembers.length !== 1 ? 's' : ''}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-zinc-500">{config.description}</p>
                                </div>
                              </div>
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-zinc-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-zinc-400" />
                              )}
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <CardContent className="pt-0">
                            {/* Permissions */}
                            <div className="mb-4">
                              <h4 className="text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
                                Permissions
                              </h4>
                              <div className="grid gap-1">
                                {config.permissions.map((permission, index) => (
                                  <div key={index} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                                    <div className="w-1 h-1 bg-zinc-400 rounded-full" />
                                    {permission}
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            {/* Members with this role */}
                            {roleMembers.length > 0 && (
                              <>
                                <Separator className="my-3" />
                                <div>
                                  <h4 className="text-sm font-medium mb-3 text-zinc-700 dark:text-zinc-300">
                                    Members ({roleMembers.length})
                                  </h4>
                                  <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {roleMembers.map((member) => (
                                      <div key={member.userId} className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                                        <div className="flex items-center space-x-2">
                                          <Avatar className="h-8 w-8">
                                            <AvatarImage src={member.avatarUrl || undefined} />
                                            <AvatarFallback className="text-xs">
                                              {member.displayName?.substring(0, 2).toUpperCase() || 
                                               member.userId.substring(1, 3).toUpperCase()}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div>
                                            <p className="text-sm font-medium">
                                              {member.displayName || member.userId}
                                            </p>
                                            {member.isOnline && (
                                              <div className="flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                                <span className="text-xs text-zinc-500">Online</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        
                                        {/* Role change dropdown */}
                                        {canManageRole(role) && member.userId !== currentMember?.userId && (
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button 
                                                variant="ghost" 
                                                size="sm"
                                                disabled={isUpdating}
                                                className="h-8 w-8 p-0"
                                              >
                                                <MoreHorizontal className="h-4 w-4" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                              {Object.entries(ROLE_CONFIGS).map(([targetRole, targetConfig]) => {
                                                const targetRoleKey = targetRole as MemberRole;
                                                
                                                // Don't show current role or roles user can't assign
                                                if (targetRoleKey === role || !canManageRole(targetRoleKey)) {
                                                  return null;
                                                }
                                                
                                                return (
                                                  <DropdownMenuItem 
                                                    key={targetRole}
                                                    onClick={() => handleRoleChange(member.userId, role, targetRoleKey)}
                                                  >
                                                    <div className="flex items-center gap-2">
                                                      <div className={`w-3 h-3 rounded ${targetConfig.color}`} />
                                                      Change to {targetConfig.name}
                                                    </div>
                                                  </DropdownMenuItem>
                                                );
                                              })}
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </>
                            )}
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Role Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Role Summary</CardTitle>
              <CardDescription>
                Distribution of roles in your server
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(ROLE_CONFIGS).map(([roleKey, config]) => {
                const role = roleKey as MemberRole;
                const count = membersByRole[role]?.length || 0;
                const Icon = config.icon;
                
                return (
                  <div key={role} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-zinc-500" />
                      <span className="text-sm">{config.name}</span>
                    </div>
                    <Badge variant="secondary">
                      {count}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          
          {/* Matrix Power Levels Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Power Levels</CardTitle>
              <CardDescription>
                How roles map to Matrix power levels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                <p className="mb-3">
                  Matrix uses numeric power levels to determine permissions. 
                  Higher numbers have more authority.
                </p>
                
                <div className="space-y-2">
                  {Object.entries(POWER_LEVELS).map(([level, value]) => (
                    <div key={level} className="flex justify-between">
                      <span className="capitalize">{level.toLowerCase()}</span>
                      <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 rounded">
                        {value}
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                disabled={!isAdmin}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Members
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                disabled={!isAdmin}
              >
                <Settings className="h-4 w-4 mr-2" />
                Role Templates
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ServerRoles;