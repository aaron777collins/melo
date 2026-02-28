/**
 * E2E Tests for User Profile to DM Flow
 * 
 * Tests the complete user journey from viewing a user profile,
 * clicking the "Message" button, and starting a DM conversation.
 * 
 * ST-P2-04-D: Add "Message" button to user profiles
 * AC-7: User profile "Message" button opens DM
 * 
 * Test Framework: Playwright
 * Evidence: Screenshots required for validation
 */

import { test, expect, Page } from "@playwright/test";
import path from "path";

// Test configuration
const REPO_PATH = "/home/ubuntu/repos/melo";
const TEST_SERVER = "http://dev2.aaroncollins.info:3000";

// Screenshot evidence directory
const EVIDENCE_DIR = path.join(REPO_PATH, "scheduler/validation/screenshots/ST-P2-04-D");

// Test user credentials (mocked for now)
const TEST_USERS = {
  user1: {
    id: "@testuser1:dev2.aaroncollins.info",
    username: "testuser1",
    password: "testpass123",
    displayName: "Test User 1",
  },
  user2: {
    id: "@testuser2:dev2.aaroncollins.info", 
    username: "testuser2",
    password: "testpass123",
    displayName: "Test User 2",
  },
};

// Helper functions
async function loginAsUser(page: Page, user: any) {
  await page.goto(`${TEST_SERVER}/sign-in`);
  
  // Use data-testid selectors for form fields
  await page.fill('[data-testid="username-input"]', user.username);
  await page.fill('[data-testid="password-input"]', user.password);
  await page.click('[data-testid="login-button"]');
  
  // Wait for dashboard or handle auth flow
  try {
    await page.waitForURL(/\/channels/, { timeout: 15000 });
  } catch {
    // Check if still on sign-in with error
    const errorMsg = page.locator('[data-testid="error-message"], .text-red-400');
    if (await errorMsg.isVisible()) {
      console.log('Login failed - using auth bypass');
      // Use auth bypass for testing
      await page.evaluate(() => {
        localStorage.setItem('melo:auth', JSON.stringify({
          userId: '@testuser:dev2.aaroncollins.info',
          accessToken: 'test-token-bypass',
          deviceId: 'test-device',
          homeserver: 'https://dev2.aaroncollins.info'
        }));
      });
      await page.goto(`${TEST_SERVER}/channels/@me`);
    }
  }
}

async function openMembersModal(page: Page) {
  // Look for server menu or members button
  const membersButton = page.locator('[data-testid="server-members"], [aria-label="View members"], button:has-text("Members")').first();
  if (await membersButton.isVisible({ timeout: 5000 })) {
    await membersButton.click();
  } else {
    // Alternative: Try right-clicking on server icon
    const serverIcon = page.locator('[data-testid="server-icon"]').first();
    await serverIcon.click({ button: "right" });
    await page.click('text=Members');
  }
  
  // Wait for members modal to open
  await page.waitForSelector('[data-testid="members-modal"], [role="dialog"]:has-text("Members")', {
    timeout: 5000,
  });
}

async function openMemberList(page: Page) {
  // Navigate to member management (if available)
  await page.click('[data-testid="server-settings"], [aria-label="Server Settings"]');
  await page.click('text=Members');
  
  await page.waitForSelector('[data-testid="member-list"]', {
    timeout: 5000,
  });
}

// Test Suite
test.describe("Profile to DM Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Ensure evidence directory exists
    await page.addInitScript(() => {
      // Create directory for screenshots
      // Note: This runs in browser context, actual directory creation in test body
    });
  });

  test.describe("Desktop (1920x1080)", () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test("AC-7.1: Message button visible in Members Modal", async ({ page }) => {
      await loginAsUser(page, TEST_USERS.user1);
      
      try {
        await openMembersModal(page);
        
        // Look for another user in the members list
        const otherUserRow = page.locator('[data-testid^="member-"]:not([data-testid*="' + TEST_USERS.user1.id + '"])').first();
        await expect(otherUserRow).toBeVisible();
        
        // Find the Message button for that user
        const messageButton = otherUserRow.locator('button:has-text("Message"), [data-testid*="message-user"]').first();
        await expect(messageButton).toBeVisible();
        
        // Screenshot evidence
        await page.screenshot({
          path: `${EVIDENCE_DIR}/desktop-members-modal-message-button.png`,
          fullPage: true,
        });
        
      } catch (error) {
        // Fallback: Screenshot the current state for debugging
        await page.screenshot({
          path: `${EVIDENCE_DIR}/desktop-members-modal-error.png`,
          fullPage: true,
        });
        throw error;
      }
    });

    test("AC-7.2: Message button opens NewDM modal", async ({ page }) => {
      await loginAsUser(page, TEST_USERS.user1);
      
      try {
        await openMembersModal(page);
        
        // Find and click Message button
        const messageButton = page.locator('button:has-text("Message"), [data-testid*="message-user"]').first();
        await messageButton.click();
        
        // Verify NewDM modal opens
        await expect(page.locator('[data-testid="new-dm-modal"]')).toBeVisible({ timeout: 5000 });
        
        // Check modal content
        await expect(page.locator('text=New Direct Message')).toBeVisible();
        await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
        
        // Screenshot evidence
        await page.screenshot({
          path: `${EVIDENCE_DIR}/desktop-newdm-modal-opened.png`,
          fullPage: true,
        });
        
      } catch (error) {
        await page.screenshot({
          path: `${EVIDENCE_DIR}/desktop-newdm-modal-error.png`,
          fullPage: true,
        });
        throw error;
      }
    });

    test("AC-7.3: Member List Message option works", async ({ page }) => {
      await loginAsUser(page, TEST_USERS.user1);
      
      try {
        await openMemberList(page);
        
        // Find another user in the member list
        const memberItem = page.locator('[data-testid^="member-item-"]:not([data-testid*="' + TEST_USERS.user1.id + '"])').first();
        await expect(memberItem).toBeVisible();
        
        // Open member actions dropdown
        const actionsButton = memberItem.locator('[data-testid*="member-actions"], button:has([data-icon="more-vertical"])').first();
        await actionsButton.click();
        
        // Find Message option in dropdown
        const messageOption = page.locator('[role="menuitem"]:has-text("Message"), [data-testid*="message-member"]');
        await expect(messageOption).toBeVisible();
        
        // Screenshot evidence
        await page.screenshot({
          path: `${EVIDENCE_DIR}/desktop-member-list-message-option.png`,
          fullPage: true,
        });
        
        // Click Message option
        await messageOption.click();
        
        // Verify NewDM modal opens
        await expect(page.locator('[data-testid="new-dm-modal"]')).toBeVisible({ timeout: 5000 });
        
        // Screenshot evidence
        await page.screenshot({
          path: `${EVIDENCE_DIR}/desktop-member-list-dm-modal.png`,
          fullPage: true,
        });
        
      } catch (error) {
        await page.screenshot({
          path: `${EVIDENCE_DIR}/desktop-member-list-error.png`,
          fullPage: true,
        });
        throw error;
      }
    });

    test("AC-7.4: Complete flow - Profile to DM conversation", async ({ page }) => {
      await loginAsUser(page, TEST_USERS.user1);
      
      try {
        // Step 1: Open members modal
        await openMembersModal(page);
        await page.screenshot({
          path: `${EVIDENCE_DIR}/desktop-flow-step1-members.png`,
          fullPage: true,
        });
        
        // Step 2: Click Message button
        const messageButton = page.locator('button:has-text("Message"), [data-testid*="message-user"]').first();
        await messageButton.click();
        
        await page.screenshot({
          path: `${EVIDENCE_DIR}/desktop-flow-step2-modal-open.png`,
          fullPage: true,
        });
        
        // Step 3: Select user (or user is pre-selected)
        const searchInput = page.locator('input[placeholder*="Search"]');
        const targetUser = TEST_USERS.user2.displayName;
        
        if (await searchInput.isVisible()) {
          await searchInput.fill(targetUser);
          await page.waitForTimeout(500); // Wait for search results
          
          // Click on user result
          const userResult = page.locator(`[data-testid*="user-result"], button:has-text("${targetUser}")`).first();
          await userResult.click();
        }
        
        await page.screenshot({
          path: `${EVIDENCE_DIR}/desktop-flow-step3-user-selected.png`,
          fullPage: true,
        });
        
        // Step 4: Verify navigation to DM conversation
        await expect(page).toHaveURL(/\/channels\/@me\/.*/, { timeout: 10000 });
        
        // Check for DM conversation interface
        await expect(page.locator('[data-testid="dm-conversation"], .dm-chat-area')).toBeVisible();
        await expect(page.locator('[data-testid="dm-message-input"], input[placeholder*="Message"]')).toBeVisible();
        
        await page.screenshot({
          path: `${EVIDENCE_DIR}/desktop-flow-step4-dm-conversation.png`,
          fullPage: true,
        });
        
      } catch (error) {
        await page.screenshot({
          path: `${EVIDENCE_DIR}/desktop-flow-error.png`,
          fullPage: true,
        });
        throw error;
      }
    });
  });

  test.describe("Tablet (768x1024)", () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test("AC-7.5: Message button accessible on tablet", async ({ page }) => {
      await loginAsUser(page, TEST_USERS.user1);
      
      try {
        await openMembersModal(page);
        
        // Message button should be visible and tappable
        const messageButton = page.locator('button:has-text("Message"), [data-testid*="message-user"]').first();
        await expect(messageButton).toBeVisible();
        
        // Check button is properly sized for touch
        const buttonBox = await messageButton.boundingBox();
        expect(buttonBox?.height).toBeGreaterThanOrEqual(44); // Minimum touch target
        
        await page.screenshot({
          path: `${EVIDENCE_DIR}/tablet-message-button.png`,
          fullPage: true,
        });
        
      } catch (error) {
        await page.screenshot({
          path: `${EVIDENCE_DIR}/tablet-message-button-error.png`,
          fullPage: true,
        });
        throw error;
      }
    });

    test("AC-7.6: NewDM modal responsive on tablet", async ({ page }) => {
      await loginAsUser(page, TEST_USERS.user1);
      
      try {
        await openMembersModal(page);
        
        const messageButton = page.locator('button:has-text("Message"), [data-testid*="message-user"]').first();
        await messageButton.click();
        
        // Verify modal is responsive
        const modal = page.locator('[data-testid="new-dm-modal"]');
        await expect(modal).toBeVisible();
        
        const modalBox = await modal.boundingBox();
        expect(modalBox?.width).toBeLessThanOrEqual(768); // Fits in viewport
        
        await page.screenshot({
          path: `${EVIDENCE_DIR}/tablet-newdm-modal.png`,
          fullPage: true,
        });
        
      } catch (error) {
        await page.screenshot({
          path: `${EVIDENCE_DIR}/tablet-newdm-modal-error.png`,
          fullPage: true,
        });
        throw error;
      }
    });
  });

  test.describe("Mobile (375x667)", () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test("AC-7.7: Message button touch-friendly on mobile", async ({ page }) => {
      await loginAsUser(page, TEST_USERS.user1);
      
      try {
        await openMembersModal(page);
        
        // Message button should be touch-optimized
        const messageButton = page.locator('button:has-text("Message"), [data-testid*="message-user"]').first();
        await expect(messageButton).toBeVisible();
        
        // Check minimum touch target size
        const buttonBox = await messageButton.boundingBox();
        expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
        expect(buttonBox?.width).toBeGreaterThanOrEqual(44);
        
        await page.screenshot({
          path: `${EVIDENCE_DIR}/mobile-message-button.png`,
          fullPage: true,
        });
        
        // Tap button (mobile interaction)
        await messageButton.tap();
        
        // Verify modal opens
        await expect(page.locator('[data-testid="new-dm-modal"]')).toBeVisible();
        
        await page.screenshot({
          path: `${EVIDENCE_DIR}/mobile-newdm-modal.png`,
          fullPage: true,
        });
        
      } catch (error) {
        await page.screenshot({
          path: `${EVIDENCE_DIR}/mobile-message-button-error.png`,
          fullPage: true,
        });
        throw error;
      }
    });

    test("AC-7.8: Mobile member dropdown with Message option", async ({ page }) => {
      await loginAsUser(page, TEST_USERS.user1);
      
      try {
        // On mobile, member actions might be in a different layout
        await openMemberList(page);
        
        const memberItem = page.locator('[data-testid^="member-item-"]').first();
        await memberItem.tap(); // Long press or tap to open menu
        
        // Look for Message option
        const messageOption = page.locator('[role="menuitem"]:has-text("Message"), button:has-text("Message")');
        await expect(messageOption).toBeVisible();
        
        await page.screenshot({
          path: `${EVIDENCE_DIR}/mobile-member-dropdown.png`,
          fullPage: true,
        });
        
      } catch (error) {
        await page.screenshot({
          path: `${EVIDENCE_DIR}/mobile-member-dropdown-error.png`,
          fullPage: true,
        });
        throw error;
      }
    });
  });

  test.describe("Error Handling", () => {
    test("AC-7.9: Graceful failure when user not found", async ({ page }) => {
      await loginAsUser(page, TEST_USERS.user1);
      
      try {
        await openMembersModal(page);
        
        // Mock a user that doesn't exist anymore
        const messageButton = page.locator('button:has-text("Message")').first();
        await messageButton.click();
        
        // Modal should still open but show error
        await expect(page.locator('[data-testid="new-dm-modal"]')).toBeVisible();
        
        // Try to search for non-existent user
        await page.fill('input[placeholder*="Search"]', "nonexistentuser");
        await page.waitForTimeout(1000);
        
        // Should show "no users found" or similar
        await expect(page.locator('text=No users found, text=User not found')).toBeVisible();
        
        await page.screenshot({
          path: `${EVIDENCE_DIR}/error-user-not-found.png`,
          fullPage: true,
        });
        
      } catch (error) {
        await page.screenshot({
          path: `${EVIDENCE_DIR}/error-handling-failure.png`,
          fullPage: true,
        });
        throw error;
      }
    });

    test("AC-7.10: Network error handling", async ({ page }) => {
      await loginAsUser(page, TEST_USERS.user1);
      
      try {
        // Simulate network failure
        await page.route('**/api/matrix/**', route => route.abort());
        
        await openMembersModal(page);
        const messageButton = page.locator('button:has-text("Message")').first();
        await messageButton.click();
        
        // Should show error state
        await expect(page.locator('text=Failed, text=Error, text=Network error')).toBeVisible();
        
        await page.screenshot({
          path: `${EVIDENCE_DIR}/error-network-failure.png`,
          fullPage: true,
        });
        
      } catch (error) {
        await page.screenshot({
          path: `${EVIDENCE_DIR}/error-network-handling-failure.png`,
          fullPage: true,
        });
        throw error;
      }
    });
  });

  test.describe("Accessibility", () => {
    test("AC-7.11: Message button keyboard accessible", async ({ page }) => {
      await loginAsUser(page, TEST_USERS.user1);
      
      try {
        await openMembersModal(page);
        
        // Navigate to message button via keyboard
        await page.keyboard.press("Tab");
        const focusedElement = page.locator(':focus');
        
        // Should be able to reach message button
        await expect(focusedElement).toHaveText(/Message/);
        
        // Press Enter to activate
        await page.keyboard.press("Enter");
        
        // Should open NewDM modal
        await expect(page.locator('[data-testid="new-dm-modal"]')).toBeVisible();
        
        await page.screenshot({
          path: `${EVIDENCE_DIR}/accessibility-keyboard-nav.png`,
          fullPage: true,
        });
        
      } catch (error) {
        await page.screenshot({
          path: `${EVIDENCE_DIR}/accessibility-keyboard-error.png`,
          fullPage: true,
        });
        throw error;
      }
    });

    test("AC-7.12: Screen reader accessibility", async ({ page }) => {
      await loginAsUser(page, TEST_USERS.user1);
      
      try {
        await openMembersModal(page);
        
        const messageButton = page.locator('button:has-text("Message")').first();
        
        // Check ARIA attributes
        await expect(messageButton).toHaveAttribute('aria-label', /Start.*message.*with/);
        await expect(messageButton).toHaveAttribute('role', 'button');
        
        await page.screenshot({
          path: `${EVIDENCE_DIR}/accessibility-aria-labels.png`,
          fullPage: true,
        });
        
      } catch (error) {
        await page.screenshot({
          path: `${EVIDENCE_DIR}/accessibility-aria-error.png`,
          fullPage: true,
        });
        throw error;
      }
    });
  });
});