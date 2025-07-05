// Sei AI Portfolio Manager - Main Entry Point

// Core portfolio management modules
export * from './chat/ChatInterface';
export * from './ai/AIDecisionEngine';
export { PortfolioManager, PortfolioConfig, PortfolioSummary, LiquidityPosition, StakingPosition, Performance } from './portfolio/PortfolioManager';
export { LendingManager, LendingConfig, LendingParams, LendingRate, ProtocolComparison } from './lending/LendingManager';
export { LendingPosition } from './lending/LendingManager';
export * from './liquidity/LiquidityManager';

// Data collection for training (kept for model improvement)
export * from './collectors/chain';
export * from './collectors/defi';
export * from './collectors/oracle';

// AI model training utilities - excluding types that are re-exported from types/index.ts
export { 
  preprocessDataset,
  validateDataset,
  PreprocessConfig,
  TrainingDataset
} from './training/prepare';
export * from './training/openai';

// Utilities - excluding types that are re-exported from types/index.ts
export * from './utils/math';
export {
  formatTimestamp,
  getRelativeTime,
  getStartOfDay,
  getEndOfDay,
  getTimeRangeForPeriod,
  parsePeriodToMs,
  roundToInterval,
  generateTimeSeries,
  TimeRange,
  TimePeriod
} from './utils/time';
export * from './utils/sei';

// Types - this includes TrainingDataset and TimeRange
export * from './types';

// Configuration
export { loadConfiguration } from './config';

// Main portfolio manager class
export { AIPortfolioManager } from './AIPortfolioManager';

// Version
export const VERSION = '1.0.0';