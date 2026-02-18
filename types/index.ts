// Matrix-compatible type definitions to replace Prisma types

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
  members: Member[];
  channels: Channel[];
}

export interface Member {
  id: string;
  role: MemberRole;
  profileId: string;
  serverId: string;
  createdAt: Date;
  updatedAt: Date;
  profile: Profile;
}

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  profileId: string;
  serverId: string;
  createdAt: Date;
  updatedAt: Date;
  messages?: Message[];
}

export interface Message {
  id: string;
  content: string;
  fileUrl?: string | null;
  memberId: string;
  channelId: string;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  member: Member;
}

export interface DirectMessage {
  id: string;
  content: string;
  fileUrl?: string | null;
  memberId: string;
  conversationId: string;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  member: Member;
}

export interface Conversation {
  id: string;
  memberOneId: string;
  memberTwoId: string;
  memberOne: Member;
  memberTwo: Member;
  directMessages?: DirectMessage[];
}

export enum MemberRole {
  ADMIN = "ADMIN",
  MODERATOR = "MODERATOR",
  GUEST = "GUEST"
}

export enum ChannelType {
  TEXT = "TEXT",
  AUDIO = "AUDIO",
  VIDEO = "VIDEO"
}