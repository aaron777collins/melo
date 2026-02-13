"use client";

import { useState, useEffect, useCallback } from "react";
import { Room } from "matrix-js-sdk";
import { useMatrix } from "@/components/providers/matrix-provider";
import { getSpaceInitials, mxcToHttp } from "@/lib/matrix/types/space";
import type { SpaceNavItem } from "@/lib/matrix/types/space";

/**
 * Hook state for spaces
 */
interface UseSpacesState {
  /** List of spaces the user has joined */
  spaces: SpaceNavItem[];
  /** Whether spaces are being loaded */
  isLoading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Refresh the spaces list */
  refresh: () => void;
}

/**
 * Hook to get the user's joined spaces for the navigation sidebar
 * 
 * Fetches real spaces from the Matrix client and maps them to Discord-style servers.
 * Automatically updates when the user joins/leaves spaces or when spaces are created/updated.
 * 
 * @returns Spaces state and actions
 * 
 * @example
 * ```tsx
 * function ServerList() {
 *   const { spaces, isLoading, error } = useSpaces();
 *   
 *   if (isLoading) return <Skeleton />;
 *   if (error) return <Error message={error} />;
 *   
 *   return spaces.map(space => (
 *     <NavigationItem key={space.id} {...space} />
 *   ));
 * }
 * ```
 */
export function useSpaces(): UseSpacesState {
  const { client, rooms, isReady } = useMatrix();
  const [spaces, setSpaces] = useState<SpaceNavItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Convert a Matrix Room to a SpaceNavItem for navigation
   */
  const convertRoomToSpaceNavItem = useCallback((room: Room, activeSpaceId?: string): SpaceNavItem => {
    // Get basic room info
    const name = room.name || 'Unnamed Space';
    const avatarEvent = room.currentState.getStateEvents('m.room.avatar', '');
    const avatarMxcUrl = avatarEvent?.getContent()?.url || null;
    
    // Convert avatar URL to HTTP if needed
    let avatarUrl: string | null = null;
    if (avatarMxcUrl && client) {
      const homeserverUrl = client.getHomeserverUrl();
      avatarUrl = mxcToHttp(avatarMxcUrl, homeserverUrl, 32, 32); // 32px avatar for nav
    }
    
    // Check for unread notifications across all child rooms
    let hasUnread = false;
    let mentionCount = 0;
    
    // Get child rooms and check their notification state
    const childEvents = room.currentState.getStateEvents('m.space.child');
    for (const childEvent of childEvents) {
      const childRoomId = childEvent.getStateKey();
      if (childRoomId) {
        const childRoom = client?.getRoom(childRoomId);
        if (childRoom) {
          const notifCount = childRoom.getUnreadNotificationCount();
          if (notifCount > 0) {
            hasUnread = true;
            mentionCount += notifCount;
          }
        }
      }
    }
    
    // Also check the space itself for notifications
    const spaceNotifCount = room.getUnreadNotificationCount();
    if (spaceNotifCount > 0) {
      hasUnread = true;
      mentionCount += spaceNotifCount;
    }
    
    return {
      id: room.roomId,
      name,
      avatarUrl,
      isActive: room.roomId === activeSpaceId,
      hasUnread,
      mentionCount,
    };
  }, [client]);

  /**
   * Load and process spaces from the Matrix client
   */
  const loadSpaces = useCallback(async () => {
    if (!isReady || !client) {
      setIsLoading(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Filter rooms to only include spaces
      const spaceRooms = rooms.filter(room => {
        // Check if this room is a space
        const creationEvent = room.currentState.getStateEvents('m.room.create', '');
        const roomType = creationEvent?.getContent()?.type;
        
        // Must be a space type and user must be joined
        return roomType === 'm.space' && room.getMyMembership() === 'join';
      });
      
      // Convert to navigation items
      const spaceNavItems = spaceRooms.map(room => convertRoomToSpaceNavItem(room));
      
      // Sort by name for consistent ordering
      spaceNavItems.sort((a, b) => a.name.localeCompare(b.name));
      
      setSpaces(spaceNavItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load spaces");
      console.error('[useSpaces] Error loading spaces:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isReady, client, rooms, convertRoomToSpaceNavItem]);

  // Load spaces when Matrix client is ready or rooms change
  useEffect(() => {
    loadSpaces();
  }, [loadSpaces]);

  return {
    spaces,
    isLoading,
    error,
    refresh: loadSpaces,
  };
}

/**
 * Hook to get unread DM count
 * 
 * TODO: Replace with Matrix SDK integration
 */
export function useUnreadDMCount(): number {
  // TODO: Implement with Matrix SDK
  return 0;
}
