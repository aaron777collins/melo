/**
 * Matrix Space Types
 * 
 * TypeScript types for Matrix spaces (Discord-like servers).
 * Spaces are special rooms in Matrix that organize other rooms.
 */

// =============================================================================
// Core Space Types
// =============================================================================

/**
 * A Matrix space (equivalent to a Discord server)
 */
export interface MatrixSpace {
  /** Space room ID (e.g., "!abc123:example.com") */
  id: string;
  /** Display name of the space */
  name: string;
  /** Avatar MXC URL (e.g., "mxc://example.com/abc123") */
  avatarUrl: string | null;
  /** Space topic/description */
  topic: string | null;
  /** Number of members in the space */
  memberCount: number;
  /** Whether the current user is the space owner */
  isOwner: boolean;
  /** IDs of child rooms (channels) */
  childRoomIds: string[];
  /** Join rules ('public', 'invite', 'knock') */
  joinRule: SpaceJoinRule;
  /** Canonical alias if set (e.g., "#myspace:example.com") */
  canonicalAlias: string | null;
  /** Power level of current user in this space */
  currentUserPowerLevel: number;
  /** Whether the space has unread messages in any child rooms */
  hasUnread: boolean;
  /** Number of unread mentions across child rooms */
  unreadMentionCount: number;
}

/**
 * Join rules for a space
 */
export type SpaceJoinRule = 'public' | 'invite' | 'knock' | 'restricted';

/**
 * Summary data for navigation sidebar
 */
export interface SpaceNavItem {
  /** Space room ID */
  id: string;
  /** Display name */
  name: string;
  /** Avatar URL (mxc or http) */
  avatarUrl: string | null;
  /** Whether this space is currently selected */
  isActive: boolean;
  /** Whether the space has unread messages */
  hasUnread: boolean;
  /** Number of unread mentions */
  mentionCount: number;
}

// =============================================================================
// DM Types
// =============================================================================

/**
 * A direct message room
 */
export interface DirectMessage {
  /** Room ID */
  id: string;
  /** The other user in the DM */
  otherUserId: string;
  /** Other user's display name */
  otherUserName: string | null;
  /** Other user's avatar URL */
  otherUserAvatarUrl: string | null;
  /** Whether there are unread messages */
  hasUnread: boolean;
  /** Last message preview */
  lastMessage: string | null;
  /** Last activity timestamp */
  lastActiveAt: string | null;
}

// =============================================================================
// Space Child (Channel) Types
// =============================================================================

/**
 * Types of channels within a space
 */
export type ChannelType = 'text' | 'voice' | 'audio' | 'video' | 'announcement';

/**
 * A channel within a space
 */
export interface SpaceChannel {
  /** Room ID */
  id: string;
  /** Channel name */
  name: string;
  /** Channel topic */
  topic: string | null;
  /** Channel type */
  type: ChannelType;
  /** Category this channel belongs to (room ID) */
  categoryId: string | null;
  /** Order within category */
  order: number;
  /** Whether the channel has unread messages */
  hasUnread: boolean;
  /** Number of unread mentions */
  mentionCount: number;
}

/**
 * A category grouping channels
 */
export interface SpaceCategory {
  /** Category room ID (or synthetic ID) */
  id: string;
  /** Category name */
  name: string;
  /** Channels in this category */
  channels: SpaceChannel[];
  /** Order in the sidebar */
  order: number;
  /** Whether collapsed in UI */
  isCollapsed: boolean;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get the first letter(s) for avatar fallback
 * @param name - Display name to get initials from
 * @returns 1-2 character string for avatar fallback
 */
export function getSpaceInitials(name: string): string {
  if (!name) return '?';
  
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return name.charAt(0).toUpperCase();
  }
  
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

/**
 * Convert mxc:// URL to HTTP URL
 * @param mxcUrl - Matrix content URL
 * @param homeserverUrl - Homeserver base URL
 * @param width - Optional thumbnail width
 * @param height - Optional thumbnail height
 * @returns HTTP URL for the content
 */
export function mxcToHttp(
  mxcUrl: string | null,
  homeserverUrl: string,
  width?: number,
  height?: number
): string | null {
  if (!mxcUrl || !mxcUrl.startsWith('mxc://')) {
    return mxcUrl;
  }

  const [, serverName, mediaId] = mxcUrl.match(/^mxc:\/\/([^/]+)\/(.+)$/) || [];
  if (!serverName || !mediaId) {
    return null;
  }

  const baseUrl = homeserverUrl.replace(/\/$/, '');
  
  if (width && height) {
    return `${baseUrl}/_matrix/media/v3/thumbnail/${serverName}/${mediaId}?width=${width}&height=${height}&method=crop`;
  }
  
  return `${baseUrl}/_matrix/media/v3/download/${serverName}/${mediaId}`;
}
