/**
 * @fileoverview Entity Extractor Tests
 * Tests for the entity extraction system
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { EntityExtractor } from '../nlp/EntityExtractor.js';
import { NLPConfig } from '../nlp/types.js';
import { TestAssertions, setupTestEnvironment } from './setup.js';

setupTestEnvironment();

describe('EntityExtractor', () => {
  let extractor: EntityExtractor;
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
    extractor = new EntityExtractor(config);
  });

  describe('Amount Extraction', () => {
    it('should extract simple numeric amounts', async () => {
      const testCases = [
        { input: 'lend 1000 USDC', expected: '1000' },
        { input: 'borrow 500 tokens', expected: '500' },
        { input: 'swap 100.5 SEI', expected: '100.5' },
        { input: 'add 2500 to liquidity', expected: '2500' }
      ];

      for (const { input, expected } of testCases) {
        const result = await extractor.extractEntities(input);
        const entities = TestAssertions.expectSuccess(result);
        
        const amountEntity = entities.find(e => e.type === 'amount');
        expect(amountEntity).toBeDefined();
        expect(amountEntity.value).toBe(expected);
        expect(amountEntity.confidence).toBeGreaterThan(0.8);
      }
    });

    it('should extract amounts with units', async () => {
      const testCases = [
        { input: 'lend 1k USDC', expected: '1k' },
        { input: 'borrow 2.5M tokens', expected: '2.5M' },
        { input: 'swap 500k SEI', expected: '500k' },
        { input: 'add 1.2B to pool', expected: '1.2B' }
      ];

      for (const { input, expected } of testCases) {
        const result = await extractor.extractEntities(input);
        const entities = TestAssertions.expectSuccess(result);
        
        const amountEntity = entities.find(e => e.type === 'amount');
        expect(amountEntity).toBeDefined();
        expect(amountEntity.value).toBe(expected);
      }
    });

    it('should extract percentage amounts', async () => {
      const testCases = [
        { input: 'lend 50% of my USDC', expected: '50%' },
        { input: 'use 25% for lending', expected: '25%' },
        { input: 'allocate 100% to yield', expected: '100%' },
        { input: 'invest 33.5% of portfolio', expected: '33.5%' }
      ];

      for (const { input, expected } of testCases) {
        const result = await extractor.extractEntities(input);
        const entities = TestAssertions.expectSuccess(result);
        
        const amountEntity = entities.find(e => e.type === 'amount');
        expect(amountEntity).toBeDefined();
        expect(amountEntity.value).toBe(expected);
      }
    });

    it('should extract relative amounts', async () => {
      const testCases = [
        { input: 'lend all my USDC', expected: 'all' },
        { input: 'use half of my tokens', expected: 'half' },
        { input: 'invest everything', expected: 'everything' },
        { input: 'quarter of my balance', expected: 'quarter' }
      ];

      for (const { input, expected } of testCases) {
        const result = await extractor.extractEntities(input);
        const entities = TestAssertions.expectSuccess(result);
        
        const amountEntity = entities.find(e => e.type === 'amount');
        expect(amountEntity).toBeDefined();
        expect(amountEntity.value).toBe(expected);
      }
    });

    it('should handle multiple amounts', async () => {
      const input = 'swap 100 SEI for 500 USDC';
      const result = await extractor.extractEntities(input);
      const entities = TestAssertions.expectSuccess(result);
      
      const amountEntities = entities.filter(e => e.type === 'amount');
      expect(amountEntities).toHaveLength(2);
      expect(amountEntities.map(e => e.value)).toContain('100');
      expect(amountEntities.map(e => e.value)).toContain('500');
    });
  });

  describe('Token Extraction', () => {
    it('should extract standard token symbols', async () => {
      const testCases = [
        { input: 'lend USDC tokens', expected: 'USDC' },
        { input: 'borrow SEI', expected: 'SEI' },
        { input: 'swap ETH for BTC', expected: ['ETH', 'BTC'] },
        { input: 'add USDT liquidity', expected: 'USDT' }
      ];

      for (const { input, expected } of testCases) {
        const result = await extractor.extractEntities(input);
        const entities = TestAssertions.expectSuccess(result);
        
        const tokenEntities = entities.filter(e => e.type === 'token');
        
        if (Array.isArray(expected)) {
          expect(tokenEntities).toHaveLength(expected.length);
          expected.forEach(token => {
            expect(tokenEntities.map(e => e.value)).toContain(token);
          });
        } else {
          expect(tokenEntities).toHaveLength(1);
          expect(tokenEntities[0].value).toBe(expected);
        }
      }
    });

    it('should extract token names', async () => {
      const testCases = [
        { input: 'lend Sei tokens', expected: 'Sei' },
        { input: 'borrow Ethereum', expected: 'Ethereum' },
        { input: 'swap Bitcoin for Dogecoin', expected: ['Bitcoin', 'Dogecoin'] },
        { input: 'add Tether liquidity', expected: 'Tether' }
      ];

      for (const { input, expected } of testCases) {
        const result = await extractor.extractEntities(input);
        const entities = TestAssertions.expectSuccess(result);
        
        const tokenEntities = entities.filter(e => e.type === 'token');
        
        if (Array.isArray(expected)) {
          expect(tokenEntities.length).toBeGreaterThanOrEqual(expected.length);
          expected.forEach(token => {
            expect(tokenEntities.map(e => e.value)).toContain(token);
          });
        } else {
          expect(tokenEntities.length).toBeGreaterThanOrEqual(1);
          expect(tokenEntities.map(e => e.value)).toContain(expected);
        }
      }
    });

    it('should handle token aliases', async () => {
      const testCases = [
        { input: 'lend stablecoins', expected: 'stablecoins' },
        { input: 'borrow stable tokens', expected: 'stable tokens' },
        { input: 'swap altcoins', expected: 'altcoins' },
        { input: 'add native token', expected: 'native token' }
      ];

      for (const { input, expected } of testCases) {
        const result = await extractor.extractEntities(input);
        const entities = TestAssertions.expectSuccess(result);
        
        const tokenEntities = entities.filter(e => e.type === 'token');
        expect(tokenEntities.length).toBeGreaterThanOrEqual(1);
        expect(tokenEntities.map(e => e.value)).toContain(expected);
      }
    });

    it('should extract trading pairs', async () => {
      const testCases = [
        { input: 'add liquidity to SEI/USDC pool', expected: ['SEI', 'USDC'] },
        { input: 'trade ETH-BTC pair', expected: ['ETH', 'BTC'] },
        { input: 'provide SEI-USDT liquidity', expected: ['SEI', 'USDT'] }
      ];

      for (const { input, expected } of testCases) {
        const result = await extractor.extractEntities(input);
        const entities = TestAssertions.expectSuccess(result);
        
        const tokenEntities = entities.filter(e => e.type === 'token');
        expect(tokenEntities).toHaveLength(expected.length);
        
        expected.forEach(token => {
          expect(tokenEntities.map(e => e.value)).toContain(token);
        });
      }
    });
  });

  describe('Protocol Extraction', () => {
    it('should extract protocol names', async () => {
      const testCases = [
        { input: 'lend on Silo protocol', expected: 'Silo' },
        { input: 'borrow from Takara', expected: 'Takara' },
        { input: 'swap on DragonSwap', expected: 'DragonSwap' },
        { input: 'use Symphony for trading', expected: 'Symphony' }
      ];

      for (const { input, expected } of testCases) {
        const result = await extractor.extractEntities(input);
        const entities = TestAssertions.expectSuccess(result);
        
        const protocolEntity = entities.find(e => e.type === 'protocol');
        expect(protocolEntity).toBeDefined();
        expect(protocolEntity.value).toBe(expected);
      }
    });

    it('should handle protocol variations', async () => {
      const testCases = [
        { input: 'use silo for lending', expected: 'silo' },
        { input: 'dragonswap exchange', expected: 'dragonswap' },
        { input: 'takara platform', expected: 'takara' }
      ];

      for (const { input, expected } of testCases) {
        const result = await extractor.extractEntities(input);
        const entities = TestAssertions.expectSuccess(result);
        
        const protocolEntity = entities.find(e => e.type === 'protocol');
        expect(protocolEntity).toBeDefined();
        expect(protocolEntity.value.toLowerCase()).toBe(expected);
      }
    });

    it('should extract multiple protocols', async () => {
      const input = 'compare Silo and Takara lending rates';
      const result = await extractor.extractEntities(input);
      const entities = TestAssertions.expectSuccess(result);
      
      const protocolEntities = entities.filter(e => e.type === 'protocol');
      expect(protocolEntities).toHaveLength(2);
      expect(protocolEntities.map(e => e.value)).toContain('Silo');
      expect(protocolEntities.map(e => e.value)).toContain('Takara');
    });
  });

  describe('Leverage Extraction', () => {
    it('should extract leverage values', async () => {
      const testCases = [
        { input: 'lend with 2x leverage', expected: '2x' },
        { input: 'borrow at 5x leverage', expected: '5x' },
        { input: 'farm with 10x', expected: '10x' },
        { input: 'use 3.5x leverage', expected: '3.5x' }
      ];

      for (const { input, expected } of testCases) {
        const result = await extractor.extractEntities(input);
        const entities = TestAssertions.expectSuccess(result);
        
        const leverageEntity = entities.find(e => e.type === 'leverage');
        expect(leverageEntity).toBeDefined();
        expect(leverageEntity.value).toBe(expected);
      }
    });

    it('should extract leverage alternatives', async () => {
      const testCases = [
        { input: 'borrow 2 times my collateral', expected: '2 times' },
        { input: 'leverage by factor of 5', expected: 'factor of 5' },
        { input: 'multiply by 3', expected: 'multiply by 3' }
      ];

      for (const { input, expected } of testCases) {
        const result = await extractor.extractEntities(input);
        const entities = TestAssertions.expectSuccess(result);
        
        const leverageEntity = entities.find(e => e.type === 'leverage');
        expect(leverageEntity).toBeDefined();
        expect(leverageEntity.value).toBe(expected);
      }
    });
  });

  describe('Slippage Extraction', () => {
    it('should extract slippage values', async () => {
      const testCases = [
        { input: 'swap with 1% slippage', expected: '1%' },
        { input: 'trade with 0.5% slippage tolerance', expected: '0.5%' },
        { input: 'max slippage 5%', expected: '5%' },
        { input: 'slippage of 2.5%', expected: '2.5%' }
      ];

      for (const { input, expected } of testCases) {
        const result = await extractor.extractEntities(input);
        const entities = TestAssertions.expectSuccess(result);
        
        const slippageEntity = entities.find(e => e.type === 'slippage');
        expect(slippageEntity).toBeDefined();
        expect(slippageEntity.value).toBe(expected);
      }
    });

    it('should extract slippage alternatives', async () => {
      const testCases = [
        { input: 'low slippage tolerance', expected: 'low' },
        { input: 'high slippage acceptable', expected: 'high' },
        { input: 'minimum slippage', expected: 'minimum' }
      ];

      for (const { input, expected } of testCases) {
        const result = await extractor.extractEntities(input);
        const entities = TestAssertions.expectSuccess(result);
        
        const slippageEntity = entities.find(e => e.type === 'slippage');
        expect(slippageEntity).toBeDefined();
        expect(slippageEntity.value).toBe(expected);
      }
    });
  });

  describe('Duration Extraction', () => {
    it('should extract time durations', async () => {
      const testCases = [
        { input: 'lend for 30 days', expected: '30 days' },
        { input: 'lock for 1 month', expected: '1 month' },
        { input: 'stake for 6 months', expected: '6 months' },
        { input: 'commitment of 1 year', expected: '1 year' }
      ];

      for (const { input, expected } of testCases) {
        const result = await extractor.extractEntities(input);
        const entities = TestAssertions.expectSuccess(result);
        
        const durationEntity = entities.find(e => e.type === 'duration');
        expect(durationEntity).toBeDefined();
        expect(durationEntity.value).toBe(expected);
      }
    });

    it('should extract relative durations', async () => {
      const testCases = [
        { input: 'lend short term', expected: 'short term' },
        { input: 'long term investment', expected: 'long term' },
        { input: 'permanent lock', expected: 'permanent' }
      ];

      for (const { input, expected } of testCases) {
        const result = await extractor.extractEntities(input);
        const entities = TestAssertions.expectSuccess(result);
        
        const durationEntity = entities.find(e => e.type === 'duration');
        expect(durationEntity).toBeDefined();
        expect(durationEntity.value).toBe(expected);
      }
    });
  });

  describe('Risk Level Extraction', () => {
    it('should extract risk levels', async () => {
      const testCases = [
        { input: 'low risk strategy', expected: 'low' },
        { input: 'high risk investment', expected: 'high' },
        { input: 'medium risk approach', expected: 'medium' },
        { input: 'conservative option', expected: 'conservative' }
      ];

      for (const { input, expected } of testCases) {
        const result = await extractor.extractEntities(input);
        const entities = TestAssertions.expectSuccess(result);
        
        const riskEntity = entities.find(e => e.type === 'risk');
        expect(riskEntity).toBeDefined();
        expect(riskEntity.value).toBe(expected);
      }
    });

    it('should extract risk preferences', async () => {
      const testCases = [
        { input: 'I am risk averse', expected: 'risk averse' },
        { input: 'aggressive trading style', expected: 'aggressive' },
        { input: 'very conservative approach', expected: 'very conservative' }
      ];

      for (const { input, expected } of testCases) {
        const result = await extractor.extractEntities(input);
        const entities = TestAssertions.expectSuccess(result);
        
        const riskEntity = entities.find(e => e.type === 'risk');
        expect(riskEntity).toBeDefined();
        expect(riskEntity.value).toBe(expected);
      }
    });
  });

  describe('Complex Entity Extraction', () => {
    it('should extract multiple entity types', async () => {
      const input = 'lend 1000 USDC on Silo with 2x leverage for 30 days at low risk';
      const result = await extractor.extractEntities(input);
      const entities = TestAssertions.expectSuccess(result);
      
      const entityTypes = entities.map(e => e.type);
      expect(entityTypes).toContain('amount');
      expect(entityTypes).toContain('token');
      expect(entityTypes).toContain('protocol');
      expect(entityTypes).toContain('leverage');
      expect(entityTypes).toContain('duration');
      expect(entityTypes).toContain('risk');
    });

    it('should handle entity relationships', async () => {
      const input = 'swap 100 SEI for 500 USDC on DragonSwap';
      const result = await extractor.extractEntities(input);
      const entities = TestAssertions.expectSuccess(result);
      
      const swapFromEntity = entities.find(e => 
        e.type === 'amount' && e.position < entities.find(e2 => e2.value === 'SEI')?.position
      );
      const swapToEntity = entities.find(e => 
        e.type === 'amount' && e.position > entities.find(e2 => e2.value === 'SEI')?.position
      );
      
      expect(swapFromEntity?.value).toBe('100');
      expect(swapToEntity?.value).toBe('500');
    });

    it('should handle ambiguous entities', async () => {
      const input = 'trade 100 on platform'; // Ambiguous amount and protocol
      const result = await extractor.extractEntities(input);
      const entities = TestAssertions.expectSuccess(result);
      
      const amountEntity = entities.find(e => e.type === 'amount');
      expect(amountEntity).toBeDefined();
      expect(amountEntity.confidence).toBeLessThan(1.0); // Should have lower confidence
    });
  });

  describe('Validation and Confidence', () => {
    it('should provide confidence scores', async () => {
      const input = 'lend 1000 USDC';
      const result = await extractor.extractEntities(input);
      const entities = TestAssertions.expectSuccess(result);
      
      entities.forEach(entity => {
        expect(entity.confidence).toBeGreaterThan(0);
        expect(entity.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should validate entity formats', async () => {
      const input = 'lend 1000 USDC';
      const result = await extractor.extractEntities(input);
      const entities = TestAssertions.expectSuccess(result);
      
      const amountEntity = entities.find(e => e.type === 'amount');
      expect(amountEntity.isValid).toBe(true);
      
      const tokenEntity = entities.find(e => e.type === 'token');
      expect(tokenEntity.isValid).toBe(true);
    });

    it('should provide entity positions', async () => {
      const input = 'lend 1000 USDC';
      const result = await extractor.extractEntities(input);
      const entities = TestAssertions.expectSuccess(result);
      
      entities.forEach(entity => {
        expect(entity.startPosition).toBeGreaterThanOrEqual(0);
        expect(entity.endPosition).toBeGreaterThan(entity.startPosition);
        expect(entity.endPosition).toBeLessThanOrEqual(input.length);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input', async () => {
      const input = '';
      const result = await extractor.extractEntities(input);
      const entities = TestAssertions.expectSuccess(result);
      
      expect(entities).toHaveLength(0);
    });

    it('should handle input with no entities', async () => {
      const input = 'hello world how are you today';
      const result = await extractor.extractEntities(input);
      const entities = TestAssertions.expectSuccess(result);
      
      expect(entities).toHaveLength(0);
    });

    it('should handle malformed numbers', async () => {
      const input = 'lend 1,000.50.25 USDC';
      const result = await extractor.extractEntities(input);
      const entities = TestAssertions.expectSuccess(result);
      
      const amountEntity = entities.find(e => e.type === 'amount');
      if (amountEntity) {
        expect(amountEntity.confidence).toBeLessThan(0.8);
      }
    });

    it('should handle very long input', async () => {
      const input = 'lend 1000 USDC '.repeat(100);
      const result = await extractor.extractEntities(input);
      const entities = TestAssertions.expectSuccess(result);
      
      expect(entities.length).toBeGreaterThan(0);
    });

    it('should handle special characters', async () => {
      const input = 'lend 1,000.50 USDC @best_rate #defi';
      const result = await extractor.extractEntities(input);
      const entities = TestAssertions.expectSuccess(result);
      
      const amountEntity = entities.find(e => e.type === 'amount');
      expect(amountEntity).toBeDefined();
      expect(amountEntity.value).toBe('1,000.50');
      
      const tokenEntity = entities.find(e => e.type === 'token');
      expect(tokenEntity).toBeDefined();
      expect(tokenEntity.value).toBe('USDC');
    });
  });

  describe('Performance', () => {
    it('should extract entities quickly', async () => {
      const input = 'lend 1000 USDC on Silo with 2x leverage';
      const start = performance.now();
      
      await extractor.extractEntities(input);
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(200); // Should complete in under 200ms
    });

    it('should handle concurrent extractions', async () => {
      const inputs = [
        'lend 1000 USDC',
        'borrow 500 SEI',
        'swap 100 ETH for BTC',
        'add liquidity to pool'
      ];
      
      const promises = inputs.map(input => extractor.extractEntities(input));
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        TestAssertions.expectSuccess(result);
      });
    });
  });

  describe('Configuration', () => {
    it('should respect caching configuration', async () => {
      const cachingConfig = { ...config, enableEntityCaching: true };
      const noCacheConfig = { ...config, enableEntityCaching: false };
      
      const cachingExtractor = new EntityExtractor(cachingConfig);
      const noCacheExtractor = new EntityExtractor(noCacheConfig);
      
      const input = 'lend 1000 USDC';
      
      // First call to populate cache
      await cachingExtractor.extractEntities(input);
      
      // Second call should be faster due to caching
      const start1 = performance.now();
      await cachingExtractor.extractEntities(input);
      const cachingTime = performance.now() - start1;
      
      const start2 = performance.now();
      await noCacheExtractor.extractEntities(input);
      const noCacheTime = performance.now() - start2;
      
      // Caching should make it faster (though this might be flaky in tests)
      expect(cachingTime).toBeLessThanOrEqual(noCacheTime + 50); // Allow some variance
    });
  });
});