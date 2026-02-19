/**
 * Authentication Helper Functions for E2E Tests
 * 
 * Provides authentication utilities with proper bypass for Matrix 502 errors
 */

import { Page } from '@playwright/test';
import { TEST_CONFIG } from '../fixtures/test-data';
import { installAuthBypass, bypassAuthenticationDirectly, DEFAULT_MOCK_AUTH } from './auth-bypass';

/**
 * Login as a specific user, using authentication bypass due to Matrix 502 issues
 */
export async function loginAsUser(page: Page, username: string = TEST_CONFIG.testUser.username): Promise<void> {
  console.log(`🔐 Logging in as user: ${username}`);
  
  // Use the appropriate test user configuration
  let userConfig = TEST_CONFIG.testUser;
  if (username === TEST_CONFIG.secondUser.username) {
    userConfig = TEST_CONFIG.secondUser;
  } else if (username === TEST_CONFIG.freshUser.username) {
    userConfig = TEST_CONFIG.freshUser;
  }
  
  // Create mock auth state for this user
  const mockAuth = {
    ...DEFAULT_MOCK_AUTH,
    userId: `@${username}:${new URL(TEST_CONFIG.homeserver).hostname}`,
    displayName: userConfig.displayName,
  };
  
  // Use authentication bypass due to Matrix backend 502 errors
  await bypassAuthenticationDirectly(page, mockAuth);
  
  console.log(`✅ Successfully logged in as: ${username}`);
}

/**
 * Ensure user is authenticated (check current state, login if needed)
 */
export async function ensureAuthenticated(page: Page, username: string = TEST_CONFIG.testUser.username): Promise<void> {
  const currentUrl = page.url();
  
  // Check if already authenticated (not on sign-in page)
  if (!currentUrl.includes('/sign-in') && !currentUrl.includes('/setup')) {
    console.log('✅ User already authenticated');
    return;
  }
  
  // Login if needed
  await loginAsUser(page, username);
}

/**
 * Logout current user
 */
export async function logout(page: Page): Promise<void> {
  console.log('🚪 Logging out...');
  
  // Try to find logout button
  const logoutSelectors = [
    '[data-testid="logout-button"]',
    'button:has-text("Logout")',  
    'button:has-text("Sign out")',
    '[aria-label*="logout" i]',
  ];
  
  for (const selector of logoutSelectors) {
    const button = page.locator(selector).first();
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      await page.waitForURL(/\/sign-in/, { timeout: 10000 });
      console.log('✅ Successfully logged out');
      return;
    }
  }
  
  // Fallback: clear storage and navigate to sign-in
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  
  await page.goto('/sign-in');
  await page.waitForLoadState('networkidle');
  
  console.log('✅ Logged out via storage clear');
}

/**
 * Switch to a different user (logout current, login as new user)
 */
export async function switchUser(page: Page, username: string): Promise<void> {
  console.log(`🔄 Switching to user: ${username}`);
  
  await logout(page);
  await loginAsUser(page, username);
  
  console.log(`✅ Successfully switched to user: ${username}`);
}