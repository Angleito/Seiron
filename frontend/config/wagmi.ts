import { createConfig, http } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { injected, metaMask } from 'wagmi/connectors'

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

export const wagmiConfig = createConfig({
  chains: [seiMainnet, mainnet],
  connectors: [
    injected(),
    metaMask(),
  ],
  transports: {
    [seiMainnet.id]: http(),
    [mainnet.id]: http(),
  },
})