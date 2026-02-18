/**
 * Reaction Handler Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReactionHandler } from '@/lib/matrix/chat/reaction-handler';
import type { MatrixClient, MatrixEvent, Room } from '@/lib/matrix/matrix-sdk-exports';

// Mock Matrix SDK exports
vi.mock('@/lib/matrix/matrix-sdk-exports', () => ({
  EventType: {
    RoomMessage: 'm.room.message',
    Reaction: 'm.reaction',
  },
  RelationType: {
    Thread: 'm.thread',
    Annotation: 'm.annotation',
  },
}));

describe('ReactionHandler', () => {
  let mockClient: jest.Mocked<MatrixClient>;
  let mockRoom: jest.Mocked<Room>;
  let mockTimeline: any;
  let reactionHandler: ReactionHandler;

  const ROOM_ID = '!room123:example.com';
  const MESSAGE_EVENT_ID = '$message123';
  const CURRENT_USER = '@user:example.com';

  beforeEach(() => {
    // Create mock timeline
    mockTimeline = {
      getEvents: vi.fn(() => []),
    };

    // Create mock room
    mockRoom = {
      roomId: ROOM_ID,
      getLiveTimeline: vi.fn(() => mockTimeline),
      on: vi.fn(),
      off: vi.fn(),
    } as any;

    // Create mock client
    mockClient = {
      getUserId: vi.fn(() => CURRENT_USER),
      getRoom: vi.fn(() => mockRoom),
      sendEvent: vi.fn(),
      redactEvent: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    } as any;

    reactionHandler = new ReactionHandler(mockClient);
  });

  describe('getMessageReactions', () => {
    it('should return empty reactions for message with no reactions', async () => {
      mockTimeline.getEvents.mockReturnValue([]);

      const reactions = await reactionHandler.getMessageReactions(ROOM_ID, MESSAGE_EVENT_ID);

      expect(reactions).toEqual({
        eventId: MESSAGE_EVENT_ID,
        reactions: new Map(),
        totalCount: 0,
      });
    });

    it('should build reactions from room events', async () => {
      const reactionEvents = [
        createMockReactionEvent('👍', '@user1:example.com', MESSAGE_EVENT_ID),
        createMockReactionEvent('👍', '@user2:example.com', MESSAGE_EVENT_ID),
        createMockReactionEvent('😄', CURRENT_USER, MESSAGE_EVENT_ID),
      ];

      mockTimeline.getEvents.mockReturnValue(reactionEvents);

      const reactions = await reactionHandler.getMessageReactions(ROOM_ID, MESSAGE_EVENT_ID);

      expect(reactions.eventId).toBe(MESSAGE_EVENT_ID);
      expect(reactions.reactions.size).toBe(2);
      expect(reactions.totalCount).toBe(3);

      const thumbsUp = reactions.reactions.get('👍');
      expect(thumbsUp).toEqual({
        key: '👍',
        users: new Set(['@user1:example.com', '@user2:example.com']),
        count: 2,
        currentUserReacted: false,
      });

      const smiley = reactions.reactions.get('😄');
      expect(smiley).toEqual({
        key: '😄',
        users: new Set([CURRENT_USER]),
        count: 1,
        currentUserReacted: true,
      });
    });

    it('should filter out redacted reactions', async () => {
      const reactionEvents = [
        createMockReactionEvent('👍', '@user1:example.com', MESSAGE_EVENT_ID),
        createMockReactionEvent('👍', '@user2:example.com', MESSAGE_EVENT_ID, true), // redacted
      ];

      mockTimeline.getEvents.mockReturnValue(reactionEvents);

      const reactions = await reactionHandler.getMessageReactions(ROOM_ID, MESSAGE_EVENT_ID);

      const thumbsUp = reactions.reactions.get('👍');
      expect(thumbsUp?.count).toBe(1);
      expect(thumbsUp?.users.has('@user2:example.com')).toBe(false);
    });

    it('should cache reaction results', async () => {
      const reactionEvents = [
        createMockReactionEvent('👍', '@user1:example.com', MESSAGE_EVENT_ID),
      ];

      mockTimeline.getEvents.mockReturnValue(reactionEvents);

      // First call
      const reactions1 = await reactionHandler.getMessageReactions(ROOM_ID, MESSAGE_EVENT_ID);
      
      // Second call should use cache
      const reactions2 = await reactionHandler.getMessageReactions(ROOM_ID, MESSAGE_EVENT_ID);

      expect(reactions1).toStrictEqual(reactions2);
      expect(mockRoom.getLiveTimeline).toHaveBeenCalledTimes(1);
    });
  });

  describe('addReaction', () => {
    it('should add reaction successfully', async () => {
      const reactionEventId = '$reaction123';
      mockClient.sendEvent.mockResolvedValue(reactionEventId);
      mockTimeline.getEvents.mockReturnValue([]); // No existing reactions

      const result = await reactionHandler.addReaction(ROOM_ID, MESSAGE_EVENT_ID, '👍');

      expect(result).toEqual({
        success: true,
        eventId: reactionEventId,
      });

      expect(mockClient.sendEvent).toHaveBeenCalledWith(ROOM_ID, 'm.reaction', {
        'm.relates_to': {
          rel_type: 'm.annotation',
          event_id: MESSAGE_EVENT_ID,
          key: '👍',
        },
      });
    });

    it('should reject duplicate reactions from same user', async () => {
      const existingReaction = createMockReactionEvent('👍', CURRENT_USER, MESSAGE_EVENT_ID);
      mockTimeline.getEvents.mockReturnValue([existingReaction]);

      const result = await reactionHandler.addReaction(ROOM_ID, MESSAGE_EVENT_ID, '👍');

      expect(result).toEqual({
        success: false,
        error: 'You have already reacted with this emoji',
      });

      expect(mockClient.sendEvent).not.toHaveBeenCalled();
    });

    it('should reject empty emoji', async () => {
      const result = await reactionHandler.addReaction(ROOM_ID, MESSAGE_EVENT_ID, '   ');

      expect(result).toEqual({
        success: false,
        error: 'Emoji cannot be empty',
      });
    });

    it('should handle send errors', async () => {
      const error = new Error('Network error');
      mockClient.sendEvent.mockRejectedValue(error);
      mockTimeline.getEvents.mockReturnValue([]);

      const result = await reactionHandler.addReaction(ROOM_ID, MESSAGE_EVENT_ID, '👍');

      expect(result).toEqual({
        success: false,
        error: 'Network error',
      });
    });
  });

  describe('removeReaction', () => {
    it('should remove reaction successfully', async () => {
      const reactionEvent = createMockReactionEvent('👍', CURRENT_USER, MESSAGE_EVENT_ID, false, '$reaction123');
      mockTimeline.getEvents.mockReturnValue([reactionEvent]);
      mockClient.redactEvent.mockResolvedValue({});

      const result = await reactionHandler.removeReaction(ROOM_ID, MESSAGE_EVENT_ID, '👍');

      expect(result).toEqual({
        success: true,
      });

      expect(mockClient.redactEvent).toHaveBeenCalledWith(ROOM_ID, '$reaction123');
    });

    it('should handle reaction not found', async () => {
      mockTimeline.getEvents.mockReturnValue([]);

      const result = await reactionHandler.removeReaction(ROOM_ID, MESSAGE_EVENT_ID, '👍');

      expect(result).toEqual({
        success: false,
        error: 'Reaction not found',
      });
    });

    it('should handle redact errors', async () => {
      const reactionEvent = createMockReactionEvent('👍', CURRENT_USER, MESSAGE_EVENT_ID, false, '$reaction123');
      mockTimeline.getEvents.mockReturnValue([reactionEvent]);
      
      const error = new Error('Permission denied');
      mockClient.redactEvent.mockRejectedValue(error);

      const result = await reactionHandler.removeReaction(ROOM_ID, MESSAGE_EVENT_ID, '👍');

      expect(result).toEqual({
        success: false,
        error: 'Permission denied',
      });
    });
  });

  describe('toggleReaction', () => {
    it('should add reaction when not present', async () => {
      mockTimeline.getEvents.mockReturnValue([]);
      mockClient.sendEvent.mockResolvedValue('$reaction123');

      const result = await reactionHandler.toggleReaction(ROOM_ID, MESSAGE_EVENT_ID, '👍');

      expect(result.success).toBe(true);
      expect(mockClient.sendEvent).toHaveBeenCalled();
    });

    it('should remove reaction when present', async () => {
      const reactionEvent = createMockReactionEvent('👍', CURRENT_USER, MESSAGE_EVENT_ID, false, '$reaction123');
      mockTimeline.getEvents.mockReturnValue([reactionEvent]);
      mockClient.redactEvent.mockResolvedValue({});

      const result = await reactionHandler.toggleReaction(ROOM_ID, MESSAGE_EVENT_ID, '👍');

      expect(result.success).toBe(true);
      expect(mockClient.redactEvent).toHaveBeenCalled();
    });
  });

  describe('hasUserReacted', () => {
    it('should return true when user has reacted with specific emoji', async () => {
      const reactionEvent = createMockReactionEvent('👍', CURRENT_USER, MESSAGE_EVENT_ID);
      mockTimeline.getEvents.mockReturnValue([reactionEvent]);

      const hasReacted = await reactionHandler.hasUserReacted(ROOM_ID, MESSAGE_EVENT_ID, '👍');

      expect(hasReacted).toBe(true);
    });

    it('should return false when user has not reacted with specific emoji', async () => {
      const reactionEvent = createMockReactionEvent('😄', CURRENT_USER, MESSAGE_EVENT_ID);
      mockTimeline.getEvents.mockReturnValue([reactionEvent]);

      const hasReacted = await reactionHandler.hasUserReacted(ROOM_ID, MESSAGE_EVENT_ID, '👍');

      expect(hasReacted).toBe(false);
    });

    it('should return true when user has reacted with any emoji (no emoji specified)', async () => {
      const reactionEvent = createMockReactionEvent('👍', CURRENT_USER, MESSAGE_EVENT_ID);
      mockTimeline.getEvents.mockReturnValue([reactionEvent]);

      const hasReacted = await reactionHandler.hasUserReacted(ROOM_ID, MESSAGE_EVENT_ID);

      expect(hasReacted).toBe(true);
    });
  });

  describe('getTopReactions', () => {
    it('should return top reactions sorted by count', async () => {
      const reactionEvents = [
        createMockReactionEvent('👍', '@user1:example.com', MESSAGE_EVENT_ID),
        createMockReactionEvent('👍', '@user2:example.com', MESSAGE_EVENT_ID),
        createMockReactionEvent('👍', '@user3:example.com', MESSAGE_EVENT_ID),
        createMockReactionEvent('😄', '@user1:example.com', MESSAGE_EVENT_ID),
        createMockReactionEvent('😄', '@user2:example.com', MESSAGE_EVENT_ID),
        createMockReactionEvent('❤️', '@user1:example.com', MESSAGE_EVENT_ID),
      ];

      mockTimeline.getEvents.mockReturnValue(reactionEvents);

      const topReactions = await reactionHandler.getTopReactions(ROOM_ID, 2);

      expect(topReactions).toHaveLength(2);
      expect(topReactions[0]).toEqual({
        emoji: '👍',
        count: 3,
        users: ['@user1:example.com', '@user2:example.com', '@user3:example.com'],
      });
      expect(topReactions[1]).toEqual({
        emoji: '😄',
        count: 2,
        users: ['@user1:example.com', '@user2:example.com'],
      });
    });

    it('should handle empty room', async () => {
      mockClient.getRoom.mockReturnValue(null);

      const topReactions = await reactionHandler.getTopReactions(ROOM_ID);

      expect(topReactions).toEqual([]);
    });
  });

  describe('cache management', () => {
    it('should clear all caches', () => {
      reactionHandler.clearCache();
      // No assertions needed - just ensure no errors
    });

    it('should invalidate specific message cache', () => {
      reactionHandler.invalidateReactionCache(ROOM_ID, MESSAGE_EVENT_ID);
      // No assertions needed - just ensure no errors
    });
  });
});

// =============================================================================
// Test Helpers
// =============================================================================

function createMockReactionEvent(
  emoji: string,
  sender: string,
  targetEventId: string,
  isRedacted: boolean = false,
  eventId: string = '$reaction' + Math.random()
): jest.Mocked<MatrixEvent> {
  return {
    getId: vi.fn(() => eventId),
    getSender: vi.fn(() => sender),
    getType: vi.fn(() => 'm.reaction'),
    isRedacted: vi.fn(() => isRedacted),
    getRelation: vi.fn(() => ({
      rel_type: 'm.annotation',
      event_id: targetEventId,
      key: emoji,
    })),
  } as any;
}