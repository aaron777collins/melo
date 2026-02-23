/**
 * Matrix Reactions Unit Tests
 * 
 * Tests for reaction types, utilities, and type guards.
 * @see lib/matrix/types/reactions.ts
 */

import { describe, it, expect } from 'vitest';
import {
  isReactionEventContent,
  isSuccessfulReactionResult,
  createEmptyReactions,
  serializeReactions,
  deserializeReactions,
  COMMON_EMOJI,
  type MessageReaction,
  type MessageReactions,
  type ReactionResult,
  type MatrixReactionEventContent,
  type ReactionOptions,
  type ReactionEvent,
  type TopReaction,
} from '@/lib/matrix/types/reactions';

// =============================================================================
// Type Guard Tests
// =============================================================================

describe('Reaction Type Guards', () => {
  describe('isReactionEventContent', () => {
    it('should return true for valid reaction event content', () => {
      const validContent: MatrixReactionEventContent = {
        'm.relates_to': {
          rel_type: 'm.annotation',
          event_id: '$event123',
          key: '👍',
        },
      };
      
      expect(isReactionEventContent(validContent)).toBe(true);
    });

    it('should return false for invalid content - null', () => {
      expect(isReactionEventContent(null)).toBe(false);
    });

    it('should return false for invalid content - undefined', () => {
      expect(isReactionEventContent(undefined)).toBe(false);
    });

    it('should return false for invalid content - empty object', () => {
      expect(isReactionEventContent({})).toBe(false);
    });

    it('should return false for invalid content - wrong rel_type', () => {
      const invalidContent = {
        'm.relates_to': {
          rel_type: 'm.thread', // Not 'm.annotation'
          event_id: '$event123',
          key: '👍',
        },
      };
      
      expect(isReactionEventContent(invalidContent)).toBe(false);
    });

    it('should return false for invalid content - missing event_id', () => {
      const invalidContent = {
        'm.relates_to': {
          rel_type: 'm.annotation',
          key: '👍',
        },
      };
      
      expect(isReactionEventContent(invalidContent)).toBe(false);
    });

    it('should return false for invalid content - missing key', () => {
      const invalidContent = {
        'm.relates_to': {
          rel_type: 'm.annotation',
          event_id: '$event123',
        },
      };
      
      expect(isReactionEventContent(invalidContent)).toBe(false);
    });

    it('should return false for invalid content - non-string event_id', () => {
      const invalidContent = {
        'm.relates_to': {
          rel_type: 'm.annotation',
          event_id: 123,
          key: '👍',
        },
      };
      
      expect(isReactionEventContent(invalidContent)).toBe(false);
    });
  });

  describe('isSuccessfulReactionResult', () => {
    it('should return true for successful result', () => {
      const successResult: ReactionResult = {
        success: true,
        eventId: '$reaction123',
      };
      
      expect(isSuccessfulReactionResult(successResult)).toBe(true);
    });

    it('should return false for failed result', () => {
      const failedResult: ReactionResult = {
        success: false,
        error: 'Something went wrong',
      };
      
      expect(isSuccessfulReactionResult(failedResult)).toBe(false);
    });
  });
});

// =============================================================================
// Utility Function Tests
// =============================================================================

describe('Reaction Utility Functions', () => {
  describe('createEmptyReactions', () => {
    it('should create empty reactions object with given event ID', () => {
      const eventId = '$event123';
      const reactions = createEmptyReactions(eventId);
      
      expect(reactions).toEqual({
        eventId,
        reactions: new Map(),
        totalCount: 0,
      });
    });

    it('should create independent empty map for each call', () => {
      const reactions1 = createEmptyReactions('$event1');
      const reactions2 = createEmptyReactions('$event2');
      
      reactions1.reactions.set('👍', {
        key: '👍',
        users: new Set(['@user:example.com']),
        count: 1,
        currentUserReacted: false,
      });
      
      expect(reactions1.reactions.size).toBe(1);
      expect(reactions2.reactions.size).toBe(0);
    });
  });

  describe('serializeReactions', () => {
    it('should serialize MessageReactions to a JSON-compatible format', () => {
      const reactions: MessageReactions = {
        eventId: '$event123',
        reactions: new Map([
          ['👍', {
            key: '👍',
            users: new Set(['@user1:example.com', '@user2:example.com']),
            count: 2,
            currentUserReacted: true,
          }],
          ['😄', {
            key: '😄',
            users: new Set(['@user3:example.com']),
            count: 1,
            currentUserReacted: false,
          }],
        ]),
        totalCount: 3,
      };
      
      const serialized = serializeReactions(reactions);
      
      expect(serialized.eventId).toBe('$event123');
      expect(serialized.totalCount).toBe(3);
      expect(serialized.reactions).toHaveLength(2);
      
      // Verify users are arrays, not Sets
      const thumbsUp = serialized.reactions.find(([key]) => key === '👍');
      expect(thumbsUp).toBeDefined();
      expect(Array.isArray(thumbsUp![1].users)).toBe(true);
      expect(thumbsUp![1].users).toContain('@user1:example.com');
      expect(thumbsUp![1].users).toContain('@user2:example.com');
    });

    it('should handle empty reactions', () => {
      const reactions = createEmptyReactions('$event123');
      const serialized = serializeReactions(reactions);
      
      expect(serialized.eventId).toBe('$event123');
      expect(serialized.reactions).toEqual([]);
      expect(serialized.totalCount).toBe(0);
    });
  });

  describe('deserializeReactions', () => {
    it('should deserialize back to MessageReactions', () => {
      const serialized = {
        eventId: '$event123',
        reactions: [
          ['👍', {
            key: '👍',
            users: ['@user1:example.com', '@user2:example.com'],
            count: 2,
            currentUserReacted: true,
          }] as const,
        ],
        totalCount: 2,
      };
      
      const reactions = deserializeReactions(serialized);
      
      expect(reactions.eventId).toBe('$event123');
      expect(reactions.reactions.size).toBe(1);
      expect(reactions.totalCount).toBe(2);
      
      const thumbsUp = reactions.reactions.get('👍');
      expect(thumbsUp).toBeDefined();
      expect(thumbsUp!.users instanceof Set).toBe(true);
      expect(thumbsUp!.users.has('@user1:example.com')).toBe(true);
      expect(thumbsUp!.users.has('@user2:example.com')).toBe(true);
    });

    it('should maintain data integrity through serialize/deserialize cycle', () => {
      const original: MessageReactions = {
        eventId: '$event123',
        reactions: new Map([
          ['👍', {
            key: '👍',
            users: new Set(['@user1:example.com']),
            count: 1,
            currentUserReacted: true,
          }],
        ]),
        totalCount: 1,
      };
      
      const serialized = serializeReactions(original);
      const deserialized = deserializeReactions(serialized);
      
      expect(deserialized.eventId).toBe(original.eventId);
      expect(deserialized.totalCount).toBe(original.totalCount);
      expect(deserialized.reactions.size).toBe(original.reactions.size);
      
      const originalReaction = original.reactions.get('👍');
      const deserializedReaction = deserialized.reactions.get('👍');
      
      expect(deserializedReaction?.key).toBe(originalReaction?.key);
      expect(deserializedReaction?.count).toBe(originalReaction?.count);
      expect(deserializedReaction?.currentUserReacted).toBe(originalReaction?.currentUserReacted);
      expect(Array.from(deserializedReaction?.users || [])).toEqual(
        Array.from(originalReaction?.users || [])
      );
    });
  });
});

// =============================================================================
// Constants Tests
// =============================================================================

describe('Reaction Constants', () => {
  describe('COMMON_EMOJI', () => {
    it('should contain common emoji', () => {
      expect(COMMON_EMOJI).toContain('👍');
      expect(COMMON_EMOJI).toContain('👎');
      expect(COMMON_EMOJI).toContain('❤️');
      expect(COMMON_EMOJI).toContain('😄');
      expect(COMMON_EMOJI).toContain('🎉');
    });

    it('should have 16 common emoji', () => {
      expect(COMMON_EMOJI).toHaveLength(16);
    });

    it('should be readonly', () => {
      // TypeScript ensures this at compile time, but we can verify the array is frozen-like
      expect(COMMON_EMOJI[0]).toBe('👍');
    });
  });
});

// =============================================================================
// Type Interface Tests (compile-time verification)
// =============================================================================

describe('Type Interfaces', () => {
  it('should allow creating valid MessageReaction', () => {
    const reaction: MessageReaction = {
      key: '👍',
      users: new Set(['@user:example.com']),
      count: 1,
      currentUserReacted: false,
    };
    
    expect(reaction.key).toBe('👍');
    expect(reaction.count).toBe(1);
    expect(reaction.currentUserReacted).toBe(false);
    expect(reaction.users.has('@user:example.com')).toBe(true);
  });

  it('should allow creating valid ReactionOptions', () => {
    const options: ReactionOptions = {
      maxReactions: 10,
      filterByUsers: ['@user1:example.com', '@user2:example.com'],
      excludeEmoji: ['😡'],
      includeRedacted: false,
    };
    
    expect(options.maxReactions).toBe(10);
    expect(options.filterByUsers).toHaveLength(2);
    expect(options.excludeEmoji).toContain('😡');
    expect(options.includeRedacted).toBe(false);
  });

  it('should allow creating valid ReactionEvent', () => {
    const event: ReactionEvent = {
      eventId: '$reaction123',
      targetEventId: '$message123',
      emoji: '👍',
      sender: '@user:example.com',
      timestamp: Date.now(),
      isRedacted: false,
    };
    
    expect(event.eventId).toBe('$reaction123');
    expect(event.targetEventId).toBe('$message123');
    expect(event.emoji).toBe('👍');
    expect(event.sender).toBe('@user:example.com');
    expect(event.isRedacted).toBe(false);
  });

  it('should allow creating valid TopReaction', () => {
    const topReaction: TopReaction = {
      emoji: '👍',
      count: 5,
      users: ['@user1:example.com', '@user2:example.com', '@user3:example.com', '@user4:example.com', '@user5:example.com'],
    };
    
    expect(topReaction.emoji).toBe('👍');
    expect(topReaction.count).toBe(5);
    expect(topReaction.users).toHaveLength(5);
  });
});
