/**
 * Matrix Moderation Types
 * 
 * TypeScript types for power levels, moderation actions, and related structures.
 * Used by the moderation service and UI components.
 */

/**
 * User roles based on Matrix power levels
 */
export type UserRole = 'admin' | 'moderator' | 'member';

/**
 * Available moderation actions
 */
export type ModerationAction = 
  | 'KICK'
  | 'BAN'
  | 'MUTE'
  | 'DELETE_MESSAGE'
  | 'CHANGE_POWER_LEVELS'
  | 'CHANGE_ROOM_STATE';

/**
 * Result of a moderation operation
 */
export interface ModerationResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Error message if operation failed */
  error?: string;
}

/**
 * Options for kicking a user
 */
export interface KickUserOptions {
  /** Reason for kicking the user */
  reason?: string;
}

/**
 * Options for banning a user
 */
export interface BanUserOptions {
  /** Reason for banning the user */
  reason?: string;
  /** Duration in milliseconds (0 = permanent) */
  duration?: number;
}

/**
 * Options for muting a user
 */
export interface MuteUserOptions {
  /** Reason for muting the user */
  reason?: string;
  /** Duration in milliseconds (0 = permanent) */
  duration?: number;
}

/**
 * Power level constants for Matrix rooms
 */
export interface PowerLevelConstants {
  /** Default user power level */
  USER: 0;
  /** Moderator power level - can kick users, delete messages */
  MODERATOR: 50;
  /** Admin power level - full room control */
  ADMIN: 100;
  /** Required power levels for specific actions */
  ACTIONS: {
    KICK: 50;
    BAN: 50;
    MUTE: 25;
    DELETE_MESSAGE: 25;
    CHANGE_POWER_LEVELS: 100;
    CHANGE_ROOM_STATE: 50;
  };
}

/**
 * Information about a muted user
 */
export interface MuteInfo {
  /** User ID of the moderator who muted */
  mutedBy: string;
  /** ISO timestamp of when the mute occurred */
  mutedAt: string;
  /** Reason for the mute */
  reason: string;
  /** Duration in milliseconds (0 = permanent) */
  duration: number;
  /** ISO timestamp of when the mute expires (if timed) */
  expiresAt?: string;
  /** Original power level before muting */
  originalPowerLevel: number;
}

/**
 * Information about a banned user
 */
export interface BanInfo {
  /** User ID of the moderator who banned */
  bannedBy: string;
  /** ISO timestamp of when the ban occurred */
  bannedAt: string;
  /** Reason for the ban */
  reason: string;
  /** Duration in milliseconds (0 = permanent) */
  duration: number;
  /** ISO timestamp of when the ban expires (if timed) */
  expiresAt?: string;
  /** Whether the ban has expired but not been processed yet */
  isExpired?: boolean;
}

/**
 * Room member with moderation-relevant information
 */
export interface RoomMemberInfo {
  /** Matrix user ID */
  userId: string;
  /** Display name */
  displayName: string;
  /** Avatar MXC URL */
  avatarUrl?: string;
  /** Power level in the room */
  powerLevel: number;
  /** Role derived from power level */
  role: UserRole;
  /** Current membership status */
  membership: string;
}

/**
 * Banned user with ban details
 */
export interface BannedUserInfo {
  /** Matrix user ID */
  userId: string;
  /** Display name */
  displayName: string;
  /** Avatar MXC URL */
  avatarUrl?: string;
  /** User ID of moderator who banned */
  bannedBy?: string;
  /** ISO timestamp of ban */
  bannedAt?: string;
  /** Reason for ban */
  reason?: string;
  /** Duration in milliseconds */
  duration?: number;
  /** ISO timestamp of expiry */
  expiresAt?: string;
  /** Whether ban has expired */
  isExpired?: boolean;
}

/**
 * Muted user with mute details
 */
export interface MutedUserInfo {
  /** Matrix user ID */
  userId: string;
  /** User ID of moderator who muted */
  mutedBy: string;
  /** ISO timestamp of mute */
  mutedAt: string;
  /** Reason for mute */
  reason: string;
  /** Duration in milliseconds */
  duration: number;
  /** ISO timestamp of expiry */
  expiresAt?: string;
  /** Original power level before mute */
  originalPowerLevel: number;
}

/**
 * Moderation log entry
 */
export interface ModerationLogEntry {
  /** Action type (kick_user, ban_user, mute_user, etc.) */
  action: string;
  /** User ID of moderator who performed action */
  moderatorId: string;
  /** User ID of moderated user */
  targetUserId: string;
  /** Event ID (for message deletions) */
  eventId: string;
  /** Room ID where action occurred */
  roomId: string;
  /** Reason for the action */
  reason: string;
  /** ISO timestamp of action */
  timestamp: string;
  /** Whether action was on own content */
  isOwnMessage?: boolean;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Result of bulk message deletion
 */
export interface BulkDeleteResult {
  /** Overall success status */
  success: boolean;
  /** Number of messages successfully deleted */
  deletedCount: number;
  /** Number of messages that failed to delete */
  failedCount: number;
  /** Details of failed deletions */
  errors: Array<{
    eventId: string;
    error: string;
  }>;
}

/**
 * Result of expired ban check
 */
export interface ExpiredBanCheckResult {
  /** Number of bans checked */
  checkedCount: number;
  /** Number of users unbanned */
  unbannedCount: number;
  /** Details of failed unbans */
  errors: Array<{
    userId: string;
    error: string;
  }>;
}

/**
 * Permission check result for message deletion
 */
export interface CanDeleteResult {
  /** Whether deletion is allowed */
  canDelete: boolean;
  /** Reason for the decision */
  reason: string;
}

/**
 * User mute status check result
 */
export interface MuteStatusResult {
  /** Whether the user is muted */
  isMuted: boolean;
  /** Mute details if muted */
  muteInfo?: MuteInfo;
}

/**
 * User ban status check result
 */
export interface BanStatusResult {
  /** Whether the user is banned */
  isBanned: boolean;
  /** Ban details if banned */
  banInfo?: BanInfo;
}

/**
 * Target user for moderation actions (UI component prop)
 */
export interface ModerationTargetUser {
  /** Matrix user ID */
  id: string;
  /** Display name */
  name: string;
  /** Avatar URL (HTTP) */
  avatarUrl?: string;
}

/**
 * Props for moderation modal components
 */
export interface ModerationModalData {
  /** User being moderated */
  targetUser?: ModerationTargetUser;
  /** Server/space ID */
  serverId?: string;
  /** Optional room ID (for channel-specific moderation) */
  roomId?: string;
}

/**
 * Ban duration options for UI
 */
export interface BanDurationOption {
  /** Display label */
  label: string;
  /** Value for form */
  value: string;
  /** Duration in milliseconds */
  durationMs: number;
}

/**
 * Mute duration options for UI
 */
export interface MuteDurationOption {
  /** Display label */
  label: string;
  /** Value for form */
  value: string;
  /** Duration in milliseconds */
  durationMs: number;
}

/**
 * Common ban duration presets
 */
export const BAN_DURATION_PRESETS: BanDurationOption[] = [
  { label: '1 Hour', value: '1h', durationMs: 1 * 60 * 60 * 1000 },
  { label: '24 Hours', value: '24h', durationMs: 24 * 60 * 60 * 1000 },
  { label: '7 Days', value: '7d', durationMs: 7 * 24 * 60 * 60 * 1000 },
  { label: 'Permanent', value: 'permanent', durationMs: 0 }
];

/**
 * Common mute duration presets
 */
export const MUTE_DURATION_PRESETS: MuteDurationOption[] = [
  { label: '5 Minutes', value: '5m', durationMs: 5 * 60 * 1000 },
  { label: '1 Hour', value: '1h', durationMs: 1 * 60 * 60 * 1000 },
  { label: '24 Hours', value: '24h', durationMs: 24 * 60 * 60 * 1000 },
  { label: '7 Days', value: '7d', durationMs: 7 * 24 * 60 * 60 * 1000 },
  { label: 'Permanent', value: 'permanent', durationMs: 0 }
];

// All types are exported inline above - no re-export needed
