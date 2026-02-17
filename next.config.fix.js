const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
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
    // Fix Node.js module resolution errors by adding comprehensive externals
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "net": false,
        "tls": false,
        "crypto": false,
        "stream": false,
        "os": false,
        "path": false,
        "fs": false,
        "buffer": false,
        "util": false,
      };
    }

    // Externalize server-only dependencies
    config.externals.push({
      "utf-8-validate": "commonjs utf-8-validate",
      bufferutil: "commonjs bufferutil",
      "web-push": "commonjs web-push",
      "livekit-server-sdk": "commonjs livekit-server-sdk",
    });

    // Externalize matrix-js-sdk for SSG to prevent hanging
    if (!dev && isServer) {
      config.externals.push("matrix-js-sdk");
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