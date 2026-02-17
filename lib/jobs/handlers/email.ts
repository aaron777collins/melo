/**
 * Email Job Handlers
 * 
 * Handles email-related background jobs like sending emails, batch emails, and digests.
 */

import { jobQueue } from "../queue";
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { MatrixClient } from 'matrix-js-sdk';

// =============================================================================
// SMTP Configuration
// =============================================================================

interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

/**
 * Get SMTP configuration from environment variables
 */
function getSMTPConfig(): SMTPConfig | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    console.warn('SMTP configuration not complete. Email sending will be simulated.');
    return null;
  }

  return {
    host,
    port: parseInt(port, 10),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
    auth: { user, pass }
  };
}

/**
 * Create nodemailer transporter
 */
function createEmailTransporter(): Transporter | null {
  const config = getSMTPConfig();
  if (!config) return null;

  return nodemailer.createTransport(config);
}

// =============================================================================
// User Email Utilities
// =============================================================================

/**
 * Get user email from Matrix profile or account data
 * First tries account data, then profile, then returns null
 */
async function getUserEmail(matrixClient: MatrixClient, userId: string): Promise<string | null> {
  try {
    // Method 1: Try account data first (preferred location for email)
    try {
      // Use type assertion for custom account data key
      const accountData: any = await matrixClient.getAccountDataFromServer('m.email' as any);
      if (accountData && accountData.email) {
        console.log(`Found email in account data for ${userId}: ${accountData.email}`);
        return accountData.email;
      }
    } catch (error) {
      console.debug('No email found in account data:', error);
    }

    // Method 2: Try profile information
    try {
      const profile = await matrixClient.getProfileInfo(userId);
      // Check if profile has a custom email field
      if (profile && (profile as any).email) {
        console.log(`Found email in profile for ${userId}: ${(profile as any).email}`);
        return (profile as any).email;
      }
    } catch (error) {
      console.debug('Error getting profile info:', error);
    }

    // Method 3: If Matrix ID looks like an email, use that
    if (userId.includes('@') && userId.includes('.')) {
      const extractedEmail = userId.replace('@', '').split(':')[0] + '@' + userId.split(':')[1];
      if (extractedEmail.includes('@')) {
        console.log(`Using Matrix ID as email for ${userId}: ${extractedEmail}`);
        return extractedEmail;
      }
    }

    console.warn(`No email found for user ${userId}`);
    return null;
  } catch (error) {
    console.error(`Error getting email for user ${userId}:`, error);
    return null;
  }
}

// =============================================================================
// Types
// =============================================================================

export interface SendEmailPayload {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  templateData?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface BatchEmailPayload {
  emails: SendEmailPayload[];
  batchSize?: number;
  delayBetweenBatches?: number;
}

export interface DigestEmailPayload {
  userId: string;
  type: "daily" | "weekly";
  content: {
    notifications: any[];
    mentions: any[];
    directMessages: any[];
  };
}

class EmailHandler {
  private transporter: Transporter | null = null;
  private matrixClient: MatrixClient | null = null;

  constructor() {
    this.transporter = createEmailTransporter();
  }

  /**
   * Set Matrix client for user email lookups
   */
  setMatrixClient(client: MatrixClient): void {
    this.matrixClient = client;
  }

  /**
   * Send a single email using nodemailer
   */
  async sendEmail(payload: SendEmailPayload): Promise<{ success: boolean; messageId?: string }> {
    try {
      const recipients = Array.isArray(payload.to) ? payload.to.join(", ") : payload.to;
      console.log(`Sending email to ${recipients}`);
      console.log(`Subject: ${payload.subject}`);
      
      if (!this.transporter) {
        console.warn('Email transporter not configured. Simulating email send.');
        console.log('Email content (HTML):', payload.html || 'No HTML content');
        console.log('Email content (Text):', payload.text || 'No text content');
        
        // Return simulated success
        const messageId = `simulated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`Email simulated successfully: ${messageId}`);
        return { success: true, messageId };
      }

      // Prepare email options
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
        attachments: payload.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType
        }))
      };

      // Send the email
      const result = await this.transporter.sendMail(mailOptions);
      
      console.log(`Email sent successfully: ${result.messageId}`);
      
      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      console.error("Failed to send email:", error);
      throw error;
    }
  }
  
  /**
   * Send batch emails with rate limiting
   */
  async sendBatchEmails(payload: BatchEmailPayload): Promise<{
    success: boolean;
    sent: number;
    failed: number;
    errors: string[];
  }> {
    const { emails, batchSize = 10, delayBetweenBatches = 1000 } = payload;
    
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];
    
    console.log(`Processing batch of ${emails.length} emails (batch size: ${batchSize})`);
    
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      // Process batch concurrently
      const promises = batch.map(async (emailPayload, index) => {
        try {
          await this.sendEmail(emailPayload);
          sent++;
        } catch (error) {
          failed++;
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`Email ${i + index}: ${errorMessage}`);
        }
      });
      
      await Promise.allSettled(promises);
      
      // Delay between batches to avoid rate limiting
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }
    
    console.log(`Batch email completed: ${sent} sent, ${failed} failed`);
    
    return {
      success: failed === 0,
      sent,
      failed,
      errors,
    };
  }
  
  /**
   * Send digest email with aggregated content
   */
  async sendDigest(payload: DigestEmailPayload): Promise<{ success: boolean }> {
    const { userId, type, content } = payload;
    
    console.log(`Sending ${type} digest to user ${userId}`);
    
    // Get user email from Matrix client
    if (!this.matrixClient) {
      console.error('Matrix client not set. Cannot get user email.');
      return { success: false };
    }

    const userEmail = await getUserEmail(this.matrixClient, userId);
    if (!userEmail) {
      console.log(`User ${userId} doesn't have email configured. Skipping digest.`);
      return { success: true }; // Not an error - user just doesn't want email
    }

    // TODO: Check user email preferences (for now assume they want digests)
    // This would typically check Matrix account data for notification preferences
    
    // Generate digest content
    const digestContent = this.generateDigestContent(content, type);
    
    const emailPayload: SendEmailPayload = {
      to: userEmail,
      subject: `Your ${type} Melo digest`,
      html: digestContent.html,
      text: digestContent.text,
    };
    
    const result = await this.sendEmail(emailPayload);
    
    return { success: result.success };
  }
  
  /**
   * Generate HTML and text content for digest emails
   */
  private generateDigestContent(content: DigestEmailPayload["content"], type: string) {
    const { notifications, mentions, directMessages } = content;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Your ${type} Melo Digest</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { background: #5865f2; color: white; padding: 20px; border-radius: 8px; }
            .section { margin: 20px 0; padding: 15px; border-left: 3px solid #5865f2; }
            .count { font-weight: bold; color: #5865f2; }
            .item { margin: 10px 0; padding: 8px; background: #f8f9fa; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Your ${type} Melo Digest</h1>
            <p>Here's what happened while you were away</p>
          </div>
          
          ${notifications.length > 0 ? `
            <div class="section">
              <h2>📢 Notifications <span class="count">(${notifications.length})</span></h2>
              ${notifications.slice(0, 5).map(n => `
                <div class="item">
                  <strong>${n.title || "Notification"}</strong><br>
                  ${n.message || ""}
                </div>
              `).join("")}
              ${notifications.length > 5 ? `<p>And ${notifications.length - 5} more...</p>` : ""}
            </div>
          ` : ""}
          
          ${mentions.length > 0 ? `
            <div class="section">
              <h2>💬 Mentions <span class="count">(${mentions.length})</span></h2>
              ${mentions.slice(0, 5).map(m => `
                <div class="item">
                  <strong>@${m.sender || "someone"}</strong> mentioned you<br>
                  ${m.content || ""}
                </div>
              `).join("")}
              ${mentions.length > 5 ? `<p>And ${mentions.length - 5} more...</p>` : ""}
            </div>
          ` : ""}
          
          ${directMessages.length > 0 ? `
            <div class="section">
              <h2>💌 Direct Messages <span class="count">(${directMessages.length})</span></h2>
              ${directMessages.slice(0, 5).map(dm => `
                <div class="item">
                  <strong>${dm.sender || "Someone"}</strong><br>
                  ${dm.preview || "New message"}
                </div>
              `).join("")}
              ${directMessages.length > 5 ? `<p>And ${directMessages.length - 5} more...</p>` : ""}
            </div>
          ` : ""}
          
          <div style="margin-top: 30px; text-align: center; color: #666;">
            <p>You're receiving this because you have email digests enabled.</p>
            <p><a href="#unsubscribe">Manage your notification preferences</a></p>
          </div>
        </body>
      </html>
    `;
    
    const text = `
Your ${type} Melo Digest

${notifications.length > 0 ? `
Notifications (${notifications.length}):
${notifications.slice(0, 5).map(n => `- ${n.title || "Notification"}: ${n.message || ""}`).join("\n")}
${notifications.length > 5 ? `And ${notifications.length - 5} more...` : ""}
` : ""}

${mentions.length > 0 ? `
Mentions (${mentions.length}):
${mentions.slice(0, 5).map(m => `- @${m.sender || "someone"}: ${m.content || ""}`).join("\n")}
${mentions.length > 5 ? `And ${mentions.length - 5} more...` : ""}
` : ""}

${directMessages.length > 0 ? `
Direct Messages (${directMessages.length}):
${directMessages.slice(0, 5).map(dm => `- ${dm.sender || "Someone"}: ${dm.preview || "New message"}`).join("\n")}
${directMessages.length > 5 ? `And ${directMessages.length - 5} more...` : ""}
` : ""}

---
You're receiving this because you have email digests enabled.
Manage your notification preferences: [link]
    `;
    
    return { html, text };
  }
}

// =============================================================================
// Email Handler Instance and Initialization
// =============================================================================

export const emailHandler = new EmailHandler();

/**
 * Initialize the email handler with a Matrix client
 * This should be called at application startup
 */
export function initializeEmailHandler(matrixClient: MatrixClient): void {
  emailHandler.setMatrixClient(matrixClient);
  console.log('Email handler initialized with Matrix client');
}

/**
 * Get SMTP configuration status
 */
export function getEmailServiceStatus(): {
  configured: boolean;
  simulationMode: boolean;
  message: string;
} {
  const config = getSMTPConfig();
  if (!config) {
    return {
      configured: false,
      simulationMode: true,
      message: 'SMTP not configured. Email sending will be simulated. See .env.example for required variables.'
    };
  }
  
  return {
    configured: true,
    simulationMode: false,
    message: `SMTP configured for ${config.host}:${config.port}`
  };
}