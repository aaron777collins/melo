/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ["uploadthing.com"]
  },
  webpack: (config, { dev, isServer, webpack }) => {
    console.log(`\n=== WEBPACK CONFIG START ===`);
    console.log(`Dev: ${dev}, Server: ${isServer}`);
    console.log(`Entry points:`, Object.keys(config.entry || {}));
    console.log(`Externals:`, config.externals);
    
    // Add progress plugin for detailed logging
    config.plugins.push(
      new webpack.ProgressPlugin({
        activeModules: true,
        entries: true,
        modules: true,
        modulesCount: 5000,
        profile: true,
        dependencies: true,
        dependenciesCount: 10000,
        percentBy: 'entries'
      })
    );
    
    // Add timing information
    const ProgressBar = require('progress');
    const chalk = require('chalk');
    
    // Simplified externals for matrix-js-sdk only
    if (!dev && isServer) {
      console.log('Adding matrix-js-sdk external for SERVER build');
      config.externals.push('matrix-js-sdk');
    }
    
    console.log(`=== WEBPACK CONFIG END ===\n`);
    return config;
  },
};

module.exports = nextConfig;