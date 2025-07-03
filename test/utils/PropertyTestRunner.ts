/**
 * Property Test Runner
 * Enhanced property-based testing utilities for DeFi protocol validation
 */

import * as fc from 'fast-check';
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import * as A from 'fp-ts/Array';

export interface PropertyTestConfig {
  numRuns: number;
  timeout: number;
  seed?: number;
  maxShrinks: number;
  verbose: boolean;
}

export interface PropertyTestResult<T> {
  success: boolean;
  counterexample?: T;
  error?: Error;
  numRuns: number;
  seed: number;
  executionTime: number;
  shrinkPath?: T[];
}

export interface DeFiPropertyTest<T> {
  name: string;
  description: string;
  generator: fc.Arbitrary<T>;
  property: (input: T) => Promise<boolean> | boolean;
  config?: Partial<PropertyTestConfig>;
}

export class PropertyTestRunner {
  private defaultConfig: PropertyTestConfig = {
    numRuns: 100,
    timeout: 30000,
    maxShrinks: 100,
    verbose: false
  };

  constructor(config?: Partial<PropertyTestConfig>) {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  async run<T>(test: DeFiPropertyTest<T>): Promise<PropertyTestResult<T>> {
    const config = { ...this.defaultConfig, ...test.config };
    const startTime = Date.now();

    try {
      const result = await fc.check(
        fc.asyncProperty(test.generator, test.property),
        {
          numRuns: config.numRuns,
          timeout: config.timeout,
          seed: config.seed,
          maxShrinks: config.maxShrinks,
          verbose: config.verbose
        }
      );

      const executionTime = Date.now() - startTime;

      if (result.failed) {
        return {
          success: false,
          counterexample: result.counterexample,
          error: result.error,
          numRuns: result.numRuns,
          seed: result.seed || 0,
          executionTime,
          shrinkPath: result.shrinkPath
        };
      }

      return {
        success: true,
        numRuns: result.numRuns,
        seed: result.seed || 0,
        executionTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        numRuns: 0,
        seed: config.seed || 0,
        executionTime: Date.now() - startTime
      };
    }
  }

  async runSuite<T>(tests: DeFiPropertyTest<T>[]): Promise<Map<string, PropertyTestResult<T>>> {
    const results = new Map<string, PropertyTestResult<T>>();

    for (const test of tests) {
      console.log(`Running property test: ${test.name}`);
      const result = await this.run(test);
      results.set(test.name, result);

      if (!result.success) {
        console.error(`❌ Property test failed: ${test.name}`);
        if (result.counterexample) {
          console.error('Counterexample:', JSON.stringify(result.counterexample, null, 2));
        }
        if (result.error) {
          console.error('Error:', result.error.message);
        }
      } else {
        console.log(`✅ Property test passed: ${test.name} (${result.numRuns} runs)`);
      }
    }

    return results;
  }

  // DeFi-specific property generators and utilities
  generateTokenAddress(): fc.Arbitrary<string> {
    return fc.string({ minLength: 43, maxLength: 43 }).map(s => 
      `sei1${s.slice(4).toLowerCase().replace(/[^a-z0-9]/g, '0')}`
    );
  }

  generateTokenAmount(min: number = 1, max: number = 1000000000): fc.Arbitrary<string> {
    return fc.integer({ min, max }).map(n => n.toString());
  }

  generateUserAddress(): fc.Arbitrary<string> {
    return fc.string({ minLength: 39, maxLength: 39 }).map(s => 
      `sei1user${s.slice(8).toLowerCase().replace(/[^a-z0-9]/g, '0')}`
    );
  }

  generateSlippage(): fc.Arbitrary<number> {
    return fc.float({ min: 0.01, max: 5.0 });
  }

  generateAPY(): fc.Arbitrary<number> {
    return fc.float({ min: 0.1, max: 50.0 });
  }

  generatePrice(): fc.Arbitrary<number> {
    return fc.float({ min: 0.001, max: 10000.0 });
  }

  generateLeverageRatio(): fc.Arbitrary<number> {
    return fc.float({ min: 1.1, max: 5.0 });
  }

  generateHealthFactor(): fc.Arbitrary<number> {
    return fc.float({ min: 0.5, max: 10.0 });
  }

  generateRiskLevel(): fc.Arbitrary<'low' | 'medium' | 'high'> {
    return fc.constantFrom('low', 'medium', 'high');
  }

  generateTimeHorizon(): fc.Arbitrary<'1day' | '1week' | '1month' | '3months' | '1year'> {
    return fc.constantFrom('1day', '1week', '1month', '3months', '1year');
  }

  generateSwapScenario(): fc.Arbitrary<{
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    slippage: number;
    userAddress: string;
  }> {
    return fc.record({
      tokenIn: this.generateTokenAddress(),
      tokenOut: this.generateTokenAddress(),
      amountIn: this.generateTokenAmount(),
      slippage: this.generateSlippage(),
      userAddress: this.generateUserAddress()
    }).filter(scenario => scenario.tokenIn !== scenario.tokenOut);
  }

  generateLendingScenario(): fc.Arbitrary<{
    userAddress: string;
    collateralAsset: string;
    collateralAmount: string;
    borrowAsset: string;
    borrowAmount: string;
    targetHealthFactor: number;
  }> {
    return fc.record({
      userAddress: this.generateUserAddress(),
      collateralAsset: this.generateTokenAddress(),
      collateralAmount: this.generateTokenAmount(1000000, 100000000),
      borrowAsset: this.generateTokenAddress(),
      borrowAmount: this.generateTokenAmount(100000, 50000000),
      targetHealthFactor: this.generateHealthFactor()
    }).filter(scenario => 
      scenario.collateralAsset !== scenario.borrowAsset &&
      parseFloat(scenario.borrowAmount) < parseFloat(scenario.collateralAmount) * 0.8
    );
  }

  generateLeverageScenario(): fc.Arbitrary<{
    userAddress: string;
    collateralAsset: string;
    collateralAmount: string;
    leverageTarget: string;
    leverageRatio: number;
    maxSlippage: number;
  }> {
    return fc.record({
      userAddress: this.generateUserAddress(),
      collateralAsset: this.generateTokenAddress(),
      collateralAmount: this.generateTokenAmount(5000000, 100000000),
      leverageTarget: this.generateTokenAddress(),
      leverageRatio: this.generateLeverageRatio(),
      maxSlippage: this.generateSlippage()
    }).filter(scenario => scenario.collateralAsset !== scenario.leverageTarget);
  }

  generateArbitrageScenario(): fc.Arbitrary<{
    asset: string;
    amount: string;
    protocol1: string;
    protocol2: string;
    expectedProfitThreshold: number;
  }> {
    return fc.record({
      asset: this.generateTokenAddress(),
      amount: this.generateTokenAmount(1000000, 50000000),
      protocol1: fc.constantFrom('symphony', 'takara'),
      protocol2: fc.constantFrom('symphony', 'takara'),
      expectedProfitThreshold: fc.float({ min: 0.001, max: 0.05 })
    }).filter(scenario => scenario.protocol1 !== scenario.protocol2);
  }

  generateYieldOptimizationScenario(): fc.Arbitrary<{
    userAddress: string;
    assets: Array<{ asset: string; amount: string }>;
    riskTolerance: 'conservative' | 'medium' | 'aggressive';
    timeHorizon: '1day' | '1week' | '1month' | '3months' | '1year';
    rebalanceThreshold: number;
  }> {
    return fc.record({
      userAddress: this.generateUserAddress(),
      assets: fc.array(
        fc.record({
          asset: this.generateTokenAddress(),
          amount: this.generateTokenAmount(1000000, 100000000)
        }),
        { minLength: 1, maxLength: 5 }
      ),
      riskTolerance: fc.constantFrom('conservative', 'medium', 'aggressive'),
      timeHorizon: this.generateTimeHorizon(),
      rebalanceThreshold: fc.float({ min: 0.01, max: 0.1 })
    });
  }

  generateMarketConditions(): fc.Arbitrary<{
    volatility: number;
    trend: 'bullish' | 'bearish' | 'sideways';
    liquidity: 'high' | 'medium' | 'low';
    gasPrice: number;
    congestion: boolean;
  }> {
    return fc.record({
      volatility: fc.float({ min: 0.1, max: 3.0 }),
      trend: fc.constantFrom('bullish', 'bearish', 'sideways'),
      liquidity: fc.constantFrom('high', 'medium', 'low'),
      gasPrice: fc.float({ min: 0.000001, max: 0.0001 }),
      congestion: fc.boolean()
    });
  }

  // Mathematical property validators
  validateMoneyConservation(
    inputAmount: number,
    outputAmount: number,
    fees: number,
    tolerance: number = 0.001
  ): boolean {
    const difference = Math.abs(inputAmount - outputAmount - fees);
    return difference <= inputAmount * tolerance;
  }

  validateNoArbitrageCondition(
    price1: number,
    price2: number,
    fees: number,
    tolerance: number = 0.001
  ): boolean {
    const priceDifference = Math.abs(price1 - price2);
    return priceDifference <= Math.max(price1, price2) * tolerance + fees;
  }

  validateLiquidityInvariant(
    reserves0Before: number,
    reserves1Before: number,
    reserves0After: number,
    reserves1After: number,
    tolerance: number = 0.001
  ): boolean {
    const kBefore = reserves0Before * reserves1Before;
    const kAfter = reserves0After * reserves1After;
    
    // k should increase or stay the same (due to fees)
    return kAfter >= kBefore * (1 - tolerance);
  }

  validateCollateralizationRatio(
    collateralValue: number,
    debtValue: number,
    minRatio: number,
    tolerance: number = 0.001
  ): boolean {
    if (debtValue === 0) return true;
    
    const actualRatio = collateralValue / debtValue;
    return actualRatio >= minRatio * (1 - tolerance);
  }

  validateInterestAccrual(
    principal: number,
    rate: number,
    time: number,
    accruedInterest: number,
    tolerance: number = 0.001
  ): boolean {
    const expectedInterest = principal * rate * time;
    const difference = Math.abs(accruedInterest - expectedInterest);
    return difference <= expectedInterest * tolerance;
  }

  validateSlippageBounds(
    expectedOutput: number,
    actualOutput: number,
    maxSlippage: number,
    tolerance: number = 0.001
  ): boolean {
    const slippage = (expectedOutput - actualOutput) / expectedOutput;
    return slippage <= maxSlippage + tolerance;
  }

  validatePriceImpact(
    inputAmount: number,
    reserves: number,
    priceImpact: number,
    tolerance: number = 0.001
  ): boolean {
    const expectedImpact = inputAmount / (reserves + inputAmount);
    const difference = Math.abs(priceImpact - expectedImpact);
    return difference <= expectedImpact * tolerance;
  }

  // Utility methods for common DeFi invariants
  checkTokenBalanceInvariant<T>(
    operation: (input: T) => Promise<{ balanceBefore: number; balanceAfter: number; expectedChange: number }>
  ): (input: T) => Promise<boolean> {
    return async (input: T) => {
      const result = await operation(input);
      const actualChange = result.balanceAfter - result.balanceBefore;
      return this.validateMoneyConservation(0, actualChange, -result.expectedChange);
    };
  }

  checkHealthFactorInvariant<T>(
    operation: (input: T) => Promise<{ healthFactorBefore: number; healthFactorAfter: number; expectedImprovement: boolean }>
  ): (input: T) => Promise<boolean> {
    return async (input: T) => {
      const result = await operation(input);
      
      if (result.expectedImprovement) {
        return result.healthFactorAfter >= result.healthFactorBefore;
      } else {
        return result.healthFactorAfter > 0; // Health factor should remain positive
      }
    };
  }

  checkLiquidityInvariant<T>(
    operation: (input: T) => Promise<{ 
      reserves0Before: number; 
      reserves1Before: number; 
      reserves0After: number; 
      reserves1After: number; 
    }>
  ): (input: T) => Promise<boolean> {
    return async (input: T) => {
      const result = await operation(input);
      return this.validateLiquidityInvariant(
        result.reserves0Before,
        result.reserves1Before,
        result.reserves0After,
        result.reserves1After
      );
    };
  }

  // Performance and stress testing utilities
  generateStressTestScenario(): fc.Arbitrary<{
    concurrentOperations: number;
    operationTypes: string[];
    marketVolatility: number;
    networkCongestion: boolean;
    duration: number;
  }> {
    return fc.record({
      concurrentOperations: fc.integer({ min: 5, max: 50 }),
      operationTypes: fc.array(
        fc.constantFrom('swap', 'supply', 'borrow', 'withdraw', 'repay'),
        { minLength: 1, maxLength: 5 }
      ),
      marketVolatility: fc.float({ min: 0.5, max: 5.0 }),
      networkCongestion: fc.boolean(),
      duration: fc.integer({ min: 10000, max: 300000 }) // 10s to 5min
    });
  }

  generateFailureScenario(): fc.Arbitrary<{
    failureType: 'network' | 'slippage' | 'liquidity' | 'gas' | 'validation';
    severity: 'minor' | 'major' | 'critical';
    recoverable: boolean;
    timing: 'before' | 'during' | 'after';
  }> {
    return fc.record({
      failureType: fc.constantFrom('network', 'slippage', 'liquidity', 'gas', 'validation'),
      severity: fc.constantFrom('minor', 'major', 'critical'),
      recoverable: fc.boolean(),
      timing: fc.constantFrom('before', 'during', 'after')
    });
  }
}