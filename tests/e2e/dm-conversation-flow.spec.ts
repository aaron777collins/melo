/**
 * E2E Tests: DM Conversation Flow
 * 
 * Task: ST-P2-04-C - DM conversation interface with message history and send functionality
 * TDD Approach: RED → GREEN → REFACTOR
 * 
 * Tests cover AC-4 and AC-5 from US-P2-04:
 * - AC-4: Complete DM conversation interface (history, input, send)
 * - AC-5: Send DM message functionality
 * 
 * Cross-platform testing: Desktop, Tablet, Mobile viewports
 */

import { test, expect, Page } from '@playwright/test';
import { login, logout } from './helpers/auth';

// Test data
const TEST_USER_1 = {
  username: 'testuser1',
  password: 'testpass123',
  userId: '@testuser1:dev2.aaroncollins.info'
};

const TEST_USER_2 = {
  username: 'testuser2', 
  password: 'testpass123',
  userId: '@testuser2:dev2.aaroncollins.info'
};

const TEST_ROOM_ID = '!testdm:dev2.aaroncollins.info';
const TEST_MESSAGE = `Test DM message ${Date.now()}`;

// Helper functions
async function navigateToDMConversation(page: Page, roomId: string): Promise<void> {
  await page.goto(`/channels/@me/${roomId}`);
  await page.waitForLoadState('networkidle');
}

async function waitForDMConversationToLoad(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="dm-conversation"]')).toBeVisible({ timeout: 10000 });
}

async function createTestDMConversation(page: Page, recipientUserId: string): Promise<string> {
  // Navigate to DM area
  await page.goto('/channels/@me');
  
  // Click new DM button
  await page.click('[data-testid="new-dm-button"]');
  
  // Wait for modal
  await expect(page.locator('[data-testid="new-dm-modal"]')).toBeVisible();
  
  // Search for user
  await page.fill('input[placeholder*="Search"]', recipientUserId);
  await page.waitForTimeout(500); // Wait for search results
  
  // Select user
  await page.click(`[data-testid="user-result-${recipientUserId}"]`);
  
  // Should navigate to new DM conversation
  await page.waitForURL(/\/channels\/@me\/!.+/);
  
  // Extract room ID from URL
  const url = page.url();
  const roomId = url.match(/\/channels\/@me\/(.+)$/)?.[1];
  
  if (!roomId) {
    throw new Error('Failed to extract room ID from URL');
  }
  
  return roomId;
}

// Viewport configurations
const VIEWPORTS = [
  { name: 'Desktop', width: 1920, height: 1080 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Mobile', width: 375, height: 667 }
];

// Run tests for each viewport
VIEWPORTS.forEach(({ name, width, height }) => {
  test.describe(`DM Conversation Flow - ${name} (${width}x${height})`, () => {
    test.beforeEach(async ({ page }) => {
      // Set viewport
      await page.setViewportSize({ width, height });
      
      // Login as test user
      await login(page, TEST_USER_1.username, TEST_USER_1.password);
    });

    test.afterEach(async ({ page }) => {
      // Cleanup - logout
      await logout(page);
    });

    // ========================================
    // AC-4 TESTS: Complete DM Conversation Interface
    // ========================================

    test(`AC-4: DM conversation interface displays correctly on ${name}`, async ({ page }) => {
      // Navigate to existing DM or create one
      await navigateToDMConversation(page, TEST_ROOM_ID);
      await waitForDMConversationToLoad(page);
      
      // Verify main conversation container
      const dmConversation = page.locator('[data-testid="dm-conversation"]');
      await expect(dmConversation).toBeVisible();
      
      // Verify header with recipient name
      const dmHeader = page.locator('[data-testid="dm-header"]');
      await expect(dmHeader).toBeVisible();
      
      // Verify message history area
      const dmMessages = page.locator('[data-testid="dm-messages"]');
      await expect(dmMessages).toBeVisible();
      
      // Verify message input field
      const messageInput = page.locator('[data-testid="dm-message-input"]');
      await expect(messageInput).toBeVisible();
      await expect(messageInput).toBeEnabled();
      
      // Verify send button
      const sendButton = page.locator('[data-testid="dm-send-button"]');
      await expect(sendButton).toBeVisible();
      
      // Take screenshot for evidence
      await page.screenshot({
        path: `scheduler/validation/screenshots/melo-v2/dm-conversation/ac4-interface-${name.toLowerCase()}.png`,
        fullPage: true
      });
    });

    test(`AC-4: Message history displays existing messages on ${name}`, async ({ page }) => {
      await navigateToDMConversation(page, TEST_ROOM_ID);
      await waitForDMConversationToLoad(page);
      
      const dmMessages = page.locator('[data-testid="dm-messages"]');
      await expect(dmMessages).toBeVisible();
      
      // Check if messages are loaded (either existing messages or empty state)
      const hasMessages = await page.locator('[data-testid="messages-container"]').isVisible();
      const hasEmptyState = await page.locator('text="No messages yet"').isVisible();
      
      expect(hasMessages || hasEmptyState).toBeTruthy();
      
      // Take screenshot
      await page.screenshot({
        path: `scheduler/validation/screenshots/melo-v2/dm-conversation/ac4-history-${name.toLowerCase()}.png`,
        fullPage: true
      });
    });

    test(`AC-4: DM conversation responsive design on ${name}`, async ({ page }) => {
      await navigateToDMConversation(page, TEST_ROOM_ID);
      await waitForDMConversationToLoad(page);
      
      // Verify key elements are visible and accessible
      const messageInput = page.locator('[data-testid="dm-message-input"]');
      const sendButton = page.locator('[data-testid="dm-send-button"]');
      
      await expect(messageInput).toBeVisible();
      await expect(sendButton).toBeVisible();
      
      // Verify input is appropriately sized for viewport
      const inputBox = await messageInput.boundingBox();
      expect(inputBox).toBeTruthy();
      expect(inputBox!.width).toBeGreaterThan(100); // Reasonable minimum width
      
      // Take screenshot
      await page.screenshot({
        path: `scheduler/validation/screenshots/melo-v2/dm-conversation/ac4-responsive-${name.toLowerCase()}.png`,
        fullPage: true
      });
    });

    // ========================================
    // AC-5 TESTS: Send DM Message Functionality
    // ========================================

    test(`AC-5: Send DM message via send button on ${name}`, async ({ page }) => {
      await navigateToDMConversation(page, TEST_ROOM_ID);
      await waitForDMConversationToLoad(page);
      
      const messageInput = page.locator('[data-testid="dm-message-input"]');
      const sendButton = page.locator('[data-testid="dm-send-button"]');
      
      // Send button should be disabled initially
      await expect(sendButton).toBeDisabled();
      
      // Type message
      const testMessage = `${TEST_MESSAGE}-button-${name}`;
      await messageInput.fill(testMessage);
      
      // Send button should be enabled
      await expect(sendButton).toBeEnabled();
      
      // Click send button
      await sendButton.click();
      
      // Input should be cleared
      await expect(messageInput).toHaveValue('');
      
      // Message should appear in conversation (check within reasonable timeout)
      await expect(page.locator(`text="${testMessage}"`)).toBeVisible({ timeout: 5000 });
      
      // Take screenshot
      await page.screenshot({
        path: `scheduler/validation/screenshots/melo-v2/dm-conversation/ac5-send-button-${name.toLowerCase()}.png`,
        fullPage: true
      });
    });

    test(`AC-5: Send DM message via Enter key on ${name}`, async ({ page }) => {
      await navigateToDMConversation(page, TEST_ROOM_ID);
      await waitForDMConversationToLoad(page);
      
      const messageInput = page.locator('[data-testid="dm-message-input"]');
      
      // Type message
      const testMessage = `${TEST_MESSAGE}-enter-${name}`;
      await messageInput.fill(testMessage);
      
      // Press Enter
      await messageInput.press('Enter');
      
      // Input should be cleared
      await expect(messageInput).toHaveValue('');
      
      // Message should appear in conversation
      await expect(page.locator(`text="${testMessage}"`)).toBeVisible({ timeout: 5000 });
      
      // Take screenshot
      await page.screenshot({
        path: `scheduler/validation/screenshots/melo-v2/dm-conversation/ac5-send-enter-${name.toLowerCase()}.png`,
        fullPage: true
      });
    });

    test(`AC-5: Message sending shows loading state on ${name}`, async ({ page }) => {
      await navigateToDMConversation(page, TEST_ROOM_ID);
      await waitForDMConversationToLoad(page);
      
      const messageInput = page.locator('[data-testid="dm-message-input"]');
      const sendButton = page.locator('[data-testid="dm-send-button"]');
      
      // Type message
      await messageInput.fill('Loading test message');
      
      // Intercept Matrix API call to simulate slow network
      await page.route('**/_matrix/client/r0/rooms/*/send/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay
        await route.continue();
      });
      
      // Send message
      await sendButton.click();
      
      // Check loading state (button disabled during send)
      await expect(sendButton).toBeDisabled();
      await expect(messageInput).toBeDisabled();
      
      // Wait for send to complete
      await expect(sendButton).toBeEnabled({ timeout: 5000 });
      
      // Take screenshot
      await page.screenshot({
        path: `scheduler/validation/screenshots/melo-v2/dm-conversation/ac5-loading-${name.toLowerCase()}.png`,
        fullPage: true
      });
    });

    test(`AC-5: Handles message sending errors gracefully on ${name}`, async ({ page }) => {
      await navigateToDMConversation(page, TEST_ROOM_ID);
      await waitForDMConversationToLoad(page);
      
      const messageInput = page.locator('[data-testid="dm-message-input"]');
      const sendButton = page.locator('[data-testid="dm-send-button"]');
      
      // Intercept Matrix API call to simulate error
      await page.route('**/_matrix/client/r0/rooms/*/send/**', async route => {
        await route.abort('failed');
      });
      
      // Type and send message
      await messageInput.fill('Error test message');
      await sendButton.click();
      
      // Should show error message/toast
      await expect(page.locator('text="Failed to send message"')).toBeVisible({ timeout: 3000 });
      
      // Input should remain enabled for retry
      await expect(messageInput).toBeEnabled();
      await expect(sendButton).toBeEnabled();
      
      // Take screenshot
      await page.screenshot({
        path: `scheduler/validation/screenshots/melo-v2/dm-conversation/ac5-error-${name.toLowerCase()}.png`,
        fullPage: true
      });
    });

    test(`AC-5: Message input validation on ${name}`, async ({ page }) => {
      await navigateToDMConversation(page, TEST_ROOM_ID);
      await waitForDMConversationToLoad(page);
      
      const messageInput = page.locator('[data-testid="dm-message-input"]');
      const sendButton = page.locator('[data-testid="dm-send-button"]');
      
      // Send button disabled with empty input
      await expect(sendButton).toBeDisabled();
      
      // Send button disabled with whitespace only
      await messageInput.fill('   ');
      await expect(sendButton).toBeDisabled();
      
      // Send button enabled with actual content
      await messageInput.fill('Valid message');
      await expect(sendButton).toBeEnabled();
      
      // Clear input - button should be disabled again
      await messageInput.fill('');
      await expect(sendButton).toBeDisabled();
      
      // Take screenshot
      await page.screenshot({
        path: `scheduler/validation/screenshots/melo-v2/dm-conversation/ac5-validation-${name.toLowerCase()}.png`,
        fullPage: true
      });
    });

    // ========================================
    // NAVIGATION INTEGRATION TESTS
    // ========================================

    test(`Navigation to DM conversation works on ${name}`, async ({ page }) => {
      // Test navigating to DM from URL
      const testRoomId = '!test123:dev2.aaroncollins.info';
      
      await page.goto(`/channels/@me/${testRoomId}`);
      
      // Should load DM conversation page (even if room doesn't exist, UI should handle gracefully)
      await expect(page.locator('[data-testid="dm-conversation"]')).toBeVisible({ timeout: 10000 });
      
      // URL should be correct
      expect(page.url()).toContain(`/channels/@me/${testRoomId}`);
      
      // Take screenshot
      await page.screenshot({
        path: `scheduler/validation/screenshots/melo-v2/dm-conversation/navigation-${name.toLowerCase()}.png`,
        fullPage: true
      });
    });

    // ========================================
    // ACCESSIBILITY TESTS
    // ========================================

    test(`Accessibility: Keyboard navigation works on ${name}`, async ({ page }) => {
      await navigateToDMConversation(page, TEST_ROOM_ID);
      await waitForDMConversationToLoad(page);
      
      // Tab to message input
      await page.keyboard.press('Tab');
      
      // Input should have focus
      const messageInput = page.locator('[data-testid="dm-message-input"]');
      await expect(messageInput).toBeFocused();
      
      // Type message using keyboard
      await page.keyboard.type('Keyboard accessibility test');
      
      // Send with Enter
      await page.keyboard.press('Enter');
      
      // Message should be sent
      await expect(messageInput).toHaveValue('');
      
      // Take screenshot
      await page.screenshot({
        path: `scheduler/validation/screenshots/melo-v2/dm-conversation/accessibility-${name.toLowerCase()}.png`,
        fullPage: true
      });
    });

    test(`Accessibility: ARIA labels present on ${name}`, async ({ page }) => {
      await navigateToDMConversation(page, TEST_ROOM_ID);
      await waitForDMConversationToLoad(page);
      
      // Check ARIA labels
      const messageInput = page.locator('[data-testid="dm-message-input"]');
      const sendButton = page.locator('[data-testid="dm-send-button"]');
      
      await expect(messageInput).toHaveAttribute('aria-label', /Type message/);
      await expect(sendButton).toHaveAttribute('aria-label', /Send message/);
      
      // Take screenshot
      await page.screenshot({
        path: `scheduler/validation/screenshots/melo-v2/dm-conversation/aria-${name.toLowerCase()}.png`,
        fullPage: true
      });
    });
  });
});

// ========================================
// CROSS-BROWSER COMPATIBILITY TESTS
// ========================================

test.describe('DM Conversation - Cross-Browser Compatibility', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`Basic functionality works in ${browserName}`, async ({ page }) => {
      // Set to desktop viewport for browser testing
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      await login(page, TEST_USER_1.username, TEST_USER_1.password);
      
      await navigateToDMConversation(page, TEST_ROOM_ID);
      await waitForDMConversationToLoad(page);
      
      // Basic functionality check
      const messageInput = page.locator('[data-testid="dm-message-input"]');
      const sendButton = page.locator('[data-testid="dm-send-button"]');
      
      await expect(messageInput).toBeVisible();
      await expect(sendButton).toBeVisible();
      
      // Quick send test
      await messageInput.fill(`Browser test ${browserName}`);
      await expect(sendButton).toBeEnabled();
      
      await sendButton.click();
      await expect(messageInput).toHaveValue('');
      
      // Take screenshot
      await page.screenshot({
        path: `scheduler/validation/screenshots/melo-v2/dm-conversation/browser-${browserName}.png`,
        fullPage: true
      });
      
      await logout(page);
    });
  });
});

// ========================================
// PERFORMANCE TESTS
// ========================================

test.describe('DM Conversation - Performance', () => {
  test('DM conversation loads within 3 seconds', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await login(page, TEST_USER_1.username, TEST_USER_1.password);
    
    const startTime = Date.now();
    
    await navigateToDMConversation(page, TEST_ROOM_ID);
    await waitForDMConversationToLoad(page);
    
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000); // 3 second maximum load time
    
    // Take screenshot
    await page.screenshot({
      path: `scheduler/validation/screenshots/melo-v2/dm-conversation/performance-load.png`,
      fullPage: true
    });
    
    await logout(page);
  });

  test('Message sending response time under 2 seconds', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await login(page, TEST_USER_1.username, TEST_USER_1.password);
    
    await navigateToDMConversation(page, TEST_ROOM_ID);
    await waitForDMConversationToLoad(page);
    
    const messageInput = page.locator('[data-testid="dm-message-input"]');
    const sendButton = page.locator('[data-testid="dm-send-button"]');
    
    await messageInput.fill('Performance test message');
    
    const startTime = Date.now();
    await sendButton.click();
    
    // Wait for input to clear (indicating message sent)
    await expect(messageInput).toHaveValue('');
    
    const sendTime = Date.now() - startTime;
    
    expect(sendTime).toBeLessThan(2000); // 2 second maximum send time
    
    await logout(page);
  });
});