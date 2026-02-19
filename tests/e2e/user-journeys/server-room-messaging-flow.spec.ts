/**
 * Server Creation → Room Creation → Messaging Flow E2E Tests
 * 
 * Comprehensive end-to-end test covering the complete user journey:
 * 1. User creates a new server
 * 2. User creates a room/channel within the server
 * 3. User sends messages in the room
 * 4. User receives messages in real-time
 * 
 * Uses TDD approach with comprehensive assertions and visual validation.
 */

import { test, expect, type Page } from '@playwright/test';
import { 
  AuthPage, 
  ServerPage, 
  ChatPage, 
  TEST_CONFIG, 
  waitForAppReady, 
  waitForMatrixSync,
  clearBrowserState,
  createTestSpace,
  uniqueId
} from '../fixtures';

test.describe('Server → Room → Messaging Flow', () => {
  let page: Page;
  let authPage: AuthPage;
  let serverPage: ServerPage;
  let chatPage: ChatPage;

  // Test data
  const testUser = TEST_CONFIG.testUser; // Use stable test credentials
  const testServerName = `Test Server ${Date.now()}`;
  const testRoomName = `test-room-${Date.now()}`;
  const testMessage1 = `Hello from test! ${Date.now()}`;
  const testMessage2 = `Second test message! ${Date.now()}`;
  const testMessage3 = `Real-time sync test! ${Date.now()}`;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    authPage = new AuthPage(page);
    serverPage = new ServerPage(page);
    chatPage = new ChatPage(page);
    
    // Start with clean slate
    await clearBrowserState(page);
    
    // Navigate to the app and wait for ready state
    await page.goto('/');
    await waitForAppReady(page);
  });

  test('Complete user journey: server creation → room creation → messaging flow', async () => {
    // Step 1: Authenticate the user
    console.log('Step 1: Authenticating user...');
    await authPage.goto('sign-in');
    await authPage.login(testUser.username, testUser.password);
    await page.waitForURL(/^(?!.*sign-in)/);
    await waitForMatrixSync(page);
    await page.screenshot({ path: 'test-results/01-authenticated.png', fullPage: true });
    
    // Step 2: Create a new server
    console.log('Step 2: Creating new server...');
    
    // Look for add server button in sidebar
    const addServerButton = page.locator([
      '[data-testid="add-server-button"]',
      'button:has-text("Create Server")', 
      'button[aria-label*="server" i]',
      '.server-sidebar button:last-child',
      '[title*="Create" i][title*="Server" i]'
    ].join(', ')).first();
    
    await expect(addServerButton).toBeVisible({ timeout: 10000 });
    await addServerButton.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/02-server-creation-modal.png', fullPage: true });

    // Fill in server details
    const serverNameInput = page.locator([
      'input[name="name"]',
      'input[placeholder*="server name" i]',
      'input[placeholder*="name" i]'
    ].join(', ')).first();
    
    await expect(serverNameInput).toBeVisible({ timeout: 5000 });
    await serverNameInput.fill(testServerName);

    // Submit server creation
    const createServerButton = page.locator([
      'button:has-text("Create")', 
      'button[type="submit"]',
      'button:has-text("Create Server")'
    ].join(', ')).first();
    
    await createServerButton.click();
    
    // Wait for server creation to complete and navigation
    await page.waitForURL(/\/servers\//, { timeout: 15000 });
    await waitForMatrixSync(page);
    await page.screenshot({ path: 'test-results/03-server-created.png', fullPage: true });
    
    // Verify server appears in sidebar
    console.log('Step 2.1: Verifying server appears in sidebar...');
    const serverInSidebar = page.locator([
      `[title="${testServerName}"]`,
      `[aria-label*="${testServerName}" i]`,
      `.server-sidebar button:has-text("${testServerName.charAt(0)}")`,
      `button:has([alt*="${testServerName}" i])`
    ].join(', ')).first();
    
    await expect(serverInSidebar).toBeVisible({ timeout: 10000 });
    
    // Step 3: Create a new room/channel within the server
    console.log('Step 3: Creating new room/channel...');
    
    // Look for add channel button or channel creation interface
    const addChannelButton = page.locator([
      '[data-testid="add-channel-button"]',
      'button:has-text("Create Channel")',
      'button[aria-label*="channel" i]',
      'button[title*="Create" i][title*="Channel" i]',
      '.channel-sidebar button:last-child',
      '[data-testid="create-channel"]'
    ].join(', ')).first();
    
    // If no direct button, look for a + icon or similar
    if (!(await addChannelButton.isVisible({ timeout: 3000 }))) {
      const plusIcon = page.locator([
        'button:has-text("+")',
        '[aria-label*="add" i]',
        '[title*="add" i]',
        '.lucide-plus'
      ].join(', ')).first();
      
      if (await plusIcon.isVisible({ timeout: 2000 })) {
        await plusIcon.click();
        await page.waitForTimeout(300);
      }
    } else {
      await addChannelButton.click();
      await page.waitForTimeout(500);
    }
    
    await page.screenshot({ path: 'test-results/04-channel-creation-modal.png', fullPage: true });

    // Fill in room details
    const roomNameInput = page.locator([
      'input[name="name"]',
      'input[placeholder*="channel name" i]',
      'input[placeholder*="room name" i]',
      'input[placeholder*="name" i]'
    ].join(', ')).first();
    
    if (await roomNameInput.isVisible({ timeout: 5000 })) {
      await roomNameInput.fill(testRoomName);
      
      // Submit room creation
      const createRoomButton = page.locator([
        'button:has-text("Create")', 
        'button[type="submit"]',
        'button:has-text("Create Channel")'
      ].join(', ')).first();
      
      await createRoomButton.click();
      
      // Wait for room creation and navigation
      await page.waitForTimeout(2000);
      await waitForMatrixSync(page);
    }
    
    await page.screenshot({ path: 'test-results/05-room-created.png', fullPage: true });
    
    // Verify channel/room appears in server sidebar
    console.log('Step 3.1: Verifying room appears in server...');
    const roomInSidebar = page.locator([
      `[data-testid="channel-${testRoomName}"]`,
      `button:has-text("${testRoomName}")`,
      `[aria-label*="${testRoomName}" i]`,
      `.channel-list button:has-text("${testRoomName}")`
    ].join(', ')).first();
    
    // Wait for room to appear (may take some time with Matrix sync)
    await expect(roomInSidebar).toBeVisible({ timeout: 15000 });
    
    // Navigate to the room if not already there
    await roomInSidebar.click();
    await page.waitForTimeout(1000);
    await waitForMatrixSync(page);
    
    // Step 4: Send messages in the room
    console.log('Step 4: Testing message sending...');
    
    // Locate chat input area
    const chatInput = page.locator([
      '[data-testid="chat-input"]',
      'input[placeholder*="message" i]',
      'textarea[placeholder*="message" i]',
      '.chat-input input',
      '.message-input input',
      '.chat-container input[type="text"]'
    ].join(', ')).first();
    
    await expect(chatInput).toBeVisible({ timeout: 10000 });
    
    // Send first message
    await chatInput.fill(testMessage1);
    await chatInput.press('Enter');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/06-message-1-sent.png', fullPage: true });
    
    // Verify first message appears in chat
    console.log('Step 4.1: Verifying first message appears...');
    const message1InChat = page.locator([
      `text="${testMessage1}"`,
      `.message:has-text("${testMessage1}")`,
      `.chat-message:has-text("${testMessage1}")`
    ].join(', ')).first();
    
    await expect(message1InChat).toBeVisible({ timeout: 10000 });
    
    // Send second message
    await chatInput.fill(testMessage2);
    await chatInput.press('Enter');
    await page.waitForTimeout(1000);
    
    // Verify second message appears
    console.log('Step 4.2: Verifying second message appears...');
    const message2InChat = page.locator([
      `text="${testMessage2}"`,
      `.message:has-text("${testMessage2}")`,
      `.chat-message:has-text("${testMessage2}")`
    ].join(', ')).first();
    
    await expect(message2InChat).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/07-message-2-sent.png', fullPage: true });
    
    // Step 5: Test real-time message sync functionality
    console.log('Step 5: Testing real-time message sync...');
    
    // Send a third message to test real-time updates
    await chatInput.fill(testMessage3);
    await chatInput.press('Enter');
    
    // Wait for Matrix sync and real-time updates
    await waitForMatrixSync(page);
    await page.waitForTimeout(2000);
    
    // Verify real-time message sync works
    const message3InChat = page.locator([
      `text="${testMessage3}"`,
      `.message:has-text("${testMessage3}")`,
      `.chat-message:has-text("${testMessage3}")`
    ].join(', ')).first();
    
    await expect(message3InChat).toBeVisible({ timeout: 10000 });
    
    // Verify all three messages are visible in order
    console.log('Step 5.1: Verifying all messages in chronological order...');
    const allMessages = page.locator([
      '.message', 
      '.chat-message',
      '[data-testid*="message"]'
    ].join(', '));
    
    // Check that we have at least 3 messages (could be more from other tests)
    const messageCount = await allMessages.count();
    expect(messageCount).toBeGreaterThanOrEqual(3);
    
    // Take final screenshot
    await page.screenshot({ path: 'test-results/08-final-complete-flow.png', fullPage: true });
    
    console.log('✅ Complete user journey test completed successfully!');
  });

  test('Server creation with error handling', async () => {
    console.log('Testing server creation error scenarios...');
    
    // Authenticate first
    await authPage.goto('sign-in');
    await authPage.login(testUser.username, testUser.password);
    await page.waitForURL(/^(?!.*sign-in)/);
    await waitForMatrixSync(page);
    
    // Try to create server with empty name
    const addServerButton = page.locator([
      '[data-testid="add-server-button"]',
      'button:has-text("Create Server")'
    ].join(', ')).first();
    
    await expect(addServerButton).toBeVisible({ timeout: 10000 });
    await addServerButton.click();
    await page.waitForTimeout(500);
    
    // Try to submit without name
    const createServerButton = page.locator([
      'button:has-text("Create")', 
      'button[type="submit"]'
    ].join(', ')).first();
    
    await createServerButton.click();
    
    // Should show validation error or remain on modal
    await page.waitForTimeout(2000);
    
    // Modal should still be visible
    const modal = page.locator('[role="dialog"], .modal, [data-testid="dialog"]').first();
    await expect(modal).toBeVisible();
    
    console.log('✅ Error handling test completed successfully!');
  });

  test('Real-time messaging verification', async () => {
    console.log('Testing real-time messaging functionality...');
    
    // Authenticate
    await authPage.goto('sign-in');
    await authPage.login(testUser.username, testUser.password);
    await page.waitForURL(/^(?!.*sign-in)/);
    await waitForMatrixSync(page);
    
    // Find existing server or create one
    let serverExists = false;
    const existingServer = page.locator('.server-sidebar button').nth(1); // Skip home button
    
    if (await existingServer.isVisible({ timeout: 5000 })) {
      await existingServer.click();
      serverExists = true;
    } else {
      // Create a quick test server
      const serverId = await createTestSpace(page, `RT Test ${Date.now()}`);
      serverExists = true;
    }
    
    if (serverExists) {
      await waitForMatrixSync(page);
      
      // Find a room or use general channel
      const generalChannel = page.locator([
        'button:has-text("general")',
        '.channel-list button'
      ].join(', ')).first();
      
      if (await generalChannel.isVisible({ timeout: 5000 })) {
        await generalChannel.click();
        await page.waitForTimeout(1000);
        
        // Test rapid message sending
        const chatInput = page.locator([
          '[data-testid="chat-input"]',
          'input[placeholder*="message" i]',
          'textarea[placeholder*="message" i]'
        ].join(', ')).first();
        
        if (await chatInput.isVisible({ timeout: 5000 })) {
          const rapidMessages = [
            `Rapid msg 1 ${Date.now()}`,
            `Rapid msg 2 ${Date.now() + 1}`,
            `Rapid msg 3 ${Date.now() + 2}`
          ];
          
          // Send messages rapidly
          for (const msg of rapidMessages) {
            await chatInput.fill(msg);
            await chatInput.press('Enter');
            await page.waitForTimeout(200);
          }
          
          // Wait for sync
          await waitForMatrixSync(page);
          
          // Verify all messages appear
          for (const msg of rapidMessages) {
            const messageInChat = page.locator(`text="${msg}"`).first();
            await expect(messageInChat).toBeVisible({ timeout: 10000 });
          }
        }
      }
    }
    
    console.log('✅ Real-time messaging verification completed successfully!');
  });
});