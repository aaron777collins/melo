/**
 * Matrix Roles Service
 * 
 * Maps Matrix power levels to Discord-style roles for HAOS.
 * Provides utilities for creating, updating, and managing roles within Matrix spaces.
 */

import {  MatrixClient  } from "@/lib/matrix/matrix-sdk-exports";
import { getClient } from "./client";

// =============================================================================
// Types
// =============================================================================

/**
 * Role creation data
 */
export interface CreateRoleData {
  /** Role display name */
  name: string;
  /** Role color (hex code) */
  color: string;
  /** Role icon identifier */
  icon: RoleIcon;
  /** Matrix power level (0-100) */
  powerLevel: number;
  /** Whether role should be displayed separately in member list */
  isHoist?: boolean;
  /** Whether role is mentionable */
  isMentionable?: boolean;
  /** Granular permissions (optional - will use template if not provided) */
  permissions?: import('./permissions').HaosPermissions;
}

/**
 * Available role icons
 */
export type RoleIcon = "crown" | "hammer" | "shield" | "users";

/**
 * Role permission template
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

/**
 * Matrix power level event content
 */
interface PowerLevelsContent {
  ban?: number;
  kick?: number;
  redact?: number;
  invite?: number;
  events_default?: number;
  state_default?: number;
  users_default?: number;
  events?: Record<string, number>;
  users?: Record<string, number>;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default power level mappings for Matrix
 */
export const MATRIX_POWER_LEVELS = {
  /** Full admin access */
  ADMIN: 100,
  /** Moderator access */
  MODERATOR: 50,
  /** Regular member */
  MEMBER: 0,
} as const;

/**
 * Role permission templates by power level
 */
export const ROLE_PERMISSION_TEMPLATES: Record<number, RolePermissions> = {
  100: { // Admin
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
  50: { // Moderator
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
  0: { // Member
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
};

/**
 * Default role colors by power level
 */
export const DEFAULT_ROLE_COLORS: Record<number, string> = {
  100: "#f04747", // Red for Admin
  50: "#7289da",  // Blurple for Moderator
  25: "#43b581",  // Green for Helper
  0: "#99aab5",   // Gray for Member
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get the closest power level template for a given value
 */
export function getClosestPermissionTemplate(powerLevel: number): RolePermissions {
  const levels = Object.keys(ROLE_PERMISSION_TEMPLATES)
    .map(Number)
    .sort((a, b) => b - a); // Sort descending

  for (const level of levels) {
    if (powerLevel >= level) {
      return ROLE_PERMISSION_TEMPLATES[level];
    }
  }

  // Fallback to lowest level
  return ROLE_PERMISSION_TEMPLATES[0];
}

/**
 * Get default color for a power level
 */
export function getDefaultColorForPowerLevel(powerLevel: number): string {
  if (powerLevel >= 100) return DEFAULT_ROLE_COLORS[100];
  if (powerLevel >= 50) return DEFAULT_ROLE_COLORS[50];
  if (powerLevel >= 25) return DEFAULT_ROLE_COLORS[25];
  return DEFAULT_ROLE_COLORS[0];
}

/**
 * Validate role name
 */
export function validateRoleName(name: string): { isValid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: "Role name cannot be empty" };
  }

  if (name.trim().length > 32) {
    return { isValid: false, error: "Role name cannot exceed 32 characters" };
  }

  if (name.includes("@")) {
    return { isValid: false, error: "Role name cannot contain @ symbol" };
  }

  return { isValid: true };
}

/**
 * Validate power level
 */
export function validatePowerLevel(
  powerLevel: number, 
  userPowerLevel: number
): { isValid: boolean; error?: string } {
  if (powerLevel < 0 || powerLevel > 100) {
    return { isValid: false, error: "Power level must be between 0 and 100" };
  }

  if (powerLevel >= userPowerLevel) {
    return { 
      isValid: false, 
      error: "Cannot create role with power level equal to or higher than your own" 
    };
  }

  return { isValid: true };
}

// =============================================================================
// Matrix Integration Functions
// =============================================================================

/**
 * Get current power levels for a room
 */
export async function getRoomPowerLevels(roomId: string): Promise<PowerLevelsContent | null> {
  const client = getClient();
  if (!client) {
    throw new Error("Matrix client not initialized");
  }

  try {
    const powerLevelEvent = client.getRoom(roomId)?.currentState.getStateEvents("m.room.power_levels", "");
    return (powerLevelEvent?.getContent() as PowerLevelsContent) || null;
  } catch (error) {
    console.error("Failed to get power levels:", error);
    return null;
  }
}

/**
 * Set power level for a user in a room
 */
export async function setUserPowerLevel(
  roomId: string, 
  userId: string, 
  powerLevel: number
): Promise<void> {
  const client = getClient();
  if (!client) {
    throw new Error("Matrix client not initialized");
  }

  try {
    const currentPowerLevels = await getRoomPowerLevels(roomId);
    
    const newPowerLevels = {
      ...currentPowerLevels,
      users: {
        ...currentPowerLevels?.users,
        [userId]: powerLevel,
      },
    };

    await client.sendStateEvent(roomId, "m.room.power_levels" as any, newPowerLevels, "");
    console.log(`Set power level ${powerLevel} for user ${userId} in room ${roomId}`);
  } catch (error) {
    console.error("Failed to set user power level:", error);
    throw error;
  }
}

/**
 * Update an existing custom role
 */
export async function updateCustomRole(
  roomId: string,
  roleId: string,
  updateData: Partial<CreateRoleData>
): Promise<void> {
  const client = getClient();
  if (!client) {
    throw new Error("Matrix client not initialized");
  }

  // Validate role name if provided
  if (updateData.name) {
    const nameValidation = validateRoleName(updateData.name);
    if (!nameValidation.isValid) {
      throw new Error(nameValidation.error);
    }
  }

  try {
    // Get existing custom roles
    const existingRoles = await getCustomRoles(roomId);
    const roleIndex = existingRoles.findIndex(role => role.id === roleId);
    
    if (roleIndex === -1) {
      throw new Error("Role not found");
    }

    const existingRole = existingRoles[roleIndex];

    // Check for duplicate names (excluding current role)
    if (updateData.name) {
      const duplicateName = existingRoles.find(
        role => role.id !== roleId && role.name.toLowerCase() === updateData.name!.toLowerCase()
      );
      if (duplicateName) {
        throw new Error("A role with this name already exists");
      }
    }

    // Update role metadata
    const updatedRole = {
      ...existingRole,
      ...updateData,
      id: roleId, // Ensure ID doesn't change
      isDefault: existingRole.isDefault, // Preserve default status
      updatedAt: new Date().toISOString(),
    };

    // Update roles array
    const updatedRoles = [...existingRoles];
    updatedRoles[roleIndex] = updatedRole;

    // Store updated roles in room account data
    await client.setRoomAccountData(roomId, "dev.haos.custom_roles", {
      version: "1.0.0",
      roles: updatedRoles,
    });

    // If power level changed, update all users with this role
    if (updateData.powerLevel !== undefined && updateData.powerLevel !== existingRole.powerLevel) {
      const powerLevels = await getRoomPowerLevels(roomId);
      if (powerLevels?.users) {
        // Find users with the old power level and update them
        const usersToUpdate = Object.entries(powerLevels.users).filter(
          ([userId, userPowerLevel]) => userPowerLevel === existingRole.powerLevel
        );

        for (const [userId] of usersToUpdate) {
          await setUserPowerLevel(roomId, userId, updateData.powerLevel);
        }
      }
    }

    console.log(`Updated role "${updateData.name || existingRole.name}" (${roleId}) in room ${roomId}`);
  } catch (error) {
    console.error("Failed to update custom role:", error);
    throw error;
  }
}

/**
 * Delete a custom role and handle users who had that role
 */
export async function deleteCustomRole(
  roomId: string,
  roleId: string
): Promise<void> {
  const client = getClient();
  if (!client) {
    throw new Error("Matrix client not initialized");
  }

  try {
    // Get existing custom roles
    const existingRoles = await getCustomRoles(roomId);
    const roleToDelete = existingRoles.find(role => role.id === roleId);
    
    if (!roleToDelete) {
      throw new Error("Role not found");
    }

    if (roleToDelete.isDefault) {
      throw new Error("Cannot delete default role");
    }

    // Get current power levels to find users with this role
    const powerLevels = await getRoomPowerLevels(roomId);
    if (powerLevels?.users) {
      // Find users with this role's power level and demote them to default (0)
      const usersToUpdate = Object.entries(powerLevels.users).filter(
        ([userId, userPowerLevel]) => userPowerLevel === roleToDelete.powerLevel
      );

      for (const [userId] of usersToUpdate) {
        await setUserPowerLevel(roomId, userId, 0); // Demote to default member level
      }
    }

    // Remove role from the roles array
    const updatedRoles = existingRoles.filter(role => role.id !== roleId);
    
    // Update position numbers to fill gaps
    const reorderedRoles = updatedRoles
      .sort((a, b) => b.position - a.position)
      .map((role, index) => ({
        ...role,
        position: updatedRoles.length - index,
      }));

    // Store updated roles in room account data
    await client.setRoomAccountData(roomId, "dev.haos.custom_roles", {
      version: "1.0.0",
      roles: reorderedRoles,
    });

    console.log(`Deleted role "${roleToDelete.name}" (${roleId}) from room ${roomId}`);
  } catch (error) {
    console.error("Failed to delete custom role:", error);
    throw error;
  }
}

/**
 * Reorder custom roles and update their positions
 */
export async function reorderCustomRoles(
  roomId: string,
  reorderedRoles: { id: string; position: number }[]
): Promise<void> {
  const client = getClient();
  if (!client) {
    throw new Error("Matrix client not initialized");
  }

  try {
    // Get existing custom roles
    const existingRoles = await getCustomRoles(roomId);
    
    // Update positions for each role
    const updatedRoles = existingRoles.map(role => {
      const newOrder = reorderedRoles.find(r => r.id === role.id);
      if (newOrder) {
        return { ...role, position: newOrder.position };
      }
      return role;
    });

    // Store updated roles in room account data
    await client.setRoomAccountData(roomId, "dev.haos.custom_roles", {
      version: "1.0.0",
      roles: updatedRoles,
    });

    console.log(`Reordered ${reorderedRoles.length} roles in room ${roomId}`);
  } catch (error) {
    console.error("Failed to reorder custom roles:", error);
    throw error;
  }
}

/**
 * Create a custom role by storing metadata in room account data
 * 
 * Since Matrix doesn't have built-in "roles" like Discord, we store
 * role metadata as custom room account data and map users to power levels.
 */
export async function createCustomRole(
  roomId: string,
  roleData: CreateRoleData
): Promise<string> {
  const client = getClient();
  if (!client) {
    throw new Error("Matrix client not initialized");
  }

  // Validate input
  const nameValidation = validateRoleName(roleData.name);
  if (!nameValidation.isValid) {
    throw new Error(nameValidation.error);
  }

  try {
    // Generate role ID
    const roleId = `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get existing custom roles
    const existingRoles = await getCustomRoles(roomId);
    
    // Check for duplicate names
    const duplicateName = existingRoles.find(
      role => role.name.toLowerCase() === roleData.name.toLowerCase()
    );
    if (duplicateName) {
      throw new Error("A role with this name already exists");
    }

    // Create role metadata
    const roleMetadata = {
      id: roleId,
      name: roleData.name,
      color: roleData.color,
      icon: roleData.icon,
      powerLevel: roleData.powerLevel,
      isHoist: roleData.isHoist ?? true,
      isMentionable: roleData.isMentionable ?? true,
      memberCount: 0,
      position: existingRoles.length + 1,
      isDefault: false,
      permissions: roleData.permissions || getClosestPermissionTemplate(roleData.powerLevel),
      createdAt: new Date().toISOString(),
    };

    // Store in room account data
    const updatedRoles = [...existingRoles, roleMetadata];
    await client.setRoomAccountData(roomId, "dev.haos.custom_roles", {
      version: "1.0.0",
      roles: updatedRoles,
    });

    console.log(`Created custom role "${roleData.name}" (${roleId}) in room ${roomId}`);
    return roleId;
  } catch (error) {
    console.error("Failed to create custom role:", error);
    throw error;
  }
}

/**
 * Get custom roles for a room
 */
export async function getCustomRoles(roomId: string): Promise<any[]> {
  const client = getClient();
  if (!client) {
    throw new Error("Matrix client not initialized");
  }

  try {
    const room = client.getRoom(roomId);
    const roleData = room?.getAccountData("dev.haos.custom_roles");
    return roleData?.getContent()?.roles || [];
  } catch (error) {
    console.error("Failed to get custom roles:", error);
    return [];
  }
}

/**
 * Assign a role (power level) to a user
 */
export async function assignRoleToUser(
  roomId: string,
  userId: string,
  roleId: string
): Promise<void> {
  const client = getClient();
  if (!client) {
    throw new Error("Matrix client not initialized");
  }

  try {
    // Get role data to find power level
    const customRoles = await getCustomRoles(roomId);
    const role = customRoles.find(r => r.id === roleId);
    
    if (!role) {
      throw new Error("Role not found");
    }

    // Set the user's power level
    await setUserPowerLevel(roomId, userId, role.powerLevel);

    // Update role member count
    role.memberCount = (role.memberCount || 0) + 1;
    const updatedRoles = customRoles.map(r => r.id === roleId ? role : r);
    
    await client.setRoomAccountData(roomId, "dev.haos.custom_roles", {
      version: "1.0.0",
      roles: updatedRoles,
    });

    console.log(`Assigned role "${role.name}" to user ${userId} in room ${roomId}`);
  } catch (error) {
    console.error("Failed to assign role to user:", error);
    throw error;
  }
}

/**
 * Check if user can manage roles in a room
 */
export async function canManageRoles(roomId: string, userId: string): Promise<boolean> {
  const client = getClient();
  if (!client) {
    return false;
  }

  try {
    const room = client.getRoom(roomId);
    if (!room) return false;

    const powerLevelEvent = room.currentState.getStateEvents("m.room.power_levels", "");
    const powerLevels = powerLevelEvent?.getContent();
    
    const userPowerLevel = powerLevels?.users?.[userId] || powerLevels?.users_default || 0;
    const requiredLevel = powerLevels?.events?.["m.room.power_levels"] || 50;
    
    return userPowerLevel >= requiredLevel;
  } catch (error) {
    console.error("Failed to check role management permissions:", error);
    return false;
  }
}

const rolesService = {
  createCustomRole,
  updateCustomRole,
  deleteCustomRole,
  reorderCustomRoles,
  getCustomRoles,
  assignRoleToUser,
  setUserPowerLevel,
  getRoomPowerLevels,
  canManageRoles,
  validateRoleName,
  validatePowerLevel,
  getClosestPermissionTemplate,
  getDefaultColorForPowerLevel,
  MATRIX_POWER_LEVELS,
  ROLE_PERMISSION_TEMPLATES,
  DEFAULT_ROLE_COLORS,
};

export default rolesService;