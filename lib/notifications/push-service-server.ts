/**
 * Server-Side Push Service
 * 
 * This module contains all web-push functionality and should ONLY be used
 * on the server side (API routes, server actions, etc.)
 */

// Import the web-push library - THIS FILE SHOULD NEVER BE IMPORTED IN CLIENT CODE
import webpush from 'web-push';
import {  MatrixEvent, Room  } from "@/lib/matrix/matrix-sdk-exports";
import { NotificationType } from "@/lib/matrix/notifications";

// =============================================================================
// Server-only Types and Interfaces
// =============================================================================

export interface PushSubscriptionData {
  id: string;
  userId: string;
  deviceId: string;
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  userAgent?: string;
  createdAt: Date;
  lastUsed: Date;
}

export interface PushNotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    roomId?: string;
    eventId?: string;
    notificationType?: NotificationType;
    url?: string;
    [key: string]: any;
  };
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
  vibrate?: number[];
}

export interface PushResult {
  subscriptionId: string;
  success: boolean;
  error?: string;
  shouldUnsubscribe?: boolean;
}

export interface WebPushConfig {
  vapidPublicKey: string;
  vapidPrivateKey: string;
  vapidSubject: string;
}

// =============================================================================
// Server-Side Web Push Provider
// =============================================================================

export class ServerWebPushProvider {
  private config: WebPushConfig;

  constructor(config: WebPushConfig) {
    this.config = config;
    
    // Set VAPID details for web-push library
    webpush.setVapidDetails(
      config.vapidSubject,
      config.vapidPublicKey,
      config.vapidPrivateKey
    );
  }

  async sendNotifications(subscriptions: PushSubscriptionData[], data: PushNotificationData): Promise<PushResult[]> {
    const results: PushResult[] = [];
    
    // Prepare the payload
    const payload = JSON.stringify({
      notification: {
        title: data.title,
        body: data.body,
        icon: data.icon || '/icons/melo-logo-192.png',
        badge: data.badge || '/icons/melo-badge-72.png',
        tag: data.tag,
        data: data.data,
        actions: data.actions,
        requireInteraction: data.requireInteraction || false,
        silent: data.silent || false,
        timestamp: data.timestamp || Date.now(),
        vibrate: data.vibrate
      }
    });

    // Send to all subscriptions
    const sendPromises = subscriptions.map(async (subscription) => {
      try {
        // Convert our PushSubscription format to web-push format
        const webPushSubscription = {
          endpoint: subscription.subscription.endpoint,
          keys: {
            p256dh: subscription.subscription.keys.p256dh,
            auth: subscription.subscription.keys.auth
          }
        };

        // Options for web-push
        const options = {
          TTL: 86400, // 24 hours
          urgency: 'normal' as const,
          vapidDetails: {
            subject: this.config.vapidSubject,
            publicKey: this.config.vapidPublicKey,
            privateKey: this.config.vapidPrivateKey
          }
        };

        // Send the notification
        await webpush.sendNotification(webPushSubscription, payload, options);

        return {
          subscriptionId: subscription.id,
          success: true
        };
      } catch (error: any) {
        // Handle different types of errors
        let shouldUnsubscribe = false;
        let errorMessage = 'Unknown error';

        if (error.statusCode === 410) {
          // Subscription has expired
          shouldUnsubscribe = true;
          errorMessage = 'Subscription expired';
        } else if (error.statusCode === 413) {
          errorMessage = 'Payload too large';
        } else if (error.statusCode === 429) {
          errorMessage = 'Rate limited';
        } else if (error.statusCode >= 400 && error.statusCode < 500) {
          errorMessage = `Client error: ${error.statusCode}`;
          if (error.statusCode === 400 || error.statusCode === 404) {
            shouldUnsubscribe = true;
          }
        } else if (error.statusCode >= 500) {
          errorMessage = `Server error: ${error.statusCode}`;
        } else {
          errorMessage = error.message || String(error);
        }

        return {
          subscriptionId: subscription.id,
          success: false,
          error: errorMessage,
          shouldUnsubscribe
        };
      }
    });

    // Wait for all sends to complete
    const sendResults = await Promise.allSettled(sendPromises);
    
    // Process results
    for (const result of sendResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        // This shouldn't happen since we handle errors in the promise
        results.push({
          subscriptionId: 'unknown',
          success: false,
          error: 'Promise rejected: ' + result.reason
        });
      }
    }

    return results;
  }

  /**
   * Validate a subscription to check if it's still valid
   */
  async validateSubscription(subscription: PushSubscriptionData): Promise<boolean> {
    try {
      const webPushSubscription = {
        endpoint: subscription.subscription.endpoint,
        keys: {
          p256dh: subscription.subscription.keys.p256dh,
          auth: subscription.subscription.keys.auth
        }
      };

      // Send a minimal test payload
      await webpush.sendNotification(webPushSubscription, '{"test":true}', {
        TTL: 1, // Very short TTL for test
        urgency: 'low'
      });

      return true;
    } catch (error: any) {
      // If we get a 410 or 404, the subscription is invalid
      return !(error.statusCode === 410 || error.statusCode === 404);
    }
  }

  /**
   * Set GCM API key if needed (for backward compatibility)
   */
  static setGCMAPIKey(apiKey: string): void {
    webpush.setGCMAPIKey(apiKey);
  }
}

// =============================================================================
// Server-Side Push Service
// =============================================================================

export class ServerPushNotificationService {
  private config: WebPushConfig | null = null;
  private provider: ServerWebPushProvider | null = null;

  constructor() {
    this.initializeConfig();
  }

  private initializeConfig() {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:contact@aaroncollins.info';

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.warn('VAPID keys not configured. Web Push notifications disabled.');
      return;
    }

    this.config = {
      vapidPublicKey,
      vapidPrivateKey,
      vapidSubject
    };

    this.provider = new ServerWebPushProvider(this.config);
    console.log('Server-side Web Push provider configured successfully');
  }

  /**
   * Check if push notifications are enabled
   */
  isEnabled(): boolean {
    return this.config !== null && this.provider !== null;
  }

  /**
   * Send push notification for Matrix event
   */
  async sendMatrixNotification(
    event: MatrixEvent,
    room: Room,
    notificationType: NotificationType,
    subscriptions: PushSubscriptionData[]
  ): Promise<PushResult[]> {
    if (!this.provider) {
      console.warn('Push service not configured');
      return [];
    }

    if (subscriptions.length === 0) {
      console.log('No push subscriptions found');
      return [];
    }

    const notificationData = this.formatMatrixNotification(event, room, notificationType);
    
    try {
      const results = await this.provider.sendNotifications(subscriptions, notificationData);
      
      // Handle results
      const failed = results.filter(r => !r.success);
      const shouldUnsubscribe = results.filter(r => r.shouldUnsubscribe);

      if (failed.length > 0) {
        console.warn(`${failed.length} push notifications failed to send`);
      }

      if (shouldUnsubscribe.length > 0) {
        console.log(`${shouldUnsubscribe.length} subscriptions should be removed`);
        // Note: The caller should handle removing expired subscriptions
      }

      console.log(`Push notifications sent: ${results.length - failed.length}/${results.length}`);
      return results;
    } catch (error) {
      console.error('Failed to send push notifications:', error);
      return [];
    }
  }

  /**
   * Send custom push notification
   */
  async sendCustomNotification(
    data: PushNotificationData,
    subscriptions: PushSubscriptionData[]
  ): Promise<PushResult[]> {
    if (!this.provider) {
      console.warn('Push service not configured');
      return [];
    }

    if (subscriptions.length === 0) {
      console.log('No push subscriptions found');
      return [];
    }

    try {
      return await this.provider.sendNotifications(subscriptions, data);
    } catch (error) {
      console.error('Failed to send custom push notifications:', error);
      return [];
    }
  }

  /**
   * Format push notification data from Matrix event
   */
  private formatMatrixNotification(
    event: MatrixEvent,
    room: Room,
    notificationType: NotificationType
  ): PushNotificationData {
    const sender = event.getSender() || "Unknown user";
    const senderName = room.getMember(sender)?.name || sender;
    const roomName = room.name || "Unknown room";
    const messageContent = event.getContent().body || "";
    const isDM = room.getJoinedMemberCount() === 2;

    // Format title and body based on notification type
    let title: string;
    let body: string;
    
    switch (notificationType) {
      case NotificationType.DirectMessage:
        title = senderName;
        body = messageContent;
        break;
      case NotificationType.Mention:
        title = `${senderName} mentioned you`;
        body = isDM ? messageContent : `in ${roomName}: ${messageContent}`;
        break;
      case NotificationType.RoomInvite:
        title = `Invitation from ${senderName}`;
        body = `You've been invited to ${roomName}`;
        break;
      case NotificationType.ThreadReply:
        title = `${senderName} replied in thread`;
        body = isDM ? messageContent : `in ${roomName}: ${messageContent}`;
        break;
      default:
        title = `New message from ${senderName}`;
        body = isDM ? messageContent : `in ${roomName}: ${messageContent}`;
        break;
    }

    // Truncate long content
    if (body.length > 120) {
      body = body.substring(0, 117) + "...";
    }

    return {
      title,
      body,
      icon: '/icons/melo-logo-192.png',
      badge: '/icons/melo-badge-72.png',
      tag: room.roomId, // Group notifications by room
      data: {
        roomId: room.roomId,
        eventId: event.getId()!,
        notificationType,
        url: `/rooms/${room.roomId}${event.getId() ? `#${event.getId()}` : ''}`
      },
      actions: [
        {
          action: 'view',
          title: 'View',
          icon: '/icons/action-view.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/action-dismiss.png'
        }
      ],
      requireInteraction: notificationType === NotificationType.RoomInvite,
      vibrate: notificationType === NotificationType.DirectMessage ? [200, 100, 200] : [100]
    };
  }

  /**
   * Get VAPID public key for client-side usage
   */
  getVapidPublicKey(): string | null {
    return this.config?.vapidPublicKey || null;
  }
}

// =============================================================================
// Singleton Instance (Server-side only)
// =============================================================================

let serverPushService: ServerPushNotificationService | null = null;

/**
 * Get singleton server push service instance
 * This should ONLY be called from server-side code
 */
export function getServerPushService(): ServerPushNotificationService {
  if (!serverPushService) {
    serverPushService = new ServerPushNotificationService();
  }
  return serverPushService;
}