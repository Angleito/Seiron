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
        // Ensure buffer is not externalized
        exclude: [],
        // Force include buffer polyfill
        protocolImports: true,
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
        // Explicit buffer alias for better compatibility
        buffer: 'buffer',
      },
      dedupe: ['react', 'react-dom'],
      // Ensure proper resolution of ESM modules
      conditions: ['import', 'module', 'browser', 'default'],
    },
    server: {
      host: '0.0.0.0',        // listen on all interfaces for LAN access
      port: 3000,
      strictPort: true,
      // Remove explicit origin to let Vite handle module resolution properly
      hmr: {
        protocol: 'ws',
        port: 3000,
        // Remove explicit host to prevent module resolution issues
      },
      // Handle SPA routing - always serve index.html for any route
      middlewareMode: false,
      // Cache-busting headers for development
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    },
    optimizeDeps: {
      esbuildOptions: {
        target: 'esnext',
      },
      force: isDevelopment, // Force rebuild in development to prevent cache issues
      include: [
        'buffer',
        'react',
        'react-dom',
        '@privy-io/react-auth',
        '@tanstack/react-query',
        'wagmi',
        'viem',
        '@walletconnect/modal',
        '@web3modal/wagmi'
      ],
      exclude: [
        // Exclude problematic dependencies that cause chunk loading issues
      ]
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
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            // Voice components - separate chunk to prevent conflicts
            'voice-components': [
              './hooks/voice/useSpeechRecognition',
              './hooks/voice/useSecureElevenLabsTTS'
            ]
          }
        }
      }
    },
    define: {
      global: 'globalThis',
      // Ensure Buffer is available globally and prevent externalization
      'global.Buffer': 'globalThis.Buffer',
      'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
      // Prevent Buffer externalization in browser
      '__VITE_IS_MODERN__': true,
      // Make Buffer available as window.Buffer
      'window.Buffer': 'globalThis.Buffer',
    },
  }
})