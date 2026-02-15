/**
 * Test Helper Functions
 * 
 * Common utility functions for E2E tests.
 */

import { Page, expect } from '@playwright/test';
import { TEST_CONFIG } from './test-data';

/**
 * Wait for app to be fully loaded (hydrated)
 */
export async function waitForAppReady(page: Page): Promise<void> {
  // Wait for network idle
  await page.waitForLoadState('networkidle');
  
  // Wait for React hydration
  await page.waitForTimeout(2000);
  
  // Wait for any loading spinners to disappear
  const spinner = page.locator('.loading, [data-loading="true"], .spinner');
  try {
    await spinner.waitFor({ state: 'hidden', timeout: 10000 });
  } catch {
    // No spinner present, which is fine
  }
}

/**
 * Take a named screenshot
 */
export async function screenshot(page: Page, name: string): Promise<string> {
  const path = `test-results/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  return path;
}

/**
 * Wait for Matrix sync to complete
 */
export async function waitForMatrixSync(page: Page): Promise<void> {
  // Wait for Matrix client to sync
  // This looks for indicators that the client is ready
  await page.waitForFunction(() => {
    // Check if we have any UI indicating sync complete
    return document.querySelector('[data-sync="complete"]') !== null ||
           document.querySelector('.server-list, .channel-list, nav') !== null;
  }, { timeout: 30000 }).catch(() => {
    // Fallback: just wait a bit
  });
  
  await page.waitForTimeout(2000);
}

/**
 * Navigate to a specific server and channel
 */
export async function navigateToChannel(
  page: Page, 
  serverName: string, 
  channelName: string
): Promise<void> {
  // Click on server
  await page.locator(`[data-testid="server-${serverName}"], :text("${serverName}")`).first().click();
  await page.waitForTimeout(1000);
  
  // Click on channel
  await page.locator(`[data-testid="channel-${channelName}"], :text("${channelName}")`).first().click();
  await page.waitForTimeout(1000);
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    // Not on sign-in page
    const url = page.url();
    if (url.includes('/sign-in') || url.includes('/sign-up')) {
      return false;
    }
    
    // Has some logged-in indicator
    const hasNav = await page.locator('nav, .sidebar, .server-list').first().isVisible().catch(() => false);
    return hasNav;
  } catch {
    return false;
  }
}

/**
 * Logout the current user
 */
export async function logout(page: Page): Promise<void> {
  // Open settings or user menu
  const settingsButton = page.locator('button[aria-label*="settings" i], button[aria-label*="user" i]');
  await settingsButton.click().catch(() => {});
  
  // Click logout
  const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign out"), button:has-text("Log out")');
  await logoutButton.click().catch(() => {});
  
  // Wait for redirect
  await page.waitForURL(/sign-in|login/, { timeout: 10000 }).catch(() => {});
}

/**
 * Generate a unique test server name
 */
export function generateServerName(): string {
  return `TestServer-${Date.now()}`;
}

/**
 * Generate a unique test channel name
 */
export function generateChannelName(): string {
  return `test-channel-${Date.now()}`;
}

/**
 * Generate a unique test message
 */
export function generateMessage(): string {
  return `Test message ${Date.now()}`;
}

/**
 * Wait for a message to appear in the chat
 */
export async function waitForMessage(page: Page, messageText: string, timeout: number = 10000): Promise<void> {
  await expect(page.locator(`text="${messageText}"`).first()).toBeVisible({ timeout });
}

/**
 * Clear local storage and cookies (for clean test state)
 */
export async function clearBrowserState(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    indexedDB.deleteDatabase('matrix-js-sdk');
  });
}

/**
 * Assert that an element with text exists
 */
export async function assertTextExists(page: Page, text: string): Promise<void> {
  await expect(page.locator(`text="${text}"`).first()).toBeVisible();
}

/**
 * Assert that we're on a specific path
 */
export async function assertPath(page: Page, path: string | RegExp): Promise<void> {
  if (typeof path === 'string') {
    await expect(page).toHaveURL(new RegExp(path));
  } else {
    await expect(page).toHaveURL(path);
  }
}

/**
 * Handle any confirmation dialogs
 */
export function setupDialogHandler(page: Page, action: 'accept' | 'dismiss' = 'accept'): void {
  page.on('dialog', async dialog => {
    if (action === 'accept') {
      await dialog.accept();
    } else {
      await dialog.dismiss();
    }
  });
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
    }
  }
  
  throw lastError;
}
