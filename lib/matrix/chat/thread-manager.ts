/**
 * Thread Manager
 * 
 * Manages Matrix thread operations including creation, fetching, and synchronization
 * of threaded messages in Matrix rooms.
 */

import type { MatrixClient, MatrixEvent, Room } from '@/lib/matrix/matrix-sdk-exports';
import { EventType, RelationType, MsgType } from '@/lib/matrix/matrix-sdk-exports';

// =============================================================================
// Types
// =============================================================================

/**
 * Thread metadata information
 */
export interface ThreadMetadata {
  /** Root event ID that started the thread */
  rootEventId: string;
  /** Room ID containing the thread */
  roomId: string;
  /** Number of replies in thread */
  replyCount: number;
  /** Latest reply timestamp */
  latestReplyTs: number;
  /** Thread participants (user IDs) */
  participants: Set<string>;
  /** Whether current user participated */
  userParticipated: boolean;
}

/**
 * Thread reply event data
 */
export interface ThreadReply {
  /** The Matrix event */
  event: MatrixEvent;
  /** Event ID */
  eventId: string;
  /** Sender user ID */
  sender: string;
  /** Message content */
  content: string;
  /** Original timestamp */
  timestamp: number;
  /** Whether message was edited */
  isEdited: boolean;
  /** Whether message was redacted */
  isRedacted: boolean;
}

/**
 * Thread summary for UI display
 */
export interface ThreadSummary {
  /** Thread metadata */
  metadata: ThreadMetadata;
  /** Recent replies (limited set) */
  recentReplies: ThreadReply[];
  /** Whether more replies are available */
  hasMoreReplies: boolean;
}

/**
 * Options for thread operations
 */
export interface ThreadOptions {
  /** Maximum replies to fetch */
  maxReplies?: number;
  /** Include edited messages */
  includeEdited?: boolean;
  /** Include redacted messages */
  includeRedacted?: boolean;
  /** Filter by sender */
  filterBySender?: string;
}

/**
 * Thread creation result
 */
export interface ThreadCreateResult {
  success: boolean;
  eventId?: string;
  error?: string;
}

// =============================================================================
// Thread Manager Class
// =============================================================================

export class ThreadManager {
  private client: MatrixClient;
  private threadCache = new Map<string, ThreadMetadata>();
  private repliesCache = new Map<string, ThreadReply[]>();

  constructor(client: MatrixClient) {
    this.client = client;
    this.setupEventListeners();
  }

  // =============================================================================
  // Public API
  // =============================================================================

  /**
   * Get thread metadata for a specific root event
   */
  async getThreadMetadata(roomId: string, rootEventId: string): Promise<ThreadMetadata | null> {
    const cacheKey = `${roomId}:${rootEventId}`;
    
    // Return cached data if available
    if (this.threadCache.has(cacheKey)) {
      return this.threadCache.get(cacheKey)!;
    }

    const room = this.client.getRoom(roomId);
    if (!room) return null;

    const metadata = await this.buildThreadMetadata(room, rootEventId);
    if (metadata) {
      this.threadCache.set(cacheKey, metadata);
    }

    return metadata;
  }

  /**
   * Get all thread replies for a root event
   */
  async getThreadReplies(
    roomId: string, 
    rootEventId: string, 
    options: ThreadOptions = {}
  ): Promise<ThreadReply[]> {
    const cacheKey = `${roomId}:${rootEventId}`;
    
    // Check cache first
    if (this.repliesCache.has(cacheKey)) {
      return this.applyOptionsFilter(this.repliesCache.get(cacheKey)!, options);
    }

    const room = this.client.getRoom(roomId);
    if (!room) return [];

    const replies = await this.fetchThreadReplies(room, rootEventId);
    this.repliesCache.set(cacheKey, replies);

    return this.applyOptionsFilter(replies, options);
  }

  /**
   * Get thread summary (metadata + recent replies)
   */
  async getThreadSummary(
    roomId: string, 
    rootEventId: string, 
    options: ThreadOptions = {}
  ): Promise<ThreadSummary | null> {
    const metadata = await this.getThreadMetadata(roomId, rootEventId);
    if (!metadata) return null;

    const allReplies = await this.getThreadReplies(roomId, rootEventId, options);
    const maxReplies = options.maxReplies || 10;
    
    const recentReplies = allReplies
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, maxReplies);

    return {
      metadata,
      recentReplies,
      hasMoreReplies: allReplies.length > maxReplies,
    };
  }

  /**
   * Send a reply to a thread
   */
  async sendThreadReply(
    roomId: string, 
    rootEventId: string, 
    content: string
  ): Promise<ThreadCreateResult> {
    if (!content.trim()) {
      return { success: false, error: 'Content cannot be empty' };
    }

    try {
      const eventId = await this.client.sendMessage(roomId, {
        msgtype: MsgType.Text,
        body: content.trim(),
        'm.relates_to': {
          rel_type: RelationType.Thread,
          event_id: rootEventId,
        },
      });

      // Invalidate cache for this thread
      this.invalidateThreadCache(roomId, rootEventId);

      return { success: true, eventId };
    } catch (error) {
      console.error('Failed to send thread reply:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get all threads in a room
   */
  async getRoomThreads(roomId: string, options: ThreadOptions = {}): Promise<ThreadSummary[]> {
    const room = this.client.getRoom(roomId);
    if (!room) return [];

    const threadRootIds = await this.findThreadRoots(room);
    const threads: ThreadSummary[] = [];

    for (const rootEventId of threadRootIds) {
      const summary = await this.getThreadSummary(roomId, rootEventId, options);
      if (summary) {
        threads.push(summary);
      }
    }

    // Sort by latest activity
    return threads.sort((a, b) => b.metadata.latestReplyTs - a.metadata.latestReplyTs);
  }

  /**
   * Check if an event is part of a thread
   */
  isThreadReply(event: MatrixEvent): boolean {
    const relation = event.getRelation();
    return relation?.rel_type === RelationType.Thread;
  }

  /**
   * Get the root event ID for a thread reply
   */
  getThreadRootId(event: MatrixEvent): string | null {
    if (!this.isThreadReply(event)) return null;
    const relation = event.getRelation();
    return relation?.event_id || null;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.threadCache.clear();
    this.repliesCache.clear();
  }

  /**
   * Invalidate cache for specific thread
   */
  invalidateThreadCache(roomId: string, rootEventId: string): void {
    const cacheKey = `${roomId}:${rootEventId}`;
    this.threadCache.delete(cacheKey);
    this.repliesCache.delete(cacheKey);
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  /**
   * Build thread metadata from room events
   */
  private async buildThreadMetadata(room: Room, rootEventId: string): Promise<ThreadMetadata | null> {
    const timeline = room.getLiveTimeline();
    const events = timeline.getEvents();
    
    const threadReplies = events.filter(event => {
      const relation = event.getRelation();
      return relation?.rel_type === RelationType.Thread && relation.event_id === rootEventId;
    });

    if (threadReplies.length === 0) return null;

    const participants = new Set<string>();
    let latestReplyTs = 0;
    const currentUserId = this.client.getUserId();

    threadReplies.forEach(event => {
      const sender = event.getSender();
      if (sender) participants.add(sender);
      latestReplyTs = Math.max(latestReplyTs, event.getTs());
    });

    return {
      rootEventId,
      roomId: room.roomId,
      replyCount: threadReplies.length,
      latestReplyTs,
      participants,
      userParticipated: currentUserId ? participants.has(currentUserId) : false,
    };
  }

  /**
   * Fetch all thread replies from room timeline
   */
  private async fetchThreadReplies(room: Room, rootEventId: string): Promise<ThreadReply[]> {
    const timeline = room.getLiveTimeline();
    const events = timeline.getEvents();

    const threadEvents = events.filter(event => {
      const relation = event.getRelation();
      return (
        relation?.rel_type === RelationType.Thread && 
        relation.event_id === rootEventId &&
        event.getType() === EventType.RoomMessage
      );
    });

    return threadEvents.map(event => ({
      event,
      eventId: event.getId() || '',
      sender: event.getSender() || '',
      content: event.getContent().body || '',
      timestamp: event.getTs(),
      isEdited: event.isBeingDecrypted() || false,
      isRedacted: event.isRedacted(),
    }));
  }

  /**
   * Find all thread root event IDs in a room
   */
  private async findThreadRoots(room: Room): Promise<string[]> {
    const timeline = room.getLiveTimeline();
    const events = timeline.getEvents();
    
    const threadRoots = new Set<string>();

    events.forEach(event => {
      if (this.isThreadReply(event)) {
        const rootId = this.getThreadRootId(event);
        if (rootId) threadRoots.add(rootId);
      }
    });

    return Array.from(threadRoots);
  }

  /**
   * Apply filtering options to thread replies
   */
  private applyOptionsFilter(replies: ThreadReply[], options: ThreadOptions): ThreadReply[] {
    let filtered = [...replies];

    if (!options.includeEdited) {
      filtered = filtered.filter(reply => !reply.isEdited);
    }

    if (!options.includeRedacted) {
      filtered = filtered.filter(reply => !reply.isRedacted);
    }

    if (options.filterBySender) {
      filtered = filtered.filter(reply => reply.sender === options.filterBySender);
    }

    if (options.maxReplies) {
      filtered = filtered.slice(0, options.maxReplies);
    }

    return filtered;
  }

  /**
   * Setup event listeners for real-time updates
   */
  private setupEventListeners(): void {
    this.client.on('Room.timeline' as any, (event: MatrixEvent, room: Room) => {
      if (this.isThreadReply(event)) {
        const rootId = this.getThreadRootId(event);
        if (rootId) {
          this.invalidateThreadCache(room.roomId, rootId);
        }
      }
    });

    this.client.on('Room.timelineReset' as any, (room: Room) => {
      // Clear all caches for this room
      for (const [key] of this.threadCache) {
        if (key.startsWith(`${room.roomId}:`)) {
          this.threadCache.delete(key);
          this.repliesCache.delete(key);
        }
      }
    });
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new thread manager instance
 */
export function createThreadManager(client: MatrixClient): ThreadManager {
  return new ThreadManager(client);
}

// =============================================================================
// Type Exports
// =============================================================================

export type {
  ThreadMetadata,
  ThreadReply,
  ThreadSummary,
  ThreadOptions,
  ThreadCreateResult,
};