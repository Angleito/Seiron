'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PrivyProvider } from '@privy-io/react-auth'
import { WagmiProvider, createConfig } from '@privy-io/wagmi'
import { http } from 'viem'
import { privyConfig, seiMainnet } from '@/config/privy'

const queryClient = new QueryClient()

// Create wagmi config for Privy
const wagmiConfig = createConfig({
  chains: [seiMainnet],
  transports: {
    [seiMainnet.id]: http(),
  },
})

export function Providers({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PrivyProvider
      appId={privyConfig.appId}
      clientId={privyConfig.clientId}
      config={privyConfig.config}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  )
}