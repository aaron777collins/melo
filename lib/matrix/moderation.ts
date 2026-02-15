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

      // TODO: Handle timed bans if duration is specified
      if (options.duration && options.duration > 0) {
        console.log(`Ban duration: ${options.duration}ms (timed bans not yet implemented)`);
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