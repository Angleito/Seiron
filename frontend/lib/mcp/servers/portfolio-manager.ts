import type { MCPServerConfig } from '../../adapters/types';

/**
 * Portfolio Manager MCP Server Configuration for Frontend
 * 
 * This configuration connects the frontend to the portfolio management MCP server,
 * enabling real-time portfolio tracking, analysis, and optimization features.
 */

// TypeScript interfaces for portfolio data types
export interface PortfolioPosition {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  balance: string;
  decimals: number;
  valueUSD: number;
  percentageOfPortfolio: number;
  priceUSD: number;
  price24hChange: number;
  logoUri?: string;
  chain: string;
  isLPToken?: boolean;
  underlyingTokens?: PortfolioPosition[];
}

export interface PortfolioSnapshot {
  walletAddress: string;
  timestamp: number;
  totalValueUSD: number;
  totalValue24hChange: number;
  totalValue24hChangePercentage: number;
  positions: PortfolioPosition[];
  chains: string[];
  lastUpdated: Date;
}

export interface RiskMetrics {
  overallRiskScore: number; // 0-100
  volatility: number;
  valueAtRisk: number;
  sharpeRatio: number;
  maxDrawdown: number;
  liquidityScore: number;
  concentrationRisk: {
    topPositionPercentage: number;
    herfindahlIndex: number;
  };
  correlationRisk: number;
}

export interface RebalancingSuggestion {
  id: string;
  fromToken: {
    symbol: string;
    amount: string;
    valueUSD: number;
  };
  toToken: {
    symbol: string;
    amount: string;
    valueUSD: number;
  };
  reason: string;
  impact: {
    riskReduction: number;
    expectedReturn: number;
    gasEstimate: string;
  };
  priority: 'low' | 'medium' | 'high';
}

export interface TaxOptimizationSuggestion {
  id: string;
  action: 'harvest-loss' | 'defer-gain' | 'realize-gain';
  position: PortfolioPosition;
  taxImpact: number;
  savingsEstimate: number;
  deadline?: Date;
  description: string;
}

export interface PerformanceMetrics {
  returns: {
    day: number;
    week: number;
    month: number;
    quarter: number;
    year: number;
    allTime: number;
  };
  absoluteReturns: {
    day: number;
    week: number;
    month: number;
    quarter: number;
    year: number;
    allTime: number;
  };
  benchmarkComparison: {
    benchmark: string;
    alpha: number;
    beta: number;
    correlation: number;
    trackingError: number;
  };
  ratios: {
    sharpe: number;
    sortino: number;
    calmar: number;
    informationRatio: number;
  };
}

// MCP Client configuration
export const portfolioManagerClient: MCPServerConfig = {
  name: 'portfolio-manager',
  displayName: 'Portfolio Manager',
  description: 'Real-time portfolio tracking, analysis, and optimization',
  endpoint: process.env.NEXT_PUBLIC_PORTFOLIO_MCP_ENDPOINT || 'wss://portfolio-mcp.sei.network',
  version: '1.0.0',
  capabilities: [
    'portfolio-analysis',
    'risk-assessment',
    'performance-tracking',
    'rebalancing',
    'tax-optimization'
  ],
  
  // WebSocket configuration
  websocket: {
    reconnect: true,
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
    heartbeatInterval: 30000
  },
  
  // Authentication
  auth: {
    type: 'bearer',
    token: process.env.NEXT_PUBLIC_PORTFOLIO_MCP_TOKEN
  },
  
  // Request configuration
  requestConfig: {
    timeout: 30000,
    retryCount: 3,
    retryDelay: 1000
  }
};

// Available tools/methods
export const portfolioTools = {
  // Analysis tools
  analysis: {
    getPortfolioSnapshot: {
      description: 'Get current portfolio snapshot with positions and values',
      params: ['walletAddress', 'includeDeFi?', 'includeNFTs?']
    },
    analyzeComposition: {
      description: 'Analyze portfolio composition and diversification',
      params: ['walletAddress']
    },
    getHistoricalData: {
      description: 'Get historical portfolio performance data',
      params: ['walletAddress', 'timeframe', 'granularity?']
    }
  },
  
  // Risk tools
  risk: {
    calculateRiskMetrics: {
      description: 'Calculate comprehensive risk metrics',
      params: ['walletAddress', 'riskModel?']
    },
    assessLiquidity: {
      description: 'Assess portfolio liquidity risk',
      params: ['walletAddress', 'timeHorizon?']
    },
    runStressTest: {
      description: 'Run stress test scenarios',
      params: ['walletAddress', 'scenarios']
    }
  },
  
  // Performance tools
  performance: {
    getPerformanceMetrics: {
      description: 'Get detailed performance metrics',
      params: ['walletAddress', 'benchmark?']
    },
    compareToIndex: {
      description: 'Compare portfolio performance to market indices',
      params: ['walletAddress', 'indexSymbol', 'timeframe']
    },
    generateReport: {
      description: 'Generate performance report',
      params: ['walletAddress', 'reportType', 'timeframe', 'format?']
    }
  },
  
  // Optimization tools
  optimization: {
    getRebalancingSuggestions: {
      description: 'Get portfolio rebalancing suggestions',
      params: ['walletAddress', 'targetAllocation?', 'constraints?']
    },
    optimizeForTax: {
      description: 'Get tax optimization suggestions',
      params: ['walletAddress', 'taxJurisdiction', 'taxBracket?']
    },
    findYieldOpportunities: {
      description: 'Find yield optimization opportunities',
      params: ['walletAddress', 'riskTolerance']
    }
  }
};

// Event subscriptions
export const portfolioEvents = {
  // Real-time updates
  'portfolio:snapshot': 'Subscribe to portfolio snapshot updates',
  'portfolio:position:change': 'Subscribe to individual position changes',
  'portfolio:value:update': 'Subscribe to total value updates',
  
  // Alerts
  'portfolio:risk:alert': 'Subscribe to risk alerts',
  'portfolio:rebalance:needed': 'Subscribe to rebalancing alerts',
  'portfolio:milestone:reached': 'Subscribe to performance milestones',
  
  // Market events
  'portfolio:market:impact': 'Subscribe to market events affecting portfolio',
  'portfolio:price:update': 'Subscribe to price updates for holdings'
};

// Hooks for easy integration
export const usePortfolioManager = () => {
  // This would be implemented to provide easy React hooks
  // for portfolio functionality
  return {
    client: portfolioManagerClient,
    tools: portfolioTools,
    events: portfolioEvents
  };
};

// Export configuration
export default {
  client: portfolioManagerClient,
  tools: portfolioTools,
  events: portfolioEvents,
  usePortfolioManager
};