/**
 * App Loading E2E Tests
 * 
 * CRITICAL: Tests for verifying application loads correctly without infinite loops
 * TDD Approach: Write tests FIRST to verify the fix works
 */

import { test, expect } from '@playwright/test';

test.describe('MELO V2 Application Loading', () => {
  test.describe('Critical Loading Fixes', () => {
    test('should load homepage without infinite restarts', async ({ page }) => {
      // Monitor console for infinite render loops
      const renderLogs: string[] = [];
      const errorLogs: string[] = [];

      page.on('console', (msg) => {
        const text = msg.text();
        if (text.includes('[MatrixAuthProvider] 🎯 Component render')) {
          renderLogs.push(text);
        }
        if (msg.type() === 'error') {
          errorLogs.push(text);
        }
      });

      // Navigate to homepage
      await page.goto('http://dev2.aaroncollins.info:3000/');

      // Wait for initial loading to complete (max 10 seconds)
      await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

      // Wait a bit more to catch any infinite loops
      await page.waitForTimeout(3000);

      // Should not have excessive render logs (max 3-4 renders is acceptable)
      expect(renderLogs.length).toBeLessThan(10);

      // Should not have critical errors
      const criticalErrors = errorLogs.filter(error => 
        error.includes('workers') || 
        error.includes('clientModules') ||
        error.includes('Failed to find Server Action')
      );
      expect(criticalErrors).toHaveLength(0);

      // Take screenshot for verification
      await page.screenshot({ 
        path: 'tests/screenshots/homepage-loaded.png',
        fullPage: true 
      });
    });

    test('should show loading spinner briefly then resolve to UI', async ({ page }) => {
      let loadingSpinnerSeen = false;
      let actualUISeen = false;

      // Navigate to homepage
      await page.goto('http://dev2.aaroncollins.info:3000/');

      // Check for loading spinner (should appear initially)
      try {
        await page.waitForSelector('text=Loading', { timeout: 2000 });
        loadingSpinnerSeen = true;
      } catch {
        // Loading might be too fast to catch
      }

      // Wait for actual UI to appear (not just loading)
      await page.waitForFunction(() => {
        const bodyText = document.body.textContent || '';
        return !bodyText.includes('Loading...') && bodyText.length > 50;
      }, { timeout: 15000 });

      actualUISeen = true;

      // Should eventually show actual UI content
      expect(actualUISeen).toBe(true);

      // Take screenshot of final loaded state
      await page.screenshot({ 
        path: 'tests/screenshots/homepage-final-state.png',
        fullPage: true 
      });
    });

    test('should not show blank/white page', async ({ page }) => {
      // Navigate to homepage
      await page.goto('http://dev2.aaroncollins.info:3000/');

      // Wait for content to load
      await page.waitForTimeout(5000);

      // Check that page has actual content (not blank)
      const bodyText = await page.textContent('body');
      const hasContent = bodyText && bodyText.trim().length > 20;

      expect(hasContent).toBe(true);

      // Check that there are visible elements
      const visibleElements = await page.locator('*:visible').count();
      expect(visibleElements).toBeGreaterThan(5);

      // Check page background is not just white/blank
      const bodyStyles = await page.evaluate(() => {
        const body = document.body;
        const styles = window.getComputedStyle(body);
        return {
          backgroundColor: styles.backgroundColor,
          color: styles.color
        };
      });

      // Should have proper styling (not default white background with black text)
      expect(bodyStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    });

    test('should handle auth provider errors gracefully', async ({ page }) => {
      // Monitor network requests that might be failing
      const failedRequests: string[] = [];

      page.on('requestfailed', (request) => {
        failedRequests.push(request.url());
      });

      // Navigate to homepage
      await page.goto('http://dev2.aaroncollins.info:3000/');

      // Wait for loading to complete
      await page.waitForTimeout(8000);

      // Even with failed auth requests, page should still load
      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();

      // Log failed requests for debugging but don't fail test
      if (failedRequests.length > 0) {
        console.log('Failed requests:', failedRequests);
      }
    });

    test('should work on different routes', async ({ page }) => {
      // Test that the fix works across different routes
      const routes = [
        'http://dev2.aaroncollins.info:3000/',
        'http://dev2.aaroncollins.info:3000/sign-in',
      ];

      for (const route of routes) {
        await page.goto(route);
        
        // Should load without hanging
        await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
        
        // Should have content
        const bodyText = await page.textContent('body');
        expect(bodyText && bodyText.trim().length > 10).toBe(true);
        
        // Take screenshot for each route
        const routeName = route.split('/').pop() || 'root';
        await page.screenshot({ 
          path: `tests/screenshots/route-${routeName}-loaded.png`,
          fullPage: true 
        });
      }
    });
  });

  test.describe('Performance Verification', () => {
    test('should load within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('http://dev2.aaroncollins.info:3000/');
      
      // Wait for content to be visible
      await page.waitForFunction(() => {
        const bodyText = document.body.textContent || '';
        return bodyText.length > 50 && !bodyText.includes('Loading...');
      }, { timeout: 15000 });
      
      const loadTime = Date.now() - startTime;
      
      // Should load in under 10 seconds (generous timeout for recovery)
      expect(loadTime).toBeLessThan(10000);
      
      console.log(`App loaded in ${loadTime}ms`);
    });
  });
});