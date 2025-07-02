/**
 * Comprehensive Functional Testing Example
 * Demonstrates the complete testing infrastructure
 */

import {
  calculateRiskMetrics,
  calculateCompleteRiskScore,
  mapToRiskLevel
} from '@/risk/calculations';

import {
  generateRiskCalculationContext,
  generateRiskThresholds,
  generatePortfolioSnapshot,
  expectValidRiskMetrics,
  expectValidRiskScore,
  expectRight,
  expectTaskRight,
  mockBlockchainService,
  setMockPortfolio,
  createHighRiskScenario,
  resetMockState,
  quickCheck,
  generateRiskMetrics,
  generatePortfolioValue,
  forAllWith,
  PropertyTestResult,
  E,
  TE,
  pipe
} from '@/test-utils';

describe('Comprehensive Functional Testing', () => {
  beforeEach(() => {
    resetMockState();
  });

  describe('Pure Function Testing', () => {
    test('should test risk metrics calculation as pure function', () => {
      const context = generateRiskCalculationContext();
      
      // Test determinism
      const metrics1 = calculateRiskMetrics(
        context.snapshot,
        context.priceData,
        context.correlationData
      );
      
      const metrics2 = calculateRiskMetrics(
        context.snapshot,
        context.priceData,
        context.correlationData
      );
      
      expect(metrics1).toEqual(metrics2);
      expectValidRiskMetrics(metrics1);
      expectValidRiskMetrics(metrics2);
    });

    test('should test risk score calculation with edge cases', () => {
      const testCases = [
        {
          name: 'minimum risk scenario',
          metrics: {
            healthFactor: Number.MAX_SAFE_INTEGER,
            leverage: 1.0,
            concentration: 0.1,
            correlation: 0.0,
            volatility: 0.01
          },
          expectedLevel: 'low' as const
        },
        {
          name: 'maximum risk scenario',
          metrics: {
            healthFactor: 1.01,
            leverage: 10.0,
            concentration: 1.0,
            correlation: 1.0,
            volatility: 1.0
          },
          expectedLevel: 'critical' as const
        },
        {
          name: 'moderate risk scenario',
          metrics: {
            healthFactor: 2.0,
            leverage: 2.0,
            concentration: 0.4,
            correlation: 0.3,
            volatility: 0.2
          },
          expectedLevel: 'medium' as const
        }
      ];

      testCases.forEach(({ name, metrics, expectedLevel }) => {
        const thresholds = generateRiskThresholds();
        const riskScore = calculateCompleteRiskScore(metrics, thresholds);
        
        expectValidRiskScore(riskScore);
        expect(riskScore.level).toBe(expectedLevel);
      });
    });
  });

  describe('Either/Option Pattern Testing', () => {
    test('should handle successful blockchain operations', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const portfolio = generatePortfolioSnapshot({ walletAddress });
      setMockPortfolio(walletAddress, portfolio);

      const result = await mockBlockchainService.getPortfolioSnapshot(walletAddress)();
      
      expectRight(result);
      if (E.isRight(result)) {
        expect(result.right).toEqual(portfolio);
      }
    });

    test('should handle blockchain operation errors', async () => {
      const invalidAddress = 'invalid-address';
      
      const result = await mockBlockchainService.getPortfolioSnapshot(invalidAddress)();
      
      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.type).toBe('InvalidAddress');
      }
    });

    test('should chain TaskEither operations', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const portfolio = generatePortfolioSnapshot({ walletAddress });
      setMockPortfolio(walletAddress, portfolio);

      const chainedOperation = pipe(
        mockBlockchainService.getPortfolioSnapshot(walletAddress),
        TE.chain(portfolio => {
          // Simulate additional processing
          if (portfolio.totalValueUSD > 0) {
            return TE.right(`Portfolio value: $${portfolio.totalValueUSD}`);
          } else {
            return TE.left({ type: 'InsufficientData' as const, requested: 'portfolio value' });
          }
        })
      );

      const result = await expectTaskRight(chainedOperation);
      expect(result).toContain('Portfolio value: $');
    });
  });

  describe('Property-Based Testing', () => {
    test('should verify risk level mapping properties', () => {
      const result = quickCheck(
        generateRiskMetrics,
        (metrics) => {
          const thresholds = generateRiskThresholds();
          const riskScore = calculateCompleteRiskScore(metrics, thresholds);
          
          // Property: risk level should be consistent with health factor
          if (metrics.healthFactor > thresholds.healthFactor.medium) {
            return riskScore.level === 'low';
          } else if (metrics.healthFactor > thresholds.healthFactor.high) {
            return riskScore.level === 'medium';
          } else if (metrics.healthFactor > thresholds.healthFactor.critical) {
            return riskScore.level === 'high';
          } else {
            return riskScore.level === 'critical';
          }
        },
        100
      );
      
      expect(result).toBe(true);
    });

    test('should verify portfolio value scaling properties', () => {
      const result = quickCheck(
        () => ({
          portfolio: generatePortfolioSnapshot(),
          scaleFactor: Math.random() * 10 + 0.1 // 0.1 to 10.1
        }),
        ({ portfolio, scaleFactor }) => {
          const scaledPortfolio = generatePortfolioSnapshot({
            ...portfolio,
            totalValueUSD: portfolio.totalValueUSD * scaleFactor,
            totalSuppliedUSD: portfolio.totalSuppliedUSD * scaleFactor,
            totalBorrowedUSD: portfolio.totalBorrowedUSD * scaleFactor,
            totalLiquidityUSD: portfolio.totalLiquidityUSD * scaleFactor,
            netWorth: portfolio.netWorth * scaleFactor
          });

          const priceData = new Map([
            ['ETH', { symbol: 'ETH', price: 2000, change24h: 0, volatility: 0.3, timestamp: Date.now() }],
            ['USDC', { symbol: 'USDC', price: 1, change24h: 0, volatility: 0.05, timestamp: Date.now() }]
          ]);

          const correlationData = [
            { pair: ['ETH', 'USDC'] as const, correlation: 0.1, period: 30, confidence: 0.95 }
          ];

          const originalMetrics = calculateRiskMetrics(portfolio, priceData, correlationData);
          const scaledMetrics = calculateRiskMetrics(scaledPortfolio, priceData, correlationData);

          // Health factor and leverage should be scale-invariant
          const hfDiff = Math.abs(originalMetrics.healthFactor - scaledMetrics.healthFactor);
          const leverageDiff = Math.abs(originalMetrics.leverage - scaledMetrics.leverage);

          return hfDiff < 1e-10 && leverageDiff < 1e-10;
        },
        50
      );
      
      expect(result).toBe(true);
    });

    test('should verify mathematical invariants', () => {
      const result = forAllWith(
        () => ({
          value1: generatePortfolioValue()(),
          value2: generatePortfolioValue()(),
          ratio: Math.random() * 0.8 + 0.1 // 0.1 to 0.9
        }),
        ({ value1, value2, ratio }) => {
          // Property: interpolation should stay within bounds
          const interpolated = value1 * ratio + value2 * (1 - ratio);
          const min = Math.min(value1, value2);
          const max = Math.max(value1, value2);
          
          return interpolated >= min && interpolated <= max;
        },
        { iterations: 100, maxShrinkAttempts: 5 }
      );
      
      expect(result.success).toBe(true);
    });
  });

  describe('Mock Service Integration', () => {
    test('should simulate high-risk scenario', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      createHighRiskScenario(walletAddress);

      const portfolio = await expectTaskRight(
        mockBlockchainService.getPortfolioSnapshot(walletAddress)
      );

      expect(portfolio.healthFactor).toBeLessThan(1.2);
      expect(portfolio.totalBorrowedUSD).toBeGreaterThan(0);

      const priceData = new Map([
        ['ETH', { symbol: 'ETH', price: 2000, change24h: 0, volatility: 0.3, timestamp: Date.now() }]
      ]);

      const metrics = calculateRiskMetrics(portfolio, priceData, []);
      const thresholds = generateRiskThresholds();
      const riskScore = calculateCompleteRiskScore(metrics, thresholds);

      expect(riskScore.level).toBe('critical');
    });

    test('should handle network simulation', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      
      // Test with simulated delays
      const start = Date.now();
      await mockBlockchainService.getPortfolioSnapshot(walletAddress)();
      const duration = Date.now() - start;
      
      expect(duration).toBeGreaterThan(50); // Should have some simulated delay
    });
  });

  describe('Functional Composition', () => {
    test('should compose risk analysis pipeline', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const portfolio = generatePortfolioSnapshot({ walletAddress });
      setMockPortfolio(walletAddress, portfolio);

      const riskAnalysisPipeline = pipe(
        mockBlockchainService.getPortfolioSnapshot(walletAddress),
        TE.map(snapshot => {
          const priceData = new Map([
            ['ETH', { symbol: 'ETH', price: 2000, change24h: 0, volatility: 0.3, timestamp: Date.now() }],
            ['USDC', { symbol: 'USDC', price: 1, change24h: 0, volatility: 0.05, timestamp: Date.now() }]
          ]);

          const correlationData = [
            { pair: ['ETH', 'USDC'] as const, correlation: 0.1, period: 30, confidence: 0.95 }
          ];

          return calculateRiskMetrics(snapshot, priceData, correlationData);
        }),
        TE.map(metrics => {
          const thresholds = generateRiskThresholds();
          return calculateCompleteRiskScore(metrics, thresholds);
        })
      );

      const riskScore = await expectTaskRight(riskAnalysisPipeline);
      expectValidRiskScore(riskScore);
    });

    test('should demonstrate error propagation in pipeline', async () => {
      const invalidAddress = 'invalid-address';

      const faultyPipeline = pipe(
        mockBlockchainService.getPortfolioSnapshot(invalidAddress),
        TE.map(snapshot => {
          // This should never execute due to error in previous step
          return calculateRiskMetrics(snapshot, new Map(), []);
        }),
        TE.map(metrics => {
          // This should also never execute
          return calculateCompleteRiskScore(metrics, generateRiskThresholds());
        })
      );

      const result = await faultyPipeline();
      expect(E.isLeft(result)).toBe(true);
      
      if (E.isLeft(result)) {
        expect(result.left.type).toBe('InvalidAddress');
      }
    });
  });

  describe('Performance Properties', () => {
    test('should maintain performance characteristics', () => {
      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        const portfolio = generatePortfolioSnapshot();
        const priceData = new Map([
          ['ETH', { symbol: 'ETH', price: 2000, change24h: 0, volatility: 0.3, timestamp: Date.now() }]
        ]);
        calculateRiskMetrics(portfolio, priceData, []);
      }

      const duration = performance.now() - start;
      const avgDuration = duration / iterations;

      // Should complete each calculation in reasonable time
      expect(avgDuration).toBeLessThan(10); // 10ms per calculation
    });

    test('should scale linearly with portfolio size', () => {
      const sizes = [1, 5, 10, 20];
      const durations: number[] = [];

      sizes.forEach(size => {
        const portfolio = generatePortfolioSnapshot({
          lendingPositions: Array.from({ length: size }, (_, i) => ({
            platform: `Platform${i}`,
            tokenAddress: `0x${'1'.repeat(40)}`,
            tokenSymbol: `TOKEN${i}`,
            supplied: '1000000000000000000',
            borrowed: '0',
            suppliedUSD: 1000,
            borrowedUSD: 0,
            apy: 5.0,
            valueUSD: 1000,
            healthFactor: Number.MAX_SAFE_INTEGER
          }))
        });

        const priceData = new Map(
          Array.from({ length: size }, (_, i) => [
            `TOKEN${i}`,
            { symbol: `TOKEN${i}`, price: 100, change24h: 0, volatility: 0.2, timestamp: Date.now() }
          ])
        );

        const start = performance.now();
        calculateRiskMetrics(portfolio, priceData, []);
        const duration = performance.now() - start;
        
        durations.push(duration);
      });

      // Should scale reasonably (not exponentially)
      const ratio = durations[durations.length - 1] / durations[0];
      expect(ratio).toBeLessThan(sizes[sizes.length - 1] * 2); // Allow 2x linear scaling factor
    });
  });
});