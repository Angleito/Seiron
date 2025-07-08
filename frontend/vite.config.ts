import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // CSP compliance plugin
    {
      name: 'csp-headers',
      configureServer(server) {
        server.middlewares.use('/', (_req, res, next) => {
          // Add security headers for development
          res.setHeader('X-Content-Type-Options', 'nosniff')
          res.setHeader('X-Frame-Options', 'DENY')
          res.setHeader('X-XSS-Protection', '1; mode=block')
          res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
          
          // Development CSP that allows localhost connections and Vite HMR
          res.setHeader('Content-Security-Policy', `
            default-src 'self';
            script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval';
            style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
            img-src 'self' data: blob: https:;
            font-src 'self' data: https://fonts.gstatic.com;
            connect-src 'self' https: wss: ws: blob: data: http://localhost:8000 ws://localhost:8000 https://api.web3modal.org https://explorer-api.walletconnect.com https://pulse.walletconnect.org https://rawcdn.githack.com;
            media-src 'self';
            object-src 'none';
            base-uri 'self';
            form-action 'self';
            frame-src 'self' https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org;
          `.replace(/\s+/g, ' ').trim())
          
          next()
        })
      }
    }
  ],
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
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'web3-vendor': ['wagmi', 'viem', '@privy-io/react-auth', '@privy-io/wagmi'],
          'animation-vendor': ['framer-motion'],
          'utils-vendor': ['fp-ts', 'rxjs', 'clsx', 'tailwind-merge'],
          
          // Feature-specific chunks for lazy loading
          'dragon-3d': ['three', '@react-three/fiber', '@react-three/drei'],
        },
        
        // Optimize chunk names for better caching
        chunkFileNames: (_chunkInfo) => {
          return `js/[name]-[hash].js`
        },
        
        // Optimize asset names
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name?.split('.').pop()
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType || '')) {
            return `images/[name]-[hash][extname]`
          }
          if (/css/i.test(extType || '')) {
            return `css/[name]-[hash][extname]`
          }
          return `assets/[name]-[hash][extname]`
        },
      },
    },
    
    // Optimize build performance
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
      },
    },
    
    // Chunk size optimizations
    chunkSizeWarningLimit: 1000,
    
    sourcemap: true,
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom',
      'react-router-dom',
      'framer-motion',
      'fp-ts',
      'rxjs'
    ],
  },
  define: {
    global: 'globalThis',
    // Support for process.env in browser
    'process.env': JSON.stringify({
      NODE_ENV: process.env.NODE_ENV || 'development',
      NEXT_PUBLIC_ELEVENLABS_API_KEY: process.env.VITE_ELEVENLABS_API_KEY || process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '',
      NEXT_PUBLIC_ELEVENLABS_VOICE_ID: process.env.VITE_ELEVENLABS_VOICE_ID || process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || 'default',
      NEXT_PUBLIC_VOICE_ENABLED: process.env.VITE_VOICE_ENABLED || process.env.NEXT_PUBLIC_VOICE_ENABLED || 'true',
    }),
  },
})