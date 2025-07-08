import { defineChain } from 'viem'

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

// Debug logging with safe fallbacks
console.log('🔐 Privy Configuration Status:');
console.log('- App ID present:', !!appId);
console.log('- App ID length:', appId?.length || 0);
console.log('- Environment:', import.meta.env.MODE);
console.log('- Client ID present:', !!clientId);

// Warn if missing in production
if (import.meta.env.PROD && !appId) {
  console.warn('⚠️ Missing VITE_PRIVY_APP_ID in production environment');
}

// Ensure config is always defined with proper structure
const defaultConfig = {
  appearance: {
    theme: 'dark' as const,
    accentColor: '#ef4444' as const, // Red accent color for UI consistency
    logo: undefined, // No logo needed
    showWalletLoginFirst: true,
  },
  loginMethods: [
    'email',
    'wallet',
    'google',
    'discord',
    'twitter',
  ] as ('email' | 'wallet' | 'google' | 'discord' | 'twitter')[],
  // Embedded wallet configuration
  embeddedWallets: {
    createOnLogin: 'users-without-wallets' as const,
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
    connectModalTitle: 'Connect Your Wallet',
    connectModalSubtitle: 'Connect your wallet to manage your DeFi portfolio',
  },
};

// Export with guaranteed structure
export const privyConfig = {
  appId: appId || '',
  clientId: clientId || '',
  config: defaultConfig,
}

// Fail-safe getter
export const getPrivyConfig = () => {
  try {
    return privyConfig;
  } catch (error) {
    console.error('Error accessing privyConfig:', error);
    return {
      appId: '',
      clientId: '',
      config: defaultConfig,
    };
  }
};