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
import '@/styles/globals.css'

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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <PrivyProvider 
        appId={privyConfig.appId} 
        config={{
          appearance: privyConfig.config.appearance,
          loginMethods: privyConfig.config.loginMethods,
          walletConnectProjectId: privyConfig.config.walletConnectProjectId,
          embeddedWallets: privyConfig.config.embeddedWallets,
          defaultChain: privyConfig.config.defaultChain,
          supportedChains: privyConfig.config.supportedChains,
        }}>
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={wagmiConfig}>
            <RouterProvider router={router} />
          </WagmiProvider>
        </QueryClientProvider>
      </PrivyProvider>
    </RootErrorBoundary>
  </React.StrictMode>
)