// Blockchain and Sei Network API types

export interface NetworkStatus {
  blockNumber: number
  networkStatus: 'healthy' | 'congested' | 'offline'
  gasPrice: string
  validators: number
  totalSupply: string
  latestBlockTime: number
  nodeVersion: string
}

export interface WalletBalance {
  address: string
  balance: string
  tokens: Array<{
    symbol: string
    balance: string
    decimals: number
    contractAddress?: string
  }>
  lastUpdated: number
}

export interface TransactionResult {
  txHash: string
  blockNumber?: number
  success: boolean
  gasUsed?: number
  error?: string
  events?: Array<{
    type: string
    data: Record<string, any>
  }>
}

export interface ContractQueryResult {
  result: unknown
  blockNumber: number
  gasUsed?: number
  timestamp: number
}

export interface GasEstimate {
  gasEstimate: number
  gasPrice: string
}

// Sei-specific types
export interface SeiNetworkConfig {
  chainId: string
  rpcUrl: string
  restUrl: string
  name: string
  symbol: string
  decimals: number
  explorer: string
}

export interface SeiTransaction {
  hash: string
  height: number
  code: number
  data: string
  rawLog: string
  logs: Array<{
    msgIndex: number
    log: string
    events: Array<{
      type: string
      attributes: Array<{
        key: string
        value: string
      }>
    }>
  }>
  info: string
  gasWanted: string
  gasUsed: string
  tx: Record<string, unknown>
  timestamp: string
}

export interface SeiValidator {
  operatorAddress: string
  consensusPubkey: {
    typeUrl: string
    value: string
  }
  jailed: boolean
  status: string
  tokens: string
  delegatorShares: string
  description: {
    moniker: string
    identity: string
    website: string
    securityContact: string
    details: string
  }
  unbondingHeight: string
  unbondingTime: string
  commission: {
    commissionRates: {
      rate: string
      maxRate: string
      maxChangeRate: string
    }
    updateTime: string
  }
  minSelfDelegation: string
}

export interface SeiDelegation {
  delegatorAddress: string
  validatorAddress: string
  shares: string
  balance: {
    denom: string
    amount: string
  }
}

export interface SeiUnbondingDelegation {
  delegatorAddress: string
  validatorAddress: string
  entries: Array<{
    creationHeight: string
    completionTime: string
    initialBalance: string
    balance: string
  }>
}

export interface SeiRewards {
  rewards: Array<{
    validatorAddress: string
    reward: Array<{
      denom: string
      amount: string
    }>
  }>
  total: Array<{
    denom: string
    amount: string
  }>
}

// CosmWasm types
export interface CosmWasmContract {
  address: string
  codeId: number
  creator: string
  admin: string
  label: string
  created: {
    blockHeight: number
    txIndex: number
  }
  ibcPortId: string
  extension: Record<string, unknown>
}

export interface CosmWasmCode {
  codeId: number
  creator: string
  dataHash: string
  source: string
  builder: string
  instantiatePermission: {
    permission: string
    address: string
  }
}

export interface CosmWasmExecuteMsg {
  contract: string
  msg: Record<string, any>
  funds?: Array<{
    denom: string
    amount: string
  }>
}

export interface CosmWasmQueryMsg {
  contract: string
  msg: Record<string, any>
}

export interface CosmWasmMigrateMsg {
  contract: string
  codeId: number
  msg: Record<string, any>
}

// Protocol-specific types
export interface ProtocolConfig {
  name: string
  version: string
  address: string
  codeId?: number
  admin?: string
  fees: {
    depositFee: string
    withdrawalFee: string
    swapFee: string
  }
  limits: {
    minDeposit: string
    maxDeposit: string
    dailyLimit: string
  }
  supportedTokens: string[]
}

export interface ProtocolPosition {
  protocol: string
  positionId: string
  type: 'lending' | 'borrowing' | 'liquidity' | 'farming' | 'staking'
  asset: string
  amount: string
  value: number
  apr: number
  apy: number
  rewards: Array<{
    asset: string
    amount: string
    value: number
  }>
  healthFactor?: number
  liquidationThreshold?: number
  lastUpdated: number
}

export interface ProtocolStats {
  totalValueLocked: string
  totalUsers: number
  totalTransactions: number
  volume24h: string
  fees24h: string
  apr: number
  apy: number
  lastUpdated: number
}

// Market Data types
export interface TokenPrice {
  symbol: string
  price: number
  change24h: number
  volume24h: number
  marketCap: number
  lastUpdated: number
}

export interface MarketData {
  prices: Record<string, TokenPrice>
  totalMarketCap: number
  totalVolume24h: number
  btcDominance: number
  ethDominance: number
  lastUpdated: number
}

// Oracle types
export interface OraclePrice {
  symbol: string
  price: string
  confidence: string
  timestamp: number
  source: string
}

export interface OracleFeed {
  feedId: string
  symbol: string
  price: string
  confidence: string
  publishTime: number
  previousPrice: string
  previousPublishTime: number
}

// Bridge types
export interface BridgeTransfer {
  id: string
  fromChain: string
  toChain: string
  fromAddress: string
  toAddress: string
  asset: string
  amount: string
  status: 'pending' | 'completed' | 'failed'
  txHash: string
  confirmations: number
  requiredConfirmations: number
  estimatedTime: number
  fee: string
  createdAt: number
  completedAt?: number
}

export interface BridgeConfig {
  fromChain: string
  toChain: string
  supportedAssets: string[]
  fees: Record<string, string>
  limits: Record<string, {
    min: string
    max: string
  }>
  requiredConfirmations: number
  estimatedTime: number
}

// IBC types
export interface IBCChannel {
  state: string
  ordering: string
  counterparty: {
    portId: string
    channelId: string
  }
  connectionHops: string[]
  version: string
  portId: string
  channelId: string
}

export interface IBCTransfer {
  sender: string
  receiver: string
  token: {
    denom: string
    amount: string
  }
  sourcePort: string
  sourceChannel: string
  timeoutHeight: {
    revisionNumber: string
    revisionHeight: string
  }
  timeoutTimestamp: string
  memo: string
}

// Error types
export interface BlockchainError {
  code: number
  message: string
  data?: unknown
  log?: string
}

export interface TransactionError extends BlockchainError {
  txHash?: string
  gasUsed?: string
  gasWanted?: string
  events?: Array<{
    type: string
    attributes: Array<{
      key: string
      value: string
    }>
  }>
}

export interface RpcError extends BlockchainError {
  method?: string
  params?: Record<string, unknown>
  id?: string | number
}

// Utility types
export type ChainId = string
export type Address = string
export type Hash = string
export type Denom = string
export type Amount = string
export type Height = number
export type Timestamp = number

export interface Coin {
  denom: Denom
  amount: Amount
}

export interface DecCoin {
  denom: Denom
  amount: string
}

export interface Pagination {
  nextKey?: string
  total?: string
}

export interface PageRequest {
  key?: string
  offset?: string
  limit?: string
  countTotal?: boolean
  reverse?: boolean
}

export interface PageResponse {
  nextKey?: string
  total?: string
}