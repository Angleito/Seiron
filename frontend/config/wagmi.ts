import { createConfig, http } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { injected, metaMask, walletConnect } from 'wagmi/connectors'
import { 
  getSupportedWalletsForChain, 
  validateWalletCompatibility, 
  type WalletType 
} from '../utils/walletCompatibility'
import { envConfig } from '../utils/envValidation'

// WalletConnect configuration using environment validation
const walletConnectProjectId = envConfig.walletConnectProjectId

// Debug WalletConnect configuration
console.log('🔗 WalletConnect configuration:')
console.log('- Project ID present:', !!walletConnectProjectId)
console.log('- Project ID valid:', walletConnectProjectId && !walletConnectProjectId.includes('your_'))
console.log('- Configuration valid:', envConfig.isValid.walletConnect)
console.log('- Environment:', import.meta.env.MODE)

// Log configuration guidance
if (!envConfig.isValid.walletConnect) {
  console.log('ℹ️ To enable WalletConnect:')
  console.log('1. Go to https://cloud.walletconnect.com/')
  console.log('2. Create a new project')
  console.log('3. Copy your project ID')
  console.log('4. Set VITE_WALLETCONNECT_PROJECT_ID in your .env file')
}

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

// Log excluded wallets to prevent warnings
const excludedWallets = ['coinbase', 'coinbase_smart_wallet', 'coinbase_wallet']
console.log('🚫 Excluded wallets for Sei Network:', excludedWallets)
console.log('🔗 This prevents "chains not supported" warnings')

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
  if (envConfig.isValid.walletConnect) {
    try {
      // ROBUST SINGLETON: Check if WalletConnect is already initialized to prevent double setup
      const existingWagmiInit = typeof window !== 'undefined' && 
        (window as any).__WAGMI_WALLETCONNECT_INITIALIZED__ === true
      
      const existingGlobalState = typeof window !== 'undefined' && 
        (window as any).__SEIRON_WALLETCONNECT_GLOBAL_STATE__?.isInitialized === true
      
      if (!existingWagmiInit && !existingGlobalState) {
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
        
        // ENHANCED SINGLETON: Mark that Wagmi is handling WalletConnect with timestamp
        if (typeof window !== 'undefined') {
          ;(window as any).__WAGMI_WALLETCONNECT_INITIALIZED__ = true
          ;(window as any).__WALLETCONNECT_INITIALIZED__ = true
          ;(window as any).__WAGMI_WALLETCONNECT_TIMESTAMP__ = Date.now()
          
          // Initialize global state if not already present
          if (!(window as any).__SEIRON_WALLETCONNECT_GLOBAL_STATE__) {
            ;(window as any).__SEIRON_WALLETCONNECT_GLOBAL_STATE__ = {
              isInitialized: true,
              isInitializing: false,
              initializationTimestamp: Date.now(),
              initializationMethod: 'wagmi',
              instanceCount: 1,
              lastCleanupTimestamp: null
            }
          } else {
            // Update existing state to reflect Wagmi initialization
            ;(window as any).__SEIRON_WALLETCONNECT_GLOBAL_STATE__.isInitialized = true
            ;(window as any).__SEIRON_WALLETCONNECT_GLOBAL_STATE__.initializationMethod = 'wagmi'
            ;(window as any).__SEIRON_WALLETCONNECT_GLOBAL_STATE__.initializationTimestamp = Date.now()
          }
        }
      } else {
        console.log('ℹ️ WalletConnect already initialized, skipping connector creation')
      }
    } catch (error) {
      console.warn('⚠️ Failed to initialize WalletConnect:', error)
    }
  } else {
    console.info('ℹ️ WalletConnect Project ID not configured, skipping WalletConnect connector')
    console.info('ℹ️ Set VITE_WALLETCONNECT_PROJECT_ID environment variable to enable WalletConnect')
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
  // Configure to suppress chain compatibility warnings
  ssr: false,
  // Additional configuration to prevent warnings
  multiInjectedProviderDiscovery: false,
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