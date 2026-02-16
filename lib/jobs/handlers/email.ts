/**
 * Email Job Handlers
 * 
 * Handles email-related background jobs like sending emails, batch emails, and digests.
 */

import { jobQueue } from "../queue";

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
  /**
   * Send a single email
   */
  async sendEmail(payload: SendEmailPayload): Promise<{ success: boolean; messageId?: string }> {
    try {
      console.log(`Sending email to ${Array.isArray(payload.to) ? payload.to.join(", ") : payload.to}`);
      console.log(`Subject: ${payload.subject}`);
      
      // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
      // For now, we'll simulate sending
      
      // If using the existing email service from the notifications module
      // const emailService = await import("@/lib/notifications/email-service");
      // const result = await emailService.sendEmail(payload);
      
      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`Email sent successfully: ${messageId}`);
      
      return {
        success: true,
        messageId,
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
    
    // TODO: Get user email and preferences
    // const user = await getUserProfile(userId);
    // if (!user.email || !user.emailNotifications) {
    //   console.log(`User ${userId} doesn't have email or notifications disabled`);
    //   return { success: true }; // Not an error
    // }
    
    // Generate digest content
    const digestContent = this.generateDigestContent(content, type);
    
    const emailPayload: SendEmailPayload = {
      to: `user-${userId}@example.com`, // TODO: Get actual email
      subject: `Your ${type} HAOS digest`,
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
          <title>Your ${type} HAOS Digest</title>
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
            <h1>Your ${type} HAOS Digest</h1>
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
Your ${type} HAOS Digest

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

export const emailHandler = new EmailHandler();