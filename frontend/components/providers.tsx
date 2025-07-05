'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PrivyProvider } from '@privy-io/react-auth'
import { WagmiProvider, createConfig } from '@privy-io/wagmi'
import { http } from 'viem'
import { privyConfig, seiMainnet } from '@/config/privy'
import { DragonInteractionProvider } from '@/components/dragon/DragonInteractionController'
import { WalletProvider } from '@/contexts/WalletContext'

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
  // Check if Privy app ID is valid
  const isValidAppId = privyConfig.appId && privyConfig.appId.length > 0 && privyConfig.appId !== 'your_privy_app_id_here';
  
  if (!isValidAppId) {
    console.error('Invalid or missing Privy App ID. Please set NEXT_PUBLIC_PRIVY_APP_ID in your .env file');
    return (
      <QueryClientProvider client={queryClient}>
        <div style={{ padding: '20px', color: 'red' }}>
          <h2>Configuration Error</h2>
          <p>Privy App ID is missing or invalid. Please set NEXT_PUBLIC_PRIVY_APP_ID in your .env file</p>
          <p>Current value: {privyConfig.appId || '(empty)'}</p>
        </div>
      </QueryClientProvider>
    );
  }

  return (
    <PrivyProvider
      appId={privyConfig.appId}
      clientId={privyConfig.clientId}
      config={privyConfig.config}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <WalletProvider>
            <DragonInteractionProvider>
              {children}
            </DragonInteractionProvider>
          </WalletProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  )
}