"use client";

/**
 * Matrix Client Context Provider
 *
 * Manages the Matrix client lifecycle and exposes sync state, rooms, and
 * client instance to the application. Works in conjunction with MatrixAuthProvider
 * to initialize the client when a user logs in.
 *
 * @example
 * ```tsx
 * // In your root layout (AFTER MatrixAuthProvider)
 * import { MatrixAuthProvider } from '@/components/providers/matrix-auth-provider';
 * import { MatrixProvider } from '@/components/providers/matrix-provider';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <MatrixAuthProvider>
 *           <MatrixProvider>{children}</MatrixProvider>
 *         </MatrixAuthProvider>
 *       </body>
 *     </html>
 *   );
 * }
 *
 * // In a component
 * import { useMatrix } from '@/components/providers/matrix-provider';
 *
 * function RoomList() {
 *   const { rooms, isReady, syncState } = useMatrix();
 *
 *   if (!isReady) return <Spinner />;
 *
 *   return (
 *     <ul>
 *       {rooms.map(room => (
 *         <li key={room.roomId}>{room.name}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { ClientEvent, SyncState, type Room, type MatrixClient } from "matrix-js-sdk";

import {
  initializeClient,
  getClient,
  destroyClient,
} from "@/lib/matrix/client";
import { useMatrixAuth } from "@/components/providers/matrix-auth-provider";

// =============================================================================
// Types
// =============================================================================

/**
 * Matrix context state
 */
interface MatrixState {
  /** Current Matrix client instance, or null if not initialized */
  client: MatrixClient | null;
  /** Current sync state */
  syncState: SyncState | null;
  /** List of rooms the user has joined */
  rooms: Room[];
  /** Whether the client is ready (synced at least once) */
  isReady: boolean;
  /** Whether the client is currently syncing (after initial sync) */
  isSyncing: boolean;
  /** Sync error if any */
  syncError: Error | null;
}

/**
 * Matrix context actions
 */
interface MatrixActions {
  /**
   * Get a room by its ID
   * @param roomId - The room ID to look up
   * @returns The Room object or null if not found
   */
  getRoom: (roomId: string) => Room | null;

  /**
   * Force a refresh of the rooms list
   * Useful after joining/leaving rooms
   */
  refreshRooms: () => void;
}

/**
 * Complete Matrix context value
 */
type MatrixContextValue = MatrixState & MatrixActions;

// =============================================================================
// Context
// =============================================================================

const MatrixContext = createContext<MatrixContextValue | null>(null);

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to access Matrix client state and actions
 *
 * @throws Error if used outside of MatrixProvider
 * @returns Matrix client state and actions
 *
 * @example
 * ```tsx
 * function ChannelView() {
 *   const { client, rooms, isReady, syncState } = useMatrix();
 *
 *   if (!isReady) {
 *     return <div>Syncing with server...</div>;
 *   }
 *
 *   return (
 *     <div>
 *       <p>Sync state: {syncState}</p>
 *       <p>Rooms: {rooms.length}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useMatrix(): MatrixContextValue {
  const context = useContext(MatrixContext);

  if (!context) {
    throw new Error(
      "useMatrix must be used within a MatrixProvider. " +
        "Wrap your app with <MatrixProvider> inside <MatrixAuthProvider>."
    );
  }

  return context;
}

// =============================================================================
// Provider Props
// =============================================================================

interface MatrixProviderProps {
  /** Child components */
  children: ReactNode;
  /**
   * Callback when sync state changes
   * Useful for logging or analytics
   */
  onSyncStateChange?: (state: SyncState | null, prevState: SyncState | null) => void;
  /**
   * Callback when rooms list updates
   */
  onRoomsUpdate?: (rooms: Room[]) => void;
}

// =============================================================================
// Provider Component
// =============================================================================

/**
 * Matrix Client Provider
 *
 * Wraps the application with Matrix client context.
 * Automatically initializes client when user logs in via MatrixAuthProvider.
 * Must be placed inside MatrixAuthProvider.
 *
 * @param props - Provider props
 * @returns Provider component
 */
export function MatrixProvider({
  children,
  onSyncStateChange,
  onRoomsUpdate,
}: MatrixProviderProps): JSX.Element {
  // Get auth state from parent provider
  const { session, user } = useMatrixAuth();

  // State
  const [client, setClient] = useState<MatrixClient | null>(null);
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [syncError, setSyncError] = useState<Error | null>(null);

  // Track previous sync state for callbacks
  const prevSyncStateRef = useRef<SyncState | null>(null);

  // Track if we've initialized for this session
  const sessionIdRef = useRef<string | null>(null);

  // =============================================================================
  // Derived State
  // =============================================================================

  const isReady = syncState === SyncState.Prepared || syncState === SyncState.Syncing;
  const isSyncing = syncState === SyncState.Syncing;

  // =============================================================================
  // Room Refresh
  // =============================================================================

  const refreshRooms = useCallback(() => {
    const currentClient = getClient();
    if (currentClient) {
      const updatedRooms = currentClient.getRooms();
      setRooms(updatedRooms);
      onRoomsUpdate?.(updatedRooms);
    }
  }, [onRoomsUpdate]);

  // =============================================================================
  // Get Room by ID
  // =============================================================================

  const getRoom = useCallback((roomId: string): Room | null => {
    const currentClient = getClient();
    if (!currentClient) return null;
    return currentClient.getRoom(roomId);
  }, []);

  // =============================================================================
  // Sync Event Handler
  // =============================================================================

  const handleSync = useCallback(
    (state: SyncState, prevState: SyncState | null, data?: { error?: Error }) => {
      // Update sync state
      setSyncState(state);

      // Track errors
      if (state === SyncState.Error && data?.error) {
        setSyncError(data.error);
      } else if (state !== SyncState.Error) {
        setSyncError(null);
      }

      // Notify callback
      if (state !== prevSyncStateRef.current) {
        onSyncStateChange?.(state, prevSyncStateRef.current);
        prevSyncStateRef.current = state;
      }

      // Refresh rooms on successful sync states
      if (
        state === SyncState.Prepared ||
        state === SyncState.Syncing
      ) {
        refreshRooms();
      }
    },
    [onSyncStateChange, refreshRooms]
  );

  // =============================================================================
  // Client Lifecycle
  // =============================================================================

  useEffect(() => {
    // No session = destroy client if exists
    if (!session) {
      if (client) {
        destroyClient();
        setClient(null);
        setSyncState(null);
        setRooms([]);
        setSyncError(null);
        sessionIdRef.current = null;
        prevSyncStateRef.current = null;
      }
      return;
    }

    // Already initialized for this session
    if (sessionIdRef.current === session.sessionId) {
      return;
    }

    // Initialize new client
    try {
      const newClient = initializeClient(session);
      setClient(newClient);
      sessionIdRef.current = session.sessionId;

      // Set up sync listener
      newClient.on(ClientEvent.Sync, handleSync);

      // Initial rooms fetch (may be empty before first sync)
      const initialRooms = newClient.getRooms();
      setRooms(initialRooms);

    } catch (error) {
      console.error("[MatrixProvider] Failed to initialize client:", error);
      setSyncError(error instanceof Error ? error : new Error("Failed to initialize client"));
    }

    // Cleanup on unmount or session change
    return () => {
      const currentClient = getClient();
      if (currentClient) {
        currentClient.off(ClientEvent.Sync, handleSync);
      }
    };
  }, [session, client, handleSync]);

  // =============================================================================
  // Room Events (Join/Leave/Update)
  // =============================================================================

  useEffect(() => {
    if (!client) return;

    // Listen for room membership changes
    const handleRoom = () => {
      refreshRooms();
    };

    const handleDeleteRoom = () => {
      refreshRooms();
    };

    client.on(ClientEvent.Room, handleRoom);
    client.on(ClientEvent.DeleteRoom, handleDeleteRoom);

    return () => {
      client.off(ClientEvent.Room, handleRoom);
      client.off(ClientEvent.DeleteRoom, handleDeleteRoom);
    };
  }, [client, refreshRooms]);

  // =============================================================================
  // Context Value
  // =============================================================================

  const value = useMemo<MatrixContextValue>(
    () => ({
      // State
      client,
      syncState,
      rooms,
      isReady,
      isSyncing,
      syncError,
      // Actions
      getRoom,
      refreshRooms,
    }),
    [client, syncState, rooms, isReady, isSyncing, syncError, getRoom, refreshRooms]
  );

  return (
    <MatrixContext.Provider value={value}>
      {children}
    </MatrixContext.Provider>
  );
}

// =============================================================================
// Exports
// =============================================================================

export { SyncState };
export type { MatrixState, MatrixActions, MatrixContextValue };
