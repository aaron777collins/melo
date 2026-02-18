/**
 * Reaction Handler
 * 
 * Manages Matrix message reactions including adding, removing, and tracking
 * emoji reactions on messages in Matrix rooms.
 */

import type { MatrixClient, MatrixEvent, Room } from '@/lib/matrix/matrix-sdk-exports';
import { EventType, RelationType } from '@/lib/matrix/matrix-sdk-exports';

// =============================================================================
// Types
// =============================================================================

/**
 * Reaction data structure
 */
export interface MessageReaction {
  /** The emoji key (e.g., "👍", "😄") */
  key: string;
  /** Users who reacted with this emoji */
  users: Set<string>;
  /** Total count of this reaction */
  count: number;
  /** Whether current user reacted with this */
  currentUserReacted: boolean;
}

/**
 * All reactions for a message
 */
export interface MessageReactions {
  /** Event ID of the message */
  eventId: string;
  /** Map of emoji key to reaction data */
  reactions: Map<string, MessageReaction>;
  /** Total reaction count */
  totalCount: number;
}

/**
 * Result of a reaction operation
 */
export interface ReactionResult {
  success: boolean;
  eventId?: string;
  error?: string;
}

/**
 * Options for reaction operations
 */
export interface ReactionOptions {
  /** Maximum reactions to track per message */
  maxReactions?: number;
  /** Include reactions from specific users only */
  filterByUsers?: string[];
  /** Exclude specific emoji */
  excludeEmoji?: string[];
}

/**
 * Reaction event data
 */
export interface ReactionEvent {
  /** The reaction event */
  event: MatrixEvent;
  /** Target message event ID */
  targetEventId: string;
  /** Emoji key */
  emoji: string;
  /** User who reacted */
  sender: string;
  /** Timestamp */
  timestamp: number;
  /** Whether this is adding or removing reaction */
  isRemoval: boolean;
}

// =============================================================================
// Reaction Handler Class
// =============================================================================

export class ReactionHandler {
  private client: MatrixClient;
  private reactionCache = new Map<string, MessageReactions>();

  constructor(client: MatrixClient) {
    this.client = client;
    this.setupEventListeners();
  }

  // =============================================================================
  // Public API
  // =============================================================================

  /**
   * Get all reactions for a message
   */
  async getMessageReactions(
    roomId: string, 
    eventId: string, 
    options: ReactionOptions = {}
  ): Promise<MessageReactions> {
    const cacheKey = `${roomId}:${eventId}`;
    
    // Return cached data if available
    if (this.reactionCache.has(cacheKey)) {
      return this.applyOptionsFilter(this.reactionCache.get(cacheKey)!, options);
    }

    const room = this.client.getRoom(roomId);
    if (!room) {
      return this.createEmptyReactions(eventId);
    }

    const reactions = await this.buildMessageReactions(room, eventId);
    this.reactionCache.set(cacheKey, reactions);

    return this.applyOptionsFilter(reactions, options);
  }

  /**
   * Add a reaction to a message
   */
  async addReaction(roomId: string, eventId: string, emoji: string): Promise<ReactionResult> {
    if (!emoji.trim()) {
      return { success: false, error: 'Emoji cannot be empty' };
    }

    try {
      // Check if user already reacted with this emoji
      const currentReactions = await this.getMessageReactions(roomId, eventId);
      const existingReaction = currentReactions.reactions.get(emoji);
      
      if (existingReaction?.currentUserReacted) {
        return { success: false, error: 'You have already reacted with this emoji' };
      }

      const reactionEventId = await this.client.sendEvent(roomId, EventType.Reaction, {
        'm.relates_to': {
          rel_type: RelationType.Annotation,
          event_id: eventId,
          key: emoji,
        },
      });

      // Invalidate cache
      this.invalidateReactionCache(roomId, eventId);

      return { success: true, eventId: reactionEventId };
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
   */
  async removeReaction(roomId: string, eventId: string, emoji: string): Promise<ReactionResult> {
    try {
      const room = this.client.getRoom(roomId);
      if (!room) {
        return { success: false, error: 'Room not found' };
      }

      // Find the reaction event to redact
      const reactionEventId = await this.findUserReactionEvent(room, eventId, emoji);
      
      if (!reactionEventId) {
        return { success: false, error: 'Reaction not found' };
      }

      await this.client.redactEvent(roomId, reactionEventId);

      // Invalidate cache
      this.invalidateReactionCache(roomId, eventId);

      return { success: true };
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
   */
  async toggleReaction(roomId: string, eventId: string, emoji: string): Promise<ReactionResult> {
    const reactions = await this.getMessageReactions(roomId, eventId);
    const existingReaction = reactions.reactions.get(emoji);

    if (existingReaction?.currentUserReacted) {
      return this.removeReaction(roomId, eventId, emoji);
    } else {
      return this.addReaction(roomId, eventId, emoji);
    }
  }

  /**
   * Get reaction summary for multiple messages
   */
  async getMultipleMessageReactions(
    roomId: string, 
    eventIds: string[],
    options: ReactionOptions = {}
  ): Promise<Map<string, MessageReactions>> {
    const results = new Map<string, MessageReactions>();

    await Promise.all(
      eventIds.map(async (eventId) => {
        const reactions = await this.getMessageReactions(roomId, eventId, options);
        results.set(eventId, reactions);
      })
    );

    return results;
  }

  /**
   * Get top reactions in a room
   */
  async getTopReactions(
    roomId: string, 
    limit: number = 10
  ): Promise<Array<{ emoji: string; count: number; users: string[] }>> {
    const room = this.client.getRoom(roomId);
    if (!room) return [];

    const emojiCounts = new Map<string, Set<string>>();
    const timeline = room.getLiveTimeline();
    const events = timeline.getEvents();

    // Collect all reaction events
    events.forEach(event => {
      if (this.isReactionEvent(event)) {
        const emoji = this.getReactionEmoji(event);
        const sender = event.getSender();
        
        if (emoji && sender) {
          if (!emojiCounts.has(emoji)) {
            emojiCounts.set(emoji, new Set());
          }
          emojiCounts.get(emoji)!.add(sender);
        }
      }
    });

    // Convert to sorted array
    return Array.from(emojiCounts.entries())
      .map(([emoji, users]) => ({
        emoji,
        count: users.size,
        users: Array.from(users),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Check if current user has reacted to a message
   */
  async hasUserReacted(roomId: string, eventId: string, emoji?: string): Promise<boolean> {
    const reactions = await this.getMessageReactions(roomId, eventId);
    
    if (emoji) {
      const reaction = reactions.reactions.get(emoji);
      return reaction?.currentUserReacted || false;
    } else {
      // Check if user has reacted with any emoji
      return Array.from(reactions.reactions.values()).some(r => r.currentUserReacted);
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.reactionCache.clear();
  }

  /**
   * Invalidate cache for specific message
   */
  invalidateReactionCache(roomId: string, eventId: string): void {
    const cacheKey = `${roomId}:${eventId}`;
    this.reactionCache.delete(cacheKey);
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  /**
   * Create empty reactions object
   */
  private createEmptyReactions(eventId: string): MessageReactions {
    return {
      eventId,
      reactions: new Map(),
      totalCount: 0,
    };
  }

  /**
   * Build reactions data from room events
   */
  private async buildMessageReactions(room: Room, eventId: string): Promise<MessageReactions> {
    const timeline = room.getLiveTimeline();
    const events = timeline.getEvents();
    const currentUserId = this.client.getUserId();
    
    const reactions = new Map<string, MessageReaction>();

    // Find all reaction events for this message
    events.forEach(event => {
      if (this.isReactionEvent(event) && this.getReactionTargetId(event) === eventId) {
        const emoji = this.getReactionEmoji(event);
        const sender = event.getSender();
        
        if (emoji && sender && !event.isRedacted()) {
          if (!reactions.has(emoji)) {
            reactions.set(emoji, {
              key: emoji,
              users: new Set(),
              count: 0,
              currentUserReacted: false,
            });
          }
          
          const reaction = reactions.get(emoji)!;
          reaction.users.add(sender);
          reaction.count = reaction.users.size;
          
          if (sender === currentUserId) {
            reaction.currentUserReacted = true;
          }
        }
      }
    });

    const totalCount = Array.from(reactions.values()).reduce((sum, r) => sum + r.count, 0);

    return {
      eventId,
      reactions,
      totalCount,
    };
  }

  /**
   * Check if event is a reaction
   */
  private isReactionEvent(event: MatrixEvent): boolean {
    return event.getType() === EventType.Reaction;
  }

  /**
   * Get emoji from reaction event
   */
  private getReactionEmoji(event: MatrixEvent): string | null {
    const relation = event.getRelation();
    return (relation?.rel_type === RelationType.Annotation) ? relation.key : null;
  }

  /**
   * Get target event ID from reaction event
   */
  private getReactionTargetId(event: MatrixEvent): string | null {
    const relation = event.getRelation();
    return (relation?.rel_type === RelationType.Annotation) ? relation.event_id : null;
  }

  /**
   * Find user's reaction event for a specific emoji
   */
  private async findUserReactionEvent(
    room: Room, 
    targetEventId: string, 
    emoji: string
  ): Promise<string | null> {
    const timeline = room.getLiveTimeline();
    const events = timeline.getEvents();
    const currentUserId = this.client.getUserId();

    for (const event of events) {
      if (
        this.isReactionEvent(event) &&
        this.getReactionTargetId(event) === targetEventId &&
        this.getReactionEmoji(event) === emoji &&
        event.getSender() === currentUserId &&
        !event.isRedacted()
      ) {
        return event.getId();
      }
    }

    return null;
  }

  /**
   * Apply filtering options to reactions
   */
  private applyOptionsFilter(reactions: MessageReactions, options: ReactionOptions): MessageReactions {
    const filtered = new Map<string, MessageReaction>();
    let maxReactions = options.maxReactions || Infinity;

    for (const [emoji, reaction] of reactions.reactions) {
      // Skip excluded emoji
      if (options.excludeEmoji?.includes(emoji)) continue;
      
      // Apply user filtering
      if (options.filterByUsers?.length) {
        const filteredUsers = new Set(
          Array.from(reaction.users).filter(user => options.filterByUsers!.includes(user))
        );
        
        if (filteredUsers.size === 0) continue;
        
        filtered.set(emoji, {
          ...reaction,
          users: filteredUsers,
          count: filteredUsers.size,
          currentUserReacted: filteredUsers.has(this.client.getUserId() || ''),
        });
      } else {
        filtered.set(emoji, reaction);
      }

      maxReactions--;
      if (maxReactions <= 0) break;
    }

    const totalCount = Array.from(filtered.values()).reduce((sum, r) => sum + r.count, 0);

    return {
      eventId: reactions.eventId,
      reactions: filtered,
      totalCount,
    };
  }

  /**
   * Setup event listeners for real-time updates
   */
  private setupEventListeners(): void {
    this.client.on('Room.timeline' as any, (event: MatrixEvent, room: Room) => {
      if (this.isReactionEvent(event)) {
        const targetEventId = this.getReactionTargetId(event);
        if (targetEventId) {
          this.invalidateReactionCache(room.roomId, targetEventId);
        }
      }
    });

    this.client.on('Room.timelineReset' as any, (room: Room) => {
      // Clear all caches for this room
      for (const [key] of this.reactionCache) {
        if (key.startsWith(`${room.roomId}:`)) {
          this.reactionCache.delete(key);
        }
      }
    });

    // Handle reaction redaction (removal)
    this.client.on('Room.redaction' as any, (event: MatrixEvent, room: Room) => {
      const redactedEvent = event.getAssociatedStatus();
      if (redactedEvent && this.isReactionEvent(redactedEvent)) {
        const targetEventId = this.getReactionTargetId(redactedEvent);
        if (targetEventId) {
          this.invalidateReactionCache(room.roomId, targetEventId);
        }
      }
    });
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new reaction handler instance
 */
export function createReactionHandler(client: MatrixClient): ReactionHandler {
  return new ReactionHandler(client);
}

// =============================================================================
// Type Exports
// =============================================================================

export type {
  MessageReaction,
  MessageReactions,
  ReactionResult,
  ReactionOptions,
  ReactionEvent,
};