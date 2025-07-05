export interface Position {
  id: string;
  protocol: string;
  type: 'lending' | 'liquidity' | 'staking' | 'farming';
  asset: string;
  amount: bigint;
  value: number;
  apr: number;
  apy: number;
  healthFactor?: number;
  liquidationThreshold?: number;
  collateralValue?: number;
  debtValue?: number;
  lastUpdated: Date;
  metadata?: Record<string, unknown>;
}

export interface PortfolioMetrics {
  totalValue: number;
  totalChange24h: number;
  totalChangePercent24h: number;
  totalApy: number;
  riskScore: number;
  healthFactor: number;
  collateralizationRatio: number;
  liquidationRisk: 'low' | 'medium' | 'high';
}

export interface PortfolioState {
  positions: Position[];
  metrics: PortfolioMetrics;
  isLoading: boolean;
  lastUpdated: Date;
  error?: string;
}

export interface HistoricalDataPoint {
  timestamp: Date;
  totalValue: number;
  apy: number;
  riskScore: number;
}

export interface PortfolioAnalytics {
  performance: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  };
  riskMetrics: {
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
    diversificationScore: number;
  };
  exposure: {
    byProtocol: Record<string, number>;
    byAsset: Record<string, number>;
    byPositionType: Record<string, number>;
  };
  history: HistoricalDataPoint[];
}

export interface CacheConfig {
  ttl: number;
  maxEntries: number;
  strategy: 'lru' | 'ttl' | 'hybrid';
}

export interface PortfolioEvent {
  type: 'position_added' | 'position_removed' | 'position_updated' | 'portfolio_synced';
  timestamp: Date;
  data: unknown;
}

export type PositionUpdateCallback = (position: Position) => void;
export type PortfolioEventCallback = (event: PortfolioEvent) => void;