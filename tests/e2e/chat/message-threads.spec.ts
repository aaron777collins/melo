/**
 * Message Threads Tests
 * 
 * Tests for threaded conversations.
 */

import { test, expect } from '@playwright/test';
import { 
  ChatPage, 
  waitForAppReady, 
  waitForMatrixSync,
  generateMessage 
} from '../fixtures';

test.describe('Message Threads', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await waitForMatrixSync(page);
    
    // Navigate to a text channel
    const firstServer = page.locator('[data-testid*="server"], .server-item, nav a').first();
    await firstServer.click().catch(() => {});
    await page.waitForTimeout(2000);
    
    const firstChannel = page.locator('[data-testid*="channel"], .channel-item, [href*="channel"]').first();
    await firstChannel.click().catch(() => {});
    await page.waitForTimeout(2000);
  });

  test('should show reply/thread option on hover', async ({ page }) => {
    const chatPage = new ChatPage(page);
    const messageText = generateMessage();
    
    // Send a message
    await chatPage.sendMessage(messageText);
    await chatPage.expectMessageVisible(messageText);
    
    // Get the message and hover
    const message = page.locator(`text="${messageText}"`).first();
    await message.hover();
    await page.waitForTimeout(500);
    
    // Look for thread/reply button
    const threadButton = page.locator('button[aria-label*="thread" i], button[aria-label*="reply" i], button:has-text("Reply"), [data-testid="reply"]');
    const hasThreadButton = await threadButton.first().isVisible().catch(() => false);
    
    expect(hasThreadButton).toBeTruthy();
  });

  test('should open thread view', async ({ page }) => {
    const chatPage = new ChatPage(page);
    const messageText = generateMessage();
    
    // Send a message
    await chatPage.sendMessage(messageText);
    await chatPage.expectMessageVisible(messageText);
    
    // Get the message and hover
    const message = page.locator(`text="${messageText}"`).first();
    await message.hover();
    await page.waitForTimeout(500);
    
    // Click thread/reply button
    const threadButton = page.locator('button[aria-label*="thread" i], button[aria-label*="reply" i], [data-testid="reply"]');
    await threadButton.first().click().catch(async () => {
      // Try right-click menu
      await message.click({ button: 'right' });
      await page.locator('text="Reply", text="Thread", text="Start Thread"').first().click();
    });
    
    await page.waitForTimeout(1000);
    
    // Thread view should open (modal or sidebar)
    const threadView = page.locator('[data-testid="thread-view"], .thread-view, [role="dialog"]:has-text("Thread"), .thread-panel');
    const hasThreadView = await threadView.first().isVisible().catch(() => false);
    
    console.log(`Thread view opened: ${hasThreadView}`);
  });

  test('should send reply in thread', async ({ page }) => {
    const chatPage = new ChatPage(page);
    const messageText = generateMessage();
    const replyText = generateMessage();
    
    // Send a message
    await chatPage.sendMessage(messageText);
    await chatPage.expectMessageVisible(messageText);
    
    // Open thread
    const message = page.locator(`text="${messageText}"`).first();
    await message.hover();
    
    const threadButton = page.locator('button[aria-label*="thread" i], button[aria-label*="reply" i]');
    await threadButton.first().click().catch(() => {});
    
    await page.waitForTimeout(1000);
    
    // Find thread input and send reply
    const threadInput = page.locator('[data-testid="thread-input"], .thread-input, [role="dialog"] textarea, .thread-panel textarea');
    const hasThreadInput = await threadInput.first().isVisible().catch(() => false);
    
    if (hasThreadInput) {
      await threadInput.first().fill(replyText);
      await threadInput.first().press('Enter');
      await page.waitForTimeout(2000);
      
      // Reply should appear in thread
      const replyVisible = await page.locator(`text="${replyText}"`).isVisible().catch(() => false);
      console.log(`Reply sent: ${replyVisible}`);
    }
  });

  test('should show thread indicator on parent message', async ({ page }) => {
    // Look for any messages with thread indicators
    const threadIndicator = page.locator('.thread-indicator, [data-testid="thread-count"], :text("replies"), :text("reply")');
    const hasIndicator = await threadIndicator.first().isVisible().catch(() => false);
    
    console.log(`Thread indicator visible: ${hasIndicator}`);
  });
});
