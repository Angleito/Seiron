import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PrivyProvider } from '@privy-io/react-auth'
import { WagmiProvider } from 'wagmi'
import { Analytics } from '@vercel/analytics/react'
import { router } from '../router'
import { wagmiConfig } from '@config/wagmi'
import { privyConfig } from '@config/privy'
import { RootErrorBoundary } from '@components/error-boundaries'
import '@/styles/globals.css'

// Add defensive checks for configs
if (!privyConfig) {
  console.error('privyConfig is undefined')
}
if (!privyConfig?.config) {
  console.error('privyConfig.config is undefined')
}
if (!wagmiConfig) {
  console.error('wagmiConfig is undefined')
}

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

// Create safe config with fallbacks
const safePrivyConfig = privyConfig?.config || {
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
}

const appId = privyConfig?.appId || import.meta.env.VITE_PRIVY_APP_ID || ''

// Only render if we have required configs
if (!appId) {
  console.error('Privy App ID is missing. Please set VITE_PRIVY_APP_ID environment variable.')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <PrivyProvider appId={appId} config={safePrivyConfig}>
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={wagmiConfig}>
            <RouterProvider router={router} />
            <Analytics />
          </WagmiProvider>
        </QueryClientProvider>
      </PrivyProvider>
    </RootErrorBoundary>
  </React.StrictMode>
)