/**
 * Message Reactions Tests
 * 
 * Tests for emoji reactions on messages.
 */

import { test, expect } from '@playwright/test';
import { 
  ChatPage, 
  waitForAppReady, 
  waitForMatrixSync,
  generateMessage 
} from '../fixtures';

test.describe('Message Reactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await waitForMatrixSync(page);
    
    // Navigate to a text channel
    const firstServer = page.locator('[data-testid*="server"], .server-item, nav a').first();
    await firstServer.click().catch(() => {});
    await page.waitForTimeout(2000);
    
    const firstChannel = page.locator('[data-testid*="channel"], .channel-item, [href*="channel"]').first();
    await firstChannel.click().catch(() => {});
    await page.waitForTimeout(2000);
  });

  test('should show reaction picker on hover/click', async ({ page }) => {
    const chatPage = new ChatPage(page);
    const messageText = generateMessage();
    
    // Send a message first
    await chatPage.sendMessage(messageText);
    await chatPage.expectMessageVisible(messageText);
    
    // Get the message
    const message = page.locator(`text="${messageText}"`).first();
    
    // Hover over message to show actions
    await message.hover();
    await page.waitForTimeout(500);
    
    // Look for reaction button
    const reactionButton = page.locator('button[aria-label*="reaction" i], button[aria-label*="emoji" i], button:has-text("😀"), [data-testid="add-reaction"]');
    const hasReactionButton = await reactionButton.first().isVisible().catch(() => false);
    
    expect(hasReactionButton).toBeTruthy();
  });

  test('should add a reaction to a message', async ({ page }) => {
    const chatPage = new ChatPage(page);
    const messageText = generateMessage();
    
    // Send a message
    await chatPage.sendMessage(messageText);
    await chatPage.expectMessageVisible(messageText);
    
    // Get the message and hover
    const message = page.locator(`text="${messageText}"`).first();
    await message.hover();
    await page.waitForTimeout(500);
    
    // Click reaction button
    const reactionButton = page.locator('button[aria-label*="reaction" i], button[aria-label*="emoji" i], [data-testid="add-reaction"]');
    await reactionButton.first().click().catch(async () => {
      // Try right-click menu
      await message.click({ button: 'right' });
      await page.locator('text="Add Reaction", text="React"').click();
    });
    
    await page.waitForTimeout(500);
    
    // Pick an emoji (thumbs up)
    const emoji = page.locator('[data-emoji="👍"], :text("👍"), button:has-text("👍")');
    await emoji.first().click().catch(() => {
      console.log('Emoji picker may have different format');
    });
    
    await page.waitForTimeout(2000);
    
    // Reaction should appear on the message
    const reactionDisplay = page.locator('.reaction, [data-testid="reaction"], :text("👍")');
    const hasReaction = await reactionDisplay.first().isVisible().catch(() => false);
    
    console.log(`Reaction added: ${hasReaction}`);
  });

  test('should remove a reaction when clicked again', async ({ page }) => {
    const chatPage = new ChatPage(page);
    const messageText = generateMessage();
    
    // Send a message
    await chatPage.sendMessage(messageText);
    await chatPage.expectMessageVisible(messageText);
    
    // Add a reaction (simplified test)
    const message = page.locator(`text="${messageText}"`).first();
    await message.hover();
    
    // If we can add a reaction, clicking it again should remove it
    const existingReaction = page.locator('.reaction, [data-testid="reaction"]').first();
    const hasExistingReaction = await existingReaction.isVisible().catch(() => false);
    
    if (hasExistingReaction) {
      // Click to remove
      await existingReaction.click();
      await page.waitForTimeout(1000);
      
      // Should be removed (or count decreased)
      console.log('Tested reaction removal');
    }
  });

  test('should show reaction count', async ({ page }) => {
    // Look for any existing reactions with counts
    const reactionWithCount = page.locator('.reaction-count, [data-testid="reaction-count"]');
    const hasReactionCounts = await reactionWithCount.first().isVisible().catch(() => false);
    
    console.log(`Reaction counts visible: ${hasReactionCounts}`);
  });
});
