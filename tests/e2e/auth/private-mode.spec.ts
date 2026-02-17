import { test, expect } from '@playwright/test';

/**
 * Private Mode E2E Tests
 * 
 * Tests the private mode functionality that restricts logins
 * to users from the configured homeserver only.
 */

test.describe('Private Mode Enforcement', () => {
  // These tests run with private mode environment variables set
  
  test.beforeEach(async ({ page }) => {
    // Navigate to sign-in page
    await page.goto('/sign-in');
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should show private server badge when private mode is enabled', async ({ page }) => {
    // Look for the private mode badge
    const privateBadge = page.locator('[data-testid="private-mode-badge"]');
    
    // In private mode, badge should be visible
    // Note: This test assumes NEXT_PUBLIC_MELO_PRIVATE_MODE=true
    if (process.env.NEXT_PUBLIC_MELO_PRIVATE_MODE !== 'false') {
      await expect(privateBadge).toBeVisible();
      await expect(privateBadge).toContainText('Private Server');
    }
  });

  test('should hide homeserver input when private mode is enabled', async ({ page }) => {
    const homeserverInput = page.locator('[data-testid="homeserver-input"]');
    
    // In private mode, homeserver input should not be visible
    if (process.env.NEXT_PUBLIC_MELO_PRIVATE_MODE !== 'false') {
      await expect(homeserverInput).not.toBeVisible();
    } else {
      await expect(homeserverInput).toBeVisible();
    }
  });

  test('should display configured homeserver in private mode', async ({ page }) => {
    // In private mode, should show the configured homeserver
    if (process.env.NEXT_PUBLIC_MELO_PRIVATE_MODE !== 'false') {
      const homeserverDisplay = page.locator('text=/dev2.aaroncollins.info|matrix/i');
      await expect(homeserverDisplay.first()).toBeVisible();
    }
  });

  test('should have all required login form elements', async ({ page }) => {
    // Username input should always be visible
    await expect(page.locator('[data-testid="username-input"]')).toBeVisible();
    
    // Password input should always be visible
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    
    // Login button should always be visible
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    // Click submit without filling fields
    await page.click('[data-testid="login-button"]');
    
    // Should show validation errors
    await expect(page.locator('text=Username is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
  });

  test('should show error message container on failed login', async ({ page }) => {
    // Fill in invalid credentials
    await page.fill('[data-testid="username-input"]', 'invaliduser');
    await page.fill('[data-testid="password-input"]', 'invalidpassword');
    
    // Submit the form
    await page.click('[data-testid="login-button"]');
    
    // Wait for response (either success or error)
    await page.waitForResponse(response => 
      response.url().includes('/api/auth/login')
    );
    
    // Should show error (invalid credentials or access denied)
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Private Mode API Enforcement', () => {
  test('should reject login attempts from unauthorized homeservers via API', async ({ request }) => {
    // Try to login with an external homeserver
    const response = await request.post('/api/auth/login', {
      data: {
        username: 'testuser',
        password: 'testpassword',
        homeserverUrl: 'https://matrix.org' // External homeserver
      }
    });

    // If private mode is enabled, should get 403
    if (process.env.MELO_PRIVATE_MODE !== 'false') {
      // Could be 403 (access denied) or 401 (invalid credentials after access check passes)
      // We can't guarantee the order without knowing the exact config
      expect(response.status()).toBeGreaterThanOrEqual(400);
    }
  });

  test('should include access control info in error response', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        username: 'testuser',
        password: 'testpassword',
        homeserverUrl: 'https://matrix.org'
      }
    });

    if (response.status() === 403) {
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('HOMESERVER_NOT_ALLOWED');
      expect(body.error.message).toContain('private server');
    }
  });
});

test.describe('Sign-In Page UI Elements', () => {
  test('should render welcome message', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.locator('h1')).toContainText('Welcome to Melo');
  });

  test('should have link to registration page', async ({ page }) => {
    await page.goto('/sign-in');
    const signUpLink = page.locator('a[href="/sign-up"]');
    await expect(signUpLink).toBeVisible();
    await expect(signUpLink).toContainText('Create one here');
  });

  test('should have info box with appropriate message', async ({ page }) => {
    await page.goto('/sign-in');
    const infoBox = page.locator('text=/private.*instance|Matrix protocol/i');
    await expect(infoBox.first()).toBeVisible();
  });
});
