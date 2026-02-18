/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable all optimizations to speed up build
  swcMinify: false,
  experimental: {
    // Disable static page generation
    output: 'standalone',
  },
  images: {
    unoptimized: true,
    domains: ["uploadthing.com"]
  },
  // Add verbose logging
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
    }
    if (!dev && isServer) {
    }
    
    // Completely externalize matrix-js-sdk
    config.externals.push({
      'matrix-js-sdk': 'matrix-js-sdk',
      '@livekit/components-react': '@livekit/components-react',
      'livekit-client': 'livekit-client',
      'livekit-server-sdk': 'livekit-server-sdk',
      'web-push': 'web-push',
    });
    
    return config;
  },
};

module.exports = nextConfig;