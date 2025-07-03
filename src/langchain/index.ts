/**
 * @fileoverview LangChain NLP Module Main Export
 * Comprehensive Natural Language Processing for DeFi operations
 */

// Core Modules
export * from './nlp/index.js';
export * from './processing/index.js';
export * from './conversation/index.js';
export * from './domain/index.js';

// Main NLP Engine
export { NLPEngine } from './NLPEngine.js';

// Integration Helpers
export { createNLPEngine, createDefaultConfig } from './factory.js';

// Types
export type {
  NLPEngineConfig,
  NLPProcessingPipeline,
  ProcessingResult
} from './types.js';