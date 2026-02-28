/**
 * Debug test to understand registration page loading issues
 */

import { test, expect } from '@playwright/test';

test.describe('Debug Registration Page Loading', () => {

  test('Debug: Check what loads on /sign-up', async ({ page }) => {
    console.log('Navigating to /sign-up...');
    
    // Navigate and wait longer
    await page.goto('/sign-up', { waitUntil: 'networkidle' });
    
    // Take full page screenshot to see what's actually there
    await page.screenshot({ 
      path: 'test-results/debug-registration-page-full.png',
      fullPage: true 
    });
    
    // Get page title and HTML content
    const title = await page.title();
    console.log('Page title:', title);
    
    // Check for any visible text
    const pageText = await page.textContent('body');
    console.log('Page text length:', pageText?.length || 0);
    console.log('First 500 chars:', pageText?.substring(0, 500) || 'No text');
    
    // Check for any form elements
    const inputs = await page.locator('input').count();
    console.log('Number of input elements found:', inputs);
    
    // Check for any errors in console
    let consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });
    
    // Wait a bit to collect console messages
    await page.waitForTimeout(3000);
    
    console.log('Console messages:', consoleMessages);
    
    // Check if we can find any specific elements
    const usernameInput = page.locator('input[name="username"]');
    const isUsernameVisible = await usernameInput.isVisible();
    console.log('Username input visible:', isUsernameVisible);
    
    if (inputs > 0) {
      // List all input elements
      const allInputs = await page.locator('input').all();
      for (let i = 0; i < allInputs.length; i++) {
        const input = allInputs[i];
        const name = await input.getAttribute('name');
        const type = await input.getAttribute('type');
        const placeholder = await input.getAttribute('placeholder');
        console.log(`Input ${i}: name="${name}", type="${type}", placeholder="${placeholder}"`);
      }
    }
  });

  test('Debug: Check basic page navigation', async ({ page }) => {
    // First check if we can navigate to the homepage
    await page.goto('/');
    console.log('Home page URL:', page.url());
    
    await page.screenshot({ 
      path: 'test-results/debug-homepage.png',
      fullPage: true 
    });
    
    // Now try to navigate to sign-up
    await page.goto('/sign-up');
    console.log('Sign-up page URL:', page.url());
    
    await page.screenshot({ 
      path: 'test-results/debug-signup-navigation.png',
      fullPage: true 
    });
  });

});