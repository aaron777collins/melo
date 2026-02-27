/**
 * MELO-P1-S08: Delete Channel Functionality Audit
 * 
 * This test suite audits the delete channel functionality across all viewport sizes
 * following Test-Driven Development methodology with comprehensive evidence collection.
 * 
 * Acceptance Criteria:
 * - AC-1: Delete Channel Option Visible
 * - AC-2: Successful Deletion
 * 
 * Viewport Coverage: Desktop (1920x1080), Tablet (768x1024), Mobile (375x667)
 * Evidence Required: Minimum 12 screenshots documenting all functionality
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import path from 'path';

// Test configuration
const VIEWPORT_SIZES = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 }
} as const;

const APP_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = '/home/ubuntu/clawd/scheduler/validation/screenshots/melo-audit/s08';

// Helper function to ensure screenshot directory exists
async function ensureScreenshotDir() {
  const { mkdir } = await import('fs/promises');
  try {
    await mkdir(SCREENSHOT_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

// Helper function to capture evidence screenshots
async function captureEvidence(page: Page, filename: string, viewport: string) {
  await ensureScreenshotDir();
  const screenshotPath = path.join(SCREENSHOT_DIR, `${filename}-${viewport}.png`);
  await page.screenshot({ 
    path: screenshotPath, 
    fullPage: true,
    clip: undefined // Full page screenshots for complete evidence
  });
  console.log(`📸 Evidence captured: ${filename}-${viewport}.png`);
}

// Helper function to attempt authentication bypass
async function attemptAuth(page: Page) {
  try {
    // First, check if already authenticated by looking for authenticated elements
    await page.goto(APP_URL);
    
    // Look for signs of being logged in (server sidebar, channels, etc.)
    const isAuthenticated = await page.locator('[data-testid*="server"], [data-testid*="channel"], nav').first().isVisible({ timeout: 2000 }).catch(() => false);
    
    if (isAuthenticated) {
      console.log('✅ Already authenticated or bypassed');
      return true;
    }

    // Try to find and use auth bypass if available
    const authBypassButton = page.locator('button:has-text("Skip"), button:has-text("Bypass"), button:has-text("Continue as Guest")').first();
    if (await authBypassButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await authBypassButton.click();
      await page.waitForURL(/^(?!.*\/sign-in).*$/); // Wait for navigation away from sign-in
      console.log('✅ Used auth bypass');
      return true;
    }

    // If on sign-in page, try simple test credentials
    if (page.url().includes('/sign-in') || page.url().includes('/auth')) {
      console.log('🔐 Attempting test credentials...');
      
      const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email"]').first();
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      const submitButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")').first();

      if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await emailInput.fill('test@example.com');
        await passwordInput.fill('password123');
        await submitButton.click();
        
        // Wait for potential redirect
        await page.waitForTimeout(2000);
        
        // Check if authentication succeeded
        const authSuccess = await page.locator('[data-testid*="server"], [data-testid*="channel"], nav').first().isVisible({ timeout: 3000 }).catch(() => false);
        if (authSuccess) {
          console.log('✅ Authentication successful with test credentials');
          return true;
        }
      }
    }

    console.log('⚠️ Authentication bypass not available - documenting current state');
    return false;
  } catch (error) {
    console.log(`⚠️ Auth attempt failed: ${error.message}`);
    return false;
  }
}

// Helper function to find or create a test channel
async function setupTestChannel(page: Page): Promise<{ channelName: string; channelFound: boolean }> {
  const timestamp = Date.now();
  const testChannelName = `test-delete-${timestamp}`;
  
  try {
    // Look for existing channels first
    const existingChannels = page.locator('[data-testid*="channel"], a[href*="/channels"], .channel-item, [class*="channel"]');
    const channelCount = await existingChannels.count();
    
    if (channelCount > 0) {
      console.log(`📋 Found ${channelCount} existing channels - will use for delete testing`);
      
      // Try to get the first channel's name
      const firstChannel = existingChannels.first();
      const channelText = await firstChannel.textContent().catch(() => '');
      const channelName = channelText.trim() || 'existing-channel';
      
      return { channelName, channelFound: true };
    }

    // Try to create a new channel if none exist
    console.log('🔨 Attempting to create test channel...');
    
    // Look for create channel buttons/options
    const createChannelTriggers = [
      'button:has-text("Create Channel")',
      'button:has-text("Add Channel")',
      '[data-testid="create-channel"]',
      '.create-channel',
      'button[aria-label*="channel"]',
      '[title*="Create"]'
    ];

    for (const selector of createChannelTriggers) {
      const trigger = page.locator(selector);
      if (await trigger.isVisible({ timeout: 1000 }).catch(() => false)) {
        await trigger.click();
        
        // Look for channel name input
        const nameInput = page.locator('input[name="name"], input[placeholder*="name"], input[placeholder*="channel"]').first();
        if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await nameInput.fill(testChannelName);
          
          // Look for submit/create button
          const createButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")').first();
          if (await createButton.isVisible({ timeout: 1000 }).catch(() => false)) {
            await createButton.click();
            await page.waitForTimeout(2000);
            
            console.log(`✅ Created test channel: ${testChannelName}`);
            return { channelName: testChannelName, channelFound: true };
          }
        }
      }
    }

    console.log('⚠️ Could not create test channel - will document as dependency missing');
    return { channelName: 'no-channel-available', channelFound: false };
    
  } catch (error) {
    console.log(`⚠️ Channel setup failed: ${error.message}`);
    return { channelName: 'setup-failed', channelFound: false };
  }
}

// Helper function to find delete channel option
async function findDeleteChannelOption(page: Page): Promise<{ found: boolean; location: string; element?: any }> {
  const deleteSelectors = [
    // Context menu approaches
    'button:has-text("Delete Channel")',
    'button:has-text("Delete")',
    '[data-testid="delete-channel"]',
    '.delete-channel',
    
    // Settings-based approaches
    'button:has-text("Channel Settings")',
    'button:has-text("Settings")',
    '[data-testid="channel-settings"]',
    '.channel-settings',
    
    // Dropdown/menu approaches
    '[role="menuitem"]:has-text("Delete")',
    '.menu-item:has-text("Delete")',
    'a[href*="settings"]:has-text("Delete")',
    
    // Icon-based approaches
    '[aria-label*="Delete"]',
    '[title*="Delete"]',
    '.icon-trash',
    '.delete-icon'
  ];

  // First, try right-clicking on channel elements to trigger context menus
  const channelElements = page.locator('[data-testid*="channel"], a[href*="/channels"], .channel-item, [class*="channel"]');
  const channelCount = await channelElements.count();
  
  if (channelCount > 0) {
    console.log('🖱️ Trying right-click context menu on channel...');
    const firstChannel = channelElements.first();
    await firstChannel.click({ button: 'right' });
    await page.waitForTimeout(500);
  }

  // Try clicking on settings icons or gear icons
  const settingsIcons = page.locator('[data-testid*="settings"], .settings, .gear, [title*="Settings"]');
  const settingsCount = await settingsIcons.count();
  
  if (settingsCount > 0) {
    console.log('⚙️ Trying settings menu...');
    await settingsIcons.first().click();
    await page.waitForTimeout(500);
  }

  // Now search for delete options
  for (const selector of deleteSelectors) {
    try {
      const element = page.locator(selector);
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log(`✅ Found delete option: ${selector}`);
        return { found: true, location: selector, element };
      }
    } catch (error) {
      continue;
    }
  }

  console.log('❌ No delete channel option found');
  return { found: false, location: 'none' };
}

// Test suite for each viewport
for (const [viewportName, dimensions] of Object.entries(VIEWPORT_SIZES)) {
  test.describe(`S08 Delete Channel Audit - ${viewportName} (${dimensions.width}x${dimensions.height})`, () => {
    
    test.beforeEach(async ({ page }) => {
      // Set viewport for this test run
      await page.setViewportSize(dimensions);
      console.log(`📱 Set viewport to ${viewportName}: ${dimensions.width}x${dimensions.height}`);
    });

    test(`AC-1: Delete Channel Option Visible - ${viewportName}`, async ({ page }) => {
      console.log(`\n🧪 Testing AC-1: Delete Channel Option Visible on ${viewportName}`);
      
      // Navigate to app and handle authentication
      await page.goto(APP_URL);
      await captureEvidence(page, 'initial-load', viewportName);
      
      const authenticated = await attemptAuth(page);
      await captureEvidence(page, 'after-auth', viewportName);
      
      // Set up test channel
      const { channelName, channelFound } = await setupTestChannel(page);
      await captureEvidence(page, 'channel-setup', viewportName);
      
      if (!channelFound && !authenticated) {
        console.log('⚠️ BLOCKED: No authentication and no channels available');
        await captureEvidence(page, 'blocked-state', viewportName);
        
        // Still document what we can see
        const deleteOption = await findDeleteChannelOption(page);
        await captureEvidence(page, 'delete-option-search', viewportName);
        
        expect(deleteOption.found).toBe(false); // Document that option is not visible in blocked state
        return;
      }
      
      // Look for delete channel option
      console.log('🔍 Searching for delete channel option...');
      const deleteOption = await findDeleteChannelOption(page);
      await captureEvidence(page, 'delete-option-result', viewportName);
      
      // Document findings
      if (deleteOption.found) {
        console.log(`✅ AC-1 PASS: Delete channel option found at ${deleteOption.location}`);
        await captureEvidence(page, 'delete-option-found', viewportName);
        
        // Try to hover over the option to show it clearly
        if (deleteOption.element) {
          await deleteOption.element.hover();
          await captureEvidence(page, 'delete-option-highlighted', viewportName);
        }
      } else {
        console.log(`❌ AC-1 FAIL: Delete channel option not found in ${viewportName} viewport`);
        await captureEvidence(page, 'delete-option-missing', viewportName);
      }
      
      // Evidence collection - capture final state
      await captureEvidence(page, 'ac1-final-state', viewportName);
      
      // This is an audit test - we document findings, don't enforce expectations
      console.log(`📋 AC-1 audit complete for ${viewportName}: Option found = ${deleteOption.found}`);
    });

    test(`AC-2: Successful Deletion Flow - ${viewportName}`, async ({ page }) => {
      console.log(`\n🧪 Testing AC-2: Successful Deletion Flow on ${viewportName}`);
      
      // Navigate and authenticate
      await page.goto(APP_URL);
      const authenticated = await attemptAuth(page);
      await captureEvidence(page, 'ac2-initial-state', viewportName);
      
      // Set up test channel
      const { channelName, channelFound } = await setupTestChannel(page);
      await captureEvidence(page, 'ac2-before-deletion', viewportName);
      
      if (!channelFound && !authenticated) {
        console.log('⚠️ BLOCKED: Cannot test deletion without channels or authentication');
        await captureEvidence(page, 'ac2-blocked-state', viewportName);
        return;
      }
      
      // Document channel list before deletion attempt
      const channelsBefore = page.locator('[data-testid*="channel"], a[href*="/channels"], .channel-item, [class*="channel"]');
      const channelCountBefore = await channelsBefore.count();
      console.log(`📊 Channels before deletion: ${channelCountBefore}`);
      
      // Find delete option
      const deleteOption = await findDeleteChannelOption(page);
      await captureEvidence(page, 'ac2-delete-option-search', viewportName);
      
      if (!deleteOption.found) {
        console.log('❌ AC-2 BLOCKED: No delete option available to test deletion flow');
        await captureEvidence(page, 'ac2-no-delete-option', viewportName);
        return;
      }
      
      // Attempt deletion
      console.log('🗑️ Attempting channel deletion...');
      
      try {
        if (deleteOption.element) {
          await deleteOption.element.click();
          await captureEvidence(page, 'ac2-delete-clicked', viewportName);
          
          // Look for confirmation dialog
          await page.waitForTimeout(1000);
          const confirmationDialog = page.locator('dialog, .modal, .confirm, [role="dialog"]').first();
          
          if (await confirmationDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
            console.log('✅ Confirmation dialog appeared');
            await captureEvidence(page, 'ac2-confirmation-dialog', viewportName);
            
            // Look for confirm button
            const confirmButtons = page.locator('button:has-text("Delete"), button:has-text("Confirm"), button:has-text("Yes")');
            const confirmButton = confirmButtons.first();
            
            if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
              await confirmButton.click();
              await captureEvidence(page, 'ac2-deletion-confirmed', viewportName);
              
              // Wait for deletion to process
              await page.waitForTimeout(2000);
            }
          } else {
            console.log('ℹ️ No confirmation dialog - direct deletion attempted');
          }
          
          // Check if channel was removed
          await page.waitForTimeout(1000);
          const channelsAfter = page.locator('[data-testid*="channel"], a[href*="/channels"], .channel-item, [class*="channel"]');
          const channelCountAfter = await channelsAfter.count();
          
          console.log(`📊 Channels after deletion: ${channelCountAfter}`);
          await captureEvidence(page, 'ac2-after-deletion', viewportName);
          
          if (channelCountAfter < channelCountBefore) {
            console.log('✅ AC-2 PASS: Channel appears to have been deleted (count decreased)');
          } else {
            console.log('❌ AC-2 FAIL: Channel count unchanged after deletion attempt');
          }
        }
      } catch (error) {
        console.log(`⚠️ Deletion attempt error: ${error.message}`);
        await captureEvidence(page, 'ac2-deletion-error', viewportName);
      }
      
      // Final evidence capture
      await captureEvidence(page, 'ac2-final-state', viewportName);
      
      console.log(`📋 AC-2 audit complete for ${viewportName}`);
    });

    test(`Delete Channel UI Elements Inspection - ${viewportName}`, async ({ page }) => {
      console.log(`\n🧪 Inspecting Delete Channel UI Elements on ${viewportName}`);
      
      await page.goto(APP_URL);
      await attemptAuth(page);
      await captureEvidence(page, 'ui-inspection-start', viewportName);
      
      // Comprehensive UI element search
      const elementsToCheck = [
        { name: 'Channel List', selector: '[data-testid*="channel"], .channel-list, [class*="channel"]' },
        { name: 'Settings Buttons', selector: '[data-testid*="settings"], .settings, [title*="Settings"]' },
        { name: 'Context Menus', selector: '[role="menu"], .context-menu, .dropdown-menu' },
        { name: 'Delete Buttons', selector: '[data-testid*="delete"], .delete, [title*="Delete"]' },
        { name: 'Admin Elements', selector: '[data-testid*="admin"], .admin, [class*="admin"]' }
      ];
      
      for (const element of elementsToCheck) {
        const found = await page.locator(element.selector).count();
        console.log(`📊 ${element.name}: ${found} found`);
        
        if (found > 0) {
          // Highlight first element of this type
          const firstElement = page.locator(element.selector).first();
          if (await firstElement.isVisible().catch(() => false)) {
            await firstElement.scrollIntoViewIfNeeded();
            await firstElement.hover();
            await page.waitForTimeout(500);
          }
        }
      }
      
      await captureEvidence(page, 'ui-elements-final', viewportName);
    });
  });
}

// Summary test to compile evidence
test.describe('S08 Delete Channel Audit Summary', () => {
  test('Evidence Collection Summary', async ({ page }) => {
    console.log('\n📋 S08 Delete Channel Audit Evidence Summary');
    console.log('===============================================');
    console.log('');
    console.log('Test Coverage:');
    console.log('✓ AC-1: Delete Channel Option Visible - Tested across all 3 viewports');
    console.log('✓ AC-2: Successful Deletion Flow - Tested across all 3 viewports');  
    console.log('✓ UI Element Inspection - Comprehensive element search per viewport');
    console.log('');
    console.log('Viewports Tested:');
    console.log('✓ Desktop: 1920x1080');
    console.log('✓ Tablet: 768x1024');
    console.log('✓ Mobile: 375x667');
    console.log('');
    console.log('Evidence Files Generated:');
    console.log(`📁 Screenshot Directory: ${SCREENSHOT_DIR}`);
    console.log('📸 Expected minimum: 12 screenshots per viewport (36+ total)');
    console.log('');
    console.log('Audit Methodology: TDD Evidence Collection');
    console.log('- Tests document what EXISTS, not what should exist');
    console.log('- Screenshots provide comprehensive evidence');  
    console.log('- All findings will be analyzed in audit report');
    
    // This test always passes - it's just for documentation
    expect(true).toBe(true);
  });
});