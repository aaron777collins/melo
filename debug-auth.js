const { chromium } = require('@playwright/test');

async function debugAuth() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('🔐 Starting authentication debug...');
    
    // Go to sign-in page
    console.log('📍 Navigating to sign-in page...');
    await page.goto('https://dev2.aaroncollins.info/sign-in');
    await page.waitForLoadState('networkidle');
    console.log(`✅ Current URL: ${page.url()}`);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'debug-signin-page.png', fullPage: true });
    console.log('📷 Screenshot saved as debug-signin-page.png');
    
    // Check what elements are visible
    console.log('🔍 Checking form elements...');
    
    const usernameInput = await page.locator('[data-testid="username-input"], input[type="text"]').first();
    const usernameVisible = await usernameInput.isVisible();
    console.log(`📝 Username input visible: ${usernameVisible}`);
    
    const passwordInput = await page.locator('[data-testid="password-input"], input[type="password"]').first();
    const passwordVisible = await passwordInput.isVisible();
    console.log(`🔐 Password input visible: ${passwordVisible}`);
    
    const submitButton = await page.locator('[data-testid="login-button"], button[type="submit"]');
    const submitVisible = await submitButton.isVisible();
    console.log(`🚀 Submit button visible: ${submitVisible}`);
    
    if (usernameVisible && passwordVisible && submitVisible) {
      console.log('✅ All required elements found, attempting login...');
      
      // Fill credentials
      await usernameInput.fill('sophietest');
      console.log('📝 Username filled');
      
      await passwordInput.fill('SophieTest2026!');
      console.log('🔐 Password filled');
      
      // Click submit
      await submitButton.click();
      console.log('🚀 Submit button clicked');
      
      // Wait for potential navigation
      await page.waitForTimeout(10000);
      console.log(`📍 After submit URL: ${page.url()}`);
      
      // Check for errors
      const errorElement = await page.locator('[data-testid="error-message"], .text-red-400, .text-red-500').first();
      const hasError = await errorElement.isVisible();
      if (hasError) {
        const errorText = await errorElement.textContent();
        console.log(`❌ Error found: ${errorText}`);
      } else {
        console.log('✅ No error message found');
      }
      
      // Take final screenshot
      await page.screenshot({ path: 'debug-after-login.png', fullPage: true });
      console.log('📷 Final screenshot saved as debug-after-login.png');
      
    } else {
      console.log('❌ Required form elements not found');
      
      // Get page content for debugging
      const pageContent = await page.content();
      console.log('📄 Page content length:', pageContent.length);
      
      // Look for any input elements
      const allInputs = await page.locator('input').count();
      console.log(`📝 Total input elements found: ${allInputs}`);
      
      const allButtons = await page.locator('button').count();
      console.log(`🚀 Total button elements found: ${allButtons}`);
    }
    
  } catch (error) {
    console.error('❌ Error during authentication debug:', error);
  } finally {
    await browser.close();
  }
}

debugAuth();