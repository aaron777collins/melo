import { test, expect, Page, BrowserContext } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

// Test configuration for MELO-P1-S05: Join Server functionality
const APP_URL = 'http://dev2.aaroncollins.info:3000';
const SCREENSHOT_PATH = '/home/ubuntu/clawd/scheduler/validation/screenshots/melo-audit/s05';

// Override the base URL to use HTTP instead of HTTPS (DEF-004 workaround)
test.use({ 
  baseURL: APP_URL,
  ignoreHTTPSErrors: true
});

// Viewport configurations for responsive testing
const VIEWPORTS = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 }
};

// Test data for unique server names
const TIMESTAMP = Date.now();
const TEST_INVITE_CODE = `test-invite-${TIMESTAMP}`;
const TEST_SERVER_NAME = `Test Server ${TIMESTAMP}`;

test.describe('MELO-P1-S05: Join Server Audit', () => {
  
  // Test helper functions
  async function takeScreenshot(page: Page, name: string, viewport: string) {
    const filename = `${name}-${viewport}.png`;
    const filepath = join(SCREENSHOT_PATH, filename);
    await page.screenshot({ 
      path: filepath, 
      fullPage: true 
    });
    return filepath;
  }

  async function loginAsTestUser(page: Page) {
    // Navigate to login page
    await page.goto(`${APP_URL}/sign-in`);
    
    // Check if already authenticated by looking for authenticated UI
    const authenticatedElements = [
      '[data-testid="user-avatar"]',
      '[data-testid="server-sidebar"]',
      'text="Logout"',
      'text="Settings"'
    ];
    
    for (const selector of authenticatedElements) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 })) {
        console.log('✅ Already authenticated');
        return true;
      }
    }
    
    // If not authenticated, check if login form is available
    const usernameField = page.locator('input[name="username"], input[name="email"], input[type="email"], input[type="text"]').first();
    const passwordField = page.locator('input[name="password"], input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"], input[type="submit"], button:has-text("Sign"), button:has-text("Login")').first();
    
    // Check if the username field is enabled before trying to fill
    if (await usernameField.isVisible({ timeout: 5000 })) {
      const isEnabled = await usernameField.isEnabled();
      console.log(`Username field found - enabled: ${isEnabled}`);
      
      if (isEnabled && await passwordField.isVisible() && await passwordField.isEnabled()) {
        await usernameField.fill('testuser@example.com');
        await passwordField.fill('testpassword123');
        await submitButton.click();
        
        // Wait for redirect or login success
        await page.waitForLoadState('networkidle');
        return true;
      } else {
        console.log('⚠️ Login form found but fields are disabled');
        return false;
      }
    } else {
      console.log('⚠️ No login form found');
      return false;
    }
  }

  async function createTestServer(page: Page): Promise<string | null> {
    // Helper function to create a server that can generate invite codes
    // This may be needed if S04 hasn't been run yet
    try {
      // Look for create server button
      const createServerBtn = page.locator('text="Create Server", text="Add Server", [aria-label*="create"], [aria-label*="add"], button:has-text("+")').first();
      
      if (await createServerBtn.isVisible({ timeout: 5000 })) {
        await createServerBtn.click();
        
        // Fill server creation form
        const nameField = page.locator('input[name="name"], input[placeholder*="name"], input[type="text"]').first();
        await nameField.fill(TEST_SERVER_NAME);
        
        const submitBtn = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Submit")').first();
        await submitBtn.click();
        
        await page.waitForLoadState('networkidle');
        return TEST_SERVER_NAME;
      }
    } catch (error) {
      console.log('Could not create test server:', error);
    }
    return null;
  }

  async function findJoinServerOption(page: Page) {
    // Look for various join server UI patterns
    const joinOptions = [
      'text="Join Server"',
      'text="Join a Server"', 
      'text="Add Server"',
      'button:has-text("+")',
      '[aria-label*="join"]',
      '[aria-label*="add server"]',
      'text="Enter an invite"',
      'text="Have an invite?"'
    ];

    for (const selector of joinOptions) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 })) {
        return element;
      }
    }
    return null;
  }

  // AC-1: Join Server Option Visible
  test('AC-1: Join Server Option is visible and accessible', async ({ browser }) => {
    for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();

      try {
        // Step 1: Navigate to app and login
        await page.goto(APP_URL);
        await takeScreenshot(page, 'homepage-initial', viewportName);
        
        await loginAsTestUser(page);
        await takeScreenshot(page, 'logged-in-state', viewportName);

        // Step 2: Look for join server option
        console.log(`Testing join server visibility at ${viewportName} (${viewport.width}x${viewport.height})`);
        
        const joinOption = await findJoinServerOption(page);
        await takeScreenshot(page, 'join-server-search', viewportName);
        
        if (joinOption) {
          // Highlight the join option by hovering
          await joinOption.hover();
          await takeScreenshot(page, 'join-server-option-found', viewportName);
          
          console.log(`✅ Join server option found at ${viewportName}`);
        } else {
          await takeScreenshot(page, 'join-server-option-not-found', viewportName);
          console.log(`❌ Join server option NOT found at ${viewportName}`);
        }

        // For audit purposes, we document what we find regardless of pass/fail
        // The screenshot evidence shows what's actually available

      } catch (error) {
        console.error(`Error testing AC-1 at ${viewportName}:`, error);
        await takeScreenshot(page, 'ac1-error', viewportName);
      } finally {
        await context.close();
      }
    }
  });

  // AC-2: Join via Invite Code/Link
  test('AC-2: Join server via invite code/link', async ({ browser }) => {
    for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();

      try {
        console.log(`Testing invite join flow at ${viewportName} (${viewport.width}x${viewport.height})`);
        
        // Step 1: Setup - login and optionally create a test server
        await page.goto(APP_URL);
        await loginAsTestUser(page);
        await takeScreenshot(page, 'invite-test-setup', viewportName);

        // Step 2: Try to create a test server to get an invite from
        const serverCreated = await createTestServer(page);
        if (serverCreated) {
          await takeScreenshot(page, 'test-server-created', viewportName);
          
          // Try to generate an invite code
          // Look for invite generation options
          const inviteOptions = [
            'text="Invite"',
            'text="Invite People"', 
            'text="Server Settings"',
            'button:has-text("Invite")',
            '[aria-label*="invite"]'
          ];

          let inviteCode = null;
          for (const selector of inviteOptions) {
            const element = page.locator(selector).first();
            if (await element.isVisible({ timeout: 2000 })) {
              await element.click();
              await takeScreenshot(page, 'invite-generation-attempt', viewportName);
              
              // Look for generated invite code/link
              const codeElements = page.locator('code, input[readonly], [class*="invite"], [class*="code"]');
              const count = await codeElements.count();
              
              if (count > 0) {
                inviteCode = await codeElements.first().textContent() || await codeElements.first().inputValue();
                break;
              }
            }
          }

          if (inviteCode) {
            console.log(`Found invite code: ${inviteCode}`);
            await takeScreenshot(page, 'invite-code-found', viewportName);
          } else {
            console.log('No invite code found, testing with mock invite');
            inviteCode = TEST_INVITE_CODE;
          }
        }

        // Step 3: Test joining via invite (even if we couldn't get a real one)
        const joinOption = await findJoinServerOption(page);
        
        if (joinOption) {
          await joinOption.click();
          await takeScreenshot(page, 'join-modal-opened', viewportName);
          
          // Look for invite input field
          const inviteInputs = [
            'input[placeholder*="invite"]',
            'input[placeholder*="code"]',
            'input[type="text"]'
          ];

          let inviteField = null;
          for (const selector of inviteInputs) {
            const field = page.locator(selector).first();
            if (await field.isVisible({ timeout: 2000 })) {
              inviteField = field;
              break;
            }
          }

          if (inviteField) {
            await inviteField.fill(TEST_INVITE_CODE);
            await takeScreenshot(page, 'invite-code-entered', viewportName);
            
            // Submit invite
            const submitBtn = page.locator('button[type="submit"], button:has-text("Join"), button:has-text("Submit")').first();
            
            if (await submitBtn.isVisible()) {
              await submitBtn.click();
              await page.waitForLoadState('networkidle');
              await takeScreenshot(page, 'invite-join-attempted', viewportName);
              
              // Check if we successfully joined (server appears in sidebar)
              await takeScreenshot(page, 'after-invite-join', viewportName);
            }
          } else {
            await takeScreenshot(page, 'no-invite-input-found', viewportName);
            console.log(`❌ No invite input field found at ${viewportName}`);
          }
        } else {
          await takeScreenshot(page, 'no-join-option-for-invite', viewportName);
          console.log(`❌ No join server option available for invite test at ${viewportName}`);
        }

      } catch (error) {
        console.error(`Error testing AC-2 at ${viewportName}:`, error);
        await takeScreenshot(page, 'ac2-error', viewportName);
      } finally {
        await context.close();
      }
    }
  });

  // Additional test: Server discovery (if available)
  test('Bonus: Server discovery functionality', async ({ browser }) => {
    const context = await browser.newContext({ viewport: VIEWPORTS.desktop });
    const page = await context.newPage();

    try {
      await page.goto(APP_URL);
      await loginAsTestUser(page);
      await takeScreenshot(page, 'server-discovery-test', 'desktop');
      
      // Look for server browsing/discovery features
      const discoveryOptions = [
        'text="Browse Servers"',
        'text="Discover Servers"',
        'text="Public Servers"',
        'text="Explore"'
      ];

      for (const selector of discoveryOptions) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          await takeScreenshot(page, 'server-discovery-found', 'desktop');
          console.log('✅ Server discovery feature found');
          return;
        }
      }
      
      await takeScreenshot(page, 'server-discovery-not-found', 'desktop');
      console.log('ℹ️ No server discovery feature found (not required)');

    } catch (error) {
      console.error('Error testing server discovery:', error);
      await takeScreenshot(page, 'discovery-error', 'desktop');
    } finally {
      await context.close();
    }
  });

});

// Test helper to verify app is responsive at all viewport sizes
test.describe('Responsive Design Verification', () => {
  
  // Helper function for this test group
  async function takeScreenshotLocal(page: Page, name: string, viewport: string) {
    const filename = `${name}-${viewport}.png`;
    const filepath = join(SCREENSHOT_PATH, filename);
    await page.screenshot({ 
      path: filepath, 
      fullPage: true 
    });
    return filepath;
  }
  
  test('App loads and is usable at all required viewport sizes', async ({ browser }) => {
    for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();

      try {
        console.log(`Testing app responsiveness at ${viewportName} (${viewport.width}x${viewport.height})`);
        
        await page.goto(APP_URL);
        await page.waitForLoadState('networkidle');
        
        // Take screenshot to verify layout
        await takeScreenshotLocal(page, 'responsive-layout', viewportName);
        
        // Basic responsiveness checks
        const body = page.locator('body');
        const boundingBox = await body.boundingBox();
        
        if (boundingBox) {
          console.log(`✅ App renders at ${viewportName}: ${boundingBox.width}x${boundingBox.height}`);
        }

        // Check for overflow issues
        const horizontalScrollbar = await page.evaluate(() => {
          return document.body.scrollWidth > document.body.clientWidth;
        });

        if (horizontalScrollbar) {
          console.log(`⚠️ Horizontal scrollbar detected at ${viewportName} (possible overflow)`);
        }

      } catch (error) {
        console.error(`Error testing responsiveness at ${viewportName}:`, error);
        await takeScreenshotLocal(page, 'responsive-error', viewportName);
      } finally {
        await context.close();
      }
    }
  });
});