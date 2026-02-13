const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  output: "standalone",
  webpack: (config, { dev, isServer }) => {
    config.externals.push({
      "utf-8-validate": "commonjs utf-8-validate",
      bufferutil: "commonjs bufferutil"
    });

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

module.exports = withBundleAnalyzer(nextConfig);
