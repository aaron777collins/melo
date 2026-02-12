/**
 * useReadReceipts Hook
 *
 * Manages read receipts for Matrix room events with real-time updates.
 * Tracks who has read which messages and provides functionality to mark
 * messages as read. Updates automatically when new read receipts arrive.
 *
 * @module hooks/use-read-receipts
 * @see {@link ../components/providers/matrix-provider.tsx} - Parent context provider
 * @see {@link ./use-room-messages.ts} - Related messages hook
 *
 * @example
 * ```tsx
 * import { useReadReceipts } from '@/hooks/use-read-receipts';
 *
 * function MessageList({ roomId }: { roomId: string }) {
 *   const { receipts, markAsRead } = useReadReceipts(roomId);
 *   const { messages } = useRoomMessages(roomId);
 *
 *   const handleScroll = (eventId: string) => {
 *     markAsRead(eventId);
 *   };
 *
 *   return (
 *     <div>
 *       {messages.map(event => {
 *         const eventId = event.getId();
 *         const readers = receipts.get(eventId) || [];
 *         
 *         return (
 *           <div key={eventId} onViewportEnter={() => handleScroll(eventId)}>
 *             <Message event={event} />
 *             <ReadIndicators userIds={readers} />
 *           </div>
 *         );
 *       })}
 *     </div>
 *   );
 * }
 * ```
 */

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { 
  MatrixEvent,
  RoomEvent, 
  ReceiptType 
} from "matrix-js-sdk";

import { useMatrix } from "@/components/providers/matrix-provider";
import { useRoom } from "./use-room";

// =============================================================================
// Types
// =============================================================================

/**
 * Map of event IDs to arrays of user IDs who have read that event
 */
export type ReadReceiptsMap = Map<string, string[]>;

/**
 * Return type for the useReadReceipts hook
 */
interface UseReadReceiptsReturn {
  /**
   * Map of event IDs to user IDs who have read each message.
   * Key: Matrix event ID, Value: Array of user IDs who have read that event
   *
   * @example
   * ```tsx
   * const { receipts } = useReadReceipts(roomId);
   * const eventId = "$someEventId:matrix.org";
   * const readers = receipts.get(eventId) || [];
   * 
   * return (
   *   <div>
   *     Message read by: {readers.join(", ")}
   *   </div>
   * );
   * ```
   */
  receipts: ReadReceiptsMap;

  /**
   * Function to mark a specific event as read by the current user.
   * Sends a read receipt to the Matrix server and updates local state.
   *
   * @param eventId - The Matrix event ID to mark as read
   * @returns Promise that resolves when the read receipt is sent
   *
   * @example
   * ```tsx
   * const { markAsRead } = useReadReceipts(roomId);
   * 
   * // Mark message as read when it becomes visible
   * const handleMessageVisible = (eventId: string) => {
   *   markAsRead(eventId);
   * };
   * ```
   */
  markAsRead: (eventId: string) => Promise<void>;

  /**
   * Whether the hook is currently loading read receipts data
   */
  isLoading: boolean;

  /**
   * Error state if read receipts loading failed
   */
  error: Error | null;
}

// =============================================================================
// Custom Errors
// =============================================================================

/**
 * Error thrown when useReadReceipts is used outside of MatrixProvider
 */
class ReadReceiptsContextError extends Error {
  constructor() {
    super(
      "useReadReceipts must be used within a MatrixProvider. " +
        "Ensure your component tree is wrapped with:\n\n" +
        "  <MatrixAuthProvider>\n" +
        "    <MatrixProvider>\n" +
        "      {/* your components */}\n" +
        "    </MatrixProvider>\n" +
        "  </MatrixAuthProvider>\n\n" +
        "See: components/providers/matrix-provider.tsx"
    );
    this.name = "ReadReceiptsContextError";
  }
}

/**
 * Error for invalid room ID format
 */
class InvalidRoomIdError extends Error {
  constructor(roomId: string) {
    super(`Invalid room ID format: ${roomId}. Room IDs must start with '!' and contain a server name.`);
    this.name = "InvalidRoomIdError";
  }
}

/**
 * Error for invalid event ID format
 */
class InvalidEventIdError extends Error {
  constructor(eventId: string) {
    super(`Invalid event ID format: ${eventId}. Event IDs must start with '$' and contain a server name.`);
    this.name = "InvalidEventIdError";
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Validates that a room ID follows Matrix specification
 */
function validateRoomId(roomId: string): boolean {
  // Matrix room IDs start with ! and contain a colon separating local and server parts
  // Example: !roomId:matrix.org
  const roomIdRegex = /^![\w.-]+:[\w.-]+$/;
  return roomIdRegex.test(roomId);
}

/**
 * Validates that an event ID follows Matrix specification
 */
function validateEventId(eventId: string): boolean {
  // Matrix event IDs start with $ and contain a colon separating local and server parts
  // Example: $eventId:matrix.org
  const eventIdRegex = /^\$[\w.-]+:[\w.-]+$/;
  return eventIdRegex.test(eventId);
}

/**
 * Builds read receipts map from Matrix room receipt data
 */
function buildReceiptsMapFromRoom(room: any): ReadReceiptsMap {
  const receiptsMap = new Map<string, string[]>();

  if (!room) {
    return receiptsMap;
  }

  try {
    // Get all receipt events from the room
    const receiptEvents = room.getReceiptsForEvent || [];
    
    // Alternative: Get receipts directly from room state
    const roomReceipts = room.getReadReceiptForUserId ? 
      room.getCurrentState()?.getStateEvents("m.receipt") || [] :
      [];

    // Process receipt data - try multiple approaches for compatibility
    
    // Method 1: Use getReadReceiptForUserId if available
    if (room.getReadReceiptForUserId) {
      const members = room.getMembers() || [];
      
      members.forEach((member: any) => {
        const userId = member.userId;
        const receipt = room.getReadReceiptForUserId(userId, false); // false = don't ignore our own receipts
        
        if (receipt && receipt.eventId) {
          const eventId = receipt.eventId;
          
          if (!receiptsMap.has(eventId)) {
            receiptsMap.set(eventId, []);
          }
          
          const readers = receiptsMap.get(eventId)!;
          if (!readers.includes(userId)) {
            readers.push(userId);
          }
        }
      });
    }

    // Method 2: Process receipt state events directly
    roomReceipts.forEach((receiptEvent: any) => {
      const content = receiptEvent.getContent();
      
      if (content) {
        // Matrix receipt format: { "eventId": { "m.read": { "userId": { "ts": timestamp } } } }
        Object.keys(content).forEach(eventId => {
          const eventReceipts = content[eventId];
          
          if (eventReceipts && eventReceipts["m.read"]) {
            const readReceipts = eventReceipts["m.read"];
            
            Object.keys(readReceipts).forEach(userId => {
              if (!receiptsMap.has(eventId)) {
                receiptsMap.set(eventId, []);
              }
              
              const readers = receiptsMap.get(eventId)!;
              if (!readers.includes(userId)) {
                readers.push(userId);
              }
            });
          }
        });
      }
    });

  } catch (error) {
    console.warn("[useReadReceipts] Error building receipts map:", error);
  }

  return receiptsMap;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook to manage read receipts for Matrix room events with real-time updates.
 *
 * Provides a map of event IDs to user IDs who have read each message, and
 * functionality to mark messages as read. Updates automatically when new
 * read receipts arrive or are sent.
 *
 * @param roomId - The Matrix room ID to track read receipts for
 * @returns Object containing receipts map, markAsRead function, and loading states
 *
 * @throws {ReadReceiptsContextError} If used outside of MatrixProvider
 * @throws {InvalidRoomIdError} If roomId format is invalid
 *
 * @example Basic usage
 * ```tsx
 * function MessageWithReceipts({ eventId, roomId }: { eventId: string, roomId: string }) {
 *   const { receipts, markAsRead } = useReadReceipts(roomId);
 *   const readers = receipts.get(eventId) || [];
 *
 *   useEffect(() => {
 *     // Mark as read when message comes into view
 *     markAsRead(eventId);
 *   }, [eventId, markAsRead]);
 *
 *   return (
 *     <div className="message">
 *       <div className="message-content">Message content here</div>
 *       <div className="read-indicators">
 *         {readers.length > 0 && (
 *           <span>{readers.length} read</span>
 *         )}
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Scroll-based read marking
 * ```tsx
 * function MessagesList({ roomId }: { roomId: string }) {
 *   const { receipts, markAsRead } = useReadReceipts(roomId);
 *   const { messages } = useRoomMessages(roomId);
 *
 *   const handleMessageInView = (eventId: string) => {
 *     markAsRead(eventId);
 *   };
 *
 *   return (
 *     <div className="messages-container">
 *       {messages.map(event => {
 *         const eventId = event.getId()!;
 *         const readers = receipts.get(eventId) || [];
 *
 *         return (
 *           <IntersectionObserver
 *             key={eventId}
 *             onIntersect={() => handleMessageInView(eventId)}
 *             threshold={0.5}
 *           >
 *             <MessageComponent event={event} readers={readers} />
 *           </IntersectionObserver>
 *         );
 *       })}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Read status indicators
 * ```tsx
 * function ReadStatusIndicator({ eventId, roomId }: { eventId: string, roomId: string }) {
 *   const { receipts } = useReadReceipts(roomId);
 *   const readers = receipts.get(eventId) || [];
 *   const { room } = useRoom(roomId);
 *   const totalMembers = room?.getMembers()?.length || 0;
 *
 *   const readPercentage = totalMembers > 0 ? (readers.length / totalMembers) * 100 : 0;
 *
 *   return (
 *     <div className="read-status">
 *       <div 
 *         className="read-progress-bar"
 *         style={{ width: `${readPercentage}%` }}
 *       />
 *       <span className="read-count">
 *         {readers.length} of {totalMembers} read
 *       </span>
 *     </div>
 *   );
 * }
 * ```
 */
export function useReadReceipts(roomId: string): UseReadReceiptsReturn {
  // Validate input
  if (!validateRoomId(roomId)) {
    throw new InvalidRoomIdError(roomId);
  }

  // Access Matrix context
  let matrixContext: ReturnType<typeof useMatrix>;

  try {
    matrixContext = useMatrix();
  } catch {
    throw new ReadReceiptsContextError();
  }

  const { client, isReady } = matrixContext;

  // Access room data
  const { room, isLoading: roomLoading, error: roomError } = useRoom(roomId);

  // Local state
  const [receipts, setReceipts] = useState<ReadReceiptsMap>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Track the last room we loaded data for to handle room changes
  const lastLoadedRoomRef = useRef<string | null>(null);

  // =============================================================================
  // Read Receipts Loading
  // =============================================================================

  const loadReadReceipts = useCallback(() => {
    if (!room || !isReady || !client) {
      setReceipts(new Map());
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      setIsLoading(true);

      // Build receipts map from room data
      const receiptsMap = buildReceiptsMapFromRoom(room);
      setReceipts(receiptsMap);

      lastLoadedRoomRef.current = roomId;

    } catch (err) {
      const errorMessage = err instanceof Error ? err : new Error('Failed to load read receipts');
      console.error(`[useReadReceipts] Error loading read receipts for room ${roomId}:`, err);
      setError(errorMessage);
      setReceipts(new Map());
    } finally {
      setIsLoading(false);
    }
  }, [room, isReady, client, roomId]);

  // =============================================================================
  // Mark As Read Function
  // =============================================================================

  const markAsRead = useCallback(async (eventId: string): Promise<void> => {
    // Validate event ID format
    if (!validateEventId(eventId)) {
      throw new InvalidEventIdError(eventId);
    }

    if (!client || !isReady || !room) {
      console.warn('[useReadReceipts] Client not ready, ignoring markAsRead');
      return;
    }

    try {
      // Find the event in the room timeline
      const timeline = room.getLiveTimeline();
      const events = timeline?.getEvents() || [];
      const targetEvent = events.find(event => event.getId() === eventId);

      if (!targetEvent) {
        console.warn(`[useReadReceipts] Event ${eventId} not found in room timeline`);
        return;
      }

      // Send read receipt to Matrix server using the MatrixEvent
      await client.sendReadReceipt(targetEvent, ReceiptType.Read);

      // Update local state immediately for responsive UI
      const currentUserId = client.getUserId();
      if (currentUserId) {
        setReceipts(prev => {
          const newReceipts = new Map(prev);
          const currentReaders = newReceipts.get(eventId) || [];
          
          if (!currentReaders.includes(currentUserId)) {
            newReceipts.set(eventId, [...currentReaders, currentUserId]);
          }
          
          return newReceipts;
        });
      }

    } catch (err) {
      console.error(`[useReadReceipts] Failed to mark event ${eventId} as read:`, err);
      // Don't throw - marking as read should be non-blocking
    }
  }, [client, isReady, room]);

  // =============================================================================
  // Event Handlers
  // =============================================================================

  const handleReceiptEvent = useCallback((event: MatrixEvent, room: any) => {
    // Only handle receipt events for our room
    if (room?.roomId !== roomId) return;

    // Reload receipts when new receipt events arrive
    if (room) {
      const updatedReceipts = buildReceiptsMapFromRoom(room);
      setReceipts(updatedReceipts);
    }
  }, [roomId]);

  // =============================================================================
  // Effects
  // =============================================================================

  // Main effect - load initial receipts and set up event listeners
  useEffect(() => {
    // Reset state when room changes
    if (lastLoadedRoomRef.current !== roomId) {
      setReceipts(new Map());
      setIsLoading(true);
      setError(null);
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

    // Load initial read receipts
    loadReadReceipts();

    // Set up event listeners for real-time updates
    if (room && client) {
      // Listen for receipt events
      room.on(RoomEvent.Receipt, handleReceiptEvent);
      
      return () => {
        room.off(RoomEvent.Receipt, handleReceiptEvent);
      };
    }
  }, [
    roomId, 
    room, 
    roomLoading, 
    roomError, 
    client,
    loadReadReceipts, 
    handleReceiptEvent
  ]);

  // =============================================================================
  // Return Value
  // =============================================================================

  return useMemo(
    () => ({
      receipts,
      markAsRead,
      isLoading,
      error,
    }),
    [receipts, markAsRead, isLoading, error]
  );
}

// =============================================================================
// Type Exports
// =============================================================================

export type { 
  UseReadReceiptsReturn
};

// Re-export Matrix types for convenience
export type { ReceiptType } from "matrix-js-sdk";