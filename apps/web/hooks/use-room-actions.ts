/**
 * Room Actions Hook
 *
 * Provides React-friendly functions for room management operations.
 * Handles loading states, error handling, and integration with the Matrix provider.
 */

"use client";

import { useState, useCallback } from "react";
import { useMatrix } from "../../../components/providers/matrix-provider";
import {
  createRoom,
  joinRoom,
  joinRoomByIdOrAlias,
  leaveRoom,
  updateRoom,
  deleteRoom,
  searchPublicRooms,
  type RoomChannelType,
  type RoomUpdateData,
} from "../services/matrix-room";
import {
  createSpace,
  joinSpace,
  leaveSpace,
  updateSpace,
  deleteSpace,
} from "../services/matrix-space";

// =============================================================================
// Types
// =============================================================================

interface UseRoomActionsReturn {
  // Room operations
  createRoom: (name: string, type: RoomChannelType, parentSpaceId?: string) => Promise<string>;
  joinRoomByIdOrAlias: (roomIdOrAlias: string) => Promise<string>;
  leaveRoom: (roomId: string) => Promise<void>;
  updateRoom: (roomId: string, data: RoomUpdateData) => Promise<void>;
  deleteRoom: (roomId: string) => Promise<void>;
  
  // Space operations  
  createSpace: (name: string, avatar?: string) => Promise<string>;
  joinSpace: (spaceId: string) => Promise<void>;
  leaveSpace: (spaceId: string) => Promise<void>;
  updateSpace: (spaceId: string, data: { name?: string; topic?: string; avatar?: string }) => Promise<void>;
  deleteSpace: (spaceId: string) => Promise<void>;
  
  // Discovery
  searchPublicRooms: (searchTerm?: string, limit?: number) => Promise<any[]>;
  
  // State
  isLoading: boolean;
  error: string | null;
  
  // Helpers
  clearError: () => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for room and space management actions
 *
 * Provides React-friendly wrappers around the Matrix room and space services.
 * Handles loading states, error management, and automatically refreshes
 * the Matrix provider's room list after operations.
 *
 * @returns Room action functions and state
 *
 * @example
 * ```tsx
 * function CreateRoomModal({ spaceId }: { spaceId: string }) {
 *   const { createRoom, isLoading, error } = useRoomActions();
 *   const [roomName, setRoomName] = useState('');
 *
 *   const handleCreate = async () => {
 *     try {
 *       const roomId = await createRoom(roomName, 'text', spaceId);
 *       onRoomCreated(roomId);
 *     } catch (err) {
 *       // Error is automatically captured in the hook
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <input value={roomName} onChange={e => setRoomName(e.target.value)} />
 *       <button onClick={handleCreate} disabled={isLoading}>
 *         {isLoading ? 'Creating...' : 'Create Room'}
 *       </button>
 *       {error && <p>Error: {error}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useRoomActions(): UseRoomActionsReturn {
  const { refreshRooms } = useMatrix();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // =============================================================================
  // Error Handling
  // =============================================================================

  const handleError = useCallback((err: unknown, operation: string) => {
    const errorMessage = err instanceof Error ? err.message : `${operation} failed`;
    setError(errorMessage);
    console.error(`[useRoomActions] ${operation} error:`, err);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // =============================================================================
  // Room Operations
  // =============================================================================

  const handleCreateRoom = useCallback(async (
    name: string,
    type: RoomChannelType,
    parentSpaceId?: string
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const room = await createRoom(name, type, parentSpaceId);
      refreshRooms(); // Update the provider's room list
      return room.id;
    } catch (err) {
      handleError(err, 'Create room');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshRooms, handleError]);

  const handleJoinRoomByIdOrAlias = useCallback(async (roomIdOrAlias: string): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const roomId = await joinRoomByIdOrAlias(roomIdOrAlias);
      refreshRooms(); // Update the provider's room list
      return roomId;
    } catch (err) {
      handleError(err, 'Join room');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshRooms, handleError]);

  const handleLeaveRoom = useCallback(async (roomId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await leaveRoom(roomId);
      refreshRooms(); // Update the provider's room list
    } catch (err) {
      handleError(err, 'Leave room');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshRooms, handleError]);

  const handleUpdateRoom = useCallback(async (roomId: string, data: RoomUpdateData): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await updateRoom(roomId, data);
      refreshRooms(); // Update the provider's room list
    } catch (err) {
      handleError(err, 'Update room');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshRooms, handleError]);

  const handleDeleteRoom = useCallback(async (roomId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await deleteRoom(roomId);
      refreshRooms(); // Update the provider's room list
    } catch (err) {
      handleError(err, 'Delete room');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshRooms, handleError]);

  // =============================================================================
  // Space Operations
  // =============================================================================

  const handleCreateSpace = useCallback(async (name: string, avatar?: string): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const space = await createSpace(name, avatar);
      refreshRooms(); // Update the provider's room list (includes spaces)
      return space.id;
    } catch (err) {
      handleError(err, 'Create space');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshRooms, handleError]);

  const handleJoinSpace = useCallback(async (spaceId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await joinSpace(spaceId);
      refreshRooms(); // Update the provider's room list
    } catch (err) {
      handleError(err, 'Join space');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshRooms, handleError]);

  const handleLeaveSpace = useCallback(async (spaceId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await leaveSpace(spaceId);
      refreshRooms(); // Update the provider's room list
    } catch (err) {
      handleError(err, 'Leave space');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshRooms, handleError]);

  const handleUpdateSpace = useCallback(async (
    spaceId: string,
    data: { name?: string; topic?: string; avatar?: string }
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await updateSpace(spaceId, data);
      refreshRooms(); // Update the provider's room list
    } catch (err) {
      handleError(err, 'Update space');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshRooms, handleError]);

  const handleDeleteSpace = useCallback(async (spaceId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await deleteSpace(spaceId);
      refreshRooms(); // Update the provider's room list
    } catch (err) {
      handleError(err, 'Delete space');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshRooms, handleError]);

  // =============================================================================
  // Discovery Operations
  // =============================================================================

  const handleSearchPublicRooms = useCallback(async (
    searchTerm?: string,
    limit: number = 50
  ): Promise<any[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const results = await searchPublicRooms(searchTerm, limit);
      return results;
    } catch (err) {
      handleError(err, 'Search public rooms');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  // =============================================================================
  // Return Value
  // =============================================================================

  return {
    // Room operations
    createRoom: handleCreateRoom,
    joinRoomByIdOrAlias: handleJoinRoomByIdOrAlias,
    leaveRoom: handleLeaveRoom,
    updateRoom: handleUpdateRoom,
    deleteRoom: handleDeleteRoom,
    
    // Space operations
    createSpace: handleCreateSpace,
    joinSpace: handleJoinSpace,
    leaveSpace: handleLeaveSpace,
    updateSpace: handleUpdateSpace,
    deleteSpace: handleDeleteSpace,
    
    // Discovery
    searchPublicRooms: handleSearchPublicRooms,
    
    // State
    isLoading,
    error,
    
    // Helpers
    clearError,
  };
}