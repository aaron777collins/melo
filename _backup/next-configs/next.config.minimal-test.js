/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { dev, isServer }) => {
    // Basic Node.js fallbacks
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

    // Externalize problematic dependencies
    if (!dev) {
      config.externals.push(/^matrix-js-sdk($|\/.*)/);
      config.externals.push({
        "utf-8-validate": "commonjs utf-8-validate",
        bufferutil: "commonjs bufferutil",
        "web-push": "commonjs web-push",
        "livekit-server-sdk": "commonjs livekit-server-sdk",
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

module.exports = nextConfig;