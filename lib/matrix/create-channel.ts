/**
 * Matrix Channel Creation Utility
 * 
 * Implements the Matrix channel creation pattern:
 * 1. Create an encrypted room with proper settings
 * 2. Link to parent space
 * 3. Set channel-specific metadata
 */

import { getClient } from './client';

export interface CreateChannelOptions {
  name: string;
  type: 'TEXT' | 'AUDIO' | 'VIDEO';
  spaceId: string;
  categoryId?: string;
  userId?: string;
}

export interface CreateChannelError {
  code: 'CLIENT_NOT_AVAILABLE' | 'CREATE_FAILED' | 'LINK_FAILED' | 'VALIDATION_ERROR';
  message: string;
  retryable: boolean;
  originalError?: Error;
}

export interface CreateChannelResult {
  success: boolean;
  roomId?: string;
  error?: CreateChannelError;
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
 * Create a Matrix channel room with proper encryption and space linking
 */
export async function createChannel(options: CreateChannelOptions): Promise<CreateChannelResult> {
  // Input validation
  if (!options.name || options.name.trim() === '') {
    throw new Error('Channel name is required');
  }
  
  if (options.name.trim() === 'general') {
    throw new Error('Channel name cannot be "general"');
  }
  
  if (!options.spaceId || options.spaceId.trim() === '') {
    throw new Error('Space ID is required');
  }
  
  if (!['TEXT', 'AUDIO', 'VIDEO'].includes(options.type)) {
    throw new Error('Invalid channel type');
  }
  
  const spaceId = decodeURIComponent(options.spaceId);
  if (!isValidMatrixId(spaceId)) {
    throw new Error('Invalid space ID format');
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

    // Determine homeserver for via field
    const homeserver = options.userId?.split(':')[1] || 'matrix.org';

    // Step 1: Create the encrypted channel room
    let channelRoom;
    try {
      channelRoom = await client.createRoom({
        name: options.name,
        topic: `${options.type.toLowerCase()} channel`,
        visibility: 'private' as any,
        preset: 'private_chat' as any,
        initial_state: [
          // E2EE is MANDATORY - all rooms must be encrypted
          {
            type: 'm.room.encryption',
            state_key: '',
            content: { algorithm: 'm.megolm.v1.aes-sha2' }
          },
          // Link to parent space
          {
            type: 'm.space.parent',
            state_key: spaceId,
            content: {
              via: [homeserver],
              canonical: true
            }
          },
          // Set channel type in custom state event
          {
            type: 'melo.channel.type',
            state_key: '',
            content: { type: options.type }
          }
        ]
      });
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CREATE_FAILED',
          message: `Failed to create channel: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryable: isErrorRetryable(error as Error),
          originalError: error as Error
        }
      };
    }

    // Step 2: Add the channel to the space
    let warning: string | undefined;
    try {
      await client.sendStateEvent(
        spaceId,
        'm.space.child' as any,
        {
          via: [homeserver],
          suggested: true,
          order: options.categoryId || ''
        },
        channelRoom.room_id
      );
    } catch (error) {
      warning = `Channel created but failed to link to space: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.warn('Space linking failed:', error);
    }

    return {
      success: true,
      roomId: channelRoom.room_id,
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