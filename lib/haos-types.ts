/**
 * HAOS Type Definitions
 * 
 * These types mirror the old Prisma types for backward compatibility
 * but work with Matrix data instead.
 */

// =============================================================================
// Enums
// =============================================================================

export const ChannelType = {
  TEXT: "TEXT",
  AUDIO: "AUDIO", 
  VIDEO: "VIDEO",
} as const;

export type ChannelType = typeof ChannelType[keyof typeof ChannelType];

export const MemberRole = {
  ADMIN: "ADMIN",
  MODERATOR: "MODERATOR",
  GUEST: "GUEST",
} as const;

export type MemberRole = typeof MemberRole[keyof typeof MemberRole];

// =============================================================================
// Core Types
// =============================================================================

export interface Profile {
  id: string;
  userId: string;
  name: string;
  imageUrl: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Server {
  id: string;
  name: string;
  imageUrl: string;
  inviteCode: string;
  profileId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  profileId: string;
  serverId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Member {
  id: string;
  role: MemberRole;
  profileId: string;
  serverId: string;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// Extended Types (with relations)
// =============================================================================

export interface MemberWithProfile extends Member {
  profile: Profile;
}

export interface ServerWithMembersWithProfiles extends Server {
  members: MemberWithProfile[];
}

export interface ServerWithChannelsAndMembers extends Server {
  channels: Channel[];
  members: MemberWithProfile[];
}

// =============================================================================
// Matrix-specific types
// =============================================================================

export interface MatrixUser {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface MatrixRoom {
  roomId: string;
  name?: string;
  topic?: string;
  avatarUrl?: string;
  roomType?: string;
}

export interface MatrixSpace extends MatrixRoom {
  children: MatrixRoom[];
}

// =============================================================================
// Helper functions
// =============================================================================

/**
 * Convert Matrix user to Profile
 */
export function matrixUserToProfile(user: MatrixUser): Profile {
  return {
    id: user.userId,
    userId: user.userId,
    name: user.displayName || user.userId.split(':')[0].slice(1),
    imageUrl: user.avatarUrl || "",
    email: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Convert Matrix room to Server
 */
export function matrixSpaceToServer(space: MatrixSpace): Server {
  return {
    id: space.roomId,
    name: space.name || "Unknown Server",
    imageUrl: space.avatarUrl || "",
    inviteCode: "",
    profileId: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Convert Matrix room to Channel
 */
export function matrixRoomToChannel(room: MatrixRoom, serverId: string): Channel {
  return {
    id: room.roomId,
    name: room.name || "unnamed",
    type: "TEXT",
    profileId: "",
    serverId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
