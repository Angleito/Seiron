// Market Actions Module
// Exports all market-related actions for the ElizaOS market agent

export { monitorAction } from './monitor';
export { analyzeAction } from './analyze';

// Re-export types for convenience
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