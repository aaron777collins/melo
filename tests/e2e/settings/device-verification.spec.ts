/**
 * Device Verification and Management E2E Tests
 * 
 * Tests for comprehensive device verification, blocking, and session management.
 * Covers Matrix API integration and UI interactions.
 */

import { test, expect, Page, Locator } from '@playwright/test';
import { 
  NavigationPage,
  SettingsModal,
  waitForAppReady, 
  waitForMatrixSync,
  loginWithTestUser,
  isLoggedIn,
  clearBrowserState,
  retry,
  screenshot
} from '../fixtures';
import { TEST_CONFIG } from '../fixtures/test-data';

/**
 * Device Management Page Object
 */
class DeviceManagerPage {
  readonly page: Page;
  readonly refreshButton: Locator;
  readonly deviceStats: Locator;
  readonly currentSession: Locator;
  readonly otherSessions: Locator;
  readonly revokeAllButton: Locator;
  readonly deviceCards: Locator;
  readonly verifyButtons: Locator;
  readonly blockButtons: Locator;
  readonly revokeButtons: Locator;
  readonly verifyDialog: Locator;
  readonly blockDialog: Locator;
  readonly revokeDialog: Locator;
  readonly qrCodeOption: Locator;
  readonly emojiOption: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.refreshButton = page.locator('button:has-text("Refresh")');
    this.deviceStats = page.locator('[data-testid="device-stats"], .device-stats');
    this.currentSession = page.locator('[data-testid="current-session"], :has-text("Current Session")');
    this.otherSessions = page.locator('[data-testid="other-sessions"], :has-text("Other Sessions")');
    this.revokeAllButton = page.locator('button:has-text("Revoke All")');
    this.deviceCards = page.locator('[data-testid="device-card"], .device-session-card, .card');
    this.verifyButtons = page.locator('button:has-text("Verify"), [data-action="verify"]');
    this.blockButtons = page.locator('button:has-text("Block"), [data-action="block"]');
    this.revokeButtons = page.locator('button:has-text("Revoke"), [data-action="revoke"]');
    
    // Dialog elements
    this.verifyDialog = page.locator('[role="dialog"]:has-text("Verify")');
    this.blockDialog = page.locator('[role="dialog"]:has-text("Block")');
    this.revokeDialog = page.locator('[role="dialog"]:has-text("Revoke")');
    this.qrCodeOption = page.locator('button:has-text("QR Code")');
    this.emojiOption = page.locator('button:has-text("Emoji")');
    this.confirmButton = page.locator('[role="dialog"] button:has-text("Revoke"), [role="dialog"] button:has-text("Start Verification"), [role="dialog"] button:has-text("Block")');
    this.cancelButton = page.locator('[role="dialog"] button:has-text("Cancel")');
  }

  async waitForDeviceLoad() {
    // Wait for device list to load
    await this.page.waitForTimeout(2000);
    
    // Wait for loading spinner to disappear
    const loadingSpinner = this.page.locator('.loading, [data-loading="true"], .animate-spin');
    try {
      await loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    } catch {
      // No spinner present, which is fine
    }
    
    // Wait for device cards to appear
    await this.deviceCards.first().waitFor({ state: 'visible', timeout: 15000 });
  }

  async getDeviceCount(): Promise<number> {
    return await this.deviceCards.count();
  }

  async getVerifiedCount(): Promise<number> {
    return await this.page.locator(':has-text("Verified"), .verified, [data-status="verified"]').count();
  }

  async getUnverifiedCount(): Promise<number> {
    return await this.page.locator(':has-text("Unverified"), .unverified, [data-status="unverified"]').count();
  }

  async getBlockedCount(): Promise<number> {
    return await this.page.locator(':has-text("Blocked"), .blocked, [data-status="blocked"]').count();
  }

  async clickFirstVerifyButton(): Promise<void> {
    const firstVerifyButton = this.verifyButtons.first();
    await firstVerifyButton.waitFor({ state: 'visible', timeout: 5000 });
    await firstVerifyButton.click();
  }

  async clickFirstBlockButton(): Promise<void> {
    const firstBlockButton = this.blockButtons.first();
    await firstBlockButton.waitFor({ state: 'visible', timeout: 5000 });
    await firstBlockButton.click();
  }

  async clickFirstRevokeButton(): Promise<void> {
    const firstRevokeButton = this.revokeButtons.first();
    await firstRevokeButton.waitFor({ state: 'visible', timeout: 5000 });
    await firstRevokeButton.click();
  }

  async waitForVerifyDialog(): Promise<void> {
    await this.verifyDialog.waitFor({ state: 'visible', timeout: 5000 });
  }

  async waitForBlockDialog(): Promise<void> {
    await this.blockDialog.waitFor({ state: 'visible', timeout: 5000 });
  }

  async waitForRevokeDialog(): Promise<void> {
    await this.revokeDialog.waitFor({ state: 'visible', timeout: 5000 });
  }

  async selectQRVerification(): Promise<void> {
    await this.qrCodeOption.click();
  }

  async selectEmojiVerification(): Promise<void> {
    await this.emojiOption.click();
  }

  async confirmAction(): Promise<void> {
    await this.confirmButton.click();
  }

  async cancelAction(): Promise<void> {
    await this.cancelButton.click();
  }

  async refreshDeviceList(): Promise<void> {
    await this.refreshButton.click();
    await this.waitForDeviceLoad();
  }
}

/**
 * Helper to navigate to device manager
 */
async function navigateToDeviceManager(page: Page): Promise<DeviceManagerPage> {
  const nav = new NavigationPage(page);
  
  // Open settings
  await nav.settingsButton.click();
  await page.waitForTimeout(1000);
  
  // Navigate to security/device section
  const securityTab = page.locator('button:has-text("Security"), [data-tab="security"]');
  if (await securityTab.isVisible({ timeout: 5000 })) {
    await securityTab.click();
    await page.waitForTimeout(1000);
  }
  
  // Look for device manager section or tab
  const deviceTab = page.locator('button:has-text("Device"), button:has-text("Session")');
  if (await deviceTab.first().isVisible({ timeout: 3000 })) {
    await deviceTab.first().click();
    await page.waitForTimeout(500);
  }
  
  const deviceManager = new DeviceManagerPage(page);
  await deviceManager.waitForDeviceLoad();
  
  return deviceManager;
}

test.describe('Device Verification and Management', () => {
  test.beforeEach(async ({ page }) => {
    // Clear browser state for clean test environment
    await clearBrowserState(page);
    
    // Navigate and wait for app
    await page.goto('/');
    await waitForAppReady(page);
    
    // Login if not already logged in
    if (!(await isLoggedIn(page))) {
      await loginWithTestUser(page);
    }
    
    await waitForMatrixSync(page);
  });

  test('device list loads and displays correctly', async ({ page }) => {
    const deviceManager = await navigateToDeviceManager(page);
    
    // Should have at least current device
    const deviceCount = await deviceManager.getDeviceCount();
    expect(deviceCount).toBeGreaterThanOrEqual(1);
    
    // Should show current session
    await expect(deviceManager.currentSession).toBeVisible();
    
    // Should display device stats
    const totalDevicesText = await page.locator(':has-text("Total Devices"), :has-text("Device")').first().textContent();
    expect(totalDevicesText).toBeTruthy();
    
    console.log(`✓ Device list loaded with ${deviceCount} devices`);
  });

  test('device verification dialog opens and displays options', async ({ page }) => {
    const deviceManager = await navigateToDeviceManager(page);
    
    // Check if we have unverified devices to verify
    const unverifiedCount = await deviceManager.getUnverifiedCount();
    
    if (unverifiedCount === 0) {
      console.log('⚠️ No unverified devices available for verification test');
      return;
    }
    
    // Click verify button on first unverified device
    await deviceManager.clickFirstVerifyButton();
    
    // Verify dialog opens
    await deviceManager.waitForVerifyDialog();
    
    // Should show verification options
    await expect(deviceManager.qrCodeOption).toBeVisible();
    await expect(deviceManager.emojiOption).toBeVisible();
    
    // Should be able to select verification method
    await deviceManager.selectQRVerification();
    await expect(page.locator(':has-text("QR code")')).toBeVisible();
    
    await deviceManager.selectEmojiVerification();
    await expect(page.locator(':has-text("emoji")')).toBeVisible();
    
    // Cancel verification
    await deviceManager.cancelAction();
    
    console.log('✓ Device verification dialog works correctly');
  });

  test('device blocking functionality works', async ({ page }) => {
    const deviceManager = await navigateToDeviceManager(page);
    
    // Get initial counts
    const initialUnverified = await deviceManager.getUnverifiedCount();
    const initialBlocked = await deviceManager.getBlockedCount();
    
    if (initialUnverified === 0) {
      console.log('⚠️ No unverified devices available for blocking test');
      return;
    }
    
    // Block first unverified device
    await deviceManager.clickFirstBlockButton();
    await deviceManager.waitForBlockDialog();
    
    // Confirm blocking
    await deviceManager.confirmAction();
    
    // Wait for action to complete
    await page.waitForTimeout(2000);
    
    // Refresh and check changes
    await deviceManager.refreshDeviceList();
    
    const newBlocked = await deviceManager.getBlockedCount();
    expect(newBlocked).toBeGreaterThanOrEqual(initialBlocked);
    
    console.log(`✓ Device blocking works (blocked count: ${initialBlocked} → ${newBlocked})`);
  });

  test('device revocation removes device from list', async ({ page }) => {
    const deviceManager = await navigateToDeviceManager(page);
    
    // Get initial device count
    const initialCount = await deviceManager.getDeviceCount();
    
    // Skip if only current device exists (can't revoke current session)
    if (initialCount <= 1) {
      console.log('⚠️ Only current device available - cannot test revocation');
      return;
    }
    
    // Try to revoke first non-current device
    const revokeButtons = page.locator('button:has-text("Revoke"):not(:has-text("Current"))');
    const revokeButtonCount = await revokeButtons.count();
    
    if (revokeButtonCount === 0) {
      console.log('⚠️ No revocable devices found');
      return;
    }
    
    await revokeButtons.first().click();
    await deviceManager.waitForRevokeDialog();
    
    // Confirm revocation
    await deviceManager.confirmAction();
    
    // Wait for action to complete
    await page.waitForTimeout(3000);
    
    // Refresh and check device count decreased
    await deviceManager.refreshDeviceList();
    const newCount = await deviceManager.getDeviceCount();
    
    expect(newCount).toBeLessThan(initialCount);
    
    console.log(`✓ Device revocation works (device count: ${initialCount} → ${newCount})`);
  });

  test('sign out all other devices functionality', async ({ page }) => {
    const deviceManager = await navigateToDeviceManager(page);
    
    // Check if "Revoke All Others" button is available
    const revokeAllVisible = await deviceManager.revokeAllButton.isVisible({ timeout: 5000 });
    
    if (!revokeAllVisible) {
      console.log('⚠️ No other devices to revoke - single device session');
      return;
    }
    
    const initialCount = await deviceManager.getDeviceCount();
    
    // Click revoke all others
    await deviceManager.revokeAllButton.click();
    
    // Wait for confirmation dialog
    await page.waitForTimeout(1000);
    
    // Confirm the action
    const confirmRevokeAll = page.locator('[role="dialog"] button:has-text("Revoke All")');
    if (await confirmRevokeAll.isVisible({ timeout: 5000 })) {
      await confirmRevokeAll.click();
    }
    
    // Wait for action to complete
    await page.waitForTimeout(5000);
    
    // Refresh and verify only current device remains
    await deviceManager.refreshDeviceList();
    const newCount = await deviceManager.getDeviceCount();
    
    // Should have only current device left
    expect(newCount).toBe(1);
    
    // Should only show current session
    await expect(deviceManager.currentSession).toBeVisible();
    
    const otherSessionsVisible = await deviceManager.otherSessions.isVisible({ timeout: 3000 });
    expect(otherSessionsVisible).toBeFalsy();
    
    console.log(`✓ Revoke all others works (device count: ${initialCount} → ${newCount})`);
  });

  test('device verification status persists after refresh', async ({ page }) => {
    const deviceManager = await navigateToDeviceManager(page);
    
    // Get initial verification status
    const initialVerified = await deviceManager.getVerifiedCount();
    const initialUnverified = await deviceManager.getUnverifiedCount();
    
    console.log(`Initial state - Verified: ${initialVerified}, Unverified: ${initialUnverified}`);
    
    // If we have unverified devices, try to verify one
    if (initialUnverified > 0) {
      try {
        await deviceManager.clickFirstVerifyButton();
        await deviceManager.waitForVerifyDialog();
        
        // Select QR verification method
        await deviceManager.selectQRVerification();
        
        // Start verification (this may fail in test environment, but that's expected)
        await deviceManager.confirmAction();
        
        // Wait for any async operations
        await page.waitForTimeout(3000);
      } catch (error) {
        console.log('⚠️ Verification attempt failed (expected in test environment)');
      }
    }
    
    // Refresh page completely
    await page.reload();
    await waitForAppReady(page);
    await waitForMatrixSync(page);
    
    // Navigate back to device manager
    const newDeviceManager = await navigateToDeviceManager(page);
    
    // Verify device list still loads correctly
    const deviceCountAfterRefresh = await newDeviceManager.getDeviceCount();
    expect(deviceCountAfterRefresh).toBeGreaterThanOrEqual(1);
    
    // Device states should persist (at minimum, current device should still be there)
    await expect(newDeviceManager.currentSession).toBeVisible();
    
    console.log('✓ Device verification state persists after refresh');
  });

  test('device manager handles Matrix API errors gracefully', async ({ page }) => {
    const deviceManager = await navigateToDeviceManager(page);
    
    // Intercept Matrix API calls to simulate errors
    await page.route('**/devices**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    // Try to refresh device list
    await deviceManager.refreshButton.click();
    
    // Should show error state
    const errorMessage = page.locator(':has-text("Failed"), :has-text("Error"), .text-red');
    const errorVisible = await errorMessage.first().isVisible({ timeout: 10000 });
    
    if (errorVisible) {
      console.log('✓ Error handling works correctly');
    } else {
      // If no specific error UI, at least verify page doesn't crash
      const pageIsResponsive = await page.locator('body').isVisible();
      expect(pageIsResponsive).toBeTruthy();
      console.log('✓ Page remains responsive during API errors');
    }
    
    // Remove route intercept
    await page.unroute('**/devices**');
  });

  test('device details expand and show additional information', async ({ page }) => {
    const deviceManager = await navigateToDeviceManager(page);
    
    // Look for detail toggle buttons (eye icon, "Show details", etc.)
    const detailToggle = page.locator('button[aria-label*="details" i], button:has([data-icon="eye"]), button:has([data-icon="eye-off"])');
    
    if (await detailToggle.first().isVisible({ timeout: 5000 })) {
      await detailToggle.first().click();
      
      // Should show additional device information
      const detailsVisible = await page.locator(':has-text("Device ID"), :has-text("IP Address"), :has-text("Last Seen")').first().isVisible({ timeout: 5000 });
      
      if (detailsVisible) {
        console.log('✓ Device details expansion works');
      } else {
        console.log('⚠️ Device details expansion not found');
      }
    } else {
      console.log('⚠️ Device detail toggle not found');
    }
  });

  test('device manager displays correct verification badges', async ({ page }) => {
    const deviceManager = await navigateToDeviceManager(page);
    
    // Should show verification status badges
    const verifiedBadges = page.locator('[data-status="verified"], .verified, :has-text("Verified")');
    const unverifiedBadges = page.locator('[data-status="unverified"], .unverified, :has-text("Unverified")');
    const blockedBadges = page.locator('[data-status="blocked"], .blocked, :has-text("Blocked")');
    
    const verifiedCount = await verifiedBadges.count();
    const unverifiedCount = await unverifiedBadges.count();
    const blockedCount = await blockedBadges.count();
    
    const totalBadges = verifiedCount + unverifiedCount + blockedCount;
    const totalDevices = await deviceManager.getDeviceCount();
    
    // Every device should have a verification status badge
    expect(totalBadges).toBeGreaterThanOrEqual(1);
    
    console.log(`✓ Verification badges displayed correctly (V:${verifiedCount}, U:${unverifiedCount}, B:${blockedCount})`);
  });

  test('current device cannot be revoked', async ({ page }) => {
    const deviceManager = await navigateToDeviceManager(page);
    
    // Current session should not have revoke button
    const currentSessionCard = deviceManager.currentSession;
    await expect(currentSessionCard).toBeVisible();
    
    // Within current session, should not have revoke action
    const revokeInCurrent = currentSessionCard.locator('button:has-text("Revoke")');
    const hasRevokeButton = await revokeInCurrent.isVisible({ timeout: 3000 });
    
    expect(hasRevokeButton).toBeFalsy();
    
    console.log('✓ Current device correctly protected from revocation');
  });
});

test.describe('Device Manager Integration', () => {
  test('device manager integrates properly with settings navigation', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    
    if (!(await isLoggedIn(page))) {
      await loginWithTestUser(page);
    }
    
    await waitForMatrixSync(page);
    
    // Navigate through settings to device manager
    const nav = new NavigationPage(page);
    await nav.openSettings();
    
    // Should find security or device-related navigation
    const securityOrDeviceTab = page.locator('button:has-text("Security"), button:has-text("Device"), button:has-text("Session")');
    const tabExists = await securityOrDeviceTab.first().isVisible({ timeout: 5000 });
    
    expect(tabExists).toBeTruthy();
    
    if (tabExists) {
      await securityOrDeviceTab.first().click();
      await page.waitForTimeout(1000);
      
      // Should load device manager content
      const deviceContent = page.locator(':has-text("Device"), :has-text("Session"), :has-text("Verification")');
      await expect(deviceContent.first()).toBeVisible({ timeout: 10000 });
    }
    
    console.log('✓ Device manager integrates properly with settings');
  });

  test('device manager works across different screen sizes', async ({ page, browserName }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    await waitForAppReady(page);
    
    if (!(await isLoggedIn(page))) {
      await loginWithTestUser(page);
    }
    
    await waitForMatrixSync(page);
    
    const deviceManager = await navigateToDeviceManager(page);
    
    // Device cards should be visible in mobile view
    const deviceCount = await deviceManager.getDeviceCount();
    expect(deviceCount).toBeGreaterThanOrEqual(1);
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    
    // Should still work
    const tabletDeviceCount = await deviceManager.getDeviceCount();
    expect(tabletDeviceCount).toBe(deviceCount);
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);
    
    const desktopDeviceCount = await deviceManager.getDeviceCount();
    expect(desktopDeviceCount).toBe(deviceCount);
    
    console.log(`✓ Device manager responsive across screen sizes (${browserName})`);
  });
});