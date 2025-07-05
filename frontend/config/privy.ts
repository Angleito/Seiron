import { defineChain } from 'viem'
import { logger } from '@/lib/logger'

// Sei Network chain configuration
export const seiMainnet = defineChain({
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
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
    },
  },
})

// Privy configuration
const appId = import.meta.env.VITE_PRIVY_APP_ID || '';
const clientId = import.meta.env.VITE_PRIVY_CLIENT_ID || '';

// Debug logging
logger.debug('Privy App ID:', appId);
logger.debug('Privy App ID length:', appId.length);
logger.debug('Privy App ID present:', !!appId);

export const privyConfig = {
  appId,
  clientId,
  config: {
    appearance: {
      theme: 'dark',
      accentColor: '#ef4444', // Red to match Dragon Ball theme
      logo: '/dragon-logo.png', // Add your logo path
      showWalletLoginFirst: true,
    },
    loginMethods: [
      'email',
      'wallet',
      'google',
      'discord',
      'twitter',
    ],
    walletConnectProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
    // Embedded wallet configuration
    embeddedWallets: {
      createOnLogin: 'users-without-wallets',
      requireUserPasswordOnCreate: true,
      noPromptOnSignature: false,
    },
    // Chain configuration
    defaultChain: seiMainnet,
    supportedChains: [seiMainnet],
    // Advanced options
    clientAnalyticsEnabled: true,
    // Custom text
    customText: {
      connectButton: 'Power Up Wallet',
      connectModalTitle: 'Enter the Dragon Realm',
      connectModalSubtitle: 'Connect your wallet to manage your DeFi portfolio',
    },
  },
}