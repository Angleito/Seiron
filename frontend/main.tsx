import './polyfills'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PrivyProvider } from '@privy-io/react-auth'
import { WagmiProvider } from '@privy-io/wagmi'
import { Analytics } from '@vercel/analytics/react'
import { router } from './router'
// import HomePage3D from './src/pages/HomePage3D'
import { RootErrorBoundary } from './components/error-boundaries/RootErrorBoundary'
import { WalletConnectProvider } from './components/wallet/WalletConnectProvider'
import { privyConfig } from './config/privy'
import { wagmiConfig } from './config/wagmi'
import { initializeEnvironmentValidation } from './utils/envValidation'
import { initializeApp } from './utils/appInitializer'
import './styles/globals.css'

// Debug logging for app initialization
console.log('🚀 Seiron App Initializing...')
console.log('Environment:', process.env.NODE_ENV)
console.log('Base URL:', process.env.NEXT_PUBLIC_BASE_URL || '/')
console.log('Dev mode:', process.env.NODE_ENV === 'development')
console.log('Prod mode:', process.env.NODE_ENV === 'production')

// Initialize environment validation
initializeEnvironmentValidation()

// Initialize app (async initialization)
initializeApp().then(result => {
  if (result.success) {
    console.log('✅ App initialized successfully')
    if (result.warnings.length > 0) {
      console.warn('⚠️ Configuration warnings:', result.warnings)
    }
  } else {
    console.error('❌ App initialization failed:', result.errors)
  }
})


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

// Global app state for cleanup
let appRoot: ReactDOM.Root | null = null
let isMounted = false

// Enhanced rendering logic with router and provider support
async function renderApp() {
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error('Root element not found')
  }

  // Prevent double mounting in development
  if (isMounted) {
    console.log('⚠️ App already mounted, skipping render')
    return
  }

  // Note: WalletConnect removed - using only MetaMask and injected wallets
  // to prevent double initialization and ensure proper component lifecycle

  console.log('🏗️ Creating React root...')
  const root = ReactDOM.createRoot(rootElement)
  appRoot = root
  isMounted = true
  
  // Check if we have authentication configuration
  const hasPrivyConfig = !!privyConfig.appId
  const useFullAuth = hasPrivyConfig
  
  console.log('🔍 App configuration check:')
  console.log('- Has Privy config:', hasPrivyConfig)
  console.log('- Production mode:', process.env.NODE_ENV === 'production')
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
            <WalletConnectProvider>
              <QueryClientProvider client={queryClient}>
                <WagmiProvider config={wagmiConfig}>
                  <RouterProvider router={router} />
                  <Analytics />
                </WagmiProvider>
              </QueryClientProvider>
            </WalletConnectProvider>
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
            <Analytics />
          </QueryClientProvider>
        </RootErrorBoundary>
      </React.StrictMode>
    )
  }

  // Set up cleanup for development hot reload
  // Note: Next.js uses different hot reload mechanism
  
  console.log('✅ App render complete')
}

// Cleanup function for development
function cleanup() {
  if (appRoot) {
    console.log('🧹 Unmounting React app...')
    appRoot.unmount()
    appRoot = null
  }
  isMounted = false
}

// Handle page unload cleanup
window.addEventListener('beforeunload', cleanup)

// Main execution with comprehensive error handling
try {
  renderApp().catch(error => {
    console.error('❌ Async app initialization failed:', error)
    // Fall back to synchronous render without WalletConnect
    renderAppSync()
  })
} catch (error) {
  console.error('❌ Failed to render app:', error)
  renderAppSync()
}

// Synchronous fallback render function
function renderAppSync() {
  try {
    console.log('🔄 Attempting synchronous render...')
    const rootElement = document.getElementById('root')
    if (!rootElement) {
      throw new Error('Root element not found')
    }

    // Simple fallback without WalletConnect initialization
    const root = ReactDOM.createRoot(rootElement)
    const hasPrivyConfig = !!privyConfig.appId
    
    if (hasPrivyConfig) {
      root.render(
        <React.StrictMode>
          <RootErrorBoundary>
            <PrivyProvider 
              appId={privyConfig.appId} 
              config={privyConfig.config}>
              <WalletConnectProvider>
                <QueryClientProvider client={queryClient}>
                  <WagmiProvider config={wagmiConfig}>
                    <RouterProvider router={router} />
                  </WagmiProvider>
                </QueryClientProvider>
              </WalletConnectProvider>
            </PrivyProvider>
          </RootErrorBoundary>
        </React.StrictMode>
      )
    } else {
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
    
    console.log('✅ Synchronous render complete')
  } catch (syncError) {
    console.error('❌ Synchronous render also failed:', syncError)
    renderUltimateFallback()
  }
}

// Ultimate fallback with static HTML
function renderUltimateFallback(error?: Error) {
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