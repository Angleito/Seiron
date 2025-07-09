import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
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
  },
  build: {
    target: 'esnext',
    sourcemap: false,
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          // Keep models in their original directory structure
          if (assetInfo.name && (assetInfo.name.endsWith('.glb') || assetInfo.name.endsWith('.gltf') || assetInfo.name.endsWith('.bin'))) {
            return 'models/[name][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    }
  },
  define: {
    global: 'globalThis',
  },
})