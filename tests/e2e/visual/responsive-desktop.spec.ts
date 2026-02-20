/**
 * Desktop Responsive Behavior E2E Tests
 * 
 * Focused testing of desktop responsive behavior on screens > 1024px.
 * Tests specific breakpoints: 1280px, 1440px, 1920px to ensure:
 * - UI components scale correctly
 * - No horizontal scrollbars at desktop sizes
 * - Navigation elements are properly positioned
 * - Layout consistency across desktop sizes
 * 
 * TDD Approach:
 * 1. Tests written FIRST (before implementation verification)
 * 2. Screenshots captured at each desktop breakpoint
 * 3. Visual validation of desktop-specific behavior
 * 4. Verification of proper scaling and positioning
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

/**
 * Desktop breakpoint definitions > 1024px
 * Testing specific sizes to ensure proper desktop behavior
 */
const DESKTOP_BREAKPOINTS = [
  { name: 'desktop-small', width: 1280, height: 720, description: 'Small Desktop (1280x720)' },
  { name: 'desktop-medium', width: 1440, height: 900, description: 'Medium Desktop (1440x900)' },
  { name: 'desktop-large', width: 1920, height: 1080, description: 'Large Desktop (1920x1080)' }
] as const;

/**
 * Desktop-specific UI elements to test
 */
const DESKTOP_UI_ELEMENTS = {
  serverSidebar: {
    selector: '[data-testid="server-sidebar"], .server-sidebar, nav[role="navigation"]',
    description: 'Server list sidebar - should be visible and properly positioned',
    expectedBehavior: 'Always visible, fixed width, proper spacing'
  },
  channelSidebar: {
    selector: '[data-testid="channel-sidebar"], .channel-sidebar, aside',
    description: 'Channel/member sidebar - should adapt to screen width',
    expectedBehavior: 'Responsive width, no horizontal overflow'
  },
  mainChatArea: {
    selector: '[data-testid="chat-messages"], .chat-area, main',
    description: 'Main chat content area - should fill available space',
    expectedBehavior: 'Flexible width, no horizontal scrollbar'
  },
  navigationBar: {
    selector: '[data-testid="navigation-bar"], .navigation-bar, header',
    description: 'Top navigation bar - should span full width',
    expectedBehavior: 'Full width, responsive elements'
  },
  userArea: {
    selector: '[data-testid="user-area"], .user-area',
    description: 'User profile area - should be properly positioned',
    expectedBehavior: 'Fixed position, proper spacing'
  }
} as const;

/**
 * Helper function to check for horizontal scrollbars
 */
async function checkForHorizontalScrollbars(page: Page): Promise<boolean> {
  const hasScrollbar = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  return hasScrollbar;
}

/**
 * Helper function to get element dimensions and position
 */
async function getElementInfo(page: Page, selector: string) {
  return await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const styles = window.getComputedStyle(element);
    return {
      width: rect.width,
      height: rect.height,
      x: rect.x,
      y: rect.y,
      display: styles.display,
      position: styles.position,
      overflow: styles.overflow,
      overflowX: styles.overflowX,
      overflowY: styles.overflowY
    };
  }, selector);
}

/**
 * Helper function to capture desktop screenshot with proper naming
 */
async function captureDesktopScreenshot(page: Page, breakpoint: typeof DESKTOP_BREAKPOINTS[number], testName: string) {
  const screenshotPath = `test-results/desktop-responsive-${breakpoint.name}-${testName}-${breakpoint.width}x${breakpoint.height}.png`;
  await page.screenshot({ 
    path: screenshotPath, 
    fullPage: true,
    animations: 'disabled'
  });
  console.log(`📸 Desktop screenshot captured: ${screenshotPath}`);
  return screenshotPath;
}

test.describe('Desktop Responsive Behavior > 1024px', () => {
  let authPage: AuthPage;
  let serverPage: ServerPage;
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    console.log('🔧 Setting up desktop responsive test...');
    
    // Initialize page objects
    authPage = new AuthPage(page);
    serverPage = new ServerPage(page);
    chatPage = new ChatPage(page);

    // Navigate to application
    await page.goto(TEST_CONFIG.baseUrl);
    await waitForAppReady(page);
  });

  // Test each desktop breakpoint individually
  for (const breakpoint of DESKTOP_BREAKPOINTS) {
    test.describe(`${breakpoint.description} (${breakpoint.width}x${breakpoint.height})`, () => {
      
      test.beforeEach(async ({ page }) => {
        // Set viewport to specific desktop breakpoint
        await page.setViewportSize({ 
          width: breakpoint.width, 
          height: breakpoint.height 
        });
        console.log(`📏 Set viewport to ${breakpoint.width}x${breakpoint.height} for ${breakpoint.name}`);
      });

      test(`should display desktop layout correctly at ${breakpoint.width}px width`, async ({ page }) => {
        console.log(`🖥️ Testing desktop layout at ${breakpoint.description}`);

        // Handle authentication if needed
        if (!await isAuthBypassActive(page)) {
          try {
            await authPage.login(TEST_CONFIG.testUser.username, TEST_CONFIG.testUser.password, TEST_CONFIG.homeserver);
            await waitForMatrixSync(page);
          } catch (error) {
            console.warn('⚠️ Authentication failed, attempting bypass...', error);
            await bypassAuthenticationDirectly(page);
          }
        }

        // Wait for app to be ready
        await waitForAppReady(page);
        
        // Capture initial screenshot
        await captureDesktopScreenshot(page, breakpoint, 'layout');

        // Check for horizontal scrollbars (should not exist on desktop)
        const hasHorizontalScrollbar = await checkForHorizontalScrollbars(page);
        expect(hasHorizontalScrollbar, `Desktop layout at ${breakpoint.width}px should not have horizontal scrollbars`).toBeFalsy();

        // Test that main UI elements are visible and properly positioned
        for (const [elementName, element] of Object.entries(DESKTOP_UI_ELEMENTS)) {
          console.log(`🔍 Testing ${elementName}: ${element.description}`);
          
          const elementInfo = await getElementInfo(page, element.selector);
          if (elementInfo) {
            // Element should be visible
            expect(elementInfo.display).not.toBe('none');
            
            // Element should not overflow horizontally
            expect(elementInfo.x).toBeGreaterThanOrEqual(0);
            expect(elementInfo.x + elementInfo.width).toBeLessThanOrEqual(breakpoint.width);
            
            console.log(`✅ ${elementName} properly positioned: ${elementInfo.width}px wide at ${elementInfo.x}px`);
          } else {
            console.warn(`⚠️ ${elementName} not found with selector: ${element.selector}`);
          }
        }
      });

      test(`should scale UI components correctly at ${breakpoint.width}px width`, async ({ page }) => {
        console.log(`📐 Testing UI component scaling at ${breakpoint.description}`);

        // Handle authentication if needed
        if (!await isAuthBypassActive(page)) {
          try {
            await authPage.login(TEST_CONFIG.testUser.username, TEST_CONFIG.testUser.password, TEST_CONFIG.homeserver);
            await waitForMatrixSync(page);
          } catch (error) {
            console.warn('⚠️ Authentication failed, attempting bypass...', error);
            await bypassAuthenticationDirectly(page);
          }
        }

        // Wait for app to be ready
        await waitForAppReady(page);

        // Test that components scale appropriately for desktop sizes
        const mainChatArea = await getElementInfo(page, DESKTOP_UI_ELEMENTS.mainChatArea.selector);
        if (mainChatArea) {
          // Chat area should utilize available width efficiently
          // On desktop, expect chat area to be substantial width
          const minExpectedWidth = breakpoint.width * 0.4; // At least 40% of screen width
          expect(mainChatArea.width).toBeGreaterThanOrEqual(minExpectedWidth);
          console.log(`✅ Chat area scales appropriately: ${mainChatArea.width}px (expected >= ${minExpectedWidth}px)`);
        }

        // Capture scaling screenshot
        await captureDesktopScreenshot(page, breakpoint, 'scaling');
      });

      test(`should position navigation elements correctly at ${breakpoint.width}px width`, async ({ page }) => {
        console.log(`🧭 Testing navigation positioning at ${breakpoint.description}`);

        // Handle authentication if needed
        if (!await isAuthBypassActive(page)) {
          try {
            await authPage.login(TEST_CONFIG.testUser.username, TEST_CONFIG.testUser.password, TEST_CONFIG.homeserver);
            await waitForMatrixSync(page);
          } catch (error) {
            console.warn('⚠️ Authentication failed, attempting bypass...', error);
            await bypassAuthenticationDirectly(page);
          }
        }

        // Wait for app to be ready
        await waitForAppReady(page);

        // Test navigation elements positioning
        const serverSidebar = await getElementInfo(page, DESKTOP_UI_ELEMENTS.serverSidebar.selector);
        if (serverSidebar) {
          // Server sidebar should be positioned at left edge on desktop
          expect(serverSidebar.x).toBeLessThanOrEqual(10); // Allow small margin
          console.log(`✅ Server sidebar positioned correctly at x: ${serverSidebar.x}px`);
        }

        const channelSidebar = await getElementInfo(page, DESKTOP_UI_ELEMENTS.channelSidebar.selector);
        if (channelSidebar && serverSidebar) {
          // Channel sidebar should be positioned after server sidebar
          expect(channelSidebar.x).toBeGreaterThanOrEqual(serverSidebar.width - 10);
          console.log(`✅ Channel sidebar positioned correctly at x: ${channelSidebar.x}px`);
        }

        // Capture navigation screenshot
        await captureDesktopScreenshot(page, breakpoint, 'navigation');
      });

      test(`should maintain layout consistency at ${breakpoint.width}px width`, async ({ page }) => {
        console.log(`🏗️ Testing layout consistency at ${breakpoint.description}`);

        // Handle authentication if needed
        if (!await isAuthBypassActive(page)) {
          try {
            await authPage.login(TEST_CONFIG.testUser.username, TEST_CONFIG.testUser.password, TEST_CONFIG.homeserver);
            await waitForMatrixSync(page);
          } catch (error) {
            console.warn('⚠️ Authentication failed, attempting bypass...', error);
            await bypassAuthenticationDirectly(page);
          }
        }

        // Wait for app to be ready
        await waitForAppReady(page);

        // Test overall layout consistency
        let totalWidth = 0;
        const elementWidths: Record<string, number> = {};

        for (const [elementName, element] of Object.entries(DESKTOP_UI_ELEMENTS)) {
          const elementInfo = await getElementInfo(page, element.selector);
          if (elementInfo && elementInfo.display !== 'none') {
            elementWidths[elementName] = elementInfo.width;
            if (elementName === 'serverSidebar' || elementName === 'channelSidebar') {
              totalWidth += elementInfo.width;
            }
          }
        }

        // Ensure sidebars don't consume too much screen real estate on desktop
        const maxSidebarWidth = breakpoint.width * 0.5; // Max 50% for sidebars combined
        expect(totalWidth).toBeLessThanOrEqual(maxSidebarWidth);
        console.log(`✅ Sidebar widths appropriate: ${totalWidth}px (max allowed: ${maxSidebarWidth}px)`);

        // Capture consistency screenshot
        await captureDesktopScreenshot(page, breakpoint, 'consistency');

        console.log('📊 Desktop layout measurements:', elementWidths);
      });
    });
  }

  test('should maintain consistent behavior across all desktop breakpoints', async ({ page }) => {
    console.log('🔄 Testing consistency across all desktop breakpoints');

    const consistencyResults: Array<{
      breakpoint: typeof DESKTOP_BREAKPOINTS[number];
      measurements: Record<string, any>;
    }> = [];

    // Test each breakpoint and collect measurements
    for (const breakpoint of DESKTOP_BREAKPOINTS) {
      console.log(`📏 Testing ${breakpoint.description}...`);
      
      // Set viewport
      await page.setViewportSize({ 
        width: breakpoint.width, 
        height: breakpoint.height 
      });

      // Handle authentication if needed
      if (!await isAuthBypassActive(page)) {
        try {
          await authPage.login(TEST_CONFIG.testUser.username, TEST_CONFIG.testUser.password, TEST_CONFIG.homeserver);
          await waitForMatrixSync(page);
        } catch (error) {
          console.warn('⚠️ Authentication failed, attempting bypass...', error);
          await bypassAuthenticationDirectly(page);
        }
      }

      // Wait for app to be ready
      await waitForAppReady(page);

      // Collect measurements
      const measurements: Record<string, any> = {
        hasHorizontalScrollbar: await checkForHorizontalScrollbars(page),
        viewportWidth: breakpoint.width,
        viewportHeight: breakpoint.height
      };

      for (const [elementName, element] of Object.entries(DESKTOP_UI_ELEMENTS)) {
        const elementInfo = await getElementInfo(page, element.selector);
        measurements[elementName] = elementInfo;
      }

      consistencyResults.push({ breakpoint, measurements });

      // Capture comparison screenshot
      await captureDesktopScreenshot(page, breakpoint, 'comparison');
    }

    // Analyze consistency across breakpoints
    console.log('🔍 Analyzing consistency across desktop breakpoints...');
    
    // Check that no breakpoint has horizontal scrollbars
    for (const result of consistencyResults) {
      expect(result.measurements.hasHorizontalScrollbar, `${result.breakpoint.description} should not have horizontal scrollbars`).toBeFalsy();
    }

    // Check that UI elements maintain proper proportions
    const serverSidebarWidths = consistencyResults
      .map(r => r.measurements.serverSidebar?.width)
      .filter(w => w != null);
      
    if (serverSidebarWidths.length > 1) {
      // Server sidebar should maintain consistent width across desktop sizes
      const widthVariation = Math.max(...serverSidebarWidths) - Math.min(...serverSidebarWidths);
      expect(widthVariation).toBeLessThanOrEqual(50); // Allow max 50px variation
      console.log(`✅ Server sidebar width consistency: ${widthVariation}px variation`);
    }

    console.log('📈 Desktop breakpoint consistency results:', consistencyResults);
  });
});

/**
 * Utility test to document desktop responsive requirements
 */
test.describe('Desktop Responsive Requirements Documentation', () => {
  test('should document desktop responsive requirements', async () => {
    const requirements = {
      breakpoints: DESKTOP_BREAKPOINTS,
      uiElements: DESKTOP_UI_ELEMENTS,
      expectations: {
        noHorizontalScrollbars: 'Desktop layouts should never show horizontal scrollbars',
        properScaling: 'UI components should scale appropriately for larger screens',
        navigationPositioning: 'Navigation elements should be properly positioned and accessible',
        layoutConsistency: 'Layout should be consistent across all desktop breakpoints'
      },
      testCoverage: {
        layoutTests: 'Verify overall layout integrity at each breakpoint',
        scalingTests: 'Test component scaling behavior',
        navigationTests: 'Verify navigation element positioning',
        consistencyTests: 'Ensure behavior consistency across breakpoints'
      }
    };

    console.log('📋 Desktop Responsive Testing Requirements:', JSON.stringify(requirements, null, 2));
    
    // This test always passes - it's for documentation
    expect(true).toBe(true);
  });
});