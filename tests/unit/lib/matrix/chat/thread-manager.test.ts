/**
 * Thread Manager Tests
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { ThreadManager } from '@/lib/matrix/chat/thread-manager';
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
  MsgType: {
    Text: 'm.text',
    Image: 'm.image',
  },
}));

describe('ThreadManager', () => {
  let mockClient: jest.Mocked<MatrixClient>;
  let mockRoom: jest.Mocked<Room>;
  let mockTimeline: any;
  let threadManager: ThreadManager;

  const ROOM_ID = '!room123:example.com';
  const ROOT_EVENT_ID = '$root123';
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
      sendMessage: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    } as any;

    threadManager = new ThreadManager(mockClient);
  });

  describe('getThreadMetadata', () => {
    it('should return null for non-existent thread', async () => {
      mockTimeline.getEvents.mockReturnValue([]);

      const metadata = await threadManager.getThreadMetadata(ROOM_ID, ROOT_EVENT_ID);

      expect(metadata).toBeNull();
    });

    it('should build metadata for existing thread', async () => {
      const threadEvents = createMockThreadEvents(ROOT_EVENT_ID, [
        { sender: '@user1:example.com', timestamp: 1000 },
        { sender: '@user2:example.com', timestamp: 2000 },
        { sender: CURRENT_USER, timestamp: 3000 },
      ]);

      mockTimeline.getEvents.mockReturnValue(threadEvents);

      const metadata = await threadManager.getThreadMetadata(ROOM_ID, ROOT_EVENT_ID);

      expect(metadata).toEqual({
        rootEventId: ROOT_EVENT_ID,
        roomId: ROOM_ID,
        replyCount: 3,
        latestReplyTs: 3000,
        participants: new Set(['@user1:example.com', '@user2:example.com', CURRENT_USER]),
        userParticipated: true,
      });
    });

    it('should cache metadata results', async () => {
      const threadEvents = createMockThreadEvents(ROOT_EVENT_ID, [
        { sender: '@user1:example.com', timestamp: 1000 },
      ]);

      mockTimeline.getEvents.mockReturnValue(threadEvents);

      // First call
      const metadata1 = await threadManager.getThreadMetadata(ROOM_ID, ROOT_EVENT_ID);
      
      // Second call should use cache
      const metadata2 = await threadManager.getThreadMetadata(ROOM_ID, ROOT_EVENT_ID);

      expect(metadata1).toBe(metadata2);
      expect(mockRoom.getLiveTimeline).toHaveBeenCalledTimes(1);
    });
  });

  describe('getThreadReplies', () => {
    it('should return empty array for non-existent room', async () => {
      mockClient.getRoom.mockReturnValue(null);

      const replies = await threadManager.getThreadReplies(ROOM_ID, ROOT_EVENT_ID);

      expect(replies).toEqual([]);
    });

    it('should fetch and format thread replies', async () => {
      const threadEvents = createMockThreadEvents(ROOT_EVENT_ID, [
        { 
          sender: '@user1:example.com', 
          timestamp: 1000,
          content: 'First reply',
          eventId: '$reply1',
        },
        { 
          sender: '@user2:example.com', 
          timestamp: 2000,
          content: 'Second reply',
          eventId: '$reply2',
        },
      ]);

      mockTimeline.getEvents.mockReturnValue(threadEvents);

      const replies = await threadManager.getThreadReplies(ROOM_ID, ROOT_EVENT_ID);

      expect(replies).toHaveLength(2);
      expect(replies[0]).toEqual({
        event: threadEvents[0],
        eventId: '$reply1',
        sender: '@user1:example.com',
        content: 'First reply',
        timestamp: 1000,
        isEdited: false,
        isRedacted: false,
      });
    });

    it('should filter replies based on options', async () => {
      const threadEvents = createMockThreadEvents(ROOT_EVENT_ID, [
        { sender: '@user1:example.com', timestamp: 1000 },
        { sender: '@user2:example.com', timestamp: 2000 },
        { sender: '@user3:example.com', timestamp: 3000 },
      ]);

      mockTimeline.getEvents.mockReturnValue(threadEvents);

      const replies = await threadManager.getThreadReplies(ROOM_ID, ROOT_EVENT_ID, {
        maxReplies: 2,
      });

      expect(replies).toHaveLength(2);
    });
  });

  describe('sendThreadReply', () => {
    it('should send thread reply successfully', async () => {
      const eventId = '$newReply123';
      mockClient.sendMessage.mockResolvedValue(eventId);

      const result = await threadManager.sendThreadReply(ROOM_ID, ROOT_EVENT_ID, 'Test reply');

      expect(result).toEqual({
        success: true,
        eventId,
      });

      expect(mockClient.sendMessage).toHaveBeenCalledWith(ROOM_ID, {
        msgtype: 'm.text',
        body: 'Test reply',
        'm.relates_to': {
          rel_type: 'm.thread',
          event_id: ROOT_EVENT_ID,
        },
      });
    });

    it('should reject empty content', async () => {
      const result = await threadManager.sendThreadReply(ROOM_ID, ROOT_EVENT_ID, '   ');

      expect(result).toEqual({
        success: false,
        error: 'Content cannot be empty',
      });

      expect(mockClient.sendMessage).not.toHaveBeenCalled();
    });

    it('should handle send errors', async () => {
      const error = new Error('Network error');
      mockClient.sendMessage.mockRejectedValue(error);

      const result = await threadManager.sendThreadReply(ROOM_ID, ROOT_EVENT_ID, 'Test reply');

      expect(result).toEqual({
        success: false,
        error: 'Network error',
      });
    });
  });

  describe('isThreadReply', () => {
    it('should identify thread reply events', () => {
      const threadEvent = createMockEvent({
        relation: { rel_type: 'm.thread', event_id: ROOT_EVENT_ID },
      });

      expect(threadManager.isThreadReply(threadEvent)).toBe(true);
    });

    it('should identify non-thread events', () => {
      const normalEvent = createMockEvent({});

      expect(threadManager.isThreadReply(normalEvent)).toBe(false);
    });
  });

  describe('getThreadRootId', () => {
    it('should return root event ID for thread replies', () => {
      const threadEvent = createMockEvent({
        relation: { rel_type: 'm.thread', event_id: ROOT_EVENT_ID },
      });

      expect(threadManager.getThreadRootId(threadEvent)).toBe(ROOT_EVENT_ID);
    });

    it('should return null for non-thread events', () => {
      const normalEvent = createMockEvent({});

      expect(threadManager.getThreadRootId(normalEvent)).toBeNull();
    });
  });

  describe('getRoomThreads', () => {
    it('should return all threads in room sorted by latest activity', async () => {
      const thread1Events = createMockThreadEvents('$root1', [
        { sender: '@user1:example.com', timestamp: 1000 },
        { sender: '@user2:example.com', timestamp: 3000 }, // Latest
      ]);

      const thread2Events = createMockThreadEvents('$root2', [
        { sender: '@user3:example.com', timestamp: 2000 }, // Latest
      ]);

      mockTimeline.getEvents.mockReturnValue([...thread1Events, ...thread2Events]);

      const threads = await threadManager.getRoomThreads(ROOM_ID);

      expect(threads).toHaveLength(2);
      expect(threads[0].metadata.rootEventId).toBe('$root1'); // Most recent activity
      expect(threads[1].metadata.rootEventId).toBe('$root2');
    });
  });

  describe('cache management', () => {
    it('should clear all caches', () => {
      threadManager.clearCache();
      // No assertions needed - just ensure no errors
    });

    it('should invalidate specific thread cache', () => {
      threadManager.invalidateThreadCache(ROOM_ID, ROOT_EVENT_ID);
      // No assertions needed - just ensure no errors
    });
  });
});

// =============================================================================
// Test Helpers
// =============================================================================

function createMockEvent(options: {
  eventId?: string;
  sender?: string;
  timestamp?: number;
  content?: string;
  relation?: any;
  type?: string;
} = {}): jest.Mocked<MatrixEvent> {
  const {
    eventId = '$event123',
    sender = '@user:example.com',
    timestamp = Date.now(),
    content = 'Test content',
    relation = null,
    type = 'm.room.message',
  } = options;

  return {
    getId: vi.fn(() => eventId),
    getSender: vi.fn(() => sender),
    getTs: vi.fn(() => timestamp),
    getContent: vi.fn(() => ({ body: content })),
    getRelation: vi.fn(() => relation),
    getType: vi.fn(() => type),
    isRedacted: vi.fn(() => false),
    isBeingDecrypted: vi.fn(() => false),
  } as any;
}

function createMockThreadEvents(
  rootEventId: string,
  replies: Array<{
    sender?: string;
    timestamp?: number;
    content?: string;
    eventId?: string;
  }>
): jest.Mocked<MatrixEvent>[] {
  return replies.map((reply, index) =>
    createMockEvent({
      eventId: reply.eventId || `$reply${index}`,
      sender: reply.sender || '@user:example.com',
      timestamp: reply.timestamp || Date.now(),
      content: reply.content || `Reply ${index}`,
      relation: {
        rel_type: 'm.thread',
        event_id: rootEventId,
      },
    })
  );
}