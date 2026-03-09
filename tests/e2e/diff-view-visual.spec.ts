/**
 * E2E Visual Tests for VH-009: Diff View Component
 * 
 * Captures screenshots at 3 viewports for evidence collection.
 * @bead clawd-kus.9
 */

import { test, expect } from '@playwright/test';

// Sample diff content
const oldContent = `function greet(name) {
  console.log("Hello, " + name);
  return true;
}

function farewell() {
  console.log("Goodbye");
}`;

const newContent = `function greet(name) {
  console.log("Hello, " + name + "!");
  console.log("Welcome!");
  return true;
}

function farewell(name) {
  console.log("Goodbye, " + name);
}

function newFunction() {
  return "I am new";
}`;

test.describe('VH-009: Diff View Visual Tests', () => {
  // Test at Desktop viewport (1920x1080)
  test('desktop viewport - split mode', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/dev/diff-view-test');
    
    // Wait for component to load
    await page.waitForSelector('[data-testid="diff-view-container"]');
    
    // Screenshot
    await page.screenshot({ 
      path: 'scheduler/evidence/clawd-kus.9/screenshots/desktop-split.png',
      fullPage: false
    });
    
    // Verify basic rendering
    await expect(page.getByTestId('diff-panel-left')).toBeVisible();
    await expect(page.getByTestId('diff-panel-right')).toBeVisible();
  });

  test('desktop viewport - unified mode', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/dev/diff-view-test?mode=unified');
    
    await page.waitForSelector('[data-testid="diff-view-container"]');
    
    await page.screenshot({ 
      path: 'scheduler/evidence/clawd-kus.9/screenshots/desktop-unified.png',
      fullPage: false
    });
    
    await expect(page.getByTestId('diff-panel-unified')).toBeVisible();
  });

  // Test at Tablet viewport (768x1024)
  test('tablet viewport - split mode', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/dev/diff-view-test');
    
    await page.waitForSelector('[data-testid="diff-view-container"]');
    
    await page.screenshot({ 
      path: 'scheduler/evidence/clawd-kus.9/screenshots/tablet-split.png',
      fullPage: false
    });
  });

  // Test at Mobile viewport (375x667)
  test('mobile viewport - split mode', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dev/diff-view-test');
    
    await page.waitForSelector('[data-testid="diff-view-container"]');
    
    await page.screenshot({ 
      path: 'scheduler/evidence/clawd-kus.9/screenshots/mobile-split.png',
      fullPage: false
    });
  });

  test('navigation controls visible', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/dev/diff-view-test?nav=true');
    
    await page.waitForSelector('[data-testid="diff-view-container"]');
    
    // Test navigation buttons
    const nextButton = page.getByRole('button', { name: /next change/i });
    const prevButton = page.getByRole('button', { name: /previous change/i });
    
    await expect(nextButton).toBeVisible();
    await expect(prevButton).toBeVisible();
    
    await page.screenshot({ 
      path: 'scheduler/evidence/clawd-kus.9/screenshots/desktop-navigation.png',
      fullPage: false
    });
  });

  test('mode toggle visible', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/dev/diff-view-test?toggle=true');
    
    await page.waitForSelector('[data-testid="diff-view-container"]');
    
    // Test toggle buttons
    const unifiedBtn = page.getByRole('button', { name: /unified/i });
    const splitBtn = page.getByRole('button', { name: /split/i });
    
    await expect(unifiedBtn).toBeVisible();
    await expect(splitBtn).toBeVisible();
    
    // Click to switch mode
    await unifiedBtn.click();
    await page.waitForSelector('[data-testid="diff-panel-unified"]');
    
    await page.screenshot({ 
      path: 'scheduler/evidence/clawd-kus.9/screenshots/desktop-mode-toggle.png',
      fullPage: false
    });
  });
});
