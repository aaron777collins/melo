/**
 * Matrix Room Deletion Utility
 * 
 * Implements the Matrix room deletion pattern:
 * 1. Leave the room
 * 2. Forget the room (removes it from user's view)
 * 3. Remove from space (if applicable)
 * 
 * Note: Matrix rooms can't be truly deleted, only forgotten.
 * This removes the room from the user's perspective.
 */

import { getClient } from './client';

export interface DeleteRoomOptions {
  roomId: string;
  spaceId?: string;
}

export interface DeleteRoomError {
  code: 'CLIENT_NOT_AVAILABLE' | 'LEAVE_FAILED' | 'FORGET_FAILED' | 'VALIDATION_ERROR';
  message: string;
  retryable: boolean;
  originalError?: Error;
}

export interface DeleteRoomResult {
  success: boolean;
  error?: DeleteRoomError;
  warning?: string;
}

/**
 * Validates Matrix room/space ID format
 */
function isValidMatrixId(id: string): boolean {
  return /^!.+:.+/.test(id);
}

/**
 * Determines if an error should be retryable based on the error message
 */
function isErrorRetryable(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  // Permission errors are not retryable
  if (message.includes('forbidden') || message.includes('permission')) {
    return false;
  }
  
  // Network/temporary errors are retryable
  if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
    return true;
  }
  
  // By default, assume retryable unless explicitly a permission error
  return true;
}

/**
 * Delete a Matrix room using the leave + forget pattern
 */
export async function deleteRoom(options: DeleteRoomOptions): Promise<DeleteRoomResult> {
  // Input validation
  if (!options.roomId || options.roomId.trim() === '') {
    throw new Error('roomId is required');
  }
  
  const roomId = decodeURIComponent(options.roomId);
  if (!isValidMatrixId(roomId)) {
    throw new Error('Invalid room ID format');
  }
  
  if (options.spaceId) {
    const spaceId = decodeURIComponent(options.spaceId);
    if (!isValidMatrixId(spaceId)) {
      throw new Error('Invalid space ID format');
    }
  }

  try {
    const client = getClient();
    if (!client) {
      return {
        success: false,
        error: {
          code: 'CLIENT_NOT_AVAILABLE',
          message: 'Matrix client not initialized. Please try again.',
          retryable: true
        }
      };
    }

    // Step 1: Leave the room
    try {
      await client.leave(roomId);
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'LEAVE_FAILED',
          message: `Failed to leave room: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: isErrorRetryable(error as Error),
          originalError: error as Error
        }
      };
    }

    // Step 2: Forget the room
    try {
      await client.forget(roomId);
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FORGET_FAILED',
          message: `Failed to forget room: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: isErrorRetryable(error as Error),
          originalError: error as Error
        }
      };
    }

    // Step 3: Remove from space (if specified) - this is optional and shouldn't fail the operation
    let warning: string | undefined;
    if (options.spaceId) {
      try {
        const spaceId = decodeURIComponent(options.spaceId);
        await client.sendStateEvent(
          spaceId,
          'm.space.child' as any,
          {},
          roomId
        );
      } catch (error) {
        warning = `Failed to remove channel from space: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.warn('Space removal failed:', error);
      }
    }

    return {
      success: true,
      warning
    };

  } catch (error) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        retryable: true,
        originalError: error as Error
      }
    };
  }
}