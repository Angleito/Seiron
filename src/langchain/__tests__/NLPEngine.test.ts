/**
 * @fileoverview NLP Engine Tests
 * Comprehensive tests for the main NLP Engine
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { NLPEngine } from '../NLPEngine.js';
import { DefiIntent } from '../nlp/types.js';
import { ConversationState } from '../conversation/types.js';
import {
  createTestEngine,
  createMockSession,
  TestData,
  TestAssertions,
  PerformanceUtils,
  ErrorUtils,
  MockData,
  setupTestEnvironment
} from './setup.js';

setupTestEnvironment();

describe('NLPEngine', () => {
  let engine: NLPEngine;
  let mockSession: any;

  beforeEach(() => {
    engine = createTestEngine();
    mockSession = createMockSession();
  });

  describe('Basic Intent Classification', () => {
    it('should classify lending intents correctly', async () => {
      for (const input of TestData.lendingInputs) {
        const result = await engine.processInput(input, mockSession);
        const processedResult = TestAssertions.expectSuccess(result);
        TestAssertions.expectIntent(processedResult, DefiIntent.LEND);
      }
    });

    it('should classify borrowing intents correctly', async () => {
      for (const input of TestData.borrowingInputs) {
        const result = await engine.processInput(input, mockSession);
        const processedResult = TestAssertions.expectSuccess(result);
        TestAssertions.expectIntent(processedResult, DefiIntent.BORROW);
      }
    });

    it('should classify swap intents correctly', async () => {
      for (const input of TestData.swapInputs) {
        const result = await engine.processInput(input, mockSession);
        const processedResult = TestAssertions.expectSuccess(result);
        TestAssertions.expectIntent(processedResult, DefiIntent.SWAP);
      }
    });

    it('should classify liquidity intents correctly', async () => {
      for (const input of TestData.liquidityInputs) {
        const result = await engine.processInput(input, mockSession);
        const processedResult = TestAssertions.expectSuccess(result);
        TestAssertions.expectIntent(processedResult, DefiIntent.ADD_LIQUIDITY);
      }
    });

    it('should classify portfolio intents correctly', async () => {
      for (const input of TestData.portfolioInputs) {
        const result = await engine.processInput(input, mockSession);
        const processedResult = TestAssertions.expectSuccess(result);
        TestAssertions.expectIntent(processedResult, DefiIntent.PORTFOLIO_STATUS);
      }
    });

    it('should classify risk assessment intents correctly', async () => {
      for (const input of TestData.riskInputs) {
        const result = await engine.processInput(input, mockSession);
        const processedResult = TestAssertions.expectSuccess(result);
        TestAssertions.expectIntent(processedResult, DefiIntent.RISK_ASSESSMENT);
      }
    });

    it('should classify yield optimization intents correctly', async () => {
      for (const input of TestData.yieldInputs) {
        const result = await engine.processInput(input, mockSession);
        const processedResult = TestAssertions.expectSuccess(result);
        TestAssertions.expectIntent(processedResult, DefiIntent.YIELD_OPTIMIZATION);
      }
    });

    it('should handle unknown intents gracefully', async () => {
      for (const input of TestData.unknownInputs) {
        const result = await engine.processInput(input, mockSession);
        const processedResult = TestAssertions.expectSuccess(result);
        TestAssertions.expectIntent(processedResult, DefiIntent.UNKNOWN);
      }
    });
  });

  describe('Entity Extraction', () => {
    it('should extract amount entities', async () => {
      const input = 'lend 1000 USDC at best rate';
      const result = await engine.processInput(input, mockSession);
      const processedResult = TestAssertions.expectSuccess(result);
      
      TestAssertions.expectEntities(processedResult, ['amount']);
      const amountEntity = processedResult.intent.entities.find((e: any) => e.type === 'amount');
      expect(amountEntity.value).toBe('1000');
    });

    it('should extract token entities', async () => {
      const input = 'swap 100 SEI for USDC';
      const result = await engine.processInput(input, mockSession);
      const processedResult = TestAssertions.expectSuccess(result);
      
      TestAssertions.expectEntities(processedResult, ['token']);
      const tokenEntities = processedResult.intent.entities.filter((e: any) => e.type === 'token');
      expect(tokenEntities).toHaveLength(2);
      expect(tokenEntities.map((e: any) => e.value)).toContain('SEI');
      expect(tokenEntities.map((e: any) => e.value)).toContain('USDC');
    });

    it('should extract protocol entities', async () => {
      const input = 'lend on Silo protocol';
      const result = await engine.processInput(input, mockSession);
      const processedResult = TestAssertions.expectSuccess(result);
      
      TestAssertions.expectEntities(processedResult, ['protocol']);
      const protocolEntity = processedResult.intent.entities.find((e: any) => e.type === 'protocol');
      expect(protocolEntity.value.toLowerCase()).toBe('silo');
    });

    it('should extract multiple entity types', async () => {
      const input = 'lend 500 USDC on DragonSwap with 2x leverage';
      const result = await engine.processInput(input, mockSession);
      const processedResult = TestAssertions.expectSuccess(result);
      
      TestAssertions.expectEntities(processedResult, ['amount', 'token', 'protocol', 'leverage']);
    });
  });

  describe('Command Generation', () => {
    it('should generate lending commands', async () => {
      const input = 'lend 1000 USDC';
      const result = await engine.processInput(input, mockSession);
      const processedResult = TestAssertions.expectSuccess(result);
      
      TestAssertions.expectCommand(processedResult, 'lend');
      expect(processedResult.command.parameters.amount).toBe(1000);
      expect(processedResult.command.parameters.asset).toBe('USDC');
    });

    it('should generate swap commands', async () => {
      const input = 'swap 100 SEI for USDC';
      const result = await engine.processInput(input, mockSession);
      const processedResult = TestAssertions.expectSuccess(result);
      
      TestAssertions.expectCommand(processedResult, 'swap');
      expect(processedResult.command.parameters.fromAsset).toBe('SEI');
      expect(processedResult.command.parameters.toAsset).toBe('USDC');
      expect(processedResult.command.parameters.amount).toBe(100);
    });

    it('should generate liquidity commands', async () => {
      const input = 'add liquidity to SEI/USDC pool';
      const result = await engine.processInput(input, mockSession);
      const processedResult = TestAssertions.expectSuccess(result);
      
      TestAssertions.expectCommand(processedResult, 'addLiquidity');
      expect(processedResult.command.parameters.token1).toBe('SEI');
      expect(processedResult.command.parameters.token2).toBe('USDC');
    });
  });

  describe('Risk Assessment', () => {
    it('should assess low risk for simple lending', async () => {
      const input = 'lend 100 USDC';
      const result = await engine.processInput(input, mockSession);
      const processedResult = TestAssertions.expectSuccess(result);
      
      TestAssertions.expectRiskLevel(processedResult, 'low');
    });

    it('should assess high risk for leveraged operations', async () => {
      const input = 'borrow 10000 USDC with 10x leverage';
      const result = await engine.processInput(input, mockSession);
      const processedResult = TestAssertions.expectSuccess(result);
      
      TestAssertions.expectRiskLevel(processedResult, 'high');
    });

    it('should assess medium risk for liquidity provision', async () => {
      const input = 'add liquidity to SEI/USDC pool with 5000 USDC';
      const result = await engine.processInput(input, mockSession);
      const processedResult = TestAssertions.expectSuccess(result);
      
      TestAssertions.expectRiskLevel(processedResult, 'medium');
    });
  });

  describe('Conversation Flow', () => {
    it('should maintain conversation state', async () => {
      const input1 = 'I want to lend money';
      const result1 = await engine.processInput(input1, mockSession);
      const processedResult1 = TestAssertions.expectSuccess(result1);
      
      expect(processedResult1.session.state).toBe(ConversationState.ACTIVE);
      expect(processedResult1.session.turns).toHaveLength(1);
      
      const input2 = 'Make it 1000 USDC';
      const result2 = await engine.processInput(input2, processedResult1.session);
      const processedResult2 = TestAssertions.expectSuccess(result2);
      
      expect(processedResult2.session.turns).toHaveLength(2);
    });

    it('should handle disambiguation', async () => {
      const input = 'lend 1000'; // Ambiguous - no asset specified
      const result = await engine.processInput(input, mockSession);
      const processedResult = TestAssertions.expectSuccess(result);
      
      expect(processedResult.needsDisambiguation).toBe(true);
      expect(processedResult.disambiguationOptions).toBeDefined();
    });

    it('should handle confirmation requests', async () => {
      const input = 'lend 50000 USDC'; // Large amount should trigger confirmation
      const result = await engine.processInput(input, mockSession);
      const processedResult = TestAssertions.expectSuccess(result);
      
      expect(processedResult.needsConfirmation).toBe(true);
      expect(processedResult.confirmationRequest).toBeDefined();
    });
  });

  describe('Context Awareness', () => {
    it('should use conversation context for intent classification', async () => {
      // First establish context
      const contextInput = 'I want to earn yield on my USDC';
      const contextResult = await engine.processInput(contextInput, mockSession);
      const contextProcessed = TestAssertions.expectSuccess(contextResult);
      
      // Then use context-dependent input
      const input = 'How much can I earn?';
      const result = await engine.processInput(input, contextProcessed.session);
      const processedResult = TestAssertions.expectSuccess(result);
      
      TestAssertions.expectIntent(processedResult, DefiIntent.YIELD_OPTIMIZATION);
    });

    it('should preserve user preferences', async () => {
      const sessionWithPrefs = createMockSession({
        context: {
          ...mockSession.context,
          user: {
            ...mockSession.context.user,
            preferences: {
              riskTolerance: 'low',
              preferredProtocols: ['silo']
            }
          }
        }
      });
      
      const input = 'lend my USDC';
      const result = await engine.processInput(input, sessionWithPrefs);
      const processedResult = TestAssertions.expectSuccess(result);
      
      expect(processedResult.command.parameters.protocol).toBe('silo');
      TestAssertions.expectRiskLevel(processedResult, 'low');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid inputs gracefully', async () => {
      const input = ''; // Empty input
      const result = await engine.processInput(input, mockSession);
      
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(Error);
        expect(result.left.message).toContain('Invalid input');
      } else {
        // Should classify as unknown intent
        TestAssertions.expectIntent(result.right, DefiIntent.UNKNOWN);
      }
    });

    it('should handle malformed session data', async () => {
      const malformedSession = { ...mockSession, context: null };
      const input = 'lend 100 USDC';
      
      await ErrorUtils.expectErrorHandling(
        () => engine.processInput(input, malformedSession),
        'Error'
      );
    });

    it('should handle network timeouts', async () => {
      // Mock a timeout scenario
      const timeoutEngine = createTestEngine();
      jest.spyOn(timeoutEngine as any, 'processInput').mockImplementation(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );
      
      const input = 'lend 100 USDC';
      await ErrorUtils.expectErrorHandling(
        () => timeoutEngine.processInput(input, mockSession),
        'Error'
      );
    });
  });

  describe('Performance', () => {
    it('should process simple inputs quickly', async () => {
      const input = 'lend 100 USDC';
      const { duration } = await PerformanceUtils.measureTime(
        () => engine.processInput(input, mockSession)
      );
      
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should handle multiple concurrent requests', async () => {
      const inputs = TestData.lendingInputs;
      const promises = inputs.map(input => 
        engine.processInput(input, createMockSession())
      );
      
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        TestAssertions.expectSuccess(result);
      });
    });

    it('should maintain performance under load', async () => {
      const input = 'lend 100 USDC';
      const benchmark = await PerformanceUtils.benchmark(
        () => engine.processInput(input, createMockSession()),
        10
      );
      
      expect(benchmark.averageTime).toBeLessThan(2000);
      expect(benchmark.maxTime).toBeLessThan(5000);
    });
  });

  describe('Asset Resolution', () => {
    it('should resolve asset names correctly', async () => {
      const testCases = [
        { input: 'usdc', expected: 'USDC' },
        { input: 'sei', expected: 'SEI' },
        { input: 'stablecoin', expected: 'USDC' }
      ];
      
      for (const { input, expected } of testCases) {
        const result = await engine.resolveAsset(input);
        const resolved = TestAssertions.expectSuccess(result);
        expect(resolved.resolved.symbol).toBe(expected);
      }
    });

    it('should handle fuzzy matching', async () => {
      const result = await engine.resolveAsset('usd'); // Should match USDC
      const resolved = TestAssertions.expectSuccess(result);
      expect(resolved.resolved.symbol).toBe('USDC');
    });
  });

  describe('Amount Parsing', () => {
    it('should parse numeric amounts', async () => {
      const result = await engine.parseAmount('1000');
      const parsed = TestAssertions.expectSuccess(result);
      expect(parsed.normalized).toBe(1000);
    });

    it('should parse amounts with units', async () => {
      const result = await engine.parseAmount('1.5k');
      const parsed = TestAssertions.expectSuccess(result);
      expect(parsed.normalized).toBe(1500);
    });

    it('should parse percentage amounts', async () => {
      const context = { userBalance: 10000 };
      const result = await engine.parseAmount('50%', context);
      const parsed = TestAssertions.expectSuccess(result);
      expect(parsed.normalized).toBe(5000);
    });

    it('should parse relative amounts', async () => {
      const context = { userBalance: 10000 };
      const result = await engine.parseAmount('half', context);
      const parsed = TestAssertions.expectSuccess(result);
      expect(parsed.normalized).toBe(5000);
    });
  });

  describe('Strategy Matching', () => {
    it('should find matching strategies', async () => {
      const criteria = {
        amount: 1000,
        riskTolerance: 'medium' as const,
        preferredProtocols: ['dragonswap'],
        excludedProtocols: [],
        allowLeverage: false
      };
      
      const result = await engine.findStrategies(criteria);
      const strategies = TestAssertions.expectSuccess(result);
      expect(strategies).toHaveLength(1);
      expect(strategies[0].strategy.protocols).toContain('dragonswap');
    });

    it('should respect risk tolerance', async () => {
      const criteria = {
        amount: 1000,
        riskTolerance: 'low' as const,
        preferredProtocols: [],
        excludedProtocols: [],
        allowLeverage: false
      };
      
      const result = await engine.findStrategies(criteria);
      const strategies = TestAssertions.expectSuccess(result);
      
      strategies.forEach(match => {
        expect(['very_low', 'low']).toContain(match.strategy.riskLevel);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete user journey', async () => {
      // User starts with general intent
      const input1 = 'I want to earn yield on my USDC';
      const result1 = await engine.processInput(input1, mockSession);
      const processed1 = TestAssertions.expectSuccess(result1);
      
      TestAssertions.expectIntent(processed1, DefiIntent.YIELD_OPTIMIZATION);
      
      // User provides more specific details
      const input2 = 'I have 5000 USDC and want low risk';
      const result2 = await engine.processInput(input2, processed1.session);
      const processed2 = TestAssertions.expectSuccess(result2);
      
      // System should provide specific recommendations
      expect(processed2.suggestions).not.toHaveLength(0);
      expect(processed2.command).toBeDefined();
    });

    it('should handle complex multi-step operations', async () => {
      const input = 'I want to do leveraged farming with 10000 USDC';
      const result = await engine.processInput(input, mockSession);
      const processed = TestAssertions.expectSuccess(result);
      
      TestAssertions.expectIntent(processed, DefiIntent.YIELD_OPTIMIZATION);
      expect(processed.needsConfirmation).toBe(true);
      TestAssertions.expectRiskLevel(processed, 'high');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large amounts', async () => {
      const input = 'lend 1000000000 USDC';
      const result = await engine.processInput(input, mockSession);
      const processed = TestAssertions.expectSuccess(result);
      
      expect(processed.warnings).toContain('Large amount - consider market impact and slippage');
    });

    it('should handle multiple currencies in one request', async () => {
      const input = 'swap 100 SEI and 200 USDC for ETH';
      const result = await engine.processInput(input, mockSession);
      const processed = TestAssertions.expectSuccess(result);
      
      expect(processed.needsDisambiguation).toBe(true);
    });

    it('should handle conflicting parameters', async () => {
      const input = 'lend 1000 USDC with no risk but maximum yield';
      const result = await engine.processInput(input, mockSession);
      const processed = TestAssertions.expectSuccess(result);
      
      expect(processed.warnings).not.toHaveLength(0);
      expect(processed.suggestions).not.toHaveLength(0);
    });
  });
});