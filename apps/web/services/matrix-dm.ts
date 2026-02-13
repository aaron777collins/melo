/**
 * Matrix Direct Message Service
 *
 * Service layer for Matrix direct message operations.
 * Provides DM room creation, detection, and management
 * with full Matrix SDK integration.
 */

import { Room, ICreateRoomOpts, Visibility, EventType } from "matrix-js-sdk";
import { getClient } from "../../../lib/matrix/client";

// =============================================================================
// Types
// =============================================================================

/**
 * Direct message room interface
 */
export interface DirectMessageRoom extends Room {
  /** Whether this room is a direct message room */
  isDirect: boolean;
  /** The other participant's user ID (for 1:1 DMs) */
  otherUserId?: string;
  /** Display name of the other participant */
  otherUserDisplayName?: string;
  /** Avatar URL of the other participant */
  otherUserAvatarUrl?: string;
}

/**
 * DM creation options
 */
export interface DMCreateOptions {
  /** Whether to invite the user immediately (default: true) */
  autoInvite?: boolean;
  /** Whether to enable encryption (default: true) */
  encrypted?: boolean;
  /** Custom initial message to send */
  initialMessage?: string;
}

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Custom error class for DM Service operations
 */
export class DMServiceError extends Error {
  public readonly code: string;
  public readonly httpStatus?: number;

  constructor(message: string, code = 'DM_ERROR', httpStatus?: number) {
    super(message);
    this.name = 'DMServiceError';
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
    throw new DMServiceError('Matrix client not initialized', 'CLIENT_NOT_READY');
  }
  return client;
}

/**
 * Validate user ID format
 */
function validateUserId(userId: string): void {
  if (!userId || typeof userId !== 'string') {
    throw new DMServiceError('Invalid user ID', 'INVALID_USER_ID', 400);
  }
  
  if (!userId.startsWith('@') || !userId.includes(':')) {
    throw new DMServiceError('User ID must be in format @user:domain', 'INVALID_USER_ID_FORMAT', 400);
  }
}

/**
 * Get the m.direct account data for the current user
 */
async function getDirectAccountData(): Promise<Record<string, string[]> | null> {
  try {
    const client = getMatrixClient();
    const accountData = client.getAccountData('m.direct' as any);
    return accountData?.getContent() || null;
  } catch (error) {
    // Account data might not exist yet
    return null;
  }
}

/**
 * Update the m.direct account data
 */
async function updateDirectAccountData(directData: Record<string, string[]>): Promise<void> {
  try {
    const client = getMatrixClient();
    await client.setAccountData('m.direct' as any, directData as any);
  } catch (error) {
    throw new DMServiceError(
      `Failed to update direct message account data: ${error instanceof Error ? error.message : String(error)}`,
      'ACCOUNT_DATA_UPDATE_FAILED'
    );
  }
}

/**
 * Get the other user ID in a DM room (excluding current user)
 */
function getOtherUserInDM(room: Room): string | null {
  const client = getMatrixClient();
  const myUserId = client.getUserId();
  
  if (!myUserId) return null;
  
  const members = room.getJoinedMembers();
  const memberIds = Object.keys(members);
  
  // Should be exactly 2 members in a DM
  if (memberIds.length !== 2) {
    return null;
  }
  
  // Return the ID that isn't the current user
  return memberIds.find(id => id !== myUserId) || null;
}

/**
 * Extract user information for DM display
 */
function getDMUserInfo(room: Room, userId: string) {
  const member = room.getMember(userId);
  
  return {
    displayName: member?.name || userId,
    avatarUrl: member?.getAvatarUrl(
      getMatrixClient().baseUrl,
      64, 64, 'crop', false, false
    ) || null
  };
}

// =============================================================================
// Core DM Functions
// =============================================================================

/**
 * Check if a room is a direct message room
 * 
 * @param room - Matrix Room object to check
 * @returns Whether the room is a DM room
 */
export function isDMRoom(room: Room): boolean {
  try {
    const client = getMatrixClient();
    const myUserId = client.getUserId();
    
    if (!myUserId) {
      return false;
    }
    
    // Check room creation content for is_direct flag
    const createEvent = room.currentState.getStateEvents('m.room.create', '');
    const createContent = createEvent?.getContent();
    
    if (createContent?.is_direct === true) {
      return true;
    }
    
    // Fallback: check if room is in m.direct account data
    const accountData = client.getAccountData('m.direct' as any);
    if (!accountData) {
      return false;
    }
    
    const directData = accountData.getContent() as Record<string, string[]> | null;
    if (!directData) {
      return false;
    }
    
    // Check if this room ID appears in any user's DM list
    for (const roomIds of Object.values(directData)) {
      if (roomIds.includes(room.roomId)) {
        return true;
      }
    }
    
    return false;
    
  } catch (error) {
    // If we can't determine, assume it's not a DM
    return false;
  }
}

/**
 * Get all DM rooms for the current user
 * 
 * @returns Promise resolving to array of DM rooms
 */
export async function getDMRooms(): Promise<Room[]> {
  try {
    const client = getMatrixClient();
    const myUserId = client.getUserId();
    
    if (!myUserId) {
      throw new DMServiceError('User not authenticated', 'USER_NOT_AUTHENTICATED', 401);
    }
    
    const directData = await getDirectAccountData();
    const dmRooms: Room[] = [];
    
    if (directData) {
      // Collect all room IDs from m.direct account data
      const dmRoomIds = new Set<string>();
      for (const roomIds of Object.values(directData)) {
        roomIds.forEach(roomId => dmRoomIds.add(roomId));
      }
      
      // Get Room objects for each DM room ID
      const roomIdsArray = Array.from(dmRoomIds);
      for (const roomId of roomIdsArray) {
        const room = client.getRoom(roomId);
        if (room) {
          // Double-check that we're a member and it's actually a DM
          const member = room.getMember(myUserId);
          if (member && member.membership === 'join' && isDMRoom(room)) {
            dmRooms.push(room);
          }
        }
      }
    }
    
    // Fallback: check all rooms for is_direct flag (for newly created DMs not yet in account data)
    const allRooms = client.getRooms();
    for (const room of allRooms) {
      const member = room.getMember(myUserId);
      if (member && member.membership === 'join' && isDMRoom(room)) {
        // Avoid duplicates
        if (!dmRooms.find(existingRoom => existingRoom.roomId === room.roomId)) {
          dmRooms.push(room);
        }
      }
    }
    
    // Sort by last activity
    dmRooms.sort((a, b) => b.getLastActiveTimestamp() - a.getLastActiveTimestamp());
    
    return dmRooms;
    
  } catch (error) {
    if (error instanceof DMServiceError) {
      throw error;
    }
    
    throw new DMServiceError(
      `Failed to get DM rooms: ${error instanceof Error ? error.message : String(error)}`,
      'GET_DM_ROOMS_FAILED'
    );
  }
}

/**
 * Get existing DM room with a user, or create a new one if none exists
 * 
 * @param userId - Matrix user ID to start/find DM with
 * @param options - DM creation options
 * @returns Promise resolving to the DM Room
 */
export async function getOrCreateDM(
  userId: string,
  options: DMCreateOptions = {}
): Promise<Room> {
  try {
    validateUserId(userId);
    
    const client = getMatrixClient();
    const myUserId = client.getUserId();
    
    if (!myUserId) {
      throw new DMServiceError('User not authenticated', 'USER_NOT_AUTHENTICATED', 401);
    }
    
    if (userId === myUserId) {
      throw new DMServiceError('Cannot create DM with yourself', 'INVALID_DM_TARGET', 400);
    }
    
    // Check if DM already exists
    const existingDM = await findExistingDM(userId);
    if (existingDM) {
      return existingDM;
    }
    
    // Create new DM room
    return await createNewDM(userId, options);
    
  } catch (error) {
    if (error instanceof DMServiceError) {
      throw error;
    }
    
    throw new DMServiceError(
      `Failed to get or create DM: ${error instanceof Error ? error.message : String(error)}`,
      'GET_OR_CREATE_DM_FAILED'
    );
  }
}

/**
 * Find existing DM room with a specific user
 */
async function findExistingDM(userId: string): Promise<Room | null> {
  const client = getMatrixClient();
  const directData = await getDirectAccountData();
  
  if (!directData || !directData[userId]) {
    return null;
  }
  
  // Check each room ID associated with this user
  for (const roomId of directData[userId]) {
    const room = client.getRoom(roomId);
    
    if (room) {
      // Verify we're still a member of this room
      const myUserId = client.getUserId()!;
      const member = room.getMember(myUserId);
      
      if (member && member.membership === 'join') {
        return room;
      }
    }
  }
  
  return null;
}

/**
 * Create a new DM room with a user
 */
async function createNewDM(userId: string, options: DMCreateOptions): Promise<Room> {
  const client = getMatrixClient();
  const { autoInvite = true, encrypted = true, initialMessage } = options;
  
  // Configure room creation options
  const createOptions: ICreateRoomOpts = {
    visibility: Visibility.Private,
    is_direct: true,
    preset: 'trusted_private_chat' as any,
    invite: autoInvite ? [userId] : undefined,
    room_version: '9', // Latest stable room version
  };
  
  // Enable encryption if requested
  if (encrypted) {
    createOptions.initial_state = [{
      type: 'm.room.encryption',
      state_key: '',
      content: {
        algorithm: 'm.megolm.v1.aes-sha2'
      }
    }];
  }
  
  try {
    // Create the room
    const { room_id } = await client.createRoom(createOptions);
    
    // Update m.direct account data
    const directData = await getDirectAccountData() || {};
    
    if (!directData[userId]) {
      directData[userId] = [];
    }
    
    // Add this room to the user's DM list
    if (!directData[userId].includes(room_id)) {
      directData[userId].push(room_id);
    }
    
    await updateDirectAccountData(directData);
    
    // Get the created room
    const room = client.getRoom(room_id);
    if (!room) {
      throw new DMServiceError('Failed to retrieve created DM room', 'DM_CREATION_FAILED');
    }
    
    // Send initial message if provided
    if (initialMessage && initialMessage.trim()) {
      // Import sendMessage dynamically to avoid circular dependencies
      const { sendMessage } = await import('./matrix-message');
      
      try {
        await sendMessage(room_id, initialMessage.trim());
      } catch (error) {
        // Don't fail DM creation if message sending fails
        console.warn('Failed to send initial DM message:', error);
      }
    }
    
    // Wait a moment for the room to be fully initialized
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return room;
    
  } catch (error) {
    if (error instanceof DMServiceError) {
      throw error;
    }
    
    throw new DMServiceError(
      `Failed to create new DM: ${error instanceof Error ? error.message : String(error)}`,
      'CREATE_DM_FAILED'
    );
  }
}

// =============================================================================
// Utility Functions for DM Management
// =============================================================================

/**
 * Get DM room information including other participant details
 * 
 * @param room - DM Room to analyze
 * @returns Enhanced DM room information
 */
export function getDMInfo(room: Room): DirectMessageRoom | null {
  if (!isDMRoom(room)) {
    return null;
  }
  
  const otherUserId = getOtherUserInDM(room);
  if (!otherUserId) {
    return null;
  }
  
  const userInfo = getDMUserInfo(room, otherUserId);
  
  return Object.assign(room, {
    isDirect: true,
    otherUserId,
    otherUserDisplayName: userInfo.displayName,
    otherUserAvatarUrl: userInfo.avatarUrl || undefined,
  }) as DirectMessageRoom;
}

/**
 * Get all DMs with enhanced information
 * 
 * @returns Promise resolving to array of enhanced DM rooms
 */
export async function getDMsWithInfo(): Promise<DirectMessageRoom[]> {
  try {
    const dmRooms = await getDMRooms();
    const enhancedDMs: DirectMessageRoom[] = [];
    
    for (const room of dmRooms) {
      const dmInfo = getDMInfo(room);
      if (dmInfo) {
        enhancedDMs.push(dmInfo);
      }
    }
    
    return enhancedDMs;
    
  } catch (error) {
    if (error instanceof DMServiceError) {
      throw error;
    }
    
    throw new DMServiceError(
      `Failed to get DMs with info: ${error instanceof Error ? error.message : String(error)}`,
      'GET_DMS_WITH_INFO_FAILED'
    );
  }
}

/**
 * Remove a room from m.direct account data (e.g., when leaving a DM)
 * 
 * @param roomId - Room ID to remove from DM list
 * @param userId - User ID associated with the DM (optional, will auto-detect)
 */
export async function removeDMFromAccountData(roomId: string, userId?: string): Promise<void> {
  try {
    const client = getMatrixClient();
    let targetUserId = userId;
    
    // If userId not provided, find it by looking at the room
    if (!targetUserId) {
      const room = client.getRoom(roomId);
      if (room) {
        targetUserId = getOtherUserInDM(room) || undefined;
      }
    }
    
    if (!targetUserId) {
      throw new DMServiceError('Could not determine other user in DM', 'UNKNOWN_DM_USER', 400);
    }
    
    const directData = await getDirectAccountData();
    if (!directData || !directData[targetUserId]) {
      // Nothing to remove
      return;
    }
    
    // Remove the room ID from the user's DM list
    directData[targetUserId] = directData[targetUserId].filter(id => id !== roomId);
    
    // If no rooms left for this user, remove the user entry entirely
    if (directData[targetUserId].length === 0) {
      delete directData[targetUserId];
    }
    
    await updateDirectAccountData(directData);
    
  } catch (error) {
    if (error instanceof DMServiceError) {
      throw error;
    }
    
    throw new DMServiceError(
      `Failed to remove DM from account data: ${error instanceof Error ? error.message : String(error)}`,
      'REMOVE_DM_FAILED'
    );
  }
}

/**
 * Check if a user ID is valid and reachable
 * 
 * @param userId - User ID to validate
 * @returns Whether the user can be reached for DMs
 */
export async function canCreateDMWith(userId: string): Promise<boolean> {
  try {
    validateUserId(userId);
    
    const client = getMatrixClient();
    const myUserId = client.getUserId();
    
    if (userId === myUserId) {
      return false; // Can't DM yourself
    }
    
    // Try to resolve the user profile
    try {
      await client.getProfileInfo(userId);
      return true;
    } catch (error) {
      // User might not exist or not be reachable
      return false;
    }
    
  } catch (error) {
    return false;
  }
}

// =============================================================================
// Type Re-Exports (for convenience)
// =============================================================================

export type { Room } from "matrix-js-sdk";