/**
 * SEI Blockchain MCP Server Frontend Configuration
 * 
 * This module provides the frontend configuration and TypeScript interfaces
 * for interacting with the SEI blockchain MCP server. It includes type-safe
 * definitions for all blockchain operations and data structures.
 */

/**
 * SEI wallet address type with validation
 */
export type SeiAddress = `sei1${string}`

/**
 * Token denomination type
 */
export type TokenDenom = string

/**
 * Transaction hash type
 */
export type TxHash = string

/**
 * Block height type
 */
export type BlockHeight = number

/**
 * Token amount (as string to preserve precision)
 */
export type TokenAmount = string

/**
 * SEI blockchain network types
 */
export type SeiNetwork = 'mainnet' | 'testnet' | 'devnet'

/**
 * Transaction status
 */
export type TxStatus = 'pending' | 'success' | 'failed'

/**
 * DeFi protocol types on SEI
 */
export type DeFiProtocol = 
  | 'astroport'
  | 'white-whale'
  | 'kujira'
  | 'fuzion'
  | 'levana'
  | 'other'

/**
 * DeFi position types
 */
export type DeFiPositionType = 
  | 'liquidity'
  | 'lending'
  | 'borrowing'
  | 'farming'
  | 'staking'

/**
 * Pool types
 */
export type PoolType = 
  | 'constant-product'
  | 'stable-swap'
  | 'concentrated'

/**
 * Validator status
 */
export type ValidatorStatus = 'bonded' | 'unbonding' | 'unbonded'

/**
 * Governance proposal status
 */
export type ProposalStatus = 'voting' | 'passed' | 'rejected' | 'failed'

/**
 * Token metadata interface
 */
export interface TokenMetadata {
  denom: TokenDenom
  name: string
  symbol: string
  decimals: number
  totalSupply?: TokenAmount
  circulatingSupply?: TokenAmount
  price?: {
    usd: number
    sei: number
    change24h: number
  }
  icon?: string
  verified: boolean
}

/**
 * Wallet balance interface
 */
export interface WalletBalance {
  denom: TokenDenom
  amount: TokenAmount
  available: TokenAmount
  locked?: TokenAmount
  staked?: TokenAmount
  unbonding?: TokenAmount
  usdValue?: number
}

/**
 * Transaction interface
 */
export interface Transaction {
  hash: TxHash
  height: BlockHeight
  timestamp: string
  from: SeiAddress
  to?: SeiAddress
  type: string
  amount: Array<{
    denom: TokenDenom
    amount: TokenAmount
  }>
  fee: {
    amount: Array<{
      denom: TokenDenom
      amount: TokenAmount
    }>
    gas: string
  }
  memo?: string
  success: boolean
  status: TxStatus
}

/**
 * DeFi position interface
 */
export interface DeFiPosition {
  protocol: DeFiProtocol
  type: DeFiPositionType
  value: TokenAmount
  apy?: number
  apr?: number
  rewards?: Array<{
    denom: TokenDenom
    amount: TokenAmount
    pendingAmount: TokenAmount
  }>
  positions: Array<{
    poolId: string
    assets: Array<{
      denom: TokenDenom
      amount: TokenAmount
    }>
    shares: TokenAmount
  }>
  healthFactor?: number
}

/**
 * Liquidity pool interface
 */
export interface LiquidityPool {
  id: string
  type: PoolType
  assets: Array<{
    denom: TokenDenom
    amount: TokenAmount
    weight?: number
  }>
  totalShares: TokenAmount
  apr?: number
  apy?: number
  volume24h?: TokenAmount
  fees24h?: TokenAmount
  tvl: TokenAmount
  myLiquidity?: {
    shares: TokenAmount
    value: TokenAmount
    percentage: number
  }
}

/**
 * Staking delegation interface
 */
export interface StakingDelegation {
  validator: string
  validatorName?: string
  amount: TokenAmount
  shares: TokenAmount
  commission?: number
}

/**
 * Unbonding delegation interface
 */
export interface UnbondingDelegation {
  validator: string
  entries: Array<{
    amount: TokenAmount
    completionTime: string
  }>
}

/**
 * Staking rewards interface
 */
export interface StakingRewards {
  validator: string
  rewards: Array<{
    denom: TokenDenom
    amount: TokenAmount
  }>
}

/**
 * Staking info interface
 */
export interface StakingInfo {
  delegations: StakingDelegation[]
  unbondingDelegations: UnbondingDelegation[]
  rewards: StakingRewards[]
  totalStaked: TokenAmount
  totalRewards: TokenAmount
  apr?: number
}

/**
 * Token swap parameters
 */
export interface TokenSwapParams {
  fromAddress: SeiAddress
  fromDenom: TokenDenom
  toDenom: TokenDenom
  amount: TokenAmount
  slippageTolerance?: number
  simulate?: boolean
}

/**
 * Token swap result
 */
export interface TokenSwapResult {
  success: boolean
  txHash?: TxHash
  fromAmount: TokenAmount
  toAmount: TokenAmount
  rate: number
  priceImpact: number
  fee: TokenAmount
  route?: string[]
}

/**
 * Token transfer parameters
 */
export interface TokenTransferParams {
  fromAddress: SeiAddress
  toAddress: SeiAddress
  denom: TokenDenom
  amount: TokenAmount
  memo?: string
}

/**
 * Validator info interface
 */
export interface ValidatorInfo {
  address: string
  name: string
  status: ValidatorStatus
  tokens: TokenAmount
  delegatorShares: TokenAmount
  commission: {
    rate: number
    maxRate: number
    maxChangeRate: number
  }
  minSelfDelegation: TokenAmount
  jailed: boolean
  website?: string
  description?: string
}

/**
 * Governance proposal interface
 */
export interface GovernanceProposal {
  id: number
  title: string
  description: string
  status: ProposalStatus
  submitTime: string
  depositEndTime?: string
  votingStartTime?: string
  votingEndTime?: string
  finalTallyResult?: {
    yes: TokenAmount
    no: TokenAmount
    abstain: TokenAmount
    noWithVeto: TokenAmount
  }
  totalDeposit: Array<{
    denom: TokenDenom
    amount: TokenAmount
  }>
}

/**
 * MCP server configuration for SEI blockchain
 */
export const seiBlockchainMCPServer = {
  name: 'sei-blockchain',
  version: '1.0.0',
  protocol: 'MCP/1.0',
  
  // Environment-based endpoint selection
  getEndpoint: (network: SeiNetwork = 'mainnet') => {
    const endpoints = {
      mainnet: {
        rpc: import.meta.env.VITE_SEI_RPC_MAINNET || 'https://rpc.sei-apis.com',
        rest: import.meta.env.VITE_SEI_REST_MAINNET || 'https://rest.sei-apis.com',
        ws: import.meta.env.VITE_SEI_WS_MAINNET || 'wss://ws.sei-apis.com'
      },
      testnet: {
        rpc: import.meta.env.VITE_SEI_RPC_TESTNET || 'https://rpc-testnet.sei-apis.com',
        rest: import.meta.env.VITE_SEI_REST_TESTNET || 'https://rest-testnet.sei-apis.com',
        ws: import.meta.env.VITE_SEI_WS_TESTNET || 'wss://ws-testnet.sei-apis.com'
      },
      devnet: {
        rpc: 'http://localhost:26657',
        rest: 'http://localhost:1317',
        ws: 'ws://localhost:26657'
      }
    }
    
    return endpoints[network]
  },

  // API key configuration
  apiKey: import.meta.env.VITE_SEI_API_KEY,

  // Available capabilities
  capabilities: [
    'wallet-operations',
    'transaction-queries',
    'defi-monitoring',
    'token-management',
    'liquidity-pools',
    'staking-operations',
    'governance'
  ] as const,

  // Helper functions for type-safe operations
  utils: {
    /**
     * Validate SEI address format
     */
    isValidAddress: (address: string): address is SeiAddress => {
      return /^sei1[a-z0-9]{38}$/.test(address)
    },

    /**
     * Format token amount with decimals
     */
    formatAmount: (amount: TokenAmount, decimals: number = 6): string => {
      const value = BigInt(amount)
      const divisor = BigInt(10 ** decimals)
      const whole = value / divisor
      const fraction = value % divisor
      
      return `${whole}.${fraction.toString().padStart(decimals, '0')}`
    },

    /**
     * Parse formatted amount to raw amount
     */
    parseAmount: (formatted: string, decimals: number = 6): TokenAmount => {
      const [whole, fraction = '0'] = formatted.split('.')
      const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals)
      return `${whole}${paddedFraction}`.replace(/^0+/, '') || '0'
    }
  }
}

// Export type for the server configuration
export type SeiBlockchainMCPServer = typeof seiBlockchainMCPServer