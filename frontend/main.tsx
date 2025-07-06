import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PrivyProvider } from '@privy-io/react-auth'
import { WagmiProvider } from 'wagmi'
import { router } from './router'
import { wagmiConfig } from '@config/wagmi'
import { privyConfig } from '@config/privy'
import { RootErrorBoundary } from '@components/error-boundaries'
import { initializeSecurity, getSecurityDiagnostics } from '@lib/security'
import { logger } from '@lib/logger'
import './styles/globals.css'

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

// Initialize security subsystem
initializeSecurity({
  enableEncryption: true,
  cleanupOnStart: true,
  validateStoredData: true,
  logSecurityEvents: true
}).then((result) => {
  if (result._tag === 'Left') {
    logger.error('Failed to initialize security subsystem:', result.left)
  } else {
    logger.info('Security subsystem initialized successfully')
    
    // Run diagnostics in development
    if (import.meta.env.DEV) {
      const diagnostics = getSecurityDiagnostics()
      logger.info('Security diagnostics:', diagnostics)
    }
  }
}).catch((error) => {
  logger.error('Security initialization error:', error)
})

// Add defensive checks
if (!privyConfig) {
  console.error('privyConfig is undefined');
}
if (!privyConfig?.config) {
  console.error('privyConfig.config is undefined');
}

// Create safe config with fallbacks
const safePrivyConfig = privyConfig?.config ? {
  appearance: privyConfig.config.appearance,
  loginMethods: privyConfig.config.loginMethods,
  embeddedWallets: privyConfig.config.embeddedWallets,
  defaultChain: privyConfig.config.defaultChain,
  supportedChains: privyConfig.config.supportedChains,
} : {
  appearance: {
    theme: 'dark' as const,
    accentColor: '#ef4444' as const,
    showWalletLoginFirst: true,
  },
  loginMethods: ['email', 'wallet'] as ('email' | 'wallet')[],
  embeddedWallets: {
    createOnLogin: 'users-without-wallets' as const,
    requireUserPasswordOnCreate: true,
    noPromptOnSignature: false,
  },
};

const appId = privyConfig?.appId || import.meta.env.VITE_PRIVY_APP_ID || '';

ReactDOM.createRoot(document.getElementById('root')!).render(
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
  </React.StrictMode>
)