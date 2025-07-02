// Sei AI Portfolio Manager - Main Entry Point

// Core portfolio management modules
export * from './chat/ChatInterface';
export * from './ai/AIDecisionEngine';
export * from './portfolio/PortfolioManager';
export * from './lending/LendingManager';
export * from './liquidity/LiquidityManager';

// Data collection for training (kept for model improvement)
export * from './collectors/chain';
export * from './collectors/defi';
export * from './collectors/oracle';

// AI model training utilities
export * from './training/prepare';
export * from './training/openai';

// Utilities
export * from './utils/math';
export * from './utils/time';
export * from './utils/sei';

// Types
export * from './types';

// Configuration
export { loadConfiguration } from './config';

// Main portfolio manager class
export { AIPortfolioManager } from './AIPortfolioManager';

// Version
export const VERSION = '1.0.0';