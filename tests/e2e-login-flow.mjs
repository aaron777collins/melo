/**
 * HAOS v2 Login and Server Creation E2E Test
 */

import { chromium } from '@playwright/test';
import fs from 'fs';

const BASE_URL = 'https://dev2.aaroncollins.info';
const SCREENSHOT_DIR = '/tmp/haos-screenshots';

// Test user credentials
const TEST_USER = 'sophietest';
const TEST_PASS = 'SophieTest2026!';
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
  console.log('🚀 HAOS E2E Login Test\n');
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
  
  page.on('pageerror', err => {
    console.log(`🔴 Page Error: ${err.message}`);
  });

  try {
    // ============================================
    // STEP 1: Go to sign-in
    // ============================================
    console.log('\n📋 STEP 1: Navigate to sign-in');
    await page.goto(`${BASE_URL}/sign-in`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await screenshot(page, 'login-01-initial');
    
    // ============================================
    // STEP 2: Fill in login form
    // ============================================
    console.log('\n📋 STEP 2: Fill login form');
    
    // Wait for form to be interactive
    const usernameInput = page.locator('input[type="text"]').first();
    await usernameInput.waitFor({ state: 'visible' });
    
    // Wait for hydration
    let tries = 0;
    while (await usernameInput.isDisabled() && tries < 10) {
      await page.waitForTimeout(500);
      tries++;
    }
    
    // Fill homeserver
    const homeserverInput = page.locator('input[type="url"]');
    await homeserverInput.fill(HOMESERVER);
    console.log(`   Homeserver: ${HOMESERVER}`);
    
    // Fill username
    await usernameInput.fill(TEST_USER);
    console.log(`   Username: ${TEST_USER}`);
    
    // Fill password
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill(TEST_PASS);
    console.log(`   Password: ****`);
    
    await screenshot(page, 'login-02-form-filled');
    
    // ============================================
    // STEP 3: Submit login
    // ============================================
    console.log('\n📋 STEP 3: Submit login');
    
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();
    console.log('   Clicked submit...');
    
    // Wait for navigation or error
    await page.waitForTimeout(5000);
    await screenshot(page, 'login-03-after-submit');
    
    console.log(`   Current URL: ${page.url()}`);
    
    // Check for error message
    const errorMsg = await page.locator('.text-red-400, .bg-red-500').textContent().catch(() => null);
    if (errorMsg) {
      console.log(`   ❌ Error: ${errorMsg}`);
    }
    
    // ============================================
    // STEP 4: Check if logged in
    // ============================================
    console.log('\n📋 STEP 4: Verify login');
    
    const isOnSignIn = page.url().includes('/sign-in');
    const hasServerModal = await page.locator('text=Create your first server').isVisible().catch(() => false);
    const hasOldModal = await page.locator('text=Customize your server').isVisible().catch(() => false);
    
    if (!isOnSignIn) {
      console.log('   ✅ Successfully navigated away from sign-in!');
    } else if (hasServerModal || hasOldModal) {
      console.log('   ✅ Login successful - server creation modal visible!');
      await screenshot(page, 'login-04-logged-in-modal');
      
      // ============================================
      // STEP 5: Test server creation
      // ============================================
      console.log('\n📋 STEP 5: Create a test server');
      
      const serverNameInput = page.locator('input[placeholder*="Server"], input[placeholder*="Awesome"]').first();
      if (await serverNameInput.isVisible()) {
        await serverNameInput.fill('SophieTestServer');
        console.log('   Filled server name: SophieTestServer');
        await screenshot(page, 'login-05-server-name');
        
        // Click Create
        const createBtn = page.locator('button:has-text("Create")');
        if (await createBtn.isEnabled()) {
          console.log('   Clicking Create...');
          await createBtn.click();
          await page.waitForTimeout(5000);
          await screenshot(page, 'login-06-after-create');
          console.log(`   After create, URL: ${page.url()}`);
          
          // Check for error
          const createError = await page.locator('.text-red-500, .bg-red-50').textContent().catch(() => null);
          if (createError) {
            console.log(`   ❌ Create error: ${createError}`);
          }
        }
      }
      
    } else {
      console.log('   ⚠️ Still on sign-in page');
      
      // Check PM2 logs for errors
      console.log('   Checking page state...');
    }
    
    // Final screenshot
    await screenshot(page, 'login-99-final');
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST COMPLETE');
    console.log('=' .repeat(60));
    console.log(`Final URL: ${page.url()}`);
    console.log(`Screenshots: ${SCREENSHOT_DIR}`);
    
  } catch (error) {
    console.log(`\n💥 Error: ${error.message}`);
    await screenshot(page, 'error');
  } finally {
    await browser.close();
  }
}

runTests().catch(console.error);
