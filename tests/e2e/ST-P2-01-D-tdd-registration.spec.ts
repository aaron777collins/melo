/**
 * E2E Test Suite for ST-P2-01-D: Successful Registration Flow with Matrix API Integration
 * 
 * Following TDD methodology: RED → GREEN → REFACTOR
 * Testing AC-4: Successful Registration Flow
 * 
 * **Given** a user with valid, unique credentials
 * **When** they complete the registration form and submit
 * **Then** they are registered successfully and either logged in automatically OR shown a success message
 */

import { test, expect, Page } from '@playwright/test';

test.describe('ST-P2-01-D: Matrix Registration Integration (TDD)', () => {

  // Helper function to generate unique test credentials
  function generateTestCredentials() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return {
      username: `testuser_${timestamp}_${random}`,
      email: `testuser_${timestamp}_${random}@test.com`,
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!'
    };
  }

  // Helper function to wait for page to be ready
  async function waitForRegistrationPageReady(page: Page) {
    // Wait for the main form elements to be present and enabled
    await expect(page.locator('input[name="username"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('input[name="username"]')).toBeEnabled({ timeout: 5000 });
    
    // Ensure all form fields are present
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  }

  // Helper function to fill registration form
  async function fillRegistrationForm(page: Page, credentials: any) {
    await page.fill('input[name="username"]', credentials.username);
    await page.fill('input[name="email"]', credentials.email);
    await page.fill('input[name="password"]', credentials.password);
    await page.fill('input[name="confirmPassword"]', credentials.confirmPassword);
    
    // Wait for form validation to complete
    await page.waitForTimeout(1000);
  }

  test('RED Phase: Verify registration form loads correctly', async ({ page }) => {
    // Navigate to sign-up page
    await page.goto('/sign-up');
    
    // Wait for page to be ready
    await waitForRegistrationPageReady(page);
    
    // Take screenshot for evidence
    await page.screenshot({ 
      path: 'test-results/ST-P2-01-D-registration-form-loaded.png',
      fullPage: true 
    });
    
    // Verify all required form elements are present
    await expect(page.locator('h1:has-text("Create Account")')).toBeVisible();
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]:has-text("Create Account")')).toBeVisible();
  });

  test('AC-4: Valid registration creates Matrix user successfully', async ({ page }) => {
    const credentials = generateTestCredentials();
    
    // Navigate to sign-up page
    await page.goto('/sign-up');
    await waitForRegistrationPageReady(page);
    
    // Fill out the registration form with valid, unique credentials
    await fillRegistrationForm(page, credentials);
    
    // Take screenshot before submission
    await page.screenshot({ 
      path: `test-results/ST-P2-01-D-before-submit-${credentials.username}.png`,
      fullPage: true 
    });
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Wait for either success redirect OR error message
    // We should either get redirected to home page OR see an error
    await Promise.race([
      // Success path: redirected to home
      page.waitForURL('/', { timeout: 15000 }),
      // Error path: error message appears
      page.waitForSelector('[data-testid="error-message"]', { timeout: 15000 }),
      // Loading state: wait for submission to complete
      page.waitForTimeout(15000)
    ]);
    
    // Take screenshot after submission attempt
    await page.screenshot({ 
      path: `test-results/ST-P2-01-D-after-submit-${credentials.username}.png`,
      fullPage: true 
    });
    
    // Check what happened
    const currentUrl = page.url();
    const hasError = await page.locator('[data-testid="error-message"]').isVisible();
    
    if (currentUrl === 'http://localhost:3000/') {
      // SUCCESS: User was redirected to home page (logged in)
      console.log(`✅ Registration successful for ${credentials.username} - redirected to home`);
      
      // Take screenshot of logged in state
      await page.screenshot({ 
        path: `test-results/ST-P2-01-D-success-logged-in-${credentials.username}.png`,
        fullPage: true 
      });
      
      // This is the expected behavior for AC-4
      expect(currentUrl).toBe('http://localhost:3000/');
      
    } else if (hasError) {
      // ERROR: Registration failed
      const errorText = await page.locator('[data-testid="error-message"]').textContent();
      console.log(`❌ Registration failed for ${credentials.username}: ${errorText}`);
      
      // This indicates an implementation issue that needs to be fixed
      throw new Error(`Registration failed: ${errorText}`);
      
    } else {
      // UNKNOWN: Still on registration page but no error visible
      console.log(`⚠️  Registration attempt completed but still on registration page for ${credentials.username}`);
      
      // Check if there are any validation errors
      const validationErrors = await page.locator('.text-red-400').allTextContents();
      if (validationErrors.length > 0) {
        console.log('Validation errors:', validationErrors);
        throw new Error(`Registration blocked by validation: ${validationErrors.join(', ')}`);
      }
      
      // Check if submit button is still disabled
      const submitButton = page.locator('button[type="submit"]');
      const isDisabled = await submitButton.isDisabled();
      if (isDisabled) {
        console.log('Submit button is disabled, checking form state...');
        throw new Error('Submit button disabled - form validation issue');
      }
      
      // Unknown state - this needs investigation
      throw new Error('Registration attempt completed but outcome unclear');
    }
  });

  test('AC-4: Registration with existing username shows appropriate error', async ({ page }) => {
    const credentials = generateTestCredentials();
    // Use a known reserved username that should be rejected
    credentials.username = 'admin';
    
    await page.goto('/sign-up');
    await waitForRegistrationPageReady(page);
    
    await fillRegistrationForm(page, credentials);
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Should show error message for reserved username
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 10000 });
    
    // Take screenshot of error state
    await page.screenshot({ 
      path: `test-results/ST-P2-01-D-username-error-admin.png`,
      fullPage: true 
    });
    
    // Should not redirect to home page
    expect(page.url()).not.toBe('http://localhost:3000/');
  });

  test('AC-4: Registration validates password strength requirements', async ({ page }) => {
    const credentials = generateTestCredentials();
    credentials.password = '123';  // Weak password
    credentials.confirmPassword = '123';
    
    await page.goto('/sign-up');
    await waitForRegistrationPageReady(page);
    
    await fillRegistrationForm(page, credentials);
    
    // Should show password strength as weak
    await expect(page.locator('[data-testid="password-strength-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-strength-indicator"]')).toContainText('Weak');
    
    // Submit should be disabled or show validation error
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeDisabled();
    
    // Take screenshot of weak password state
    await page.screenshot({ 
      path: `test-results/ST-P2-01-D-weak-password-validation.png`,
      fullPage: true 
    });
  });

  test('AC-4: Registration shows real-time username availability checking', async ({ page }) => {
    const credentials = generateTestCredentials();
    
    await page.goto('/sign-up');
    await waitForRegistrationPageReady(page);
    
    // Type username and wait for availability check
    await page.fill('input[name="username"]', credentials.username);
    
    // Should show checking indicator
    await expect(page.locator('[data-testid="username-checking-indicator"]')).toBeVisible({ timeout: 5000 });
    
    // Should then show availability result
    await expect(page.locator('[data-testid="username-availability-indicator"]')).toBeVisible({ timeout: 10000 });
    
    // Take screenshot of availability check
    await page.screenshot({ 
      path: `test-results/ST-P2-01-D-username-availability-${credentials.username}.png`,
      fullPage: true 
    });
  });

  test('AC-4: Matrix homeserver configuration is correct', async ({ page }) => {
    await page.goto('/sign-up');
    await waitForRegistrationPageReady(page);
    
    // In private mode, should show the configured homeserver
    await expect(page.locator('[data-testid="private-mode-badge"]')).toBeVisible();
    
    // Should show dev2.aaroncollins.info as the homeserver
    await expect(page.locator('text=dev2.aaroncollins.info')).toBeVisible();
    
    // Take screenshot of homeserver config
    await page.screenshot({ 
      path: `test-results/ST-P2-01-D-homeserver-config.png`,
      fullPage: true 
    });
  });

});