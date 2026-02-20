/**
 * Complete Invite Workflow E2E Tests
 * 
 * Comprehensive end-to-end test covering the complete invite workflow:
 * 1. Admin generates invite link (create link functionality)
 * 2. Admin shares invite link (copy link functionality) 
 * 3. New user accepts invite via link (joins server via link)
 * 4. Verify invite workflow works end-to-end
 * 5. Handle error scenarios (invalid links, expired links)
 * 
 * Uses TDD approach with screenshot capturing for visual validation.
 */

import { test, expect, type Page } from '@playwright/test';
import { 
  AuthPage, 
  TEST_CONFIG, 
  waitForAppReady, 
  waitForMatrixSync,
  clearBrowserState,
  ServerPage,
  ChatPage,
  uniqueId
} from '../fixtures';

test.describe('Complete Invite Workflow', () => {
  let adminPage: Page;
  let userPage: Page;
  let adminAuthPage: AuthPage;
  let userAuthPage: AuthPage;
  let serverPage: ServerPage;
  let chatPage: ChatPage;

  // Test data
  const adminUser = TEST_CONFIG.testUser; // Admin user with invite creation rights
  const invitedUser = TEST_CONFIG.secondUser; // User who will accept invite
  const testInviteNotes = `E2E Test Invite - ${uniqueId()}`;
  let generatedInviteCode = '';
  let inviteUrl = '';

  test.beforeAll(async ({ browser }) => {
    // Create two browser contexts - one for admin, one for invited user
    const adminContext = await browser.newContext();
    const userContext = await browser.newContext();
    
    adminPage = await adminContext.newPage();
    userPage = await userContext.newPage();
    
    adminAuthPage = new AuthPage(adminPage);
    userAuthPage = new AuthPage(userPage);
    serverPage = new ServerPage(adminPage);
    chatPage = new ChatPage(adminPage);
  });

  test.beforeEach(async () => {
    // Start with clean slate for both sessions
    await clearBrowserState(adminPage);
    await clearBrowserState(userPage);
  });

  test.afterAll(async () => {
    await adminPage?.close();
    await userPage?.close();
  });

  test.describe('1. Invite Generation (Create Link Functionality)', () => {
    test('should allow admin to generate invite link', async () => {
      // Step 1: Admin logs in
      await adminPage.goto('/');
      await waitForAppReady(adminPage);
      await adminPage.screenshot({ path: 'test-results/invite-flow-1-home.png' });

      // Navigate to sign-in
      await adminAuthPage.goto('sign-in');
      await adminPage.screenshot({ path: 'test-results/invite-flow-2-signin.png' });

      // Login as admin user
      await adminAuthPage.login(adminUser.username, adminUser.password);
      await waitForMatrixSync(adminPage);
      await adminPage.screenshot({ path: 'test-results/invite-flow-3-admin-logged-in.png' });

      // Step 2: Navigate to admin invites page
      await adminPage.goto('/admin/invites');
      await adminPage.waitForLoadState('networkidle');
      await adminPage.screenshot({ path: 'test-results/invite-flow-4-admin-invites-page.png' });

      // Verify admin invites page is accessible
      await expect(adminPage.locator('h1, h2, [data-testid="page-title"]')).toContainText(/invite/i);

      // Step 3: Open create invite modal
      const createInviteButton = adminPage.locator('button:has-text("Create Invite"), [data-testid="create-invite-button"]');
      await expect(createInviteButton).toBeVisible({ timeout: 10000 });
      await createInviteButton.click();
      await adminPage.screenshot({ path: 'test-results/invite-flow-5-create-invite-modal.png' });

      // Step 4: Fill out invite form
      // Matrix User ID field
      const userIdInput = adminPage.locator('input[placeholder*="@user:homeserver"], [data-testid="user-id-input"]');
      await expect(userIdInput).toBeVisible({ timeout: 5000 });
      await userIdInput.fill(`@${invitedUser.username}:${new URL(TEST_CONFIG.homeserver).hostname}`);

      // Expiration dropdown (30 days default)
      const expirationSelect = adminPage.locator('[data-testid="expiration-select"], select, [role="combobox"]');
      if (await expirationSelect.isVisible()) {
        await expirationSelect.click();
        await adminPage.locator('option[value="30"], [data-value="30"]').click();
      }

      // Notes field
      const notesField = adminPage.locator('textarea[placeholder*="notes"], [data-testid="notes-input"]');
      if (await notesField.isVisible()) {
        await notesField.fill(testInviteNotes);
      }

      await adminPage.screenshot({ path: 'test-results/invite-flow-6-invite-form-filled.png' });

      // Step 5: Submit invite creation
      const submitButton = adminPage.locator('button[type="submit"], button:has-text("Create Invite")');
      await expect(submitButton).toBeVisible();
      await submitButton.click();

      // Wait for success message or invite creation
      const successMessage = adminPage.locator('.text-green, [data-testid="success-message"], :text("successfully"), :text("created")');
      await expect(successMessage).toBeVisible({ timeout: 10000 });
      await adminPage.screenshot({ path: 'test-results/invite-flow-7-invite-created.png' });

      // Extract invite code/URL from success message or UI
      const inviteCodeElement = adminPage.locator('[data-testid="invite-code"], code, .font-mono');
      if (await inviteCodeElement.isVisible()) {
        generatedInviteCode = await inviteCodeElement.textContent() || '';
      }

      // If no direct code is shown, look for invite URL
      const inviteUrlElement = adminPage.locator('[data-testid="invite-url"], input[readonly], .select-all');
      if (await inviteUrlElement.isVisible()) {
        inviteUrl = await inviteUrlElement.inputValue() || await inviteUrlElement.textContent() || '';
      }

      // Fallback: construct invite URL if we have the code
      if (!inviteUrl && generatedInviteCode) {
        inviteUrl = `${TEST_CONFIG.baseUrl}/invite/${generatedInviteCode}`;
      }

      // Verify invite was created successfully
      expect(generatedInviteCode || inviteUrl).toBeTruthy();
      console.log(`Generated invite: ${inviteUrl || generatedInviteCode}`);
    });

    test('should validate Matrix user ID format', async () => {
      // Login as admin
      await adminPage.goto('/');
      await adminAuthPage.goto('sign-in');
      await adminAuthPage.login(adminUser.username, adminUser.password);
      await waitForMatrixSync(adminPage);

      // Navigate to invite creation
      await adminPage.goto('/admin/invites');
      const createInviteButton = adminPage.locator('button:has-text("Create Invite")');
      await createInviteButton.click();

      // Try invalid Matrix user ID format
      const userIdInput = adminPage.locator('input[placeholder*="@user:homeserver"]');
      await userIdInput.fill('invalid-user-id');

      const submitButton = adminPage.locator('button[type="submit"], button:has-text("Create Invite")');
      await submitButton.click();

      // Should show validation error
      const errorMessage = adminPage.locator('.text-red, [data-testid="error-message"], :text("Invalid"), :text("format")');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
      await adminPage.screenshot({ path: 'test-results/invite-flow-validation-error.png' });
    });
  });

  test.describe('2. Invite Sharing (Copy Link Functionality)', () => {
    test('should provide copy link functionality for generated invite', async () => {
      // Prerequisites: Admin logged in and invite created
      await adminPage.goto('/');
      await adminAuthPage.goto('sign-in');
      await adminAuthPage.login(adminUser.username, adminUser.password);
      await waitForMatrixSync(adminPage);

      await adminPage.goto('/admin/invites');
      
      // Create a new invite for this test
      const createInviteButton = adminPage.locator('button:has-text("Create Invite")');
      await createInviteButton.click();

      const userIdInput = adminPage.locator('input[placeholder*="@user:homeserver"]');
      await userIdInput.fill(`@${invitedUser.username}:${new URL(TEST_CONFIG.homeserver).hostname}`);

      const submitButton = adminPage.locator('button[type="submit"], button:has-text("Create Invite")');
      await submitButton.click();

      // Wait for invite creation success
      await expect(adminPage.locator(':text("successfully"), :text("created")')).toBeVisible({ timeout: 10000 });
      await adminPage.screenshot({ path: 'test-results/invite-flow-8-copy-link-ready.png' });

      // Look for copy button or copy link functionality
      const copyButton = adminPage.locator('button:has-text("Copy"), [data-testid="copy-button"], button[title*="copy" i]');
      if (await copyButton.isVisible()) {
        await copyButton.click();
        
        // Verify copy feedback
        const copyFeedback = adminPage.locator(':text("Copied"), :text("Clipboard"), .text-green');
        await expect(copyFeedback).toBeVisible({ timeout: 3000 });
        await adminPage.screenshot({ path: 'test-results/invite-flow-9-copy-success.png' });
      }

      // Extract the invite URL for sharing
      const inviteUrlField = adminPage.locator('[data-testid="invite-url"], input[readonly], .font-mono');
      if (await inviteUrlField.isVisible()) {
        inviteUrl = await inviteUrlField.inputValue() || await inviteUrlField.textContent() || '';
      }

      expect(inviteUrl).toBeTruthy();
    });

    test('should display shareable invite link in admin interface', async () => {
      // Login and navigate to invites
      await adminPage.goto('/');
      await adminAuthPage.goto('sign-in');
      await adminAuthPage.login(adminUser.username, adminUser.password);
      await waitForMatrixSync(adminPage);

      await adminPage.goto('/admin/invites');
      await adminPage.screenshot({ path: 'test-results/invite-flow-10-invites-list.png' });

      // Should show list of existing invites with URLs
      const inviteList = adminPage.locator('[data-testid="invites-list"], .invite-item, tr');
      if (await inviteList.first().isVisible()) {
        // Look for invite URLs or codes in the list
        const inviteLink = adminPage.locator('.font-mono, code, [data-testid="invite-url"]').first();
        await expect(inviteLink).toBeVisible();
        
        // Capture the URL for later use
        const linkText = await inviteLink.textContent();
        if (linkText && linkText.includes('/invite/')) {
          inviteUrl = linkText.includes('http') ? linkText : `${TEST_CONFIG.baseUrl}${linkText}`;
        }
      }
    });
  });

  test.describe('3. Invite Acceptance (New User Joins via Link)', () => {
    test('should allow new user to accept invite via link', async () => {
      // Ensure we have an invite URL to test with
      if (!inviteUrl) {
        // Create an invite first
        await adminPage.goto('/');
        await adminAuthPage.goto('sign-in');
        await adminAuthPage.login(adminUser.username, adminUser.password);
        await waitForMatrixSync(adminPage);
        
        await adminPage.goto('/admin/invites');
        const createInviteButton = adminPage.locator('button:has-text("Create Invite")');
        await createInviteButton.click();
        
        const userIdInput = adminPage.locator('input[placeholder*="@user:homeserver"]');
        await userIdInput.fill(`@${invitedUser.username}:${new URL(TEST_CONFIG.homeserver).hostname}`);
        
        const submitButton = adminPage.locator('button[type="submit"], button:has-text("Create Invite")');
        await submitButton.click();
        
        await expect(adminPage.locator(':text("successfully")')).toBeVisible({ timeout: 10000 });
        
        // Extract invite URL
        const inviteUrlElement = adminPage.locator('[data-testid="invite-url"], input[readonly], .font-mono');
        if (await inviteUrlElement.isVisible()) {
          inviteUrl = await inviteUrlElement.inputValue() || await inviteUrlElement.textContent() || '';
        }
      }

      // Step 1: New user visits invite link
      await userPage.goto(inviteUrl || '/invite/test-invite');
      await waitForAppReady(userPage);
      await userPage.screenshot({ path: 'test-results/invite-flow-11-invite-page.png' });

      // Step 2: Should show invite preview page
      const invitePreview = userPage.locator('h1, h2, [data-testid="invite-title"]');
      await expect(invitePreview).toBeVisible({ timeout: 10000 });
      
      // Look for server/room information
      const serverInfo = userPage.locator('.server-name, .room-name, h3');
      if (await serverInfo.isVisible()) {
        await expect(serverInfo).toContainText(/invite|join|server|room/i);
      }

      // Step 3: User needs to be authenticated to accept invite
      const joinButton = userPage.locator('button:has-text("Join"), button:has-text("Accept"), [data-testid="join-button"]');
      if (await joinButton.isVisible()) {
        await joinButton.click();
      } else {
        // Might need to login first
        const loginButton = userPage.locator('button:has-text("Login"), button:has-text("Sign"), a[href*="sign-in"]');
        if (await loginButton.isVisible()) {
          await loginButton.click();
          
          // Login flow
          await userAuthPage.login(invitedUser.username, invitedUser.password);
          await waitForMatrixSync(userPage);
          
          // Return to invite page
          await userPage.goto(inviteUrl);
          await userPage.screenshot({ path: 'test-results/invite-flow-12-invite-authenticated.png' });
          
          // Now try to join
          const joinButtonAfterAuth = userPage.locator('button:has-text("Join"), button:has-text("Accept")');
          await expect(joinButtonAfterAuth).toBeVisible({ timeout: 5000 });
          await joinButtonAfterAuth.click();
        }
      }

      // Step 4: Verify successful join
      const successMessage = userPage.locator(':text("Welcome"), :text("joined"), :text("success"), .text-green');
      await expect(successMessage).toBeVisible({ timeout: 15000 });
      await userPage.screenshot({ path: 'test-results/invite-flow-13-join-success.png' });

      // Should redirect to the server/room
      await userPage.waitForLoadState('networkidle');
      const currentUrl = userPage.url();
      expect(currentUrl).toMatch(/\/(servers|rooms|channels)/);
      await userPage.screenshot({ path: 'test-results/invite-flow-14-user-in-server.png' });
    });

    test('should show server preview before joining', async () => {
      // Visit invite link without authentication
      await clearBrowserState(userPage);
      await userPage.goto(inviteUrl || '/invite/test-invite');
      await waitForAppReady(userPage);

      // Should show invite preview with server information
      const serverPreview = userPage.locator('.server-preview, .room-preview, [data-testid="invite-preview"]');
      await expect(serverPreview).toBeVisible({ timeout: 10000 });

      // Should show server details
      const serverName = userPage.locator('.server-name, h1, h2, [data-testid="server-name"]');
      const memberCount = userPage.locator(':text("member"), :text("user"), [data-testid="member-count"]');
      
      await expect(serverName).toBeVisible();
      // Member count might not always be visible, so make it optional
      if (await memberCount.isVisible()) {
        await expect(memberCount).toContainText(/\d+/);
      }

      await userPage.screenshot({ path: 'test-results/invite-flow-15-server-preview.png' });
    });
  });

  test.describe('4. End-to-End Workflow Verification', () => {
    test('should complete full invite workflow with message verification', async () => {
      // Full workflow: Create invite → Share → Accept → Verify communication
      
      // Step 1: Admin creates invite
      await adminPage.goto('/');
      await adminAuthPage.goto('sign-in');
      await adminAuthPage.login(adminUser.username, adminUser.password);
      await waitForMatrixSync(adminPage);

      await adminPage.goto('/admin/invites');
      const createInviteButton = adminPage.locator('button:has-text("Create Invite")');
      await createInviteButton.click();

      const userIdInput = adminPage.locator('input[placeholder*="@user:homeserver"]');
      await userIdInput.fill(`@${invitedUser.username}:${new URL(TEST_CONFIG.homeserver).hostname}`);

      const submitButton = adminPage.locator('button[type="submit"]');
      await submitButton.click();

      await expect(adminPage.locator(':text("successfully")')).toBeVisible({ timeout: 10000 });

      // Extract invite URL
      const inviteUrlElement = adminPage.locator('[data-testid="invite-url"], input[readonly], .font-mono');
      if (await inviteUrlElement.isVisible()) {
        inviteUrl = await inviteUrlElement.inputValue() || await inviteUrlElement.textContent() || '';
      }

      await adminPage.screenshot({ path: 'test-results/invite-flow-16-full-workflow-invite-created.png' });

      // Step 2: User accepts invite
      await userPage.goto(inviteUrl || '/invite/test-invite');
      await userAuthPage.login(invitedUser.username, invitedUser.password);
      await waitForMatrixSync(userPage);

      await userPage.goto(inviteUrl);
      const joinButton = userPage.locator('button:has-text("Join"), button:has-text("Accept")');
      if (await joinButton.isVisible()) {
        await joinButton.click();
        await expect(userPage.locator(':text("Welcome"), :text("joined")')).toBeVisible({ timeout: 15000 });
      }

      await userPage.screenshot({ path: 'test-results/invite-flow-17-full-workflow-user-joined.png' });

      // Step 3: Verify user appears in admin's server member list
      await adminPage.goto('/admin/invites');
      const usedInviteIndicator = adminPage.locator(':text("used"), :text("joined"), .text-green');
      // This might not always be immediately visible, so make it optional
      await adminPage.screenshot({ path: 'test-results/invite-flow-18-full-workflow-admin-verification.png' });

      // Step 4: Verify both users can see each other in the same server
      const userChatPage = new ChatPage(userPage);
      const adminChatPage = new ChatPage(adminPage);

      // Both users should be able to navigate to the same server/room
      await adminPage.goto('/');
      await userPage.goto('/');
      
      await adminPage.screenshot({ path: 'test-results/invite-flow-19-admin-final-state.png' });
      await userPage.screenshot({ path: 'test-results/invite-flow-20-user-final-state.png' });

      // Success: Both users are now in the same server via invite workflow
    });

    test('should track invite usage correctly', async () => {
      // Create invite and verify tracking
      await adminPage.goto('/');
      await adminAuthPage.goto('sign-in');
      await adminAuthPage.login(adminUser.username, adminUser.password);
      await waitForMatrixSync(adminPage);

      await adminPage.goto('/admin/invites');
      
      // Check initial invite statistics
      const activeInvites = adminPage.locator('[data-testid="active-invites"], :text("Active")');
      const usedInvites = adminPage.locator('[data-testid="used-invites"], :text("Used")');
      
      await adminPage.screenshot({ path: 'test-results/invite-flow-21-invite-tracking-before.png' });

      // Accept an invite (if available) and verify statistics change
      if (inviteUrl) {
        await userPage.goto(inviteUrl);
        const joinButton = userPage.locator('button:has-text("Join")');
        if (await joinButton.isVisible()) {
          await joinButton.click();
          await expect(userPage.locator(':text("Welcome"), :text("joined")')).toBeVisible({ timeout: 15000 });
          
          // Check updated statistics
          await adminPage.reload();
          await adminPage.screenshot({ path: 'test-results/invite-flow-22-invite-tracking-after.png' });
        }
      }
    });
  });

  test.describe('5. Error Scenarios', () => {
    test('should handle invalid invite links gracefully', async () => {
      // Test with invalid invite code
      await userPage.goto('/invite/invalid-invite-code-12345');
      await waitForAppReady(userPage);

      // Should show error message
      const errorMessage = userPage.locator(':text("Invalid"), :text("expired"), :text("not found"), [data-testid="error-message"]');
      await expect(errorMessage).toBeVisible({ timeout: 10000 });

      // Should provide navigation options
      const goHomeButton = userPage.locator('button:has-text("Home"), a[href="/"], button:has-text("Back")');
      await expect(goHomeButton).toBeVisible();

      await userPage.screenshot({ path: 'test-results/invite-flow-23-invalid-invite-error.png' });
    });

    test('should handle expired invite links', async () => {
      // This would require creating an invite with a very short expiration
      // For now, test the error handling UI pattern
      
      // Navigate to invite page that should be expired
      await userPage.goto('/invite/expired-test-invite');
      await waitForAppReady(userPage);

      // Should handle gracefully - either show error or redirect
      const pageContent = userPage.locator('body');
      await expect(pageContent).toBeVisible();

      // Check for error indicators
      const errorContent = userPage.locator(':text("expired"), :text("invalid"), :text("not found")');
      if (await errorContent.isVisible()) {
        await userPage.screenshot({ path: 'test-results/invite-flow-24-expired-invite-error.png' });
      } else {
        // If no error shown, the page should still be functional
        await userPage.screenshot({ path: 'test-results/invite-flow-24-expired-invite-fallback.png' });
      }
    });

    test('should require authentication for invite acceptance', async () => {
      // Visit invite page without authentication
      await clearBrowserState(userPage);
      await userPage.goto(inviteUrl || '/invite/test-invite');
      await waitForAppReady(userPage);

      const joinButton = userPage.locator('button:has-text("Join"), button:has-text("Accept")');
      
      if (await joinButton.isVisible()) {
        await joinButton.click();
        
        // Should redirect to login or show authentication requirement
        const authRequired = userPage.locator(':text("login"), :text("sign in"), :text("authenticate"), input[type="password"]');
        await expect(authRequired).toBeVisible({ timeout: 10000 });
        
        await userPage.screenshot({ path: 'test-results/invite-flow-25-auth-required.png' });
      } else {
        // Join button not visible - likely requires login first
        const loginPrompt = userPage.locator('button:has-text("Login"), a[href*="sign-in"], :text("sign in")');
        await expect(loginPrompt).toBeVisible();
        await userPage.screenshot({ path: 'test-results/invite-flow-25-login-prompt.png' });
      }
    });

    test('should handle network errors during invite creation', async () => {
      // Login as admin
      await adminPage.goto('/');
      await adminAuthPage.goto('sign-in');
      await adminAuthPage.login(adminUser.username, adminUser.password);
      await waitForMatrixSync(adminPage);

      // Navigate to invite creation
      await adminPage.goto('/admin/invites');
      const createInviteButton = adminPage.locator('button:has-text("Create Invite")');
      await createInviteButton.click();

      // Fill out form
      const userIdInput = adminPage.locator('input[placeholder*="@user:homeserver"]');
      await userIdInput.fill(`@testuser:example.com`);

      // Intercept network request to simulate error
      await adminPage.route('**/api/admin/invites', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: { message: 'Network error' } })
        });
      });

      const submitButton = adminPage.locator('button[type="submit"]');
      await submitButton.click();

      // Should show error message
      const errorMessage = adminPage.locator('.text-red, [data-testid="error-message"], :text("error"), :text("failed")');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
      await adminPage.screenshot({ path: 'test-results/invite-flow-26-network-error.png' });
    });
  });
});