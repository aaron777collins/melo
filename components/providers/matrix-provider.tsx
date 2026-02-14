"use client";

/**
 * Matrix Client Context Provider
 *
 * Manages the Matrix client lifecycle including E2EE crypto initialization.
 * Exposes sync state, rooms, crypto state, and client instance to the application.
 * Works in conjunction with MatrixAuthProvider to initialize the client when a user logs in.
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
 *   const { rooms, isReady, syncState, cryptoState } = useMatrix();
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
import {
  ClientEvent,
  SyncState,
  type Room,
  type MatrixClient,
} from "matrix-js-sdk";

import {
  initializeClient,
  initializeCrypto,
  startClientSync,
  getClient,
  destroyClient,
  getCryptoState,
  type CryptoState,
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
  /** Current crypto state */
  cryptoState: CryptoState;
  /** List of rooms the user has joined */
  rooms: Room[];
  /** Whether the client is ready (crypto initialized and synced at least once) */
  isReady: boolean;
  /** Whether the client is currently syncing (after initial sync) */
  isSyncing: boolean;
  /** Whether E2EE is available */
  isE2EEEnabled: boolean;
  /** Sync error if any */
  syncError: Error | null;
  /** Crypto error if any */
  cryptoError: Error | null;
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
 *   const { client, rooms, isReady, syncState, cryptoState } = useMatrix();
 *
 *   if (!isReady) {
 *     return <div>Syncing with server...</div>;
 *   }
 *
 *   return (
 *     <div>
 *       <p>Sync state: {syncState}</p>
 *       <p>Rooms: {rooms.length}</p>
 *       <p>E2EE: {cryptoState.status === 'ready' ? 'Enabled' : 'Disabled'}</p>
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
  onSyncStateChange?: (
    state: SyncState | null,
    prevState: SyncState | null
  ) => void;
  /**
   * Callback when rooms list updates
   */
  onRoomsUpdate?: (rooms: Room[]) => void;
  /**
   * Callback when crypto state changes
   */
  onCryptoStateChange?: (state: CryptoState) => void;
  /**
   * Whether to initialize crypto (default: true)
   * Set to false to disable E2EE (not recommended)
   */
  enableCrypto?: boolean;
}

// =============================================================================
// Provider Component
// =============================================================================

/**
 * Matrix Client Provider
 *
 * Wraps the application with Matrix client context.
 * Automatically initializes client with E2EE when user logs in via MatrixAuthProvider.
 * Must be placed inside MatrixAuthProvider.
 *
 * @param props - Provider props
 * @returns Provider component
 */
export function MatrixProvider({
  children,
  onSyncStateChange,
  onRoomsUpdate,
  onCryptoStateChange,
  enableCrypto = true,
}: MatrixProviderProps): JSX.Element {
  // Get auth state from parent provider
  const { session } = useMatrixAuth();

  // State
  const [client, setClient] = useState<MatrixClient | null>(null);
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [cryptoState, setCryptoState] = useState<CryptoState>({
    status: "uninitialized",
  });
  const [rooms, setRooms] = useState<Room[]>([]);
  const [syncError, setSyncError] = useState<Error | null>(null);
  const [cryptoError, setCryptoError] = useState<Error | null>(null);

  // Track previous sync state for callbacks
  const prevSyncStateRef = useRef<SyncState | null>(null);

  // Track if we've initialized for this session
  const sessionIdRef = useRef<string | null>(null);

  // Track initialization in progress
  const initializingRef = useRef(false);

  // =============================================================================
  // Derived State
  // =============================================================================

  // isReady means both crypto is ready (or disabled) AND sync has completed
  const isCryptoReadyOrDisabled =
    !enableCrypto || cryptoState.status === "ready";
  const isSyncReady =
    syncState === SyncState.Prepared || syncState === SyncState.Syncing;
  const isReady = isCryptoReadyOrDisabled && isSyncReady;
  const isSyncing = syncState === SyncState.Syncing;
  const isE2EEEnabled =
    cryptoState.status === "ready" && cryptoState.isEncryptionSupported;

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
    (
      state: SyncState,
      prevState: SyncState | null,
      data?: { error?: Error }
    ) => {
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
      if (state === SyncState.Prepared || state === SyncState.Syncing) {
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
        void destroyClient();
        setClient(null);
        setSyncState(null);
        setCryptoState({ status: "uninitialized" });
        setRooms([]);
        setSyncError(null);
        setCryptoError(null);
        sessionIdRef.current = null;
        prevSyncStateRef.current = null;
      }
      return;
    }

    // Already initialized for this session
    if (sessionIdRef.current === session.sessionId) {
      return;
    }

    // Already initializing
    if (initializingRef.current) {
      return;
    }

    // Initialize new client with crypto
    const initialize = async () => {
      initializingRef.current = true;

      try {
        // Step 1: Create the client
        const newClient = initializeClient(session);
        setClient(newClient);
        sessionIdRef.current = session.sessionId;

        // Step 2: Initialize crypto if enabled
        if (enableCrypto) {
          setCryptoState({ status: "initializing" });
          onCryptoStateChange?.({ status: "initializing" });

          try {
            await initializeCrypto();

            const newCryptoState = getCryptoState();
            setCryptoState(newCryptoState);
            onCryptoStateChange?.(newCryptoState);
          } catch (error) {
            console.error("[MatrixProvider] Failed to initialize crypto:", error);
            const errorState: CryptoState = {
              status: "error",
              error: error instanceof Error ? error : new Error(String(error)),
            };
            setCryptoState(errorState);
            setCryptoError(
              error instanceof Error ? error : new Error(String(error))
            );
            onCryptoStateChange?.(errorState);
            // Continue without crypto - degraded mode
          }
        }

        // Step 3: Start syncing
        startClientSync();

        // Set up sync listener
        newClient.on(ClientEvent.Sync, handleSync);

        // Initial rooms fetch (may be empty before first sync)
        const initialRooms = newClient.getRooms();
        setRooms(initialRooms);
      } catch (error) {
        console.error("[MatrixProvider] Failed to initialize client:", error);
        setSyncError(
          error instanceof Error ? error : new Error("Failed to initialize client")
        );
      } finally {
        initializingRef.current = false;
      }
    };

    void initialize();

    // Cleanup on unmount or session change
    return () => {
      const currentClient = getClient();
      if (currentClient) {
        currentClient.off(ClientEvent.Sync, handleSync);
      }
    };
  }, [session, client, handleSync, enableCrypto, onCryptoStateChange]);

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
      cryptoState,
      rooms,
      isReady,
      isSyncing,
      isE2EEEnabled,
      syncError,
      cryptoError,
      // Actions
      getRoom,
      refreshRooms,
    }),
    [
      client,
      syncState,
      cryptoState,
      rooms,
      isReady,
      isSyncing,
      isE2EEEnabled,
      syncError,
      cryptoError,
      getRoom,
      refreshRooms,
    ]
  );

  return (
    <MatrixContext.Provider value={value}>{children}</MatrixContext.Provider>
  );
}

// =============================================================================
// Exports
// =============================================================================

export { SyncState };
export type { MatrixState, MatrixActions, MatrixContextValue, CryptoState };
