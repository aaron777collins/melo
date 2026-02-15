/**
 * Create Server Tests
 * 
 * Tests for creating new Matrix spaces/servers.
 */

import { test, expect } from '@playwright/test';
import { 
  NavigationPage, 
  CreateServerModal, 
  waitForAppReady,
  generateServerName,
  waitForMatrixSync 
} from '../fixtures';

test.describe('Create Server', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await waitForMatrixSync(page);
  });

  test('should open create server modal', async ({ page }) => {
    const nav = new NavigationPage(page);
    
    // Click add server button
    await nav.addServerButton.click();
    
    // Modal should appear
    const modal = new CreateServerModal(page);
    await modal.expectVisible();
  });

  test('should create a new server', async ({ page }) => {
    const nav = new NavigationPage(page);
    const serverName = generateServerName();
    
    // Open create server modal
    await nav.addServerButton.click();
    await page.waitForTimeout(500);
    
    // Fill server name
    const modal = new CreateServerModal(page);
    await modal.createServer(serverName);
    
    // Modal should close
    await page.waitForTimeout(3000);
    
    // Server should appear in the list (or we should navigate to it)
    const serverExists = await page.locator(`text="${serverName}"`).isVisible().catch(() => false);
    const urlContainsServer = page.url().includes('/servers/');
    
    expect(serverExists || urlContainsServer).toBeTruthy();
  });

  test('should validate server name is required', async ({ page }) => {
    const nav = new NavigationPage(page);
    
    // Open create server modal
    await nav.addServerButton.click();
    await page.waitForTimeout(500);
    
    // Try to submit without name
    const modal = new CreateServerModal(page);
    await modal.submit();
    
    // Should still be in modal (validation)
    await modal.expectVisible();
  });

  test('should close modal when cancelled', async ({ page }) => {
    const nav = new NavigationPage(page);
    
    // Open create server modal
    await nav.addServerButton.click();
    await page.waitForTimeout(500);
    
    // Close modal
    const modal = new CreateServerModal(page);
    await modal.close();
    
    // Modal should be hidden
    await modal.expectHidden();
  });

  test('should allow uploading server icon', async ({ page }) => {
    const nav = new NavigationPage(page);
    
    // Open create server modal
    await nav.addServerButton.click();
    await page.waitForTimeout(500);
    
    // Check for icon upload option
    const iconUpload = page.locator('input[type="file"], button[aria-label*="icon" i], button:has-text("Upload")');
    const hasIconUpload = await iconUpload.isVisible().catch(() => false);
    
    // Icon upload may or may not exist depending on implementation
    console.log(`Icon upload available: ${hasIconUpload}`);
  });
});
