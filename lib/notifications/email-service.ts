/**
 * Email Notification Service
 * 
 * Handles sending email notifications for offline users.
 * Integrates with the Matrix notification system to provide
 * email fallback when users are not actively using the app.
 */

import { MatrixEvent, Room } from "matrix-js-sdk";
import { NotificationType, type NotificationSettings } from "@/lib/matrix/notifications";

// =============================================================================
// Types
// =============================================================================

export interface EmailNotificationData {
  to: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  metadata?: {
    roomId: string;
    eventId: string;
    notificationType: NotificationType;
  };
}

export interface EmailTemplate {
  id: string;
  type: NotificationType;
  subject: string;
  htmlTemplate: string;
  textTemplate: string;
}

export interface EmailServiceConfig {
  enabled: boolean;
  apiEndpoint: string;
  apiKey?: string;
  fromEmail: string;
  fromName: string;
  batchingDelayMs: number; // Delay before sending to batch notifications
  maxBatchSize: number;
}

// =============================================================================
// Email Templates
// =============================================================================

const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "dm_default",
    type: NotificationType.DirectMessage,
    subject: "New message from {sender} - HAOS",
    htmlTemplate: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px 8px 0 0; color: white;">
          <h1 style="margin: 0; font-size: 24px;">HAOS</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">New Direct Message</p>
        </div>
        
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; padding: 24px;">
          <div style="display: flex; align-items: center; margin-bottom: 16px;">
            {avatar}
            <div style="margin-left: 12px;">
              <div style="font-weight: 600; color: #1f2937;">{sender}</div>
              <div style="color: #6b7280; font-size: 14px;">{timestamp}</div>
            </div>
          </div>
          
          <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0; color: #374151; line-height: 1.5;">{message}</p>
          </div>
          
          <div style="text-align: center; margin-top: 24px;">
            <a href="{roomLink}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
              Reply in HAOS
            </a>
          </div>
          
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center;">
            <p>You received this because you have email notifications enabled for direct messages.</p>
            <a href="{settingsLink}" style="color: #3b82f6;">Manage notification settings</a>
          </div>
        </div>
      </div>
    `,
    textTemplate: `
HAOS - New Direct Message

From: {sender}
Time: {timestamp}

{message}

Reply in HAOS: {roomLink}

---
You received this because you have email notifications enabled for direct messages.
Manage settings: {settingsLink}
    `
  },
  {
    id: "mention_default",
    type: NotificationType.Mention,
    subject: "{sender} mentioned you in {room} - HAOS",
    htmlTemplate: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; border-radius: 8px 8px 0 0; color: white;">
          <h1 style="margin: 0; font-size: 24px;">HAOS</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">You were mentioned</p>
        </div>
        
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; padding: 24px;">
          <div style="display: flex; align-items: center; margin-bottom: 16px;">
            {avatar}
            <div style="margin-left: 12px;">
              <div style="font-weight: 600; color: #1f2937;">{sender}</div>
              <div style="color: #6b7280; font-size: 14px;">in {room} • {timestamp}</div>
            </div>
          </div>
          
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; color: #374151; line-height: 1.5;">{message}</p>
          </div>
          
          <div style="text-align: center; margin-top: 24px;">
            <a href="{roomLink}" style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
              View in HAOS
            </a>
          </div>
          
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center;">
            <p>You received this because you have email notifications enabled for mentions.</p>
            <a href="{settingsLink}" style="color: #f59e0b;">Manage notification settings</a>
          </div>
        </div>
      </div>
    `,
    textTemplate: `
HAOS - You were mentioned

From: {sender}
Room: {room}
Time: {timestamp}

{message}

View in HAOS: {roomLink}

---
You received this because you have email notifications enabled for mentions.
Manage settings: {settingsLink}
    `
  },
  {
    id: "invite_default",
    type: NotificationType.RoomInvite,
    subject: "{sender} invited you to {room} - HAOS",
    htmlTemplate: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 8px 8px 0 0; color: white;">
          <h1 style="margin: 0; font-size: 24px;">HAOS</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">Room Invitation</p>
        </div>
        
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; padding: 24px;">
          <div style="display: flex; align-items: center; margin-bottom: 16px;">
            {avatar}
            <div style="margin-left: 12px;">
              <div style="font-weight: 600; color: #1f2937;">{sender}</div>
              <div style="color: #6b7280; font-size: 14px;">{timestamp}</div>
            </div>
          </div>
          
          <div style="background: #f0fdfa; border: 1px solid #14b8a6; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: center;">
            <h3 style="margin: 0 0 8px 0; color: #0d9488;">You're invited to join</h3>
            <div style="font-size: 18px; font-weight: 600; color: #1f2937;">{room}</div>
          </div>
          
          <div style="text-align: center; margin-top: 24px;">
            <a href="{roomLink}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin-right: 12px;">
              Accept Invitation
            </a>
            <a href="{declineLink}" style="background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
              Decline
            </a>
          </div>
          
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center;">
            <p>You received this because you have email notifications enabled for room invitations.</p>
            <a href="{settingsLink}" style="color: #10b981;">Manage notification settings</a>
          </div>
        </div>
      </div>
    `,
    textTemplate: `
HAOS - Room Invitation

{sender} invited you to join: {room}
Time: {timestamp}

Accept invitation: {roomLink}
Decline invitation: {declineLink}

---
You received this because you have email notifications enabled for room invitations.
Manage settings: {settingsLink}
    `
  }
];

// =============================================================================
// Email Service Implementation
// =============================================================================

export class EmailNotificationService {
  private config: EmailServiceConfig;
  private templates: Map<string, EmailTemplate> = new Map();
  private pendingNotifications: EmailNotificationData[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;

  constructor(config: EmailServiceConfig) {
    this.config = config;
    
    // Load default templates
    DEFAULT_EMAIL_TEMPLATES.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Check if email notifications should be sent for this event
   */
  shouldSendEmail(
    event: MatrixEvent,
    settings: NotificationSettings,
    notificationType: NotificationType,
    userEmail?: string
  ): boolean {
    // Email notifications disabled
    if (!this.config.enabled || !userEmail) return false;
    
    // User disabled email notifications
    if (!settings.enabled) return false;
    
    // Check specific notification type settings
    switch (notificationType) {
      case NotificationType.DirectMessage:
        return settings.directMessages;
      case NotificationType.Mention:
      case NotificationType.KeywordHighlight:
        return settings.mentions;
      case NotificationType.RoomInvite:
        return settings.roomInvites;
      case NotificationType.ThreadReply:
        return settings.threadReplies;
      default:
        return false;
    }
  }

  /**
   * Send email notification for Matrix event
   */
  async sendNotification(
    event: MatrixEvent,
    room: Room,
    notificationType: NotificationType,
    userEmail: string,
    baseUrl: string
  ): Promise<void> {
    const template = this.findTemplate(notificationType);
    if (!template) return;

    const emailData = this.formatEmailFromEvent(
      event, 
      room, 
      notificationType, 
      template, 
      userEmail, 
      baseUrl
    );

    if (this.config.batchingDelayMs > 0) {
      // Add to batch
      this.pendingNotifications.push(emailData);
      this.scheduleBatchSend();
    } else {
      // Send immediately
      await this.sendEmailData(emailData);
    }
  }

  /**
   * Format email content from Matrix event
   */
  private formatEmailFromEvent(
    event: MatrixEvent,
    room: Room,
    notificationType: NotificationType,
    template: EmailTemplate,
    userEmail: string,
    baseUrl: string
  ): EmailNotificationData {
    const sender = event.getSender() || "Unknown user";
    const senderName = room.getMember(sender)?.name || sender;
    const roomName = room.name || "Unknown room";
    const messageContent = event.getContent().body || "";
    const timestamp = new Date(event.getTs()).toLocaleString();
    
    // Create avatar HTML (simplified for now)
    const avatarHtml = `<div style="width: 40px; height: 40px; border-radius: 50%; background: #6b7280; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">${senderName.charAt(0).toUpperCase()}</div>`;
    
    // Build links
    const roomLink = `${baseUrl}/rooms/${room.roomId}${event.getId() ? `#${event.getId()}` : ''}`;
    const settingsLink = `${baseUrl}/settings/notifications`;
    const declineLink = `${baseUrl}/api/invites/${room.roomId}/decline`; // For invites
    
    // Template variables
    const variables = {
      '{sender}': senderName,
      '{room}': roomName,
      '{message}': messageContent,
      '{timestamp}': timestamp,
      '{avatar}': avatarHtml,
      '{roomLink}': roomLink,
      '{settingsLink}': settingsLink,
      '{declineLink}': declineLink
    };

    // Replace variables in templates
    let subject = template.subject;
    let htmlContent = template.htmlTemplate;
    let textContent = template.textTemplate;

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(key.replace(/[{}]/g, '\\$&'), 'g');
      subject = subject.replace(regex, value);
      htmlContent = htmlContent.replace(regex, value);
      textContent = textContent.replace(regex, value);
    });

    return {
      to: userEmail,
      subject,
      htmlContent,
      textContent,
      metadata: {
        roomId: room.roomId,
        eventId: event.getId()!,
        notificationType
      }
    };
  }

  /**
   * Schedule batch sending of notifications
   */
  private scheduleBatchSend(): void {
    if (this.batchTimeout) return;

    this.batchTimeout = setTimeout(() => {
      this.sendBatchedNotifications();
      this.batchTimeout = null;
    }, this.config.batchingDelayMs);
  }

  /**
   * Send batched notifications
   */
  private async sendBatchedNotifications(): Promise<void> {
    if (this.pendingNotifications.length === 0) return;

    // Group by recipient for batching
    const byRecipient = this.pendingNotifications.reduce((acc, notification) => {
      if (!acc[notification.to]) acc[notification.to] = [];
      acc[notification.to].push(notification);
      return acc;
    }, {} as Record<string, EmailNotificationData[]>);

    // Send batches
    const sendPromises = Object.entries(byRecipient).map(async ([email, notifications]) => {
      if (notifications.length === 1) {
        return this.sendEmailData(notifications[0]);
      } else {
        return this.sendBatchedEmail(email, notifications);
      }
    });

    await Promise.allSettled(sendPromises);
    this.pendingNotifications = [];
  }

  /**
   * Send single email
   */
  private async sendEmailData(emailData: EmailNotificationData): Promise<void> {
    try {
      const response = await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify({
          from: {
            email: this.config.fromEmail,
            name: this.config.fromName
          },
          to: [{ email: emailData.to }],
          subject: emailData.subject,
          html: emailData.htmlContent,
          text: emailData.textContent,
          metadata: emailData.metadata
        })
      });

      if (!response.ok) {
        throw new Error(`Email API error: ${response.status}`);
      }

      console.log('Email notification sent successfully:', emailData.to);
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }

  /**
   * Send batched email with multiple notifications
   */
  private async sendBatchedEmail(to: string, notifications: EmailNotificationData[]): Promise<void> {
    const count = notifications.length;
    const subject = `You have ${count} new notifications - HAOS`;
    
    // Create summary email
    const htmlParts = notifications.map(n => 
      `<div style="border-bottom: 1px solid #e5e7eb; padding: 16px 0;">${n.htmlContent}</div>`
    ).join('');
    
    const textParts = notifications.map(n => 
      `${n.subject}\n${n.textContent}\n${'='.repeat(50)}`
    ).join('\n\n');

    const batchedEmail: EmailNotificationData = {
      to,
      subject,
      htmlContent: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <h2>You have ${count} new notifications</h2>
          ${htmlParts}
        </div>
      `,
      textContent: `You have ${count} new notifications\n\n${textParts}`
    };

    await this.sendEmailData(batchedEmail);
  }

  /**
   * Find template for notification type
   */
  private findTemplate(type: NotificationType): EmailTemplate | undefined {
    const customId = `${type}_custom`;
    const defaultId = `${type}_default`;
    
    return this.templates.get(customId) || this.templates.get(defaultId);
  }

  /**
   * Add or update email template
   */
  setTemplate(template: EmailTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Get email template
   */
  getTemplate(templateId: string): EmailTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Get all templates
   */
  getTemplates(): EmailTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Update service configuration
   */
  updateConfig(newConfig: Partial<EmailServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): EmailServiceConfig {
    return { ...this.config };
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let emailService: EmailNotificationService | null = null;

/**
 * Get singleton email service instance
 */
export function getEmailService(config?: EmailServiceConfig): EmailNotificationService {
  if (!emailService) {
    if (!config) {
      // Default configuration - disabled by default
      config = {
        enabled: false,
        apiEndpoint: '/api/notifications/email',
        fromEmail: 'noreply@haos.example.com',
        fromName: 'HAOS Notifications',
        batchingDelayMs: 300000, // 5 minutes
        maxBatchSize: 10
      };
    }
    emailService = new EmailNotificationService(config);
  }
  return emailService;
}