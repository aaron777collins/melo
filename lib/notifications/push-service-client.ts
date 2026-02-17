/**
 * Client-Side Push Service
 * 
 * This module handles service worker registration and push subscription
 * on the client side WITHOUT importing the web-push library.
 * Safe to import in client components and hooks.
 */

"use client";

// =============================================================================
// Client-safe Types
// =============================================================================

export interface ClientPushSubscription {
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

export interface ServiceWorkerConfig {
  serviceWorkerPath: string;
  scope: string;
}

// =============================================================================
// Service Worker Manager (Client-side only)
// =============================================================================

export class ClientServiceWorkerManager {
  private config: ServiceWorkerConfig;

  constructor(config: ServiceWorkerConfig = { serviceWorkerPath: '/sw.js', scope: '/' }) {
    this.config = config;
  }

  /**
   * Check if service workers are supported
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' && 
           'serviceWorker' in navigator && 
           'PushManager' in window &&
           'Notification' in window;
  }

  /**
   * Check if notifications are supported and permission is granted
   */
  hasPermission(): boolean {
    return this.isSupported() && Notification.permission === 'granted';
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      throw new Error('Notifications not supported in this browser');
    }

    return await Notification.requestPermission();
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
        scope: this.config.scope
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
      const registration = await navigator.serviceWorker.getRegistration(this.config.scope);
      return registration || null;
    } catch (error) {
      console.error('Failed to get service worker registration:', error);
      return null;
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(userId: string, deviceId: string): Promise<ClientPushSubscription | null> {
    if (!this.hasPermission()) {
      throw new Error('Notification permission not granted');
    }

    // Get VAPID public key from the server
    const vapidPublicKey = await this.getVapidPublicKey();
    if (!vapidPublicKey) {
      throw new Error('VAPID public key not available');
    }

    const registration = await this.getRegistration();
    if (!registration) {
      throw new Error('Service worker not registered');
    }

    try {
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
      });

      const pushSubscription: ClientPushSubscription = {
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

      return pushSubscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPush(): Promise<boolean> {
    const registration = await this.getRegistration();
    if (!registration) return false;

    try {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        return await subscription.unsubscribe();
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

  /**
   * Get VAPID public key from server
   */
  private async getVapidPublicKey(): Promise<string | null> {
    try {
      const response = await fetch('/api/notifications/vapid-key');
      if (!response.ok) {
        console.error('Failed to fetch VAPID public key');
        return null;
      }
      
      const data = await response.json();
      return data.publicKey || null;
    } catch (error) {
      console.error('Error fetching VAPID public key:', error);
      return null;
    }
  }

  // Helper methods for key conversion
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
}

// =============================================================================
// Client Push Service
// =============================================================================

export class ClientPushNotificationService {
  private serviceWorkerManager: ClientServiceWorkerManager;

  constructor() {
    this.serviceWorkerManager = new ClientServiceWorkerManager();
  }

  /**
   * Initialize push notification service
   */
  async initialize(): Promise<void> {
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
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    return await this.serviceWorkerManager.requestPermission();
  }

  /**
   * Subscribe to push notifications and register with server
   */
  async subscribe(userId: string, deviceId: string): Promise<boolean> {
    try {
      // Ensure service worker is registered
      await this.serviceWorkerManager.registerServiceWorker();

      // Subscribe to push notifications
      const subscription = await this.serviceWorkerManager.subscribeToPush(userId, deviceId);
      if (!subscription) {
        throw new Error('Failed to create push subscription');
      }

      // Register subscription with server
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          deviceId,
          subscription: subscription.subscription,
          userAgent: subscription.userAgent
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to register subscription with server');
      }

      console.log('Successfully subscribed to push notifications');
      return true;

    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(deviceId: string): Promise<boolean> {
    try {
      // Unsubscribe from push manager
      const success = await this.serviceWorkerManager.unsubscribeFromPush();
      
      if (success) {
        // Remove from server
        const response = await fetch(`/api/notifications/subscribe?deviceId=${deviceId}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          console.warn('Failed to remove subscription from server, but local unsubscription succeeded');
        }
      }

      return success;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  /**
   * Check if user is subscribed
   */
  async isSubscribed(): Promise<boolean> {
    return await this.serviceWorkerManager.isSubscribed();
  }

  /**
   * Send test notification via API
   */
  async sendTestNotification(userId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/notifications/push?userId=${encodeURIComponent(userId)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send test notification');
      }

      const result = await response.json();
      console.log('Test notification sent:', result);
      return result.success;

    } catch (error) {
      console.error('Failed to send test notification:', error);
      throw error;
    }
  }
}

// =============================================================================
// Singleton Instance (Client-side)
// =============================================================================

let clientPushService: ClientPushNotificationService | null = null;

/**
 * Get singleton client push service instance
 * Safe to call from client components and hooks
 */
export function getClientPushService(): ClientPushNotificationService {
  if (!clientPushService) {
    clientPushService = new ClientPushNotificationService();
  }
  return clientPushService;
}

// =============================================================================
// Service Worker Template (for reference)
// =============================================================================

export const SERVICE_WORKER_TEMPLATE = `
// Melo Push Notification Service Worker
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
          if (client.url.includes(data.roomId || '') && 'focus' in client) {
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