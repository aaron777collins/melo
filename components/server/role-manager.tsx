"use client";

/**
 * Role Manager Component
 *
 * Discord-style role management interface for Matrix spaces.
 * Displays roles in a hierarchical list with drag-and-drop reordering.
 * Maps Matrix power levels to user-friendly role names and colors.
 */

import React, { useState, useCallback, useMemo, DragEvent } from "react";
import {
  Shield,
  Crown,
  Hammer,
  Users,
  ChevronRight,
  GripVertical,
  Settings,
  Eye,
  EyeOff,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Copy
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ActionTooltip } from "@/components/action-tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

// =============================================================================
// Types
// =============================================================================

/**
 * Matrix power levels mapped to Discord-style roles
 */
export interface MatrixRole {
  /** Role ID (power level as string) */
  id: string;
  /** Display name */
  name: string;
  /** Role color (hex code) */
  color: string;
  /** Matrix power level (0-100) */
  powerLevel: number;
  /** Number of members with this role */
  memberCount: number;
  /** Whether role should be displayed separately in member list */
  isHoist: boolean;
  /** Whether role is mentionable */
  isMentionable: boolean;
  /** Permission flags */
  permissions: RolePermissions;
  /** Whether this is a default role */
  isDefault: boolean;
  /** Order in role hierarchy */
  position: number;
}

/**
 * Role permissions (simplified for Matrix)
 */
export interface RolePermissions {
  /** Can manage server settings */
  manageServer: boolean;
  /** Can manage roles */
  manageRoles: boolean;
  /** Can manage channels */
  manageChannels: boolean;
  /** Can kick members */
  kickMembers: boolean;
  /** Can ban members */
  banMembers: boolean;
  /** Can create invites */
  createInvites: boolean;
  /** Can send messages */
  sendMessages: boolean;
  /** Can read message history */
  readHistory: boolean;
  /** Can mention everyone */
  mentionEveryone: boolean;
}

interface RoleManagerProps {
  /** Server/Space ID */
  serverId: string;
  /** Current user's power level */
  userPowerLevel: number;
  /** Initial roles data */
  initialRoles?: MatrixRole[];
  /** Called when roles are reordered */
  onRoleReorder?: (roles: MatrixRole[]) => void;
  /** Called when role is edited */
  onRoleEdit?: (role: MatrixRole) => void;
  /** Called when role is deleted */
  onRoleDelete?: (role: MatrixRole) => void;
  /** Called when new role is created */
  onRoleCreate?: () => void;
}

// =============================================================================
// Default Roles (Based on Matrix Power Levels)
// =============================================================================

const DEFAULT_ROLES: MatrixRole[] = [
  {
    id: "admin",
    name: "Admin",
    color: "#f04747",
    powerLevel: 100,
    memberCount: 1,
    isHoist: true,
    isMentionable: true,
    position: 3,
    isDefault: false,
    permissions: {
      manageServer: true,
      manageRoles: true,
      manageChannels: true,
      kickMembers: true,
      banMembers: true,
      createInvites: true,
      sendMessages: true,
      readHistory: true,
      mentionEveryone: true,
    },
  },
  {
    id: "moderator", 
    name: "Moderator",
    color: "#7289da",
    powerLevel: 50,
    memberCount: 3,
    isHoist: true,
    isMentionable: true,
    position: 2,
    isDefault: false,
    permissions: {
      manageServer: false,
      manageRoles: false,
      manageChannels: true,
      kickMembers: true,
      banMembers: true,
      createInvites: true,
      sendMessages: true,
      readHistory: true,
      mentionEveryone: true,
    },
  },
  {
    id: "member",
    name: "@everyone",
    color: "#99aab5",
    powerLevel: 0,
    memberCount: 127,
    isHoist: false,
    isMentionable: false,
    position: 1,
    isDefault: true,
    permissions: {
      manageServer: false,
      manageRoles: false,
      manageChannels: false,
      kickMembers: false,
      banMembers: false,
      createInvites: false,
      sendMessages: true,
      readHistory: true,
      mentionEveryone: false,
    },
  },
];

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
 * Check if user can manage a role
 */
function canManageRole(userPowerLevel: number, targetRolePowerLevel: number): boolean {
  return userPowerLevel > targetRolePowerLevel;
}

/**
 * Format permission count for display
 */
function getPermissionSummary(permissions: RolePermissions): string {
  const enabledCount = Object.values(permissions).filter(Boolean).length;
  const totalCount = Object.keys(permissions).length;
  return `${enabledCount}/${totalCount} permissions`;
}

// =============================================================================
// Components
// =============================================================================

/**
 * Individual role item with drag-and-drop support
 */
interface RoleItemProps {
  role: MatrixRole;
  canManage: boolean;
  isDragging: boolean;
  onDragStart: (e: DragEvent<HTMLDivElement>, role: MatrixRole) => void;
  onDragEnd: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function RoleItem({
  role,
  canManage,
  isDragging,
  onDragStart,
  onDragEnd,
  onEdit,
  onDelete,
  onDuplicate,
}: RoleItemProps) {
  const Icon = getRoleIcon(role.powerLevel);
  const permissionSummary = getPermissionSummary(role.permissions);

  return (
    <div
      draggable={canManage && !role.isDefault}
      onDragStart={(e) => onDragStart(e, role)}
      onDragEnd={onDragEnd}
      className={cn(
        "group flex items-center gap-3 p-3 rounded-lg border bg-[#2B2D31] border-zinc-700 transition-all duration-200",
        isDragging && "opacity-50 rotate-2 scale-105",
        canManage && !role.isDefault && "hover:bg-[#35373C] cursor-move",
        !canManage && "opacity-75"
      )}
    >
      {/* Drag Handle */}
      {canManage && !role.isDefault && (
        <GripVertical className="h-4 w-4 text-zinc-500 group-hover:text-zinc-400" />
      )}

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
          <h3 className="font-semibold text-white text-sm truncate">
            {role.name}
          </h3>
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: role.color }}
          />
        </div>
        <div className="flex items-center gap-4 mt-1">
          <span className="text-xs text-zinc-400">
            {role.memberCount} members
          </span>
          <span className="text-xs text-zinc-400">
            {permissionSummary}
          </span>
          <span className="text-xs text-zinc-500">
            Power Level: {role.powerLevel}
          </span>
        </div>
      </div>

      {/* Role Actions */}
      {canManage && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-white"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Role
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            {!role.isDefault && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-red-400 focus:text-red-300"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Role
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function RoleManager({
  serverId,
  userPowerLevel,
  initialRoles = DEFAULT_ROLES,
  onRoleReorder,
  onRoleEdit,
  onRoleDelete,
  onRoleCreate,
}: RoleManagerProps) {
  const [roles, setRoles] = useState<MatrixRole[]>(
    () => initialRoles.sort((a, b) => b.position - a.position)
  );
  const [draggedRole, setDraggedRole] = useState<MatrixRole | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const canManageRoles = userPowerLevel >= 50; // Moderator+

  // Memoize sorted roles for performance
  const sortedRoles = useMemo(
    () => roles.sort((a, b) => b.position - a.position),
    [roles]
  );

  // =============================================================================
  // Drag & Drop Handlers
  // =============================================================================

  const handleDragStart = useCallback((e: DragEvent<HTMLDivElement>, role: MatrixRole) => {
    setDraggedRole(role);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedRole(null);
    setDragOverIndex(null);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>, index: number) => {
    if (!draggedRole) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  }, [draggedRole]);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    
    if (!draggedRole || draggedRole.isDefault) return;

    const dragIndex = roles.findIndex(r => r.id === draggedRole.id);
    if (dragIndex === -1 || dragIndex === dropIndex) return;

    // Create new roles array with reordered positions
    const newRoles = [...roles];
    const [draggedItem] = newRoles.splice(dragIndex, 1);
    newRoles.splice(dropIndex, 0, draggedItem);

    // Update positions based on new order
    const updatedRoles = newRoles.map((role, index) => ({
      ...role,
      position: newRoles.length - index,
    }));

    setRoles(updatedRoles);
    onRoleReorder?.(updatedRoles);
    
    setDraggedRole(null);
    setDragOverIndex(null);
  }, [roles, draggedRole, onRoleReorder]);

  // =============================================================================
  // Action Handlers
  // =============================================================================

  const handleRoleEdit = useCallback((role: MatrixRole) => {
    onRoleEdit?.(role);
  }, [onRoleEdit]);

  const handleRoleDelete = useCallback((role: MatrixRole) => {
    setRoles(prev => prev.filter(r => r.id !== role.id));
    onRoleDelete?.(role);
  }, [onRoleDelete]);

  const handleRoleDuplicate = useCallback((role: MatrixRole) => {
    const newRole: MatrixRole = {
      ...role,
      id: `${role.id}-copy`,
      name: `${role.name} Copy`,
      position: role.position + 0.5,
      isDefault: false,
      memberCount: 0,
    };
    setRoles(prev => [...prev, newRole]);
  }, []);

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Roles</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Manage server roles and permissions. Higher roles can manage lower roles.
          </p>
        </div>
        
        {canManageRoles && (
          <Button onClick={onRoleCreate} className="bg-indigo-500 hover:bg-indigo-600">
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        )}
      </div>

      {/* Role Hierarchy Indicator */}
      <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-800/50 p-3 rounded-lg">
        <Shield className="h-4 w-4" />
        <span>
          Roles are displayed from highest to lowest. Members inherit permissions from their highest role.
        </span>
      </div>

      {/* Role List */}
      <ScrollArea className="h-[600px]">
        <div className="space-y-2">
          {sortedRoles.map((role, index) => {
            const canManage = canManageRole(userPowerLevel, role.powerLevel);
            const isDragging = draggedRole?.id === role.id;
            
            return (
              <div
                key={role.id}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                className={cn(
                  "relative",
                  dragOverIndex === index && "border-t-2 border-indigo-500"
                )}
              >
                <RoleItem
                  role={role}
                  canManage={canManage}
                  isDragging={isDragging}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onEdit={() => handleRoleEdit(role)}
                  onDelete={() => handleRoleDelete(role)}
                  onDuplicate={() => handleRoleDuplicate(role)}
                />
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer Info */}
      <div className="text-xs text-zinc-500 bg-zinc-800/30 p-3 rounded-lg">
        <div className="flex items-start gap-2">
          <Settings className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium mb-1">Role Management Tips:</p>
            <ul className="space-y-1 list-disc list-inside ml-2">
              <li>Drag roles to reorder them (higher position = more authority)</li>
              <li>You can only manage roles below your own power level</li>
              <li>The @everyone role cannot be deleted or reordered</li>
              <li>Role colors and permissions are customizable</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoleManager;