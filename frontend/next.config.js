/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Disable development indicators (including Turbopack icon)
  devIndicators: false,

  // API proxy configuration
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        // In Docker, backend is accessed via service name
        destination: 'http://backend:8000/api/:path*',
      },
    ];
  },

  // Development server configuration
  webpack: (config, { isServer, dev }) => {
    if (dev) {
      // Required for hot-reloading in Docker
      config.watchOptions = {
        poll: 1000, // Check for changes every second
        aggregateTimeout: 300, // Delay before rebuilding
      };
    }
    return config;
  },
};

module.exports = nextConfig;
