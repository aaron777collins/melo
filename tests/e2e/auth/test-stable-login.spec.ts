/**
 * Test Stable Login Credentials
 * 
 * Tests if the stable pre-registered credentials work for login
 */

import { test, expect } from '@playwright/test';
import { AuthPage, waitForAppReady } from '../fixtures';
import { TEST_CONFIG } from '../fixtures/test-data';

test('test stable credentials login', async ({ page }) => {
  const username = TEST_CONFIG.freshUser.username; // 'stabletest'
  const password = TEST_CONFIG.freshUser.password; // 'StableTest2026!'
  
  console.log(`🔍 Testing login with stable credentials: ${username}`);
  
  // Go to sign-in page
  await page.goto('/sign-in');
  await waitForAppReady(page);
  
  const authPage = new AuthPage(page);
  
  try {
    // Attempt login with stable credentials
    await authPage.login(username, password, TEST_CONFIG.homeserver);
    
    // Wait for result
    await page.waitForTimeout(10000);
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`   Current URL after login attempt: ${currentUrl}`);
    
    // Check for success (not on sign-in page)
    if (!currentUrl.includes('/sign-in')) {
      console.log('   ✅ Login appears successful');
    } else {
      // Check for error messages
      const errorSelectors = [
        '[data-testid="error-message"]',
        '.text-red-400',
        '.text-red-500'
      ];
      
      for (const selector of errorSelectors) {
        const errorElement = page.locator(selector).first();
        if (await errorElement.isVisible({ timeout: 1000 })) {
          const errorText = await errorElement.textContent();
          console.log(`   ❌ Error found (${selector}): ${errorText}`);
        }
      }
    }
    
  } catch (error) {
    console.log(`   ❌ Login failed with error: ${error.message}`);
    throw error;
  }
});