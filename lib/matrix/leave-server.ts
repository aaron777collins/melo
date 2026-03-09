/**
 * Matrix Server Leave Utility
 * 
 * Implements the Matrix server leave pattern:
 * 1. Leave the main space/server
 * 2. Leave all child rooms within the space
 * 3. Handle cleanup and navigation
 */

import { getClient } from './client';

export interface LeaveServerOptions {
  serverId: string;
}

export interface LeaveServerError {
  code: 'CLIENT_NOT_AVAILABLE' | 'LEAVE_FAILED' | 'VALIDATION_ERROR';
  message: string;
  retryable: boolean;
  originalError?: Error;
}

export interface LeaveServerResult {
  success: boolean;
  error?: LeaveServerError;
  warning?: string;
}

/**
 * Validates Matrix space ID format
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
 * Leave a Matrix server/space and all its child rooms
 */
export async function leaveServer(options: LeaveServerOptions): Promise<LeaveServerResult> {
  // Input validation
  if (!options.serverId || options.serverId.trim() === '') {
    throw new Error('Server ID is required');
  }
  
  const serverId = decodeURIComponent(options.serverId);
  if (!isValidMatrixId(serverId)) {
    throw new Error('Invalid server ID format');
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

    // Step 1: Leave the main server/space
    try {
      await client.leave(serverId);
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'LEAVE_FAILED',
          message: `Failed to leave server: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: isErrorRetryable(error as Error),
          originalError: error as Error
        }
      };
    }

    // Step 2: Leave all child rooms within the space (optional - failures won't fail the operation)
    const warnings: string[] = [];
    try {
      const room = client.getRoom(serverId);
      if (room) {
        const spaceChildEvents = room.currentState.getStateEvents("m.space.child");
        for (const event of spaceChildEvents) {
          const childRoomId = event.getStateKey();
          if (childRoomId) {
            try {
              await client.leave(childRoomId);
            } catch (error) {
              warnings.push(`Failed to leave channel ${childRoomId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
              console.warn('Failed to leave child room:', childRoomId, error);
            }
          }
        }
      }
    } catch (error) {
      warnings.push(`Failed to process child rooms: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.warn('Failed to get space children:', error);
    }

    return {
      success: true,
      warning: warnings.length > 0 ? `Left server but encountered some issues: ${warnings.join('; ')}` : undefined
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