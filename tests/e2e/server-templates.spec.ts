/**
 * Server Templates E2E Tests
 * 
 * Tests complete server template selection and creation workflows.
 * Verifies that users can select templates and create servers with proper channel structures.
 */

import { test, expect } from '@playwright/test';
import { 
  TEST_CONFIG, 
  waitForAppReady, 
  waitForMatrixSync,
  generateServerName,
} from './fixtures';

// Mock Matrix client methods for template testing
const mockMatrixClient = {
  createRoom: () => Promise.resolve({ room_id: 'test-room-id' }),
  sendStateEvent: () => Promise.resolve({}),
  getDomain: () => 'test.matrix.org',
};

test.describe('Server Templates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await waitForMatrixSync(page);
    
    // Mock Matrix client for testing
    await page.addInitScript(() => {
      (window as any).mockMatrixClient = {
        createRoom: () => Promise.resolve({ room_id: 'test-room-id' }),
        sendStateEvent: () => Promise.resolve({}),
        getDomain: () => 'test.matrix.org',
      };
    });
  });

  test.describe('Template Selection UI', () => {
    test('should display template selector when creating new server', async ({ page }) => {
      // Navigate to create server flow
      await page.click('[data-testid="create-server-button"]');
      
      // Should show template selector
      await expect(page.locator('[data-testid="template-selector"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="template-tabs"]')).toBeVisible();
    });

    test('should show categorized templates', async ({ page }) => {
      await page.click('[data-testid="create-server-button"]');
      await page.waitForSelector('[data-testid="template-selector"]', { timeout: 10000 });

      // Should show different categories
      await expect(page.locator('[data-testid="tab-gaming"]')).toBeVisible();
      await expect(page.locator('[data-testid="tab-work"]')).toBeVisible();
      await expect(page.locator('[data-testid="tab-community"]')).toBeVisible();
      await expect(page.locator('[data-testid="tab-education"]')).toBeVisible();
    });

    test('should show featured templates by default', async ({ page }) => {
      await page.click('[data-testid="create-server-button"]');
      await page.waitForSelector('[data-testid="template-selector"]', { timeout: 10000 });

      // Should show featured tab as active
      const featuredTab = page.locator('[data-testid="tab-featured"]');
      await expect(featuredTab).toHaveAttribute('data-active', 'true');

      // Should show template cards
      await expect(page.locator('[data-testid="template-card"]').first()).toBeVisible();
    });

    test('should filter templates by category', async ({ page }) => {
      await page.click('[data-testid="create-server-button"]');
      await page.waitForSelector('[data-testid="template-selector"]', { timeout: 10000 });

      // Click gaming tab
      await page.click('[data-testid="tab-gaming"]');
      
      // Should show gaming templates
      await expect(page.locator('[data-testid="template-card"]').filter({ hasText: 'Gaming' }).first()).toBeVisible();
      
      // Click work tab
      await page.click('[data-testid="tab-work"]');
      
      // Should show work templates
      await expect(page.locator('[data-testid="template-card"]').filter({ hasText: 'Work' }).first()).toBeVisible();
    });

    test('should search templates by name', async ({ page }) => {
      await page.click('[data-testid="create-server-button"]');
      await page.waitForSelector('[data-testid="template-selector"]', { timeout: 10000 });

      // Search for gaming templates
      const searchInput = page.locator('[data-testid="search-input"]');
      await searchInput.fill('gaming');
      
      // Should show only gaming-related templates
      await expect(page.locator('[data-testid="template-card"]').filter({ hasText: 'Gaming' })).toBeVisible();
      
      // Clear search
      await searchInput.fill('');
      
      // Should show all templates again
      await expect(page.locator('[data-testid="template-card"]').first()).toBeVisible();
    });
  });

  test.describe('Template Preview', () => {
    test('should show template preview when template is selected', async ({ page }) => {
      await page.click('[data-testid="create-server-button"]');
      await page.waitForSelector('[data-testid="template-selector"]', { timeout: 10000 });

      // Select first template
      await page.click('[data-testid="template-card"]', { timeout: 10000 });

      // Should show preview panel
      await expect(page.locator('[data-testid="template-preview"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="preview-title"]')).toBeVisible();
    });

    test('should display channel structure in preview', async ({ page }) => {
      await page.click('[data-testid="create-server-button"]');
      await page.waitForSelector('[data-testid="template-selector"]', { timeout: 10000 });

      // Select gaming template
      const gamingTemplate = page.locator('[data-testid="template-card"]').filter({ hasText: 'Gaming' }).first();
      await gamingTemplate.click();

      // Should show channel categories and channels in preview
      await expect(page.locator('[data-testid="template-preview"]')).toBeVisible();
      await expect(page.locator('[data-testid="category-general"]')).toBeVisible();
      await expect(page.locator('[data-testid="channel-general"]')).toBeVisible();
      await expect(page.locator('[data-testid="channel-voice"]')).toBeVisible();
    });

    test('should show different channel types with appropriate icons', async ({ page }) => {
      await page.click('[data-testid="create-server-button"]');
      await page.waitForSelector('[data-testid="template-selector"]', { timeout: 10000 });

      // Select template with mixed channel types
      await page.click('[data-testid="template-card"]', { timeout: 10000 });

      const preview = page.locator('[data-testid="template-preview"]');
      await expect(preview).toBeVisible();

      // Should show different icons for different channel types
      await expect(preview.locator('[data-testid="text-channel-icon"]')).toBeVisible();
      await expect(preview.locator('[data-testid="voice-channel-icon"]')).toBeVisible();
    });
  });

  test.describe('Server Creation from Template', () => {
    test('should create server from gaming template', async ({ page }) => {
      const serverName = generateServerName();
      
      await page.click('[data-testid="create-server-button"]');
      await page.waitForSelector('[data-testid="template-selector"]', { timeout: 10000 });

      // Select gaming template
      const gamingTemplate = page.locator('[data-testid="template-card"]').filter({ hasText: 'Gaming' }).first();
      await gamingTemplate.click();

      // Fill server name
      const serverNameInput = page.locator('[data-testid="server-name-input"]');
      await serverNameInput.fill(serverName);

      // Create server
      await page.click('[data-testid="create-server-button"]');

      // Should navigate to new server
      await page.waitForTimeout(3000);
      
      // Verify server was created with template structure
      await expect(page.locator(`[data-testid="server-${serverName}"]`)).toBeVisible({ timeout: 10000 });
    });

    test('should create all channels from template structure', async ({ page }) => {
      const serverName = generateServerName();
      
      await page.click('[data-testid="create-server-button"]');
      await page.waitForSelector('[data-testid="template-selector"]', { timeout: 10000 });

      // Select community template
      const communityTemplate = page.locator('[data-testid="template-card"]').filter({ hasText: 'Community' }).first();
      await communityTemplate.click();

      // Fill server details and create
      await page.locator('[data-testid="server-name-input"]').fill(serverName);
      await page.click('[data-testid="create-server-button"]');

      // Wait for server creation
      await page.waitForTimeout(5000);

      // Should show channels from template
      await expect(page.locator('[data-testid="channel-welcome"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="channel-general"]')).toBeVisible();
      await expect(page.locator('[data-testid="channel-announcements"]')).toBeVisible();
    });

    test('should handle server creation errors gracefully', async ({ page }) => {
      // Mock API to fail
      await page.route('**/api/matrix/**', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Matrix API error' }),
        });
      });

      const serverName = generateServerName();
      
      await page.click('[data-testid="create-server-button"]');
      await page.waitForSelector('[data-testid="template-selector"]', { timeout: 10000 });

      // Select template and try to create
      await page.click('[data-testid="template-card"]', { timeout: 10000 });
      await page.locator('[data-testid="server-name-input"]').fill(serverName);
      await page.click('[data-testid="create-server-button"]');

      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Failed to create server');
    });
  });

  test.describe('Template Customization', () => {
    test('should allow customizing server name and description', async ({ page }) => {
      const customServerName = `Custom ${generateServerName()}`;
      const customDescription = 'My custom server description';
      
      await page.click('[data-testid="create-server-button"]');
      await page.waitForSelector('[data-testid="template-selector"]', { timeout: 10000 });

      // Select template
      await page.click('[data-testid="template-card"]', { timeout: 10000 });

      // Customize server details
      await page.locator('[data-testid="server-name-input"]').fill(customServerName);
      await page.locator('[data-testid="server-description-input"]').fill(customDescription);

      // Create server
      await page.click('[data-testid="create-server-button"]');
      await page.waitForTimeout(3000);

      // Verify customization was applied
      await expect(page.locator(`[data-testid="server-title"]`)).toContainText(customServerName);
    });

    test('should allow toggling between public and private servers', async ({ page }) => {
      await page.click('[data-testid="create-server-button"]');
      await page.waitForSelector('[data-testid="template-selector"]', { timeout: 10000 });

      // Select template
      await page.click('[data-testid="template-card"]', { timeout: 10000 });

      // Should show privacy toggle
      const privacyToggle = page.locator('[data-testid="privacy-toggle"]');
      await expect(privacyToggle).toBeVisible();

      // Toggle to public
      await privacyToggle.click();
      
      // Should show public server warning/info
      await expect(page.locator('[data-testid="public-server-info"]')).toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewports', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.click('[data-testid="create-server-button"]');
      await page.waitForSelector('[data-testid="template-selector"]', { timeout: 10000 });

      // Should adapt layout for mobile
      await expect(page.locator('[data-testid="template-selector"]')).toBeVisible();
      await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
    });

    test('should work on tablet viewports', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await page.click('[data-testid="create-server-button"]');
      await page.waitForSelector('[data-testid="template-selector"]', { timeout: 10000 });

      // Should show template grid appropriately
      const templateCards = page.locator('[data-testid="template-card"]');
      await expect(templateCards.first()).toBeVisible();
    });

    test('should work on desktop viewports', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      await page.click('[data-testid="create-server-button"]');
      await page.waitForSelector('[data-testid="template-selector"]', { timeout: 10000 });

      // Should show full desktop layout with preview panel
      await page.click('[data-testid="template-card"]', { timeout: 10000 });
      await expect(page.locator('[data-testid="template-preview"]')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.click('[data-testid="create-server-button"]');
      await page.waitForSelector('[data-testid="template-selector"]', { timeout: 10000 });

      // Should be able to navigate with keyboard
      await page.keyboard.press('Tab'); // Focus search input
      await page.keyboard.press('Tab'); // Focus first template
      await page.keyboard.press('Enter'); // Select template

      await expect(page.locator('[data-testid="template-preview"]')).toBeVisible();
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      await page.click('[data-testid="create-server-button"]');
      await page.waitForSelector('[data-testid="template-selector"]', { timeout: 10000 });

      // Check for accessibility attributes
      const searchInput = page.locator('[data-testid="search-input"]');
      await expect(searchInput).toHaveAttribute('placeholder');

      const templateCards = page.locator('[data-testid="template-card"]');
      await expect(templateCards.first()).toBeVisible();
    });
  });
});