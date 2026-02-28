/**
 * Test to register real test accounts on MELO
 * Run with: npx playwright test register-accounts.spec.ts
 */

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const TEST_ACCOUNTS = [
  {
    username: 'sophiemelotest1',
    email: 'sophie-melo-test1@aaroncollins.info',
    password: 'MeloTest2026!Primary',
    role: 'primary'
  },
  {
    username: 'sophiemelotest2', 
    email: 'sophie-melo-test2@aaroncollins.info',
    password: 'MeloTest2026!Secondary',
    role: 'secondary'
  },
  {
    username: 'sophieadmin',
    email: 'sophie-melo-admin@aaroncollins.info', 
    password: 'MeloTest2026!Admin',
    role: 'admin'
  }
];

const EVIDENCE_DIR = './tests/e2e/evidence';

// Ensure evidence directory exists
test.beforeAll(async () => {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
});

for (const account of TEST_ACCOUNTS) {
  test(`Register ${account.role} account: ${account.username}`, async ({ page }) => {
    test.setTimeout(60000);
    
    console.log(`\n📝 Registering ${account.role} account: ${account.username}`);
    
    // Go to sign-up page
    await page.goto('/sign-up', { waitUntil: 'networkidle' });
    console.log('   ✓ Loaded sign-up page');
    
    // Wait for page to be interactive
    await page.waitForTimeout(2000);
    
    // Check if form is available
    const usernameInput = page.locator('[data-testid="username-input"]');
    await expect(usernameInput).toBeVisible({ timeout: 15000 });
    
    // Wait for it to not be disabled
    await page.waitForFunction(() => {
      const input = document.querySelector('[data-testid="username-input"]');
      return input && !input.hasAttribute('disabled');
    }, { timeout: 15000 });
    console.log('   ✓ Form is ready');
    
    // Fill in registration form
    await usernameInput.fill(account.username);
    console.log(`   ✓ Filled username: ${account.username}`);
    
    await page.locator('input[name="email"]').fill(account.email);
    console.log(`   ✓ Filled email: ${account.email}`);
    
    await page.locator('[data-testid="password-input"]').fill(account.password);
    console.log('   ✓ Filled password');
    
    await page.locator('input[name="confirmPassword"]').fill(account.password);
    console.log('   ✓ Filled confirm password');
    
    // Take screenshot before submit
    await page.screenshot({ 
      path: `${EVIDENCE_DIR}/registration-${account.role}-before.png`,
      fullPage: true 
    });
    console.log('   ✓ Screenshot saved (before submit)');
    
    // Submit the form
    await page.locator('[data-testid="signup-button"]').click();
    console.log('   ✓ Clicked submit button');
    
    // Wait for result - either redirect or stay on page
    await page.waitForTimeout(5000);
    
    // Take screenshot after submit
    await page.screenshot({ 
      path: `${EVIDENCE_DIR}/registration-${account.role}-after.png`,
      fullPage: true 
    });
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`   → Current URL: ${currentUrl}`);
    
    // Get page content to check for errors
    const pageContent = await page.content();
    
    if (!currentUrl.includes('sign-up')) {
      console.log(`✅ SUCCESS: ${account.username} registered and redirected!`);
    } else if (pageContent.includes('already exists') || pageContent.includes('already taken') || pageContent.includes('Username is taken')) {
      console.log(`ℹ️ Account ${account.username} already exists (this is OK)`);
    } else {
      // Log any error messages visible on page
      const errorMessages = await page.locator('.text-red-500, .text-destructive, [role="alert"]').allTextContents();
      if (errorMessages.length > 0) {
        console.log(`   ⚠️ Errors found: ${errorMessages.join(', ')}`);
      }
      console.log(`⚠️ Still on sign-up page - may need manual verification`);
    }
  });
}
