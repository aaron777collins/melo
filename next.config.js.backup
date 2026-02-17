const withPWA = require('next-pwa')({
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

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // serverActions is stable in Next.js 14, no longer experimental
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Security headers configuration
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          // Note: CSP and other dynamic headers are handled in middleware.ts
          // to support environment-specific configurations
        ]
      }
    ];
  },
  webpack: (config, { dev, isServer }) => {
    config.externals.push({
      "utf-8-validate": "commonjs utf-8-validate",
      bufferutil: "commonjs bufferutil",
      // LiveKit server SDK should be server-only external
      "livekit-server-sdk": "commonjs livekit-server-sdk",
      // web-push is Node.js only (uses net, tls modules)
      "web-push": "commonjs web-push"
    });

    // Fix matrix-js-sdk multiple entrypoints during SSG
    if (!dev && isServer) {
      config.externals.push({
        "matrix-js-sdk": "commonjs matrix-js-sdk"
      });
    }

    // Bundle optimization configurations
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
            matrix: {
              test: /[\\/]node_modules[\\/](matrix-js-sdk)[\\/]/,
              name: 'matrix',
              chunks: 'all',
              priority: 10,
            },
            livekit: {
              test: /[\\/]node_modules[\\/](@livekit|livekit-)[\\/]/,
              name: 'livekit',
              chunks: 'all',
              priority: 10,
            },
            ui: {
              test: /[\\/]node_modules[\\/](@radix-ui)[\\/]/,
              name: 'ui',
              chunks: 'all',
              priority: 5,
            },
          },
        },
        usedExports: true,
        providedExports: true,
        sideEffects: false,
      };
    }

    return config;
  },
  images: {
    domains: ["uploadthing.com"]
  },
  swcMinify: true, // Enable SWC minification for better performance
  poweredByHeader: false, // Remove X-Powered-By header
  compress: true, // Enable gzip compression
  productionBrowserSourceMaps: false, // Disable source maps in production
};

module.exports = withPWA(withBundleAnalyzer(nextConfig));
