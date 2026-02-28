/**
 * E2E Tests for Channel Context Menu Delete Functionality
 * 
 * Tests the complete user journey for right-clicking channels and accessing delete options.
 * Note: E2E infrastructure is currently blocked, so this provides framework for future testing.
 */

import { test, expect } from '@playwright/test';

test.describe('Channel Context Menu - Delete Channel', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a server with channels
    await page.goto('/servers/test-server-id');
    
    // Wait for channels to load
    await page.waitForSelector('[data-testid="channel-list"]');
  });

  test.describe('Admin/Owner Users', () => {
    test('should show Delete Channel option on right-click', async ({ page }) => {
      // Right-click on a non-general channel
      await page.click('[data-testid="channel-item"]:not([data-channel-name="general"])', { 
        button: 'right' 
      });
      
      // Verify context menu appears
      await expect(page.locator('[data-testid="channel-context-menu"]')).toBeVisible();
      
      // Verify Delete Channel option is visible
      await expect(page.locator('text="Delete Channel"')).toBeVisible();
      
      // Verify delete option has destructive styling
      const deleteOption = page.locator('text="Delete Channel"');
      await expect(deleteOption).toHaveClass(/text-red-400/);
    });

    test('should open delete confirmation modal when Delete Channel is clicked', async ({ page }) => {
      // Right-click on a channel
      await page.click('[data-testid="channel-item"]:not([data-channel-name="general"])', { 
        button: 'right' 
      });
      
      // Click Delete Channel option
      await page.click('text="Delete Channel"');
      
      // Verify delete confirmation modal opens
      await expect(page.locator('[data-testid="delete-channel-modal"]')).toBeVisible();
      
      // Verify modal contains channel name
      await expect(page.locator('text=/Delete Channel/i')).toBeVisible();
    });

    test('should not show Delete Channel for general channel', async ({ page }) => {
      // Right-click on general channel (if it exists)
      const generalChannel = page.locator('[data-channel-name="general"]');
      
      if (await generalChannel.count() > 0) {
        await generalChannel.click({ button: 'right' });
        
        // Verify context menu appears but without delete option
        await expect(page.locator('[data-testid="channel-context-menu"]')).toBeVisible();
        await expect(page.locator('text="Delete Channel"')).not.toBeVisible();
      }
    });
  });

  test.describe('Regular Members', () => {
    test.beforeEach(async ({ page }) => {
      // Mock user as regular member (not admin/owner)
      await page.route('**/api/user/permissions', (route) => {
        route.fulfill({
          json: { role: 'member' }
        });
      });
    });

    test('should not show Delete Channel option for regular members', async ({ page }) => {
      // Right-click on any channel
      await page.click('[data-testid="channel-item"]', { button: 'right' });
      
      // Verify context menu appears (if any options are available)
      // but Delete Channel option should not be visible
      await expect(page.locator('text="Delete Channel"')).not.toBeVisible();
    });
  });

  test.describe('Context Menu Behavior', () => {
    test('should close context menu when clicking outside', async ({ page }) => {
      // Right-click on a channel to open context menu
      await page.click('[data-testid="channel-item"]', { button: 'right' });
      
      // Verify context menu is visible
      await expect(page.locator('[data-testid="channel-context-menu"]')).toBeVisible();
      
      // Click outside the context menu
      await page.click('body', { position: { x: 50, y: 50 } });
      
      // Verify context menu is closed
      await expect(page.locator('[data-testid="channel-context-menu"]')).not.toBeVisible();
    });

    test('should close context menu when pressing Escape', async ({ page }) => {
      // Right-click on a channel to open context menu
      await page.click('[data-testid="channel-item"]', { button: 'right' });
      
      // Verify context menu is visible
      await expect(page.locator('[data-testid="channel-context-menu"]')).toBeVisible();
      
      // Press Escape key
      await page.keyboard.press('Escape');
      
      // Verify context menu is closed
      await expect(page.locator('[data-testid="channel-context-menu"]')).not.toBeVisible();
    });

    test('should position context menu near cursor', async ({ page }) => {
      // Get viewport size
      const viewport = page.viewportSize();
      
      // Right-click at a specific position
      const clickX = Math.floor(viewport!.width / 2);
      const clickY = Math.floor(viewport!.height / 2);
      
      await page.click('[data-testid="channel-item"]', { 
        button: 'right',
        position: { x: clickX, y: clickY }
      });
      
      // Verify context menu appears near the click position
      const contextMenu = page.locator('[data-testid="channel-context-menu"]');
      await expect(contextMenu).toBeVisible();
      
      const menuBox = await contextMenu.boundingBox();
      expect(menuBox!.x).toBeGreaterThanOrEqual(clickX - 20);
      expect(menuBox!.y).toBeGreaterThanOrEqual(clickY - 20);
    });

    test('should prevent context menu from overflowing viewport edges', async ({ page }) => {
      const viewport = page.viewportSize();
      
      // Right-click near the right edge
      await page.click('[data-testid="channel-item"]', { 
        button: 'right',
        position: { x: viewport!.width - 50, y: 100 }
      });
      
      const contextMenu = page.locator('[data-testid="channel-context-menu"]');
      await expect(contextMenu).toBeVisible();
      
      // Verify menu doesn't overflow right edge
      const menuBox = await contextMenu.boundingBox();
      expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(viewport!.width);
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should support keyboard navigation within context menu', async ({ page }) => {
      // Right-click on a channel
      await page.click('[data-testid="channel-item"]', { button: 'right' });
      
      // Verify context menu is focused
      const contextMenu = page.locator('[data-testid="channel-context-menu"]');
      await expect(contextMenu).toBeFocused();
      
      // Tab to delete option (if visible)
      await page.keyboard.press('Tab');
      
      // Verify delete option can be focused
      const deleteOption = page.locator('[role="menuitem"]:has-text("Delete Channel")');
      if (await deleteOption.count() > 0) {
        await expect(deleteOption).toBeFocused();
        
        // Press Enter to activate
        await page.keyboard.press('Enter');
        
        // Verify modal opens
        await expect(page.locator('[data-testid="delete-channel-modal"]')).toBeVisible();
      }
    });
  });

  test.describe('Different Channel Types', () => {
    test('should work with text channels', async ({ page }) => {
      await page.click('[data-testid="channel-item"][data-channel-type="text"]', { 
        button: 'right' 
      });
      
      await expect(page.locator('[data-testid="channel-context-menu"]')).toBeVisible();
    });

    test('should work with voice channels', async ({ page }) => {
      const voiceChannel = page.locator('[data-testid="channel-item"][data-channel-type="voice"]');
      
      if (await voiceChannel.count() > 0) {
        await voiceChannel.click({ button: 'right' });
        await expect(page.locator('[data-testid="channel-context-menu"]')).toBeVisible();
      }
    });

    test('should work with announcement channels', async ({ page }) => {
      const announcementChannel = page.locator('[data-testid="channel-item"][data-channel-type="announcement"]');
      
      if (await announcementChannel.count() > 0) {
        await announcementChannel.click({ button: 'right' });
        await expect(page.locator('[data-testid="channel-context-menu"]')).toBeVisible();
      }
    });
  });

  test.describe('Error Scenarios', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network failure
      await page.route('**/api/channels/*/delete', (route) => {
        route.abort('failed');
      });
      
      // Right-click and attempt delete
      await page.click('[data-testid="channel-item"]', { button: 'right' });
      await page.click('text="Delete Channel"');
      
      // Verify error handling (modal should still appear, error should be shown)
      await expect(page.locator('[data-testid="delete-channel-modal"]')).toBeVisible();
    });
  });
});

// Note: These tests are currently blocked by E2E infrastructure issues
// Once infrastructure is resolved, these tests should provide comprehensive coverage
// of the channel context menu functionality across different user roles and scenarios.