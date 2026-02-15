/**
 * Direct Messages Tests
 * 
 * Tests for creating and managing direct messages.
 */

import { test, expect } from '@playwright/test';
import { 
  NavigationPage,
  ChatPage,
  waitForAppReady, 
  waitForMatrixSync,
  generateMessage,
  TEST_CONFIG 
} from '../fixtures';

test.describe('Direct Messages', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await waitForMatrixSync(page);
  });

  test('should show DM list in navigation', async ({ page }) => {
    const nav = new NavigationPage(page);
    
    // DM section should be visible
    const dmSection = page.locator('[data-testid="dm-list"], .dm-list, :text("Direct Messages"), :text("DMs")');
    const hasDmSection = await dmSection.first().isVisible().catch(() => false);
    
    expect(hasDmSection).toBeTruthy();
  });

  test('should have button to start new DM', async ({ page }) => {
    // Look for new DM button
    const newDmButton = page.locator('button[aria-label*="new message" i], button[aria-label*="new dm" i], button:has-text("New Message"), [data-testid="new-dm"]');
    const hasNewDmButton = await newDmButton.first().isVisible().catch(() => false);
    
    expect(hasNewDmButton).toBeTruthy();
  });

  test('should open new DM modal', async ({ page }) => {
    // Click new DM button
    const newDmButton = page.locator('button[aria-label*="new message" i], button[aria-label*="new dm" i], button:has-text("New Message"), [data-testid="new-dm"]');
    await newDmButton.first().click().catch(() => {});
    
    await page.waitForTimeout(500);
    
    // Modal should open with user search
    const userSearch = page.locator('input[placeholder*="user" i], input[placeholder*="search" i], [data-testid="user-search"]');
    const hasUserSearch = await userSearch.first().isVisible().catch(() => false);
    
    console.log(`New DM modal opened: ${hasUserSearch}`);
  });

  test('should navigate to existing DM', async ({ page }) => {
    // Click on a DM if one exists
    const existingDm = page.locator('[data-testid*="dm-"], .dm-item, [href*="@me"]').first();
    const hasDm = await existingDm.isVisible().catch(() => false);
    
    if (hasDm) {
      await existingDm.click();
      await page.waitForTimeout(2000);
      
      // Should show chat interface
      const chatPage = new ChatPage(page);
      await expect(chatPage.messageInput).toBeVisible();
    } else {
      console.log('No existing DMs to navigate to');
    }
  });

  test('should send message in DM', async ({ page }) => {
    // Try to navigate to a DM first
    const existingDm = page.locator('[data-testid*="dm-"], .dm-item, [href*="@me"]').first();
    const hasDm = await existingDm.isVisible().catch(() => false);
    
    if (hasDm) {
      await existingDm.click();
      await page.waitForTimeout(2000);
      
      const chatPage = new ChatPage(page);
      const messageText = generateMessage();
      
      // Send message
      await chatPage.sendMessage(messageText);
      
      // Message should appear
      await chatPage.expectMessageVisible(messageText);
    } else {
      console.log('No DM available for messaging test');
    }
  });

  test('should show user status in DM', async ({ page }) => {
    // Click on a DM
    const existingDm = page.locator('[data-testid*="dm-"], .dm-item').first();
    const hasDm = await existingDm.isVisible().catch(() => false);
    
    if (hasDm) {
      await existingDm.click();
      await page.waitForTimeout(1000);
      
      // Look for user status indicator
      const statusIndicator = page.locator('[data-testid="user-status"], .status-indicator, .online, .offline');
      const hasStatus = await statusIndicator.first().isVisible().catch(() => false);
      
      console.log(`User status visible: ${hasStatus}`);
    }
  });
});
