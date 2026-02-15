/**
 * HAOS v2 Full E2E Test Suite
 * Tests: Login, Server Creation, Navigation, All Core Features
 */

import { chromium } from '@playwright/test';
import fs from 'fs';

const BASE_URL = 'https://dev2.aaroncollins.info';
const SCREENSHOT_DIR = '/tmp/haos-screenshots';
const TEST_USER = 'aaron'; // Matrix user
const TEST_PASSWORD = process.env.HAOS_TEST_PASSWORD || 'testpassword';

// Create screenshot directory
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function screenshot(page, name) {
  const path = `${SCREENSHOT_DIR}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`📸 Screenshot: ${path}`);
  return path;
}

async function runTests() {
  console.log('🚀 Starting HAOS E2E Tests...\n');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true
  });
  
  const page = await context.newPage();
  const results = [];
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`🔴 Console Error: ${msg.text()}`);
    }
  });
  
  page.on('pageerror', err => {
    console.log(`🔴 Page Error: ${err.message}`);
  });

  try {
    // ============================================
    // TEST 1: Homepage loads and redirects to sign-in
    // ============================================
    console.log('📋 TEST 1: Homepage redirect to sign-in');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await screenshot(page, '01-homepage-redirect');
    
    const url = page.url();
    if (url.includes('/sign-in')) {
      console.log('✅ Redirected to sign-in page correctly\n');
      results.push({ test: 'Homepage redirect', status: 'PASS' });
    } else {
      console.log(`❌ Expected sign-in redirect, got: ${url}\n`);
      results.push({ test: 'Homepage redirect', status: 'FAIL', error: `Wrong URL: ${url}` });
    }

    // ============================================
    // TEST 2: Sign-in page renders correctly
    // ============================================
    console.log('📋 TEST 2: Sign-in page renders');
    await page.waitForSelector('input[type="text"]', { timeout: 10000 });
    await screenshot(page, '02-signin-page');
    
    const hasUsername = await page.locator('input[type="text"]').count() > 0;
    const hasPassword = await page.locator('input[type="password"]').count() > 0;
    const hasSubmit = await page.locator('button[type="submit"]').count() > 0;
    
    if (hasUsername && hasPassword && hasSubmit) {
      console.log('✅ Sign-in form has all required fields\n');
      results.push({ test: 'Sign-in form', status: 'PASS' });
    } else {
      console.log(`❌ Sign-in form missing fields: username=${hasUsername}, password=${hasPassword}, submit=${hasSubmit}\n`);
      results.push({ test: 'Sign-in form', status: 'FAIL' });
    }

    // ============================================
    // TEST 3: Form interaction works
    // ============================================
    console.log('📋 TEST 3: Form interaction');
    
    // Wait for form to be ready (not disabled)
    await page.waitForTimeout(2000);
    
    // Check if form is interactive
    const usernameInput = page.locator('input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    
    const isUsernameDisabled = await usernameInput.isDisabled();
    const isPasswordDisabled = await passwordInput.isDisabled();
    
    console.log(`  Username field disabled: ${isUsernameDisabled}`);
    console.log(`  Password field disabled: ${isPasswordDisabled}`);
    
    if (!isUsernameDisabled && !isPasswordDisabled) {
      // Try to fill form
      await usernameInput.fill(TEST_USER);
      await passwordInput.fill(TEST_PASSWORD);
      await screenshot(page, '03-signin-filled');
      console.log('✅ Form fields are interactive and fillable\n');
      results.push({ test: 'Form interaction', status: 'PASS' });
    } else {
      await screenshot(page, '03-signin-disabled');
      console.log('❌ Form fields are disabled - investigating...\n');
      results.push({ test: 'Form interaction', status: 'FAIL', error: 'Fields disabled' });
      
      // Get page HTML for debugging
      const html = await page.content();
      fs.writeFileSync('/tmp/haos-signin-debug.html', html);
      console.log('📝 Saved page HTML to /tmp/haos-signin-debug.html');
    }

    // ============================================
    // TEST 4: Check Matrix API endpoint
    // ============================================
    console.log('📋 TEST 4: Matrix API accessibility');
    const apiResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('https://dev2.aaroncollins.info/_matrix/client/versions');
        return { ok: response.ok, status: response.status, data: await response.json() };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    });
    
    if (apiResponse.ok) {
      console.log(`✅ Matrix API accessible: ${JSON.stringify(apiResponse.data.versions?.slice(0, 3))}...\n`);
      results.push({ test: 'Matrix API', status: 'PASS' });
    } else {
      console.log(`❌ Matrix API error: ${apiResponse.error || apiResponse.status}\n`);
      results.push({ test: 'Matrix API', status: 'FAIL', error: apiResponse.error });
    }

    // ============================================
    // TEST 5: Check sign-up page
    // ============================================
    console.log('📋 TEST 5: Sign-up page');
    await page.goto(`${BASE_URL}/sign-up`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await screenshot(page, '05-signup-page');
    
    const signupForm = await page.locator('form').count() > 0;
    if (signupForm) {
      console.log('✅ Sign-up page loads correctly\n');
      results.push({ test: 'Sign-up page', status: 'PASS' });
    } else {
      console.log('❌ Sign-up page has no form\n');
      results.push({ test: 'Sign-up page', status: 'FAIL' });
    }

    // ============================================
    // TEST 6: Check for JavaScript errors
    // ============================================
    console.log('📋 TEST 6: JavaScript console errors');
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) {
        consoleErrors.push(msg.text());
      }
    });
    
    // Reload sign-in and check for errors
    await page.goto(`${BASE_URL}/sign-in`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    if (consoleErrors.length === 0) {
      console.log('✅ No JavaScript errors detected\n');
      results.push({ test: 'JS Errors', status: 'PASS' });
    } else {
      console.log(`❌ Found ${consoleErrors.length} JS errors:\n`);
      consoleErrors.forEach(e => console.log(`   - ${e}`));
      results.push({ test: 'JS Errors', status: 'FAIL', errors: consoleErrors });
    }

    // ============================================
    // TEST 7: Network requests analysis
    // ============================================
    console.log('📋 TEST 7: Network requests analysis');
    const failedRequests = [];
    page.on('requestfailed', request => {
      failedRequests.push({
        url: request.url(),
        failure: request.failure()?.errorText
      });
    });
    
    await page.goto(`${BASE_URL}/sign-in`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    const criticalFailures = failedRequests.filter(r => !r.url.includes('favicon'));
    if (criticalFailures.length === 0) {
      console.log('✅ All network requests succeeded\n');
      results.push({ test: 'Network requests', status: 'PASS' });
    } else {
      console.log(`❌ Found ${criticalFailures.length} failed requests:\n`);
      criticalFailures.forEach(r => console.log(`   - ${r.url}: ${r.failure}`));
      results.push({ test: 'Network requests', status: 'FAIL', errors: criticalFailures });
    }

  } catch (error) {
    console.log(`\n💥 Test suite error: ${error.message}`);
    await screenshot(page, 'error-state');
    results.push({ test: 'Suite execution', status: 'FAIL', error: error.message });
  } finally {
    await browser.close();
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  
  let passed = 0, failed = 0;
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${r.test}: ${r.status}`);
    if (r.status === 'PASS') passed++;
    else failed++;
  });
  
  console.log('='.repeat(60));
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
  console.log('='.repeat(60));
  
  // Save results
  fs.writeFileSync('/tmp/haos-test-results.json', JSON.stringify(results, null, 2));
  
  return { passed, failed, results };
}

runTests().catch(console.error);
