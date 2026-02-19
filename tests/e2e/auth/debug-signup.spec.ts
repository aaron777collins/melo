/**
 * Debug Sign-Up Test
 * 
 * Simple test to verify sign-up flow works on dev2.aaroncollins.info
 */

import { test, expect } from '@playwright/test';
import { AuthPage, waitForAppReady } from '../fixtures';

test('debug sign-up flow', async ({ page }) => {
  const testUsername = `debugtest-${Date.now()}`;
  const testPassword = 'DebugTest2026!';
  const homeserver = 'https://dev2.aaroncollins.info';
  
  console.log(`🔍 Testing sign-up with username: ${testUsername}`);
  
  // Go to sign-up page
  await page.goto('/sign-up');
  await waitForAppReady(page);
  
  const authPage = new AuthPage(page);
  
  try {
    // Attempt sign-up
    await authPage.signUp(testUsername, testPassword, homeserver);
    
    // Wait for result
    await page.waitForTimeout(10000);
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`   Current URL after sign-up: ${currentUrl}`);
    
    // Check for success (not on sign-up page)
    if (!currentUrl.includes('/sign-up')) {
      console.log('   ✅ Sign-up appears successful');
    } else {
      // Check for error messages
      const error = await page.locator('[data-testid="error-message"], .text-red-400, .text-red-500').textContent().catch(() => null);
      console.log(`   ❌ Still on sign-up page. Error: ${error || 'No error message found'}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Sign-up failed with error: ${error.message}`);
    throw error;
  }
});