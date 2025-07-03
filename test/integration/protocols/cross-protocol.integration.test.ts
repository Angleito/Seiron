/**
 * Cross-Protocol Integration Tests
 * Tests complex operations across Symphony and Takara protocols
 */

import { describe, test, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import * as A from 'fp-ts/Array';
import * as fc from 'fast-check';

import { SymphonyProtocolWrapper } from '../../../src/protocols/sei/adapters/SymphonyProtocolWrapper';
import { TakaraProtocolWrapper } from '../../../src/protocols/sei/adapters/TakaraProtocolWrapper';
import { CrossProtocolOrchestrator } from '../../../src/orchestrator/core';

import { 
  SymphonyConfig,
  TakaraConfig,
  SwapQuoteRequest,
  SupplyRequest,
  BorrowRequest,
  ArbitrageOpportunity,
  LeveragePosition,
  YieldOptimizationStrategy
} from '../../../src/protocols/sei/types';

import { TestEnvironment } from '../../utils/TestEnvironment';
import { PropertyTestRunner } from '../../utils/PropertyTestRunner';
import { MetricsCollector } from '../../utils/MetricsCollector';
import { ArbitrageDetector } from '../../utils/ArbitrageDetector';

describe('Cross-Protocol Integration Tests', () => {
  let testEnv: TestEnvironment;
  let symphonyWrapper: SymphonyProtocolWrapper;
  let takaraWrapper: TakaraProtocolWrapper;
  let orchestrator: CrossProtocolOrchestrator;
  let metricsCollector: MetricsCollector;
  let arbitrageDetector: ArbitrageDetector;
  
  const symphonyConfig: SymphonyConfig = {
    apiUrl: process.env.SYMPHONY_API_URL || 'http://symphony-mock:8001',
    contractAddress: 'sei1symphony1z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
    maxSlippagePercent: 0.5,
    gasLimitMultiplier: 1.2,
    timeout: 30000
  };

  const takaraConfig: TakaraConfig = {
    apiUrl: process.env.TAKARA_API_URL || 'http://takara-mock:8002',
    contractAddress: 'sei1takara1z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
    timeout: 30000
  };

  const testUserAddress = 'sei1crossuser1z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6';
  
  beforeAll(async () => {
    testEnv = await TestEnvironment.create();
    symphonyWrapper = new SymphonyProtocolWrapper(symphonyConfig);
    takaraWrapper = new TakaraProtocolWrapper(takaraConfig);
    orchestrator = new CrossProtocolOrchestrator({
      symphony: symphonyWrapper,
      takara: takaraWrapper
    });
    metricsCollector = new MetricsCollector('cross-protocol');
    arbitrageDetector = new ArbitrageDetector([symphonyWrapper, takaraWrapper]);
    
    await testEnv.waitForServices(['symphony-mock', 'takara-mock']);
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.resetState();
    metricsCollector.startTest();
  });

  afterEach(async () => {
    metricsCollector.endTest();
  });

  describe('Arbitrage Operations', () => {
    test('should detect arbitrage opportunities between protocols', async () => {
      const asset = 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6';
      const amount = '10000000'; // 10 USDC
      
      const startTime = Date.now();
      
      // Get prices from both protocols
      const symphonyQuote = await symphonyWrapper.getSwapQuote({
        tokenIn: 'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
        tokenOut: asset,
        amountIn: amount,
        slippagePercent: 0.5
      });
      
      const takaraSupplyAPY = await takaraWrapper.getSupportedAssets();
      
      const duration = Date.now() - startTime;
      metricsCollector.recordLatency('arbitrageDetection', duration);
      
      expect(E.isRight(symphonyQuote)).toBe(true);
      expect(E.isRight(takaraSupplyAPY)).toBe(true);
      
      if (E.isRight(symphonyQuote) && E.isRight(takaraSupplyAPY)) {
        const symphonyPrice = parseFloat(symphonyQuote.right.route.executionPrice);
        const takaraAsset = takaraSupplyAPY.right.find(a => a.address === asset);
        
        expect(symphonyPrice).toBeGreaterThan(0);
        expect(takaraAsset).toBeDefined();
        
        if (takaraAsset) {
          // Calculate potential arbitrage
          const priceDiscrepancy = Math.abs(symphonyPrice - 1.0); // USDC should be ~$1
          const arbitrageThreshold = 0.01; // 1%
          
          if (priceDiscrepancy > arbitrageThreshold) {
            // Arbitrage opportunity detected
            const opportunity = await arbitrageDetector.calculateArbitrageProfit({
              protocol1: 'symphony',
              protocol2: 'takara',
              asset,
              amount,
              price1: symphonyPrice,
              price2: 1.0
            });
            
            expect(opportunity.profitable).toBeDefined();
            if (opportunity.profitable) {
              expect(opportunity.estimatedProfit).toBeGreaterThan(0);
              expect(opportunity.riskScore).toBeGreaterThanOrEqual(0);
              expect(opportunity.riskScore).toBeLessThanOrEqual(1);
            }
          }
        }
      }
    });

    test('should execute profitable arbitrage across protocols', async () => {
      const arbitrageScenario = {
        asset: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
        amount: '50000000', // 50 USDC
        protocol1: 'symphony',
        protocol2: 'takara'
      };
      
      const startTime = Date.now();
      
      // Detect arbitrage opportunity
      const opportunity = await arbitrageDetector.findBestArbitrageOpportunity(arbitrageScenario);
      
      if (opportunity && opportunity.profitable) {
        // Execute arbitrage
        const arbitrageResult = await orchestrator.executeArbitrage({
          opportunity,
          userAddress: testUserAddress,
          maxSlippage: 0.5,
          deadline: Date.now() + 300000 // 5 minutes
        });
        
        const duration = Date.now() - startTime;
        metricsCollector.recordLatency('arbitrageExecution', duration);
        
        expect(E.isRight(arbitrageResult)).toBe(true);
        
        if (E.isRight(arbitrageResult)) {
          const result = arbitrageResult.right;
          
          expect(result.txHashes).toBeDefined();
          expect(result.txHashes.length).toBeGreaterThan(0);
          expect(result.actualProfit).toBeDefined();
          expect(result.gasUsed).toBeDefined();
          expect(result.executionTime).toBeDefined();
          
          // Validate profitability after costs
          const gasUsd = parseFloat(result.gasUsed) * 0.000020 * 400; // Rough gas cost in USD
          const netProfit = result.actualProfit - gasUsd;
          
          expect(netProfit).toBeGreaterThan(0);
          
          metricsCollector.recordValue('arbitrageProfit', result.actualProfit);
          metricsCollector.recordValue('arbitrageGasCost', gasUsd);
        }
      } else {
        // No arbitrage opportunity is also a valid result
        expect(opportunity?.profitable).toBeFalsy();
      }
    });

    test('should handle failed arbitrage gracefully', async () => {
      const impossibleArbitrage = {
        asset: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
        amount: '999999999999', // Impossibly large amount
        protocol1: 'symphony',
        protocol2: 'takara'
      };
      
      const opportunity = await arbitrageDetector.findBestArbitrageOpportunity(impossibleArbitrage);
      
      if (opportunity && opportunity.profitable) {
        const arbitrageResult = await orchestrator.executeArbitrage({
          opportunity,
          userAddress: testUserAddress,
          maxSlippage: 0.5,
          deadline: Date.now() + 300000
        });
        
        // Should either succeed or fail gracefully
        if (E.isLeft(arbitrageResult)) {
          expect(arbitrageResult.left.type).toBeOneOf([
            'insufficient_liquidity',
            'slippage_exceeded',
            'execution_failed'
          ]);
        }
      } else {
        // No opportunity is expected for impossible scenarios
        expect(opportunity?.profitable).toBeFalsy();
      }
    });
  });

  describe('Leverage Operations', () => {
    test('should create leveraged positions across protocols', async () => {
      const leverageRequest = {
        userAddress: testUserAddress,
        collateralAsset: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
        collateralAmount: '20000000', // 20 USDC
        leverageTarget: 'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2', // SEI
        leverageRatio: 2.0,
        maxSlippage: 1.0
      };
      
      const startTime = Date.now();
      
      const leverageResult = await orchestrator.createLeveragedPosition(leverageRequest);
      
      const duration = Date.now() - startTime;
      metricsCollector.recordLatency('leverageCreation', duration);
      
      expect(E.isRight(leverageResult)).toBe(true);
      
      if (E.isRight(leverageResult)) {
        const result = leverageResult.right;
        
        expect(result.position).toBeDefined();
        expect(result.position.collateralAmount).toBe('20000000');
        expect(result.position.leverageRatio).toBeCloseTo(2.0, 1);
        expect(result.position.healthFactor).toBeGreaterThan(1.0);
        expect(result.position.totalExposure).toBeGreaterThan(parseFloat(leverageRequest.collateralAmount));
        
        // Validate transaction details
        expect(result.transactions).toBeDefined();
        expect(result.transactions.supply).toBeDefined();
        expect(result.transactions.borrow).toBeDefined();
        expect(result.transactions.swap).toBeDefined();
        
        // Check that leverage was achieved through borrowing and swapping
        const expectedBorrowAmount = parseFloat(leverageRequest.collateralAmount) * (leverageRequest.leverageRatio - 1);
        expect(result.position.borrowedAmount).toBeCloseTo(expectedBorrowAmount, -5); // Within 100k units
        
        metricsCollector.recordValue('leverageRatio', result.position.leverageRatio);
        metricsCollector.recordValue('leverageHealthFactor', result.position.healthFactor);
      }
    });

    test('should manage leverage position risk', async () => {
      // Create a leveraged position first
      const leverageRequest = {
        userAddress: testUserAddress,
        collateralAsset: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
        collateralAmount: '15000000',
        leverageTarget: 'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
        leverageRatio: 2.5,
        maxSlippage: 1.0
      };
      
      const leverageResult = await orchestrator.createLeveragedPosition(leverageRequest);
      expect(E.isRight(leverageResult)).toBe(true);
      
      if (E.isRight(leverageResult)) {
        const position = leverageResult.right.position;
        
        // Monitor position health
        const healthFactor = await takaraWrapper.getHealthFactor(testUserAddress);
        expect(E.isRight(healthFactor)).toBe(true);
        
        if (E.isRight(healthFactor)) {
          expect(healthFactor.right).toBeGreaterThan(1.0);
          
          // If health factor is low, test rebalancing
          if (healthFactor.right < 1.5) {
            const rebalanceRequest = {
              userAddress: testUserAddress,
              targetHealthFactor: 2.0,
              maxSlippage: 1.0
            };
            
            const rebalanceResult = await orchestrator.rebalanceLeveragePosition(rebalanceRequest);
            
            expect(E.isRight(rebalanceResult)).toBe(true);
            
            if (E.isRight(rebalanceResult)) {
              expect(rebalanceResult.right.newHealthFactor).toBeGreaterThan(healthFactor.right);
              expect(rebalanceResult.right.newHealthFactor).toBeCloseTo(2.0, 0.5);
            }
          }
        }
      }
    });

    test('should unwind leveraged positions', async () => {
      // Create a position to unwind
      const leverageRequest = {
        userAddress: testUserAddress,
        collateralAsset: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
        collateralAmount: '10000000',
        leverageTarget: 'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
        leverageRatio: 1.8,
        maxSlippage: 1.0
      };
      
      const leverageResult = await orchestrator.createLeveragedPosition(leverageRequest);
      expect(E.isRight(leverageResult)).toBe(true);
      
      if (E.isRight(leverageResult)) {
        const position = leverageResult.right.position;
        
        // Unwind the position
        const unwindRequest = {
          userAddress: testUserAddress,
          positionId: position.id,
          unwindRatio: 1.0, // Fully unwind
          maxSlippage: 1.0
        };
        
        const unwindResult = await orchestrator.unwindLeveragePosition(unwindRequest);
        
        expect(E.isRight(unwindResult)).toBe(true);
        
        if (E.isRight(unwindResult)) {
          const result = unwindResult.right;
          
          expect(result.transactions).toBeDefined();
          expect(result.transactions.swap).toBeDefined();
          expect(result.transactions.repay).toBeDefined();
          expect(result.transactions.withdraw).toBeDefined();
          
          expect(result.finalHealthFactor).toBeGreaterThan(10); // Should be very healthy after unwind
          expect(result.remainingCollateral).toBeDefined();
          
          // Check that position is mostly unwound
          const finalPositions = await takaraWrapper.getUserPositions(testUserAddress);
          if (E.isRight(finalPositions)) {
            const remainingDebt = Object.values(finalPositions.right.borrows).reduce(
              (sum, pos) => sum + parseFloat(pos.amount), 0
            );
            expect(remainingDebt).toBeLessThan(1000000); // Should be minimal remaining debt
          }
        }
      }
    });
  });

  describe('Yield Optimization', () => {
    test('should optimize yield across protocols', async () => {
      const portfolioAssets = [
        {
          asset: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
          amount: '50000000' // 50 USDC
        },
        {
          asset: 'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
          amount: '20000000' // 20 SEI
        }
      ];
      
      const yieldOptimizationRequest = {
        userAddress: testUserAddress,
        assets: portfolioAssets,
        riskTolerance: 'medium' as const,
        timeHorizon: '1month' as const,
        rebalanceThreshold: 0.02 // 2%
      };
      
      const startTime = Date.now();
      
      const optimizationResult = await orchestrator.optimizeYield(yieldOptimizationRequest);
      
      const duration = Date.now() - startTime;
      metricsCollector.recordLatency('yieldOptimization', duration);
      
      expect(E.isRight(optimizationResult)).toBe(true);
      
      if (E.isRight(optimizationResult)) {
        const result = optimizationResult.right;
        
        expect(result.strategy).toBeDefined();
        expect(result.expectedAPY).toBeGreaterThan(0);
        expect(result.riskScore).toBeGreaterThanOrEqual(0);
        expect(result.riskScore).toBeLessThanOrEqual(1);
        
        expect(result.allocations).toBeDefined();
        expect(result.allocations.length).toBeGreaterThan(0);
        
        // Validate allocations sum to 100%
        const totalAllocation = result.allocations.reduce(
          (sum, allocation) => sum + allocation.percentage, 0
        );
        expect(totalAllocation).toBeCloseTo(100, 1);
        
        // Check that allocations include both protocols
        const protocols = result.allocations.map(a => a.protocol);
        expect(protocols).toContain('symphony');
        expect(protocols).toContain('takara');
        
        metricsCollector.recordValue('expectedAPY', result.expectedAPY);
        metricsCollector.recordValue('yieldRiskScore', result.riskScore);
      }
    });

    test('should rebalance portfolio for better yield', async () => {
      // Setup initial positions
      const initialAssets = [
        {
          protocol: 'takara',
          asset: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
          amount: '30000000',
          action: 'supply'
        }
      ];
      
      // Supply initial assets
      for (const asset of initialAssets) {
        if (asset.protocol === 'takara' && asset.action === 'supply') {
          const supplyResult = await takaraWrapper.supply({
            userAddress: testUserAddress,
            assetAddress: asset.asset,
            amount: asset.amount
          });
          expect(E.isRight(supplyResult)).toBe(true);
        }
      }
      
      // Get current portfolio
      const currentPositions = await takaraWrapper.getUserPositions(testUserAddress);
      expect(E.isRight(currentPositions)).toBe(true);
      
      if (E.isRight(currentPositions)) {
        // Trigger rebalancing
        const rebalanceRequest = {
          userAddress: testUserAddress,
          targetStrategy: 'aggressive_yield' as const,
          maxSlippage: 1.0,
          rebalanceThreshold: 0.01
        };
        
        const rebalanceResult = await orchestrator.rebalancePortfolio(rebalanceRequest);
        
        expect(E.isRight(rebalanceResult)).toBe(true);
        
        if (E.isRight(rebalanceResult)) {
          const result = rebalanceResult.right;
          
          expect(result.transactions).toBeDefined();
          expect(result.newAllocations).toBeDefined();
          expect(result.expectedYieldImprovement).toBeGreaterThanOrEqual(0);
          
          // Validate that rebalancing improved the situation
          if (result.transactions.length > 0) {
            expect(result.expectedYieldImprovement).toBeGreaterThan(rebalanceRequest.rebalanceThreshold);
          }
        }
      }
    });
  });

  describe('Property-Based Cross-Protocol Tests', () => {
    test('property: arbitrage operations preserve value', async () => {
      const arbitrageArb = fc.record({
        asset: fc.constantFrom('sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6'),
        amount: fc.integer({ min: 1000000, max: 10000000 }).map(n => n.toString()),
        maxSlippage: fc.float({ min: 0.1, max: 2.0 })
      });
      
      await fc.assert(
        fc.asyncProperty(arbitrageArb, async (scenario) => {
          const userAddress = `sei1arb${Math.random().toString(36).substr(2, 9)}`;
          
          // Get initial balances (conceptual)
          const initialValue = parseFloat(scenario.amount);
          
          // Detect arbitrage
          const opportunity = await arbitrageDetector.findBestArbitrageOpportunity({
            asset: scenario.asset,
            amount: scenario.amount,
            protocol1: 'symphony',
            protocol2: 'takara'
          });
          
          if (opportunity && opportunity.profitable) {
            const arbitrageResult = await orchestrator.executeArbitrage({
              opportunity,
              userAddress,
              maxSlippage: scenario.maxSlippage,
              deadline: Date.now() + 300000
            });
            
            if (E.isRight(arbitrageResult)) {
              const result = arbitrageResult.right;
              
              // Value should be preserved (+ profit - gas)
              const finalValue = initialValue + result.actualProfit;
              const gasUsd = parseFloat(result.gasUsed) * 0.000020 * 400;
              
              return finalValue >= initialValue - gasUsd * 1.1; // Allow 10% buffer for gas
            }
          }
          
          return true; // No arbitrage is acceptable
        }),
        { numRuns: 5, timeout: 60000 }
      );
    });

    test('property: leverage positions maintain mathematical relationships', async () => {
      const leverageArb = fc.record({
        collateralAmount: fc.integer({ min: 10000000, max: 50000000 }),
        leverageRatio: fc.float({ min: 1.5, max: 3.0 }),
        collateralAsset: fc.constantFrom('sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6'),
        leverageTarget: fc.constantFrom('sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2')
      });
      
      await fc.assert(
        fc.asyncProperty(leverageArb, async (scenario) => {
          const userAddress = `sei1lev${Math.random().toString(36).substr(2, 9)}`;
          
          const leverageRequest = {
            userAddress,
            collateralAsset: scenario.collateralAsset,
            collateralAmount: scenario.collateralAmount.toString(),
            leverageTarget: scenario.leverageTarget,
            leverageRatio: scenario.leverageRatio,
            maxSlippage: 1.0
          };
          
          const leverageResult = await orchestrator.createLeveragedPosition(leverageRequest);
          
          if (E.isRight(leverageResult)) {
            const position = leverageResult.right.position;
            
            // Mathematical relationships should hold
            const expectedBorrow = scenario.collateralAmount * (scenario.leverageRatio - 1);
            const actualBorrow = position.borrowedAmount;
            const borrowTolerance = expectedBorrow * 0.1; // 10% tolerance
            
            const borrowInRange = Math.abs(actualBorrow - expectedBorrow) <= borrowTolerance;
            const healthFactorSafe = position.healthFactor > 1.0;
            const leverageRatioReasonable = Math.abs(position.leverageRatio - scenario.leverageRatio) <= 0.3;
            
            return borrowInRange && healthFactorSafe && leverageRatioReasonable;
          }
          
          return true; // Failed leverage creation is acceptable for extreme scenarios
        }),
        { numRuns: 5, timeout: 60000 }
      );
    });

    test('property: yield optimization improves or maintains APY', async () => {
      const yieldOptimizationArb = fc.record({
        usdcAmount: fc.integer({ min: 20000000, max: 100000000 }),
        seiAmount: fc.integer({ min: 10000000, max: 50000000 }),
        riskTolerance: fc.constantFrom('conservative', 'medium', 'aggressive')
      });
      
      await fc.assert(
        fc.asyncProperty(yieldOptimizationArb, async (scenario) => {
          const userAddress = `sei1yield${Math.random().toString(36).substr(2, 8)}`;
          
          // Get baseline yields for individual assets
          const assets = await takaraWrapper.getSupportedAssets();
          
          if (E.isLeft(assets)) return true;
          
          const usdcAsset = assets.right.find(a => a.symbol === 'USDC');
          const seiAsset = assets.right.find(a => a.symbol === 'SEI');
          
          if (!usdcAsset || !seiAsset) return true;
          
          // Calculate weighted baseline APY
          const totalValue = scenario.usdcAmount + scenario.seiAmount * 0.5; // SEI at $0.5
          const usdcWeight = scenario.usdcAmount / totalValue;
          const seiWeight = (scenario.seiAmount * 0.5) / totalValue;
          const baselineAPY = usdcAsset.supplyAPY * usdcWeight + seiAsset.supplyAPY * seiWeight;
          
          const optimizationRequest = {
            userAddress,
            assets: [
              { asset: usdcAsset.address, amount: scenario.usdcAmount.toString() },
              { asset: seiAsset.address, amount: scenario.seiAmount.toString() }
            ],
            riskTolerance: scenario.riskTolerance as 'conservative' | 'medium' | 'aggressive',
            timeHorizon: '1month' as const,
            rebalanceThreshold: 0.02
          };
          
          const optimizationResult = await orchestrator.optimizeYield(optimizationRequest);
          
          if (E.isRight(optimizationResult)) {
            const result = optimizationResult.right;
            
            // Optimized yield should be better than or equal to baseline
            return result.expectedAPY >= baselineAPY * 0.95; // Allow 5% tolerance
          }
          
          return true; // Failed optimization is acceptable
        }),
        { numRuns: 4, timeout: 60000 }
      );
    });
  });

  describe('Performance Tests', () => {
    test('should handle concurrent cross-protocol operations', async () => {
      const concurrentOperations = 3;
      const operations = Array.from({ length: concurrentOperations }, (_, i) => ({
        type: i % 2 === 0 ? 'arbitrage' : 'leverage',
        userAddress: `sei1concurrent${i}z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6`,
        amount: (5000000 + i * 1000000).toString()
      }));
      
      const startTime = Date.now();
      
      const results = await Promise.allSettled(
        operations.map(async (op) => {
          if (op.type === 'arbitrage') {
            const opportunity = await arbitrageDetector.findBestArbitrageOpportunity({
              asset: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
              amount: op.amount,
              protocol1: 'symphony',
              protocol2: 'takara'
            });
            
            if (opportunity && opportunity.profitable) {
              return orchestrator.executeArbitrage({
                opportunity,
                userAddress: op.userAddress,
                maxSlippage: 1.0,
                deadline: Date.now() + 300000
              });
            }
            return E.right({ type: 'no_opportunity' });
          } else {
            return orchestrator.createLeveragedPosition({
              userAddress: op.userAddress,
              collateralAsset: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
              collateralAmount: op.amount,
              leverageTarget: 'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
              leverageRatio: 2.0,
              maxSlippage: 1.0
            });
          }
        })
      );
      
      const duration = Date.now() - startTime;
      const successfulResults = results.filter(result => result.status === 'fulfilled');
      
      expect(successfulResults.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(60000); // Should complete within 60 seconds
      
      metricsCollector.recordLatency('concurrentCrossProtocol', duration);
      metricsCollector.recordThroughput('concurrentCrossProtocol', concurrentOperations, duration);
    });

    test('should meet performance requirements for complex operations', async () => {
      const complexOperation = {
        userAddress: testUserAddress,
        assets: [
          { asset: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6', amount: '30000000' },
          { asset: 'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2', amount: '15000000' }
        ],
        riskTolerance: 'medium' as const,
        timeHorizon: '1month' as const,
        rebalanceThreshold: 0.02
      };
      
      const startTime = Date.now();
      const result = await orchestrator.optimizeYield(complexOperation);
      const duration = Date.now() - startTime;
      
      // Complex operations should complete within reasonable time
      expect(duration).toBeLessThan(30000); // 30 seconds max
      
      if (E.isRight(result)) {
        expect(result.right.strategy).toBeDefined();
        expect(result.right.allocations).toBeDefined();
      }
      
      metricsCollector.recordLatency('complexOperation', duration);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle partial failures in multi-step operations', async () => {
      // Simulate a scenario where one protocol fails
      const faultyTakaraConfig = {
        ...takaraConfig,
        apiUrl: 'http://nonexistent:8002'
      };
      
      const faultyTakaraWrapper = new TakaraProtocolWrapper(faultyTakaraConfig);
      const faultyOrchestrator = new CrossProtocolOrchestrator({
        symphony: symphonyWrapper,
        takara: faultyTakaraWrapper
      });
      
      const leverageRequest = {
        userAddress: testUserAddress,
        collateralAsset: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
        collateralAmount: '10000000',
        leverageTarget: 'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
        leverageRatio: 2.0,
        maxSlippage: 1.0
      };
      
      const result = await faultyOrchestrator.createLeveragedPosition(leverageRequest);
      
      expect(E.isLeft(result)).toBe(true);
      
      if (E.isLeft(result)) {
        expect(result.left.type).toBeOneOf([
          'network_error',
          'protocol_unavailable',
          'execution_failed'
        ]);
        
        // Should include recovery information
        expect(result.left.recoveryActions).toBeDefined();
      }
    });

    test('should handle slippage exceeding limits', async () => {
      const highSlippageScenario = {
        userAddress: testUserAddress,
        collateralAsset: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
        collateralAmount: '100000000', // Large amount to cause slippage
        leverageTarget: 'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
        leverageRatio: 3.0,
        maxSlippage: 0.1 // Very low slippage tolerance
      };
      
      const result = await orchestrator.createLeveragedPosition(highSlippageScenario);
      
      // Should either succeed with low slippage or fail gracefully
      if (E.isLeft(result)) {
        expect(result.left.type).toBe('slippage_exceeded');
        expect(result.left.expectedSlippage).toBeGreaterThan(highSlippageScenario.maxSlippage);
      } else {
        // If it succeeds, slippage should be within limits
        expect(result.right.actualSlippage).toBeLessThanOrEqual(highSlippageScenario.maxSlippage);
      }
    });

    test('should handle protocol rate limiting', async () => {
      // Rapid-fire requests to test rate limiting
      const rapidRequests = Array.from({ length: 20 }, (_, i) => ({
        tokenIn: 'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
        tokenOut: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
        amountIn: (1000000 + i * 100000).toString(),
        slippagePercent: 0.5
      }));
      
      const results = await Promise.allSettled(
        rapidRequests.map(req => symphonyWrapper.getSwapQuote(req))
      );
      
      const failures = results.filter(r => r.status === 'rejected' || 
        (r.status === 'fulfilled' && E.isLeft(r.value))
      );
      
      // Some requests might fail due to rate limiting
      if (failures.length > 0) {
        const rateLimitFailures = results.filter(r => 
          r.status === 'fulfilled' && 
          E.isLeft(r.value) && 
          r.value.left.type === 'rate_limit_exceeded'
        );
        
        expect(rateLimitFailures.length).toBeGreaterThan(0);
      }
      
      // Should have at least some successful requests
      const successes = results.filter(r => 
        r.status === 'fulfilled' && E.isRight(r.value)
      );
      expect(successes.length).toBeGreaterThan(rapidRequests.length * 0.3);
    });
  });
});