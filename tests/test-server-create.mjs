/**
 * HAOS Server Creation Test
 */

import { chromium } from '@playwright/test';
import fs from 'fs';

const BASE_URL = 'https://dev2.aaroncollins.info';
const SCREENSHOT_DIR = '/tmp/haos-screenshots';
const TEST_USER = 'sophietest';
const TEST_PASS = 'SophieTest2026!';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function screenshot(page, name) {
  const path = `${SCREENSHOT_DIR}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`📸 ${path}`);
}

async function runTest() {
  console.log('🚀 Server Creation Test\n');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true
  });
  
  const page = await context.newPage();

  try {
    // Login first
    console.log('📋 Step 1: Login');
    await page.goto(`${BASE_URL}/sign-in`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    const usernameInput = page.locator('input[type="text"]').first();
    let tries = 0;
    while (await usernameInput.isDisabled() && tries < 10) {
      await page.waitForTimeout(500);
      tries++;
    }
    
    await page.locator('input[type="url"]').fill('https://dev2.aaroncollins.info');
    await usernameInput.fill(TEST_USER);
    await page.locator('input[type="password"]').fill(TEST_PASS);
    await page.locator('button[type="submit"]').click();
    
    await page.waitForTimeout(5000);
    await screenshot(page, 'create-01-after-login');
    console.log(`   URL after login: ${page.url()}`);
    
    // Check for server creation modal
    console.log('\n📋 Step 2: Server Creation Modal');
    const modalVisible = await page.locator('text=Create your first server').isVisible().catch(() => false);
    console.log(`   Modal visible: ${modalVisible}`);
    
    if (modalVisible) {
      await screenshot(page, 'create-02-modal');
      
      // Fill server name
      console.log('\n📋 Step 3: Fill server name');
      const nameInput = page.locator('input[placeholder*="Awesome"]');
      await nameInput.fill('TestServer');
      console.log('   Filled server name: TestServer');
      await screenshot(page, 'create-03-name-filled');
      
      // Click Create
      console.log('\n📋 Step 4: Create server');
      const createBtn = page.locator('button:has-text("Create")');
      await createBtn.click();
      console.log('   Clicked Create...');
      
      await page.waitForTimeout(5000);
      await screenshot(page, 'create-04-after-create');
      console.log(`   URL after create: ${page.url()}`);
      
      // Check for errors
      const errorEl = page.locator('.text-red-500, .bg-red-50');
      const hasError = await errorEl.isVisible().catch(() => false);
      if (hasError) {
        const errorText = await errorEl.textContent();
        console.log(`   ❌ Error: ${errorText}`);
      } else {
        console.log('   ✅ No visible errors');
      }
    }
    
    console.log('\n✅ Test complete');
    
  } catch (error) {
    console.log(`\n💥 Error: ${error.message}`);
    await screenshot(page, 'error');
  } finally {
    await browser.close();
  }
}

runTest().catch(console.error);
