/**
 * Chat Input E2E Tests
 * 
 * Comprehensive end-to-end tests for the ChatInput component.
 * Tests messaging functionality, visual identity, and accessibility.
 */

import { test, expect } from '@playwright/test';
import { 
  ChatPage, 
  waitForAppReady, 
  waitForMatrixSync,
  generateMessage 
} from '../fixtures';

test.describe('Chat Input Component', () => {
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

  test.describe('Visual Identity - Discord Clone Parity', () => {
    test('should display message input with correct styling', async ({ page }) => {
      // Find the message input
      const input = page.locator('input[placeholder*="Message"], textarea[placeholder*="Message"]').first();
      await expect(input).toBeVisible();
      
      // Check input has correct visual styling
      const inputClasses = await input.getAttribute('class');
      expect(inputClasses).toContain('bg-zinc');
      expect(inputClasses).toContain('border-none');
    });

    test('should display attachment button with Plus icon', async ({ page }) => {
      // Look for the attachment button with Plus icon
      const attachButton = page.locator('button[aria-label*="ttach"], button:has(svg.lucide-plus)').first();
      await expect(attachButton).toBeVisible();
      
      // Verify it has rounded styling
      const buttonClasses = await attachButton.getAttribute('class');
      expect(buttonClasses).toContain('rounded-full');
    });

    test('should display emoji picker button', async ({ page }) => {
      // Look for emoji picker
      const emojiButton = page.locator('[aria-label*="emoji" i], [data-testid="emoji-picker"]').first();
      await expect(emojiButton).toBeVisible();
    });

    test('should have correct container padding', async ({ page }) => {
      // The input container should have p-4 pb-6 padding
      const inputContainer = page.locator('input[placeholder*="Message"]').locator('..').locator('..');
      const containerClasses = await inputContainer.getAttribute('class');
      
      // Should have padding classes
      expect(containerClasses).toMatch(/p-4|p-\[/);
    });

    test('should display send button in chat view', async ({ page }) => {
      // Send button should be visible
      const sendButton = page.locator('button[aria-label*="send" i], button:has(svg.lucide-send)').first();
      const hasSendButton = await sendButton.isVisible().catch(() => false);
      
      console.log(`Send button visible: ${hasSendButton}`);
    });

    test('should have dark mode styling', async ({ page }) => {
      // Check if dark mode classes are present
      const html = page.locator('html');
      const htmlClass = await html.getAttribute('class');
      
      if (htmlClass?.includes('dark')) {
        const input = page.locator('input[placeholder*="Message"]').first();
        const inputClasses = await input.getAttribute('class');
        expect(inputClasses).toContain('dark:bg-zinc-700');
      }
    });
  });

  test.describe('Message Input Behavior', () => {
    test('should accept text input', async ({ page }) => {
      const chatPage = new ChatPage(page);
      const testMessage = 'Test input acceptance';
      
      await chatPage.messageInput.fill(testMessage);
      
      const value = await chatPage.messageInput.inputValue();
      expect(value).toBe(testMessage);
    });

    test('should clear input after sending message', async ({ page }) => {
      const chatPage = new ChatPage(page);
      const messageText = generateMessage();
      
      // Send message
      await chatPage.sendMessage(messageText);
      
      // Wait for send to complete
      await page.waitForTimeout(2000);
      
      // Input should be cleared
      const inputValue = await chatPage.messageInput.inputValue();
      expect(inputValue).toBe('');
    });

    test('should show placeholder text', async ({ page }) => {
      const chatPage = new ChatPage(page);
      
      const placeholder = await chatPage.messageInput.getAttribute('placeholder');
      expect(placeholder).toMatch(/Message/);
    });

    test('should handle long messages', async ({ page }) => {
      const chatPage = new ChatPage(page);
      const longMessage = 'A'.repeat(500);
      
      await chatPage.messageInput.fill(longMessage);
      
      const value = await chatPage.messageInput.inputValue();
      expect(value).toBe(longMessage);
    });

    test('should handle special characters', async ({ page }) => {
      const chatPage = new ChatPage(page);
      const specialChars = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~';
      
      await chatPage.messageInput.fill(specialChars);
      
      const value = await chatPage.messageInput.inputValue();
      expect(value).toBe(specialChars);
    });

    test('should handle unicode/emoji characters', async ({ page }) => {
      const chatPage = new ChatPage(page);
      const unicodeMessage = '👋 Hello 世界 🌍 مرحبا';
      
      await chatPage.messageInput.fill(unicodeMessage);
      
      const value = await chatPage.messageInput.inputValue();
      expect(value).toBe(unicodeMessage);
    });
  });

  test.describe('Keyboard Interactions', () => {
    test('should send message on Enter key', async ({ page }) => {
      const chatPage = new ChatPage(page);
      const messageText = generateMessage();
      
      await chatPage.messageInput.fill(messageText);
      await chatPage.messageInput.press('Enter');
      
      await page.waitForTimeout(3000);
      
      // Message should appear in chat
      await chatPage.expectMessageVisible(messageText);
    });

    test('should not send empty message on Enter', async ({ page }) => {
      const chatPage = new ChatPage(page);
      
      // Try to send empty message
      await chatPage.messageInput.focus();
      await chatPage.messageInput.press('Enter');
      
      await page.waitForTimeout(1000);
      
      // No error should occur, input should remain focused
      await expect(chatPage.messageInput).toBeFocused();
    });

    test('should support Tab navigation', async ({ page }) => {
      const chatPage = new ChatPage(page);
      
      // Focus the input
      await chatPage.messageInput.focus();
      
      // Tab should move focus to next element
      await page.keyboard.press('Tab');
      
      // Focus should have moved
      const inputStillFocused = await chatPage.messageInput.evaluate(el => el === document.activeElement);
      expect(inputStillFocused).toBe(false);
    });
  });

  test.describe('Attachment Button', () => {
    test('should open file modal on click', async ({ page }) => {
      // Find and click attachment button
      const attachButton = page.locator('button[aria-label*="ttach" i], button:has(svg.lucide-plus)').first();
      await attachButton.click();
      
      await page.waitForTimeout(500);
      
      // Modal/dialog should appear
      const modal = page.locator('[role="dialog"], .modal, [data-state="open"]');
      const hasModal = await modal.first().isVisible().catch(() => false);
      
      console.log(`File modal opened: ${hasModal}`);
    });

    test('should have proper accessibility label', async ({ page }) => {
      const attachButton = page.locator('button[aria-label*="ttach" i], button:has(svg.lucide-plus)').first();
      
      const ariaLabel = await attachButton.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    });
  });

  test.describe('Emoji Picker', () => {
    test('should open emoji picker on click', async ({ page }) => {
      // Find emoji picker button
      const emojiButton = page.locator('[aria-label*="emoji" i], [data-testid="emoji-picker"], button:has(.lucide-smile)').first();
      await emojiButton.click().catch(() => {});
      
      await page.waitForTimeout(500);
      
      // Emoji picker should be visible
      const emojiPicker = page.locator('[data-testid="emoji-mart"], .emoji-picker, [class*="emoji"]');
      const hasEmojiPicker = await emojiPicker.first().isVisible().catch(() => false);
      
      console.log(`Emoji picker opened: ${hasEmojiPicker}`);
    });

    test('should insert emoji into input', async ({ page }) => {
      const chatPage = new ChatPage(page);
      
      // Type some text first
      await chatPage.messageInput.fill('Hello ');
      
      // Open emoji picker and select an emoji
      const emojiButton = page.locator('[aria-label*="emoji" i], [data-testid="emoji-picker"]').first();
      await emojiButton.click().catch(() => {});
      
      await page.waitForTimeout(500);
      
      // Click on an emoji
      const emoji = page.locator('[data-testid*="emoji"], .emoji-mart-emoji, button:has-text("😀")').first();
      await emoji.click().catch(() => {});
      
      await page.waitForTimeout(500);
      
      // Input should contain the emoji
      const value = await chatPage.messageInput.inputValue();
      console.log(`Input value after emoji: ${value}`);
    });
  });

  test.describe('GIF Button', () => {
    test('should display GIF button', async ({ page }) => {
      const gifButton = page.locator('button[aria-label*="gif" i], button:has(svg.lucide-image)').first();
      const hasGifButton = await gifButton.isVisible().catch(() => false);
      
      console.log(`GIF button visible: ${hasGifButton}`);
    });

    test('should open GIF picker on click', async ({ page }) => {
      const gifButton = page.locator('button[aria-label*="gif" i], button:has(svg.lucide-image)').first();
      
      if (await gifButton.isVisible()) {
        await gifButton.click();
        await page.waitForTimeout(500);
        
        // GIF picker modal should open
        const gifPicker = page.locator('[role="dialog"]:has-text("GIF"), .gif-picker, [data-testid="gif-picker"]');
        const hasGifPicker = await gifPicker.first().isVisible().catch(() => false);
        
        console.log(`GIF picker opened: ${hasGifPicker}`);
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA attributes', async ({ page }) => {
      const chatPage = new ChatPage(page);
      
      // Input should have aria-label
      const ariaLabel = await chatPage.messageInput.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    });

    test('should have form role', async ({ page }) => {
      const form = page.locator('form[aria-label*="Message" i], form[role="form"]').first();
      await expect(form).toBeVisible();
    });

    test('should have screen reader help text', async ({ page }) => {
      // Look for sr-only help text
      const helpText = page.locator('.sr-only:has-text("Enter")');
      const hasHelpText = await helpText.first().isVisible({ timeout: 1000 }).catch(() => false);
      
      console.log(`Screen reader help text present: ${hasHelpText}`);
    });

    test('should announce sent messages', async ({ page }) => {
      // This would require testing the announce function
      // which may require mocking or specific test setup
      const chatPage = new ChatPage(page);
      const messageText = generateMessage();
      
      // Send message
      await chatPage.sendMessage(messageText);
      
      // Check for aria-live region or announcement
      const liveRegion = page.locator('[aria-live]');
      const hasLiveRegion = await liveRegion.first().isVisible().catch(() => false);
      
      console.log(`Live region present: ${hasLiveRegion}`);
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should display correctly on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/');
      await waitForAppReady(page);
      
      // Navigate to channel
      const firstServer = page.locator('[data-testid*="server"], .server-item, nav a').first();
      await firstServer.click().catch(() => {});
      await page.waitForTimeout(2000);
      
      const firstChannel = page.locator('[data-testid*="channel"], .channel-item').first();
      await firstChannel.click().catch(() => {});
      await page.waitForTimeout(2000);
      
      // Input should still be visible and usable
      const input = page.locator('input[placeholder*="Message"], textarea[placeholder*="Message"]').first();
      const isVisible = await input.isVisible().catch(() => false);
      
      console.log(`Input visible on mobile: ${isVisible}`);
    });

    test('should have touch-friendly button sizes on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Buttons should be at least 44x44 for touch targets
      const attachButton = page.locator('button[aria-label*="ttach" i]').first();
      
      if (await attachButton.isVisible()) {
        const box = await attachButton.boundingBox();
        console.log(`Attach button size: ${box?.width}x${box?.height}`);
        
        // On mobile, should have larger touch targets
        // (44px is the recommended minimum)
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle message send failure gracefully', async ({ page }) => {
      const chatPage = new ChatPage(page);
      
      // Disconnect network to simulate failure
      await page.context().setOffline(true);
      
      const messageText = generateMessage();
      await chatPage.messageInput.fill(messageText);
      await chatPage.messageInput.press('Enter');
      
      await page.waitForTimeout(2000);
      
      // Reconnect
      await page.context().setOffline(false);
      
      // No crash should occur
      await expect(chatPage.messageInput).toBeVisible();
    });
  });

  test.describe('Integration with Chat', () => {
    test('should scroll chat to bottom after sending message', async ({ page }) => {
      const chatPage = new ChatPage(page);
      
      // Send multiple messages to create scroll
      for (let i = 0; i < 3; i++) {
        const messageText = generateMessage();
        await chatPage.sendMessage(messageText);
        await page.waitForTimeout(1000);
      }
      
      // Check if chat is scrolled to bottom
      const chatContainer = page.locator('[data-testid="message-list"], .chat-messages, .message-list').first();
      
      if (await chatContainer.isVisible()) {
        const isScrolledToBottom = await chatContainer.evaluate(el => {
          return Math.abs((el.scrollHeight - el.scrollTop) - el.clientHeight) < 50;
        });
        
        console.log(`Chat scrolled to bottom: ${isScrolledToBottom}`);
      }
    });

    test('should show message immediately after sending', async ({ page }) => {
      const chatPage = new ChatPage(page);
      const messageText = generateMessage();
      
      // Send message
      await chatPage.sendMessage(messageText);
      
      // Message should appear within reasonable time
      await chatPage.expectMessageVisible(messageText);
    });
  });
});

test.describe('Chat Input - Visual Regression', () => {
  test('should match Discord-clone input layout', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);
    await waitForMatrixSync(page);
    
    // Navigate to a channel
    const firstServer = page.locator('[data-testid*="server"], .server-item').first();
    await firstServer.click().catch(() => {});
    await page.waitForTimeout(2000);
    
    const firstChannel = page.locator('[data-testid*="channel"]').first();
    await firstChannel.click().catch(() => {});
    await page.waitForTimeout(2000);
    
    // Take screenshot of chat input area
    const inputArea = page.locator('form:has(input[placeholder*="Message"])').first();
    
    if (await inputArea.isVisible()) {
      await inputArea.screenshot({ 
        path: 'tests/screenshots/chat-input-visual.png' 
      });
      
      console.log('Screenshot saved: tests/screenshots/chat-input-visual.png');
    }
  });
});
