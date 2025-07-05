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
        server.middlewares.use('/', (req, res, next) => {
          // Add security headers for development
          res.setHeader('X-Content-Type-Options', 'nosniff')
          res.setHeader('X-Frame-Options', 'DENY')
          res.setHeader('X-XSS-Protection', '1; mode=block')
          res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
          next()
        })
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './components'),
      '@hooks': path.resolve(__dirname, './hooks'),
      '@lib': path.resolve(__dirname, './lib'),
      '@types': path.resolve(__dirname, './types'),
      '@utils': path.resolve(__dirname, './utils'),
      '@config': path.resolve(__dirname, './config'),
      '@features': path.resolve(__dirname, './features'),
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
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'web3-vendor': ['wagmi', 'viem', '@privy-io/react-auth', '@privy-io/wagmi'],
          'animation-vendor': ['framer-motion'],
          'utils-vendor': ['fp-ts', 'rxjs', 'clsx', 'tailwind-merge'],
        },
      },
    },
    sourcemap: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
})