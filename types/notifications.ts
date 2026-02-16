export interface NotificationCounts {
  totalUnread: number;
  mentionsUnread: number;
  unreadMessages: number;
}

export interface UnreadCounts {
  servers: { [roomId: string]: NotificationCounts };
  channels: { [roomId: string]: NotificationCounts };
  directMessages: { [roomId: string]: NotificationCounts };
  totalUnread: number;
}

export interface NotificationBadgeProps {
  count?: number;
  type?: 'default' | 'mention' | 'highlight';
  className?: string;
}

export enum NotificationType {
  DEFAULT = 'default',
  MENTION = 'mention',
  HIGHLIGHT = 'highlight'
}