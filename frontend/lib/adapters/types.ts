import { Either } from '@types/agent'

// Common adapter configuration
export interface AdapterConfig {
  apiEndpoint: string
  timeout?: number
}

// Common adapter interface
export interface BaseAdapter {
  readonly name: string
  readonly version: string
  isConnected(): boolean
  connect(): Promise<void>
  disconnect(): Promise<void>
  getHealth(): Promise<Either<string, AdapterHealth>>
}

// Adapter health status
export interface AdapterHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  lastChecked: number
  latencyMs?: number
  errorCount?: number
}

// ============================================================================
// Sei Agent Kit Adapter Interface
// ============================================================================

export interface SAKOperationResult<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  metadata?: {
    gasUsed?: number
    txHash?: string
    blockNumber?: number
    timestamp?: number
    dragonBallMessage?: string
  }
}

export interface SAKTool {
  name: string
  description: string
  parameters: Record<string, unknown>
  category: string
}

export interface SeiAgentKitAdapter extends BaseAdapter {
  executeTool<T>(
    toolName: string,
    params: Record<string, unknown>,
    context?: Record<string, unknown>
  ): Promise<Either<string, SAKOperationResult<T>>>
  
  listTools(): Promise<Either<string, SAKTool[]>>
  
  getToolDescription(toolName: string): Promise<Either<string, SAKTool>>
}

// ============================================================================
// Hive Intelligence Adapter Interface
// ============================================================================

export interface HiveAnalyticsResult {
  insights: Array<{
    id: string
    type: string
    title: string
    description: string
    confidence: number
  }>
  recommendations: Array<{
    id: string
    type: string
    title: string
    priority: string
    expectedImpact: number
  }>
  metadata: {
    queryId: string
    creditsUsed: number
    timestamp: number
  }
}

export interface HiveSearchResult {
  results: Array<{
    id: string
    title: string
    description: string
    url?: string
    score: number
    metadata: Record<string, unknown>
  }>
  totalResults: number
  creditsUsed: number
  processingTime: number
}

export interface HiveCreditUsage {
  totalCredits: number
  usedCredits: number
  remainingCredits: number
  billingPeriod: {
    start: string
    end: string
  }
  usage: Array<{
    date: string
    creditsUsed: number
    operationType: string
  }>
}

export interface HiveIntelligenceAdapter extends BaseAdapter {
  search(
    query: string,
    metadata?: Record<string, unknown>
  ): Promise<Either<string, HiveSearchResult>>
  
  getAnalytics(
    query: string,
    walletAddress?: string
  ): Promise<Either<string, HiveAnalyticsResult>>
  
  getPortfolioAnalysis(
    walletAddress: string,
    additionalParams?: Record<string, unknown>
  ): Promise<Either<string, HiveAnalyticsResult>>
  
  getCreditUsage(): Promise<Either<string, HiveCreditUsage>>
}

// ============================================================================
// MCP Protocol Adapter Interface
// ============================================================================

export interface MCPNetworkStatus {
  blockNumber: number
  networkStatus: 'healthy' | 'congested' | 'offline'
  gasPrice: string
  validators: number
  totalSupply: string
  latestBlockTime: number
  nodeVersion: string
}

export interface MCPWalletBalance {
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

export interface MCPTransactionResult {
  txHash: string
  blockNumber?: number
  success: boolean
  gasUsed?: number
  error?: string
  events?: Array<{
    type: string
    data: Record<string, unknown>
  }>
}

export interface MCPContractQueryResult {
  result: unknown
  blockNumber: number
  gasUsed?: number
  timestamp: number
}

export interface SeiMCPAdapter extends BaseAdapter {
  getNetworkStatus(): Promise<Either<string, MCPNetworkStatus>>
  
  getWalletBalance(address: string): Promise<Either<string, MCPWalletBalance>>
  
  sendTransaction(
    transactionRequest: Record<string, unknown>
  ): Promise<Either<string, MCPTransactionResult>>
  
  queryContract(
    contractAddress: string,
    query: Record<string, unknown>
  ): Promise<Either<string, MCPContractQueryResult>>
  
  estimateGas(
    transactionRequest: Record<string, unknown>
  ): Promise<Either<string, { gasEstimate: number; gasPrice: string }>>
}

// ============================================================================
// Adapter Factory Types
// ============================================================================

export type AdapterType = 'sak' | 'hive' | 'mcp'

export interface AdapterFactory {
  createAdapter(type: AdapterType, config: AdapterConfig): BaseAdapter
  getAdapter(type: AdapterType): BaseAdapter | null
  getAllAdapters(): Map<AdapterType, BaseAdapter>
  destroyAdapter(type: AdapterType): Promise<void>
}

// ============================================================================
// Unified Adapter Action Types
// ============================================================================

export interface AdapterAction {
  type: AdapterType
  action: string
  params: Record<string, unknown>
  description: string
  timeout?: number
}

export interface AdapterActionResult {
  success: boolean
  data?: unknown
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  metadata?: {
    executionTime: number
    adapterType: AdapterType
    action: string
    timestamp: number
  }
}