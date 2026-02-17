"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Room, RoomEvent, RoomStateEvent } from "matrix-js-sdk";
import { useMatrix } from "@/components/providers/matrix-provider";
import type { MatrixSpace, SpaceChannel, DirectMessage } from "@/lib/matrix/types/space";

// =============================================================================
// Types & Interfaces
// =============================================================================

interface Space {
  id: string;
  name: string;
  avatarUrl: string | null;
  hasUnread: boolean;
  mentionCount: number;
  channels: SpaceChannel[];
  memberCount: number;
  topic: string | null;
}

interface UseSpacesReturn {
  /**
   * List of spaces the user has joined
   */
  spaces: Space[];
  
  /**
   * All channels across all spaces (for mentions)
   */
  allChannels: SpaceChannel[];
  
  /**
   * Direct message rooms
   */
  directMessages: DirectMessage[];
  
  /**
   * Whether the hook is loading
   */
  isLoading: boolean;
  
  /**
   * Any error that occurred
   */
  error: Error | null;
  
  /**
   * Refetch spaces data
   */
  refetch: () => Promise<void>;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a room is a Matrix space
 */
function isSpace(room: Room): boolean {
  try {
    const roomType = room.getType();
    return roomType === "m.space";
  } catch {
    return false;
  }
}

/**
 * Check if a room is a direct message
 */
function isDirectMessage(room: Room): boolean {
  try {
    // DM rooms are marked in account data
    const isDM = room.getAccountData("m.direct") !== null;
    return isDM || room.getJoinedMemberCount() === 2;
  } catch {
    return false;
  }
}

/**
 * Get space child room IDs
 */
function getSpaceChildRoomIds(space: Room): string[] {
  try {
    const childEvents = space.currentState.getStateEvents("m.space.child");
    return childEvents.map(event => event.getStateKey()).filter(Boolean) as string[];
  } catch {
    return [];
  }
}

/**
 * Calculate channel type from Matrix room
 */
function getChannelType(room: Room): SpaceChannel['type'] {
  try {
    // Check room type or power levels to determine channel type
    const roomType = room.getType();
    const roomName = room.name?.toLowerCase() || "";
    
    if (roomType === "m.voice") return "voice";
    if (roomName.includes("announcement") || roomName.includes("news")) return "announcement";
    
    // Default to text for now
    return "text";
  } catch {
    return "text";
  }
}

/**
 * Check if room has unread messages
 */
function hasUnreadMessages(room: Room): boolean {
  try {
    const unreadCount = room.getUnreadNotificationCount();
    return unreadCount > 0;
  } catch {
    return false;
  }
}

/**
 * Get room mention count
 */
function getRoomMentionCount(room: Room): number {
  try {
    return room.getUnreadNotificationCount("highlight") || 0;
  } catch {
    return 0;
  }
}

/**
 * Convert Matrix room to Space object
 */
function roomToSpace(room: Room, allRooms: Room[]): Space {
  const childRoomIds = getSpaceChildRoomIds(room);
  
  // Get child channels
  const channels: SpaceChannel[] = childRoomIds
    .map(roomId => allRooms.find(r => r.roomId === roomId))
    .filter((childRoom): childRoom is Room => 
      childRoom != null && 
      !isSpace(childRoom) && 
      !isDirectMessage(childRoom)
    )
    .map((childRoom, index) => ({
      id: childRoom.roomId,
      name: childRoom.name || "Unnamed Channel",
      topic: childRoom.currentState.getStateEvents("m.room.topic", "")?.getContent()?.topic || null,
      type: getChannelType(childRoom),
      categoryId: null, // TODO: Implement categories if needed
      order: index,
      hasUnread: hasUnreadMessages(childRoom),
      mentionCount: getRoomMentionCount(childRoom)
    }));

  // Calculate space-level unread state
  const hasUnread = hasUnreadMessages(room) || channels.some(ch => ch.hasUnread);
  const mentionCount = getRoomMentionCount(room) + channels.reduce((sum, ch) => sum + ch.mentionCount, 0);

  return {
    id: room.roomId,
    name: room.name || "Unnamed Space",
    avatarUrl: room.getAvatarUrl() || null,
    hasUnread,
    mentionCount,
    channels,
    memberCount: room.getJoinedMemberCount(),
    topic: room.currentState.getStateEvents("m.room.topic", "")?.getContent()?.topic || null
  };
}

/**
 * Convert room to DirectMessage object
 */
function roomToDirectMessage(room: Room): DirectMessage | null {
  try {
    const members = room.getJoinedMembers();
    const otherMember = Object.values(members).find(m => m.userId !== room.myUserId);
    
    if (!otherMember) return null;

    const timeline = room.timeline;
    const lastEvent = timeline[timeline.length - 1];

    return {
      id: room.roomId,
      otherUserId: otherMember.userId,
      otherUserName: otherMember.name,
      otherUserAvatarUrl: otherMember.getAvatarUrl() || null,
      hasUnread: hasUnreadMessages(room),
      lastMessage: lastEvent?.getContent()?.body || null,
      lastActiveAt: lastEvent ? new Date(lastEvent.getTs()).toISOString() : null
    };
  } catch {
    return null;
  }
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook to get Matrix spaces, channels, and direct messages
 */
export function useSpaces(): UseSpacesReturn {
  const { client, rooms, isReady, getRoom } = useMatrix();
  
  // Local state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Process rooms into spaces, channels, and DMs
  const { spaces, allChannels, directMessages } = useMemo(() => {
    if (!isReady || !client || rooms.length === 0) {
      return { spaces: [], allChannels: [], directMessages: [] };
    }

    try {
      // Filter rooms by type
      const spaceRooms = rooms.filter(isSpace);
      const dmRooms = rooms.filter(isDirectMessage);
      
      // Convert to our data structures
      const processedSpaces = spaceRooms.map(room => roomToSpace(room, rooms));
      const processedDMs = dmRooms.map(roomToDirectMessage).filter((dm): dm is DirectMessage => dm !== null);
      
      // Extract all channels across all spaces for mentions
      const allChannelsAcrossSpaces = processedSpaces.flatMap(space => space.channels);

      return {
        spaces: processedSpaces,
        allChannels: allChannelsAcrossSpaces,
        directMessages: processedDMs
      };
    } catch (err) {
      console.error("[useSpaces] Error processing rooms:", err);
      setError(err instanceof Error ? err : new Error("Failed to process rooms"));
      return { spaces: [], allChannels: [], directMessages: [] };
    }
  }, [client, rooms, isReady]);

  // Update loading state
  useEffect(() => {
    setIsLoading(!isReady);
    if (isReady) {
      setError(null);
    }
  }, [isReady]);

  // Set up room event listeners for reactive updates
  useEffect(() => {
    if (!client || !isReady) return;

    const handleRoomEvents = () => {
      // Re-processing happens automatically via rooms dependency
      // This just ensures we respond to room state changes
    };

    // Listen to room events that could affect our data
    rooms.forEach(room => {
      room.on(RoomEvent.Name, handleRoomEvents);
      room.on(RoomEvent.MyMembership, handleRoomEvents);
      room.on(RoomStateEvent.Events, handleRoomEvents);
      room.on(RoomEvent.Timeline, handleRoomEvents);
    });

    return () => {
      rooms.forEach(room => {
        room.off(RoomEvent.Name, handleRoomEvents);
        room.off(RoomEvent.MyMembership, handleRoomEvents);
        room.off(RoomStateEvent.Events, handleRoomEvents);
        room.off(RoomEvent.Timeline, handleRoomEvents);
      });
    };
  }, [client, rooms, isReady]);

  // Refetch function
  const refetch = useCallback(async () => {
    if (!client) return;
    
    try {
      setError(null);
      // The Matrix provider handles room refreshing
      // This is mainly for manual error recovery
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to refetch"));
    }
  }, [client]);

  return {
    spaces,
    allChannels,
    directMessages,
    isLoading,
    error,
    refetch
  };
}

/**
 * Get count of unread direct messages
 */
export function useUnreadDMCount(): number {
  const { directMessages } = useSpaces();
  return directMessages.filter(dm => dm.hasUnread).length;
}