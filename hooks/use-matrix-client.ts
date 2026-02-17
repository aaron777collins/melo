/**
 * useMatrixClient Hook
 *
 * Provides access to the Matrix client instance from the MatrixProvider context.
 * This is a focused hook that returns only client-related state, making it ideal
 * for components that need to interact with the Matrix SDK directly.
 *
 * @module hooks/use-matrix-client
 * @see {@link ../components/providers/matrix-provider.tsx} - Parent context provider
 *
 * @example
 * ```tsx
 * import { useMatrixClient } from '@/hooks/use-matrix-client';
 *
 * function SendMessageButton({ roomId, content }: Props) {
 *   const { client, isReady } = useMatrixClient();
 *
 *   const handleSend = async () => {
 *     if (!client) return;
 *
 *     await client.sendMessage(roomId, {
 *       msgtype: 'm.text',
 *       body: content,
 *     });
 *   };
 *
 *   return (
 *     <button onClick={handleSend} disabled={!isReady}>
 *       Send
 *     </button>
 *   );
 * }
 * ```
 */

"use client";

import { useMemo } from "react";
import type { MatrixClient } from "@/lib/matrix/matrix-sdk-exports";

import { useMatrix } from "@/components/providers/matrix-provider";

// =============================================================================
// Types
// =============================================================================

/**
 * Return type for the useMatrixClient hook
 */
interface UseMatrixClientReturn {
  /**
   * The Matrix client instance.
   *
   * - `null` when not authenticated or before initialization
   * - `MatrixClient` when authenticated and client is created
   *
   * @remarks
   * Always check `isReady` or `client !== null` before calling client methods.
   * The client may exist but not be fully synced yet.
   */
  client: MatrixClient | null;

  /**
   * Whether the client is ready for use.
   *
   * A client is considered "ready" when:
   * - The client instance exists
   * - Initial sync has completed (SyncState.Prepared or SyncState.Syncing)
   *
   * @remarks
   * Use this flag to determine when it's safe to:
   * - Access rooms and room data
   * - Send messages
   * - Perform user lookups
   *
   * @example
   * ```tsx
   * const { client, isReady } = useMatrixClient();
   *
   * if (!isReady) {
   *   return <LoadingSpinner />;
   * }
   *
   * // Safe to use client here
   * const rooms = client?.getRooms() ?? [];
   * ```
   */
  isReady: boolean;
}

// =============================================================================
// Custom Error
// =============================================================================

/**
 * Error thrown when useMatrixClient is used outside of MatrixProvider
 */
class MatrixClientContextError extends Error {
  constructor() {
    super(
      "useMatrixClient must be used within a MatrixProvider. " +
        "Ensure your component tree is wrapped with:\n\n" +
        "  <MatrixAuthProvider>\n" +
        "    <MatrixProvider>\n" +
        "      {/* your components */}\n" +
        "    </MatrixProvider>\n" +
        "  </MatrixAuthProvider>\n\n" +
        "See: components/providers/matrix-provider.tsx"
    );
    this.name = "MatrixClientContextError";
  }
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook to access the Matrix client from the MatrixProvider context.
 *
 * Provides a simplified interface focused on client access and readiness state.
 * For full context access (rooms, sync state, errors), use `useMatrix()` instead.
 *
 * @throws {MatrixClientContextError} If used outside of MatrixProvider
 * @returns Object containing the client instance and readiness state
 *
 * @example Basic usage
 * ```tsx
 * function MyComponent() {
 *   const { client, isReady } = useMatrixClient();
 *
 *   if (!isReady) {
 *     return <div>Loading...</div>;
 *   }
 *
 *   const userId = client?.getUserId();
 *   return <div>Logged in as: {userId}</div>;
 * }
 * ```
 *
 * @example With type guard
 * ```tsx
 * function RoomView({ roomId }: { roomId: string }) {
 *   const { client, isReady } = useMatrixClient();
 *
 *   // Type-safe: client is guaranteed non-null when isReady is true
 *   if (!isReady || !client) {
 *     return <Skeleton />;
 *   }
 *
 *   const room = client.getRoom(roomId);
 *   if (!room) {
 *     return <NotFound />;
 *   }
 *
 *   return <RoomContent room={room} />;
 * }
 * ```
 *
 * @example Async operations
 * ```tsx
 * function MessageComposer({ roomId }: { roomId: string }) {
 *   const { client, isReady } = useMatrixClient();
 *   const [sending, setSending] = useState(false);
 *
 *   const sendMessage = async (text: string) => {
 *     if (!client || !isReady) return;
 *
 *     setSending(true);
 *     try {
 *       await client.sendMessage(roomId, {
 *         msgtype: 'm.text',
 *         body: text,
 *       });
 *     } finally {
 *       setSending(false);
 *     }
 *   };
 *
 *   return (
 *     <input
 *       onKeyDown={(e) => {
 *         if (e.key === 'Enter' && !sending) {
 *           sendMessage(e.currentTarget.value);
 *         }
 *       }}
 *       disabled={!isReady || sending}
 *     />
 *   );
 * }
 * ```
 */
export function useMatrixClient(): UseMatrixClientReturn {
  // Access the full Matrix context
  // This will throw if not within MatrixProvider via useMatrix's own check
  let matrixContext: ReturnType<typeof useMatrix>;

  try {
    matrixContext = useMatrix();
  } catch {
    // Re-throw with our more specific error for this hook
    throw new MatrixClientContextError();
  }

  const { client, isReady } = matrixContext;

  // Memoize the return value to maintain referential equality
  // This prevents unnecessary re-renders in consuming components
  return useMemo(
    () => ({
      client,
      isReady,
    }),
    [client, isReady]
  );
}

// =============================================================================
// Type Exports
// =============================================================================

export type { UseMatrixClientReturn };

// Re-export MatrixClient type for convenience
export type { MatrixClient } from "@/lib/matrix/matrix-sdk-exports";
