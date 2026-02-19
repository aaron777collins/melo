const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // Use our custom service worker alongside the PWA service worker
  sw: 'sw.js',
  // Add our push service worker as an additional worker
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif|ico|webp)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 86400, // 24 hours
        },
      },
    },
    {
      urlPattern: /^https:\/\/.*\/_next\/static\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-resources',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 86400,
        },
      },
    },
    {
      urlPattern: /^https:\/\/.*\/api\/notifications\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'notifications-api',
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 300, // 5 minutes
        },
        networkTimeoutSeconds: 5,
      },
    },
    {
      urlPattern: /^https:\/\/.*\/api\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 300, // 5 minutes
        },
        networkTimeoutSeconds: 10,
      },
    },
    {
      urlPattern: /^https:\/\/.*\/_matrix\/client\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'matrix-api-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 600, // 10 minutes
        },
        networkTimeoutSeconds: 15,
      },
    },
  ],
  buildExcludes: [/middleware-manifest\.json$/],
  fallbacks: {
    document: '/offline',
  },
  workboxOptions: {
    // Import our push service worker functionality
    importScripts: ['/push-sw.js'],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { dev, isServer }) => {
    // Externalize server-only dependencies
    config.externals.push({
      "utf-8-validate": "commonjs utf-8-validate",
      "bufferutil": "commonjs bufferutil",
      "web-push": "commonjs web-push", // Server-only for push notifications
      "livekit-server-sdk": "commonjs livekit-server-sdk",
    });

    // Optimize matrix-js-sdk for client-side
    if (!dev && isServer) {
      config.externals.push({
        "matrix-js-sdk": "commonjs matrix-js-sdk"
      });
    }

    return config;
  },
  images: {
    domains: ["uploadthing.com"]
  },
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
};

module.exports = withPWA(nextConfig);