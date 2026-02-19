/**
 * E2E Authentication Configuration Test
 * 
 * This test verifies that the authentication infrastructure is properly configured
 * for E2E testing without relying on complex setup scripts.
 * 
 * TDD Approach:
 * 1. Test environment verification (RED - should fail initially if misconfigured)
 * 2. Matrix credentials mock validation (RED - should fail without proper mocks)  
 * 3. E2E authentication configuration (RED - should fail without auth infrastructure)
 */

import { test, expect } from '@playwright/test';
import { TEST_CONFIG } from './fixtures/test-data';

test.describe('E2E Authentication Configuration', () => {
  
  test('should have proper test environment configuration', async ({ page }) => {
    // Verify base URL is accessible
    await page.goto('/');
    
    // Should not crash or timeout
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Should be able to navigate to sign-in page
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Should find sign-in form elements
    const usernameInput = page.locator('input[name="username"], input[type="text"]').first();
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Login")').first();
    
    await expect(usernameInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible({ timeout: 10000 });
    await expect(submitButton).toBeVisible({ timeout: 10000 });
    
    // Take screenshot for debugging
    await page.screenshot({
      path: 'test-results/auth-config-signin-page.png',
      fullPage: true
    });
    
    console.log('✅ Test environment configuration is valid');
  });

  test('should be able to attempt login with test credentials', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Fill in test credentials
    const usernameInput = page.locator('input[name="username"], input[type="text"]').first();
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    
    await usernameInput.fill(TEST_CONFIG.testUser.username);
    await passwordInput.fill(TEST_CONFIG.testUser.password);
    
    // Take screenshot before submit
    await page.screenshot({
      path: 'test-results/auth-config-before-submit.png',
      fullPage: true
    });
    
    // Submit form
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Login")').first();
    await submitButton.click();
    
    // Wait a reasonable amount of time for response
    await page.waitForTimeout(10000);
    
    // Take screenshot after submit
    await page.screenshot({
      path: 'test-results/auth-config-after-submit.png',
      fullPage: true
    });
    
    const currentUrl = page.url();
    console.log(`After login attempt, current URL: ${currentUrl}`);
    
    // Check for error messages
    const errorMessage = await page.locator('[data-testid="error-message"], .text-red-400, .text-red-500, .error, [class*="error"]').textContent().catch(() => null);
    if (errorMessage) {
      console.log(`❌ Authentication error: ${errorMessage}`);
    }
    
    // Check if we're still on sign-in page
    if (currentUrl.includes('/sign-in')) {
      console.log('⚠️ Still on sign-in page after login attempt');
    } else {
      console.log('✅ Successfully navigated away from sign-in page');
    }
    
    // This test is mainly diagnostic - we expect it might fail but want to see why
  });

  test('should validate Matrix homeserver connection', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    
    // Check if Matrix homeserver URL is configured correctly
    const pageContent = await page.content();
    const hasMatrixConfig = pageContent.includes('matrix') || pageContent.includes(TEST_CONFIG.homeserver);
    
    console.log(`Matrix homeserver configuration present: ${hasMatrixConfig}`);
    console.log(`Expected homeserver: ${TEST_CONFIG.homeserver}`);
    
    // Try to access Matrix well-known endpoint
    const response = await page.request.get('/.well-known/matrix/client').catch(() => null);
    if (response) {
      const wellKnown = await response.json().catch(() => null);
      console.log('Matrix well-known configuration:', wellKnown);
    } else {
      console.log('❌ Could not access Matrix well-known endpoint');
    }
    
    // Take screenshot for debugging
    await page.screenshot({
      path: 'test-results/matrix-homeserver-validation.png',
      fullPage: true
    });
  });

  test('should have test credentials available', async ({ page }) => {
    // Verify test configuration is loaded
    expect(TEST_CONFIG.testUser.username).toBeTruthy();
    expect(TEST_CONFIG.testUser.password).toBeTruthy();
    expect(TEST_CONFIG.homeserver).toBeTruthy();
    
    console.log(`Primary test user: ${TEST_CONFIG.testUser.username}`);
    console.log(`Homeserver: ${TEST_CONFIG.homeserver}`);
    console.log(`Fresh user: ${TEST_CONFIG.freshUser.username}`);
    console.log(`Second user: ${TEST_CONFIG.secondUser.username}`);
    
    // Test credentials should be stable (pre-registered)
    expect(TEST_CONFIG.testUser.username).toBe('sophietest');
    expect(TEST_CONFIG.freshUser.username).toBe('stabletest');
    expect(TEST_CONFIG.secondUser.username).toBe('e2etest2');
    
    console.log('✅ Test credentials configuration is valid');
  });
});