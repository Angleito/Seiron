'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PrivyProvider } from '@privy-io/react-auth'
import { WagmiProvider, createConfig } from '@privy-io/wagmi'
import { http } from 'viem'
import { privyConfig, seiMainnet } from '@config/privy'
import { wagmiConfig } from '@config/wagmi'
// Removed dragon interaction provider after component cleanup
import { WalletProvider } from '../contexts/WalletContext'
import { WalletConnectProvider } from './wallet/WalletConnectProvider'
import { RootErrorBoundary } from '@components/error-boundaries'
import { logger } from '@lib/logger'
import { 
  validateWalletCompatibility, 
  getCompatibilityErrorMessage,
  type WalletType
} from '@utils/walletCompatibility'

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

// Use the enhanced wagmi config with wallet compatibility checks
// (imported from @config/wagmi)

// Enhanced error boundary for wallet compatibility issues
function WalletCompatibilityErrorBoundary({
  children,
}: {
  children: React.ReactNode
}) {
  // This could be enhanced to catch wallet compatibility errors
  return <RootErrorBoundary>{children}</RootErrorBoundary>
}

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
    <WalletCompatibilityErrorBoundary>
      <WalletConnectProvider>
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
      </WalletConnectProvider>
    </WalletCompatibilityErrorBoundary>
  )
}

// ============================================================================
// Wallet Compatibility Validation Hook
// ============================================================================

/**
 * Hook to validate wallet compatibility in React components
 * This can be used by wallet components to check compatibility
 */
export const useWalletCompatibility = () => {
  const validateWallet = (walletType: WalletType, chainId: number = seiMainnet.id) => {
    const isCompatible = validateWalletCompatibility(walletType, chainId)
    const errorMessage = getCompatibilityErrorMessage(walletType, chainId)
    
    if (!isCompatible && errorMessage) {
      logger.warn(`Wallet compatibility issue: ${errorMessage}`, {
        walletType,
        chainId,
        errorMessage,
      })
    }
    
    return {
      isCompatible,
      errorMessage,
    }
  }

  return { validateWallet }
}