/**
 * Space Channels Hook
 *
 * Provides access to a space's child rooms organized in Discord-style channels.
 * Maps Matrix rooms to channel concepts with categories and proper ordering.
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Room } from "matrix-js-sdk";
import { useMatrix } from "../../../components/providers/matrix-provider";
import { getSpaceChildren } from "../services/matrix-space";
import { getRoomType, type RoomChannelType } from "../services/matrix-room";
import type { SpaceChannel, SpaceCategory } from "../../../lib/matrix/types/space";

// =============================================================================
// Types
// =============================================================================

interface UseSpaceChannelsReturn {
  /** Organized channel categories */
  categories: SpaceCategory[];
  /** Flat list of all channels */
  channels: SpaceChannel[];
  /** Whether channels are being loaded */
  isLoading: boolean;
  /** Error if loading failed */
  error: string | null;
  /** Refresh the channel list */
  refresh: () => void;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert a Matrix Room to a SpaceChannel
 */
function convertRoomToChannel(room: Room, order: number = 0): SpaceChannel {
  const type = getRoomType(room) as RoomChannelType;
  const name = room.name || 'Unnamed Channel';
  const topic = room.currentState.getStateEvents('m.room.topic', '')?.getContent()?.topic || null;
  
  // Get unread status
  const unreadCount = room.getUnreadNotificationCount();
  const hasUnread = unreadCount > 0;
  const mentionCount = room.getUnreadNotificationCount() || 0;
  
  return {
    id: room.roomId,
    name,
    topic,
    type,
    categoryId: null, // Categories to be determined by grouping logic
    order,
    hasUnread,
    mentionCount,
  };
}

/**
 * Group channels into categories based on type and naming patterns
 */
function organizeChannelsIntoCategories(channels: SpaceChannel[]): SpaceCategory[] {
  // Default categories by channel type
  const categories: { [key: string]: SpaceCategory } = {};
  
  // Helper to get or create category
  const getCategory = (id: string, name: string, order: number): SpaceCategory => {
    if (!categories[id]) {
      categories[id] = {
        id,
        name,
        channels: [],
        order,
        isCollapsed: false,
      };
    }
    return categories[id];
  };
  
  // Sort channels by name first
  channels.sort((a, b) => a.name.localeCompare(b.name));
  
  // Organize by type
  for (const channel of channels) {
    let category: SpaceCategory;
    
    switch (channel.type) {
      case 'text':
        category = getCategory('text', '📝 Text Channels', 1);
        break;
      case 'voice':
      case 'audio':
        category = getCategory('voice', '🔊 Voice Channels', 2);
        break;
      case 'video':
        category = getCategory('video', '📹 Video Channels', 3);
        break;
      case 'announcement':
        category = getCategory('announcements', '📢 Announcements', 0);
        break;
      default:
        category = getCategory('other', '🗂️ Other', 4);
        break;
    }
    
    // Update channel with category ID
    channel.categoryId = category.id;
    category.channels.push(channel);
  }
  
  // Convert to array and sort by order
  const categoryList = Object.values(categories).sort((a, b) => a.order - b.order);
  
  // If we only have one category with text channels, just call it "Channels"
  if (categoryList.length === 1 && categoryList[0].id === 'text') {
    categoryList[0].name = '💬 Channels';
  }
  
  return categoryList;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook to get organized channels for a space
 *
 * Fetches child rooms of a Matrix space and organizes them into Discord-style
 * categories based on room type. Provides both flat and categorized views.
 *
 * @param spaceId - The Matrix space ID to get channels for
 * @returns Channel organization and state
 *
 * @example
 * ```tsx
 * function SpaceChannelList({ spaceId }: { spaceId: string }) {
 *   const { categories, isLoading, error } = useSpaceChannels(spaceId);
 *
 *   if (isLoading) return <Skeleton />;
 *   if (error) return <Error message={error} />;
 *
 *   return (
 *     <div>
 *       {categories.map(category => (
 *         <ChannelCategory key={category.id} category={category} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSpaceChannels(spaceId: string | null): UseSpaceChannelsReturn {
  const { client, isReady } = useMatrix();
  const [channels, setChannels] = useState<SpaceChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // =============================================================================
  // Load Channels
  // =============================================================================

  const loadChannels = useCallback(async () => {
    if (!spaceId || !isReady || !client) {
      setChannels([]);
      setIsLoading(!isReady); // Only loading if client not ready
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get child rooms from the space
      const childRooms = await getSpaceChildren(spaceId);
      
      // Filter out other spaces (only include regular rooms)
      const actualChannels = childRooms.filter(room => {
        const creationEvent = room.currentState.getStateEvents('m.room.create', '');
        const roomType = creationEvent?.getContent()?.type;
        return roomType !== 'm.space'; // Exclude nested spaces
      });
      
      // Convert to SpaceChannel objects with ordering
      const spaceChannels = actualChannels.map((room, index) => 
        convertRoomToChannel(room, index)
      );
      
      setChannels(spaceChannels);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load channels");
      console.error('[useSpaceChannels] Error loading channels:', err);
    } finally {
      setIsLoading(false);
    }
  }, [spaceId, isReady, client]);

  // =============================================================================
  // Effects
  // =============================================================================

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  // =============================================================================
  // Organized Categories
  // =============================================================================

  const categories = useMemo(() => {
    return organizeChannelsIntoCategories([...channels]);
  }, [channels]);

  // =============================================================================
  // Return Value
  // =============================================================================

  return {
    categories,
    channels,
    isLoading,
    error,
    refresh: loadChannels,
  };
}

/**
 * Hook to get just the direct messages count
 * Utility for showing DM badge in navigation
 */
export function useDirectMessagesCount(): number {
  const { rooms } = useMatrix();

  return useMemo(() => {
    // Count rooms that are DMs (not in any space and 2 members)
    const dmRooms = rooms.filter(room => {
      // Not a space
      const creationEvent = room.currentState.getStateEvents('m.room.create', '');
      const roomType = creationEvent?.getContent()?.type;
      if (roomType === 'm.space') return false;
      
      // Not in any space (no parent events)
      const parentEvents = room.currentState.getStateEvents('m.space.parent');
      if (parentEvents && parentEvents.length > 0) return false;
      
      // Has exactly 2 joined members (user + other person)
      const memberCount = room.getJoinedMemberCount();
      return memberCount === 2;
    });

    return dmRooms.length;
  }, [rooms]);
}