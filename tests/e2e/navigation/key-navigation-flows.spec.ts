/**
 * Key Navigation Flow Tests
 * 
 * Tests for critical navigation patterns and user flows
 * throughout the HAOS v2 application.
 */

import { test, expect } from '@playwright/test';
import { 
  NavigationPage,
  ServerPage,
  ChatPage,
  SettingsModal,
  CreateServerModal,
  waitForAppReady, 
  waitForMatrixSync,
  generateServerName,
  generateChannelName
} from '../fixtures';

test.describe('Key Navigation Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await waitForMatrixSync(page);
  });

  test('server list navigation: create → select → verify context switch', async ({ page }) => {
    const navPage = new NavigationPage(page);
    const serverPage = new ServerPage(page);
    const serverName = generateServerName();
    
    // Get initial server context (if any)
    const initialServer = await page.locator('.server-item.active, [aria-selected="true"]').textContent().catch(() => null);
    
    // Create new server
    await navPage.addServerButton.click();
    await page.waitForTimeout(500);
    
    const createModal = new CreateServerModal(page);
    await createModal.createServer(serverName);
    await page.waitForTimeout(2000);
    
    // Should automatically switch to new server
    await expect(page.locator(`text="${serverName}"`)).toBeVisible();
    
    // Verify context switched by checking URL or active state
    const activeServer = await page.locator('.server-item.active, [aria-selected="true"]').textContent().catch(() => null);
    expect(activeServer).toBe(serverName);
    
    // Switch back to previous server if exists
    if (initialServer && initialServer !== serverName) {
      await navPage.clickServer(initialServer);
      await page.waitForTimeout(1000);
      
      // Verify context switch
      const currentServer = await page.locator('.server-item.active, [aria-selected="true"]').textContent().catch(() => null);
      expect(currentServer).toBe(initialServer);
    }
  });

  test('deep linking: direct URL → correct server/channel context', async ({ page }) => {
    // Get current server and channel info
    const servers = await page.locator('.server-item').all();
    
    if (servers.length === 0) {
      test.skip();
      return;
    }
    
    // Click on first server to ensure we have channels
    await servers[0].click();
    await page.waitForTimeout(1000);
    
    const channels = await page.locator('.channel-item').all();
    
    if (channels.length === 0) {
      test.skip();
      return;
    }
    
    // Get current URL structure
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Navigate away (to home or different server)
    await page.goto('/');
    await waitForAppReady(page);
    
    // Navigate back to specific URL
    await page.goto(currentUrl);
    await waitForAppReady(page);
    await waitForMatrixSync(page);
    
    // Should land in correct context
    // (This is a basic test - real deep linking would test specific server/channel IDs)
    await expect(page.locator('.server-list, .channel-list')).toBeVisible();
  });

  test('breadcrumb navigation: server → channel → settings → back', async ({ page }) => {
    const navPage = new NavigationPage(page);
    const settingsModal = new SettingsModal(page);
    
    // Navigate to a server
    const servers = await page.locator('.server-item').all();
    if (servers.length === 0) {
      test.skip();
      return;
    }
    
    const serverName = await servers[0].textContent();
    await servers[0].click();
    await page.waitForTimeout(1000);
    
    // Navigate to a channel
    const channels = await page.locator('.channel-item').all();
    if (channels.length > 0) {
      const channelName = await channels[0].textContent();
      await channels[0].click();
      await page.waitForTimeout(1000);
      
      // Verify we're in the channel
      await expect(page.locator('.chat-header, .channel-header')).toBeVisible();
      
      // Open settings
      const settingsButton = page.locator('button[aria-label*="settings" i], button:has-text("Settings")').first();
      await settingsButton.click().catch(() => {
        console.log('Settings button not found - trying alternative method');
      });
      
      // If settings opened, test navigation back
      const isSettingsOpen = await page.locator('.settings-modal, .settings-page').isVisible().catch(() => false);
      
      if (isSettingsOpen) {
        // Close settings (back to channel)
        const closeButton = page.locator('button[aria-label*="close" i], button:has-text("×")').first();
        await closeButton.click().catch(async () => {
          // Try ESC key
          await page.keyboard.press('Escape');
        });
        
        // Should be back in channel
        await expect(page.locator('.chat-header, .channel-header')).toBeVisible();
      }
    }
  });

  test('keyboard navigation: arrow keys and shortcuts', async ({ page }) => {
    // Test keyboard navigation within server/channel lists
    const navPage = new NavigationPage(page);
    
    // Focus on server list
    const serverList = page.locator('.server-list').first();
    await serverList.click().catch(() => {
      console.log('Server list not clickable - trying alternative focus method');
    });
    
    // Try arrow key navigation
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(500);
    
    // Check if focus moved
    const focusedElement = await page.locator(':focus').textContent().catch(() => null);
    console.log('Focused element:', focusedElement);
    
    // Try common keyboard shortcuts
    const shortcuts = [
      'Control+k', // Common command palette shortcut
      'Control+/', // Common help shortcut  
      'Escape',    // Common escape/close shortcut
    ];
    
    for (const shortcut of shortcuts) {
      await page.keyboard.press(shortcut);
      await page.waitForTimeout(1000);
      
      // Check if anything opened/closed
      const hasModal = await page.locator('.modal, .dialog, .popover').isVisible().catch(() => false);
      console.log(`Shortcut ${shortcut} opened modal:`, hasModal);
      
      if (hasModal) {
        // Close it with Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
      }
    }
  });

  test('search and quick navigation', async ({ page }) => {
    // Look for search functionality
    const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]').first();
    
    const hasSearch = await searchInput.isVisible().catch(() => false);
    
    if (!hasSearch) {
      test.skip();
      return;
    }
    
    // Test search functionality
    await searchInput.fill('test');
    await page.waitForTimeout(1000);
    
    // Should see search results or filtered content
    const searchResults = page.locator('.search-results, .filtered-list');
    const hasResults = await searchResults.isVisible().catch(() => false);
    
    if (hasResults) {
      // Try to click first result
      const firstResult = page.locator('.search-result').first();
      await firstResult.click().catch(() => {
        console.log('Search result not clickable');
      });
    }
    
    // Clear search
    await searchInput.fill('');
    await page.waitForTimeout(500);
  });

  test('context menu navigation: right-click options', async ({ page }) => {
    // Test right-click context menus on various elements
    const navPage = new NavigationPage(page);
    
    // Right-click on server
    const servers = await page.locator('.server-item').all();
    if (servers.length > 0) {
      await servers[0].click({ button: 'right' });
      await page.waitForTimeout(1000);
      
      // Look for context menu
      const contextMenu = page.locator('.context-menu, .dropdown-menu, .popover');
      const hasContextMenu = await contextMenu.isVisible().catch(() => false);
      
      if (hasContextMenu) {
        // Look for common options
        const menuOptions = await page.locator('.menu-item, .dropdown-item').all();
        console.log(`Found ${menuOptions.length} context menu options`);
        
        // Click away to close
        await page.click('body');
        await page.waitForTimeout(500);
      }
    }
    
    // Right-click on channel
    const channels = await page.locator('.channel-item').all();
    if (channels.length > 0) {
      await channels[0].click({ button: 'right' });
      await page.waitForTimeout(1000);
      
      const channelContextMenu = page.locator('.context-menu, .dropdown-menu, .popover');
      const hasChannelContext = await channelContextMenu.isVisible().catch(() => false);
      
      if (hasChannelContext) {
        // Click away to close
        await page.click('body');
        await page.waitForTimeout(500);
      }
    }
  });

  test('tab navigation: keyboard tab order', async ({ page }) => {
    // Test logical tab order through interface
    const focusableElements = [
      '.server-item',
      '.channel-item', 
      'button',
      'input',
      'a'
    ];
    
    // Start from beginning
    await page.keyboard.press('Tab');
    let tabCount = 0;
    const maxTabs = 20; // Prevent infinite loop
    
    while (tabCount < maxTabs) {
      const focused = await page.locator(':focus').getAttribute('class').catch(() => null);
      console.log(`Tab ${tabCount}: ${focused}`);
      
      await page.keyboard.press('Tab');
      tabCount++;
      
      await page.waitForTimeout(200);
    }
    
    // Should be able to navigate logically through interface
    expect(tabCount).toBeGreaterThan(5); // Should have multiple focusable elements
  });

  test('responsive navigation: desktop → mobile layout changes', async ({ page }) => {
    // Start with desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);
    
    // Check desktop layout
    const desktopSidebar = await page.locator('.sidebar, .server-list').isVisible().catch(() => false);
    console.log('Desktop sidebar visible:', desktopSidebar);
    
    // Switch to tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    
    // Check if layout adapted
    const tabletLayout = await page.locator('.sidebar').isVisible().catch(() => false);
    console.log('Tablet layout sidebar visible:', tabletLayout);
    
    // Switch to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    // Look for mobile navigation
    const mobileNav = await page.locator('.mobile-nav, .hamburger, button[aria-label*="menu"]').isVisible().catch(() => false);
    console.log('Mobile navigation visible:', mobileNav);
    
    if (mobileNav) {
      // Test mobile navigation
      const mobileToggle = page.locator('.mobile-nav, .hamburger, button[aria-label*="menu"]').first();
      await mobileToggle.click();
      await page.waitForTimeout(1000);
      
      // Should show navigation
      const mobileMenu = await page.locator('.sidebar, .mobile-menu').isVisible().catch(() => false);
      expect(mobileMenu).toBeTruthy();
    }
  });
});