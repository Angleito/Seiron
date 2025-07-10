import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PrivyProvider } from '@privy-io/react-auth'
import { WagmiProvider } from 'wagmi'
import { Analytics } from '@vercel/analytics/next'
import { router } from '../router'
import SimpleHomePage from './pages/SimpleHomePage'
import HomePage3D from './pages/HomePage3D'
import { RootErrorBoundary } from '../components/error-boundaries/RootErrorBoundary'
import { privyConfig } from '../config/privy'
import { wagmiConfig } from '../config/wagmi'
// Simplified imports for quick dragon display
import '../styles/globals.css'

// Debug logging for app initialization
console.log('🚀 Seiron App Initializing...')
console.log('Environment:', import.meta.env.MODE)
console.log('Privy App ID available:', !!import.meta.env.VITE_PRIVY_APP_ID)
console.log('Root element:', document.getElementById('root'))

// Add immediate visual feedback
const debugDiv = document.createElement('div')
debugDiv.style.cssText = 'position: fixed; top: 50px; left: 0; width: 300px; padding: 10px; background: blue; color: white; z-index: 99999;'
debugDiv.innerHTML = 'React Main.tsx loaded!'
document.body.appendChild(debugDiv)

// Extract Privy configuration
const appId = privyConfig.appId || import.meta.env.VITE_PRIVY_APP_ID || ''
const safePrivyConfig = privyConfig.config

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      throwOnError: false, // Let error boundaries handle errors
    },
    mutations: {
      throwOnError: false,
    },
  },
})

// Simplified for quick dragon display

// Wrap the app rendering in try-catch for better error handling
try {
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error('Root element not found')
  }

  console.log('🏗️ Creating React root...')
  const root = ReactDOM.createRoot(rootElement)
  
  console.log('🎨 Rendering app...')
  
  // Add debug info to root element
  rootElement.style.border = '5px solid cyan'
  rootElement.innerHTML = '<div style="background: white; color: black; padding: 20px;">React mounting...</div>'
  
  // Render full app with router for all environments
  root.render(
    <React.StrictMode>
      <RootErrorBoundary>
        <PrivyProvider 
          appId={appId} 
          config={safePrivyConfig}>
          <QueryClientProvider client={queryClient}>
            <WagmiProvider config={wagmiConfig}>
              <RouterProvider router={router} />
            </WagmiProvider>
          </QueryClientProvider>
        </PrivyProvider>
      </RootErrorBoundary>
      <Analytics />
    </React.StrictMode>
  )
  
  console.log('✅ App render complete')
} catch (error) {
  console.error('❌ Failed to render app:', error)
  
  // Fallback: render a simple error message
  const rootElement = document.getElementById('root')
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; color: #fff; background: #000; font-family: monospace;">
        <h1>🐉 Seiron Loading Error</h1>
        <p>App failed to initialize. Check console for details.</p>
        <pre>${error}</pre>
      </div>
    `
  }
}