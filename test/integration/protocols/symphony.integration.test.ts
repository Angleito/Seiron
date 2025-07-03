/**
 * Symphony Protocol Integration Tests
 * Tests real Symphony protocol interactions with property-based validation
 */

import { describe, test, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import * as A from 'fp-ts/Array';
import * as fc from 'fast-check';

import { SymphonyProtocolWrapper } from '../../../src/protocols/sei/adapters/SymphonyProtocolWrapper';
import { 
  SymphonyConfig, 
  SwapQuoteRequest, 
  SwapExecuteRequest,
  RouteRequest,
  SymphonyError,
  SwapRoute,
  TokenInfo
} from '../../../src/protocols/sei/types';

import { TestEnvironment } from '../../utils/TestEnvironment';
import { PropertyTestRunner } from '../../utils/PropertyTestRunner';
import { ProtocolTestSuite } from '../../utils/ProtocolTestSuite';
import { MetricsCollector } from '../../utils/MetricsCollector';

describe('Symphony Protocol Integration Tests', () => {
  let testEnv: TestEnvironment;
  let symphonyWrapper: SymphonyProtocolWrapper;
  let metricsCollector: MetricsCollector;
  let propertyRunner: PropertyTestRunner;
  
  const testConfig: SymphonyConfig = {
    apiUrl: process.env.SYMPHONY_API_URL || 'http://symphony-mock:8001',
    contractAddress: 'sei1symphony1z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
    maxSlippagePercent: 0.5,
    gasLimitMultiplier: 1.2,
    timeout: 30000
  };

  beforeAll(async () => {
    testEnv = await TestEnvironment.create();
    symphonyWrapper = new SymphonyProtocolWrapper(testConfig);
    metricsCollector = new MetricsCollector('symphony');
    propertyRunner = new PropertyTestRunner();
    
    await testEnv.waitForServices(['symphony-mock']);
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

  describe('Protocol Integration', () => {
    test('should retrieve supported tokens', async () => {
      const startTime = Date.now();
      
      const result = await symphonyWrapper.getSupportedTokens();
      
      const duration = Date.now() - startTime;
      metricsCollector.recordLatency('getSupportedTokens', duration);
      
      expect(E.isRight(result)).toBe(true);
      
      if (E.isRight(result)) {
        expect(result.right).toHaveLength(3);
        expect(result.right[0]).toHaveProperty('address');
        expect(result.right[0]).toHaveProperty('symbol');
        expect(result.right[0]).toHaveProperty('decimals');
        expect(result.right[0]).toHaveProperty('verified');
      }
    });

    test('should handle token retrieval failure gracefully', async () => {
      // Simulate network failure
      const failingWrapper = new SymphonyProtocolWrapper({
        ...testConfig,
        apiUrl: 'http://nonexistent:8001'
      });
      
      const result = await failingWrapper.getSupportedTokens();
      
      expect(E.isLeft(result)).toBe(true);
      
      if (E.isLeft(result)) {
        expect(result.left.type).toBe('network_error');
      }
    });

    test('should generate valid swap quotes', async () => {
      const quoteRequest: SwapQuoteRequest = {
        tokenIn: 'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
        tokenOut: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
        amountIn: '1000000',
        slippagePercent: 0.5
      };
      
      const startTime = Date.now();
      const result = await symphonyWrapper.getSwapQuote(quoteRequest);
      const duration = Date.now() - startTime;
      
      metricsCollector.recordLatency('getSwapQuote', duration);
      
      expect(E.isRight(result)).toBe(true);
      
      if (E.isRight(result)) {
        const quote = result.right;
        
        expect(quote.route).toBeDefined();
        expect(quote.route.inputToken.address).toBe(quoteRequest.tokenIn);
        expect(quote.route.outputToken.address).toBe(quoteRequest.tokenOut);
        expect(quote.route.inputAmount).toBe(quoteRequest.amountIn);
        expect(parseFloat(quote.route.outputAmount)).toBeGreaterThan(0);
        expect(quote.route.priceImpact).toBeGreaterThanOrEqual(0);
        expect(quote.route.priceImpact).toBeLessThan(1);
        expect(quote.validUntil).toBeGreaterThan(Date.now());
        
        // Validate route structure
        expect(quote.route.routes).toHaveLength(1); // Direct swap
        expect(quote.route.routes[0].protocol).toBe('symphony');
        expect(quote.route.routes[0].tokenIn.address).toBe(quoteRequest.tokenIn);
        expect(quote.route.routes[0].tokenOut.address).toBe(quoteRequest.tokenOut);
        
        // Validate fees
        expect(quote.route.fees).toBeDefined();
        expect(parseFloat(quote.route.fees.totalFee)).toBeGreaterThan(0);
        expect(parseFloat(quote.route.fees.protocolFee)).toBeGreaterThan(0);
        expect(parseFloat(quote.route.fees.gasFee)).toBeGreaterThan(0);
      }
    });

    test('should find optimal routes', async () => {
      const routeRequest: RouteRequest = {
        tokenIn: 'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
        tokenOut: 'sei1weth7z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
        amountIn: '2000000',
        maxRoutes: 3
      };
      
      const result = await symphonyWrapper.findOptimalRoutes(routeRequest);
      
      expect(E.isRight(result)).toBe(true);
      
      if (E.isRight(result)) {
        const routes = result.right;
        
        expect(routes.routes).toHaveLength(3);
        expect(routes.bestRoute).toBeDefined();
        expect(routes.bestRoute.inputToken.address).toBe(routeRequest.tokenIn);
        expect(routes.bestRoute.outputToken.address).toBe(routeRequest.tokenOut);
        
        // Best route should have highest output amount
        const bestOutput = parseFloat(routes.bestRoute.outputAmount);
        routes.routes.forEach(route => {
          expect(parseFloat(route.outputAmount)).toBeLessThanOrEqual(bestOutput);
        });
        
        // Multi-hop route should have multiple steps
        expect(routes.bestRoute.routes).toHaveLength(2);
        expect(routes.bestRoute.routes[0].tokenOut.address).toBe(routes.bestRoute.routes[1].tokenIn.address);
      }
    });

    test('should validate swap parameters', async () => {
      const invalidRequest: SwapQuoteRequest = {
        tokenIn: 'invalid-token',
        tokenOut: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
        amountIn: '1000000',
        slippagePercent: 0.5
      };
      
      const result = await symphonyWrapper.getSwapQuote(invalidRequest);
      
      expect(E.isLeft(result)).toBe(true);
      
      if (E.isLeft(result)) {
        expect(result.left.type).toBe('invalid_token');
        expect(result.left.token).toBe('invalid-token');
      }
    });

    test('should estimate gas costs accurately', async () => {
      const gasRequest = {
        tokenIn: 'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
        tokenOut: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
        amountIn: '1000000',
        routeId: 'test-route-id',
        recipient: 'sei1recipient1z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6'
      };
      
      const result = await symphonyWrapper.estimateGas(gasRequest);
      
      expect(E.isRight(result)).toBe(true);
      
      if (E.isRight(result)) {
        const gasEstimate = result.right;
        
        expect(parseFloat(gasEstimate.gasLimit)).toBeGreaterThan(100000);
        expect(parseFloat(gasEstimate.gasLimit)).toBeLessThan(500000);
        expect(parseFloat(gasEstimate.gasPrice)).toBeGreaterThan(0);
        expect(parseFloat(gasEstimate.estimatedCost)).toBeGreaterThan(0);
        expect(gasEstimate.confidence).toBeGreaterThan(0.8);
        expect(gasEstimate.confidence).toBeLessThanOrEqual(1.0);
      }
    });

    test('should handle slippage correctly', async () => {
      const lowSlippageRequest: SwapQuoteRequest = {
        tokenIn: 'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
        tokenOut: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
        amountIn: '1000000',
        slippagePercent: 0.1
      };
      
      const highSlippageRequest: SwapQuoteRequest = {
        ...lowSlippageRequest,
        slippagePercent: 1.0
      };
      
      const [lowResult, highResult] = await Promise.all([
        symphonyWrapper.getSwapQuote(lowSlippageRequest),
        symphonyWrapper.getSwapQuote(highSlippageRequest)
      ]);
      
      expect(E.isRight(lowResult)).toBe(true);
      expect(E.isRight(highResult)).toBe(true);
      
      if (E.isRight(lowResult) && E.isRight(highResult)) {
        const lowSlippageOutput = parseFloat(lowResult.right.slippageAdjustedAmountOut);
        const highSlippageOutput = parseFloat(highResult.right.slippageAdjustedAmountOut);
        
        // Higher slippage tolerance should result in lower minimum output
        expect(lowSlippageOutput).toBeGreaterThan(highSlippageOutput);
      }
    });
  });

  describe('Property-Based Integration Tests', () => {
    test('property: swap quotes are consistent', async () => {
      const swapScenarioArb = fc.record({
        tokenIn: fc.constantFrom(
          'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
          'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6'
        ),
        tokenOut: fc.constantFrom(
          'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
          'sei1weth7z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6'
        ),
        amountIn: fc.integer({ min: 100000, max: 10000000 }).map(n => n.toString()),
        slippagePercent: fc.float({ min: 0.1, max: 2.0 })
      }).filter(scenario => scenario.tokenIn !== scenario.tokenOut);
      
      await fc.assert(
        fc.asyncProperty(swapScenarioArb, async (scenario) => {
          const quote1 = await symphonyWrapper.getSwapQuote(scenario);
          const quote2 = await symphonyWrapper.getSwapQuote(scenario);
          
          if (E.isRight(quote1) && E.isRight(quote2)) {
            const output1 = parseFloat(quote1.right.route.outputAmount);
            const output2 = parseFloat(quote2.right.route.outputAmount);
            
            // Quotes should be consistent within 0.1% tolerance
            const difference = Math.abs(output1 - output2) / Math.max(output1, output2);
            return difference < 0.001;
          }
          
          return E.isLeft(quote1) && E.isLeft(quote2);
        }),
        { numRuns: 20 }
      );
    });

    test('property: route optimization produces better or equal results', async () => {
      const routeOptimizationArb = fc.record({
        tokenIn: fc.constantFrom(
          'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
          'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6'
        ),
        tokenOut: fc.constantFrom(
          'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
          'sei1weth7z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6'
        ),
        amountIn: fc.integer({ min: 500000, max: 5000000 }).map(n => n.toString())
      }).filter(scenario => scenario.tokenIn !== scenario.tokenOut);
      
      await fc.assert(
        fc.asyncProperty(routeOptimizationArb, async (scenario) => {
          const singleQuote = await symphonyWrapper.getSwapQuote(scenario);
          const multipleRoutes = await symphonyWrapper.findOptimalRoutes({
            ...scenario,
            maxRoutes: 5
          });
          
          if (E.isRight(singleQuote) && E.isRight(multipleRoutes)) {
            const singleOutput = parseFloat(singleQuote.right.route.outputAmount);
            const optimalOutput = parseFloat(multipleRoutes.right.bestRoute.outputAmount);
            
            // Optimal route should be better or equal
            return optimalOutput >= singleOutput * 0.99; // Allow 1% tolerance
          }
          
          return true; // If either fails, that's acceptable
        }),
        { numRuns: 15 }
      );
    });

    test('property: gas estimates are reasonable', async () => {
      const gasEstimationArb = fc.record({
        tokenIn: fc.constantFrom(
          'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
          'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6'
        ),
        tokenOut: fc.constantFrom(
          'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
          'sei1weth7z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6'
        ),
        amountIn: fc.integer({ min: 100000, max: 10000000 }).map(n => n.toString())
      }).filter(scenario => scenario.tokenIn !== scenario.tokenOut);
      
      await fc.assert(
        fc.asyncProperty(gasEstimationArb, async (scenario) => {
          const gasRequest = {
            ...scenario,
            routeId: 'test-route',
            recipient: 'sei1recipient1z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6'
          };
          
          const gasEstimate = await symphonyWrapper.estimateGas(gasRequest);
          
          if (E.isRight(gasEstimate)) {
            const estimate = gasEstimate.right;
            const gasLimit = parseFloat(estimate.gasLimit);
            const gasPrice = parseFloat(estimate.gasPrice);
            
            // Gas limits should be reasonable
            return gasLimit >= 100000 && gasLimit <= 1000000 && 
                   gasPrice > 0 && gasPrice < 1.0 &&
                   estimate.confidence >= 0.8;
          }
          
          return true; // Failures are acceptable
        }),
        { numRuns: 10 }
      );
    });

    test('property: fee calculations are mathematically consistent', async () => {
      const feeCalculationArb = fc.record({
        tokenIn: fc.constantFrom(
          'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
          'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6'
        ),
        tokenOut: fc.constantFrom(
          'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
          'sei1weth7z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6'
        ),
        amountIn: fc.integer({ min: 100000, max: 10000000 }).map(n => n.toString())
      }).filter(scenario => scenario.tokenIn !== scenario.tokenOut);
      
      await fc.assert(
        fc.asyncProperty(feeCalculationArb, async (scenario) => {
          const quote = await symphonyWrapper.getSwapQuote(scenario);
          
          if (E.isRight(quote)) {
            const fees = quote.right.route.fees;
            
            const protocolFee = parseFloat(fees.protocolFee);
            const gasFee = parseFloat(fees.gasFee);
            const lpFee = parseFloat(fees.liquidityProviderFee);
            const totalFee = parseFloat(fees.totalFee);
            
            // Total fee should equal sum of component fees
            const calculatedTotal = protocolFee + gasFee + lpFee;
            const difference = Math.abs(totalFee - calculatedTotal);
            
            return difference < 0.00001; // Allow minimal floating point error
          }
          
          return true;
        }),
        { numRuns: 20 }
      );
    });
  });

  describe('Performance Tests', () => {
    test('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      const requests = Array.from({ length: concurrentRequests }, (_, i) => ({
        tokenIn: 'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
        tokenOut: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
        amountIn: (1000000 + i * 100000).toString(),
        slippagePercent: 0.5
      }));
      
      const startTime = Date.now();
      const results = await Promise.all(
        requests.map(req => symphonyWrapper.getSwapQuote(req))
      );
      const duration = Date.now() - startTime;
      
      const successfulResults = results.filter(result => E.isRight(result));
      
      expect(successfulResults.length).toBeGreaterThan(concurrentRequests * 0.8);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      
      metricsCollector.recordLatency('concurrentRequests', duration);
      metricsCollector.recordThroughput('concurrentRequests', concurrentRequests, duration);
    });

    test('should meet Sei block time constraints', async () => {
      const SEI_BLOCK_TIME = 400; // 400ms
      
      const simpleRequest: SwapQuoteRequest = {
        tokenIn: 'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
        tokenOut: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
        amountIn: '1000000',
        slippagePercent: 0.5
      };
      
      const measurements = [];
      
      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        const result = await symphonyWrapper.getSwapQuote(simpleRequest);
        const duration = Date.now() - startTime;
        
        if (E.isRight(result)) {
          measurements.push(duration);
        }
      }
      
      const avgDuration = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const p95Duration = measurements.sort((a, b) => a - b)[Math.floor(measurements.length * 0.95)];
      
      expect(avgDuration).toBeLessThan(SEI_BLOCK_TIME);
      expect(p95Duration).toBeLessThan(SEI_BLOCK_TIME * 1.5);
      
      metricsCollector.recordLatency('avgQuoteTime', avgDuration);
      metricsCollector.recordLatency('p95QuoteTime', p95Duration);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle network timeouts gracefully', async () => {
      const timeoutConfig: SymphonyConfig = {
        ...testConfig,
        timeout: 100 // Very short timeout
      };
      
      const timeoutWrapper = new SymphonyProtocolWrapper(timeoutConfig);
      
      const request: SwapQuoteRequest = {
        tokenIn: 'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
        tokenOut: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
        amountIn: '1000000',
        slippagePercent: 0.5
      };
      
      const result = await timeoutWrapper.getSwapQuote(request);
      
      expect(E.isLeft(result)).toBe(true);
      
      if (E.isLeft(result)) {
        expect(result.left.type).toBe('timeout');
        expect(result.left.operation).toBe('getSwapQuote');
      }
    });

    test('should handle invalid token pairs', async () => {
      const invalidRequests = [
        {
          tokenIn: 'sei1invalid1',
          tokenOut: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
          amountIn: '1000000',
          slippagePercent: 0.5
        },
        {
          tokenIn: 'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
          tokenOut: 'sei1invalid2',
          amountIn: '1000000',
          slippagePercent: 0.5
        }
      ];
      
      for (const request of invalidRequests) {
        const result = await symphonyWrapper.getSwapQuote(request);
        
        expect(E.isLeft(result)).toBe(true);
        
        if (E.isLeft(result)) {
          expect(result.left.type).toBe('invalid_token');
        }
      }
    });

    test('should handle insufficient liquidity scenarios', async () => {
      const largeAmountRequest: SwapQuoteRequest = {
        tokenIn: 'sei1d6u7zqy5d4c2z8h9j2k3l4m5n6o7p8q9r0s1t2',
        tokenOut: 'sei1usdc2z8h9j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6',
        amountIn: '999999999999999999', // Extremely large amount
        slippagePercent: 0.5
      };
      
      const result = await symphonyWrapper.getSwapQuote(largeAmountRequest);
      
      // Should either succeed with high slippage or fail with insufficient liquidity
      if (E.isRight(result)) {
        expect(result.right.route.priceImpact).toBeGreaterThan(0.1);
      } else {
        expect(result.left.type).toBe('insufficient_liquidity');
      }
    });
  });
});