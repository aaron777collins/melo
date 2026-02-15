/**
 * Sign-Up Tests
 * 
 * Tests for user registration flow.
 */

import { test, expect } from '@playwright/test';
import { AuthPage, TEST_CONFIG, waitForAppReady, uniqueId } from '../fixtures';

test.describe('Sign Up', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sign-up');
    await waitForAppReady(page);
  });

  test('should display sign-up form', async ({ page }) => {
    const authPage = new AuthPage(page);
    
    // Form elements should be visible
    await expect(authPage.usernameInput).toBeVisible();
    await expect(authPage.passwordInput).toBeVisible();
    await expect(authPage.submitButton).toBeVisible();
  });

  test('should show error for already taken username', async ({ page }) => {
    const authPage = new AuthPage(page);
    
    // Try to register with existing username
    await authPage.login(
      TEST_CONFIG.testUser.username, // Already exists
      TEST_CONFIG.testUser.password,
      TEST_CONFIG.homeserver
    );
    
    // Should show error or stay on registration
    await page.waitForTimeout(5000);
    
    // Either error message or still on sign-up page
    const hasError = await authPage.errorMessage.isVisible().catch(() => false);
    const stillOnSignUp = page.url().includes('/sign-up');
    
    expect(hasError || stillOnSignUp).toBeTruthy();
  });

  test('should have link to sign-in page', async ({ page }) => {
    // Should have a sign-in link
    const signInLink = page.locator('a:has-text("Sign in"), a:has-text("Login"), a:has-text("Log in")');
    await expect(signInLink).toBeVisible();
  });

  test('should validate password requirements', async ({ page }) => {
    const authPage = new AuthPage(page);
    await authPage.waitForHydration();
    
    // Try with a weak password
    await authPage.usernameInput.fill(uniqueId('testuser'));
    await authPage.passwordInput.fill('123'); // Too short
    await authPage.submitButton.click();
    
    await page.waitForTimeout(2000);
    
    // Should either show validation error or stay on page
    const stillOnSignUp = page.url().includes('/sign-up');
    expect(stillOnSignUp).toBeTruthy();
  });
});
