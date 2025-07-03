// Market Actions Module
// Exports all market-related actions for the enhanced ElizaOS market agent with Citrex trading

export { monitorAction } from './monitor';
export { analyzeAction } from './analyze';
export { default as tradingActions } from './trade';
export { default as riskManagementActions } from './riskManagement';

// Re-export types for convenience - Market Analysis
export type { 
  MonitorParams, 
  MonitorResult, 
  AssetMetrics, 
  Alert, 
  Opportunity 
} from './monitor';

export type { 
  AnalyzeParams, 
  AnalyzeResult, 
  AssetAnalysis, 
  TechnicalAnalysis,
  FundamentalAnalysis,
  SentimentAnalysis,
  MarketContext,
  Recommendation,
  RiskAssessment
} from './analyze';

// Re-export types for convenience - Trading Operations
export type {
  TradeParams,
  TradeResult,
  PositionParams,
  PositionResult,
  PositionData,
  RiskParams,
  RiskResult,
  RiskAlert
} from './trade';

// Re-export types for convenience - Risk Management
export type {
  LiquidationParams,
  LiquidationResult,
  LiquidationPositionInfo,
  ProtectiveAction,
  StopLossParams,
  StopLossResult
} from './riskManagement';