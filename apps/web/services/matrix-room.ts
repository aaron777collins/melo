/**
 * Matrix Room Service
 *
 * Service layer for Matrix room (channel) operations.
 * Provides CRUD operations for rooms with full Matrix SDK integration.
 * Handles text, voice, video, and announcement channel types within Matrix spaces.
 */

import { Room, Visibility, ICreateRoomOpts, RoomType, EventType } from "matrix-js-sdk";
import { getClient } from "../../../lib/matrix/client";

// =============================================================================
// Types
// =============================================================================

/**
 * Channel types supported by the room service
 */
export type RoomChannelType = 'text' | 'voice' | 'audio' | 'video' | 'announcement';

/**
 * Data for updating a room
 */
export interface RoomUpdateData {
  name?: string;
  topic?: string;
  avatar?: string;
}

/**
 * Matrix Room interface for consistent returns
 */
export interface MatrixRoom {
  /** Room ID (e.g., "!abc123:example.com") */
  id: string;
  /** Display name of the room */
  name: string;
  /** Room topic/description */
  topic: string | null;
  /** Avatar MXC URL (e.g., "mxc://example.com/abc123") */
  avatarUrl: string | null;
  /** Room type (text, audio, video) */
  type: RoomChannelType;
  /** Parent space ID if this room is in a space */
  parentSpaceId: string | null;
  /** Number of members in the room */
  memberCount: number;
  /** Whether the current user has admin permissions */
  isAdmin: boolean;
  /** Power level of current user in this room */
  currentUserPowerLevel: number;
  /** Whether the room has unread messages */
  hasUnread: boolean;
  /** Number of unread mentions */
  unreadMentionCount: number;
  /** Room creation timestamp */
  createdAt: string;
  /** Whether the room is encrypted */
  isEncrypted: boolean;
}

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Custom error class for Room Service operations
 */
export class RoomServiceError extends Error {
  public readonly code: string;
  public readonly httpStatus?: number;

  constructor(message: string, code = 'ROOM_ERROR', httpStatus?: number) {
    super(message);
    this.name = 'RoomServiceError';
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
    throw new RoomServiceError('Matrix client not initialized', 'CLIENT_NOT_READY');
  }
  return client;
}

/**
 * Determine room type based on room state events and power levels
 */
function determineRoomType(room: Room): RoomChannelType {
  // Check for custom room type in creation event
  const creationEvent = room.currentState.getStateEvents('m.room.create', '');
  const customType = creationEvent?.getContent()?.['io.haos.room_type'];
  
  if (customType && ['text', 'audio', 'video'].includes(customType)) {
    return customType as RoomChannelType;
  }
  
  // Check for voice/video indicators in room state
  const powerLevelsEvent = room.currentState.getStateEvents('m.room.power_levels', '');
  const powerLevels = powerLevelsEvent?.getContent();
  
  // Look for LiveKit/voice call related state events
  const voiceEvents = room.currentState.getStateEvents('m.call');
  const liveKitEvents = room.currentState.getStateEvents('io.element.livekit');
  
  if (liveKitEvents && liveKitEvents.length > 0) {
    // Check if this is configured for video or just audio
    const liveKitConfig = liveKitEvents[0]?.getContent();
    if (liveKitConfig?.video_enabled !== false) {
      return 'video';
    }
    return 'audio';
  }
  
  if (voiceEvents && voiceEvents.length > 0) {
    return 'audio';
  }
  
  // Check room name for hints
  const roomName = room.name?.toLowerCase() || '';
  if (roomName.includes('voice') || roomName.includes('audio')) {
    return 'audio';
  }
  if (roomName.includes('video')) {
    return 'video';
  }
  
  // Default to text channel
  return 'text';
}

/**
 * Convert Matrix Room to MatrixRoom interface
 */
function roomToMatrixRoom(room: Room): MatrixRoom {
  const client = getMatrixClient();
  const myUserId = client.getUserId();
  
  // Get room state events
  const nameEvent = room.currentState.getStateEvents('m.room.name', '');
  const topicEvent = room.currentState.getStateEvents('m.room.topic', '');
  const avatarEvent = room.currentState.getStateEvents('m.room.avatar', '');
  const powerLevelsEvent = room.currentState.getStateEvents('m.room.power_levels', '');
  const creationEvent = room.currentState.getStateEvents('m.room.create', '');
  const encryptionEvent = room.currentState.getStateEvents('m.room.encryption', '');
  
  // Extract basic info
  const name = nameEvent?.getContent()?.name || room.name || 'Unnamed Room';
  const topic = topicEvent?.getContent()?.topic || null;
  const avatarUrl = avatarEvent?.getContent()?.url || null;
  
  // Determine room type
  const type = determineRoomType(room);
  
  // Power levels and permissions
  const powerLevels = powerLevelsEvent?.getContent() || {};
  const currentUserPowerLevel = powerLevels.users?.[myUserId!] || powerLevels.users_default || 0;
  const isAdmin = currentUserPowerLevel >= 50; // Moderator level
  
  // Parent space detection
  let parentSpaceId: string | null = null;
  const parentEvents = room.currentState.getStateEvents('m.space.parent');
  if (parentEvents && parentEvents.length > 0) {
    parentSpaceId = parentEvents[0].getStateKey() || null;
  }
  
  // Member count
  const memberCount = room.getJoinedMemberCount();
  
  // Unread status
  const unreadNotifications = room.getUnreadNotificationCount();
  const hasUnread = unreadNotifications > 0;
  const unreadMentionCount = room.getUnreadNotificationCount() || 0;
  
  // Creation timestamp
  const creationTs = creationEvent?.getContent()?.['origin_server_ts'] || room.getLastActiveTimestamp();
  const createdAt = new Date(creationTs).toISOString();
  
  // Encryption status
  const isEncrypted = !!encryptionEvent;
  
  return {
    id: room.roomId,
    name,
    topic,
    avatarUrl,
    type,
    parentSpaceId,
    memberCount,
    isAdmin,
    currentUserPowerLevel,
    hasUnread,
    unreadMentionCount,
    createdAt,
    isEncrypted,
  };
}

// =============================================================================
// Room CRUD Operations
// =============================================================================

/**
 * Create a new Matrix room (channel)
 */
export async function createRoom(
  name: string,
  type: RoomChannelType,
  parentSpaceId?: string
): Promise<MatrixRoom> {
  const client = getMatrixClient();
  
  try {
    const createOptions: ICreateRoomOpts = {
      name,
      visibility: Visibility.Private,
      room_version: '9', // Latest stable room version
      initial_state: []
    };
    
    // Add custom room type to creation content
    createOptions.creation_content = {
      'io.haos.room_type': type
    };
    
    // Configure room based on type
    if (type === 'audio' || type === 'voice' || type === 'video') {
      // Set power levels that allow voice/video calls
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
            'm.call': 0, // Allow all users to make calls
            'm.call.member': 0, // Allow users to join calls
            'io.element.livekit': 50, // Require mod to set up LiveKit
          }
        }
      });
      
      // For video rooms, add LiveKit configuration
      if (type === 'video') {
        createOptions.initial_state!.push({
          type: 'io.element.livekit',
          state_key: '',
          content: {
            livekit_service_url: process.env.LIVEKIT_URL || 'wss://livekit.example.com',
            video_enabled: true,
            audio_enabled: true,
            screenshare_enabled: true
          }
        });
      }
    } else {
      // Standard text channel power levels
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
          }
        }
      });
    }
    
    // Create the room
    const { room_id } = await client.createRoom(createOptions);
    
    // If parent space provided, add this room as a child
    if (parentSpaceId) {
      try {
        await client.sendStateEvent(parentSpaceId, 'm.space.child' as any, {
          via: [client.getDomain()],
          suggested: false,
          order: Date.now().toString() // Use timestamp for ordering
        }, room_id);
        
        // Also add parent relationship in the room
        await client.sendStateEvent(room_id, 'm.space.parent' as any, {
          via: [client.getDomain()],
          canonical: true
        }, parentSpaceId);
      } catch (error) {
        // Log error but don't fail room creation
        console.warn(`Failed to add room ${room_id} to space ${parentSpaceId}:`, error);
      }
    }
    
    // Get the created room
    const room = client.getRoom(room_id);
    if (!room) {
      throw new RoomServiceError('Failed to retrieve created room', 'CREATION_FAILED');
    }
    
    // Wait a moment for the room to be fully initialized
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return roomToMatrixRoom(room);
    
  } catch (error) {
    if (error instanceof RoomServiceError) {
      throw error;
    }
    throw new RoomServiceError(
      `Failed to create room: ${error instanceof Error ? error.message : String(error)}`,
      'CREATE_FAILED'
    );
  }
}

/**
 * Get room by ID
 */
export async function getRoom(roomId: string): Promise<MatrixRoom> {
  const client = getMatrixClient();
  
  try {
    const room = client.getRoom(roomId);
    if (!room) {
      throw new RoomServiceError(`Room not found: ${roomId}`, 'ROOM_NOT_FOUND', 404);
    }
    
    return roomToMatrixRoom(room);
    
  } catch (error) {
    if (error instanceof RoomServiceError) {
      throw error;
    }
    throw new RoomServiceError(
      `Failed to get room: ${error instanceof Error ? error.message : String(error)}`,
      'GET_FAILED'
    );
  }
}

/**
 * Join a room
 */
export async function joinRoom(roomId: string): Promise<void> {
  const client = getMatrixClient();
  
  try {
    await client.joinRoom(roomId);
    
    // Wait for the room to be available locally
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new RoomServiceError('Join operation timed out', 'JOIN_TIMEOUT'));
      }, 10000);
      
      const checkRoom = () => {
        const room = client.getRoom(roomId);
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
    if (error instanceof RoomServiceError) {
      throw error;
    }
    throw new RoomServiceError(
      `Failed to join room: ${error instanceof Error ? error.message : String(error)}`,
      'JOIN_FAILED'
    );
  }
}

/**
 * Leave a room
 */
export async function leaveRoom(roomId: string): Promise<void> {
  const client = getMatrixClient();
  
  try {
    await client.leave(roomId);
    
  } catch (error) {
    throw new RoomServiceError(
      `Failed to leave room: ${error instanceof Error ? error.message : String(error)}`,
      'LEAVE_FAILED'
    );
  }
}

/**
 * Update room properties
 */
export async function updateRoom(
  roomId: string,
  data: RoomUpdateData
): Promise<void> {
  const client = getMatrixClient();
  
  try {
    const room = client.getRoom(roomId);
    if (!room) {
      throw new RoomServiceError(`Room not found: ${roomId}`, 'ROOM_NOT_FOUND', 404);
    }
    
    // Update name
    if (data.name !== undefined) {
      await client.setRoomName(roomId, data.name);
    }
    
    // Update topic
    if (data.topic !== undefined) {
      await client.setRoomTopic(roomId, data.topic);
    }
    
    // Update avatar
    if (data.avatar !== undefined) {
      await client.sendStateEvent(roomId, 'm.room.avatar' as any, {
        url: data.avatar
      }, '');
    }
    
  } catch (error) {
    if (error instanceof RoomServiceError) {
      throw error;
    }
    throw new RoomServiceError(
      `Failed to update room: ${error instanceof Error ? error.message : String(error)}`,
      'UPDATE_FAILED'
    );
  }
}

/**
 * Delete a room (if user has permission)
 */
export async function deleteRoom(roomId: string): Promise<void> {
  const client = getMatrixClient();
  
  try {
    const room = client.getRoom(roomId);
    if (!room) {
      throw new RoomServiceError(`Room not found: ${roomId}`, 'ROOM_NOT_FOUND', 404);
    }
    
    // Check if user has permission to delete (tombstone requires high power level)
    const powerLevelsEvent = room.currentState.getStateEvents('m.room.power_levels', '');
    const powerLevels = powerLevelsEvent?.getContent() || {};
    const myUserId = client.getUserId();
    const myPowerLevel = powerLevels.users?.[myUserId!] || powerLevels.users_default || 0;
    const requiredLevel = powerLevels.events?.['m.room.tombstone'] || 100;
    
    if (myPowerLevel < requiredLevel) {
      throw new RoomServiceError(
        'Insufficient permissions to delete room',
        'INSUFFICIENT_PERMISSIONS',
        403
      );
    }
    
    // Remove from parent space(s) first
    const parentEvents = room.currentState.getStateEvents('m.space.parent');
    for (const parentEvent of parentEvents) {
      const parentSpaceId = parentEvent.getStateKey();
      if (parentSpaceId) {
        try {
          const parentSpace = client.getRoom(parentSpaceId);
          if (parentSpace) {
            await client.sendStateEvent(parentSpaceId, 'm.space.child' as any, {}, roomId);
          }
        } catch (error) {
          console.warn(`Failed to remove room from space ${parentSpaceId}:`, error);
        }
      }
    }
    
    // Use tombstone event to mark room as deleted
    await client.sendStateEvent(roomId, 'm.room.tombstone' as any, {
      body: 'This room has been deleted',
      replacement_room: null
    }, '');
    
    // Leave the room after tombstoning
    await client.leave(roomId);
    
  } catch (error) {
    if (error instanceof RoomServiceError) {
      throw error;
    }
    throw new RoomServiceError(
      `Failed to delete room: ${error instanceof Error ? error.message : String(error)}`,
      'DELETE_FAILED'
    );
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get room type for a given room
 */
export function getRoomType(room: Room): RoomChannelType {
  return determineRoomType(room);
}

// =============================================================================
// Room Discovery & Joining
// =============================================================================

/**
 * Join a room by ID or alias
 * Handles both room IDs (!example:server.com) and room aliases (#example:server.com)
 */
export async function joinRoomByIdOrAlias(roomIdOrAlias: string): Promise<string> {
  const client = getMatrixClient();
  
  try {
    // Validate format
    if (!roomIdOrAlias.startsWith('!') && !roomIdOrAlias.startsWith('#')) {
      throw new RoomServiceError(
        'Room identifier must start with ! (room ID) or # (room alias)',
        'INVALID_ROOM_IDENTIFIER'
      );
    }
    
    // Join the room (SDK handles both IDs and aliases)
    const joinResult = await client.joinRoom(roomIdOrAlias);
    const actualRoomId = joinResult.roomId || roomIdOrAlias;
    
    // Wait for the room to be available locally
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new RoomServiceError('Join operation timed out', 'JOIN_TIMEOUT'));
      }, 10000);
      
      const checkRoom = () => {
        const room = client.getRoom(actualRoomId);
        if (room && room.hasMembershipState(client.getUserId()!, 'join')) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkRoom, 100);
        }
      };
      
      checkRoom();
    });
    
    return actualRoomId;
    
  } catch (error) {
    if (error instanceof RoomServiceError) {
      throw error;
    }
    throw new RoomServiceError(
      `Failed to join room/space ${roomIdOrAlias}: ${error instanceof Error ? error.message : String(error)}`,
      'JOIN_FAILED'
    );
  }
}

/**
 * Search for public rooms on the homeserver
 * Useful for room discovery before joining
 */
export async function searchPublicRooms(
  searchTerm?: string,
  limit: number = 50
): Promise<{
  roomId: string;
  alias?: string;
  name?: string;
  topic?: string;
  memberCount: number;
  avatarUrl?: string;
  isEncrypted: boolean;
}[]> {
  const client = getMatrixClient();
  
  try {
    const response = await client.publicRooms({
      limit,
      filter: searchTerm ? {
        generic_search_term: searchTerm
      } : undefined,
    });
    
    return response.chunk.map(room => ({
      roomId: room.room_id,
      alias: room.canonical_alias,
      name: room.name,
      topic: room.topic,
      memberCount: room.num_joined_members,
      avatarUrl: room.avatar_url,
      isEncrypted: room.guest_can_join === false, // Rough heuristic
    }));
    
  } catch (error) {
    throw new RoomServiceError(
      `Failed to search public rooms: ${error instanceof Error ? error.message : String(error)}`,
      'SEARCH_FAILED'
    );
  }
}

// =============================================================================
// Type Re-Exports (for convenience)
// =============================================================================

export type { Room } from "matrix-js-sdk";