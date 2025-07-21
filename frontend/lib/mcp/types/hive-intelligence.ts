/**
 * Hive Intelligence TypeScript Interfaces
 * 
 * Type definitions for all data structures used in Hive Intelligence MCP integration
 */

// Server Configuration
export interface HiveIntelligenceServerConfig {
  name: string;
  displayName: string;
  description: string;
  version: string;
  endpoints: {
    base: string;
    websocket: string;
  };
  methods: Record<string, HiveMethodConfig>;
  events: Record<string, HiveEventConfig>;
  ui: HiveUIConfig;
  defaults: HiveDefaults;
  rateLimit: {
    maxRequestsPerMinute: number;
    maxRequestsPerHour: number;
  };
}

export interface HiveMethodConfig {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description: string;
  parameters: string[];
  cache?: {
    ttl: number;
    key?: string;
  };
}

export interface HiveEventConfig {
  description: string;
  schema: string;
}

export interface HiveUIConfig {
  icon: string;
  color: string;
  features: HiveFeature[];
}

export interface HiveFeature {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
}

export interface HiveDefaults {
  timeframe: string;
  limit: number;
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  confidenceThreshold: number;
  sources: string[];
  chains: string[];
}

// Market Data Types
export interface HiveMarketData {
  symbol: string;
  timestamp: number;
  price: number;
  volume: number;
  marketCap: number;
  change24h: number;
  high24h: number;
  low24h: number;
  metrics?: {
    rsi?: number;
    macd?: {
      value: number;
      signal: number;
      histogram: number;
    };
    movingAverages?: {
      ma20: number;
      ma50: number;
      ma200: number;
    };
    volumeProfile?: {
      buyVolume: number;
      sellVolume: number;
      neutralVolume: number;
    };
  };
}

// Sentiment Analysis Types
export interface HiveSentimentAnalysis {
  overall: {
    score: number;
    label: 'very-bearish' | 'bearish' | 'neutral' | 'bullish' | 'very-bullish';
    confidence: number;
  };
  sources: Record<string, {
    score: number;
    volume: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  }>;
  trends: Array<{
    keyword: string;
    mentions: number;
    sentiment: number;
    growth: number;
  }>;
  insights: Array<{
    type: string;
    message: string;
    importance: 'low' | 'medium' | 'high';
    source: string;
  }>;
}

// Price Prediction Types
export interface HivePricePrediction {
  symbol: string;
  predictions: Array<{
    timeframe: string;
    predictedPrice: number;
    confidence: number;
    range: {
      low: number;
      high: number;
    };
    drivers: Array<{
      factor: string;
      impact: 'positive' | 'negative' | 'neutral';
      description: string;
    }>;
  }>;
  analysis: {
    technicalScore: number;
    fundamentalScore: number;
    sentimentScore: number;
    riskScore: number;
    rationale: string;
  };
}

// Trading Signal Types
export interface HiveTradingSignal {
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  strength: number;
  entryPrice: number;
  targetPrices: number[];
  stopLoss: number;
  riskReward: number;
  timeHorizon: string;
  strategy: string;
  indicators: Array<{
    name: string;
    value: number;
    signal: 'bullish' | 'bearish' | 'neutral';
  }>;
  confidence: number;
  rationale: string;
}

// News Types
export interface HiveNewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  sentiment: {
    score: number;
    label: string;
  };
  relevance: number;
  keywords: string[];
  relatedSymbols: string[];
  impact: {
    level: 'low' | 'medium' | 'high';
    description: string;
  };
}

// On-Chain Metrics Types
export interface HiveOnChainMetrics {
  chain: string;
  metrics: Record<string, Array<{
    timestamp: number;
    value: number;
    change24h: number;
  }>>;
  summary: {
    timeRange: string;
    highlights: Array<{
      metric: string;
      trend: 'up' | 'down' | 'stable';
      insight: string;
    }>;
  };
}

// Portfolio Analysis Types
export interface HivePortfolioAnalysis {
  totalValue: number;
  totalCost: number;
  pnl: number;
  pnlPercentage: number;
  holdings: Array<{
    symbol: string;
    amount: number;
    value: number;
    cost: number;
    pnl: number;
    allocation: number;
  }>;
  defiPositions: Array<{
    protocol: string;
    type: 'lending' | 'farming' | 'staking' | 'liquidity';
    value: number;
    apy: number;
    rewards: number;
  }>;
  nfts: Array<{
    collection: string;
    tokenId: string;
    estimatedValue: number;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  }>;
  analysis: {
    diversification: {
      score: number;
      recommendations: string[];
    };
    risk: {
      score: number;
      volatility: number;
      var95: number;
      factors: string[];
    };
    performance: {
      vs_btc: number;
      vs_eth: number;
      vs_market: number;
      sharpeRatio: number;
    };
    opportunities: Array<{
      type: string;
      description: string;
      expectedReturn: number;
      risk: 'low' | 'medium' | 'high';
    }>;
  };
}

// Request Types
export interface HiveMarketDataRequest {
  symbols: string[];
  timeframe?: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w' | '1M';
  limit?: number;
  includeMetrics?: boolean;
}

export interface HiveSentimentRequest {
  symbols: string[];
  sources?: ('twitter' | 'reddit' | 'telegram' | 'discord' | 'news' | 'on-chain')[];
  timeRange?: '1h' | '4h' | '24h' | '7d' | '30d';
  includeTrends?: boolean;
}

export interface HivePredictionRequest {
  symbol: string;
  timeframes?: ('1h' | '4h' | '24h' | '7d' | '30d' | '90d')[];
  confidenceThreshold?: number;
  includeRationale?: boolean;
}

export interface HiveTradingSignalRequest {
  symbols: string[];
  strategies?: ('momentum' | 'mean-reversion' | 'breakout' | 'trend-following' | 'ai-composite')[];
  riskLevel?: 'conservative' | 'moderate' | 'aggressive';
  timeHorizon?: 'scalping' | 'day-trading' | 'swing' | 'position';
}

export interface HiveNewsRequest {
  keywords?: string[];
  sources?: string[];
  sentiment?: 'all' | 'positive' | 'negative' | 'neutral';
  limit?: number;
  timeRange?: '1h' | '4h' | '24h' | '7d' | '30d';
}

export interface HiveOnChainRequest {
  chain: 'sei' | 'ethereum' | 'bitcoin' | 'solana' | 'arbitrum';
  metrics: ('tvl' | 'active-addresses' | 'transaction-volume' | 'gas-usage' | 'dex-volume' | 'nft-volume')[];
  timeRange?: '24h' | '7d' | '30d' | '90d';
  granularity?: 'hour' | 'day' | 'week';
}

export interface HivePortfolioRequest {
  walletAddress: string;
  chains?: string[];
  includeDefi?: boolean;
  includeNfts?: boolean;
  benchmarks?: string[];
}

// Response Types
export interface HiveIntelligenceResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    timestamp: number;
    requestId?: string;
    creditsUsed?: number;
    processingTime?: number;
  };
}

// WebSocket Event Types
export interface HiveWebSocketEvent {
  type: string;
  data: any;
  timestamp: number;
}

export interface MarketPriceUpdate extends HiveWebSocketEvent {
  type: 'market:price-update';
  data: {
    symbol: string;
    price: number;
    volume: number;
    change: number;
  };
}

export interface VolumeSpike extends HiveWebSocketEvent {
  type: 'market:volume-spike';
  data: {
    symbol: string;
    volume: number;
    spike: number;
    direction: 'buy' | 'sell';
  };
}

export interface SentimentShift extends HiveWebSocketEvent {
  type: 'sentiment:shift';
  data: {
    symbol: string;
    previousSentiment: number;
    currentSentiment: number;
    change: number;
    sources: string[];
  };
}

export interface BreakingNews extends HiveWebSocketEvent {
  type: 'news:breaking';
  data: HiveNewsArticle;
}

export interface TradingSignalEvent extends HiveWebSocketEvent {
  type: 'signal:generated';
  data: HiveTradingSignal;
}

export interface PredictionUpdate extends HiveWebSocketEvent {
  type: 'prediction:update';
  data: {
    symbol: string;
    prediction: HivePricePrediction;
    previousPrediction?: HivePricePrediction;
  };
}

export interface PortfolioAlert extends HiveWebSocketEvent {
  type: 'portfolio:alert';
  data: {
    walletAddress: string;
    alertType: 'price' | 'risk' | 'opportunity' | 'rebalance';
    message: string;
    action?: string;
  };
}

export interface MetricAnomaly extends HiveWebSocketEvent {
  type: 'chain:metric-anomaly';
  data: {
    chain: string;
    metric: string;
    value: number;
    deviation: number;
    significance: 'low' | 'medium' | 'high';
    description: string;
  };
}

// Utility Types
export type HiveTimeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w' | '1M';
export type HiveRiskLevel = 'conservative' | 'moderate' | 'aggressive';
export type HiveSentimentLabel = 'very-bearish' | 'bearish' | 'neutral' | 'bullish' | 'very-bullish';
export type HiveChain = 'sei' | 'ethereum' | 'bitcoin' | 'solana' | 'arbitrum';
export type HiveMetricType = 'tvl' | 'active-addresses' | 'transaction-volume' | 'gas-usage' | 'dex-volume' | 'nft-volume';