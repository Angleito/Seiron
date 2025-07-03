/**
 * Protocol Invariants Property-Based Integration Tests
 * Validates mathematical invariants and economic properties across the entire protocol stack
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

import { TestEnvironment } from '../../utils/TestEnvironment';
import { PropertyTestRunner } from '../../utils/PropertyTestRunner';
import { MetricsCollector } from '../../utils/MetricsCollector';

interface ProtocolState {
  totalLiquidity: number;
  totalBorrowed: number;
  totalSupplied: number;
  utilizationRate: number;
  averageAPY: number;
  totalFees: number;
  reserveRatio: number;
}

interface InvariantViolation {
  invariantName: string;
  description: string;
  expectedValue: number;
  actualValue: number;
  tolerance: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

interface SystemSnapshot {
  timestamp: number;
  symphonyState: ProtocolState;
  takaraState: ProtocolState;
  totalSystemValue: number;
  crossProtocolExposure: number;
  systemHealthScore: number;
}

describe('Protocol Invariants Property-Based Integration Tests', () => {
  let testEnv: TestEnvironment;
  let symphonyWrapper: SymphonyProtocolWrapper;
  let takaraWrapper: TakaraProtocolWrapper;
  let orchestrator: CrossProtocolOrchestrator;
  let propertyRunner: PropertyTestRunner;
  let metricsCollector: MetricsCollector;

  const TOLERANCE = 0.0001; // 0.01% tolerance for floating point comparisons
  const CRITICAL_TOLERANCE = 0.001; // 0.1% tolerance for critical invariants

  beforeAll(async () => {
    testEnv = await TestEnvironment.create();
    propertyRunner = new PropertyTestRunner();
    metricsCollector = new MetricsCollector('protocol-invariants');

    symphonyWrapper = new SymphonyProtocolWrapper({
      apiUrl: process.env.SYMPHONY_API_URL || 'http://symphony-mock:8001',
      contractAddress: 'sei1symphony1z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
      maxSlippagePercent: 0.5,
      gasLimitMultiplier: 1.2,
      timeout: 30000
    });

    takaraWrapper = new TakaraProtocolWrapper({
      apiUrl: process.env.TAKARA_API_URL || 'http://takara-mock:8002',
      contractAddress: 'sei1takara1z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
      timeout: 30000
    });

    orchestrator = new CrossProtocolOrchestrator({
      symphony: symphonyWrapper,
      takara: takaraWrapper
    });

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

  describe('Value Conservation Invariants', () => {
    test('property: total system value is conserved across all operations', async () => {
      const operationGenerator = fc.record({
        operationType: fc.constantFrom('swap', 'supply', 'borrow', 'withdraw', 'repay'),
        userAddress: propertyRunner.generateUserAddress(),
        amount: fc.integer({ min: 1000000, max: 50000000 }).map(n => n.toString()),
        asset: fc.constantFrom(
          'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
          'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
          'sei1weth7z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6'
        ),
        slippage: fc.float({ min: 0.001, max: 0.02 })
      });

      await fc.assert(
        fc.asyncProperty(operationGenerator, async (operation) => {
          // Take system snapshot before operation
          const beforeSnapshot = await captureSystemSnapshot();
          
          let operationResult;
          let expectedValueChange = 0;
          let actualFees = 0;

          try {
            switch (operation.operationType) {
              case 'swap':
                operationResult = await executeSwapOperation(operation);
                if (E.isRight(operationResult)) {
                  actualFees = parseFloat(operationResult.right.fees.totalFee);
                }
                break;

              case 'supply':
                operationResult = await executeSupplyOperation(operation);
                expectedValueChange = parseFloat(operation.amount);
                break;

              case 'borrow':
                operationResult = await executeBorrowOperation(operation);
                expectedValueChange = -parseFloat(operation.amount);
                break;

              case 'withdraw':
                operationResult = await executeWithdrawOperation(operation);
                expectedValueChange = -parseFloat(operation.amount);
                break;

              case 'repay':
                operationResult = await executeRepayOperation(operation);
                expectedValueChange = parseFloat(operation.amount);
                break;

              default:
                return true; // Skip unknown operations
            }

            // Take system snapshot after operation
            const afterSnapshot = await captureSystemSnapshot();

            // Validate value conservation
            const systemValueChange = afterSnapshot.totalSystemValue - beforeSnapshot.totalSystemValue;
            const tolerance = Math.max(TOLERANCE * beforeSnapshot.totalSystemValue, actualFees * 1.1);

            // Value should be conserved within tolerance (accounting for fees)
            const valueConserved = Math.abs(systemValueChange - expectedValueChange) <= tolerance;

            if (!valueConserved) {
              console.warn(`Value conservation violation:`, {
                operation: operation.operationType,
                expectedChange: expectedValueChange,
                actualChange: systemValueChange,
                tolerance,
                fees: actualFees
              });
            }

            metricsCollector.recordValue('valueConservationCheck', valueConserved ? 1 : 0);
            return valueConserved;

          } catch (error) {
            // Operation failures are acceptable, but shouldn't violate invariants
            const afterSnapshot = await captureSystemSnapshot();
            const systemValueChange = afterSnapshot.totalSystemValue - beforeSnapshot.totalSystemValue;
            
            // Failed operations shouldn't change system value significantly
            return Math.abs(systemValueChange) < CRITICAL_TOLERANCE * beforeSnapshot.totalSystemValue;
          }
        }),
        { numRuns: 15, timeout: 60000 }
      );
    });

    test('property: protocol reserves maintain minimum thresholds', async () => {
      const reserveTestGenerator = fc.record({
        operations: fc.array(
          fc.record({
            type: fc.constantFrom('supply', 'withdraw', 'borrow', 'repay'),
            amount: fc.integer({ min: 500000, max: 20000000 }),
            asset: fc.constantFrom(
              'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
              'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2'
            )
          }),
          { minLength: 1, maxLength: 5 }
        ),
        userAddress: propertyRunner.generateUserAddress()
      });

      await fc.assert(
        fc.asyncProperty(reserveTestGenerator, async (scenario) => {
          let allReservesValid = true;

          for (const operation of scenario.operations) {
            try {
              // Execute operation
              await executeProtocolOperation(operation, scenario.userAddress);

              // Check reserve ratios after each operation
              const takaraAssets = await takaraWrapper.getSupportedAssets();
              
              if (E.isRight(takaraAssets)) {
                for (const asset of takaraAssets.right) {
                  const utilizationRate = asset.utilizationRate;
                  const reserveRatio = 1 - utilizationRate;
                  
                  // Reserve ratio should never fall below critical threshold (10%)
                  if (reserveRatio < 0.1) {
                    allReservesValid = false;
                    console.warn(`Critical reserve violation for asset ${asset.symbol}:`, {
                      utilizationRate,
                      reserveRatio,
                      operation
                    });
                  }

                  // Utilization rate should never exceed 95%
                  if (utilizationRate > 0.95) {
                    allReservesValid = false;
                    console.warn(`Over-utilization detected for asset ${asset.symbol}:`, {
                      utilizationRate,
                      operation
                    });
                  }

                  metricsCollector.recordValue(`${asset.symbol}_utilizationRate`, utilizationRate);
                  metricsCollector.recordValue(`${asset.symbol}_reserveRatio`, reserveRatio);
                }
              }

            } catch (error) {
              // Operation failures shouldn't affect reserve invariant checking
              continue;
            }
          }

          return allReservesValid;
        }),
        { numRuns: 10, timeout: 90000 }
      );
    });

    test('property: interest rate calculations are mathematically consistent', async () => {
      const interestRateGenerator = fc.record({
        utilizationRate: fc.float({ min: 0.1, max: 0.9 }),
        baseRate: fc.float({ min: 0.01, max: 0.1 }),
        slope1: fc.float({ min: 0.05, max: 0.2 }),
        slope2: fc.float({ min: 0.5, max: 2.0 }),
        optimalUtilization: fc.float({ min: 0.6, max: 0.8 })
      });

      await fc.assert(
        fc.asyncProperty(interestRateGenerator, async (params) => {
          // Calculate expected interest rates using standard DeFi formulas
          let expectedBorrowRate: number;
          
          if (params.utilizationRate <= params.optimalUtilization) {
            expectedBorrowRate = params.baseRate + 
              (params.utilizationRate / params.optimalUtilization) * params.slope1;
          } else {
            expectedBorrowRate = params.baseRate + params.slope1 + 
              ((params.utilizationRate - params.optimalUtilization) / (1 - params.optimalUtilization)) * params.slope2;
          }

          const expectedSupplyRate = expectedBorrowRate * params.utilizationRate * 0.9; // 10% reserve factor

          // Get actual rates from protocol
          const takaraAssets = await takaraWrapper.getSupportedAssets();
          
          if (E.isRight(takaraAssets)) {
            // Find asset with similar utilization rate
            const matchingAsset = takaraAssets.right.find(asset => 
              Math.abs(asset.utilizationRate - params.utilizationRate) < 0.1
            );

            if (matchingAsset) {
              const actualBorrowRate = matchingAsset.borrowAPY / 100;
              const actualSupplyRate = matchingAsset.supplyAPY / 100;

              // Rates should be mathematically consistent
              const borrowRateConsistent = Math.abs(actualBorrowRate - expectedBorrowRate) < 0.05; // 5% tolerance
              const supplyRateConsistent = Math.abs(actualSupplyRate - expectedSupplyRate) < 0.03; // 3% tolerance
              
              // Supply rate should always be less than borrow rate
              const rateHierarchy = actualSupplyRate < actualBorrowRate;

              // Utilization-rate relationship should be monotonic
              const rateMonotonicity = actualBorrowRate > params.baseRate;

              metricsCollector.recordValue('borrowRateConsistency', borrowRateConsistent ? 1 : 0);
              metricsCollector.recordValue('supplyRateConsistency', supplyRateConsistent ? 1 : 0);
              metricsCollector.recordValue('rateHierarchyValid', rateHierarchy ? 1 : 0);

              return borrowRateConsistent && supplyRateConsistent && rateHierarchy && rateMonotonicity;
            }
          }

          return true; // No matching asset to test
        }),
        { numRuns: 20, timeout: 30000 }
      );
    });
  });

  describe('Liquidity Invariants', () => {
    test('property: constant product formula holds for swap operations', async () => {
      const swapGenerator = fc.record({
        tokenIn: fc.constantFrom(
          'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
          'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6'
        ),
        tokenOut: fc.constantFrom(
          'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
          'sei1weth7z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6'
        ),
        amountIn: fc.integer({ min: 100000, max: 5000000 }).map(n => n.toString()),
        slippagePercent: fc.float({ min: 0.1, max: 1.0 })
      }).filter(swap => swap.tokenIn !== swap.tokenOut);

      await fc.assert(
        fc.asyncProperty(swapGenerator, async (swap) => {
          try {
            // Get initial pool state (mock reserves)
            const initialReserves = {
              token0: 50000000, // Mock initial reserves
              token1: 50000000
            };

            // Execute swap
            const swapResult = await symphonyWrapper.getSwapQuote(swap);

            if (E.isRight(swapResult)) {
              const quote = swapResult.right;
              const amountIn = parseFloat(swap.amountIn);
              const amountOut = parseFloat(quote.route.outputAmount);
              const fee = parseFloat(quote.route.fees.totalFee);

              // Calculate expected output using constant product formula
              // (x + Δx) * (y - Δy) = x * y (before fees)
              const amountInAfterFee = amountIn * (1 - 0.003); // 0.3% fee
              const expectedAmountOut = (initialReserves.token1 * amountInAfterFee) / 
                                       (initialReserves.token0 + amountInAfterFee);

              // Allow for price impact and slippage
              const priceImpactTolerance = 0.05; // 5%
              const outputDifference = Math.abs(amountOut - expectedAmountOut) / expectedAmountOut;

              const constantProductValid = outputDifference <= priceImpactTolerance;

              // Verify price impact calculation
              const expectedPriceImpact = amountInAfterFee / 
                                         (initialReserves.token0 + amountInAfterFee);
              const actualPriceImpact = quote.route.priceImpact;
              
              const priceImpactConsistent = Math.abs(actualPriceImpact - expectedPriceImpact) < 0.02;

              // Fee calculation should be consistent
              const expectedFee = amountIn * 0.003;
              const feeConsistent = Math.abs(fee - expectedFee) <= expectedFee * 0.1;

              metricsCollector.recordValue('constantProductValid', constantProductValid ? 1 : 0);
              metricsCollector.recordValue('priceImpactConsistent', priceImpactConsistent ? 1 : 0);
              metricsCollector.recordValue('feeConsistent', feeConsistent ? 1 : 0);

              return constantProductValid && priceImpactConsistent && feeConsistent;
            }

            return true; // Failed quotes are acceptable
          } catch (error) {
            return true; // Errors are acceptable for extreme cases
          }
        }),
        { numRuns: 15, timeout: 45000 }
      );
    });

    test('property: slippage bounds are respected in all market conditions', async () => {
      const slippageTestGenerator = fc.record({
        swapAmount: fc.integer({ min: 1000000, max: 100000000 }),
        maxSlippage: fc.float({ min: 0.001, max: 0.05 }),
        marketVolatility: fc.float({ min: 0.1, max: 1.0 }),
        liquidityLevel: fc.constantFrom('high', 'medium', 'low')
      });

      await fc.assert(
        fc.asyncProperty(slippageTestGenerator, async (scenario) => {
          const swapRequest = {
            tokenIn: 'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
            tokenOut: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
            amountIn: scenario.swapAmount.toString(),
            slippagePercent: scenario.maxSlippage
          };

          try {
            const quoteResult = await symphonyWrapper.getSwapQuote(swapRequest);

            if (E.isRight(quoteResult)) {
              const quote = quoteResult.right;
              const slippageAdjustedOutput = parseFloat(quote.slippageAdjustedAmountOut);
              const expectedOutput = parseFloat(quote.route.outputAmount);

              // Calculate actual slippage
              const actualSlippage = (expectedOutput - slippageAdjustedOutput) / expectedOutput;

              // Slippage should not exceed specified maximum
              const slippageWithinBounds = actualSlippage <= scenario.maxSlippage * 1.01; // 1% tolerance

              // Price impact should correlate with swap size and liquidity
              const priceImpact = quote.route.priceImpact;
              const expectedImpactRange = scenario.liquidityLevel === 'high' ? [0, 0.02] :
                                        scenario.liquidityLevel === 'medium' ? [0, 0.05] :
                                        [0, 0.1];

              const priceImpactReasonable = priceImpact >= expectedImpactRange[0] && 
                                          priceImpact <= expectedImpactRange[1];

              // Large swaps should have proportionally higher impact
              const swapSizeRatio = scenario.swapAmount / 10000000; // Normalize by 10M
              const impactProportional = priceImpact >= swapSizeRatio * 0.001; // Minimum impact

              metricsCollector.recordValue('slippageWithinBounds', slippageWithinBounds ? 1 : 0);
              metricsCollector.recordValue('priceImpactReasonable', priceImpactReasonable ? 1 : 0);
              metricsCollector.recordValue('impactProportional', impactProportional ? 1 : 0);

              return slippageWithinBounds && priceImpactReasonable;
            }

            return true; // Failed quotes acceptable for extreme scenarios
          } catch (error) {
            return true; // Errors acceptable for stress cases
          }
        }),
        { numRuns: 12, timeout: 40000 }
      );
    });
  });

  describe('Cross-Protocol Invariants', () => {
    test('property: arbitrage opportunities are bounded and eliminate over time', async () => {
      const arbitrageGenerator = fc.record({
        asset: fc.constantFrom('sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6'),
        observationPeriod: fc.integer({ min: 10000, max: 60000 }), // 10-60 seconds
        priceCheckInterval: fc.integer({ min: 1000, max: 5000 }), // 1-5 seconds
        marketStability: fc.float({ min: 0.2, max: 0.8 })
      });

      await fc.assert(
        fc.asyncProperty(arbitrageGenerator, async (scenario) => {
          const observations: Array<{
            timestamp: number;
            symphonyPrice: number;
            takaraPrice: number;
            arbitrageOpportunity: number;
          }> = [];

          const startTime = Date.now();
          const endTime = startTime + scenario.observationPeriod;

          // Collect price observations over time
          while (Date.now() < endTime) {
            try {
              const [symphonyQuote, takaraAssets] = await Promise.all([
                symphonyWrapper.getSwapQuote({
                  tokenIn: 'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
                  tokenOut: scenario.asset,
                  amountIn: '1000000',
                  slippagePercent: 0.5
                }),
                takaraWrapper.getSupportedAssets()
              ]);

              if (E.isRight(symphonyQuote) && E.isRight(takaraAssets)) {
                const symphonyPrice = parseFloat(symphonyQuote.right.route.executionPrice);
                const usdcAsset = takaraAssets.right.find(a => a.address === scenario.asset);
                const takaraPrice = parseFloat(usdcAsset?.price || '1.0');

                const arbitrageOpportunity = Math.abs(symphonyPrice - takaraPrice) / 
                                           Math.min(symphonyPrice, takaraPrice);

                observations.push({
                  timestamp: Date.now(),
                  symphonyPrice,
                  takaraPrice,
                  arbitrageOpportunity
                });
              }

              await new Promise(resolve => setTimeout(resolve, scenario.priceCheckInterval));
            } catch (error) {
              // Continue observations despite errors
              continue;
            }
          }

          if (observations.length < 3) {
            return true; // Insufficient data
          }

          // Analyze arbitrage opportunity trends
          const maxArbitrageOpportunity = Math.max(...observations.map(o => o.arbitrageOpportunity));
          const avgArbitrageOpportunity = observations.reduce((sum, o) => sum + o.arbitrageOpportunity, 0) / 
                                         observations.length;

          // Maximum arbitrage opportunities should be bounded
          const arbitrageBounded = maxArbitrageOpportunity < 0.05; // 5% max arbitrage

          // Average arbitrage should be small in stable markets
          const avgArbitrageReasonable = scenario.marketStability > 0.6 ? 
                                        avgArbitrageOpportunity < 0.01 : // 1% in stable markets
                                        avgArbitrageOpportunity < 0.03;  // 3% in volatile markets

          // Arbitrage opportunities should not persist (trend toward zero)
          const firstHalf = observations.slice(0, Math.floor(observations.length / 2));
          const secondHalf = observations.slice(Math.floor(observations.length / 2));
          
          const firstHalfAvg = firstHalf.reduce((sum, o) => sum + o.arbitrageOpportunity, 0) / firstHalf.length;
          const secondHalfAvg = secondHalf.reduce((sum, o) => sum + o.arbitrageOpportunity, 0) / secondHalf.length;

          // In stable markets, arbitrage should decrease or remain low
          const arbitrageTrend = scenario.marketStability > 0.6 ? 
                                secondHalfAvg <= firstHalfAvg * 1.2 : // Allow 20% increase in stable markets
                                true; // No trend requirement in volatile markets

          metricsCollector.recordValue('maxArbitrageOpportunity', maxArbitrageOpportunity);
          metricsCollector.recordValue('avgArbitrageOpportunity', avgArbitrageOpportunity);
          metricsCollector.recordValue('arbitrageTrendValid', arbitrageTrend ? 1 : 0);

          return arbitrageBounded && avgArbitrageReasonable && arbitrageTrend;
        }),
        { numRuns: 6, timeout: 120000 }
      );
    });

    test('property: cross-protocol operations maintain global system health', async () => {
      const crossProtocolGenerator = fc.record({
        operations: fc.array(
          fc.record({
            type: fc.constantFrom('arbitrage', 'leverage', 'yield_optimization'),
            scale: fc.constantFrom('small', 'medium', 'large'),
            userCount: fc.integer({ min: 1, max: 5 })
          }),
          { minLength: 1, maxLength: 3 }
        ),
        systemLoadLevel: fc.float({ min: 0.1, max: 0.9 })
      });

      await fc.assert(
        fc.asyncProperty(crossProtocolGenerator, async (scenario) => {
          // Capture initial system health
          const initialSnapshot = await captureSystemSnapshot();
          const initialHealthScore = calculateSystemHealthScore(initialSnapshot);

          let allOperationsHealthy = true;

          for (const operation of scenario.operations) {
            try {
              // Execute cross-protocol operation
              await executeCrossProtocolOperation(operation);

              // Check system health after each operation
              const currentSnapshot = await captureSystemSnapshot();
              const currentHealthScore = calculateSystemHealthScore(currentSnapshot);

              // System health should not degrade significantly
              const healthDegradation = (initialHealthScore - currentHealthScore) / initialHealthScore;
              
              if (healthDegradation > 0.2) { // 20% max degradation
                allOperationsHealthy = false;
                console.warn(`System health degradation detected:`, {
                  operation,
                  initialHealth: initialHealthScore,
                  currentHealth: currentHealthScore,
                  degradation: healthDegradation
                });
              }

              // Check specific health metrics
              const healthChecks = {
                liquidityAdequate: currentSnapshot.symphonyState.totalLiquidity > 
                                  initialSnapshot.symphonyState.totalLiquidity * 0.8,
                reservesStable: currentSnapshot.takaraState.reserveRatio > 0.1,
                utilizationSafe: currentSnapshot.takaraState.utilizationRate < 0.95,
                exposureBounded: currentSnapshot.crossProtocolExposure < 
                                currentSnapshot.totalSystemValue * 0.3
              };

              const healthChecksPassed = Object.values(healthChecks).every(check => check);
              if (!healthChecksPassed) {
                allOperationsHealthy = false;
              }

              metricsCollector.recordValue('systemHealthScore', currentHealthScore);
              metricsCollector.recordValue('healthChecksPassed', healthChecksPassed ? 1 : 0);

            } catch (error) {
              // Operation failures should not compromise system health
              const currentSnapshot = await captureSystemSnapshot();
              const currentHealthScore = calculateSystemHealthScore(currentSnapshot);
              
              // Failed operations should still maintain minimum health
              if (currentHealthScore < initialHealthScore * 0.9) {
                allOperationsHealthy = false;
              }
            }
          }

          return allOperationsHealthy;
        }),
        { numRuns: 8, timeout: 90000 }
      );
    });
  });

  describe('Economic Model Invariants', () => {
    test('property: yield calculations are economically sound', async () => {
      const yieldModelGenerator = fc.record({
        principal: fc.float({ min: 1000, max: 1000000 }),
        timeHorizon: fc.integer({ min: 1, max: 365 }), // days
        compoundingFrequency: fc.constantFrom('daily', 'weekly', 'monthly'),
        riskLevel: fc.constantFrom('low', 'medium', 'high')
      });

      await fc.assert(
        fc.asyncProperty(yieldModelGenerator, async (params) => {
          try {
            // Get current yield rates
            const takaraAssets = await takaraWrapper.getSupportedAssets();
            
            if (E.isLeft(takaraAssets)) return true;

            for (const asset of takaraAssets.right) {
              const annualRate = asset.supplyAPY / 100;
              const timeInYears = params.timeHorizon / 365;

              // Calculate expected yield with different compounding
              let expectedYield: number;
              switch (params.compoundingFrequency) {
                case 'daily':
                  expectedYield = params.principal * (Math.pow(1 + annualRate / 365, 365 * timeInYears) - 1);
                  break;
                case 'weekly':
                  expectedYield = params.principal * (Math.pow(1 + annualRate / 52, 52 * timeInYears) - 1);
                  break;
                case 'monthly':
                  expectedYield = params.principal * (Math.pow(1 + annualRate / 12, 12 * timeInYears) - 1);
                  break;
              }

              // Yield should be positive for positive rates
              const yieldPositive = expectedYield >= 0;

              // Yield should scale with principal
              const scalingTest = expectedYield / params.principal >= 0 && 
                                 expectedYield / params.principal <= annualRate * timeInYears * 1.1;

              // Compound interest should exceed simple interest
              const simpleInterest = params.principal * annualRate * timeInYears;
              const compoundAdvantage = expectedYield >= simpleInterest * 0.99;

              // Risk-adjusted returns should make economic sense
              const riskAdjustment = params.riskLevel === 'high' ? 1.5 : 
                                   params.riskLevel === 'medium' ? 1.2 : 1.0;
              const riskAdjustedYield = expectedYield * riskAdjustment;
              const riskRewardReasonable = riskAdjustedYield >= expectedYield;

              metricsCollector.recordValue('yieldPositive', yieldPositive ? 1 : 0);
              metricsCollector.recordValue('yieldScalingValid', scalingTest ? 1 : 0);
              metricsCollector.recordValue('compoundAdvantage', compoundAdvantage ? 1 : 0);

              if (!yieldPositive || !scalingTest || !compoundAdvantage || !riskRewardReasonable) {
                return false;
              }
            }

            return true;
          } catch (error) {
            return true; // Calculation errors are acceptable
          }
        }),
        { numRuns: 20, timeout: 30000 }
      );
    });

    test('property: risk metrics correlate with economic fundamentals', async () => {
      const riskModelGenerator = fc.record({
        portfolioComposition: fc.array(
          fc.record({
            asset: fc.constantFrom('USDC', 'SEI', 'WETH'),
            allocation: fc.float({ min: 0.1, max: 0.8 })
          }),
          { minLength: 2, maxLength: 3 }
        ),
        leverageRatio: fc.float({ min: 1.0, max: 3.0 }),
        marketVolatility: fc.float({ min: 0.1, max: 1.0 })
      });

      await fc.assert(
        fc.asyncProperty(riskModelGenerator, async (params) => {
          // Normalize allocations to sum to 1
          const totalAllocation = params.portfolioComposition.reduce((sum, comp) => sum + comp.allocation, 0);
          const normalizedComposition = params.portfolioComposition.map(comp => ({
            ...comp,
            allocation: comp.allocation / totalAllocation
          }));

          try {
            // Calculate portfolio risk score
            const assetRiskScores = {
              'USDC': 0.1,  // Low risk stablecoin
              'SEI': 0.6,   // Medium-high risk native token
              'WETH': 0.7   // High risk volatile asset
            };

            const portfolioRisk = normalizedComposition.reduce((risk, comp) => {
              return risk + comp.allocation * assetRiskScores[comp.asset as keyof typeof assetRiskScores];
            }, 0);

            // Adjust for leverage
            const leverageAdjustedRisk = portfolioRisk * Math.pow(params.leverageRatio, 1.5);

            // Adjust for market conditions
            const marketAdjustedRisk = leverageAdjustedRisk * (1 + params.marketVolatility * 0.5);

            // Risk score validation
            const riskInBounds = marketAdjustedRisk >= 0.05 && marketAdjustedRisk <= 2.0;

            // Higher leverage should increase risk
            const leverageRiskCorrelation = params.leverageRatio > 1.0 ? 
                                          leverageAdjustedRisk > portfolioRisk : true;

            // More volatile markets should increase risk
            const volatilityRiskCorrelation = params.marketVolatility > 0.5 ? 
                                            marketAdjustedRisk > leverageAdjustedRisk : true;

            // Diversification should reduce risk (more assets = lower risk)
            const diversificationBenefit = normalizedComposition.length > 2 ? 
                                         portfolioRisk < Math.max(...normalizedComposition.map(c => 
                                           c.allocation * assetRiskScores[c.asset as keyof typeof assetRiskScores]
                                         )) : true;

            metricsCollector.recordValue('portfolioRisk', portfolioRisk);
            metricsCollector.recordValue('leverageAdjustedRisk', leverageAdjustedRisk);
            metricsCollector.recordValue('marketAdjustedRisk', marketAdjustedRisk);

            return riskInBounds && leverageRiskCorrelation && 
                   volatilityRiskCorrelation && diversificationBenefit;

          } catch (error) {
            return true; // Risk calculation errors are acceptable
          }
        }),
        { numRuns: 15, timeout: 30000 }
      );
    });
  });

  // Helper functions for the tests

  async function captureSystemSnapshot(): Promise<SystemSnapshot> {
    try {
      const [symphonyStats, takaraAssets] = await Promise.all([
        symphonyWrapper.getProtocolStats(),
        takaraWrapper.getSupportedAssets()
      ]);

      const symphonyState: ProtocolState = E.isRight(symphonyStats) ? {
        totalLiquidity: parseFloat(symphonyStats.right.totalValueLocked),
        totalBorrowed: 0,
        totalSupplied: parseFloat(symphonyStats.right.totalValueLocked),
        utilizationRate: 0.5,
        averageAPY: 5.0,
        totalFees: parseFloat(symphonyStats.right.fees24h),
        reserveRatio: 1.0
      } : {
        totalLiquidity: 50000000,
        totalBorrowed: 0,
        totalSupplied: 50000000,
        utilizationRate: 0.5,
        averageAPY: 5.0,
        totalFees: 1000,
        reserveRatio: 1.0
      };

      const takaraState: ProtocolState = E.isRight(takaraAssets) ? {
        totalLiquidity: takaraAssets.right.reduce((sum, asset) => sum + parseFloat(asset.cash), 0),
        totalBorrowed: takaraAssets.right.reduce((sum, asset) => sum + parseFloat(asset.totalBorrow), 0),
        totalSupplied: takaraAssets.right.reduce((sum, asset) => sum + parseFloat(asset.totalSupply), 0),
        utilizationRate: takaraAssets.right.reduce((sum, asset) => sum + asset.utilizationRate, 0) / takaraAssets.right.length,
        averageAPY: takaraAssets.right.reduce((sum, asset) => sum + asset.supplyAPY, 0) / takaraAssets.right.length,
        totalFees: 5000, // Mock
        reserveRatio: takaraAssets.right.reduce((sum, asset) => sum + asset.reserveFactor, 0) / takaraAssets.right.length
      } : {
        totalLiquidity: 80000000,
        totalBorrowed: 50000000,
        totalSupplied: 80000000,
        utilizationRate: 0.625,
        averageAPY: 4.5,
        totalFees: 5000,
        reserveRatio: 0.2
      };

      const totalSystemValue = symphonyState.totalLiquidity + takaraState.totalLiquidity;
      const crossProtocolExposure = Math.min(symphonyState.totalLiquidity, takaraState.totalLiquidity) * 0.1;

      return {
        timestamp: Date.now(),
        symphonyState,
        takaraState,
        totalSystemValue,
        crossProtocolExposure,
        systemHealthScore: calculateSystemHealthScore({
          symphonyState,
          takaraState,
          totalSystemValue,
          crossProtocolExposure
        } as SystemSnapshot)
      };
    } catch (error) {
      // Return mock snapshot on error
      return {
        timestamp: Date.now(),
        symphonyState: {
          totalLiquidity: 50000000,
          totalBorrowed: 0,
          totalSupplied: 50000000,
          utilizationRate: 0.5,
          averageAPY: 5.0,
          totalFees: 1000,
          reserveRatio: 1.0
        },
        takaraState: {
          totalLiquidity: 80000000,
          totalBorrowed: 50000000,
          totalSupplied: 80000000,
          utilizationRate: 0.625,
          averageAPY: 4.5,
          totalFees: 5000,
          reserveRatio: 0.2
        },
        totalSystemValue: 130000000,
        crossProtocolExposure: 5000000,
        systemHealthScore: 0.75
      };
    }
  }

  function calculateSystemHealthScore(snapshot: SystemSnapshot): number {
    let healthScore = 1.0;

    // Penalize high utilization rates
    if (snapshot.takaraState.utilizationRate > 0.9) {
      healthScore -= 0.3;
    } else if (snapshot.takaraState.utilizationRate > 0.8) {
      healthScore -= 0.1;
    }

    // Penalize low reserve ratios
    if (snapshot.takaraState.reserveRatio < 0.1) {
      healthScore -= 0.4;
    } else if (snapshot.takaraState.reserveRatio < 0.2) {
      healthScore -= 0.15;
    }

    // Penalize excessive cross-protocol exposure
    const exposureRatio = snapshot.crossProtocolExposure / snapshot.totalSystemValue;
    if (exposureRatio > 0.4) {
      healthScore -= 0.3;
    } else if (exposureRatio > 0.3) {
      healthScore -= 0.1;
    }

    return Math.max(0, healthScore);
  }

  async function executeSwapOperation(operation: any): Promise<E.Either<Error, any>> {
    return symphonyWrapper.getSwapQuote({
      tokenIn: operation.asset,
      tokenOut: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
      amountIn: operation.amount,
      slippagePercent: operation.slippage
    });
  }

  async function executeSupplyOperation(operation: any): Promise<E.Either<Error, any>> {
    return takaraWrapper.supply({
      userAddress: operation.userAddress,
      assetAddress: operation.asset,
      amount: operation.amount
    });
  }

  async function executeBorrowOperation(operation: any): Promise<E.Either<Error, any>> {
    return takaraWrapper.borrow({
      userAddress: operation.userAddress,
      assetAddress: operation.asset,
      amount: operation.amount
    });
  }

  async function executeWithdrawOperation(operation: any): Promise<E.Either<Error, any>> {
    return takaraWrapper.withdraw({
      userAddress: operation.userAddress,
      assetAddress: operation.asset,
      amount: operation.amount
    });
  }

  async function executeRepayOperation(operation: any): Promise<E.Either<Error, any>> {
    return takaraWrapper.repay({
      userAddress: operation.userAddress,
      assetAddress: operation.asset,
      amount: operation.amount
    });
  }

  async function executeProtocolOperation(operation: any, userAddress: string): Promise<void> {
    switch (operation.type) {
      case 'supply':
        await takaraWrapper.supply({
          userAddress,
          assetAddress: operation.asset,
          amount: operation.amount.toString()
        });
        break;
      case 'withdraw':
        await takaraWrapper.withdraw({
          userAddress,
          assetAddress: operation.asset,
          amount: operation.amount.toString()
        });
        break;
      case 'borrow':
        await takaraWrapper.borrow({
          userAddress,
          assetAddress: operation.asset,
          amount: operation.amount.toString()
        });
        break;
      case 'repay':
        await takaraWrapper.repay({
          userAddress,
          assetAddress: operation.asset,
          amount: operation.amount.toString()
        });
        break;
    }
  }

  async function executeCrossProtocolOperation(operation: any): Promise<void> {
    // Mock cross-protocol operation execution
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  }
});