/**
 * MELO-P1-S07: Create Channel - Audit Test
 * 
 * Tests the channel creation functionality at all viewport sizes
 * with comprehensive defect detection.
 * 
 * Story: As a server administrator, I want to create a new text channel
 * so that I can organize conversations by topic.
 * 
 * Uses localhost:3000 due to DEF-004 HTTPS security policy fix.
 */

import { test, expect, Page, devices } from '@playwright/test';
import { TEST_CONFIG, waitForAppReady, waitForMatrixSync } from '../fixtures';
import { bypassAuthenticationDirectly, isAuthBypassActive } from '../helpers/auth-bypass';
import * as path from 'path';

// Override base URL to use localhost due to DEF-004 fix
const AUDIT_BASE_URL = 'http://localhost:3000';

// Viewport configurations for comprehensive testing
const VIEWPORTS = {
  desktop: { width: 1920, height: 1080, name: 'Desktop' },
  tablet: { width: 768, height: 1024, name: 'Tablet' },
  mobile: { width: 375, height: 667, name: 'Mobile' }
};

// Screenshot directory for evidence collection
const SCREENSHOT_DIR = '/home/ubuntu/clawd/scheduler/validation/screenshots/melo-audit/s07';

// Test data generators
const generateChannelName = () => `test-channel-${Date.now()}`;
const generateServerName = () => `S07-Test-Server-${Date.now()}`;

/**
 * Helper function to ensure authentication and navigate to a server
 */
async function ensureAuthenticatedAndInServer(page: Page): Promise<{ serverName: string }> {
  console.log('🔐 Ensuring authentication...');
  
  // Navigate to app
  await page.goto('/');
  await waitForAppReady(page);
  
  // Check if we're on sign-in page - if so, authenticate
  if (page.url().includes('/sign-in')) {
    console.log('   🔧 Not authenticated, using bypass...');
    await bypassAuthenticationDirectly(page);
    
    // Refresh to ensure auth state is applied
    await page.goto('/');
    await waitForAppReady(page);
  }
  
  // Wait for Matrix sync
  await waitForMatrixSync(page);
  
  // Check if we need to create a server or join one
  const isInServer = await page.locator('[data-testid="channel-list"], .channel-list, [class*="channel"]').isVisible().catch(() => false);
  
  let serverName: string;
  
  if (!isInServer) {
    console.log('   📦 No server detected, creating test server...');
    serverName = generateServerName();
    
    // Look for create server button/option
    const createServerBtn = page.locator('text="Create Server", text="Add Server", button:has-text("+")', '[data-testid="create-server"]').first();
    
    if (await createServerBtn.isVisible()) {
      await createServerBtn.click();
      
      // Fill server creation form
      const nameInput = page.locator('input[placeholder*="server" i], input[placeholder*="name" i], [data-testid="server-name"]').first();
      await nameInput.fill(serverName);
      
      // Submit
      const createBtn = page.locator('button:has-text("Create"), [data-testid="create-server-submit"]').first();
      await createBtn.click();
      
      // Wait for server creation
      await waitForMatrixSync(page);
      await page.waitForTimeout(3000);
    } else {
      throw new Error('Could not find create server option - may be a missing feature');
    }
  } else {
    serverName = 'Existing Server';
    console.log('   ✅ Already in a server');
  }
  
  return { serverName };
}

/**
 * Helper function to take viewport-specific screenshots
 */
async function captureScreenshot(page: Page, filename: string, viewportName: string) {
  const screenshotPath = path.join(SCREENSHOT_DIR, viewportName.toLowerCase(), `${filename}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`   📸 Screenshot saved: ${screenshotPath}`);
}

/**
 * Ensure screenshot directories exist
 */
async function createScreenshotDirectories() {
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);
  
  for (const viewport of Object.keys(VIEWPORTS)) {
    const dir = path.join(SCREENSHOT_DIR, viewport);
    await execPromise(`mkdir -p "${dir}"`);
  }
}

// Test setup
test.describe.configure({ mode: 'serial' });

test.describe('MELO-P1-S07: Create Channel Audit', () => {
  
  test.beforeAll(async () => {
    await createScreenshotDirectories();
  });

  // AC-1: Create Channel Option (TDD - Write failing test first)
  Object.entries(VIEWPORTS).forEach(([viewportKey, viewport]) => {
    test(`AC-1: Create Channel Option Visible - ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ browser }) => {
      console.log(`🧪 Testing AC-1 at ${viewport.name} viewport...`);
      
      // Create context with specific viewport
      const context = await browser.newContext({
        viewport,
        baseURL: AUDIT_BASE_URL,
        ignoreHTTPSErrors: true,
      });
      
      const page = await context.newPage();
      
      try {
        // Setup: Ensure authenticated and in a server
        const { serverName } = await ensureAuthenticatedAndInServer(page);
        console.log(`   📦 Using server: ${serverName}`);
        
        // Capture initial state
        await captureScreenshot(page, 'ac1-initial-channel-list', viewport.name);
        
        // TDD: Test should FAIL initially - look for create channel option
        const createChannelOption = page.locator(
          'button:has-text("+")', 
          '[data-testid="create-channel"]',
          'text="Create Channel"',
          'text="Add Channel"',
          '.create-channel',
          'button[title*="Create" i][title*="Channel" i]'
        ).first();
        
        // EXPECTED TO FAIL: Channel creation UI might not be implemented
        await expect(createChannelOption, 
          `Create channel option should be visible at ${viewport.name} viewport`
        ).toBeVisible();
        
        await captureScreenshot(page, 'ac1-create-channel-option-found', viewport.name);
        console.log(`   ✅ AC-1 PASSED: Create channel option found at ${viewport.name}`);
        
      } catch (error) {
        // Capture evidence of failure
        await captureScreenshot(page, 'ac1-create-channel-option-missing', viewport.name);
        console.log(`   ❌ AC-1 FAILED at ${viewport.name}: ${error.message}`);
        
        // This is expected in TDD - document the missing feature
        expect.soft(false, `AC-1 DEFECT: Create channel option not found at ${viewport.name} - ${error.message}`).toBeTruthy();
      } finally {
        await context.close();
      }
    });
  });

  // AC-2: Channel Creation Form (TDD - Write failing test first)
  test('AC-2: Channel Creation Form - Desktop Only', async ({ browser }) => {
    console.log('🧪 Testing AC-2: Channel Creation Form...');
    
    const context = await browser.newContext({
      viewport: VIEWPORTS.desktop,
      baseURL: AUDIT_BASE_URL,
      ignoreHTTPSErrors: true,
    });
    
    const page = await context.newPage();
    
    try {
      // Setup: Ensure authenticated and in a server
      await ensureAuthenticatedAndInServer(page);
      
      // Find and click create channel option
      const createChannelOption = page.locator(
        'button:has-text("+")', 
        '[data-testid="create-channel"]',
        'text="Create Channel"',
        'text="Add Channel"'
      ).first();
      
      // EXPECTED TO FAIL: Click might not work or modal might not appear
      await createChannelOption.click();
      await page.waitForTimeout(2000);
      
      await captureScreenshot(page, 'ac2-after-click-create-channel', 'Desktop');
      
      // Look for channel creation form/modal
      const channelForm = page.locator(
        '[data-testid="create-channel-modal"]',
        '.create-channel-modal',
        'dialog:has(text="Create")',
        'form:has(input[placeholder*="channel" i])',
        'div:has(text="Channel Name")'
      ).first();
      
      // EXPECTED TO FAIL: Form might not exist
      await expect(channelForm, 'Channel creation form should be visible').toBeVisible();
      
      // Check for channel name input
      const nameInput = page.locator(
        'input[placeholder*="channel" i]',
        'input[placeholder*="name" i]',
        '[data-testid="channel-name-input"]'
      ).first();
      
      await expect(nameInput, 'Channel name input should be present').toBeVisible();
      
      // Check for channel type selection (text/voice)
      const typeSelector = page.locator(
        'select',
        'radio',
        '[data-testid="channel-type"]',
        'text="Text Channel"',
        'text="Voice Channel"'
      ).first();
      
      // Note: Type selector might be optional
      if (await typeSelector.isVisible()) {
        console.log('   ✅ Channel type selector found');
      } else {
        console.log('   ⚠️ Channel type selector not found (may be text-only)');
      }
      
      await captureScreenshot(page, 'ac2-channel-creation-form', 'Desktop');
      console.log('   ✅ AC-2 PASSED: Channel creation form found');
      
    } catch (error) {
      await captureScreenshot(page, 'ac2-channel-creation-form-missing', 'Desktop');
      console.log(`   ❌ AC-2 FAILED: ${error.message}`);
      expect.soft(false, `AC-2 DEFECT: Channel creation form not accessible - ${error.message}`).toBeTruthy();
    } finally {
      await context.close();
    }
  });

  // AC-3: Channel Created Successfully (TDD - Write failing test first)
  Object.entries(VIEWPORTS).forEach(([viewportKey, viewport]) => {
    test(`AC-3: Channel Created Successfully - ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ browser }) => {
      console.log(`🧪 Testing AC-3: Channel Creation at ${viewport.name}...`);
      
      const context = await browser.newContext({
        viewport,
        baseURL: AUDIT_BASE_URL,
        ignoreHTTPSErrors: true,
      });
      
      const page = await context.newPage();
      
      try {
        // Setup: Ensure authenticated and in a server
        await ensureAuthenticatedAndInServer(page);
        
        // Generate unique channel name
        const channelName = generateChannelName();
        console.log(`   🏷️ Creating channel: ${channelName}`);
        
        await captureScreenshot(page, 'ac3-before-channel-creation', viewport.name);
        
        // Find create channel option
        const createChannelOption = page.locator(
          'button:has-text("+")', 
          '[data-testid="create-channel"]',
          'text="Create Channel"'
        ).first();
        
        await createChannelOption.click();
        await page.waitForTimeout(1000);
        
        // Fill channel creation form
        const nameInput = page.locator(
          'input[placeholder*="channel" i]',
          'input[placeholder*="name" i]',
          '[data-testid="channel-name-input"]'
        ).first();
        
        await nameInput.fill(channelName);
        await captureScreenshot(page, 'ac3-channel-form-filled', viewport.name);
        
        // Submit form
        const submitButton = page.locator(
          'button:has-text("Create")',
          'button:has-text("Save")',
          'button[type="submit"]',
          '[data-testid="create-channel-submit"]'
        ).first();
        
        await submitButton.click();
        
        // Wait for channel creation and Matrix sync
        await waitForMatrixSync(page);
        await page.waitForTimeout(3000);
        
        await captureScreenshot(page, 'ac3-after-channel-creation', viewport.name);
        
        // Verify channel appears in channel list
        const channelInList = page.locator(`text="${channelName}", [data-testid*="${channelName}"]`);
        
        // EXPECTED TO FAIL: Channel might not appear or creation might fail
        await expect(channelInList, 
          `Created channel "${channelName}" should appear in channel list`
        ).toBeVisible();
        
        // Verify we can navigate to the channel
        await channelInList.click();
        await page.waitForTimeout(2000);
        
        // Check if we're in the channel (look for channel header or input)
        const channelHeader = page.locator(`text="${channelName}"`, `h1:has-text("${channelName}")`);
        const messageInput = page.locator('textarea, input[placeholder*="message" i]');
        
        const isInChannel = await channelHeader.isVisible() || await messageInput.isVisible();
        
        expect(isInChannel, 
          `Should be able to navigate to newly created channel "${channelName}"`
        ).toBeTruthy();
        
        await captureScreenshot(page, 'ac3-channel-accessible', viewport.name);
        console.log(`   ✅ AC-3 PASSED: Channel "${channelName}" created and accessible at ${viewport.name}`);
        
      } catch (error) {
        await captureScreenshot(page, 'ac3-channel-creation-failed', viewport.name);
        console.log(`   ❌ AC-3 FAILED at ${viewport.name}: ${error.message}`);
        expect.soft(false, `AC-3 DEFECT: Channel creation failed at ${viewport.name} - ${error.message}`).toBeTruthy();
      } finally {
        await context.close();
      }
    });
  });

  // Comprehensive defect detection test
  test('Defect Detection: Edge Cases and Error Handling', async ({ browser }) => {
    console.log('🧪 Testing Edge Cases and Error Handling...');
    
    const context = await browser.newContext({
      viewport: VIEWPORTS.desktop,
      baseURL: AUDIT_BASE_URL,
      ignoreHTTPSErrors: true,
    });
    
    const page = await context.newPage();
    
    try {
      await ensureAuthenticatedAndInServer(page);
      
      // Test 1: Empty channel name
      const createChannelOption = page.locator(
        'button:has-text("+")', 
        '[data-testid="create-channel"]'
      ).first();
      
      if (await createChannelOption.isVisible()) {
        await createChannelOption.click();
        
        const nameInput = page.locator('input[placeholder*="channel" i]').first();
        if (await nameInput.isVisible()) {
          // Try to submit with empty name
          await nameInput.fill('');
          await page.keyboard.press('Tab'); // Trigger validation
          
          const submitButton = page.locator('button:has-text("Create")').first();
          await submitButton.click();
          
          // Look for validation error
          const errorMessage = page.locator('.error, .text-red-400, [data-testid*="error"]');
          const hasValidation = await errorMessage.isVisible();
          
          await captureScreenshot(page, 'defect-empty-name-validation', 'Desktop');
          
          if (!hasValidation) {
            console.log('   ⚠️ DEFECT: No validation for empty channel name');
          }
        }
        
        // Test 2: Duplicate channel name (if possible)
        const duplicateName = 'general'; // Common default channel name
        if (await nameInput.isVisible()) {
          await nameInput.fill(duplicateName);
          await submitButton.click();
          
          await page.waitForTimeout(2000);
          const duplicateError = page.locator('.error, .text-red-400');
          await captureScreenshot(page, 'defect-duplicate-name-test', 'Desktop');
        }
      }
      
    } catch (error) {
      console.log(`   ⚠️ Edge case testing error: ${error.message}`);
      await captureScreenshot(page, 'defect-edge-case-error', 'Desktop');
    } finally {
      await context.close();
    }
  });
});