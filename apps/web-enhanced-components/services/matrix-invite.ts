/**
 * Matrix Invite Service
 *
 * Service layer for managing Matrix space invitations.
 * Provides operations to create, redeem, and manage invite links.
 */

import { Room } from "matrix-js-sdk";
import { getClient } from "../../../lib/matrix/client";
import { type MatrixSpace } from "../../../lib/matrix/types/space";

// =============================================================================
// Types
// =============================================================================

/**
 * Information about an invite
 */
export interface InviteInfo {
  /** Unique invite code */
  code: string;
  /** ID of the space this invite is for */
  spaceId: string;
  /** Name of the space */
  spaceName: string;
  /** Avatar URL of the space */
  spaceAvatarUrl: string | null;
  /** User ID who created the invite */
  createdBy: string;
  /** Display name of the creator */
  createdByName: string;
  /** ISO timestamp when invite was created */
  createdAt: string;
  /** Maximum number of uses (null = unlimited) */
  maxUses: number | null;
  /** Current number of uses */
  currentUses: number;
  /** Whether this invite is still active */
  isActive: boolean;
  /** List of user IDs who have used this invite */
  usedBy: string[];
}

/**
 * Stored invite metadata in Matrix state event
 */
interface InviteMetadata {
  /** Unique invite code */
  code: string;
  /** User ID who created the invite */
  createdBy: string;
  /** ISO timestamp when invite was created */
  createdAt: string;
  /** Maximum number of uses (null = unlimited) */
  maxUses: number | null;
  /** Current number of uses */
  currentUses: number;
  /** Whether this invite is still active */
  isActive: boolean;
  /** List of user IDs who have used this invite */
  usedBy: string[];
}

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Custom error class for Invite Service operations
 */
export class InviteServiceError extends Error {
  public readonly code: string;
  public readonly httpStatus?: number;

  constructor(message: string, code = 'INVITE_ERROR', httpStatus?: number) {
    super(message);
    this.name = 'InviteServiceError';
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
    throw new InviteServiceError('Matrix client not initialized', 'CLIENT_NOT_READY');
  }
  return client;
}

/**
 * Generate a short, URL-safe invite code
 */
function generateInviteCode(): string {
  // Use crypto for secure random generation
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }
  return result;
}

/**
 * Validate that a room is actually a space
 */
function validateSpaceRoom(room: Room) {
  const creationEvent = room.currentState.getStateEvents('m.room.create', '');
  const roomType = creationEvent?.getContent()?.type;
  
  if (roomType !== 'm.space') {
    throw new InviteServiceError(
      `Room ${room.roomId} is not a space (type: ${roomType})`,
      'INVALID_SPACE_TYPE'
    );
  }
}

/**
 * Check if user has permission to create invites for a space
 */
function checkInvitePermission(room: Room, client: any) {
  const myUserId = client.getUserId();
  const powerLevelsEvent = room.currentState.getStateEvents('m.room.power_levels', '');
  const powerLevels = powerLevelsEvent?.getContent() || {};
  const myPowerLevel = powerLevels.users?.[myUserId!] || powerLevels.users_default || 0;
  
  // Require at least moderator level (50) to create invites
  if (myPowerLevel < 50) {
    throw new InviteServiceError(
      'Insufficient permissions to create invite',
      'INSUFFICIENT_PERMISSIONS',
      403
    );
  }
}

/**
 * Convert room to MatrixSpace object (simplified version of matrix-space.ts)
 */
function roomToSpace(room: Room): MatrixSpace {
  const client = getMatrixClient();
  const myUserId = client.getUserId();
  
  const nameEvent = room.currentState.getStateEvents('m.room.name', '');
  const topicEvent = room.currentState.getStateEvents('m.room.topic', '');
  const avatarEvent = room.currentState.getStateEvents('m.room.avatar', '');
  const powerLevelsEvent = room.currentState.getStateEvents('m.room.power_levels', '');
  const joinRulesEvent = room.currentState.getStateEvents('m.room.join_rules', '');
  const canonicalAliasEvent = room.currentState.getStateEvents('m.room.canonical_alias', '');
  
  const name = nameEvent?.getContent()?.name || room.name || 'Unnamed Space';
  const topic = topicEvent?.getContent()?.topic || null;
  const avatarUrl = avatarEvent?.getContent()?.url || null;
  
  const joinRuleContent = joinRulesEvent?.getContent()?.join_rule || 'invite';
  const joinRule = ['public', 'invite', 'knock', 'restricted'].includes(joinRuleContent) 
    ? joinRuleContent as any
    : 'invite';
  
  const powerLevels = powerLevelsEvent?.getContent() || {};
  const currentUserPowerLevel = powerLevels.users?.[myUserId!] || powerLevels.users_default || 0;
  const isOwner = currentUserPowerLevel >= 100;
  
  const canonicalAlias = canonicalAliasEvent?.getContent()?.alias || null;
  
  const childRoomIds: string[] = [];
  const childEvents = room.currentState.getStateEvents('m.space.child');
  for (const event of childEvents) {
    const childRoomId = event.getStateKey();
    if (childRoomId && event.getContent()?.via) {
      childRoomIds.push(childRoomId);
    }
  }
  
  const memberCount = room.getJoinedMemberCount();
  const unreadNotifications = room.getUnreadNotificationCount();
  const hasUnread = unreadNotifications > 0;
  const unreadMentionCount = room.getUnreadNotificationCount() || 0;
  
  return {
    id: room.roomId,
    name,
    avatarUrl,
    topic,
    memberCount,
    isOwner,
    childRoomIds,
    joinRule,
    canonicalAlias,
    currentUserPowerLevel,
    hasUnread,
    unreadMentionCount,
  };
}

// =============================================================================
// Invite Operations
// =============================================================================

/**
 * Create a new invite link for a space
 */
export async function createInviteLink(
  spaceId: string, 
  maxUses?: number
): Promise<string> {
  const client = getMatrixClient();
  
  try {
    // Validate space exists
    const space = client.getRoom(spaceId);
    if (!space) {
      throw new InviteServiceError(`Space not found: ${spaceId}`, 'SPACE_NOT_FOUND', 404);
    }
    
    // Validate it's actually a space
    validateSpaceRoom(space);
    
    // Check permissions
    checkInvitePermission(space, client);
    
    // Generate unique invite code
    let inviteCode: string;
    let attempts = 0;
    do {
      inviteCode = generateInviteCode();
      attempts++;
      
      // Check if code already exists
      const existingEvent = space.currentState.getStateEvents('io.haos.invite', inviteCode);
      if (!existingEvent || !existingEvent.getContent()?.isActive) {
        break; // Code is available
      }
      
      if (attempts > 10) {
        throw new InviteServiceError('Failed to generate unique invite code', 'CODE_GENERATION_FAILED');
      }
    } while (true);
    
    // Create invite metadata
    const inviteMetadata: InviteMetadata = {
      code: inviteCode,
      createdBy: client.getUserId()!,
      createdAt: new Date().toISOString(),
      maxUses: maxUses || null,
      currentUses: 0,
      isActive: true,
      usedBy: []
    };
    
    // Store invite as state event
    await client.sendStateEvent(
      spaceId,
      'io.haos.invite' as any,
      inviteMetadata,
      inviteCode
    );
    
    return inviteCode;
    
  } catch (error) {
    if (error instanceof InviteServiceError) {
      throw error;
    }
    throw new InviteServiceError(
      `Failed to create invite: ${error instanceof Error ? error.message : String(error)}`,
      'CREATE_FAILED'
    );
  }
}

/**
 * Get information about an invite
 */
export async function getInviteInfo(inviteCode: string): Promise<InviteInfo> {
  const client = getMatrixClient();
  
  try {
    // Search all spaces for this invite code
    const rooms = client.getRooms();
    let inviteSpace: Room | null = null;
    let inviteMetadata: InviteMetadata | null = null;
    
    for (const room of rooms) {
      // Skip non-spaces
      const creationEvent = room.currentState.getStateEvents('m.room.create', '');
      if (creationEvent?.getContent()?.type !== 'm.space') {
        continue;
      }
      
      // Check for invite with this code
      const inviteEvent = room.currentState.getStateEvents('io.haos.invite', inviteCode);
      if (inviteEvent && inviteEvent.getContent()) {
        inviteSpace = room;
        inviteMetadata = inviteEvent.getContent() as InviteMetadata;
        break;
      }
    }
    
    if (!inviteSpace || !inviteMetadata) {
      throw new InviteServiceError(`Invite not found: ${inviteCode}`, 'INVITE_NOT_FOUND', 404);
    }
    
    // Get creator's display name
    const createdByMember = inviteSpace.getMember(inviteMetadata.createdBy);
    const createdByName = createdByMember?.name || inviteMetadata.createdBy;
    
    // Get space info
    const nameEvent = inviteSpace.currentState.getStateEvents('m.room.name', '');
    const avatarEvent = inviteSpace.currentState.getStateEvents('m.room.avatar', '');
    
    const spaceName = nameEvent?.getContent()?.name || inviteSpace.name || 'Unnamed Space';
    const spaceAvatarUrl = avatarEvent?.getContent()?.url || null;
    
    return {
      code: inviteMetadata.code,
      spaceId: inviteSpace.roomId,
      spaceName,
      spaceAvatarUrl,
      createdBy: inviteMetadata.createdBy,
      createdByName,
      createdAt: inviteMetadata.createdAt,
      maxUses: inviteMetadata.maxUses,
      currentUses: inviteMetadata.currentUses,
      isActive: inviteMetadata.isActive,
      usedBy: inviteMetadata.usedBy
    };
    
  } catch (error) {
    if (error instanceof InviteServiceError) {
      throw error;
    }
    throw new InviteServiceError(
      `Failed to get invite info: ${error instanceof Error ? error.message : String(error)}`,
      'GET_INFO_FAILED'
    );
  }
}

/**
 * Redeem an invite code and join the space
 */
export async function redeemInvite(inviteCode: string): Promise<MatrixSpace> {
  const client = getMatrixClient();
  const myUserId = client.getUserId()!;
  
  try {
    // Get invite info
    const inviteInfo = await getInviteInfo(inviteCode);
    
    // Check if invite is still active
    if (!inviteInfo.isActive) {
      throw new InviteServiceError('Invite has been revoked', 'INVITE_REVOKED', 410);
    }
    
    // Check if user already used this invite
    if (inviteInfo.usedBy.includes(myUserId)) {
      throw new InviteServiceError('You have already used this invite', 'ALREADY_USED', 409);
    }
    
    // Check if max uses reached
    if (inviteInfo.maxUses !== null && inviteInfo.currentUses >= inviteInfo.maxUses) {
      throw new InviteServiceError('Invite has reached maximum uses', 'MAX_USES_REACHED', 410);
    }
    
    // Check if user is already in the space
    const space = client.getRoom(inviteInfo.spaceId);
    if (space && space.hasMembershipState(myUserId, 'join')) {
      throw new InviteServiceError('You are already a member of this space', 'ALREADY_MEMBER', 409);
    }
    
    // Join the space
    await client.joinRoom(inviteInfo.spaceId);
    
    // Wait for the room to be available locally
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new InviteServiceError('Join operation timed out', 'JOIN_TIMEOUT'));
      }, 10000);
      
      const checkRoom = () => {
        const room = client.getRoom(inviteInfo.spaceId);
        if (room && room.hasMembershipState(myUserId, 'join')) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkRoom, 100);
        }
      };
      
      checkRoom();
    });
    
    // Update invite usage count
    const joinedSpace = client.getRoom(inviteInfo.spaceId);
    if (joinedSpace) {
      const inviteEvent = joinedSpace.currentState.getStateEvents('io.haos.invite', inviteCode);
      if (inviteEvent) {
        const metadata = inviteEvent.getContent() as InviteMetadata;
        const updatedMetadata: InviteMetadata = {
          ...metadata,
          currentUses: metadata.currentUses + 1,
          usedBy: [...metadata.usedBy, myUserId]
        };
        
        await client.sendStateEvent(
          inviteInfo.spaceId,
          'io.haos.invite' as any,
          updatedMetadata,
          inviteCode
        );
      }
    }
    
    // Return the space object
    const finalSpace = client.getRoom(inviteInfo.spaceId);
    if (!finalSpace) {
      throw new InviteServiceError('Failed to retrieve joined space', 'JOIN_FAILED');
    }
    
    return roomToSpace(finalSpace);
    
  } catch (error) {
    if (error instanceof InviteServiceError) {
      throw error;
    }
    throw new InviteServiceError(
      `Failed to redeem invite: ${error instanceof Error ? error.message : String(error)}`,
      'REDEEM_FAILED'
    );
  }
}

/**
 * Revoke an invite (mark it as inactive)
 */
export async function revokeInvite(inviteCode: string): Promise<void> {
  const client = getMatrixClient();
  
  try {
    // Get invite info to find which space it belongs to
    const inviteInfo = await getInviteInfo(inviteCode);
    
    // Get the space
    const space = client.getRoom(inviteInfo.spaceId);
    if (!space) {
      throw new InviteServiceError(`Space not found: ${inviteInfo.spaceId}`, 'SPACE_NOT_FOUND', 404);
    }
    
    // Check permissions - only creator or admin can revoke
    const myUserId = client.getUserId()!;
    const powerLevelsEvent = space.currentState.getStateEvents('m.room.power_levels', '');
    const powerLevels = powerLevelsEvent?.getContent() || {};
    const myPowerLevel = powerLevels.users?.[myUserId] || powerLevels.users_default || 0;
    
    const isCreator = inviteInfo.createdBy === myUserId;
    const isAdmin = myPowerLevel >= 50;
    
    if (!isCreator && !isAdmin) {
      throw new InviteServiceError(
        'Insufficient permissions to revoke invite',
        'INSUFFICIENT_PERMISSIONS',
        403
      );
    }
    
    // Get current invite metadata
    const inviteEvent = space.currentState.getStateEvents('io.haos.invite', inviteCode);
    if (!inviteEvent) {
      throw new InviteServiceError(`Invite not found: ${inviteCode}`, 'INVITE_NOT_FOUND', 404);
    }
    
    const metadata = inviteEvent.getContent() as InviteMetadata;
    const updatedMetadata: InviteMetadata = {
      ...metadata,
      isActive: false
    };
    
    // Update the invite to mark it as inactive
    await client.sendStateEvent(
      inviteInfo.spaceId,
      'io.haos.invite' as any,
      updatedMetadata,
      inviteCode
    );
    
  } catch (error) {
    if (error instanceof InviteServiceError) {
      throw error;
    }
    throw new InviteServiceError(
      `Failed to revoke invite: ${error instanceof Error ? error.message : String(error)}`,
      'REVOKE_FAILED'
    );
  }
}

// =============================================================================
// Additional Utility Functions
// =============================================================================

/**
 * Get all active invites for a space (admin function)
 */
export async function getSpaceInvites(spaceId: string): Promise<InviteInfo[]> {
  const client = getMatrixClient();
  
  try {
    const space = client.getRoom(spaceId);
    if (!space) {
      throw new InviteServiceError(`Space not found: ${spaceId}`, 'SPACE_NOT_FOUND', 404);
    }
    
    validateSpaceRoom(space);
    checkInvitePermission(space, client);
    
    // Get all invite events
    const inviteEvents = space.currentState.getStateEvents('io.haos.invite');
    const invites: InviteInfo[] = [];
    
    for (const event of inviteEvents) {
      const metadata = event.getContent() as InviteMetadata;
      if (!metadata || !metadata.code) continue;
      
      const createdByMember = space.getMember(metadata.createdBy);
      const createdByName = createdByMember?.name || metadata.createdBy;
      
      const nameEvent = space.currentState.getStateEvents('m.room.name', '');
      const avatarEvent = space.currentState.getStateEvents('m.room.avatar', '');
      
      const spaceName = nameEvent?.getContent()?.name || space.name || 'Unnamed Space';
      const spaceAvatarUrl = avatarEvent?.getContent()?.url || null;
      
      invites.push({
        code: metadata.code,
        spaceId: space.roomId,
        spaceName,
        spaceAvatarUrl,
        createdBy: metadata.createdBy,
        createdByName,
        createdAt: metadata.createdAt,
        maxUses: metadata.maxUses,
        currentUses: metadata.currentUses,
        isActive: metadata.isActive,
        usedBy: metadata.usedBy
      });
    }
    
    // Sort by creation date (newest first)
    invites.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return invites;
    
  } catch (error) {
    if (error instanceof InviteServiceError) {
      throw error;
    }
    throw new InviteServiceError(
      `Failed to get space invites: ${error instanceof Error ? error.message : String(error)}`,
      'GET_SPACE_INVITES_FAILED'
    );
  }
}

// =============================================================================
// Exports
// =============================================================================

export {
  type InviteMetadata
};