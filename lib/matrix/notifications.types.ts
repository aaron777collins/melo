/**
 * Notification Types - Client-safe exports
 * 
 * This file contains only types and client-safe code.
 * Server-only functionality stays in notifications.ts
 */

// =============================================================================
// Types
// =============================================================================

export enum NotificationType {
  DirectMessage = "dm",
  Mention = "mention", 
  RoomMessage = "room_message",
  RoomInvite = "room_invite",
  ThreadReply = "thread_reply",
  KeywordHighlight = "keyword_highlight",
  Reaction = "reaction",
}

export interface NotificationSettings {
  enabled: boolean;
  directMessages: boolean;
  mentions: boolean;
  replies: boolean;
  reactions: boolean;
  threadReplies: boolean;
  roomInvites: boolean;
  allRoomMessages: boolean;
  keywords: string[];
  sound: boolean;
  desktop: boolean;
  duration: number;
  quietHours: {
    enabled: boolean;
    start: string; // "22:00"
    end: string;   // "08:00"
  };
}

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  actions?: NotificationAction[];
  customization?: {
    sound?: string;
    icon?: string;
    badge?: string;
    vibrate?: number[];
  };
}

export interface NotificationAction {
  id: string;
  title: string;
  icon?: string;
}

export interface NotificationData {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  timestamp: Date;
  read: boolean;
  roomId?: string;
  eventId?: string;
  senderId?: string;
  avatar?: string;
  actions?: NotificationAction[];
}

// =============================================================================
// Default Configuration
// =============================================================================

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  directMessages: true,
  mentions: true,
  replies: true,
  reactions: false,
  threadReplies: true,
  roomInvites: true,
  allRoomMessages: false,
  keywords: [],
  sound: true,
  desktop: true,
  duration: 5000,
  quietHours: {
    enabled: false,
    start: "22:00",
    end: "08:00"
  }
};

export const DEFAULT_TEMPLATES: NotificationTemplate[] = [
  {
    id: "dm_default",
    type: NotificationType.DirectMessage,
    title: "{sender}",
    body: "{message}",
    actions: [
      { id: "reply", title: "Reply", icon: "💬" },
      { id: "dismiss", title: "Dismiss" }
    ]
  },
  {
    id: "mention_default", 
    type: NotificationType.Mention,
    title: "{sender} in {room}",
    body: "{message}",
    actions: [
      { id: "view", title: "View", icon: "👀" },
      { id: "dismiss", title: "Dismiss" }
    ]
  },
  {
    id: "invite_default",
    type: NotificationType.RoomInvite,
    title: "Room invitation from {sender}",
    body: "You've been invited to {room}",
    actions: [
      { id: "accept", title: "Accept", icon: "✅" },
      { id: "decline", title: "Decline", icon: "❌" }
    ]
  }
];

// =============================================================================
// Client-safe Utility Functions  
// =============================================================================

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return "denied";
  return Notification.permission;
}

export function areNotificationsPermitted(): boolean {
  return getNotificationPermission() === "granted";
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  
  const permission = await Notification.requestPermission();
  return permission === "granted";
}
