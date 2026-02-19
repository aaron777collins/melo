/**
 * Authentication Bypass System Test
 * 
 * Simple test to verify the authentication bypass system works
 */

import { test, expect } from '@playwright/test';
import { bypassAuthenticationDirectly, isAuthBypassActive } from './helpers/auth-bypass';
import { TEST_CONFIG } from './fixtures/test-data';

test.describe('Authentication Bypass System', () => {
  
  test('should bypass authentication successfully', async ({ page }) => {
    console.log('🔧 Testing authentication bypass system...');
    
    // Use authentication bypass
    await bypassAuthenticationDirectly(page);
    
    // Verify bypass is active
    const bypassActive = await isAuthBypassActive(page);
    console.log(`Authentication bypass active: ${bypassActive}`);
    
    expect(bypassActive).toBe(true);
    
    // Verify localStorage has auth data
    const authData = await page.evaluate(() => {
      return {
        hasUserId: !!localStorage.getItem('mx_user_id'),
        hasAccessToken: !!localStorage.getItem('mx_access_token'),
        hasDeviceId: !!localStorage.getItem('mx_device_id'),
        testMode: localStorage.getItem('e2e_auth_bypass'),
        userId: localStorage.getItem('mx_user_id'),
        accessTokenPrefix: localStorage.getItem('mx_access_token')?.substring(0, 10)
      };
    });
    
    console.log('Authentication data:', authData);
    
    expect(authData.hasUserId).toBe(true);
    expect(authData.hasAccessToken).toBe(true);
    expect(authData.hasDeviceId).toBe(true);
    expect(authData.testMode).toBe('true');
    expect(authData.userId).toContain('@sophietest:');
    expect(authData.accessTokenPrefix).toBe('e2e_mock_a');
    
    // Check URL - should not be on sign-in page
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    expect(currentUrl).not.toContain('/sign-in');
    
    // Take screenshot
    await page.screenshot({
      path: 'test-results/auth-bypass-success.png',
      fullPage: true
    });
    
    console.log('✅ Authentication bypass system working correctly');
  });

});