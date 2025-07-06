/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Add fallbacks for Node.js modules that don't exist in the browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
      stream: false,
      url: false,
      zlib: false,
      http: false,
      https: false,
      assert: false,
      os: false,
      path: false,
      querystring: false,
      util: false,
      buffer: false,
      events: false,
      process: false,
    };

    // Handle ES modules from node_modules
    config.module.rules.push({
      test: /\.m?js$/,
      type: 'javascript/auto',
      resolve: {
        fullySpecified: false,
      },
    });

    return config;
  },
  
  // Transpile packages that need to be processed by Next.js
  transpilePackages: [
    '@wagmi/core',
    '@wagmi/connectors',
    'wagmi',
    '@rainbow-me/rainbowkit',
    'viem',
    '@tanstack/query-core',
    '@tanstack/react-query',
  ],

  // Enable experimental features for better Web3 support
  experimental: {
    esmExternals: 'loose',
  },

  // Optimize images and handle external domains if needed
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
