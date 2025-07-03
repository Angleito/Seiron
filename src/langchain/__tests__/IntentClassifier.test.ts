/**
 * @fileoverview Intent Classifier Tests
 * Tests for the intent classification system
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { IntentClassifier } from '../nlp/IntentClassifier.js';
import { DefiIntent, NLPConfig } from '../nlp/types.js';
import { TestData, TestAssertions, setupTestEnvironment } from './setup.js';

setupTestEnvironment();

describe('IntentClassifier', () => {
  let classifier: IntentClassifier;
  let config: NLPConfig;

  beforeEach(() => {
    config = {
      enableContextualAnalysis: true,
      enableEntityCaching: true,
      enableLearning: false,
      confidenceThreshold: 0.7,
      maxContextTurns: 10,
      enableMultiLanguage: false,
      defaultLanguage: 'en',
      enableFallback: true,
      enableLogging: false,
      enableMetrics: false
    };
    classifier = new IntentClassifier(config);
  });

  describe('Basic Intent Classification', () => {
    it('should classify lending intents', async () => {
      const testCases = [
        'lend 1000 USDC',
        'I want to lend my tokens',
        'supply USDC to earn yield',
        'deposit for lending',
        'provide liquidity as lender'
      ];

      for (const input of testCases) {
        const result = await classifier.classifyIntent(input);
        const classification = TestAssertions.expectSuccess(result);
        expect(classification.intent).toBe(DefiIntent.LEND);
        expect(classification.confidence).toBeGreaterThan(0.7);
      }
    });

    it('should classify borrowing intents', async () => {
      const testCases = [
        'borrow 500 USDC',
        'I need to borrow money',
        'take a loan against my collateral',
        'get a loan of 1000 USDC',
        'borrow against my SEI'
      ];

      for (const input of testCases) {
        const result = await classifier.classifyIntent(input);
        const classification = TestAssertions.expectSuccess(result);
        expect(classification.intent).toBe(DefiIntent.BORROW);
        expect(classification.confidence).toBeGreaterThan(0.7);
      }
    });

    it('should classify swap intents', async () => {
      const testCases = [
        'swap 100 SEI for USDC',
        'exchange SEI to USDC',
        'trade my SEI for stablecoins',
        'convert 500 SEI to USDC',
        'sell SEI for USDC'
      ];

      for (const input of testCases) {
        const result = await classifier.classifyIntent(input);
        const classification = TestAssertions.expectSuccess(result);
        expect(classification.intent).toBe(DefiIntent.SWAP);
        expect(classification.confidence).toBeGreaterThan(0.7);
      }
    });

    it('should classify liquidity provision intents', async () => {
      const testCases = [
        'add liquidity to SEI/USDC pool',
        'provide liquidity for trading pair',
        'become a liquidity provider',
        'add to LP pool',
        'provide liquidity to earn fees'
      ];

      for (const input of testCases) {
        const result = await classifier.classifyIntent(input);
        const classification = TestAssertions.expectSuccess(result);
        expect(classification.intent).toBe(DefiIntent.ADD_LIQUIDITY);
        expect(classification.confidence).toBeGreaterThan(0.7);
      }
    });

    it('should classify liquidity removal intents', async () => {
      const testCases = [
        'remove liquidity from pool',
        'withdraw my LP tokens',
        'exit liquidity position',
        'remove from LP pool',
        'unstake LP tokens'
      ];

      for (const input of testCases) {
        const result = await classifier.classifyIntent(input);
        const classification = TestAssertions.expectSuccess(result);
        expect(classification.intent).toBe(DefiIntent.REMOVE_LIQUIDITY);
        expect(classification.confidence).toBeGreaterThan(0.7);
      }
    });

    it('should classify portfolio status intents', async () => {
      const testCases = [
        'show my portfolio',
        'check my positions',
        'what are my holdings',
        'portfolio overview',
        'display my assets'
      ];

      for (const input of testCases) {
        const result = await classifier.classifyIntent(input);
        const classification = TestAssertions.expectSuccess(result);
        expect(classification.intent).toBe(DefiIntent.PORTFOLIO_STATUS);
        expect(classification.confidence).toBeGreaterThan(0.7);
      }
    });

    it('should classify yield optimization intents', async () => {
      const testCases = [
        'optimize my yield',
        'find best yield strategy',
        'maximize my returns',
        'get highest APY',
        'best yield farming opportunity'
      ];

      for (const input of testCases) {
        const result = await classifier.classifyIntent(input);
        const classification = TestAssertions.expectSuccess(result);
        expect(classification.intent).toBe(DefiIntent.YIELD_OPTIMIZATION);
        expect(classification.confidence).toBeGreaterThan(0.7);
      }
    });

    it('should classify risk assessment intents', async () => {
      const testCases = [
        'assess risk of this strategy',
        'is this safe?',
        'what are the risks?',
        'check risk level',
        'evaluate safety'
      ];

      for (const input of testCases) {
        const result = await classifier.classifyIntent(input);
        const classification = TestAssertions.expectSuccess(result);
        expect(classification.intent).toBe(DefiIntent.RISK_ASSESSMENT);
        expect(classification.confidence).toBeGreaterThan(0.7);
      }
    });

    it('should classify arbitrage intents', async () => {
      const testCases = [
        'find arbitrage opportunities',
        'exploit price differences',
        'arbitrage between exchanges',
        'profit from price gaps',
        'cross-exchange arbitrage'
      ];

      for (const input of testCases) {
        const result = await classifier.classifyIntent(input);
        const classification = TestAssertions.expectSuccess(result);
        expect(classification.intent).toBe(DefiIntent.ARBITRAGE);
        expect(classification.confidence).toBeGreaterThan(0.7);
      }
    });

    it('should classify unknown intents', async () => {
      const testCases = [
        'hello',
        'what is DeFi?',
        'how does blockchain work?',
        'random text here',
        'tell me a joke'
      ];

      for (const input of testCases) {
        const result = await classifier.classifyIntent(input);
        const classification = TestAssertions.expectSuccess(result);
        expect(classification.intent).toBe(DefiIntent.UNKNOWN);
      }
    });
  });

  describe('Pattern-based Classification', () => {
    it('should use pattern matching for classification', async () => {
      const input = 'I want to lend my 1000 USDC tokens';
      const result = await classifier.classifyIntent(input);
      const classification = TestAssertions.expectSuccess(result);
      
      expect(classification.intent).toBe(DefiIntent.LEND);
      expect(classification.matchedPatterns).toContain('lend');
    });

    it('should handle multiple pattern matches', async () => {
      const input = 'swap and trade my SEI for USDC';
      const result = await classifier.classifyIntent(input);
      const classification = TestAssertions.expectSuccess(result);
      
      expect(classification.intent).toBe(DefiIntent.SWAP);
      expect(classification.matchedPatterns.length).toBeGreaterThan(1);
    });

    it('should prioritize stronger patterns', async () => {
      const input = 'I want to borrow money to lend elsewhere';
      const result = await classifier.classifyIntent(input);
      const classification = TestAssertions.expectSuccess(result);
      
      // Should prioritize the first/stronger intent
      expect([DefiIntent.BORROW, DefiIntent.LEND]).toContain(classification.intent);
    });
  });

  describe('Keyword-based Classification', () => {
    it('should use keyword scoring', async () => {
      const input = 'provide supply deposit lending yield';
      const result = await classifier.classifyIntent(input);
      const classification = TestAssertions.expectSuccess(result);
      
      expect(classification.intent).toBe(DefiIntent.LEND);
      expect(classification.keywordScore).toBeGreaterThan(0);
    });

    it('should handle keyword variations', async () => {
      const testCases = [
        { input: 'lending', expected: DefiIntent.LEND },
        { input: 'borrowing', expected: DefiIntent.BORROW },
        { input: 'swapping', expected: DefiIntent.SWAP },
        { input: 'trading', expected: DefiIntent.SWAP }
      ];

      for (const { input, expected } of testCases) {
        const result = await classifier.classifyIntent(input);
        const classification = TestAssertions.expectSuccess(result);
        expect(classification.intent).toBe(expected);
      }
    });
  });

  describe('Context-aware Classification', () => {
    it('should use conversation context', async () => {
      const context = {
        userId: 'test-user',
        conversationHistory: [
          {
            id: 'prev-1',
            userMessage: 'I want to earn yield',
            assistantResponse: 'I can help you find yield opportunities',
            intent: DefiIntent.YIELD_OPTIMIZATION,
            timestamp: Date.now() - 60000,
            successful: true
          }
        ]
      };

      const input = 'What options do I have?';
      const result = await classifier.classifyIntent(input, context);
      const classification = TestAssertions.expectSuccess(result);
      
      expect(classification.intent).toBe(DefiIntent.YIELD_OPTIMIZATION);
      expect(classification.contextScore).toBeGreaterThan(0);
    });

    it('should consider user preferences', async () => {
      const context = {
        userId: 'test-user',
        preferredProtocols: ['dragonswap'],
        riskTolerance: 'low',
        conversationHistory: []
      };

      const input = 'I want to use my preferred protocol';
      const result = await classifier.classifyIntent(input, context);
      const classification = TestAssertions.expectSuccess(result);
      
      expect(classification.contextScore).toBeGreaterThan(0);
    });

    it('should handle conversation continuation', async () => {
      const context = {
        userId: 'test-user',
        conversationHistory: [
          {
            id: 'prev-1',
            userMessage: 'I want to lend USDC',
            assistantResponse: 'How much would you like to lend?',
            intent: DefiIntent.LEND,
            timestamp: Date.now() - 30000,
            successful: true
          }
        ]
      };

      const input = '1000 tokens';
      const result = await classifier.classifyIntent(input, context);
      const classification = TestAssertions.expectSuccess(result);
      
      expect(classification.intent).toBe(DefiIntent.LEND);
      expect(classification.contextScore).toBeGreaterThan(0);
    });
  });

  describe('Confidence Scoring', () => {
    it('should provide confidence scores', async () => {
      const input = 'lend 1000 USDC';
      const result = await classifier.classifyIntent(input);
      const classification = TestAssertions.expectSuccess(result);
      
      expect(classification.confidence).toBeGreaterThan(0);
      expect(classification.confidence).toBeLessThanOrEqual(1);
    });

    it('should have higher confidence for clear intents', async () => {
      const clearInput = 'lend 1000 USDC to earn yield';
      const ambiguousInput = 'I want to do something with my money';
      
      const clearResult = await classifier.classifyIntent(clearInput);
      const ambiguousResult = await classifier.classifyIntent(ambiguousInput);
      
      const clearClassification = TestAssertions.expectSuccess(clearResult);
      const ambiguousClassification = TestAssertions.expectSuccess(ambiguousResult);
      
      expect(clearClassification.confidence).toBeGreaterThan(ambiguousClassification.confidence);
    });

    it('should meet minimum confidence threshold', async () => {
      const input = 'lend 1000 USDC';
      const result = await classifier.classifyIntent(input);
      const classification = TestAssertions.expectSuccess(result);
      
      expect(classification.confidence).toBeGreaterThanOrEqual(config.confidenceThreshold);
    });
  });

  describe('Multi-strategy Classification', () => {
    it('should combine multiple classification strategies', async () => {
      const input = 'I want to lend my USDC tokens for yield';
      const result = await classifier.classifyIntent(input);
      const classification = TestAssertions.expectSuccess(result);
      
      expect(classification.intent).toBe(DefiIntent.LEND);
      expect(classification.patternScore).toBeGreaterThan(0);
      expect(classification.keywordScore).toBeGreaterThan(0);
      expect(classification.structuralScore).toBeGreaterThan(0);
    });

    it('should handle conflicting strategies', async () => {
      const input = 'borrow to lend'; // Could be both borrow and lend
      const result = await classifier.classifyIntent(input);
      const classification = TestAssertions.expectSuccess(result);
      
      expect([DefiIntent.BORROW, DefiIntent.LEND]).toContain(classification.intent);
      expect(classification.confidence).toBeGreaterThan(0.5);
    });

    it('should provide strategy breakdown', async () => {
      const input = 'lend 1000 USDC';
      const result = await classifier.classifyIntent(input);
      const classification = TestAssertions.expectSuccess(result);
      
      expect(classification.strategyBreakdown).toBeDefined();
      expect(classification.strategyBreakdown.pattern).toBeGreaterThan(0);
      expect(classification.strategyBreakdown.keyword).toBeGreaterThan(0);
      expect(classification.strategyBreakdown.structural).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input', async () => {
      const input = '';
      const result = await classifier.classifyIntent(input);
      const classification = TestAssertions.expectSuccess(result);
      
      expect(classification.intent).toBe(DefiIntent.UNKNOWN);
      expect(classification.confidence).toBe(0);
    });

    it('should handle very long input', async () => {
      const input = 'I want to lend my USDC tokens '.repeat(100);
      const result = await classifier.classifyIntent(input);
      const classification = TestAssertions.expectSuccess(result);
      
      expect(classification.intent).toBe(DefiIntent.LEND);
    });

    it('should handle special characters', async () => {
      const input = 'lend 1,000.50 USDC @best_rate #defi';
      const result = await classifier.classifyIntent(input);
      const classification = TestAssertions.expectSuccess(result);
      
      expect(classification.intent).toBe(DefiIntent.LEND);
    });

    it('should handle mixed case', async () => {
      const input = 'LEND 1000 usdc';
      const result = await classifier.classifyIntent(input);
      const classification = TestAssertions.expectSuccess(result);
      
      expect(classification.intent).toBe(DefiIntent.LEND);
    });

    it('should handle typos', async () => {
      const input = 'lned 1000 USDC'; // "lned" instead of "lend"
      const result = await classifier.classifyIntent(input);
      const classification = TestAssertions.expectSuccess(result);
      
      // Should still classify as lend due to other context
      expect(classification.intent).toBe(DefiIntent.LEND);
    });
  });

  describe('Performance', () => {
    it('should classify intents quickly', async () => {
      const input = 'lend 1000 USDC';
      const start = performance.now();
      
      await classifier.classifyIntent(input);
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500); // Should complete in under 500ms
    });

    it('should handle concurrent classifications', async () => {
      const inputs = TestData.lendingInputs.concat(TestData.borrowingInputs);
      const promises = inputs.map(input => classifier.classifyIntent(input));
      
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        TestAssertions.expectSuccess(result);
      });
    });
  });

  describe('Configuration', () => {
    it('should respect confidence threshold', async () => {
      const lowThresholdConfig = { ...config, confidenceThreshold: 0.3 };
      const highThresholdConfig = { ...config, confidenceThreshold: 0.9 };
      
      const lowClassifier = new IntentClassifier(lowThresholdConfig);
      const highClassifier = new IntentClassifier(highThresholdConfig);
      
      const ambiguousInput = 'maybe do something';
      
      const lowResult = await lowClassifier.classifyIntent(ambiguousInput);
      const highResult = await highClassifier.classifyIntent(ambiguousInput);
      
      const lowClassification = TestAssertions.expectSuccess(lowResult);
      const highClassification = TestAssertions.expectSuccess(highResult);
      
      // High threshold should be more conservative
      expect(lowClassification.confidence).toBeGreaterThanOrEqual(0.3);
      expect(highClassification.intent).toBe(DefiIntent.UNKNOWN);
    });

    it('should handle contextual analysis toggle', async () => {
      const contextConfig = { ...config, enableContextualAnalysis: true };
      const noContextConfig = { ...config, enableContextualAnalysis: false };
      
      const contextClassifier = new IntentClassifier(contextConfig);
      const noContextClassifier = new IntentClassifier(noContextConfig);
      
      const context = {
        userId: 'test',
        conversationHistory: [
          {
            id: 'prev',
            userMessage: 'I want to lend',
            assistantResponse: 'How much?',
            intent: DefiIntent.LEND,
            timestamp: Date.now(),
            successful: true
          }
        ]
      };
      
      const input = '1000 USDC';
      
      const contextResult = await contextClassifier.classifyIntent(input, context);
      const noContextResult = await noContextClassifier.classifyIntent(input, context);
      
      const contextClassification = TestAssertions.expectSuccess(contextResult);
      const noContextClassification = TestAssertions.expectSuccess(noContextResult);
      
      expect(contextClassification.intent).toBe(DefiIntent.LEND);
      expect(noContextClassification.intent).toBe(DefiIntent.UNKNOWN);
    });
  });
});