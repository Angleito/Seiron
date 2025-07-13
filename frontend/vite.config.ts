import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'
  const isDevelopment = mode === 'development'
  
  return {
    plugins: [react()],
    publicDir: 'public',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
        '@components': path.resolve(__dirname, './components'),
        '@hooks': path.resolve(__dirname, './hooks'),
        '@lib': path.resolve(__dirname, './lib'),
        '@types': path.resolve(__dirname, './types'),
        '@utils': path.resolve(__dirname, './utils'),
        '@config': path.resolve(__dirname, './config'),
        '@features': path.resolve(__dirname, './features'),
        '@pages': path.resolve(__dirname, './pages'),
      },
    },
    server: {
      port: 3000,
      host: true,
      // Handle SPA routing - always serve index.html for any route
      middlewareMode: false,
      // Configure headers for model files
      headers: {
        'Cache-Control': 'public, max-age=31536000', // 1 year cache for static assets
      },
      // Configure CORS and MIME types for model files
      configure: (app: any) => {
        // CORS middleware for model files
        app.use((req: any, res: any, next: any) => {
          const origin = req.headers.origin || '*'
          
          // Set CORS headers for all requests
          res.setHeader('Access-Control-Allow-Origin', origin)
          res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Accept, Accept-Encoding, Authorization, Cache-Control, X-Requested-With')
          res.setHeader('Access-Control-Allow-Credentials', 'true')
          res.setHeader('Access-Control-Max-Age', '86400') // 24 hours
          
          // Handle preflight OPTIONS requests
          if (req.method === 'OPTIONS') {
            res.status(200).end()
            return
          }
          
          // Set appropriate MIME types for model files
          if (req.url?.endsWith('.glb')) {
            res.setHeader('Content-Type', 'model/gltf-binary')
            res.setHeader('Accept-Ranges', 'bytes')
          } else if (req.url?.endsWith('.gltf')) {
            res.setHeader('Content-Type', 'model/gltf+json')
            res.setHeader('Accept-Ranges', 'bytes')
          } else if (req.url?.endsWith('.obj')) {
            res.setHeader('Content-Type', 'model/obj')
            res.setHeader('Accept-Ranges', 'bytes')
          } else if (req.url?.endsWith('.bin')) {
            res.setHeader('Content-Type', 'application/octet-stream')
            res.setHeader('Accept-Ranges', 'bytes')
          }
          
          next()
        })
        
        // Static file serving middleware for models
        app.use('/models', (req: any, res: any, next: any) => {
          // Ensure model files are served with proper headers
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
          res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none')
          
          // Add specific headers for Three.js model loading
          if (req.url.includes('.gltf') || req.url.includes('.glb') || req.url.includes('.bin')) {
            res.setHeader('X-Content-Type-Options', 'nosniff')
            res.setHeader('Referrer-Policy', 'no-referrer')
          }
          
          next()
        })
      },
    },
    build: {
      target: 'esnext',
      sourcemap: !isProduction,
      assetsDir: 'assets',
      // Ensure model files are copied to output directory
      copyPublicDir: true,
      rollupOptions: {
        // Don't try to process model files through Rollup
        external: [
          // Don't bundle large model files - let them be copied as static assets
          /.*\.glb$/,
          /.*\.gltf$/,
          /.*\.bin$/,
          /.*\.obj$/
        ],
        output: {
          assetFileNames: (assetInfo) => {
            // Preserve model directory structure during build
            if (assetInfo.name && (assetInfo.name.endsWith('.glb') || assetInfo.name.endsWith('.gltf') || assetInfo.name.endsWith('.bin'))) {
              return 'models/[name][extname]'
            }
            // Preserve texture directory structure
            if (assetInfo.name && assetInfo.name.includes('Material.')) {
              return 'models/textures/[name][extname]'
            }
            return 'assets/[name]-[hash][extname]'
          },
          manualChunks: {
            // Separate Three.js and 3D rendering libraries
            'threejs-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
            // Animation and UI libraries  
            'ui-vendor': ['framer-motion'],
            // React and core libraries
            'react-vendor': ['react', 'react-dom', 'react-router-dom']
          }
        }
      },
      // Optimize for model files
      optimizeDeps: {
        exclude: ['three'], // Let Three.js handle model loading
        force: true, // Force re-optimization to fix missing chunks
        include: [
          '@privy-io/react-auth',
          '@tanstack/react-query',
          'wagmi',
          'viem',
          '@walletconnect/modal',
          '@web3modal/wagmi'
        ]
      }
    },
    define: {
      global: 'globalThis',
      // Force Lit to production mode
      'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
      // Lit-specific development mode flag
      'globalThis.litIsInDevelopmentMode': JSON.stringify(isDevelopment),
      // Additional Lit configuration
      'globalThis.litElementVersions': JSON.stringify([]),
    },
  }
})