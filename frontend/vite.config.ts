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
          'dragon-animations': [
            'components/dragon/EnhancedDragonCharacter',
            'components/dragon/InteractiveDragon',
            'components/dragon/DragonShowcase',
            'components/dragon/DragonInteractionController',
            'components/dragon/EnhancedDragonInteractionSystem',
            'components/DragonAnimationShowcase',
            'components/EnhancedDragonAnimation',
            'components/DragonAnimationDemo',
            'components/DragonBallOrbitalSystem',
            'components/OptimizedDragonBallOrbital',
            'components/CirclingDragonBalls',
            'components/OptimizedCirclingDragonBalls'
          ],
          
          'voice-features': [
            'components/voice/VoiceInterface',
            'components/voice/VoiceInterfaceExample',
            'hooks/voice/useSpeechRecognition',
            'hooks/voice/useElevenLabsTTS'
          ],
          
          'performance-monitoring': [
            'hooks/useAnimationPerformance',
            'hooks/usePerformanceMonitor',
            'hooks/useOrbitalPerformance',
            'components/AnimationPerformanceDebugger'
          ],
          
          'ui-components': [
            'components/ui/LoadingSpinner',
            'components/ui/Button',
            'components/ui/Card',
            'components/ui/Modal'
          ],
          
          'chat-features': [
            'components/chat/ChatInterface',
            'components/chat/ChatMessage',
            'components/chat/VoiceEnabledChat'
          ],
          
          'portfolio-features': [
            'components/portfolio/PortfolioOverview',
            'components/portfolio/PortfolioAnalytics',
            'components/portfolio/PortfolioChart'
          ]
        },
        
        // Optimize chunk names for better caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace(/\.[^/.]+$/, '')
            : 'chunk'
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
        drop_console: true,
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
    exclude: [
      // Exclude heavy packages that should be lazy-loaded
      'components/dragon/EnhancedDragonCharacter',
      'components/dragon/InteractiveDragon',
      'components/voice/VoiceInterface',
      'hooks/voice/useSpeechRecognition',
      'hooks/voice/useElevenLabsTTS',
      'hooks/useAnimationPerformance',
      'hooks/usePerformanceMonitor',
      'hooks/useOrbitalPerformance'
    ],
  },
})