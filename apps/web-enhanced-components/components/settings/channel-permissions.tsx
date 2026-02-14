"use client";

/**
 * Channel Permissions Settings Page
 * 
 * Manages role-based permission overrides for specific channels.
 * Allows administrators to set custom permissions per role that override
 * the default space/server permissions for this specific channel.
 */

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Save, 
  Shield, 
  Users, 
  Eye, 
  EyeOff, 
  MessageSquare, 
  Mic, 
  Video,
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
  Crown,
  Settings
} from "lucide-react";

// UI Components
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle2 } from "lucide-react";

// Matrix Services
import { setPowerLevel } from "@/apps/web/services/matrix-member";

// Types
import type { ChannelSettingsContextData } from "./channel-settings";
import type { Member } from "@/apps/web/services/matrix-member";

// =============================================================================
// Types & Constants
// =============================================================================

// Permission levels for Matrix
const POWER_LEVELS = {
  OWNER: 100,
  ADMIN: 75,
  MODERATOR: 50,
  MEMBER: 0,
  RESTRICTED: -1
} as const;

type PowerLevel = typeof POWER_LEVELS[keyof typeof POWER_LEVELS];

// Role information for display
const ROLE_INFO = [
  {
    name: "Owner",
    level: POWER_LEVELS.OWNER,
    color: "bg-red-500",
    description: "Full control over the channel",
    icon: Crown
  },
  {
    name: "Admin",
    level: POWER_LEVELS.ADMIN,
    color: "bg-orange-500",
    description: "Can manage most channel settings",
    icon: Shield
  },
  {
    name: "Moderator",
    level: POWER_LEVELS.MODERATOR,
    color: "bg-blue-500",
    description: "Can moderate messages and members",
    icon: Settings
  },
  {
    name: "Member",
    level: POWER_LEVELS.MEMBER,
    color: "bg-green-500",
    description: "Standard channel access",
    icon: Users
  },
  {
    name: "Restricted",
    level: POWER_LEVELS.RESTRICTED,
    color: "bg-zinc-500",
    description: "Limited channel access",
    icon: EyeOff
  }
] as const;

// Permission schema
const permissionSchema = z.object({
  userId: z.string(),
  powerLevel: z.number()
});

type PermissionFormData = z.infer<typeof permissionSchema>;

// =============================================================================
// Component
// =============================================================================

export function ChannelPermissions({
  channel,
  currentMember,
  members,
  isLoading: parentLoading,
  error: parentError,
  refreshData
}: ChannelSettingsContextData) {
  
  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"roles" | "members">("roles");
  
  // Current user permissions
  const userPowerLevel = currentMember?.powerLevel || 0;
  const isOwner = userPowerLevel >= POWER_LEVELS.OWNER;
  const isAdmin = userPowerLevel >= POWER_LEVELS.ADMIN;
  
  // Form for individual member power level changes
  const form = useForm<PermissionFormData>({
    resolver: zodResolver(permissionSchema),
    defaultValues: {
      userId: "",
      powerLevel: POWER_LEVELS.MEMBER
    }
  });

  // Group members by role
  const membersByRole = React.useMemo(() => {
    const groups = {
      [POWER_LEVELS.OWNER]: [] as Member[],
      [POWER_LEVELS.ADMIN]: [] as Member[],
      [POWER_LEVELS.MODERATOR]: [] as Member[],
      [POWER_LEVELS.MEMBER]: [] as Member[],
      [POWER_LEVELS.RESTRICTED]: [] as Member[]
    };
    
    members.forEach(member => {
      const level = member.powerLevel;
      if (level >= POWER_LEVELS.OWNER) {
        groups[POWER_LEVELS.OWNER].push(member);
      } else if (level >= POWER_LEVELS.ADMIN) {
        groups[POWER_LEVELS.ADMIN].push(member);
      } else if (level >= POWER_LEVELS.MODERATOR) {
        groups[POWER_LEVELS.MODERATOR].push(member);
      } else if (level >= POWER_LEVELS.MEMBER) {
        groups[POWER_LEVELS.MEMBER].push(member);
      } else {
        groups[POWER_LEVELS.RESTRICTED].push(member);
      }
    });
    
    return groups;
  }, [members]);

  // Handle power level change
  const handlePowerLevelChange = async (userId: string, newPowerLevel: PowerLevel) => {
    if (!channel) return;
    
    // Permission check
    if (!isAdmin && newPowerLevel >= POWER_LEVELS.MODERATOR) {
      setSubmitError("You don't have permission to assign moderator or higher roles");
      return;
    }
    
    if (!isOwner && newPowerLevel >= POWER_LEVELS.ADMIN) {
      setSubmitError("Only the channel owner can assign admin roles");
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    
    try {
      await setPowerLevel(channel.id, userId, newPowerLevel);
      await refreshData();
      
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
      
    } catch (err) {
      console.error("Failed to update member power level:", err);
      setSubmitError(err instanceof Error ? err.message : "Failed to update permissions");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get role info for power level
  const getRoleInfo = (powerLevel: number) => {
    return ROLE_INFO.find(role => {
      if (powerLevel >= POWER_LEVELS.OWNER) return role.level === POWER_LEVELS.OWNER;
      if (powerLevel >= POWER_LEVELS.ADMIN) return role.level === POWER_LEVELS.ADMIN;
      if (powerLevel >= POWER_LEVELS.MODERATOR) return role.level === POWER_LEVELS.MODERATOR;
      if (powerLevel >= POWER_LEVELS.MEMBER) return role.level === POWER_LEVELS.MEMBER;
      return role.level === POWER_LEVELS.RESTRICTED;
    }) || ROLE_INFO[3]; // Default to Member
  };

  // Can user modify this member's permissions?
  const canModifyMember = (member: Member): boolean => {
    // Can't modify yourself
    if (member.userId === currentMember?.userId) return false;
    
    // Owners can modify anyone below them
    if (isOwner && member.powerLevel < POWER_LEVELS.OWNER) return true;
    
    // Admins can modify moderators and below
    if (isAdmin && member.powerLevel < POWER_LEVELS.ADMIN) return true;
    
    return false;
  };

  if (!channel) return null;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-zinc-500" />
        <div>
          <h1 className="text-2xl font-bold">Channel Permissions</h1>
          <p className="text-sm text-zinc-500">
            Manage role-based permissions and access control for this channel
          </p>
        </div>
      </div>

      {/* Success/Error Messages */}
      {submitSuccess && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Permissions updated successfully!
          </AlertDescription>
        </Alert>
      )}
      
      {submitError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as "roles" | "members")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="roles">Role Overview</TabsTrigger>
          <TabsTrigger value="members">Member Permissions</TabsTrigger>
        </TabsList>
        
        {/* Role Overview Tab */}
        <TabsContent value="roles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Role Hierarchy</CardTitle>
              <CardDescription>
                Overview of roles and their permissions in this channel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {ROLE_INFO.map((role) => {
                const roleMembers = membersByRole[role.level] || [];
                const Icon = role.icon;
                
                return (
                  <div key={role.name} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${role.color} bg-opacity-10`}>
                        <Icon className={`h-4 w-4 text-current`} />
                      </div>
                      <div>
                        <h3 className="font-medium">{role.name}</h3>
                        <p className="text-sm text-zinc-500">{role.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {roleMembers.length} member{roleMembers.length !== 1 ? 's' : ''}
                      </Badge>
                      <Badge variant="outline">
                        Level {role.level}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Member Permissions Tab */}
        <TabsContent value="members" className="space-y-6">
          {ROLE_INFO.map((role) => {
            const roleMembers = membersByRole[role.level] || [];
            const Icon = role.icon;
            
            if (roleMembers.length === 0) return null;
            
            return (
              <Card key={role.name}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className={`p-1.5 rounded ${role.color} bg-opacity-10`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {role.name}
                    <Badge variant="secondary">{roleMembers.length}</Badge>
                  </CardTitle>
                  <CardDescription>
                    {role.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {roleMembers.map((member) => (
                      <div key={member.userId} className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                            <span className="text-xs font-medium">
                              {member.displayName?.charAt(0).toUpperCase() || member.userId.charAt(1).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">
                              {member.displayName || member.userId}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {member.userId}
                            </div>
                          </div>
                          {member.userId === currentMember?.userId && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {canModifyMember(member) ? (
                            <Select
                              value={role.level.toString()}
                              onValueChange={(value) => handlePowerLevelChange(member.userId, parseInt(value) as PowerLevel)}
                              disabled={isSubmitting}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLE_INFO.map((targetRole) => {
                                  // Only show roles the current user can assign
                                  if (!isOwner && targetRole.level >= POWER_LEVELS.ADMIN) return null;
                                  if (!isAdmin && targetRole.level >= POWER_LEVELS.MODERATOR) return null;
                                  
                                  return (
                                    <SelectItem key={targetRole.level} value={targetRole.level.toString()}>
                                      {targetRole.name}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="secondary">{role.name}</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
      
      {/* Permission Matrix Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Permission Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm space-y-2">
            <p className="font-medium">Permission Levels:</p>
            <ul className="space-y-1 text-zinc-600 dark:text-zinc-400">
              <li><strong>Owner (100):</strong> Full channel control, can delete channel</li>
              <li><strong>Admin (75):</strong> Manage settings, permissions, and moderation</li>
              <li><strong>Moderator (50):</strong> Moderate messages, kick/ban users</li>
              <li><strong>Member (0):</strong> Send messages, join voice/video</li>
              <li><strong>Restricted (-1):</strong> Read-only access</li>
            </ul>
          </div>
          
          <Separator />
          
          <div className="text-sm space-y-2">
            <p className="font-medium">Permission Rules:</p>
            <ul className="space-y-1 text-zinc-600 dark:text-zinc-400">
              <li>• Users can only manage roles below their own level</li>
              <li>• Channel permissions override server permissions for this channel</li>
              <li>• Changes take effect immediately</li>
              <li>• Some permissions require server-level admin access</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ChannelPermissions;