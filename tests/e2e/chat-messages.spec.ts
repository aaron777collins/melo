/**
 * Chat Messages Component E2E Tests
 * 
 * End-to-end tests for the ChatMessages component following Discord-clone reference.
 * Tests real user interactions and visual behavior in a browser environment.
 */

import { test, expect, type Page } from '@playwright/test';

// Test data
const TEST_SERVER = '!testspace:matrix.org';
const TEST_CHANNEL = '!testchannel:matrix.org';
const TEST_USER = '@testuser:matrix.org';

// Helper function to navigate to a channel
async function navigateToChannel(page: Page, serverId: string, channelId: string) {
  await page.goto(`/servers/${encodeURIComponent(serverId)}/channels/${encodeURIComponent(channelId)}`);
  await page.waitForLoadState('networkidle');
}

// Helper function to mock Matrix message data
async function mockMessageData(page: Page, messages: any[] = []) {
  await page.route('**/api/messages**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        pages: [{
          items: messages,
        }],
      }),
    });
  });
}

test.describe('Chat Messages Component', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.setItem('matrix-auth-token', 'test-token');
    });
  });

  test.describe('Loading States', () => {
    test('displays loading spinner during message fetch', async ({ page }) => {
      // Mock slow API response
      await page.route('**/api/messages**', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ pages: [{ items: [] }] }),
        });
      });

      await navigateToChannel(page, TEST_SERVER, TEST_CHANNEL);

      // Should show loading spinner
      await expect(page.getByTestId('loading-messages')).toBeVisible();
      await expect(page.getByText('Loading messages...')).toBeVisible();

      // Loading spinner should have correct styling
      const loader = page.getByTestId('loading-messages').locator('[data-testid="loader"]');
      await expect(loader).toHaveClass(/animate-spin/);
      await expect(loader).toHaveClass(/text-zinc-500/);
    });

    test('hides loading spinner when messages load', async ({ page }) => {
      await mockMessageData(page, [{
        id: 'msg1',
        content: 'Hello world',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deleted: false,
        member: {
          userId: TEST_USER,
          profile: { name: 'Test User' },
        },
      }]);

      await navigateToChannel(page, TEST_SERVER, TEST_CHANNEL);

      // Loading should disappear
      await expect(page.getByTestId('loading-messages')).not.toBeVisible();
      await expect(page.getByText('Loading messages...')).not.toBeVisible();
    });
  });

  test.describe('Error States', () => {
    test('displays error message when message fetch fails', async ({ page }) => {
      // Mock API error
      await page.route('**/api/messages**', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' }),
        });
      });

      await navigateToChannel(page, TEST_SERVER, TEST_CHANNEL);

      // Should show error message
      await expect(page.getByTestId('error-messages')).toBeVisible();
      await expect(page.getByText('Something went wrong!')).toBeVisible();

      // Error icon should have correct styling
      const errorIcon = page.getByTestId('error-messages').locator('[data-testid="server-crash"]');
      await expect(errorIcon).toHaveClass(/text-zinc-500/);
      await expect(errorIcon).toHaveClass(/h-7/);
      await expect(errorIcon).toHaveClass(/w-7/);
    });
  });

  test.describe('Message Display', () => {
    test('renders welcome message in empty channel', async ({ page }) => {
      await mockMessageData(page, []);

      await navigateToChannel(page, TEST_SERVER, TEST_CHANNEL);

      // Should show welcome message
      await expect(page.getByTestId('chat-welcome')).toBeVisible();
      await expect(page.getByText(/Welcome to/)).toBeVisible();
    });

    test('displays messages in chronological order', async ({ page }) => {
      const messages = [
        {
          id: 'msg1',
          content: 'First message',
          createdAt: new Date('2023-01-01T10:00:00Z').toISOString(),
          updatedAt: new Date('2023-01-01T10:00:00Z').toISOString(),
          deleted: false,
          member: { userId: TEST_USER, profile: { name: 'User1' } },
        },
        {
          id: 'msg2', 
          content: 'Second message',
          createdAt: new Date('2023-01-01T10:01:00Z').toISOString(),
          updatedAt: new Date('2023-01-01T10:01:00Z').toISOString(),
          deleted: false,
          member: { userId: TEST_USER, profile: { name: 'User2' } },
        },
        {
          id: 'msg3',
          content: 'Third message', 
          createdAt: new Date('2023-01-01T10:02:00Z').toISOString(),
          updatedAt: new Date('2023-01-01T10:02:00Z').toISOString(),
          deleted: false,
          member: { userId: TEST_USER, profile: { name: 'User3' } },
        },
      ];

      await mockMessageData(page, messages);
      await navigateToChannel(page, TEST_SERVER, TEST_CHANNEL);

      // Messages should appear in order (newest at bottom due to flex-col-reverse)
      const messageElements = page.getByTestId('chat-item');
      await expect(messageElements).toHaveCount(3);

      // Check reverse order display (newest first in DOM due to flex-col-reverse)
      await expect(messageElements.nth(0)).toContainText('Third message');
      await expect(messageElements.nth(1)).toContainText('Second message');
      await expect(messageElements.nth(2)).toContainText('First message');
    });

    test('applies correct container styling', async ({ page }) => {
      await mockMessageData(page, [{
        id: 'msg1',
        content: 'Test message',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deleted: false,
        member: { userId: TEST_USER, profile: { name: 'Test User' } },
      }]);

      await navigateToChannel(page, TEST_SERVER, TEST_CHANNEL);

      // Check main container classes
      const container = page.locator('[data-testid="chat-messages-container"]');
      await expect(container).toHaveClass(/flex-1/);
      await expect(container).toHaveClass(/flex-col/);
      await expect(container).toHaveClass(/py-4/);
      await expect(container).toHaveClass(/overflow-y-auto/);

      // Check messages container classes
      const messagesContainer = page.locator('[data-testid="messages-container"]');
      await expect(messagesContainer).toHaveClass(/flex/);
      await expect(messagesContainer).toHaveClass(/flex-col-reverse/);
      await expect(messagesContainer).toHaveClass(/mt-auto/);
    });
  });

  test.describe('Pagination', () => {
    test('shows load more button when there are previous messages', async ({ page }) => {
      // Mock response with hasNextPage = true
      await page.route('**/api/messages**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            pages: [{
              items: [{
                id: 'msg1',
                content: 'Recent message',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                deleted: false,
                member: { userId: TEST_USER, profile: { name: 'Test User' } },
              }],
            }],
            hasNextPage: true,
          }),
        });
      });

      await navigateToChannel(page, TEST_SERVER, TEST_CHANNEL);

      // Should show load more button
      const loadMoreButton = page.getByRole('button', { name: /load previous messages/i });
      await expect(loadMoreButton).toBeVisible();

      // Button should have correct styling
      await expect(loadMoreButton).toHaveClass(/text-zinc-500/);
      await expect(loadMoreButton).toHaveClass(/hover:text-zinc-600/);
      await expect(loadMoreButton).toHaveClass(/dark:text-zinc-400/);
      await expect(loadMoreButton).toHaveClass(/text-xs/);
      await expect(loadMoreButton).toHaveClass(/my-4/);
      await expect(loadMoreButton).toHaveClass(/transition/);
    });

    test('clicking load more button fetches previous messages', async ({ page }) => {
      let requestCount = 0;
      
      await page.route('**/api/messages**', async (route) => {
        requestCount++;
        
        if (requestCount === 1) {
          // First request - show recent messages with more available
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              pages: [{
                items: [{
                  id: 'msg2',
                  content: 'Recent message',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  deleted: false,
                  member: { userId: TEST_USER, profile: { name: 'Recent User' } },
                }],
              }],
              hasNextPage: true,
            }),
          });
        } else {
          // Second request - show older messages too
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              pages: [
                {
                  items: [{
                    id: 'msg1',
                    content: 'Older message',
                    createdAt: new Date(Date.now() - 3600000).toISOString(),
                    updatedAt: new Date(Date.now() - 3600000).toISOString(),
                    deleted: false,
                    member: { userId: TEST_USER, profile: { name: 'Older User' } },
                  }],
                },
                {
                  items: [{
                    id: 'msg2',
                    content: 'Recent message',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    deleted: false,
                    member: { userId: TEST_USER, profile: { name: 'Recent User' } },
                  }],
                }
              ],
              hasNextPage: false,
            }),
          });
        }
      });

      await navigateToChannel(page, TEST_SERVER, TEST_CHANNEL);

      // Initial state - should have 1 message and load more button
      await expect(page.getByTestId('chat-item')).toHaveCount(1);
      await expect(page.getByText('Recent message')).toBeVisible();

      const loadMoreButton = page.getByRole('button', { name: /load previous messages/i });
      await expect(loadMoreButton).toBeVisible();

      // Click load more
      await loadMoreButton.click();

      // Should now have 2 messages and no load more button
      await expect(page.getByTestId('chat-item')).toHaveCount(2);
      await expect(page.getByText('Older message')).toBeVisible();
      await expect(page.getByText('Recent message')).toBeVisible();
      await expect(loadMoreButton).not.toBeVisible();

      // Verify second API call was made
      expect(requestCount).toBe(2);
    });

    test('shows loading spinner while fetching more messages', async ({ page }) => {
      await page.route('**/api/messages**', async (route) => {
        const url = route.request().url();
        
        if (url.includes('page=2') || url.includes('cursor=')) {
          // Simulate slow loading for pagination
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            pages: [{
              items: [{
                id: 'msg1',
                content: 'Test message',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                deleted: false,
                member: { userId: TEST_USER, profile: { name: 'Test User' } },
              }],
            }],
            hasNextPage: true,
          }),
        });
      });

      await navigateToChannel(page, TEST_SERVER, TEST_CHANNEL);

      const loadMoreButton = page.getByRole('button', { name: /load previous messages/i });
      await expect(loadMoreButton).toBeVisible();

      // Start loading more messages
      await loadMoreButton.click();

      // Should show loading spinner and hide button
      await expect(page.getByTestId('pagination-loader')).toBeVisible();
      await expect(loadMoreButton).not.toBeVisible();

      // Wait for loading to complete
      await expect(page.getByTestId('pagination-loader')).not.toBeVisible({ timeout: 2000 });
    });
  });

  test.describe('Scrolling Behavior', () => {
    test('auto-scrolls to bottom on initial load', async ({ page }) => {
      const messages = Array.from({ length: 50 }, (_, i) => ({
        id: `msg${i}`,
        content: `Message ${i}`,
        createdAt: new Date(Date.now() - (50 - i) * 1000).toISOString(),
        updatedAt: new Date(Date.now() - (50 - i) * 1000).toISOString(),
        deleted: false,
        member: { userId: TEST_USER, profile: { name: `User${i}` } },
      }));

      await mockMessageData(page, messages);
      await navigateToChannel(page, TEST_SERVER, TEST_CHANNEL);

      // Should be scrolled to bottom (most recent message visible)
      await expect(page.getByText('Message 49')).toBeVisible();
      
      // Bottom ref should be in viewport
      const bottomRef = page.locator('[data-testid="bottom-ref"]');
      await expect(bottomRef).toBeInViewport();
    });

    test('maintains scroll position when loading older messages', async ({ page }) => {
      let isFirstRequest = true;
      
      await page.route('**/api/messages**', async (route) => {
        if (isFirstRequest) {
          isFirstRequest = false;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              pages: [{
                items: Array.from({ length: 20 }, (_, i) => ({
                  id: `msg${i + 20}`,
                  content: `Recent Message ${i + 20}`,
                  createdAt: new Date(Date.now() - i * 1000).toISOString(),
                  updatedAt: new Date(Date.now() - i * 1000).toISOString(),
                  deleted: false,
                  member: { userId: TEST_USER, profile: { name: `User${i}` } },
                })),
              }],
              hasNextPage: true,
            }),
          });
        } else {
          // Return older messages prepended
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              pages: [
                {
                  items: Array.from({ length: 20 }, (_, i) => ({
                    id: `msg${i}`,
                    content: `Older Message ${i}`,
                    createdAt: new Date(Date.now() - (i + 40) * 1000).toISOString(),
                    updatedAt: new Date(Date.now() - (i + 40) * 1000).toISOString(),
                    deleted: false,
                    member: { userId: TEST_USER, profile: { name: `OlderUser${i}` } },
                  })),
                },
                {
                  items: Array.from({ length: 20 }, (_, i) => ({
                    id: `msg${i + 20}`,
                    content: `Recent Message ${i + 20}`,
                    createdAt: new Date(Date.now() - i * 1000).toISOString(),
                    updatedAt: new Date(Date.now() - i * 1000).toISOString(),
                    deleted: false,
                    member: { userId: TEST_USER, profile: { name: `User${i}` } },
                  })),
                }
              ],
              hasNextPage: false,
            }),
          });
        }
      });

      await navigateToChannel(page, TEST_SERVER, TEST_CHANNEL);

      // Scroll up a bit from bottom
      const container = page.locator('[data-testid="chat-messages-container"]');
      await container.scrollIntoViewIfNeeded();
      await page.mouse.wheel(0, -200);

      // Remember a message that should stay in view
      const referenceMessage = page.getByText('Recent Message 25');
      await expect(referenceMessage).toBeVisible();

      // Load more messages
      const loadMoreButton = page.getByRole('button', { name: /load previous messages/i });
      await loadMoreButton.click();

      // Wait for messages to load
      await expect(page.getByText('Older Message 0')).toBeVisible({ timeout: 5000 });

      // The reference message should still be visible (scroll position maintained)
      await expect(referenceMessage).toBeVisible();
    });
  });

  test.describe('Real-time Updates', () => {
    test('displays new messages as they arrive', async ({ page }) => {
      // Mock WebSocket or SSE connection for real-time updates
      await mockMessageData(page, [{
        id: 'msg1',
        content: 'Initial message',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deleted: false,
        member: { userId: TEST_USER, profile: { name: 'Initial User' } },
      }]);

      await navigateToChannel(page, TEST_SERVER, TEST_CHANNEL);
      
      await expect(page.getByTestId('chat-item')).toHaveCount(1);
      await expect(page.getByText('Initial message')).toBeVisible();

      // Simulate new message arrival via WebSocket/SSE
      await page.evaluate(() => {
        // Trigger a message update event that the component would listen to
        window.dispatchEvent(new CustomEvent('matrix-new-message', {
          detail: {
            roomId: '!testchannel:matrix.org',
            message: {
              id: 'msg2',
              content: 'New real-time message',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              deleted: false,
              member: { userId: '@testuser:matrix.org', profile: { name: 'New User' } },
            }
          }
        }));
      });

      // New message should appear
      await expect(page.getByTestId('chat-item')).toHaveCount(2);
      await expect(page.getByText('New real-time message')).toBeVisible();
    });
  });

  test.describe('Discord-style Visual Parity', () => {
    test('uses correct dark theme colors', async ({ page }) => {
      await mockMessageData(page, [{
        id: 'msg1',
        content: 'Test message',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deleted: false,
        member: { userId: TEST_USER, profile: { name: 'Test User' } },
      }]);

      await navigateToChannel(page, TEST_SERVER, TEST_CHANNEL);

      // Check for Discord dark theme background color
      const container = page.locator('[data-testid="chat-messages-container"]');
      await expect(container).toHaveCSS('background-color', 'rgb(49, 51, 56)'); // dark:bg-[#313338]
      
      // Check text colors
      const textElements = page.locator('.text-white, .dark\\:text-white');
      await expect(textElements.first()).toHaveCSS('color', 'rgb(255, 255, 255)');
    });

    test('matches Discord message spacing and layout', async ({ page }) => {
      const messages = [
        {
          id: 'msg1',
          content: 'First message',
          createdAt: new Date('2023-01-01T10:00:00Z').toISOString(),
          updatedAt: new Date('2023-01-01T10:00:00Z').toISOString(),
          deleted: false,
          member: { userId: TEST_USER, profile: { name: 'User1' } },
        },
        {
          id: 'msg2',
          content: 'Second message',
          createdAt: new Date('2023-01-01T10:01:00Z').toISOString(),
          updatedAt: new Date('2023-01-01T10:01:00Z').toISOString(),
          deleted: false,
          member: { userId: TEST_USER, profile: { name: 'User2' } },
        },
      ];

      await mockMessageData(page, messages);
      await navigateToChannel(page, TEST_SERVER, TEST_CHANNEL);

      // Check container padding (py-4)
      const container = page.locator('[data-testid="chat-messages-container"]');
      await expect(container).toHaveCSS('padding-top', '16px');
      await expect(container).toHaveCSS('padding-bottom', '16px');

      // Verify flex layout
      await expect(container).toHaveCSS('display', 'flex');
      await expect(container).toHaveCSS('flex-direction', 'column');
    });
  });
});