/**
 * useRoomMessages Hook
 *
 * Provides access to room message timeline with real-time updates and
 * pagination support. Listens to Matrix timeline events to keep messages
 * synchronized with the server, including edit/delete updates.
 *
 * @module hooks/use-room-messages
 * @see {@link ../components/providers/matrix-provider.tsx} - Parent context provider
 * @see {@link ./use-room.ts} - Related room data hook
 *
 * @example
 * ```tsx
 * import { useRoomMessages } from '@/hooks/use-room-messages';
 *
 * function MessagesList({ roomId }: { roomId: string }) {
 *   const { messages, isLoading, loadMore, hasMore } = useRoomMessages(roomId);
 *
 *   if (isLoading) {
 *     return <div>Loading messages...</div>;
 *   }
 *
 *   return (
 *     <div>
 *       {hasMore && (
 *         <button onClick={loadMore}>Load older messages</button>
 *       )}
 *       {messages.map(event => (
 *         <MessageComponent key={event.getId()} event={event} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */

"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {  
  type MatrixEvent, 
  RoomEvent,
  EventType,
 } from "@/lib/matrix/matrix-sdk-exports";

import { useRoom } from "./use-room";
import { useMatrix } from "@/components/providers/matrix-provider";

// =============================================================================
// Types
// =============================================================================

/**
 * Type alias for timeline events (messages) in a room
 */
export type TimelineEvent = MatrixEvent;

/**
 * Options for the useRoomMessages hook
 */
interface UseRoomMessagesOptions {
  /**
   * Number of messages to load initially
   * @default 50
   */
  initialBatchSize?: number;
  
  /**
   * Number of messages to load when paginating
   * @default 25
   */
  paginationBatchSize?: number;
  
  /**
   * Whether to automatically scroll to bottom on new messages
   * @default false
   */
  autoScrollToBottom?: boolean;
  
  /**
   * Message types to include in the timeline
   * @default ["m.room.message", "m.room.encrypted"]
   */
  includeEventTypes?: string[];
}

/**
 * Return type for the useRoomMessages hook
 */
interface UseRoomMessagesReturn {
  /**
   * Array of timeline events (messages) in chronological order.
   * Oldest messages first, newest messages last.
   */
  messages: TimelineEvent[];

  /**
   * Whether the hook is in a loading state.
   * True during initial load or when loading more messages.
   */
  isLoading: boolean;

  /**
   * Whether there are more (older) messages available to load.
   */
  hasMore: boolean;

  /**
   * Function to load more (older) messages.
   * Returns a Promise that resolves when loading is complete.
   */
  loadMore: () => Promise<void>;

  /**
   * Error state if message loading failed.
   */
  error: Error | null;

  /**
   * Whether the hook is currently loading more messages.
   */
  isLoadingMore: boolean;
}

// =============================================================================
// Custom Errors
// =============================================================================

/**
 * Error thrown when useRoomMessages is used outside of MatrixProvider
 */
class RoomMessagesContextError extends Error {
  constructor() {
    super(
      "useRoomMessages must be used within a MatrixProvider. " +
        "Ensure your component tree is wrapped with:\n\n" +
        "  <MatrixAuthProvider>\n" +
        "    <MatrixProvider>\n" +
        "      {/* your components */}\n" +
        "    </MatrixProvider>\n" +
        "  </MatrixAuthProvider>\n\n" +
        "See: components/providers/matrix-provider.tsx"
    );
    this.name = "RoomMessagesContextError";
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Default event types to include in message timeline
 */
const DEFAULT_MESSAGE_EVENT_TYPES = [
  EventType.RoomMessage,
  EventType.RoomEncryption,
];

/**
 * Filters events to only include message-like events
 */
function isMessageEvent(event: MatrixEvent, includeEventTypes: string[]): boolean {
  const eventType = event.getType();
  return includeEventTypes.includes(eventType);
}

/**
 * Gets timeline events from a room, filtered to message events
 */
function getFilteredTimelineEvents(
  room: any, // Room type, but being defensive
  includeEventTypes: string[]
): TimelineEvent[] {
  if (!room) return [];

  try {
    // Get live timeline events (most recent messages)
    const timeline = room.getLiveTimeline();
    if (!timeline) return [];

    const events = timeline.getEvents() || [];
    
    // Filter to only message events and sort chronologically
    return events
      .filter((event: MatrixEvent) => isMessageEvent(event, includeEventTypes))
      .sort((a: MatrixEvent, b: MatrixEvent) => {
        const aTime = a.getTs();
        const bTime = b.getTs();
        return aTime - bTime; // Oldest first
      });
  } catch (error) {
    console.warn("[useRoomMessages] Error getting timeline events:", error);
    return [];
  }
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook to access room message timeline with real-time updates and pagination.
 *
 * Provides chronological list of messages with support for loading older
 * messages via pagination. Updates in real-time as new messages arrive
 * or existing messages are edited/deleted.
 *
 * @param roomId - The Matrix room ID to watch
 * @param options - Configuration options for the hook
 * @returns Object containing messages, loading states, and pagination functions
 *
 * @throws {RoomMessagesContextError} If used outside of MatrixProvider
 *
 * @example Basic usage
 * ```tsx
 * function ChatView({ roomId }: { roomId: string }) {
 *   const { messages, isLoading, loadMore, hasMore } = useRoomMessages(roomId);
 *
 *   if (isLoading) return <ChatSkeleton />;
 *
 *   return (
 *     <div className="chat-container">
 *       {hasMore && (
 *         <button onClick={loadMore} className="load-more-btn">
 *           Load older messages
 *         </button>
 *       )}
 *       <div className="messages">
 *         {messages.map(event => (
 *           <Message key={event.getId()} event={event} />
 *         ))}
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example With custom options
 * ```tsx
 * function ChatView({ roomId }: { roomId: string }) {
 *   const { messages, isLoading, loadMore } = useRoomMessages(roomId, {
 *     initialBatchSize: 100,
 *     paginationBatchSize: 50,
 *     includeEventTypes: [EventType.RoomMessage, EventType.Sticker],
 *   });
 *
 *   // ... rest of component
 * }
 * ```
 */
export function useRoomMessages(
  roomId: string, 
  options: UseRoomMessagesOptions = {}
): UseRoomMessagesReturn {
  // Extract options with defaults
  const {
    initialBatchSize = 50,
    paginationBatchSize = 25,
    includeEventTypes = DEFAULT_MESSAGE_EVENT_TYPES,
  } = options;

  // Access Matrix context
  let matrixContext: ReturnType<typeof useMatrix>;

  try {
    matrixContext = useMatrix();
  } catch {
    throw new RoomMessagesContextError();
  }

  const { client, isReady } = matrixContext;

  // Access room data through useRoom hook
  const { room, isLoading: roomLoading, error: roomError } = useRoom(roomId);

  // Local state
  const [messages, setMessages] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Track if we've loaded initial messages for this room
  const initialLoadRef = useRef<string | null>(null);
  
  // Track timeline token for pagination
  const timelineTokenRef = useRef<string | null>(null);

  // =============================================================================
  // Message Loading
  // =============================================================================

  const loadInitialMessages = useCallback(async () => {
    if (!room || !isReady || !client) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      setIsLoading(true);

      // Get current timeline events
      const timelineEvents = getFilteredTimelineEvents(room, includeEventTypes);
      
      setMessages(timelineEvents);
      
      // Check if we have fewer messages than requested, suggesting we've hit the start
      if (timelineEvents.length < initialBatchSize) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      initialLoadRef.current = roomId;

    } catch (err) {
      const errorMessage = err instanceof Error ? err : new Error('Failed to load messages');
      console.error(`[useRoomMessages] Error loading initial messages for room ${roomId}:`, err);
      setError(errorMessage);
      setMessages([]);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [room, isReady, client, roomId, initialBatchSize, includeEventTypes]);

  const loadMoreMessages = useCallback(async (): Promise<void> => {
    if (!room || !client || isLoadingMore || !hasMore) {
      return;
    }

    try {
      setError(null);
      setIsLoadingMore(true);

      // Use Matrix SDK's scrollback functionality
      const timeline = room.getLiveTimeline();
      if (!timeline) {
        setHasMore(false);
        return;
      }

      // Request more events from the server
      const canPaginate = await client.paginateEventTimeline(timeline, {
        backwards: true,
        limit: paginationBatchSize,
      });

      if (!canPaginate) {
        setHasMore(false);
        return;
      }

      // Refresh messages from the updated timeline
      const updatedEvents = getFilteredTimelineEvents(room, includeEventTypes);
      setMessages(updatedEvents);

      // If we got fewer messages than requested, we've likely hit the beginning
      if (updatedEvents.length - messages.length < paginationBatchSize) {
        setHasMore(false);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err : new Error('Failed to load more messages');
      console.error(`[useRoomMessages] Error loading more messages for room ${roomId}:`, err);
      setError(errorMessage);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [room, client, isLoadingMore, hasMore, paginationBatchSize, includeEventTypes, roomId, messages.length]);

  // =============================================================================
  // Timeline Event Handlers
  // =============================================================================

  const handleTimelineEvent = useCallback((event: MatrixEvent, room: any, toStartOfTimeline?: boolean) => {
    // Only handle events for our room
    if (room?.roomId !== roomId) return;

    // Only handle message events
    if (!isMessageEvent(event, includeEventTypes)) return;

    // For new events (not backfill), add to the end
    if (!toStartOfTimeline) {
      setMessages(prev => {
        // Check if event already exists (deduplication)
        const eventId = event.getId();
        if (prev.some(e => e.getId() === eventId)) {
          return prev;
        }

        // Add new event to the end (chronological order)
        return [...prev, event];
      });
    } else {
      // For backfilled events, refresh the entire timeline
      // This ensures proper chronological ordering
      if (room) {
        const updatedEvents = getFilteredTimelineEvents(room, includeEventTypes);
        setMessages(updatedEvents);
      }
    }
  }, [roomId, includeEventTypes]);

  const handleEventRedaction = useCallback((event: MatrixEvent, room: any) => {
    // Only handle redactions for our room
    if (room?.roomId !== roomId) return;

    // Refresh messages to reflect redacted content
    if (room) {
      const updatedEvents = getFilteredTimelineEvents(room, includeEventTypes);
      setMessages(updatedEvents);
    }
  }, [roomId, includeEventTypes]);

  // =============================================================================
  // Effects
  // =============================================================================

  // Main effect - load initial messages and set up event listeners
  useEffect(() => {
    // Reset state when room changes
    if (initialLoadRef.current !== roomId) {
      setMessages([]);
      setIsLoading(true);
      setError(null);
      setHasMore(true);
      timelineTokenRef.current = null;
    }

    // Propagate room errors
    if (roomError) {
      setError(roomError);
      setIsLoading(false);
      return;
    }

    // Wait for room to be ready
    if (roomLoading || !room) {
      return;
    }

    // Load initial messages
    loadInitialMessages();

    // Set up event listeners for real-time updates
    if (room && client) {
      room.on(RoomEvent.Timeline, handleTimelineEvent);
      room.on(RoomEvent.Redaction, handleEventRedaction);
      
      return () => {
        room.off(RoomEvent.Timeline, handleTimelineEvent);
        room.off(RoomEvent.Redaction, handleEventRedaction);
      };
    }
  }, [
    roomId, 
    room, 
    roomLoading, 
    roomError, 
    client,
    loadInitialMessages, 
    handleTimelineEvent, 
    handleEventRedaction
  ]);

  // =============================================================================
  // Return Value
  // =============================================================================

  return useMemo(
    () => ({
      messages,
      isLoading,
      hasMore,
      loadMore: loadMoreMessages,
      error,
      isLoadingMore,
    }),
    [messages, isLoading, hasMore, loadMoreMessages, error, isLoadingMore]
  );
}

// =============================================================================
// Type Exports
// =============================================================================

export type { 
  UseRoomMessagesReturn, 
  UseRoomMessagesOptions 
};

// Re-export Matrix types for convenience
export type { MatrixEvent } from "matrix-js-sdk";