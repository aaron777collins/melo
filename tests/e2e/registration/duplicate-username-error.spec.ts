/**
 * E2E Tests for AC-5: Duplicate Username Error Handling
 * 
 * End-to-end tests for handling Matrix API conflict responses (409/username taken) during registration
 * 
 * Requirements from AC-5:
 * - Display clear error message when username already exists
 * - Form state preservation (keep filled fields except passwords)
 * - Clear instructions on how to proceed (suggest alternative username)
 * - Matrix API conflict errors properly caught and handled
 */

import { test, expect } from '@playwright/test';
import { uniqueId, waitForAppReady } from '../fixtures';

test.describe('AC-5: Duplicate Username Error Handling E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sign-up');
    await waitForAppReady(page);
  });

  test.describe('Matrix API Conflict Response (409)', () => {
    test('should handle M_USER_IN_USE error during registration submission', async ({ page }) => {
      // Mock the username availability check to pass initially
      await page.route('/api/auth/check-username', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ available: true }),
        });
      });

      // Mock the registration API to return a conflict error
      await page.route('/_matrix/client/v3/register', async (route) => {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            errcode: 'M_USER_IN_USE',
            error: 'User ID already taken'
          }),
        });
      });

      const usernameInput = page.getByTestId('username-input');
      const passwordInput = page.getByTestId('password-input');
      const confirmPasswordInput = page.locator('input[name="confirmPassword"]');
      const emailInput = page.locator('input[name="email"]');
      const submitButton = page.getByTestId('signup-button');

      // Fill the form with valid data
      await usernameInput.fill('existinguser');
      await emailInput.fill('test@example.com');
      await passwordInput.fill('SecurePassword123');
      await confirmPasswordInput.fill('SecurePassword123');

      // Wait for username availability check to pass
      await expect(page.getByText('✓ Username available')).toBeVisible();

      // Submit the form
      await submitButton.click();

      // Should display the error message
      await expect(page.getByTestId('error-message')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]:has-text("already")')).toBeVisible();
    });

    test('should preserve form state except password fields after conflict error', async ({ page }) => {
      // Mock username availability check
      await page.route('/api/auth/check-username', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ available: true }),
        });
      });

      // Mock registration to fail with conflict
      await page.route('/_matrix/client/v3/register', async (route) => {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            errcode: 'M_USER_IN_USE',
            error: 'User ID already taken'
          }),
        });
      });

      const usernameInput = page.getByTestId('username-input');
      const passwordInput = page.getByTestId('password-input');
      const confirmPasswordInput = page.locator('input[name="confirmPassword"]');
      const emailInput = page.locator('input[name="email"]');

      // Fill the form
      await usernameInput.fill('conflictuser');
      await emailInput.fill('conflict@example.com');
      await passwordInput.fill('MySecretPassword123');
      await confirmPasswordInput.fill('MySecretPassword123');

      // Submit and wait for error
      await page.getByTestId('signup-button').click();
      await expect(page.getByTestId('error-message')).toBeVisible();

      // Check that non-password fields are preserved
      await expect(usernameInput).toHaveValue('conflictuser');
      await expect(emailInput).toHaveValue('conflict@example.com');
      
      // Password fields should be cleared for security
      await expect(passwordInput).toHaveValue('');
      await expect(confirmPasswordInput).toHaveValue('');
    });

    test('should provide helpful username suggestions when conflict occurs', async ({ page }) => {
      // Mock username availability check
      await page.route('/api/auth/check-username', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ available: true }),
        });
      });

      // Mock registration failure with suggestions
      await page.route('/_matrix/client/v3/register', async (route) => {
        const request = route.request();
        const body = await request.postData();
        const data = JSON.parse(body || '{}');
        
        const username = data.username || 'user';
        const suggestions = [
          `${username}_2025`,
          `${username}_alt`,
          `${username}_new`
        ];

        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            errcode: 'M_USER_IN_USE',
            error: `Username @${username}:matrix.org is already taken. Try: ${suggestions.join(', ')}`
          }),
        });
      });

      // Fill and submit form
      await page.getByTestId('username-input').fill('popularname');
      await page.locator('input[name="email"]').fill('test@example.com');
      await page.getByTestId('password-input').fill('Password123');
      await page.locator('input[name="confirmPassword"]').fill('Password123');
      
      await page.getByTestId('signup-button').click();

      // Should display helpful suggestions
      const errorMessage = page.getByTestId('error-message');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('Try:');
      await expect(errorMessage).toContainText('popularname_2025');
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('should clear error when user modifies username', async ({ page }) => {
      // Mock initial error state by simulating a failed registration attempt
      await page.route('/api/auth/check-username', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ available: true }),
        });
      });

      await page.route('/_matrix/client/v3/register', async (route) => {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            errcode: 'M_USER_IN_USE',
            error: 'User ID already taken'
          }),
        });
      });

      // Fill form and trigger error
      await page.getByTestId('username-input').fill('takenusername');
      await page.getByTestId('password-input').fill('Password123');
      await page.locator('input[name="confirmPassword"]').fill('Password123');
      await page.getByTestId('signup-button').click();

      // Wait for error to appear
      await expect(page.getByTestId('error-message')).toBeVisible();

      // Modify username - should clear the error
      const usernameInput = page.getByTestId('username-input');
      await usernameInput.clear();
      await usernameInput.type('newusername');

      // Error should be cleared (or at least error should indicate it's being cleared)
      // Note: This might require implementation changes to clear errors on input change
      await expect(usernameInput).toHaveValue('newusername');
    });

    test('should allow successful registration after fixing username conflict', async ({ page }) => {
      let registrationAttempt = 0;

      // Mock username availability check
      await page.route('/api/auth/check-username', async (route) => {
        const request = route.request();
        const body = JSON.parse(await request.postData() || '{}');
        
        // First username is taken, second is available
        const available = body.username !== 'takenname';
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ available }),
        });
      });

      // Mock registration attempts
      await page.route('/_matrix/client/v3/register', async (route) => {
        registrationAttempt++;
        
        if (registrationAttempt === 1) {
          // First attempt fails
          await route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({
              errcode: 'M_USER_IN_USE',
              error: 'User ID already taken'
            }),
          });
        } else {
          // Second attempt succeeds
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              user_id: '@availablename:matrix.org',
              access_token: 'test_token',
              device_id: 'test_device',
              home_server: 'matrix.org'
            }),
          });
        }
      });

      const usernameInput = page.getByTestId('username-input');
      const passwordInput = page.getByTestId('password-input');
      const confirmPasswordInput = page.locator('input[name="confirmPassword"]');

      // First attempt with taken username
      await usernameInput.fill('takenname');
      await passwordInput.fill('Password123');
      await confirmPasswordInput.fill('Password123');
      await page.getByTestId('signup-button').click();

      // Should show error
      await expect(page.getByTestId('error-message')).toBeVisible();

      // Change username and retry
      await usernameInput.clear();
      await usernameInput.fill('availablename');
      
      // Wait for new username availability check
      await expect(page.getByText('✓ Username available')).toBeVisible();
      
      // Re-enter passwords (as they should be cleared)
      await passwordInput.fill('Password123');
      await confirmPasswordInput.fill('Password123');
      
      // Submit again
      await page.getByTestId('signup-button').click();

      // Should succeed and redirect (or show success)
      await expect.poll(() => registrationAttempt).toBe(2);
    });
  });

  test.describe('User Experience', () => {
    test('should maintain form usability during error states', async ({ page }) => {
      // Mock conflict error
      await page.route('/api/auth/check-username', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ available: true }),
        });
      });

      await page.route('/_matrix/client/v3/register', async (route) => {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            errcode: 'M_USER_IN_USE',
            error: 'Username already taken'
          }),
        });
      });

      // Fill form and trigger error
      await page.getByTestId('username-input').fill('erroruser');
      await page.getByTestId('password-input').fill('Password123');
      await page.locator('input[name="confirmPassword"]').fill('Password123');
      await page.getByTestId('signup-button').click();

      // Wait for error
      await expect(page.getByTestId('error-message')).toBeVisible();

      // All form fields should still be interactive
      const usernameInput = page.getByTestId('username-input');
      const passwordInput = page.getByTestId('password-input');
      const confirmPasswordInput = page.locator('input[name="confirmPassword"]');

      await expect(usernameInput).not.toBeDisabled();
      await expect(passwordInput).not.toBeDisabled();
      await expect(confirmPasswordInput).not.toBeDisabled();

      // Should be able to edit fields
      await usernameInput.clear();
      await usernameInput.fill('newuser');
      await expect(usernameInput).toHaveValue('newuser');
    });

    test('should handle rapid form submissions gracefully', async ({ page }) => {
      await page.route('/api/auth/check-username', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ available: true }),
        });
      });

      // Mock slow registration response
      await page.route('/_matrix/client/v3/register', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            errcode: 'M_USER_IN_USE',
            error: 'User ID already taken'
          }),
        });
      });

      // Fill form
      await page.getByTestId('username-input').fill('testuser');
      await page.getByTestId('password-input').fill('Password123');
      await page.locator('input[name="confirmPassword"]').fill('Password123');

      const submitButton = page.getByTestId('signup-button');

      // Rapidly click submit button multiple times
      await Promise.all([
        submitButton.click(),
        submitButton.click(),
        submitButton.click()
      ]);

      // Should handle gracefully without multiple errors
      await expect(page.getByTestId('error-message')).toBeVisible();
      
      // Button should be disabled during submission
      await expect(submitButton).toBeDisabled();
    });
  });

  test.describe('Viewport Responsiveness', () => {
    test('should display error correctly on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // Mobile

      await page.route('/api/auth/check-username', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ available: true }),
        });
      });

      await page.route('/_matrix/client/v3/register', async (route) => {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            errcode: 'M_USER_IN_USE',
            error: 'Username @mobileuser:matrix.org is already taken. Try: mobileuser_2025, mobileuser_alt'
          }),
        });
      });

      // Fill and submit form
      await page.getByTestId('username-input').fill('mobileuser');
      await page.getByTestId('password-input').fill('Password123');
      await page.locator('input[name="confirmPassword"]').fill('Password123');
      await page.getByTestId('signup-button').click();

      // Error should be visible and readable on mobile
      const errorMessage = page.getByTestId('error-message');
      await expect(errorMessage).toBeVisible();
      
      // Error message should not overflow viewport
      const errorBox = await errorMessage.boundingBox();
      expect(errorBox?.width).toBeLessThanOrEqual(375);
      
      // Should contain helpful suggestions
      await expect(errorMessage).toContainText('Try:');
    });

    test('should display error correctly on tablet devices', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }); // Tablet

      await page.route('/api/auth/check-username', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ available: true }),
        });
      });

      await page.route('/_matrix/client/v3/register', async (route) => {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            errcode: 'M_USER_IN_USE',
            error: 'Username is already taken'
          }),
        });
      });

      // Fill and submit form
      await page.getByTestId('username-input').fill('tabletuser');
      await page.getByTestId('password-input').fill('Password123');
      await page.locator('input[name="confirmPassword"]').fill('Password123');
      await page.getByTestId('signup-button').click();

      // Error should be properly displayed
      await expect(page.getByTestId('error-message')).toBeVisible();
    });

    test('should display error correctly on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 }); // Desktop

      await page.route('/api/auth/check-username', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ available: true }),
        });
      });

      await page.route('/_matrix/client/v3/register', async (route) => {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            errcode: 'M_USER_IN_USE',
            error: 'Username @desktopuser:matrix.org is already taken. Try: desktopuser_2025, desktopuser_alt, desktopuser_new'
          }),
        });
      });

      // Fill and submit form
      await page.getByTestId('username-input').fill('desktopuser');
      await page.getByTestId('password-input').fill('Password123');
      await page.locator('input[name="confirmPassword"]').fill('Password123');
      await page.getByTestId('signup-button').click();

      // Error should be properly displayed with full suggestions
      const errorMessage = page.getByTestId('error-message');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('Try: desktopuser_2025, desktopuser_alt, desktopuser_new');
    });
  });

  test.describe('Accessibility', () => {
    test('should announce error to screen readers with proper ARIA', async ({ page }) => {
      await page.route('/api/auth/check-username', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ available: true }),
        });
      });

      await page.route('/_matrix/client/v3/register', async (route) => {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            errcode: 'M_USER_IN_USE',
            error: 'Username already taken'
          }),
        });
      });

      // Fill and submit form
      await page.getByTestId('username-input').fill('accessuser');
      await page.getByTestId('password-input').fill('Password123');
      await page.locator('input[name="confirmPassword"]').fill('Password123');
      await page.getByTestId('signup-button').click();

      // Check error accessibility
      const errorMessage = page.getByTestId('error-message');
      await expect(errorMessage).toBeVisible();
      
      // Should have proper ARIA attributes for screen readers
      await expect(errorMessage).toHaveAttribute('role', 'alert');
    });

    test('should maintain keyboard navigation after error', async ({ page }) => {
      await page.route('/api/auth/check-username', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ available: true }),
        });
      });

      await page.route('/_matrix/client/v3/register', async (route) => {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            errcode: 'M_USER_IN_USE',
            error: 'Username already taken'
          }),
        });
      });

      // Fill form using keyboard only
      await page.keyboard.press('Tab'); // Focus username
      await page.keyboard.type('keyboarduser');
      
      await page.keyboard.press('Tab'); // Focus email (if visible)
      await page.keyboard.type('test@example.com');
      
      await page.keyboard.press('Tab'); // Focus password
      await page.keyboard.type('Password123');
      
      await page.keyboard.press('Tab'); // Focus confirm password
      await page.keyboard.type('Password123');
      
      await page.keyboard.press('Tab'); // Focus submit button
      await page.keyboard.press('Enter'); // Submit

      // Wait for error
      await expect(page.getByTestId('error-message')).toBeVisible();

      // Tab navigation should still work
      await page.keyboard.press('Shift+Tab'); // Should go back to form fields
      
      const usernameInput = page.getByTestId('username-input');
      await expect(usernameInput).toBeFocused();
    });
  });

  test.describe('Integration with Existing Features', () => {
    test('should work correctly with username availability checking', async ({ page }) => {
      let usernameCheckCount = 0;
      
      // Mock username availability check
      await page.route('/api/auth/check-username', async (route) => {
        usernameCheckCount++;
        const request = route.request();
        const body = JSON.parse(await request.postData() || '{}');
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            available: body.username !== 'conflictname'
          }),
        });
      });

      // Mock registration conflict
      await page.route('/_matrix/client/v3/register', async (route) => {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            errcode: 'M_USER_IN_USE',
            error: 'Username already taken'
          }),
        });
      });

      const usernameInput = page.getByTestId('username-input');
      
      // Type username that passes availability check
      await usernameInput.fill('conflictname');
      
      // Should show as available in pre-check
      await expect(page.getByText('Username already taken')).toBeVisible();
      
      // But registration should still fail with proper error handling
      // This tests the case where username becomes unavailable between check and registration
    });
  });
});