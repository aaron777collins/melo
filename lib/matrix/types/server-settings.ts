/**
 * Server Settings Types
 * 
 * TypeScript types for Matrix server/room settings management including
 * server name, description, and avatar/icon through Matrix room state events.
 */

// =============================================================================
// Core Server Settings Types  
// =============================================================================

/**
 * Server settings that can be modified through Matrix API
 */
export interface ServerSettings {
  /** Server name (maps to m.room.name event) */
  name: string;
  /** Server description/topic (maps to m.room.topic event) */
  description?: string | null;
  /** Server avatar URL (maps to m.room.avatar event) - MXC URL format */
  avatarUrl?: string | null;
}

/**
 * Server settings update request
 */
export interface ServerSettingsUpdateRequest {
  /** New server name (optional) */
  name?: string;
  /** New server description (optional, null to clear) */
  description?: string | null;
  /** New server avatar URL (optional, null to clear) - MXC URL format */
  avatarUrl?: string | null;
}

/**
 * Result of server settings update operation
 */
export interface ServerSettingsUpdateResult {
  /** Whether update was successful */
  success: boolean;
  /** Updated settings (null if update failed) */
  settings: ServerSettings | null;
  /** Error details if update failed */
  error?: ServerSettingsError;
}

/**
 * Server settings operation error
 */
export interface ServerSettingsError {
  /** Matrix error code (e.g., "M_FORBIDDEN", "M_NOT_FOUND") */
  code: string;
  /** Human-readable error message */
  message: string;
  /** HTTP status code if applicable */
  httpStatus?: number;
  /** Which field caused the error */
  field?: keyof ServerSettingsUpdateRequest;
}

// =============================================================================
// Matrix Event Types for Server Settings
// =============================================================================

/**
 * Matrix room name event content (m.room.name)
 */
export interface MatrixRoomNameEvent {
  name: string;
}

/**
 * Matrix room topic event content (m.room.topic)
 */
export interface MatrixRoomTopicEvent {
  topic: string;
}

/**
 * Matrix room avatar event content (m.room.avatar)
 */
export interface MatrixRoomAvatarEvent {
  /** MXC URL of the avatar image */
  url: string;
  /** Optional metadata about the avatar */
  info?: {
    /** Image width in pixels */
    w?: number;
    /** Image height in pixels */
    h?: number;
    /** MIME type (e.g., "image/png") */
    mimetype?: string;
    /** File size in bytes */
    size?: number;
  };
}

// =============================================================================
// Permission and Access Control
// =============================================================================

/**
 * Server settings permissions for a user
 */
export interface ServerSettingsPermissions {
  /** Can edit server name */
  canEditName: boolean;
  /** Can edit server description */
  canEditDescription: boolean;
  /** Can edit server avatar */
  canEditAvatar: boolean;
  /** Can edit any server settings (admin) */
  canEditAll: boolean;
}

/**
 * Minimum power level required for server settings operations
 */
export interface ServerSettingsPowerLevels {
  /** Power level required to change room name */
  name: number;
  /** Power level required to change room topic */
  topic: number;
  /** Power level required to change room avatar */
  avatar: number;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Type guard to check if an error is a server settings error
 */
export function isServerSettingsError(error: unknown): error is ServerSettingsError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    'message' in error &&
    typeof (error as any).code === 'string' &&
    typeof (error as any).message === 'string'
  );
}

/**
 * Create a server settings error from Matrix API error response
 */
export function createServerSettingsError(
  matrixError: any,
  field?: keyof ServerSettingsUpdateRequest
): ServerSettingsError {
  return {
    code: matrixError?.errcode || 'M_UNKNOWN',
    message: matrixError?.error || 'Unknown error occurred',
    httpStatus: matrixError?.httpStatus,
    field
  };
}

/**
 * Check if MXC URL is valid format
 */
export function isValidMxcUrl(url: string): boolean {
  return /^mxc:\/\/[a-zA-Z0-9.-]+\/[a-zA-Z0-9+/=_-]+$/.test(url);
}

/**
 * Validate server settings update request
 */
export function validateServerSettingsRequest(
  request: ServerSettingsUpdateRequest
): string[] {
  const errors: string[] = [];

  if (request.name !== undefined) {
    if (typeof request.name !== 'string') {
      errors.push('Server name must be a string');
    } else if (request.name.length === 0) {
      errors.push('Server name cannot be empty');
    } else if (request.name.length > 255) {
      errors.push('Server name must be 255 characters or less');
    }
  }

  if (request.description !== undefined && request.description !== null) {
    if (typeof request.description !== 'string') {
      errors.push('Server description must be a string or null');
    } else if (request.description.length > 1000) {
      errors.push('Server description must be 1000 characters or less');
    }
  }

  if (request.avatarUrl !== undefined && request.avatarUrl !== null) {
    if (typeof request.avatarUrl !== 'string') {
      errors.push('Server avatar URL must be a string or null');
    } else if (!isValidMxcUrl(request.avatarUrl)) {
      errors.push('Server avatar URL must be a valid MXC URL (mxc://...)');
    }
  }

  return errors;
}