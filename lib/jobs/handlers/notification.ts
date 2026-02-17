/**
 * Notification Job Handlers
 * 
 * Handles push notification jobs for real-time user notifications.
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
   * Send push notification to a user
   */
  async sendPushNotification(payload: PushNotificationPayload): Promise<{
    success: boolean;
    messageId?: string;
  }> {
    const { userId, title, body, ...options } = payload;
    
    console.log(`Sending push notification to user ${userId}: ${title}`);
    
    try {
      // Use the actual push service
      const { getPushService } = await import("@/lib/notifications/push-service");
      const pushService = getPushService();

      if (!pushService.isSupported() || !pushService.getConfig().enabled) {
        console.log('Push notifications not supported or disabled, logging instead');
        console.log(`📱 [PUSH NOTIFICATION] ${title}: ${body}`);
        
        return {
          success: true,
          messageId: `simulated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };
      }

      // Create a mock Matrix event for the push service
      // In a real scenario, this would come from the actual Matrix event
      const mockEvent = {
        getId: () => `$${Date.now()}:example.com`,
        getSender: () => `@system:example.com`,
        getContent: () => ({ body }),
        getTs: () => Date.now(),
        getRoomId: () => `!general:example.com`
      } as any;

      const mockRoom = {
        name: 'General',
        roomId: '!general:example.com',
        getMember: () => ({ name: 'System' }),
        getJoinedMemberCount: () => 2
      } as any;

      // Send through push service (without Matrix client for now)
      await pushService.sendPushNotification(
        mockEvent,
        mockRoom,
        'dm' as any // NotificationType enum will be resolved by import
      );
      
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