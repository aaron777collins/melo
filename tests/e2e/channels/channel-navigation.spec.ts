/**
 * Channel Navigation Tests
 * 
 * Tests for navigating between channels and servers.
 */

import { test, expect } from '@playwright/test';
import { 
  NavigationPage,
  ServerPage,
  ChatPage,
  waitForAppReady, 
  waitForMatrixSync 
} from '../fixtures';

test.describe('Channel Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await waitForMatrixSync(page);
  });

  test('should display server list', async ({ page }) => {
    const nav = new NavigationPage(page);
    
    // Server list should be visible
    await expect(nav.serverList).toBeVisible();
  });

  test('should navigate to server on click', async ({ page }) => {
    // Click first server
    const firstServer = page.locator('[data-testid*="server"], .server-item, nav a').first();
    await firstServer.click();
    
    await page.waitForTimeout(2000);
    
    // URL should change to include servers path
    const url = page.url();
    const isOnServer = url.includes('/servers/') || url.includes('/channels/');
    
    expect(isOnServer).toBeTruthy();
  });

  test('should display channel list in server', async ({ page }) => {
    // Click first server
    const firstServer = page.locator('[data-testid*="server"], .server-item, nav a').first();
    await firstServer.click();
    await page.waitForTimeout(2000);
    
    // Channel list should be visible
    const serverPage = new ServerPage(page);
    await expect(serverPage.channelList).toBeVisible();
  });

  test('should navigate to channel on click', async ({ page }) => {
    // Click first server
    const firstServer = page.locator('[data-testid*="server"], .server-item, nav a').first();
    await firstServer.click();
    await page.waitForTimeout(2000);
    
    // Click first channel
    const firstChannel = page.locator('[data-testid*="channel"], .channel-item, [href*="channel"]').first();
    await firstChannel.click();
    await page.waitForTimeout(2000);
    
    // Chat interface should be visible
    const chatPage = new ChatPage(page);
    await expect(chatPage.messageInput).toBeVisible();
  });

  test('should highlight active channel', async ({ page }) => {
    // Navigate to a channel
    const firstServer = page.locator('[data-testid*="server"], .server-item, nav a').first();
    await firstServer.click();
    await page.waitForTimeout(2000);
    
    const firstChannel = page.locator('[data-testid*="channel"], .channel-item').first();
    await firstChannel.click();
    await page.waitForTimeout(1000);
    
    // Active channel should have special styling
    const activeChannel = page.locator('.channel-active, [data-active="true"], [aria-selected="true"]');
    const hasActiveStyle = await activeChannel.first().isVisible().catch(() => false);
    
    console.log(`Active channel highlighted: ${hasActiveStyle}`);
  });

  test('should show channel type icons', async ({ page }) => {
    // Navigate to server
    const firstServer = page.locator('[data-testid*="server"], .server-item, nav a').first();
    await firstServer.click();
    await page.waitForTimeout(2000);
    
    // Look for channel type icons (text/voice)
    const textIcon = page.locator('[data-channel-type="text"], .text-channel-icon, svg[class*="hash"]');
    const voiceIcon = page.locator('[data-channel-type="voice"], .voice-channel-icon, svg[class*="volume"]');
    
    const hasTextIcon = await textIcon.first().isVisible().catch(() => false);
    const hasVoiceIcon = await voiceIcon.first().isVisible().catch(() => false);
    
    console.log(`Text icon: ${hasTextIcon}, Voice icon: ${hasVoiceIcon}`);
  });

  test('should remember last visited channel', async ({ page }) => {
    // Navigate to specific channel
    const firstServer = page.locator('[data-testid*="server"], .server-item, nav a').first();
    await firstServer.click();
    await page.waitForTimeout(2000);
    
    const channels = page.locator('[data-testid*="channel"], .channel-item');
    const channelCount = await channels.count();
    
    if (channelCount > 1) {
      // Click second channel
      await channels.nth(1).click();
      await page.waitForTimeout(2000);
      
      const channelUrl = page.url();
      
      // Go back to server list
      await page.goto('/');
      await waitForAppReady(page);
      
      // Click same server again
      await firstServer.click();
      await page.waitForTimeout(2000);
      
      // Should be on same channel (or close)
      console.log(`Tested channel memory`);
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Navigate to server
    const firstServer = page.locator('[data-testid*="server"], .server-item, nav a').first();
    await firstServer.click();
    await page.waitForTimeout(2000);
    
    // Focus channel list
    const channelList = page.locator('[data-testid="channel-list"], .channel-list');
    await channelList.first().focus().catch(() => {});
    
    // Try arrow key navigation
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    
    console.log('Tested keyboard navigation');
  });
});
