/**
 * Registration Form E2E Validation Tests
 * 
 * Comprehensive end-to-end testing of registration form validation
 * Testing: US-P2-01 AC-3 - Enhanced form validation requirements
 */

import { test, expect } from '@playwright/test';
import { uniqueId, waitForAppReady } from './fixtures';

test.describe('Registration Form Validation E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sign-up');
    await waitForAppReady(page);
  });

  test.describe('Username Validation', () => {
    test('should validate username minimum length in real-time', async ({ page }) => {
      const usernameInput = page.getByTestId('username-input');
      
      // Type short username
      await usernameInput.fill('ab');
      await usernameInput.blur();
      
      // Should show error message
      await expect(page.getByText('Username must be at least 3 characters')).toBeVisible();
      
      // Add one more character
      await usernameInput.fill('abc');
      await usernameInput.blur();
      
      // Error should disappear
      await expect(page.getByText('Username must be at least 3 characters')).not.toBeVisible();
    });

    test('should validate username character restrictions', async ({ page }) => {
      const usernameInput = page.getByTestId('username-input');
      
      // Test invalid characters
      const invalidUsernames = ['user@name', 'user name', 'user-name', 'user.name', 'user+name'];
      
      for (const invalidUsername of invalidUsernames) {
        await usernameInput.fill(invalidUsername);
        await usernameInput.blur();
        
        await expect(page.getByText('Username can only contain letters, numbers, and underscores')).toBeVisible();
        
        await usernameInput.clear();
      }
    });

    test('should accept valid username formats', async ({ page }) => {
      const usernameInput = page.getByTestId('username-input');
      
      const validUsernames = ['user123', 'user_name', 'User123', 'USERNAME', '_user_', '123user'];
      
      for (const validUsername of validUsernames) {
        await usernameInput.fill(validUsername);
        await usernameInput.blur();
        
        await expect(page.getByText('Username can only contain letters, numbers, and underscores')).not.toBeVisible();
        
        await usernameInput.clear();
      }
    });

    test('should check username availability in real-time', async ({ page }) => {
      // Mock the API response for taken username
      await page.route('/api/auth/check-username', async (route) => {
        const request = route.request();
        const body = JSON.parse(request.postData() || '{}');
        
        if (body.username === 'taken_user') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ available: false, reason: 'Username already taken' }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ available: true }),
          });
        }
      });

      const usernameInput = page.getByTestId('username-input');
      
      // Test taken username
      await usernameInput.fill('taken_user');
      await expect(page.getByText('Username already taken')).toBeVisible();
      
      // Test available username
      await usernameInput.fill('available_user');
      await expect(page.getByText('✓ Username available')).toBeVisible();
    });

    test('should show loading state during username availability check', async ({ page }) => {
      // Mock slow API response
      await page.route('/api/auth/check-username', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ available: true }),
        });
      });

      const usernameInput = page.getByTestId('username-input');
      
      await usernameInput.fill('testuser123');
      
      // Should show checking indicator
      await expect(page.getByTestId('username-checking-indicator')).toBeVisible();
      await expect(page.getByText('Checking availability...')).toBeVisible();
      
      // Should eventually show available
      await expect(page.getByText('✓ Username available')).toBeVisible();
    });
  });

  test.describe('Password Validation', () => {
    test('should validate password requirements in real-time', async ({ page }) => {
      const passwordInput = page.getByTestId('password-input');
      
      // Test minimum length
      await passwordInput.fill('Pass1');
      await passwordInput.blur();
      await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();
      
      // Test missing uppercase
      await passwordInput.fill('password123');
      await passwordInput.blur();
      await expect(page.getByText('Password must contain at least one uppercase letter')).toBeVisible();
      
      // Test missing lowercase
      await passwordInput.fill('PASSWORD123');
      await passwordInput.blur();
      await expect(page.getByText('Password must contain at least one lowercase letter')).toBeVisible();
      
      // Test missing number
      await passwordInput.fill('Password');
      await passwordInput.blur();
      await expect(page.getByText('Password must contain at least one number')).toBeVisible();
    });

    test('should display password strength indicator', async ({ page }) => {
      const passwordInput = page.getByTestId('password-input');
      
      // Weak password
      await passwordInput.fill('Pass1');
      await expect(page.getByTestId('password-strength-indicator')).toBeVisible();
      await expect(page.getByText('Weak')).toBeVisible();
      
      // Medium password
      await passwordInput.fill('Password1');
      await expect(page.getByText('Medium')).toBeVisible();
      
      // Strong password
      await passwordInput.fill('Password123!');
      await expect(page.getByText('Strong')).toBeVisible();
    });

    test('should show password strength visual indicator', async ({ page }) => {
      const passwordInput = page.getByTestId('password-input');
      
      // Test strength bar colors
      await passwordInput.fill('Pass1');
      await expect(page.getByTestId('password-strength-bar')).toHaveClass(/strength-weak/);
      
      await passwordInput.fill('Password1');
      await expect(page.getByTestId('password-strength-bar')).toHaveClass(/strength-medium/);
      
      await passwordInput.fill('Password123!');
      await expect(page.getByTestId('password-strength-bar')).toHaveClass(/strength-strong/);
    });
  });

  test.describe('Confirm Password Validation', () => {
    test('should validate password confirmation in real-time', async ({ page }) => {
      const passwordInput = page.getByTestId('password-input');
      const confirmInput = page.locator('input[name="confirmPassword"]');
      
      await passwordInput.fill('Password123');
      await confirmInput.fill('Password456');
      await confirmInput.blur();
      
      await expect(page.getByText("Passwords don't match")).toBeVisible();
    });

    test('should show password match indicator when passwords match', async ({ page }) => {
      const passwordInput = page.getByTestId('password-input');
      const confirmInput = page.locator('input[name="confirmPassword"]');
      
      await passwordInput.fill('Password123');
      await confirmInput.fill('Password123');
      
      await expect(page.getByTestId('password-match-indicator')).toBeVisible();
      await expect(page.getByText('✓ Passwords match')).toBeVisible();
    });

    test('should update match status as user types', async ({ page }) => {
      const passwordInput = page.getByTestId('password-input');
      const confirmInput = page.locator('input[name="confirmPassword"]');
      
      await passwordInput.fill('Password123');
      await confirmInput.fill('Pass');
      
      await expect(page.getByText("Passwords don't match")).toBeVisible();
      
      // Complete the matching password
      await confirmInput.fill('Password123');
      
      await expect(page.getByText("Passwords don't match")).not.toBeVisible();
      await expect(page.getByText('✓ Passwords match')).toBeVisible();
    });
  });

  test.describe('Form Submission Prevention', () => {
    test('should prevent submission with invalid username', async ({ page }) => {
      const usernameInput = page.getByTestId('username-input');
      const passwordInput = page.getByTestId('password-input');
      const confirmInput = page.locator('input[name="confirmPassword"]');
      const submitButton = page.getByTestId('signup-button');
      
      // Fill valid password but invalid username
      await usernameInput.fill('ab'); // Too short
      await passwordInput.fill('Password123');
      await confirmInput.fill('Password123');
      
      await expect(submitButton).toBeDisabled();
    });

    test('should prevent submission with invalid password', async ({ page }) => {
      const usernameInput = page.getByTestId('username-input');
      const passwordInput = page.getByTestId('password-input');
      const confirmInput = page.locator('input[name="confirmPassword"]');
      const submitButton = page.getByTestId('signup-button');
      
      // Fill valid username but invalid password
      await usernameInput.fill('validuser');
      await passwordInput.fill('123'); // Too short
      await confirmInput.fill('123');
      
      await expect(submitButton).toBeDisabled();
    });

    test('should prevent submission when passwords do not match', async ({ page }) => {
      const usernameInput = page.getByTestId('username-input');
      const passwordInput = page.getByTestId('password-input');
      const confirmInput = page.locator('input[name="confirmPassword"]');
      const submitButton = page.getByTestId('signup-button');
      
      // Fill valid data but mismatched passwords
      await usernameInput.fill('validuser');
      await passwordInput.fill('Password123');
      await confirmInput.fill('Password456');
      
      await expect(submitButton).toBeDisabled();
    });

    test('should enable submission when all validation passes', async ({ page }) => {
      // Mock username availability check
      await page.route('/api/auth/check-username', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ available: true }),
        });
      });

      const usernameInput = page.getByTestId('username-input');
      const passwordInput = page.getByTestId('password-input');
      const confirmInput = page.locator('input[name="confirmPassword"]');
      const homeserverInput = page.getByTestId('homeserver-input');
      const submitButton = page.getByTestId('signup-button');
      
      // Fill all valid data
      await usernameInput.fill('validuser123');
      await passwordInput.fill('Password123');
      await confirmInput.fill('Password123');
      
      // Clear and set homeserver if in public mode
      if (await homeserverInput.isVisible()) {
        await homeserverInput.clear();
        await homeserverInput.fill('https://matrix.org');
      }
      
      // Wait for username availability check
      await expect(page.getByText('✓ Username available')).toBeVisible();
      
      await expect(submitButton).not.toBeDisabled();
    });
  });

  test.describe('Real-time Validation Feedback', () => {
    test('should show validation errors immediately on field blur', async ({ page }) => {
      const usernameInput = page.getByTestId('username-input');
      const passwordInput = page.getByTestId('password-input');
      
      // Test immediate validation on blur
      await usernameInput.fill('ab');
      await usernameInput.blur();
      await expect(page.getByText('Username must be at least 3 characters')).toBeVisible();
      
      await passwordInput.fill('123');
      await passwordInput.blur();
      await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();
    });

    test('should clear validation errors when input becomes valid', async ({ page }) => {
      const usernameInput = page.getByTestId('username-input');
      
      // Start with invalid
      await usernameInput.fill('ab');
      await usernameInput.blur();
      await expect(page.getByText('Username must be at least 3 characters')).toBeVisible();
      
      // Fix the input
      await usernameInput.fill('abc');
      await usernameInput.blur();
      await expect(page.getByText('Username must be at least 3 characters')).not.toBeVisible();
    });

    test('should provide immediate feedback during typing', async ({ page }) => {
      const passwordInput = page.getByTestId('password-input');
      
      // Type password and watch strength indicator update
      await passwordInput.type('P');
      await expect(page.getByTestId('password-strength-indicator')).toBeVisible();
      
      await passwordInput.type('assword1');
      await expect(page.getByText('Medium')).toBeVisible();
      
      await passwordInput.type('23!');
      await expect(page.getByText('Strong')).toBeVisible();
    });
  });

  test.describe('Cross-Browser Validation', () => {
    test('should work consistently across different browsers', async ({ page, browserName }) => {
      // This test will run on different browsers configured in Playwright
      const usernameInput = page.getByTestId('username-input');
      const passwordInput = page.getByTestId('password-input');
      const confirmInput = page.locator('input[name="confirmPassword"]');
      
      // Test basic validation on all browsers
      await usernameInput.fill('ab');
      await passwordInput.fill('123');
      await confirmInput.fill('456');
      
      await expect(page.getByText('Username must be at least 3 characters')).toBeVisible();
      await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();
      await expect(page.getByText("Passwords don't match")).toBeVisible();
    });
  });

  test.describe('Accessibility Validation', () => {
    test('should have proper ARIA attributes for validation errors', async ({ page }) => {
      const usernameInput = page.getByTestId('username-input');
      
      // Check ARIA attributes exist
      await expect(usernameInput).toHaveAttribute('aria-describedby');
      
      // Trigger validation error
      await usernameInput.fill('ab');
      await usernameInput.blur();
      
      // Error message should be associated with input
      const errorMessage = page.getByText('Username must be at least 3 characters');
      await expect(errorMessage).toHaveAttribute('aria-live', 'polite');
    });

    test('should be navigable using keyboard only', async ({ page }) => {
      // Tab through all form fields
      await page.keyboard.press('Tab'); // Username
      await expect(page.getByTestId('username-input')).toBeFocused();
      
      await page.keyboard.press('Tab'); // Password
      await expect(page.getByTestId('password-input')).toBeFocused();
      
      await page.keyboard.press('Tab'); // Confirm Password
      await expect(page.locator('input[name="confirmPassword"]')).toBeFocused();
      
      // Form should be usable with keyboard only
      await page.getByTestId('username-input').fill('testuser123');
      await page.keyboard.press('Tab');
      
      await page.getByTestId('password-input').fill('Password123');
      await page.keyboard.press('Tab');
      
      await page.locator('input[name="confirmPassword"]').fill('Password123');
      await page.keyboard.press('Tab');
      
      // Submit button should be reachable and enabled
      await expect(page.getByTestId('signup-button')).toBeFocused();
    });

    test('should announce validation changes to screen readers', async ({ page }) => {
      const usernameInput = page.getByTestId('username-input');
      
      // Fill invalid data
      await usernameInput.fill('ab');
      await usernameInput.blur();
      
      // Error should have aria-live for screen reader announcement
      const errorMessage = page.getByText('Username must be at least 3 characters');
      await expect(errorMessage).toHaveAttribute('aria-live', 'polite');
      
      // Fix the input
      await usernameInput.fill('abc');
      await usernameInput.blur();
      
      // Success indicators should also be announced
      const successMessage = page.getByText('✓ Username available').first();
      if (await successMessage.isVisible()) {
        await expect(successMessage).toHaveAttribute('aria-live', 'polite');
      }
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work properly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // Mobile size
      
      // Form should still be functional
      const usernameInput = page.getByTestId('username-input');
      const passwordInput = page.getByTestId('password-input');
      const confirmInput = page.locator('input[name="confirmPassword"]');
      
      await usernameInput.fill('testuser');
      await passwordInput.fill('Password123');
      await confirmInput.fill('Password123');
      
      // Validation should still work
      await expect(page.getByTestId('password-strength-indicator')).toBeVisible();
    });

    test('should show validation errors clearly on small screens', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      const usernameInput = page.getByTestId('username-input');
      
      await usernameInput.fill('ab');
      await usernameInput.blur();
      
      const errorMessage = page.getByText('Username must be at least 3 characters');
      await expect(errorMessage).toBeVisible();
      
      // Error message should not overflow or be cut off
      const errorBox = await errorMessage.boundingBox();
      expect(errorBox?.width).toBeLessThanOrEqual(375);
    });
  });

  test.describe('Performance', () => {
    test('should validate without significant delays', async ({ page }) => {
      const startTime = Date.now();
      
      const usernameInput = page.getByTestId('username-input');
      const passwordInput = page.getByTestId('password-input');
      
      await usernameInput.fill('testuser123');
      await passwordInput.fill('Password123');
      
      // Validation should be near-instant
      await expect(page.getByTestId('password-strength-indicator')).toBeVisible();
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(5000); // Should take less than 5 seconds
    });

    test('should handle rapid typing without issues', async ({ page }) => {
      const passwordInput = page.getByTestId('password-input');
      
      // Type rapidly
      await passwordInput.type('Password123!@#', { delay: 10 });
      
      // Should still show correct validation
      await expect(page.getByText('Strong')).toBeVisible();
    });
  });
});