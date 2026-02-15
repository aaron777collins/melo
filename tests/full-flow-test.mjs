/**
 * HAOS v2 Full Flow Test
 * Tests: Login → Server Creation → Navigation
 */

import { chromium } from '@playwright/test';
import fs from 'fs';

const BASE_URL = 'https://dev2.aaroncollins.info';
const SCREENSHOT_DIR = '/tmp/haos-screenshots';

// Test credentials - uses Matrix test account
const TEST_USER = 'aaron';
const HOMESERVER = 'https://dev2.aaroncollins.info';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function screenshot(page, name) {
  const path = `${SCREENSHOT_DIR}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`📸 ${path}`);
  return path;
}

async function runTests() {
  console.log('🚀 HAOS v2 Full Flow Test\n');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true
  });
  
  const page = await context.newPage();
  
  // Track errors
  const errors = [];
  page.on('pageerror', err => {
    console.log(`🔴 Page Error: ${err.message}`);
    errors.push(err.message);
  });

  try {
    // ============================================
    // STEP 1: Navigate to site
    // ============================================
    console.log('\n📋 STEP 1: Navigate to site');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000); // Wait for React hydration
    await screenshot(page, 'step1-initial');
    console.log(`   URL: ${page.url()}`);
    
    // ============================================
    // STEP 2: Check sign-in page
    // ============================================
    console.log('\n📋 STEP 2: Sign-in page');
    
    if (!page.url().includes('/sign-in')) {
      console.log('   Not on sign-in page, navigating...');
      await page.goto(`${BASE_URL}/sign-in`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
    }
    
    await screenshot(page, 'step2-signin-page');
    
    // Check if form is interactive
    const usernameInput = page.locator('input[type="text"]').first();
    await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
    
    // Wait for hydration - fields should become enabled
    let attempts = 0;
    while (await usernameInput.isDisabled() && attempts < 10) {
      console.log(`   Waiting for hydration... (attempt ${attempts + 1})`);
      await page.waitForTimeout(1000);
      attempts++;
    }
    
    const isEnabled = !(await usernameInput.isDisabled());
    console.log(`   Form interactive: ${isEnabled}`);
    await screenshot(page, 'step2-form-state');
    
    if (!isEnabled) {
      console.log('   ⚠️ Form still disabled - checking for errors...');
      
      // Check console for errors
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      
      await page.reload();
      await page.waitForTimeout(5000);
      await screenshot(page, 'step2-after-reload');
      
      // Try clicking the form to trigger any JS
      await usernameInput.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1000);
      
      const stillDisabled = await usernameInput.isDisabled();
      console.log(`   After interaction, disabled: ${stillDisabled}`);
      
      if (stillDisabled) {
        // Print the form HTML for debugging
        const formHtml = await page.locator('form').first().innerHTML();
        console.log('\n   Form HTML (truncated):');
        console.log(`   ${formHtml.substring(0, 500)}...`);
      }
    }
    
    // ============================================
    // STEP 3: Check homeserver input
    // ============================================
    console.log('\n📋 STEP 3: Homeserver configuration');
    const homeserverInput = page.locator('input[type="url"]').first();
    const homeserverValue = await homeserverInput.inputValue();
    console.log(`   Default homeserver: ${homeserverValue}`);
    
    // Check if we can change it
    const hsDisabled = await homeserverInput.isDisabled();
    console.log(`   Homeserver input disabled: ${hsDisabled}`);
    
    // ============================================
    // STEP 4: Test Matrix API directly
    // ============================================
    console.log('\n📋 STEP 4: Matrix API test');
    
    const apiTest = await page.evaluate(async () => {
      const results = {};
      
      // Test versions endpoint
      try {
        const versionsResp = await fetch('https://dev2.aaroncollins.info/_matrix/client/versions');
        results.versions = versionsResp.ok ? await versionsResp.json() : { error: versionsResp.status };
      } catch (e) {
        results.versions = { error: e.message };
      }
      
      // Test login flows
      try {
        const flowsResp = await fetch('https://dev2.aaroncollins.info/_matrix/client/v3/login');
        results.loginFlows = flowsResp.ok ? await flowsResp.json() : { error: flowsResp.status };
      } catch (e) {
        results.loginFlows = { error: e.message };
      }
      
      return results;
    });
    
    console.log(`   Versions API: ${apiTest.versions.versions ? '✅' : '❌'}`);
    console.log(`   Login Flows API: ${apiTest.loginFlows.flows ? '✅' : '❌'}`);
    if (apiTest.loginFlows.flows) {
      console.log(`   Available flows: ${apiTest.loginFlows.flows.map(f => f.type).join(', ')}`);
    }
    
    // ============================================
    // STEP 5: Check JS bundle loading
    // ============================================
    console.log('\n📋 STEP 5: JavaScript bundle check');
    
    const jsLoaded = await page.evaluate(() => {
      return {
        hasReact: typeof window.__NEXT_DATA__ !== 'undefined',
        nextData: window.__NEXT_DATA__ ? {
          buildId: window.__NEXT_DATA__.buildId,
          page: window.__NEXT_DATA__.page
        } : null,
        windowError: window.__NEXT_HYDRATION_ERROR__ || null
      };
    });
    
    console.log(`   Next.js hydrated: ${jsLoaded.hasReact}`);
    console.log(`   Build ID: ${jsLoaded.nextData?.buildId || 'N/A'}`);
    console.log(`   Hydration error: ${jsLoaded.windowError || 'None'}`);
    
    // ============================================
    // STEP 6: Check for the "Unexpected token" error
    // ============================================
    console.log('\n📋 STEP 6: Error analysis');
    
    if (errors.length > 0) {
      console.log(`   Found ${errors.length} errors:`);
      errors.forEach(e => console.log(`   - ${e.substring(0, 100)}`));
    } else {
      console.log('   No page errors detected');
    }
    
    // ============================================
    // STEP 7: Try navigation
    // ============================================
    console.log('\n📋 STEP 7: Navigation test');
    
    // Go to setup page (should redirect to sign-in or show modal)
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await screenshot(page, 'step7-root-page');
    console.log(`   Root URL redirects to: ${page.url()}`);
    
    // Check for modal
    const modalVisible = await page.locator('text=Create your first server').isVisible().catch(() => false);
    const oldModalVisible = await page.locator('text=Customize your server').isVisible().catch(() => false);
    console.log(`   New server modal visible: ${modalVisible}`);
    console.log(`   Old server modal visible: ${oldModalVisible}`);
    
    if (modalVisible || oldModalVisible) {
      await screenshot(page, 'step7-modal-visible');
      
      // Try to close modal
      console.log('   Testing modal close...');
      const closeBtn = page.locator('button').filter({ has: page.locator('svg') }).first();
      const skipBtn = page.locator('button:has-text("Skip")');
      
      if (await skipBtn.isVisible()) {
        console.log('   Found "Skip" button');
        await skipBtn.click();
        await page.waitForTimeout(1000);
        await screenshot(page, 'step7-after-skip');
        console.log(`   After skip, URL: ${page.url()}`);
      }
    }
    
    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
    console.log(`Total page errors: ${errors.length}`);
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.log(`\n💥 Test error: ${error.message}`);
    await screenshot(page, 'error-final');
  } finally {
    await browser.close();
  }
}

runTests().catch(console.error);
