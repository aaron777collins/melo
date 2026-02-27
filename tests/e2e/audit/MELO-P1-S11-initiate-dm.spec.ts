/**
 * MELO-P1-S11: Direct Messages - Initiate DM - Comprehensive TDD Audit
 * 
 * Story: As a logged-in user, I want to start a direct message conversation 
 * with another user, so that I can have private one-on-one communication
 * 
 * TDD Approach: Tests written FIRST to document expected Discord-like DM behavior
 * Evidence Collection: Screenshots at all viewport sizes (Desktop/Tablet/Mobile)
 * 
 * Expected Viewport Coverage:
 * - Desktop: 1920x1080
 * - Tablet: 768x1024  
 * - Mobile: 375x667
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

// Viewport configurations for comprehensive testing
const viewports = [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 667 }
];

// Screenshot storage configuration
const SCREENSHOT_DIR = 'scheduler/validation/screenshots/melo-audit/s11';

async function ensureScreenshotDir(viewport: string) {
  const dir = path.join(SCREENSHOT_DIR, viewport);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

async function takeScreenshot(page: Page, name: string, viewport: string) {
  const dir = await ensureScreenshotDir(viewport);
  const filename = `${name}.png`;
  const filepath = path.join(dir, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Screenshot saved: ${filepath}`);
  return filepath;
}

// Auth bypass helper - based on existing patterns in other audit tests
async function bypassAuthAndNavigate(page: Page) {
  await page.goto('http://localhost:3000');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Add auth bypass logic here if needed (based on existing auth patterns)
  // This may need to be updated based on actual auth implementation
}

test.describe('MELO-P1-S11: Initiate DM - TDD Comprehensive Audit', () => {
  
  // TDD Phase: RED - Tests should FAIL initially to show current state
  for (const viewport of viewports) {
    test.describe(`${viewport.name.toUpperCase()} (${viewport.width}x${viewport.height})`, () => {
      
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await bypassAuthAndNavigate(page);
      });

      test('AC-1: DM Option Discovery - Sidebar Navigation', async ({ page }) => {
        // Expected Discord-like behavior: DM section in sidebar
        await takeScreenshot(page, 'sidebar-initial-state', viewport.name);
        
        // Look for Direct Messages section in sidebar
        const dmSection = page.locator('[data-testid="dm-section"], .dm-section, [class*="dm"], [class*="direct-message"]');
        const dmSectionVisible = await dmSection.isVisible().catch(() => false);
        
        if (dmSectionVisible) {
          await takeScreenshot(page, 'dm-section-found', viewport.name);
          console.log(`✅ DM section found in ${viewport.name} sidebar`);
        } else {
          await takeScreenshot(page, 'dm-section-missing', viewport.name);
          console.log(`❌ DM section NOT found in ${viewport.name} sidebar`);
        }
        
        // Look for "+" or "Add DM" button
        const addDMButton = page.locator(
          '[data-testid="add-dm"], [aria-label*="direct message"], [aria-label*="new dm"], ' +
          'button:has-text("Direct Message"), button:has-text("DM"), .add-dm, .new-dm'
        );
        const addDMVisible = await addDMButton.isVisible().catch(() => false);
        
        if (addDMVisible) {
          await takeScreenshot(page, 'add-dm-button-found', viewport.name);
          console.log(`✅ Add DM button found in ${viewport.name}`);
        } else {
          await takeScreenshot(page, 'add-dm-button-missing', viewport.name);
          console.log(`❌ Add DM button NOT found in ${viewport.name}`);
        }
        
        // Document current state for TDD RED phase
        console.log(`📋 ${viewport.name} DM Discovery Status:`);
        console.log(`  - DM Section: ${dmSectionVisible ? 'Found' : 'Missing'}`);
        console.log(`  - Add DM Button: ${addDMVisible ? 'Found' : 'Missing'}`);
        
        // This test should initially FAIL to document current gaps
        expect(dmSectionVisible || addDMVisible, 
          `DM initiation options should be discoverable in ${viewport.name} sidebar`).toBeTruthy();
      });

      test('AC-1: DM Option Discovery - User Profile Access', async ({ page }) => {
        // Expected Discord-like behavior: Click user avatar/name to start DM
        await takeScreenshot(page, 'user-profiles-search', viewport.name);
        
        // Look for user profiles, member lists, or user search
        const userElements = await page.locator(
          '[data-testid*="user"], [data-testid*="member"], [class*="user"], [class*="member"], ' +
          '.avatar, [class*="avatar"], .user-item, [class*="profile"]'
        ).all();
        
        let dmOptionFound = false;
        
        if (userElements.length > 0) {
          await takeScreenshot(page, 'users-found-checking-dm-options', viewport.name);
          
          // Check first few user elements for DM options
          for (let i = 0; i < Math.min(3, userElements.length); i++) {
            try {
              await userElements[i].hover();
              await page.waitForTimeout(500); // Wait for hover effects
              
              // Look for DM context menu or tooltip
              const dmOption = page.locator(
                '[data-testid*="dm"], text="Direct Message", text="Send DM", text="Message", ' +
                '[aria-label*="direct message"], [aria-label*="message"]'
              );
              
              if (await dmOption.isVisible().catch(() => false)) {
                dmOptionFound = true;
                await takeScreenshot(page, `dm-option-found-user-${i}`, viewport.name);
                break;
              }
            } catch (error) {
              console.log(`Could not interact with user element ${i}`);
            }
          }
        } else {
          await takeScreenshot(page, 'no-users-found', viewport.name);
          console.log(`❌ No user elements found in ${viewport.name}`);
        }
        
        console.log(`📋 ${viewport.name} User Profile DM Status:`);
        console.log(`  - User Elements Found: ${userElements.length}`);
        console.log(`  - DM Option in Profiles: ${dmOptionFound ? 'Found' : 'Missing'}`);
        
        // This test should initially FAIL to document current gaps
        expect(dmOptionFound, 
          `DM option should be accessible through user profiles in ${viewport.name}`).toBeTruthy();
      });

      test('AC-1: DM Option Discovery - Global Search/Command', async ({ page }) => {
        // Expected Discord-like behavior: Search for users to start DM
        await takeScreenshot(page, 'global-search-initial', viewport.name);
        
        // Look for search functionality
        const searchElements = page.locator(
          '[data-testid*="search"], input[placeholder*="search"], input[placeholder*="user"], ' +
          '.search-input, [class*="search"], [aria-label*="search"]'
        );
        
        const searchVisible = await searchElements.first().isVisible().catch(() => false);
        
        if (searchVisible) {
          await takeScreenshot(page, 'search-found', viewport.name);
          
          // Try to search for users
          await searchElements.first().click();
          await searchElements.first().fill('user');
          await page.waitForTimeout(1000); // Wait for search results
          
          await takeScreenshot(page, 'search-results', viewport.name);
          
          // Look for DM options in search results
          const dmInSearch = page.locator(
            '[data-testid*="dm"], text="Message", text="Direct Message", ' +
            'button:has-text("DM"), .dm-button'
          );
          
          const dmSearchOption = await dmInSearch.isVisible().catch(() => false);
          
          console.log(`📋 ${viewport.name} Search DM Status:`);
          console.log(`  - Search Found: ${searchVisible}`);
          console.log(`  - DM in Search: ${dmSearchOption ? 'Found' : 'Missing'}`);
          
          await takeScreenshot(page, 'search-dm-final-state', viewport.name);
        } else {
          await takeScreenshot(page, 'search-not-found', viewport.name);
          console.log(`❌ Search functionality not found in ${viewport.name}`);
        }
        
        // This test should initially FAIL to document current gaps
        expect(searchVisible, 
          `Search functionality should exist for DM initiation in ${viewport.name}`).toBeTruthy();
      });

      test('AC-2: DM Creation Flow - User Selection', async ({ page }) => {
        // This test documents expected DM creation workflow
        await takeScreenshot(page, 'dm-creation-start', viewport.name);
        
        // Try to find and click any DM initiation element
        const dmInitiators = [
          '[data-testid="add-dm"]',
          '[data-testid="new-dm"]',
          'button:has-text("Direct Message")',
          'button:has-text("New DM")',
          '.add-dm',
          '.new-dm-button'
        ];
        
        let dmFlowStarted = false;
        
        for (const selector of dmInitiators) {
          try {
            const element = page.locator(selector);
            if (await element.isVisible().catch(() => false)) {
              await element.click();
              await page.waitForTimeout(1000);
              dmFlowStarted = true;
              await takeScreenshot(page, 'dm-flow-initiated', viewport.name);
              break;
            }
          } catch (error) {
            console.log(`DM initiator ${selector} not found or not clickable`);
          }
        }
        
        if (dmFlowStarted) {
          // Look for user selection modal/interface
          const userSelection = page.locator(
            '[data-testid*="user-select"], [data-testid*="dm-modal"], .user-picker, ' +
            '.dm-create-modal, [class*="modal"], [role="dialog"]'
          );
          
          const selectionVisible = await userSelection.isVisible().catch(() => false);
          
          if (selectionVisible) {
            await takeScreenshot(page, 'user-selection-modal', viewport.name);
            console.log(`✅ User selection interface found in ${viewport.name}`);
          } else {
            await takeScreenshot(page, 'no-user-selection', viewport.name);
            console.log(`❌ User selection interface not found in ${viewport.name}`);
          }
        } else {
          await takeScreenshot(page, 'no-dm-initiation-found', viewport.name);
          console.log(`❌ No DM initiation method found in ${viewport.name}`);
        }
        
        console.log(`📋 ${viewport.name} DM Creation Flow Status:`);
        console.log(`  - Flow Started: ${dmFlowStarted}`);
        
        // This test should initially FAIL to document current state
        expect(dmFlowStarted, 
          `DM creation flow should be initiatable in ${viewport.name}`).toBeTruthy();
      });

      test('AC-2: DM Conversation Interface', async ({ page }) => {
        // Test for existing DM conversations or interface
        await takeScreenshot(page, 'dm-interface-search', viewport.name);
        
        // Look for DM conversation areas
        const dmConversation = page.locator(
          '[data-testid*="dm-conversation"], [data-testid*="direct-message"], ' +
          '.dm-chat, .direct-message-area, [class*="dm-interface"]'
        );
        
        const dmInterfaceExists = await dmConversation.isVisible().catch(() => false);
        
        if (dmInterfaceExists) {
          await takeScreenshot(page, 'dm-interface-found', viewport.name);
          console.log(`✅ DM conversation interface found in ${viewport.name}`);
          
          // Check for message input in DM area
          const dmMessageInput = page.locator(
            '[data-testid*="dm-input"], input[placeholder*="direct"], input[placeholder*="dm"], ' +
            'textarea[placeholder*="message"]'
          );
          
          const inputExists = await dmMessageInput.isVisible().catch(() => false);
          
          if (inputExists) {
            await takeScreenshot(page, 'dm-message-input-found', viewport.name);
            console.log(`✅ DM message input found in ${viewport.name}`);
          }
        } else {
          await takeScreenshot(page, 'dm-interface-missing', viewport.name);
          console.log(`❌ DM conversation interface not found in ${viewport.name}`);
        }
        
        console.log(`📋 ${viewport.name} DM Interface Status:`);
        console.log(`  - DM Interface: ${dmInterfaceExists ? 'Found' : 'Missing'}`);
        
        // This test documents current DM interface state
        expect(dmInterfaceExists, 
          `DM conversation interface should exist in ${viewport.name}`).toBeTruthy();
      });

      test('Critical Thinking: Pragmatist Analysis - User Discovery Patterns', async ({ page }) => {
        // How would users actually start a DM conversation?
        await takeScreenshot(page, 'pragmatist-analysis-start', viewport.name);
        
        // Check all likely user discovery paths
        const discoveryPaths = {
          sidebar_dm_section: false,
          add_dm_button: false,
          user_profiles: false,
          member_list: false,
          search_functionality: false,
          context_menus: false
        };
        
        // Test sidebar DM section
        const sidebarDM = page.locator('[data-testid*="dm"], .dm-section, [class*="direct-message"]');
        discoveryPaths.sidebar_dm_section = await sidebarDM.isVisible().catch(() => false);
        
        // Test add DM functionality
        const addDM = page.locator('button:has-text("DM"), button:has-text("Direct Message"), .add-dm');
        discoveryPaths.add_dm_button = await addDM.isVisible().catch(() => false);
        
        // Test user profiles
        const userProfiles = page.locator('[class*="user"], [class*="member"], .avatar');
        const userCount = await userProfiles.count();
        discoveryPaths.user_profiles = userCount > 0;
        
        // Test search
        const search = page.locator('input[placeholder*="search"], [data-testid*="search"]');
        discoveryPaths.search_functionality = await search.isVisible().catch(() => false);
        
        await takeScreenshot(page, 'pragmatist-analysis-complete', viewport.name);
        
        const workingPaths = Object.entries(discoveryPaths)
          .filter(([_, working]) => working)
          .map(([path, _]) => path);
        
        console.log(`📋 ${viewport.name} Pragmatist Analysis - User Discovery:`);
        console.log(`  - Working Paths: ${workingPaths.join(', ') || 'None'}`);
        console.log(`  - User Experience: ${workingPaths.length > 0 ? 'Some options' : 'No clear path'}`);
        
        // Pragmatist expects at least ONE clear path for DM initiation
        expect(workingPaths.length, 
          `Users need at least one clear path to initiate DMs in ${viewport.name}`).toBeGreaterThan(0);
      });

      test('Critical Thinking: Skeptic Analysis - DM Functionality Gaps', async ({ page }) => {
        // What if DM functionality doesn't exist yet? User discovery issues?
        await takeScreenshot(page, 'skeptic-analysis-start', viewport.name);
        
        const functionalityChecks = {
          dm_ui_exists: false,
          dm_backend_ready: false,
          user_management: false,
          message_infrastructure: false
        };
        
        // Check if DM UI components exist at all
        const dmUI = await page.locator('[data-testid*="dm"], [class*="dm"], [class*="direct"]').count();
        functionalityChecks.dm_ui_exists = dmUI > 0;
        
        // Check if user management exists (needed for DMs)
        const userManagement = await page.locator('[data-testid*="user"], [class*="user"], [class*="member"]').count();
        functionalityChecks.user_management = userManagement > 0;
        
        // Check if message infrastructure exists (needed for DM messages)
        const messageInfra = await page.locator('input[placeholder*="message"], textarea[placeholder*="message"]').count();
        functionalityChecks.message_infrastructure = messageInfra > 0;
        
        await takeScreenshot(page, 'skeptic-analysis-complete', viewport.name);
        
        const readyComponents = Object.entries(functionalityChecks)
          .filter(([_, ready]) => ready)
          .map(([component, _]) => component);
        
        console.log(`📋 ${viewport.name} Skeptic Analysis - Functionality Readiness:`);
        console.log(`  - Ready Components: ${readyComponents.join(', ') || 'None'}`);
        console.log(`  - Missing Components: ${4 - readyComponents.length}/4`);
        
        // Skeptic expects infrastructure readiness before user-facing features
        expect(readyComponents.length, 
          `Core infrastructure should exist before DM features in ${viewport.name}`).toBeGreaterThan(2);
      });

      test('Critical Thinking: Guardian Analysis - Privacy & Security', async ({ page }) => {
        // Privacy implications of DM initiation? User blocking/consent?
        await takeScreenshot(page, 'guardian-analysis-start', viewport.name);
        
        const privacyFeatures = {
          user_consent: false,
          block_functionality: false,
          privacy_settings: false,
          secure_messaging: false
        };
        
        // Check for privacy settings or user consent mechanisms
        const privacySettings = page.locator(
          '[data-testid*="privacy"], [data-testid*="settings"], .privacy-settings, .user-settings'
        );
        privacyFeatures.privacy_settings = await privacySettings.isVisible().catch(() => false);
        
        // Check for block/unblock functionality
        const blockFeatures = page.locator(
          'button:has-text("Block"), button:has-text("Unblock"), [data-testid*="block"]'
        );
        privacyFeatures.block_functionality = await blockFeatures.isVisible().catch(() => false);
        
        // Check for secure messaging indicators
        const securityIndicators = page.locator(
          '[data-testid*="encrypted"], [data-testid*="secure"], .security-badge, .encrypted-indicator'
        );
        privacyFeatures.secure_messaging = await securityIndicators.isVisible().catch(() => false);
        
        await takeScreenshot(page, 'guardian-analysis-complete', viewport.name);
        
        const protectedFeatures = Object.entries(privacyFeatures)
          .filter(([_, isProtected]) => isProtected)
          .map(([feature, _]) => feature);
        
        console.log(`📋 ${viewport.name} Guardian Analysis - Privacy & Security:`);
        console.log(`  - Protected Features: ${protectedFeatures.join(', ') || 'None'}`);
        console.log(`  - Privacy Readiness: ${protectedFeatures.length}/4 features`);
        
        // Guardian expects privacy protections before enabling DM functionality
        expect(protectedFeatures.length, 
          `Privacy protections should exist for DM functionality in ${viewport.name}`).toBeGreaterThan(0);
      });

    });
  }
  
  test.describe('Cross-Viewport DM Consistency Analysis', () => {
    
    test('DM Discovery Patterns Across All Viewports', async ({ browser }) => {
      const results = {
        desktop: { dmOptions: 0, userAccess: 0, searchAvailable: false },
        tablet: { dmOptions: 0, userAccess: 0, searchAvailable: false },
        mobile: { dmOptions: 0, userAccess: 0, searchAvailable: false }
      };
      
      for (const viewport of viewports) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height }
        });
        const page = await context.newPage();
        
        await bypassAuthAndNavigate(page);
        await takeScreenshot(page, `cross-viewport-${viewport.name}`, viewport.name);
        
        // Count DM-related options
        const dmOptions = await page.locator(
          '[data-testid*="dm"], [class*="dm"], button:has-text("Direct Message")'
        ).count();
        
        // Count user access points
        const userAccess = await page.locator(
          '[data-testid*="user"], [class*="user"], [class*="member"], .avatar'
        ).count();
        
        // Check search availability
        const searchAvailable = await page.locator(
          'input[placeholder*="search"], [data-testid*="search"]'
        ).isVisible().catch(() => false);
        
        results[viewport.name] = { dmOptions, userAccess, searchAvailable };
        
        await context.close();
      }
      
      await takeScreenshot(await browser.newPage(), 'cross-viewport-analysis-complete', 'summary');
      
      console.log('📋 Cross-Viewport DM Analysis Results:');
      Object.entries(results).forEach(([viewport, data]) => {
        console.log(`  ${viewport}: DM Options=${data.dmOptions}, User Access=${data.userAccess}, Search=${data.searchAvailable}`);
      });
      
      // Consistency check: All viewports should have similar DM accessibility
      const dmOptionCounts = Object.values(results).map(r => r.dmOptions);
      const maxDMOptions = Math.max(...dmOptionCounts);
      const minDMOptions = Math.min(...dmOptionCounts);
      
      expect(maxDMOptions - minDMOptions, 
        'DM options should be consistent across viewports').toBeLessThanOrEqual(1);
    });
    
  });

});

// TDD Summary Documentation
test.describe('TDD METHODOLOGY SUMMARY', () => {
  
  test('RED Phase: Document Current DM State', async ({ page }) => {
    // This test documents the current state before any fixes
    console.log('\n🔴 TDD RED PHASE - Current State Documentation');
    console.log('===============================================');
    console.log('Expected Results: Tests should FAIL showing missing DM functionality');
    console.log('Purpose: Document gaps between expected Discord-like behavior and current state');
    console.log('Next Phase: GREEN - Implement fixes to make tests pass');
    console.log('Final Phase: REFACTOR - Optimize implementation while keeping tests green');
    
    expect(true, 'TDD RED phase documentation complete').toBeTruthy();
  });
  
});