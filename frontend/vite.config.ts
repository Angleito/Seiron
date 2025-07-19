import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'
  const isDevelopment = mode === 'development'
  
  return {
    plugins: [
      react(),
      nodePolyfills({
        // Enable specific polyfills
        include: ['buffer', 'process', 'util'],
        // Whether to polyfill globals
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
      }),
      // Custom API plugin for development
      // API routes are handled by Vercel in production
    ].filter(Boolean),
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
      dedupe: ['react', 'react-dom'],
      // Ensure proper resolution of ESM modules
      conditions: ['import', 'module', 'browser', 'default'],
    },
    server: {
      port: 3000,
      host: true,
      // Enable HMR with WebSocket configuration
      hmr: {
        port: 3000,
        protocol: 'ws',
        host: 'localhost',
      },
      // Handle SPA routing - always serve index.html for any route
      middlewareMode: false,
    },
    build: {
      target: 'esnext',
      sourcemap: !isProduction,
      assetsDir: 'assets',
      copyPublicDir: true,
      minify: isProduction ? 'terser' : false,
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
        mangle: {
          // Preserve important function names
          keep_fnames: /^(time|timeEnd|performance|logger)/,
          reserved: ['time', 'timeEnd', 'performance', 'logger']
        },
      } : undefined,
      rollupOptions: {
        output: {
          manualChunks: {
            // Animation and UI libraries  
            'ui-vendor': ['framer-motion'],
            // React and core libraries
            'react-vendor': ['react', 'react-dom', 'react-router-dom']
          }
        }
      },
      optimizeDeps: {
        esbuildOptions: {
          target: 'esnext',
        },
        force: true,
        include: [
          'react',
          'react-dom',
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
      // Ensure Buffer is available globally
      'global.Buffer': 'Buffer',
      // Force Lit to production mode
      'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
      // Lit-specific development mode flag
      'globalThis.litIsInDevelopmentMode': JSON.stringify(isDevelopment),
      // Additional Lit configuration
      'globalThis.litElementVersions': JSON.stringify([]),
    },
  }
})