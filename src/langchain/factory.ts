/**
 * @fileoverview NLP Engine Factory
 * Factory functions for creating NLP Engine instances with default configurations
 */

import { NLPEngine, NLPEngineConfig } from './NLPEngine.js';
import { NLPConfig } from './nlp/types.js';

/**
 * Default NLP Engine Configuration
 */
export const createDefaultConfig = (): NLPEngineConfig => ({
  nlp: {
    enableContextualAnalysis: true,
    enableEntityCaching: true,
    enableLearning: false,
    confidenceThreshold: 0.7,
    maxContextTurns: 10,
    enableMultiLanguage: false,
    defaultLanguage: 'en',
    enableFallback: true,
    enableLogging: true,
    enableMetrics: true
  },
  assetResolver: {
    minFuzzyScore: 0.6,
    maxSuggestions: 5,
    enableFuzzyMatching: true,
    preferStablecoins: true,
    preferPopular: true
  },
  amountParser: {
    minAmount: 0.01,
    maxAmount: 1000000000,
    defaultDecimals: 18,
    allowPercentages: true,
    allowRelativeAmounts: true
  },
  riskProfiler: {
    conservativeThreshold: 0.3,
    moderateThreshold: 0.6,
    aggressiveThreshold: 0.8,
    enableDynamicScoring: true,
    marketVolatilityWeight: 0.2
  },
  strategyMatcher: {
    minMatchScore: 0.5,
    maxResults: 10,
    enableDynamicAdjustments: true,
    preferPopularStrategies: true,
    riskAdjustmentFactor: 0.1
  },
  flowManager: {
    defaultTimeout: 300000, // 5 minutes
    maxFlowDuration: 3600000, // 1 hour
    enableFlowPersistence: true,
    autoAdvanceStages: true,
    debugMode: false
  },
  contextPreservation: {
    maxTurns: 50,
    maxAge: 3600000, // 1 hour
    preserveEntities: true,
    preserveParameters: true,
    preserveRiskAssessments: true,
    compressionThreshold: 0.8
  },
  confirmation: {
    type: 'risk_based',
    timeout: 30000,
    retryCount: 3,
    requireExplicitConsent: true,
    riskThreshold: 'medium'
  }
});

/**
 * Create NLP Engine with custom configuration
 */
export const createNLPEngine = (customConfig?: Partial<NLPEngineConfig>): NLPEngine => {
  const defaultConfig = createDefaultConfig();
  
  const mergedConfig: NLPEngineConfig = customConfig ? {
    ...defaultConfig,
    ...customConfig,
    nlp: { ...defaultConfig.nlp, ...customConfig.nlp },
    assetResolver: { ...defaultConfig.assetResolver, ...customConfig.assetResolver },
    amountParser: { ...defaultConfig.amountParser, ...customConfig.amountParser },
    riskProfiler: { ...defaultConfig.riskProfiler, ...customConfig.riskProfiler },
    strategyMatcher: { ...defaultConfig.strategyMatcher, ...customConfig.strategyMatcher },
    flowManager: { ...defaultConfig.flowManager, ...customConfig.flowManager },
    contextPreservation: { ...defaultConfig.contextPreservation, ...customConfig.contextPreservation },
    confirmation: { ...defaultConfig.confirmation, ...customConfig.confirmation }
  } : defaultConfig;

  return new NLPEngine(mergedConfig);
};

/**
 * Create NLP Engine with production configuration
 */
export const createProductionNLPEngine = (): NLPEngine => {
  return createNLPEngine({
    nlp: {
      enableLogging: false,
      enableMetrics: true,
      enableLearning: true,
      confidenceThreshold: 0.8
    },
    flowManager: {
      debugMode: false,
      defaultTimeout: 180000, // 3 minutes
      maxFlowDuration: 1800000 // 30 minutes
    },
    confirmation: {
      type: 'detailed',
      requireExplicitConsent: true,
      riskThreshold: 'medium'
    }
  });
};

/**
 * Create NLP Engine with development configuration
 */
export const createDevelopmentNLPEngine = (): NLPEngine => {
  return createNLPEngine({
    nlp: {
      enableLogging: true,
      enableMetrics: true,
      enableLearning: false,
      confidenceThreshold: 0.6
    },
    flowManager: {
      debugMode: true,
      defaultTimeout: 600000, // 10 minutes
      maxFlowDuration: 3600000 // 1 hour
    },
    confirmation: {
      type: 'simple',
      requireExplicitConsent: false,
      riskThreshold: 'low'
    }
  });
};

/**
 * Create NLP Engine with testing configuration
 */
export const createTestNLPEngine = (): NLPEngine => {
  return createNLPEngine({
    nlp: {
      enableLogging: false,
      enableMetrics: false,
      enableLearning: false,
      confidenceThreshold: 0.5
    },
    flowManager: {
      debugMode: true,
      defaultTimeout: 5000, // 5 seconds
      maxFlowDuration: 30000 // 30 seconds
    },
    confirmation: {
      type: 'simple',
      requireExplicitConsent: false,
      riskThreshold: 'low'
    }
  });
};