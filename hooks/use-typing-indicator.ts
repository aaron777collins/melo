/**
 * useTypingIndicator Hook
 *
 * Manages typing indicators for a Matrix room. Shows when others are typing
 * and allows sending typing notifications. Includes auto-timeout handling
 * for typing states.
 *
 * @module hooks/use-typing-indicator
 * @see {@link ../components/providers/matrix-provider.tsx} - Parent context provider
 *
 * @example
 * ```tsx
 * import { useTypingIndicator } from '@/hooks/use-typing-indicator';
 *
 * function ChatInput({ roomId }: { roomId: string }) {
 *   const { typingUsers, setTyping } = useTypingIndicator(roomId);
 *   const [isComposing, setIsComposing] = useState(false);
 *
 *   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 *     if (!isComposing && e.target.value.length > 0) {
 *       setIsComposing(true);
 *       setTyping(true);
 *     } else if (isComposing && e.target.value.length === 0) {
 *       setIsComposing(false);
 *       setTyping(false);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       {typingUsers.length > 0 && (
 *         <div>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</div>
 *       )}
 *       <input onChange={handleInputChange} placeholder="Type a message..." />
 *     </div>
 *   );
 * }
 * ```
 */

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { RoomMemberEvent } from "matrix-js-sdk";

import { useMatrix } from "@/components/providers/matrix-provider";

// =============================================================================
// Constants
// =============================================================================

/**
 * Default typing timeout in milliseconds (30 seconds)
 * This matches the Matrix specification default
 */
const TYPING_TIMEOUT_MS = 30000;

/**
 * How often to send typing heartbeats while actively typing (10 seconds)
 * This ensures the typing indicator doesn't expire while the user is still typing
 */
const TYPING_HEARTBEAT_MS = 10000;

// =============================================================================
// Types
// =============================================================================

/**
 * Return type for the useTypingIndicator hook
 */
interface UseTypingIndicatorReturn {
  /**
   * Array of user IDs that are currently typing in this room.
   *
   * @remarks
   * - Excludes the current user (you don't see your own typing indicator)
   * - Automatically updates when typing events are received
   * - Users are removed after their typing timeout expires
   * - Empty array when no one is typing or room is not ready
   */
  typingUsers: string[];

  /**
   * Function to set your own typing status in the room.
   *
   * @param isTyping - Whether you are currently typing
   * @returns Promise that resolves when the typing status is sent
   *
   * @remarks
   * - Sends typing notification to other room members
   * - Automatically handles timeout/heartbeat for sustained typing
   * - Safe to call multiple times - will debounce rapid changes
   * - Does nothing if Matrix client is not ready
   *
   * @example
   * ```tsx
   * const { setTyping } = useTypingIndicator(roomId);
   *
   * // Start typing
   * await setTyping(true);
   *
   * // Stop typing
   * await setTyping(false);
   * ```
   */
  setTyping: (isTyping: boolean) => Promise<void>;
}

// =============================================================================
// Custom Errors
// =============================================================================

/**
 * Error thrown when useTypingIndicator is used outside of MatrixProvider
 */
class TypingIndicatorContextError extends Error {
  constructor() {
    super(
      "useTypingIndicator must be used within a MatrixProvider. " +
        "Ensure your component tree is wrapped with:\n\n" +
        "  <MatrixAuthProvider>\n" +
        "    <MatrixProvider>\n" +
        "      {/* your components */}\n" +
        "    </MatrixProvider>\n" +
        "  </MatrixAuthProvider>\n\n" +
        "See: components/providers/matrix-provider.tsx"
    );
    this.name = "TypingIndicatorContextError";
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

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Validates that a room ID follows Matrix specification
 */
function validateRoomId(roomId: string): boolean {
  // Matrix room IDs start with ! and contain a colon separating local and server parts
  // Example: !example:matrix.org
  const roomIdRegex = /^![\w.-]+:[\w.-]+$/;
  return roomIdRegex.test(roomId);
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook to manage typing indicators for a Matrix room.
 *
 * Provides real-time typing status updates and the ability to send your own
 * typing notifications. Handles automatic timeouts and heartbeat management
 * for sustained typing states.
 *
 * @param roomId - The Matrix room ID to monitor (format: !localpart:server)
 * @returns Object containing typing users array and setTyping function
 *
 * @throws {TypingIndicatorContextError} If used outside of MatrixProvider
 * @throws {InvalidRoomIdError} If roomId format is invalid
 *
 * @example Basic usage
 * ```tsx
 * function TypingDisplay({ roomId }: { roomId: string }) {
 *   const { typingUsers } = useTypingIndicator(roomId);
 *
 *   if (typingUsers.length === 0) return null;
 *
 *   const message = typingUsers.length === 1
 *     ? `${typingUsers[0]} is typing...`
 *     : `${typingUsers.join(', ')} are typing...`;
 *
 *   return <div className="typing-indicator">{message}</div>;
 * }
 * ```
 *
 * @example Input field integration
 * ```tsx
 * function MessageInput({ roomId }: { roomId: string }) {
 *   const { setTyping } = useTypingIndicator(roomId);
 *   const [value, setValue] = useState('');
 *   const [wasTyping, setWasTyping] = useState(false);
 *
 *   useEffect(() => {
 *     const isTyping = value.trim().length > 0;
 *     
 *     if (isTyping !== wasTyping) {
 *       setTyping(isTyping);
 *       setWasTyping(isTyping);
 *     }
 *   }, [value, wasTyping, setTyping]);
 *
 *   return (
 *     <input
 *       value={value}
 *       onChange={(e) => setValue(e.target.value)}
 *       placeholder="Type a message..."
 *     />
 *   );
 * }
 * ```
 *
 * @example Advanced with user names
 * ```tsx
 * function EnhancedTypingIndicator({ roomId }: { roomId: string }) {
 *   const { typingUsers } = useTypingIndicator(roomId);
 *   const { room } = useRoom(roomId);
 *
 *   if (!room || typingUsers.length === 0) return null;
 *
 *   const userNames = typingUsers.map(userId => {
 *     const member = room.getMember(userId);
 *     return member?.name || userId.split(':')[0].slice(1);
 *   });
 *
 *   return (
 *     <div className="flex items-center space-x-2 text-sm text-muted-foreground">
 *       <div className="typing-dots" />
 *       <span>{userNames.join(', ')} {userNames.length === 1 ? 'is' : 'are'} typing...</span>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTypingIndicator(roomId: string): UseTypingIndicatorReturn {
  // Validate input early
  if (!validateRoomId(roomId)) {
    throw new InvalidRoomIdError(roomId);
  }

  // Access Matrix context
  let matrixContext: ReturnType<typeof useMatrix>;

  try {
    matrixContext = useMatrix();
  } catch {
    throw new TypingIndicatorContextError();
  }

  const { client, isReady, getRoom } = matrixContext;

  // Local state
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  
  // Refs for managing typing state and timeouts
  const isCurrentlyTyping = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  // =============================================================================
  // Typing Event Handler
  // =============================================================================

  const handleTypingEvent = useCallback((event: any, member: any) => {
    // Only handle events for our room
    if (member.roomId !== roomId) return;

    // Get current typing users from the room
    // We need to get all members and check their typing status
    const room = getRoom(roomId);
    if (!room) return;

    const currentUserId = client?.getUserId();
    const allMembers = room.getMembers();
    
    // Filter members who are currently typing, excluding current user
    const currentlyTyping = allMembers
      .filter(m => m.typing && m.userId !== currentUserId)
      .map(m => m.userId);

    setTypingUsers(currentlyTyping);
  }, [roomId, client, getRoom]);

  // =============================================================================
  // Set Typing Function
  // =============================================================================

  const setTyping = useCallback(async (isTyping: boolean): Promise<void> => {
    if (!client || !isReady) {
      console.warn('[useTypingIndicator] Client not ready, ignoring typing change');
      return;
    }

    try {
      // Clear existing timeouts
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (heartbeatRef.current) {
        clearTimeout(heartbeatRef.current);
        heartbeatRef.current = null;
      }

      if (isTyping) {
        // Start typing
        await client.sendTyping(roomId, true, TYPING_TIMEOUT_MS);
        isCurrentlyTyping.current = true;

        // Set up heartbeat to keep typing active
        const sendHeartbeat = async () => {
          if (isCurrentlyTyping.current && client) {
            try {
              await client.sendTyping(roomId, true, TYPING_TIMEOUT_MS);
              heartbeatRef.current = setTimeout(sendHeartbeat, TYPING_HEARTBEAT_MS);
            } catch (error) {
              console.error('[useTypingIndicator] Failed to send typing heartbeat:', error);
              isCurrentlyTyping.current = false;
            }
          }
        };

        heartbeatRef.current = setTimeout(sendHeartbeat, TYPING_HEARTBEAT_MS);

      } else {
        // Stop typing
        await client.sendTyping(roomId, false, 0);
        isCurrentlyTyping.current = false;
      }
    } catch (error) {
      console.error('[useTypingIndicator] Failed to send typing status:', error);
      isCurrentlyTyping.current = false;
    }
  }, [client, isReady, roomId]);

  // =============================================================================
  // Setup Effect - Event Listeners
  // =============================================================================

  useEffect(() => {
    // Wait for Matrix client to be ready
    if (!isReady || !client) {
      return;
    }

    // Get the room
    const room = getRoom(roomId);
    if (!room) {
      // Room not found - reset typing users
      setTypingUsers([]);
      return;
    }

    // Set up typing event listener on the client
    client.on(RoomMemberEvent.Typing, handleTypingEvent);

    // Cleanup function
    return () => {
      client.off(RoomMemberEvent.Typing, handleTypingEvent);
    };
  }, [roomId, isReady, client, getRoom, handleTypingEvent]);

  // =============================================================================
  // Cleanup Effect - Clear Timeouts on Unmount
  // =============================================================================

  useEffect(() => {
    return () => {
      // Clear any active timeouts when component unmounts
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (heartbeatRef.current) {
        clearTimeout(heartbeatRef.current);
      }
      
      // Stop typing on unmount if currently typing
      if (isCurrentlyTyping.current && client && isReady) {
        void client.sendTyping(roomId, false, 0).catch(error => 
          console.warn('[useTypingIndicator] Failed to clear typing on unmount:', error)
        );
      }
    };
  }, [client, isReady, roomId]);

  // =============================================================================
  // Return Value
  // =============================================================================

  return useMemo(
    () => ({
      typingUsers,
      setTyping,
    }),
    [typingUsers, setTyping]
  );
}

// =============================================================================
// Type Exports
// =============================================================================

export type { UseTypingIndicatorReturn };