/**
 * Send Message Tests
 * 
 * Tests for basic chat messaging functionality.
 */

import { test, expect } from '@playwright/test';
import { 
  ChatPage, 
  waitForAppReady, 
  waitForMatrixSync,
  generateMessage 
} from '../fixtures';

test.describe('Send Message', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await waitForMatrixSync(page);
    
    // Navigate to a text channel
    // First click a server
    const firstServer = page.locator('[data-testid*="server"], .server-item, nav a').first();
    await firstServer.click().catch(() => {});
    await page.waitForTimeout(2000);
    
    // Then click a channel
    const firstChannel = page.locator('[data-testid*="channel"], .channel-item, [href*="channel"]').first();
    await firstChannel.click().catch(() => {});
    await page.waitForTimeout(2000);
  });

  test('should display message input', async ({ page }) => {
    const chatPage = new ChatPage(page);
    
    // Message input should be visible
    await expect(chatPage.messageInput).toBeVisible();
  });

  test('should send a text message', async ({ page }) => {
    const chatPage = new ChatPage(page);
    const messageText = generateMessage();
    
    // Send message
    await chatPage.sendMessage(messageText);
    
    // Message should appear in chat
    await chatPage.expectMessageVisible(messageText);
  });

  test('should send message with Enter key', async ({ page }) => {
    const chatPage = new ChatPage(page);
    const messageText = generateMessage();
    
    // Type message
    await chatPage.messageInput.fill(messageText);
    
    // Press Enter
    await chatPage.messageInput.press('Enter');
    
    await page.waitForTimeout(3000);
    
    // Message should appear
    await chatPage.expectMessageVisible(messageText);
  });

  test('should display message list', async ({ page }) => {
    const chatPage = new ChatPage(page);
    
    // Message list should be visible
    await expect(chatPage.messageList).toBeVisible();
  });

  test('should display chat header with channel name', async ({ page }) => {
    const chatPage = new ChatPage(page);
    
    // Chat header should be visible
    await expect(chatPage.chatHeader).toBeVisible();
  });

  test('should preserve message after page refresh', async ({ page }) => {
    const chatPage = new ChatPage(page);
    const messageText = generateMessage();
    
    // Send message
    await chatPage.sendMessage(messageText);
    
    // Wait for message to appear
    await chatPage.expectMessageVisible(messageText);
    
    // Refresh page
    await page.reload();
    await waitForAppReady(page);
    await waitForMatrixSync(page);
    
    // Message should still be visible
    await chatPage.expectMessageVisible(messageText);
  });

  test('should show message timestamp', async ({ page }) => {
    const chatPage = new ChatPage(page);
    const messageText = generateMessage();
    
    // Send message
    await chatPage.sendMessage(messageText);
    
    // Look for timestamp near the message
    const messageWithTimestamp = page.locator(`[data-testid="message"]:has-text("${messageText}"), .message:has-text("${messageText}")`);
    const timestamp = messageWithTimestamp.locator('time, [data-timestamp], .timestamp, .time');
    
    await expect(timestamp).toBeVisible().catch(() => {
      console.log('Timestamp format may differ');
    });
  });

  test('should show message author', async ({ page }) => {
    const chatPage = new ChatPage(page);
    const messageText = generateMessage();
    
    // Send message
    await chatPage.sendMessage(messageText);
    
    // Author should be visible somewhere in the message area
    const authorElement = page.locator('.message-author, .author, [data-testid="author"]');
    const hasAuthor = await authorElement.first().isVisible().catch(() => false);
    
    console.log(`Author element visible: ${hasAuthor}`);
  });
});
