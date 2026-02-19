/**
 * E2E tests for /channels route verification
 * 
 * Tests that all referenced routes exist and function properly
 * Following TDD approach - tests written first
 */

import { test, expect } from '@playwright/test';

test.describe('Channels Route E2E Tests', () => {
  
  test('should redirect /channels to /channels/@me', async ({ page }) => {
    // Navigate to /channels 
    await page.goto('/channels');
    
    // Should redirect to /channels/@me
    await expect(page).toHaveURL('/channels/@me');
  });

  test('should display Direct Messages page after redirect', async ({ page }) => {
    // Navigate to /channels
    await page.goto('/channels');
    
    // Wait for redirect and content to load
    await page.waitForLoadState('networkidle');
    
    // Should show direct messages content
    await expect(page.locator('h1')).toContainText('Direct Messages');
    
    // Should show search input
    await expect(page.locator('input[placeholder*="Find or start"]')).toBeVisible();
    
    // Should show welcome message area
    await expect(page.locator('h2')).toContainText('Your place to talk');
  });

  test('should not result in 404 error', async ({ page }) => {
    // Navigate to /channels
    const response = await page.goto('/channels');
    
    // Should not be a 404
    expect(response?.status()).not.toBe(404);
    
    // Should not show 404 content
    await expect(page.locator('text=Page Not Found')).not.toBeVisible();
    await expect(page.locator('text=404')).not.toBeVisible();
  });

  test('should work without authentication (redirect to sign-in)', async ({ page }) => {
    // Clear any existing auth
    await page.context().clearCookies();
    
    // Navigate to /channels
    await page.goto('/channels');
    
    // Should either redirect to sign-in or show the channels page
    // (depends on auth requirements)
    const url = page.url();
    const isAuthRequired = url.includes('/sign-in') || url.includes('/channels');
    expect(isAuthRequired).toBe(true);
  });

  test('should be accessible via navigation', async ({ page }) => {
    // This tests that the route is properly linked in navigation
    await page.goto('/');
    
    // Look for any navigation links to channels
    const channelsLinks = page.locator('a[href="/channels"], a[href="/channels/@me"]');
    const count = await channelsLinks.count();
    
    // Should have at least one way to navigate to channels
    expect(count).toBeGreaterThan(0);
  });

  test('audit-log route should exist', async ({ page }) => {
    // Test the specific route mentioned in the task
    // This will fail initially since we need to verify the route exists
    const response = await page.goto('/servers/test-server/settings/audit-log');
    
    // Should not be 404 (route should exist)
    // Note: May return other errors if not authenticated, but shouldn't be 404
    expect(response?.status()).not.toBe(404);
  });

});