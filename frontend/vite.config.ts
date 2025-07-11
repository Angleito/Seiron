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
            // Separate Lit-related libraries into their own chunk
            'lit-vendor': ['lit', '@lit/reactive-element', 'lit-element', 'lit-html'],
            // WalletConnect and related UI libraries
            'wallet-vendor': ['@reown/appkit', '@reown/appkit-ui', '@reown/appkit-scaffold-ui', '@walletconnect/modal', '@walletconnect/modal-ui']
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