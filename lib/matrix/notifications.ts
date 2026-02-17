/**
 * Matrix Notification Service
 * 
 * Core notification service for HAOS that handles:
 * - Browser notifications for real-time events
 * - Email notifications for offline users  
 * - Push notifications (framework setup)
 * - Notification templates and customization
 * - Integration with Matrix client events
 */

import {  MatrixClient, MatrixEvent, Room, RoomMember, RoomEvent, RoomMemberEvent  } from "@/lib/matrix/matrix-sdk-exports";
import { getClient } from "./client";

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

const DEFAULT_TEMPLATES: NotificationTemplate[] = [
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
// Utility Functions  
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

function isInQuietHours(settings: NotificationSettings): boolean {
  if (!settings.quietHours.enabled) return false;
  
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const [startHour, startMin] = settings.quietHours.start.split(":").map(Number);
  const [endHour, endMin] = settings.quietHours.end.split(":").map(Number);
  
  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;
  
  // Handle quiet hours spanning midnight
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime <= endTime;
  } else {
    return currentTime >= startTime && currentTime <= endTime;
  }
}

function matchesKeywords(message: string, keywords: string[]): boolean {
  if (!keywords.length) return false;
  
  const lowerMessage = message.toLowerCase();
  return keywords.some(keyword => 
    lowerMessage.includes(keyword.toLowerCase())
  );
}

function shouldNotifyForEvent(
  event: MatrixEvent,
  settings: NotificationSettings,
  userId: string
): NotificationType | null {
  // Check if notifications are globally disabled
  if (!settings.enabled) return null;
  
  // Check quiet hours
  if (isInQuietHours(settings)) return null;
  
  // Don't notify for own events
  if (event.getSender() === userId) return null;
  
  const room = getClient()?.getRoom(event.getRoomId()!);
  if (!room) return null;
  
  const eventType = event.getType();
  const content = event.getContent();
  
  // Room invites
  if (eventType === "m.room.member" && content.membership === "invite") {
    if (settings.roomInvites && event.getStateKey() === userId) {
      return NotificationType.RoomInvite;
    }
    return null;
  }
  
  // Only process message events beyond this point
  if (eventType !== "m.room.message") return null;
  
  const messageBody = content.body || "";
  const isDM = room.getJoinedMemberCount() === 2;
  
  // Direct messages
  if (isDM && settings.directMessages) {
    return NotificationType.DirectMessage;
  }
  
  // Thread replies
  const threadRoot = event.getRelation()?.rel_type === "m.thread";
  if (threadRoot && settings.threadReplies) {
    return NotificationType.ThreadReply;
  }
  
  // Mentions and replies
  const mentionsUser = messageBody.includes(`@${userId}`) || 
                       messageBody.includes("@room") || 
                       messageBody.includes("@here") ||
                       event.getRelation()?.rel_type === "m.reply";
  
  if (mentionsUser && settings.mentions) {
    return NotificationType.Mention;
  }
  
  // Keyword highlights
  if (matchesKeywords(messageBody, settings.keywords)) {
    return NotificationType.KeywordHighlight;
  }
  
  // All room messages (usually disabled)
  if (settings.allRoomMessages) {
    return NotificationType.RoomMessage;
  }
  
  return null;
}

function formatNotificationContent(
  event: MatrixEvent,
  template: NotificationTemplate,
  room?: Room
): { title: string; body: string } {
  const sender = event.getSender() || "Unknown user";
  const senderName = room?.getMember(sender)?.name || sender;
  const roomName = room?.name || "Unknown room";
  const messageContent = event.getContent().body || "";
  
  // Truncate long messages
  const truncatedMessage = messageContent.length > 120 
    ? messageContent.substring(0, 117) + "..."
    : messageContent;
  
  const variables = {
    "{sender}": senderName,
    "{room}": roomName,
    "{message}": truncatedMessage,
    "{time}": new Date().toLocaleTimeString()
  };
  
  let title = template.title;
  let body = template.body;
  
  // Replace template variables
  Object.entries(variables).forEach(([key, value]) => {
    title = title.replace(new RegExp(key, 'g'), value);
    body = body.replace(new RegExp(key, 'g'), value);
  });
  
  return { title, body };
}

// =============================================================================
// Main Notification Service
// =============================================================================

export class MatrixNotificationService {
  private client: MatrixClient | null = null;
  private settings: NotificationSettings = DEFAULT_NOTIFICATION_SETTINGS;
  private templates: Map<string, NotificationTemplate> = new Map();
  private notifications: NotificationData[] = [];
  private listeners: Map<string, Function> = new Map();
  private isListening = false;
  private onNotificationClick?: (roomId: string, eventId?: string) => void;

  constructor() {
    // Load default templates
    DEFAULT_TEMPLATES.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Initialize the notification service
   */
  async initialize(
    client: MatrixClient,
    settings?: Partial<NotificationSettings>,
    onNotificationClick?: (roomId: string, eventId?: string) => void
  ): Promise<void> {
    this.client = client;
    this.onNotificationClick = onNotificationClick;
    
    // Merge settings
    this.settings = { ...DEFAULT_NOTIFICATION_SETTINGS, ...settings };
    
    // Request notification permission if not already granted
    if (this.settings.enabled && this.settings.desktop && !areNotificationsPermitted()) {
      await requestNotificationPermission();
    }
  }

  /**
   * Start listening to Matrix events
   */
  async startListening(): Promise<void> {
    if (!this.client || this.isListening) return;

    const timelineListener = (
      event: MatrixEvent,
      room?: Room,
      toStartOfTimeline?: boolean
    ) => {
      // Ignore events from before we started listening
      if (toStartOfTimeline) return;
      
      this.handleMatrixEvent(event, room);
    };

    const membershipListener = (
      event: MatrixEvent,
      member: RoomMember
    ) => {
      this.handleMatrixEvent(event);
    };

    this.client.on(RoomEvent.Timeline, timelineListener);
    this.client.on(RoomMemberEvent.Membership, membershipListener);

    this.listeners.set("timeline", timelineListener);
    this.listeners.set("membership", membershipListener);
    
    this.isListening = true;
  }

  /**
   * Stop listening to Matrix events
   */
  stopListening(): void {
    if (!this.client || !this.isListening) return;

    this.listeners.forEach((listener, eventType) => {
      if (eventType === "timeline") {
        this.client!.off(RoomEvent.Timeline, listener as any);
      } else if (eventType === "membership") {
        this.client!.off(RoomMemberEvent.Membership, listener as any);
      }
    });

    this.listeners.clear();
    this.isListening = false;
  }

  /**
   * Handle Matrix events and create notifications
   */
  private async handleMatrixEvent(event: MatrixEvent, room?: Room): Promise<void> {
    if (!this.client) return;

    const userId = this.client.getUserId()!;
    const notificationType = shouldNotifyForEvent(event, this.settings, userId);
    
    if (!notificationType) return;

    // Get or create room reference
    const eventRoom = room || this.client.getRoom(event.getRoomId()!);
    if (!eventRoom) return;

    // Find appropriate template
    const templateId = this.findTemplate(notificationType);
    const template = this.templates.get(templateId);
    if (!template) return;

    // Format notification content
    const { title, body } = formatNotificationContent(event, template, eventRoom);
    
    // Create notification data
    const notificationData: NotificationData = {
      id: `${event.getId()}-${Date.now()}`,
      type: notificationType,
      title,
      body,
      timestamp: new Date(event.getTs()),
      read: false,
      roomId: event.getRoomId()!,
      eventId: event.getId()!,
      senderId: event.getSender()!,
      avatar: undefined, // TODO: Fix avatar URL generation with correct Matrix SDK params
      actions: template.actions
    };

    // Add to notifications list
    this.notifications.unshift(notificationData);
    
    // Limit notifications list size
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }

    // Show desktop notification if enabled
    if (this.settings.desktop && areNotificationsPermitted()) {
      await this.showDesktopNotification(notificationData);
    }

    // Send push notification
    await this.sendPushNotification(event, eventRoom, notificationType);

    // TODO: Send email notification for offline users

    // Emit custom event for UI updates
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("haos:notification", {
        detail: notificationData
      }));
    }
  }

  /**
   * Show browser desktop notification
   */
  private async showDesktopNotification(data: NotificationData): Promise<void> {
    try {
      const notification = new Notification(data.title, {
        body: data.body,
        icon: data.avatar || "/icons/haos-logo-32.png",
        tag: data.roomId, // Replace previous notifications from same room
        requireInteraction: false,
        silent: !this.settings.sound
      });

      // Handle click
      notification.onclick = () => {
        notification.close();
        if (this.onNotificationClick && data.roomId) {
          this.onNotificationClick(data.roomId, data.eventId);
        }
        // Focus window
        if (typeof window !== "undefined") {
          window.focus();
        }
      };

      // Auto-close after duration
      if (this.settings.duration > 0) {
        setTimeout(() => {
          notification.close();
        }, this.settings.duration);
      }

    } catch (error) {
      console.error("Failed to show desktop notification:", error);
    }
  }

  /**
   * Find appropriate template for notification type
   */
  private findTemplate(type: NotificationType): string {
    // Look for custom template first, fallback to default
    const customId = `${type}_custom`;
    const defaultId = `${type}_default`;
    
    if (this.templates.has(customId)) {
      return customId;
    }
    if (this.templates.has(defaultId)) {
      return defaultId;
    }
    
    // Fallback to generic template
    return "dm_default";
  }

  /**
   * Update notification settings
   */
  updateSettings(newSettings: Partial<NotificationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    
    // Save to storage (implement as needed)
    if (typeof window !== "undefined") {
      localStorage.setItem("haos:notification-settings", JSON.stringify(this.settings));
    }
  }

  /**
   * Get current settings
   */
  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  /**
   * Get all notifications
   */
  getNotifications(): NotificationData[] {
    return [...this.notifications];
  }

  /**
   * Get unread notifications count
   */
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      
      // Emit update event
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("haos:notification-updated", {
          detail: notification
        }));
      }
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
    
    // Emit update event
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("haos:notifications-read-all"));
    }
  }

  /**
   * Clear all notifications
   */
  clearAllNotifications(): void {
    this.notifications = [];
    
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("haos:notifications-cleared"));
    }
  }

  /**
   * Add or update notification template
   */
  setTemplate(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Get notification template
   */
  getTemplate(templateId: string): NotificationTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Get all templates
   */
  getTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Send push notification for Matrix event
   */
  private async sendPushNotification(
    event: MatrixEvent,
    room: Room,
    notificationType: NotificationType
  ): Promise<void> {
    try {
      // Only import server push service on server-side
      if (typeof window !== 'undefined') {
        console.log('Push notifications should be sent from server-side only');
        return;
      }

      // Import server push service dynamically to avoid client-side issues
      const { getServerPushService } = await import('@/lib/notifications/push-service-server');
      const serverPushService = getServerPushService();

      if (!serverPushService.isEnabled()) {
        console.log('Push notifications disabled, skipping');
        return;
      }

      // Get user push subscriptions
      if (!this.client) {
        console.warn('Matrix client not available for push notifications');
        return;
      }

      try {
        const data = await (this.client as any).getAccountData('com.haos.push_subscriptions');
        const content = data?.getContent();
        const subscriptions = content?.subscriptions || [];
        
        if (subscriptions.length === 0) {
          console.log('No push subscriptions found');
          return;
        }

        // Send push notification with Matrix client
        const results = await serverPushService.sendMatrixNotification(event, room, notificationType, subscriptions);
        
        // Handle results - remove expired subscriptions
        const shouldUnsubscribe = results.filter(r => r.shouldUnsubscribe);
        if (shouldUnsubscribe.length > 0) {
          const validSubscriptions = subscriptions.filter((sub: any) => 
            !shouldUnsubscribe.some(r => r.subscriptionId === sub.id)
          );
          
          await (this.client as any).setAccountData('com.haos.push_subscriptions', {
            subscriptions: validSubscriptions,
            updated_at: new Date().toISOString()
          });
          
          console.log(`Removed ${shouldUnsubscribe.length} expired subscriptions`);
        }
        
      } catch (error) {
        console.error('Failed to get push subscriptions:', error);
      }
      
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  }

  /**
   * Send test notification
   */
  async testNotification(): Promise<boolean> {
    if (!areNotificationsPermitted()) {
      throw new Error("Notification permission not granted");
    }

    try {
      const testData: NotificationData = {
        id: `test-${Date.now()}`,
        type: NotificationType.DirectMessage,
        title: "HAOS Test Notification",
        body: "Your notification settings are working correctly!",
        timestamp: new Date(),
        read: false,
        roomId: "!test:example.com",
        eventId: "$test:example.com"
      };

      await this.showDesktopNotification(testData);
      
      // Also test push notification
      await this.testPushNotification();
      
      return true;
    } catch (error) {
      console.error("Test notification failed:", error);
      return false;
    }
  }

  /**
   * Send test push notification
   */
  async testPushNotification(): Promise<void> {
    try {
      const response = await fetch('/api/notifications/push?userId=test-user');
      if (!response.ok) {
        console.warn('Test push notification failed');
      }
    } catch (error) {
      console.error('Failed to send test push notification:', error);
    }
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.client !== null;
  }

  /**
   * Get error state
   */
  getError(): { message: string } | null {
    if (!isNotificationSupported()) {
      return { message: "Notifications not supported by this browser" };
    }
    
    if (!this.client) {
      return { message: "Matrix client not initialized" };
    }
    
    return null;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let notificationService: MatrixNotificationService | null = null;

/**
 * Get singleton notification service instance
 */
export function getNotificationService(): MatrixNotificationService {
  if (!notificationService) {
    notificationService = new MatrixNotificationService();
  }
  return notificationService;
}

/**
 * Destroy the notification service
 */
export function destroyNotificationService(): void {
  if (notificationService) {
    notificationService.stopListening();
    notificationService = null;
  }
}