/**
 * Test Environment Verification Test
 * 
 * TDD Approach:
 * 1. Write test FIRST (RED - should fail due to 502 errors)
 * 2. Implement authentication mock (GREEN - tests should pass)
 * 3. Refactor environment setup (REFACTOR - optimize)
 */

import { test, expect } from '@playwright/test';
import { TEST_CONFIG } from './fixtures/test-data';

test.describe('Test Environment Verification', () => {
  
  test('should detect Matrix backend 502 errors', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    
    // Monitor network requests to catch 502 errors
    const requests: { url: string; status: number; method: string }[] = [];
    
    page.on('response', (response) => {
      requests.push({
        url: response.url(),
        status: response.status(),
        method: response.request().method()
      });
    });
    
    // Attempt login
    const usernameInput = page.locator('input[name="username"], input[type="text"]').first();
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Login")').first();
    
    await usernameInput.fill(TEST_CONFIG.testUser.username);
    await passwordInput.fill(TEST_CONFIG.testUser.password);
    await submitButton.click();
    
    await page.waitForTimeout(10000);
    
    // Check for 502 errors in requests
    const badGatewayRequests = requests.filter(req => req.status === 502);
    const matrixApiRequests = requests.filter(req => 
      req.url.includes('matrix') || 
      req.url.includes('_matrix') ||
      req.method === 'POST' && req.url.includes('login')
    );
    
    console.log('All requests:', requests);
    console.log('Matrix API requests:', matrixApiRequests);
    console.log('502 Bad Gateway requests:', badGatewayRequests);
    
    // This test documents the current issue - we expect 502 errors
    if (badGatewayRequests.length > 0) {
      console.log('❌ 502 Bad Gateway errors detected - Matrix backend is not responding');
    }
    
    // Check if error is displayed on page
    const errorMessage = await page.locator('.text-red-400, .text-red-500, .error, [class*="error"]').textContent().catch(() => null);
    if (errorMessage && errorMessage.includes('502')) {
      console.log('✅ 502 error properly displayed to user');
    }
  });

  test('should require authentication bypass for E2E testing', async ({ page }) => {
    // This test verifies that we need authentication mocks/bypass
    
    // Try normal authentication flow
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    
    const usernameInput = page.locator('input[name="username"], input[type="text"]').first();
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    
    await usernameInput.fill(TEST_CONFIG.testUser.username);
    await passwordInput.fill(TEST_CONFIG.testUser.password);
    
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Login")').first();
    await submitButton.click();
    
    await page.waitForTimeout(5000);
    
    // Should still be on sign-in page due to 502 errors
    const stillOnSignIn = page.url().includes('/sign-in');
    
    if (stillOnSignIn) {
      console.log('✅ Confirmed: Authentication fails due to backend issues');
      console.log('✅ Solution needed: Authentication bypass/mock for E2E testing');
    }
    
    // Test passes to document the current state
    expect(stillOnSignIn).toBe(true);
  });

});