// HAOS Push Notification Service Worker
// This handles background push notifications and user interactions

console.log('HAOS Service Worker loaded');

self.addEventListener('push', function(event) {
  console.log('Push event received:', event);
  
  if (!event.data) {
    console.log('Push event has no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('Push data:', data);
    
    const notification = data.notification;
    
    if (!notification) {
      console.log('No notification data in push event');
      return;
    }
    
    event.waitUntil(
      self.registration.showNotification(notification.title, {
        body: notification.body,
        icon: notification.icon || '/icons/haos-logo-192.png',
        badge: notification.badge || '/icons/haos-badge-72.png',
        tag: notification.tag,
        data: notification.data,
        actions: notification.actions,
        requireInteraction: notification.requireInteraction || false,
        silent: notification.silent || false,
        timestamp: notification.timestamp || Date.now(),
        vibrate: notification.vibrate || [200, 100, 200]
      })
    );
    
    console.log('Notification displayed:', notification.title);
  } catch (error) {
    console.error('Error handling push event:', error);
  }
});

self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event.notification.tag, event.action);
  
  event.notification.close();

  const data = event.notification.data;
  const action = event.action;

  if (action === 'dismiss') {
    console.log('Notification dismissed');
    return; // Just close the notification
  }

  // Handle view action or notification click
  if (data && data.url) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clients) {
        console.log('Looking for existing clients:', clients.length);
        
        // Try to focus existing window
        for (let client of clients) {
          if (client.url.includes(window.location.origin) && 'focus' in client) {
            console.log('Focusing existing client');
            return client.focus();
          }
        }
        
        // Open new window
        if (clients.openWindow) {
          const targetUrl = data.url.startsWith('http') ? data.url : window.location.origin + data.url;
          console.log('Opening new window:', targetUrl);
          return clients.openWindow(targetUrl);
        }
      }).catch(error => {
        console.error('Error handling notification click:', error);
      })
    );
  } else {
    // Default: try to focus the app
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clients) {
        if (clients.length > 0 && 'focus' in clients[0]) {
          return clients[0].focus();
        } else if (clients.openWindow) {
          return clients.openWindow('/');
        }
      }).catch(error => {
        console.error('Error focusing app:', error);
      })
    );
  }
});

self.addEventListener('notificationclose', function(event) {
  console.log('Notification closed:', event.notification.tag);
  // Track notification dismissal analytics if needed
});

// Handle service worker installation
self.addEventListener('install', function(event) {
  console.log('HAOS Service Worker installing');
  self.skipWaiting();
});

// Handle service worker activation
self.addEventListener('activate', function(event) {
  console.log('HAOS Service Worker activating');
  event.waitUntil(self.clients.claim());
});