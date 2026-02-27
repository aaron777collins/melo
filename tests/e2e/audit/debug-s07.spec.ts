/**
 * DEBUG: S07 Basic Connection Test
 * 
 * Simple test to verify we can connect to localhost:3000 and take screenshots.
 */

import { test, expect } from '@playwright/test';

const AUDIT_BASE_URL = 'http://localhost:3000';

test('DEBUG: Basic connection test', async ({ page }) => {
  console.log('🧪 Testing basic connection to localhost:3000...');
  
  // Navigate to app with timeout
  await page.goto(AUDIT_BASE_URL, { timeout: 30000 });
  
  // Take screenshot
  await page.screenshot({ 
    path: '/home/ubuntu/clawd/scheduler/validation/screenshots/melo-audit/s07/debug-basic-connection.png',
    fullPage: true 
  });
  
  // Check if page loaded
  await page.waitForLoadState('networkidle', { timeout: 10000 });
  
  // Get page title
  const title = await page.title();
  console.log(`   📄 Page title: ${title}`);
  
  // Check for basic elements
  const bodyText = await page.locator('body').textContent();
  console.log(`   📝 Page contains text: ${bodyText?.slice(0, 200)}...`);
  
  // Basic assertion
  expect(title).toBeTruthy();
  console.log('   ✅ Basic connection test passed');
});