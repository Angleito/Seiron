/**
 * MCP Server Configurations Export
 * Centralizes all MCP server configurations for frontend use
 */

// Hive Intelligence Server
export { HiveIntelligenceConfig } from './hive-intelligence'
export type { 
  HiveIntelligenceServerConfig,
  HiveMarketData,
  HiveSentimentAnalysis,
  HivePricePrediction,
  HiveTradingSignal,
  HiveNewsArticle,
  HiveOnChainMetrics,
  HivePortfolioAnalysis,
  HiveIntelligenceResponse
} from '../types/hive-intelligence'

// SEI Blockchain Server
export { SeiBlockchainConfig } from './sei-blockchain'
export type {
  SeiWalletBalance,
  SeiTransaction,
  SeiTransactionHistory,
  SeiDeFiPosition,
  SeiLiquidityPool,
  SeiStakingInfo,
  SeiTokenSwap,
  SeiTokenTransfer,
  SeiTokenMetadata,
  SeiValidatorInfo,
  SeiGovernanceProposal
} from './sei-blockchain'

// Portfolio Manager Server
export { PortfolioManagerConfig } from './portfolio-manager'
export type {
  PortfolioComposition,
  HistoricalPerformance,
  RiskMetrics,
  LiquidityRisk,
  RebalancingSuggestion,
  TaxOptimization,
  PerformanceMetrics,
  PerformanceReport
} from './portfolio-manager'

// Utility function to get all server configurations
export function getAllServerConfigs() {
  return {
    hiveIntelligence: HiveIntelligenceConfig,
    seiBlockchain: SeiBlockchainConfig,
    portfolioManager: PortfolioManagerConfig
  }
}

// Utility function to get server config by name
export function getServerConfig(name: string) {
  const configs = getAllServerConfigs()
  return configs[name as keyof typeof configs]
}