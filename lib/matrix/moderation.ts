/**
 * Matrix Moderation Service
 * 
 * Handles moderation actions like kick, ban, mute, etc. using the Matrix protocol.
 * Integrates with Matrix room power levels for permission checking.
 */

import { MatrixClient, Room, RoomMember } from "matrix-js-sdk";

export interface ModerationResult {
  success: boolean;
  error?: string;
}

export interface KickUserOptions {
  /** Reason for kicking the user */
  reason?: string;
}

export interface BanUserOptions {
  /** Reason for banning the user */
  reason?: string;
  /** Duration in milliseconds (0 = permanent) */
  duration?: number;
}

export interface MuteUserOptions {
  /** Reason for muting the user */
  reason?: string;
  /** Duration in milliseconds (0 = permanent) */
  duration?: number;
}

/**
 * Matrix Power Level Constants
 * Based on Matrix specification and common Discord-style mappings
 */
export const PowerLevels = {
  /** Default user level */
  USER: 0,
  /** Moderator level - can kick users, delete messages */
  MODERATOR: 50, 
  /** Admin level - full room control */
  ADMIN: 100,
  /** Actions that require specific power levels */
  ACTIONS: {
    KICK: 50,
    BAN: 50,
    MUTE: 25,
    DELETE_MESSAGE: 25,
    CHANGE_POWER_LEVELS: 100,
    CHANGE_ROOM_STATE: 50,
  }
} as const;

/**
 * Moderation Service for Matrix rooms
 */
export class MatrixModerationService {
  constructor(private client: MatrixClient) {}

  /**
   * Check if a user has permission to perform a moderation action
   * @param roomId The room to check permissions in
   * @param userId The user attempting the action
   * @param action The action they want to perform
   * @param targetUserId The user being moderated (for power level comparison)
   */
  async hasPermission(
    roomId: string, 
    userId: string, 
    action: keyof typeof PowerLevels.ACTIONS,
    targetUserId?: string
  ): Promise<boolean> {
    try {
      const room = this.client.getRoom(roomId);
      if (!room) {
        console.error(`Room ${roomId} not found`);
        return false;
      }

      // Get user's power level in the room
      const userPowerLevel = room.getMember(userId)?.powerLevel ?? PowerLevels.USER;
      const requiredLevel = PowerLevels.ACTIONS[action];

      // User must have at least the required power level
      if (userPowerLevel < requiredLevel) {
        return false;
      }

      // For moderation actions, user cannot moderate someone with equal/higher power
      if (targetUserId) {
        const targetPowerLevel = room.getMember(targetUserId)?.powerLevel ?? PowerLevels.USER;
        if (targetPowerLevel >= userPowerLevel) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error("Error checking permissions:", error);
      return false;
    }
  }

  /**
   * Get a user's role based on their power level
   * @param roomId The room to check
   * @param userId The user to check
   */
  async getUserRole(roomId: string, userId: string): Promise<'admin' | 'moderator' | 'member'> {
    try {
      const room = this.client.getRoom(roomId);
      if (!room) return 'member';

      const powerLevel = room.getMember(userId)?.powerLevel ?? PowerLevels.USER;
      
      if (powerLevel >= PowerLevels.ADMIN) return 'admin';
      if (powerLevel >= PowerLevels.MODERATOR) return 'moderator';
      return 'member';
    } catch (error) {
      console.error("Error getting user role:", error);
      return 'member';
    }
  }

  /**
   * Kick a user from a room
   * @param roomId The room to kick the user from
   * @param userId The user performing the kick (for permission check)
   * @param targetUserId The user to kick
   * @param options Kick options including reason
   */
  async kickUser(
    roomId: string,
    userId: string,
    targetUserId: string,
    options: KickUserOptions = {}
  ): Promise<ModerationResult> {
    try {
      // Check permissions
      const hasPermission = await this.hasPermission(roomId, userId, 'KICK', targetUserId);
      if (!hasPermission) {
        return {
          success: false,
          error: "You don't have permission to kick this user"
        };
      }

      // Cannot kick yourself
      if (userId === targetUserId) {
        return {
          success: false,
          error: "You cannot kick yourself"
        };
      }

      // Perform the kick using Matrix API
      await this.client.kick(roomId, targetUserId, options.reason || "Kicked by moderator");

      // Log the moderation action
      console.log(`User ${userId} kicked ${targetUserId} from ${roomId}. Reason: ${options.reason || 'No reason provided'}`);

      return { success: true };
    } catch (error: any) {
      console.error("Error kicking user:", error);
      
      // Handle specific Matrix errors
      let errorMessage = "Failed to kick user";
      if (error.errcode === 'M_FORBIDDEN') {
        errorMessage = "You don't have permission to kick this user";
      } else if (error.errcode === 'M_NOT_FOUND') {
        errorMessage = "User not found in this room";
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Ban a user from a room
   * @param roomId The room to ban the user from
   * @param userId The user performing the ban (for permission check)
   * @param targetUserId The user to ban
   * @param options Ban options including reason and duration
   */
  async banUser(
    roomId: string,
    userId: string,
    targetUserId: string,
    options: BanUserOptions = {}
  ): Promise<ModerationResult> {
    try {
      // Check permissions
      const hasPermission = await this.hasPermission(roomId, userId, 'BAN', targetUserId);
      if (!hasPermission) {
        return {
          success: false,
          error: "You don't have permission to ban this user"
        };
      }

      // Cannot ban yourself
      if (userId === targetUserId) {
        return {
          success: false,
          error: "You cannot ban yourself"
        };
      }

      // Perform the ban using Matrix API
      await this.client.ban(roomId, targetUserId, options.reason || "Banned by moderator");

      // Log the moderation action
      console.log(`User ${userId} banned ${targetUserId} from ${roomId}. Reason: ${options.reason || 'No reason provided'}`);

      // Handle timed bans if duration is specified
      if (options.duration && options.duration > 0) {
        await this.storeBanExpiry(roomId, targetUserId, userId, options.duration, options.reason);
        this.scheduleUnban(roomId, targetUserId, options.duration);
        console.log(`Scheduled unban for ${targetUserId} in ${options.duration}ms`);
      }

      return { success: true };
    } catch (error: any) {
      console.error("Error banning user:", error);
      
      // Handle specific Matrix errors
      let errorMessage = "Failed to ban user";
      if (error.errcode === 'M_FORBIDDEN') {
        errorMessage = "You don't have permission to ban this user";
      } else if (error.errcode === 'M_NOT_FOUND') {
        errorMessage = "User not found in this room";
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Unban a user from a room
   * @param roomId The room to unban the user from
   * @param userId The user performing the unban (for permission check)
   * @param targetUserId The user to unban
   */
  async unbanUser(
    roomId: string,
    userId: string,
    targetUserId: string
  ): Promise<ModerationResult> {
    try {
      // Check permissions
      const hasPermission = await this.hasPermission(roomId, userId, 'BAN');
      if (!hasPermission) {
        return {
          success: false,
          error: "You don't have permission to unban users"
        };
      }

      // Perform the unban using Matrix API
      await this.client.unban(roomId, targetUserId);

      // Log the moderation action
      console.log(`User ${userId} unbanned ${targetUserId} from ${roomId}`);

      return { success: true };
    } catch (error: any) {
      console.error("Error unbanning user:", error);
      
      let errorMessage = "Failed to unban user";
      if (error.errcode === 'M_FORBIDDEN') {
        errorMessage = "You don't have permission to unban users";
      } else if (error.errcode === 'M_NOT_FOUND') {
        errorMessage = "User not found";
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Mute a user in a room by setting their power level to restrict messaging
   * @param roomId The room to mute the user in
   * @param userId The user performing the mute (for permission check)
   * @param targetUserId The user to mute
   * @param options Mute options including reason and duration
   */
  async muteUser(
    roomId: string,
    userId: string,
    targetUserId: string,
    options: MuteUserOptions = {}
  ): Promise<ModerationResult> {
    try {
      // Check permissions
      const hasPermission = await this.hasPermission(roomId, userId, 'MUTE', targetUserId);
      if (!hasPermission) {
        return {
          success: false,
          error: "You don't have permission to mute this user"
        };
      }

      // Cannot mute yourself
      if (userId === targetUserId) {
        return {
          success: false,
          error: "You cannot mute yourself"
        };
      }

      const room = this.client.getRoom(roomId);
      if (!room) {
        return {
          success: false,
          error: "Room not found"
        };
      }

      // Store original power level for potential unmuting
      const targetMember = room.getMember(targetUserId);
      const originalPowerLevel = targetMember?.powerLevel ?? PowerLevels.USER;

      // Set power level to -1 to mute (below minimum required for messaging)
      await this.client.setPowerLevel(roomId, targetUserId, -1);

      // Store mute information in room state for tracking and scheduled unmute
      const muteData = {
        mutedBy: userId,
        mutedAt: new Date().toISOString(),
        reason: options.reason || "Muted by moderator",
        duration: options.duration || 0, // 0 = permanent
        originalPowerLevel,
        expiresAt: options.duration && options.duration > 0 ? 
          new Date(Date.now() + options.duration).toISOString() : null
      };

      await this.client.sendStateEvent(
        roomId,
        'org.haos.moderation.mute' as any,
        muteData,
        targetUserId
      );

      // Log the moderation action
      const logEntry = {
        action: 'mute_user',
        moderatorId: userId,
        targetUserId,
        eventId: '', // Not applicable for muting
        roomId,
        reason: options.reason || 'Muted by moderator',
        timestamp: new Date().toISOString(),
        metadata: {
          duration: options.duration || 0,
          originalPowerLevel
        }
      };
      
      await this.logModerationAction(logEntry);

      console.log(`User ${userId} muted ${targetUserId} in ${roomId}. Reason: ${options.reason || 'No reason provided'}`);

      // Schedule automatic unmute if duration is specified
      if (options.duration && options.duration > 0) {
        this.scheduleUnmute(roomId, targetUserId, options.duration);
      }

      return { success: true };
    } catch (error: any) {
      console.error("Error muting user:", error);
      
      let errorMessage = "Failed to mute user";
      if (error.errcode === 'M_FORBIDDEN') {
        errorMessage = "You don't have permission to mute this user";
      } else if (error.errcode === 'M_NOT_FOUND') {
        errorMessage = "User not found in this room";
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Unmute a user in a room by restoring their original power level
   * @param roomId The room to unmute the user in
   * @param userId The user performing the unmute (for permission check)
   * @param targetUserId The user to unmute
   */
  async unmuteUser(
    roomId: string,
    userId: string,
    targetUserId: string
  ): Promise<ModerationResult> {
    try {
      // Check permissions
      const hasPermission = await this.hasPermission(roomId, userId, 'MUTE');
      if (!hasPermission) {
        return {
          success: false,
          error: "You don't have permission to unmute users"
        };
      }

      const room = this.client.getRoom(roomId);
      if (!room) {
        return {
          success: false,
          error: "Room not found"
        };
      }

      // Get mute information from room state
      const muteState = room.currentState.getStateEvents('org.haos.moderation.mute' as any, targetUserId);
      
      let originalPowerLevel = PowerLevels.USER; // Default fallback
      if (muteState) {
        const muteData = muteState.getContent();
        originalPowerLevel = muteData.originalPowerLevel ?? PowerLevels.USER;
      }

      // Restore original power level
      await this.client.setPowerLevel(roomId, targetUserId, originalPowerLevel);

      // Remove mute state
      await this.client.sendStateEvent(
        roomId,
        'org.haos.moderation.mute' as any,
        {},
        targetUserId
      );

      // Log the moderation action
      const logEntry = {
        action: 'unmute_user',
        moderatorId: userId,
        targetUserId,
        eventId: '', // Not applicable for unmuting
        roomId,
        reason: `Unmuted by ${userId}`,
        timestamp: new Date().toISOString(),
        metadata: {
          restoredPowerLevel: originalPowerLevel
        }
      };
      
      await this.logModerationAction(logEntry);

      console.log(`User ${userId} unmuted ${targetUserId} in ${roomId}`);

      return { success: true };
    } catch (error: any) {
      console.error("Error unmuting user:", error);
      
      let errorMessage = "Failed to unmute user";
      if (error.errcode === 'M_FORBIDDEN') {
        errorMessage = "You don't have permission to unmute users";
      } else if (error.errcode === 'M_NOT_FOUND') {
        errorMessage = "User not found";
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Check if a user is currently muted in a room
   * @param roomId The room to check
   * @param targetUserId The user to check mute status for
   */
  async isUserMuted(roomId: string, targetUserId: string): Promise<{
    isMuted: boolean;
    muteInfo?: {
      mutedBy: string;
      mutedAt: string;
      reason: string;
      duration: number;
      expiresAt?: string;
      originalPowerLevel: number;
    };
  }> {
    try {
      const room = this.client.getRoom(roomId);
      if (!room) {
        return { isMuted: false };
      }

      // Check current power level
      const targetMember = room.getMember(targetUserId);
      const currentPowerLevel = targetMember?.powerLevel ?? PowerLevels.USER;
      
      // If power level is -1, user is muted
      const isMuted = currentPowerLevel === -1;
      
      if (!isMuted) {
        return { isMuted: false };
      }

      // Get mute information from state
      const muteState = room.currentState.getStateEvents('org.haos.moderation.mute' as any, targetUserId);
      
      if (muteState) {
        const muteData = muteState.getContent();
        return {
          isMuted: true,
          muteInfo: {
            mutedBy: muteData.mutedBy,
            mutedAt: muteData.mutedAt,
            reason: muteData.reason,
            duration: muteData.duration,
            expiresAt: muteData.expiresAt,
            originalPowerLevel: muteData.originalPowerLevel
          }
        };
      }

      // User is muted but no state info (edge case)
      return { isMuted: true };
    } catch (error) {
      console.error("Error checking mute status:", error);
      return { isMuted: false };
    }
  }

  /**
   * Get all muted users in a room
   * @param roomId The room to get muted users from
   */
  async getMutedUsers(roomId: string): Promise<Array<{
    userId: string;
    mutedBy: string;
    mutedAt: string;
    reason: string;
    duration: number;
    expiresAt?: string;
    originalPowerLevel: number;
  }>> {
    try {
      const room = this.client.getRoom(roomId);
      if (!room) {
        return [];
      }

      const mutedUsers: Array<{
        userId: string;
        mutedBy: string;
        mutedAt: string;
        reason: string;
        duration: number;
        expiresAt?: string;
        originalPowerLevel: number;
      }> = [];

      // Get all mute state events
      const muteStates = room.currentState.events.get('org.haos.moderation.mute' as any);
      if (!muteStates) {
        return [];
      }

      muteStates.forEach((event, userId) => {
        const content = event.getContent();
        if (content.mutedBy) {
          mutedUsers.push({
            userId,
            mutedBy: content.mutedBy,
            mutedAt: content.mutedAt,
            reason: content.reason,
            duration: content.duration,
            expiresAt: content.expiresAt,
            originalPowerLevel: content.originalPowerLevel
          });
        }
      });

      return mutedUsers.sort((a, b) => new Date(b.mutedAt).getTime() - new Date(a.mutedAt).getTime());
    } catch (error) {
      console.error("Error getting muted users:", error);
      return [];
    }
  }

  /**
   * Store ban expiry information in room state
   * @param roomId The room where user is banned
   * @param targetUserId The banned user
   * @param bannedBy The user who issued the ban
   * @param duration Duration in milliseconds
   * @param reason Ban reason
   */
  private async storeBanExpiry(
    roomId: string, 
    targetUserId: string, 
    bannedBy: string,
    duration: number,
    reason?: string
  ): Promise<void> {
    try {
      const banData = {
        bannedBy,
        bannedAt: new Date().toISOString(),
        reason: reason || "Banned by moderator",
        duration,
        expiresAt: new Date(Date.now() + duration).toISOString()
      };

      await this.client.sendStateEvent(
        roomId,
        'org.haos.moderation.ban' as any,
        banData,
        targetUserId
      );

      console.log(`Stored ban expiry for ${targetUserId} in ${roomId}, expires at ${banData.expiresAt}`);
    } catch (error) {
      console.error("Failed to store ban expiry:", error);
      // Don't fail the ban operation if we can't store the expiry
    }
  }

  /**
   * Schedule automatic unban for a user (simple timer-based implementation)
   * @param roomId The room where user is banned
   * @param targetUserId The banned user
   * @param duration Duration in milliseconds
   */
  private scheduleUnban(roomId: string, targetUserId: string, duration: number): void {
    // In a production system, this should use a persistent job queue
    // For now, we'll use a simple setTimeout (won't survive page reloads)
    setTimeout(async () => {
      try {
        // Check if user is still banned before unbanning
        const room = this.client.getRoom(roomId);
        if (!room) {
          console.error(`Room ${roomId} not found for scheduled unban`);
          return;
        }

        const member = room.getMember(targetUserId);
        if (member?.membership === 'ban') {
          // Use a system user ID for automatic unbans
          const systemUserId = this.client.getUserId() || '@system:haos';
          const result = await this.unbanUser(roomId, systemUserId, targetUserId);
          
          if (result.success) {
            // Remove ban state after successful unban
            await this.client.sendStateEvent(
              roomId,
              'org.haos.moderation.ban' as any,
              {},
              targetUserId
            );
            console.log(`Automatically unbanned ${targetUserId} in ${roomId} after ${duration}ms`);
          } else {
            console.error(`Failed to auto-unban ${targetUserId}:`, result.error);
          }
        } else {
          console.log(`User ${targetUserId} is no longer banned in ${roomId}, skipping auto-unban`);
        }
      } catch (error) {
        console.error(`Failed to auto-unban ${targetUserId} in ${roomId}:`, error);
      }
    }, duration);
  }

  /**
   * Get ban information for a specific user
   * @param roomId The room to check
   * @param targetUserId The user to check ban status for
   */
  async getBanInfo(roomId: string, targetUserId: string): Promise<{
    isBanned: boolean;
    banInfo?: {
      bannedBy: string;
      bannedAt: string;
      reason: string;
      duration: number;
      expiresAt?: string;
      isExpired?: boolean;
    };
  }> {
    try {
      const room = this.client.getRoom(roomId);
      if (!room) {
        return { isBanned: false };
      }

      // Check current membership status
      const member = room.getMember(targetUserId);
      const isBanned = member?.membership === 'ban';
      
      if (!isBanned) {
        return { isBanned: false };
      }

      // Get ban information from state
      const banState = room.currentState.getStateEvents('org.haos.moderation.ban' as any, targetUserId);
      
      if (banState) {
        const banData = banState.getContent();
        const isExpired = banData.expiresAt ? new Date(banData.expiresAt) <= new Date() : false;
        
        return {
          isBanned: true,
          banInfo: {
            bannedBy: banData.bannedBy,
            bannedAt: banData.bannedAt,
            reason: banData.reason,
            duration: banData.duration,
            expiresAt: banData.expiresAt,
            isExpired
          }
        };
      }

      // User is banned but no state info (permanent ban or legacy)
      return { isBanned: true };
    } catch (error) {
      console.error("Error checking ban status:", error);
      return { isBanned: false };
    }
  }

  /**
   * Get all banned users in a room with their ban information
   * @param roomId The room to get banned users from
   */
  async getBannedUsers(roomId: string): Promise<Array<{
    userId: string;
    displayName: string;
    avatarUrl?: string;
    bannedBy?: string;
    bannedAt?: string;
    reason?: string;
    duration?: number;
    expiresAt?: string;
    isExpired?: boolean;
  }>> {
    try {
      const room = this.client.getRoom(roomId);
      if (!room) {
        return [];
      }

      const bannedUsers: Array<{
        userId: string;
        displayName: string;
        avatarUrl?: string;
        bannedBy?: string;
        bannedAt?: string;
        reason?: string;
        duration?: number;
        expiresAt?: string;
        isExpired?: boolean;
      }> = [];

      // Get all members and filter for banned ones
      const allMembers = room.getMembers();
      
      for (const member of allMembers) {
        if (member.membership !== 'ban') continue;

        // Get ban information from state
        const banState = room.currentState.getStateEvents('org.haos.moderation.ban' as any, member.userId);
        
        let banInfo = {};
        if (banState) {
          const banData = banState.getContent();
          const isExpired = banData.expiresAt ? new Date(banData.expiresAt) <= new Date() : false;
          
          banInfo = {
            bannedBy: banData.bannedBy,
            bannedAt: banData.bannedAt,
            reason: banData.reason,
            duration: banData.duration,
            expiresAt: banData.expiresAt,
            isExpired
          };
        } else {
          // Try to get ban reason from member events (fallback)
          const banEvent = room.getLiveTimeline().getEvents().find(
            event => event.getType() === "m.room.member" && 
            event.getStateKey() === member.userId &&
            event.getContent().membership === "ban"
          );

          if (banEvent) {
            banInfo = {
              bannedAt: new Date(banEvent.getTs()).toISOString(),
              bannedBy: banEvent.getSender(),
              reason: banEvent.getContent().reason
            };
          }
        }

        bannedUsers.push({
          userId: member.userId,
          displayName: member.name || member.userId,
          avatarUrl: member.getAvatarUrl(this.client.baseUrl, 64, 64, "crop", false, true) || undefined,
          ...banInfo
        });
      }

      return bannedUsers.sort((a, b) => {
        const dateA = a.bannedAt ? new Date(a.bannedAt).getTime() : 0;
        const dateB = b.bannedAt ? new Date(b.bannedAt).getTime() : 0;
        return dateB - dateA; // Newest first
      });
    } catch (error) {
      console.error("Error getting banned users:", error);
      return [];
    }
  }

  /**
   * Check for expired bans and automatically unban them
   * This should be called periodically (e.g., on app load or timer)
   * @param roomId The room to check for expired bans
   */
  async checkExpiredBans(roomId: string): Promise<{
    checkedCount: number;
    unbannedCount: number;
    errors: Array<{ userId: string; error: string }>;
  }> {
    const result = {
      checkedCount: 0,
      unbannedCount: 0,
      errors: [] as Array<{ userId: string; error: string }>
    };

    try {
      const room = this.client.getRoom(roomId);
      if (!room) {
        throw new Error(`Room ${roomId} not found`);
      }

      // Get all ban state events
      const banStates = room.currentState.events.get('org.haos.moderation.ban' as any);
      if (!banStates) {
        return result;
      }

      const systemUserId = this.client.getUserId() || '@system:haos';
      const now = new Date();

      // Check each ban for expiry
      for (const [userId, banState] of Array.from(banStates.entries())) {
        result.checkedCount++;
        
        const banData = banState.getContent();
        if (!banData.expiresAt) {
          continue; // Permanent ban
        }

        const expiresAt = new Date(banData.expiresAt);
        if (expiresAt <= now) {
          // Ban has expired, unban the user
          try {
            const unbanResult = await this.unbanUser(roomId, systemUserId, userId);
            if (unbanResult.success) {
              // Remove ban state
              await this.client.sendStateEvent(
                roomId,
                'org.haos.moderation.ban' as any,
                {},
                userId
              );
              result.unbannedCount++;
              console.log(`Auto-unbanned expired ban: ${userId} in ${roomId}`);
            } else {
              result.errors.push({ userId, error: unbanResult.error || 'Unknown error' });
            }
          } catch (error: any) {
            result.errors.push({ userId, error: error.message || 'Failed to unban' });
          }
        }
      }

      if (result.unbannedCount > 0) {
        console.log(`Processed expired bans in ${roomId}: ${result.unbannedCount}/${result.checkedCount} unbanned`);
      }

      return result;
    } catch (error) {
      console.error("Error checking expired bans:", error);
      throw error;
    }
  }

  /**
   * Schedule automatic unmute for a user (simple timer-based implementation)
   * @param roomId The room where user is muted
   * @param targetUserId The muted user
   * @param duration Duration in milliseconds
   */
  private scheduleUnmute(roomId: string, targetUserId: string, duration: number): void {
    // In a production system, this should use a persistent job queue
    // For now, we'll use a simple setTimeout (won't survive page reloads)
    setTimeout(async () => {
      try {
        // Check if user is still muted before unmuting
        const muteStatus = await this.isUserMuted(roomId, targetUserId);
        if (muteStatus.isMuted) {
          // Use a system user ID for automatic unmutes
          const systemUserId = this.client.getUserId() || '@system:haos';
          await this.unmuteUser(roomId, systemUserId, targetUserId);
          console.log(`Automatically unmuted ${targetUserId} in ${roomId} after ${duration}ms`);
        }
      } catch (error) {
        console.error(`Failed to auto-unmute ${targetUserId} in ${roomId}:`, error);
      }
    }, duration);
  }

  /**
   * Get list of room members with their power levels and roles
   * @param roomId The room to get members from
   */
  async getRoomMembers(roomId: string): Promise<Array<{
    userId: string;
    displayName: string;
    avatarUrl?: string;
    powerLevel: number;
    role: 'admin' | 'moderator' | 'member';
    membership: string;
  }>> {
    try {
      const room = this.client.getRoom(roomId);
      if (!room) {
        throw new Error(`Room ${roomId} not found`);
      }

      const members = room.getJoinedMembers();
      const membersList = [];

      for (const member of members) {
        const powerLevel = member.powerLevel ?? PowerLevels.USER;
        let role: 'admin' | 'moderator' | 'member' = 'member';
        
        if (powerLevel >= PowerLevels.ADMIN) role = 'admin';
        else if (powerLevel >= PowerLevels.MODERATOR) role = 'moderator';

        membersList.push({
          userId: member.userId,
          displayName: member.name,
          avatarUrl: member.getAvatarUrl(this.client.baseUrl, 64, 64, "crop", false, true) || undefined,
          powerLevel,
          role,
          membership: member.membership || "join"
        });
      }

      // Sort by power level (highest first), then by name
      membersList.sort((a, b) => {
        if (b.powerLevel !== a.powerLevel) {
          return b.powerLevel - a.powerLevel;
        }
        return a.displayName.localeCompare(b.displayName);
      });

      return membersList;
    } catch (error) {
      console.error("Error getting room members:", error);
      return [];
    }
  }

  /**
   * Delete a single message by redacting it
   * @param roomId The room containing the message
   * @param eventId The message event ID to delete
   * @param userId The user performing the deletion (for permission check)
   * @param reason Optional reason for deletion
   */
  async deleteMessage(
    roomId: string,
    eventId: string,
    userId: string,
    reason?: string
  ): Promise<ModerationResult> {
    try {
      const room = this.client.getRoom(roomId);
      if (!room) {
        return {
          success: false,
          error: "Room not found"
        };
      }

      // Get the original message event to check permissions
      const event = room.findEventById(eventId);
      if (!event) {
        return {
          success: false,
          error: "Message not found"
        };
      }

      const messageSender = event.getSender();
      const isOwnMessage = messageSender === userId;

      // Check permissions - can delete own messages or need moderation rights
      if (!isOwnMessage) {
        const hasPermission = await this.hasPermission(roomId, userId, 'DELETE_MESSAGE');
        if (!hasPermission) {
          return {
            success: false,
            error: "You don't have permission to delete this message"
          };
        }
      }

      // Perform the redaction (deletion)
      const redactionReason = reason || (isOwnMessage ? "Message deleted by author" : "Message deleted by moderator");
      await this.client.redactEvent(roomId, eventId, undefined, {
        reason: redactionReason
      });

      // Log the moderation action
      const logEntry = {
        action: 'delete_message',
        moderatorId: userId,
        targetUserId: messageSender!,
        eventId,
        roomId,
        reason: redactionReason,
        timestamp: new Date().toISOString(),
        isOwnMessage
      };
      
      await this.logModerationAction(logEntry);
      
      console.log(`Message ${eventId} deleted by ${userId}. Reason: ${redactionReason}`);

      return { success: true };
    } catch (error: any) {
      console.error("Error deleting message:", error);
      
      let errorMessage = "Failed to delete message";
      if (error.errcode === 'M_FORBIDDEN') {
        errorMessage = "You don't have permission to delete this message";
      } else if (error.errcode === 'M_NOT_FOUND') {
        errorMessage = "Message not found";
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Delete multiple messages in bulk
   * @param roomId The room containing the messages
   * @param eventIds Array of message event IDs to delete
   * @param userId The user performing the bulk deletion (for permission check)
   * @param reason Optional reason for bulk deletion
   */
  async bulkDeleteMessages(
    roomId: string,
    eventIds: string[],
    userId: string,
    reason?: string
  ): Promise<{
    success: boolean;
    deletedCount: number;
    failedCount: number;
    errors: Array<{ eventId: string; error: string }>;
  }> {
    const results = {
      success: true,
      deletedCount: 0,
      failedCount: 0,
      errors: [] as Array<{ eventId: string; error: string }>
    };

    // Check bulk moderation permission first
    const hasPermission = await this.hasPermission(roomId, userId, 'DELETE_MESSAGE');
    if (!hasPermission) {
      return {
        success: false,
        deletedCount: 0,
        failedCount: eventIds.length,
        errors: eventIds.map(eventId => ({
          eventId,
          error: "You don't have permission to perform bulk message deletion"
        }))
      };
    }

    const bulkReason = reason || "Bulk message deletion by moderator";

    // Process deletions in batches to avoid overwhelming the server
    const batchSize = 10;
    for (let i = 0; i < eventIds.length; i += batchSize) {
      const batch = eventIds.slice(i, i + batchSize);
      
      // Process batch with slight delay to be respectful to the server
      const batchPromises = batch.map(async (eventId) => {
        try {
          const result = await this.deleteMessage(roomId, eventId, userId, bulkReason);
          if (result.success) {
            results.deletedCount++;
          } else {
            results.failedCount++;
            results.errors.push({ eventId, error: result.error || "Unknown error" });
          }
        } catch (error: any) {
          results.failedCount++;
          results.errors.push({ 
            eventId, 
            error: error.message || "Failed to delete message" 
          });
        }
      });

      await Promise.all(batchPromises);
      
      // Small delay between batches
      if (i + batchSize < eventIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Log bulk operation
    const logEntry = {
      action: 'bulk_delete_messages',
      moderatorId: userId,
      targetUserId: '', // Multiple targets in bulk operation
      eventId: '', // Multiple events
      roomId,
      reason: bulkReason,
      timestamp: new Date().toISOString(),
      metadata: {
        totalMessages: eventIds.length,
        deletedCount: results.deletedCount,
        failedCount: results.failedCount
      }
    };
    
    await this.logModerationAction(logEntry);

    console.log(`Bulk deletion completed: ${results.deletedCount}/${eventIds.length} messages deleted by ${userId}`);

    if (results.failedCount > 0) {
      results.success = false;
    }

    return results;
  }

  /**
   * Log a moderation action for audit trail
   * @param logEntry The moderation action details
   */
  private async logModerationAction(logEntry: {
    action: string;
    moderatorId: string;
    targetUserId: string;
    eventId: string;
    roomId: string;
    reason: string;
    timestamp: string;
    isOwnMessage?: boolean;
    metadata?: any;
  }): Promise<void> {
    try {
      // Store moderation logs in room state or send as special message type
      // For now, we'll send a state event to maintain audit trail
      
      // Create a unique state key based on timestamp and action
      const stateKey = `${logEntry.timestamp}_${logEntry.action}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Use type assertion for custom state event type
      await this.client.sendStateEvent(
        logEntry.roomId,
        'org.haos.moderation.log' as any,
        {
          ...logEntry,
          version: '1.0'
        },
        stateKey
      );
    } catch (error) {
      console.error("Failed to log moderation action:", error);
      // Don't fail the main operation if logging fails
    }
  }

  /**
   * Get moderation logs for a room
   * @param roomId The room to get moderation logs for
   * @param limit Maximum number of logs to return (default 50)
   */
  async getModerationLogs(
    roomId: string, 
    limit: number = 50
  ): Promise<Array<{
    action: string;
    moderatorId: string;
    targetUserId: string;
    eventId: string;
    roomId: string;
    reason: string;
    timestamp: string;
    isOwnMessage?: boolean;
    metadata?: any;
  }>> {
    try {
      const room = this.client.getRoom(roomId);
      if (!room) {
        throw new Error(`Room ${roomId} not found`);
      }

      // Get all moderation log state events
      const stateEvents = room.currentState.events.get('org.haos.moderation.log' as any);
      if (!stateEvents) {
        return [];
      }

      const logs: Array<{
        action: string;
        moderatorId: string;
        targetUserId: string;
        eventId: string;
        roomId: string;
        reason: string;
        timestamp: string;
        isOwnMessage?: boolean;
        metadata?: any;
      }> = [];
      
      // stateEvents is a Map<string, MatrixEvent>
      stateEvents.forEach((event, stateKey) => {
        const content = event.getContent() as any;
        if (content.action && content.timestamp) {
          logs.push(content as {
            action: string;
            moderatorId: string;
            targetUserId: string;
            eventId: string;
            roomId: string;
            reason: string;
            timestamp: string;
            isOwnMessage?: boolean;
            metadata?: any;
          });
        }
      });

      // Sort by timestamp (newest first) and limit
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return logs.slice(0, limit);
    } catch (error) {
      console.error("Error getting moderation logs:", error);
      return [];
    }
  }

  /**
   * Check if a user can delete a specific message
   * @param roomId The room containing the message  
   * @param userId The user wanting to delete
   * @param eventId The message event ID
   */
  async canDeleteMessage(
    roomId: string,
    userId: string,
    eventId: string
  ): Promise<{ canDelete: boolean; reason: string }> {
    try {
      const room = this.client.getRoom(roomId);
      if (!room) {
        return { canDelete: false, reason: "Room not found" };
      }

      const event = room.findEventById(eventId);
      if (!event) {
        return { canDelete: false, reason: "Message not found" };
      }

      const messageSender = event.getSender();
      const isOwnMessage = messageSender === userId;

      // Can always delete own messages (unless message is too old - could add that check)
      if (isOwnMessage) {
        return { canDelete: true, reason: "Own message" };
      }

      // Check moderation permissions for others' messages
      const hasPermission = await this.hasPermission(roomId, userId, 'DELETE_MESSAGE');
      if (hasPermission) {
        return { canDelete: true, reason: "Moderator permissions" };
      }

      return { canDelete: false, reason: "Insufficient permissions" };
    } catch (error) {
      console.error("Error checking delete permissions:", error);
      return { canDelete: false, reason: "Error checking permissions" };
    }
  }
}

/**
 * Create a moderation service instance
 * @param client Matrix client instance
 */
export function createModerationService(client: MatrixClient): MatrixModerationService {
  return new MatrixModerationService(client);
}

/**
 * Utility function to check if a user is a moderator or admin
 * @param roomId The room to check
 * @param userId The user to check
 * @param client Matrix client
 */
export async function canModerate(
  roomId: string, 
  userId: string, 
  client: MatrixClient
): Promise<boolean> {
  const service = createModerationService(client);
  return service.hasPermission(roomId, userId, 'KICK');
}