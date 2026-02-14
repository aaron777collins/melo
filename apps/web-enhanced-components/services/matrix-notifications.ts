/**
 * Matrix Notifications Service
 *
 * Service layer for managing desktop and browser notifications for Matrix events.
 * Handles notification permissions, filtering, and delivery for messages, mentions,
 * and other Matrix events.
 */

import { 
  MatrixEvent, 
  MatrixClient,
  Room,
  EventType,
  MsgType,
  RoomMemberEvent,
  RoomEvent
} from "matrix-js-sdk";

// =============================================================================
// Types
// =============================================================================

/**
 * Notification event types that can trigger notifications
 */
export enum NotificationType {
  DirectMessage = 'dm',
  Mention = 'mention',
  RoomMessage = 'room_message',
  RoomInvite = 'room_invite',
  ThreadReply = 'thread_reply',
  KeywordHighlight = 'keyword_highlight'
}

/**
 * Notification settings for controlling what events trigger notifications
 */
export interface NotificationSettings {
  /** Enable desktop notifications */
  enabled: boolean;
  /** Show notifications for direct messages */
  directMessages: boolean;
  /** Show notifications for @mentions */
  mentions: boolean;
  /** Show notifications for all room messages */
  allRoomMessages: boolean;
  /** Show notifications for room invites */
  roomInvites: boolean;
  /** Show notifications for thread replies */
  threadReplies: boolean;
  /** Keywords that trigger highlight notifications */
  keywords: string[];
  /** Sound for notifications */
  sound: boolean;
  /** Notification display duration (ms) */
  duration: number;
  /** Mute notifications during these hours */
  quietHours?: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
}

/**
 * Default notification settings
 */
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  directMessages: true,
  mentions: true,
  allRoomMessages: false,
  roomInvites: true,
  threadReplies: true,
  keywords: [],
  sound: true,
  duration: 5000,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00'
  }
};

/**
 * Notification data structure
 */
export interface NotificationData {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  roomId: string;
  eventId: string;
  senderId: string;
  timestamp: Date;
  threadId?: string;
  data?: {
    roomName?: string;
    senderDisplayName?: string;
    avatar?: string;
  };
}

/**
 * Browser notification options
 */
interface BrowserNotificationOptions {
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  silent?: boolean;
}

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Custom error class for Notification Service operations
 */
export class NotificationServiceError extends Error {
  public readonly code: string;

  constructor(message: string, code = 'NOTIFICATION_ERROR') {
    super(message);
    this.name = 'NotificationServiceError';
    this.code = code;
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if notifications are supported by the browser
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Request notification permissions from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    throw new NotificationServiceError('Notifications not supported', 'NOT_SUPPORTED');
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    throw new NotificationServiceError(
      `Failed to request permission: ${error instanceof Error ? error.message : String(error)}`,
      'PERMISSION_REQUEST_FAILED'
    );
  }
}

/**
 * Check if notifications are currently permitted
 */
export function areNotificationsPermitted(): boolean {
  return isNotificationSupported() && getNotificationPermission() === 'granted';
}

/**
 * Check if we're in quiet hours based on settings
 */
function isInQuietHours(settings: NotificationSettings): boolean {
  if (!settings.quietHours?.enabled) {
    return false;
  }

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  const { start, end } = settings.quietHours;
  
  // Handle overnight quiet hours (e.g., 22:00 to 08:00)
  if (start > end) {
    return currentTime >= start || currentTime <= end;
  } else {
    return currentTime >= start && currentTime <= end;
  }
}

/**
 * Extract display name for a user from room member
 */
function getUserDisplayName(room: Room | null, userId: string): string {
  if (!room) return userId;
  
  const member = room.getMember(userId);
  return member?.name || member?.rawDisplayName || userId;
}

/**
 * Extract avatar URL for a user from room member
 */
function getUserAvatarUrl(room: Room | null, userId: string, client: MatrixClient): string | undefined {
  if (!room) return undefined;
  
  const member = room.getMember(userId);
  if (!member?.getAvatarUrl) return undefined;
  
  return member.getAvatarUrl(
    client.getHomeserverUrl(),
    32, 32, 'crop', false, false
  ) || undefined;
}

/**
 * Check if message content contains mentions of the current user
 */
function containsUserMention(event: MatrixEvent, userId: string): boolean {
  const content = event.getContent();
  const body = content?.body || '';
  
  // Check for @username mentions
  const userLocalpart = userId.split(':')[0].substring(1); // Remove @ from @user:domain.com
  const mentionRegex = new RegExp(`@${userLocalpart}\\b`, 'i');
  
  return mentionRegex.test(body) || 
         body.includes(userId) || 
         body.includes('@room') || 
         body.includes('@here');
}

/**
 * Check if message content contains any of the user's keywords
 */
function containsKeywords(event: MatrixEvent, keywords: string[]): boolean {
  if (keywords.length === 0) return false;
  
  const content = event.getContent();
  const body = (content?.body || '').toLowerCase();
  
  return keywords.some(keyword => 
    body.includes(keyword.toLowerCase())
  );
}

/**
 * Check if event is a thread reply
 */
function isThreadReply(event: MatrixEvent): boolean {
  const content = event.getContent();
  return !!(content?.['m.relates_to']?.rel_type === 'm.thread');
}

/**
 * Check if room is a direct message room
 */
function isDirectMessage(room: Room | null): boolean {
  if (!room) return false;
  
  // Check if room has isDirect tag
  if (room.tags?.['m.direct']) return true;
  
  // Check if room has only 2 members (including ourselves)
  const members = room.getJoinedMembers();
  return members.length === 2;
}

// =============================================================================
// Notification Classification
// =============================================================================

/**
 * Determine the notification type for a Matrix event
 */
function classifyNotification(
  event: MatrixEvent, 
  room: Room | null, 
  userId: string,
  settings: NotificationSettings
): NotificationType | null {
  const eventType = event.getType();
  const senderId = event.getSender();
  
  // Don't notify for our own events
  if (senderId === userId) {
    return null;
  }
  
  // Room invites
  if (eventType === EventType.RoomMember) {
    const content = event.getContent();
    if (content?.membership === 'invite' && event.getStateKey() === userId) {
      return settings.roomInvites ? NotificationType.RoomInvite : null;
    }
  }
  
  // Message events
  if (eventType === EventType.RoomMessage) {
    const isDM = isDirectMessage(room);
    const isThread = isThreadReply(event);
    const hasMention = containsUserMention(event, userId);
    const hasKeywords = containsKeywords(event, settings.keywords);
    
    // Direct messages
    if (isDM && settings.directMessages) {
      return NotificationType.DirectMessage;
    }
    
    // Thread replies
    if (isThread && settings.threadReplies) {
      return NotificationType.ThreadReply;
    }
    
    // Mentions
    if (hasMention && settings.mentions) {
      return NotificationType.Mention;
    }
    
    // Keyword highlights
    if (hasKeywords) {
      return NotificationType.KeywordHighlight;
    }
    
    // All room messages (if enabled)
    if (settings.allRoomMessages && !isDM) {
      return NotificationType.RoomMessage;
    }
  }
  
  return null;
}

// =============================================================================
// Notification Creation
// =============================================================================

/**
 * Create notification data from a Matrix event
 */
async function createNotificationData(
  event: MatrixEvent,
  room: Room | null,
  client: MatrixClient,
  type: NotificationType
): Promise<NotificationData> {
  const eventId = event.getId() || '';
  const roomId = event.getRoomId() || '';
  const senderId = event.getSender() || '';
  const content = event.getContent();
  
  const senderDisplayName = getUserDisplayName(room, senderId);
  const roomName = room?.name || 'Unknown Room';
  const avatar = getUserAvatarUrl(room, senderId, client);
  
  let title: string;
  let body: string;
  
  switch (type) {
    case NotificationType.DirectMessage:
      title = `${senderDisplayName}`;
      body = content?.body || 'Sent a message';
      break;
      
    case NotificationType.Mention:
      title = `${senderDisplayName} mentioned you in ${roomName}`;
      body = content?.body || 'Mentioned you in a message';
      break;
      
    case NotificationType.RoomMessage:
      title = `${senderDisplayName} in ${roomName}`;
      body = content?.body || 'Sent a message';
      break;
      
    case NotificationType.RoomInvite:
      title = `${senderDisplayName} invited you`;
      body = `Join ${roomName}`;
      break;
      
    case NotificationType.ThreadReply:
      title = `${senderDisplayName} replied in ${roomName}`;
      body = content?.body || 'Replied to a thread';
      break;
      
    case NotificationType.KeywordHighlight:
      title = `${senderDisplayName} in ${roomName}`;
      body = content?.body || 'Message contains your keywords';
      break;
      
    default:
      title = `${senderDisplayName}`;
      body = content?.body || 'New message';
  }
  
  // Truncate long message bodies
  if (body.length > 120) {
    body = body.substring(0, 117) + '...';
  }
  
  return {
    id: `${eventId}-${Date.now()}`,
    type,
    title,
    body,
    icon: avatar,
    roomId,
    eventId,
    senderId,
    timestamp: new Date(event.getTs()),
    threadId: content?.['m.relates_to']?.event_id,
    data: {
      roomName,
      senderDisplayName,
      avatar
    }
  };
}

// =============================================================================
// Notification Display
// =============================================================================

/**
 * Show a desktop notification using the browser's Notification API
 */
function showDesktopNotification(
  notificationData: NotificationData,
  settings: NotificationSettings,
  onNotificationClick?: (roomId: string, eventId: string, threadId?: string) => void
): Notification | null {
  if (!areNotificationsPermitted()) {
    return null;
  }
  
  const options: BrowserNotificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon,
    tag: notificationData.roomId, // Replace previous notifications from same room
    data: {
      roomId: notificationData.roomId,
      eventId: notificationData.eventId,
      threadId: notificationData.threadId,
      type: notificationData.type
    },
    requireInteraction: false,
    silent: !settings.sound
  };
  
  try {
    const notification = new Notification(notificationData.title, options);
    
    // Handle notification click
    notification.onclick = () => {
      if (onNotificationClick) {
        onNotificationClick(
          notificationData.roomId,
          notificationData.eventId,
          notificationData.threadId
        );
      }
      notification.close();
      
      // Focus the window if it's available
      if (window) {
        window.focus();
      }
    };
    
    // Auto-close notification after duration
    if (settings.duration > 0) {
      setTimeout(() => {
        notification.close();
      }, settings.duration);
    }
    
    return notification;
    
  } catch (error) {
    console.error('[NotificationService] Failed to show notification:', error);
    return null;
  }
}

// =============================================================================
// Main Service Class
// =============================================================================

/**
 * Matrix Notification Service - manages notifications for Matrix events
 */
export class MatrixNotificationService {
  private client: MatrixClient | null = null;
  private settings: NotificationSettings = DEFAULT_NOTIFICATION_SETTINGS;
  private isListening = false;
  private onNotificationClick?: (roomId: string, eventId: string, threadId?: string) => void;
  private activeNotifications: Map<string, Notification> = new Map();

  /**
   * Initialize the notification service
   */
  async initialize(
    client: MatrixClient, 
    settings?: Partial<NotificationSettings>,
    onNotificationClick?: (roomId: string, eventId: string, threadId?: string) => void
  ): Promise<void> {
    this.client = client;
    this.settings = { ...DEFAULT_NOTIFICATION_SETTINGS, ...settings };
    this.onNotificationClick = onNotificationClick;
    
    if (this.settings.enabled) {
      await this.requestPermissions();
      await this.startListening();
    }
  }

  /**
   * Request notification permissions if not already granted
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const permission = await requestNotificationPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('[NotificationService] Permission request failed:', error);
      return false;
    }
  }

  /**
   * Start listening to Matrix events for notifications
   */
  async startListening(): Promise<void> {
    if (!this.client || this.isListening) {
      return;
    }

    this.isListening = true;

    // Listen to room timeline events (messages)
    this.client.on('Room.timeline' as any, this.handleTimelineEvent.bind(this));
    
    // Listen to room member events (invites)
    this.client.on('RoomMember.membership' as any, this.handleMembershipEvent.bind(this));
  }

  /**
   * Stop listening to Matrix events
   */
  stopListening(): void {
    if (!this.client || !this.isListening) {
      return;
    }

    this.isListening = false;

    this.client.off('Room.timeline' as any, this.handleTimelineEvent.bind(this));
    this.client.off('RoomMember.membership' as any, this.handleMembershipEvent.bind(this));
    
    // Close all active notifications
    this.clearAllNotifications();
  }

  /**
   * Update notification settings
   */
  updateSettings(newSettings: Partial<NotificationSettings>): void {
    const oldEnabled = this.settings.enabled;
    this.settings = { ...this.settings, ...newSettings };
    
    // Start/stop listening based on enabled state
    if (this.settings.enabled && !oldEnabled && this.client) {
      this.startListening();
    } else if (!this.settings.enabled && oldEnabled) {
      this.stopListening();
    }
  }

  /**
   * Get current settings
   */
  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  /**
   * Clear all active notifications
   */
  clearAllNotifications(): void {
    this.activeNotifications.forEach(notification => {
      notification.close();
    });
    this.activeNotifications.clear();
  }

  /**
   * Handle timeline events (messages, reactions, etc.)
   */
  private async handleTimelineEvent(
    event: MatrixEvent,
    room: Room,
    toStartOfTimeline?: boolean,
    removed?: boolean,
    data?: any
  ): Promise<void> {
    // Only handle live events, not backfill
    if (toStartOfTimeline || removed) {
      return;
    }

    // Skip if notifications disabled or in quiet hours
    if (!this.settings.enabled || isInQuietHours(this.settings)) {
      return;
    }

    // Skip if no client or user ID
    if (!this.client) {
      return;
    }

    const userId = this.client.getUserId();
    if (!userId) {
      return;
    }

    // Classify the notification type
    const notificationType = classifyNotification(event, room, userId, this.settings);
    if (!notificationType) {
      return;
    }

    try {
      // Create notification data
      const notificationData = await createNotificationData(
        event,
        room,
        this.client,
        notificationType
      );

      // Show the notification
      const notification = showDesktopNotification(
        notificationData,
        this.settings,
        this.onNotificationClick
      );

      if (notification) {
        // Track the notification
        this.activeNotifications.set(notificationData.id, notification);

        // Clean up when notification closes
        notification.onclose = () => {
          this.activeNotifications.delete(notificationData.id);
        };
      }
    } catch (error) {
      console.error('[NotificationService] Failed to process notification:', error);
    }
  }

  /**
   * Handle membership events (invites, joins, etc.)
   */
  private async handleMembershipEvent(
    event: RoomMemberEvent,
    member: any,
    oldMembership?: string
  ): Promise<void> {
    // Skip if notifications disabled or in quiet hours
    if (!this.settings.enabled || isInQuietHours(this.settings)) {
      return;
    }

    // Only handle invites for now
    if (member.membership !== 'invite') {
      return;
    }

    // Skip if no client or this isn't an invite for us
    if (!this.client) {
      return;
    }

    const userId = this.client.getUserId();
    if (!userId || member.userId !== userId) {
      return;
    }

    // Skip if room invites are disabled
    if (!this.settings.roomInvites) {
      return;
    }

    try {
      const room = this.client.getRoom(member.roomId);
      
      // Create a synthetic event for the invite notification
      const syntheticEvent = {
        getId: () => `invite-${member.roomId}-${Date.now()}`,
        getRoomId: () => member.roomId,
        getSender: () => member.userId, // Use the inviting user's ID
        getType: () => EventType.RoomMember,
        getContent: () => ({ membership: 'invite' }),
        getTs: () => Date.now(),
        getStateKey: () => userId
      } as MatrixEvent;

      const notificationData = await createNotificationData(
        syntheticEvent,
        room,
        this.client,
        NotificationType.RoomInvite
      );

      const notification = showDesktopNotification(
        notificationData,
        this.settings,
        this.onNotificationClick
      );

      if (notification) {
        this.activeNotifications.set(notificationData.id, notification);
        notification.onclose = () => {
          this.activeNotifications.delete(notificationData.id);
        };
      }
    } catch (error) {
      console.error('[NotificationService] Failed to process invite notification:', error);
    }
  }

  /**
   * Test notifications (for settings UI)
   */
  async testNotification(): Promise<boolean> {
    if (!areNotificationsPermitted()) {
      throw new NotificationServiceError('Notifications not permitted', 'NOT_PERMITTED');
    }

    const testData: NotificationData = {
      id: `test-${Date.now()}`,
      type: NotificationType.DirectMessage,
      title: 'Test Notification',
      body: 'This is a test notification from HAOS v2',
      roomId: 'test',
      eventId: 'test',
      senderId: 'test',
      timestamp: new Date(),
      data: {
        roomName: 'Test Room',
        senderDisplayName: 'Test User'
      }
    };

    const notification = showDesktopNotification(testData, this.settings);
    return notification !== null;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let notificationServiceInstance: MatrixNotificationService | null = null;

/**
 * Get the singleton notification service instance
 */
export function getNotificationService(): MatrixNotificationService {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new MatrixNotificationService();
  }
  return notificationServiceInstance;
}

/**
 * Initialize the global notification service
 */
export async function initializeNotifications(
  client: MatrixClient,
  settings?: Partial<NotificationSettings>,
  onNotificationClick?: (roomId: string, eventId: string, threadId?: string) => void
): Promise<MatrixNotificationService> {
  const service = getNotificationService();
  await service.initialize(client, settings, onNotificationClick);
  return service;
}

// =============================================================================
// Exports
// =============================================================================