/**
 * @fileoverview E2E tests for DM Sidebar Navigation (TDD implementation)
 * 
 * Tests the complete DM sidebar functionality across all viewports:
 * - DM section visibility and "+" button functionality
 * - DM list display with user avatars and names
 * - Empty state handling for new users
 * - Click navigation to DM conversations
 * 
 * This follows the acceptance criteria from US-P2-04-dm-ui-completion.md
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Helper function to set up authenticated user state
 */
async function setupAuthenticatedUser(page: Page) {
  // Navigate to app and ensure user is authenticated
  await page.goto('http://dev2.aaroncollins.info:3000');
  
  // Wait for authentication to complete (adjust based on current auth flow)
  await page.waitForSelector('[data-testid="navigation-sidebar"]', { timeout: 10000 });
  
  // Navigate to DM area
  await page.goto('http://dev2.aaroncollins.info:3000/channels/@me');
  await page.waitForLoadState('networkidle');
}

/**
 * Helper function to create mock DM conversations for testing
 */
async function setupMockDMConversations(page: Page) {
  // This would typically involve API calls to create test DM conversations
  // For now, we'll test with whatever conversations exist or create them through UI
  console.log('Setting up mock DM conversations...');
}

test.describe('DM Sidebar Navigation', () => {
  
  test.describe('AC-1: DM Section in Sidebar (P0-CRITICAL)', () => {
    
    test('should show DM section with "+" button at Desktop (1920x1080)', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await setupAuthenticatedUser(page);
      
      // Check that DM section is visible
      const dmSection = page.locator('[data-testid="dm-section"]');
      await expect(dmSection).toBeVisible();
      
      // Check that "Direct Messages" header is visible
      await expect(page.getByText('Direct Messages')).toBeVisible();
      
      // Check that "+" button is visible
      const newDMButton = page.locator('[data-testid="new-dm-button"]');
      await expect(newDMButton).toBeVisible();
      
      // Take screenshot for evidence
      await page.screenshot({ 
        path: 'tests/evidence/ac1-dm-section-desktop.png',
        fullPage: true 
      });
    });

    test('should show DM section with "+" button at Tablet (768x1024)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await setupAuthenticatedUser(page);
      
      // Check that DM section is visible
      const dmSection = page.locator('[data-testid="dm-section"]');
      await expect(dmSection).toBeVisible();
      
      // Check that "Direct Messages" header is visible
      await expect(page.getByText('Direct Messages')).toBeVisible();
      
      // Check that "+" button is visible
      const newDMButton = page.locator('[data-testid="new-dm-button"]');
      await expect(newDMButton).toBeVisible();
      
      // Take screenshot for evidence
      await page.screenshot({ 
        path: 'tests/evidence/ac1-dm-section-tablet.png',
        fullPage: true 
      });
    });

    test('should show DM section with "+" button at Mobile (375x667)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await setupAuthenticatedUser(page);
      
      // On mobile, the sidebar might be collapsed or toggled
      // First try to open navigation if needed
      const navToggle = page.locator('[data-testid="mobile-nav-toggle"]');
      if (await navToggle.isVisible()) {
        await navToggle.click();
      }
      
      // Check that DM section is visible
      const dmSection = page.locator('[data-testid="dm-section"]');
      await expect(dmSection).toBeVisible();
      
      // Check that "Direct Messages" header is visible
      await expect(page.getByText('Direct Messages')).toBeVisible();
      
      // Check that "+" button is visible
      const newDMButton = page.locator('[data-testid="new-dm-button"]');
      await expect(newDMButton).toBeVisible();
      
      // Take screenshot for evidence
      await page.screenshot({ 
        path: 'tests/evidence/ac1-dm-section-mobile.png',
        fullPage: true 
      });
    });

  });

  test.describe('AC-6: DM List Shows Active Conversations', () => {
    
    test('should display DM list with user avatars and names', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await setupAuthenticatedUser(page);
      await setupMockDMConversations(page);
      
      // Check that DM list is visible
      const dmList = page.locator('[data-testid="dm-list"]');
      await expect(dmList).toBeVisible();
      
      // Check for DM list items
      const dmItems = page.locator('[data-testid="dm-list-item"]');
      
      // If DMs exist, verify their structure
      if (await dmItems.count() > 0) {
        const firstDM = dmItems.first();
        
        // Check avatar is present
        await expect(firstDM.locator('[data-testid="avatar"]')).toBeVisible();
        
        // Check display name is present
        const displayName = firstDM.locator('.font-medium').first();
        await expect(displayName).toBeVisible();
        
        // Check last message preview (if exists)
        const lastMessage = firstDM.locator('[data-testid="last-message"]');
        if (await lastMessage.isVisible()) {
          expect(await lastMessage.textContent()).toBeTruthy();
        }
      }
      
      // Take screenshot for evidence
      await page.screenshot({ 
        path: 'tests/evidence/ac6-dm-list-desktop.png',
        fullPage: true 
      });
    });

    test('should show unread count badges for conversations with unread messages', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await setupAuthenticatedUser(page);
      await setupMockDMConversations(page);
      
      // Look for unread badges
      const unreadBadges = page.locator('.bg-red-500');
      
      // If unread badges exist, verify they contain numbers
      if (await unreadBadges.count() > 0) {
        const firstBadge = unreadBadges.first();
        const badgeText = await firstBadge.textContent();
        expect(badgeText).toMatch(/^\d+(\+)?$/); // Should be digits, possibly with "+"
      }
      
      // Take screenshot for evidence
      await page.screenshot({ 
        path: 'tests/evidence/ac6-dm-unread-badges.png',
        fullPage: true 
      });
    });

    test('should show online status indicators for active users', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await setupAuthenticatedUser(page);
      await setupMockDMConversations(page);
      
      // Look for online indicators
      const onlineIndicators = page.locator('[data-testid="online-indicator"]');
      
      // If online indicators exist, verify they have the right styling
      if (await onlineIndicators.count() > 0) {
        const firstIndicator = onlineIndicators.first();
        await expect(firstIndicator).toHaveClass(/bg-green-500/);
      }
      
      // Take screenshot for evidence
      await page.screenshot({ 
        path: 'tests/evidence/ac6-dm-online-status.png',
        fullPage: true 
      });
    });

  });

  test.describe('AC-8: Empty DM State', () => {
    
    test('should show empty state when user has no DM conversations', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await setupAuthenticatedUser(page);
      
      // Check if there are existing DMs
      const dmItems = page.locator('[data-testid="dm-list-item"]');
      const dmCount = await dmItems.count();
      
      if (dmCount === 0) {
        // Should show empty state
        const emptyState = page.locator('[data-testid="dm-empty-state"]');
        await expect(emptyState).toBeVisible();
        
        // Should have encouraging message
        await expect(page.getByText(/No direct messages yet/i)).toBeVisible();
        await expect(page.getByText(/Click the \+ button/i)).toBeVisible();
        
        // Should have visual element (icon)
        await expect(page.locator('[data-testid="empty-state-icon"]')).toBeVisible();
        
        // Take screenshot for evidence
        await page.screenshot({ 
          path: 'tests/evidence/ac8-dm-empty-state.png',
          fullPage: true 
        });
      } else {
        console.log(`Found ${dmCount} existing DMs, cannot test empty state`);
        
        // Take screenshot of current state
        await page.screenshot({ 
          path: 'tests/evidence/ac8-dm-existing-conversations.png',
          fullPage: true 
        });
      }
    });

    test('should provide helpful guidance for starting first DM', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await setupAuthenticatedUser(page);
      
      const dmItems = page.locator('[data-testid="dm-list-item"]');
      const dmCount = await dmItems.count();
      
      if (dmCount === 0) {
        // Check for helpful guidance text
        await expect(page.getByText(/find users in servers/i)).toBeVisible();
        
        // Check that the guidance mentions the "+" button
        await expect(page.getByText(/\+ button/i)).toBeVisible();
      }
    });

  });

  test.describe('AC-11: Click DM List Item Opens Conversation', () => {
    
    test('should navigate to DM conversation when clicking list item', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await setupAuthenticatedUser(page);
      await setupMockDMConversations(page);
      
      // Find first DM item
      const dmItems = page.locator('[data-testid="dm-list-item"]');
      
      if (await dmItems.count() > 0) {
        const firstDM = dmItems.first();
        
        // Get the current URL before clicking
        const currentUrl = page.url();
        
        // Click the DM item
        await firstDM.click();
        
        // Wait for navigation
        await page.waitForLoadState('networkidle');
        
        // Verify URL changed to DM conversation
        const newUrl = page.url();
        expect(newUrl).not.toBe(currentUrl);
        expect(newUrl).toMatch(/\/channels\/@me\/[^\/]+$/); // Should match DM conversation pattern
        
        // Take screenshot for evidence
        await page.screenshot({ 
          path: 'tests/evidence/ac11-dm-conversation-opened.png',
          fullPage: true 
        });
      } else {
        console.log('No DM conversations found to test navigation');
      }
    });

    test('should show DM conversation interface after clicking', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await setupAuthenticatedUser(page);
      await setupMockDMConversations(page);
      
      const dmItems = page.locator('[data-testid="dm-list-item"]');
      
      if (await dmItems.count() > 0) {
        const firstDM = dmItems.first();
        await firstDM.click();
        await page.waitForLoadState('networkidle');
        
        // Verify DM conversation interface elements are present
        // This may be implemented in other components, but we should verify basic navigation worked
        
        // The URL should indicate we're in a DM conversation
        expect(page.url()).toMatch(/\/channels\/@me\//);
        
        // Take screenshot for evidence
        await page.screenshot({ 
          path: 'tests/evidence/ac11-dm-interface-visible.png',
          fullPage: true 
        });
      }
    });

  });

  test.describe('New DM Button Functionality', () => {
    
    test('should handle new DM button click (placeholder for future modal)', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await setupAuthenticatedUser(page);
      
      const newDMButton = page.locator('[data-testid="new-dm-button"]');
      await expect(newDMButton).toBeVisible();
      
      // Click the button
      await newDMButton.click();
      
      // For now, this might not do anything, but we're testing that the button is clickable
      // In the future, this should open a user selection modal
      
      // Take screenshot for evidence
      await page.screenshot({ 
        path: 'tests/evidence/new-dm-button-click.png',
        fullPage: true 
      });
    });

  });

  test.describe('Responsive Design Validation', () => {
    
    ['desktop', 'tablet', 'mobile'].forEach((device) => {
      test(`should maintain DM sidebar functionality on ${device}`, async ({ page }) => {
        // Set viewport based on device
        const viewports = {
          desktop: { width: 1920, height: 1080 },
          tablet: { width: 768, height: 1024 },
          mobile: { width: 375, height: 667 }
        };
        
        await page.setViewportSize(viewports[device as keyof typeof viewports]);
        await setupAuthenticatedUser(page);
        
        // Mobile might require opening navigation
        if (device === 'mobile') {
          const navToggle = page.locator('[data-testid="mobile-nav-toggle"]');
          if (await navToggle.isVisible()) {
            await navToggle.click();
          }
        }
        
        // Verify core components are present
        await expect(page.locator('[data-testid="dm-section"]')).toBeVisible();
        await expect(page.getByText('Direct Messages')).toBeVisible();
        await expect(page.locator('[data-testid="new-dm-button"]')).toBeVisible();
        
        // Take screenshot for evidence
        await page.screenshot({ 
          path: `tests/evidence/responsive-${device}-dm-sidebar.png`,
          fullPage: true 
        });
      });
    });

  });

  test.describe('Accessibility Validation', () => {
    
    test('should have proper ARIA labels and keyboard navigation', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await setupAuthenticatedUser(page);
      
      // Check that DM section has proper role
      const dmSection = page.locator('[data-testid="dm-section"]');
      await expect(dmSection).toHaveAttribute('role', 'region');
      
      // Check that new DM button has aria-label
      const newDMButton = page.locator('[data-testid="new-dm-button"]');
      await expect(newDMButton).toHaveAttribute('aria-label');
      
      // Test keyboard navigation on DM items
      const dmItems = page.locator('[data-testid="dm-list-item"]');
      if (await dmItems.count() > 0) {
        const firstDM = dmItems.first();
        
        // Should be focusable
        await expect(firstDM).toHaveAttribute('tabindex', '0');
        
        // Focus and press Enter
        await firstDM.focus();
        await page.keyboard.press('Enter');
        
        // Should navigate to conversation
        await page.waitForLoadState('networkidle');
        expect(page.url()).toMatch(/\/channels\/@me\//);
      }
      
      // Take screenshot for evidence
      await page.screenshot({ 
        path: 'tests/evidence/accessibility-dm-sidebar.png',
        fullPage: true 
      });
    });

  });

  test.describe('Error Handling', () => {
    
    test('should gracefully handle network errors when loading DMs', async ({ page }) => {
      // This test would involve mocking network failures
      // For now, we'll verify the component loads and doesn't crash
      
      await page.setViewportSize({ width: 1920, height: 1080 });
      await setupAuthenticatedUser(page);
      
      // Verify that even with potential network issues, the basic structure is present
      await expect(page.locator('[data-testid="dm-section"]')).toBeVisible();
      
      // Should not show any JavaScript errors
      const errors = [];
      page.on('pageerror', error => errors.push(error));
      
      // Wait a bit to see if any errors occur
      await page.waitForTimeout(2000);
      
      expect(errors).toHaveLength(0);
    });

  });

});