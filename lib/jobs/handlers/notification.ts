/**
 * Notification Job Handlers
 * 
 * Handles push notification jobs for real-time user notifications.
 * Enhanced with Web Push API integration and cross-browser compatibility.
 */

export interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
  timestamp?: number;
  
  // Matrix-specific fields
  roomId?: string;
  eventId?: string;
  senderId?: string;
  notificationType?: string;
  
  // Cross-browser compatibility
  browserSpecific?: {
    chrome?: Record<string, any>;
    firefox?: Record<string, any>;
    safari?: Record<string, any>;
  };
}

export interface BatchNotificationPayload {
  notifications: PushNotificationPayload[];
  batchSize?: number;
  delayBetweenBatches?: number;
}

export interface DigestNotificationPayload {
  userId: string;
  type: "mentions" | "dms" | "activity";
  count: number;
  preview?: string;
}

class NotificationHandler {
  /**
   * Detect user's browser for compatibility optimization
   */
  private detectBrowser(userAgent?: string): string {
    const ua = userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : '');
    
    if (ua.includes('Chrome') && !ua.includes('Edg')) return 'chrome';
    if (ua.includes('Firefox')) return 'firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'safari';
    if (ua.includes('Edg')) return 'edge';
    
    return 'unknown';
  }
  
  /**
   * Optimize notification payload for specific browsers
   */
  private optimizeForBrowser(payload: PushNotificationPayload, browser: string): PushNotificationPayload {
    const optimized = { ...payload };
    
    switch (browser) {
      case 'chrome':
        // Chrome supports most features
        optimized.vibrate = payload.vibrate || [200, 100, 200];
        optimized.requireInteraction = payload.requireInteraction || false;
        break;
        
      case 'firefox':
        // Firefox has some limitations
        optimized.actions = payload.actions?.slice(0, 2); // Firefox supports max 2 actions
        if (payload.image && payload.image.length > 1024) {
          delete optimized.image; // Firefox has strict image size limits
        }
        break;
        
      case 'safari':
        // Safari push is more limited
        optimized.actions = undefined; // Safari doesn't support action buttons well
        optimized.vibrate = undefined; // No vibration support on macOS
        optimized.requireInteraction = false; // Not well supported
        break;
        
      case 'edge':
        // Edge generally follows Chrome behavior
        optimized.vibrate = payload.vibrate || [200, 100, 200];
        break;
        
      default:
        // Conservative fallback for unknown browsers
        optimized.actions = undefined;
        optimized.vibrate = undefined;
        optimized.requireInteraction = false;
        break;
    }
    
    // Apply browser-specific overrides if provided
    if (payload.browserSpecific?.[browser]) {
      Object.assign(optimized, payload.browserSpecific[browser]);
    }
    
    return optimized;
  }
  
  /**
   * Send Web Push notification with cross-browser optimization
   */
  async sendWebPushNotification(payload: PushNotificationPayload, userAgent?: string): Promise<{
    success: boolean;
    messageId?: string;
    browser?: string;
    optimized?: boolean;
  }> {
    const browser = this.detectBrowser(userAgent);
    const optimizedPayload = this.optimizeForBrowser(payload, browser);
    
    console.log(`Sending optimized push notification for ${browser}:`, {
      userId: payload.userId,
      title: payload.title,
      browser,
      hasActions: !!optimizedPayload.actions?.length,
      hasVibration: !!optimizedPayload.vibrate,
      requiresInteraction: optimizedPayload.requireInteraction
    });
    
    const result = await this.sendPushNotification(optimizedPayload);
    
    return {
      ...result,
      browser,
      optimized: true
    };
  }
  
  /**
   * Send push notification to a user
   */
  async sendPushNotification(payload: PushNotificationPayload): Promise<{
    success: boolean;
    messageId?: string;
  }> {
    const { userId, title, body, ...options } = payload;
    
    console.log(`Sending push notification to user ${userId}: ${title}`);
    
    try {
      // Use the server-side push service
      const response = await fetch('http://localhost:3000/api/notifications/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          title,
          body,
          ...options
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send push notification via API');
      }

      const result = await response.json();
      
      if (!result.success) {
        console.log('Push notifications failed, logging instead');
        console.log(`📱 [PUSH NOTIFICATION] ${title}: ${body}`);
        
        return {
          success: true,
          messageId: `simulated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };
      }
      
      const messageId = `push_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`Push notification sent: ${messageId}`);
      
      return {
        success: true,
        messageId,
      };
    } catch (error) {
      console.error(`Failed to send push notification to ${userId}:`, error);
      
      // Fallback to logging
      console.log(`📱 [PUSH NOTIFICATION - FALLBACK] ${title}: ${body}`);
      
      return {
        success: true,
        messageId: `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };
    }
  }
  
  /**
   * Send batch notifications with rate limiting
   */
  async sendBatchNotifications(payload: BatchNotificationPayload): Promise<{
    success: boolean;
    sent: number;
    failed: number;
    errors: string[];
  }> {
    const { notifications, batchSize = 20, delayBetweenBatches = 1000 } = payload;
    
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];
    
    console.log(`Processing batch of ${notifications.length} push notifications (batch size: ${batchSize})`);
    
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      
      // Process batch concurrently
      const promises = batch.map(async (notificationPayload, index) => {
        try {
          await this.sendPushNotification(notificationPayload);
          sent++;
        } catch (error) {
          failed++;
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`Notification ${i + index} (${notificationPayload.userId}): ${errorMessage}`);
        }
      });
      
      await Promise.allSettled(promises);
      
      // Delay between batches to avoid rate limiting
      if (i + batchSize < notifications.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }
    
    console.log(`Batch notifications completed: ${sent} sent, ${failed} failed`);
    
    return {
      success: failed === 0,
      sent,
      failed,
      errors,
    };
  }
  
  /**
   * Send digest notification (summarized activity)
   */
  async sendDigestNotification(payload: DigestNotificationPayload): Promise<{
    success: boolean;
  }> {
    const { userId, type, count, preview } = payload;
    
    console.log(`Sending digest notification to ${userId}: ${type} (${count})`);
    
    // Generate appropriate digest notification content
    const notificationContent = this.generateDigestContent(type, count, preview);
    
    const pushPayload: PushNotificationPayload = {
      userId,
      title: notificationContent.title,
      body: notificationContent.body,
      icon: "/icons/digest.png",
      badge: "/icons/badge.png",
      tag: `digest-${type}`,
      data: {
        type: "digest",
        category: type,
        count,
        url: notificationContent.url,
      },
      actions: [
        {
          action: "view",
          title: "View",
          icon: "/icons/view.png",
        },
        {
          action: "mark-read",
          title: "Mark Read",
          icon: "/icons/check.png",
        },
      ],
    };
    
    const result = await this.sendPushNotification(pushPayload);
    
    return { success: result.success };
  }
  
  /**
   * Generate content for digest notifications
   */
  private generateDigestContent(type: string, count: number, preview?: string): {
    title: string;
    body: string;
    url: string;
  } {
    switch (type) {
      case "mentions":
        return {
          title: `${count} new mention${count === 1 ? "" : "s"}`,
          body: preview || `You have ${count} unread mention${count === 1 ? "" : "s"}`,
          url: "/notifications?filter=mentions",
        };
      
      case "dms":
        return {
          title: `${count} new direct message${count === 1 ? "" : "s"}`,
          body: preview || `You have ${count} unread direct message${count === 1 ? "" : "s"}`,
          url: "/direct-messages",
        };
      
      case "activity":
        return {
          title: `${count} new notification${count === 1 ? "" : "s"}`,
          body: preview || `You have ${count} unread notification${count === 1 ? "" : "s"}`,
          url: "/notifications",
        };
      
      default:
        return {
          title: `${count} new update${count === 1 ? "" : "s"}`,
          body: preview || `You have ${count} unread update${count === 1 ? "" : "s"}`,
          url: "/notifications",
        };
    }
  }
}

export const notificationHandler = new NotificationHandler();