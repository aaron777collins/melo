/**
 * Matrix Server Settings API
 * 
 * Provides functionality for managing server settings (name, description, avatar)
 * through Matrix room state events.
 */

import { getClient } from './client';
import {
  ServerSettings,
  ServerSettingsUpdateRequest,
  ServerSettingsUpdateResult,
  ServerSettingsPermissions,
  MatrixRoomNameEvent,
  MatrixRoomTopicEvent,
  MatrixRoomAvatarEvent,
  createServerSettingsError,
  validateServerSettingsRequest,
} from './types/server-settings';

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Server settings specific error
 */
export class ServerSettingsError extends Error {
  constructor(
    public code: string,
    message: string,
    public httpStatus?: number,
    public field?: keyof ServerSettingsUpdateRequest
  ) {
    super(message);
    this.name = 'ServerSettingsError';
  }
}

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Get current server settings from Matrix room state
 */
export async function getServerSettings(roomId: string): Promise<ServerSettings> {
  const client = getClient();
  if (!client) {
    throw new Error('Matrix client not available');
  }

  const room = client.getRoom(roomId);
  if (!room) {
    throw new Error('Room not found');
  }

  // Get room state events
  const nameEvent = room.currentState.getStateEvents('m.room.name', '');
  const topicEvent = room.currentState.getStateEvents('m.room.topic', '');
  const avatarEvent = room.currentState.getStateEvents('m.room.avatar', '');

  // Extract values from events
  const name = nameEvent?.getContent()?.name || room.getName() || 'Unnamed Server';
  const topicContent = topicEvent?.getContent()?.topic;
  const description = topicContent !== undefined ? (topicContent || null) : null;
  const avatarUrl = avatarEvent?.getContent()?.url || null;

  return {
    name,
    description,
    avatarUrl,
  };
}

/**
 * Update server name via Matrix room name event
 */
export async function updateServerName(
  roomId: string,
  name: string
): Promise<ServerSettingsUpdateResult> {
  // Validate input
  if (!name || name.trim().length === 0) {
    throw new Error('Server name cannot be empty');
  }
  if (name.length > 255) {
    throw new Error('Server name must be 255 characters or less');
  }

  const client = getClient();
  if (!client) {
    return {
      success: false,
      settings: null,
      error: {
        code: 'M_CLIENT_NOT_AVAILABLE',
        message: 'Matrix client not available'
      }
    };
  }

  try {
    const content: MatrixRoomNameEvent = { name: name.trim() };
    
    await client.sendStateEvent(roomId, 'm.room.name', content, '');
    
    // Get current settings and update with the new name
    const currentSettings = await getServerSettings(roomId);
    const updatedSettings: ServerSettings = {
      ...currentSettings,
      name: name.trim()
    };
    
    return {
      success: true,
      settings: updatedSettings,
    };
  } catch (error: any) {
    return {
      success: false,
      settings: null,
      error: createServerSettingsError(error, 'name'),
    };
  }
}

/**
 * Update server description via Matrix room topic event
 */
export async function updateServerDescription(
  roomId: string,
  description: string | null
): Promise<ServerSettingsUpdateResult> {
  // Validate input
  if (description !== null && description.length > 1000) {
    throw new Error('Server description must be 1000 characters or less');
  }

  const client = getClient();
  if (!client) {
    return {
      success: false,
      settings: null,
      error: {
        code: 'M_CLIENT_NOT_AVAILABLE',
        message: 'Matrix client not available'
      }
    };
  }

  try {
    const content: MatrixRoomTopicEvent = { 
      topic: description?.trim() || '' 
    };
    
    await client.sendStateEvent(roomId, 'm.room.topic', content, '');
    
    // Get current settings and update with the new description
    const currentSettings = await getServerSettings(roomId);
    const updatedSettings: ServerSettings = {
      ...currentSettings,
      description: description?.trim() || null
    };
    
    return {
      success: true,
      settings: updatedSettings,
    };
  } catch (error: any) {
    return {
      success: false,
      settings: null,
      error: createServerSettingsError(error, 'description'),
    };
  }
}

/**
 * Update server avatar via Matrix room avatar event
 */
export async function updateServerAvatar(
  roomId: string,
  avatarUrl: string | null
): Promise<ServerSettingsUpdateResult> {
  // Validate input
  if (avatarUrl !== null) {
    if (!avatarUrl || avatarUrl.trim().length === 0) {
      throw new Error('Server avatar URL must be a valid MXC URL (mxc://...)');
    }
    
    const mxcUrlRegex = /^mxc:\/\/[a-zA-Z0-9.-]+\/[a-zA-Z0-9+/=_-]+$/;
    if (!mxcUrlRegex.test(avatarUrl.trim())) {
      throw new Error('Server avatar URL must be a valid MXC URL (mxc://...)');
    }
  }

  const client = getClient();
  if (!client) {
    return {
      success: false,
      settings: null,
      error: {
        code: 'M_CLIENT_NOT_AVAILABLE',
        message: 'Matrix client not available'
      }
    };
  }

  try {
    let content: MatrixRoomAvatarEvent | {} = {};
    
    if (avatarUrl !== null) {
      content = { url: avatarUrl.trim() };
    }
    
    await client.sendStateEvent(roomId, 'm.room.avatar', content, '');
    
    // Get current settings and update with the new avatar
    const currentSettings = await getServerSettings(roomId);
    const updatedSettings: ServerSettings = {
      ...currentSettings,
      avatarUrl: avatarUrl?.trim() || null
    };
    
    return {
      success: true,
      settings: updatedSettings,
    };
  } catch (error: any) {
    return {
      success: false,
      settings: null,
      error: createServerSettingsError(error, 'avatarUrl'),
    };
  }
}

/**
 * Update multiple server settings at once
 */
export async function updateServerSettings(
  roomId: string,
  updateRequest: ServerSettingsUpdateRequest
): Promise<ServerSettingsUpdateResult> {
  // Validate the entire request first
  const validationErrors = validateServerSettingsRequest(updateRequest);
  if (validationErrors.length > 0) {
    throw new Error(validationErrors[0]); // Throw first validation error
  }

  const client = getClient();
  if (!client) {
    return {
      success: false,
      settings: null,
      error: {
        code: 'M_CLIENT_NOT_AVAILABLE',
        message: 'Matrix client not available'
      }
    };
  }

  try {
    // Get current settings as baseline
    const currentSettings = await getServerSettings(roomId);
    
    // Update each field that was provided, tracking changes
    let updatedSettings = { ...currentSettings };

    if (updateRequest.name !== undefined) {
      try {
        const content: MatrixRoomNameEvent = { name: updateRequest.name.trim() };
        await client.sendStateEvent(roomId, 'm.room.name', content, '');
        updatedSettings.name = updateRequest.name.trim();
      } catch (error: any) {
        return {
          success: false,
          settings: null,
          error: createServerSettingsError(error, 'name'),
        };
      }
    }

    if (updateRequest.description !== undefined) {
      try {
        const content: MatrixRoomTopicEvent = { 
          topic: updateRequest.description?.trim() || '' 
        };
        await client.sendStateEvent(roomId, 'm.room.topic', content, '');
        updatedSettings.description = updateRequest.description?.trim() || null;
      } catch (error: any) {
        return {
          success: false,
          settings: null,
          error: createServerSettingsError(error, 'description'),
        };
      }
    }

    if (updateRequest.avatarUrl !== undefined) {
      try {
        let content: MatrixRoomAvatarEvent | {} = {};
        if (updateRequest.avatarUrl !== null) {
          content = { url: updateRequest.avatarUrl.trim() };
        }
        await client.sendStateEvent(roomId, 'm.room.avatar', content, '');
        updatedSettings.avatarUrl = updateRequest.avatarUrl?.trim() || null;
      } catch (error: any) {
        return {
          success: false,
          settings: null,
          error: createServerSettingsError(error, 'avatarUrl'),
        };
      }
    }

    return {
      success: true,
      settings: updatedSettings,
    };
  } catch (error: any) {
    return {
      success: false,
      settings: null,
      error: createServerSettingsError(error),
    };
  }
}

/**
 * Check user permissions for server settings operations
 */
export async function checkServerSettingsPermissions(
  roomId: string,
  userId: string
): Promise<ServerSettingsPermissions> {
  const client = getClient();
  if (!client) {
    return {
      canEditName: false,
      canEditDescription: false,
      canEditAvatar: false,
      canEditAll: false,
    };
  }

  const room = client.getRoom(roomId);
  if (!room) {
    return {
      canEditName: false,
      canEditDescription: false,
      canEditAvatar: false,
      canEditAll: false,
    };
  }

  // Get power levels event
  const powerLevelsEvent = room.currentState.getStateEvents('m.room.power_levels', '');
  const powerLevelsContent = powerLevelsEvent?.getContent();

  if (!powerLevelsContent) {
    // No power levels defined - use Matrix defaults
    return {
      canEditName: false,
      canEditDescription: false,
      canEditAvatar: false,
      canEditAll: false,
    };
  }

  // Get user's power level
  const userPowerLevel = powerLevelsContent.users?.[userId] || 0;

  // Get required power levels for each event type
  const requiredLevels = {
    name: powerLevelsContent.events?.['m.room.name'] ?? 50,
    topic: powerLevelsContent.events?.['m.room.topic'] ?? 50,
    avatar: powerLevelsContent.events?.['m.room.avatar'] ?? 50,
  };

  const canEditName = userPowerLevel >= requiredLevels.name;
  const canEditDescription = userPowerLevel >= requiredLevels.topic;
  const canEditAvatar = userPowerLevel >= requiredLevels.avatar;

  return {
    canEditName,
    canEditDescription,
    canEditAvatar,
    canEditAll: canEditName && canEditDescription && canEditAvatar,
  };
}

// =============================================================================
// Server Settings Manager Class
// =============================================================================

/**
 * Server settings manager for a specific room/server
 */
export class ServerSettingsManager {
  constructor(private roomId: string) {}

  /**
   * Get the room ID this manager is managing
   */
  getRoomId(): string {
    return this.roomId;
  }

  /**
   * Get current server settings
   */
  async getCurrentSettings(): Promise<ServerSettings> {
    return getServerSettings(this.roomId);
  }

  /**
   * Update server settings
   */
  async updateSettings(
    updateRequest: ServerSettingsUpdateRequest
  ): Promise<ServerSettingsUpdateResult> {
    return updateServerSettings(this.roomId, updateRequest);
  }

  /**
   * Update only the server name
   */
  async updateName(name: string): Promise<ServerSettingsUpdateResult> {
    return updateServerName(this.roomId, name);
  }

  /**
   * Update only the server description
   */
  async updateDescription(description: string | null): Promise<ServerSettingsUpdateResult> {
    return updateServerDescription(this.roomId, description);
  }

  /**
   * Update only the server avatar
   */
  async updateAvatar(avatarUrl: string | null): Promise<ServerSettingsUpdateResult> {
    return updateServerAvatar(this.roomId, avatarUrl);
  }

  /**
   * Check permissions for a user
   */
  async checkPermissions(userId: string): Promise<ServerSettingsPermissions> {
    return checkServerSettingsPermissions(this.roomId, userId);
  }
}

// =============================================================================
// Re-exports
// =============================================================================

export type {
  ServerSettings,
  ServerSettingsUpdateRequest,
  ServerSettingsUpdateResult,
  ServerSettingsPermissions,
} from './types/server-settings';