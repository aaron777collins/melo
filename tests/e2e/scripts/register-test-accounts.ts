/**
 * Script to register real test accounts on MELO
 * Run with: npx playwright test tests/e2e/scripts/register-test-accounts.ts
 */

import { test, expect } from '@playwright/test';

const TEST_ACCOUNTS = [
  {
    username: 'sophie-melo-test1',
    email: 'sophie-melo-test1@aaroncollins.info',
    password: 'MeloTest2026!Primary',
    role: 'primary'
  },
  {
    username: 'sophie-melo-test2', 
    email: 'sophie-melo-test2@aaroncollins.info',
    password: 'MeloTest2026!Secondary',
    role: 'secondary'
  },
  {
    username: 'sophie-melo-admin',
    email: 'sophie-melo-admin@aaroncollins.info', 
    password: 'MeloTest2026!Admin',
    role: 'admin'
  }
];

const BASE_URL = 'https://dev2.aaroncollins.info';

test.describe('Register Test Accounts', () => {
  for (const account of TEST_ACCOUNTS) {
    test(`Register ${account.role} account: ${account.username}`, async ({ page }) => {
      console.log(`\n📝 Registering ${account.role} account: ${account.username}`);
      
      // Go to sign-up page
      await page.goto(`${BASE_URL}/sign-up`, { waitUntil: 'networkidle' });
      
      // Wait for form to be ready (not disabled)
      await page.waitForSelector('[data-testid="username-input"]:not([disabled])', { timeout: 10000 });
      
      // Fill in registration form
      await page.fill('[data-testid="username-input"]', account.username);
      await page.fill('input[name="email"]', account.email);
      await page.fill('[data-testid="password-input"]', account.password);
      await page.fill('input[name="confirmPassword"]', account.password);
      
      // Take screenshot before submit
      await page.screenshot({ 
        path: `tests/e2e/evidence/registration-${account.role}-before.png`,
        fullPage: true 
      });
      
      // Submit the form
      await page.click('[data-testid="signup-button"]');
      
      // Wait for either success (redirect) or error message
      try {
        // Wait for redirect away from sign-up page (success)
        await page.waitForURL((url) => !url.pathname.includes('sign-up'), { timeout: 30000 });
        console.log(`✅ Account ${account.username} registered successfully!`);
        
        // Take screenshot after registration
        await page.screenshot({ 
          path: `tests/e2e/evidence/registration-${account.role}-success.png`,
          fullPage: true 
        });
        
      } catch (error) {
        // Check for error messages on page
        const errorText = await page.textContent('body');
        console.log(`❌ Registration may have failed. Page content snippet: ${errorText?.substring(0, 500)}`);
        
        await page.screenshot({ 
          path: `tests/e2e/evidence/registration-${account.role}-error.png`,
          fullPage: true 
        });
        
        // Check if maybe the account already exists
        if (errorText?.includes('already') || errorText?.includes('exists')) {
          console.log(`ℹ️ Account ${account.username} may already exist`);
        }
      }
    });
  }
});
