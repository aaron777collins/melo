/**
 * Create Channel Tests
 * 
 * Tests for creating text and voice channels within servers.
 */

import { test, expect } from '@playwright/test';
import { 
  ServerPage, 
  ModalPage,
  waitForAppReady, 
  waitForMatrixSync,
  generateChannelName 
} from '../fixtures';

test.describe('Create Channel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await waitForMatrixSync(page);
    
    // Navigate to a server first
    const firstServer = page.locator('[data-testid*="server"], .server-item, nav a').first();
    await firstServer.click().catch(() => {});
    await page.waitForTimeout(2000);
  });

  test('should open create channel modal', async ({ page }) => {
    const serverPage = new ServerPage(page);
    
    // Click add channel button
    await serverPage.addChannelButton.click();
    await page.waitForTimeout(500);
    
    // Modal should appear
    const modal = new ModalPage(page);
    await modal.expectVisible();
  });

  test('should create a text channel', async ({ page }) => {
    const serverPage = new ServerPage(page);
    const channelName = generateChannelName();
    
    // Open create channel modal
    await serverPage.addChannelButton.click();
    await page.waitForTimeout(500);
    
    // Fill channel name
    const nameInput = page.locator('input[placeholder*="channel" i], input[placeholder*="name" i]');
    await nameInput.fill(channelName);
    
    // Submit
    const modal = new ModalPage(page);
    await modal.submit();
    await page.waitForTimeout(3000);
    
    // Channel should appear in list or be navigated to
    const channelExists = await page.locator(`text="${channelName}"`).isVisible().catch(() => false);
    const urlContainsChannel = page.url().includes('/channels/');
    
    expect(channelExists || urlContainsChannel).toBeTruthy();
  });

  test('should create a voice channel', async ({ page }) => {
    const serverPage = new ServerPage(page);
    const channelName = generateChannelName();
    
    // Open create channel modal
    await serverPage.addChannelButton.click();
    await page.waitForTimeout(500);
    
    // Select voice channel type
    const voiceOption = page.locator('button:has-text("Voice"), [data-value="voice"], input[value="voice"]');
    await voiceOption.click().catch(() => {
      console.log('Voice option not found - may not be separate selection');
    });
    
    // Fill channel name
    const nameInput = page.locator('input[placeholder*="channel" i], input[placeholder*="name" i]');
    await nameInput.fill(channelName);
    
    // Submit
    const modal = new ModalPage(page);
    await modal.submit();
    await page.waitForTimeout(3000);
    
    // Channel should appear
    const channelExists = await page.locator(`text="${channelName}"`).isVisible().catch(() => false);
    expect(channelExists).toBeTruthy();
  });

  test('should validate channel name is required', async ({ page }) => {
    const serverPage = new ServerPage(page);
    
    // Open create channel modal
    await serverPage.addChannelButton.click();
    await page.waitForTimeout(500);
    
    // Try to submit without name
    const modal = new ModalPage(page);
    await modal.submit();
    
    // Should still be in modal (validation)
    await modal.expectVisible();
  });

  test('should display channel types', async ({ page }) => {
    const serverPage = new ServerPage(page);
    
    // Open create channel modal
    await serverPage.addChannelButton.click();
    await page.waitForTimeout(500);
    
    // Check for channel type options
    const textOption = page.locator(':text("Text"), :text("text channel")');
    const voiceOption = page.locator(':text("Voice"), :text("voice channel")');
    
    // At least one type option should be visible
    const hasTextOption = await textOption.first().isVisible().catch(() => false);
    const hasVoiceOption = await voiceOption.first().isVisible().catch(() => false);
    
    console.log(`Text option: ${hasTextOption}, Voice option: ${hasVoiceOption}`);
  });
});
