// Orchestrator API types

export interface OrchestratorConfig {
  baseUrl: string
  apiKey?: string
  timeout?: number
  retryAttempts?: number
  retryDelay?: number
}

export interface OrchestratorResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  metadata?: {
    requestId: string
    timestamp: number
    duration: number
    version: string
  }
}

export interface OrchestratorStreamResponse<T = any> {
  type: 'data' | 'error' | 'complete'
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  metadata?: {
    requestId: string
    timestamp: number
    sequenceNumber: number
  }
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  metadata?: {
    intent?: string
    confidence?: number
    tokens?: number
    model?: string
    temperature?: number
    [key: string]: any
  }
}

export interface ChatRequest {
  message: string
  sessionId?: string
  context?: {
    walletAddress?: string
    portfolioData?: any
    preferences?: any
    [key: string]: any
  }
  options?: {
    model?: string
    temperature?: number
    maxTokens?: number
    stream?: boolean
    [key: string]: any
  }
}

export interface ChatResponse {
  message: ChatMessage
  sessionId: string
  context?: {
    intent?: string
    confidence?: number
    actions?: any[]
    [key: string]: any
  }
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface AgentTask {
  id: string
  type: 'portfolio' | 'lending' | 'trading' | 'analysis' | 'risk'
  status: 'pending' | 'running' | 'completed' | 'failed'
  input: Record<string, any>
  output?: Record<string, any>
  error?: {
    code: string
    message: string
    details?: any
  }
  progress?: {
    current: number
    total: number
    message: string
  }
  createdAt: number
  updatedAt: number
  completedAt?: number
  metadata?: {
    agentId: string
    version: string
    duration?: number
    [key: string]: any
  }
}

export interface AgentTaskRequest {
  type: AgentTask['type']
  input: Record<string, any>
  options?: {
    timeout?: number
    priority?: 'low' | 'medium' | 'high'
    [key: string]: any
  }
}

export interface AgentTaskResponse {
  task: AgentTask
  estimatedDuration?: number
  queuePosition?: number
}

export interface PortfolioAnalysisRequest {
  walletAddress: string
  options?: {
    includeHistory?: boolean
    includeRisk?: boolean
    includeRecommendations?: boolean
    timeframe?: '24h' | '7d' | '30d' | '90d' | '1y'
    [key: string]: any
  }
}

export interface PortfolioAnalysisResponse {
  portfolio: {
    totalValue: number
    totalChange24h: number
    totalChangePercent24h: number
    positions: Array<{
      protocol: string
      type: string
      asset: string
      amount: string
      value: number
      apr: number
      apy: number
      healthFactor?: number
      liquidationThreshold?: number
    }>
  }
  analysis: {
    riskScore: number
    diversificationScore: number
    yieldScore: number
    liquidityScore: number
    recommendations: Array<{
      type: string
      priority: 'low' | 'medium' | 'high'
      title: string
      description: string
      expectedImpact: number
      confidence: number
    }>
  }
  history?: Array<{
    timestamp: number
    totalValue: number
    totalChange: number
    positions: number
  }>
}

export interface TradingRequest {
  type: 'buy' | 'sell' | 'swap'
  fromAsset: string
  toAsset: string
  amount: string
  slippage?: number
  deadline?: number
  options?: {
    maxGasPrice?: string
    priority?: 'low' | 'medium' | 'high'
    [key: string]: any
  }
}

export interface TradingResponse {
  transaction: {
    hash: string
    status: 'pending' | 'confirmed' | 'failed'
    gasUsed?: number
    gasPrice?: string
    blockNumber?: number
    confirmations?: number
  }
  trade: {
    fromAsset: string
    toAsset: string
    fromAmount: string
    toAmount: string
    executedPrice: string
    slippage: number
    fee: string
    route?: Array<{
      protocol: string
      pool: string
      percentage: number
    }>
  }
  estimated?: {
    priceImpact: number
    minimumReceived: string
    maximumSent: string
    route: Array<{
      protocol: string
      pool: string
      percentage: number
    }>
  }
}

export interface LendingRequest {
  type: 'deposit' | 'withdraw' | 'borrow' | 'repay'
  protocol: string
  asset: string
  amount: string
  collateral?: string
  options?: {
    maxGasPrice?: string
    priority?: 'low' | 'medium' | 'high'
    [key: string]: any
  }
}

export interface LendingResponse {
  transaction: {
    hash: string
    status: 'pending' | 'confirmed' | 'failed'
    gasUsed?: number
    gasPrice?: string
    blockNumber?: number
    confirmations?: number
  }
  position: {
    protocol: string
    type: 'lending' | 'borrowing'
    asset: string
    amount: string
    value: number
    apr: number
    apy: number
    healthFactor?: number
    liquidationThreshold?: number
  }
  estimated?: {
    newHealthFactor?: number
    liquidationPrice?: string
    borrowCapacity?: string
    earnedRewards?: string
  }
}

export interface RiskAnalysisRequest {
  walletAddress: string
  scenarios?: Array<{
    name: string
    conditions: Record<string, any>
  }>
  options?: {
    includeStressTests?: boolean
    includeCorrelations?: boolean
    includeVaR?: boolean
    confidence?: number
    timeframe?: '24h' | '7d' | '30d' | '90d' | '1y'
    [key: string]: any
  }
}

export interface RiskAnalysisResponse {
  overall: {
    riskScore: number
    riskLevel: 'low' | 'medium' | 'high' | 'extreme'
    healthFactor: number
    liquidationRisk: number
    concentrationRisk: number
    volatilityRisk: number
  }
  positions: Array<{
    protocol: string
    asset: string
    riskScore: number
    riskFactors: Array<{
      type: string
      severity: 'low' | 'medium' | 'high'
      description: string
      impact: number
    }>
    liquidationPrice?: string
    timeToLiquidation?: number
  }>
  scenarios?: Array<{
    name: string
    probability: number
    impact: number
    portfolioValue: number
    positions: Array<{
      protocol: string
      asset: string
      newValue: number
      change: number
    }>
  }>
  recommendations: Array<{
    type: string
    priority: 'low' | 'medium' | 'high'
    title: string
    description: string
    expectedRiskReduction: number
    confidence: number
  }>
}

export interface MarketAnalysisRequest {
  assets?: string[]
  protocols?: string[]
  timeframe?: '1h' | '4h' | '24h' | '7d' | '30d'
  options?: {
    includeCorrelations?: boolean
    includeVolatility?: boolean
    includeTrends?: boolean
    includeNews?: boolean
    [key: string]: any
  }
}

export interface MarketAnalysisResponse {
  summary: {
    marketSentiment: 'bullish' | 'bearish' | 'neutral'
    volatility: number
    volume24h: number
    topMovers: Array<{
      asset: string
      change: number
      volume: number
    }>
  }
  assets: Array<{
    symbol: string
    price: number
    change24h: number
    volume24h: number
    marketCap: number
    volatility: number
    trend: 'up' | 'down' | 'sideways'
    support?: number
    resistance?: number
    indicators: Record<string, number>
  }>
  protocols: Array<{
    name: string
    tvl: number
    volume24h: number
    users24h: number
    apr: number
    apy: number
    change24h: number
    riskScore: number
  }>
  correlations?: Array<{
    pair: [string, string]
    correlation: number
    significance: number
  }>
  news?: Array<{
    title: string
    summary: string
    sentiment: 'positive' | 'negative' | 'neutral'
    relevance: number
    timestamp: number
    source: string
  }>
}

export interface WebSocketMessage {
  type: string
  data: any
  timestamp: number
  requestId?: string
  sessionId?: string
}

export interface WebSocketConfig {
  url: string
  protocols?: string[]
  reconnectAttempts?: number
  reconnectDelay?: number
  heartbeatInterval?: number
  messageTimeout?: number
}

export interface WebSocketSubscription {
  id: string
  type: string
  params: Record<string, any>
  callback: (data: any) => void
  error?: (error: any) => void
}

export interface StreamingConfig {
  bufferSize?: number
  maxRetries?: number
  retryDelay?: number
  timeout?: number
}

export interface OrchestratorError {
  code: string
  message: string
  details?: any
  timestamp: number
  requestId?: string
  context?: Record<string, any>
}

export interface OrchestratorHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  version: string
  timestamp: number
  components: Record<string, {
    status: 'healthy' | 'degraded' | 'unhealthy'
    latency?: number
    error?: string
  }>
  metrics: {
    uptime: number
    requestsPerSecond: number
    averageResponseTime: number
    errorRate: number
  }
}

export interface OrchestratorMetrics {
  requests: {
    total: number
    successful: number
    failed: number
    rate: number
  }
  response: {
    averageTime: number
    p95Time: number
    p99Time: number
  }
  errors: {
    total: number
    rate: number
    byType: Record<string, number>
  }
  system: {
    uptime: number
    cpu: number
    memory: number
    connections: number
  }
}

// Functional types for fp-ts integration
export type OrchestratorTask<T> = () => Promise<OrchestratorResponse<T>>
export type OrchestratorValidator<T> = (data: unknown) => T | null
export type OrchestratorTransformer<T, U> = (data: T) => U
export type OrchestratorErrorHandler = (error: OrchestratorError) => void