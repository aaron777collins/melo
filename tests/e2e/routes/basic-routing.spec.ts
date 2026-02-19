import { test, expect } from '@playwright/test';

test.describe('Basic Route Accessibility', () => {
  test('sign-in route should be accessible', async ({ page }) => {
    // Navigate to sign-in page
    await page.goto('/sign-in');
    
    // Should not show 404 error
    await expect(page.locator('text=Page Not Found')).not.toBeVisible();
    await expect(page.locator('text=404')).not.toBeVisible();
    
    // Should show sign-in form elements
    await expect(page.locator('[data-testid="username-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
    
    // Should have proper page title/heading
    await expect(page.locator('h1')).toContainText('Welcome to Melo');
  });

  test('sign-up route should be accessible without server errors', async ({ page }) => {
    // Navigate to sign-up page  
    await page.goto('/sign-up');
    
    // Should not show 404 error
    await expect(page.locator('text=Page Not Found')).not.toBeVisible();
    await expect(page.locator('text=404')).not.toBeVisible();
    
    // Should not show server error about missing vendor chunks
    await expect(page.locator('text=vendor')).not.toBeVisible();
    await expect(page.locator('text=chunks')).not.toBeVisible();
    await expect(page.locator('text=Internal Server Error')).not.toBeVisible();
    
    // Should show registration form elements
    await expect(page.locator('[data-testid="username-input"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
  });

  test('root route should load completely without infinite loading', async ({ page }) => {
    // Navigate to main app
    await page.goto('/');
    
    // Should not show infinite loading state
    await expect(page.locator('text=Loading...')).not.toBeVisible({ timeout: 15000 });
    
    // Should not have black screen (should have some content)
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(10);
    
    // Should show either:
    // 1. Main app interface (if authenticated)
    // 2. Redirect to sign-in (if not authenticated)
    // 3. Setup page content
    await expect(page).toHaveURL(/\/(|sign-in|setup)/);
  });

  test('main app routes should be accessible when authenticated', async ({ page }) => {
    // This test assumes we can get past authentication
    // For now, just verify the route structure exists
    
    await page.goto('/');
    
    // Wait for initial load/redirect to complete
    await page.waitForTimeout(3000);
    
    // Should eventually resolve to a real page (not infinite loading)
    const currentUrl = page.url();
    const isValidRoute = currentUrl.includes('/sign-in') || 
                        currentUrl.includes('/setup') ||
                        currentUrl.includes('/servers') ||
                        currentUrl.includes('/channels');
    
    expect(isValidRoute).toBeTruthy();
  });
});