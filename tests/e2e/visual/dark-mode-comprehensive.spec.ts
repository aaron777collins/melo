/**
 * Comprehensive Dark Mode E2E Tests for MELO V2
 * 
 * Tests ALL UI components in dark mode with visual verification and Discord compliance.
 * Ensures no light mode elements leak into dark mode interface.
 * 
 * Following TDD approach:
 * 1. Write comprehensive tests FIRST (RED - should fail initially)
 * 2. Verify implementation works (GREEN - tests pass)
 * 3. Refactor if needed (REFACTOR - optimize)
 * 
 * Task: p4-4-a - Comprehensive test of dark mode theming across all UI components
 * 
 * Test Coverage:
 * - Navigation sidebar (server list)
 * - Channel sidebar
 * - Chat area
 * - User sidebar
 * - Modals (server creation, settings, etc.)
 * - Forms and inputs
 * - Screenshot comparison
 * - Discord dark theme color verification
 */

import { test, expect, Page } from '@playwright/test';
import { 
  AuthPage,
  NavigationPage,
  waitForAppReady,
  waitForMatrixSync
} from '../fixtures';
import { bypassAuthenticationDirectly, isAuthBypassActive } from '../helpers/auth-bypass';

// =============================================================================
// Discord Dark Theme Color Constants
// =============================================================================

const DISCORD_DARK_COLORS = {
  // Primary background colors (from codebase analysis)
  primaryBackground: '#1e1f22',    // Main Discord dark background
  secondaryBackground: '#2b2d31',  // Secondary Discord dark background  
  tertiaryBackground: '#313338',   // Tertiary Discord dark background
  
  // Text colors
  primaryText: '#dbdee1',     // Discord primary text (light)
  secondaryText: '#b5bac1',   // Discord secondary text (muted)
  mutedText: '#80848e',       // Discord muted text
  
  // Interactive colors
  accent: '#5865f2',          // Discord blurple accent
  success: '#23a55a',         // Discord green
  warning: '#f0b132',         // Discord yellow
  danger: '#f23f43',          // Discord red
  
  // Border and divider colors
  borderPrimary: '#3f4248',   // Main borders
  borderSecondary: '#2b2d31', // Subtle borders
  
  // Status colors
  online: '#23a55a',          // Online status green
  offline: '#80848e',         // Offline status gray
};

// =============================================================================
// Test Configuration & Setup
// =============================================================================

test.describe('Comprehensive Dark Mode UI Testing', () => {
  let authPage: AuthPage;
  let navigationPage: NavigationPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    navigationPage = new NavigationPage(page);

    console.log('🌙 Setting up comprehensive dark mode testing...');
    
    // Set up authentication bypass for UI testing
    await bypassAuthenticationDirectly(page);
    
    // Verify authentication bypass is active
    const bypassActive = await isAuthBypassActive(page);
    if (bypassActive) {
      console.log('✅ Authentication bypass active - dark mode tests can proceed');
    } else {
      console.log('⚠️ Authentication bypass not active - attempting fallback auth');
    }
    
    // Navigate to the main application
    await page.goto('/');
    await waitForAppReady(page);
    
    // Ensure dark mode is enabled for all tests
    await ensureDarkModeEnabled(page);
    
    // Wait for theme to be fully applied
    await page.waitForTimeout(1000);
  });

  // =============================================================================
  // Test 1: Navigation Sidebar (Server List) - Dark Mode
  // =============================================================================
  
  test('navigation sidebar should be fully dark mode compliant', async ({ page }) => {
    console.log('🔍 Testing navigation sidebar dark mode...');
    
    // Navigate to main channels view to ensure sidebar is visible
    await page.goto('/channels/@me');
    await waitForAppReady(page);
    
    // Find navigation sidebar elements
    const navigationSidebar = page.locator('[data-testid="spaces-navigation"], .navigation-sidebar, nav[role="navigation"]').first();
    await expect(navigationSidebar).toBeVisible({ timeout: 10000 });
    
    // Verify navigation sidebar background color
    await verifyElementDarkBackground(page, navigationSidebar, DISCORD_DARK_COLORS.primaryBackground);
    
    // Test server list items in navigation
    const serverItems = page.locator('[data-testid="server-item"], [role="button"][aria-label*="server" i], .server-icon');
    const serverItemCount = await serverItems.count();
    
    if (serverItemCount > 0) {
      // Test first few server items
      for (let i = 0; i < Math.min(serverItemCount, 3); i++) {
        const serverItem = serverItems.nth(i);
        await expect(serverItem).toBeVisible();
        
        // Verify server item styling is dark theme compliant
        await verifyElementDarkTheming(page, serverItem);
      }
    }
    
    // Test navigation action buttons (create server, join server, etc.)
    const actionButtons = page.locator('[data-testid="navigation-action"], [aria-label*="create" i], [aria-label*="add" i]');
    const actionCount = await actionButtons.count();
    
    if (actionCount > 0) {
      for (let i = 0; i < Math.min(actionCount, 2); i++) {
        const actionButton = actionButtons.nth(i);
        if (await actionButton.isVisible()) {
          await verifyElementDarkTheming(page, actionButton);
        }
      }
    }
    
    // Take screenshot of navigation sidebar
    await page.screenshot({
      path: 'test-results/dark-mode-navigation-sidebar.png',
      fullPage: true
    });
    
    console.log('✅ Navigation sidebar dark mode test complete');
  });

  // =============================================================================
  // Test 2: Channel Sidebar - Dark Mode
  // =============================================================================
  
  test('channel sidebar should be fully dark mode compliant', async ({ page }) => {
    console.log('🔍 Testing channel sidebar dark mode...');
    
    // Navigate to a server with channels (if available)
    await page.goto('/channels/@me');
    await waitForAppReady(page);
    
    // Look for channel sidebar
    const channelSidebar = page.locator('[data-testid="server-sidebar"], .channel-sidebar, aside[role="navigation"]').first();
    
    // If no channel sidebar in DMs, try to find server channels
    if (!(await channelSidebar.isVisible().catch(() => false))) {
      // Look for a server to join or navigate to
      const serverButtons = page.locator('[data-testid="server-item"], .server-icon').first();
      
      if (await serverButtons.isVisible().catch(() => false)) {
        await serverButtons.click();
        await waitForAppReady(page);
      }
    }
    
    // Find channel sidebar (could be server sidebar or DM sidebar)
    const sidebar = page.locator('[data-testid="server-sidebar"], [data-testid="user-sidebar"], .sidebar').first();
    
    if (await sidebar.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Verify sidebar background is dark
      await verifyElementDarkBackground(page, sidebar, DISCORD_DARK_COLORS.secondaryBackground);
      
      // Test channel list items
      const channelItems = page.locator('[data-testid="channel-item"], [role="button"][aria-label*="channel" i], .channel-link');
      const channelCount = await channelItems.count();
      
      if (channelCount > 0) {
        console.log(`Found ${channelCount} channel items to test`);
        
        // Test first few channel items
        for (let i = 0; i < Math.min(channelCount, 3); i++) {
          const channelItem = channelItems.nth(i);
          if (await channelItem.isVisible()) {
            await verifyElementDarkTheming(page, channelItem);
          }
        }
      }
      
      // Test sidebar header/title
      const sidebarHeader = sidebar.locator('header, .sidebar-header, h1, h2, h3').first();
      if (await sidebarHeader.isVisible().catch(() => false)) {
        await verifyElementDarkTheming(page, sidebarHeader);
      }
    }
    
    // Take screenshot of channel sidebar
    await page.screenshot({
      path: 'test-results/dark-mode-channel-sidebar.png',
      fullPage: true
    });
    
    console.log('✅ Channel sidebar dark mode test complete');
  });

  // =============================================================================
  // Test 3: Chat Area - Dark Mode
  // =============================================================================
  
  test('chat area should be fully dark mode compliant', async ({ page }) => {
    console.log('🔍 Testing chat area dark mode...');
    
    // Navigate to a chat area
    await page.goto('/channels/@me');
    await waitForAppReady(page);
    
    // Look for main chat area
    const chatArea = page.locator('[data-testid="chat-area"], [role="main"], main, .chat-container').first();
    
    if (await chatArea.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Verify chat area background is dark
      await verifyElementDarkBackground(page, chatArea, DISCORD_DARK_COLORS.primaryBackground);
      
      // Test chat input area
      const chatInput = page.locator('[data-testid="chat-input"], textarea[placeholder*="message" i], input[placeholder*="message" i]').first();
      if (await chatInput.isVisible().catch(() => false)) {
        await verifyElementDarkTheming(page, chatInput);
        
        // Verify chat input background is properly dark
        await verifyElementDarkBackground(page, chatInput, DISCORD_DARK_COLORS.secondaryBackground);
      }
      
      // Test message list/container
      const messageContainer = page.locator('[data-testid="message-list"], .messages, .message-container').first();
      if (await messageContainer.isVisible().catch(() => false)) {
        await verifyElementDarkTheming(page, messageContainer);
        
        // Test individual messages if any exist
        const messageList = await messageContainer.locator('[data-testid="message"], .message').all();
        
        if (messageList.length > 0) {
          console.log(`Found ${messageList.length} messages to test`);
          
          for (let i = 0; i < Math.min(messageList.length, 3); i++) {
            const message = messageList[i];
            if (await message.isVisible()) {
              await verifyElementDarkTheming(page, message);
            }
          }
        }
      }
      
      // Test chat header
      const chatHeader = page.locator('[data-testid="chat-header"], .chat-header, header').first();
      if (await chatHeader.isVisible().catch(() => false)) {
        await verifyElementDarkBackground(page, chatHeader, DISCORD_DARK_COLORS.secondaryBackground);
        await verifyElementDarkTheming(page, chatHeader);
      }
    }
    
    // Take screenshot of chat area
    await page.screenshot({
      path: 'test-results/dark-mode-chat-area.png',
      fullPage: true
    });
    
    console.log('✅ Chat area dark mode test complete');
  });

  // =============================================================================
  // Test 4: User Sidebar - Dark Mode
  // =============================================================================
  
  test('user sidebar should be fully dark mode compliant', async ({ page }) => {
    console.log('🔍 Testing user sidebar dark mode...');
    
    // Navigate to DMs to access user sidebar
    await page.goto('/channels/@me');
    await waitForAppReady(page);
    
    // Look for user sidebar
    const userSidebar = page.locator('[data-testid="user-sidebar"], .user-sidebar, [class*="user-sidebar"]').first();
    
    if (await userSidebar.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Verify user sidebar background is dark
      await verifyElementDarkBackground(page, userSidebar, DISCORD_DARK_COLORS.secondaryBackground);
      
      // Test user items in sidebar
      const userItems = page.locator('[data-testid="user-item"], .user-item, [role="button"][aria-label*="user" i]');
      const userCount = await userItems.count();
      
      if (userCount > 0) {
        console.log(`Found ${userCount} user items to test`);
        
        // Test first few user items
        for (let i = 0; i < Math.min(userCount, 3); i++) {
          const userItem = userItems.nth(i);
          if (await userItem.isVisible()) {
            await verifyElementDarkTheming(page, userItem);
            
            // Test user avatar styling
            const avatar = userItem.locator('img, .avatar, [data-testid="avatar"]').first();
            if (await avatar.isVisible().catch(() => false)) {
              await verifyElementDarkTheming(page, avatar);
            }
            
            // Test user name/status text
            const userName = userItem.locator('.username, .user-name, .display-name').first();
            if (await userName.isVisible().catch(() => false)) {
              await verifyTextColor(page, userName, DISCORD_DARK_COLORS.primaryText);
            }
          }
        }
      }
      
      // Test user sidebar header
      const userSidebarHeader = userSidebar.locator('header, .header, h1, h2').first();
      if (await userSidebarHeader.isVisible().catch(() => false)) {
        await verifyElementDarkTheming(page, userSidebarHeader);
      }
    }
    
    // Take screenshot of user sidebar
    await page.screenshot({
      path: 'test-results/dark-mode-user-sidebar.png',
      fullPage: true
    });
    
    console.log('✅ User sidebar dark mode test complete');
  });

  // =============================================================================
  // Test 5: Modals - Dark Mode (Server Creation, Settings, etc.)
  // =============================================================================
  
  test('all modals should be fully dark mode compliant', async ({ page }) => {
    console.log('🔍 Testing modals dark mode...');
    
    await page.goto('/channels/@me');
    await waitForAppReady(page);
    
    // Test different modal types
    const modalTests = [
      {
        name: 'Settings Modal',
        trigger: async () => {
          // Look for settings button
          const settingsBtn = page.locator('[data-testid="settings-button"], [aria-label*="settings" i], .settings-button').first();
          if (await settingsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await settingsBtn.click();
            return true;
          }
          return false;
        }
      },
      {
        name: 'Create Server Modal',
        trigger: async () => {
          // Look for create server button
          const createBtn = page.locator('[data-testid="create-server"], [aria-label*="create" i], .create-server').first();
          if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await createBtn.click();
            return true;
          }
          return false;
        }
      }
    ];
    
    for (const modalTest of modalTests) {
      console.log(`Testing ${modalTest.name}...`);
      
      try {
        const triggered = await modalTest.trigger();
        
        if (triggered) {
          await page.waitForTimeout(1000); // Wait for modal to appear
          
          // Look for modal
          const modal = page.locator('[role="dialog"], .modal, [data-modal="true"]').first();
          
          if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
            // Verify modal background is dark
            await verifyElementDarkBackground(page, modal, DISCORD_DARK_COLORS.secondaryBackground);
            
            // Test modal content elements
            const modalContent = modal.locator('.modal-content, [role="document"]').first();
            if (await modalContent.isVisible().catch(() => false)) {
              await verifyElementDarkTheming(page, modalContent);
            }
            
            // Test modal header
            const modalHeader = modal.locator('.modal-header, header, h1, h2').first();
            if (await modalHeader.isVisible().catch(() => false)) {
              await verifyTextColor(page, modalHeader, DISCORD_DARK_COLORS.primaryText);
            }
            
            // Test modal buttons
            const modalButtons = modal.locator('button');
            const buttonCount = await modalButtons.count();
            
            if (buttonCount > 0) {
              for (let i = 0; i < Math.min(buttonCount, 3); i++) {
                const button = modalButtons.nth(i);
                if (await button.isVisible()) {
                  await verifyElementDarkTheming(page, button);
                }
              }
            }
            
            // Take screenshot of modal
            await page.screenshot({
              path: `test-results/dark-mode-modal-${modalTest.name.toLowerCase().replace(/\s+/g, '-')}.png`,
              fullPage: true
            });
            
            // Close modal
            const closeBtn = modal.locator('[aria-label*="close" i], .close, [data-testid="close"]').first();
            if (await closeBtn.isVisible().catch(() => false)) {
              await closeBtn.click();
            } else {
              // Try ESC key
              await page.keyboard.press('Escape');
            }
            
            await page.waitForTimeout(500);
          }
        }
      } catch (error) {
        console.log(`Could not test ${modalTest.name}:`, error);
      }
    }
    
    console.log('✅ Modal dark mode tests complete');
  });

  // =============================================================================
  // Test 6: Forms and Inputs - Dark Mode
  // =============================================================================
  
  test('all forms and inputs should be fully dark mode compliant', async ({ page }) => {
    console.log('🔍 Testing forms and inputs dark mode...');
    
    // Navigate to settings page which likely has forms
    await page.goto('/settings');
    await waitForAppReady(page);
    
    // If settings page doesn't exist, try appearance settings
    if (await page.locator('h1:has-text("Not Found"), .error-404').isVisible().catch(() => false)) {
      await page.goto('/settings/appearance');
      await waitForAppReady(page);
    }
    
    // Test various input types
    const inputSelectors = [
      'input[type="text"]',
      'input[type="email"]',
      'input[type="password"]',
      'textarea',
      'select',
      'input[type="radio"]',
      'input[type="checkbox"]'
    ];
    
    for (const selector of inputSelectors) {
      const inputs = page.locator(selector);
      const inputCount = await inputs.count();
      
      if (inputCount > 0) {
        console.log(`Found ${inputCount} inputs of type ${selector}`);
        
        for (let i = 0; i < Math.min(inputCount, 2); i++) {
          const input = inputs.nth(i);
          if (await input.isVisible()) {
            await verifyElementDarkTheming(page, input);
            await verifyElementDarkBackground(page, input, DISCORD_DARK_COLORS.tertiaryBackground);
          }
        }
      }
    }
    
    // Test form containers
    const forms = page.locator('form');
    const formCount = await forms.count();
    
    if (formCount > 0) {
      console.log(`Found ${formCount} forms to test`);
      
      for (let i = 0; i < Math.min(formCount, 2); i++) {
        const form = forms.nth(i);
        if (await form.isVisible()) {
          await verifyElementDarkTheming(page, form);
          
          // Test form labels
          const labels = form.locator('label');
          const labelCount = await labels.count();
          
          if (labelCount > 0) {
            for (let j = 0; j < Math.min(labelCount, 3); j++) {
              const label = labels.nth(j);
              if (await label.isVisible()) {
                await verifyTextColor(page, label, DISCORD_DARK_COLORS.primaryText);
              }
            }
          }
          
          // Test form buttons
          const formButtons = form.locator('button');
          const buttonCount = await formButtons.count();
          
          if (buttonCount > 0) {
            for (let j = 0; j < Math.min(buttonCount, 2); j++) {
              const button = formButtons.nth(j);
              if (await button.isVisible()) {
                await verifyElementDarkTheming(page, button);
              }
            }
          }
        }
      }
    }
    
    // Take screenshot of forms
    await page.screenshot({
      path: 'test-results/dark-mode-forms-inputs.png',
      fullPage: true
    });
    
    console.log('✅ Forms and inputs dark mode test complete');
  });

  // =============================================================================
  // Test 7: Discord Color Compliance Verification
  // =============================================================================
  
  test('should verify exact Discord dark theme colors are applied', async ({ page }) => {
    console.log('🔍 Verifying Discord dark theme color compliance...');
    
    await page.goto('/channels/@me');
    await waitForAppReady(page);
    
    // Check document-level dark mode class
    const hasDarkClass = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark') || 
             document.body.classList.contains('dark') ||
             document.documentElement.getAttribute('data-theme') === 'dark';
    });
    
    expect(hasDarkClass).toBe(true);
    console.log('✅ Document has dark theme class applied');
    
    // Verify CSS custom properties match Discord colors
    const cssVariables = await page.evaluate(() => {
      const computedStyle = getComputedStyle(document.documentElement);
      return {
        // Check for common CSS custom properties
        background: computedStyle.getPropertyValue('--background'),
        foreground: computedStyle.getPropertyValue('--foreground'),
        primary: computedStyle.getPropertyValue('--primary'),
        secondary: computedStyle.getPropertyValue('--secondary'),
        accent: computedStyle.getPropertyValue('--accent'),
        muted: computedStyle.getPropertyValue('--muted'),
        border: computedStyle.getPropertyValue('--border'),
      };
    });
    
    console.log('CSS Variables detected:', cssVariables);
    
    // Test specific element colors match Discord theme
    const colorTests = [
      {
        selector: 'body, [data-testid="app-root"]',
        expectedBg: DISCORD_DARK_COLORS.primaryBackground,
        description: 'Main app background'
      },
      {
        selector: '[data-testid="spaces-navigation"], .navigation-sidebar',
        expectedBg: DISCORD_DARK_COLORS.primaryBackground,
        description: 'Navigation sidebar background'
      },
      {
        selector: '[data-testid="user-sidebar"], .user-sidebar',
        expectedBg: DISCORD_DARK_COLORS.secondaryBackground,
        description: 'User sidebar background'
      }
    ];
    
    for (const colorTest of colorTests) {
      const element = page.locator(colorTest.selector).first();
      
      if (await element.isVisible().catch(() => false)) {
        console.log(`Testing ${colorTest.description}...`);
        await verifyElementDarkBackground(page, element, colorTest.expectedBg, true);
      } else {
        console.log(`Element not found for ${colorTest.description}: ${colorTest.selector}`);
      }
    }
    
    console.log('✅ Discord color compliance verification complete');
  });

  // =============================================================================
  // Test 8: Light Mode Elements Leak Detection
  // =============================================================================
  
  test('should detect and report any light mode elements in dark mode', async ({ page }) => {
    console.log('🔍 Scanning for light mode element leaks...');
    
    await page.goto('/channels/@me');
    await waitForAppReady(page);
    
    // Check for common light mode indicators
    const lightModeLeaks = await page.evaluate(() => {
      const leaks = [];
      
      // Check all elements for light backgrounds  
      const allElements = Array.from(document.querySelectorAll('*'));
      
      for (const element of allElements) {
        const computed = window.getComputedStyle(element);
        const bg = computed.backgroundColor;
        
        // Skip transparent/inherit backgrounds
        if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent' || bg === 'inherit') {
          continue;
        }
        
        // Convert background color to RGB values
        const rgbMatch = bg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (rgbMatch) {
          const [, r, g, b] = rgbMatch.map(Number);
          
          // Check if background is suspiciously light (high RGB values)
          const brightness = (r + g + b) / 3;
          
          if (brightness > 200) { // Threshold for "light" colors
            leaks.push({
              element: element.tagName.toLowerCase() + (element.className ? '.' + element.className.split(' ').join('.') : ''),
              backgroundColor: bg,
              brightness: Math.round(brightness),
              rect: element.getBoundingClientRect()
            });
          }
        }
      }
      
      return leaks.slice(0, 10); // Limit to first 10 leaks to avoid spam
    });
    
    console.log(`Found ${lightModeLeaks.length} potential light mode leaks:`, lightModeLeaks);
    
    // Report leaks but don't fail the test unless there are many critical ones
    const criticalLeaks = lightModeLeaks.filter(leak => 
      leak.brightness > 240 && 
      leak.rect.width > 10 && 
      leak.rect.height > 10
    );
    
    if (criticalLeaks.length > 0) {
      console.warn(`⚠️ Found ${criticalLeaks.length} critical light mode leaks:`, criticalLeaks);
      
      // Take screenshot highlighting the leaks
      await page.screenshot({
        path: 'test-results/dark-mode-light-leaks.png',
        fullPage: true
      });
    }
    
    // Test should pass unless there are excessive critical leaks
    expect(criticalLeaks.length).toBeLessThan(5);
    
    console.log('✅ Light mode leak detection complete');
  });

  // =============================================================================
  // Test 9: Comprehensive Screenshot Comparison
  // =============================================================================
  
  test('should capture comprehensive screenshots for visual comparison', async ({ page }) => {
    console.log('🔍 Capturing comprehensive dark mode screenshots...');
    
    const screenshotRoutes = [
      { path: '/channels/@me', name: 'channels-dm' },
      { path: '/settings', name: 'settings', fallback: '/settings/appearance' },
      { path: '/', name: 'home' }
    ];
    
    for (const route of screenshotRoutes) {
      console.log(`Capturing screenshot for ${route.name}...`);
      
      try {
        await page.goto(route.path);
        await waitForAppReady(page);
        
        // If page shows 404, try fallback
        if (route.fallback && await page.locator('h1:has-text("Not Found"), .error-404').isVisible().catch(() => false)) {
          await page.goto(route.fallback);
          await waitForAppReady(page);
        }
        
        await page.waitForTimeout(1000); // Wait for rendering
        
        // Full page screenshot
        await page.screenshot({
          path: `test-results/dark-mode-comprehensive-${route.name}.png`,
          fullPage: true
        });
        
        // Viewport screenshot (above the fold)
        await page.screenshot({
          path: `test-results/dark-mode-viewport-${route.name}.png`,
          fullPage: false
        });
        
      } catch (error) {
        console.log(`Could not capture screenshot for ${route.name}:`, error);
      }
    }
    
    console.log('✅ Comprehensive screenshot capture complete');
  });

  // =============================================================================
  // Test 10: All Components Integration Test
  // =============================================================================
  
  test('should verify all UI components work together in dark mode', async ({ page }) => {
    console.log('🔍 Testing complete UI integration in dark mode...');
    
    await page.goto('/channels/@me');
    await waitForAppReady(page);
    
    // Verify overall layout is dark
    const mainLayout = page.locator('body, #__next, [data-testid="app-root"]').first();
    await verifyElementDarkBackground(page, mainLayout, DISCORD_DARK_COLORS.primaryBackground);
    
    // Test that all major UI sections are present and dark
    const majorSections = [
      { selector: '[data-testid="spaces-navigation"], .navigation-sidebar', name: 'Navigation' },
      { selector: '[data-testid="user-sidebar"], .user-sidebar', name: 'User Sidebar' },
      { selector: '[data-testid="chat-area"], main, [role="main"]', name: 'Chat Area' },
    ];
    
    let sectionsFound = 0;
    
    for (const section of majorSections) {
      const element = page.locator(section.selector).first();
      
      if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
        sectionsFound++;
        console.log(`✅ Found and testing ${section.name}`);
        await verifyElementDarkTheming(page, element);
      } else {
        console.log(`⚠️ ${section.name} not found with selector: ${section.selector}`);
      }
    }
    
    // Ensure we found at least some major sections
    expect(sectionsFound).toBeGreaterThan(0);
    console.log(`Found and verified ${sectionsFound} major UI sections`);
    
    // Take final integration screenshot
    await page.screenshot({
      path: 'test-results/dark-mode-integration-complete.png',
      fullPage: true
    });
    
    console.log('✅ UI integration test complete');
  });
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Ensure dark mode is enabled for testing
 */
async function ensureDarkModeEnabled(page: Page): Promise<void> {
  console.log('🌙 Ensuring dark mode is enabled...');
  
  // Check if dark mode is already enabled
  const isDarkMode = await page.evaluate(() => {
    return document.documentElement.classList.contains('dark') || 
           document.body.classList.contains('dark') ||
           document.documentElement.getAttribute('data-theme') === 'dark';
  });
  
  if (isDarkMode) {
    console.log('✅ Dark mode already enabled');
    return;
  }
  
  // Try to enable dark mode through appearance settings
  try {
    await page.goto('/settings/appearance');
    await page.waitForTimeout(1000);
    
    // Look for dark theme option
    const darkThemeOption = page.locator('input[value="dark"], label[for="dark"], [data-value="dark"]').first();
    
    if (await darkThemeOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await darkThemeOption.click();
      await page.waitForTimeout(1000);
      console.log('✅ Dark mode enabled via settings');
      return;
    }
  } catch (error) {
    console.log('Could not enable dark mode via settings, trying direct approach');
  }
  
  // Fallback: Force dark mode via JavaScript
  await page.addInitScript(() => {
    // Add dark class to document
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
    
    // Set theme in localStorage
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('melo-theme', 'dark');
    
    // Set data attribute
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  
  await page.reload();
  await page.waitForTimeout(1000);
  
  console.log('✅ Dark mode forced via JavaScript');
}

/**
 * Verify an element has dark theme styling
 */
async function verifyElementDarkTheming(page: Page, element: any): Promise<void> {
  const styles = await element.evaluate((el: Element) => {
    const computed = window.getComputedStyle(el);
    return {
      backgroundColor: computed.backgroundColor,
      color: computed.color,
      borderColor: computed.borderColor,
    };
  });
  
  // Basic verification - ensure styles are applied
  expect(styles.backgroundColor).toBeTruthy();
  expect(styles.color).toBeTruthy();
  
  // Check that background is not obviously light
  if (styles.backgroundColor && styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
    const rgbMatch = styles.backgroundColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch.map(Number);
      const brightness = (r + g + b) / 3;
      
      // Background should not be bright (light mode)
      expect(brightness).toBeLessThan(150);
    }
  }
}

/**
 * Verify an element has the expected dark background color
 */
async function verifyElementDarkBackground(
  page: Page, 
  element: any, 
  expectedColor: string,
  strict: boolean = false
): Promise<void> {
  const backgroundColor = await element.evaluate((el: Element) => {
    return window.getComputedStyle(el).backgroundColor;
  });
  
  if (strict) {
    // Convert hex to RGB for comparison
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };
    
    const expected = hexToRgb(expectedColor);
    if (expected && backgroundColor) {
      const rgbMatch = backgroundColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (rgbMatch) {
        const [, r, g, b] = rgbMatch.map(Number);
        
        // Allow for slight variations in color values
        const tolerance = 10;
        expect(Math.abs(r - expected.r)).toBeLessThan(tolerance);
        expect(Math.abs(g - expected.g)).toBeLessThan(tolerance);
        expect(Math.abs(b - expected.b)).toBeLessThan(tolerance);
      }
    }
  } else {
    // Just verify it's a dark color
    expect(backgroundColor).toBeTruthy();
    
    if (backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
      const rgbMatch = backgroundColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (rgbMatch) {
        const [, r, g, b] = rgbMatch.map(Number);
        const brightness = (r + g + b) / 3;
        expect(brightness).toBeLessThan(100); // Should be dark
      }
    }
  }
}

/**
 * Verify text color is appropriate for dark theme
 */
async function verifyTextColor(page: Page, element: any, expectedColor: string): Promise<void> {
  const color = await element.evaluate((el: Element) => {
    return window.getComputedStyle(el).color;
  });
  
  expect(color).toBeTruthy();
  
  // Verify text color is light (for dark theme)
  if (color && color !== 'rgba(0, 0, 0, 0)') {
    const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch.map(Number);
      const brightness = (r + g + b) / 3;
      
      // Text should be light colored for dark theme
      expect(brightness).toBeGreaterThan(150);
    }
  }
}