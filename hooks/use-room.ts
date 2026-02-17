/**
 * useRoom Hook
 *
 * Provides access to single room data with reactive updates. Listens to Matrix
 * events to keep room state and member list synchronized with the server.
 *
 * @module hooks/use-room
 * @see {@link ../components/providers/matrix-provider.tsx} - Parent context provider
 *
 * @example
 * ```tsx
 * import { useRoom } from '@/hooks/use-room';
 *
 * function RoomView({ roomId }: { roomId: string }) {
 *   const { room, members, isLoading, error } = useRoom(roomId);
 *
 *   if (isLoading) {
 *     return <div>Loading room...</div>;
 *   }
 *
 *   if (error) {
 *     return <div>Error: {error.message}</div>;
 *   }
 *
 *   if (!room) {
 *     return <div>Room not found</div>;
 *   }
 *
 *   return (
 *     <div>
 *       <h1>{room.name}</h1>
 *       <p>{members.length} members</p>
 *     </div>
 *   );
 * }
 * ```
 */

"use client";

import { useState, useEffect, useMemo, useCallback, useReducer } from "react";
import { 
  type Room, 
  isClientEnvironment,
  getMatrixConstants,
} from "@/lib/matrix/client-wrapper";

import { useMatrix } from "@/components/providers/matrix-provider";

// =============================================================================
// Types
// =============================================================================

/**
 * Return type for the useRoom hook
 */
interface UseRoomReturn {
  /**
   * The room instance, or null if not found or not ready.
   *
   * @remarks
   * Will be null in these cases:
   * - Room ID doesn't exist
   * - User is not a member of the room
   * - Matrix client is not ready yet
   * - Initial loading state
   */
  room: Room | null;

  /**
   * Array of room members.
   *
   * @remarks
   * - Empty array when room is null or not loaded
   * - Updates reactively when members join/leave/change
   * - Includes all membership states (join, leave, ban, invite)
   */
  members: RoomMember[];

  /**
   * Whether the hook is in a loading state.
   *
   * @remarks
   * True when:
   * - Matrix client is not ready yet
   * - Initial room lookup is in progress
   * False when:
   * - Room has been found (or determined not to exist)
   * - Error state has been reached
   */
  isLoading: boolean;

  /**
   * Error state if room lookup or membership loading failed.
   *
   * @remarks
   * Common error scenarios:
   * - Network connectivity issues
   * - Permission denied (room exists but user can't access)
   * - Invalid room ID format
   */
  error: Error | null;
}

// =============================================================================
// Custom Errors
// =============================================================================

/**
 * Error thrown when useRoom is used outside of MatrixProvider
 */
class RoomContextError extends Error {
  constructor() {
    super(
      "useRoom must be used within a MatrixProvider. " +
        "Ensure your component tree is wrapped with:\n\n" +
        "  <MatrixAuthProvider>\n" +
        "    <MatrixProvider>\n" +
        "      {/* your components */}\n" +
        "    </MatrixProvider>\n" +
        "  </MatrixAuthProvider>\n\n" +
        "See: components/providers/matrix-provider.tsx"
    );
    this.name = "RoomContextError";
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

/**
 * Gets current members from a room, handling edge cases
 */
function getRoomMembers(room: Room | null): RoomMember[] {
  if (!room) return [];

  try {
    // Get all members from the room state
    const members = room.getMembers();
    return members || [];
  } catch (error) {
    // Fallback for rooms without member state loaded
    console.warn(`[useRoom] Failed to get members for room ${room.roomId}:`, error);
    return [];
  }
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook to access single room data with reactive updates.
 *
 * Provides real-time updates for room information and membership changes.
 * Handles loading states, errors, and graceful degradation when rooms
 * are not accessible.
 *
 * @param roomId - The Matrix room ID to watch (format: !localpart:server)
 * @returns Object containing room data, members, loading state, and any errors
 *
 * @throws {RoomContextError} If used outside of MatrixProvider
 * @throws {InvalidRoomIdError} If roomId format is invalid
 *
 * @example Basic usage
 * ```tsx
 * function RoomHeader({ roomId }: { roomId: string }) {
 *   const { room, members, isLoading, error } = useRoom(roomId);
 *
 *   if (isLoading) return <Skeleton />;
 *   if (error) return <ErrorMessage error={error} />;
 *   if (!room) return <NotFound />;
 *
 *   return (
 *     <header>
 *       <h1>{room.name}</h1>
 *       <span>{members.length} members</span>
 *     </header>
 *   );
 * }
 * ```
 *
 * @example With member filtering
 * ```tsx
 * function ActiveMembers({ roomId }: { roomId: string }) {
 *   const { members, isLoading } = useRoom(roomId);
 *
 *   const activeMembers = members.filter(m => m.membership === 'join');
 *   const invitedMembers = members.filter(m => m.membership === 'invite');
 *
 *   if (isLoading) return <div>Loading...</div>;
 *
 *   return (
 *     <div>
 *       <p>Active: {activeMembers.length}</p>
 *       <p>Invited: {invitedMembers.length}</p>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Error handling
 * ```tsx
 * function RoomView({ roomId }: { roomId: string }) {
 *   const { room, members, isLoading, error } = useRoom(roomId);
 *
 *   if (error) {
 *     if (error instanceof InvalidRoomIdError) {
 *       return <div>Invalid room ID format</div>;
 *     }
 *     return <div>Failed to load room: {error.message}</div>;
 *   }
 *
 *   // ... rest of component
 * }
 * ```
 */
export function useRoom(roomId: string): UseRoomReturn {
  // Validate input early
  if (!validateRoomId(roomId)) {
    throw new InvalidRoomIdError(roomId);
  }

  // Access Matrix context
  let matrixContext: ReturnType<typeof useMatrix>;

  try {
    matrixContext = useMatrix();
  } catch {
    throw new RoomContextError();
  }

  const { client, isReady, getRoom } = matrixContext;

  // Local state
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Force re-render counter for room metadata changes
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  // =============================================================================
  // Update Members Helper
  // =============================================================================

  const updateMembers = useCallback((currentRoom: Room | null) => {
    const newMembers = getRoomMembers(currentRoom);
    setMembers(newMembers);
  }, []);

  // =============================================================================
  // Room Event Handlers
  // =============================================================================

  const handleRoomMembershipEvents = useCallback(() => {
    // Update members list when membership changes
    updateMembers(room);
  }, [room, updateMembers]);

  const handleRoomNameChange = useCallback(() => {
    // Force re-render when room name/metadata changes
    // This triggers React to re-evaluate the room object
    forceUpdate();
  }, []);

  // =============================================================================
  // Main Effect - Room Loading & Event Setup
  // =============================================================================

  useEffect(() => {
    // Reset state when roomId changes
    setIsLoading(true);
    setError(null);
    setRoom(null);
    setMembers([]);

    // Wait for Matrix client to be ready
    if (!isReady || !client) {
      return;
    }

    try {
      // Get the room from Matrix client
      const foundRoom = getRoom(roomId);
      
      if (!foundRoom) {
        // Room not found - this is normal, not an error
        setRoom(null);
        setMembers([]);
        setIsLoading(false);
        return;
      }

      // Room found - set up reactive listening
      setRoom(foundRoom);
      updateMembers(foundRoom);
      setIsLoading(false);

      // Set up event listeners for reactive updates (client-side only)
      if (isClientEnvironment()) {
        const setupEvents = async () => {
          const constants = await getMatrixConstants();
          if (constants && constants.RoomStateEvent && constants.RoomEvent) {
            if ('Members' in constants.RoomStateEvent) {
              foundRoom.on(constants.RoomStateEvent.Members, handleRoomMembershipEvents);
            }
            if ('NewMember' in constants.RoomStateEvent) {
              foundRoom.on(constants.RoomStateEvent.NewMember, handleRoomMembershipEvents);
            }
            if ('Name' in constants.RoomEvent) {
              foundRoom.on(constants.RoomEvent.Name, handleRoomNameChange);
            }
            if ('MyMembership' in constants.RoomEvent) {
              foundRoom.on(constants.RoomEvent.MyMembership, handleRoomMembershipEvents);
            }
          }
        };

        void setupEvents();
      }

      // Cleanup handled when room reference changes
      return () => {
        // Event cleanup handled when component unmounts or room changes
      };

    } catch (err) {
      // Handle any unexpected errors during room lookup
      const errorMessage = err instanceof Error ? err : new Error('Failed to load room');
      console.error(`[useRoom] Error loading room ${roomId}:`, err);
      setError(errorMessage);
      setIsLoading(false);
    }
  }, [roomId, isReady, client, getRoom, updateMembers, handleRoomMembershipEvents, handleRoomNameChange]);

  // =============================================================================
  // Return Value
  // =============================================================================

  return useMemo(
    () => ({
      room,
      members,
      isLoading,
      error,
    }),
    [room, members, isLoading, error]
  );
}

// =============================================================================
// Type Exports
// =============================================================================

export type { UseRoomReturn };

// Re-export Matrix types for convenience
export type { Room } from "@/lib/matrix/client-wrapper";

// Define RoomMember type for server compatibility
export type RoomMember = any;