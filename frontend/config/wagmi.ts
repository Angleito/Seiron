import { createConfig, http } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { injected, metaMask, walletConnect } from 'wagmi/connectors'
import { 
  getSupportedWalletsForChain, 
  validateWalletCompatibility, 
  type WalletType 
} from '../utils/walletCompatibility'

// WalletConnect configuration
const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID

// Debug WalletConnect configuration
console.log('🔗 WalletConnect configuration:')
console.log('- Project ID present:', !!walletConnectProjectId)
console.log('- Environment:', import.meta.env.MODE)

// Sei Network configuration
export const seiMainnet = {
  id: 1329,
  name: 'Sei Network',
  network: 'sei',
  nativeCurrency: {
    decimals: 18,
    name: 'SEI',
    symbol: 'SEI',
  },
  rpcUrls: {
    default: { http: ['https://evm-rpc.sei-apis.com'] },
    public: { http: ['https://evm-rpc.sei-apis.com'] },
  },
  blockExplorers: {
    default: { name: 'SeiScan', url: 'https://seitrace.com' },
  },
} as const

// Get supported wallets for Sei Network
const seiSupportedWallets = getSupportedWalletsForChain(seiMainnet.id)
console.log('🔗 Supported wallets for Sei Network:', seiSupportedWallets)

// Create connectors with proper WalletConnect configuration and compatibility checks
const connectors = []

// Add MetaMask connector if supported
if (seiSupportedWallets.includes('metamask')) {
  connectors.push(metaMask())
  console.log('✅ MetaMask connector added (supported on Sei Network)')
} else {
  console.warn('⚠️ MetaMask not supported on Sei Network, skipping connector')
}

// Add injected connector if supported
if (seiSupportedWallets.includes('injected')) {
  connectors.push(injected())
  console.log('✅ Injected connector added (supported on Sei Network)')
} else {
  console.warn('⚠️ Injected wallets not supported on Sei Network, skipping connector')
}

// Add WalletConnect connector if supported and project ID is provided
if (seiSupportedWallets.includes('walletconnect')) {
  if (walletConnectProjectId) {
    connectors.push(
      walletConnect({
        projectId: walletConnectProjectId,
        metadata: {
          name: 'Seiron',
          description: 'Seiron Dragon - DeFi Portfolio Management',
          url: 'https://seiron.vercel.app',
          icons: ['https://seiron.vercel.app/favicon.ico'],
        },
        showQrModal: true,
      })
    )
    console.log('✅ WalletConnect connector added (supported on Sei Network)')
  } else {
    console.warn('⚠️ VITE_WALLETCONNECT_PROJECT_ID not found, WalletConnect will not be available')
  }
} else {
  console.warn('⚠️ WalletConnect not supported on Sei Network, skipping connector')
}

// Validate final connector configuration
console.log('🔗 Final connector configuration:')
console.log('- Total connectors:', connectors.length)
console.log('- Connector types:', connectors.map(c => c.name))

// Ensure we have at least one connector
if (connectors.length === 0) {
  console.error('❌ No supported wallet connectors available for Sei Network')
  // Add fallback injected connector as last resort
  connectors.push(injected())
  console.log('🔄 Added fallback injected connector')
}

export const wagmiConfig = createConfig({
  chains: [seiMainnet, mainnet],
  connectors,
  transports: {
    [seiMainnet.id]: http(),
    [mainnet.id]: http(),
  },
})

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate wallet compatibility for a specific chain
 * @param walletType - The type of wallet to validate
 * @param chainId - The chain ID to validate against
 * @returns boolean indicating if the wallet is compatible
 */
export const validateWalletForChain = (walletType: WalletType, chainId: number): boolean => {
  return validateWalletCompatibility(walletType, chainId)
}

/**
 * Get supported wallets for a specific chain
 * @param chainId - The chain ID to get supported wallets for
 * @returns Array of supported wallet types
 */
export const getSupportedWallets = (chainId: number): WalletType[] => {
  return getSupportedWalletsForChain(chainId)
}

/**
 * Check if a chain is supported by the current wagmi configuration
 * @param chainId - The chain ID to check
 * @returns boolean indicating if the chain is supported
 */
export const isChainSupported = (chainId: number): boolean => {
  return wagmiConfig.chains.some(chain => chain.id === chainId)
}

// ============================================================================
// Chain-specific exports
// ============================================================================

export const seiNetworkSupportedWallets = getSupportedWalletsForChain(seiMainnet.id)
export const mainnetSupportedWallets = getSupportedWalletsForChain(1)

// Log final configuration
console.log('🔗 Wagmi Configuration Summary:')
console.log('- Chains:', wagmiConfig.chains.map(c => `${c.name} (${c.id})`))
console.log('- Connectors:', connectors.map(c => c.name))
console.log('- Sei Network supported wallets:', seiNetworkSupportedWallets)
console.log('- Ethereum supported wallets:', mainnetSupportedWallets)