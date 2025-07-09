/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static file serving for 3D models
  experimental: {
    serverComponentsExternalPackages: ['three'],
  },
  
  // Configure headers for 3D model files
  async headers() {
    return [
      {
        source: '/models/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=43200',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
      {
        source: '/models/*.gltf',
        headers: [
          {
            key: 'Content-Type',
            value: 'model/gltf+json',
          },
        ],
      },
      {
        source: '/models/*.glb',
        headers: [
          {
            key: 'Content-Type',
            value: 'model/gltf-binary',
          },
        ],
      },
      {
        source: '/models/*.bin',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/octet-stream',
          },
        ],
      },
    ];
  },
  
  // Configure webpack for 3D models
  webpack: (config, { isServer }) => {
    // Handle GLTF and GLB files
    config.module.rules.push({
      test: /\.(gltf|glb)$/,
      use: 'url-loader',
    });
    
    return config;
  },
  
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['three', '@react-three/fiber', '@react-three/drei'],
  },
};

module.exports = nextConfig;
