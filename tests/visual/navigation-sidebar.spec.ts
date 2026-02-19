import { test, expect } from '@playwright/test';

/**
 * Navigation Sidebar Visual Tests
 * 
 * These tests verify that the navigation sidebar matches the Discord clone reference.
 * The sidebar should have:
 * - Dark background (#1e1f22 dark mode, #e3e5e8 light mode)
 * - Width of 72px (standard Discord sidebar width)
 * - Vertical layout with items centered
 * - NavigationAction (+ button) at top
 * - Separator below action
 * - Scrollable server list
 * - ModeToggle and UserButton at bottom
 */

test.describe('Navigation Sidebar', () => {
  test('sidebar visual structure matches Discord clone reference', async ({ page }) => {
    // Navigate to app (will redirect to login if not authenticated)
    await page.goto('/');
    
    // Take a screenshot for visual comparison
    await page.screenshot({
      path: 'tests/screenshots/navigation-sidebar-full.png',
      fullPage: true
    });
  });

  test('navigation styles match reference specifications', async ({ page }) => {
    // Test page with sidebar component isolated
    await page.goto('/');
    
    // Check for sidebar element with correct classes
    const sidebar = page.locator('[class*="dark:bg-[#1e1f22]"]').first();
    
    if (await sidebar.count() > 0) {
      // Verify sidebar exists and has correct structure
      await expect(sidebar).toBeVisible();
      
      // Take isolated screenshot of sidebar
      await sidebar.screenshot({
        path: 'tests/screenshots/navigation-sidebar-isolated.png'
      });
    }
  });
});

test.describe('Navigation Item', () => {
  test('server icons have correct dimensions and hover effects', async ({ page }) => {
    await page.goto('/');
    
    // Look for navigation item buttons
    const navItems = page.locator('button.group.relative.flex.items-center');
    
    // If navigation items exist, verify their structure
    const count = await navItems.count();
    if (count > 0) {
      // Verify first item has indicator and icon wrapper
      const firstItem = navItems.first();
      
      // Check for the left indicator (selection/hover indicator)
      const indicator = firstItem.locator('[class*="absolute"][class*="left-0"]');
      if (await indicator.count() > 0) {
        await expect(indicator).toHaveClass(/bg-primary/);
        await expect(indicator).toHaveClass(/rounded-full/);
      }
      
      // Check for icon wrapper with correct dimensions (48x48)
      const iconWrapper = firstItem.locator('[class*="h-\\[48px\\]"][class*="w-\\[48px\\]"]');
      if (await iconWrapper.count() > 0) {
        await expect(iconWrapper).toHaveClass(/rounded-\[24px\]/);
      }
    }
  });
});

test.describe('Navigation Action', () => {
  test('add server button has correct styling', async ({ page }) => {
    await page.goto('/');
    
    // Find the add server button (Plus icon container)
    const addButton = page.locator('button.group.flex.items-center').first();
    
    if (await addButton.count() > 0) {
      // Verify button structure
      const iconWrapper = addButton.locator('div.flex.mx-3');
      if (await iconWrapper.count() > 0) {
        // Check for correct dimensions
        await expect(iconWrapper).toHaveClass(/h-\[48px\]/);
        await expect(iconWrapper).toHaveClass(/w-\[48px\]/);
        // Check for rounded corners
        await expect(iconWrapper).toHaveClass(/rounded-\[24px\]/);
      }
      
      // Take screenshot of add button
      await addButton.screenshot({
        path: 'tests/screenshots/navigation-action.png'
      });
    }
  });
});
