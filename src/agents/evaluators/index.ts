// Evaluators Module
// Exports all evaluators for the ElizaOS agents

export { riskAssessmentEvaluator } from './riskAssessment';
export { yieldOptimizationEvaluator } from './yieldOptimization';
export { marketConditionsEvaluator } from './marketConditions';

// Re-export types for convenience
export type { 
  RiskMetrics, 
  RiskThresholds, 
  RiskAssessmentResult 
} from './riskAssessment';

export type { 
  YieldMetrics, 
  OptimizationStrategy, 
  OptimizationAction,
  YieldOptimizationResult,
  ExecutionPlan 
} from './yieldOptimization';

export type { 
  MarketMetrics, 
  MarketSignal, 
  MarketCorrelation,
  MarketRegime,
  MarketConditionsResult,
  MarketRecommendation,
  MarketAlert
} from './marketConditions';