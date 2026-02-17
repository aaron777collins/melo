/**
 * usePresence Hook
 *
 * Manages user presence state with real-time sync via Matrix SDK.
 * Shows current user presence, other users' presence, and allows setting presence.
 * Includes automatic last-active tracking and real-time updates.
 *
 * @module hooks/use-presence
 * @see {@link ../components/providers/matrix-provider.tsx} - Parent context provider
 *
 * @example
 * ```tsx
 * import { usePresence } from '@/hooks/use-presence';
 *
 * function UserStatus({ userId }: { userId?: string }) {
 *   const { presence, lastActiveAgo, setPresence } = usePresence(userId);
 *
 *   return (
 *     <div>
 *       <div>Status: {presence}</div>
 *       {lastActiveAgo > 0 && <div>Last active: {lastActiveAgo}ms ago</div>}
 *       
 *       {!userId && ( // Current user controls
 *         <select onChange={(e) => setPresence(e.target.value as any)}>
 *           <option value="online">Online</option>
 *           <option value="offline">Offline</option>
 *           <option value="unavailable">Unavailable</option>
 *         </select>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {  ClientEvent, User, UserEvent  } from "@/lib/matrix/matrix-sdk-exports";

import { useMatrix } from "@/components/providers/matrix-provider";

// =============================================================================
// Constants
// =============================================================================

/**
 * Default presence state when user presence is unknown or unavailable
 */
const DEFAULT_PRESENCE = "offline" as const;

/**
 * Presence polling interval in milliseconds (5 minutes)
 * Used to refresh presence data periodically for active monitoring
 */
const PRESENCE_POLL_INTERVAL_MS = 5 * 60 * 1000;

// =============================================================================
// Types
// =============================================================================

/**
 * Matrix presence states as defined by the Matrix specification
 */
type PresenceState = 'online' | 'offline' | 'unavailable';

/**
 * Return type for the usePresence hook
 */
interface UsePresenceReturn {
  /**
   * Current presence state of the specified user (or current user if no userId provided).
   *
   * @remarks
   * - Returns 'online', 'offline', or 'unavailable'
   * - For current user: reflects actual presence state from Matrix
   * - For other users: shows their last known presence state
   * - Defaults to 'offline' when presence is unknown or Matrix not ready
   * - Updates in real-time when presence events are received
   */
  presence: PresenceState;

  /**
   * Milliseconds since the user was last active.
   *
   * @remarks
   * - 0 indicates currently active or just went online
   * - Positive number indicates time since last activity
   * - Updates automatically based on Matrix presence events
   * - May be imprecise for remote users depending on their client behavior
   * - Returns 0 for current user when presence is 'online'
   */
  lastActiveAgo: number;

  /**
   * Function to set the current user's presence state.
   *
   * @param newPresence - The presence state to set ('online', 'offline', 'unavailable')
   * @returns Promise that resolves when presence is updated
   *
   * @remarks
   * - Only works for current user (ignored if userId was provided to hook)
   * - Sends presence update to Matrix server
   * - Other clients will see the updated presence state
   * - Does nothing if Matrix client is not ready
   * - Automatically updates local state on success
   *
   * @example
   * ```tsx
   * const { setPresence } = usePresence();
   * 
   * // Set to away
   * await setPresence('unavailable');
   * 
   * // Set back to online
   * await setPresence('online');
   * ```
   */
  setPresence: (newPresence: PresenceState) => Promise<void>;
}

// =============================================================================
// Custom Errors
// =============================================================================

/**
 * Error thrown when usePresence is used outside of MatrixProvider
 */
class PresenceContextError extends Error {
  constructor() {
    super(
      "usePresence must be used within a MatrixProvider. " +
        "Ensure your component tree is wrapped with:\n\n" +
        "  <MatrixAuthProvider>\n" +
        "    <MatrixProvider>\n" +
        "      {/* your components */}\n" +
        "    </MatrixProvider>\n" +
        "  </MatrixAuthProvider>\n\n" +
        "See: components/providers/matrix-provider.tsx"
    );
    this.name = "PresenceContextError";
  }
}

/**
 * Error for invalid user ID format
 */
class InvalidUserIdError extends Error {
  constructor(userId: string) {
    super(`Invalid user ID format: ${userId}. User IDs must start with '@' and contain a server name.`);
    this.name = "InvalidUserIdError";
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Validates that a user ID follows Matrix specification
 */
function validateUserId(userId: string): boolean {
  // Matrix user IDs start with @ and contain a colon separating local and server parts
  // Example: @alice:matrix.org
  const userIdRegex = /^@[\w.-]+:[\w.-]+$/;
  return userIdRegex.test(userId);
}

/**
 * Converts Matrix SDK presence event to our PresenceState type
 */
function normalizePresenceState(matrixPresence?: string): PresenceState {
  switch (matrixPresence) {
    case 'online':
      return 'online';
    case 'unavailable':
      return 'unavailable';
    case 'offline':
    default:
      return 'offline';
  }
}

/**
 * Calculates last active time from Matrix presence data
 */
function calculateLastActiveAgo(user: User): number {
  // Get presence data from the user object
  const presenceData = user.presence;
  
  if (!presenceData) {
    return 0;
  }

  // If user is currently online, they're active now
  if (presenceData === 'online') {
    return 0;
  }

  // Try to get lastActiveAgo from user event
  const lastActiveAgo = user.lastActiveAgo;
  if (typeof lastActiveAgo === 'number' && lastActiveAgo >= 0) {
    return lastActiveAgo;
  }

  // Try to calculate from last presence timestamp
  const lastPresenceTs = user.lastPresenceTs;
  if (typeof lastPresenceTs === 'number' && lastPresenceTs > 0) {
    return Math.max(0, Date.now() - lastPresenceTs);
  }

  // Default to unknown (0)
  return 0;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook to manage user presence state with real-time updates.
 *
 * Provides current user or specified user's presence state, last active time,
 * and ability to set current user's presence. Handles real-time updates from
 * Matrix presence events and maintains local state synchronization.
 *
 * @param userId - Optional Matrix user ID to monitor (format: @localpart:server).
 *                 If not provided, monitors current user's presence.
 * @returns Object containing presence state, last active time, and setPresence function
 *
 * @throws {PresenceContextError} If used outside of MatrixProvider
 * @throws {InvalidUserIdError} If userId format is invalid
 *
 * @example Current user presence
 * ```tsx
 * function MyStatus() {
 *   const { presence, setPresence } = usePresence();
 *
 *   return (
 *     <div>
 *       <span>I am {presence}</span>
 *       <button onClick={() => setPresence('unavailable')}>
 *         Set Away
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Other user presence
 * ```tsx
 * function UserCard({ userId }: { userId: string }) {
 *   const { presence, lastActiveAgo } = usePresence(userId);
 *
 *   return (
 *     <div className={cn('user-card', {
 *       'online': presence === 'online',
 *       'away': presence === 'unavailable',
 *       'offline': presence === 'offline'
 *     })}>
 *       <div className="presence-indicator" />
 *       <span>{userId}</span>
 *       {lastActiveAgo > 0 && (
 *         <small>Last active {Math.floor(lastActiveAgo / 1000 / 60)} min ago</small>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Presence list component
 * ```tsx
 * function OnlineUsersList({ roomId }: { roomId: string }) {
 *   const { room } = useRoom(roomId);
 *   const members = room?.getMembers() || [];
 *
 *   return (
 *     <div className="online-users">
 *       {members.map(member => (
 *         <UserPresenceIndicator 
 *           key={member.userId} 
 *           userId={member.userId} 
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 *
 * function UserPresenceIndicator({ userId }: { userId: string }) {
 *   const { presence } = usePresence(userId);
 *   
 *   if (presence === 'offline') return null;
 *   
 *   return (
 *     <div className="flex items-center space-x-2">
 *       <div className={cn('w-2 h-2 rounded-full', {
 *         'bg-green-500': presence === 'online',
 *         'bg-yellow-500': presence === 'unavailable'
 *       })} />
 *       <span>{userId.split(':')[0].slice(1)}</span>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePresence(userId?: string): UsePresenceReturn {
  // Validate input if provided
  if (userId && !validateUserId(userId)) {
    throw new InvalidUserIdError(userId);
  }

  // Access Matrix context
  let matrixContext: ReturnType<typeof useMatrix>;

  try {
    matrixContext = useMatrix();
  } catch {
    throw new PresenceContextError();
  }

  const { client, isReady } = matrixContext;

  // Determine target user (provided userId or current user)
  const targetUserId = userId || client?.getUserId() || '';
  const isCurrentUser = !userId && client?.getUserId() === targetUserId;

  // Local state
  const [presence, setPresenceState] = useState<PresenceState>(DEFAULT_PRESENCE);
  const [lastActiveAgo, setLastActiveAgo] = useState<number>(0);

  // Refs for managing poll timers
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // =============================================================================
  // Presence Update Handler
  // =============================================================================

  const updatePresenceFromUser = useCallback((user: User) => {
    const newPresence = normalizePresenceState(user.presence);
    const newLastActiveAgo = calculateLastActiveAgo(user);

    setPresenceState(newPresence);
    setLastActiveAgo(newLastActiveAgo);
  }, []);

  // =============================================================================
  // Event Handlers
  // =============================================================================

  const handleUserPresenceChange = useCallback((event: any, user: User) => {
    // Only handle events for our target user
    if (user.userId !== targetUserId) return;

    updatePresenceFromUser(user);
  }, [targetUserId, updatePresenceFromUser]);

  const handleUserDisplayNameChange = useCallback((event: any, user: User) => {
    // Presence might be included in display name change events
    if (user.userId !== targetUserId) return;
    
    updatePresenceFromUser(user);
  }, [targetUserId, updatePresenceFromUser]);

  // =============================================================================
  // Set Presence Function (Current User Only)
  // =============================================================================

  const setPresence = useCallback(async (newPresence: PresenceState): Promise<void> => {
    // Only allow setting presence for current user
    if (!isCurrentUser) {
      console.warn('[usePresence] setPresence can only be used for current user');
      return;
    }

    if (!client || !isReady) {
      console.warn('[usePresence] Client not ready, ignoring presence change');
      return;
    }

    try {
      // Send presence update to Matrix server
      await client.setPresence({
        presence: newPresence,
        status_msg: undefined, // Could be extended to include custom status messages
      });

      // Update local state immediately for responsive UI
      setPresenceState(newPresence);
      
      // Reset last active time when setting to online
      if (newPresence === 'online') {
        setLastActiveAgo(0);
      }
      
    } catch (error) {
      console.error('[usePresence] Failed to set presence:', error);
      // Could implement error state here if needed
    }
  }, [client, isReady, isCurrentUser]);

  // =============================================================================
  // Initial Data Load Effect
  // =============================================================================

  useEffect(() => {
    // Wait for Matrix client to be ready
    if (!isReady || !client || !targetUserId) {
      return;
    }

    // Get the user object and initial presence
    const user = client.getUser(targetUserId);
    if (user) {
      updatePresenceFromUser(user);
    } else {
      // User not found in client cache, reset to defaults
      setPresenceState(DEFAULT_PRESENCE);
      setLastActiveAgo(0);
    }

  }, [targetUserId, isReady, client, updatePresenceFromUser]);

  // =============================================================================
  // Event Listeners Effect
  // =============================================================================

  useEffect(() => {
    // Wait for Matrix client to be ready
    if (!isReady || !client) {
      return;
    }

    // Set up presence event listeners on the client
    client.on(UserEvent.Presence, handleUserPresenceChange);
    client.on(UserEvent.DisplayName, handleUserDisplayNameChange);

    // Cleanup function
    return () => {
      client.off(UserEvent.Presence, handleUserPresenceChange);
      client.off(UserEvent.DisplayName, handleUserDisplayNameChange);
    };
  }, [client, isReady, handleUserPresenceChange, handleUserDisplayNameChange]);

  // =============================================================================
  // Periodic Refresh Effect
  // =============================================================================

  useEffect(() => {
    // Set up periodic refresh for presence data
    if (!isReady || !client || !targetUserId) {
      return;
    }

    const pollPresence = () => {
      const user = client.getUser(targetUserId);
      if (user) {
        updatePresenceFromUser(user);
      }

      // Schedule next poll
      pollTimeoutRef.current = setTimeout(pollPresence, PRESENCE_POLL_INTERVAL_MS);
    };

    // Start polling
    pollTimeoutRef.current = setTimeout(pollPresence, PRESENCE_POLL_INTERVAL_MS);

    // Cleanup function
    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    };
  }, [client, isReady, targetUserId, updatePresenceFromUser]);

  // =============================================================================
  // Return Value
  // =============================================================================

  return useMemo(
    () => ({
      presence,
      lastActiveAgo,
      setPresence,
    }),
    [presence, lastActiveAgo, setPresence]
  );
}

// =============================================================================
// Type Exports
// =============================================================================

export type { UsePresenceReturn, PresenceState };