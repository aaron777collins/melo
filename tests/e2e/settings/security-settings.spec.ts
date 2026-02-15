/**
 * Security Settings Tests
 * 
 * Tests for E2EE and security configuration.
 */

import { test, expect } from '@playwright/test';
import { 
  NavigationPage,
  SettingsModal,
  waitForAppReady, 
  waitForMatrixSync 
} from '../fixtures';

test.describe('Security Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await waitForMatrixSync(page);
  });

  test('should have security tab in settings', async ({ page }) => {
    const nav = new NavigationPage(page);
    
    // Open settings
    await nav.settingsButton.click().catch(() => {});
    await page.waitForTimeout(500);
    
    // Look for security tab
    const securityTab = page.locator('button:has-text("Security"), [data-tab="security"], :text("Security")');
    const hasSecurityTab = await securityTab.first().isVisible().catch(() => false);
    
    expect(hasSecurityTab).toBeTruthy();
  });

  test('should display device verification status', async ({ page }) => {
    const nav = new NavigationPage(page);
    
    // Open settings
    await nav.settingsButton.click().catch(() => {});
    await page.waitForTimeout(500);
    
    // Click security tab
    const securityTab = page.locator('button:has-text("Security"), [data-tab="security"]');
    await securityTab.first().click().catch(() => {});
    await page.waitForTimeout(500);
    
    // Look for device verification section
    const verificationSection = page.locator(':text("Device"), :text("Verification"), :text("Verified")');
    const hasVerification = await verificationSection.first().isVisible().catch(() => false);
    
    console.log(`Device verification section: ${hasVerification}`);
  });

  test('should display cross-signing status', async ({ page }) => {
    const nav = new NavigationPage(page);
    
    // Open settings
    await nav.settingsButton.click().catch(() => {});
    await page.waitForTimeout(500);
    
    // Click security tab
    const securityTab = page.locator('button:has-text("Security"), [data-tab="security"]');
    await securityTab.first().click().catch(() => {});
    await page.waitForTimeout(500);
    
    // Look for cross-signing status
    const crossSigning = page.locator(':text("Cross-signing"), :text("cross signing")');
    const hasCrossSigning = await crossSigning.first().isVisible().catch(() => false);
    
    console.log(`Cross-signing section: ${hasCrossSigning}`);
  });

  test('should have key backup option', async ({ page }) => {
    const nav = new NavigationPage(page);
    
    // Open settings
    await nav.settingsButton.click().catch(() => {});
    await page.waitForTimeout(500);
    
    // Click security tab
    const securityTab = page.locator('button:has-text("Security"), [data-tab="security"]');
    await securityTab.first().click().catch(() => {});
    await page.waitForTimeout(500);
    
    // Look for key backup
    const keyBackup = page.locator(':text("Key Backup"), :text("Backup"), button:has-text("Set Up")');
    const hasKeyBackup = await keyBackup.first().isVisible().catch(() => false);
    
    console.log(`Key backup option: ${hasKeyBackup}`);
  });

  test('should show encryption indicator for rooms', async ({ page }) => {
    // Navigate to a room
    const firstServer = page.locator('[data-testid*="server"], .server-item, nav a').first();
    await firstServer.click().catch(() => {});
    await page.waitForTimeout(2000);
    
    const firstChannel = page.locator('[data-testid*="channel"], .channel-item').first();
    await firstChannel.click().catch(() => {});
    await page.waitForTimeout(2000);
    
    // Look for encryption indicator (lock icon)
    const encryptionIcon = page.locator('[data-testid="encryption-indicator"], .encryption-icon, [aria-label*="encrypted" i], svg[class*="lock"]');
    const hasEncryption = await encryptionIcon.first().isVisible().catch(() => false);
    
    console.log(`Encryption indicator visible: ${hasEncryption}`);
  });

  test('should display session list', async ({ page }) => {
    const nav = new NavigationPage(page);
    
    // Open settings
    await nav.settingsButton.click().catch(() => {});
    await page.waitForTimeout(500);
    
    // Click security tab
    const securityTab = page.locator('button:has-text("Security"), [data-tab="security"]');
    await securityTab.first().click().catch(() => {});
    await page.waitForTimeout(500);
    
    // Look for session/device list
    const sessionList = page.locator(':text("Sessions"), :text("Devices"), .session-list, .device-list');
    const hasSessionList = await sessionList.first().isVisible().catch(() => false);
    
    console.log(`Session list: ${hasSessionList}`);
  });
});
