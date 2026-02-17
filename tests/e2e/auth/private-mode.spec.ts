import { test, expect } from '@playwright/test';

/**
 * Private Mode E2E Tests
 * 
 * Tests the private mode functionality that restricts logins
 * to users from the configured homeserver only.
 * 
 * IMPORTANT: Per Aaron's requirements:
 * - Private mode is THE DEFAULT (no env var needed)
 * - Public mode is the EXCEPTION (requires MELO_PUBLIC_MODE=true)
 * - Invite-only is THE DEFAULT in private mode
 * 
 * These tests verify that the secure defaults are working.
 */

// Helper to check if we're in public mode (the exception, not the default)
const isPublicMode = () => process.env.NEXT_PUBLIC_MELO_PUBLIC_MODE === 'true';

test.describe('Private Mode Enforcement (DEFAULT)', () => {
  // These tests verify private mode is the default behavior
  
  test.beforeEach(async ({ page }) => {
    // Navigate to sign-in page
    await page.goto('/sign-in');
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should show private server badge by DEFAULT (no env var needed)', async ({ page }) => {
    // Look for the private mode badge
    const privateBadge = page.locator('[data-testid="private-mode-badge"]');
    
    // Private mode is the DEFAULT - badge should be visible unless PUBLIC mode is explicitly enabled
    if (!isPublicMode()) {
      await expect(privateBadge).toBeVisible();
      await expect(privateBadge).toContainText('Private Server');
    }
  });

  test('should hide homeserver input by DEFAULT (private mode)', async ({ page }) => {
    const homeserverInput = page.locator('[data-testid="homeserver-input"]');
    
    // Private mode is DEFAULT - homeserver input should be hidden
    if (!isPublicMode()) {
      await expect(homeserverInput).not.toBeVisible();
    } else {
      // Public mode is the exception - homeserver input should be visible
      await expect(homeserverInput).toBeVisible();
    }
  });

  test('should display configured homeserver in private mode (DEFAULT)', async ({ page }) => {
    // Private mode is DEFAULT - should show the configured homeserver
    if (!isPublicMode()) {
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

test.describe('Private Mode API Enforcement (DEFAULT)', () => {
  test('should reject login attempts from unauthorized homeservers by DEFAULT', async ({ request }) => {
    // Private mode is THE DEFAULT - external homeservers should be rejected
    // Try to login with an external homeserver
    const response = await request.post('/api/auth/login', {
      data: {
        username: 'testuser',
        password: 'testpassword',
        homeserverUrl: 'https://matrix.org' // External homeserver - should be rejected by default
      }
    });

    // Private mode is DEFAULT - should get 403 unless PUBLIC mode explicitly enabled
    if (!isPublicMode()) {
      // Should get 403 (access denied) for external homeserver
      expect(response.status()).toBe(403);
    }
  });

  test('should include invite-required message in error response by DEFAULT', async ({ request }) => {
    // Private mode with invite-only is THE DEFAULT
    const response = await request.post('/api/auth/login', {
      data: {
        username: 'testuser',
        password: 'testpassword',
        homeserverUrl: 'https://matrix.org'
      }
    });

    if (!isPublicMode() && response.status() === 403) {
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('M_FORBIDDEN');
      // Should mention invitation requirement (invite-only is default)
      expect(body.error.message).toMatch(/invitation|private/i);
    }
  });

  test('should allow configured homeserver by DEFAULT', async ({ request }) => {
    // Get the configured homeserver
    const configuredHomeserver = process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL;
    
    if (!isPublicMode() && configuredHomeserver) {
      // Login with configured homeserver should NOT be rejected for access control
      // (may still fail for invalid credentials, but not 403)
      const response = await request.post('/api/auth/login', {
        data: {
          username: 'testuser',
          password: 'invalidpassword',
          homeserverUrl: configuredHomeserver
        }
      });

      // Should NOT be 403 (access denied) - homeserver is allowed
      // May be 401 (invalid credentials) which is expected
      expect(response.status()).not.toBe(403);
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
