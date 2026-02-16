/**
 * Push Notification Service Framework
 * 
 * Framework for push notification support including Web Push API,
 * service worker integration, and extensible provider system.
 * Sets up the foundation for real push notifications in the future.
 */

import { MatrixEvent, Room } from "matrix-js-sdk";
import { NotificationType } from "@/lib/matrix/notifications";

// =============================================================================
// Types
// =============================================================================

export interface PushSubscription {
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
    roomId: string;
    eventId: string;
    notificationType: NotificationType;
    url?: string;
  };
  actions?: PushAction[];
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
  vibrate?: number[];
}

export interface PushAction {
  action: string;
  title: string;
  icon?: string;
}

export interface PushServiceConfig {
  enabled: boolean;
  vapidPublicKey?: string;
  vapidPrivateKey?: string;
  vapidSubject?: string;
  serviceWorkerPath: string;
  apiEndpoint: string;
}

export interface PushProvider {
  name: string;
  send(subscriptions: PushSubscription[], data: PushNotificationData): Promise<PushResult[]>;
}

export interface PushResult {
  subscriptionId: string;
  success: boolean;
  error?: string;
  shouldUnsubscribe?: boolean;
}

// =============================================================================
// Web Push Provider
// =============================================================================

class WebPushProvider implements PushProvider {
  name = "webpush";
  private config: PushServiceConfig;

  constructor(config: PushServiceConfig) {
    this.config = config;
  }

  async send(subscriptions: PushSubscription[], data: PushNotificationData): Promise<PushResult[]> {
    // In a real implementation, this would use web-push library
    // For now, we'll simulate the API call structure
    
    const results: PushResult[] = [];
    
    for (const subscription of subscriptions) {
      try {
        const payload = JSON.stringify({
          notification: {
            title: data.title,
            body: data.body,
            icon: data.icon || '/icons/haos-logo-192.png',
            badge: data.badge || '/icons/haos-badge-72.png',
            tag: data.tag,
            data: data.data,
            actions: data.actions,
            requireInteraction: data.requireInteraction || false,
            silent: data.silent || false,
            timestamp: data.timestamp || Date.now(),
            vibrate: data.vibrate
          }
        });

        // Simulate API call to push service
        const response = await fetch(this.config.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            subscription: subscription.subscription,
            payload,
            options: {
              TTL: 86400, // 24 hours
              urgency: 'normal',
              vapidDetails: {
                subject: this.config.vapidSubject,
                publicKey: this.config.vapidPublicKey,
                privateKey: this.config.vapidPrivateKey
              }
            }
          })
        });

        if (response.ok) {
          results.push({
            subscriptionId: subscription.id,
            success: true
          });
        } else {
          const errorText = await response.text();
          const shouldUnsubscribe = response.status === 410; // Gone - subscription expired
          
          results.push({
            subscriptionId: subscription.id,
            success: false,
            error: errorText,
            shouldUnsubscribe
          });
        }
      } catch (error) {
        results.push({
          subscriptionId: subscription.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }
}

// =============================================================================
// Service Worker Management
// =============================================================================

export class ServiceWorkerManager {
  private config: PushServiceConfig;

  constructor(config: PushServiceConfig) {
    this.config = config;
  }

  /**
   * Check if service workers are supported
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
  }

  /**
   * Register service worker
   */
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) {
      throw new Error('Service workers not supported');
    }

    try {
      const registration = await navigator.serviceWorker.register(this.config.serviceWorkerPath, {
        scope: '/'
      });

      console.log('Service worker registered successfully:', registration);
      return registration;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      throw error;
    }
  }

  /**
   * Get existing service worker registration
   */
  async getRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) return null;

    try {
      return await navigator.serviceWorker.getRegistration();
    } catch (error) {
      console.error('Failed to get service worker registration:', error);
      return null;
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(userId: string, deviceId: string): Promise<PushSubscription | null> {
    if (!this.config.vapidPublicKey) {
      throw new Error('VAPID public key not configured');
    }

    const registration = await this.getRegistration();
    if (!registration) {
      throw new Error('Service worker not registered');
    }

    try {
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.config.vapidPublicKey)
      });

      const pushSubscription: PushSubscription = {
        id: crypto.randomUUID(),
        userId,
        deviceId,
        subscription: {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
            auth: this.arrayBufferToBase64(subscription.getKey('auth')!)
          }
        },
        userAgent: navigator.userAgent,
        createdAt: new Date(),
        lastUsed: new Date()
      };

      // Store subscription (in real app, send to server)
      await this.storeSubscription(pushSubscription);
      
      return pushSubscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPush(subscriptionId?: string): Promise<boolean> {
    const registration = await this.getRegistration();
    if (!registration) return false;

    try {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const success = await subscription.unsubscribe();
        
        if (success && subscriptionId) {
          await this.removeSubscription(subscriptionId);
        }
        
        return success;
      }
      return false;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  /**
   * Get current push subscription
   */
  async getCurrentSubscription(): Promise<globalThis.PushSubscription | null> {
    const registration = await this.getRegistration();
    if (!registration) return null;

    try {
      return await registration.pushManager.getSubscription();
    } catch (error) {
      console.error('Failed to get current push subscription:', error);
      return null;
    }
  }

  /**
   * Check if user is subscribed to push notifications
   */
  async isSubscribed(): Promise<boolean> {
    const subscription = await this.getCurrentSubscription();
    return subscription !== null;
  }

  // Private helper methods
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private async storeSubscription(subscription: PushSubscription): Promise<void> {
    // In a real implementation, this would store to IndexedDB or send to server
    console.log('Storing push subscription:', subscription);
    localStorage.setItem(`haos:push-subscription:${subscription.id}`, JSON.stringify(subscription));
  }

  private async removeSubscription(subscriptionId: string): Promise<void> {
    // In a real implementation, this would remove from IndexedDB or notify server
    console.log('Removing push subscription:', subscriptionId);
    localStorage.removeItem(`haos:push-subscription:${subscriptionId}`);
  }
}

// =============================================================================
// Main Push Service
// =============================================================================

export class PushNotificationService {
  private config: PushServiceConfig;
  private providers: Map<string, PushProvider> = new Map();
  private serviceWorkerManager: ServiceWorkerManager;

  constructor(config: PushServiceConfig) {
    this.config = config;
    this.serviceWorkerManager = new ServiceWorkerManager(config);

    // Register default provider
    this.providers.set('webpush', new WebPushProvider(config));
  }

  /**
   * Initialize push notification service
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      console.log('Push notifications disabled in config');
      return;
    }

    if (!this.serviceWorkerManager.isSupported()) {
      console.warn('Push notifications not supported in this browser');
      return;
    }

    try {
      await this.serviceWorkerManager.registerServiceWorker();
      console.log('Push notification service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize push notification service:', error);
    }
  }

  /**
   * Check if push notifications are supported
   */
  isSupported(): boolean {
    return this.serviceWorkerManager.isSupported();
  }

  /**
   * Request push notification permission and subscribe
   */
  async requestPermissionAndSubscribe(userId: string, deviceId: string): Promise<PushSubscription | null> {
    if (!this.config.enabled) return null;

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Push notification permission denied');
    }

    // Subscribe to push
    return await this.serviceWorkerManager.subscribeToPush(userId, deviceId);
  }

  /**
   * Check if user is subscribed
   */
  async isSubscribed(): Promise<boolean> {
    return await this.serviceWorkerManager.isSubscribed();
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(subscriptionId?: string): Promise<boolean> {
    return await this.serviceWorkerManager.unsubscribeFromPush(subscriptionId);
  }

  /**
   * Send push notification
   */
  async sendPushNotification(
    event: MatrixEvent,
    room: Room,
    notificationType: NotificationType,
    subscriptions: PushSubscription[]
  ): Promise<void> {
    if (!this.config.enabled || subscriptions.length === 0) return;

    const notificationData = this.formatPushNotification(event, room, notificationType);
    const provider = this.providers.get('webpush');
    
    if (!provider) {
      console.error('No push provider available');
      return;
    }

    try {
      const results = await provider.send(subscriptions, notificationData);
      
      // Handle results
      const failed = results.filter(r => !r.success);
      const shouldUnsubscribe = results.filter(r => r.shouldUnsubscribe);

      if (failed.length > 0) {
        console.warn(`${failed.length} push notifications failed to send`);
      }

      if (shouldUnsubscribe.length > 0) {
        console.log(`${shouldUnsubscribe.length} subscriptions should be removed`);
        // In a real implementation, remove these subscriptions from storage
      }

      console.log(`Push notifications sent: ${results.length - failed.length}/${results.length}`);
    } catch (error) {
      console.error('Failed to send push notifications:', error);
    }
  }

  /**
   * Format push notification data from Matrix event
   */
  private formatPushNotification(
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
      icon: '/icons/haos-logo-192.png',
      badge: '/icons/haos-badge-72.png',
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
   * Add push provider
   */
  addProvider(provider: PushProvider): void {
    this.providers.set(provider.name, provider);
  }

  /**
   * Remove push provider
   */
  removeProvider(name: string): void {
    this.providers.delete(name);
  }

  /**
   * Get push provider
   */
  getProvider(name: string): PushProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Update service configuration
   */
  updateConfig(newConfig: Partial<PushServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): PushServiceConfig {
    return { ...this.config };
  }
}

// =============================================================================
// Service Worker Template
// =============================================================================

export const SERVICE_WORKER_TEMPLATE = `
// HAOS Push Notification Service Worker
// This handles background push notifications and user interactions

self.addEventListener('push', function(event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const notification = data.notification;
    
    event.waitUntil(
      self.registration.showNotification(notification.title, {
        body: notification.body,
        icon: notification.icon,
        badge: notification.badge,
        tag: notification.tag,
        data: notification.data,
        actions: notification.actions,
        requireInteraction: notification.requireInteraction,
        silent: notification.silent,
        timestamp: notification.timestamp,
        vibrate: notification.vibrate
      })
    );
  } catch (error) {
    console.error('Error handling push event:', error);
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const data = event.notification.data;
  const action = event.action;

  if (action === 'dismiss') {
    return; // Just close the notification
  }

  // Handle view action or notification click
  if (data && data.url) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clients) {
        // Try to focus existing window
        for (let client of clients) {
          if (client.url.includes(data.roomId) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(data.url);
        }
      })
    );
  }
});

self.addEventListener('notificationclose', function(event) {
  // Track notification dismissal analytics if needed
  console.log('Notification closed:', event.notification.tag);
});
`;

// =============================================================================
// Singleton Instance
// =============================================================================

let pushService: PushNotificationService | null = null;

/**
 * Get singleton push service instance
 */
export function getPushService(config?: PushServiceConfig): PushNotificationService {
  if (!pushService) {
    if (!config) {
      // Default configuration - disabled by default
      config = {
        enabled: false, // Enable when VAPID keys are configured
        serviceWorkerPath: '/sw.js',
        apiEndpoint: '/api/notifications/push'
      };
    }
    pushService = new PushNotificationService(config);
  }
  return pushService;
}

/**
 * Create service worker file
 */
export function createServiceWorkerFile(): string {
  return SERVICE_WORKER_TEMPLATE;
}