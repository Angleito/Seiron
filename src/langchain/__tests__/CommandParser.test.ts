/**
 * @fileoverview Command Parser Tests
 * Tests for the command parsing and validation system
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { CommandParser } from '../processing/CommandParser.js';
import { DefiIntent } from '../nlp/types.js';
import { TestAssertions, setupTestEnvironment } from './setup.js';

setupTestEnvironment();

describe('CommandParser', () => {
  let parser: CommandParser;

  beforeEach(() => {
    parser = new CommandParser();
  });

  describe('Lending Command Parsing', () => {
    it('should parse basic lending commands', async () => {
      const classification = {
        intent: DefiIntent.LEND,
        confidence: 0.9,
        entities: [
          { type: 'amount', value: '1000', confidence: 0.9, startPosition: 5, endPosition: 9, isValid: true },
          { type: 'token', value: 'USDC', confidence: 0.95, startPosition: 10, endPosition: 14, isValid: true }
        ],
        patternScore: 0.8,
        keywordScore: 0.9,
        contextScore: 0.7,
        structuralScore: 0.8,
        strategyBreakdown: { pattern: 0.8, keyword: 0.9, context: 0.7, structural: 0.8 },
        matchedPatterns: ['lend']
      };

      const result = await parser.parseCommand(classification, 'lend 1000 USDC');
      const command = TestAssertions.expectSuccess(result);

      expect(command.command.action).toBe('lend');
      expect(command.command.parameters.amount).toBe(1000);
      expect(command.command.parameters.asset).toBe('USDC');
      expect(command.command.riskLevel).toBe('low');
    });

    it('should parse lending with protocol specification', async () => {
      const classification = {
        intent: DefiIntent.LEND,
        confidence: 0.9,
        entities: [
          { type: 'amount', value: '1000', confidence: 0.9, startPosition: 5, endPosition: 9, isValid: true },
          { type: 'token', value: 'USDC', confidence: 0.95, startPosition: 10, endPosition: 14, isValid: true },
          { type: 'protocol', value: 'Silo', confidence: 0.9, startPosition: 18, endPosition: 22, isValid: true }
        ],
        patternScore: 0.8,
        keywordScore: 0.9,
        contextScore: 0.7,
        structuralScore: 0.8,
        strategyBreakdown: { pattern: 0.8, keyword: 0.9, context: 0.7, structural: 0.8 },
        matchedPatterns: ['lend']
      };

      const result = await parser.parseCommand(classification, 'lend 1000 USDC on Silo');
      const command = TestAssertions.expectSuccess(result);

      expect(command.command.parameters.protocol).toBe('silo');
    });

    it('should parse lending with leverage', async () => {
      const classification = {
        intent: DefiIntent.LEND,
        confidence: 0.9,
        entities: [
          { type: 'amount', value: '1000', confidence: 0.9, startPosition: 5, endPosition: 9, isValid: true },
          { type: 'token', value: 'USDC', confidence: 0.95, startPosition: 10, endPosition: 14, isValid: true },
          { type: 'leverage', value: '2x', confidence: 0.9, startPosition: 20, endPosition: 22, isValid: true }
        ],
        patternScore: 0.8,
        keywordScore: 0.9,
        contextScore: 0.7,
        structuralScore: 0.8,
        strategyBreakdown: { pattern: 0.8, keyword: 0.9, context: 0.7, structural: 0.8 },
        matchedPatterns: ['lend']
      };

      const result = await parser.parseCommand(classification, 'lend 1000 USDC with 2x leverage');
      const command = TestAssertions.expectSuccess(result);

      expect(command.command.parameters.leverage).toBe(2);
      expect(command.command.riskLevel).toBe('medium');
    });
  });

  describe('Borrowing Command Parsing', () => {
    it('should parse basic borrowing commands', async () => {
      const classification = {
        intent: DefiIntent.BORROW,
        confidence: 0.9,
        entities: [
          { type: 'amount', value: '500', confidence: 0.9, startPosition: 7, endPosition: 10, isValid: true },
          { type: 'token', value: 'USDC', confidence: 0.95, startPosition: 11, endPosition: 15, isValid: true }
        ],
        patternScore: 0.8,
        keywordScore: 0.9,
        contextScore: 0.7,
        structuralScore: 0.8,
        strategyBreakdown: { pattern: 0.8, keyword: 0.9, context: 0.7, structural: 0.8 },
        matchedPatterns: ['borrow']
      };

      const result = await parser.parseCommand(classification, 'borrow 500 USDC');
      const command = TestAssertions.expectSuccess(result);

      expect(command.command.action).toBe('borrow');
      expect(command.command.parameters.amount).toBe(500);
      expect(command.command.parameters.asset).toBe('USDC');
      expect(command.command.riskLevel).toBe('medium');
    });

    it('should parse borrowing with collateral', async () => {
      const classification = {
        intent: DefiIntent.BORROW,
        confidence: 0.9,
        entities: [
          { type: 'amount', value: '500', confidence: 0.9, startPosition: 7, endPosition: 10, isValid: true },
          { type: 'token', value: 'USDC', confidence: 0.95, startPosition: 11, endPosition: 15, isValid: true },
          { type: 'token', value: 'SEI', confidence: 0.95, startPosition: 25, endPosition: 28, isValid: true }
        ],
        patternScore: 0.8,
        keywordScore: 0.9,
        contextScore: 0.7,
        structuralScore: 0.8,
        strategyBreakdown: { pattern: 0.8, keyword: 0.9, context: 0.7, structural: 0.8 },
        matchedPatterns: ['borrow']
      };

      const result = await parser.parseCommand(classification, 'borrow 500 USDC against SEI');
      const command = TestAssertions.expectSuccess(result);

      expect(command.command.parameters.collateralAsset).toBe('SEI');
    });
  });

  describe('Swap Command Parsing', () => {
    it('should parse basic swap commands', async () => {
      const classification = {
        intent: DefiIntent.SWAP,
        confidence: 0.9,
        entities: [
          { type: 'amount', value: '100', confidence: 0.9, startPosition: 5, endPosition: 8, isValid: true },
          { type: 'token', value: 'SEI', confidence: 0.95, startPosition: 9, endPosition: 12, isValid: true },
          { type: 'token', value: 'USDC', confidence: 0.95, startPosition: 17, endPosition: 21, isValid: true }
        ],
        patternScore: 0.8,
        keywordScore: 0.9,
        contextScore: 0.7,
        structuralScore: 0.8,
        strategyBreakdown: { pattern: 0.8, keyword: 0.9, context: 0.7, structural: 0.8 },
        matchedPatterns: ['swap']
      };

      const result = await parser.parseCommand(classification, 'swap 100 SEI for USDC');
      const command = TestAssertions.expectSuccess(result);

      expect(command.command.action).toBe('swap');
      expect(command.command.parameters.fromAsset).toBe('SEI');
      expect(command.command.parameters.toAsset).toBe('USDC');
      expect(command.command.parameters.amount).toBe(100);
    });

    it('should parse swap with slippage', async () => {
      const classification = {
        intent: DefiIntent.SWAP,
        confidence: 0.9,
        entities: [
          { type: 'amount', value: '100', confidence: 0.9, startPosition: 5, endPosition: 8, isValid: true },
          { type: 'token', value: 'SEI', confidence: 0.95, startPosition: 9, endPosition: 12, isValid: true },
          { type: 'token', value: 'USDC', confidence: 0.95, startPosition: 17, endPosition: 21, isValid: true },
          { type: 'slippage', value: '1%', confidence: 0.9, startPosition: 27, endPosition: 29, isValid: true }
        ],
        patternScore: 0.8,
        keywordScore: 0.9,
        contextScore: 0.7,
        structuralScore: 0.8,
        strategyBreakdown: { pattern: 0.8, keyword: 0.9, context: 0.7, structural: 0.8 },
        matchedPatterns: ['swap']
      };

      const result = await parser.parseCommand(classification, 'swap 100 SEI for USDC with 1% slippage');
      const command = TestAssertions.expectSuccess(result);

      expect(command.command.parameters.slippage).toBe(1);
    });

    it('should parse swap with protocol', async () => {
      const classification = {
        intent: DefiIntent.SWAP,
        confidence: 0.9,
        entities: [
          { type: 'amount', value: '100', confidence: 0.9, startPosition: 5, endPosition: 8, isValid: true },
          { type: 'token', value: 'SEI', confidence: 0.95, startPosition: 9, endPosition: 12, isValid: true },
          { type: 'token', value: 'USDC', confidence: 0.95, startPosition: 17, endPosition: 21, isValid: true },
          { type: 'protocol', value: 'DragonSwap', confidence: 0.9, startPosition: 25, endPosition: 35, isValid: true }
        ],
        patternScore: 0.8,
        keywordScore: 0.9,
        contextScore: 0.7,
        structuralScore: 0.8,
        strategyBreakdown: { pattern: 0.8, keyword: 0.9, context: 0.7, structural: 0.8 },
        matchedPatterns: ['swap']
      };

      const result = await parser.parseCommand(classification, 'swap 100 SEI for USDC on DragonSwap');
      const command = TestAssertions.expectSuccess(result);

      expect(command.command.parameters.protocol).toBe('dragonswap');
    });
  });

  describe('Liquidity Command Parsing', () => {
    it('should parse add liquidity commands', async () => {
      const classification = {
        intent: DefiIntent.ADD_LIQUIDITY,
        confidence: 0.9,
        entities: [
          { type: 'token', value: 'SEI', confidence: 0.95, startPosition: 17, endPosition: 20, isValid: true },
          { type: 'token', value: 'USDC', confidence: 0.95, startPosition: 21, endPosition: 25, isValid: true }
        ],
        patternScore: 0.8,
        keywordScore: 0.9,
        contextScore: 0.7,
        structuralScore: 0.8,
        strategyBreakdown: { pattern: 0.8, keyword: 0.9, context: 0.7, structural: 0.8 },
        matchedPatterns: ['add liquidity']
      };

      const result = await parser.parseCommand(classification, 'add liquidity to SEI/USDC pool');
      const command = TestAssertions.expectSuccess(result);

      expect(command.command.action).toBe('addLiquidity');
      expect(command.command.parameters.token1).toBe('SEI');
      expect(command.command.parameters.token2).toBe('USDC');
      expect(command.command.riskLevel).toBe('medium');
    });

    it('should parse remove liquidity commands', async () => {
      const classification = {
        intent: DefiIntent.REMOVE_LIQUIDITY,
        confidence: 0.9,
        entities: [
          { type: 'amount', value: '50%', confidence: 0.9, startPosition: 7, endPosition: 10, isValid: true },
          { type: 'token', value: 'SEI', confidence: 0.95, startPosition: 19, endPosition: 22, isValid: true },
          { type: 'token', value: 'USDC', confidence: 0.95, startPosition: 23, endPosition: 27, isValid: true }
        ],
        patternScore: 0.8,
        keywordScore: 0.9,
        contextScore: 0.7,
        structuralScore: 0.8,
        strategyBreakdown: { pattern: 0.8, keyword: 0.9, context: 0.7, structural: 0.8 },
        matchedPatterns: ['remove liquidity']
      };

      const result = await parser.parseCommand(classification, 'remove 50% from SEI/USDC pool');
      const command = TestAssertions.expectSuccess(result);

      expect(command.command.action).toBe('removeLiquidity');
      expect(command.command.parameters.percentage).toBe(50);
    });
  });

  describe('Complex Command Parsing', () => {
    it('should parse commands with multiple parameters', async () => {
      const classification = {
        intent: DefiIntent.LEND,
        confidence: 0.9,
        entities: [
          { type: 'amount', value: '1000', confidence: 0.9, startPosition: 5, endPosition: 9, isValid: true },
          { type: 'token', value: 'USDC', confidence: 0.95, startPosition: 10, endPosition: 14, isValid: true },
          { type: 'protocol', value: 'Silo', confidence: 0.9, startPosition: 18, endPosition: 22, isValid: true },
          { type: 'leverage', value: '2x', confidence: 0.9, startPosition: 28, endPosition: 30, isValid: true },
          { type: 'duration', value: '30 days', confidence: 0.9, startPosition: 40, endPosition: 47, isValid: true }
        ],
        patternScore: 0.8,
        keywordScore: 0.9,
        contextScore: 0.7,
        structuralScore: 0.8,
        strategyBreakdown: { pattern: 0.8, keyword: 0.9, context: 0.7, structural: 0.8 },
        matchedPatterns: ['lend']
      };

      const result = await parser.parseCommand(
        classification, 
        'lend 1000 USDC on Silo with 2x leverage for 30 days'
      );
      const command = TestAssertions.expectSuccess(result);

      expect(command.command.parameters.amount).toBe(1000);
      expect(command.command.parameters.asset).toBe('USDC');
      expect(command.command.parameters.protocol).toBe('silo');
      expect(command.command.parameters.leverage).toBe(2);
      expect(command.command.parameters.duration).toBe('30 days');
    });

    it('should handle percentage amounts', async () => {
      const classification = {
        intent: DefiIntent.LEND,
        confidence: 0.9,
        entities: [
          { type: 'amount', value: '50%', confidence: 0.9, startPosition: 5, endPosition: 8, isValid: true },
          { type: 'token', value: 'USDC', confidence: 0.95, startPosition: 15, endPosition: 19, isValid: true }
        ],
        patternScore: 0.8,
        keywordScore: 0.9,
        contextScore: 0.7,
        structuralScore: 0.8,
        strategyBreakdown: { pattern: 0.8, keyword: 0.9, context: 0.7, structural: 0.8 },
        matchedPatterns: ['lend']
      };

      const context = {
        balances: { 'USDC': 10000 }
      };

      const result = await parser.parseCommand(
        classification, 
        'lend 50% of my USDC',
        context
      );
      const command = TestAssertions.expectSuccess(result);

      expect(command.command.parameters.amount).toBe(5000);
      expect(command.command.parameters.percentage).toBe(50);
    });

    it('should handle relative amounts', async () => {
      const classification = {
        intent: DefiIntent.LEND,
        confidence: 0.9,
        entities: [
          { type: 'amount', value: 'all', confidence: 0.9, startPosition: 5, endPosition: 8, isValid: true },
          { type: 'token', value: 'USDC', confidence: 0.95, startPosition: 12, endPosition: 16, isValid: true }
        ],
        patternScore: 0.8,
        keywordScore: 0.9,
        contextScore: 0.7,
        structuralScore: 0.8,
        strategyBreakdown: { pattern: 0.8, keyword: 0.9, context: 0.7, structural: 0.8 },
        matchedPatterns: ['lend']
      };

      const context = {
        balances: { 'USDC': 10000 }
      };

      const result = await parser.parseCommand(
        classification, 
        'lend all my USDC',
        context
      );
      const command = TestAssertions.expectSuccess(result);

      expect(command.command.parameters.amount).toBe(10000);
      expect(command.command.parameters.relativeAmount).toBe('all');
    });
  });

  describe('Risk Assessment Integration', () => {
    it('should assess risk for simple operations', async () => {
      const classification = {
        intent: DefiIntent.LEND,
        confidence: 0.9,
        entities: [
          { type: 'amount', value: '100', confidence: 0.9, startPosition: 5, endPosition: 8, isValid: true },
          { type: 'token', value: 'USDC', confidence: 0.95, startPosition: 9, endPosition: 13, isValid: true }
        ],
        patternScore: 0.8,
        keywordScore: 0.9,
        contextScore: 0.7,
        structuralScore: 0.8,
        strategyBreakdown: { pattern: 0.8, keyword: 0.9, context: 0.7, structural: 0.8 },
        matchedPatterns: ['lend']
      };

      const result = await parser.parseCommand(classification, 'lend 100 USDC');
      const command = TestAssertions.expectSuccess(result);

      expect(command.command.riskLevel).toBe('low');
      expect(command.riskAssessment).toBeDefined();
    });

    it('should assess high risk for leveraged operations', async () => {
      const classification = {
        intent: DefiIntent.LEND,
        confidence: 0.9,
        entities: [
          { type: 'amount', value: '10000', confidence: 0.9, startPosition: 5, endPosition: 10, isValid: true },
          { type: 'token', value: 'USDC', confidence: 0.95, startPosition: 11, endPosition: 15, isValid: true },
          { type: 'leverage', value: '10x', confidence: 0.9, startPosition: 21, endPosition: 24, isValid: true }
        ],
        patternScore: 0.8,
        keywordScore: 0.9,
        contextScore: 0.7,
        structuralScore: 0.8,
        strategyBreakdown: { pattern: 0.8, keyword: 0.9, context: 0.7, structural: 0.8 },
        matchedPatterns: ['lend']
      };

      const result = await parser.parseCommand(classification, 'lend 10000 USDC with 10x leverage');
      const command = TestAssertions.expectSuccess(result);

      expect(command.command.riskLevel).toBe('high');
      expect(command.riskAssessment.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Validation', () => {
    it('should validate required parameters', async () => {
      const classification = {
        intent: DefiIntent.LEND,
        confidence: 0.9,
        entities: [
          { type: 'amount', value: '1000', confidence: 0.9, startPosition: 5, endPosition: 9, isValid: true }
          // Missing token entity
        ],
        patternScore: 0.8,
        keywordScore: 0.9,
        contextScore: 0.7,
        structuralScore: 0.8,
        strategyBreakdown: { pattern: 0.8, keyword: 0.9, context: 0.7, structural: 0.8 },
        matchedPatterns: ['lend']
      };

      const result = await parser.parseCommand(classification, 'lend 1000');
      const command = TestAssertions.expectSuccess(result);

      expect(command.requiresDisambiguation).toBe(true);
      expect(command.disambiguationOptions.missingParameters).toContain('asset');
    });

    it('should validate parameter ranges', async () => {
      const classification = {
        intent: DefiIntent.LEND,
        confidence: 0.9,
        entities: [
          { type: 'amount', value: '0', confidence: 0.9, startPosition: 5, endPosition: 6, isValid: true },
          { type: 'token', value: 'USDC', confidence: 0.95, startPosition: 7, endPosition: 11, isValid: true }
        ],
        patternScore: 0.8,
        keywordScore: 0.9,
        contextScore: 0.7,
        structuralScore: 0.8,
        strategyBreakdown: { pattern: 0.8, keyword: 0.9, context: 0.7, structural: 0.8 },
        matchedPatterns: ['lend']
      };

      const result = await parser.parseCommand(classification, 'lend 0 USDC');
      const command = TestAssertions.expectSuccess(result);

      expect(command.validationErrors.length).toBeGreaterThan(0);
      expect(command.validationErrors[0].message).toContain('Amount must be greater than 0');
    });

    it('should validate balance availability', async () => {
      const classification = {
        intent: DefiIntent.LEND,
        confidence: 0.9,
        entities: [
          { type: 'amount', value: '10000', confidence: 0.9, startPosition: 5, endPosition: 10, isValid: true },
          { type: 'token', value: 'USDC', confidence: 0.95, startPosition: 11, endPosition: 15, isValid: true }
        ],
        patternScore: 0.8,
        keywordScore: 0.9,
        contextScore: 0.7,
        structuralScore: 0.8,
        strategyBreakdown: { pattern: 0.8, keyword: 0.9, context: 0.7, structural: 0.8 },
        matchedPatterns: ['lend']
      };

      const context = {
        balances: { 'USDC': 5000 } // Insufficient balance
      };

      const result = await parser.parseCommand(classification, 'lend 10000 USDC', context);
      const command = TestAssertions.expectSuccess(result);

      expect(command.validationErrors.length).toBeGreaterThan(0);
      expect(command.validationErrors[0].message).toContain('Insufficient balance');
    });
  });

  describe('Gas Estimation', () => {
    it('should estimate gas for simple operations', async () => {
      const classification = {
        intent: DefiIntent.LEND,
        confidence: 0.9,
        entities: [
          { type: 'amount', value: '1000', confidence: 0.9, startPosition: 5, endPosition: 9, isValid: true },
          { type: 'token', value: 'USDC', confidence: 0.95, startPosition: 10, endPosition: 14, isValid: true }
        ],
        patternScore: 0.8,
        keywordScore: 0.9,
        contextScore: 0.7,
        structuralScore: 0.8,
        strategyBreakdown: { pattern: 0.8, keyword: 0.9, context: 0.7, structural: 0.8 },
        matchedPatterns: ['lend']
      };

      const result = await parser.parseCommand(classification, 'lend 1000 USDC');
      const command = TestAssertions.expectSuccess(result);

      expect(command.command.estimatedGas).toBeDefined();
      expect(command.command.estimatedGas).toBeGreaterThan(0);
    });

    it('should estimate higher gas for complex operations', async () => {
      const simpleClassification = {
        intent: DefiIntent.LEND,
        confidence: 0.9,
        entities: [
          { type: 'amount', value: '1000', confidence: 0.9, startPosition: 5, endPosition: 9, isValid: true },
          { type: 'token', value: 'USDC', confidence: 0.95, startPosition: 10, endPosition: 14, isValid: true }
        ],
        patternScore: 0.8,
        keywordScore: 0.9,
        contextScore: 0.7,
        structuralScore: 0.8,
        strategyBreakdown: { pattern: 0.8, keyword: 0.9, context: 0.7, structural: 0.8 },
        matchedPatterns: ['lend']
      };

      const complexClassification = {
        intent: DefiIntent.ADD_LIQUIDITY,
        confidence: 0.9,
        entities: [
          { type: 'amount', value: '1000', confidence: 0.9, startPosition: 13, endPosition: 17, isValid: true },
          { type: 'token', value: 'SEI', confidence: 0.95, startPosition: 21, endPosition: 24, isValid: true },
          { type: 'token', value: 'USDC', confidence: 0.95, startPosition: 25, endPosition: 29, isValid: true }
        ],
        patternScore: 0.8,
        keywordScore: 0.9,
        contextScore: 0.7,
        structuralScore: 0.8,
        strategyBreakdown: { pattern: 0.8, keyword: 0.9, context: 0.7, structural: 0.8 },
        matchedPatterns: ['add liquidity']
      };

      const simpleResult = await parser.parseCommand(simpleClassification, 'lend 1000 USDC');
      const complexResult = await parser.parseCommand(complexClassification, 'add liquidity 1000 SEI/USDC');

      const simpleCommand = TestAssertions.expectSuccess(simpleResult);
      const complexCommand = TestAssertions.expectSuccess(complexResult);

      expect(complexCommand.command.estimatedGas).toBeGreaterThan(simpleCommand.command.estimatedGas);
    });
  });

  describe('Confirmation Requirements', () => {
    it('should require confirmation for high-value operations', async () => {
      const classification = {
        intent: DefiIntent.LEND,
        confidence: 0.9,
        entities: [
          { type: 'amount', value: '100000', confidence: 0.9, startPosition: 5, endPosition: 11, isValid: true },
          { type: 'token', value: 'USDC', confidence: 0.95, startPosition: 12, endPosition: 16, isValid: true }
        ],
        patternScore: 0.8,
        keywordScore: 0.9,
        contextScore: 0.7,
        structuralScore: 0.8,
        strategyBreakdown: { pattern: 0.8, keyword: 0.9, context: 0.7, structural: 0.8 },
        matchedPatterns: ['lend']
      };

      const result = await parser.parseCommand(classification, 'lend 100000 USDC');
      const command = TestAssertions.expectSuccess(result);

      expect(command.command.confirmationRequired).toBe(true);
      expect(command.command.confirmationReason).toContain('high value');
    });

    it('should require confirmation for high-risk operations', async () => {
      const classification = {
        intent: DefiIntent.LEND,
        confidence: 0.9,
        entities: [
          { type: 'amount', value: '1000', confidence: 0.9, startPosition: 5, endPosition: 9, isValid: true },
          { type: 'token', value: 'USDC', confidence: 0.95, startPosition: 10, endPosition: 14, isValid: true },
          { type: 'leverage', value: '10x', confidence: 0.9, startPosition: 20, endPosition: 23, isValid: true }
        ],
        patternScore: 0.8,
        keywordScore: 0.9,
        contextScore: 0.7,
        structuralScore: 0.8,
        strategyBreakdown: { pattern: 0.8, keyword: 0.9, context: 0.7, structural: 0.8 },
        matchedPatterns: ['lend']
      };

      const result = await parser.parseCommand(classification, 'lend 1000 USDC with 10x leverage');
      const command = TestAssertions.expectSuccess(result);

      expect(command.command.confirmationRequired).toBe(true);
      expect(command.command.confirmationReason).toContain('high risk');
    });
  });

  describe('Edge Cases', () => {
    it('should handle unknown intents gracefully', async () => {
      const classification = {
        intent: DefiIntent.UNKNOWN,
        confidence: 0.3,
        entities: [],
        patternScore: 0,
        keywordScore: 0,
        contextScore: 0,
        structuralScore: 0,
        strategyBreakdown: { pattern: 0, keyword: 0, context: 0, structural: 0 },
        matchedPatterns: []
      };

      const result = await parser.parseCommand(classification, 'hello world');
      
      // Should return an error or empty command
      if (result._tag === 'Left') {
        expect(result.left.message).toContain('Unknown intent');
      } else {
        expect(result.right.command).toBeUndefined();
      }
    });

    it('should handle malformed entities', async () => {
      const classification = {
        intent: DefiIntent.LEND,
        confidence: 0.9,
        entities: [
          { type: 'amount', value: 'abc', confidence: 0.5, startPosition: 5, endPosition: 8, isValid: false },
          { type: 'token', value: 'USDC', confidence: 0.95, startPosition: 9, endPosition: 13, isValid: true }
        ],
        patternScore: 0.8,
        keywordScore: 0.9,
        contextScore: 0.7,
        structuralScore: 0.8,
        strategyBreakdown: { pattern: 0.8, keyword: 0.9, context: 0.7, structural: 0.8 },
        matchedPatterns: ['lend']
      };

      const result = await parser.parseCommand(classification, 'lend abc USDC');
      const command = TestAssertions.expectSuccess(result);

      expect(command.validationErrors.length).toBeGreaterThan(0);
      expect(command.validationErrors[0].message).toContain('Invalid amount');
    });

    it('should handle empty entity list', async () => {
      const classification = {
        intent: DefiIntent.LEND,
        confidence: 0.9,
        entities: [],
        patternScore: 0.8,
        keywordScore: 0.9,
        contextScore: 0.7,
        structuralScore: 0.8,
        strategyBreakdown: { pattern: 0.8, keyword: 0.9, context: 0.7, structural: 0.8 },
        matchedPatterns: ['lend']
      };

      const result = await parser.parseCommand(classification, 'lend');
      const command = TestAssertions.expectSuccess(result);

      expect(command.requiresDisambiguation).toBe(true);
      expect(command.disambiguationOptions.missingParameters).toContain('amount');
      expect(command.disambiguationOptions.missingParameters).toContain('asset');
    });
  });

  describe('Performance', () => {
    it('should parse commands quickly', async () => {
      const classification = {
        intent: DefiIntent.LEND,
        confidence: 0.9,
        entities: [
          { type: 'amount', value: '1000', confidence: 0.9, startPosition: 5, endPosition: 9, isValid: true },
          { type: 'token', value: 'USDC', confidence: 0.95, startPosition: 10, endPosition: 14, isValid: true }
        ],
        patternScore: 0.8,
        keywordScore: 0.9,
        contextScore: 0.7,
        structuralScore: 0.8,
        strategyBreakdown: { pattern: 0.8, keyword: 0.9, context: 0.7, structural: 0.8 },
        matchedPatterns: ['lend']
      };

      const start = performance.now();
      await parser.parseCommand(classification, 'lend 1000 USDC');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should handle concurrent parsing', async () => {
      const classifications = [
        {
          intent: DefiIntent.LEND,
          confidence: 0.9,
          entities: [
            { type: 'amount', value: '1000', confidence: 0.9, startPosition: 5, endPosition: 9, isValid: true },
            { type: 'token', value: 'USDC', confidence: 0.95, startPosition: 10, endPosition: 14, isValid: true }
          ],
          patternScore: 0.8, keywordScore: 0.9, contextScore: 0.7, structuralScore: 0.8,
          strategyBreakdown: { pattern: 0.8, keyword: 0.9, context: 0.7, structural: 0.8 },
          matchedPatterns: ['lend']
        },
        {
          intent: DefiIntent.BORROW,
          confidence: 0.9,
          entities: [
            { type: 'amount', value: '500', confidence: 0.9, startPosition: 7, endPosition: 10, isValid: true },
            { type: 'token', value: 'SEI', confidence: 0.95, startPosition: 11, endPosition: 14, isValid: true }
          ],
          patternScore: 0.8, keywordScore: 0.9, contextScore: 0.7, structuralScore: 0.8,
          strategyBreakdown: { pattern: 0.8, keyword: 0.9, context: 0.7, structural: 0.8 },
          matchedPatterns: ['borrow']
        }
      ];

      const promises = classifications.map((classification, index) =>
        parser.parseCommand(classification, index === 0 ? 'lend 1000 USDC' : 'borrow 500 SEI')
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        TestAssertions.expectSuccess(result);
      });
    });
  });
});