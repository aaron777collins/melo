/**
 * Matrix Space Service
 *
 * Service layer for Matrix space (server) operations.
 * Provides CRUD operations for spaces with full Matrix SDK integration.
 */

import { Room, Visibility, ICreateRoomOpts } from "matrix-js-sdk";
import { getClient } from "../../../lib/matrix/client";
import { 
  type MatrixSpace, 
  type SpaceJoinRule, 
  type SpaceChannel,
  mxcToHttp 
} from "../../../lib/matrix/types/space";

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Custom error class for Space Service operations
 */
export class SpaceServiceError extends Error {
  public readonly code: string;
  public readonly httpStatus?: number;

  constructor(message: string, code = 'SPACE_ERROR', httpStatus?: number) {
    super(message);
    this.name = 'SpaceServiceError';
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
    throw new SpaceServiceError('Matrix client not initialized', 'CLIENT_NOT_READY');
  }
  return client;
}

/**
 * Convert Matrix Room to MatrixSpace interface
 */
function roomToSpace(room: Room): MatrixSpace {
  const client = getMatrixClient();
  const myUserId = client.getUserId();
  
  // Get room state events
  const nameEvent = room.currentState.getStateEvents('m.room.name', '');
  const topicEvent = room.currentState.getStateEvents('m.room.topic', '');
  const avatarEvent = room.currentState.getStateEvents('m.room.avatar', '');
  const joinRulesEvent = room.currentState.getStateEvents('m.room.join_rules', '');
  const canonicalAliasEvent = room.currentState.getStateEvents('m.room.canonical_alias', '');
  const powerLevelsEvent = room.currentState.getStateEvents('m.room.power_levels', '');
  
  // Extract basic info
  const name = nameEvent?.getContent()?.name || room.name || 'Unnamed Space';
  const topic = topicEvent?.getContent()?.topic || null;
  const avatarUrl = avatarEvent?.getContent()?.url || null;
  
  // Join rule mapping
  const joinRuleContent = joinRulesEvent?.getContent()?.join_rule || 'invite';
  const joinRule: SpaceJoinRule = ['public', 'invite', 'knock', 'restricted'].includes(joinRuleContent) 
    ? joinRuleContent as SpaceJoinRule
    : 'invite';
  
  // Power levels and ownership
  const powerLevels = powerLevelsEvent?.getContent() || {};
  const currentUserPowerLevel = powerLevels.users?.[myUserId!] || powerLevels.users_default || 0;
  const isOwner = currentUserPowerLevel >= 100;
  
  // Canonical alias
  const canonicalAlias = canonicalAliasEvent?.getContent()?.alias || null;
  
  // Get child rooms (space children)
  const childRoomIds: string[] = [];
  const childEvents = room.currentState.getStateEvents('m.space.child');
  
  for (const event of childEvents) {
    const childRoomId = event.getStateKey();
    if (childRoomId && event.getContent()?.via) {
      childRoomIds.push(childRoomId);
    }
  }
  
  // Member count
  const memberCount = room.getJoinedMemberCount();
  
  // Unread status (simplified - would need more sophisticated logic)
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

/**
 * Validate that a room is actually a space
 */
function validateSpaceRoom(room: Room) {
  const creationEvent = room.currentState.getStateEvents('m.room.create', '');
  const roomType = creationEvent?.getContent()?.type;
  
  if (roomType !== 'm.space') {
    throw new SpaceServiceError(
      `Room ${room.roomId} is not a space (type: ${roomType})`,
      'INVALID_SPACE_TYPE'
    );
  }
}

// =============================================================================
// Space CRUD Operations
// =============================================================================

/**
 * Create a new Matrix space
 */
export async function createSpace(
  name: string, 
  avatar?: string
): Promise<MatrixSpace> {
  const client = getMatrixClient();
  
  try {
    const createOptions: ICreateRoomOpts = {
      name,
      visibility: Visibility.Private,
      room_version: '9', // Latest stable room version
      creation_content: {
        type: 'm.space' // Mark this as a space
      },
      initial_state: []
    };
    
    // Add avatar if provided
    if (avatar) {
      createOptions.initial_state!.push({
        type: 'm.room.avatar',
        state_key: '',
        content: {
          url: avatar
        }
      });
    }
    
    // Set default power levels for space management
    createOptions.initial_state!.push({
      type: 'm.room.power_levels',
      state_key: '',
      content: {
        users_default: 0,
        events_default: 0,
        state_default: 50,
        ban: 50,
        kick: 50,
        redact: 50,
        invite: 50,
        events: {
          'm.room.name': 50,
          'm.room.power_levels': 100,
          'm.room.history_visibility': 100,
          'm.room.canonical_alias': 50,
          'm.room.avatar': 50,
          'm.room.tombstone': 100,
          'm.room.server_acl': 100,
          'm.room.encryption': 100,
          'm.space.child': 50,
          'm.space.parent': 50
        }
      }
    });
    
    // Create the space
    const { room_id } = await client.createRoom(createOptions);
    
    // Get the created room
    const room = client.getRoom(room_id);
    if (!room) {
      throw new SpaceServiceError('Failed to retrieve created space', 'CREATION_FAILED');
    }
    
    // Wait for room to be ready and return as MatrixSpace
    return roomToSpace(room);
    
  } catch (error) {
    if (error instanceof SpaceServiceError) {
      throw error;
    }
    throw new SpaceServiceError(
      `Failed to create space: ${error instanceof Error ? error.message : String(error)}`,
      'CREATE_FAILED'
    );
  }
}

/**
 * Get space by ID
 */
export async function getSpace(spaceId: string): Promise<MatrixSpace> {
  const client = getMatrixClient();
  
  try {
    const room = client.getRoom(spaceId);
    if (!room) {
      throw new SpaceServiceError(`Space not found: ${spaceId}`, 'SPACE_NOT_FOUND', 404);
    }
    
    validateSpaceRoom(room);
    return roomToSpace(room);
    
  } catch (error) {
    if (error instanceof SpaceServiceError) {
      throw error;
    }
    throw new SpaceServiceError(
      `Failed to get space: ${error instanceof Error ? error.message : String(error)}`,
      'GET_FAILED'
    );
  }
}

/**
 * Join a space
 */
export async function joinSpace(spaceId: string): Promise<void> {
  const client = getMatrixClient();
  
  try {
    await client.joinRoom(spaceId);
    
    // Wait for the room to be available locally
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new SpaceServiceError('Join operation timed out', 'JOIN_TIMEOUT'));
      }, 10000);
      
      const checkRoom = () => {
        const room = client.getRoom(spaceId);
        if (room && room.hasMembershipState(client.getUserId()!, 'join')) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkRoom, 100);
        }
      };
      
      checkRoom();
    });
    
  } catch (error) {
    if (error instanceof SpaceServiceError) {
      throw error;
    }
    throw new SpaceServiceError(
      `Failed to join space: ${error instanceof Error ? error.message : String(error)}`,
      'JOIN_FAILED'
    );
  }
}

/**
 * Leave a space
 */
export async function leaveSpace(spaceId: string): Promise<void> {
  const client = getMatrixClient();
  
  try {
    await client.leave(spaceId);
    
  } catch (error) {
    throw new SpaceServiceError(
      `Failed to leave space: ${error instanceof Error ? error.message : String(error)}`,
      'LEAVE_FAILED'
    );
  }
}

/**
 * Update space properties
 */
export async function updateSpace(
  spaceId: string, 
  data: { name?: string; topic?: string; avatar?: string }
): Promise<void> {
  const client = getMatrixClient();
  
  try {
    const room = client.getRoom(spaceId);
    if (!room) {
      throw new SpaceServiceError(`Space not found: ${spaceId}`, 'SPACE_NOT_FOUND', 404);
    }
    
    validateSpaceRoom(room);
    
    // Update name
    if (data.name !== undefined) {
      await client.setRoomName(spaceId, data.name);
    }
    
    // Update topic
    if (data.topic !== undefined) {
      await client.setRoomTopic(spaceId, data.topic);
    }
    
    // Update avatar
    if (data.avatar !== undefined) {
      await client.sendStateEvent(spaceId, 'm.room.avatar' as any, {
        url: data.avatar
      }, '');
    }
    
  } catch (error) {
    if (error instanceof SpaceServiceError) {
      throw error;
    }
    throw new SpaceServiceError(
      `Failed to update space: ${error instanceof Error ? error.message : String(error)}`,
      'UPDATE_FAILED'
    );
  }
}

/**
 * Delete a space (if user has permission)
 */
export async function deleteSpace(spaceId: string): Promise<void> {
  const client = getMatrixClient();
  
  try {
    const room = client.getRoom(spaceId);
    if (!room) {
      throw new SpaceServiceError(`Space not found: ${spaceId}`, 'SPACE_NOT_FOUND', 404);
    }
    
    validateSpaceRoom(room);
    
    // Check if user has permission to delete (tombstone requires high power level)
    const powerLevelsEvent = room.currentState.getStateEvents('m.room.power_levels', '');
    const powerLevels = powerLevelsEvent?.getContent() || {};
    const myUserId = client.getUserId();
    const myPowerLevel = powerLevels.users?.[myUserId!] || powerLevels.users_default || 0;
    const requiredLevel = powerLevels.events?.['m.room.tombstone'] || 100;
    
    if (myPowerLevel < requiredLevel) {
      throw new SpaceServiceError(
        'Insufficient permissions to delete space',
        'INSUFFICIENT_PERMISSIONS',
        403
      );
    }
    
    // Use tombstone event to mark space as deleted
    await client.sendStateEvent(spaceId, 'm.room.tombstone' as any, {
      body: 'This space has been deleted',
      replacement_room: null
    }, '');
    
    // Leave the space after tombstoning
    await client.leave(spaceId);
    
  } catch (error) {
    if (error instanceof SpaceServiceError) {
      throw error;
    }
    throw new SpaceServiceError(
      `Failed to delete space: ${error instanceof Error ? error.message : String(error)}`,
      'DELETE_FAILED'
    );
  }
}

/**
 * Get child rooms (channels) of a space
 */
export async function getSpaceChildren(spaceId: string): Promise<Room[]> {
  const client = getMatrixClient();
  
  try {
    const space = client.getRoom(spaceId);
    if (!space) {
      throw new SpaceServiceError(`Space not found: ${spaceId}`, 'SPACE_NOT_FOUND', 404);
    }
    
    validateSpaceRoom(space);
    
    // Get all space child events
    const childEvents = space.currentState.getStateEvents('m.space.child');
    const childRooms: Room[] = [];
    
    for (const event of childEvents) {
      const childRoomId = event.getStateKey();
      if (!childRoomId || !event.getContent()?.via) {
        continue; // Skip invalid child events
      }
      
      const childRoom = client.getRoom(childRoomId);
      if (childRoom) {
        childRooms.push(childRoom);
      }
    }
    
    // Sort by order if available, or by name
    childRooms.sort((a, b) => {
      // Try to get order from space child event
      const orderA = space.currentState
        .getStateEvents('m.space.child', a.roomId)
        ?.getContent()?.order;
      const orderB = space.currentState
        .getStateEvents('m.space.child', b.roomId)
        ?.getContent()?.order;
      
      if (orderA !== undefined && orderB !== undefined) {
        return orderA.localeCompare(orderB);
      }
      
      // Fall back to name comparison
      const nameA = a.name || a.roomId;
      const nameB = b.name || b.roomId;
      return nameA.localeCompare(nameB);
    });
    
    return childRooms;
    
  } catch (error) {
    if (error instanceof SpaceServiceError) {
      throw error;
    }
    throw new SpaceServiceError(
      `Failed to get space children: ${error instanceof Error ? error.message : String(error)}`,
      'GET_CHILDREN_FAILED'
    );
  }
}

// =============================================================================
// Exports
// =============================================================================

export {
  type MatrixSpace,
  type SpaceJoinRule,
  type SpaceChannel
};