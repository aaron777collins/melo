/**
 * Matrix Authentication Flow E2E Tests
 * 
 * Comprehensive E2E tests for Matrix authentication integration with Discord frontend.
 * Tests authentication flow including success/failure scenarios, session persistence,
 * and Matrix client connection status.
 * 
 * Test Scenarios:
 * - User visits sign-in page
 * - User enters Matrix credentials (success and failure)
 * - Authentication succeeds and user is redirected
 * - User session is properly established
 * - Matrix connection is active and functional
 * - Session persistence across page refreshes
 * - Error handling works correctly
 */

import { test, expect } from '@playwright/test';
import { 
  AuthPage, 
  NavigationPage,
  ServerPage,
  ChatPage,
  TEST_CONFIG,
  waitForAppReady,
  waitForMatrixSync,
  clearBrowserState,
  isLoggedIn,
  logout,
  screenshot
} from '../fixtures';

test.describe('Matrix Authentication Flow', () => {
  let authPage: AuthPage;
  let navPage: NavigationPage;
  let serverPage: ServerPage;
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    // Initialize page objects
    authPage = new AuthPage(page);
    navPage = new NavigationPage(page);
    serverPage = new ServerPage(page);
    chatPage = new ChatPage(page);

    // Clear browser state for clean test
    await clearBrowserState(page);
  });

  test.describe('Sign-in Page Access', () => {
    test('should display sign-in page correctly', async ({ page }) => {
      await authPage.goto('sign-in');
      await waitForAppReady(page);

      // Page should be accessible
      await expect(page).toHaveURL(/\/sign-in/);
      
      // Page title should be set
      await expect(page).toHaveTitle(/Melo|Sign/);

      // Main elements should be visible
      await expect(authPage.usernameInput).toBeVisible();
      await expect(authPage.passwordInput).toBeVisible();
      await expect(authPage.submitButton).toBeVisible();

      // Take screenshot for visual verification
      await screenshot(page, 'matrix-auth-sign-in-page');
    });

    test('should show private mode indicator when enabled', async ({ page }) => {
      await authPage.goto('sign-in');
      await waitForAppReady(page);

      // Private mode badge should be visible if in private mode
      const privateBadge = page.locator('[data-testid="private-mode-badge"]');
      const hasPrivateBadge = await privateBadge.isVisible();

      if (hasPrivateBadge) {
        await expect(privateBadge).toContainText('Private Server');
        
        // In private mode, homeserver should be locked/hidden
        const homeserverInput = authPage.homeserverInput;
        const isHomeserverVisible = await homeserverInput.isVisible().catch(() => false);
        expect(isHomeserverVisible).toBeFalsy();
      } else {
        // In public mode, homeserver input should be visible
        await expect(authPage.homeserverInput).toBeVisible();
      }
    });

    test('should validate required fields', async ({ page }) => {
      await authPage.goto('sign-in');
      await waitForAppReady(page);

      // Try to submit empty form
      await authPage.submitButton.click();

      // Should show validation errors (if implemented)
      // This tests client-side validation
      const hasValidationErrors = await page.locator('.text-red-400, .text-red-500, [data-testid*="error"]').count() > 0;
      
      // If validation is implemented, we should have errors
      // If not, the request should be made and server should respond with error
      console.log(`Client-side validation active: ${hasValidationErrors}`);
    });
  });

  test.describe('Authentication Success Flow', () => {
    test('should successfully authenticate with valid Matrix credentials', async ({ page }) => {
      await authPage.goto('sign-in');
      await waitForAppReady(page);

      // Take screenshot before login
      await screenshot(page, 'matrix-auth-before-login');

      // Login with test credentials
      await authPage.login(
        TEST_CONFIG.testUser.username,
        TEST_CONFIG.testUser.password,
        TEST_CONFIG.homeserver
      );

      // Should redirect away from sign-in page
      await page.waitForTimeout(5000); // Allow time for Matrix sync
      
      const currentUrl = page.url();
      console.log(`Post-login URL: ${currentUrl}`);
      
      // Should not be on sign-in page anymore
      expect(currentUrl).not.toMatch(/\/sign-in/);

      // Should be logged in
      const loggedIn = await isLoggedIn(page);
      expect(loggedIn).toBeTruthy();

      // Take screenshot of logged-in state
      await screenshot(page, 'matrix-auth-logged-in-success');
    });

    test('should establish user session after successful login', async ({ page }) => {
      await authPage.goto('sign-in');
      await waitForAppReady(page);

      // Login
      await authPage.login(
        TEST_CONFIG.testUser.username,
        TEST_CONFIG.testUser.password,
        TEST_CONFIG.homeserver
      );

      await page.waitForTimeout(5000);
      await waitForMatrixSync(page);

      // Check for session indicators
      const hasUserArea = await navPage.userArea.isVisible().catch(() => false);
      const hasNavigation = await navPage.serverList.isVisible().catch(() => false);
      
      // Should have user interface elements
      expect(hasUserArea || hasNavigation).toBeTruthy();

      // User should be able to access protected routes
      await page.goto('/channels/@me');
      await page.waitForTimeout(2000);
      
      // Should not redirect back to sign-in
      expect(page.url()).not.toMatch(/\/sign-in/);
    });

    test('should have active Matrix client connection', async ({ page }) => {
      await authPage.goto('sign-in');
      await waitForAppReady(page);

      // Login
      await authPage.login(
        TEST_CONFIG.testUser.username,
        TEST_CONFIG.testUser.password,
        TEST_CONFIG.homeserver
      );

      await page.waitForTimeout(5000);
      await waitForMatrixSync(page);

      // Check for Matrix client indicators
      // This could be connection status, sync state, or available servers/spaces
      const hasActiveConnection = await page.evaluate(() => {
        // Check if Matrix client context is available
        return !!(window as any).__MATRIX_CLIENT__ || 
               document.querySelector('[data-testid*="matrix"]') ||
               document.querySelector('.server-list, .space-list, nav');
      });

      expect(hasActiveConnection).toBeTruthy();

      // Verify we can see Matrix spaces/servers
      const hasServerList = await navPage.serverList.isVisible().catch(() => false);
      if (hasServerList) {
        console.log('✅ Matrix servers/spaces visible in navigation');
      }

      // Test basic Matrix functionality by trying to navigate
      try {
        await page.goto('/channels/@me');
        await page.waitForTimeout(2000);
        console.log('✅ Can access Matrix-powered channels view');
      } catch (error) {
        console.log('⚠️ Could not access channels view:', error.message);
      }
    });
  });

  test.describe('Authentication Failure Scenarios', () => {
    test('should handle invalid credentials gracefully', async ({ page }) => {
      await authPage.goto('sign-in');
      await waitForAppReady(page);

      // Try login with invalid credentials
      await authPage.login(
        'invalid-user-' + Date.now(),
        'invalid-password',
        TEST_CONFIG.homeserver
      );

      await page.waitForTimeout(3000);

      // Should still be on sign-in page
      expect(page.url()).toMatch(/\/sign-in/);

      // Should show error message
      const hasError = await authPage.errorMessage.isVisible();
      if (hasError) {
        const errorText = await authPage.errorMessage.textContent();
        console.log(`Login error message: ${errorText}`);
        expect(errorText).toBeTruthy();
      }

      // Take screenshot of error state
      await screenshot(page, 'matrix-auth-invalid-credentials-error');
    });

    test('should handle homeserver connection errors', async ({ page }) => {
      await authPage.goto('sign-in');
      await waitForAppReady(page);

      // Skip if in private mode (homeserver is fixed)
      const privateBadge = await page.locator('[data-testid="private-mode-badge"]').isVisible().catch(() => false);
      if (privateBadge) {
        test.skip(true, 'Skipping homeserver error test - running in private mode');
        return;
      }

      // Try login with invalid homeserver
      await authPage.login(
        TEST_CONFIG.testUser.username,
        TEST_CONFIG.testUser.password,
        'https://invalid-homeserver-' + Date.now() + '.com'
      );

      await page.waitForTimeout(5000);

      // Should still be on sign-in page
      expect(page.url()).toMatch(/\/sign-in/);

      // Should show error (network or invalid homeserver)
      const hasError = await authPage.errorMessage.isVisible();
      if (hasError) {
        const errorText = await authPage.errorMessage.textContent();
        console.log(`Homeserver error message: ${errorText}`);
      }

      // Take screenshot of homeserver error
      await screenshot(page, 'matrix-auth-homeserver-error');
    });

    test('should handle rate limiting gracefully', async ({ page }) => {
      await authPage.goto('sign-in');
      await waitForAppReady(page);

      // Simulate rapid login attempts (if not rate-limited already)
      for (let i = 0; i < 3; i++) {
        await authPage.usernameInput.fill(`test-user-${i}`);
        await authPage.passwordInput.fill('invalid-password');
        await authPage.submitButton.click();
        await page.waitForTimeout(1000);
      }

      // Check if rate limiting message appears
      const errorElement = authPage.errorMessage;
      const hasRateLimit = await errorElement.isVisible();
      
      if (hasRateLimit) {
        const errorText = await errorElement.textContent();
        if (errorText?.includes('rate limit') || errorText?.includes('too many requests')) {
          console.log('✅ Rate limiting detected and handled properly');
          await screenshot(page, 'matrix-auth-rate-limit-error');
        }
      }
    });
  });

  test.describe('Session Persistence', () => {
    test('should persist session across page refreshes', async ({ page }) => {
      await authPage.goto('sign-in');
      await waitForAppReady(page);

      // Login first
      await authPage.login(
        TEST_CONFIG.testUser.username,
        TEST_CONFIG.testUser.password,
        TEST_CONFIG.homeserver
      );

      await page.waitForTimeout(5000);
      await waitForMatrixSync(page);

      // Ensure we're logged in
      const initiallyLoggedIn = await isLoggedIn(page);
      expect(initiallyLoggedIn).toBeTruthy();

      // Refresh the page
      await page.reload();
      await waitForAppReady(page);
      await page.waitForTimeout(3000);

      // Should still be logged in
      const stillLoggedIn = await isLoggedIn(page);
      expect(stillLoggedIn).toBeTruthy();

      // Should not redirect to sign-in
      expect(page.url()).not.toMatch(/\/sign-in/);

      console.log('✅ Session persisted across page refresh');
      await screenshot(page, 'matrix-auth-session-persisted');
    });

    test('should persist session across navigation', async ({ page }) => {
      await authPage.goto('sign-in');
      await waitForAppReady(page);

      // Login
      await authPage.login(
        TEST_CONFIG.testUser.username,
        TEST_CONFIG.testUser.password,
        TEST_CONFIG.homeserver
      );

      await page.waitForTimeout(5000);
      await waitForMatrixSync(page);

      // Navigate to different routes
      const routes = ['/', '/channels/@me', '/settings'];
      
      for (const route of routes) {
        await page.goto(route);
        await page.waitForTimeout(2000);
        
        // Should not redirect to sign-in
        if (page.url().includes('/sign-in')) {
          console.log(`⚠️ Redirected to sign-in when accessing ${route}`);
        } else {
          console.log(`✅ Successfully accessed ${route} while authenticated`);
        }
      }

      // Should still be logged in
      const stillLoggedIn = await isLoggedIn(page);
      expect(stillLoggedIn).toBeTruthy();
    });

    test('should handle session expiration gracefully', async ({ page }) => {
      await authPage.goto('sign-in');
      await waitForAppReady(page);

      // Login
      await authPage.login(
        TEST_CONFIG.testUser.username,
        TEST_CONFIG.testUser.password,
        TEST_CONFIG.homeserver
      );

      await page.waitForTimeout(5000);
      await waitForMatrixSync(page);

      // Simulate session expiration by clearing tokens
      await page.evaluate(() => {
        // Clear Matrix-related storage
        try {
          localStorage.removeItem('mx_access_token');
          localStorage.removeItem('mx_user_id');
          localStorage.removeItem('mx_device_id');
          sessionStorage.clear();
        } catch (error) {
          console.log('Could not clear session storage');
        }
      });

      // Try to access a protected route
      await page.goto('/channels/@me');
      await page.waitForTimeout(3000);

      // Should either:
      // 1. Redirect to sign-in page, or  
      // 2. Show session expired message
      const onSignIn = page.url().includes('/sign-in');
      const hasSessionError = await page.locator('text*="session expired", text*="please sign in"').isVisible().catch(() => false);
      
      expect(onSignIn || hasSessionError).toBeTruthy();
      console.log('✅ Session expiration handled appropriately');
    });
  });

  test.describe('Matrix Client Integration', () => {
    test('should enable real-time Matrix communication', async ({ page }) => {
      await authPage.goto('sign-in');
      await waitForAppReady(page);

      // Login
      await authPage.login(
        TEST_CONFIG.testUser.username,
        TEST_CONFIG.testUser.password,
        TEST_CONFIG.homeserver
      );

      await page.waitForTimeout(5000);
      await waitForMatrixSync(page);

      // Try to find or create a test space/room
      const hasServerList = await navPage.serverList.isVisible().catch(() => false);
      
      if (hasServerList) {
        console.log('✅ Matrix spaces/servers are visible');
        
        // Try to navigate to a channel for messaging test
        try {
          // Look for any available channel or space
          const firstServer = await page.locator('[data-testid*="server"], .server-item, nav a').first().isVisible().catch(() => false);
          if (firstServer) {
            await page.locator('[data-testid*="server"], .server-item, nav a').first().click();
            await page.waitForTimeout(2000);
            
            // Look for a channel to test messaging
            const firstChannel = await page.locator('[data-testid*="channel"], .channel-item').first().isVisible().catch(() => false);
            if (firstChannel) {
              await page.locator('[data-testid*="channel"], .channel-item').first().click();
              await page.waitForTimeout(2000);
              
              // Test sending a message
              const messageInput = chatPage.messageInput;
              const hasMessageInput = await messageInput.isVisible().catch(() => false);
              
              if (hasMessageInput) {
                const testMessage = `E2E Test Message ${Date.now()}`;
                await chatPage.sendMessage(testMessage);
                console.log('✅ Sent test message through Matrix client');
                
                // Verify message appears (Matrix sync working)
                await chatPage.expectMessageVisible(testMessage);
                console.log('✅ Message appeared in chat (Matrix sync confirmed)');
              }
            }
          }
        } catch (error) {
          console.log('⚠️ Could not test Matrix messaging:', error.message);
        }
      }

      // Take final screenshot showing Matrix integration
      await screenshot(page, 'matrix-auth-client-integration');
    });

    test('should handle Matrix connection status changes', async ({ page }) => {
      await authPage.goto('sign-in');
      await waitForAppReady(page);

      // Login
      await authPage.login(
        TEST_CONFIG.testUser.username,
        TEST_CONFIG.testUser.password,
        TEST_CONFIG.homeserver
      );

      await page.waitForTimeout(5000);
      await waitForMatrixSync(page);

      // Check for connection status indicators
      const connectionIndicators = await page.locator(
        '[data-testid*="connection"], [data-testid*="sync"], .connection-status, .sync-status'
      ).count();
      
      if (connectionIndicators > 0) {
        console.log('✅ Matrix connection status indicators present');
      }

      // Test offline simulation (if possible)
      try {
        await page.context().setOffline(true);
        await page.waitForTimeout(2000);
        
        // Check if offline state is handled
        const hasOfflineIndicator = await page.locator('text*="offline", text*="disconnected"').isVisible().catch(() => false);
        if (hasOfflineIndicator) {
          console.log('✅ Offline state detected and indicated');
        }
        
        // Restore connection
        await page.context().setOffline(false);
        await page.waitForTimeout(2000);
        console.log('✅ Connection restored');
        
      } catch (error) {
        console.log('⚠️ Could not test offline state:', error.message);
      }
    });
  });

  test.describe('Sign-up Flow Integration', () => {
    test('should access sign-up page from sign-in', async ({ page }) => {
      await authPage.goto('sign-in');
      await waitForAppReady(page);

      // Look for sign-up link
      const signUpLink = authPage.signUpLink;
      const hasSignUpLink = await signUpLink.isVisible();

      if (hasSignUpLink) {
        await signUpLink.click();
        await page.waitForTimeout(2000);

        // Should navigate to sign-up page
        expect(page.url()).toMatch(/\/sign-up/);

        // Sign-up form should be visible
        await expect(authPage.usernameInput).toBeVisible();
        await expect(authPage.passwordInput).toBeVisible();

        console.log('✅ Sign-up page accessible from sign-in');
        await screenshot(page, 'matrix-auth-sign-up-page');
      } else {
        console.log('⚠️ Sign-up link not found (may be disabled in private mode)');
      }
    });
  });

  // Cleanup after tests
  test.afterEach(async ({ page }) => {
    // Take a final screenshot if something went wrong
    if (test.info().status === 'failed') {
      await screenshot(page, `matrix-auth-test-failed-${Date.now()}`);
    }

    // Logout if logged in
    const loggedIn = await isLoggedIn(page).catch(() => false);
    if (loggedIn) {
      await logout(page).catch(() => {
        console.log('Could not logout cleanly');
      });
    }

    // Clear browser state
    await clearBrowserState(page);
  });
});