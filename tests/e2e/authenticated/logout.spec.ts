/**
 * Logout Tests
 * 
 * Tests for the Matrix logout flow - a critical authentication path.
 */

import { test, expect } from '@playwright/test';
import { AuthPage, TEST_CONFIG, waitForAppReady, logout, isLoggedIn, clearBrowserState } from '../fixtures';

test.describe('Logout', () => {
  test.beforeEach(async ({ page }) => {
    // Start from home page (should be authenticated from setup)
    await page.goto('/');
    await waitForAppReady(page);
    
    // Verify we start authenticated
    const loggedIn = await isLoggedIn(page);
    expect(loggedIn).toBeTruthy();
  });

  test('should successfully logout user', async ({ page }) => {
    // Use helper to logout
    await logout(page);
    
    // Should redirect to sign-in page
    await expect(page).toHaveURL(/sign-in/, { timeout: 10000 });
    
    // Should not be logged in anymore
    const loggedIn = await isLoggedIn(page);
    expect(loggedIn).toBeFalsy();
  });

  test('should clear session data on logout', async ({ page }) => {
    // Logout
    await logout(page);
    
    // Try to go back to authenticated page
    await page.goto('/');
    await waitForAppReady(page);
    
    // Should redirect to sign-in
    await expect(page).toHaveURL(/sign-in/, { timeout: 10000 });
  });

  test('should handle logout with network errors gracefully', async ({ page }) => {
    // Simulate network issues during logout
    await page.route('**/*logout*', route => route.abort());
    await page.route('**/*invalidate*', route => route.abort());
    
    // Try to logout
    await logout(page);
    
    // Should still redirect to sign-in (client-side logout)
    // Even if server logout fails, client should clear local state
    await page.waitForTimeout(5000);
    
    // Either we're logged out, or we get a clear error state
    const currentUrl = page.url();
    const isOnSignIn = currentUrl.includes('/sign-in');
    const stillAuthenticated = await isLoggedIn(page);
    
    // At minimum, local state should be cleared
    expect(isOnSignIn || !stillAuthenticated).toBeTruthy();
  });

  test('should allow re-login after logout', async ({ page }) => {
    // Logout first
    await logout(page);
    await expect(page).toHaveURL(/sign-in/);
    
    // Re-login
    const authPage = new AuthPage(page);
    await authPage.login(
      TEST_CONFIG.testUser.username,
      TEST_CONFIG.testUser.password,
      TEST_CONFIG.homeserver
    );
    
    // Should be able to login again
    await page.waitForTimeout(5000);
    
    const loggedIn = await isLoggedIn(page);
    expect(loggedIn).toBeTruthy();
  });

  test('should show logout option in user menu', async ({ page }) => {
    // Look for user menu/settings button
    const userMenuButton = page.locator('button[aria-label*="settings" i], button[aria-label*="user" i], button[aria-label*="menu" i]').first();
    
    // Click to open menu
    await userMenuButton.click().catch(() => {
      // Try alternative selectors if first doesn't work
      console.log('Trying alternative user menu selectors...');
    });
    
    // Should have logout option visible
    const logoutOption = page.locator('button:has-text("Logout"), button:has-text("Sign out"), button:has-text("Log out")');
    
    try {
      await expect(logoutOption).toBeVisible({ timeout: 5000 });
    } catch {
      // Take a screenshot for debugging
      await page.screenshot({ path: 'test-results/logout-menu-debug.png' });
      throw new Error('Logout option not found in user menu');
    }
  });
});