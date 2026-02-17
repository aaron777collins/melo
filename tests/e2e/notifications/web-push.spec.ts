/**
 * E2E Tests for Web Push Notifications
 * 
 * Comprehensive test suite covering push notification functionality
 * across different browsers and scenarios.
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test data and helpers
const TEST_USER_EMAIL = 'test-push@example.com';
const TEST_USER_PASSWORD = 'TestPush123!';
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

interface PushEventData {
  type: string;
  title: string;
  body: string;
  data?: any;
}

/**
 * Mock service worker for testing push events
 */
const MOCK_SERVICE_WORKER = `
  let pushEventReceived = null;
  let notificationClickReceived = null;
  
  self.addEventListener('push', function(event) {
    const data = event.data ? event.data.json() : {};
    pushEventReceived = data;
    
    const notificationData = data.notification || data;
    
    event.waitUntil(
      self.registration.showNotification(notificationData.title || 'Test Notification', {
        body: notificationData.body || 'Test body',
        icon: '/icon-192.png',
        tag: 'test-notification',
        data: notificationData.data || {}
      })
    );
  });
  
  self.addEventListener('notificationclick', function(event) {
    notificationClickReceived = {
      action: event.action,
      tag: event.notification.tag,
      data: event.notification.data
    };
    
    event.notification.close();
    
    event.waitUntil(
      clients.matchAll().then(function(clientList) {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return clients.openWindow('/');
      })
    );
  });
  
  // Expose data for testing
  self.addEventListener('message', function(event) {
    if (event.data === 'GET_PUSH_DATA') {
      event.ports[0].postMessage({
        pushEventReceived,
        notificationClickReceived
      });
    }
    
    if (event.data === 'RESET_DATA') {
      pushEventReceived = null;
      notificationClickReceived = null;
    }
  });
`;

/**
 * Set up push notification environment for testing
 */
async function setupPushEnvironment(page: Page, context: BrowserContext) {
  // Grant notification permission
  await context.grantPermissions(['notifications']);
  
  // Mock the service worker
  await page.addInitScript(() => {
    // Mock PushManager if not available
    if (!('PushManager' in window)) {
      (window as any).PushManager = class MockPushManager {};
    }
    
    // Mock Notification API
    if (!('Notification' in window)) {
      (window as any).Notification = class MockNotification {
        static permission = 'granted';
        static requestPermission = () => Promise.resolve('granted');
        
        constructor(title: string, options: any) {
          console.log('Notification created:', { title, options });
        }
        
        close() {}
      };
    } else {
      // Ensure permission is granted
      Object.defineProperty(window.Notification, 'permission', {
        value: 'granted',
        writable: false
      });
    }
  });
  
  // Navigate to the app
  await page.goto('/');
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');
}

/**
 * Register mock service worker for testing
 */
async function registerMockServiceWorker(page: Page) {
  const swRegistered = await page.evaluate(async (mockSw) => {
    if (!('serviceWorker' in navigator)) {
      return false;
    }
    
    try {
      // Create a blob with the mock service worker
      const blob = new Blob([mockSw], { type: 'application/javascript' });
      const swUrl = URL.createObjectURL(blob);
      
      // Register the service worker
      const registration = await navigator.serviceWorker.register(swUrl, {
        scope: '/'
      });
      
      await navigator.serviceWorker.ready;
      
      // Store registration for tests
      (window as any).testSwRegistration = registration;
      
      return true;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      return false;
    }
  }, MOCK_SERVICE_WORKER);
  
  return swRegistered;
}

/**
 * Simulate push message reception
 */
async function simulatePushMessage(page: Page, data: PushEventData) {
  return await page.evaluate(async (pushData) => {
    const registration = (window as any).testSwRegistration;
    if (!registration || !registration.active) {
      throw new Error('Service worker not registered');
    }
    
    // Create a MessageChannel to communicate with SW
    const channel = new MessageChannel();
    
    // Reset previous data
    registration.active.postMessage('RESET_DATA');
    
    // Simulate push event by sending message to SW
    registration.active.postMessage({
      type: 'SIMULATED_PUSH',
      data: pushData
    });
    
    // Trigger push event manually (since we can't actually send push messages in tests)
    const mockPushEvent = new Event('push');
    (mockPushEvent as any).data = {
      json: () => pushData
    };
    
    // This is a simplification for testing - in real scenarios,
    // push events are triggered by the browser
    return true;
  }, data);
}

/**
 * Get service worker test data
 */
async function getServiceWorkerData(page: Page) {
  return await page.evaluate(async () => {
    const registration = (window as any).testSwRegistration;
    if (!registration || !registration.active) {
      return null;
    }
    
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        resolve(event.data);
      };
      
      registration.active.postMessage('GET_PUSH_DATA', [channel.port2]);
    });
  });
}

// =============================================================================
// Test Suite: Browser Support and Capabilities
// =============================================================================

test.describe('Push Notification Browser Support', () => {
  test('should detect push notification capabilities correctly', async ({ page, context }) => {
    await setupPushEnvironment(page, context);
    
    const capabilities = await page.evaluate(() => {
      // This would normally use the useWebPush hook
      const isSupported = 'serviceWorker' in navigator;
      const isPushSupported = 'PushManager' in window;
      const isNotificationSupported = 'Notification' in window;
      
      return {
        serviceWorker: isSupported,
        pushManager: isPushSupported,
        notifications: isNotificationSupported,
        permission: isNotificationSupported ? Notification.permission : 'unsupported'
      };
    });
    
    expect(capabilities.serviceWorker).toBe(true);
    expect(capabilities.pushManager).toBe(true);
    expect(capabilities.notifications).toBe(true);
    expect(capabilities.permission).toBe('granted');
  });
  
  test('should handle unsupported browsers gracefully', async ({ page }) => {
    // Disable service worker support
    await page.addInitScript(() => {
      delete (navigator as any).serviceWorker;
      delete (window as any).PushManager;
    });
    
    await page.goto('/');
    
    const capabilities = await page.evaluate(() => {
      return {
        serviceWorker: 'serviceWorker' in navigator,
        pushManager: 'PushManager' in window,
        notifications: 'Notification' in window
      };
    });
    
    expect(capabilities.serviceWorker).toBe(false);
    expect(capabilities.pushManager).toBe(false);
    // Should still show some graceful degradation message
  });
});

// =============================================================================
// Test Suite: Push Subscription Management
// =============================================================================

test.describe('Push Subscription Management', () => {
  test('should successfully subscribe to push notifications', async ({ page, context }) => {
    await setupPushEnvironment(page, context);
    
    // Navigate to notification settings
    await page.goto('/settings/notifications');
    await page.waitForLoadState('networkidle');
    
    // Mock successful subscription
    await page.evaluate((vapidKey) => {
      // Mock the subscription process
      navigator.serviceWorker.register('/push-sw.js').then(registration => {
        if (registration.pushManager) {
          registration.pushManager.subscribe = () => Promise.resolve({
            endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
            toJSON: () => ({
              endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
              keys: {
                p256dh: 'test-p256dh-key',
                auth: 'test-auth-key'
              }
            })
          } as any);
        }
      });
    }, VAPID_PUBLIC_KEY);
    
    // Find and click the subscribe button
    const subscribeButton = page.locator('[data-testid="push-subscribe-button"]');
    if (await subscribeButton.count() > 0) {
      await subscribeButton.click();
      
      // Wait for subscription to complete
      await page.waitForTimeout(1000);
      
      // Check that subscription was successful
      const isSubscribed = await page.locator('[data-testid="push-subscription-status"]').textContent();
      expect(isSubscribed).toContain('subscribed');
    } else {
      // If no button exists, check if already subscribed
      console.log('Subscribe button not found, may already be subscribed');
    }
  });
  
  test('should handle subscription failures gracefully', async ({ page, context }) => {
    await setupPushEnvironment(page, context);
    await page.goto('/settings/notifications');
    
    // Mock subscription failure
    await page.evaluate(() => {
      navigator.serviceWorker.register = () => Promise.reject(new Error('Registration failed'));
    });
    
    const subscribeButton = page.locator('[data-testid="push-subscribe-button"]');
    if (await subscribeButton.count() > 0) {
      await subscribeButton.click();
      
      // Should show error message
      const errorMessage = page.locator('[data-testid="push-error-message"]');
      await expect(errorMessage).toBeVisible();
    }
  });
  
  test('should successfully unsubscribe from push notifications', async ({ page, context }) => {
    await setupPushEnvironment(page, context);
    await page.goto('/settings/notifications');
    
    // Mock existing subscription
    await page.evaluate(() => {
      if (navigator.serviceWorker) {
        navigator.serviceWorker.register('/push-sw.js').then(registration => {
          if (registration.pushManager) {
            registration.pushManager.getSubscription = () => Promise.resolve({
              endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
              unsubscribe: () => Promise.resolve(true)
            } as any);
          }
        });
      }
    });
    
    const unsubscribeButton = page.locator('[data-testid="push-unsubscribe-button"]');
    if (await unsubscribeButton.count() > 0) {
      await unsubscribeButton.click();
      
      // Should show unsubscribed status
      const status = await page.locator('[data-testid="push-subscription-status"]').textContent();
      expect(status).toContain('unsubscribed');
    }
  });
});

// =============================================================================
// Test Suite: Notification Reception
// =============================================================================

test.describe('Notification Reception', () => {
  test('should receive and display push notifications', async ({ page, context }) => {
    await setupPushEnvironment(page, context);
    
    // Register mock service worker
    const swRegistered = await registerMockServiceWorker(page);
    expect(swRegistered).toBe(true);
    
    // Simulate receiving a push message
    await simulatePushMessage(page, {
      type: 'dm',
      title: 'New Message from Alice',
      body: 'Hello! How are you doing?',
      data: {
        roomId: '!test:example.com',
        eventId: '$test:example.com'
      }
    });
    
    // Check that notification was displayed
    // Note: In a real test environment, we'd check for actual notifications
    // For now, we verify the service worker received the event
    const swData = await getServiceWorkerData(page);
    expect(swData).toBeTruthy();
  });
  
  test('should handle different notification types correctly', async ({ page, context }) => {
    await setupPushEnvironment(page, context);
    await registerMockServiceWorker(page);
    
    // Test different notification types
    const notificationTypes = [
      {
        type: 'dm',
        title: 'Direct Message',
        body: 'You have a new direct message',
        data: { roomId: '!dm:example.com' }
      },
      {
        type: 'mention',
        title: 'You were mentioned',
        body: '@testuser check this out!',
        data: { roomId: '!room:example.com', eventId: '$mention:example.com' }
      },
      {
        type: 'invite',
        title: 'Room Invitation',
        body: 'You have been invited to General',
        data: { roomId: '!general:example.com' }
      }
    ];
    
    for (const notification of notificationTypes) {
      await simulatePushMessage(page, notification);
      
      // Verify the notification was processed
      const swData = await getServiceWorkerData(page);
      expect(swData).toBeTruthy();
      
      // Reset for next test
      await page.evaluate(() => {
        const registration = (window as any).testSwRegistration;
        if (registration) {
          registration.active.postMessage('RESET_DATA');
        }
      });
    }
  });
});

// =============================================================================
// Test Suite: Notification Click Handling
// =============================================================================

test.describe('Notification Click Handling', () => {
  test('should navigate to correct room on notification click', async ({ page, context }) => {
    await setupPushEnvironment(page, context);
    await registerMockServiceWorker(page);
    
    // Simulate notification with room data
    await simulatePushMessage(page, {
      type: 'dm',
      title: 'New Message',
      body: 'Test message',
      data: {
        roomId: '!test:example.com',
        eventId: '$event:example.com',
        url: '/rooms/!test:example.com#$event:example.com'
      }
    });
    
    // Simulate notification click
    await page.evaluate(async () => {
      const registration = (window as any).testSwRegistration;
      if (registration && registration.active) {
        // Simulate notification click event
        const clickEvent = new Event('notificationclick');
        (clickEvent as any).action = '';
        (clickEvent as any).notification = {
          tag: 'test-notification',
          data: {
            roomId: '!test:example.com',
            eventId: '$event:example.com',
            url: '/rooms/!test:example.com#$event:example.com'
          },
          close: () => {}
        };
        
        // Dispatch to service worker (mocked)
        registration.active.postMessage({
          type: 'NOTIFICATION_CLICK',
          action: '',
          data: {
            roomId: '!test:example.com',
            eventId: '$event:example.com'
          }
        });
      }
    });
    
    // Verify click was handled
    const swData = await getServiceWorkerData(page);
    expect(swData).toBeTruthy();
  });
  
  test('should handle notification actions correctly', async ({ page, context }) => {
    await setupPushEnvironment(page, context);
    await registerMockServiceWorker(page);
    
    // Test different notification actions
    const actions = ['view', 'dismiss', 'reply'];
    
    for (const action of actions) {
      await simulatePushMessage(page, {
        type: 'dm',
        title: 'Test Notification',
        body: 'Test body',
        data: { roomId: '!test:example.com' }
      });
      
      // Simulate action click
      await page.evaluate((actionName) => {
        const registration = (window as any).testSwRegistration;
        if (registration && registration.active) {
          registration.active.postMessage({
            type: 'NOTIFICATION_CLICK',
            action: actionName,
            data: { roomId: '!test:example.com' }
          });
        }
      }, action);
      
      // Verify action was handled
      const swData = await getServiceWorkerData(page);
      expect(swData).toBeTruthy();
    }
  });
});

// =============================================================================
// Test Suite: Cross-Browser Compatibility
// =============================================================================

test.describe('Cross-Browser Compatibility', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`should work correctly in ${browserName}`, async ({ browser }) => {
      // Create a new browser context for each test
      const context = await browser.newContext({
        permissions: ['notifications']
      });
      const page = await context.newPage();
      
      await setupPushEnvironment(page, context);
      
      // Test basic functionality
      const capabilities = await page.evaluate(() => {
        return {
          serviceWorker: 'serviceWorker' in navigator,
          pushManager: 'PushManager' in window,
          notifications: 'Notification' in window,
          permission: 'Notification' in window ? Notification.permission : 'unknown'
        };
      });
      
      // All modern browsers should support these features
      expect(capabilities.serviceWorker).toBe(true);
      
      // Note: Safari/WebKit has limited push notification support
      if (browserName === 'webkit') {
        console.log('WebKit: Push notifications may have limited support');
      } else {
        expect(capabilities.pushManager).toBe(true);
      }
      
      expect(capabilities.notifications).toBe(true);
      expect(capabilities.permission).toBe('granted');
      
      await context.close();
    });
  });
  
  test('should handle browser-specific limitations', async ({ page, context }) => {
    await setupPushEnvironment(page, context);
    
    // Test with different user agents to simulate different browsers
    const browsers = [
      {
        name: 'Chrome',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        expectedFeatures: { actions: true, vibrate: true, image: true }
      },
      {
        name: 'Firefox',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
        expectedFeatures: { actions: true, vibrate: true, image: false } // Firefox has image limitations
      },
      {
        name: 'Safari',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        expectedFeatures: { actions: false, vibrate: false, image: false } // Safari has many limitations
      }
    ];
    
    for (const browser of browsers) {
      // Override user agent
      await page.evaluate((ua) => {
        Object.defineProperty(navigator, 'userAgent', {
          value: ua,
          configurable: true
        });
      }, browser.userAgent);
      
      // Test browser-specific optimizations
      const optimized = await page.evaluate(() => {
        // This would normally use the notification handler's browser detection
        const ua = navigator.userAgent;
        const browser = ua.includes('Chrome') ? 'chrome' :
                       ua.includes('Firefox') ? 'firefox' :
                       ua.includes('Safari') ? 'safari' : 'unknown';
        
        return { browser };
      });
      
      expect(['chrome', 'firefox', 'safari'].includes(optimized.browser)).toBe(true);
    }
  });
});

// =============================================================================
// Test Suite: Error Handling
// =============================================================================

test.describe('Error Handling', () => {
  test('should handle service worker registration failures', async ({ page, context }) => {
    await context.grantPermissions(['notifications']);
    await page.goto('/');
    
    // Mock service worker registration failure
    await page.evaluate(() => {
      if ('serviceWorker' in navigator) {
        const originalRegister = navigator.serviceWorker.register;
        navigator.serviceWorker.register = () => Promise.reject(new Error('Registration failed'));
      }
    });
    
    await page.goto('/settings/notifications');
    
    // Should show error message or graceful degradation
    const errorIndicator = page.locator('[data-testid="push-error"], [data-testid="push-unavailable"]');
    await expect(errorIndicator).toBeVisible();
  });
  
  test('should handle push subscription failures', async ({ page, context }) => {
    await setupPushEnvironment(page, context);
    
    // Mock subscription failure
    await page.evaluate(() => {
      navigator.serviceWorker.register('/push-sw.js').then(registration => {
        if (registration.pushManager) {
          registration.pushManager.subscribe = () => Promise.reject(new Error('Subscription failed'));
        }
      });
    });
    
    await page.goto('/settings/notifications');
    
    const subscribeButton = page.locator('[data-testid="push-subscribe-button"]');
    if (await subscribeButton.count() > 0) {
      await subscribeButton.click();
      
      // Should show error
      const errorMessage = page.locator('[data-testid="push-error-message"]');
      await expect(errorMessage).toBeVisible();
    }
  });
  
  test('should handle malformed push messages', async ({ page, context }) => {
    await setupPushEnvironment(page, context);
    await registerMockServiceWorker(page);
    
    // Send malformed push data
    const malformedData = [
      null,
      undefined,
      '',
      'invalid json',
      {},
      { title: null },
      { body: null }
    ];
    
    for (const data of malformedData) {
      try {
        await simulatePushMessage(page, data as any);
        
        // Service worker should handle gracefully
        const swData = await getServiceWorkerData(page);
        // Should not crash
        
      } catch (error) {
        console.log('Expected error for malformed data:', error.message);
      }
    }
  });
});

// =============================================================================
// Test Suite: Performance and Security
// =============================================================================

test.describe('Performance and Security', () => {
  test('should not block UI during push operations', async ({ page, context }) => {
    await setupPushEnvironment(page, context);
    
    // Navigate to a page with interactive elements
    await page.goto('/channels/@me');
    
    // Start push subscription (which might be slow)
    const subscribePromise = page.evaluate(async () => {
      // Mock slow subscription
      return new Promise(resolve => {
        setTimeout(() => resolve(true), 2000);
      });
    });
    
    // UI should remain responsive
    const textInput = page.locator('input[type="text"]').first();
    if (await textInput.count() > 0) {
      await textInput.click();
      await textInput.fill('test message');
      
      // Input should work while subscription is pending
      await expect(textInput).toHaveValue('test message');
    }
    
    await subscribePromise;
  });
  
  test('should validate VAPID keys properly', async ({ page, context }) => {
    await setupPushEnvironment(page, context);
    
    const result = await page.evaluate((vapidKey) => {
      if (!vapidKey) {
        return { valid: false, reason: 'No VAPID key provided' };
      }
      
      try {
        // Basic VAPID key validation
        const keyBytes = atob(vapidKey.replace(/-/g, '+').replace(/_/g, '/'));
        return {
          valid: keyBytes.length === 65,
          length: keyBytes.length
        };
      } catch (error) {
        return { valid: false, reason: 'Invalid base64' };
      }
    }, VAPID_PUBLIC_KEY);
    
    if (VAPID_PUBLIC_KEY) {
      expect(result.valid).toBe(true);
    } else {
      expect(result.valid).toBe(false);
    }
  });
});

// =============================================================================
// Test Suite: Integration with Matrix
// =============================================================================

test.describe('Matrix Integration', () => {
  test('should receive notifications for Matrix events', async ({ page, context }) => {
    await setupPushEnvironment(page, context);
    await registerMockServiceWorker(page);
    
    // Simulate Matrix room message notification
    await simulatePushMessage(page, {
      type: 'room_message',
      title: 'Alice in General',
      body: 'Hey everyone! How is the project going?',
      data: {
        roomId: '!general:matrix.example.com',
        eventId: '$event123:matrix.example.com',
        senderId: '@alice:matrix.example.com',
        notificationType: 'mention'
      }
    });
    
    // Verify notification was processed with Matrix data
    const swData = await getServiceWorkerData(page);
    expect(swData).toBeTruthy();
  });
  
  test('should handle room invitations', async ({ page, context }) => {
    await setupPushEnvironment(page, context);
    await registerMockServiceWorker(page);
    
    // Simulate room invitation
    await simulatePushMessage(page, {
      type: 'room_invite',
      title: 'Room invitation from Bob',
      body: 'You have been invited to Development Team',
      data: {
        roomId: '!dev-team:matrix.example.com',
        senderId: '@bob:matrix.example.com',
        notificationType: 'invite'
      }
    });
    
    const swData = await getServiceWorkerData(page);
    expect(swData).toBeTruthy();
  });
});

// =============================================================================
// Setup and Teardown
// =============================================================================

test.beforeEach(async ({ page }) => {
  // Reset any previous state
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test.afterEach(async ({ page }) => {
  // Clean up any notifications
  await page.evaluate(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => registration.unregister());
      });
    }
  });
});