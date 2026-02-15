/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.module.rules.push({
      test: /\.css$/,
      use: ['style-loader', 'css-loader'],
      include: /highlight\.js\/styles/,
    });
    
    return config;
  },
  // Other configurations can remain the same
};

export default nextConfig;