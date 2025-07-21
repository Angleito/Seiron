/**
 * Portfolio MCP TypeScript Interfaces
 * 
 * Shared type definitions for portfolio management via MCP protocol
 */

import { Either } from 'fp-ts/Either';
import { TaskEither } from 'fp-ts/TaskEither';

// Base Portfolio Types
export interface PortfolioAsset {
  id: string;
  address: string;
  symbol: string;
  name: string;
  chain: string;
  type: 'token' | 'lp' | 'nft' | 'derivative';
  metadata?: Record<string, any>;
}

export interface PortfolioHolding extends PortfolioAsset {
  balance: string;
  decimals: number;
  price: {
    usd: number;
    native: number;
    currency: string;
  };
  value: {
    usd: number;
    native: number;
  };
  allocation: number; // Percentage of portfolio
  performance: {
    '24h': number;
    '7d': number;
    '30d': number;
    '1y': number;
  };
}

// Portfolio Analytics Types
export interface PortfolioAnalytics {
  summary: {
    totalValue: number;
    totalAssets: number;
    totalChains: number;
    lastUpdated: Date;
  };
  composition: {
    byAssetType: Record<string, number>;
    byChain: Record<string, number>;
    byProtocol: Record<string, number>;
  };
  concentration: {
    herfindahlIndex: number;
    top5Percentage: number;
    largestPosition: {
      asset: string;
      percentage: number;
    };
  };
  diversification: {
    score: number; // 0-100
    recommendations: string[];
  };
}

// Risk Assessment Types
export interface RiskProfile {
  overallScore: number; // 0-100 (0 = low risk, 100 = high risk)
  categories: {
    market: number;
    liquidity: number;
    concentration: number;
    smart_contract: number;
    regulatory: number;
  };
  factors: RiskFactor[];
  recommendations: RiskRecommendation[];
}

export interface RiskFactor {
  name: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: number;
  description: string;
  mitigation?: string;
}

export interface RiskRecommendation {
  id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  action: string;
  expectedImpact: {
    riskReduction: number;
    costEstimate?: number;
    timeEstimate?: string;
  };
}

// Performance Tracking Types
export interface PerformanceData {
  portfolio: {
    current: number;
    initial: number;
    highWaterMark: number;
    lowWaterMark: number;
  };
  returns: {
    absolute: ReturnPeriods;
    percentage: ReturnPeriods;
    annualized: ReturnPeriods;
  };
  metrics: {
    sharpeRatio: number;
    sortinoRatio: number;
    maxDrawdown: number;
    volatility: number;
    beta: number;
    alpha: number;
    calmarRatio: number;
  };
  benchmark: {
    name: string;
    correlation: number;
    trackingError: number;
    informationRatio: number;
  };
}

export interface ReturnPeriods {
  '1d': number;
  '1w': number;
  '1m': number;
  '3m': number;
  '6m': number;
  '1y': number;
  'ytd': number;
  'all': number;
}

// Rebalancing Types
export interface RebalancingStrategy {
  id: string;
  name: string;
  type: 'threshold' | 'periodic' | 'tactical' | 'strategic';
  targetAllocation: AllocationTarget[];
  constraints: RebalancingConstraints;
  triggers: RebalancingTrigger[];
}

export interface AllocationTarget {
  category: string; // asset type, chain, or specific token
  target: number; // percentage
  tolerance: number; // +/- percentage
  minAllocation?: number;
  maxAllocation?: number;
}

export interface RebalancingConstraints {
  minTradeSize: number; // USD
  maxSlippage: number; // percentage
  maxGasCost: number; // USD
  blacklist?: string[]; // tokens to avoid
  whitelist?: string[]; // only these tokens
}

export interface RebalancingTrigger {
  type: 'deviation' | 'time' | 'market' | 'risk';
  condition: string;
  threshold: number;
}

export interface RebalancingPlan {
  id: string;
  strategy: string;
  created: Date;
  status: 'proposed' | 'approved' | 'executing' | 'completed' | 'cancelled';
  trades: RebalancingTrade[];
  impact: {
    beforeAllocation: Record<string, number>;
    afterAllocation: Record<string, number>;
    riskChange: number;
    expectedReturn: number;
    totalCost: number;
  };
}

export interface RebalancingTrade {
  id: string;
  type: 'sell' | 'buy' | 'swap';
  fromAsset?: PortfolioAsset;
  toAsset?: PortfolioAsset;
  amount: string;
  estimatedPrice: number;
  estimatedSlippage: number;
  estimatedGas: number;
  route?: string[]; // DEX routing path
}

// Tax Optimization Types
export interface TaxPosition {
  asset: PortfolioAsset;
  lots: TaxLot[];
  realizedGains: number;
  unrealizedGains: number;
  shortTermGains: number;
  longTermGains: number;
}

export interface TaxLot {
  id: string;
  quantity: string;
  costBasis: number;
  acquisitionDate: Date;
  currentValue: number;
  gainLoss: number;
  holdingPeriod: 'short' | 'long';
}

export interface TaxStrategy {
  type: 'harvest-loss' | 'harvest-gain' | 'lot-selection' | 'holding-period';
  positions: TaxPosition[];
  potentialSavings: number;
  actions: TaxAction[];
  constraints: {
    washSaleRule: boolean;
    minHoldingPeriod?: number;
    maxTaxLiability?: number;
  };
}

export interface TaxAction {
  type: 'sell' | 'hold' | 'exchange';
  position: TaxPosition;
  lots: TaxLot[];
  reason: string;
  taxImpact: number;
  timing: 'immediate' | 'deferred' | Date;
}

// Integration Types
export interface PortfolioDataSource {
  type: 'blockchain' | 'cex' | 'defi' | 'manual';
  name: string;
  enabled: boolean;
  config: Record<string, any>;
  lastSync?: Date;
  status: 'connected' | 'syncing' | 'error' | 'disconnected';
}

export interface PriceOracle {
  name: string;
  priority: number;
  supported: string[]; // asset types or specific tokens
  endpoint: string;
  rateLimit?: number;
}

// MCP Protocol Types
export interface PortfolioMCPRequest {
  method: string;
  params: Record<string, any>;
  context: {
    walletAddress: string;
    timestamp: number;
    requestId: string;
  };
}

export interface PortfolioMCPResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    timestamp: number;
    processingTime: number;
    version: string;
  };
}

// Service Interface Types
export interface IPortfolioMCPService {
  // Portfolio Analysis
  getPortfolioSnapshot(walletAddress: string): TaskEither<Error, PortfolioHolding[]>;
  analyzePortfolio(walletAddress: string): TaskEither<Error, PortfolioAnalytics>;
  
  // Risk Assessment
  assessRisk(walletAddress: string): TaskEither<Error, RiskProfile>;
  calculateVaR(walletAddress: string, confidence: number): TaskEither<Error, number>;
  
  // Performance Tracking
  getPerformance(walletAddress: string, period?: string): TaskEither<Error, PerformanceData>;
  compareToIndex(walletAddress: string, index: string): TaskEither<Error, any>;
  
  // Rebalancing
  proposeRebalancing(walletAddress: string, strategy: RebalancingStrategy): TaskEither<Error, RebalancingPlan>;
  executeRebalancing(planId: string): TaskEither<Error, void>;
  
  // Tax Optimization
  analyzeTaxPositions(walletAddress: string): TaskEither<Error, TaxPosition[]>;
  proposeTaxStrategy(walletAddress: string, goals: any): TaskEither<Error, TaxStrategy>;
}

// Event Types
export type PortfolioMCPEvent =
  | { type: 'portfolio:updated'; data: PortfolioHolding[] }
  | { type: 'risk:alert'; data: RiskFactor }
  | { type: 'rebalance:needed'; data: RebalancingTrigger }
  | { type: 'performance:milestone'; data: any }
  | { type: 'tax:event'; data: TaxAction };

export default {
  // Re-export main types for convenience
  PortfolioAsset,
  PortfolioHolding,
  PortfolioAnalytics,
  RiskProfile,
  PerformanceData,
  RebalancingStrategy,
  RebalancingPlan,
  TaxStrategy,
  PortfolioMCPRequest,
  PortfolioMCPResponse,
  IPortfolioMCPService,
  PortfolioMCPEvent
};