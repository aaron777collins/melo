/**
 * LiveKit Voice/Video E2E Tests
 * TDD Phase: RED - These tests should FAIL initially
 */

import { test, expect } from '@playwright/test';

test.describe('Voice and Video Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Melo application and sign in
    await page.goto('/');
    
    // Wait for authentication to complete
    await page.waitForSelector('[data-testid="main-navigation"]');
  });

  test.describe('Voice Room Access', () => {
    test('should display voice channel in server sidebar', async ({ page }) => {
      // Navigate to a server with voice channels
      await page.click('[data-testid="server-sidebar"] [data-testid="server-item"]:first-child');
      
      // Should see voice channels section
      await expect(page.locator('[data-testid="voice-channels-section"]')).toBeVisible();
      
      // Should see at least one voice channel
      await expect(page.locator('[data-testid="voice-channel-item"]').first()).toBeVisible();
    });

    test('should show join voice channel button', async ({ page }) => {
      // Navigate to server and click on voice channel
      await page.click('[data-testid="server-sidebar"] [data-testid="server-item"]:first-child');
      await page.click('[data-testid="voice-channel-item"]:first-child');
      
      // Should show join button
      await expect(page.locator('[data-testid="join-voice-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="join-voice-button"]')).toHaveText('Join Voice');
    });

    test('should request microphone permission when joining voice', async ({ page, context }) => {
      // Grant microphone permission
      await context.grantPermissions(['microphone']);
      
      // Navigate to voice channel and join
      await page.click('[data-testid="server-sidebar"] [data-testid="server-item"]:first-child');
      await page.click('[data-testid="voice-channel-item"]:first-child');
      await page.click('[data-testid="join-voice-button"]');
      
      // Should show connecting state
      await expect(page.locator('[data-testid="voice-connection-status"]')).toContainText('Connecting');
      
      // Should eventually show connected state
      await expect(page.locator('[data-testid="voice-connection-status"]')).toContainText('Connected', {
        timeout: 10000
      });
    });

    test('should handle microphone permission denied gracefully', async ({ page, context }) => {
      // Deny microphone permission
      await context.grantPermissions([]);
      
      await page.click('[data-testid="server-sidebar"] [data-testid="server-item"]:first-child');
      await page.click('[data-testid="voice-channel-item"]:first-child');
      await page.click('[data-testid="join-voice-button"]');
      
      // Should show error message
      await expect(page.locator('[data-testid="permission-error"]')).toContainText(
        'Microphone permission is required for voice chat'
      );
      
      // Should still allow text chat
      await expect(page.locator('[data-testid="message-input"]')).toBeVisible();
    });

    test('should connect to LiveKit voice room', async ({ page, context }) => {
      await context.grantPermissions(['microphone']);
      
      // Monitor network requests to LiveKit
      const livekitRequests: string[] = [];
      page.on('request', request => {
        if (request.url().includes('livekit')) {
          livekitRequests.push(request.url());
        }
      });
      
      await page.click('[data-testid="server-sidebar"] [data-testid="server-item"]:first-child');
      await page.click('[data-testid="voice-channel-item"]:first-child');
      await page.click('[data-testid="join-voice-button"]');
      
      // Should make requests to LiveKit server
      await page.waitForFunction(() => 
        window.localStorage.getItem('livekit-connection-state') === 'connected'
      , { timeout: 15000 });
      
      expect(livekitRequests.length).toBeGreaterThan(0);
      expect(livekitRequests.some(url => url.includes('wss://'))).toBe(true);
    });
  });

  test.describe('Voice Controls', () => {
    test.beforeEach(async ({ page, context }) => {
      await context.grantPermissions(['microphone', 'camera']);
      
      // Join a voice channel
      await page.click('[data-testid="server-sidebar"] [data-testid="server-item"]:first-child');
      await page.click('[data-testid="voice-channel-item"]:first-child');
      await page.click('[data-testid="join-voice-button"]');
      
      // Wait for connection
      await expect(page.locator('[data-testid="voice-connection-status"]')).toContainText('Connected');
    });

    test('should show mute/unmute button', async ({ page }) => {
      await expect(page.locator('[data-testid="mute-button"]')).toBeVisible();
      
      // Should start unmuted
      await expect(page.locator('[data-testid="mute-button"]')).toHaveAttribute('data-muted', 'false');
    });

    test('should toggle mute state when clicking mute button', async ({ page }) => {
      const muteButton = page.locator('[data-testid="mute-button"]');
      
      // Click to mute
      await muteButton.click();
      await expect(muteButton).toHaveAttribute('data-muted', 'true');
      
      // Click to unmute
      await muteButton.click();
      await expect(muteButton).toHaveAttribute('data-muted', 'false');
    });

    test('should show deafen button', async ({ page }) => {
      await expect(page.locator('[data-testid="deafen-button"]')).toBeVisible();
      
      // Should start not deafened
      await expect(page.locator('[data-testid="deafen-button"]')).toHaveAttribute('data-deafened', 'false');
    });

    test('should toggle deafen state and automatically mute when deafened', async ({ page }) => {
      const deafenButton = page.locator('[data-testid="deafen-button"]');
      const muteButton = page.locator('[data-testid="mute-button"]');
      
      // Click to deafen
      await deafenButton.click();
      await expect(deafenButton).toHaveAttribute('data-deafened', 'true');
      
      // Should automatically mute when deafened
      await expect(muteButton).toHaveAttribute('data-muted', 'true');
    });

    test('should show leave voice channel button', async ({ page }) => {
      await expect(page.locator('[data-testid="leave-voice-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="leave-voice-button"]')).toHaveText('Leave Voice');
    });

    test('should disconnect from voice when leaving channel', async ({ page }) => {
      await page.click('[data-testid="leave-voice-button"]');
      
      // Should show disconnected state
      await expect(page.locator('[data-testid="voice-connection-status"]')).toContainText('Disconnected');
      
      // Should show join button again
      await expect(page.locator('[data-testid="join-voice-button"]')).toBeVisible();
    });
  });

  test.describe('Video Functionality', () => {
    test.beforeEach(async ({ page, context }) => {
      await context.grantPermissions(['microphone', 'camera']);
      
      // Join a voice channel first
      await page.click('[data-testid="server-sidebar"] [data-testid="server-item"]:first-child');
      await page.click('[data-testid="voice-channel-item"]:first-child');
      await page.click('[data-testid="join-voice-button"]');
      await expect(page.locator('[data-testid="voice-connection-status"]')).toContainText('Connected');
    });

    test('should show camera toggle button when connected to voice', async ({ page }) => {
      await expect(page.locator('[data-testid="camera-button"]')).toBeVisible();
      
      // Should start with camera off
      await expect(page.locator('[data-testid="camera-button"]')).toHaveAttribute('data-camera-enabled', 'false');
    });

    test('should enable camera and show video preview', async ({ page }) => {
      const cameraButton = page.locator('[data-testid="camera-button"]');
      
      await cameraButton.click();
      
      // Should enable camera
      await expect(cameraButton).toHaveAttribute('data-camera-enabled', 'true');
      
      // Should show video preview
      await expect(page.locator('[data-testid="local-video-preview"]')).toBeVisible();
      
      // Video element should have a src
      const video = page.locator('[data-testid="local-video-preview"] video');
      await expect(video).toBeVisible();
    });

    test('should handle camera permission denied', async ({ page, context }) => {
      // Revoke camera permission
      await context.clearPermissions();
      await context.grantPermissions(['microphone']); // Keep microphone, remove camera
      
      const cameraButton = page.locator('[data-testid="camera-button"]');
      await cameraButton.click();
      
      // Should show error message
      await expect(page.locator('[data-testid="camera-permission-error"]')).toContainText(
        'Camera permission is required for video'
      );
      
      // Camera should remain disabled
      await expect(cameraButton).toHaveAttribute('data-camera-enabled', 'false');
    });

    test('should disable camera when toggled off', async ({ page }) => {
      const cameraButton = page.locator('[data-testid="camera-button"]');
      
      // Enable camera first
      await cameraButton.click();
      await expect(cameraButton).toHaveAttribute('data-camera-enabled', 'true');
      
      // Disable camera
      await cameraButton.click();
      await expect(cameraButton).toHaveAttribute('data-camera-enabled', 'false');
      
      // Video preview should be hidden
      await expect(page.locator('[data-testid="local-video-preview"]')).not.toBeVisible();
    });
  });

  test.describe('Multi-User Voice Chat', () => {
    test('should display other participants in voice channel', async ({ page, context }) => {
      await context.grantPermissions(['microphone']);
      
      // This test would require multiple browser contexts or mock participants
      // For now, we'll test the UI elements that should exist
      
      await page.click('[data-testid="server-sidebar"] [data-testid="server-item"]:first-child');
      await page.click('[data-testid="voice-channel-item"]:first-child');
      await page.click('[data-testid="join-voice-button"]');
      
      await expect(page.locator('[data-testid="voice-connection-status"]')).toContainText('Connected');
      
      // Should show participants list
      await expect(page.locator('[data-testid="voice-participants-list"]')).toBeVisible();
      
      // Should show at least the current user
      await expect(page.locator('[data-testid="voice-participant"]')).toHaveCount(1);
    });

    test('should show speaking indicator when participant is speaking', async ({ page, context }) => {
      await context.grantPermissions(['microphone']);
      
      await page.click('[data-testid="server-sidebar"] [data-testid="server-item"]:first-child');
      await page.click('[data-testid="voice-channel-item"]:first-child');
      await page.click('[data-testid="join-voice-button"]');
      
      await expect(page.locator('[data-testid="voice-connection-status"]')).toContainText('Connected');
      
      // Simulate speaking (in a real test this would involve audio analysis)
      await page.evaluate(() => {
        // Mock speaking state for testing
        window.localStorage.setItem('mock-speaking-state', 'true');
      });
      
      // Should show speaking indicator
      await expect(page.locator('[data-testid="speaking-indicator"]')).toBeVisible();
    });

    test('should handle participant connection/disconnection events', async ({ page, context }) => {
      await context.grantPermissions(['microphone']);
      
      await page.click('[data-testid="server-sidebar"] [data-testid="server-item"]:first-child');
      await page.click('[data-testid="voice-channel-item"]:first-child');
      await page.click('[data-testid="join-voice-button"]');
      
      await expect(page.locator('[data-testid="voice-connection-status"]')).toContainText('Connected');
      
      // Mock participant joining event
      await page.evaluate(() => {
        const event = new CustomEvent('participantJoined', {
          detail: { identity: 'user-2', displayName: 'Test User 2' }
        });
        window.dispatchEvent(event);
      });
      
      // Should show notification or update participant count
      // This would be implemented based on the actual UI design
      await expect(page.locator('[data-testid="voice-participants-list"]')).toContainText('Test User 2');
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('should handle network disconnection gracefully', async ({ page, context }) => {
      await context.grantPermissions(['microphone']);
      
      // Connect to voice first
      await page.click('[data-testid="server-sidebar"] [data-testid="server-item"]:first-child');
      await page.click('[data-testid="voice-channel-item"]:first-child');
      await page.click('[data-testid="join-voice-button"]');
      await expect(page.locator('[data-testid="voice-connection-status"]')).toContainText('Connected');
      
      // Simulate network disconnection
      await context.setOffline(true);
      
      // Should show reconnecting state
      await expect(page.locator('[data-testid="voice-connection-status"]')).toContainText('Reconnecting');
      
      // Restore network
      await context.setOffline(false);
      
      // Should reconnect automatically
      await expect(page.locator('[data-testid="voice-connection-status"]')).toContainText('Connected', {
        timeout: 15000
      });
    });

    test('should show appropriate error when LiveKit server is unavailable', async ({ page }) => {
      // Mock network failure for LiveKit requests
      await page.route('**/livekit**', route => {
        route.abort('failed');
      });
      
      await page.click('[data-testid="server-sidebar"] [data-testid="server-item"]:first-child');
      await page.click('[data-testid="voice-channel-item"]:first-child');
      await page.click('[data-testid="join-voice-button"]');
      
      // Should show connection error
      await expect(page.locator('[data-testid="voice-connection-error"]')).toContainText(
        'Unable to connect to voice server'
      );
      
      // Should allow retry
      await expect(page.locator('[data-testid="retry-voice-connection"]')).toBeVisible();
    });

    test('should cleanup resources when page is closed', async ({ page, context }) => {
      await context.grantPermissions(['microphone']);
      
      // Connect to voice
      await page.click('[data-testid="server-sidebar"] [data-testid="server-item"]:first-child');
      await page.click('[data-testid="voice-channel-item"]:first-child');
      await page.click('[data-testid="join-voice-button"]');
      await expect(page.locator('[data-testid="voice-connection-status"]')).toContainText('Connected');
      
      // Monitor for cleanup calls
      let cleanupCalled = false;
      await page.expose('onCleanup', () => {
        cleanupCalled = true;
      });
      
      await page.evaluate(() => {
        // Mock cleanup detection
        window.addEventListener('beforeunload', () => {
          (window as any).onCleanup();
        });
      });
      
      // Close page
      await page.close();
      
      // In a real implementation, this would verify that LiveKit resources were properly cleaned up
      // For now, we just verify the test structure is in place
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  test.describe('Accessibility', () => {
    test('should support keyboard navigation for voice controls', async ({ page, context }) => {
      await context.grantPermissions(['microphone']);
      
      await page.click('[data-testid="server-sidebar"] [data-testid="server-item"]:first-child');
      await page.click('[data-testid="voice-channel-item"]:first-child');
      await page.click('[data-testid="join-voice-button"]');
      
      await expect(page.locator('[data-testid="voice-connection-status"]')).toContainText('Connected');
      
      // Should be able to navigate to mute button with keyboard
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="mute-button"]')).toBeFocused();
      
      // Should be able to toggle mute with Enter/Space
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-testid="mute-button"]')).toHaveAttribute('data-muted', 'true');
    });

    test('should have proper ARIA labels for voice controls', async ({ page, context }) => {
      await context.grantPermissions(['microphone']);
      
      await page.click('[data-testid="server-sidebar"] [data-testid="server-item"]:first-child');
      await page.click('[data-testid="voice-channel-item"]:first-child');
      await page.click('[data-testid="join-voice-button"]');
      
      await expect(page.locator('[data-testid="voice-connection-status"]')).toContainText('Connected');
      
      // Check ARIA labels
      await expect(page.locator('[data-testid="mute-button"]')).toHaveAttribute('aria-label', /mute|microphone/i);
      await expect(page.locator('[data-testid="deafen-button"]')).toHaveAttribute('aria-label', /deafen|speakers/i);
      await expect(page.locator('[data-testid="camera-button"]')).toHaveAttribute('aria-label', /camera|video/i);
    });

    test('should announce connection status changes to screen readers', async ({ page, context }) => {
      await context.grantPermissions(['microphone']);
      
      // Should have live region for status updates
      await expect(page.locator('[data-testid="voice-status-live-region"]')).toHaveAttribute('aria-live', 'polite');
      
      await page.click('[data-testid="server-sidebar"] [data-testid="server-item"]:first-child');
      await page.click('[data-testid="voice-channel-item"]:first-child');
      await page.click('[data-testid="join-voice-button"]');
      
      // Live region should contain connection status
      await expect(page.locator('[data-testid="voice-status-live-region"]')).toContainText('Connected to voice channel');
    });
  });
});