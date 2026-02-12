/**
 * Matrix Room Directory Service
 *
 * Service for discovering and browsing public Matrix spaces and rooms.
 * Integrates with Matrix room directory API for space discovery.
 */

import { Room, IPublicRoomsChunkRoom, IPublicRoomsResponse } from "matrix-js-sdk";
import { getClient } from "../../../lib/matrix/client";

// =============================================================================
// Types
// =============================================================================

/**
 * A discovered public space from the room directory
 */
export interface DiscoveredSpace {
  /** Space ID */
  id: string;
  /** Space name */
  name: string;
  /** Space topic/description */
  topic?: string;
  /** Number of joined members */
  memberCount: number;
  /** Avatar MXC URL */
  avatarUrl?: string;
  /** Canonical alias */
  canonicalAlias?: string;
  /** Alternative aliases */
  aliases?: string[];
  /** Whether this space is a world readable */
  worldReadable: boolean;
  /** Whether guest access is allowed */
  guestCanJoin: boolean;
  /** Room type (should be 'm.space' for spaces) */
  roomType?: string;
  /** Tags/categories for filtering */
  tags?: string[];
}

/**
 * Search filters for space discovery
 */
export interface SpaceSearchFilters {
  /** Search query (name/topic) */
  query?: string;
  /** Minimum member count */
  minMembers?: number;
  /** Maximum member count */
  maxMembers?: number;
  /** Filter by categories/tags */
  categories?: string[];
  /** Whether to include spaces with guest access */
  guestAccessOnly?: boolean;
  /** Federation server to search on */
  server?: string;
}

/**
 * Pagination options for search results
 */
export interface SearchPagination {
  /** Number of results per page */
  limit?: number;
  /** Pagination token for next page */
  since?: string;
}

/**
 * Search results with pagination
 */
export interface SpaceSearchResult {
  /** Found spaces */
  spaces: DiscoveredSpace[];
  /** Total estimated results */
  totalEstimate?: number;
  /** Next page token */
  nextBatch?: string;
  /** Previous page token */
  prevBatch?: string;
}

/**
 * Category for filtering spaces
 */
export interface SpaceCategory {
  /** Category ID */
  id: string;
  /** Display name */
  name: string;
  /** Category description */
  description?: string;
  /** Icon emoji or symbol */
  icon?: string;
}

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Custom error class for room directory operations
 */
export class RoomDirectoryError extends Error {
  public readonly code: string;
  public readonly httpStatus?: number;

  constructor(message: string, code = 'DIRECTORY_ERROR', httpStatus?: number) {
    super(message);
    this.name = 'RoomDirectoryError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get the Matrix client instance and validate it's ready
 */
function getMatrixClient() {
  const client = getClient();
  if (!client) {
    throw new RoomDirectoryError('Matrix client not initialized', 'CLIENT_NOT_READY');
  }
  return client;
}

/**
 * Convert Matrix SDK public room data to DiscoveredSpace
 */
function publicRoomToDiscoveredSpace(room: IPublicRoomsChunkRoom): DiscoveredSpace {
  return {
    id: room.room_id,
    name: room.name || room.canonical_alias || 'Unnamed Space',
    topic: room.topic || undefined,
    memberCount: room.num_joined_members || 0,
    avatarUrl: room.avatar_url || undefined,
    canonicalAlias: room.canonical_alias || undefined,
    aliases: room.aliases || [],
    worldReadable: room.world_readable || false,
    guestCanJoin: room.guest_can_join || false,
    roomType: room.room_type || undefined,
    // Extract tags from topic or room data (basic implementation)
    tags: extractTagsFromRoom(room),
  };
}

/**
 * Extract category tags from room data
 * This is a basic implementation - could be enhanced with standardized room tags
 */
function extractTagsFromRoom(room: IPublicRoomsChunkRoom): string[] {
  const tags: string[] = [];
  const topic = (room.topic || '').toLowerCase();
  const name = (room.name || '').toLowerCase();
  
  // Basic category detection from name/topic
  if (topic.includes('gaming') || topic.includes('game') || name.includes('gaming')) {
    tags.push('Gaming');
  }
  if (topic.includes('tech') || topic.includes('development') || topic.includes('programming')) {
    tags.push('Technology');
  }
  if (topic.includes('art') || topic.includes('creative') || topic.includes('design')) {
    tags.push('Art & Creative');
  }
  if (topic.includes('music') || topic.includes('audio') || topic.includes('sound')) {
    tags.push('Music');
  }
  if (topic.includes('education') || topic.includes('learning') || topic.includes('study')) {
    tags.push('Education');
  }
  if (topic.includes('science') || topic.includes('research') || topic.includes('academic')) {
    tags.push('Science');
  }
  if (topic.includes('crypto') || topic.includes('blockchain') || topic.includes('web3')) {
    tags.push('Crypto & Web3');
  }
  
  return tags;
}

// =============================================================================
// Core Service Functions
// =============================================================================

/**
 * Search for public spaces in the Matrix room directory
 */
export async function searchPublicSpaces(
  filters: SpaceSearchFilters = {},
  pagination: SearchPagination = {}
): Promise<SpaceSearchResult> {
  try {
    const client = getMatrixClient();
    
    // Prepare search options
    const searchOptions = {
      limit: pagination.limit || 20,
      since: pagination.since,
      filter: {
        generic_search_term: filters.query || undefined,
      },
      server: filters.server,
      include_all_known_networks: true,
      third_party_instance_id: undefined,
    };

    // Call Matrix SDK public rooms API
    const response: IPublicRoomsResponse = await client.publicRooms(searchOptions);
    
    // Filter for spaces only and convert to our interface
    let spaces = response.chunk
      .filter((room) => {
        // Filter for spaces (rooms with type 'm.space' or those that look like spaces)
        const isSpace = room.room_type === 'm.space' || 
                       (room.name && !room.name.includes('#')) || 
                       (room.canonical_alias && room.canonical_alias.startsWith('#'));
        
        // Apply member count filters
        if (filters.minMembers && room.num_joined_members < filters.minMembers) {
          return false;
        }
        if (filters.maxMembers && room.num_joined_members > filters.maxMembers) {
          return false;
        }
        
        // Apply guest access filter
        if (filters.guestAccessOnly && !room.guest_can_join) {
          return false;
        }
        
        return isSpace;
      })
      .map(publicRoomToDiscoveredSpace);
    
    // Apply category filtering
    if (filters.categories && filters.categories.length > 0) {
      spaces = spaces.filter(space => 
        space.tags?.some(tag => filters.categories!.includes(tag))
      );
    }
    
    return {
      spaces,
      totalEstimate: response.total_room_count_estimate,
      nextBatch: response.next_batch,
      prevBatch: response.prev_batch,
    };
  } catch (error) {
    console.error('Error searching public spaces:', error);
    throw new RoomDirectoryError(
      `Failed to search public spaces: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'SEARCH_FAILED'
    );
  }
}

/**
 * Get featured/popular public spaces
 * Returns a curated list of popular spaces from the directory
 */
export async function getFeaturedSpaces(): Promise<DiscoveredSpace[]> {
  try {
    // Get popular spaces by searching without filters and taking top results
    const result = await searchPublicSpaces(
      { minMembers: 10 }, // Only spaces with decent activity
      { limit: 50 } // Get more results to filter
    );
    
    // Sort by member count and take top results
    return result.spaces
      .sort((a, b) => b.memberCount - a.memberCount)
      .slice(0, 12); // Return top 12 featured spaces
  } catch (error) {
    console.error('Error getting featured spaces:', error);
    throw new RoomDirectoryError(
      `Failed to get featured spaces: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'FEATURED_FAILED'
    );
  }
}

/**
 * Get available space categories for filtering
 */
export function getSpaceCategories(): SpaceCategory[] {
  return [
    { id: 'all', name: 'All', description: 'All public spaces', icon: '🌐' },
    { id: 'gaming', name: 'Gaming', description: 'Gaming communities and discussions', icon: '🎮' },
    { id: 'technology', name: 'Technology', description: 'Tech, programming, and development', icon: '💻' },
    { id: 'art-creative', name: 'Art & Creative', description: 'Art, design, and creative communities', icon: '🎨' },
    { id: 'music', name: 'Music', description: 'Music discussion and sharing', icon: '🎵' },
    { id: 'education', name: 'Education', description: 'Learning and educational content', icon: '📚' },
    { id: 'science', name: 'Science', description: 'Scientific discussion and research', icon: '🔬' },
    { id: 'crypto-web3', name: 'Crypto & Web3', description: 'Cryptocurrency and blockchain', icon: '₿' },
  ];
}

/**
 * Join a discovered space
 */
export async function joinDiscoveredSpace(spaceId: string): Promise<void> {
  try {
    const client = getMatrixClient();
    
    // Check if user can join (basic permission check)
    const userId = client.getUserId();
    if (!userId) {
      throw new RoomDirectoryError('User not authenticated', 'AUTH_REQUIRED');
    }
    
    // Join the space
    await client.joinRoom(spaceId);
    
    console.log(`Successfully joined space: ${spaceId}`);
  } catch (error) {
    console.error('Error joining space:', error);
    throw new RoomDirectoryError(
      `Failed to join space: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'JOIN_FAILED'
    );
  }
}

/**
 * Check if user can join a specific space
 */
export async function canJoinSpace(spaceId: string): Promise<boolean> {
  try {
    const client = getMatrixClient();
    const userId = client.getUserId();
    
    if (!userId) {
      return false;
    }
    
    // Check if user is already a member
    const room = client.getRoom(spaceId);
    if (room) {
      const member = room.getMember(userId);
      if (member && (member.membership === 'join' || member.membership === 'invite')) {
        return false; // Already joined or invited
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error checking join permissions:', error);
    return false;
  }
}