/**
 * Simplified Responsive Behavior E2E Tests
 * 
 * Authentication-independent responsive testing focusing on public pages.
 * Tests core responsive behavior without requiring Matrix authentication.
 * 
 * TDD Approach - Simplified:
 * 1. Test public pages (sign-in, landing) responsive behavior
 * 2. Capture screenshots at each breakpoint
 * 3. Validate basic layout responsiveness
 * 4. Document findings for comprehensive report
 */

import { test, expect, type Page } from '@playwright/test';

/**
 * Responsive breakpoint definitions
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

test.describe('Responsive Behavior Tests - Public Pages', () => {
  // Test responsive behavior at each major breakpoint on public pages
  for (const breakpoint of RESPONSIVE_BREAKPOINTS) {
    test(`Public page responsive layout at ${breakpoint.name} (${breakpoint.width}x${breakpoint.height})`, async ({ page }) => {
      // Set viewport to breakpoint dimensions
      await page.setViewportSize({ 
        width: breakpoint.width, 
        height: breakpoint.height 
      });

      // Test sign-in page responsiveness
      await page.goto('/sign-in', { waitUntil: 'networkidle' });
      
      // Wait for page to be ready
      await page.waitForLoadState('domcontentloaded');
      
      // Take screenshot of sign-in page at this breakpoint
      await page.screenshot({ 
        path: `test-results/signin-responsive-${breakpoint.name}.png`,
        fullPage: true 
      });

      // Test basic responsive elements on sign-in page
      const signInForm = page.locator('form', { hasText: /sign in/i }).first();
      const signInButton = page.locator('button[type="submit"], button[type="button"]', { hasText: /sign in/i }).first();
      
      // Verify form is visible and properly sized
      if (await signInForm.isVisible()) {
        const formBox = await signInForm.boundingBox();
        if (formBox) {
          // Form should not exceed viewport width
          expect(formBox.width).toBeLessThanOrEqual(breakpoint.width);
          
          // Form should be reasonably sized for the viewport
          const expectedMinWidth = Math.min(280, breakpoint.width * 0.8);
          expect(formBox.width).toBeGreaterThan(expectedMinWidth);
        }
      }

      // Test button touch target size on mobile
      if (breakpoint.width < 768 && await signInButton.isVisible()) {
        const buttonBox = await signInButton.boundingBox();
        if (buttonBox) {
          // Mobile buttons should meet 44px touch target minimum
          expect(Math.min(buttonBox.width, buttonBox.height)).toBeGreaterThanOrEqual(44);
        }
      }

      // Test root page responsiveness  
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.waitForLoadState('domcontentloaded');
      
      // Take screenshot of root page at this breakpoint
      await page.screenshot({ 
        path: `test-results/root-responsive-${breakpoint.name}.png`,
        fullPage: true 
      });

      // Test basic layout elements
      await testBasicLayoutResponsiveness(page, breakpoint);
    });
  }

  test('Mobile-first responsive design validation', async ({ page }) => {
    // Test that the design works mobile-first
    const mobileBreakpoints = RESPONSIVE_BREAKPOINTS.filter(bp => bp.width < 768);
    
    for (const breakpoint of mobileBreakpoints) {
      await page.setViewportSize({ 
        width: breakpoint.width, 
        height: breakpoint.height 
      });

      await page.goto('/sign-in', { waitUntil: 'networkidle' });
      
      // Test mobile-specific behaviors
      const viewport = page.viewportSize();
      expect(viewport?.width).toBe(breakpoint.width);
      
      // Verify no horizontal scroll
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // Allow 1px tolerance
      
      console.log(`Mobile test ${breakpoint.name}: viewport=${viewportWidth}, body=${bodyWidth}`);
    }
  });

  test('Tablet breakpoint transitions', async ({ page }) => {
    // Test the transition points between mobile and desktop
    const transitionWidths = [768, 800, 900, 1024, 1200, 1280];
    
    for (const width of transitionWidths) {
      await page.setViewportSize({ width, height: 1024 });
      await page.goto('/sign-in', { waitUntil: 'networkidle' });
      
      // Take screenshot at transition point
      await page.screenshot({ 
        path: `test-results/transition-${width}px.png`,
        fullPage: true 
      });
      
      // Test that layout adapts at each transition
      const hasHorizontalScroll = await page.evaluate(() => 
        document.body.scrollWidth > window.innerWidth
      );
      expect(hasHorizontalScroll).toBe(false);
      
      console.log(`Transition test ${width}px: no horizontal scroll ✅`);
    }
  });

  test('Desktop layout verification', async ({ page }) => {
    // Test desktop-specific behavior
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/sign-in', { waitUntil: 'networkidle' });
    
    // Desktop should have adequate spacing and centering
    const signInContainer = page.locator('div', { has: page.locator('form') }).first();
    
    if (await signInContainer.isVisible()) {
      const containerBox = await signInContainer.boundingBox();
      const viewport = page.viewportSize();
      
      if (containerBox && viewport) {
        // Container should be centered on desktop
        const centerX = viewport.width / 2;
        const containerCenterX = containerBox.x + containerBox.width / 2;
        const centeringTolerance = viewport.width * 0.1; // 10% tolerance
        
        expect(Math.abs(centerX - containerCenterX)).toBeLessThan(centeringTolerance);
        console.log(`Desktop centering: viewport center=${centerX}, container center=${containerCenterX} ✅`);
      }
    }
  });
});

/**
 * Test basic layout responsiveness
 */
async function testBasicLayoutResponsiveness(page: Page, breakpoint: typeof RESPONSIVE_BREAKPOINTS[0]) {
  // Check for common responsive issues
  
  // 1. No horizontal overflow
  const hasHorizontalScroll = await page.evaluate(() => {
    return document.body.scrollWidth > window.innerWidth;
  });
  expect(hasHorizontalScroll).toBe(false);
  
  // 2. Text readability (not too small on mobile)
  if (breakpoint.width < 768) {
    const textElements = page.locator('p, span, div').filter({ hasText: /\w+/ });
    const count = await textElements.count();
    
    if (count > 0) {
      // Check a few text elements for minimum font size on mobile
      for (let i = 0; i < Math.min(count, 3); i++) {
        const fontSize = await textElements.nth(i).evaluate(el => {
          const style = window.getComputedStyle(el);
          return parseFloat(style.fontSize);
        });
        
        // Mobile text should be at least 14px for readability
        expect(fontSize).toBeGreaterThanOrEqual(14);
      }
    }
  }
  
  // 3. Touch target sizes on mobile
  if (breakpoint.width < 768) {
    const buttons = page.locator('button, input[type="submit"], a[role="button"]');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const boundingBox = await button.boundingBox();
        if (boundingBox) {
          // Touch targets should be at least 44px in one dimension
          const minDimension = Math.min(boundingBox.width, boundingBox.height);
          if (minDimension < 44) {
            console.warn(`Small touch target found: ${boundingBox.width}x${boundingBox.height}`);
          }
        }
      }
    }
  }
  
  console.log(`Layout test ${breakpoint.name}: responsive checks passed ✅`);
}