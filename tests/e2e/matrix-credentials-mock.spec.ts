/**
 * Matrix Credentials Mock Validation Test
 * 
 * TDD Approach:
 * 1. Write test FIRST (RED - should fail without mock implementation)
 * 2. Implement mock authentication system (GREEN - tests should pass)
 * 3. Refactor mock system (REFACTOR - optimize)
 */

import { test, expect } from '@playwright/test';
import { TEST_CONFIG } from './fixtures/test-data';

test.describe('Matrix Credentials Mock Validation', () => {
  
  test('should provide authentication mock interface', async ({ page }) => {
    // Test the implemented authentication bypass system
    
    // Import and use the authentication bypass
    const { installAuthBypass, DEFAULT_MOCK_AUTH } = await import('../helpers/auth-bypass');
    
    // Install authentication bypass
    await installAuthBypass(page, DEFAULT_MOCK_AUTH);
    
    // Navigate to sign-in page  
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check if mock system is available
    const mockEnabled = await page.evaluate(() => {
      return window.__E2E_TEST_MODE__ && 
             localStorage.getItem('e2e_auth_bypass') === 'true' &&
             localStorage.getItem('mx_access_token')?.startsWith('e2e_mock_');
    });
    
    if (mockEnabled) {
      console.log('✅ Mock authentication system is available');
    } else {
      console.log('❌ Mock authentication system needs implementation');
    }
    
    // This test should now pass with the implemented system
    expect(mockEnabled).toBe(true);
  });

  test('should intercept Matrix authentication requests', async ({ page }) => {
    // Test authentication request interception
    
    let interceptedRequests: any[] = [];
    
    // Intercept and mock Matrix authentication requests
    await page.route('**/api/v1/auth/**', (route) => {
      interceptedRequests.push({
        url: route.request().url(),
        method: route.request().method(),
        headers: route.request().headers()
      });
      
      // Mock successful authentication response
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock_access_token_e2e',
          user_id: '@sophietest:dev2.aaroncollins.info',
          device_id: 'MOCK_DEVICE_E2E',
          home_server: 'dev2.aaroncollins.info'
        })
      });
    });
    
    // Also intercept Matrix SDK requests
    await page.route('**/_matrix/**', (route) => {
      interceptedRequests.push({
        url: route.request().url(),
        method: route.request().method(),
        path: route.request().url().split('/_matrix')[1]
      });
      
      // Mock Matrix API responses based on endpoint
      const url = route.request().url();
      
      if (url.includes('/login')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'mock_access_token_e2e',
            user_id: '@sophietest:dev2.aaroncollins.info',
            device_id: 'MOCK_DEVICE_E2E',
            home_server: 'dev2.aaroncollins.info',
            well_known: {
              'm.homeserver': {
                base_url: 'https://dev2.aaroncollins.info'
              }
            }
          })
        });
      } else if (url.includes('/sync')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            next_batch: 'mock_sync_token',
            rooms: { join: {}, invite: {}, leave: {} },
            presence: { events: [] },
            account_data: { events: [] }
          })
        });
      } else {
        // Default mock response
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, mock: true })
        });
      }
    });
    
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    
    // Attempt login
    const usernameInput = page.locator('input[name="username"], input[type="text"]').first();
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    
    await usernameInput.fill(TEST_CONFIG.testUser.username);
    await passwordInput.fill(TEST_CONFIG.testUser.password);
    
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Login")').first();
    await submitButton.click();
    
    await page.waitForTimeout(5000);
    
    console.log('Intercepted authentication requests:', interceptedRequests);
    
    // Check if authentication was intercepted
    const authRequestsIntercepted = interceptedRequests.length > 0;
    
    if (authRequestsIntercepted) {
      console.log('✅ Successfully intercepted Matrix authentication requests');
      console.log('✅ Mock authentication responses provided');
    } else {
      console.log('❌ No authentication requests intercepted - need to identify correct endpoints');
    }
    
    // Take screenshot to see result
    await page.screenshot({
      path: 'test-results/matrix-mock-authentication.png',
      fullPage: true
    });
    
    const currentUrl = page.url();
    const authSuccessful = !currentUrl.includes('/sign-in');
    
    console.log(`Authentication result: ${authSuccessful ? 'SUCCESS' : 'FAILED'}`);
    console.log(`Current URL: ${currentUrl}`);
    
    // Test documents what we need to implement
    expect(authRequestsIntercepted).toBe(true);
  });

  test('should provide mock Matrix client state', async ({ page }) => {
    // Test mock Matrix client state for E2E tests
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Inject mock Matrix client state
    await page.addInitScript(() => {
      // Mock authenticated Matrix client state
      window.__mockMatrixClient__ = {
        isLoggedIn: () => true,
        getUserId: () => '@sophietest:dev2.aaroncollins.info',
        getAccessToken: () => 'mock_access_token_e2e',
        getDeviceId: () => 'MOCK_DEVICE_E2E',
        getHomeserverUrl: () => 'https://dev2.aaroncollins.info',
        getDisplayName: () => Promise.resolve('E2E Test User'),
        
        // Mock spaces/rooms
        getVisibleRooms: () => [],
        getRooms: () => [],
        
        // Mock methods that E2E tests might need
        startClient: () => Promise.resolve(),
        stopClient: () => {},
        sync: () => Promise.resolve(),
        
        // Event listeners
        on: () => {},
        off: () => {},
        emit: () => {},
      };
      
      // Make mock client available globally for the app
      if (window.localStorage) {
        window.localStorage.setItem('mx_hs_url', 'https://dev2.aaroncollins.info');
        window.localStorage.setItem('mx_user_id', '@sophietest:dev2.aaroncollins.info');
        window.localStorage.setItem('mx_access_token', 'mock_access_token_e2e');
        window.localStorage.setItem('mx_device_id', 'MOCK_DEVICE_E2E');
        window.localStorage.setItem('e2e_test_mode', 'true');
      }
      
      console.log('Mock Matrix client state initialized for E2E testing');
    });
    
    // Check if mock client is available
    const mockClientAvailable = await page.evaluate(() => {
      return window.__mockMatrixClient__ && window.__mockMatrixClient__.isLoggedIn();
    });
    
    // Check if localStorage has mock authentication data
    const hasAuthData = await page.evaluate(() => {
      return window.localStorage.getItem('mx_access_token') === 'mock_access_token_e2e';
    });
    
    console.log(`Mock Matrix client available: ${mockClientAvailable}`);
    console.log(`Mock authentication data in localStorage: ${hasAuthData}`);
    
    if (mockClientAvailable && hasAuthData) {
      console.log('✅ Mock Matrix client state properly initialized');
    } else {
      console.log('❌ Mock Matrix client state needs proper implementation');
    }
    
    // This test documents the mock client interface we need
    expect(mockClientAvailable).toBe(true);
    expect(hasAuthData).toBe(true);
  });

});