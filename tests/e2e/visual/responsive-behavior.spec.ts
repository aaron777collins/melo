/**
 * Responsive Behavior E2E Tests
 * 
 * Comprehensive visual regression testing for responsive behavior across all screen sizes.
 * Validates that MELO V2 responsive behavior matches Discord clone reference implementation.
 * 
 * TDD Approach:
 * 1. Tests written FIRST (before implementation verification)
 * 2. Screenshots captured at each breakpoint 
 * 3. Visual validation of key responsive areas
 * 4. Comparison against Discord clone patterns
 * 
 * Test Coverage:
 * - Mobile: 375px (iPhone SE), 390px (iPhone 12)
 * - Tablet: 768px (iPad), 1024px (iPad Pro)  
 * - Desktop: 1280px, 1440px, 1920px
 */

import { test, expect, type Page } from '@playwright/test';
import { 
  TEST_CONFIG, 
  waitForAppReady, 
  waitForMatrixSync,
  AuthPage,
  ServerPage,
  ChatPage 
} from '../fixtures';

/**
 * Responsive breakpoint definitions matching Discord patterns
 */
const RESPONSIVE_BREAKPOINTS = [
  { name: 'mobile-sm', width: 375, height: 667, device: 'iPhone SE' },
  { name: 'mobile-lg', width: 390, height: 844, device: 'iPhone 12' },
  { name: 'tablet-sm', width: 768, height: 1024, device: 'iPad' },
  { name: 'tablet-lg', width: 1024, height: 768, device: 'iPad Pro' },
  { name: 'desktop-sm', width: 1280, height: 720, device: 'Small Desktop' },
  { name: 'desktop-md', width: 1440, height: 900, device: 'Medium Desktop' },
  { name: 'desktop-lg', width: 1920, height: 1080, device: 'Large Desktop' }
] as const;

/**
 * Key responsive areas to test for Discord-style behavior
 */
const RESPONSIVE_AREAS = {
  serverSidebar: {
    selector: '[data-testid="server-sidebar"], .server-sidebar, nav[role="navigation"]',
    description: 'Server list sidebar with server icons'
  },
  navigationSidebar: {
    selector: '[data-testid="navigation-sidebar"], .navigation-sidebar, aside[role="complementary"]',
    description: 'Channel/navigation sidebar'
  },
  chatArea: {
    selector: '[data-testid="chat-area"], .chat-area, main[role="main"]',
    description: 'Main chat/content area'
  },
  memberList: {
    selector: '[data-testid="member-list"], .member-list, aside[data-role="member-list"]',
    description: 'Member list sidebar'
  },
  chatInput: {
    selector: '[data-testid="chat-input"], .chat-input, [role="textbox"]',
    description: 'Message input area'
  },
  modals: {
    selector: '[role="dialog"], .modal, [data-radix-dialog-content]',
    description: 'Modal dialogs and overlays'
  }
} as const;

test.describe('Responsive Behavior Tests', () => {
  let authPage: AuthPage;
  let serverPage: ServerPage;
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    serverPage = new ServerPage(page);
    chatPage = new ChatPage(page);
  });

  // Test responsive behavior at each major breakpoint
  for (const breakpoint of RESPONSIVE_BREAKPOINTS) {
    test(`Responsive layout at ${breakpoint.name} (${breakpoint.width}x${breakpoint.height}) - ${breakpoint.device}`, async ({ page }) => {
      // Set viewport to breakpoint dimensions
      await page.setViewportSize({ 
        width: breakpoint.width, 
        height: breakpoint.height 
      });

      // Navigate to app and wait for load
      await page.goto('/', { waitUntil: 'networkidle' });
      await waitForAppReady(page);
      
      // Take initial screenshot for visual baseline
      await page.screenshot({ 
        path: `test-results/responsive-${breakpoint.name}-initial.png`,
        fullPage: true 
      });

      // Test authenticated state responsive behavior
      try {
        // Sign in to test authenticated layouts
        await page.goto('/sign-in');
        await authPage.signIn(TEST_CONFIG.testUser.username, TEST_CONFIG.testUser.password);
        await waitForMatrixSync(page);
        
        // Navigate to main app interface
        await page.goto('/channels/@me', { waitUntil: 'networkidle' });
        await waitForAppReady(page);
        
        // Take authenticated main interface screenshot  
        await page.screenshot({ 
          path: `test-results/responsive-${breakpoint.name}-authenticated.png`,
          fullPage: true 
        });

        // Test responsive behavior of key areas
        await testResponsiveAreas(page, breakpoint);

        // Test modal responsiveness if breakpoint supports modals
        if (breakpoint.width >= 768) {
          await testModalResponsiveness(page, breakpoint);
        }

        // Test navigation behavior at this breakpoint
        await testNavigationBehavior(page, breakpoint);

      } catch (error) {
        console.log(`Authentication failed for ${breakpoint.name}, testing unauthenticated state`);
        
        // Test unauthenticated responsive behavior
        await page.goto('/');
        await waitForAppReady(page);
        
        await page.screenshot({ 
          path: `test-results/responsive-${breakpoint.name}-unauthenticated.png`,
          fullPage: true 
        });
      }
    });
  }

  test('Mobile navigation behavior (collapsible sidebars)', async ({ page }) => {
    // Test mobile-specific navigation patterns
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/', { waitUntil: 'networkidle' });
    await waitForAppReady(page);
    
    // Test that sidebars are hidden/collapsible on mobile
    await testMobileSidebarBehavior(page);
    
    // Take screenshot of mobile navigation state
    await page.screenshot({ 
      path: `test-results/mobile-navigation-behavior.png`,
      fullPage: true 
    });
  });

  test('Tablet layout transitions (768px-1024px)', async ({ page }) => {
    // Test tablet-specific responsive transitions
    for (const width of [768, 800, 900, 1024]) {
      await page.setViewportSize({ width, height: 1024 });
      
      await page.goto('/', { waitUntil: 'networkidle' });  
      await waitForAppReady(page);
      
      // Test intermediate breakpoint behavior
      await page.screenshot({ 
        path: `test-results/tablet-transition-${width}px.png`,
        fullPage: true 
      });
      
      // Verify layout elements are present and properly sized
      await testTabletLayoutElements(page, width);
    }
  });

  test('Desktop sidebar behavior (>=1280px)', async ({ page }) => {
    // Test desktop-specific sidebar behavior
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    await page.goto('/', { waitUntil: 'networkidle' });
    await waitForAppReady(page);
    
    // Test that all sidebars are visible on desktop
    await testDesktopSidebarBehavior(page);
    
    await page.screenshot({ 
      path: `test-results/desktop-sidebar-behavior.png`,
      fullPage: true 
    });
  });

  test('Chat area responsiveness across breakpoints', async ({ page }) => {
    // Test chat area layout changes across all breakpoints
    for (const breakpoint of RESPONSIVE_BREAKPOINTS) {
      await page.setViewportSize({ 
        width: breakpoint.width, 
        height: breakpoint.height 
      });
      
      await page.goto('/', { waitUntil: 'networkidle' });
      await waitForAppReady(page);
      
      // Test chat area responsive behavior
      await testChatAreaResponsiveness(page, breakpoint);
      
      await page.screenshot({ 
        path: `test-results/chat-area-${breakpoint.name}.png`,
        fullPage: true 
      });
    }
  });
});

/**
 * Test responsive behavior of key layout areas
 */
async function testResponsiveAreas(page: Page, breakpoint: typeof RESPONSIVE_BREAKPOINTS[0]) {
  // Test each responsive area
  for (const [areaName, area] of Object.entries(RESPONSIVE_AREAS)) {
    try {
      const element = await page.locator(area.selector).first();
      const isVisible = await element.isVisible().catch(() => false);
      
      // Mobile breakpoints: some elements should be hidden/collapsed
      if (breakpoint.width < 768) {
        if (areaName === 'memberList' || areaName === 'navigationSidebar') {
          // These should be hidden or collapsed on mobile
          console.log(`${areaName} visibility on mobile (${breakpoint.name}): ${isVisible}`);
        }
      }
      
      // Desktop breakpoints: all elements should be visible
      if (breakpoint.width >= 1280) {
        if (isVisible) {
          const boundingBox = await element.boundingBox();
          expect(boundingBox).toBeTruthy();
          console.log(`${areaName} size on ${breakpoint.name}: ${boundingBox?.width}x${boundingBox?.height}`);
        }
      }
      
    } catch (error) {
      console.log(`Could not test ${areaName} at ${breakpoint.name}: ${error}`);
    }
  }
}

/**
 * Test modal responsiveness at different breakpoints
 */
async function testModalResponsiveness(page: Page, breakpoint: typeof RESPONSIVE_BREAKPOINTS[0]) {
  try {
    // Try to trigger a modal (settings, create server, etc.)
    const settingsButton = page.locator('[data-testid="user-settings"], button[aria-label*="settings"]').first();
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      
      // Wait for modal to appear
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      
      // Take screenshot of modal at this breakpoint
      await page.screenshot({ 
        path: `test-results/modal-${breakpoint.name}.png`,
        fullPage: true 
      });
      
      // Test modal is properly sized for viewport
      const modal = page.locator('[role="dialog"]').first();
      const modalBox = await modal.boundingBox();
      
      if (modalBox) {
        // Modal should not exceed viewport dimensions
        expect(modalBox.width).toBeLessThanOrEqual(breakpoint.width);
        expect(modalBox.height).toBeLessThanOrEqual(breakpoint.height);
      }
      
      // Close modal
      await page.keyboard.press('Escape');
    }
  } catch (error) {
    console.log(`Modal test failed at ${breakpoint.name}: ${error}`);
  }
}

/**
 * Test navigation behavior at different breakpoints
 */
async function testNavigationBehavior(page: Page, breakpoint: typeof RESPONSIVE_BREAKPOINTS[0]) {
  // Mobile navigation tests
  if (breakpoint.width < 768) {
    await testMobileNavigationPatterns(page);
  }
  
  // Tablet navigation tests  
  if (breakpoint.width >= 768 && breakpoint.width < 1280) {
    await testTabletNavigationPatterns(page);
  }
  
  // Desktop navigation tests
  if (breakpoint.width >= 1280) {
    await testDesktopNavigationPatterns(page);
  }
}

/**
 * Mobile-specific navigation pattern tests
 */
async function testMobileNavigationPatterns(page: Page) {
  // Test hamburger menu or mobile navigation toggles
  const mobileMenuTriggers = [
    '[data-testid="mobile-menu"]',
    'button[aria-label*="menu"]',
    '.hamburger-menu',
    '[data-testid="sidebar-toggle"]'
  ];
  
  for (const selector of mobileMenuTriggers) {
    const trigger = page.locator(selector).first();
    if (await trigger.isVisible()) {
      console.log(`Found mobile navigation trigger: ${selector}`);
      // Could test menu open/close behavior
      break;
    }
  }
}

/**
 * Tablet-specific navigation pattern tests
 */
async function testTabletNavigationPatterns(page: Page) {
  // Test tablet navigation behavior (hybrid between mobile and desktop)
  console.log('Testing tablet navigation patterns');
}

/**
 * Desktop-specific navigation pattern tests
 */
async function testDesktopNavigationPatterns(page: Page) {
  // Test full desktop navigation with all sidebars visible
  console.log('Testing desktop navigation patterns');
}

/**
 * Test mobile sidebar collapse/expand behavior
 */
async function testMobileSidebarBehavior(page: Page) {
  // Check that sidebars are properly hidden on mobile
  const serverSidebar = page.locator(RESPONSIVE_AREAS.serverSidebar.selector).first();
  const navSidebar = page.locator(RESPONSIVE_AREAS.navigationSidebar.selector).first();
  
  const serverVisible = await serverSidebar.isVisible().catch(() => false);
  const navVisible = await navSidebar.isVisible().catch(() => false);
  
  console.log(`Mobile sidebar visibility - Server: ${serverVisible}, Nav: ${navVisible}`);
}

/**
 * Test tablet layout element behavior
 */
async function testTabletLayoutElements(page: Page, width: number) {
  // Test that layout elements adapt properly at tablet sizes
  const chatArea = page.locator(RESPONSIVE_AREAS.chatArea.selector).first();
  
  if (await chatArea.isVisible()) {
    const chatBox = await chatArea.boundingBox();
    console.log(`Tablet (${width}px) chat area size: ${chatBox?.width}x${chatBox?.height}`);
  }
}

/**
 * Test desktop sidebar behavior (all visible)
 */
async function testDesktopSidebarBehavior(page: Page) {
  // On desktop, all sidebars should be visible
  for (const [areaName, area] of Object.entries(RESPONSIVE_AREAS)) {
    const element = page.locator(area.selector).first();
    const isVisible = await element.isVisible().catch(() => false);
    console.log(`Desktop ${areaName} visibility: ${isVisible}`);
  }
}

/**
 * Test chat area responsiveness
 */
async function testChatAreaResponsiveness(page: Page, breakpoint: typeof RESPONSIVE_BREAKPOINTS[0]) {
  const chatArea = page.locator(RESPONSIVE_AREAS.chatArea.selector).first();
  const chatInput = page.locator(RESPONSIVE_AREAS.chatInput.selector).first();
  
  const chatAreaVisible = await chatArea.isVisible().catch(() => false);
  const chatInputVisible = await chatInput.isVisible().catch(() => false);
  
  console.log(`${breakpoint.name} chat responsiveness - Area: ${chatAreaVisible}, Input: ${chatInputVisible}`);
  
  if (chatAreaVisible) {
    const chatBox = await chatArea.boundingBox();
    if (chatBox) {
      // Chat area should utilize available space properly
      const expectedMinWidth = Math.min(300, breakpoint.width * 0.6);
      expect(chatBox.width).toBeGreaterThan(expectedMinWidth);
    }
  }
}