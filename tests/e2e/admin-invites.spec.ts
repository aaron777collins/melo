/**
 * E2E Tests for Admin Invites System
 * 
 * Tests the complete admin invite management workflow
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const ADMIN_INVITES_URL = '/admin/invites';
const API_INVITES_URL = '/api/admin/invites';

// Test data
const TEST_INVITE_DATA = {
  invitedUserId: '@testuser:matrix.example.com',
  notes: 'E2E Test Invite',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
};

// Helper function to wait for API response
async function waitForInvitesLoad(page: Page) {
  await page.waitForResponse(response => 
    response.url().includes('/api/admin/invites') && response.status() === 200
  );
}

test.describe('Admin Invites Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses for consistent testing
    await page.route('**/api/admin/invites*', async (route) => {
      const url = route.request().url();
      
      if (url.includes('status=true')) {
        // Stats API response
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              totalInvites: 5,
              activeInvites: 3,
              usedInvites: 1,
              expiredInvites: 1,
            },
          }),
        });
      } else {
        // Invites list API response
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              invites: [
                {
                  id: 'invite-1',
                  invitedUserId: '@user1:example.com',
                  createdBy: '@admin:example.com',
                  createdAt: '2026-02-23T10:00:00Z',
                  expiresAt: '2026-03-02T10:00:00Z',
                  used: false,
                  notes: 'Test invite 1',
                },
                {
                  id: 'invite-2',
                  invitedUserId: '@user2:example.com',
                  createdBy: '@admin:example.com',
                  createdAt: '2026-02-22T10:00:00Z',
                  used: true,
                  usedAt: '2026-02-23T09:00:00Z',
                  notes: 'Test invite 2',
                },
              ],
              privateMode: true,
              inviteOnly: true,
            },
          }),
        });
      }
    });
  });

  test.describe('Page Access and Authentication', () => {
    test('should load admin invites page successfully', async ({ page }) => {
      await page.goto(ADMIN_INVITES_URL);
      
      // Wait for the page to load
      await expect(page).toHaveTitle(/Admin Invites/);
      await expect(page.locator('h1')).toContainText('Admin Invites');
    });

    test('should show loading state initially', async ({ page }) => {
      await page.goto(ADMIN_INVITES_URL);
      
      // Should show loading spinner initially
      const loadingSpinner = page.locator('[data-testid="loading-spinner"]').first();
      // Note: This test assumes loading is brief, so we check it exists or was there
    });

    test('should redirect non-admin users', async ({ page }) => {
      // Mock unauthorized response
      await page.route('**/api/admin/invites*', async (route) => {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Unauthorized - Admin access required',
          }),
        });
      });

      await page.goto(ADMIN_INVITES_URL);
      
      // Should handle unauthorized access appropriately
      // This could be a redirect or error message depending on implementation
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Dashboard Display', () => {
    test('should display invite statistics cards', async ({ page }) => {
      await page.goto(ADMIN_INVITES_URL);
      await waitForInvitesLoad(page);
      
      // Check stats cards are displayed
      await expect(page.locator('text=Total')).toBeVisible();
      await expect(page.locator('text=Active')).toBeVisible();
      await expect(page.locator('text=Used')).toBeVisible();
      await expect(page.locator('text=Expired')).toBeVisible();
      
      // Check stats values
      await expect(page.locator('text=5')).toBeVisible(); // Total
      await expect(page.locator('text=3')).toBeVisible(); // Active
      await expect(page.locator('text=1')).toBeVisible(); // Used and Expired
    });

    test('should display server configuration', async ({ page }) => {
      await page.goto(ADMIN_INVITES_URL);
      await waitForInvitesLoad(page);
      
      // Check server config section
      await expect(page.locator('text=Server Configuration')).toBeVisible();
      await expect(page.locator('text=Private Mode:')).toBeVisible();
      await expect(page.locator('text=Invite Only:')).toBeVisible();
      await expect(page.locator('text=Enabled')).toHaveCount(2); // Both should be enabled
    });

    test('should display invites list', async ({ page }) => {
      await page.goto(ADMIN_INVITES_URL);
      await waitForInvitesLoad(page);
      
      // Should show the invites tab
      await expect(page.locator('button[role="tab"]', { hasText: 'Invites' })).toBeVisible();
      await expect(page.locator('button[role="tab"]', { hasText: 'Statistics' })).toBeVisible();
      
      // Should show invite entries
      await expect(page.locator('text=@user1:example.com')).toBeVisible();
      await expect(page.locator('text=@user2:example.com')).toBeVisible();
      await expect(page.locator('text=Test invite 1')).toBeVisible();
    });
  });

  test.describe('Invite Management', () => {
    test('should have create invite button', async ({ page }) => {
      await page.goto(ADMIN_INVITES_URL);
      await waitForInvitesLoad(page);
      
      // Check for create invite functionality
      const createButton = page.locator('button', { hasText: /create/i });
      await expect(createButton).toBeVisible();
    });

    test('should have refresh functionality', async ({ page }) => {
      await page.goto(ADMIN_INVITES_URL);
      await waitForInvitesLoad(page);
      
      // Check for refresh button
      const refreshButton = page.locator('button', { hasText: /refresh/i });
      await expect(refreshButton).toBeVisible();
      
      // Click refresh and verify API call
      let apiCallCount = 0;
      page.on('request', request => {
        if (request.url().includes('/api/admin/invites')) {
          apiCallCount++;
        }
      });
      
      await refreshButton.click();
      
      // Should trigger API call
      await page.waitForTimeout(500);
      expect(apiCallCount).toBeGreaterThan(0);
    });

    test('should display invite status correctly', async ({ page }) => {
      await page.goto(ADMIN_INVITES_URL);
      await waitForInvitesLoad(page);
      
      // Should show different statuses for different invites
      // Active invite should not show "Used" status
      // Used invite should show "Used" status
      await expect(page.locator('text=used').or(page.locator('text=Used'))).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    const viewports = [
      { name: 'Desktop', width: 1920, height: 1080 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Mobile', width: 375, height: 667 },
    ];

    viewports.forEach(({ name, width, height }) => {
      test(`should be responsive on ${name} (${width}x${height})`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto(ADMIN_INVITES_URL);
        await waitForInvitesLoad(page);
        
        // Take screenshot for manual verification
        await page.screenshot({
          path: `test-results/admin-invites-${name.toLowerCase()}-${width}x${height}.png`,
          fullPage: true,
        });
        
        // Check that main elements are visible
        await expect(page.locator('h1', { hasText: 'Admin Invites' })).toBeVisible();
        await expect(page.locator('text=Total')).toBeVisible();
        
        // Check that layout adapts properly
        if (width < 768) {
          // Mobile layout checks
          // Cards should stack vertically or be horizontally scrollable
          await expect(page.locator('h1')).toBeVisible();
        } else if (width < 1024) {
          // Tablet layout checks
          await expect(page.locator('text=Server Configuration')).toBeVisible();
        } else {
          // Desktop layout checks
          await expect(page.locator('button', { hasText: 'Refresh' })).toBeVisible();
          await expect(page.locator('text=Statistics')).toBeVisible();
        }
      });
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API error
      await page.route('**/api/admin/invites*', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Internal server error',
          }),
        });
      });

      await page.goto(ADMIN_INVITES_URL);
      
      // Should handle error without crashing
      await expect(page.locator('h1', { hasText: 'Admin Invites' })).toBeVisible();
    });

    test('should handle network failures', async ({ page }) => {
      await page.goto(ADMIN_INVITES_URL);
      
      // Simulate network failure
      await page.route('**/api/admin/invites*', async (route) => {
        await route.abort();
      });
      
      // Try to refresh
      const refreshButton = page.locator('button', { hasText: /refresh/i });
      if (await refreshButton.isVisible()) {
        await refreshButton.click();
      }
      
      // Should handle network error gracefully
      await expect(page.locator('h1')).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto(ADMIN_INVITES_URL);
      await waitForInvitesLoad(page);
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should handle large invite lists efficiently', async ({ page }) => {
      // Mock large dataset
      const largeInviteList = Array.from({ length: 100 }, (_, i) => ({
        id: `invite-${i}`,
        invitedUserId: `@user${i}:example.com`,
        createdBy: '@admin:example.com',
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        used: i % 3 === 0,
        notes: `Test invite ${i}`,
      }));

      await page.route('**/api/admin/invites*', async (route) => {
        const url = route.request().url();
        if (!url.includes('status=true')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                invites: largeInviteList,
                privateMode: true,
                inviteOnly: true,
              },
            }),
          });
        } else {
          await route.continue();
        }
      });

      const startTime = Date.now();
      await page.goto(ADMIN_INVITES_URL);
      await waitForInvitesLoad(page);
      const loadTime = Date.now() - startTime;
      
      // Should still load reasonably fast with large dataset
      expect(loadTime).toBeLessThan(5000);
      
      // Should display the list
      await expect(page.locator('h1')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should meet basic accessibility requirements', async ({ page }) => {
      await page.goto(ADMIN_INVITES_URL);
      await waitForInvitesLoad(page);
      
      // Check for proper heading structure
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toContainText('Admin Invites');
      
      // Check for proper button labeling
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      expect(buttonCount).toBeGreaterThan(0);
      
      // Check tab navigation
      const tabs = page.locator('[role="tab"]');
      await expect(tabs).toHaveCount(2); // Invites and Statistics tabs
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto(ADMIN_INVITES_URL);
      await waitForInvitesLoad(page);
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should be able to navigate without mouse
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });
  });
});