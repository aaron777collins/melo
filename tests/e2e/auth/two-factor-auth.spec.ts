import { test, expect } from '@playwright/test';
import { authenticateSync, verifySync } from 'otplib';

// Mock test user credentials (adjust for your test environment)
const TEST_USER = {
  username: 'test_2fa_user',
  password: 'test_password_123',
  homeserver: process.env.TEST_HOMESERVER_URL || 'https://matrix.org',
  displayName: 'Test 2FA User'
};

test.describe('Two-Factor Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('2FA Setup', () => {
    test('should allow user to set up 2FA with QR code', async ({ page }) => {
      // Login first
      await page.goto('/sign-in');
      
      await page.fill('input[placeholder*="user:matrix.org"]', TEST_USER.username);
      await page.fill('input[placeholder*="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      
      // Navigate to security settings
      await page.waitForURL('/');
      await page.goto('/settings/security');
      
      // Click setup 2FA button
      await page.click('text=Set up Two-Factor Authentication');
      
      // Verify setup modal is shown
      await expect(page.locator('text=Set up Two-Factor Authentication')).toBeVisible();
      
      // Step 1: Generate QR code
      await page.click('text=Generate QR Code');
      
      // Verify QR code is generated
      await expect(page.locator('img[alt="2FA QR Code"]')).toBeVisible();
      
      // Verify manual entry secret is shown
      const secretElement = page.locator('code').first();
      await expect(secretElement).toBeVisible();
      
      const secret = await secretElement.textContent();
      expect(secret).toBeTruthy();
      expect(secret?.length).toBeGreaterThan(10);
      
      // Step 2: Verify code
      // Generate a TOTP code using the displayed secret
      const totpCode = authenticateSync({ secret: secret!, encoding: 'ascii' });
      
      await page.fill('input[placeholder="000000"]', totpCode);
      await page.click('text=Verify');
      
      // Step 3: Backup codes should be shown
      await expect(page.locator('text=Save Your Backup Codes')).toBeVisible();
      
      // Verify backup codes are displayed
      const backupCodes = page.locator('code').nth(1); // Skip the secret, get backup codes
      await expect(backupCodes).toBeVisible();
      
      // Continue to complete setup
      await page.click('text=I\'ve Saved My Codes');
      
      // Step 4: Complete setup
      await expect(page.locator('text=Complete Setup')).toBeVisible();
      await page.click('text=Complete Setup');
      
      // Verify 2FA is now enabled
      await expect(page.locator('text=Status:')).toBeVisible();
      await expect(page.locator('text=Enabled')).toBeVisible();
    });

    test('should show validation error for invalid verification code', async ({ page }) => {
      // Setup process until verification step
      await page.goto('/sign-in');
      await page.fill('input[placeholder*="user:matrix.org"]', TEST_USER.username);
      await page.fill('input[placeholder*="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      
      await page.goto('/settings/security');
      await page.click('text=Set up Two-Factor Authentication');
      await page.click('text=Generate QR Code');
      
      // Enter invalid code
      await page.fill('input[placeholder="000000"]', '000000');
      await page.click('text=Verify');
      
      // Should show error
      await expect(page.locator('text=Invalid verification code')).toBeVisible();
    });

    test('should allow canceling 2FA setup', async ({ page }) => {
      await page.goto('/sign-in');
      await page.fill('input[placeholder*="user:matrix.org"]', TEST_USER.username);
      await page.fill('input[placeholder*="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      
      await page.goto('/settings/security');
      await page.click('text=Set up Two-Factor Authentication');
      
      // Cancel setup
      await page.click('text=Cancel');
      
      // Should return to main 2FA status
      await expect(page.locator('text=Not configured')).toBeVisible();
    });
  });

  test.describe('2FA Login', () => {
    // This test assumes 2FA has been set up for the test user
    test('should require 2FA verification during login', async ({ page, context }) => {
      // Clear any existing session
      await context.clearCookies();
      
      await page.goto('/sign-in');
      
      // Enter credentials
      await page.fill('input[placeholder*="user:matrix.org"]', TEST_USER.username);
      await page.fill('input[placeholder*="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      
      // Should show 2FA prompt
      await expect(page.locator('text=Two-Factor Authentication')).toBeVisible();
      await expect(page.locator('text=Enter the verification code')).toBeVisible();
      
      // Verify form elements
      await expect(page.locator('input[placeholder="000000"]')).toBeVisible();
      await expect(page.locator('button:text("Verify")')).toBeVisible();
      await expect(page.locator('button:text("Use Backup Code Instead")')).toBeVisible();
    });

    test('should login successfully with correct TOTP code', async ({ page, context }) => {
      // This test would need a known secret to generate valid codes
      // For demo purposes, we'll mock the API response
      
      await context.clearCookies();
      await page.goto('/sign-in');
      
      // Mock successful 2FA verification
      await page.route('**/api/auth/verify-2fa', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              session: { 
                accessToken: 'mock_token',
                userId: '@test:matrix.org',
                homeserverUrl: 'https://matrix.org'
              },
              user: {
                userId: '@test:matrix.org',
                displayName: 'Test User'
              }
            }
          })
        });
      });
      
      await page.fill('input[placeholder*="user:matrix.org"]', TEST_USER.username);
      await page.fill('input[placeholder*="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      
      // Should show 2FA prompt
      await expect(page.locator('input[placeholder="000000"]')).toBeVisible();
      
      // Enter any code (will be mocked)
      await page.fill('input[placeholder="000000"]', '123456');
      await page.click('button:text("Verify")');
      
      // Should redirect to main app
      await page.waitForURL('/');
    });

    test('should show error for invalid 2FA code', async ({ page, context }) => {
      await context.clearCookies();
      
      // Mock failed 2FA verification
      await page.route('**/api/auth/verify-2fa', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'M_FORBIDDEN',
              message: 'Invalid verification code'
            }
          })
        });
      });
      
      await page.goto('/sign-in');
      await page.fill('input[placeholder*="user:matrix.org"]', TEST_USER.username);
      await page.fill('input[placeholder*="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      
      // Enter invalid code
      await page.fill('input[placeholder="000000"]', '000000');
      await page.click('button:text("Verify")');
      
      // Should show error
      await expect(page.locator('text=Invalid verification code')).toBeVisible();
    });

    test('should allow switching between TOTP and backup code', async ({ page }) => {
      await page.goto('/sign-in');
      
      // Mock 2FA required response
      await page.route('**/api/auth/login', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            requiresTwoFactor: true,
            message: 'Two-factor authentication required'
          })
        });
      });
      
      await page.fill('input[placeholder*="user:matrix.org"]', TEST_USER.username);
      await page.fill('input[placeholder*="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      
      // Should show TOTP input by default
      await expect(page.locator('text=Verification Code')).toBeVisible();
      await expect(page.locator('input[placeholder="000000"]')).toBeVisible();
      
      // Switch to backup code
      await page.click('text=Use Backup Code Instead');
      
      // Should show backup code input
      await expect(page.locator('text=Backup Code')).toBeVisible();
      await expect(page.locator('input[placeholder="Enter backup code"]')).toBeVisible();
      
      // Switch back to TOTP
      await page.click('text=Use Authenticator Code Instead');
      
      // Should show TOTP input again
      await expect(page.locator('text=Verification Code')).toBeVisible();
      await expect(page.locator('input[placeholder="000000"]')).toBeVisible();
    });

    test('should allow canceling 2FA verification', async ({ page }) => {
      await page.goto('/sign-in');
      
      // Mock 2FA required response
      await page.route('**/api/auth/login', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            requiresTwoFactor: true,
            message: 'Two-factor authentication required'
          })
        });
      });
      
      await page.fill('input[placeholder*="user:matrix.org"]', TEST_USER.username);
      await page.fill('input[placeholder*="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      
      // Cancel 2FA
      await page.click('text=Cancel');
      
      // Should return to login form
      await expect(page.locator('text=Sign in to your Matrix account')).toBeVisible();
      await expect(page.locator('input[placeholder*="password"]')).toBeVisible();
    });
  });

  test.describe('2FA Management', () => {
    test('should allow regenerating backup codes', async ({ page }) => {
      // Login and navigate to security settings
      await page.goto('/sign-in');
      await page.fill('input[placeholder*="user:matrix.org"]', TEST_USER.username);
      await page.fill('input[placeholder*="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      
      await page.goto('/settings/security');
      
      // Assuming 2FA is enabled, click regenerate backup codes
      await page.click('text=Regenerate Backup Codes');
      
      // Should show success message
      await expect(page.locator('text=Backup codes regenerated')).toBeVisible();
    });

    test('should allow disabling 2FA with verification', async ({ page }) => {
      await page.goto('/sign-in');
      await page.fill('input[placeholder*="user:matrix.org"]', TEST_USER.username);
      await page.fill('input[placeholder*="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      
      await page.goto('/settings/security');
      
      // Click disable 2FA
      await page.click('text=Disable 2FA');
      
      // Should show disable confirmation form
      await expect(page.locator('text=Disable Two-Factor Authentication')).toBeVisible();
      await expect(page.locator('input[placeholder*="TOTP code or backup code"]')).toBeVisible();
      
      // Cancel disable
      await page.click('text=Cancel');
      
      // Should return to main 2FA status
      await expect(page.locator('text=Status:')).toBeVisible();
    });

    test('should disable 2FA with valid code', async ({ page }) => {
      // Mock successful disable
      await page.route('**/api/auth/verify-2fa', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              session: { accessToken: 'mock_token' },
              user: { userId: '@test:matrix.org' }
            }
          })
        });
      });
      
      await page.goto('/sign-in');
      await page.fill('input[placeholder*="user:matrix.org"]', TEST_USER.username);
      await page.fill('input[placeholder*="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      
      await page.goto('/settings/security');
      await page.click('text=Disable 2FA');
      
      // Enter verification code
      await page.fill('input[placeholder*="TOTP code or backup code"]', '123456');
      await page.click('text=Disable 2FA');
      
      // Should show success and return to disabled state
      await expect(page.locator('text=Two-Factor Authentication disabled')).toBeVisible();
      await expect(page.locator('text=Not configured')).toBeVisible();
    });
  });
});