/**
 * Moderation Components - Re-exports
 * 
 * Centralized exports for all moderation-related UI components.
 * These components integrate with the Matrix moderation service
 * to provide kick/ban/mute functionality via power levels.
 */

// Moderation Modals (existing in components/modals/)
export { KickUserModal } from '../modals/kick-user-modal';
export { BanUserModal } from '../modals/ban-user-modal';
export { MuteUserModal } from '../modals/mute-user-modal';
export { BulkKickUsersModal } from '../modals/bulk-kick-users-modal';
export { BulkBanUsersModal } from '../modals/bulk-ban-users-modal';

// Re-export types from the types file
export type {
  UserRole,
  ModerationAction,
  ModerationResult,
  KickUserOptions,
  BanUserOptions,
  MuteUserOptions,
  MuteInfo,
  BanInfo,
  RoomMemberInfo,
  BannedUserInfo,
  MutedUserInfo,
  ModerationLogEntry,
  BulkDeleteResult,
  ExpiredBanCheckResult,
  CanDeleteResult,
  MuteStatusResult,
  BanStatusResult,
  ModerationTargetUser,
  ModerationModalData,
  BanDurationOption,
  MuteDurationOption
} from '../../lib/matrix/types/moderation';

// Re-export duration presets for use in components
export {
  BAN_DURATION_PRESETS,
  MUTE_DURATION_PRESETS
} from '../../lib/matrix/types/moderation';

// Re-export the moderation service factory
export {
  createModerationService,
  canModerate,
  PowerLevels,
  MatrixModerationService
} from '../../lib/matrix/moderation';

// Re-export enhanced moderation service
export {
  createEnhancedModerationService,
  EnhancedMatrixModerationService
} from '../../lib/matrix/moderation-enhanced';
