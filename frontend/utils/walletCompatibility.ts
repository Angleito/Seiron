/**
 * Wallet Compatibility Utilities
 * Provides compatibility checking for wallet/chain combinations
 * and implements fallback mechanisms for unsupported scenarios
 */

import { Chain } from 'viem'
import { logger } from '@lib/logger'

// ============================================================================
// Types
// ============================================================================

export type WalletType = 
  | 'metamask'
  | 'walletconnect'
  | 'injected'
  | 'coinbase'
  | 'embedded'
  | 'unknown'

export type WalletConnectorType = 
  | 'injected'
  | 'wallet_connect'
  | 'coinbase_wallet'
  | 'embedded'
  | 'metamask'

export interface WalletCompatibilityInfo {
  walletType: WalletType
  chainId: number
  isSupported: boolean
  isRecommended: boolean
  fallbackWallet?: WalletType
  issues: string[]
  recommendedAction?: string
}

export interface ChainCompatibilityInfo {
  chainId: number
  chainName: string
  supportedWallets: WalletType[]
  unsupportedWallets: WalletType[]
  recommendedWallets: WalletType[]
  issues: Record<WalletType, string[]>
}

// ============================================================================
// Constants
// ============================================================================

// Known wallet/chain compatibility issues
const WALLET_CHAIN_COMPATIBILITY: Record<number, {
  supported: WalletType[]
  unsupported: WalletType[]
  recommended: WalletType[]
  issues: Record<WalletType, string[]>
}> = {
  // Sei Network (1329)
  1329: {
    supported: ['metamask', 'walletconnect', 'injected'],
    unsupported: ['coinbase', 'embedded'],
    recommended: ['metamask', 'walletconnect'],
    issues: {
      coinbase: [
        'Coinbase Smart Wallet does not support Sei Network (chain ID 1329)',
        'This wallet is not compatible with custom chains like Sei Network',
        'Use MetaMask or WalletConnect instead for full compatibility'
      ],
      embedded: [
        'Embedded wallets may have limited support for Sei Network',
        'Consider using MetaMask for better compatibility'
      ],
      unknown: [],
      metamask: [],
      walletconnect: [],
      injected: []
    }
  },
  // Ethereum Mainnet (1) - for reference
  1: {
    supported: ['metamask', 'walletconnect', 'injected', 'coinbase', 'embedded'],
    unsupported: [],
    recommended: ['metamask', 'coinbase', 'walletconnect'],
    issues: {
      unknown: [],
      metamask: [],
      walletconnect: [],
      injected: [],
      coinbase: [],
      embedded: []
    }
  }
}

// Wallet display names for user-facing messages
const WALLET_DISPLAY_NAMES: Record<WalletType, string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  injected: 'Browser Wallet',
  coinbase: 'Coinbase Smart Wallet',
  embedded: 'Embedded Wallet',
  unknown: 'Unknown Wallet'
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Detect wallet type from connector type or other identifiers
 */
export const detectWalletType = (
  connectorType?: string,
  walletClientType?: string,
  walletName?: string
): WalletType => {
  // Normalize inputs
  const connector = connectorType?.toLowerCase() || ''
  const client = walletClientType?.toLowerCase() || ''
  const name = walletName?.toLowerCase() || ''

  // Check for MetaMask
  if (
    connector.includes('metamask') ||
    client.includes('metamask') ||
    name.includes('metamask')
  ) {
    return 'metamask'
  }

  // Check for Coinbase
  if (
    connector.includes('coinbase') ||
    client.includes('coinbase') ||
    name.includes('coinbase')
  ) {
    return 'coinbase'
  }

  // Check for WalletConnect
  if (
    connector.includes('walletconnect') ||
    connector.includes('wallet_connect') ||
    client.includes('walletconnect') ||
    name.includes('walletconnect')
  ) {
    return 'walletconnect'
  }

  // Check for embedded wallet
  if (
    connector.includes('embedded') ||
    client.includes('embedded') ||
    name.includes('embedded')
  ) {
    return 'embedded'
  }

  // Check for injected wallet
  if (
    connector.includes('injected') ||
    client.includes('injected')
  ) {
    return 'injected'
  }

  return 'unknown'
}

/**
 * Check if a wallet is compatible with a specific chain
 */
export const isWalletChainCompatible = (
  walletType: WalletType,
  chainId: number
): boolean => {
  const chainInfo = WALLET_CHAIN_COMPATIBILITY[chainId]
  if (!chainInfo) {
    logger.warn(`No compatibility info for chain ${chainId}`)
    return true // Default to compatible if no info available
  }

  return chainInfo.supported.includes(walletType)
}

/**
 * Get comprehensive compatibility information for a wallet/chain combination
 */
export const getWalletCompatibilityInfo = (
  walletType: WalletType,
  chainId: number
): WalletCompatibilityInfo => {
  const chainInfo = WALLET_CHAIN_COMPATIBILITY[chainId]
  
  if (!chainInfo) {
    return {
      walletType,
      chainId,
      isSupported: true,
      isRecommended: false,
      issues: [`Unknown compatibility for chain ${chainId}`],
    }
  }

  const isSupported = chainInfo.supported.includes(walletType)
  const isRecommended = chainInfo.recommended.includes(walletType)
  const issues = chainInfo.issues[walletType] || []

  // Find fallback wallet if this one is not supported
  let fallbackWallet: WalletType | undefined
  if (!isSupported) {
    fallbackWallet = chainInfo.recommended[0] || chainInfo.supported[0]
  }

  // Generate recommended action
  let recommendedAction: string | undefined
  if (!isSupported && fallbackWallet) {
    recommendedAction = `Switch to ${WALLET_DISPLAY_NAMES[fallbackWallet]} for better compatibility`
  } else if (!isRecommended && isSupported) {
    const recommended = chainInfo.recommended[0]
    if (recommended) {
      recommendedAction = `Consider using ${WALLET_DISPLAY_NAMES[recommended]} for optimal experience`
    }
  }

  return {
    walletType,
    chainId,
    isSupported,
    isRecommended,
    fallbackWallet,
    issues,
    recommendedAction,
  }
}

/**
 * Get comprehensive chain compatibility information
 */
export const getChainCompatibilityInfo = (chainId: number): ChainCompatibilityInfo => {
  const chainInfo = WALLET_CHAIN_COMPATIBILITY[chainId]
  
  // Get chain name from known chains
  let chainName = 'Unknown Chain'
  if (chainId === 1329) {
    chainName = 'Sei Network'
  } else if (chainId === 1) {
    chainName = 'Ethereum Mainnet'
  }

  if (!chainInfo) {
    return {
      chainId,
      chainName,
      supportedWallets: [],
      unsupportedWallets: [],
      recommendedWallets: [],
      issues: {
        unknown: [],
        metamask: [],
        walletconnect: [],
        injected: [],
        coinbase: [],
        embedded: []
      },
    }
  }

  return {
    chainId,
    chainName,
    supportedWallets: chainInfo.supported,
    unsupportedWallets: chainInfo.unsupported,
    recommendedWallets: chainInfo.recommended,
    issues: chainInfo.issues,
  }
}

/**
 * Filter supported wallets for a specific chain
 */
export const getSupportedWalletsForChain = (chainId: number): WalletType[] => {
  const chainInfo = WALLET_CHAIN_COMPATIBILITY[chainId]
  return chainInfo?.supported || []
}

/**
 * Filter unsupported wallets for a specific chain
 */
export const getUnsupportedWalletsForChain = (chainId: number): WalletType[] => {
  const chainInfo = WALLET_CHAIN_COMPATIBILITY[chainId]
  return chainInfo?.unsupported || []
}

/**
 * Get recommended wallets for a specific chain
 */
export const getRecommendedWalletsForChain = (chainId: number): WalletType[] => {
  const chainInfo = WALLET_CHAIN_COMPATIBILITY[chainId]
  return chainInfo?.recommended || []
}

/**
 * Check if a wallet should be excluded from wallet lists for a chain
 */
export const shouldExcludeWalletForChain = (
  walletType: WalletType,
  chainId: number
): boolean => {
  const chainInfo = WALLET_CHAIN_COMPATIBILITY[chainId]
  return chainInfo?.unsupported.includes(walletType) || false
}

// ============================================================================
// Privy-specific Utilities
// ============================================================================

/**
 * Generate Privy wallet list excluding unsupported wallets for a chain
 */
export const getPrivyWalletListForChain = (chainId: number): string[] => {
  const unsupportedWallets = getUnsupportedWalletsForChain(chainId)
  const baseWallets = ['metamask', 'walletconnect', 'injected']
  
  // Explicitly exclude all variants of Coinbase wallet
  const excludedWallets = ['coinbase_smart_wallet', 'coinbase_wallet', 'coinbase']
  
  return baseWallets.filter(wallet => {
    const walletType = wallet as WalletType
    return !unsupportedWallets.includes(walletType) && !excludedWallets.includes(wallet)
  })
}

/**
 * Generate Privy login methods excluding unsupported options
 */
export const getPrivyLoginMethodsForChain = (chainId: number): string[] => {
  const unsupportedWallets = getUnsupportedWalletsForChain(chainId)
  const baseLoginMethods = ['email', 'wallet', 'google', 'discord', 'twitter']
  
  // If embedded wallets are unsupported, exclude email login
  if (unsupportedWallets.includes('embedded')) {
    return baseLoginMethods.filter(method => method !== 'email')
  }
  
  return baseLoginMethods
}

/**
 * Check if embedded wallets should be disabled for a chain
 */
export const shouldDisableEmbeddedWalletsForChain = (chainId: number): boolean => {
  const unsupportedWallets = getUnsupportedWalletsForChain(chainId)
  return unsupportedWallets.includes('embedded')
}

// ============================================================================
// Validation and Runtime Checks
// ============================================================================

/**
 * Validate wallet compatibility at runtime
 */
export const validateWalletCompatibility = (
  walletType: WalletType,
  chainId: number,
  throwOnError = false
): boolean => {
  const compatibilityInfo = getWalletCompatibilityInfo(walletType, chainId)
  
  if (!compatibilityInfo.isSupported) {
    const error = `Wallet ${WALLET_DISPLAY_NAMES[walletType]} is not supported on chain ${chainId}`
    
    if (throwOnError) {
      throw new Error(error)
    }
    
    logger.warn(error, {
      walletType,
      chainId,
      issues: compatibilityInfo.issues,
      fallbackWallet: compatibilityInfo.fallbackWallet,
    })
    
    return false
  }
  
  if (!compatibilityInfo.isRecommended) {
    logger.info(`Wallet ${WALLET_DISPLAY_NAMES[walletType]} is supported but not recommended for chain ${chainId}`, {
      walletType,
      chainId,
      recommendedAction: compatibilityInfo.recommendedAction,
    })
  }
  
  return true
}

/**
 * Get user-friendly error message for wallet compatibility issues
 */
export const getCompatibilityErrorMessage = (
  walletType: WalletType,
  chainId: number
): string | null => {
  const compatibilityInfo = getWalletCompatibilityInfo(walletType, chainId)
  
  if (!compatibilityInfo.isSupported) {
    const walletName = WALLET_DISPLAY_NAMES[walletType]
    const chainName = chainId === 1329 ? 'Sei Network' : `Chain ${chainId}`
    
    let message = `${walletName} is not supported on ${chainName}.`
    
    if (compatibilityInfo.fallbackWallet) {
      const fallbackName = WALLET_DISPLAY_NAMES[compatibilityInfo.fallbackWallet]
      message += ` Please use ${fallbackName} instead.`
    }
    
    return message
  }
  
  return null
}

// ============================================================================
// Export all utilities
// ============================================================================

export const walletCompatibility = {
  detectWalletType,
  isWalletChainCompatible,
  getWalletCompatibilityInfo,
  getChainCompatibilityInfo,
  getSupportedWalletsForChain,
  getUnsupportedWalletsForChain,
  getRecommendedWalletsForChain,
  shouldExcludeWalletForChain,
  getPrivyWalletListForChain,
  getPrivyLoginMethodsForChain,
  shouldDisableEmbeddedWalletsForChain,
  validateWalletCompatibility,
  getCompatibilityErrorMessage,
} as const

export type WalletCompatibilityType = keyof typeof walletCompatibility