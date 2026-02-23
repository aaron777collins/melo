/**
 * Matrix Reactions API
 * 
 * Main API module for Matrix emoji reactions. Provides a simple interface
 * over the ReactionHandler class for adding, removing, and managing reactions.
 * 
 * @see lib/matrix/chat/reaction-handler.ts
 * @see lib/matrix/types/reactions.ts
 */

import { ReactionHandler } from '@/lib/matrix/chat/reaction-handler';
import { getClient } from '@/lib/matrix/client';
import type { 
  MessageReactions, 
  ReactionResult, 
  ReactionOptions 
} from '@/lib/matrix/chat/reaction-handler';

// Global reaction handler instance
let reactionHandler: ReactionHandler | null = null;

/**
 * Get or create the reaction handler instance
 */
function getReactionHandler(): ReactionHandler {
  if (!reactionHandler) {
    const client = getClient();
    if (!client) {
      throw new Error('Matrix client not initialized');
    }
    reactionHandler = new ReactionHandler(client);
  }
  return reactionHandler;
}

/**
 * Get all reactions for a message
 * 
 * @param roomId The Matrix room ID
 * @param eventId The message event ID
 * @param options Optional filtering and display options
 * @returns Promise with message reactions data
 */
export async function getMessageReactions(
  roomId: string, 
  eventId: string, 
  options: ReactionOptions = {}
): Promise<MessageReactions> {
  try {
    const handler = getReactionHandler();
    return await handler.getMessageReactions(roomId, eventId, options);
  } catch (error) {
    console.error('Failed to get message reactions:', error);
    // Return empty reactions on error
    return {
      eventId,
      reactions: new Map(),
      totalCount: 0,
    };
  }
}

/**
 * Add a reaction to a message
 * 
 * @param roomId The Matrix room ID
 * @param eventId The message event ID to react to
 * @param emoji The emoji to add as a reaction
 * @returns Promise with operation result
 */
export async function addReaction(
  roomId: string, 
  eventId: string, 
  emoji: string
): Promise<ReactionResult> {
  try {
    if (!emoji.trim()) {
      return { success: false, error: 'Emoji cannot be empty' };
    }

    const handler = getReactionHandler();
    return await handler.addReaction(roomId, eventId, emoji);
  } catch (error) {
    console.error('Failed to add reaction:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Remove a reaction from a message
 * 
 * @param roomId The Matrix room ID
 * @param eventId The message event ID
 * @param emoji The emoji reaction to remove
 * @returns Promise with operation result
 */
export async function removeReaction(
  roomId: string, 
  eventId: string, 
  emoji: string
): Promise<ReactionResult> {
  try {
    const handler = getReactionHandler();
    return await handler.removeReaction(roomId, eventId, emoji);
  } catch (error) {
    console.error('Failed to remove reaction:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Toggle a reaction (add if not present, remove if present)
 * 
 * @param roomId The Matrix room ID
 * @param eventId The message event ID
 * @param emoji The emoji to toggle
 * @returns Promise with operation result
 */
export async function toggleReaction(
  roomId: string, 
  eventId: string, 
  emoji: string
): Promise<ReactionResult> {
  try {
    const handler = getReactionHandler();
    return await handler.toggleReaction(roomId, eventId, emoji);
  } catch (error) {
    console.error('Failed to toggle reaction:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get reactions for multiple messages
 * 
 * @param roomId The Matrix room ID
 * @param eventIds Array of message event IDs
 * @param options Optional filtering and display options
 * @returns Promise with Map of eventId to MessageReactions
 */
export async function getMultipleMessageReactions(
  roomId: string, 
  eventIds: string[],
  options: ReactionOptions = {}
): Promise<Map<string, MessageReactions>> {
  try {
    const handler = getReactionHandler();
    return await handler.getMultipleMessageReactions(roomId, eventIds, options);
  } catch (error) {
    console.error('Failed to get multiple message reactions:', error);
    // Return empty map on error
    return new Map();
  }
}

/**
 * Get top reactions in a room
 * 
 * @param roomId The Matrix room ID
 * @param limit Maximum number of top reactions to return (default: 10)
 * @returns Promise with array of top reactions
 */
export async function getTopReactions(
  roomId: string, 
  limit: number = 10
): Promise<Array<{ emoji: string; count: number; users: string[] }>> {
  try {
    const handler = getReactionHandler();
    return await handler.getTopReactions(roomId, limit);
  } catch (error) {
    console.error('Failed to get top reactions:', error);
    // Return empty array on error
    return [];
  }
}

/**
 * Reset the reaction handler instance (for testing)
 * @internal
 */
export function _resetReactionHandler(): void {
  reactionHandler = null;
}

/**
 * Check if reaction handler is initialized
 * @returns true if handler exists
 */
export function isReactionHandlerInitialized(): boolean {
  return reactionHandler !== null;
}

// Re-export types from ReactionHandler for convenience
export type { MessageReactions, ReactionResult, ReactionOptions } from '@/lib/matrix/chat/reaction-handler';

// Re-export common types from the types module
export type { 
  MessageReaction,
  MatrixReactionEventContent,
  ReactionEvent,
  TopReaction
} from '@/lib/matrix/types/reactions';