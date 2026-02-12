/**
 * Matrix Member Service
 *
 * Service layer for Matrix room membership operations.
 * Provides member management, moderation actions, and power level control
 * with full Matrix SDK integration.
 */

import { Room, RoomMember, RoomMemberEvent } from "matrix-js-sdk";
import { getClient } from "../../../lib/matrix/client";

// =============================================================================
// Types
// =============================================================================

/**
 * Member role mapping from Discord-style roles to Matrix power levels
 */
export type MemberRole = 
  | 'owner'        // 100 - Full admin (can delete room, change power levels)
  | 'admin'        // 75  - High admin (can manage most settings)
  | 'moderator'    // 50  - Mod (can kick/ban, invite)
  | 'member'       // 0   - Regular member
  | 'restricted';  // -1  - Restricted member (limited permissions)

/**
 * Member information interface
 */
export interface Member {
  /** User ID (e.g., "@user:example.com") */
  userId: string;
  /** Display name in the room */
  displayName: string | null;
  /** Avatar URL (MXC format) */
  avatarUrl: string | null;
  /** Member's power level in this room */
  powerLevel: number;
  /** Simplified role based on power level */
  role: MemberRole;
  /** Membership state (join, invite, leave, ban, knock) */
  membership: string;
  /** Whether this member is currently online (based on presence) */
  isOnline: boolean;
  /** Last time this member was active (if available) */
  lastActiveAt: Date | null;
  /** Whether this member is typing in the room */
  isTyping: boolean;
  /** When the user joined the room */
  joinedAt: Date | null;
}

/**
 * Power level constants matching Discord hierarchy
 */
export const POWER_LEVELS = {
  OWNER: 100,
  ADMIN: 75,
  MODERATOR: 50,
  MEMBER: 0,
  RESTRICTED: -1,
} as const;

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Custom error class for Member Service operations
 */
export class MemberServiceError extends Error {
  public readonly code: string;
  public readonly httpStatus?: number;

  constructor(message: string, code = 'MEMBER_ERROR', httpStatus?: number) {
    super(message);
    this.name = 'MemberServiceError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get the Matrix client instance and validate it's ready
 */
function getMatrixClient() {
  const client = getClient();
  if (!client) {
    throw new MemberServiceError('Matrix client not initialized', 'CLIENT_NOT_READY');
  }
  return client;
}

/**
 * Map power level to Discord-style role
 */
export function powerLevelToRole(powerLevel: number): MemberRole {
  if (powerLevel >= POWER_LEVELS.OWNER) return 'owner';
  if (powerLevel >= POWER_LEVELS.ADMIN) return 'admin';
  if (powerLevel >= POWER_LEVELS.MODERATOR) return 'moderator';
  if (powerLevel >= POWER_LEVELS.MEMBER) return 'member';
  return 'restricted';
}

/**
 * Map Discord-style role to power level
 */
export function roleToPowerLevel(role: MemberRole): number {
  switch (role) {
    case 'owner': return POWER_LEVELS.OWNER;
    case 'admin': return POWER_LEVELS.ADMIN;
    case 'moderator': return POWER_LEVELS.MODERATOR;
    case 'member': return POWER_LEVELS.MEMBER;
    case 'restricted': return POWER_LEVELS.RESTRICTED;
    default: return POWER_LEVELS.MEMBER;
  }
}

/**
 * Convert Matrix RoomMember to Member interface
 */
function roomMemberToMember(roomMember: RoomMember, room: Room): Member {
  const client = getMatrixClient();
  
  // Get power levels from room state
  const powerLevelsEvent = room.currentState.getStateEvents('m.room.power_levels', '');
  const powerLevels = powerLevelsEvent?.getContent() || {};
  const memberPowerLevel = powerLevels.users?.[roomMember.userId] || powerLevels.users_default || 0;
  
  // Get typing status
  const typingUsers = room.currentState.getTypingUsers();
  const isTyping = typingUsers.includes(roomMember.userId);
  
  // Get presence information if available
  const user = client.getUser(roomMember.userId);
  const presenceState = user?.presence;
  const isOnline = presenceState === 'online' || presenceState === 'unavailable';
  const lastActiveAt = user?.lastActiveAgo ? new Date(Date.now() - user.lastActiveAgo) : null;
  
  // Get join timestamp from room member events
  const membershipEvent = room.currentState.getStateEvents('m.room.member', roomMember.userId);
  const joinedAt = membershipEvent?.getTs() ? new Date(membershipEvent.getTs()) : null;
  
  return {
    userId: roomMember.userId,
    displayName: roomMember.name,
    avatarUrl: roomMember.getAvatarUrl(
      client.baseUrl,
      64, 64, 'crop'
    ) || null,
    powerLevel: memberPowerLevel,
    role: powerLevelToRole(memberPowerLevel),
    membership: roomMember.membership,
    isOnline,
    lastActiveAt,
    isTyping,
    joinedAt,
  };
}

/**
 * Validate room exists and current user has permissions
 */
function validateRoom(roomId: string): Room {
  const client = getMatrixClient();
  
  const room = client.getRoom(roomId);
  if (!room) {
    throw new MemberServiceError(`Room not found: ${roomId}`, 'ROOM_NOT_FOUND', 404);
  }
  
  return room;
}

/**
 * Check if current user has sufficient power level for an action
 */
function validatePermissions(
  room: Room, 
  requiredLevel: number,
  action: string
): void {
  const client = getMatrixClient();
  const myUserId = client.getUserId();
  
  if (!myUserId) {
    throw new MemberServiceError('Unable to determine current user', 'AUTH_ERROR');
  }
  
  const powerLevelsEvent = room.currentState.getStateEvents('m.room.power_levels', '');
  const powerLevels = powerLevelsEvent?.getContent() || {};
  const myPowerLevel = powerLevels.users?.[myUserId] || powerLevels.users_default || 0;
  
  if (myPowerLevel < requiredLevel) {
    throw new MemberServiceError(
      `Insufficient permissions for ${action}. Required: ${requiredLevel}, Current: ${myPowerLevel}`,
      'INSUFFICIENT_PERMISSIONS',
      403
    );
  }
}

// =============================================================================
// Member Operations
// =============================================================================

/**
 * Get all members of a room
 */
export async function getMembers(roomId: string): Promise<Member[]> {
  try {
    const room = validateRoom(roomId);
    
    // Get all room members
    const roomMembers = room.getMembers();
    
    // Filter to joined members only (exclude invited, left, banned)
    const joinedMembers = roomMembers.filter(member => member.membership === 'join');
    
    // Convert to Member interface
    const members = joinedMembers.map(roomMember => roomMemberToMember(roomMember, room));
    
    // Sort by power level (descending), then by display name
    members.sort((a, b) => {
      if (a.powerLevel !== b.powerLevel) {
        return b.powerLevel - a.powerLevel;
      }
      const nameA = a.displayName || a.userId;
      const nameB = b.displayName || b.userId;
      return nameA.localeCompare(nameB);
    });
    
    return members;
    
  } catch (error) {
    if (error instanceof MemberServiceError) {
      throw error;
    }
    throw new MemberServiceError(
      `Failed to get members: ${error instanceof Error ? error.message : String(error)}`,
      'GET_MEMBERS_FAILED'
    );
  }
}

/**
 * Invite a user to the room
 */
export async function inviteMember(roomId: string, userId: string): Promise<void> {
  try {
    const room = validateRoom(roomId);
    
    // Check if user has invite permission (usually 50 for moderators)
    const powerLevelsEvent = room.currentState.getStateEvents('m.room.power_levels', '');
    const powerLevels = powerLevelsEvent?.getContent() || {};
    const inviteLevel = powerLevels.invite || 50;
    
    validatePermissions(room, inviteLevel, 'invite');
    
    const client = getMatrixClient();
    await client.invite(roomId, userId);
    
  } catch (error) {
    if (error instanceof MemberServiceError) {
      throw error;
    }
    throw new MemberServiceError(
      `Failed to invite member: ${error instanceof Error ? error.message : String(error)}`,
      'INVITE_FAILED'
    );
  }
}

/**
 * Kick (remove) a user from the room
 */
export async function kickMember(
  roomId: string, 
  userId: string, 
  reason?: string
): Promise<void> {
  try {
    const room = validateRoom(roomId);
    
    // Check if user has kick permission (usually 50 for moderators)
    const powerLevelsEvent = room.currentState.getStateEvents('m.room.power_levels', '');
    const powerLevels = powerLevelsEvent?.getContent() || {};
    const kickLevel = powerLevels.kick || 50;
    
    validatePermissions(room, kickLevel, 'kick');
    
    // Check that target user's power level is lower than current user's
    const targetMember = room.getMember(userId);
    if (targetMember) {
      const targetPowerLevel = powerLevels.users?.[userId] || powerLevels.users_default || 0;
      const client = getMatrixClient();
      const myUserId = client.getUserId()!;
      const myPowerLevel = powerLevels.users?.[myUserId] || powerLevels.users_default || 0;
      
      if (targetPowerLevel >= myPowerLevel) {
        throw new MemberServiceError(
          'Cannot kick user with equal or higher power level',
          'INSUFFICIENT_POWER',
          403
        );
      }
    }
    
    const client = getMatrixClient();
    await client.kick(roomId, userId, reason || 'Removed from room');
    
  } catch (error) {
    if (error instanceof MemberServiceError) {
      throw error;
    }
    throw new MemberServiceError(
      `Failed to kick member: ${error instanceof Error ? error.message : String(error)}`,
      'KICK_FAILED'
    );
  }
}

/**
 * Ban a user from the room
 */
export async function banMember(
  roomId: string, 
  userId: string, 
  reason?: string
): Promise<void> {
  try {
    const room = validateRoom(roomId);
    
    // Check if user has ban permission (usually 50 for moderators)
    const powerLevelsEvent = room.currentState.getStateEvents('m.room.power_levels', '');
    const powerLevels = powerLevelsEvent?.getContent() || {};
    const banLevel = powerLevels.ban || 50;
    
    validatePermissions(room, banLevel, 'ban');
    
    // Check that target user's power level is lower than current user's
    const targetMember = room.getMember(userId);
    if (targetMember) {
      const targetPowerLevel = powerLevels.users?.[userId] || powerLevels.users_default || 0;
      const client = getMatrixClient();
      const myUserId = client.getUserId()!;
      const myPowerLevel = powerLevels.users?.[myUserId] || powerLevels.users_default || 0;
      
      if (targetPowerLevel >= myPowerLevel) {
        throw new MemberServiceError(
          'Cannot ban user with equal or higher power level',
          'INSUFFICIENT_POWER',
          403
        );
      }
    }
    
    const client = getMatrixClient();
    await client.ban(roomId, userId, reason || 'Banned from room');
    
  } catch (error) {
    if (error instanceof MemberServiceError) {
      throw error;
    }
    throw new MemberServiceError(
      `Failed to ban member: ${error instanceof Error ? error.message : String(error)}`,
      'BAN_FAILED'
    );
  }
}

/**
 * Unban (unban) a user from the room
 */
export async function unbanMember(roomId: string, userId: string): Promise<void> {
  try {
    const room = validateRoom(roomId);
    
    // Check if user has ban permission (needed to unban)
    const powerLevelsEvent = room.currentState.getStateEvents('m.room.power_levels', '');
    const powerLevels = powerLevelsEvent?.getContent() || {};
    const banLevel = powerLevels.ban || 50;
    
    validatePermissions(room, banLevel, 'unban');
    
    const client = getMatrixClient();
    await client.unban(roomId, userId);
    
  } catch (error) {
    if (error instanceof MemberServiceError) {
      throw error;
    }
    throw new MemberServiceError(
      `Failed to unban member: ${error instanceof Error ? error.message : String(error)}`,
      'UNBAN_FAILED'
    );
  }
}

/**
 * Set a user's power level in the room
 */
export async function setPowerLevel(
  roomId: string, 
  userId: string, 
  level: number
): Promise<void> {
  try {
    const room = validateRoom(roomId);
    
    // Check if user can modify power levels (usually requires 100)
    const powerLevelsEvent = room.currentState.getStateEvents('m.room.power_levels', '');
    const powerLevels = powerLevelsEvent?.getContent() || {};
    const powerLevelsRequiredLevel = powerLevels.events?.['m.room.power_levels'] || 100;
    
    validatePermissions(room, powerLevelsRequiredLevel, 'modify power levels');
    
    // Validate the new power level is not higher than current user's level
    const client = getMatrixClient();
    const myUserId = client.getUserId()!;
    const myPowerLevel = powerLevels.users?.[myUserId] || powerLevels.users_default || 0;
    
    if (level > myPowerLevel) {
      throw new MemberServiceError(
        'Cannot set power level higher than your own',
        'POWER_LEVEL_TOO_HIGH',
        400
      );
    }
    
    // Update power levels
    const newPowerLevels = {
      ...powerLevels,
      users: {
        ...powerLevels.users,
        [userId]: level
      }
    };
    
    await client.sendStateEvent(roomId, 'm.room.power_levels' as any, newPowerLevels, '');
    
  } catch (error) {
    if (error instanceof MemberServiceError) {
      throw error;
    }
    throw new MemberServiceError(
      `Failed to set power level: ${error instanceof Error ? error.message : String(error)}`,
      'SET_POWER_LEVEL_FAILED'
    );
  }
}

/**
 * Get the role of a specific member (synchronous helper)
 */
export function getMemberRole(roomId: string, userId: string): string {
  try {
    const room = validateRoom(roomId);
    
    const powerLevelsEvent = room.currentState.getStateEvents('m.room.power_levels', '');
    const powerLevels = powerLevelsEvent?.getContent() || {};
    const userPowerLevel = powerLevels.users?.[userId] || powerLevels.users_default || 0;
    
    return powerLevelToRole(userPowerLevel);
    
  } catch (error) {
    if (error instanceof MemberServiceError) {
      throw error;
    }
    throw new MemberServiceError(
      `Failed to get member role: ${error instanceof Error ? error.message : String(error)}`,
      'GET_ROLE_FAILED'
    );
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Get only online members
 */
export async function getOnlineMembers(roomId: string): Promise<Member[]> {
  const members = await getMembers(roomId);
  return members.filter(member => member.isOnline);
}

/**
 * Get members with specific role
 */
export async function getMembersByRole(roomId: string, role: MemberRole): Promise<Member[]> {
  const members = await getMembers(roomId);
  return members.filter(member => member.role === role);
}

/**
 * Check if user is admin or higher
 */
export function isUserAdmin(roomId: string, userId: string): boolean {
  const room = validateRoom(roomId);
  
  const powerLevelsEvent = room.currentState.getStateEvents('m.room.power_levels', '');
  const powerLevels = powerLevelsEvent?.getContent() || {};
  const userPowerLevel = powerLevels.users?.[userId] || powerLevels.users_default || 0;
  
  return userPowerLevel >= POWER_LEVELS.ADMIN;
}

/**
 * Check if user can moderate (moderator or higher)
 */
export function canUserModerate(roomId: string, userId: string): boolean {
  const room = validateRoom(roomId);
  
  const powerLevelsEvent = room.currentState.getStateEvents('m.room.power_levels', '');
  const powerLevels = powerLevelsEvent?.getContent() || {};
  const userPowerLevel = powerLevels.users?.[userId] || powerLevels.users_default || 0;
  
  return userPowerLevel >= POWER_LEVELS.MODERATOR;
}

// =============================================================================
// Type Re-Exports (for convenience)
// =============================================================================

export type { Room, RoomMember } from "matrix-js-sdk";