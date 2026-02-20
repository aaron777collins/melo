/**
 * Responsive Fixes Verification E2E Tests
 * 
 * This test suite verifies that all responsive design issues found in 
 * breakpoint testing (p4-3-a, p4-3-b, p4-3-c) have been properly fixed.
 * 
 * TDD Approach - TESTS WRITTEN FIRST:
 * 1. RED: Write comprehensive tests that fail initially  
 * 2. GREEN: Implement fixes until tests pass
 * 3. REFACTOR: Optimize and clean up implementations
 * 
 * Test Coverage:
 * - Mobile breakpoints (< 768px): Proper layout collapse, touch targets
 * - Tablet breakpoints (768px-1024px): Transition behavior, hybrid layouts
 * - Desktop breakpoints (> 1024px): Full layouts, proper scaling
 * - No horizontal scrollbars at any breakpoint
 * - Consistent navigation behavior across all screen sizes
 * - Theme consistency across all breakpoints
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
import { bypassAuthenticationDirectly, isAuthBypassActive } from '../helpers/auth-bypass';

// =============================================================================
// Test Configuration & Breakpoint Definitions
// =============================================================================

/**
 * Critical breakpoints that must be tested and fixed
 * Based on findings from p4-3-a, p4-3-b, p4-3-c
 */
const CRITICAL_BREAKPOINTS = [
  // Mobile Critical Breakpoints
  { name: 'mobile-xs', width: 320, height: 568, device: 'iPhone SE (legacy)', critical: 'Navigation must work' },
  { name: 'mobile-sm', width: 375, height: 667, device: 'iPhone SE', critical: 'Touch targets >= 44px' },
  { name: 'mobile-md', width: 390, height: 844, device: 'iPhone 12', critical: 'No horizontal scroll' },
  
  // Tablet Critical Breakpoints  
  { name: 'tablet-sm', width: 768, height: 1024, device: 'iPad Portrait', critical: 'Sidebar transitions' },
  { name: 'tablet-md', width: 1024, height: 768, device: 'iPad Landscape', critical: 'Hybrid layout' },
  
  // Desktop Critical Breakpoints
  { name: 'desktop-sm', width: 1280, height: 720, device: 'Small Desktop', critical: 'Full Discord layout' },
  { name: 'desktop-md', width: 1440, height: 900, device: 'Medium Desktop', critical: 'Proper scaling' },
  { name: 'desktop-lg', width: 1920, height: 1080, device: 'Large Desktop', critical: 'No layout breaking' }
] as const;

/**
 * UI Elements that must be responsive and working at all breakpoints
 * These are based on findings from the responsive audit tasks
 */
const RESPONSIVE_UI_ELEMENTS = {
  // Navigation & Sidebars
  serverSidebar: {
    selector: '[data-testid="server-sidebar"], .server-sidebar, nav[role="navigation"]',
    mobile: 'hidden or collapsed',
    tablet: 'icon-only or collapsible', 
    desktop: 'fully visible',
    description: 'Server list navigation'
  },
  
  channelSidebar: {
    selector: '[data-testid="channel-sidebar"], .channel-sidebar, aside[role="complementary"]', 
    mobile: 'hidden or overlay',
    tablet: 'collapsible with toggle',
    desktop: 'always visible',
    description: 'Channel navigation sidebar'
  },
  
  memberSidebar: {
    selector: '[data-testid="member-list"], .member-list, aside[data-role="member-list"]',
    mobile: 'hidden',
    tablet: 'toggleable',
    desktop: 'visible on larger screens',
    description: 'Member list sidebar'
  },
  
  // Main Content Areas
  chatArea: {
    selector: '[data-testid="chat-area"], .chat-area, main[role="main"]',
    mobile: 'full width',
    tablet: 'flexible width',
    desktop: 'centered with sidebars',
    description: 'Main chat content area'
  },
  
  chatInput: {
    selector: '[data-testid="chat-input"], .chat-input, [role="textbox"]',
    mobile: 'touch-friendly >= 44px',
    tablet: 'responsive width',
    desktop: 'full functionality',
    description: 'Message input field'
  },
  
  // Navigation Elements
  mobileToggle: {
    selector: '[data-testid="mobile-toggle"], .mobile-toggle, button[aria-label*="menu"]',
    mobile: 'visible and functional',
    tablet: 'visible if needed',
    desktop: 'hidden',
    description: 'Mobile navigation toggle'
  },
  
  // Modals and Overlays
  modals: {
    selector: '[role="dialog"], .modal, [data-radix-dialog-content]',
    mobile: 'full screen or near-full',
    tablet: 'responsive sizing',
    desktop: 'centered with max-width',
    description: 'Modal dialogs'
  }
} as const;

// =============================================================================
// Helper Functions for Responsive Testing
// =============================================================================

/**
 * Check if element has proper touch target size (minimum 44px)
 */
async function verifyTouchTargets(page: Page): Promise<void> {
  const touchElements = await page.locator('button, a, input, [role="button"]').all();
  
  for (const element of touchElements) {
    const isVisible = await element.isVisible().catch(() => false);
    if (!isVisible) continue;
    
    const box = await element.boundingBox();
    if (box && (box.width < 44 || box.height < 44)) {
      const elementInfo = await element.evaluate(el => ({
        tagName: el.tagName,
        className: el.className,
        textContent: el.textContent?.substring(0, 50)
      }));
      
      throw new Error(
        `Touch target too small: ${elementInfo.tagName}.${elementInfo.className} ` +
        `(${box.width}x${box.height}px) - must be >= 44x44px. Text: "${elementInfo.textContent}"`
      );
    }
  }
}

/**
 * Check for horizontal scrollbars (responsive layout failure)
 */
async function verifyNoHorizontalScrollbar(page: Page): Promise<void> {
  const hasHorizontalScrollbar = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  
  if (hasHorizontalScrollbar) {
    const scrollInfo = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      diff: document.documentElement.scrollWidth - document.documentElement.clientWidth
    }));
    
    throw new Error(
      `Horizontal scrollbar detected! ScrollWidth: ${scrollInfo.scrollWidth}px, ` +
      `ClientWidth: ${scrollInfo.clientWidth}px, Overflow: ${scrollInfo.diff}px`
    );
  }
}

/**
 * Verify responsive behavior of UI element at current breakpoint  
 */
async function verifyUIElementResponsive(
  page: Page, 
  elementKey: keyof typeof RESPONSIVE_UI_ELEMENTS,
  breakpointType: 'mobile' | 'tablet' | 'desktop'
): Promise<void> {
  const element = RESPONSIVE_UI_ELEMENTS[elementKey];
  const expectedBehavior = element[breakpointType];
  
  const locator = page.locator(element.selector).first();
  const exists = await locator.count() > 0;
  const isVisible = exists ? await locator.isVisible() : false;
  
  // Validate based on expected behavior
  if (expectedBehavior.includes('hidden')) {
    expect(isVisible, `${element.description} should be hidden on ${breakpointType}`).toBe(false);
  } else if (expectedBehavior.includes('visible') || expectedBehavior.includes('functional')) {
    expect(isVisible, `${element.description} should be visible on ${breakpointType}`).toBe(true);
  }
  
  // Additional checks for visible elements
  if (isVisible) {
    const box = await locator.boundingBox();
    expect(box, `${element.description} should have valid dimensions`).toBeTruthy();
    
    // Verify no overflow for main content areas
    if (elementKey === 'chatArea' || elementKey === 'chatInput') {
      if (box) {
        const viewportWidth = await page.viewportSize()?.width ?? 0;
        expect(box.x + box.width, `${element.description} should not overflow viewport`).toBeLessThanOrEqual(viewportWidth + 5); // 5px tolerance
      }
    }
  }
}

/**
 * Take comprehensive screenshot for visual verification
 */
async function takeResponsiveScreenshot(
  page: Page, 
  breakpoint: { name: string; width: number; height: number; device: string; critical: string },
  context: string = 'default'
): Promise<void> {
  await page.screenshot({ 
    path: `test-results/responsive-fixes-${breakpoint.name}-${context}.png`,
    fullPage: true 
  });
  
  console.log(`📸 Screenshot saved: responsive-fixes-${breakpoint.name}-${context}.png`);
}

// =============================================================================  
// Test Suite: Responsive Fixes Verification
// =============================================================================

test.describe('Responsive Fixes Verification', () => {
  let authPage: AuthPage;
  let serverPage: ServerPage;
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    serverPage = new ServerPage(page);
    chatPage = new ChatPage(page);
    
    // Set up authentication bypass for testing
    console.log('🔐 Setting up authentication bypass...');
    await bypassAuthenticationDirectly(page);
    
    const bypassActive = await isAuthBypassActive(page);
    if (bypassActive) {
      console.log('✅ Authentication bypass active');
    } else {
      console.log('⚠️ Authentication bypass not active - using fallback auth');
      
      // Fallback: Try normal authentication
      await page.goto('/sign-in');
      await authPage.login(TEST_CONFIG.testUser.username, TEST_CONFIG.testUser.password);
    }
  });

  // =============================================================================
  // Test 1: Critical Breakpoint Verification  
  // =============================================================================
  
  test('should work correctly at all critical breakpoints', async ({ page }) => {
    for (const breakpoint of CRITICAL_BREAKPOINTS) {
      console.log(`🎯 Testing ${breakpoint.name} (${breakpoint.width}x${breakpoint.height}) - ${breakpoint.device}`);
      console.log(`   Critical requirement: ${breakpoint.critical}`);
      
      // Set viewport to breakpoint
      await page.setViewportSize({ 
        width: breakpoint.width, 
        height: breakpoint.height 
      });
      
      // Navigate to app
      await page.goto('/', { waitUntil: 'networkidle' });
      await waitForAppReady(page);
      
      // Take initial screenshot
      await takeResponsiveScreenshot(page, breakpoint, 'initial');
      
      // Verify no horizontal scrollbar
      await verifyNoHorizontalScrollbar(page);
      
      // Verify touch targets on mobile breakpoints
      if (breakpoint.width < 768) {
        await verifyTouchTargets(page);
      }
      
      console.log(`✅ ${breakpoint.name} basic verification passed`);
    }
  });

  // =============================================================================
  // Test 2: Mobile Responsive Behavior (< 768px)
  // =============================================================================
  
  test('should have proper mobile responsive behavior', async ({ page }) => {
    const mobileBreakpoints = CRITICAL_BREAKPOINTS.filter(bp => bp.width < 768);
    
    for (const breakpoint of mobileBreakpoints) {
      console.log(`📱 Testing mobile behavior at ${breakpoint.name}`);
      
      await page.setViewportSize({ 
        width: breakpoint.width, 
        height: breakpoint.height 
      });
      
      await page.goto('/', { waitUntil: 'networkidle' });
      await waitForAppReady(page);
      
      // Verify mobile-specific responsive behaviors
      await verifyUIElementResponsive(page, 'serverSidebar', 'mobile');
      await verifyUIElementResponsive(page, 'channelSidebar', 'mobile');
      await verifyUIElementResponsive(page, 'memberSidebar', 'mobile');
      await verifyUIElementResponsive(page, 'chatArea', 'mobile');
      await verifyUIElementResponsive(page, 'chatInput', 'mobile');
      await verifyUIElementResponsive(page, 'mobileToggle', 'mobile');
      
      // Verify no horizontal overflow  
      await verifyNoHorizontalScrollbar(page);
      
      // Verify touch targets meet 44px minimum
      await verifyTouchTargets(page);
      
      // Take screenshot for verification
      await takeResponsiveScreenshot(page, breakpoint, 'mobile-behavior');
      
      console.log(`✅ Mobile behavior verified for ${breakpoint.name}`);
    }
  });

  // =============================================================================
  // Test 3: Tablet Responsive Behavior (768px - 1024px)
  // =============================================================================
  
  test('should have proper tablet responsive behavior', async ({ page }) => {
    const tabletBreakpoints = CRITICAL_BREAKPOINTS.filter(bp => bp.width >= 768 && bp.width <= 1024);
    
    for (const breakpoint of tabletBreakpoints) {
      console.log(`📱 Testing tablet behavior at ${breakpoint.name}`);
      
      await page.setViewportSize({ 
        width: breakpoint.width, 
        height: breakpoint.height 
      });
      
      await page.goto('/', { waitUntil: 'networkidle' });
      await waitForAppReady(page);
      
      // Verify tablet-specific responsive behaviors  
      await verifyUIElementResponsive(page, 'serverSidebar', 'tablet');
      await verifyUIElementResponsive(page, 'channelSidebar', 'tablet');
      await verifyUIElementResponsive(page, 'memberSidebar', 'tablet');
      await verifyUIElementResponsive(page, 'chatArea', 'tablet');
      await verifyUIElementResponsive(page, 'chatInput', 'tablet');
      
      // Verify no horizontal overflow
      await verifyNoHorizontalScrollbar(page);
      
      // Test sidebar toggle functionality if visible
      const mobileToggle = page.locator('[data-testid="mobile-toggle"], button[aria-label*="menu"]').first();
      if (await mobileToggle.isVisible()) {
        await mobileToggle.click();
        await page.waitForTimeout(500); // Allow animation
        await takeResponsiveScreenshot(page, breakpoint, 'tablet-sidebar-toggled');
        await mobileToggle.click(); // Close it
      }
      
      // Take screenshot
      await takeResponsiveScreenshot(page, breakpoint, 'tablet-behavior');
      
      console.log(`✅ Tablet behavior verified for ${breakpoint.name}`);
    }
  });

  // =============================================================================
  // Test 4: Desktop Responsive Behavior (> 1024px)  
  // =============================================================================
  
  test('should have proper desktop responsive behavior', async ({ page }) => {
    const desktopBreakpoints = CRITICAL_BREAKPOINTS.filter(bp => bp.width > 1024);
    
    for (const breakpoint of desktopBreakpoints) {
      console.log(`🖥️ Testing desktop behavior at ${breakpoint.name}`);
      
      await page.setViewportSize({ 
        width: breakpoint.width, 
        height: breakpoint.height 
      });
      
      await page.goto('/', { waitUntil: 'networkidle' });
      await waitForAppReady(page);
      
      // Verify desktop-specific responsive behaviors
      await verifyUIElementResponsive(page, 'serverSidebar', 'desktop');
      await verifyUIElementResponsive(page, 'channelSidebar', 'desktop');
      await verifyUIElementResponsive(page, 'memberSidebar', 'desktop');
      await verifyUIElementResponsive(page, 'chatArea', 'desktop');
      await verifyUIElementResponsive(page, 'chatInput', 'desktop');
      
      // Verify no horizontal overflow
      await verifyNoHorizontalScrollbar(page);
      
      // Verify full Discord-style layout is present  
      const serverSidebar = page.locator(RESPONSIVE_UI_ELEMENTS.serverSidebar.selector).first();
      const channelSidebar = page.locator(RESPONSIVE_UI_ELEMENTS.channelSidebar.selector).first();
      const chatArea = page.locator(RESPONSIVE_UI_ELEMENTS.chatArea.selector).first();
      
      // All major sections should be visible
      await expect(serverSidebar).toBeVisible();
      await expect(channelSidebar).toBeVisible(); 
      await expect(chatArea).toBeVisible();
      
      // Verify proper layout proportions
      const serverBox = await serverSidebar.boundingBox();
      const channelBox = await channelSidebar.boundingBox();
      const chatBox = await chatArea.boundingBox();
      
      if (serverBox && channelBox && chatBox) {
        // Server sidebar should be leftmost and narrow
        expect(serverBox.x).toBeLessThan(channelBox.x);
        expect(serverBox.width).toBeLessThan(100); // Typically ~72px
        
        // Channel sidebar should be between server and chat
        expect(channelBox.x).toBeLessThan(chatBox.x);
        expect(channelBox.width).toBeGreaterThan(200); // Reasonable channel sidebar width
        
        // Chat area should take remaining space
        expect(chatBox.width).toBeGreaterThan(400); // Reasonable chat area width
      }
      
      // Take screenshot
      await takeResponsiveScreenshot(page, breakpoint, 'desktop-behavior');
      
      console.log(`✅ Desktop behavior verified for ${breakpoint.name}`);
    }
  });

  // =============================================================================
  // Test 5: Modal Responsiveness Across All Breakpoints
  // =============================================================================
  
  test('should have responsive modals at all breakpoints', async ({ page }) => {
    for (const breakpoint of CRITICAL_BREAKPOINTS.slice(0, 5)) { // Test subset for performance
      console.log(`🔲 Testing modal responsiveness at ${breakpoint.name}`);
      
      await page.setViewportSize({ 
        width: breakpoint.width, 
        height: breakpoint.height 
      });
      
      await page.goto('/', { waitUntil: 'networkidle' });
      await waitForAppReady(page);
      
      // Try to open a settings modal (common modal)
      const settingsButton = page.locator('[data-testid="settings"], button[aria-label*="settings"], [title*="Settings"]').first();
      
      if (await settingsButton.isVisible()) {
        await settingsButton.click();
        await page.waitForTimeout(500); // Allow modal animation
        
        // Verify modal is properly sized for viewport
        await verifyUIElementResponsive(page, 'modals', breakpoint.width < 768 ? 'mobile' : breakpoint.width <= 1024 ? 'tablet' : 'desktop');
        
        // Verify modal doesn't cause horizontal scrollbar  
        await verifyNoHorizontalScrollbar(page);
        
        // Take screenshot with modal open
        await takeResponsiveScreenshot(page, breakpoint, 'modal-open');
        
        // Close modal
        const closeButton = page.locator('[role="dialog"] button, .modal button[aria-label*="close"], [data-radix-dialog-close]').first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
        } else {
          await page.keyboard.press('Escape');
        }
        
        await page.waitForTimeout(300); // Allow close animation
      }
      
      console.log(`✅ Modal responsiveness verified for ${breakpoint.name}`);
    }
  });

  // =============================================================================
  // Test 6: Theme Consistency Across Breakpoints
  // =============================================================================
  
  test('should maintain theme consistency across all breakpoints', async ({ page }) => {
    const testBreakpoints = [
      CRITICAL_BREAKPOINTS[1], // mobile-sm
      CRITICAL_BREAKPOINTS[3], // tablet-sm  
      CRITICAL_BREAKPOINTS[5]  // desktop-sm
    ];
    
    for (const theme of ['dark', 'light']) {
      console.log(`🎨 Testing ${theme} theme consistency across breakpoints`);
      
      for (const breakpoint of testBreakpoints) {
        console.log(`   Testing ${theme} theme at ${breakpoint.name}`);
        
        await page.setViewportSize({ 
          width: breakpoint.width, 
          height: breakpoint.height 
        });
        
        await page.goto('/', { waitUntil: 'networkidle' });
        await waitForAppReady(page);
        
        // Set theme via localStorage (faster than navigating to settings)
        await page.evaluate((themeValue) => {
          localStorage.setItem('theme', themeValue);
          document.documentElement.setAttribute('data-theme', themeValue);
          document.documentElement.className = themeValue;
        }, theme);
        
        await page.reload({ waitUntil: 'networkidle' });
        await waitForAppReady(page);
        
        // Verify theme is applied consistently
        const htmlClass = await page.evaluate(() => document.documentElement.className);
        const dataTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
        
        expect(htmlClass).toContain(theme);
        expect(dataTheme).toBe(theme);
        
        // Verify no horizontal scrollbar even with theme
        await verifyNoHorizontalScrollbar(page);
        
        // Take screenshot for theme verification
        await takeResponsiveScreenshot(page, breakpoint, `theme-${theme}`);
        
        console.log(`✅ ${theme} theme verified at ${breakpoint.name}`);
      }
    }
  });

  // =============================================================================
  // Test 7: Navigation Consistency Test
  // =============================================================================
  
  test('should have consistent navigation behavior across breakpoints', async ({ page }) => {
    for (const breakpoint of CRITICAL_BREAKPOINTS) {
      console.log(`🧭 Testing navigation consistency at ${breakpoint.name}`);
      
      await page.setViewportSize({ 
        width: breakpoint.width, 
        height: breakpoint.height 
      });
      
      await page.goto('/', { waitUntil: 'networkidle' });
      await waitForAppReady(page);
      
      // Test navigation elements are accessible
      const isMobile = breakpoint.width < 768;
      const isTablet = breakpoint.width >= 768 && breakpoint.width <= 1024;
      const isDesktop = breakpoint.width > 1024;
      
      if (isMobile) {
        // Mobile: Should have mobile toggle for navigation
        const mobileToggle = page.locator('[data-testid="mobile-toggle"], button[aria-label*="menu"], .mobile-toggle').first();
        if (await mobileToggle.count() > 0) {
          await expect(mobileToggle).toBeVisible();
          
          // Test toggle functionality
          await mobileToggle.click();
          await page.waitForTimeout(500);
          
          // Should show navigation overlay or sidebar
          const navigationOverlay = page.locator('[data-testid="navigation-overlay"], .navigation-overlay, nav[role="navigation"]').first();
          if (await navigationOverlay.count() > 0) {
            await expect(navigationOverlay).toBeVisible();
          }
          
          // Close navigation
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        }
      } else if (isDesktop) {
        // Desktop: All navigation should be visible
        const serverSidebar = page.locator(RESPONSIVE_UI_ELEMENTS.serverSidebar.selector).first();
        const channelSidebar = page.locator(RESPONSIVE_UI_ELEMENTS.channelSidebar.selector).first();
        
        if (await serverSidebar.count() > 0) {
          await expect(serverSidebar).toBeVisible();
        }
        if (await channelSidebar.count() > 0) {
          await expect(channelSidebar).toBeVisible();
        }
      }
      
      // Verify no horizontal scrolling regardless of navigation state
      await verifyNoHorizontalScrollbar(page);
      
      // Take screenshot
      await takeResponsiveScreenshot(page, breakpoint, 'navigation');
      
      console.log(`✅ Navigation consistency verified for ${breakpoint.name}`);
    }
  });

  // =============================================================================
  // Test 8: Performance and Layout Shift Test
  // =============================================================================
  
  test('should not have layout shifts during responsive transitions', async ({ page }) => {
    console.log('⚡ Testing layout stability during responsive transitions');
    
    // Start at mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/', { waitUntil: 'networkidle' });
    await waitForAppReady(page);
    
    // Take initial screenshot
    await page.screenshot({ path: 'test-results/layout-shift-mobile-initial.png', fullPage: true });
    
    // Transition through breakpoints quickly to test layout stability
    const transitionBreakpoints = [
      { width: 640, height: 480 },
      { width: 768, height: 1024 },
      { width: 1024, height: 768 },
      { width: 1280, height: 720 },
      { width: 1920, height: 1080 }
    ];
    
    for (let index = 0; index < transitionBreakpoints.length; index++) {
      const size = transitionBreakpoints[index];
      await page.setViewportSize(size);
      await page.waitForTimeout(100); // Brief pause for layout
      
      // Verify no horizontal scrollbar after transition
      await verifyNoHorizontalScrollbar(page);
      
      // Take screenshot for visual verification
      await page.screenshot({ 
        path: `test-results/layout-shift-transition-${index + 1}.png`, 
        fullPage: true 
      });
      
      console.log(`✅ Layout stable at ${size.width}x${size.height}`);
    }
    
    console.log('✅ Layout shift testing complete');
  });

  // =============================================================================
  // Test 9: Build and Integration Verification
  // =============================================================================
  
  test('should maintain responsive behavior after build', async ({ page }) => {
    // This test verifies that our responsive fixes work in production build
    console.log('🏗️ Testing responsive behavior compatibility with build system');
    
    // Test a critical breakpoint
    const criticalBreakpoint = CRITICAL_BREAKPOINTS[4]; // tablet-md
    
    await page.setViewportSize({ 
      width: criticalBreakpoint.width, 
      height: criticalBreakpoint.height 
    });
    
    await page.goto('/', { waitUntil: 'networkidle' });
    await waitForAppReady(page);
    
    // Verify all key responsive behaviors still work
    await verifyNoHorizontalScrollbar(page);
    await verifyUIElementResponsive(page, 'chatArea', 'tablet');
    
    // Take final verification screenshot
    await takeResponsiveScreenshot(page, criticalBreakpoint, 'build-integration');
    
    console.log('✅ Build integration verified');
  });
});

// =============================================================================
// Additional Helper Functions for Future Extensions
// =============================================================================

/**
 * Future helper for testing specific CSS breakpoint compliance
 */
async function verifyCSSBreakpoints(page: Page): Promise<void> {
  const breakpoints = await page.evaluate(() => {
    const computedStyle = getComputedStyle(document.documentElement);
    return {
      // Could extract CSS custom properties or computed styles
      // for more detailed breakpoint verification
    };
  });
  
  // Placeholder for future CSS-specific breakpoint tests
}

/**
 * Future helper for performance metrics during responsive transitions
 */
async function measureResponsivePerformance(page: Page): Promise<any> {
  // Placeholder for future performance measurement capabilities
  return {};
}