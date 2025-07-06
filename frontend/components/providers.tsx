'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PrivyProvider } from '@privy-io/react-auth'
import { WagmiProvider, createConfig } from '@privy-io/wagmi'
import { http } from 'viem'
import { privyConfig, seiMainnet } from '@config/privy'
// Removed dragon interaction provider after component cleanup
import { WalletProvider } from '../contexts/WalletContext'
import { RootErrorBoundary } from '@components/error-boundaries'
import { logger } from '@lib/logger'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      throwOnError: false, // Let error boundaries handle errors
    },
    mutations: {
      throwOnError: false,
    },
  },
})

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
  // Add defensive checks
  if (!privyConfig) {
    logger.error('privyConfig is undefined');
    return (
      <RootErrorBoundary>
        <div style={{ padding: '20px', color: 'red' }}>
          <h2>Configuration Error</h2>
          <p>privyConfig is undefined. Check your imports and build configuration.</p>
        </div>
      </RootErrorBoundary>
    );
  }

  // Check if Privy app ID is valid
  const isValidAppId = privyConfig.appId && privyConfig.appId.length > 0 && privyConfig.appId !== 'your_privy_app_id_here';
  
  if (!isValidAppId) {
    logger.error('Invalid or missing Privy App ID. Please set VITE_PRIVY_APP_ID in your .env file');
    return (
      <RootErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <div style={{ padding: '20px', color: 'red' }}>
            <h2>Configuration Error</h2>
            <p>Privy App ID is missing or invalid. Please set VITE_PRIVY_APP_ID in your .env file</p>
            <p>Current value: {privyConfig.appId || '(empty)'}</p>
          </div>
        </QueryClientProvider>
      </RootErrorBoundary>
    );
  }

  // Create safe config with fallbacks
  const safePrivyConfig = privyConfig.config || {
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

  return (
    <RootErrorBoundary>
      <PrivyProvider
        appId={privyConfig.appId}
        config={safePrivyConfig}
      >
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={wagmiConfig}>
            <WalletProvider>
              {children}
            </WalletProvider>
          </WagmiProvider>
        </QueryClientProvider>
      </PrivyProvider>
    </RootErrorBoundary>
  )
}