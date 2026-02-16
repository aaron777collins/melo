const CACHE_NAME = 'haos-v1';
const STATIC_CACHE = 'haos-static-v1';
const RUNTIME_CACHE = 'haos-runtime-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/favicon.ico',
  '/_next/static/css/app/layout.css',
  '/_next/static/css/app/globals.css'
];

// Runtime caching strategies
const RUNTIME_PATTERNS = [
  // Cache API routes with network-first strategy
  {
    urlPattern: /^https:\/\/.*\/api\//,
    handler: 'NetworkFirst',
    options: {
      cacheName: 'api-cache',
      expiration: {
        maxEntries: 50,
        maxAgeSeconds: 300 // 5 minutes
      }
    }
  },
  // Cache static assets with cache-first strategy
  {
    urlPattern: /\.(?:png|jpg|jpeg|svg|gif|ico|webp)$/,
    handler: 'CacheFirst',
    options: {
      cacheName: 'images-cache',
      expiration: {
        maxEntries: 100,
        maxAgeSeconds: 86400 // 24 hours
      }
    }
  },
  // Cache JS/CSS with stale-while-revalidate
  {
    urlPattern: /\.(?:js|css)$/,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'assets-cache',
      expiration: {
        maxEntries: 100,
        maxAgeSeconds: 86400 // 24 hours
      }
    }
  }
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[ServiceWorker] Pre-caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== RUNTIME_CACHE) {
              console.log('[ServiceWorker] Removing old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests
  if (url.origin !== location.origin) return;

  // Skip Matrix SDK WebSocket connections
  if (url.pathname.includes('/_matrix/client/') && request.headers.get('upgrade') === 'websocket') {
    return;
  }

  event.respondWith(handleFetch(event));
});

async function handleFetch(event) {
  const { request } = event;
  const url = new URL(request.url);

  try {
    // Try network first for navigation requests
    if (request.mode === 'navigate') {
      try {
        const response = await fetch(request);
        
        // Cache successful navigation responses
        if (response.ok) {
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, response.clone());
        }
        
        return response;
      } catch (error) {
        // Network failed, try cache then fallback to offline page
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Return offline page for navigation requests
        const offlineResponse = await caches.match('/offline');
        if (offlineResponse) {
          return offlineResponse;
        }
        
        // Fallback response if no offline page cached
        return new Response(
          `<!DOCTYPE html>
          <html>
            <head>
              <title>HAOS - Offline</title>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { font-family: system-ui; text-align: center; padding: 50px; background: #313338; color: white; }
                h1 { color: #5865f2; }
              </style>
            </head>
            <body>
              <h1>HAOS</h1>
              <p>You are offline. Please check your internet connection and try again.</p>
            </body>
          </html>`,
          { headers: { 'Content-Type': 'text/html' } }
        );
      }
    }

    // For non-navigation requests, implement caching strategies
    for (const pattern of RUNTIME_PATTERNS) {
      if (pattern.urlPattern.test(url.href) || pattern.urlPattern.test(url.pathname)) {
        return implementCacheStrategy(request, pattern.handler, pattern.options);
      }
    }

    // Default: try network first, fallback to cache
    try {
      const response = await fetch(request);
      
      // Cache successful responses
      if (response.ok) {
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, response.clone());
      }
      
      return response;
    } catch (error) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      throw error;
    }
    
  } catch (error) {
    console.log('[ServiceWorker] Fetch failed:', error);
    
    // For navigation requests, return offline page
    if (request.mode === 'navigate') {
      const offlineResponse = await caches.match('/offline');
      if (offlineResponse) {
        return offlineResponse;
      }
    }
    
    throw error;
  }
}

async function implementCacheStrategy(request, strategy, options = {}) {
  const cacheName = options.cacheName || RUNTIME_CACHE;
  
  switch (strategy) {
    case 'CacheFirst':
      return cacheFirst(request, cacheName, options);
    case 'NetworkFirst':
      return networkFirst(request, cacheName, options);
    case 'StaleWhileRevalidate':
      return staleWhileRevalidate(request, cacheName, options);
    default:
      return fetch(request);
  }
}

async function cacheFirst(request, cacheName, options) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  
  return response;
}

async function networkFirst(request, cacheName, options) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

async function staleWhileRevalidate(request, cacheName, options) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      const cache = caches.open(cacheName);
      cache.then((c) => c.put(request, response.clone()));
    }
    return response;
  });
  
  return cachedResponse || fetchPromise;
}

// Handle background sync events (for future offline capability)
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Future: implement background sync for Matrix messages
  console.log('[ServiceWorker] Background sync completed');
}