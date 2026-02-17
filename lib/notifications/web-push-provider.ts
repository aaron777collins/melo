/**
 * Web Push Provider Implementation
 * Implements actual Web Push API with VAPID keys using web-push library
 */

import webpush from 'web-push';
import { PushProvider, PushSubscription, PushNotificationData, PushResult } from './push-service';

export interface WebPushConfig {
  vapidPublicKey: string;
  vapidPrivateKey: string;
  vapidSubject: string;
}

export class WebPushProvider implements PushProvider {
  name = "webpush";
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

  async send(subscriptions: PushSubscription[], data: PushNotificationData): Promise<PushResult[]> {
    const results: PushResult[] = [];
    
    // Prepare the payload
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
  async validateSubscription(subscription: PushSubscription): Promise<boolean> {
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
   * Get GCM API key if needed (for backward compatibility)
   */
  static setGCMAPIKey(apiKey: string): void {
    webpush.setGCMAPIKey(apiKey);
  }
}

/**
 * Factory function to create WebPushProvider with environment variables
 */
export function createWebPushProvider(): WebPushProvider | null {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:contact@aaroncollins.info';

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('VAPID keys not configured. Web Push notifications disabled.');
    return null;
  }

  return new WebPushProvider({
    vapidPublicKey,
    vapidPrivateKey,
    vapidSubject
  });
}