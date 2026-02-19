/**
 * Detailed Debug Sign-Up Test
 * 
 * Examines form field detection and submission process in detail
 */

import { test, expect } from '@playwright/test';
import { waitForAppReady } from '../fixtures';

test('detailed sign-up form analysis', async ({ page }) => {
  const testUsername = `detailtest-${Date.now()}`;
  const testPassword = 'DetailTest2026!';
  
  console.log(`🔍 Analyzing sign-up form with username: ${testUsername}`);
  
  // Go to sign-up page
  await page.goto('/sign-up');
  await waitForAppReady(page);
  
  // Wait for form to be ready
  await page.waitForTimeout(2000);
  
  // Analyze form fields
  console.log('📋 Analyzing form fields...');
  
  // Check for all input fields
  const allInputs = await page.locator('input').count();
  console.log(`   Found ${allInputs} input fields`);
  
  // Check specific field types
  const usernameFields = await page.locator('input[type="text"], input[placeholder*="username" i]').count();
  const emailFields = await page.locator('input[type="email"], input[placeholder*="email" i]').count();
  const passwordFields = await page.locator('input[type="password"]').count();
  
  console.log(`   Username fields: ${usernameFields}`);
  console.log(`   Email fields: ${emailFields}`);
  console.log(`   Password fields: ${passwordFields}`);
  
  // Analyze buttons
  const submitButtons = await page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Sign up"), button:has-text("Register")').count();
  console.log(`   Submit buttons: ${submitButtons}`);
  
  try {
    // Try to find and fill username field
    const usernameInput = page.locator('input[type="text"], input[placeholder*="username" i]').first();
    await usernameInput.waitFor({ timeout: 5000 });
    await usernameInput.fill(testUsername);
    console.log('   ✅ Username field filled');
  } catch (error) {
    console.log(`   ❌ Could not fill username field: ${error.message}`);
  }
  
  try {
    // Try to fill email field (optional)
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    if (await emailInput.isVisible({ timeout: 1000 })) {
      await emailInput.fill(`${testUsername}@example.com`);
      console.log('   ✅ Email field filled');
    } else {
      console.log('   ℹ️ No email field found (optional)');
    }
  } catch (error) {
    console.log('   ℹ️ Email field not accessible (optional)');
  }
  
  try {
    // Try to fill first password field
    const firstPasswordInput = page.locator('input[type="password"]').first();
    await firstPasswordInput.waitFor({ timeout: 5000 });
    await firstPasswordInput.fill(testPassword);
    console.log('   ✅ First password field filled');
  } catch (error) {
    console.log(`   ❌ Could not fill first password field: ${error.message}`);
  }
  
  try {
    // Try to fill second password field (confirm password)
    const passwordInputs = await page.locator('input[type="password"]').count();
    if (passwordInputs > 1) {
      const confirmPasswordInput = page.locator('input[type="password"]').nth(1);
      await confirmPasswordInput.fill(testPassword);
      console.log('   ✅ Confirm password field filled');
    } else {
      console.log('   ℹ️ Only one password field found');
    }
  } catch (error) {
    console.log(`   ⚠️ Could not fill confirm password field: ${error.message}`);
  }
  
  // Take a screenshot before submission
  await page.screenshot({ path: 'debug-signup-before-submit.png' });
  
  try {
    // Try to submit the form
    const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Sign up"), button:has-text("Register")').first();
    await submitButton.waitFor({ timeout: 5000 });
    
    console.log('🚀 Attempting form submission...');
    await submitButton.click();
    
    // Wait for response
    await page.waitForTimeout(10000);
    
    // Check result
    const currentUrl = page.url();
    console.log(`   Current URL after submission: ${currentUrl}`);
    
    // Take screenshot after submission
    await page.screenshot({ path: 'debug-signup-after-submit.png' });
    
    // Check for any error messages
    const errorSelectors = [
      '[data-testid="error-message"]',
      '.text-red-400',
      '.text-red-500',
      '.bg-red-100',
      '[role="alert"]',
      '.error',
      '.alert-error'
    ];
    
    for (const selector of errorSelectors) {
      const errorElement = page.locator(selector).first();
      if (await errorElement.isVisible({ timeout: 1000 })) {
        const errorText = await errorElement.textContent();
        console.log(`   ❌ Error found (${selector}): ${errorText}`);
      }
    }
    
    // Check for success indicators
    if (!currentUrl.includes('/sign-up')) {
      console.log('   ✅ Successfully redirected from sign-up page');
    } else {
      console.log('   ❌ Still on sign-up page');
      
      // Check if form fields are still populated
      const usernameValue = await page.locator('input[type="text"]').first().inputValue().catch(() => '');
      const passwordValue = await page.locator('input[type="password"]').first().inputValue().catch(() => '');
      
      console.log(`   Form state - Username: "${usernameValue}", Password: "${passwordValue.length} chars"`);
    }
    
  } catch (error) {
    console.log(`   ❌ Form submission failed: ${error.message}`);
    await page.screenshot({ path: 'debug-signup-submission-error.png' });
  }
});