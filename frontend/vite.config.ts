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
      // Configure MIME types for model files
      configure: (app: any) => {
        app.use((req: any, res: any, next: any) => {
          if (req.url?.endsWith('.glb')) {
            res.setHeader('Content-Type', 'model/gltf-binary')
          } else if (req.url?.endsWith('.gltf')) {
            res.setHeader('Content-Type', 'model/gltf+json')
          } else if (req.url?.endsWith('.obj')) {
            res.setHeader('Content-Type', 'model/obj')
          } else if (req.url?.endsWith('.bin')) {
            res.setHeader('Content-Type', 'application/octet-stream')
          }
          next()
        })
      },
    },
    build: {
      target: 'esnext',
      sourcemap: !isProduction,
      assetsDir: 'assets',
      rollupOptions: {
        output: {
          assetFileNames: (assetInfo) => {
            // Keep models in their original directory structure
            if (assetInfo.name && (assetInfo.name.endsWith('.glb') || assetInfo.name.endsWith('.gltf') || assetInfo.name.endsWith('.bin'))) {
              return 'models/[name][extname]'
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