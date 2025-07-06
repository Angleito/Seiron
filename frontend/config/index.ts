/**
 * Central configuration export with safe fallbacks
 * This ensures configs are always defined even if environment variables are missing
 */

import { logger } from '@lib/logger'

// Safe import with error handling
let privyConfig: any
let wagmiConfig: any

try {
  const privyModule = await import('./privy')
  privyConfig = privyModule.privyConfig
} catch (error) {
  logger.error('Failed to import privy config:', error)
  // Provide minimal fallback config
  privyConfig = {
    appId: '',
    clientId: '',
    config: {
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
  }
}

try {
  const wagmiModule = await import('./wagmi')
  wagmiConfig = wagmiModule.wagmiConfig
} catch (error) {
  logger.error('Failed to import wagmi config:', error)
  // The app will likely fail without wagmi config, but at least we won't crash on undefined.config
  wagmiConfig = null
}

export { privyConfig, wagmiConfig }

// Export type-safe getters
export const getPrivyConfig = () => {
  if (!privyConfig) {
    throw new Error('Privy config not initialized')
  }
  return privyConfig
}

export const getWagmiConfig = () => {
  if (!wagmiConfig) {
    throw new Error('Wagmi config not initialized')
  }
  return wagmiConfig
}

// Safe config accessors
export const safePrivyConfig = {
  get appId() {
    return privyConfig?.appId || import.meta.env.VITE_PRIVY_APP_ID || ''
  },
  get config() {
    return privyConfig?.config || {
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
  }
}