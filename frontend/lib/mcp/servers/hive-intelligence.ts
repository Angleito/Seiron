import { 
  HiveIntelligenceServerConfig, 
  HiveMarketData, 
  HiveSentimentAnalysis,
  HivePricePrediction,
  HiveTradingSignal,
  HiveNewsArticle,
  HiveOnChainMetrics,
  HivePortfolioAnalysis,
  HiveIntelligenceResponse
} from '../types/hive-intelligence';

/**
 * Hive Intelligence MCP Server Configuration for Frontend
 * 
 * This configuration defines how the frontend interacts with the Hive Intelligence
 * MCP server for market data, sentiment analysis, and trading intelligence.
 */
export const HiveIntelligenceConfig: HiveIntelligenceServerConfig = {
  name: 'hive-intelligence',
  displayName: 'Hive Intelligence',
  description: 'Advanced crypto analytics and market intelligence',
  version: '1.0.0',
  
  // API endpoints
  endpoints: {
    base: process.env.NEXT_PUBLIC_HIVE_INTELLIGENCE_API || '/api/mcp/hive-intelligence',
    websocket: process.env.NEXT_PUBLIC_HIVE_INTELLIGENCE_WS || 'wss://api.hiveintelligence.io',
  },

  // Available methods
  methods: {
    // Market Data
    getMarketData: {
      endpoint: '/market-data',
      method: 'POST',
      description: 'Get real-time and historical market data',
      parameters: ['symbols', 'timeframe', 'limit', 'includeMetrics'],
      cache: { ttl: 60 } // 1 minute
    },
    
    // Sentiment Analysis
    getSentimentAnalysis: {
      endpoint: '/sentiment',
      method: 'POST',
      description: 'Analyze market sentiment from multiple sources',
      parameters: ['symbols', 'sources', 'timeRange', 'includeTrends'],
      cache: { ttl: 300 } // 5 minutes
    },
    
    // Price Predictions
    getPricePredictions: {
      endpoint: '/predictions',
      method: 'POST',
      description: 'Get AI-powered price predictions',
      parameters: ['symbol', 'timeframes', 'confidenceThreshold', 'includeRationale'],
      cache: { ttl: 900 } // 15 minutes
    },
    
    // Trading Signals
    getTradingSignals: {
      endpoint: '/signals',
      method: 'POST',
      description: 'Generate trading signals',
      parameters: ['symbols', 'strategies', 'riskLevel', 'timeHorizon'],
      cache: { ttl: 300 } // 5 minutes
    },
    
    // News Aggregation
    getNewsAggregation: {
      endpoint: '/news',
      method: 'POST',
      description: 'Get aggregated crypto news',
      parameters: ['keywords', 'sources', 'sentiment', 'limit', 'timeRange'],
      cache: { ttl: 600 } // 10 minutes
    },
    
    // On-Chain Metrics
    getOnChainMetrics: {
      endpoint: '/on-chain',
      method: 'POST',
      description: 'Get blockchain metrics and analytics',
      parameters: ['chain', 'metrics', 'timeRange', 'granularity'],
      cache: { ttl: 300 } // 5 minutes
    },
    
    // Portfolio Analysis
    getPortfolioAnalysis: {
      endpoint: '/portfolio',
      method: 'POST',
      description: 'Analyze wallet portfolio',
      parameters: ['walletAddress', 'chains', 'includeDefi', 'includeNfts', 'benchmarks'],
      cache: { ttl: 180 } // 3 minutes
    }
  },

  // WebSocket events
  events: {
    'market:price-update': {
      description: 'Real-time price updates',
      schema: 'MarketPriceUpdate'
    },
    'market:volume-spike': {
      description: 'Unusual volume activity detected',
      schema: 'VolumeSpike'
    },
    'sentiment:shift': {
      description: 'Significant sentiment change',
      schema: 'SentimentShift'
    },
    'news:breaking': {
      description: 'Breaking news alert',
      schema: 'BreakingNews'
    },
    'signal:generated': {
      description: 'New trading signal',
      schema: 'TradingSignal'
    },
    'prediction:update': {
      description: 'Price prediction update',
      schema: 'PredictionUpdate'
    },
    'portfolio:alert': {
      description: 'Portfolio alert',
      schema: 'PortfolioAlert'
    },
    'chain:metric-anomaly': {
      description: 'On-chain anomaly detected',
      schema: 'MetricAnomaly'
    }
  },

  // UI configuration
  ui: {
    icon: 'hive',
    color: '#FFB800',
    features: [
      {
        id: 'market-dashboard',
        name: 'Market Dashboard',
        description: 'Real-time market data and analytics',
        icon: 'chart-line',
        enabled: true
      },
      {
        id: 'sentiment-tracker',
        name: 'Sentiment Tracker',
        description: 'Social media and news sentiment analysis',
        icon: 'heart-pulse',
        enabled: true
      },
      {
        id: 'price-predictor',
        name: 'Price Predictor',
        description: 'AI-powered price predictions',
        icon: 'crystal-ball',
        enabled: true
      },
      {
        id: 'signal-generator',
        name: 'Signal Generator',
        description: 'Automated trading signals',
        icon: 'signal',
        enabled: true
      },
      {
        id: 'news-feed',
        name: 'News Feed',
        description: 'Aggregated crypto news',
        icon: 'newspaper',
        enabled: true
      },
      {
        id: 'chain-analytics',
        name: 'Chain Analytics',
        description: 'On-chain metrics and insights',
        icon: 'link',
        enabled: true
      },
      {
        id: 'portfolio-analyzer',
        name: 'Portfolio Analyzer',
        description: 'Comprehensive portfolio analysis',
        icon: 'wallet',
        enabled: true
      }
    ]
  },

  // Default settings
  defaults: {
    timeframe: '1h',
    limit: 100,
    riskLevel: 'moderate',
    confidenceThreshold: 0.7,
    sources: ['twitter', 'reddit', 'news'],
    chains: ['sei']
  },

  // Rate limiting (client-side)
  rateLimit: {
    maxRequestsPerMinute: 60,
    maxRequestsPerHour: 1000
  }
};

// Helper functions for data transformation
export const transformMarketData = (raw: any): HiveMarketData => {
  return {
    symbol: raw.symbol,
    timestamp: raw.timestamp,
    price: raw.price,
    volume: raw.volume,
    marketCap: raw.marketCap,
    change24h: raw.change24h,
    high24h: raw.high24h,
    low24h: raw.low24h,
    metrics: raw.metrics || {}
  };
};

export const transformSentimentData = (raw: any): HiveSentimentAnalysis => {
  return {
    overall: {
      score: raw.sentiment.overall.score,
      label: raw.sentiment.overall.label,
      confidence: raw.sentiment.overall.confidence
    },
    sources: raw.sentiment.sources || {},
    trends: raw.sentiment.trends || [],
    insights: raw.insights || []
  };
};

export const transformPredictionData = (raw: any): HivePricePrediction => {
  return {
    symbol: raw.symbol,
    predictions: raw.predictions.map((p: any) => ({
      timeframe: p.timeframe,
      predictedPrice: p.predictedPrice,
      confidence: p.confidence,
      range: p.range,
      drivers: p.drivers || []
    })),
    analysis: raw.analysis
  };
};

export const transformTradingSignal = (raw: any): HiveTradingSignal => {
  return {
    symbol: raw.symbol,
    action: raw.action,
    strength: raw.strength,
    entryPrice: raw.entryPrice,
    targetPrices: raw.targetPrices,
    stopLoss: raw.stopLoss,
    riskReward: raw.riskReward,
    timeHorizon: raw.timeHorizon,
    strategy: raw.strategy,
    indicators: raw.indicators || [],
    confidence: raw.confidence,
    rationale: raw.rationale
  };
};

export const transformNewsArticle = (raw: any): HiveNewsArticle => {
  return {
    id: raw.id,
    title: raw.title,
    summary: raw.summary,
    source: raw.source,
    url: raw.url,
    publishedAt: raw.publishedAt,
    sentiment: raw.sentiment,
    relevance: raw.relevance,
    keywords: raw.keywords || [],
    relatedSymbols: raw.relatedSymbols || [],
    impact: raw.impact
  };
};

export const transformOnChainMetrics = (raw: any): HiveOnChainMetrics => {
  return {
    chain: raw.chain,
    metrics: raw.metrics || {},
    summary: {
      timeRange: raw.summary.timeRange,
      highlights: raw.summary.highlights || []
    }
  };
};

export const transformPortfolioAnalysis = (raw: any): HivePortfolioAnalysis => {
  return {
    totalValue: raw.portfolio.totalValue,
    totalCost: raw.portfolio.totalCost,
    pnl: raw.portfolio.pnl,
    pnlPercentage: raw.portfolio.pnlPercentage,
    holdings: raw.portfolio.holdings || [],
    defiPositions: raw.portfolio.defiPositions || [],
    nfts: raw.portfolio.nfts || [],
    analysis: raw.analysis
  };
};

// Response wrapper
export const createHiveResponse = <T>(
  data: T,
  metadata?: any
): HiveIntelligenceResponse<T> => {
  return {
    success: true,
    data,
    metadata: {
      timestamp: Date.now(),
      ...metadata
    }
  };
};

export default HiveIntelligenceConfig;