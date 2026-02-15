/**
 * Authentication Setup
 * 
 * This runs before all tests to authenticate and save the session state.
 * Other tests can then use this authenticated state.
 */

import { test as setup, expect } from '@playwright/test';
import { TEST_CONFIG, AuthPage, waitForAppReady, waitForMatrixSync } from '../fixtures';

const authFile = 'tests/.auth/user.json';

setup('authenticate', async ({ page }) => {
  console.log('🔐 Setting up authentication...');
  
  // Go to sign-in page
  await page.goto('/sign-in');
  await waitForAppReady(page);
  
  const authPage = new AuthPage(page);
  
  // Login with test user
  await authPage.login(
    TEST_CONFIG.testUser.username,
    TEST_CONFIG.testUser.password,
    TEST_CONFIG.homeserver
  );
  
  // Wait for redirect (should leave sign-in page)
  await page.waitForTimeout(5000);
  
  // Check if we're logged in or need to create a server
  const currentUrl = page.url();
  console.log(`   Current URL: ${currentUrl}`);
  
  if (currentUrl.includes('/sign-in')) {
    // Still on sign-in - check for error
    const error = await page.locator('.text-red-400, .text-red-500').textContent().catch(() => null);
    if (error) {
      console.log(`   ⚠️ Login error: ${error}`);
      // User might not exist - try to sign up
      console.log('   Attempting sign-up...');
      await authPage.signUp(
        TEST_CONFIG.testUser.username,
        TEST_CONFIG.testUser.password,
        TEST_CONFIG.homeserver
      );
      await page.waitForTimeout(5000);
    }
  }
  
  // Check for server creation modal (first-time user)
  const serverModal = await page.locator('text="Create your first server", text="Customize your server"').isVisible().catch(() => false);
  if (serverModal) {
    console.log('   📦 First-time user - creating initial server...');
    const serverNameInput = page.locator('input[placeholder*="server" i], input[placeholder*="name" i]').first();
    await serverNameInput.fill('E2E Test Server');
    await page.locator('button:has-text("Create")').click();
    await page.waitForTimeout(5000);
  }
  
  // Wait for Matrix to sync
  await waitForMatrixSync(page);
  
  // Verify we're logged in
  const isOnSignIn = page.url().includes('/sign-in');
  if (isOnSignIn) {
    console.log('   ❌ Failed to authenticate');
    throw new Error('Authentication failed - still on sign-in page');
  }
  
  console.log('   ✅ Authentication successful');
  
  // Save authentication state
  await page.context().storageState({ path: authFile });
  console.log(`   💾 Session saved to ${authFile}`);
});
