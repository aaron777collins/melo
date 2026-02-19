/**
 * Authentication Bypass System for E2E Testing
 * 
 * This module provides authentication bypass functionality to avoid
 * Matrix homeserver 502 Bad Gateway issues during E2E testing.
 */

import { Page } from '@playwright/test';
import { TEST_CONFIG } from '../fixtures/test-data';

export interface MockAuthState {
  userId: string;
  accessToken: string;
  deviceId: string;
  homeserverUrl: string;
  displayName: string;
}

/**
 * Default mock authentication state for E2E testing
 */
export const DEFAULT_MOCK_AUTH: MockAuthState = {
  userId: `@${TEST_CONFIG.testUser.username}:${new URL(TEST_CONFIG.homeserver).hostname}`,
  accessToken: 'e2e_mock_access_token_' + Date.now(),
  deviceId: 'E2E_MOCK_DEVICE_' + Math.random().toString(36).substring(7).toUpperCase(),
  homeserverUrl: TEST_CONFIG.homeserver,
  displayName: TEST_CONFIG.testUser.displayName,
};

/**
 * Install authentication bypass system on a page
 * This intercepts Matrix authentication requests and provides mock responses
 */
export async function installAuthBypass(page: Page, mockAuth: MockAuthState = DEFAULT_MOCK_AUTH): Promise<void> {
  console.log('🔧 Installing E2E authentication bypass system...');
  
  // Intercept Matrix API authentication requests
  await page.route('**/_matrix/client/r0/login', (route) => {
    console.log('   🔄 Intercepted Matrix login request');
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: mockAuth.accessToken,
        user_id: mockAuth.userId,
        device_id: mockAuth.deviceId,
        home_server: new URL(mockAuth.homeserverUrl).hostname,
        well_known: {
          'm.homeserver': {
            base_url: mockAuth.homeserverUrl
          }
        }
      })
    });
  });

  // Intercept Matrix sync requests  
  await page.route('**/_matrix/client/r0/sync*', (route) => {
    console.log('   🔄 Intercepted Matrix sync request');
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        next_batch: `mock_sync_${Date.now()}`,
        rooms: { 
          join: {}, 
          invite: {}, 
          leave: {} 
        },
        presence: { events: [] },
        account_data: { events: [] },
        to_device: { events: [] }
      })
    });
  });

  // Intercept other common Matrix API requests
  await page.route('**/_matrix/client/**', (route) => {
    const url = route.request().url();
    console.log(`   🔄 Intercepted Matrix API request: ${route.request().method()} ${url}`);
    
    // Default success response for most Matrix API calls
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, mock: true })
    });
  });

  // Inject client-side authentication bypass
  await page.addInitScript((auth) => {
    // Mark as E2E test mode
    window.__E2E_TEST_MODE__ = true;
    
    // Mock Matrix client localStorage entries
    if (window.localStorage) {
      localStorage.setItem('mx_hs_url', auth.homeserverUrl);
      localStorage.setItem('mx_user_id', auth.userId);
      localStorage.setItem('mx_access_token', auth.accessToken);  
      localStorage.setItem('mx_device_id', auth.deviceId);
      localStorage.setItem('mx_display_name', auth.displayName);
      localStorage.setItem('e2e_auth_bypass', 'true');
    }
    
    // Mock Matrix SDK methods if they exist
    window.__mockMatrixClient__ = {
      isLoggedIn: () => true,
      getUserId: () => auth.userId,
      getAccessToken: () => auth.accessToken,
      getDeviceId: () => auth.deviceId,
      getHomeserverUrl: () => auth.homeserverUrl,
      getDisplayName: () => Promise.resolve(auth.displayName),
      
      // Mock spaces/rooms data
      getVisibleRooms: () => [],
      getRooms: () => [],
      getRoom: () => null,
      
      // Mock client lifecycle methods
      startClient: () => Promise.resolve(),
      stopClient: () => {},
      sync: () => Promise.resolve(),
      
      // Mock event handling
      on: () => {},
      off: () => {},
      emit: () => {},
    };
    
    console.log('✅ E2E Authentication bypass system initialized');
    console.log(`   User: ${auth.userId}`);
    console.log(`   Device: ${auth.deviceId}`);
    
  }, mockAuth);

  console.log('✅ Authentication bypass system installed');
}

/**
 * Bypass authentication by directly setting authenticated state
 * This skips the login form entirely and goes straight to authenticated state
 */
export async function bypassAuthenticationDirectly(page: Page, mockAuth: MockAuthState = DEFAULT_MOCK_AUTH): Promise<void> {
  console.log('🚀 Bypassing authentication directly...');
  
  // Install the bypass system first
  await installAuthBypass(page, mockAuth);
  
  // Navigate to root and set up authenticated state
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // If still redirected to sign-in, force navigation away
  if (page.url().includes('/sign-in')) {
    console.log('   🔄 Still on sign-in page, forcing navigation...');
    
    // Try to navigate to main app areas
    const targetUrls = ['/channels/@me', '/', '/settings'];
    
    for (const url of targetUrls) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      
      if (!page.url().includes('/sign-in')) {
        console.log(`   ✅ Successfully navigated to: ${page.url()}`);
        break;
      }
    }
  }
  
  console.log('✅ Authentication bypassed successfully');
}

/**
 * Check if authentication bypass is active on a page
 */
export async function isAuthBypassActive(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return window.__E2E_TEST_MODE__ && 
           localStorage.getItem('e2e_auth_bypass') === 'true' &&
           localStorage.getItem('mx_access_token')?.startsWith('e2e_mock_');
  });
}

/**
 * Clean up authentication bypass state
 */
export async function cleanupAuthBypass(page: Page): Promise<void> {
  await page.evaluate(() => {
    if (window.localStorage) {
      localStorage.removeItem('mx_hs_url');
      localStorage.removeItem('mx_user_id');
      localStorage.removeItem('mx_access_token');
      localStorage.removeItem('mx_device_id');
      localStorage.removeItem('mx_display_name');
      localStorage.removeItem('e2e_auth_bypass');
    }
    
    delete window.__E2E_TEST_MODE__;
    delete window.__mockMatrixClient__;
  });
  
  console.log('🧹 Authentication bypass state cleaned up');
}