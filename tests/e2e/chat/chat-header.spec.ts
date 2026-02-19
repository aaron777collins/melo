import { test, expect } from '@playwright/test';
import { loginAsUser } from '../helpers/auth-helpers';
import { createTestRoom, inviteUserToRoom } from '../helpers/matrix-helpers';
import { generateUniqueId } from '../helpers/test-helpers';

test.describe('Chat Header', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'testuser1');
    // Wait for the app to fully load
    await page.waitForSelector('[data-testid="server-sidebar"]', { timeout: 10000 });
  });

  test.describe('Channel Header', () => {
    test('should display channel name with hash icon', async ({ page }) => {
      // Create a test room for the channel
      const roomName = `test-channel-${generateUniqueId()}`;
      const roomId = await createTestRoom(page, roomName, 'public_chat');
      
      // Navigate to the room
      await page.click(`[data-testid="channel-${roomId}"]`);
      
      // Wait for chat header to load
      await page.waitForSelector('[data-testid="chat-header"]', { timeout: 5000 });
      
      // Check that hash icon is present for channels
      await expect(page.locator('[data-testid="chat-header"] svg').first()).toBeVisible();
      
      // Check that channel name is displayed
      await expect(page.locator('[data-testid="chat-header"]')).toContainText(roomName);
      
      // Check that no user avatar is shown for channels
      await expect(page.locator('[data-testid="chat-header"] [data-testid="user-avatar"]')).not.toBeVisible();
      
      // Check that no video button is shown for channels  
      await expect(page.locator('[data-testid="chat-header"] [data-testid="chat-video-button"]')).not.toBeVisible();
    });

    test('should show mobile toggle for responsive design', async ({ page }) => {
      const roomName = `test-channel-${generateUniqueId()}`;
      const roomId = await createTestRoom(page, roomName, 'public_chat');
      
      await page.click(`[data-testid="channel-${roomId}"]`);
      await page.waitForSelector('[data-testid="chat-header"]');
      
      // Check that mobile toggle is present
      await expect(page.locator('[data-testid="mobile-toggle"]')).toBeVisible();
    });
  });

  test.describe('Conversation Header', () => {
    test('should display user avatar and name for conversations', async ({ page }) => {
      // Create a DM conversation
      const dmUserId = '@testuser2:localhost';
      
      // Start a DM conversation (this would need to be adapted based on your DM creation flow)
      await page.click('[data-testid="create-dm-button"]');
      await page.fill('[data-testid="dm-user-search"]', dmUserId);
      await page.click(`[data-testid="user-option-${dmUserId}"]`);
      
      // Wait for conversation header to load
      await page.waitForSelector('[data-testid="chat-header"]', { timeout: 5000 });
      
      // Check that user avatar is present for conversations
      await expect(page.locator('[data-testid="chat-header"] [data-testid="user-avatar"]')).toBeVisible();
      
      // Check that user name is displayed
      await expect(page.locator('[data-testid="chat-header"]')).toContainText('testuser2');
      
      // Check that video button is shown for conversations
      await expect(page.locator('[data-testid="chat-header"] [data-testid="chat-video-button"]')).toBeVisible();
      
      // Check that no hash icon is shown for conversations
      await expect(page.locator('[data-testid="chat-header"] svg[data-icon="hash"]')).not.toBeVisible();
    });
  });

  test.describe('Common Elements', () => {
    test('should always show socket indicator', async ({ page }) => {
      const roomName = `test-channel-${generateUniqueId()}`;
      const roomId = await createTestRoom(page, roomName, 'public_chat');
      
      await page.click(`[data-testid="channel-${roomId}"]`);
      await page.waitForSelector('[data-testid="chat-header"]');
      
      // Socket indicator should always be present
      await expect(page.locator('[data-testid="socket-indicator"]')).toBeVisible();
    });

    test('should have correct styling and layout', async ({ page }) => {
      const roomName = `test-channel-${generateUniqueId()}`;
      const roomId = await createTestRoom(page, roomName, 'public_chat');
      
      await page.click(`[data-testid="channel-${roomId}"]`);
      await page.waitForSelector('[data-testid="chat-header"]');
      
      const header = page.locator('[data-testid="chat-header"]');
      
      // Check header has correct height and styling
      await expect(header).toHaveCSS('height', '48px'); // h-12 = 48px
      
      // Check header has correct border
      await expect(header).toHaveClass(/border-b-2/);
      
      // Check header has flex layout
      await expect(header).toHaveClass(/flex/);
      await expect(header).toHaveClass(/items-center/);
      
      // Check padding
      await expect(header).toHaveClass(/px-3/);
    });

    test('should position elements correctly', async ({ page }) => {
      const roomName = `test-channel-${generateUniqueId()}`;
      const roomId = await createTestRoom(page, roomName, 'public_chat');
      
      await page.click(`[data-testid="channel-${roomId}"]`);
      await page.waitForSelector('[data-testid="chat-header"]');
      
      const header = page.locator('[data-testid="chat-header"]');
      
      // Check that right-side elements are positioned to the right
      const rightSide = header.locator('.ml-auto');
      await expect(rightSide).toBeVisible();
      await expect(rightSide).toHaveClass(/flex/);
      await expect(rightSide).toHaveClass(/items-center/);
    });
  });

  test.describe('Visual Regression', () => {
    test('channel header screenshot comparison', async ({ page }) => {
      const roomName = `screenshot-test-${generateUniqueId()}`;
      const roomId = await createTestRoom(page, roomName, 'public_chat');
      
      await page.click(`[data-testid="channel-${roomId}"]`);
      await page.waitForSelector('[data-testid="chat-header"]');
      
      // Take screenshot of just the header for comparison
      const header = page.locator('[data-testid="chat-header"]');
      await expect(header).toHaveScreenshot('chat-header-channel.png');
    });

    test('conversation header screenshot comparison', async ({ page }) => {
      // This test would need a way to create/navigate to a conversation
      // Skipping implementation details as they depend on your DM flow
      test.skip('Need to implement DM navigation flow');
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      
      const roomName = `mobile-test-${generateUniqueId()}`;
      const roomId = await createTestRoom(page, roomName, 'public_chat');
      
      await page.click(`[data-testid="channel-${roomId}"]`);
      await page.waitForSelector('[data-testid="chat-header"]');
      
      // Mobile toggle should be visible and functional on mobile
      await expect(page.locator('[data-testid="mobile-toggle"]')).toBeVisible();
      
      // Header should still maintain proper height and layout
      const header = page.locator('[data-testid="chat-header"]');
      await expect(header).toHaveCSS('height', '48px');
    });
  });
});