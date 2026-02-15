/**
 * HAOS v2 Server Creation Test
 * Tests: Create server modal functionality
 */

import { chromium } from '@playwright/test';
import fs from 'fs';

const BASE_URL = 'https://dev2.aaroncollins.info';
const SCREENSHOT_DIR = '/tmp/haos-screenshots';

async function screenshot(page, name) {
  const path = `${SCREENSHOT_DIR}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`📸 Screenshot: ${path}`);
  return path;
}

async function runTests() {
  console.log('🚀 Testing Server Creation Flow...\n');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true
  });
  
  const page = await context.newPage();
  
  // Capture all console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
    if (msg.type() === 'error') {
      console.log(`🔴 Console Error: ${msg.text()}`);
    }
  });
  
  page.on('pageerror', err => {
    console.log(`🔴 Page Error: ${err.message}`);
  });

  // Capture network
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`🔴 HTTP ${response.status()}: ${response.url()}`);
    }
  });

  try {
    // Go to the app
    console.log('📋 Loading app...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await screenshot(page, '10-initial-state');
    
    console.log(`Current URL: ${page.url()}`);
    
    // Check if we're on sign-in or already logged in
    if (page.url().includes('/sign-in')) {
      console.log('📋 Need to sign in first...');
      // Look for sign-in form
      const signInVisible = await page.locator('text=Welcome to HAOS').isVisible();
      console.log(`Sign-in page visible: ${signInVisible}`);
      await screenshot(page, '11-signin-page');
      
      // We need valid credentials to continue
      console.log('\n⚠️ Cannot test server creation without login');
      console.log('Need to implement login first\n');
      
    } else {
      // Check if modal is visible
      const modalVisible = await page.locator('text=Customize your server').isVisible().catch(() => false);
      console.log(`Server creation modal visible: ${modalVisible}`);
      
      if (modalVisible) {
        console.log('\n📋 Testing Server Creation Modal...\n');
        
        // Test 1: Check close button
        console.log('Test 1: Close button functionality');
        const closeBtn = page.locator('button').filter({ has: page.locator('svg') }).first();
        const closeBtnExists = await closeBtn.count() > 0;
        console.log(`  Close button exists: ${closeBtnExists}`);
        
        // Try clicking outside modal to close
        console.log('  Trying to click outside modal...');
        await page.mouse.click(100, 100);
        await page.waitForTimeout(1000);
        await screenshot(page, '12-after-click-outside');
        
        const stillVisible = await page.locator('text=Customize your server').isVisible().catch(() => false);
        console.log(`  Modal still visible after click outside: ${stillVisible}`);
        
        // Test 2: Check server name input
        console.log('\nTest 2: Server name input');
        const serverNameInput = page.locator('input[placeholder*="server"]').first();
        const inputExists = await serverNameInput.count() > 0;
        console.log(`  Server name input exists: ${inputExists}`);
        
        if (inputExists) {
          await serverNameInput.fill('TestServer');
          console.log('  Filled server name: TestServer');
          await screenshot(page, '13-server-name-filled');
        }
        
        // Test 3: Check Create button
        console.log('\nTest 3: Create button');
        const createBtn = page.locator('button:has-text("Create")');
        const createBtnExists = await createBtn.count() > 0;
        const createBtnEnabled = createBtnExists ? await createBtn.isEnabled() : false;
        console.log(`  Create button exists: ${createBtnExists}`);
        console.log(`  Create button enabled: ${createBtnEnabled}`);
        
        // Test 4: Try clicking Create without image
        if (createBtnEnabled) {
          console.log('\nTest 4: Clicking Create button...');
          
          // Setup network monitoring for server creation request
          const [response] = await Promise.all([
            page.waitForResponse(r => r.url().includes('/api') || r.url().includes('/_matrix'), { timeout: 10000 }).catch(() => null),
            createBtn.click()
          ]);
          
          await page.waitForTimeout(2000);
          await screenshot(page, '14-after-create-click');
          
          if (response) {
            console.log(`  Server responded: ${response.status()} ${response.url()}`);
          } else {
            console.log('  No API request detected after clicking Create');
          }
          
          // Check if modal is still there
          const modalStillThere = await page.locator('text=Customize your server').isVisible().catch(() => false);
          console.log(`  Modal still visible: ${modalStillThere}`);
        }
        
        // Test 5: Check for any error messages
        console.log('\nTest 5: Error messages');
        const errorMessages = await page.locator('.text-red, .error, [role="alert"]').allTextContents();
        if (errorMessages.length > 0) {
          console.log('  Error messages found:');
          errorMessages.forEach(e => console.log(`    - ${e}`));
        } else {
          console.log('  No visible error messages');
        }
        
        // Test 6: X button specifically
        console.log('\nTest 6: X close button');
        const xButton = page.locator('button').filter({ has: page.locator('path[d*="M"]') });
        const xCount = await xButton.count();
        console.log(`  X buttons found: ${xCount}`);
        
        if (xCount > 0) {
          console.log('  Clicking X button...');
          await xButton.first().click({ force: true });
          await page.waitForTimeout(1000);
          await screenshot(page, '15-after-x-click');
          
          const modalAfterX = await page.locator('text=Customize your server').isVisible().catch(() => false);
          console.log(`  Modal visible after X click: ${modalAfterX}`);
        }
      }
    }
    
    // Print console messages summary
    console.log('\n📋 Console Messages Summary:');
    const errors = consoleMessages.filter(m => m.type === 'error');
    const warnings = consoleMessages.filter(m => m.type === 'warning');
    console.log(`  Errors: ${errors.length}`);
    console.log(`  Warnings: ${warnings.length}`);
    if (errors.length > 0) {
      console.log('\n  Error details:');
      errors.slice(0, 5).forEach(e => console.log(`    - ${e.text.substring(0, 100)}`));
    }

  } catch (error) {
    console.log(`\n💥 Test error: ${error.message}`);
    await screenshot(page, 'error-state');
  } finally {
    await browser.close();
  }
  
  console.log('\n✅ Test complete. Check screenshots in /tmp/haos-screenshots/');
}

runTests().catch(console.error);
