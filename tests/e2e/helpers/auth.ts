/**
 * Authentication Helper Functions for E2E Tests
 * 
 * Uses MELO's login API which properly sets session cookies.
 * This enables real server-side authentication.
 */

import { Page, APIRequestContext } from '@playwright/test';
import { TEST_CONFIG } from '../fixtures/test-data';

// Re-export logout from auth-helpers
export { logout } from './auth-helpers';

/**
 * User credentials interface
 */
interface UserCredentials {
  username: string;
  password: string;
  userId?: string;
}

/**
 * Login via MELO's auth API (sets proper session cookies)
 */
export async function login(page: Page, user: UserCredentials): Promise<void> {
  console.log(`🔐 Logging in as user: ${user.username} (via MELO API)`);
  
  const baseUrl = TEST_CONFIG.baseUrl;
  
  // Navigate to sign-in page first to establish context
  await page.goto(`${baseUrl}/sign-in`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  
  // Wait a moment for page to be ready
  await page.waitForTimeout(1000);
  
  // Fill in the sign-in form
  await page.fill('[data-testid="username-input"], input[name="username"]', user.username);
  await page.fill('[data-testid="password-input"], input[name="password"]', user.password);
  
  console.log(`   ✓ Filled credentials`);
  
  // Submit the form
  await page.click('[data-testid="signin-button"], button[type="submit"]');
  
  console.log(`   ✓ Clicked submit`);
  
  // Wait for redirect (successful login redirects away from sign-in)
  try {
    await page.waitForURL((url) => !url.pathname.includes('sign-in'), { timeout: 30000 });
    console.log(`✅ Logged in as: ${user.username}`);
  } catch (error) {
    // Check for error message on page
    const pageContent = await page.content();
    if (pageContent.includes('Invalid') || pageContent.includes('error') || pageContent.includes('failed')) {
      throw new Error(`Login failed for ${user.username} - check credentials`);
    }
    throw error;
  }
}

/**
 * Alternative: Login via API directly (for faster setup)
 * This calls MELO's login endpoint which sets session cookies
 */
export async function loginViaAPI(page: Page, user: UserCredentials): Promise<void> {
  console.log(`🔐 Logging in as user: ${user.username} (via API)`);
  
  const baseUrl = TEST_CONFIG.baseUrl;
  
  // Make API request to login endpoint
  const response = await page.request.post(`${baseUrl}/api/auth/login`, {
    data: {
      username: user.username,
      password: user.password,
      homeserverUrl: TEST_CONFIG.homeserver
    }
  });
  
  if (!response.ok()) {
    const errorText = await response.text();
    throw new Error(`Login API failed for ${user.username}: ${response.status()} - ${errorText}`);
  }
  
  const result = await response.json();
  console.log(`   ✓ API login successful for ${result.data?.user?.userId || user.username}`);
  
  // Navigate to app (cookies should be set)
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  
  // Wait a moment for app to recognize auth
  await page.waitForTimeout(1000);
  
  console.log(`✅ Logged in as: ${user.username}`);
}

/**
 * Login with pre-configured test user
 */
export async function loginAsTestUser(page: Page): Promise<void> {
  return login(page, {
    username: TEST_CONFIG.testUser.username,
    password: TEST_CONFIG.testUser.password,
  });
}

/**
 * Login with secondary test user (for DM tests)
 */
export async function loginAsSecondUser(page: Page): Promise<void> {
  return login(page, {
    username: TEST_CONFIG.secondUser.username,
    password: TEST_CONFIG.secondUser.password,
  });
}

/**
 * Check if currently authenticated (client-side)
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const auth = localStorage.getItem('matrix-auth');
    if (!auth) return false;
    try {
      const parsed = JSON.parse(auth);
      return !!(parsed.accessToken && parsed.userId);
    } catch {
      return false;
    }
  });
}
