/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false, net: false, tls: false, path: false,
        os: false, child_process: false, crypto: false,
        stream: false,
        buffer: require.resolve('buffer/'),
        events: require.resolve('events/'),
        process: require.resolve('process/browser'),
      };
      const webpack = require('webpack');
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        })
      );
    }
    return config;
  },
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  transpilePackages: ['telegram'],
  experimental: { optimizeCss: false },
};
module.exports = nextConfig;
