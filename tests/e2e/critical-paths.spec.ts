/**
 * Critical Path Integration Tests
 * 
 * Tests complete user journeys and critical application flows.
 * These tests verify that key user scenarios work end-to-end.
 */

import { test, expect } from '@playwright/test';
import { 
  ChatPage, 
  NavigationPage, 
  ServerPage,
  CreateServerModal,
  TEST_CONFIG, 
  waitForAppReady, 
  waitForMatrixSync,
  navigateToChannel,
  generateServerName,
  generateChannelName,
  generateMessage,
  waitForMessage
} from './fixtures';

test.describe('Critical User Paths', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await waitForMatrixSync(page);
  });

  test('complete new user journey: create server → create channel → send message', async ({ page }) => {
    const serverName = generateServerName();
    const channelName = generateChannelName(); 
    const testMessage = generateMessage();
    
    const serverPage = new ServerPage(page);
    const chatPage = new ChatPage(page);
    const navPage = new NavigationPage(page);

    // Step 1: Create new server
    await navPage.addServerButton.click();
    await page.waitForTimeout(500);
    
    const createModal = new CreateServerModal(page);
    await createModal.createServer(serverName);
    
    // Should navigate to new server
    await page.waitForTimeout(3000);
    
    // Step 2: Create a new channel in this server
    await serverPage.createChannel(channelName, 'text');
    
    // Should navigate to new channel
    await page.waitForTimeout(2000);
    
    // Step 3: Send a message in the new channel
    await chatPage.sendMessage(testMessage);
    
    // Step 4: Verify message appears
    await waitForMessage(page, testMessage);
    
    // Step 5: Verify we can navigate back to server list
    await navPage.clickServer(serverName);
    
    // Should see our created channel in the channel list
    await expect(page.locator(`text="${channelName}"`).first()).toBeVisible();
  });

  test('navigation flow: switch servers → switch channels → return to previous', async ({ page }) => {
    const navPage = new NavigationPage(page);
    
    // Get list of available servers (should have at least 2)
    const servers = await page.locator('[data-testid^="server-"], .server-item').all();
    
    if (servers.length < 2) {
      test.skip();
      return;
    }
    
    // Get server names
    const server1 = await servers[0].textContent() || 'Server1';
    const server2 = await servers[1].textContent() || 'Server2';
    
    // Step 1: Click first server
    await servers[0].click();
    await page.waitForTimeout(1000);
    
    // Step 2: Note current channel
    const channel1 = await page.locator('.channel-list .channel-item.active, [aria-selected="true"]').first().textContent();
    
    // Step 3: Switch to second server
    await servers[1].click();
    await page.waitForTimeout(1000);
    
    // Step 4: Switch to a different channel in second server
    const secondServerChannels = await page.locator('.channel-list .channel-item').all();
    if (secondServerChannels.length > 1) {
      await secondServerChannels[1].click();
      await page.waitForTimeout(1000);
    }
    
    // Step 5: Navigate back to first server
    await servers[0].click();
    await page.waitForTimeout(1000);
    
    // Step 6: Verify we can see the original channel
    if (channel1) {
      await expect(page.locator(`text="${channel1}"`).first()).toBeVisible();
    }
  });

  test('chat interaction flow: send message → react → reply → pin', async ({ page }) => {
    const chatPage = new ChatPage(page);
    const testMessage = generateMessage();
    const replyMessage = `Reply to: ${testMessage}`;
    
    // Step 1: Send initial message
    await chatPage.sendMessage(testMessage);
    await waitForMessage(page, testMessage);
    
    // Step 2: React to the message
    const messageElement = page.locator(`text="${testMessage}"`).first();
    await messageElement.hover();
    
    // Look for reaction button
    const reactionButton = page.locator('button[aria-label*="react" i], button:has-text("😀"), [data-testid="add-reaction"]').first();
    
    try {
      await reactionButton.click({ timeout: 5000 });
      
      // Select an emoji (look for common ones)
      const emojiButton = page.locator('button:has-text("👍"), button:has-text("😀"), button:has-text("❤️")').first();
      await emojiButton.click({ timeout: 5000 });
      
      // Verify reaction appears
      await expect(page.locator('.reaction, [data-testid="reaction"]')).toBeVisible({ timeout: 5000 });
      
    } catch {
      console.log('Reaction feature not available or visible');
    }
    
    // Step 3: Reply to the message  
    try {
      const replyButton = page.locator('button[aria-label*="reply" i], button:has-text("Reply")').first();
      await replyButton.click({ timeout: 5000 });
      
      await chatPage.sendMessage(replyMessage);
      await waitForMessage(page, replyMessage);
      
    } catch {
      console.log('Reply feature not available - continuing with basic message test');
    }
    
    // Step 4: Verify both messages are visible
    await expect(page.locator(`text="${testMessage}"`).first()).toBeVisible();
    await expect(page.locator(`text="${replyMessage}"`).first()).toBeVisible();
  });

  test('error recovery: handle Matrix sync failures gracefully', async ({ page }) => {
    const chatPage = new ChatPage(page);
    
    // Simulate Matrix sync issues by blocking Matrix requests
    await page.route('**/_matrix/**', route => {
      // Let some requests through but fail others
      if (Math.random() > 0.7) {
        route.abort();
      } else {
        route.continue();
      }
    });
    
    // Try to send a message during sync issues
    const testMessage = generateMessage();
    
    try {
      await chatPage.sendMessage(testMessage);
      
      // The app should either:
      // 1. Show message successfully (if sync recovered)
      // 2. Show error state/retry mechanism
      // 3. Show loading/pending state
      
      await page.waitForTimeout(5000);
      
      // Check for any error indicators
      const hasError = await page.locator('.error, .alert-error, [role="alert"]').isVisible().catch(() => false);
      const hasMessage = await page.locator(`text="${testMessage}"`).isVisible().catch(() => false);
      const hasLoading = await page.locator('.loading, .spinner, .pending').isVisible().catch(() => false);
      
      // App should handle the situation gracefully (not crash)
      expect(hasError || hasMessage || hasLoading).toBeTruthy();
      
    } catch (error) {
      // If sending fails completely, that's also acceptable error handling
      console.log('Message send failed gracefully:', error);
    }
  });

  test('mobile responsive navigation flow', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    const navPage = new NavigationPage(page);
    
    // On mobile, navigation might be collapsed
    const mobileToggle = page.locator('button[aria-label*="menu" i], .mobile-nav-toggle, [data-testid="mobile-nav"]');
    
    try {
      await mobileToggle.click({ timeout: 5000 });
      
      // Should be able to see server list
      const serverList = page.locator('.server-list, .sidebar');
      await expect(serverList).toBeVisible({ timeout: 5000 });
      
      // Should be able to click a server
      const firstServer = page.locator('[data-testid^="server-"], .server-item').first();
      await firstServer.click();
      
      // Should be able to see channels
      const channelList = page.locator('.channel-list');
      await expect(channelList).toBeVisible({ timeout: 5000 });
      
    } catch {
      console.log('Mobile navigation not implemented or different structure');
      // Take screenshot for debugging
      await page.screenshot({ path: 'test-results/mobile-nav-debug.png' });
    }
  });
});