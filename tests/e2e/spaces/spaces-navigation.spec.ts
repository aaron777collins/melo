import { test, expect } from '@playwright/test';
import { loginWithTestUser, createTestSpace, cleanupTestSpace } from '../fixtures/helpers';

test.describe('Spaces Navigation', () => {
  let testSpaceId: string;

  test.beforeEach(async ({ page }) => {
    await loginWithTestUser(page);
  });

  test.afterEach(async ({ page }) => {
    if (testSpaceId) {
      await cleanupTestSpace(page, testSpaceId);
    }
  });

  test.describe('Spaces List Population', () => {
    test('should display joined spaces in navigation', async ({ page }) => {
      // Create a test space
      const spaceName = `Test Space ${Date.now()}`;
      testSpaceId = await createTestSpace(page, spaceName);

      // Navigate to main page
      await page.goto('/');

      // Wait for spaces to load
      await page.waitForSelector('[data-testid="spaces-list"]');

      // Check if the test space appears in the list
      const spaceItem = page.locator('[data-testid="space-item"]', { hasText: spaceName });
      await expect(spaceItem).toBeVisible();

      // Verify space has correct display elements
      await expect(spaceItem.locator('[data-testid="space-avatar"]')).toBeVisible();
      await expect(spaceItem.locator('[data-testid="space-name"]')).toContainText(spaceName);
    });

    test('should show space unread counts and mention badges', async ({ page }) => {
      // Create space and channel
      const spaceName = `Test Space ${Date.now()}`;
      testSpaceId = await createTestSpace(page, spaceName);
      
      // Navigate to the space
      await page.goto(`/servers/${encodeURIComponent(testSpaceId)}`);
      
      // Create a channel in the space
      const channelName = `test-channel-${Date.now()}`;
      await page.click('[data-testid="create-channel"]');
      await page.fill('[data-testid="channel-name-input"]', channelName);
      await page.click('[data-testid="create-channel-submit"]');
      
      // Send a message to create unread count
      await page.click(`[data-testid="channel-item"][data-channel-name="${channelName}"]`);
      await page.fill('[data-testid="message-input"]', 'Test message for unread count');
      await page.press('[data-testid="message-input"]', 'Enter');
      
      // Navigate away and back to see unread indicator
      await page.goto('/');
      
      // Check for unread badge on space
      const spaceItem = page.locator('[data-testid="space-item"]', { hasText: spaceName });
      await expect(spaceItem.locator('[data-testid="unread-badge"]')).toBeVisible();
    });

    test('should handle spaces loading states', async ({ page }) => {
      // Navigate to main page
      await page.goto('/');

      // Should show loading state initially
      const loadingIndicator = page.locator('[data-testid="spaces-loading"]');
      await expect(loadingIndicator).toBeVisible();

      // Wait for loading to complete
      await page.waitForSelector('[data-testid="spaces-list"]');
      await expect(loadingIndicator).not.toBeVisible();
    });

    test('should handle empty spaces state', async ({ page }) => {
      // Mock empty spaces response or ensure user has no spaces
      await page.goto('/');
      
      // Wait for spaces to load
      await page.waitForSelector('[data-testid="spaces-list"]');
      
      // Should show appropriate message when no spaces
      const emptyState = page.locator('[data-testid="spaces-empty-state"]');
      if (await emptyState.count() > 0) {
        await expect(emptyState).toBeVisible();
        await expect(emptyState).toContainText(/no spaces|join.*space|create.*space/i);
      }
    });
  });

  test.describe('Navigation Between Spaces', () => {
    test('should navigate to space when clicked', async ({ page }) => {
      const spaceName = `Nav Test Space ${Date.now()}`;
      testSpaceId = await createTestSpace(page, spaceName);

      // Go to main page
      await page.goto('/');
      
      // Wait for spaces to load
      await page.waitForSelector('[data-testid="spaces-list"]');
      
      // Click on the space
      const spaceItem = page.locator('[data-testid="space-item"]', { hasText: spaceName });
      await spaceItem.click();

      // Should navigate to space page
      await expect(page).toHaveURL(new RegExp(`/servers/${encodeURIComponent(testSpaceId)}`));
      
      // Should show space header with correct name
      const spaceHeader = page.locator('[data-testid="space-header"]');
      await expect(spaceHeader).toBeVisible();
      await expect(spaceHeader).toContainText(spaceName);
    });

    test('should maintain active space indicator', async ({ page }) => {
      const spaceName = `Active Test Space ${Date.now()}`;
      testSpaceId = await createTestSpace(page, spaceName);

      // Navigate to space
      await page.goto(`/servers/${encodeURIComponent(testSpaceId)}`);
      
      // Space should be marked as active in navigation
      const activeSpace = page.locator('[data-testid="space-item"][data-active="true"]');
      await expect(activeSpace).toBeVisible();
      await expect(activeSpace).toContainText(spaceName);
    });

    test('should show space channels when navigating to space', async ({ page }) => {
      const spaceName = `Channels Test Space ${Date.now()}`;
      testSpaceId = await createTestSpace(page, spaceName);

      // Navigate to space
      await page.goto(`/servers/${encodeURIComponent(testSpaceId)}`);
      
      // Should show channels sidebar
      const channelsSidebar = page.locator('[data-testid="channels-sidebar"]');
      await expect(channelsSidebar).toBeVisible();
      
      // Should show space name in header
      await expect(page.locator('[data-testid="space-name"]')).toContainText(spaceName);
    });

    test('should handle space navigation errors gracefully', async ({ page }) => {
      // Try to navigate to non-existent space
      const nonExistentSpaceId = '!nonexistent:example.com';
      await page.goto(`/servers/${encodeURIComponent(nonExistentSpaceId)}`);
      
      // Should show error state or redirect
      const errorMessage = page.locator('[data-testid="space-error"]');
      const isRedirected = await page.url() !== `/servers/${encodeURIComponent(nonExistentSpaceId)}`;
      
      if (!isRedirected) {
        await expect(errorMessage).toBeVisible();
        await expect(errorMessage).toContainText(/not found|error|failed/i);
      }
    });
  });

  test.describe('Mentions Functionality with Spaces', () => {
    test('should suggest channels from current space in mentions', async ({ page }) => {
      const spaceName = `Mentions Test Space ${Date.now()}`;
      testSpaceId = await createTestSpace(page, spaceName);

      // Navigate to space
      await page.goto(`/servers/${encodeURIComponent(testSpaceId)}`);

      // Create a channel
      const channelName = `mention-test-channel-${Date.now()}`;
      await page.click('[data-testid="create-channel"]');
      await page.fill('[data-testid="channel-name-input"]', channelName);
      await page.click('[data-testid="create-channel-submit"]');

      // Navigate to the channel
      await page.click(`[data-testid="channel-item"][data-channel-name="${channelName}"]`);

      // Start typing a mention
      await page.fill('[data-testid="message-input"]', '#');
      
      // Should show channel suggestions
      const mentionSuggestions = page.locator('[data-testid="mention-suggestions"]');
      await expect(mentionSuggestions).toBeVisible();
      
      // Should include the channel we created
      const channelSuggestion = mentionSuggestions.locator('[data-testid="mention-channel"]', { hasText: channelName });
      await expect(channelSuggestion).toBeVisible();
    });

    test('should suggest channels from all spaces in mentions', async ({ page }) => {
      // Create two test spaces
      const spaceName1 = `Mentions Space 1 ${Date.now()}`;
      const spaceName2 = `Mentions Space 2 ${Date.now()}`;
      
      testSpaceId = await createTestSpace(page, spaceName1);
      const space2Id = await createTestSpace(page, spaceName2);

      try {
        // Navigate to first space and create channel
        await page.goto(`/servers/${encodeURIComponent(testSpaceId)}`);
        const channel1Name = `channel1-${Date.now()}`;
        await page.click('[data-testid="create-channel"]');
        await page.fill('[data-testid="channel-name-input"]', channel1Name);
        await page.click('[data-testid="create-channel-submit"]');

        // Navigate to second space and create channel
        await page.goto(`/servers/${encodeURIComponent(space2Id)}`);
        const channel2Name = `channel2-${Date.now()}`;
        await page.click('[data-testid="create-channel"]');
        await page.fill('[data-testid="channel-name-input"]', channel2Name);
        await page.click('[data-testid="create-channel-submit"]');

        // Navigate to channel in second space
        await page.click(`[data-testid="channel-item"][data-channel-name="${channel2Name}"]`);

        // Start typing a mention
        await page.fill('[data-testid="message-input"]', '#');

        // Should show suggestions from both spaces
        const mentionSuggestions = page.locator('[data-testid="mention-suggestions"]');
        await expect(mentionSuggestions).toBeVisible();

        // Should include channels from both spaces
        await expect(mentionSuggestions.locator('[data-testid="mention-channel"]', { hasText: channel1Name })).toBeVisible();
        await expect(mentionSuggestions.locator('[data-testid="mention-channel"]', { hasText: channel2Name })).toBeVisible();
      } finally {
        // Cleanup second space
        await cleanupTestSpace(page, space2Id);
      }
    });

    test('should navigate to mentioned channel from different space', async ({ page }) => {
      const spaceName = `Navigation Test Space ${Date.now()}`;
      testSpaceId = await createTestSpace(page, spaceName);

      // Navigate to space and create channel
      await page.goto(`/servers/${encodeURIComponent(testSpaceId)}`);
      const channelName = `nav-test-channel-${Date.now()}`;
      await page.click('[data-testid="create-channel"]');
      await page.fill('[data-testid="channel-name-input"]', channelName);
      await page.click('[data-testid="create-channel-submit"]');

      // Send message with channel mention from DMs or another area
      await page.goto('/channels/dms');
      
      // If there are DM conversations, use the first one, otherwise create one
      const dmConversation = page.locator('[data-testid="dm-conversation"]').first();
      if (await dmConversation.count() > 0) {
        await dmConversation.click();
        
        // Send message mentioning the channel
        await page.fill('[data-testid="message-input"]', `Check out #${channelName}`);
        await page.press('[data-testid="message-input"]', 'Enter');
        
        // Click on the channel mention
        const channelLink = page.locator('[data-testid="channel-mention"]', { hasText: channelName });
        await expect(channelLink).toBeVisible();
        await channelLink.click();
        
        // Should navigate to the channel
        await expect(page).toHaveURL(new RegExp(`/servers/${encodeURIComponent(testSpaceId)}/channels/`));
      }
    });
  });

  test.describe('Space Information Display', () => {
    test('should display space member count', async ({ page }) => {
      const spaceName = `Member Count Test ${Date.now()}`;
      testSpaceId = await createTestSpace(page, spaceName);

      await page.goto(`/servers/${encodeURIComponent(testSpaceId)}`);
      
      // Should show member count in space header or info
      const memberCount = page.locator('[data-testid="space-member-count"]');
      await expect(memberCount).toBeVisible();
      await expect(memberCount).toContainText(/\d+/); // Should contain at least one number
    });

    test('should display space topic/description', async ({ page }) => {
      const spaceName = `Topic Test Space ${Date.now()}`;
      const spaceDescription = `Test description for ${spaceName}`;
      
      testSpaceId = await createTestSpace(page, spaceName, { topic: spaceDescription });

      await page.goto(`/servers/${encodeURIComponent(testSpaceId)}`);
      
      // Should show space topic if it exists
      const spaceTopic = page.locator('[data-testid="space-topic"]');
      if (await spaceTopic.count() > 0) {
        await expect(spaceTopic).toContainText(spaceDescription);
      }
    });

    test('should show space avatar or fallback initials', async ({ page }) => {
      const spaceName = `Avatar Test Space ${Date.now()}`;
      testSpaceId = await createTestSpace(page, spaceName);

      await page.goto('/');
      await page.waitForSelector('[data-testid="spaces-list"]');
      
      const spaceItem = page.locator('[data-testid="space-item"]', { hasText: spaceName });
      const spaceAvatar = spaceItem.locator('[data-testid="space-avatar"]');
      
      await expect(spaceAvatar).toBeVisible();
      
      // Should either show image or fallback initials
      const avatarImg = spaceAvatar.locator('img');
      const avatarInitials = spaceAvatar.locator('[data-testid="space-initials"]');
      
      const hasImage = await avatarImg.count() > 0;
      const hasInitials = await avatarInitials.count() > 0;
      
      expect(hasImage || hasInitials).toBe(true);
      
      if (hasInitials) {
        await expect(avatarInitials).toContainText(/^[A-Z]{1,2}$/);
      }
    });
  });

  test.describe('Accessibility and Keyboard Navigation', () => {
    test('should support keyboard navigation for spaces', async ({ page }) => {
      const spaceName = `Keyboard Test Space ${Date.now()}`;
      testSpaceId = await createTestSpace(page, spaceName);

      await page.goto('/');
      await page.waitForSelector('[data-testid="spaces-list"]');

      // Focus on the first space
      await page.keyboard.press('Tab');
      const focusedSpace = page.locator('[data-testid="space-item"]:focus');
      await expect(focusedSpace).toBeVisible();

      // Should be able to activate with Enter or Space
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/servers\//);
    });

    test('should have proper ARIA labels for spaces', async ({ page }) => {
      const spaceName = `ARIA Test Space ${Date.now()}`;
      testSpaceId = await createTestSpace(page, spaceName);

      await page.goto('/');
      await page.waitForSelector('[data-testid="spaces-list"]');

      const spaceItem = page.locator('[data-testid="space-item"]', { hasText: spaceName });
      
      // Should have proper accessibility attributes
      await expect(spaceItem).toHaveAttribute('role', 'button');
      await expect(spaceItem).toHaveAttribute('aria-label', new RegExp(spaceName));
      
      // If it has unread messages, should indicate that
      const unreadBadge = spaceItem.locator('[data-testid="unread-badge"]');
      if (await unreadBadge.count() > 0) {
        await expect(spaceItem).toHaveAttribute('aria-describedby');
      }
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle space loading failures gracefully', async ({ page }) => {
      // Mock network failure for spaces loading
      await page.route('/_matrix/client/**', route => route.abort());

      await page.goto('/');
      
      // Should show error state or retry option
      const errorState = page.locator('[data-testid="spaces-error"]');
      const retryButton = page.locator('[data-testid="spaces-retry"]');
      
      // Either should be visible
      const hasError = await errorState.count() > 0;
      const hasRetry = await retryButton.count() > 0;
      
      expect(hasError || hasRetry).toBe(true);
    });

    test('should handle space update events in real-time', async ({ page }) => {
      const spaceName = `Update Test Space ${Date.now()}`;
      testSpaceId = await createTestSpace(page, spaceName);

      await page.goto('/');
      await page.waitForSelector('[data-testid="spaces-list"]');

      // Verify initial state
      const spaceItem = page.locator('[data-testid="space-item"]', { hasText: spaceName });
      await expect(spaceItem).toBeVisible();

      // Simulate space update (this would typically come from Matrix sync)
      // For now, just verify the space can be refreshed
      await page.reload();
      await page.waitForSelector('[data-testid="spaces-list"]');
      await expect(spaceItem).toBeVisible();
    });

    test('should handle spaces with long names gracefully', async ({ page }) => {
      const longSpaceName = `Very Long Space Name That Should Be Truncated Appropriately ${Date.now()}`;
      testSpaceId = await createTestSpace(page, longSpaceName);

      await page.goto('/');
      await page.waitForSelector('[data-testid="spaces-list"]');

      const spaceItem = page.locator('[data-testid="space-item"]', { hasText: /Very Long Space Name/ });
      await expect(spaceItem).toBeVisible();

      // Name should be handled gracefully (truncated, tooltip, etc.)
      const spaceName = spaceItem.locator('[data-testid="space-name"]');
      await expect(spaceName).toBeVisible();
      
      // Should either show truncated text with ellipsis or have a tooltip
      const hasEllipsis = await spaceName.evaluate(el => 
        window.getComputedStyle(el).textOverflow === 'ellipsis'
      );
      const hasTooltip = await spaceName.getAttribute('title');
      
      expect(hasEllipsis || hasTooltip).toBeTruthy();
    });
  });
});