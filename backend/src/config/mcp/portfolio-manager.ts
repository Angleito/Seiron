import { MCPServerConfig } from '../../adapters/SeiMCPAdapter';
import type { 
  PortfolioPosition,
  PortfolioAnalytics,
  RiskMetrics,
  RebalancingStrategy,
  TaxOptimizationStrategy
} from '../../types/portfolio';

/**
 * Portfolio Manager MCP Server Configuration
 * 
 * This configuration defines the MCP server for portfolio management features,
 * including analysis tools, risk assessment, and performance tracking.
 */

// Portfolio-specific MCP tool definitions
export interface PortfolioMCPTool {
  name: string;
  description: string;
  category: 'analysis' | 'risk' | 'performance' | 'optimization' | 'reporting';
  parameters: Record<string, any>;
  returns: any;
  permissions?: string[];
}

// Portfolio data types for MCP communication
export interface PortfolioSnapshot {
  walletAddress: string;
  timestamp: number;
  totalValueUSD: number;
  positions: PortfolioPosition[];
  performance: PerformanceMetrics;
  risk: RiskMetrics;
}

export interface PerformanceMetrics {
  dayReturn: number;
  weekReturn: number;
  monthReturn: number;
  yearReturn: number;
  allTimeReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
}

export interface PortfolioAlert {
  id: string;
  type: 'risk' | 'opportunity' | 'rebalance' | 'tax';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  actionRequired?: boolean;
  suggestedActions?: string[];
}

// MCP Server Configuration
export const portfolioManagerConfig: MCPServerConfig = {
  endpoint: process.env.PORTFOLIO_MCP_ENDPOINT || 'portfolio-mcp.sei.network',
  port: parseInt(process.env.PORTFOLIO_MCP_PORT || '8082'),
  secure: process.env.NODE_ENV === 'production',
  apiKey: process.env.PORTFOLIO_MCP_API_KEY,
  network: (process.env.SEI_NETWORK || 'mainnet') as 'mainnet' | 'testnet' | 'devnet',
  connectionTimeout: 30000,
  heartbeatInterval: 15000,
  retryAttempts: 3,
  retryDelay: 1000
};

// Portfolio Management Tools
export const portfolioTools: PortfolioMCPTool[] = [
  // Portfolio Analysis Tools
  {
    name: 'analyzePortfolioComposition',
    description: 'Analyze the current composition and diversification of a portfolio',
    category: 'analysis',
    parameters: {
      walletAddress: { type: 'string', required: true },
      includeDeFi: { type: 'boolean', default: true },
      includeNFTs: { type: 'boolean', default: false }
    },
    returns: {
      type: 'object',
      properties: {
        composition: { type: 'object' },
        diversificationScore: { type: 'number' },
        concentrationRisk: { type: 'object' },
        suggestions: { type: 'array' }
      }
    }
  },
  {
    name: 'getHistoricalPerformance',
    description: 'Retrieve historical performance data for a portfolio',
    category: 'performance',
    parameters: {
      walletAddress: { type: 'string', required: true },
      timeframe: { type: 'string', enum: ['1d', '1w', '1m', '3m', '1y', 'all'] },
      granularity: { type: 'string', enum: ['hour', 'day', 'week', 'month'] }
    },
    returns: {
      type: 'object',
      properties: {
        dataPoints: { type: 'array' },
        summary: { type: 'object' },
        benchmarkComparison: { type: 'object' }
      }
    }
  },

  // Risk Assessment Tools
  {
    name: 'calculateRiskMetrics',
    description: 'Calculate comprehensive risk metrics for a portfolio',
    category: 'risk',
    parameters: {
      walletAddress: { type: 'string', required: true },
      riskModel: { type: 'string', enum: ['var', 'cvar', 'monte-carlo'], default: 'var' },
      confidenceLevel: { type: 'number', default: 0.95 }
    },
    returns: {
      type: 'object',
      properties: {
        valueAtRisk: { type: 'number' },
        conditionalVaR: { type: 'number' },
        beta: { type: 'number' },
        correlationMatrix: { type: 'object' },
        stressTestResults: { type: 'object' }
      }
    }
  },
  {
    name: 'assessLiquidityRisk',
    description: 'Assess liquidity risk across portfolio positions',
    category: 'risk',
    parameters: {
      walletAddress: { type: 'string', required: true },
      timeHorizon: { type: 'number', default: 7 }
    },
    returns: {
      type: 'object',
      properties: {
        liquidityScore: { type: 'number' },
        illiquidPositions: { type: 'array' },
        estimatedLiquidationTime: { type: 'object' },
        recommendations: { type: 'array' }
      }
    }
  },

  // Portfolio Optimization Tools
  {
    name: 'generateRebalancingSuggestions',
    description: 'Generate portfolio rebalancing suggestions based on target allocation',
    category: 'optimization',
    parameters: {
      walletAddress: { type: 'string', required: true },
      targetAllocation: { type: 'object' },
      constraints: { type: 'object' },
      optimizationGoal: { type: 'string', enum: ['risk', 'return', 'sharpe'] }
    },
    returns: {
      type: 'object',
      properties: {
        currentAllocation: { type: 'object' },
        suggestedTrades: { type: 'array' },
        expectedImprovement: { type: 'object' },
        estimatedCosts: { type: 'object' }
      }
    }
  },
  {
    name: 'optimizeTaxStrategy',
    description: 'Optimize portfolio for tax efficiency',
    category: 'optimization',
    parameters: {
      walletAddress: { type: 'string', required: true },
      taxJurisdiction: { type: 'string' },
      holdingPeriod: { type: 'object' },
      taxBracket: { type: 'number' }
    },
    returns: {
      type: 'object',
      properties: {
        taxLiability: { type: 'object' },
        harvestingOpportunities: { type: 'array' },
        holdingPeriodOptimization: { type: 'object' },
        estimatedSavings: { type: 'number' }
      }
    }
  },

  // Performance Tracking Tools
  {
    name: 'trackPerformanceMetrics',
    description: 'Track real-time performance metrics for a portfolio',
    category: 'performance',
    parameters: {
      walletAddress: { type: 'string', required: true },
      metrics: { type: 'array', items: { type: 'string' } },
      benchmark: { type: 'string' }
    },
    returns: {
      type: 'object',
      properties: {
        currentMetrics: { type: 'object' },
        benchmarkComparison: { type: 'object' },
        alerts: { type: 'array' }
      }
    }
  },
  {
    name: 'generatePerformanceReport',
    description: 'Generate comprehensive performance report',
    category: 'reporting',
    parameters: {
      walletAddress: { type: 'string', required: true },
      reportType: { type: 'string', enum: ['summary', 'detailed', 'tax'] },
      timeframe: { type: 'string' },
      format: { type: 'string', enum: ['json', 'pdf', 'csv'] }
    },
    returns: {
      type: 'object',
      properties: {
        report: { type: 'object' },
        downloadUrl: { type: 'string' },
        insights: { type: 'array' }
      }
    }
  }
];

// Event definitions for real-time portfolio updates
export const portfolioEvents = {
  PORTFOLIO_UPDATE: 'portfolio:update',
  POSITION_CHANGE: 'portfolio:position:change',
  RISK_ALERT: 'portfolio:risk:alert',
  REBALANCE_NEEDED: 'portfolio:rebalance:needed',
  PERFORMANCE_MILESTONE: 'portfolio:performance:milestone',
  TAX_EVENT: 'portfolio:tax:event'
};

// Integration configuration with existing systems
export const integrationConfig = {
  // Price feeds for portfolio valuation
  priceFeeds: {
    primary: 'coingecko',
    fallback: 'coinmarketcap',
    updateInterval: 60000 // 1 minute
  },
  
  // DeFi protocol integrations
  defiProtocols: {
    lending: ['aave', 'compound', 'maker'],
    dex: ['uniswap', 'sushiswap', 'curve'],
    yield: ['yearn', 'convex', 'beefy']
  },
  
  // Risk model configurations
  riskModels: {
    historicalVaR: {
      lookbackPeriod: 252, // 1 year of trading days
      confidenceLevel: 0.95
    },
    monteCarloVaR: {
      simulations: 10000,
      timeHorizon: 10
    }
  },
  
  // Performance calculation settings
  performanceSettings: {
    riskFreeRate: 0.02, // 2% annual
    benchmarkIndex: 'sei-defi-index',
    feeAdjustment: true
  }
};

export default {
  serverConfig: portfolioManagerConfig,
  tools: portfolioTools,
  events: portfolioEvents,
  integration: integrationConfig
};