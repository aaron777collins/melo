import { create } from "zustand";
import { Channel, ChannelType, Server, Member, Profile } from "@/lib/haos-types";
import { MatrixSpace, SpaceChannel, ChannelType as MatrixChannelType } from "@/lib/matrix/types/space";

export type ModalType =
  | "createServer"
  | "invite"
  | "editServer"
  | "serverSettings"
  | "members"
  | "createChannel"
  | "createCategory"
  | "leaveServer"
  | "deleteServer"
  | "deleteChannel"
  | "editChannel"
  | "messageFile"
  | "deleteMessage"
  | "userSettings"
  | "serverBoost"
  | "notificationSettings"
  | "editServerProfile"
  // Matrix Space modals
  | "createSpace"
  | "editSpace"
  | "leaveSpace"
  | "deleteSpace"
  // Server Discovery
  | "serverDiscovery"
  // Quick Switcher
  | "quickSwitcher"
  // Search
  | "search"
  // Pinned Messages
  | "pinnedMessages"
  // User Profile
  | "userProfile"
  // Threading
  | "threadView"
  | "reportMessage"
  | "emojiPicker"
  // GIF Picker
  | "gifPicker"
  // User moderation
  | "kickUser"
  | "banUser"
  | "muteUser"
  // Role Management
  | "createRole"
  | "memberRoleEditor"
  // Security Prompts
  | "securityPrompt"
  // Invite Management
  | "revokeInvite";

interface ModalData {
  // Legacy Prisma types (for transition period)
  server?: Server;
  channel?: Channel;
  channelType?: ChannelType;
  // Matrix types
  space?: MatrixSpace;
  spaceChannel?: SpaceChannel;
  /** Matrix channel type ('text' | 'voice' | 'video' | 'announcement') */
  matrixChannelType?: MatrixChannelType;
  // Matrix room (for chat header room settings)
  room?: any; // Room type from matrix-js-sdk
  // Common
  apiUrl?: string;
  query?: Record<string, any>;
  // Matrix message/file modals
  roomId?: string;
  onFileUploaded?: (mxcUrl: string, file: File) => void;
  // Channel creation
  /** Category ID for new channel placement */
  categoryId?: string;
  // User profile modal
  /** Target user ID for profile display */
  userId?: string;
  /** Optional space/server context for role display */
  spaceId?: string;
  // Thread functionality
  /** Original event ID that started the thread */
  originalEventId?: string;
  /** Thread ID (for existing threads) */
  threadId?: string;
  // Message reporting
  /** Event ID of message to report */
  eventId?: string;
  /** User ID of message sender */
  senderId?: string;
  // Emoji picker callback
  /** Callback when emoji is selected */
  onSelect?: (emoji: string) => void;
  // GIF picker callback
  /** Callback when GIF is selected */
  onGifSelect?: (gifUrl: string) => void;
  // Role creation
  /** Current user's power level (for role creation validation) */
  userPowerLevel?: number;
  // User moderation
  /** User to kick from server/room */
  targetUser?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  /** Server/space context for moderation action */
  serverId?: string;
  // Message deletion
  /** Current user's Matrix ID */
  currentUserId?: string;
  /** Whether the current user owns the message */
  isOwnMessage?: boolean;
  /** Whether the current user can moderate (delete others' messages) */
  canModerate?: boolean;
  // Member role editor
  /** Member to edit roles for */
  member?: Member & { profile: Profile };
  /** Callback after successful role assignment */
  onSuccess?: () => void;
  // Invite modal
  /** Pre-generated invite URL for sharing */
  inviteUrl?: string;
  // Security prompts
  /** Configuration for security prompt modal */
  securityPromptConfig?: import("@/components/modals/security-prompt-modal").SecurityPromptConfig;
  // Invite revocation
  /** Invite to revoke */
  inviteToRevoke?: import("@/lib/matrix/invites").InviteLink;
  /** Callback after successful revocation */
  onInviteRevoked?: () => void;
}

interface ModalStore {
  type: ModalType | null;
  data: ModalData;
  isOpen: boolean;
  onOpen: (type: ModalType, data?: ModalData) => void;
  onClose: () => void;
}

export const useModal = create<ModalStore>((set) => ({
  type: null,
  data: {},
  isOpen: false,
  onOpen: (type, data = {}) => set({ isOpen: true, type, data }),
  onClose: () => set({ isOpen: false, type: null })
}));
