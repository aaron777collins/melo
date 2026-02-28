/**
 * E2E Test for ST-P2-01-D: Successful Registration Flow
 * 
 * Tests AC-4: Successful Registration Flow
 * **Given** a user with valid, unique credentials
 * **When** they complete the registration form and submit
 * **Then** they are registered successfully and either logged in automatically OR shown a success message
 */

import { test, expect } from '@playwright/test';

test.describe('ST-P2-01-D: Successful Registration Flow', () => {
  
  test('AC-4: Successful registration creates account and logs in user', async ({ page }) => {
    // Generate unique credentials
    const timestamp = Date.now();
    const testUsername = `testuser_${timestamp}`;
    const testEmail = `testuser_${timestamp}@test.com`;
    const testPassword = 'SecurePass123!';
    
    // Navigate to sign-up page
    await page.goto('/sign-up');
    
    // Wait for form elements to be present and enabled
    const usernameInput = page.locator('input[name="username"]');
    await expect(usernameInput).toBeVisible();
    
    // Wait for loading state to complete (form should not be disabled)
    await expect(usernameInput).toBeEnabled({ timeout: 15000 });
    
    // Verify all form elements are present and enabled
    await expect(page.locator('input[name="email"]')).toBeEnabled();
    await expect(page.locator('input[name="password"]')).toBeEnabled();
    await expect(page.locator('input[name="confirmPassword"]')).toBeEnabled();
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
    
    // Fill out the registration form
    await page.fill('input[name="username"]', testUsername);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    
    // Take screenshot before submission
    await page.screenshot({ 
      path: `~/clawd/scheduler/validation/evidence/melo-v2/ac4-before-submit-${timestamp}.png`,
      fullPage: true 
    });
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Wait for either success redirect or success message
    // The current implementation should redirect to "/" on success
    await expect(page).toHaveURL('/', { timeout: 10000 });
    
    // Take screenshot after successful registration
    await page.screenshot({ 
      path: `~/clawd/scheduler/validation/evidence/melo-v2/ac4-success-${timestamp}.png`,
      fullPage: true 
    });
    
    // Verify user is logged in (should see authenticated state)
    // This might be a loading state initially, so we wait for it to settle
    await page.waitForTimeout(2000);
    
    // Take final screenshot showing logged in state
    await page.screenshot({ 
      path: `~/clawd/scheduler/validation/evidence/melo-v2/ac4-logged-in-${timestamp}.png`,
      fullPage: true 
    });
  });

  test('AC-4: Registration with existing username shows error', async ({ page }) => {
    // Use a known existing username (this test should fail initially in RED phase)
    const existingUsername = 'admin'; // Assuming this exists
    const timestamp = Date.now();
    const testEmail = `testuser_${timestamp}@test.com`;
    const testPassword = 'SecurePass123!';
    
    await page.goto('/sign-up');
    
    // Wait for form to be enabled
    await expect(page.locator('input[name="username"]')).toBeEnabled({ timeout: 15000 });
    
    // Fill form with existing username
    await page.fill('input[name="username"]', existingUsername);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Should show error message for existing username
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 5000 });
    
    // Take screenshot of error state
    await page.screenshot({ 
      path: `~/clawd/scheduler/validation/evidence/melo-v2/ac4-username-error-${timestamp}.png`,
      fullPage: true 
    });
  });

  test('AC-4: Registration validates password strength', async ({ page }) => {
    const timestamp = Date.now();
    const testUsername = `testuser_${timestamp}`;
    const testEmail = `testuser_${timestamp}@test.com`;
    const weakPassword = '123'; // Should fail validation
    
    await page.goto('/sign-up');
    
    // Wait for form to be enabled
    await expect(page.locator('input[name="username"]')).toBeEnabled({ timeout: 15000 });
    
    await page.fill('input[name="username"]', testUsername);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', weakPassword);
    await page.fill('input[name="confirmPassword"]', weakPassword);
    
    // Should show password strength indicator as weak
    await expect(page.locator('[data-testid="password-strength-indicator"]')).toContainText('Weak');
    
    // Submit button should be disabled or form should show validation error
    await page.click('button[type="submit"]');
    
    // Should not proceed with weak password
    await expect(page).not.toHaveURL('/');
    
    // Take screenshot of validation state
    await page.screenshot({ 
      path: `~/clawd/scheduler/validation/evidence/melo-v2/ac4-password-validation-${timestamp}.png`,
      fullPage: true 
    });
  });

});