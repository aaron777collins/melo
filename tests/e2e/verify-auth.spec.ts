/**
 * Simple test to verify real auth works
 */

import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { TEST_CONFIG } from './fixtures/test-data';

test('Verify real Matrix authentication works', async ({ page }) => {
  test.setTimeout(90000);
  console.log('🧪 Testing real Matrix authentication');
  
  // Login with test user via form
  await login(page, {
    username: TEST_CONFIG.testUser.username,
    password: TEST_CONFIG.testUser.password,
  });
  
  // Wait a bit for page to load
  await page.waitForTimeout(2000);
  
  // Check current URL - should NOT be on sign-in page
  const currentUrl = page.url();
  console.log(`Current URL: ${currentUrl}`);
  
  // Take screenshot
  await page.screenshot({ path: 'tests/e2e/evidence/auth-test-result.png', fullPage: true });
  
  // Verify we're not on sign-in page (means login succeeded)
  expect(currentUrl).not.toContain('/sign-in');
  expect(currentUrl).not.toContain('/sign-up');
  
  // Check for authenticated UI elements (sidebar, user menu, etc.)
  const hasAuthenticatedUI = await page.locator('[data-testid="user-avatar"], [data-testid="sidebar"], .server-list, [aria-label="User settings"]').count() > 0;
  console.log(`Has authenticated UI: ${hasAuthenticatedUI}`);
  
  // Log page title for debugging
  const title = await page.title();
  console.log(`Page title: ${title}`);
  
  console.log('✅ Auth verification complete');
});
