/**
 * E2E Tests for Complete Leave Server Flow (ST-P2-02-B)
 * 
 * Tests the complete user journey for leaving a server:
 * 1. User login and navigation
 * 2. Right-click server to open context menu  
 * 3. Click "Leave Server" option
 * 4. Confirm in LeaveServerModal
 * 5. Verify server is removed from server list
 * 
 * Also tests the cancel flow to ensure users can cancel leaving.
 * 
 * Implements AC-4 from parent story US-P2-02: "Successful Leave Server Flow"
 */

import { test, expect, Page } from '@playwright/test';

// Test data
const TEST_SERVER = {
  name: 'Test Leave Server',
  id: 'test-leave-server-id'
};

/**
 * Helper function to log in a test user
 * Uses the existing test fixtures for proper authentication
 */
async function loginAsTestUser(page: Page) {
  try {
    // Import and use existing auth helpers with correct path
    const { loginWithTestUser, waitForAppReady } = await import('./fixtures');
    
    // Use the established login flow
    await loginWithTestUser(page);
    await waitForAppReady(page);
    
    // Verify we're logged in by checking for navigation sidebar
    await expect(page.locator('[data-testid="navigation-sidebar"]')).toBeVisible({ timeout: 15000 });
  } catch (error) {
    console.log('Login helper failed, using fallback approach:', error.message);
    // Fallback: navigate directly and check for main UI elements
    await page.goto('http://dev2.aaroncollins.info:3000');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000); // Wait for app to load
    
    // Check if we can see the main navigation or try a more basic check
    const hasNavigation = await page.locator('[data-testid="navigation-sidebar"]').isVisible().catch(() => false);
    if (!hasNavigation) {
      // Very basic check - just make sure the page loaded
      await expect(page.locator('body')).toBeVisible();
    }
  }
}

/**
 * Helper function to create a test server for leaving
 * Note: This will need server creation functionality to be available
 */
async function createTestServer(page: Page): Promise<void> {
  // TODO: Implement server creation for test purposes
  // This depends on the create server functionality being available
  console.log('Test server creation needed for full E2E test');
}

/**
 * Helper function to trigger leave server from context menu
 */
async function triggerLeaveServerFromContextMenu(page: Page, serverName: string = TEST_SERVER.name): Promise<void> {
  // Find the server icon/item
  const serverIcon = page.locator(`[data-testid="server-icon"]:has-text("${serverName}")`).first();
  if (!(await serverIcon.isVisible())) {
    // Fallback: find any server icon
    const anyServerIcon = page.locator('[data-testid="server-icon"]').first();
    await expect(anyServerIcon).toBeVisible();
    await anyServerIcon.click({ button: 'right' });
  } else {
    await serverIcon.click({ button: 'right' });
  }
  
  // Wait for context menu to appear
  const contextMenu = page.locator('[data-testid="server-context-menu"]');
  await expect(contextMenu).toBeVisible();
  
  // Click the "Leave Server" option
  const leaveOption = contextMenu.locator('text=Leave Server');
  await expect(leaveOption).toBeVisible();
  await leaveOption.click();
}

/**
 * Helper function to count servers in the sidebar
 */
async function getServerCount(page: Page): Promise<number> {
  const servers = page.locator('[data-testid="server-icon"]');
  return await servers.count();
}

test.describe('Leave Server E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginAsTestUser(page);
  });

  test('AC-4: Complete leave server flow removes server from list', async ({ page }) => {
    // Take screenshot of initial state
    await page.screenshot({ path: 'tests/e2e/evidence/leave-server-before.png', fullPage: true });
    
    // Count initial servers
    const initialServerCount = await getServerCount(page);
    expect(initialServerCount).toBeGreaterThan(0);
    
    // Find a server to leave (first available server)
    const serverToLeave = page.locator('[data-testid="server-icon"]').first();
    await expect(serverToLeave).toBeVisible();
    
    // Get server name for verification
    const serverElement = await serverToLeave.getAttribute('aria-label') || 'Test Server';
    
    // Right-click on server to open context menu
    await serverToLeave.click({ button: 'right' });
    
    // Verify context menu appears
    const contextMenu = page.locator('[data-testid="server-context-menu"]');
    await expect(contextMenu).toBeVisible();
    
    // Click "Leave Server"
    const leaveOption = contextMenu.locator('text=Leave Server');
    await expect(leaveOption).toBeVisible();
    await leaveOption.click();
    
    // Verify LeaveServerModal opens
    const leaveModal = page.locator('[data-testid="leave-server-modal"]');
    await expect(leaveModal).toBeVisible();
    
    // Verify modal shows server name
    await expect(leaveModal.locator(`text=${serverElement}`)).toBeVisible();
    
    // Verify Cancel and Leave buttons are present
    const cancelButton = leaveModal.locator('button:has-text("Cancel")');
    const confirmLeaveButton = leaveModal.locator('[data-testid="confirm-leave-button"]');
    await expect(cancelButton).toBeVisible();
    await expect(confirmLeaveButton).toBeVisible();
    
    // Take screenshot of confirmation modal
    await page.screenshot({ path: 'tests/e2e/evidence/leave-server-modal.png', fullPage: true });
    
    // Click Leave to confirm
    await confirmLeaveButton.click();
    
    // Wait for server to be removed
    await page.waitForTimeout(2000);
    
    // Verify server count decreased
    const finalServerCount = await getServerCount(page);
    expect(finalServerCount).toBe(initialServerCount - 1);
    
    // Take screenshot of final state
    await page.screenshot({ path: 'tests/e2e/evidence/leave-server-after.png', fullPage: true });
  });

  test('AC-5: Cancel leave server flow keeps user as member', async ({ page }) => {
    // Count initial servers
    const initialServerCount = await getServerCount(page);
    expect(initialServerCount).toBeGreaterThan(0);
    
    // Right-click on first server
    const serverIcon = page.locator('[data-testid="server-icon"]').first();
    await expect(serverIcon).toBeVisible();
    await serverIcon.click({ button: 'right' });
    
    // Open leave server modal
    const contextMenu = page.locator('[data-testid="server-context-menu"]');
    await expect(contextMenu).toBeVisible();
    
    const leaveOption = contextMenu.locator('text=Leave Server');
    await leaveOption.click();
    
    // Verify modal opens
    const leaveModal = page.locator('[data-testid="leave-server-modal"]');
    await expect(leaveModal).toBeVisible();
    
    // Take screenshot of modal before canceling
    await page.screenshot({ path: 'tests/e2e/evidence/leave-server-cancel-modal.png', fullPage: true });
    
    // Click Cancel
    const cancelButton = leaveModal.locator('button:has-text("Cancel")');
    await cancelButton.click();
    
    // Verify modal closes
    await expect(leaveModal).not.toBeVisible();
    
    // Verify server count unchanged
    const finalServerCount = await getServerCount(page);
    expect(finalServerCount).toBe(initialServerCount);
    
    // Take screenshot to confirm no change
    await page.screenshot({ path: 'tests/e2e/evidence/leave-server-cancelled.png', fullPage: true });
  });

  test('Context menu appears on right-click', async ({ page }) => {
    // Find a server icon
    const serverIcon = page.locator('[data-testid="server-icon"]').first();
    await expect(serverIcon).toBeVisible();
    
    // Right-click to open context menu
    await serverIcon.click({ button: 'right' });
    
    // Verify context menu appears
    const contextMenu = page.locator('[data-testid="server-context-menu"]');
    await expect(contextMenu).toBeVisible();
    
    // Verify "Leave Server" option is present
    const leaveOption = contextMenu.locator('text=Leave Server');
    await expect(leaveOption).toBeVisible();
    
    // Take screenshot of context menu
    await page.screenshot({ path: 'tests/e2e/evidence/server-context-menu.png', fullPage: true });
  });

  test('LeaveServerModal displays correct server information', async ({ page }) => {
    // Right-click on server
    const serverIcon = page.locator('[data-testid="server-icon"]').first();
    await expect(serverIcon).toBeVisible();
    
    // Get server name for later verification
    const serverName = await serverIcon.getAttribute('aria-label') || 'Test Server';
    
    await serverIcon.click({ button: 'right' });
    
    // Open leave server modal
    const contextMenu = page.locator('[data-testid="server-context-menu"]');
    await expect(contextMenu).toBeVisible();
    await contextMenu.locator('text=Leave Server').click();
    
    // Verify modal content
    const leaveModal = page.locator('[data-testid="leave-server-modal"]');
    await expect(leaveModal).toBeVisible();
    
    // Check that modal contains confirmation message
    await expect(leaveModal.locator('text=Are you sure')).toBeVisible();
    
    // Check that modal has proper buttons
    await expect(leaveModal.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(leaveModal.locator('[data-testid="confirm-leave-button"]')).toBeVisible();
    
    // Take screenshot of modal
    await page.screenshot({ path: 'tests/e2e/evidence/leave-server-modal-content.png', fullPage: true });
  });

  test('Keyboard navigation works in context menu', async ({ page }) => {
    // Right-click on server
    const serverIcon = page.locator('[data-testid="server-icon"]').first();
    await expect(serverIcon).toBeVisible();
    await serverIcon.click({ button: 'right' });
    
    // Verify context menu appears
    const contextMenu = page.locator('[data-testid="server-context-menu"]');
    await expect(contextMenu).toBeVisible();
    
    // Test Escape key closes menu
    await page.keyboard.press('Escape');
    await expect(contextMenu).not.toBeVisible();
    
    // Open menu again
    await serverIcon.click({ button: 'right' });
    await expect(contextMenu).toBeVisible();
    
    // Test Enter key activates Leave Server
    const leaveOption = contextMenu.locator('text=Leave Server');
    await leaveOption.focus();
    await page.keyboard.press('Enter');
    
    // Verify modal opens
    const leaveModal = page.locator('[data-testid="leave-server-modal"]');
    await expect(leaveModal).toBeVisible();
  });

  test('Click outside context menu closes it', async ({ page }) => {
    // Right-click on server
    const serverIcon = page.locator('[data-testid="server-icon"]').first();
    await expect(serverIcon).toBeVisible();
    await serverIcon.click({ button: 'right' });
    
    // Verify context menu appears
    const contextMenu = page.locator('[data-testid="server-context-menu"]');
    await expect(contextMenu).toBeVisible();
    
    // Click outside the menu
    await page.click('body', { position: { x: 100, y: 100 } });
    
    // Verify menu closes
    await expect(contextMenu).not.toBeVisible();
  });
});

test.describe('Leave Server Flow - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('Mobile long-press opens context menu', async ({ page }) => {
    // Find server icon
    const serverIcon = page.locator('[data-testid="server-icon"]').first();
    await expect(serverIcon).toBeVisible();
    
    // Long press to simulate mobile context menu
    await serverIcon.hover();
    await page.mouse.down();
    await page.waitForTimeout(500); // Simulate long press
    await page.mouse.up();
    
    // Verify context menu appears (this might need adjustment for mobile)
    const contextMenu = page.locator('[data-testid="server-context-menu"]');
    await expect(contextMenu).toBeVisible();
    
    // Take mobile screenshot
    await page.screenshot({ path: 'tests/e2e/evidence/mobile-context-menu.png', fullPage: true });
  });
});

test.describe('Leave Server Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('Network error during leave shows error message', async ({ page }) => {
    // Mock network failure
    await page.route('**/matrix/**', route => route.abort('failed'));
    
    // Try to leave server
    const serverIcon = page.locator('[data-testid="server-icon"]').first();
    await expect(serverIcon).toBeVisible();
    await serverIcon.click({ button: 'right' });
    
    const contextMenu = page.locator('[data-testid="server-context-menu"]');
    await expect(contextMenu).toBeVisible();
    await contextMenu.locator('text=Leave Server').click();
    
    const leaveModal = page.locator('[data-testid="leave-server-modal"]');
    await expect(leaveModal).toBeVisible();
    
    // Confirm leave (should fail)
    await leaveModal.locator('[data-testid="confirm-leave-button"]').click();
    
    // Verify error message appears
    const errorMessage = page.locator('text=Failed to leave server').or(page.locator('text=Network error'));
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    
    // Take screenshot of error state
    await page.screenshot({ path: 'tests/e2e/evidence/leave-server-error.png', fullPage: true });
  });
});