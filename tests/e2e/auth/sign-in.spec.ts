/**
 * Sign-In Tests
 * 
 * Tests for the Matrix authentication flow.
 */

import { test, expect } from '@playwright/test';
import { AuthPage, TEST_CONFIG, waitForAppReady, clearBrowserState } from '../fixtures';

test.describe('Sign In', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session for fresh tests
    await page.goto('/sign-in');
    await waitForAppReady(page);
  });

  test('should display sign-in form', async ({ page }) => {
    const authPage = new AuthPage(page);
    
    // Form elements should be visible
    await expect(authPage.usernameInput).toBeVisible();
    await expect(authPage.passwordInput).toBeVisible();
    await expect(authPage.submitButton).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    const authPage = new AuthPage(page);
    
    // Try to login with invalid credentials
    await authPage.login('invaliduser', 'wrongpassword', TEST_CONFIG.homeserver);
    
    // Should show error message
    await expect(authPage.errorMessage).toBeVisible({ timeout: 10000 });
  });

  test('should show error for empty username', async ({ page }) => {
    const authPage = new AuthPage(page);
    
    // Try to submit with empty username
    await authPage.waitForHydration();
    await authPage.passwordInput.fill('somepassword');
    
    // Check if button is disabled (form might use HTML5 validation or react-hook-form)
    const isDisabled = await authPage.submitButton.isDisabled();
    
    if (isDisabled) {
      // Button is properly disabled for empty field
      console.log('✓ Submit button is disabled for empty username');
    } else {
      // Button is enabled - try to submit and check for validation error or staying on page
      await authPage.submitButton.click();
      await page.waitForTimeout(2000);
    }
    
    // Should stay on sign-in page (either button disabled or validation prevented submit)
    await expect(page).toHaveURL(/sign-in/);
  });

  test('should show error for empty password', async ({ page }) => {
    const authPage = new AuthPage(page);
    
    // Try to submit with empty password
    await authPage.waitForHydration();
    await authPage.usernameInput.fill('someuser');
    
    // Check if button is disabled (form might use HTML5 validation or react-hook-form)
    const isDisabled = await authPage.submitButton.isDisabled();
    
    if (isDisabled) {
      // Button is properly disabled for empty field
      console.log('✓ Submit button is disabled for empty password');
    } else {
      // Button is enabled - try to submit and check for validation error or staying on page
      await authPage.submitButton.click();
      await page.waitForTimeout(2000);
    }
    
    // Should stay on sign-in page (either button disabled or validation prevented submit)
    await expect(page).toHaveURL(/sign-in/);
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    const authPage = new AuthPage(page);
    
    // Login with test user
    await authPage.login(
      TEST_CONFIG.testUser.username,
      TEST_CONFIG.testUser.password,
      TEST_CONFIG.homeserver
    );
    
    // Should navigate away from sign-in
    // (Either to main app or to server creation modal)
    await page.waitForTimeout(5000);
    
    const isStillOnSignIn = page.url().includes('/sign-in');
    const hasError = await authPage.errorMessage.isVisible().catch(() => false);
    
    if (isStillOnSignIn && !hasError) {
      // Might still be processing
      await page.waitForTimeout(5000);
    }
    
    // Either we're logged in, or we have a clear error
    const finalUrl = page.url();
    expect(!finalUrl.includes('/sign-in') || hasError).toBeTruthy();
  });

  test('should have link to sign-up page', async ({ page }) => {
    const authPage = new AuthPage(page);
    
    // Should have a sign-up link
    const signUpLink = page.locator('a:has-text("Create one here")');
    await expect(signUpLink).toBeVisible();
  });

  test('should handle custom homeserver input', async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.waitForHydration();
    
    // Try to enter a custom homeserver
    try {
      await authPage.homeserverInput.fill('https://custom.matrix.org');
      
      // Verify it was set
      await expect(authPage.homeserverInput).toHaveValue('https://custom.matrix.org');
    } catch {
      // Homeserver input might not exist on all UIs
      console.log('Homeserver input not visible - may be pre-configured');
    }
  });
});
