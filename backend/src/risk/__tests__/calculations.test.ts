/**
 * Risk Calculations Unit Tests
 * Tests for pure functional risk calculation functions
 */

import {
  calculateHealthFactor,
  calculateLeverageRatio,
  calculateAssetAllocations,
  calculateProtocolAllocations,
  calculateHerfindahlIndex,
  calculateConcentration,
  buildCorrelationMatrix,
  calculatePortfolioVolatility,
  calculateValueAtRisk,
  calculateVolatilityAnalysis,
  mapToRiskLevel,
  calculateRiskScore,
  calculateRiskMetrics,
  calculateCompleteRiskScore
} from '../calculations';

import {
  generatePortfolioSnapshot,
  generatePriceData,
  generateCorrelationData,
  generateRiskThresholds,
  generateAssetAllocation,
  generateProtocolAllocation,
  expectValidRiskMetrics,
  expectValidRiskScore,
  expectValidConcentrationAnalysis,
  expectValidCorrelationMatrix,
  expectValidVolatilityAnalysis,
  expectPositive,
  expectNonNegative,
  expectBetween,
  expectProbability,
  expectPercentage,
  expectArraySum,
  forAll,
  testPureFunction
} from '@/test-utils';

describe('Risk Calculations', () => {
  describe('Health Factor Calculations', () => {
    testPureFunction(calculateHealthFactor, [
      {
        input: [generatePortfolioSnapshot({ 
          totalSuppliedUSD: 10000, 
          totalBorrowedUSD: 5000 
        })],
        expected: 2.0,
        description: 'should calculate health factor correctly for normal portfolio'
      },
      {
        input: [generatePortfolioSnapshot({ 
          totalSuppliedUSD: 5000, 
          totalBorrowedUSD: 0 
        })],
        expected: Number.MAX_SAFE_INTEGER,
        description: 'should return max safe integer when no borrowing'
      },
      {
        input: [generatePortfolioSnapshot({ 
          totalSuppliedUSD: 0, 
          totalBorrowedUSD: 0 
        })],
        expected: Number.MAX_SAFE_INTEGER,
        description: 'should return max safe integer for empty portfolio'
      }
    ]);

    test('should be pure function', () => {
      const portfolio = generatePortfolioSnapshot({ totalSuppliedUSD: 10000, totalBorrowedUSD: 2000 });
      const result1 = calculateHealthFactor(portfolio);
      const result2 = calculateHealthFactor(portfolio);
      
      expect(result1).toBe(5.0);
      expect(result2).toBe(5.0);
      expect(result1).toBe(result2);
    });

    test('should handle edge cases', () => {
      const criticalPortfolio = generatePortfolioSnapshot({ 
        totalSuppliedUSD: 1100, 
        totalBorrowedUSD: 1000 
      });
      
      expect(calculateHealthFactor(criticalPortfolio)).toBeCloseTo(1.1, 6);
    });
  });

  describe('Leverage Ratio Calculations', () => {
    testPureFunction(calculateLeverageRatio, [
      {
        input: [generatePortfolioSnapshot({ 
          totalValueUSD: 15000, 
          netWorth: 10000 
        })],
        expected: 1.5,
        description: 'should calculate leverage ratio correctly'
      },
      {
        input: [generatePortfolioSnapshot({ 
          totalValueUSD: 10000, 
          netWorth: 10000 
        })],
        expected: 1.0,
        description: 'should return 1.0 for no leverage'
      },
      {
        input: [generatePortfolioSnapshot({ 
          totalValueUSD: 0, 
          netWorth: 0 
        })],
        expected: 1.0,
        description: 'should return 1.0 for empty portfolio'
      }
    ]);

    test('should always return values >= 1.0', () => {
      forAll(
        () => generatePortfolioSnapshot(),
        (portfolio) => calculateLeverageRatio(portfolio) >= 1.0,
        50
      );
    });
  });

  describe('Asset Allocation Calculations', () => {
    test('should calculate asset allocations with correct weights', () => {
      const portfolio = generatePortfolioSnapshot({
        totalValueUSD: 10000,
        lendingPositions: [
          { tokenSymbol: 'ETH', valueUSD: 6000, suppliedUSD: 6000, borrowedUSD: 0 } as any,
          { tokenSymbol: 'USDC', valueUSD: 4000, suppliedUSD: 4000, borrowedUSD: 0 } as any
        ]
      });

      const priceData = new Map([
        ['ETH', generatePriceData('ETH', { volatility: 0.3 })],
        ['USDC', generatePriceData('USDC', { volatility: 0.05 })]
      ]);

      const allocations = calculateAssetAllocations(portfolio, priceData);

      expect(allocations).toHaveLength(2);
      expect(allocations[0].symbol).toBe('ETH');
      expect(allocations[0].weight).toBeCloseTo(0.6, 6);
      expect(allocations[1].symbol).toBe('USDC');
      expect(allocations[1].weight).toBeCloseTo(0.4, 6);

      // Weights should sum to 1
      expectArraySum(allocations.map(a => a.weight), 1.0);
    });

    test('should return empty array for zero value portfolio', () => {
      const emptyPortfolio = generatePortfolioSnapshot({
        totalValueUSD: 0,
        lendingPositions: [],
        liquidityPositions: []
      });

      const allocations = calculateAssetAllocations(emptyPortfolio, new Map());
      expect(allocations).toHaveLength(0);
    });

    test('should handle liquidity positions correctly', () => {
      const portfolio = generatePortfolioSnapshot({
        totalValueUSD: 10000,
        lendingPositions: [],
        liquidityPositions: [
          { 
            token0Symbol: 'ETH', 
            token1Symbol: 'USDC', 
            valueUSD: 10000,
            platform: 'Uniswap'
          } as any
        ]
      });

      const priceData = new Map([
        ['ETH', generatePriceData('ETH')],
        ['USDC', generatePriceData('USDC')]
      ]);

      const allocations = calculateAssetAllocations(portfolio, priceData);

      expect(allocations).toHaveLength(2);
      expect(allocations.find(a => a.symbol === 'ETH')?.weight).toBeCloseTo(0.5, 6);
      expect(allocations.find(a => a.symbol === 'USDC')?.weight).toBeCloseTo(0.5, 6);
    });
  });

  describe('Protocol Allocation Calculations', () => {
    test('should calculate protocol allocations correctly', () => {
      const portfolio = generatePortfolioSnapshot({
        totalValueUSD: 10000,
        lendingPositions: [
          { platform: 'Aave', valueUSD: 7000 } as any,
          { platform: 'Compound', valueUSD: 3000 } as any
        ]
      });

      const allocations = calculateProtocolAllocations(portfolio);

      expect(allocations).toHaveLength(2);
      expect(allocations[0].protocol).toBe('Aave');
      expect(allocations[0].weight).toBeCloseTo(0.7, 6);
      expect(allocations[1].protocol).toBe('Compound');
      expect(allocations[1].weight).toBeCloseTo(0.3, 6);

      // Weights should sum to 1
      expectArraySum(allocations.map(a => a.weight), 1.0);
    });

    test('should sort by weight descending', () => {
      const portfolio = generatePortfolioSnapshot({
        totalValueUSD: 10000,
        lendingPositions: [
          { platform: 'Small', valueUSD: 1000 } as any,
          { platform: 'Large', valueUSD: 9000 } as any
        ]
      });

      const allocations = calculateProtocolAllocations(portfolio);

      expect(allocations[0].protocol).toBe('Large');
      expect(allocations[0].weight).toBeGreaterThan(allocations[1].weight);
    });
  });

  describe('Herfindahl Index Calculations', () => {
    test('should calculate HHI for concentrated portfolio', () => {
      const allocations = [
        { weight: 1.0 }, // 100% concentration
      ];

      const hhi = calculateHerfindahlIndex(allocations);
      expect(hhi).toBeCloseTo(1.0, 6);
    });

    test('should calculate HHI for diversified portfolio', () => {
      const allocations = [
        { weight: 0.25 },
        { weight: 0.25 },
        { weight: 0.25 },
        { weight: 0.25 }
      ];

      const hhi = calculateHerfindahlIndex(allocations);
      expect(hhi).toBeCloseTo(0.25, 6);
    });

    test('should return 0 for empty allocations', () => {
      const hhi = calculateHerfindahlIndex([]);
      expect(hhi).toBe(0);
    });

    test('should always return value between 0 and 1', () => {
      forAll(
        () => {
          const count = Math.floor(Math.random() * 10) + 1; // TODO: REMOVE_MOCK - Random value generation
          const weights = Array.from({ length: count }, () => Math.random()); // TODO: REMOVE_MOCK - Random value generation
          const sum = weights.reduce((a, b) => a + b, 0);
          return weights.map(w => ({ weight: w / sum }));
        },
        (allocations) => {
          const hhi = calculateHerfindahlIndex(allocations);
          return hhi >= 0 && hhi <= 1;
        },
        50
      );
    });
  });

  describe('Concentration Analysis', () => {
    test('should calculate complete concentration analysis', () => {
      const portfolio = generatePortfolioSnapshot({
        totalValueUSD: 10000,
        lendingPositions: [
          { tokenSymbol: 'ETH', valueUSD: 6000, platform: 'Aave' } as any,
          { tokenSymbol: 'USDC', valueUSD: 4000, platform: 'Compound' } as any
        ]
      });

      const priceData = new Map([
        ['ETH', generatePriceData('ETH')],
        ['USDC', generatePriceData('USDC')]
      ]);

      const analysis = calculateConcentration(portfolio, priceData);

      expectValidConcentrationAnalysis(analysis);
      expect(analysis.maxAssetWeight).toBeCloseTo(0.6, 6);
      expect(analysis.maxProtocolWeight).toBeCloseTo(0.6, 6);
      expectBetween(analysis.herfindahlIndex, 0, 1);
    });
  });

  describe('Correlation Matrix', () => {
    test('should build correlation matrix correctly', () => {
      const assets = ['ETH', 'BTC', 'USDC']; // TODO: REMOVE_MOCK - Hard-coded array literals
      const correlationData = [
        generateCorrelationData('ETH', 'BTC', { correlation: 0.8 }),
        generateCorrelationData('ETH', 'USDC', { correlation: -0.1 }),
        generateCorrelationData('BTC', 'USDC', { correlation: -0.05 })
      ];

      const matrix = buildCorrelationMatrix(assets, correlationData);

      expectValidCorrelationMatrix(matrix);
      expect(matrix.assets).toEqual(assets);
      expect(matrix.matrix[0][1]).toBeCloseTo(0.8, 6); // ETH-BTC
      expect(matrix.matrix[1][0]).toBeCloseTo(0.8, 6); // BTC-ETH (symmetric)
      expect(matrix.matrix[0][2]).toBeCloseTo(-0.1, 6); // ETH-USDC
    });

    test('should handle empty correlation data', () => {
      const assets = ['ETH', 'BTC'];
      const matrix = buildCorrelationMatrix(assets, []);

      expect(matrix.matrix[0][0]).toBe(1.0);
      expect(matrix.matrix[1][1]).toBe(1.0);
      expect(matrix.matrix[0][1]).toBe(0);
      expect(matrix.matrix[1][0]).toBe(0);
    });
  });

  describe('Portfolio Volatility', () => {
    test('should calculate portfolio volatility', () => {
      const allocations = [
        generateAssetAllocation({ symbol: 'ETH', weight: 0.6, volatility: 0.3 }),
        generateAssetAllocation({ symbol: 'USDC', weight: 0.4, volatility: 0.05 })
      ];

      const correlationMatrix = buildCorrelationMatrix(
        ['ETH', 'USDC'],
        [generateCorrelationData('ETH', 'USDC', { correlation: 0.1 })]
      );

      const volatility = calculatePortfolioVolatility(allocations, correlationMatrix);

      expectNonNegative(volatility);
      expect(volatility).toBeLessThan(0.3); // Should be less than highest individual volatility due to diversification
    });

    test('should return 0 for empty allocations', () => {
      const volatility = calculatePortfolioVolatility([], buildCorrelationMatrix([], []));
      expect(volatility).toBe(0);
    });
  });

  describe('Value at Risk', () => {
    test('should calculate VaR correctly', () => {
      const portfolioValue = 10000;
      const volatility = 0.2;
      const var95 = calculateValueAtRisk(portfolioValue, volatility, 0.95);

      expectPositive(var95);
      expect(var95).toBeCloseTo(3290, 0); // 10000 * 0.2 * 1.645
    });

    test('should scale with portfolio value', () => {
      const volatility = 0.1;
      const var1 = calculateValueAtRisk(10000, volatility, 0.95);
      const var2 = calculateValueAtRisk(20000, volatility, 0.95);

      expect(var2).toBeCloseTo(var1 * 2, 1);
    });
  });

  describe('Volatility Analysis', () => {
    test('should calculate complete volatility analysis', () => {
      const portfolio = generatePortfolioSnapshot({ totalValueUSD: 10000 });
      const allocations = [
        generateAssetAllocation({ symbol: 'ETH', weight: 0.5, volatility: 0.3 }),
        generateAssetAllocation({ symbol: 'USDC', weight: 0.5, volatility: 0.05 })
      ];
      const correlationMatrix = buildCorrelationMatrix(['ETH', 'USDC'], []);

      const analysis = calculateVolatilityAnalysis(portfolio, allocations, correlationMatrix);

      expectValidVolatilityAnalysis(analysis);
      expect(analysis.assetVolatilities.get('ETH')).toBeCloseTo(0.3, 6);
      expect(analysis.assetVolatilities.get('USDC')).toBeCloseTo(0.05, 6);
    });
  });

  describe('Risk Level Mapping', () => {
    test('should map health factors to risk levels correctly', () => {
      const thresholds = generateRiskThresholds({
        healthFactor: { critical: 1.1, high: 1.3, medium: 1.5 }
      });

      expect(mapToRiskLevel(1.0, thresholds.healthFactor)).toBe('critical');
      expect(mapToRiskLevel(1.2, thresholds.healthFactor)).toBe('high');
      expect(mapToRiskLevel(1.4, thresholds.healthFactor)).toBe('medium');
      expect(mapToRiskLevel(2.0, thresholds.healthFactor)).toBe('low');
    });
  });

  describe('Risk Score Calculation', () => {
    test('should calculate risk score with proper bounds', () => {
      const score = calculateRiskScore(2.0, 1.5, 0.3, 0.4, 0.1);

      expectPercentage(score);
      expectNonNegative(score);
    });

    test('should increase with higher risk factors', () => {
      const lowRiskScore = calculateRiskScore(3.0, 1.0, 0.1, 0.1, 0.05);
      const highRiskScore = calculateRiskScore(1.2, 3.0, 0.8, 0.9, 0.5);

      expect(highRiskScore).toBeGreaterThan(lowRiskScore);
    });
  });

  describe('Complete Risk Metrics', () => {
    test('should calculate complete risk metrics', () => {
      const portfolio = generatePortfolioSnapshot();
      const priceData = new Map([
        ['ETH', generatePriceData('ETH')],
        ['USDC', generatePriceData('USDC')]
      ]);
      const correlationData = [
        generateCorrelationData('ETH', 'USDC', { correlation: 0.1 })
      ];

      const metrics = calculateRiskMetrics(portfolio, priceData, correlationData);

      expectValidRiskMetrics(metrics);
    });

    test('should be deterministic', () => {
      const portfolio = generatePortfolioSnapshot();
      const priceData = new Map([
        ['ETH', generatePriceData('ETH', { price: 2000, volatility: 0.3 })],
        ['USDC', generatePriceData('USDC', { price: 1, volatility: 0.05 })]
      ]);
      const correlationData = [
        generateCorrelationData('ETH', 'USDC', { correlation: 0.1 })
      ];

      const metrics1 = calculateRiskMetrics(portfolio, priceData, correlationData);
      const metrics2 = calculateRiskMetrics(portfolio, priceData, correlationData);

      expect(metrics1).toEqual(metrics2);
    });
  });

  describe('Complete Risk Score', () => {
    test('should calculate complete risk score', () => {
      const metrics = {
        healthFactor: 2.0,
        leverage: 1.5,
        concentration: 0.3,
        correlation: 0.4,
        volatility: 0.15
      };
      const thresholds = generateRiskThresholds();

      const riskScore = calculateCompleteRiskScore(metrics, thresholds);

      expectValidRiskScore(riskScore);
    });

    test('should map health factor to risk level', () => {
      const lowRiskMetrics = {
        healthFactor: 3.0,
        leverage: 1.0,
        concentration: 0.1,
        correlation: 0.1,
        volatility: 0.05
      };
      
      const highRiskMetrics = {
        healthFactor: 1.1,
        leverage: 4.0,
        concentration: 0.8,
        correlation: 0.9,
        volatility: 0.4
      };

      const thresholds = generateRiskThresholds();
      
      const lowRiskScore = calculateCompleteRiskScore(lowRiskMetrics, thresholds);
      const highRiskScore = calculateCompleteRiskScore(highRiskMetrics, thresholds);

      expect(lowRiskScore.level).toBe('low');
      expect(highRiskScore.level).toBe('critical');
      expect(highRiskScore.overall).toBeGreaterThan(lowRiskScore.overall);
    });
  });

  describe('Property-based Tests', () => {
    test('health factor should never be negative', () => {
      forAll(
        () => generatePortfolioSnapshot(),
        (portfolio) => calculateHealthFactor(portfolio) >= 0,
        100
      );
    });

    test('leverage ratio should always be >= 1', () => {
      forAll(
        () => generatePortfolioSnapshot(),
        (portfolio) => calculateLeverageRatio(portfolio) >= 1.0,
        100
      );
    });

    test('asset weights should sum to 1', () => {
      forAll(
        () => {
          const portfolio = generatePortfolioSnapshot();
          const priceData = new Map([
            ['ETH', generatePriceData('ETH')],
            ['USDC', generatePriceData('USDC')]
          ]);
          return { portfolio, priceData };
        },
        ({ portfolio, priceData }) => {
          if (portfolio.totalValueUSD === 0) return true;
          
          const allocations = calculateAssetAllocations(portfolio, priceData);
          const totalWeight = allocations.reduce((sum, a) => sum + a.weight, 0);
          return Math.abs(totalWeight - 1.0) < 0.0001;
        },
        50
      );
    });

    test('portfolio volatility should be non-negative', () => {
      forAll(
        () => {
          const allocations = [
            generateAssetAllocation({ weight: 0.6, volatility: Math.random() * 0.5 }), // TODO: REMOVE_MOCK - Random value generation
            generateAssetAllocation({ weight: 0.4, volatility: Math.random() * 0.5 }) // TODO: REMOVE_MOCK - Random value generation
          ];
          const matrix = buildCorrelationMatrix(['A', 'B'], []);
          return { allocations, matrix };
        },
        ({ allocations, matrix }) => {
          const volatility = calculatePortfolioVolatility(allocations, matrix);
          return volatility >= 0;
        },
        50
      );
    });
  });
});