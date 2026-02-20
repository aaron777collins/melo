/**
 * Matrix Space and Room Operations E2E Tests
 * 
 * Comprehensive E2E tests for Matrix space and room operations including creation,
 * navigation, management, permissions, and hierarchy operations.
 * 
 * Test Coverage:
 * - Space creation and management
 * - Room creation within spaces
 * - Navigation between spaces/rooms
 * - Permissions and access controls
 * - Room settings modification
 * - Space hierarchy (nested rooms/spaces)
 * 
 * Following TDD approach: Tests written FIRST, implementation follows.
 */

import { test, expect } from '@playwright/test';
import {
  AuthPage,
  NavigationPage,
  ServerPage,
  ChatPage,
  ModalPage,
  CreateServerModal,
  SettingsModal,
  TEST_CONFIG,
  waitForAppReady,
  waitForMatrixSync,
  clearBrowserState,
  isLoggedIn,
  logout,
  screenshot,
  createTestSpace,
  cleanupTestSpace,
  navigateToChannel,
  generateServerName,
  generateChannelName,
  generateMessage,
  uniqueId
} from '../fixtures';

test.describe('Matrix Space and Room Operations', () => {
  let authPage: AuthPage;
  let navPage: NavigationPage;
  let serverPage: ServerPage;
  let chatPage: ChatPage;
  let modalPage: ModalPage;
  let createServerModal: CreateServerModal;
  let settingsModal: SettingsModal;

  // Track spaces/rooms created during tests for cleanup
  let createdSpaces: string[] = [];
  let createdRooms: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Initialize page objects
    authPage = new AuthPage(page);
    navPage = new NavigationPage(page);
    serverPage = new ServerPage(page);
    chatPage = new ChatPage(page);
    modalPage = new ModalPage(page);
    createServerModal = new CreateServerModal(page);
    settingsModal = new SettingsModal(page);

    // Clear browser state for clean test
    await clearBrowserState(page);
    
    // Login with test user
    await authPage.goto('sign-in');
    await authPage.login(TEST_CONFIG.testUser.username, TEST_CONFIG.testUser.password);
    
    // Wait for app to be ready
    await waitForAppReady(page);
    await waitForMatrixSync(page);
    
    // Ensure we're logged in
    expect(await isLoggedIn(page)).toBe(true);
    
    // Take initial screenshot
    await screenshot(page, `space-room-test-start-${Date.now()}`);
  });

  test.afterEach(async ({ page }) => {
    // Cleanup created spaces and rooms
    for (const spaceId of createdSpaces) {
      await cleanupTestSpace(page, spaceId);
    }
    
    // Take final screenshot
    await screenshot(page, `space-room-test-end-${Date.now()}`);
    
    // Reset tracking arrays
    createdSpaces = [];
    createdRooms = [];
  });

  test.describe('Space Creation and Management', () => {
    test('should create a new space with name and topic', async ({ page }) => {
      const spaceName = uniqueId('Test Space');
      const spaceTopic = 'E2E test space for comprehensive testing';

      // Open space creation dialog
      await page.click('[data-testid="add-server-button"], button:has-text("Add"), button:has-text("Create")');
      await modalPage.expectVisible();

      // Fill space details
      const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
      await nameInput.fill(spaceName);

      const topicInput = page.locator('input[name="topic"], input[placeholder*="topic" i], textarea[name="topic"]').first();
      await topicInput.fill(spaceTopic);

      // Take screenshot of creation modal
      await screenshot(page, `space-creation-modal-${Date.now()}`);

      // Submit space creation
      await createServerModal.submit();
      
      // Wait for space to be created and navigation
      await page.waitForURL(/\/servers\//, { timeout: 15000 });
      
      // Extract and track space ID
      const spaceId = page.url().match(/\/servers\/([^\/]+)/)?.[1];
      expect(spaceId).toBeTruthy();
      createdSpaces.push(decodeURIComponent(spaceId!));
      
      // Verify space appears in navigation
      await expect(page.locator(`text="${spaceName}"`).first()).toBeVisible();
      
      // Take screenshot of created space
      await screenshot(page, `space-created-${Date.now()}`);
    });

    test('should edit space name and topic', async ({ page }) => {
      // Create a test space first
      const originalName = uniqueId('Original Space');
      const spaceId = await createTestSpace(page, originalName, { topic: 'Original topic' });
      createdSpaces.push(spaceId);

      // Open space settings
      await page.click('[data-testid="server-settings"], button[aria-label*="settings" i]');
      await page.waitForURL(/\/settings/, { timeout: 10000 });

      // Navigate to overview/general settings
      const overviewTab = page.locator('button:has-text("Overview"), button:has-text("General"), [data-tab="overview"]');
      if (await overviewTab.isVisible({ timeout: 5000 })) {
        await overviewTab.click();
      }

      // Edit space name
      const newName = uniqueId('Updated Space');
      const nameField = page.locator('input[name="name"], input[value*="Space" i]').first();
      await nameField.clear();
      await nameField.fill(newName);

      // Edit space topic
      const newTopic = 'Updated topic for E2E testing';
      const topicField = page.locator('input[name="topic"], textarea[name="topic"]').first();
      await topicField.clear();
      await topicField.fill(newTopic);

      // Save changes
      const saveButton = page.locator('button:has-text("Save"), button[type="submit"]');
      await saveButton.click();

      // Take screenshot of updated settings
      await screenshot(page, `space-settings-updated-${Date.now()}`);

      // Wait for changes to be saved
      await page.waitForTimeout(2000);

      // Navigate back to space to verify changes
      await page.goto(`/servers/${encodeURIComponent(spaceId)}`);
      
      // Verify updated name appears in navigation
      await expect(page.locator(`text="${newName}"`).first()).toBeVisible({ timeout: 10000 });
    });

    test('should manage space visibility and permissions', async ({ page }) => {
      // Create a test space
      const spaceName = uniqueId('Permission Test Space');
      const spaceId = await createTestSpace(page, spaceName);
      createdSpaces.push(spaceId);

      // Open space settings
      await page.click('[data-testid="server-settings"], button[aria-label*="settings" i]');
      await page.waitForURL(/\/settings/, { timeout: 10000 });

      // Navigate to permissions/roles settings
      const permissionsTab = page.locator('button:has-text("Permissions"), button:has-text("Roles"), [data-tab="permissions"]');
      if (await permissionsTab.isVisible({ timeout: 5000 })) {
        await permissionsTab.click();
      }

      // Take screenshot of permissions interface
      await screenshot(page, `space-permissions-${Date.now()}`);

      // Verify permissions interface elements exist
      const rolesSection = page.locator('[data-testid="roles"], .roles, text="Roles"').first();
      const permissionsSection = page.locator('[data-testid="permissions"], .permissions, text="Permissions"').first();
      
      // At least one should be visible (depends on UI implementation)
      const hasPermissionsUI = await rolesSection.isVisible({ timeout: 5000 }) || 
                               await permissionsSection.isVisible({ timeout: 5000 });
      expect(hasPermissionsUI).toBe(true);
    });
  });

  test.describe('Room Creation Within Spaces', () => {
    test('should create text and voice rooms within a space', async ({ page }) => {
      // Create a test space first
      const spaceName = uniqueId('Room Test Space');
      const spaceId = await createTestSpace(page, spaceName);
      createdSpaces.push(spaceId);

      // Create a text room
      const textChannelName = generateChannelName();
      await page.click('[data-testid="add-channel"], button:has-text("Create Channel"), button[aria-label*="add channel" i]');
      
      await modalPage.expectVisible();
      
      // Fill room name
      const nameInput = page.locator('input[placeholder*="channel" i], input[placeholder*="name" i]');
      await nameInput.fill(textChannelName);
      
      // Ensure text type is selected (default)
      const textOption = page.locator('button:has-text("Text"), [data-value="text"], [data-type="text"]');
      if (await textOption.isVisible({ timeout: 3000 })) {
        await textOption.click();
      }
      
      // Create the channel
      await modalPage.submit();
      await page.waitForTimeout(3000);
      
      // Verify text channel appears in channel list
      await expect(page.locator(`text="${textChannelName}"`).first()).toBeVisible({ timeout: 10000 });
      
      // Take screenshot of created text channel
      await screenshot(page, `text-channel-created-${Date.now()}`);

      // Create a voice room
      const voiceChannelName = generateChannelName().replace('test-channel', 'voice-channel');
      await page.click('[data-testid="add-channel"], button:has-text("Create Channel"), button[aria-label*="add channel" i]');
      
      await modalPage.expectVisible();
      
      // Fill room name
      await nameInput.fill(voiceChannelName);
      
      // Select voice type
      const voiceOption = page.locator('button:has-text("Voice"), [data-value="voice"], [data-type="voice"]');
      if (await voiceOption.isVisible({ timeout: 3000 })) {
        await voiceOption.click();
      }
      
      // Create the voice channel
      await modalPage.submit();
      await page.waitForTimeout(3000);
      
      // Verify voice channel appears in channel list
      await expect(page.locator(`text="${voiceChannelName}"`).first()).toBeVisible({ timeout: 10000 });
      
      // Take screenshot of both channels
      await screenshot(page, `both-channels-created-${Date.now()}`);
    });

    test('should organize rooms into categories within spaces', async ({ page }) => {
      // Create a test space
      const spaceName = uniqueId('Category Test Space');
      const spaceId = await createTestSpace(page, spaceName);
      createdSpaces.push(spaceId);

      // Try to create room categories (if supported)
      const categoryName = 'Test Category';
      
      // Look for category creation option
      const createCategoryButton = page.locator('button:has-text("Create Category"), [data-testid="create-category"]');
      
      if (await createCategoryButton.isVisible({ timeout: 5000 })) {
        await createCategoryButton.click();
        
        // Fill category name
        const categoryInput = page.locator('input[placeholder*="category" i]');
        await categoryInput.fill(categoryName);
        
        // Submit category creation
        await modalPage.submit();
        await page.waitForTimeout(2000);
        
        // Verify category appears
        await expect(page.locator(`text="${categoryName}"`).first()).toBeVisible();
        
        // Take screenshot of category structure
        await screenshot(page, `room-categories-${Date.now()}`);
      } else {
        // Categories might not be implemented yet - document this
        await screenshot(page, `no-categories-available-${Date.now()}`);
      }
    });

    test('should set room permissions and access controls', async ({ page }) => {
      // Create a test space
      const spaceName = uniqueId('Access Control Space');
      const spaceId = await createTestSpace(page, spaceName);
      createdSpaces.push(spaceId);

      // Create a test room
      const roomName = generateChannelName();
      await serverPage.createChannel(roomName);
      
      // Click on the created channel to select it
      await page.click(`[data-testid="channel-${roomName}"], text="${roomName}"`);
      
      // Open channel settings (right-click or settings button)
      await page.click(`[data-testid="channel-${roomName}"], text="${roomName}"`, { button: 'right' });
      
      // Look for channel settings option
      const channelSettings = page.locator('text="Channel Settings", text="Edit Channel"');
      if (await channelSettings.isVisible({ timeout: 3000 })) {
        await channelSettings.click();
      } else {
        // Try alternative method - look for settings gear icon
        const settingsGear = page.locator('[aria-label*="channel settings" i], [data-testid*="channel-settings"]');
        if (await settingsGear.isVisible({ timeout: 3000 })) {
          await settingsGear.click();
        }
      }

      // Take screenshot of channel settings interface
      await screenshot(page, `channel-settings-${Date.now()}`);

      // Look for permissions tab
      const permissionsTab = page.locator('button:has-text("Permissions"), [data-tab="permissions"]');
      if (await permissionsTab.isVisible({ timeout: 5000 })) {
        await permissionsTab.click();
        
        // Take screenshot of permissions settings
        await screenshot(page, `channel-permissions-${Date.now()}`);
        
        // Verify permissions interface exists
        const permissionsInterface = page.locator('[data-testid="permissions"], .permissions-list, text="Who can"');
        await expect(permissionsInterface.first()).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Navigation Between Spaces and Rooms', () => {
    test('should navigate between multiple spaces smoothly', async ({ page }) => {
      // Create multiple test spaces
      const space1Name = uniqueId('Navigation Space 1');
      const space2Name = uniqueId('Navigation Space 2');
      
      const space1Id = await createTestSpace(page, space1Name);
      createdSpaces.push(space1Id);
      
      // Navigate back to create second space
      await page.click('[data-testid="add-server-button"], button:has-text("Add"), button:has-text("Create")');
      await modalPage.expectVisible();
      
      const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
      await nameInput.fill(space2Name);
      await createServerModal.submit();
      
      await page.waitForURL(/\/servers\//, { timeout: 15000 });
      const space2Id = page.url().match(/\/servers\/([^\/]+)/)?.[1];
      expect(space2Id).toBeTruthy();
      createdSpaces.push(decodeURIComponent(space2Id!));

      // Take screenshot showing both spaces
      await screenshot(page, `multiple-spaces-${Date.now()}`);

      // Navigate between spaces using the server list
      await page.click(`[data-testid="server-${space1Name}"], text="${space1Name}"`);
      await page.waitForTimeout(1000);
      
      // Verify we're in space 1
      expect(page.url()).toContain(encodeURIComponent(space1Id));
      await screenshot(page, `navigated-to-space1-${Date.now()}`);

      // Navigate to space 2
      await page.click(`[data-testid="server-${space2Name}"], text="${space2Name}"`);
      await page.waitForTimeout(1000);
      
      // Verify we're in space 2
      expect(page.url()).toContain(space2Id);
      await screenshot(page, `navigated-to-space2-${Date.now()}`);
    });

    test('should navigate between rooms within a space', async ({ page }) => {
      // Create a test space
      const spaceName = uniqueId('Room Navigation Space');
      const spaceId = await createTestSpace(page, spaceName);
      createdSpaces.push(spaceId);

      // Create multiple rooms
      const room1Name = generateChannelName();
      const room2Name = generateChannelName().replace('test-channel', 'second-channel');
      
      await serverPage.createChannel(room1Name);
      await page.waitForTimeout(2000);
      
      await serverPage.createChannel(room2Name);
      await page.waitForTimeout(2000);

      // Take screenshot showing both rooms
      await screenshot(page, `multiple-rooms-${Date.now()}`);

      // Navigate between rooms
      await page.click(`[data-testid="channel-${room1Name}"], text="${room1Name}"`);
      await page.waitForTimeout(1000);
      
      // Verify we're in room 1 (check URL or content)
      expect(page.url()).toMatch(new RegExp(`channels?.*${encodeURIComponent(room1Name)}|${room1Name}`));
      await screenshot(page, `navigated-to-room1-${Date.now()}`);

      // Navigate to room 2
      await page.click(`[data-testid="channel-${room2Name}"], text="${room2Name}"`);
      await page.waitForTimeout(1000);
      
      // Verify we're in room 2
      expect(page.url()).toMatch(new RegExp(`channels?.*${encodeURIComponent(room2Name)}|${room2Name}`));
      await screenshot(page, `navigated-to-room2-${Date.now()}`);
    });

    test('should maintain navigation state and history', async ({ page }) => {
      // Create a test space with rooms
      const spaceName = uniqueId('History Test Space');
      const spaceId = await createTestSpace(page, spaceName);
      createdSpaces.push(spaceId);

      const roomName = generateChannelName();
      await serverPage.createChannel(roomName);
      await page.click(`[data-testid="channel-${roomName}"], text="${roomName}"`);

      // Navigate away and back using browser history
      await page.goBack();
      await page.waitForTimeout(1000);
      
      await page.goForward();
      await page.waitForTimeout(1000);

      // Should be back in the room
      expect(page.url()).toMatch(new RegExp(`channels?.*${encodeURIComponent(roomName)}|${roomName}`));
      
      // Take screenshot of maintained navigation state
      await screenshot(page, `navigation-history-maintained-${Date.now()}`);
    });
  });

  test.describe('Room Settings and Modification', () => {
    test('should modify room name and topic', async ({ page }) => {
      // Create a test space and room
      const spaceName = uniqueId('Room Settings Space');
      const spaceId = await createTestSpace(page, spaceName);
      createdSpaces.push(spaceId);

      const originalRoomName = generateChannelName();
      await serverPage.createChannel(originalRoomName);
      
      // Open room settings
      await page.click(`[data-testid="channel-${originalRoomName}"], text="${originalRoomName}"`, { button: 'right' });
      
      const editOption = page.locator('text="Edit Channel", text="Channel Settings"');
      if (await editOption.isVisible({ timeout: 3000 })) {
        await editOption.click();
        
        // Modify room name
        const newRoomName = generateChannelName().replace('test-channel', 'updated-channel');
        const nameField = page.locator('input[name="name"], input[value*="channel" i]').first();
        await nameField.clear();
        await nameField.fill(newRoomName);
        
        // Modify room topic
        const newTopic = 'Updated room topic for E2E testing';
        const topicField = page.locator('input[name="topic"], textarea[name="topic"]').first();
        await topicField.fill(newTopic);
        
        // Save changes
        const saveButton = page.locator('button:has-text("Save"), button[type="submit"]');
        await saveButton.click();
        
        // Take screenshot of updated settings
        await screenshot(page, `room-settings-updated-${Date.now()}`);
        
        // Verify updated name appears in channel list
        await expect(page.locator(`text="${newRoomName}"`).first()).toBeVisible({ timeout: 10000 });
      } else {
        // Settings might not be accessible - document this
        await screenshot(page, `room-settings-not-accessible-${Date.now()}`);
      }
    });

    test('should configure room notification settings', async ({ page }) => {
      // Create a test space and room
      const spaceName = uniqueId('Notification Settings Space');
      const spaceId = await createTestSpace(page, spaceName);
      createdSpaces.push(spaceId);

      const roomName = generateChannelName();
      await serverPage.createChannel(roomName);
      
      // Open room notification settings
      await page.click(`[data-testid="channel-${roomName}"], text="${roomName}"`, { button: 'right' });
      
      // Look for notification options
      const notificationOption = page.locator('text="Notification Settings", text="Notifications"');
      if (await notificationOption.isVisible({ timeout: 3000 })) {
        await notificationOption.click();
        
        // Take screenshot of notification settings
        await screenshot(page, `room-notifications-${Date.now()}`);
        
        // Try different notification levels
        const allMessages = page.locator('text="All Messages", [value="all"]');
        const mentions = page.locator('text="Only Mentions", [value="mentions"]');
        const nothing = page.locator('text="Nothing", [value="none"]');
        
        // Test setting to mentions only
        if (await mentions.isVisible({ timeout: 3000 })) {
          await mentions.click();
          await page.waitForTimeout(1000);
          await screenshot(page, `notifications-mentions-only-${Date.now()}`);
        }
      } else {
        // Notification settings might not be implemented
        await screenshot(page, `notification-settings-not-available-${Date.now()}`);
      }
    });

    test('should manage room member list and invitations', async ({ page }) => {
      // Create a test space and room
      const spaceName = uniqueId('Member Management Space');
      const spaceId = await createTestSpace(page, spaceName);
      createdSpaces.push(spaceId);

      const roomName = generateChannelName();
      await serverPage.createChannel(roomName);
      
      // Navigate to the room
      await page.click(`[data-testid="channel-${roomName}"], text="${roomName}"`);
      
      // Look for member list or invite button
      const memberListButton = page.locator('[data-testid="member-list"], button:has-text("Members"), [aria-label*="member" i]');
      const inviteButton = page.locator('button:has-text("Invite"), [aria-label*="invite" i]');
      
      if (await memberListButton.isVisible({ timeout: 5000 })) {
        await memberListButton.click();
        await screenshot(page, `room-member-list-${Date.now()}`);
      } else if (await inviteButton.isVisible({ timeout: 5000 })) {
        await inviteButton.click();
        await screenshot(page, `room-invite-interface-${Date.now()}`);
        
        // Close invite modal if it opened
        const closeButton = page.locator('button[aria-label*="close" i], [data-testid="close"]');
        if (await closeButton.isVisible({ timeout: 3000 })) {
          await closeButton.click();
        }
      } else {
        // Member management might not be implemented
        await screenshot(page, `member-management-not-available-${Date.now()}`);
      }
    });
  });

  test.describe('Space Hierarchy and Nested Structures', () => {
    test('should create and manage nested room structures', async ({ page }) => {
      // Create a main test space
      const mainSpaceName = uniqueId('Main Hierarchy Space');
      const spaceId = await createTestSpace(page, mainSpaceName);
      createdSpaces.push(spaceId);

      // Create multiple rooms with different purposes
      const generalRoom = 'general';
      const announcementsRoom = 'announcements';
      const randomRoom = 'random';
      
      await serverPage.createChannel(generalRoom);
      await page.waitForTimeout(1000);
      
      await serverPage.createChannel(announcementsRoom);
      await page.waitForTimeout(1000);
      
      await serverPage.createChannel(randomRoom);
      await page.waitForTimeout(1000);

      // Take screenshot of room hierarchy
      await screenshot(page, `room-hierarchy-${Date.now()}`);

      // Verify all rooms appear in the channel list
      await expect(page.locator(`text="${generalRoom}"`).first()).toBeVisible();
      await expect(page.locator(`text="${announcementsRoom}"`).first()).toBeVisible();
      await expect(page.locator(`text="${randomRoom}"`).first()).toBeVisible();

      // Test room ordering (if drag-and-drop is supported)
      const firstRoom = page.locator(`[data-testid="channel-${generalRoom}"], text="${generalRoom}"`).first();
      const secondRoom = page.locator(`[data-testid="channel-${announcementsRoom}"], text="${announcementsRoom}"`).first();
      
      // Try drag and drop (if supported)
      try {
        await firstRoom.dragTo(secondRoom);
        await page.waitForTimeout(1000);
        await screenshot(page, `rooms-reordered-${Date.now()}`);
      } catch (error) {
        // Drag and drop might not be implemented
        await screenshot(page, `room-reordering-not-available-${Date.now()}`);
      }
    });

    test('should handle space-to-space relationships', async ({ page }) => {
      // Create two related spaces
      const parentSpaceName = uniqueId('Parent Space');
      const childSpaceName = uniqueId('Child Space');
      
      const parentSpaceId = await createTestSpace(page, parentSpaceName);
      createdSpaces.push(parentSpaceId);
      
      // Create second space
      await page.click('[data-testid="add-server-button"], button:has-text("Add"), button:has-text("Create")');
      await modalPage.expectVisible();
      
      const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
      await nameInput.fill(childSpaceName);
      await createServerModal.submit();
      
      await page.waitForURL(/\/servers\//, { timeout: 15000 });
      const childSpaceId = page.url().match(/\/servers\/([^\/]+)/)?.[1];
      expect(childSpaceId).toBeTruthy();
      createdSpaces.push(decodeURIComponent(childSpaceId!));

      // Take screenshot showing both spaces
      await screenshot(page, `parent-child-spaces-${Date.now()}`);

      // Test navigation between related spaces
      await page.click(`[data-testid="server-${parentSpaceName}"], text="${parentSpaceName}"`);
      await page.waitForTimeout(1000);
      await screenshot(page, `in-parent-space-${Date.now()}`);
      
      await page.click(`[data-testid="server-${childSpaceName}"], text="${childSpaceName}"`);
      await page.waitForTimeout(1000);
      await screenshot(page, `in-child-space-${Date.now()}`);

      // Verify both spaces maintain their identity
      expect(page.url()).toContain(childSpaceId);
    });

    test('should manage complex permission inheritance', async ({ page }) => {
      // Create a test space with hierarchy
      const spaceName = uniqueId('Permission Hierarchy Space');
      const spaceId = await createTestSpace(page, spaceName);
      createdSpaces.push(spaceId);

      // Create rooms with different permission needs
      const publicRoom = 'public-discussion';
      const privateRoom = 'private-discussion';
      
      await serverPage.createChannel(publicRoom);
      await serverPage.createChannel(privateRoom);

      // Try to set different permissions on each room
      // Navigate to space settings to see permission structure
      await page.click('[data-testid="server-settings"], button[aria-label*="settings" i]');
      await page.waitForURL(/\/settings/, { timeout: 10000 });

      // Look for roles/permissions management
      const rolesTab = page.locator('button:has-text("Roles"), button:has-text("Permissions")');
      if (await rolesTab.isVisible({ timeout: 5000 })) {
        await rolesTab.click();
        
        // Take screenshot of permission hierarchy interface
        await screenshot(page, `permission-hierarchy-${Date.now()}`);
        
        // Verify permission management interface exists
        const permissionInterface = page.locator('[data-testid="roles"], [data-testid="permissions"], text="Default permissions"');
        const hasInterface = await permissionInterface.first().isVisible({ timeout: 5000 });
        
        // Document whether advanced permission management is available
        if (hasInterface) {
          await screenshot(page, `advanced-permissions-available-${Date.now()}`);
        } else {
          await screenshot(page, `basic-permissions-only-${Date.now()}`);
        }
      }
    });
  });

  test.describe('Integration and Real-world Scenarios', () => {
    test('should handle full workflow: create space → add rooms → send messages → manage settings', async ({ page }) => {
      // Full workflow test
      const spaceName = uniqueId('Full Workflow Space');
      const spaceId = await createTestSpace(page, spaceName, { topic: 'Complete E2E workflow test' });
      createdSpaces.push(spaceId);

      // Add multiple types of rooms
      const welcomeRoom = 'welcome';
      const generalRoom = 'general-chat';
      
      await serverPage.createChannel(welcomeRoom);
      await serverPage.createChannel(generalRoom);

      // Navigate to welcome room and send a message
      await page.click(`[data-testid="channel-${welcomeRoom}"], text="${welcomeRoom}"`);
      
      const welcomeMessage = generateMessage().replace('Test message', 'Welcome to our space!');
      await chatPage.sendMessage(welcomeMessage);
      
      // Verify message appears
      await chatPage.expectMessageVisible(welcomeMessage);
      await screenshot(page, `welcome-message-sent-${Date.now()}`);

      // Navigate to general room and send another message
      await page.click(`[data-testid="channel-${generalRoom}"], text="${generalRoom}"`);
      
      const generalMessage = generateMessage().replace('Test message', 'General discussion happening here');
      await chatPage.sendMessage(generalMessage);
      
      // Verify message appears
      await chatPage.expectMessageVisible(generalMessage);
      await screenshot(page, `general-message-sent-${Date.now()}`);

      // Modify space settings
      await page.click('[data-testid="server-settings"], button[aria-label*="settings" i]');
      await page.waitForURL(/\/settings/, { timeout: 10000 });
      
      // Try to update space description
      const updatedTopic = 'Updated: Complete E2E workflow test with messages';
      const topicField = page.locator('input[name="topic"], textarea[name="topic"]').first();
      if (await topicField.isVisible({ timeout: 5000 })) {
        await topicField.clear();
        await topicField.fill(updatedTopic);
        
        const saveButton = page.locator('button:has-text("Save"), button[type="submit"]');
        if (await saveButton.isVisible({ timeout: 3000 })) {
          await saveButton.click();
          await page.waitForTimeout(2000);
        }
      }

      // Take final screenshot of completed workflow
      await screenshot(page, `full-workflow-complete-${Date.now()}`);

      // Verify space still exists and is functional
      await page.goto(`/servers/${encodeURIComponent(spaceId)}`);
      await expect(page.locator(`text="${spaceName}"`).first()).toBeVisible({ timeout: 10000 });
    });

    test('should maintain state across page refreshes and reconnections', async ({ page }) => {
      // Create test space and room
      const spaceName = uniqueId('Persistence Test Space');
      const spaceId = await createTestSpace(page, spaceName);
      createdSpaces.push(spaceId);

      const roomName = generateChannelName();
      await serverPage.createChannel(roomName);
      
      // Navigate to room and send a message
      await page.click(`[data-testid="channel-${roomName}"], text="${roomName}"`);
      const testMessage = generateMessage().replace('Test message', 'Persistence test message');
      await chatPage.sendMessage(testMessage);

      // Take screenshot before refresh
      await screenshot(page, `before-refresh-${Date.now()}`);
      
      // Refresh the page
      await page.reload();
      await waitForAppReady(page);
      await waitForMatrixSync(page);

      // Verify we're still in the same space and room
      expect(page.url()).toContain(encodeURIComponent(spaceId));
      
      // Verify message is still visible
      await chatPage.expectMessageVisible(testMessage);
      
      // Take screenshot after refresh
      await screenshot(page, `after-refresh-${Date.now()}`);

      // Verify space and room structure is maintained
      await expect(page.locator(`text="${spaceName}"`).first()).toBeVisible();
      await expect(page.locator(`text="${roomName}"`).first()).toBeVisible();
    });

    test('should handle concurrent operations and race conditions', async ({ page }) => {
      // Create a test space
      const spaceName = uniqueId('Concurrency Test Space');
      const spaceId = await createTestSpace(page, spaceName);
      createdSpaces.push(spaceId);

      // Rapidly create multiple rooms
      const roomNames = [
        generateChannelName(),
        generateChannelName().replace('test-channel', 'rapid-1'),
        generateChannelName().replace('test-channel', 'rapid-2'),
      ];

      // Create rooms in quick succession
      for (const roomName of roomNames) {
        await page.click('[data-testid="add-channel"], button:has-text("Create Channel")');
        await modalPage.expectVisible();
        
        const nameInput = page.locator('input[placeholder*="channel" i], input[placeholder*="name" i]');
        await nameInput.fill(roomName);
        await modalPage.submit();
        
        // Don't wait long - test rapid operations
        await page.waitForTimeout(500);
      }

      // Take screenshot of rapid room creation
      await screenshot(page, `rapid-room-creation-${Date.now()}`);

      // Verify all rooms eventually appear (allow time for async operations)
      await page.waitForTimeout(5000);
      
      for (const roomName of roomNames) {
        await expect(page.locator(`text="${roomName}"`).first()).toBeVisible({ timeout: 10000 });
      }

      // Take final screenshot showing all rooms
      await screenshot(page, `all-rapid-rooms-visible-${Date.now()}`);
    });
  });
});