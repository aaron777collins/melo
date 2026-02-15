"use client";

/**
 * Member Role Editor Component
 *
 * Modal for assigning and managing roles for individual members.
 * Integrates with Matrix power levels and custom role system.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useMatrixClient } from "@/hooks/use-matrix-client";
import { Member, Profile } from "@/lib/haos-types";
import { MatrixRole } from "@/components/server/role-manager";
import rolesService from "@/lib/matrix/roles";
import { UserAvatar } from "@/components/user-avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import {
  Shield,
  Crown,
  Hammer,
  Users,
  AlertTriangle,
  Check,
  X,
  Info,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface MemberRoleEditorProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Called when modal should close */
  onClose: () => void;
  /** Member to edit roles for */
  member: Member & { profile: Profile };
  /** Server/Space ID */
  serverId: string;
  /** Current user's power level */
  userPowerLevel: number;
  /** Called after successful role changes */
  onSuccess?: () => void;
}

interface RoleAssignment {
  role: MatrixRole;
  isAssigned: boolean;
  canAssign: boolean;
  reason?: string;
}

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
 * Check if user can assign a specific role
 */
function canAssignRole(userPowerLevel: number, targetRolePowerLevel: number, currentMemberPowerLevel: number): { can: boolean; reason?: string } {
  // Cannot assign roles to users with higher or equal power level
  if (currentMemberPowerLevel >= userPowerLevel) {
    return { can: false, reason: "Cannot modify roles of users with equal or higher power level" };
  }
  
  // Cannot assign roles that are higher than your own power level
  if (targetRolePowerLevel >= userPowerLevel) {
    return { can: false, reason: "Cannot assign roles with higher power level than your own" };
  }
  
  return { can: true };
}

/**
 * Get the effective power level from role assignments
 */
function getEffectivePowerLevel(assignments: RoleAssignment[]): number {
  const assignedRoles = assignments.filter(a => a.isAssigned);
  if (assignedRoles.length === 0) return 0;
  
  return Math.max(...assignedRoles.map(a => a.role.powerLevel));
}

// =============================================================================
// Components
// =============================================================================

/**
 * Individual role assignment item
 */
interface RoleAssignmentItemProps {
  assignment: RoleAssignment;
  onToggle: (roleId: string, assigned: boolean) => void;
  disabled?: boolean;
}

function RoleAssignmentItem({ assignment, onToggle, disabled }: RoleAssignmentItemProps) {
  const { role, isAssigned, canAssign, reason } = assignment;
  const Icon = getRoleIcon(role.powerLevel);
  const isDisabled = disabled || !canAssign;

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg border transition-colors",
      isAssigned ? "bg-indigo-500/10 border-indigo-500/30" : "bg-zinc-800/30 border-zinc-700",
      isDisabled ? "opacity-50" : "hover:bg-zinc-700/30"
    )}>
      {/* Checkbox */}
      <Checkbox
        checked={isAssigned}
        onCheckedChange={(checked) => onToggle(role.id, !!checked)}
        disabled={isDisabled}
        className="data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
      />

      {/* Role Icon */}
      <div
        className="flex items-center justify-center w-8 h-8 rounded-full"
        style={{ backgroundColor: role.color + "20", color: role.color }}
      >
        <Icon className="h-4 w-4" />
      </div>

      {/* Role Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-white truncate">
            {role.name}
          </h3>
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: role.color }}
          />
          {role.isDefault && (
            <Badge variant="secondary" className="text-xs">
              Default
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4 mt-1">
          <span className="text-xs text-zinc-400">
            Power Level: {role.powerLevel}
          </span>
          <span className="text-xs text-zinc-400">
            {role.memberCount} members
          </span>
        </div>
        
        {/* Permission preview */}
        <div className="flex items-center gap-1 mt-1">
          {role.permissions.manageServer && (
            <Badge variant="outline" className="text-xs px-1 py-0">
              Server
            </Badge>
          )}
          {role.permissions.manageRoles && (
            <Badge variant="outline" className="text-xs px-1 py-0">
              Roles
            </Badge>
          )}
          {role.permissions.kickMembers && (
            <Badge variant="outline" className="text-xs px-1 py-0">
              Kick
            </Badge>
          )}
          {role.permissions.banMembers && (
            <Badge variant="outline" className="text-xs px-1 py-0">
              Ban
            </Badge>
          )}
        </div>

        {/* Cannot assign reason */}
        {!canAssign && reason && (
          <div className="flex items-center gap-1 mt-2">
            <AlertTriangle className="h-3 w-3 text-yellow-400" />
            <span className="text-xs text-yellow-400">{reason}</span>
          </div>
        )}
      </div>

      {/* Assignment Status */}
      {isAssigned && (
        <div className="flex items-center gap-1 text-indigo-400">
          <Check className="h-4 w-4" />
          <span className="text-xs font-medium">Assigned</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function MemberRoleEditor({
  isOpen,
  onClose,
  member,
  serverId,
  userPowerLevel,
  onSuccess,
}: MemberRoleEditorProps) {
  const { client } = useMatrixClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roleAssignments, setRoleAssignments] = useState<RoleAssignment[]>([]);
  const [currentMemberPowerLevel, setCurrentMemberPowerLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Load available roles and current assignments
  const loadRoleData = useCallback(async () => {
    if (!client || !serverId || !member) return;

    setLoading(true);
    setError(null);

    try {
      // Get current power level
      const room = client.getRoom(serverId);
      const memberPowerLevel = room?.getMember(member.id)?.powerLevel || 0;
      setCurrentMemberPowerLevel(memberPowerLevel);

      // Get all available roles
      const customRoles = await rolesService.getCustomRoles(serverId);
      const powerLevels = await rolesService.getRoomPowerLevels(serverId);
      
      // Add default roles based on power levels
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

      // Combine custom and default roles, sort by power level
      const allRoles = [...customRoles, ...defaultRoles]
        .sort((a, b) => b.powerLevel - a.powerLevel);

      // Create role assignments
      const assignments: RoleAssignment[] = allRoles.map(role => {
        const isCurrentlyAssigned = role.powerLevel === memberPowerLevel;
        const assignmentCheck = canAssignRole(userPowerLevel, role.powerLevel, memberPowerLevel);
        
        return {
          role,
          isAssigned: isCurrentlyAssigned,
          canAssign: assignmentCheck.can,
          reason: assignmentCheck.reason,
        };
      });

      setRoleAssignments(assignments);
    } catch (err) {
      console.error("Failed to load role data:", err);
      setError("Failed to load role information. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [client, serverId, member, userPowerLevel]);

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadRoleData();
    }
  }, [isOpen, loadRoleData]);

  // Handle role assignment toggle
  const handleRoleToggle = useCallback((roleId: string, assigned: boolean) => {
    setRoleAssignments(prev => prev.map(assignment => {
      if (assignment.role.id === roleId) {
        return { ...assignment, isAssigned: assigned };
      }
      
      // For Matrix, only one power level can be active at a time
      // So uncheck other roles when assigning a new one
      if (assigned && assignment.isAssigned) {
        return { ...assignment, isAssigned: false };
      }
      
      return assignment;
    }));
  }, []);

  // Save role changes
  const handleSave = async () => {
    if (!client || !member || saving) return;

    setSaving(true);
    setError(null);

    try {
      const newPowerLevel = getEffectivePowerLevel(roleAssignments);
      
      // Only update if power level actually changed
      if (newPowerLevel !== currentMemberPowerLevel) {
        await rolesService.setUserPowerLevel(serverId, member.id, newPowerLevel);
        
        // Update custom role member counts if applicable
        const assignedCustomRoles = roleAssignments.filter(a => 
          a.isAssigned && !a.role.isDefault
        );
        
        // Note: Custom role member count updates would be handled by the roles service
        console.log(`Updated power level for ${member.profile.name} to ${newPowerLevel}`);
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Failed to save role changes:", err);
      setError("Failed to save role changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = roleAssignments.some(assignment => {
    const wasAssigned = assignment.role.powerLevel === currentMemberPowerLevel;
    return assignment.isAssigned !== wasAssigned;
  });

  const newPowerLevel = getEffectivePowerLevel(roleAssignments);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <UserAvatar
              src={member?.profile.imageUrl}
              className="h-8 w-8"
            />
            <div>
              <div className="text-white">Edit Roles</div>
              <div className="text-sm text-zinc-400 font-normal">
                {member?.profile.name}
              </div>
            </div>
          </DialogTitle>
          <DialogDescription>
            Assign roles to manage this member&apos;s permissions and abilities.
            Higher roles take precedence in Matrix.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden">
          {/* Current Status */}
          <div className="bg-zinc-800/30 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Current Power Level:</span>
              <Badge variant="secondary">{currentMemberPowerLevel}</Badge>
            </div>
            {hasChanges && (
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-700">
                <span className="text-sm text-zinc-400">New Power Level:</span>
                <Badge 
                  variant="secondary"
                  className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                >
                  {newPowerLevel}
                </Badge>
              </div>
            )}
          </div>

          {/* Warning about Matrix power level system */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Matrix uses power levels instead of multiple roles. 
              Assigning a role sets the user&apos;s power level to that role&apos;s level.
              Only one power level can be active at a time.
            </AlertDescription>
          </Alert>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Role Assignment List */}
          <ScrollArea className="flex-1 max-h-96">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="text-zinc-400">Loading roles...</div>
              </div>
            ) : (
              <div className="space-y-2">
                {roleAssignments.map(assignment => (
                  <RoleAssignmentItem
                    key={assignment.role.id}
                    assignment={assignment}
                    onToggle={handleRoleToggle}
                    disabled={saving}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-zinc-500">
              {hasChanges ? "You have unsaved changes" : "No changes made"}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={!hasChanges || saving || loading}
                className="bg-indigo-500 hover:bg-indigo-600"
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}