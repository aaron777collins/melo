/**
 * Standalone script to register test accounts
 * Run with: node register-accounts.mjs
 */

import { chromium } from 'playwright';
import fs from 'fs';

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
const EVIDENCE_DIR = './tests/e2e/evidence';

async function registerAccount(browser, account) {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();
  
  console.log(`\n📝 Registering ${account.role} account: ${account.username}`);
  
  try {
    // Go to sign-up page
    await page.goto(`${BASE_URL}/sign-up`, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('   ✓ Loaded sign-up page');
    
    // Wait for form to be ready (not disabled)
    try {
      await page.waitForSelector('[data-testid="username-input"]:not([disabled])', { timeout: 15000 });
      console.log('   ✓ Form is ready');
    } catch (e) {
      console.log('   ⚠ Form may still be loading, attempting anyway...');
    }
    
    // Small delay to ensure page is interactive
    await page.waitForTimeout(1000);
    
    // Fill in registration form
    await page.fill('[data-testid="username-input"]', account.username);
    console.log(`   ✓ Filled username: ${account.username}`);
    
    await page.fill('input[name="email"]', account.email);
    console.log(`   ✓ Filled email: ${account.email}`);
    
    await page.fill('[data-testid="password-input"]', account.password);
    console.log('   ✓ Filled password');
    
    await page.fill('input[name="confirmPassword"]', account.password);
    console.log('   ✓ Filled confirm password');
    
    // Take screenshot before submit
    await page.screenshot({ 
      path: `${EVIDENCE_DIR}/registration-${account.role}-before.png`,
      fullPage: true 
    });
    console.log('   ✓ Screenshot saved (before submit)');
    
    // Submit the form
    await page.click('[data-testid="signup-button"]');
    console.log('   ✓ Clicked submit button');
    
    // Wait for result
    await page.waitForTimeout(3000);
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`   → Current URL: ${currentUrl}`);
    
    // Take screenshot after submit
    await page.screenshot({ 
      path: `${EVIDENCE_DIR}/registration-${account.role}-after.png`,
      fullPage: true 
    });
    
    // Check for success or error
    if (!currentUrl.includes('sign-up')) {
      console.log(`✅ SUCCESS: ${account.username} registered!`);
      return { success: true, account };
    } else {
      // Check for error message
      const pageContent = await page.content();
      if (pageContent.includes('already exists') || pageContent.includes('already taken')) {
        console.log(`ℹ️ Account ${account.username} already exists`);
        return { success: true, account, alreadyExists: true };
      }
      console.log(`⚠️ May need to check: still on sign-up page`);
      return { success: false, account, url: currentUrl };
    }
    
  } catch (error) {
    console.error(`❌ Error registering ${account.username}:`, error.message);
    await page.screenshot({ 
      path: `${EVIDENCE_DIR}/registration-${account.role}-error.png`,
      fullPage: true 
    }).catch(() => {});
    return { success: false, account, error: error.message };
  } finally {
    await context.close();
  }
}

async function main() {
  // Create evidence directory
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  
  console.log('🚀 Starting MELO test account registration');
  console.log(`   Target: ${BASE_URL}`);
  console.log(`   Accounts to register: ${TEST_ACCOUNTS.length}`);
  
  const browser = await chromium.launch({ 
    headless: true // Change to false to see the browser
  });
  
  const results = [];
  
  for (const account of TEST_ACCOUNTS) {
    const result = await registerAccount(browser, account);
    results.push(result);
  }
  
  await browser.close();
  
  console.log('\n📊 Registration Results:');
  console.log('========================');
  for (const r of results) {
    const status = r.success ? (r.alreadyExists ? '⚠️ EXISTS' : '✅ OK') : '❌ FAIL';
    console.log(`  ${status} ${r.account.username} (${r.account.role})`);
  }
  
  // Save results
  fs.writeFileSync(
    `${EVIDENCE_DIR}/registration-results.json`, 
    JSON.stringify(results, null, 2)
  );
  console.log(`\n📁 Results saved to ${EVIDENCE_DIR}/registration-results.json`);
}

main().catch(console.error);
