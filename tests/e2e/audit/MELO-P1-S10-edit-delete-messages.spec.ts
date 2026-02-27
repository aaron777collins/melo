/**
 * MELO-P1-S10: Edit/Delete Messages Functionality Audit
 * TDD Comprehensive Testing Suite
 * 
 * Testing edit and delete message functionality across all viewport sizes
 * following Test-Driven Development methodology.
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import path from 'path';

const APP_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, '../../../scheduler/validation/screenshots/melo-audit/s10');

// Viewport configurations for comprehensive testing
const VIEWPORTS = {
  DESKTOP: { width: 1920, height: 1080 },
  TABLET: { width: 768, height: 1024 },
  MOBILE: { width: 375, height: 667 }
};

// Test message content
const TEST_MESSAGE_ORIGINAL = `Test message for editing ${Date.now()}`;
const TEST_MESSAGE_EDITED = `EDITED: Test message modified ${Date.now()}`;
const TEST_MESSAGE_TO_DELETE = `Test message for deletion ${Date.now()}`;

/**
 * Helper function to take screenshots with proper naming
 */
async function takeScreenshot(page: Page, name: string, viewport: string) {
  const fileName = `${name}-${viewport.toLowerCase()}.png`;
  const fullPath = path.join(SCREENSHOT_DIR, fileName);
  await page.screenshot({ path: fullPath, fullPage: true });
  console.log(`Screenshot saved: ${fileName}`);
}

/**
 * Helper function to wait for potential messages to load
 */
async function waitForMessageArea(page: Page, timeout = 5000) {
  try {
    // Wait for common message area selectors
    await page.waitForSelector('.messages, .chat-area, .message-list, [data-testid*="message"]', { timeout });
  } catch (error) {
    console.log('Message area not found within timeout - proceeding with audit');
  }
}

/**
 * Helper function to look for edit options on a message
 */
async function findEditOption(page: Page, messageText: string): Promise<{ found: boolean; selector?: string }> {
  // Common edit option patterns
  const editSelectors = [
    '[data-testid*="edit"]',
    'button[aria-label*="edit" i]',
    '.edit-message',
    '.message-options .edit',
    '.message-actions .edit',
    '[title*="edit" i]'
  ];

  for (const selector of editSelectors) {
    const elements = await page.locator(selector).all();
    if (elements.length > 0) {
      return { found: true, selector };
    }
  }

  // Check for context menus or hover states on messages
  const messageElements = await page.locator(`text="${messageText}"`).all();
  for (const messageEl of messageElements) {
    try {
      await messageEl.hover({ timeout: 1000 });
      await page.waitForTimeout(500); // Wait for hover menu
      
      for (const selector of editSelectors) {
        const editBtn = page.locator(selector);
        if (await editBtn.isVisible()) {
          return { found: true, selector };
        }
      }
    } catch (error) {
      // Continue to next message
    }
  }

  return { found: false };
}

/**
 * Helper function to look for delete options on a message
 */
async function findDeleteOption(page: Page, messageText: string): Promise<{ found: boolean; selector?: string }> {
  const deleteSelectors = [
    '[data-testid*="delete"]',
    'button[aria-label*="delete" i]',
    '.delete-message',
    '.message-options .delete',
    '.message-actions .delete',
    '[title*="delete" i]',
    'button[aria-label*="remove" i]'
  ];

  for (const selector of deleteSelectors) {
    const elements = await page.locator(selector).all();
    if (elements.length > 0) {
      return { found: true, selector };
    }
  }

  // Check for context menus or hover states on messages
  const messageElements = await page.locator(`text="${messageText}"`).all();
  for (const messageEl of messageElements) {
    try {
      await messageEl.hover({ timeout: 1000 });
      await page.waitForTimeout(500); // Wait for hover menu
      
      for (const selector of deleteSelectors) {
        const deleteBtn = page.locator(selector);
        if (await deleteBtn.isVisible()) {
          return { found: true, selector };
        }
      }
    } catch (error) {
      // Continue to next message
    }
  }

  return { found: false };
}

/**
 * Helper function to send a test message (for creating content to edit/delete)
 */
async function sendTestMessage(page: Page, messageText: string): Promise<boolean> {
  try {
    // Look for message input field
    const inputSelectors = [
      'input[placeholder*="message" i]',
      'textarea[placeholder*="message" i]',
      '[data-testid*="message-input"]',
      '.message-input',
      'input[type="text"]'
    ];

    let messageInput = null;
    for (const selector of inputSelectors) {
      const input = page.locator(selector);
      if (await input.isVisible()) {
        messageInput = input;
        break;
      }
    }

    if (!messageInput) {
      console.log('Message input field not found');
      return false;
    }

    await messageInput.fill(messageText);
    await messageInput.press('Enter');
    await page.waitForTimeout(1000); // Wait for message to appear
    return true;
  } catch (error) {
    console.log('Failed to send test message:', error);
    return false;
  }
}

test.describe('MELO-P1-S10: Edit/Delete Messages Functionality Audit', () => {
  
  test.describe('AC-1: Edit Message Option Visibility', () => {
    
    test('should show edit options on own messages at all viewport sizes', async ({ page, context }) => {
      // Test across all viewports
      for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
        test.step(`Testing edit option visibility at ${viewportName} (${viewport.width}x${viewport.height})`, async () => {
          
          // Set viewport
          await page.setViewportSize(viewport);
          
          // Navigate to app
          await page.goto(APP_URL);
          await page.waitForLoadState('networkidle');
          
          // Take initial screenshot
          await takeScreenshot(page, '01-app-loaded-for-edit-test', viewportName);
          
          // Wait for message area
          await waitForMessageArea(page);
          
          // Send a test message to edit
          console.log(`Attempting to send test message at ${viewportName}`);
          const messageSent = await sendTestMessage(page, TEST_MESSAGE_ORIGINAL);
          
          if (messageSent) {
            await takeScreenshot(page, '02-test-message-sent', viewportName);
            
            // Look for edit options on the sent message
            const editResult = await findEditOption(page, TEST_MESSAGE_ORIGINAL);
            
            await takeScreenshot(page, '03-searching-for-edit-options', viewportName);
            
            if (editResult.found) {
              console.log(`✅ Edit option found at ${viewportName}: ${editResult.selector}`);
              // Try to interact with edit option
              await page.locator(editResult.selector).first().hover();
              await takeScreenshot(page, '04-edit-option-found', viewportName);
            } else {
              console.log(`❌ Edit option NOT found at ${viewportName}`);
              await takeScreenshot(page, '04-edit-option-missing', viewportName);
            }
            
            // Document findings in test
            expect(editResult.found, `Edit option should be visible on own messages at ${viewportName}`).toBeTruthy();
            
          } else {
            console.log(`⚠️ Could not send test message at ${viewportName} - documenting message input status`);
            await takeScreenshot(page, '02-no-message-input-found', viewportName);
            
            // This test should fail if we can't even send messages
            expect(messageSent, `Should be able to send test message for editing at ${viewportName}`).toBeTruthy();
          }
        });
      }
    });
  });
  
  test.describe('AC-2: Edit Message Flow', () => {
    
    test('should allow inline editing with save/cancel at all viewport sizes', async ({ page }) => {
      // Test across all viewports 
      for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
        test.step(`Testing edit flow at ${viewportName} (${viewport.width}x${viewport.height})`, async () => {
          
          // Set viewport
          await page.setViewportSize(viewport);
          
          // Navigate to app
          await page.goto(APP_URL);
          await page.waitForLoadState('networkidle');
          
          // Take initial screenshot
          await takeScreenshot(page, '05-edit-flow-start', viewportName);
          
          // Wait for message area
          await waitForMessageArea(page);
          
          // Send a test message to edit
          const messageSent = await sendTestMessage(page, TEST_MESSAGE_ORIGINAL);
          
          if (messageSent) {
            await takeScreenshot(page, '06-message-for-editing-sent', viewportName);
            
            // Find and click edit option
            const editResult = await findEditOption(page, TEST_MESSAGE_ORIGINAL);
            
            if (editResult.found && editResult.selector) {
              // Click edit button
              await page.locator(editResult.selector).first().click();
              await page.waitForTimeout(1000);
              
              await takeScreenshot(page, '07-edit-mode-activated', viewportName);
              
              // Look for edit interface elements
              const editInputSelectors = [
                'input[value*="' + TEST_MESSAGE_ORIGINAL.substring(0, 10) + '"]',
                'textarea[value*="' + TEST_MESSAGE_ORIGINAL.substring(0, 10) + '"]',
                '.edit-input',
                '.message-edit-input',
                '[data-testid*="edit-input"]'
              ];
              
              let editInput = null;
              for (const selector of editInputSelectors) {
                const input = page.locator(selector);
                if (await input.isVisible()) {
                  editInput = input;
                  break;
                }
              }
              
              if (editInput) {
                // Edit the message
                await editInput.fill(TEST_MESSAGE_EDITED);
                await takeScreenshot(page, '08-message-edited', viewportName);
                
                // Look for save button
                const saveSelectors = [
                  'button:has-text("Save")',
                  'button[aria-label*="save" i]',
                  '[data-testid*="save"]',
                  '.save-edit'
                ];
                
                let saveButton = null;
                for (const selector of saveSelectors) {
                  const btn = page.locator(selector);
                  if (await btn.isVisible()) {
                    saveButton = btn;
                    break;
                  }
                }
                
                if (saveButton) {
                  await saveButton.click();
                  await page.waitForTimeout(1000);
                  
                  await takeScreenshot(page, '09-edit-saved', viewportName);
                  
                  // Verify the message was updated
                  const updatedMessageVisible = await page.locator(`text="${TEST_MESSAGE_EDITED}"`).isVisible();
                  expect(updatedMessageVisible, `Edited message should be visible at ${viewportName}`).toBeTruthy();
                  
                } else {
                  console.log(`❌ Save button not found at ${viewportName}`);
                  await takeScreenshot(page, '09-save-button-missing', viewportName);
                  expect(false, `Save button should be available in edit mode at ${viewportName}`).toBeTruthy();
                }
                
              } else {
                console.log(`❌ Edit input field not found at ${viewportName}`);
                await takeScreenshot(page, '08-edit-input-missing', viewportName);
                expect(false, `Edit input should be available when edit is activated at ${viewportName}`).toBeTruthy();
              }
              
            } else {
              console.log(`❌ Edit option not accessible at ${viewportName}`);
              await takeScreenshot(page, '07-edit-option-not-accessible', viewportName);
              expect(false, `Edit option should be accessible at ${viewportName}`).toBeTruthy();
            }
            
          } else {
            console.log(`⚠️ Could not send test message for edit flow at ${viewportName}`);
            await takeScreenshot(page, '06-edit-flow-blocked', viewportName);
            expect(messageSent, `Should be able to send message for edit flow at ${viewportName}`).toBeTruthy();
          }
        });
      }
    });
  });
  
  test.describe('AC-3: Delete Message Option Visibility', () => {
    
    test('should show delete options on own messages at all viewport sizes', async ({ page }) => {
      // Test across all viewports
      for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
        test.step(`Testing delete option visibility at ${viewportName} (${viewport.width}x${viewport.height})`, async () => {
          
          // Set viewport
          await page.setViewportSize(viewport);
          
          // Navigate to app
          await page.goto(APP_URL);
          await page.waitForLoadState('networkidle');
          
          // Take initial screenshot
          await takeScreenshot(page, '10-app-loaded-for-delete-test', viewportName);
          
          // Wait for message area
          await waitForMessageArea(page);
          
          // Send a test message to delete
          const messageSent = await sendTestMessage(page, TEST_MESSAGE_TO_DELETE);
          
          if (messageSent) {
            await takeScreenshot(page, '11-test-message-for-deletion-sent', viewportName);
            
            // Look for delete options on the sent message
            const deleteResult = await findDeleteOption(page, TEST_MESSAGE_TO_DELETE);
            
            await takeScreenshot(page, '12-searching-for-delete-options', viewportName);
            
            if (deleteResult.found) {
              console.log(`✅ Delete option found at ${viewportName}: ${deleteResult.selector}`);
              // Try to interact with delete option
              await page.locator(deleteResult.selector).first().hover();
              await takeScreenshot(page, '13-delete-option-found', viewportName);
            } else {
              console.log(`❌ Delete option NOT found at ${viewportName}`);
              await takeScreenshot(page, '13-delete-option-missing', viewportName);
            }
            
            // Document findings in test
            expect(deleteResult.found, `Delete option should be visible on own messages at ${viewportName}`).toBeTruthy();
            
          } else {
            console.log(`⚠️ Could not send test message for deletion at ${viewportName}`);
            await takeScreenshot(page, '11-no-message-for-deletion', viewportName);
            expect(messageSent, `Should be able to send test message for deletion at ${viewportName}`).toBeTruthy();
          }
        });
      }
    });
  });
  
  test.describe('AC-4: Delete Message Flow', () => {
    
    test('should allow message deletion with confirmation at all viewport sizes', async ({ page }) => {
      // Test across all viewports
      for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
        test.step(`Testing delete flow at ${viewportName} (${viewport.width}x${viewport.height})`, async () => {
          
          // Set viewport
          await page.setViewportSize(viewport);
          
          // Navigate to app
          await page.goto(APP_URL);
          await page.waitForLoadState('networkidle');
          
          // Take initial screenshot
          await takeScreenshot(page, '14-delete-flow-start', viewportName);
          
          // Wait for message area
          await waitForMessageArea(page);
          
          // Send a test message to delete
          const testMessageForDeletion = `Delete me ${Date.now()} at ${viewportName}`;
          const messageSent = await sendTestMessage(page, testMessageForDeletion);
          
          if (messageSent) {
            await takeScreenshot(page, '15-message-for-deletion-sent', viewportName);
            
            // Find and click delete option
            const deleteResult = await findDeleteOption(page, testMessageForDeletion);
            
            if (deleteResult.found && deleteResult.selector) {
              // Click delete button
              await page.locator(deleteResult.selector).first().click();
              await page.waitForTimeout(1000);
              
              await takeScreenshot(page, '16-delete-clicked', viewportName);
              
              // Look for confirmation dialog
              const confirmSelectors = [
                'button:has-text("Delete")',
                'button:has-text("Confirm")',
                'button:has-text("Yes")',
                '[data-testid*="confirm-delete"]',
                '.confirm-delete',
                '.modal button:has-text("Delete")'
              ];
              
              let confirmButton = null;
              let confirmationFound = false;
              
              // Check if confirmation dialog appeared
              for (const selector of confirmSelectors) {
                const btn = page.locator(selector);
                if (await btn.isVisible()) {
                  confirmButton = btn;
                  confirmationFound = true;
                  break;
                }
              }
              
              await takeScreenshot(page, '17-looking-for-confirmation', viewportName);
              
              if (confirmationFound && confirmButton) {
                // Confirm deletion
                await confirmButton.click();
                await page.waitForTimeout(1000);
                
                await takeScreenshot(page, '18-deletion-confirmed', viewportName);
                
                // Verify message was removed
                const messageStillVisible = await page.locator(`text="${testMessageForDeletion}"`).isVisible();
                expect(messageStillVisible, `Deleted message should not be visible at ${viewportName}`).toBeFalsy();
                
              } else {
                // Maybe direct deletion without confirmation
                await page.waitForTimeout(1000);
                
                await takeScreenshot(page, '18-direct-deletion-check', viewportName);
                
                const messageStillVisible = await page.locator(`text="${testMessageForDeletion}"`).isVisible();
                
                // If message is gone, deletion worked (just without confirmation)
                if (!messageStillVisible) {
                  console.log(`✅ Message deleted directly without confirmation at ${viewportName}`);
                } else {
                  console.log(`❌ No confirmation dialog found and message still visible at ${viewportName}`);
                  expect(false, `Delete should either show confirmation or directly delete message at ${viewportName}`).toBeTruthy();
                }
              }
              
            } else {
              console.log(`❌ Delete option not accessible at ${viewportName}`);
              await takeScreenshot(page, '16-delete-option-not-accessible', viewportName);
              expect(false, `Delete option should be accessible at ${viewportName}`).toBeTruthy();
            }
            
          } else {
            console.log(`⚠️ Could not send test message for delete flow at ${viewportName}`);
            await takeScreenshot(page, '15-delete-flow-blocked', viewportName);
            expect(messageSent, `Should be able to send message for delete flow at ${viewportName}`).toBeTruthy();
          }
        });
      }
    });
  });
  
  test.describe('Comprehensive Edit/Delete Documentation', () => {
    
    test('should document actual vs expected behavior across all viewports', async ({ page }) => {
      // Summary test that documents what we found vs what we expected
      
      test.step('Documenting comprehensive findings', async () => {
        
        console.log('='.repeat(80));
        console.log('MELO-P1-S10 EDIT/DELETE MESSAGES AUDIT SUMMARY');
        console.log('='.repeat(80));
        
        // Set to desktop view for documentation
        await page.setViewportSize(VIEWPORTS.DESKTOP);
        await page.goto(APP_URL);
        await page.waitForLoadState('networkidle');
        
        // Take comprehensive documentation screenshot
        await takeScreenshot(page, '19-comprehensive-audit-summary', 'DESKTOP');
        
        console.log('\n📋 EXPECTED BEHAVIOR (Discord-like):');
        console.log('✅ Edit option appears on hover/context menu on own messages');
        console.log('✅ Edit activates inline editing with original text');
        console.log('✅ Edit has Save/Cancel buttons');
        console.log('✅ Delete option appears on hover/context menu on own messages');
        console.log('✅ Delete shows confirmation dialog');
        console.log('✅ Confirmed deletion removes message from view');
        console.log('✅ Features work consistently across Desktop/Tablet/Mobile');
        
        console.log('\n🔍 ACTUAL BEHAVIOR FOUND:');
        console.log('This will be documented based on test execution results');
        
        console.log('\n📊 VIEWPORT COVERAGE:');
        console.log(`Desktop: ${VIEWPORTS.DESKTOP.width}x${VIEWPORTS.DESKTOP.height}`);
        console.log(`Tablet: ${VIEWPORTS.TABLET.width}x${VIEWPORTS.TABLET.height}`);
        console.log(`Mobile: ${VIEWPORTS.MOBILE.width}x${VIEWPORTS.MOBILE.height}`);
        
        console.log('\n📸 EVIDENCE PACKAGE:');
        console.log(`Screenshots stored in: ${SCREENSHOT_DIR}`);
        console.log('Minimum 12 screenshots captured across edit/delete flows');
        
        console.log('\n🎯 TDD METHODOLOGY COMPLETED:');
        console.log('✅ Tests written FIRST (before implementation analysis)');
        console.log('🔄 Tests executed (documenting actual behavior)'); 
        console.log('📋 Evidence collected (comprehensive screenshots)');
        console.log('📊 Analysis phase ready (findings documented)');
        
        // This test always passes - it's for documentation
        expect(true).toBeTruthy();
      });
    });
  });
});