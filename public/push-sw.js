/**
 * Custom Push Service Worker for Melo
 * 
 * This service worker handles push notifications and notification clicks.
 * It works alongside the Next.js PWA service worker.
 */

// Import Workbox if available (for Next.js PWA integration)
if (typeof importScripts === 'function') {
  try {
    importScripts('/workbox-v6.6.0/workbox-sw.js');
    if (workbox) {
      console.log('Workbox is loaded');
    }
  } catch (e) {
    console.log('Workbox loading failed, continuing without it');
  }
}

// Version for cache busting
const CACHE_VERSION = 'v1.0.0';
const NOTIFICATION_CACHE = `melo-notifications-${CACHE_VERSION}`;

/**
 * Handle push events
 */
self.addEventListener('push', function(event) {
  console.log('Push event received:', event);
  
  if (!event.data) {
    console.log('Push event has no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('Push data:', data);
    
    const notificationData = data.notification || data;
    const options = {
      body: notificationData.body,
      icon: notificationData.icon || '/icon-192.png',
      badge: notificationData.badge || '/icon-192.png', 
      tag: notificationData.tag || 'melo-notification',
      data: notificationData.data || {},
      actions: notificationData.actions || [
        {
          action: 'view',
          title: 'View',
          icon: '/icons/action-view.png'
        },
        {
          action: 'dismiss', 
          title: 'Dismiss',
          icon: '/icons/action-dismiss.png'
        }
      ],
      requireInteraction: notificationData.requireInteraction || false,
      silent: notificationData.silent || false,
      vibrate: notificationData.vibrate || [200, 100, 200],
      timestamp: notificationData.timestamp || Date.now(),
      renotify: false,
      sticky: false,
      image: notificationData.image
    };

    event.waitUntil(
      self.registration.showNotification(notificationData.title, options)
        .then(() => {
          console.log('Notification displayed successfully');
          
          // Store notification for analytics/history if needed
          return caches.open(NOTIFICATION_CACHE).then(cache => {
            const notificationRecord = {
              id: generateNotificationId(),
              title: notificationData.title,
              body: notificationData.body,
              timestamp: Date.now(),
              data: notificationData.data
            };
            
            return cache.put(
              `/notifications/${notificationRecord.id}`,
              new Response(JSON.stringify(notificationRecord))
            );
          });
        })
        .catch(error => {
          console.error('Failed to show notification:', error);
        })
    );
  } catch (error) {
    console.error('Failed to parse push data:', error);
    
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('New Message', {
        body: 'You have a new message in Melo',
        icon: '/icon-192.png',
        tag: 'melo-fallback'
      })
    );
  }
});

/**
 * Handle notification click events
 */
self.addEventListener('notificationclick', function(event) {
  console.log('Notification click received:', event);
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  
  // Close the notification
  notification.close();
  
  // Handle different actions
  if (action === 'dismiss') {
    console.log('Notification dismissed');
    return;
  }
  
  // Determine the URL to open
  let urlToOpen = '/';
  
  if (data.url) {
    urlToOpen = data.url;
  } else if (data.roomId) {
    if (data.eventId) {
      urlToOpen = `/rooms/${data.roomId}#${data.eventId}`;
    } else {
      urlToOpen = `/rooms/${data.roomId}`;
    }
  } else if (data.notificationType === 'dm') {
    urlToOpen = '/channels/@me';
  }
  
  console.log('Opening URL:', urlToOpen);
  
  // Handle the click event
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      
      // Check if there's already a window/tab open with the target URL
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        const clientUrl = new URL(client.url);
        const targetUrl = new URL(urlToOpen, self.location.origin);
        
        if (clientUrl.origin === targetUrl.origin) {
          // Focus existing window and navigate to the target URL
          return client.focus().then(() => {
            if (client.url !== targetUrl.href) {
              return client.navigate(targetUrl.href);
            }
          });
        }
      }
      
      // No suitable window found, open a new one
      return clients.openWindow(urlToOpen);
    }).catch(error => {
      console.error('Failed to handle notification click:', error);
      
      // Fallback: just open the main page
      return clients.openWindow('/');
    })
  );
});

/**
 * Handle notification close events
 */
self.addEventListener('notificationclose', function(event) {
  console.log('Notification closed:', event);
  
  const notification = event.notification;
  const data = notification.data || {};
  
  // Optional: Send analytics about notification dismissal
  if (data.trackDismissal) {
    event.waitUntil(
      fetch('/api/notifications/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'dismissed',
          notificationTag: notification.tag,
          timestamp: Date.now()
        })
      }).catch(error => {
        console.log('Failed to track notification dismissal:', error);
      })
    );
  }
});

/**
 * Handle push subscription changes
 */
self.addEventListener('pushsubscriptionchange', function(event) {
  console.log('Push subscription changed:', event);
  
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: getVapidPublicKey()
    }).then(function(newSubscription) {
      console.log('New push subscription:', newSubscription);
      
      // Send the new subscription to the server
      return fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: getUserId(), // This would need to be stored/retrieved somehow
          deviceId: getDeviceId(),
          subscription: newSubscription.toJSON()
        })
      });
    }).catch(error => {
      console.error('Failed to resubscribe:', error);
    })
  );
});

/**
 * Handle service worker installation
 */
self.addEventListener('install', function(event) {
  console.log('Push service worker installing');
  
  event.waitUntil(
    caches.open(NOTIFICATION_CACHE).then(function(cache) {
      // Pre-cache any necessary resources
      return cache.addAll([
        '/icon-192.png',
        '/icons/action-view.png',
        '/icons/action-dismiss.png'
      ]);
    })
  );
  
  // Skip waiting to activate immediately
  self.skipWaiting();
});

/**
 * Handle service worker activation
 */
self.addEventListener('activate', function(event) {
  console.log('Push service worker activating');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(function(cacheNames) {
        return Promise.all(
          cacheNames.map(function(cacheName) {
            if (cacheName.startsWith('melo-notifications-') && cacheName !== NOTIFICATION_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Claim all clients
      self.clients.claim()
    ])
  );
});

/**
 * Utility functions
 */

function generateNotificationId() {
  return 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function getVapidPublicKey() {
  // This should match your VAPID public key from environment variables
  // This will be injected by the build process or passed from the main thread
  return self.vapidPublicKey || 'BLGcGIBl3GFfUa-UXBvJA4zhHekLDAcm3J5ELJn-v5a1GyoJOe5IDso9jWyvaUxqkuuln2ZxhenH4a1KmcYCYiw';
}

function getUserId() {
  // In a real implementation, this would be retrieved from IndexedDB or passed from main thread
  return 'current-user-id';
}

function getDeviceId() {
  // Generate or retrieve device ID
  return 'device-' + (self.navigator.userAgent || 'unknown').slice(0, 20).replace(/[^a-zA-Z0-9]/g, '');
}

/**
 * Handle messages from the main thread
 */
self.addEventListener('message', function(event) {
  console.log('Service worker received message:', event.data);
  
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SET_USER_INFO':
      // Store user information for push subscription management
      self.userInfo = payload;
      break;
      
    case 'SHOW_TEST_NOTIFICATION':
      // Show test notification
      self.registration.showNotification('Test Notification', {
        body: 'Push notifications are working correctly!',
        icon: '/icon-192.png',
        tag: 'test-notification'
      });
      break;
      
    case 'GET_NOTIFICATION_PERMISSION':
      // Check current notification permission
      event.ports[0].postMessage({
        permission: Notification.permission
      });
      break;
      
    default:
      console.log('Unknown message type:', type);
  }
});

console.log('Push service worker loaded successfully');