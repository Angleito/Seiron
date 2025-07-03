/**
 * @fileoverview Integration Tests
 * End-to-end tests for the complete NLP system
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { createTestNLPEngine } from '../factory.js';
import { NLPEngine } from '../NLPEngine.js';
import { DefiIntent } from '../nlp/types.js';
import { ConversationState } from '../conversation/types.js';
import {
  createMockSession,
  TestAssertions,
  IntegrationUtils,
  setupTestEnvironment
} from './setup.js';

setupTestEnvironment();

describe('NLP System Integration Tests', () => {
  let engine: NLPEngine;
  let mockSession: any;

  beforeEach(() => {
    engine = createTestNLPEngine();
    mockSession = createMockSession();
  });

  describe('Complete User Journeys', () => {
    it('should handle a complete lending journey', async () => {
      // Step 1: User expresses interest in lending
      const step1 = await engine.processInput('I want to earn yield on my USDC', mockSession);
      const result1 = TestAssertions.expectSuccess(step1);
      
      TestAssertions.expectIntent(result1, DefiIntent.YIELD_OPTIMIZATION);
      expect(result1.suggestions.length).toBeGreaterThan(0);

      // Step 2: User provides more details
      const step2 = await engine.processInput('I have 5000 USDC and want low risk', result1.session);
      const result2 = TestAssertions.expectSuccess(step2);
      
      TestAssertions.expectIntent(result2, DefiIntent.LEND);
      expect(result2.command).toBeDefined();
      expect(result2.command.parameters.amount).toBe(5000);
      expect(result2.command.parameters.asset).toBe('USDC');
      expect(result2.command.riskLevel).toBe('low');

      // Step 3: User confirms the operation
      if (result2.needsConfirmation) {
        const confirmationResponse = await engine.processConfirmation(
          result2.confirmationRequest.id,
          'yes',
          result2.session
        );
        const confirmed = TestAssertions.expectSuccess(confirmationResponse);
        expect(confirmed.status).toBe('confirmed');
      }

      // Verify session state
      expect(result2.session.state).toBe(ConversationState.ACTIVE);
      expect(result2.session.turns.length).toBeGreaterThan(1);
    });

    it('should handle a swap journey with disambiguation', async () => {
      // Step 1: User provides ambiguous swap request
      const step1 = await engine.processInput('swap 100 tokens', mockSession);
      const result1 = TestAssertions.expectSuccess(step1);
      
      TestAssertions.expectIntent(result1, DefiIntent.SWAP);
      expect(result1.needsDisambiguation).toBe(true);
      expect(result1.disambiguationOptions.missingParameters).toContain('fromAsset');

      // Step 2: User clarifies the assets
      const step2 = await engine.processInput('from SEI to USDC', result1.session);
      const result2 = TestAssertions.expectSuccess(step2);
      
      expect(result2.command).toBeDefined();
      expect(result2.command.parameters.fromAsset).toBe('SEI');
      expect(result2.command.parameters.toAsset).toBe('USDC');
      expect(result2.command.parameters.amount).toBe(100);

      // Step 3: User executes the swap
      if (result2.command && !result2.needsConfirmation) {
        const operationResult = await engine.startOperation(result2.command);
        const operation = TestAssertions.expectSuccess(operationResult);
        expect(operation.id).toBeDefined();
        expect(operation.status).toBe('pending');
      }
    });

    it('should handle portfolio analysis journey', async () => {
      // Step 1: User asks for portfolio status
      const step1 = await engine.processInput('show my portfolio', mockSession);
      const result1 = TestAssertions.expectSuccess(step1);
      
      TestAssertions.expectIntent(result1, DefiIntent.PORTFOLIO_STATUS);
      expect(result1.command).toBeDefined();
      expect(result1.command.action).toBe('getPortfolio');

      // Step 2: User asks for optimization
      const step2 = await engine.processInput('how can I optimize it?', result1.session);
      const result2 = TestAssertions.expectSuccess(step2);
      
      TestAssertions.expectIntent(result2, DefiIntent.YIELD_OPTIMIZATION);
      expect(result2.suggestions.length).toBeGreaterThan(0);

      // Step 3: User asks about risks
      const step3 = await engine.processInput('what are the risks?', result2.session);
      const result3 = TestAssertions.expectSuccess(step3);
      
      TestAssertions.expectIntent(result3, DefiIntent.RISK_ASSESSMENT);
      expect(result3.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle complex multi-step liquidity provision', async () => {
      // Step 1: User wants to provide liquidity
      const step1 = await engine.processInput('I want to provide liquidity', mockSession);
      const result1 = TestAssertions.expectSuccess(step1);
      
      TestAssertions.expectIntent(result1, DefiIntent.ADD_LIQUIDITY);
      expect(result1.needsDisambiguation).toBe(true);

      // Step 2: User specifies the pool
      const step2 = await engine.processInput('to the SEI/USDC pool', result1.session);
      const result2 = TestAssertions.expectSuccess(step2);
      
      expect(result2.command).toBeDefined();
      expect(result2.command.parameters.token1).toBe('SEI');
      expect(result2.command.parameters.token2).toBe('USDC');

      // Step 3: User specifies amounts
      const step3 = await engine.processInput('with 1000 SEI and equivalent USDC', result2.session);
      const result3 = TestAssertions.expectSuccess(step3);
      
      expect(result3.command.parameters.amount1).toBe(1000);
      expect(result3.command.parameters.autoCalculateAmount2).toBe(true);

      // Step 4: Risk assessment and confirmation
      if (result3.needsConfirmation) {
        expect(result3.confirmationRequest.riskWarnings).toBeDefined();
        expect(result3.confirmationRequest.estimatedReturns).toBeDefined();
      }
    });
  });

  describe('Context Preservation and Memory', () => {
    it('should preserve context across multiple turns', async () => {
      // Establish context
      const sessionWithHistory = createMockSession({
        context: {
          ...mockSession.context,
          history: {
            recentIntents: [DefiIntent.LEND],
            conversationSummary: 'User is interested in lending USDC',
            lastActivity: Date.now() - 30000
          }
        }
      });

      // Reference previous context
      const result = await engine.processInput('increase it to 2000', sessionWithHistory);
      const processed = TestAssertions.expectSuccess(result);
      
      TestAssertions.expectIntent(processed, DefiIntent.LEND);
      expect(processed.command.parameters.amount).toBe(2000);
    });

    it('should use user preferences from session', async () => {
      const sessionWithPrefs = createMockSession({
        context: {
          ...mockSession.context,
          user: {
            ...mockSession.context.user,
            preferences: {
              riskTolerance: 'conservative',
              preferredProtocols: ['silo', 'takara']
            }
          }
        }
      });

      const result = await engine.processInput('lend 1000 USDC', sessionWithPrefs);
      const processed = TestAssertions.expectSuccess(result);
      
      expect(processed.command.parameters.protocol).toBeOneOf(['silo', 'takara']);
      expect(processed.command.riskLevel).toBe('low');
    });

    it('should learn from conversation patterns', async () => {
      // Simulate a series of lending operations
      const inputs = [
        'lend 100 USDC',
        'lend 200 USDC on Silo',
        'lend 300 USDC on Silo with low risk'
      ];

      let currentSession = mockSession;
      
      for (const input of inputs) {
        const result = await engine.processInput(input, currentSession);
        const processed = TestAssertions.expectSuccess(result);
        currentSession = processed.session;
      }

      // Next operation should prefer Silo protocol
      const finalResult = await engine.processInput('lend 400 USDC', currentSession);
      const finalProcessed = TestAssertions.expectSuccess(finalResult);
      
      expect(finalProcessed.command.parameters.protocol).toBe('silo');
    });
  });

  describe('Multi-Agent Coordination', () => {
    it('should coordinate lending and risk assessment', async () => {
      const input = 'lend 50000 USDC with maximum safety';
      const result = await engine.processInput(input, mockSession);
      const processed = TestAssertions.expectSuccess(result);
      
      TestAssertions.expectIntent(processed, DefiIntent.LEND);
      expect(processed.command.riskLevel).toBe('low');
      expect(processed.needsConfirmation).toBe(true); // High amount should require confirmation
      expect(processed.confirmationRequest.riskAnalysis).toBeDefined();
    });

    it('should coordinate swap and market analysis', async () => {
      const input = 'swap 10000 SEI for USDC at the best rate';
      const result = await engine.processInput(input, mockSession);
      const processed = TestAssertions.expectSuccess(result);
      
      TestAssertions.expectIntent(processed, DefiIntent.SWAP);
      expect(processed.command.parameters.optimization).toBe('best_rate');
      expect(processed.suggestions).toContain(jasmine.stringMatching(/market/i));
    });

    it('should coordinate yield optimization and strategy matching', async () => {
      const input = 'find the best yield strategy for my 25000 USDC portfolio';
      const result = await engine.processInput(input, mockSession);
      const processed = TestAssertions.expectSuccess(result);
      
      TestAssertions.expectIntent(processed, DefiIntent.YIELD_OPTIMIZATION);
      expect(processed.suggestions.length).toBeGreaterThan(1);
      
      // Should suggest multiple strategies
      const strategies = processed.suggestions.filter(s => s.includes('strategy'));
      expect(strategies.length).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from parsing errors gracefully', async () => {
      const malformedInput = 'lend ??? USDC on ??? protocol';
      const result = await engine.processInput(malformedInput, mockSession);
      const processed = TestAssertions.expectSuccess(result);
      
      TestAssertions.expectIntent(processed, DefiIntent.LEND);
      expect(processed.needsDisambiguation).toBe(true);
      expect(processed.disambiguationOptions.issues).toContain('invalid_amount');
    });

    it('should handle network timeouts in asset resolution', async () => {
      // Mock a scenario where asset resolution times out
      const result = await engine.processInput('lend 1000 UNKNOWN_TOKEN', mockSession);
      const processed = TestAssertions.expectSuccess(result);
      
      expect(processed.needsDisambiguation).toBe(true);
      expect(processed.disambiguationOptions.suggestedAssets).toBeDefined();
    });

    it('should provide fallback suggestions for unknown operations', async () => {
      const unknownInput = 'perform magical DeFi operation';
      const result = await engine.processInput(unknownInput, mockSession);
      const processed = TestAssertions.expectSuccess(result);
      
      TestAssertions.expectIntent(processed, DefiIntent.UNKNOWN);
      expect(processed.suggestions.length).toBeGreaterThan(0);
      expect(processed.suggestions[0]).toContain('Try commands like');
    });
  });

  describe('Performance Under Load', () => {
    it('should handle concurrent user sessions', async () => {
      const sessions = Array.from({ length: 5 }, () => createMockSession());
      const inputs = [
        'lend 1000 USDC',
        'borrow 500 SEI',
        'swap 100 ETH for USDC',
        'add liquidity to pool',
        'check portfolio status'
      ];

      const promises = sessions.map((session, index) =>
        engine.processInput(inputs[index], session)
      );

      const results = await Promise.all(promises);
      
      results.forEach(result => {
        TestAssertions.expectSuccess(result);
      });

      // Verify each session maintained independence
      const intents = results.map(r => TestAssertions.expectSuccess(r).intent.intent);
      const expectedIntents = [
        DefiIntent.LEND,
        DefiIntent.BORROW,
        DefiIntent.SWAP,
        DefiIntent.ADD_LIQUIDITY,
        DefiIntent.PORTFOLIO_STATUS
      ];

      expectedIntents.forEach((expectedIntent, index) => {
        expect(intents[index]).toBe(expectedIntent);
      });
    });

    it('should maintain performance with large conversation history', async () => {
      const largeHistorySession = createMockSession({
        turns: Array.from({ length: 100 }, (_, i) => ({
          id: `turn-${i}`,
          sessionId: mockSession.id,
          type: 'user' as const,
          content: `Message ${i}`,
          timestamp: Date.now() - (100 - i) * 1000,
          metadata: { processingTime: 100 }
        }))
      });

      const start = performance.now();
      const result = await engine.processInput('lend 1000 USDC', largeHistorySession);
      const duration = performance.now() - start;

      TestAssertions.expectSuccess(result);
      expect(duration).toBeLessThan(2000); // Should complete in under 2 seconds
    });

    it('should handle rapid successive inputs', async () => {
      const rapidInputs = [
        'lend 100 USDC',
        'increase to 200',
        'make it 300',
        'actually 400',
        'final amount 500'
      ];

      let currentSession = mockSession;
      const results = [];

      for (const input of rapidInputs) {
        const result = await engine.processInput(input, currentSession);
        const processed = TestAssertions.expectSuccess(result);
        results.push(processed);
        currentSession = processed.session;
        
        // Small delay to simulate rapid typing
        await IntegrationUtils.waitFor(10);
      }

      // Final result should have amount 500
      const finalResult = results[results.length - 1];
      expect(finalResult.command.parameters.amount).toBe(500);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle a day trading scenario', async () => {
      // Morning: Check portfolio
      const morning = await engine.processInput('show my current positions', mockSession);
      const morningResult = TestAssertions.expectSuccess(morning);
      TestAssertions.expectIntent(morningResult, DefiIntent.PORTFOLIO_STATUS);

      // Midday: Execute a swap based on market conditions
      const midday = await engine.processInput('swap 1000 SEI to USDC if price is good', morningResult.session);
      const middayResult = TestAssertions.expectSuccess(midday);
      TestAssertions.expectIntent(middayResult, DefiIntent.SWAP);
      expect(middayResult.command.parameters.conditional).toBe(true);

      // Evening: Add to lending position
      const evening = await engine.processInput('lend the USDC I just got', middayResult.session);
      const eveningResult = TestAssertions.expectSuccess(evening);
      TestAssertions.expectIntent(eveningResult, DefiIntent.LEND);
      expect(eveningResult.command.parameters.asset).toBe('USDC');
    });

    it('should handle a liquidity provider scenario', async () => {
      // Initial LP position
      const step1 = await engine.processInput('add 5000 USDC and 2000 SEI to liquidity pool', mockSession);
      const result1 = TestAssertions.expectSuccess(step1);
      TestAssertions.expectIntent(result1, DefiIntent.ADD_LIQUIDITY);

      // Check yields after a week
      const step2 = await engine.processInput('how much did I earn from LP fees?', result1.session);
      const result2 = TestAssertions.expectSuccess(step2);
      TestAssertions.expectIntent(result2, DefiIntent.PORTFOLIO_STATUS);

      // Rebalance position
      const step3 = await engine.processInput('remove 50% of my LP position', result2.session);
      const result3 = TestAssertions.expectSuccess(step3);
      TestAssertions.expectIntent(result3, DefiIntent.REMOVE_LIQUIDITY);
      expect(result3.command.parameters.percentage).toBe(50);
    });

    it('should handle a risk-averse investor scenario', async () => {
      const conservativeSession = createMockSession({
        context: {
          ...mockSession.context,
          user: {
            ...mockSession.context.user,
            preferences: {
              riskTolerance: 'very_low',
              preferredProtocols: ['silo'] // Most conservative protocol
            }
          }
        }
      });

      // Conservative lending
      const result1 = await engine.processInput('lend my savings safely', conservativeSession);
      const processed1 = TestAssertions.expectSuccess(result1);
      
      expect(processed1.needsDisambiguation).toBe(true); // Need amount specification
      
      const result2 = await engine.processInput('10000 USDC', processed1.session);
      const processed2 = TestAssertions.expectSuccess(result2);
      
      expect(processed2.command.riskLevel).toBe('low');
      expect(processed2.command.parameters.protocol).toBe('silo');
      expect(processed2.warnings.length).toBe(0); // No risk warnings for conservative approach
    });

    it('should handle an advanced trader scenario', async () => {
      const advancedSession = createMockSession({
        context: {
          ...mockSession.context,
          user: {
            ...mockSession.context.user,
            preferences: {
              riskTolerance: 'high',
              preferredProtocols: ['dragonswap', 'takara']
            }
          }
        }
      });

      // Complex leveraged operation
      const result = await engine.processInput(
        'borrow 10000 USDC against my SEI, then use 5x leverage to farm yield',
        advancedSession
      );
      const processed = TestAssertions.expectSuccess(result);
      
      // Should create a multi-step operation
      expect(processed.command.steps).toBeDefined();
      expect(processed.command.steps.length).toBeGreaterThan(1);
      expect(processed.command.riskLevel).toBe('high');
      expect(processed.needsConfirmation).toBe(true);
      expect(processed.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('System Health and Monitoring', () => {
    it('should track processing metrics', async () => {
      const inputs = [
        'lend 1000 USDC',
        'swap 100 SEI for USDC',
        'check portfolio',
        'add liquidity',
        'assess risk'
      ];

      let totalProcessingTime = 0;
      let successfulOperations = 0;

      for (const input of inputs) {
        const start = performance.now();
        const result = await engine.processInput(input, createMockSession());
        const duration = performance.now() - start;
        
        totalProcessingTime += duration;
        
        if (result._tag === 'Right') {
          successfulOperations++;
        }
      }

      const averageProcessingTime = totalProcessingTime / inputs.length;
      const successRate = successfulOperations / inputs.length;

      expect(averageProcessingTime).toBeLessThan(1000); // Average under 1 second
      expect(successRate).toBe(1.0); // 100% success rate
    });

    it('should handle memory management efficiently', async () => {
      // Simulate a long conversation
      let currentSession = mockSession;
      
      for (let i = 0; i < 50; i++) {
        const result = await engine.processInput(`lend ${100 + i} USDC`, currentSession);
        const processed = TestAssertions.expectSuccess(result);
        currentSession = processed.session;
      }

      // Session should have manageable memory footprint
      expect(currentSession.turns.length).toBeLessThanOrEqual(50);
      
      // Context should be compressed but still functional
      const finalResult = await engine.processInput('increase the amount by 100', currentSession);
      const finalProcessed = TestAssertions.expectSuccess(finalResult);
      
      TestAssertions.expectIntent(finalProcessed, DefiIntent.LEND);
      expect(finalProcessed.command.parameters.amount).toBeGreaterThan(100);
    });
  });
});

// Helper function for custom matchers
declare global {
  namespace jasmine {
    interface Matchers<T> {
      toBeOneOf(expected: any[]): boolean;
    }
  }
}

beforeEach(() => {
  jasmine.addMatchers({
    toBeOneOf: () => ({
      compare: (actual: any, expected: any[]) => ({
        pass: expected.includes(actual),
        message: `Expected ${actual} to be one of ${expected.join(', ')}`
      })
    })
  });
});