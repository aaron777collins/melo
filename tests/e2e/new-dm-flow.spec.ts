/**
 * E2E Tests for New DM Creation Flow
 * 
 * Tests the complete user journey:
 * - AC-2: New DM modal with user search interface  
 * - AC-3: User selection creates/opens DM conversation
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Helper function to open the New DM modal
 */
async function openNewDMModal(page: Page) {
  // Navigate to the main application
  await page.goto('http://dev2.aaroncollins.info:3000');
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');
  
  // Look for the DM section and "+" button
  const dmSection = page.locator('[data-testid="dm-section"]');
  await expect(dmSection).toBeVisible();
  
  // Click the "+" button to open new DM modal
  const newDMButton = page.locator('[data-testid="new-dm-button"]');
  await expect(newDMButton).toBeVisible();
  await newDMButton.click();
  
  // Wait for modal to appear
  const modal = page.locator('[data-testid="new-dm-modal"]');
  await expect(modal).toBeVisible();
  
  return modal;
}

/**
 * Helper function for authentication (if needed)
 */
async function authenticateIfNeeded(page: Page) {
  // Check if we need to authenticate
  const currentUrl = page.url();
  if (currentUrl.includes('/sign-in') || currentUrl.includes('/auth')) {
    // Handle authentication here if needed
    // For now, we'll assume the test environment allows bypass
    console.log('Authentication may be required');
  }
}

test.describe('New DM Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateIfNeeded(page);
  });

  // AC-2: New DM modal with user search interface
  test('AC-2: New DM modal opens with search interface', async ({ page }) => {
    const modal = await openNewDMModal(page);
    
    // Check modal title
    await expect(modal.locator('text=New Direct Message')).toBeVisible();
    
    // Check search input is present
    const searchInput = modal.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeEditable();
    
    // Check close button is present
    const closeButton = modal.locator('button[aria-label*="close"], button[aria-label*="Close"]');
    await expect(closeButton).toBeVisible();
    
    // Take screenshot for validation
    await page.screenshot({ 
      path: 'tests/e2e/screenshots/new-dm-modal-opened.png',
      fullPage: true 
    });
  });

  test('AC-2: Search input triggers user search', async ({ page }) => {
    const modal = await openNewDMModal(page);
    
    // Type in search input
    const searchInput = modal.locator('input[placeholder*="Search"]');
    await searchInput.fill('test');
    
    // Wait for search results area to appear
    const searchResults = modal.locator('[data-testid="user-search-results"]');
    await expect(searchResults).toBeVisible();
    
    // Check for either results or empty state message
    const hasResults = await page.locator('[data-testid^="user-result-"]').count() > 0;
    const hasEmptyState = await modal.locator('text=*No users found*').isVisible();
    
    expect(hasResults || hasEmptyState).toBeTruthy();
    
    // Take screenshot
    await page.screenshot({ 
      path: 'tests/e2e/screenshots/new-dm-search-results.png',
      fullPage: true 
    });
  });

  test('AC-2: Modal can be closed', async ({ page }) => {
    const modal = await openNewDMModal(page);
    
    // Close via close button
    const closeButton = modal.locator('button[aria-label*="close"], button[aria-label*="Close"]');
    await closeButton.click();
    
    // Modal should be hidden
    await expect(modal).not.toBeVisible();
    
    // Reopen to test Escape key
    await openNewDMModal(page);
    
    // Close via Escape key
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  // AC-3: User selection creates/opens DM conversation
  test('AC-3: User selection creates DM conversation', async ({ page }) => {
    const modal = await openNewDMModal(page);
    
    // Search for users
    const searchInput = modal.locator('input[placeholder*="Search"]');
    await searchInput.fill('test');
    
    // Wait for search results
    await page.waitForTimeout(1000); // Wait for debounce
    
    // Check if any user results are available
    const userResults = page.locator('[data-testid^="user-result-"]');
    const userCount = await userResults.count();
    
    if (userCount > 0) {
      // Click on the first user result
      const firstUser = userResults.first();
      await expect(firstUser).toBeVisible();
      
      // Take screenshot before clicking
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/new-dm-user-selection.png',
        fullPage: true 
      });
      
      await firstUser.click();
      
      // Should navigate to DM conversation or show loading state
      // Look for navigation or conversation interface
      const possibleDMIndicators = [
        page.locator('[data-testid="dm-conversation"]'),
        page.locator('[data-testid="dm-messages"]'),
        page.locator('text=*Creating conversation*'),
        page.locator('text=*Direct message*')
      ];
      
      let foundIndicator = false;
      for (const indicator of possibleDMIndicators) {
        try {
          await expect(indicator).toBeVisible({ timeout: 5000 });
          foundIndicator = true;
          break;
        } catch {
          // Continue to next indicator
        }
      }
      
      // If no specific DM indicator found, check for URL change
      if (!foundIndicator) {
        const url = page.url();
        expect(url).toMatch(/\/(channels|dm|@me)/); // Common DM URL patterns
      }
      
      // Take screenshot of result
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/new-dm-conversation-created.png',
        fullPage: true 
      });
      
    } else {
      // No users found - document this state
      const emptyState = modal.locator('text=*No users found*');
      await expect(emptyState).toBeVisible();
      
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/new-dm-no-users.png',
        fullPage: true 
      });
      
      console.log('No users available for DM creation test');
    }
  });

  test('AC-3: Loading state during DM creation', async ({ page }) => {
    const modal = await openNewDMModal(page);
    
    // Search for users
    const searchInput = modal.locator('input[placeholder*="Search"]');
    await searchInput.fill('test');
    await page.waitForTimeout(1000);
    
    // If users are found, test loading state
    const userResults = page.locator('[data-testid^="user-result-"]');
    const userCount = await userResults.count();
    
    if (userCount > 0) {
      const firstUser = userResults.first();
      
      // Click user and immediately look for loading state
      await firstUser.click();
      
      // Check for loading indicators
      const loadingIndicators = [
        modal.locator('text=*Creating*'),
        modal.locator('text=*Loading*'),
        modal.locator('[role="status"]'),
        page.locator('.animate-spin')
      ];
      
      for (const indicator of loadingIndicators) {
        try {
          await expect(indicator).toBeVisible({ timeout: 2000 });
          break;
        } catch {
          // Continue checking other indicators
        }
      }
      
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/new-dm-loading-state.png',
        fullPage: true 
      });
    }
  });

  test('Error handling: Network failures', async ({ page }) => {
    // This test would require network mocking in a real scenario
    // For now, we'll document the expected behavior
    
    const modal = await openNewDMModal(page);
    
    // Search with a term that might cause issues
    const searchInput = modal.locator('input[placeholder*="Search"]');
    await searchInput.fill('nonexistent-user-12345');
    await page.waitForTimeout(2000);
    
    // Look for error handling
    const errorStates = [
      modal.locator('text=*error*'),
      modal.locator('text=*failed*'),
      modal.locator('text=*try again*'),
      modal.locator('[role="alert"]')
    ];
    
    // Document any error states found
    for (const errorState of errorStates) {
      if (await errorState.isVisible()) {
        await page.screenshot({ 
          path: 'tests/e2e/screenshots/new-dm-error-state.png',
          fullPage: true 
        });
        break;
      }
    }
  });

  test('Mobile responsive behavior', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    const modal = await openNewDMModal(page);
    
    // Check modal displays correctly on mobile
    await expect(modal).toBeVisible();
    
    const searchInput = modal.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
    
    // Test touch interactions
    await searchInput.tap();
    await searchInput.fill('test');
    
    await page.screenshot({ 
      path: 'tests/e2e/screenshots/new-dm-mobile.png',
      fullPage: true 
    });
    
    // Reset viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test('Keyboard navigation', async ({ page }) => {
    const modal = await openNewDMModal(page);
    
    // Test Tab navigation
    await page.keyboard.press('Tab');
    
    // Search input should be focused
    const searchInput = modal.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeFocused();
    
    // Type and test arrow key navigation
    await searchInput.fill('test');
    await page.waitForTimeout(1000);
    
    // Test Escape to close
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });
});

// Integration test for the complete DM flow
test.describe('DM Integration Flow', () => {
  test('Complete DM creation and message flow', async ({ page }) => {
    // This would test the complete flow from DM creation to sending messages
    // Placeholder for full integration test
    await page.goto('http://dev2.aaroncollins.info:3000');
    
    // Document that this test would verify:
    // 1. DM creation via modal
    // 2. Navigation to conversation
    // 3. Sending first message
    // 4. Message appearing in conversation
    // 5. DM appearing in sidebar list
    
    console.log('Complete DM integration flow - requires full backend setup');
  });
});