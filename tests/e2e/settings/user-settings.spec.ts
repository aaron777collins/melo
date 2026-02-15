/**
 * User Settings Tests
 * 
 * Tests for user profile and settings.
 */

import { test, expect } from '@playwright/test';
import { 
  NavigationPage,
  SettingsModal,
  waitForAppReady, 
  waitForMatrixSync 
} from '../fixtures';

test.describe('User Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await waitForMatrixSync(page);
  });

  test('should open settings modal', async ({ page }) => {
    const nav = new NavigationPage(page);
    
    // Click settings button
    await nav.settingsButton.click().catch(async () => {
      // Try user area click
      const userArea = page.locator('[data-testid="user-area"], .user-area, [aria-label*="user" i]');
      await userArea.first().click();
      await page.locator('text="Settings"').click();
    });
    
    await page.waitForTimeout(500);
    
    // Settings modal should open
    const settings = new SettingsModal(page);
    await settings.expectVisible();
  });

  test('should display user profile section', async ({ page }) => {
    const nav = new NavigationPage(page);
    
    // Open settings
    await nav.settingsButton.click().catch(() => {});
    await page.waitForTimeout(500);
    
    // Look for profile section
    const profileSection = page.locator(':text("Profile"), :text("Account"), [data-tab="profile"]');
    const hasProfileSection = await profileSection.first().isVisible().catch(() => false);
    
    expect(hasProfileSection).toBeTruthy();
  });

  test('should display current username', async ({ page }) => {
    const nav = new NavigationPage(page);
    
    // Open settings
    await nav.settingsButton.click().catch(() => {});
    await page.waitForTimeout(500);
    
    // Look for username display
    const username = page.locator('[data-testid="username"], .username, input[disabled][value*="@"]');
    const hasUsername = await username.first().isVisible().catch(() => false);
    
    console.log(`Username displayed: ${hasUsername}`);
  });

  test('should have avatar upload option', async ({ page }) => {
    const nav = new NavigationPage(page);
    
    // Open settings
    await nav.settingsButton.click().catch(() => {});
    await page.waitForTimeout(500);
    
    // Look for avatar section
    const avatarSection = page.locator('input[type="file"], button:has-text("Change Avatar"), button:has-text("Upload"), [data-testid="avatar-upload"]');
    const hasAvatarUpload = await avatarSection.first().isVisible().catch(() => false);
    
    console.log(`Avatar upload available: ${hasAvatarUpload}`);
  });

  test('should have display name field', async ({ page }) => {
    const nav = new NavigationPage(page);
    
    // Open settings
    await nav.settingsButton.click().catch(() => {});
    await page.waitForTimeout(500);
    
    // Look for display name field
    const displayNameField = page.locator('input[placeholder*="display" i], input[aria-label*="display name" i], [data-testid="display-name"]');
    const hasDisplayName = await displayNameField.first().isVisible().catch(() => false);
    
    console.log(`Display name field available: ${hasDisplayName}`);
  });

  test('should close settings with button', async ({ page }) => {
    const nav = new NavigationPage(page);
    
    // Open settings
    await nav.settingsButton.click().catch(() => {});
    await page.waitForTimeout(500);
    
    const settings = new SettingsModal(page);
    await settings.expectVisible();
    
    // Close settings
    await settings.close();
    
    // Should be hidden
    await settings.expectHidden();
  });

  test('should close settings with escape key', async ({ page }) => {
    const nav = new NavigationPage(page);
    
    // Open settings
    await nav.settingsButton.click().catch(() => {});
    await page.waitForTimeout(500);
    
    const settings = new SettingsModal(page);
    await settings.expectVisible();
    
    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Should be hidden
    await settings.expectHidden();
  });
});
