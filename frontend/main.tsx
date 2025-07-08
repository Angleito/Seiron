import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PrivyProvider } from '@privy-io/react-auth'
import { WagmiProvider } from 'wagmi'
import { router } from './router'
import HomePage3D from './src/pages/HomePage3D'
import { RootErrorBoundary } from './components/error-boundaries/RootErrorBoundary'
import { privyConfig } from './config/privy'
import { wagmiConfig } from './config/wagmi'
import './styles/globals.css'

// Debug logging for app initialization
console.log('🚀 Seiron App Initializing...')
console.log('Environment:', import.meta.env.MODE)
console.log('Base URL:', import.meta.env.BASE_URL)
console.log('Dev mode:', import.meta.env.DEV)
console.log('Prod mode:', import.meta.env.PROD)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      throwOnError: false,
    },
    mutations: {
      throwOnError: false,
    },
  },
})

// Enhanced rendering logic with router and provider support
function renderApp() {
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error('Root element not found')
  }

  console.log('🏗️ Creating React root...')
  const root = ReactDOM.createRoot(rootElement)
  
  // Check if we have authentication configuration
  const hasPrivyConfig = !!privyConfig.appId
  const useFullAuth = hasPrivyConfig
  
  console.log('🔍 App configuration check:')
  console.log('- Has Privy config:', hasPrivyConfig)
  console.log('- Production mode:', import.meta.env.PROD)
  console.log('- Will use authentication:', useFullAuth)

  if (useFullAuth) {
    console.log('🎨 Rendering full app with authentication and routing...')
    // Full app with authentication and routing
    root.render(
      <React.StrictMode>
        <RootErrorBoundary>
          <PrivyProvider 
            appId={privyConfig.appId} 
            config={privyConfig.config}>
            <QueryClientProvider client={queryClient}>
              <WagmiProvider config={wagmiConfig}>
                <RouterProvider router={router} />
              </WagmiProvider>
            </QueryClientProvider>
          </PrivyProvider>
        </RootErrorBoundary>
      </React.StrictMode>
    )
  } else {
    console.log('🎨 Rendering app with routing but without authentication...')
    // App with routing but no authentication (fallback mode)
    root.render(
      <React.StrictMode>
        <RootErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </RootErrorBoundary>
      </React.StrictMode>
    )
  }
  
  console.log('✅ App render complete')
}

// Main execution with comprehensive error handling
try {
  renderApp()
} catch (error) {
  console.error('❌ Failed to render app:', error)
  
  // Ultimate fallback: render a simple error message directly
  const rootElement = document.getElementById('root')
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="
        padding: 40px; 
        color: #ffffff; 
        background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%);
        font-family: 'Arial', sans-serif;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
      ">
        <div style="
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          padding: 32px;
          max-width: 600px;
          backdrop-filter: blur(10px);
        ">
          <h1 style="
            font-size: 2.5rem;
            margin-bottom: 16px;
            background: linear-gradient(45deg, #ff6b35, #f7931e);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
          ">🐉 Seiron Dragon</h1>
          <p style="
            font-size: 1.2rem;
            margin-bottom: 24px;
            color: #cccccc;
          ">App is awakening from its slumber...</p>
          <div style="
            background: rgba(255, 0, 0, 0.1);
            border: 1px solid rgba(255, 0, 0, 0.3);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 24px;
          ">
            <p style="color: #ff6b6b; font-weight: bold;">⚠️ Initialization Error</p>
            <p style="color: #ffcccc; font-size: 0.9rem; margin-top: 8px;">
              The dragon encountered an error during startup. Please check the console for details.
            </p>
          </div>
          <button onclick="location.reload()" style="
            background: linear-gradient(45deg, #ff6b35, #f7931e);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 1rem;
            cursor: pointer;
            transition: transform 0.2s;
          " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            🔄 Retry Awakening
          </button>
          <details style="margin-top: 24px; text-align: left;">
            <summary style="color: #aaaaaa; cursor: pointer;">🔍 Technical Details</summary>
            <pre style="
              background: rgba(0, 0, 0, 0.5);
              padding: 12px;
              border-radius: 4px;
              font-size: 0.8rem;
              color: #ffcccc;
              overflow-x: auto;
              margin-top: 12px;
            ">${error?.toString() || 'Unknown error'}</pre>
          </details>
        </div>
      </div>
    `
  }
}