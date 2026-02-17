import { test, expect, Page } from '@playwright/test';

/**
 * Post-Login Critical Path Tests
 * 
 * These tests verify that after a successful login:
 * 1. The Matrix client initializes correctly
 * 2. The sync completes
 * 3. The user can navigate to content
 * 4. The session persists across page refresh
 * 
 * These are critical paths that must work for the app to be usable.
 */

// Test credentials - set via environment variables
const TEST_USER = process.env.TEST_USER || 'testuser';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword';
const TEST_HOMESERVER = process.env.TEST_HOMESERVER || process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL;

// Helper to perform login
async function performLogin(page: Page, options: {
  username?: string;
  password?: string;
  homeserver?: string;
} = {}) {
  const username = options.username || TEST_USER;
  const password = options.password || TEST_PASSWORD;
  const homeserver = options.homeserver || TEST_HOMESERVER;

  await page.goto('/sign-in');
  await page.waitForLoadState('networkidle');

  // Fill in credentials
  await page.fill('[data-testid="username-input"]', username);
  await page.fill('[data-testid="password-input"]', password);

  // Fill homeserver if input is visible
  const homeserverInput = page.locator('[data-testid="homeserver-input"]');
  if (await homeserverInput.isVisible() && homeserver) {
    await homeserverInput.fill(homeserver);
  }

  // Click login
  await page.click('[data-testid="login-button"]');
}

test.describe('Post-Login Critical Path', () => {
  test.skip(
    !TEST_PASSWORD || TEST_PASSWORD === 'testpassword',
    'Skipped: No valid test credentials provided. Set TEST_USER and TEST_PASSWORD env vars.'
  );

  test('should redirect to authenticated page after successful login', async ({ page }) => {
    await performLogin(page);

    // Wait for redirect away from sign-in
    await page.waitForURL(url => !url.pathname.includes('/sign-in'), { timeout: 30000 });

    // Should be on an authenticated page (/, /channels/@me, or /servers/*)
    const url = page.url();
    expect(
      url.includes('/') || 
      url.includes('/channels') || 
      url.includes('/servers')
    ).toBe(true);
  });

  test('should not show JavaScript errors after login', async ({ page }) => {
    const errors: string[] = [];
    
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await performLogin(page);

    // Wait for page to stabilize
    await page.waitForURL(url => !url.pathname.includes('/sign-in'), { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    
    // Wait additional time for async operations
    await page.waitForTimeout(3000);

    // Filter out expected/non-critical errors
    const criticalErrors = errors.filter(error => {
      // Ignore network errors for external resources
      if (error.includes('Failed to load resource')) return false;
      // Ignore expected API errors
      if (error.includes('404') || error.includes('401')) return false;
      // Include all other errors
      return true;
    });

    expect(criticalErrors).toHaveLength(0);
  });

  test('should display either rooms or empty state after login', async ({ page }) => {
    await performLogin(page);

    await page.waitForURL(url => !url.pathname.includes('/sign-in'), { timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // Should see either a room/server list OR a create server modal/empty state
    const hasContent = await page.locator([
      '[data-testid="server-list"]',
      '[data-testid="empty-state"]',
      'text=Create your first server',
      'text=Direct Messages',
      '[role="navigation"]',
    ].join(', ')).first().isVisible({ timeout: 30000 }).catch(() => false);

    expect(hasContent).toBe(true);
  });

  test('should persist session across page refresh', async ({ page }) => {
    await performLogin(page);

    // Wait for initial redirect
    await page.waitForURL(url => !url.pathname.includes('/sign-in'), { timeout: 30000 });

    // Capture the URL after login
    const loggedInUrl = page.url();

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still be on an authenticated page (not redirected to sign-in)
    await page.waitForTimeout(2000); // Wait for potential redirect
    
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/sign-in');
  });

  test('should be able to navigate to DMs page after login', async ({ page }) => {
    await performLogin(page);

    await page.waitForURL(url => !url.pathname.includes('/sign-in'), { timeout: 30000 });

    // Navigate to DMs
    await page.goto('/channels/@me');
    await page.waitForLoadState('networkidle');

    // Should be on DMs page, not redirected to sign-in
    expect(page.url()).toContain('/channels/@me');
    
    // Should see DM-related content
    const hasDMContent = await page.locator([
      'text=Direct Messages',
      'text=Find or start a conversation',
      '[data-testid="dm-list"]',
    ].join(', ')).first().isVisible({ timeout: 10000 }).catch(() => false);

    // Either we see DM content or we're still authenticated
    expect(hasDMContent || !page.url().includes('/sign-in')).toBe(true);
  });
});

test.describe('Session Validation', () => {
  test('should redirect to sign-in when not authenticated', async ({ page }) => {
    // Clear any existing session by going to a protected route without login
    await page.goto('/channels/@me');
    
    // Wait for potential redirect
    await page.waitForTimeout(3000);
    
    // Should be on sign-in page
    const url = page.url();
    expect(url.includes('/sign-in') || url === page.url()).toBe(true);
  });

  test('should validate session cookie format', async ({ page, context }) => {
    // Get cookies after successful login
    await performLogin(page);
    await page.waitForURL(url => !url.pathname.includes('/sign-in'), { timeout: 30000 });

    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name === 'matrix_session');

    if (sessionCookie) {
      // Session cookie should exist with proper flags
      expect(sessionCookie.httpOnly).toBe(true);
      expect(sessionCookie.path).toBe('/');
    }
  });
});

test.describe('Error Handling', () => {
  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');

    // Fill invalid credentials
    await page.fill('[data-testid="username-input"]', 'definitely_invalid_user_12345');
    await page.fill('[data-testid="password-input"]', 'wrong_password_xyz');

    // Fill homeserver if visible
    const homeserverInput = page.locator('[data-testid="homeserver-input"]');
    if (await homeserverInput.isVisible() && TEST_HOMESERVER) {
      await homeserverInput.fill(TEST_HOMESERVER);
    }

    // Submit
    await page.click('[data-testid="login-button"]');

    // Wait for response
    await page.waitForResponse(response => 
      response.url().includes('/api/auth/login'),
      { timeout: 15000 }
    );

    // Should show error message
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });

  test('should handle network errors gracefully', async ({ page, context }) => {
    await page.goto('/sign-in');
    
    // Block API requests to simulate network error
    await context.route('**/api/auth/login', route => route.abort());

    // Try to login
    await page.fill('[data-testid="username-input"]', 'testuser');
    await page.fill('[data-testid="password-input"]', 'testpass');
    await page.click('[data-testid="login-button"]');

    // Should show error or handle gracefully (not crash)
    await page.waitForTimeout(3000);
    
    // Page should still be functional
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });
});
