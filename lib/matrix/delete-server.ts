/**
 * Matrix Server Deletion Utility
 * 
 * Implements the Matrix server (space) deletion pattern:
 * 1. Remove all child rooms from the space
 * 2. Try to kick other members (if user has admin permissions)
 * 3. Leave the space
 * 
 * Note: Matrix spaces can't be truly deleted, only left.
 * This removes the space from the user's perspective.
 */

import { getClient } from './client';

export interface DeleteServerOptions {
  serverId: string;
}

export interface DeleteServerError {
  code: 'CLIENT_NOT_AVAILABLE' | 'LEAVE_FAILED' | 'VALIDATION_ERROR';
  message: string;
  retryable: boolean;
  originalError?: Error;
}

export interface DeleteServerResult {
  success: boolean;
  error?: DeleteServerError;
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
 * Delete a Matrix server (space) using the comprehensive cleanup pattern
 */
export async function deleteServer(options: DeleteServerOptions): Promise<DeleteServerResult> {
  // Input validation
  if (!options.serverId || options.serverId.trim() === '') {
    throw new Error('serverId is required');
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

    const warnings: string[] = [];
    const userId = client.getUserId();

    // Step 1: Handle child rooms and member cleanup
    try {
      const room = client.getRoom(serverId);
      if (room) {
        // Get all child rooms and remove them from the space
        const spaceChildEvents = room.currentState.getStateEvents("m.space.child");
        for (const event of spaceChildEvents) {
          const childRoomId = event.getStateKey();
          if (childRoomId) {
            try {
              // Remove child from space first
              await client.sendStateEvent(
                serverId,
                "m.space.child" as any,
                {},
                childRoomId
              );
              // Then leave the child room
              await client.leave(childRoomId);
            } catch (e) {
              warnings.push(`Failed to remove child room ${childRoomId}: ${e instanceof Error ? e.message : 'Unknown error'}`);
            }
          }
        }

        // Try to kick all other members (requires admin power level)
        const members = room.getJoinedMembers();
        for (const member of members) {
          if (member.userId !== userId) {
            try {
              await client.kick(serverId, member.userId, "Server deleted");
            } catch (e) {
              // Ignore kick failures - user might not have permission
              warnings.push(`Could not remove member ${member.userId}: insufficient permissions`);
            }
          }
        }
      }
    } catch (error) {
      warnings.push(`Space cleanup had issues: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Step 2: Leave the space
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

    // Return success with any warnings
    return {
      success: true,
      warning: warnings.length > 0 ? warnings.join('; ') : undefined
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