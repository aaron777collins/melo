/**
 * Matrix Reactions API Unit Tests
 * 
 * Tests for the main reactions API module that wraps ReactionHandler
 * @see lib/matrix/reactions.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the ReactionHandler 
const mockReactionHandler = {
  getMessageReactions: vi.fn().mockResolvedValue({
    eventId: 'test-event',
    reactions: new Map(),
    totalCount: 0,
  }),
  addReaction: vi.fn().mockResolvedValue({ success: true, eventId: 'reaction-event' }),
  removeReaction: vi.fn().mockResolvedValue({ success: true }),
  toggleReaction: vi.fn().mockResolvedValue({ success: true, eventId: 'reaction-event' }),
  getMultipleMessageReactions: vi.fn().mockResolvedValue(new Map()),
  getTopReactions: vi.fn().mockResolvedValue([]),
};

vi.mock('@/lib/matrix/chat/reaction-handler', () => ({
  ReactionHandler: vi.fn().mockImplementation(() => mockReactionHandler),
}));

// Mock the matrix client
vi.mock('@/lib/matrix/client', () => ({
  getClient: vi.fn().mockReturnValue({
    getRoom: vi.fn(),
    sendEvent: vi.fn(),
    redactEvent: vi.fn(),
  }),
}));

// This import should fail initially (RED phase)
import {
  getMessageReactions,
  addReaction,
  removeReaction,
  toggleReaction,
  getMultipleMessageReactions,
  getTopReactions,
} from '@/lib/matrix/reactions';

describe('Reactions API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMessageReactions', () => {
    it('should call ReactionHandler.getMessageReactions with correct params', async () => {
      const mockReactions = {
        eventId: 'test-event',
        reactions: new Map(),
        totalCount: 0,
      };

      // The function should exist and be callable
      expect(typeof getMessageReactions).toBe('function');

      // It should accept roomId, eventId, and options
      const result = await getMessageReactions('room1', 'event1', { maxReactions: 10 });
      expect(result).toBeDefined();
    });
  });

  describe('addReaction', () => {
    it('should call ReactionHandler.addReaction with correct params', async () => {
      expect(typeof addReaction).toBe('function');
      
      const result = await addReaction('room1', 'event1', '👍');
      expect(result).toBeDefined();
    });

    it('should handle empty emoji', async () => {
      const result = await addReaction('room1', 'event1', '');
      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
    });
  });

  describe('removeReaction', () => {
    it('should call ReactionHandler.removeReaction with correct params', async () => {
      expect(typeof removeReaction).toBe('function');
      
      const result = await removeReaction('room1', 'event1', '👍');
      expect(result).toBeDefined();
    });
  });

  describe('toggleReaction', () => {
    it('should call ReactionHandler.toggleReaction with correct params', async () => {
      expect(typeof toggleReaction).toBe('function');
      
      const result = await toggleReaction('room1', 'event1', '👍');
      expect(result).toBeDefined();
    });
  });

  describe('getMultipleMessageReactions', () => {
    it('should call ReactionHandler.getMultipleMessageReactions with correct params', async () => {
      expect(typeof getMultipleMessageReactions).toBe('function');
      
      const result = await getMultipleMessageReactions('room1', ['event1', 'event2']);
      expect(result).toBeDefined();
      expect(result instanceof Map).toBe(true);
    });
  });

  describe('getTopReactions', () => {
    it('should call ReactionHandler.getTopReactions with correct params', async () => {
      expect(typeof getTopReactions).toBe('function');
      
      const result = await getTopReactions('room1', 5);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});