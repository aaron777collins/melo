/**
 * Screenshot Evidence Collection for clawd-4t0
 * 
 * Captures registration form screenshots at 3 viewports for validation evidence.
 * Run with: pnpm exec playwright test tests/e2e/screenshot-evidence.spec.ts
 */

import { test, expect } from '@playwright/test';
import path from 'path';

const EVIDENCE_DIR = '/home/ubuntu/clawd/scheduler/evidence/clawd-4t0/screenshots';

const viewports = [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 667 }
] as const;

for (const viewport of viewports) {
  test.describe(`${viewport.name} viewport (${viewport.width}x${viewport.height})`, () => {
    test.use({ 
      viewport: { width: viewport.width, height: viewport.height }
    });

    test(`capture registration form - ${viewport.name}`, async ({ page }) => {
      // Navigate to sign-up page
      await page.goto('/sign-up', { waitUntil: 'networkidle' });
      
      // Wait for form to be visible
      await page.waitForSelector('[data-testid="username-input"]', { timeout: 10000 });
      
      // Take screenshot of empty form
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, `${viewport.name}-empty.png`),
        fullPage: true
      });
      
      // Fill in form data
      await page.fill('[data-testid="username-input"]', 'testuser123');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.fill('input[id="confirmPassword"]', 'TestPassword123!');
      
      // Wait for validation indicators
      await page.waitForTimeout(1500);
      
      // Take screenshot of filled form
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, `${viewport.name}-filled.png`),
        fullPage: true
      });
      
      // Verify key form elements exist
      await expect(page.getByTestId('username-input')).toBeVisible();
      await expect(page.getByTestId('password-input')).toBeVisible();
      await expect(page.getByTestId('signup-button')).toBeVisible();
    });
  });
}
