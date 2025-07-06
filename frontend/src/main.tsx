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
      <PrivyProvider appId={privyConfig.appId} config={privyConfig.config}>
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