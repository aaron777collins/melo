import type { MeloPermissions } from '@/lib/matrix/permissions';

export interface SlowmodeSettings {
  /**
   * Slowmode duration in seconds
   * 0 means slowmode is disabled
   */
  duration: number;

  /**
   * Timestamp of when the last message was sent
   * Used for tracking rate limiting
   */
  lastMessageTimestamp?: number;
}

/**
 * Possible slowmode duration options
 */
export const SLOWMODE_DURATION_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '5 seconds', value: 5 },
  { label: '10 seconds', value: 10 },
  { label: '30 seconds', value: 30 },
  { label: '1 minute', value: 60 },
  { label: '2 minutes', value: 120 },
  { label: '5 minutes', value: 300 },
  { label: '10 minutes', value: 600 },
  { label: '15 minutes', value: 900 },
] as const;

/**
 * Channel-specific permission override for a role
 */
export interface ChannelRolePermissionOverride {
  /** Role ID (power level or custom role ID) */
  roleId: string;
  /** Role name for display */
  roleName: string;
  /** Permission overrides - only specified permissions are overridden */
  permissions: Partial<MeloPermissions>;
  /** When this override was created */
  createdAt: string;
  /** Who created this override */
  createdBy: string;
}

/**
 * Channel-specific permission override for a user
 */
export interface ChannelUserPermissionOverride {
  /** User Matrix ID */
  userId: string;
  /** User display name for UI */
  displayName: string;
  /** Permission overrides - only specified permissions are overridden */
  permissions: Partial<MeloPermissions>;
  /** When this override was created */
  createdAt: string;
  /** Who created this override */
  createdBy: string;
}

/**
 * Complete channel permission configuration
 */
export interface ChannelPermissions {
  /** Channel/room ID this applies to */
  channelId: string;
  /** Role-specific permission overrides */
  roleOverrides: ChannelRolePermissionOverride[];
  /** User-specific permission overrides */
  userOverrides: ChannelUserPermissionOverride[];
  /** Whether to inherit from parent/server permissions (default: true) */
  inheritFromParent: boolean;
  /** Last updated timestamp */
  lastUpdated: string;
  /** Who last updated these permissions */
  lastUpdatedBy: string;
  /** Version for conflict resolution */
  version: number;
}

/**
 * Bulk permission operation for multiple targets
 */
export interface BulkPermissionOperation {
  /** Operation type */
  type: 'grant' | 'deny' | 'reset' | 'copy';
  /** Target type */
  targetType: 'role' | 'user';
  /** Target IDs (role IDs or user IDs) */
  targetIds: string[];
  /** Permissions to modify */
  permissions: (keyof MeloPermissions)[];
  /** Grant or deny the permissions */
  action: 'allow' | 'deny' | 'inherit';
  /** Optional: copy permissions from another role/user */
  copyFromId?: string;
}

/**
 * Permission check result with context
 */
export interface PermissionCheckResult {
  /** Whether the permission is granted */
  allowed: boolean;
  /** Source of the permission (role, user override, default, etc.) */
  source: 'role' | 'channel-role' | 'channel-user' | 'default';
  /** Details about how the permission was determined */
  reasoning: string;
  /** Effective permission value */
  value: boolean;
}