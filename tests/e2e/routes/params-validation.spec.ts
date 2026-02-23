/**
 * Next.js 15 Params Validation Tests
 * 
 * Tests that all dynamic routes handle params correctly after the async params fix.
 * These tests verify that pages don't throw 500 errors and properly handle route parameters.
 */

import { test, expect, Page } from '@playwright/test';

// Skip auth setup for these tests - we're testing route handling, not Matrix integration
test.use({ storageState: { cookies: [], origins: [] } });

// Test helper to check page doesn't have Next.js error
async function expectNoNextError(page: Page) {
  // Check for Next.js error overlay
  const errorOverlay = await page.locator('#__next_error__').count();
  expect(errorOverlay).toBe(0);
  
  // Check for "Section Error" in visible text
  const sectionErrors = await page.locator('text="Section Error"').count();
  expect(sectionErrors).toBe(0);
  
  // Check for "Internal Server Error"
  const serverError = await page.locator('text="Internal Server Error"').count();
  expect(serverError).toBe(0);
}

test.describe('Next.js 15 Async Params Fix', () => {
  
  test.describe('Server Routes', () => {
    
    test('server page handles encoded room ID without 500', async ({ page }) => {
      // Use a properly encoded Matrix room ID
      const roomId = '!testroom:dev2.aaroncollins.info';
      const encodedRoomId = encodeURIComponent(roomId);
      
      const response = await page.goto(`/servers/${encodedRoomId}`, {
        waitUntil: 'domcontentloaded'
      });
      
      // Should not be 500
      expect(response?.status()).not.toBe(500);
      
      // Should redirect to sign-in OR show actual page
      const url = page.url();
      expect(url.includes('/sign-in') || url.includes('/servers/')).toBe(true);
      
      await expectNoNextError(page);
    });
    
    test('server channel page handles encoded params without 500', async ({ page }) => {
      const serverId = '!testspace:dev2.aaroncollins.info';
      const channelId = '!testchannel:dev2.aaroncollins.info';
      
      const response = await page.goto(
        `/servers/${encodeURIComponent(serverId)}/channels/${encodeURIComponent(channelId)}`,
        { waitUntil: 'domcontentloaded' }
      );
      
      expect(response?.status()).not.toBe(500);
      await expectNoNextError(page);
    });
    
    test('server conversations page handles encoded params without 500', async ({ page }) => {
      const serverId = '!testspace:dev2.aaroncollins.info';
      const memberId = '@testuser:dev2.aaroncollins.info';
      
      const response = await page.goto(
        `/servers/${encodeURIComponent(serverId)}/conversations/${encodeURIComponent(memberId)}`,
        { waitUntil: 'domcontentloaded' }
      );
      
      expect(response?.status()).not.toBe(500);
      await expectNoNextError(page);
    });
  });
  
  test.describe('DM Routes', () => {
    
    test('DM room page handles encoded room ID without 500', async ({ page }) => {
      const roomId = '!testdm:dev2.aaroncollins.info';
      
      const response = await page.goto(
        `/channels/@me/${encodeURIComponent(roomId)}`,
        { waitUntil: 'domcontentloaded' }
      );
      
      // Should either redirect to sign-in or show DM page, not 500
      expect(response?.status()).not.toBe(500);
      await expectNoNextError(page);
    });
    
    test('DM room page with video param works without 500', async ({ page }) => {
      const roomId = '!testdm:dev2.aaroncollins.info';
      
      const response = await page.goto(
        `/channels/@me/${encodeURIComponent(roomId)}?video=true`,
        { waitUntil: 'domcontentloaded' }
      );
      
      expect(response?.status()).not.toBe(500);
      await expectNoNextError(page);
    });
  });
  
  test.describe('Invite Routes', () => {
    
    test('invite page handles invite code without 500', async ({ page }) => {
      const inviteCode = 'test-invite-code-123';
      
      const response = await page.goto(
        `/invite/${inviteCode}`,
        { waitUntil: 'domcontentloaded' }
      );
      
      // Invite page should load (200) even if invite is invalid
      expect(response?.status()).not.toBe(500);
      await expectNoNextError(page);
    });
    
    test('invite page handles special characters in code without 500', async ({ page }) => {
      const inviteCode = 'invite_with-special.chars';
      
      const response = await page.goto(
        `/invite/${encodeURIComponent(inviteCode)}`,
        { waitUntil: 'domcontentloaded' }
      );
      
      expect(response?.status()).not.toBe(500);
      await expectNoNextError(page);
    });
  });
  
  test.describe('Sign In/Up Routes', () => {
    
    test('sign-in page loads without error', async ({ page }) => {
      const response = await page.goto('/sign-in', {
        waitUntil: 'domcontentloaded'
      });
      
      expect(response?.status()).toBe(200);
      await expectNoNextError(page);
      
      // Should show sign-in form
      await expect(page.locator('text="Sign In"').first()).toBeVisible();
    });
    
    test('sign-up page loads without error', async ({ page }) => {
      const response = await page.goto('/sign-up', {
        waitUntil: 'domcontentloaded'
      });
      
      expect(response?.status()).toBe(200);
      await expectNoNextError(page);
    });
  });
  
  test.describe('Edge Cases', () => {
    
    test('handles double-encoded URL params', async ({ page }) => {
      // Sometimes URLs get double-encoded
      const roomId = '!test:dev2.aaroncollins.info';
      const doubleEncoded = encodeURIComponent(encodeURIComponent(roomId));
      
      const response = await page.goto(`/servers/${doubleEncoded}`, {
        waitUntil: 'domcontentloaded'
      });
      
      // Should not crash with 500
      expect(response?.status()).not.toBe(500);
    });
    
    test('handles empty params gracefully', async ({ page }) => {
      // This might redirect or show error, but shouldn't 500
      const response = await page.goto('/servers/', {
        waitUntil: 'domcontentloaded'
      });
      
      // 404 is acceptable, 500 is not
      expect(response?.status()).not.toBe(500);
    });
    
    test('handles unicode in params', async ({ page }) => {
      const roomId = '!test🎉:dev2.aaroncollins.info';
      
      const response = await page.goto(
        `/servers/${encodeURIComponent(roomId)}`,
        { waitUntil: 'domcontentloaded' }
      );
      
      expect(response?.status()).not.toBe(500);
    });
  });
});
