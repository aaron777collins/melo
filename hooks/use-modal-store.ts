import { create } from "zustand";
import { Channel, ChannelType, Server } from "@prisma/client";
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
  // Quick Switcher
  | "quickSwitcher";

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
  // Common
  apiUrl?: string;
  query?: Record<string, any>;
  // Matrix message/file modals
  roomId?: string;
  onFileUploaded?: (mxcUrl: string, file: File) => void;
  // Channel creation
  /** Category ID for new channel placement */
  categoryId?: string;
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
