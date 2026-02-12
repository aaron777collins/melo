import { create } from "zustand";
import { Channel, ChannelType, Server } from "@prisma/client";
import { MatrixSpace, SpaceChannel } from "@/lib/matrix/types/space";

export type ModalType =
  | "createServer"
  | "invite"
  | "editServer"
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
  | "deleteSpace";

interface ModalData {
  // Legacy Prisma types (for transition period)
  server?: Server;
  channel?: Channel;
  channelType?: ChannelType;
  // Matrix types
  space?: MatrixSpace;
  spaceChannel?: SpaceChannel;
  // Common
  apiUrl?: string;
  query?: Record<string, any>;
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
