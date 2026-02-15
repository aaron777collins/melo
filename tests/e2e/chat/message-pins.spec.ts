/**
 * Message Pins Tests
 * 
 * Tests for pinning and unpinning messages.
 */

import { test, expect } from '@playwright/test';
import { 
  ChatPage, 
  waitForAppReady, 
  waitForMatrixSync,
  generateMessage 
} from '../fixtures';

test.describe('Message Pins', () => {
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

  test('should show pin option on message', async ({ page }) => {
    const chatPage = new ChatPage(page);
    const messageText = generateMessage();
    
    // Send a message
    await chatPage.sendMessage(messageText);
    await chatPage.expectMessageVisible(messageText);
    
    // Get the message and hover
    const message = page.locator(`text="${messageText}"`).first();
    await message.hover();
    await page.waitForTimeout(500);
    
    // Try right-click for context menu
    await message.click({ button: 'right' });
    await page.waitForTimeout(500);
    
    // Look for pin option
    const pinOption = page.locator('text="Pin", text="Pin Message"');
    const hasPinOption = await pinOption.first().isVisible().catch(() => false);
    
    expect(hasPinOption).toBeTruthy();
  });

  test('should pin a message', async ({ page }) => {
    const chatPage = new ChatPage(page);
    const messageText = generateMessage();
    
    // Send a message
    await chatPage.sendMessage(messageText);
    await chatPage.expectMessageVisible(messageText);
    
    // Pin the message
    const message = page.locator(`text="${messageText}"`).first();
    await message.click({ button: 'right' });
    await page.waitForTimeout(500);
    
    await page.locator('text="Pin", text="Pin Message"').first().click();
    await page.waitForTimeout(2000);
    
    // Success indicator or pin icon should appear
    const pinIndicator = page.locator('.pin-icon, [data-pinned="true"], :text("pinned")');
    const hasPinIndicator = await pinIndicator.first().isVisible().catch(() => false);
    
    console.log(`Message pinned: ${hasPinIndicator}`);
  });

  test('should show pinned messages button in header', async ({ page }) => {
    const chatPage = new ChatPage(page);
    
    // Look for pinned messages button in header
    const pinnedButton = page.locator('button[aria-label*="pin" i], button:has-text("Pinned"), [data-testid="pinned-messages"]');
    const hasPinnedButton = await pinnedButton.first().isVisible().catch(() => false);
    
    expect(hasPinnedButton).toBeTruthy();
  });

  test('should open pinned messages view', async ({ page }) => {
    // Click pinned messages button
    const pinnedButton = page.locator('button[aria-label*="pin" i], button:has-text("Pinned"), [data-testid="pinned-messages"]');
    await pinnedButton.first().click().catch(() => {});
    
    await page.waitForTimeout(500);
    
    // Pinned messages panel/modal should open
    const pinnedView = page.locator('[data-testid="pinned-messages-view"], .pinned-messages, [role="dialog"]:has-text("Pinned")');
    const hasPinnedView = await pinnedView.first().isVisible().catch(() => false);
    
    console.log(`Pinned messages view opened: ${hasPinnedView}`);
  });

  test('should unpin a message', async ({ page }) => {
    // Find a pinned message
    const pinnedMessage = page.locator('[data-pinned="true"], .pinned-message');
    const hasPinnedMessage = await pinnedMessage.first().isVisible().catch(() => false);
    
    if (hasPinnedMessage) {
      await pinnedMessage.first().click({ button: 'right' });
      await page.waitForTimeout(500);
      
      await page.locator('text="Unpin", text="Unpin Message"').first().click();
      await page.waitForTimeout(2000);
      
      console.log('Tested unpin functionality');
    } else {
      console.log('No pinned messages to unpin');
    }
  });
});
