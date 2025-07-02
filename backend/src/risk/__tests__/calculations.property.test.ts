/**
 * Property-Based Tests for Risk Calculations
 * Tests mathematical properties and invariants
 */

import {
  calculateHealthFactor,
  calculateLeverageRatio,
  calculateAssetAllocations,
  calculateHerfindahlIndex,
  calculatePortfolioVolatility,
  calculateValueAtRisk,
  calculateRiskScore,
  buildCorrelationMatrix
} from '../calculations';

import {
  generatePortfolioValue,
  generateHealthFactor,
  generateLeverageRatio,
  generateConcentration,
  generateCorrelation,
  generateVolatility,
  generateRiskMetrics,
  generateWeights,
  generateConcentratedWeights,
  generatePositiveFloat,
  generateProbability,
  generateArray,
  generateNonEmptyArray,
  tupleGen,
  recordGen,
  quickCheck,
  verboseCheck,
  forAllWith,
  allPositive,
  allNonNegative,
  sumEquals,
  inRange,
  isMonotonic,
  isConvex,
  PropertyTestResult
} from '@/test-utils/property-testing';

import {
  generatePortfolioSnapshot,
  generatePriceData,
  generateCorrelationData,
  generateAssetAllocation
} from '@/test-utils';

describe('Risk Calculations - Property Tests', () => {

  describe('Health Factor Properties', () => {
    test('health factor should never be negative', () => {
      const result = quickCheck(
        () => generatePortfolioSnapshot(),
        (portfolio) => calculateHealthFactor(portfolio) >= 0,
        200
      );
      
      expect(result).toBe(true);
    });

    test('health factor should be infinite when no borrowing', () => {
      const result = quickCheck(
        () => generatePortfolioSnapshot({
          totalBorrowedUSD: 0,
          totalSuppliedUSD: generatePositiveFloat(100000)()
        }),
        (portfolio) => calculateHealthFactor(portfolio) === Number.MAX_SAFE_INTEGER,
        100
      );
      
      expect(result).toBe(true);
    });

    test('health factor should decrease as borrowing increases', () => {
      const result = quickCheck(
        tupleGen(
          () => generatePositiveFloat(10000)(), // supplied
          () => generatePositiveFloat(5000)(),  // borrowed1
          () => generatePositiveFloat(5000)()   // borrowed2
        ),
        ([supplied, borrowed1, borrowed2]) => {
          if (borrowed1 >= borrowed2) return true; // Skip if not ordered
          
          const portfolio1 = generatePortfolioSnapshot({
            totalSuppliedUSD: supplied,
            totalBorrowedUSD: borrowed1
          });
          
          const portfolio2 = generatePortfolioSnapshot({
            totalSuppliedUSD: supplied,
            totalBorrowedUSD: borrowed2
          });
          
          const hf1 = calculateHealthFactor(portfolio1);
          const hf2 = calculateHealthFactor(portfolio2);
          
          return hf1 >= hf2;
        },
        150
      );
      
      expect(result).toBe(true);
    });

    test('health factor calculation should be homogeneous', () => {
      const result = quickCheck(
        tupleGen(
          () => generatePositiveFloat(10000)(), // supplied
          () => generatePositiveFloat(5000)(),  // borrowed
          () => generatePositiveFloat(10)()     // scale factor
        ),
        ([supplied, borrowed, scale]) => {
          const portfolio1 = generatePortfolioSnapshot({
            totalSuppliedUSD: supplied,
            totalBorrowedUSD: borrowed
          });
          
          const portfolio2 = generatePortfolioSnapshot({
            totalSuppliedUSD: supplied * scale,
            totalBorrowedUSD: borrowed * scale
          });
          
          const hf1 = calculateHealthFactor(portfolio1);
          const hf2 = calculateHealthFactor(portfolio2);
          
          return Math.abs(hf1 - hf2) < 1e-10;
        },
        100
      );
      
      expect(result).toBe(true);
    });
  });

  describe('Leverage Ratio Properties', () => {
    test('leverage ratio should always be >= 1', () => {
      const result = quickCheck(
        () => generatePortfolioSnapshot(),
        (portfolio) => calculateLeverageRatio(portfolio) >= 1.0,
        200
      );
      
      expect(result).toBe(true);
    });

    test('leverage ratio should equal 1 when no borrowing', () => {
      const result = quickCheck(
        () => {
          const value = generatePositiveFloat(100000)();
          return generatePortfolioSnapshot({
            totalValueUSD: value,
            netWorth: value,
            totalBorrowedUSD: 0
          });
        },
        (portfolio) => Math.abs(calculateLeverageRatio(portfolio) - 1.0) < 1e-10,
        100
      );
      
      expect(result).toBe(true);
    });

    test('leverage ratio should increase with borrowing', () => {
      const result = quickCheck(
        tupleGen(
          () => generatePositiveFloat(10000)(), // netWorth
          () => generatePositiveFloat(5000)(),  // borrowed1
          () => generatePositiveFloat(5000)()   // borrowed2
        ),
        ([netWorth, borrowed1, borrowed2]) => {
          if (borrowed1 >= borrowed2) return true; // Skip if not ordered
          
          const portfolio1 = generatePortfolioSnapshot({
            totalValueUSD: netWorth + borrowed1,
            netWorth,
            totalBorrowedUSD: borrowed1
          });
          
          const portfolio2 = generatePortfolioSnapshot({
            totalValueUSD: netWorth + borrowed2,
            netWorth,
            totalBorrowedUSD: borrowed2
          });
          
          const lr1 = calculateLeverageRatio(portfolio1);
          const lr2 = calculateLeverageRatio(portfolio2);
          
          return lr1 <= lr2;
        },
        100
      );
      
      expect(result).toBe(true);
    });
  });

  describe('Asset Allocation Properties', () => {
    test('asset weights should sum to 1 for non-empty portfolios', () => {
      const result = quickCheck(
        () => {
          const portfolio = generatePortfolioSnapshot();
          if (portfolio.totalValueUSD === 0) {
            // Ensure non-empty portfolio
            return generatePortfolioSnapshot({ totalValueUSD: generatePositiveFloat(10000)() });
          }
          return portfolio;
        },
        (portfolio) => {
          const priceData = new Map([
            ['ETH', generatePriceData('ETH')],
            ['USDC', generatePriceData('USDC')],
            ['BTC', generatePriceData('BTC')]
          ]);
          
          const allocations = calculateAssetAllocations(portfolio, priceData);
          
          if (allocations.length === 0) return true; // Empty is valid
          
          return sumEquals(allocations.map(a => a.weight), 1.0, 1e-10);
        },
        100
      );
      
      expect(result).toBe(true);
    });

    test('all asset weights should be non-negative', () => {
      const result = quickCheck(
        () => generatePortfolioSnapshot(),
        (portfolio) => {
          const priceData = new Map([
            ['ETH', generatePriceData('ETH')],
            ['USDC', generatePriceData('USDC')]
          ]);
          
          const allocations = calculateAssetAllocations(portfolio, priceData);
          return allNonNegative(allocations.map(a => a.weight));
        },
        100
      );
      
      expect(result).toBe(true);
    });

    test('asset allocations should be sorted by weight descending', () => {
      const result = quickCheck(
        () => generatePortfolioSnapshot(),
        (portfolio) => {
          const priceData = new Map([
            ['ETH', generatePriceData('ETH')],
            ['USDC', generatePriceData('USDC')],
            ['BTC', generatePriceData('BTC')]
          ]);
          
          const allocations = calculateAssetAllocations(portfolio, priceData);
          const weights = allocations.map(a => a.weight);
          
          // Check if sorted in descending order
          for (let i = 1; i < weights.length; i++) {
            if (weights[i] > weights[i - 1]) {
              return false;
            }
          }
          
          return true;
        },
        100
      );
      
      expect(result).toBe(true);
    });
  });

  describe('Herfindahl Index Properties', () => {
    test('HHI should be between 0 and 1', () => {
      const result = quickCheck(
        () => generateWeights(Math.floor(Math.random() * 10) + 1),
        (weights) => {
          const allocations = weights.map(weight => ({ weight }));
          const hhi = calculateHerfindahlIndex(allocations);
          return inRange(hhi, 0, 1);
        },
        200
      );
      
      expect(result).toBe(true);
    });

    test('HHI should equal 1 for fully concentrated portfolio', () => {
      const result = quickCheck(
        () => Math.floor(Math.random() * 10) + 1, // number of assets
        (numAssets) => {
          const allocations = Array(numAssets).fill(0).map((_, i) => ({
            weight: i === 0 ? 1.0 : 0.0
          }));
          
          const hhi = calculateHerfindahlIndex(allocations);
          return Math.abs(hhi - 1.0) < 1e-10;
        },
        100
      );
      
      expect(result).toBe(true);
    });

    test('HHI should equal 1/n for equally weighted portfolio', () => {
      const result = quickCheck(
        () => Math.floor(Math.random() * 10) + 2, // 2-11 assets
        (numAssets) => {
          const weight = 1.0 / numAssets;
          const allocations = Array(numAssets).fill(0).map(() => ({ weight }));
          
          const hhi = calculateHerfindahlIndex(allocations);
          const expected = 1.0 / numAssets;
          
          return Math.abs(hhi - expected) < 1e-10;
        },
        100
      );
      
      expect(result).toBe(true);
    });

    test('HHI should increase with concentration', () => {
      const result = quickCheck(
        () => Math.floor(Math.random() * 5) + 3, // 3-7 assets
        (numAssets) => {
          // Generate normal weights
          const normalWeights = generateWeights(numAssets)();
          const normalAllocs = normalWeights.map(w => ({ weight: w }));
          
          // Generate concentrated weights
          const concWeights = generateConcentratedWeights(numAssets)();
          const concAllocs = concWeights.map(w => ({ weight: w }));
          
          const normalHHI = calculateHerfindahlIndex(normalAllocs);
          const concHHI = calculateHerfindahlIndex(concAllocs);
          
          return concHHI >= normalHHI;
        },
        100
      );
      
      expect(result).toBe(true);
    });
  });

  describe('Correlation Matrix Properties', () => {
    test('correlation matrix should be symmetric', () => {
      const result = quickCheck(
        () => {
          const numAssets = Math.floor(Math.random() * 5) + 2; // 2-6 assets
          const assets = Array.from({ length: numAssets }, (_, i) => `ASSET${i}`);
          
          const correlationData = [];
          for (let i = 0; i < numAssets; i++) {
            for (let j = i + 1; j < numAssets; j++) {
              correlationData.push(generateCorrelationData(assets[i], assets[j]));
            }
          }
          
          return { assets, correlationData };
        },
        ({ assets, correlationData }) => {
          const matrix = buildCorrelationMatrix(assets, correlationData);
          
          // Check symmetry
          for (let i = 0; i < assets.length; i++) {
            for (let j = 0; j < assets.length; j++) {
              if (Math.abs(matrix.matrix[i][j] - matrix.matrix[j][i]) > 1e-10) {
                return false;
              }
            }
          }
          
          return true;
        },
        100
      );
      
      expect(result).toBe(true);
    });

    test('correlation matrix diagonal should be 1', () => {
      const result = quickCheck(
        () => {
          const numAssets = Math.floor(Math.random() * 5) + 2;
          const assets = Array.from({ length: numAssets }, (_, i) => `ASSET${i}`);
          return { assets, correlationData: [] }; // Empty correlation data
        },
        ({ assets, correlationData }) => {
          const matrix = buildCorrelationMatrix(assets, correlationData);
          
          // Check diagonal
          for (let i = 0; i < assets.length; i++) {
            if (Math.abs(matrix.matrix[i][i] - 1.0) > 1e-10) {
              return false;
            }
          }
          
          return true;
        },
        100
      );
      
      expect(result).toBe(true);
    });

    test('correlation values should be between -1 and 1', () => {
      const result = quickCheck(
        () => {
          const numAssets = Math.floor(Math.random() * 4) + 2;
          const assets = Array.from({ length: numAssets }, (_, i) => `ASSET${i}`);
          
          const correlationData = [];
          for (let i = 0; i < numAssets; i++) {
            for (let j = i + 1; j < numAssets; j++) {
              correlationData.push(generateCorrelationData(assets[i], assets[j]));
            }
          }
          
          return { assets, correlationData };
        },
        ({ assets, correlationData }) => {
          const matrix = buildCorrelationMatrix(assets, correlationData);
          
          // Check all correlation values
          for (let i = 0; i < assets.length; i++) {
            for (let j = 0; j < assets.length; j++) {
              if (!inRange(matrix.matrix[i][j], -1, 1)) {
                return false;
              }
            }
          }
          
          return true;
        },
        100
      );
      
      expect(result).toBe(true);
    });
  });

  describe('Portfolio Volatility Properties', () => {
    test('portfolio volatility should be non-negative', () => {
      const result = quickCheck(
        () => {
          const numAssets = Math.floor(Math.random() * 5) + 2;
          const assets = Array.from({ length: numAssets }, (_, i) => `ASSET${i}`);
          const weights = generateWeights(numAssets)();
          
          const allocations = weights.map((weight, i) => 
            generateAssetAllocation({
              symbol: assets[i],
              weight,
              volatility: generateVolatility()()
            })
          );
          
          const correlationMatrix = buildCorrelationMatrix(assets, []);
          
          return { allocations, correlationMatrix };
        },
        ({ allocations, correlationMatrix }) => {
          const volatility = calculatePortfolioVolatility(allocations, correlationMatrix);
          return volatility >= 0;
        },
        100
      );
      
      expect(result).toBe(true);
    });

    test('portfolio volatility should be zero for zero weights', () => {
      const result = quickCheck(
        () => Math.floor(Math.random() * 5) + 2, // numAssets
        (numAssets) => {
          const assets = Array.from({ length: numAssets }, (_, i) => `ASSET${i}`);
          const allocations = Array(numAssets).fill(0).map((_, i) => 
            generateAssetAllocation({
              symbol: assets[i],
              weight: 0,
              volatility: generateVolatility()()
            })
          );
          
          const correlationMatrix = buildCorrelationMatrix(assets, []);
          const volatility = calculatePortfolioVolatility(allocations, correlationMatrix);
          
          return Math.abs(volatility) < 1e-10;
        },
        50
      );
      
      expect(result).toBe(true);
    });

    test('single asset portfolio volatility should equal asset volatility', () => {
      const result = quickCheck(
        generateVolatility,
        (assetVolatility) => {
          const allocation = generateAssetAllocation({
            symbol: 'SINGLE',
            weight: 1.0,
            volatility: assetVolatility
          });
          
          const correlationMatrix = buildCorrelationMatrix(['SINGLE'], []);
          const portfolioVolatility = calculatePortfolioVolatility([allocation], correlationMatrix);
          
          return Math.abs(portfolioVolatility - assetVolatility) < 1e-10;
        },
        100
      );
      
      expect(result).toBe(true);
    });
  });

  describe('Value at Risk Properties', () => {
    test('VaR should be positive for positive portfolio value and volatility', () => {
      const result = quickCheck(
        tupleGen(
          () => generatePositiveFloat(1000000)(), // portfolio value
          () => generatePositiveFloat(1)(),      // volatility
          generateProbability                     // confidence level
        ),
        ([portfolioValue, volatility, confidence]) => {
          const var95 = calculateValueAtRisk(portfolioValue, volatility, confidence);
          return var95 >= 0;
        },
        100
      );
      
      expect(result).toBe(true);
    });

    test('VaR should scale linearly with portfolio value', () => {
      const result = quickCheck(
        tupleGen(
          () => generatePositiveFloat(100000)(), // portfolio value
          generateVolatility,                     // volatility
          () => generatePositiveFloat(10)()      // scale factor
        ),
        ([portfolioValue, volatility, scale]) => {
          const var1 = calculateValueAtRisk(portfolioValue, volatility, 0.95);
          const var2 = calculateValueAtRisk(portfolioValue * scale, volatility, 0.95);
          
          return Math.abs(var2 - var1 * scale) < 1e-6;
        },
        100
      );
      
      expect(result).toBe(true);
    });

    test('VaR should increase with volatility', () => {
      const result = quickCheck(
        tupleGen(
          () => generatePositiveFloat(100000)(), // portfolio value
          generateVolatility,                     // volatility1
          generateVolatility                      // volatility2
        ),
        ([portfolioValue, vol1, vol2]) => {
          if (vol1 >= vol2) return true; // Skip if not ordered
          
          const var1 = calculateValueAtRisk(portfolioValue, vol1, 0.95);
          const var2 = calculateValueAtRisk(portfolioValue, vol2, 0.95);
          
          return var1 <= var2;
        },
        100
      );
      
      expect(result).toBe(true);
    });
  });

  describe('Risk Score Properties', () => {
    test('risk score should be between 0 and 100', () => {
      const result = quickCheck(
        generateRiskMetrics,
        (metrics) => {
          const score = calculateRiskScore(
            metrics.healthFactor,
            metrics.leverage,
            metrics.concentration,
            metrics.correlation,
            metrics.volatility
          );
          
          return inRange(score, 0, 100);
        },
        200
      );
      
      expect(result).toBe(true);
    });

    test('risk score should be monotonic in individual risk factors', () => {
      const result = quickCheck(
        tupleGen(
          generateHealthFactor,
          generateLeverageRatio,
          generateConcentration,
          generateCorrelation,
          generateVolatility
        ),
        ([hf, lev, conc, corr, vol]) => {
          // Test monotonicity in health factor (lower HF = higher risk)
          const score1 = calculateRiskScore(Math.max(hf, 1.0), lev, conc, corr, vol);
          const score2 = calculateRiskScore(Math.max(hf * 0.8, 1.0), lev, conc, corr, vol);
          
          return score1 <= score2; // Lower health factor should give higher risk score
        },
        100
      );
      
      expect(result).toBe(true);
    });

    test('risk score should increase with leverage', () => {
      const result = quickCheck(
        tupleGen(
          generateHealthFactor,
          generateLeverageRatio,
          generateConcentration,
          generateCorrelation,
          generateVolatility
        ),
        ([hf, lev, conc, corr, vol]) => {
          const score1 = calculateRiskScore(hf, lev, conc, corr, vol);
          const score2 = calculateRiskScore(hf, lev * 1.5, conc, corr, vol);
          
          return score1 <= score2;
        },
        100
      );
      
      expect(result).toBe(true);
    });
  });

  describe('Mathematical Properties', () => {
    test('health factor calculation should be continuous', () => {
      const result = quickCheck(
        tupleGen(
          () => generatePositiveFloat(10000)(), // supplied
          () => generatePositiveFloat(5000)(),  // borrowed
          () => generatePositiveFloat(0.01)()   // small delta
        ),
        ([supplied, borrowed, delta]) => {
          const portfolio1 = generatePortfolioSnapshot({
            totalSuppliedUSD: supplied,
            totalBorrowedUSD: borrowed
          });
          
          const portfolio2 = generatePortfolioSnapshot({
            totalSuppliedUSD: supplied + delta,
            totalBorrowedUSD: borrowed
          });
          
          const hf1 = calculateHealthFactor(portfolio1);
          const hf2 = calculateHealthFactor(portfolio2);
          
          // Small change in input should produce small change in output
          const relativeChange = Math.abs(hf2 - hf1) / hf1;
          const inputChange = delta / supplied;
          
          return relativeChange <= inputChange * 2; // Allow some amplification
        },
        100
      );
      
      expect(result).toBe(true);
    });

    test('weight normalization should preserve order', () => {
      const result = quickCheck(
        () => generateNonEmptyArray(() => generatePositiveFloat(1000)(), 2, 10)(),
        (rawValues) => {
          const sum = rawValues.reduce((a, b) => a + b, 0);
          const normalizedWeights = rawValues.map(v => v / sum);
          
          // Check if order is preserved
          for (let i = 1; i < rawValues.length; i++) {
            const rawOrder = rawValues[i] >= rawValues[i - 1];
            const normOrder = normalizedWeights[i] >= normalizedWeights[i - 1];
            
            if (rawOrder !== normOrder) {
              return false;
            }
          }
          
          return true;
        },
        100
      );
      
      expect(result).toBe(true);
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    test('calculations should handle very small values', () => {
      const result = quickCheck(
        () => generatePortfolioSnapshot({
          totalValueUSD: Math.random() * 1e-10,
          totalSuppliedUSD: Math.random() * 1e-10,
          totalBorrowedUSD: Math.random() * 1e-10
        }),
        (portfolio) => {
          const hf = calculateHealthFactor(portfolio);
          const lr = calculateLeverageRatio(portfolio);
          
          return !isNaN(hf) && !isNaN(lr) && isFinite(hf) && isFinite(lr);
        },
        50
      );
      
      expect(result).toBe(true);
    });

    test('calculations should handle very large values', () => {
      const result = quickCheck(
        () => generatePortfolioSnapshot({
          totalValueUSD: Math.random() * 1e15,
          totalSuppliedUSD: Math.random() * 1e15,
          totalBorrowedUSD: Math.random() * 1e15
        }),
        (portfolio) => {
          const hf = calculateHealthFactor(portfolio);
          const lr = calculateLeverageRatio(portfolio);
          
          return !isNaN(hf) && !isNaN(lr) && isFinite(hf) && isFinite(lr);
        },
        50
      );
      
      expect(result).toBe(true);
    });
  });

  describe('Property Test Infrastructure', () => {
    test('should demonstrate property test failure detection', () => {
      // This should fail - testing the testing framework itself
      const result = verboseCheck(
        () => Math.random() * 100,
        (x) => x < 50, // This will fail for ~50% of cases
        20
      );
      
      expect(result.success).toBe(false);
      expect(result.counterexample).toBeDefined();
      expect(result.counterexample).toBeGreaterThanOrEqual(50);
    });

    test('should demonstrate shrinking behavior', () => {
      const result = verboseCheck(
        generatePositiveFloat(1000),
        (x) => x < 100, // Will fail for values >= 100
        50
      );
      
      if (!result.success) {
        expect(result.counterexample).toBeGreaterThanOrEqual(100);
        // Shrunk counterexample should be smaller but still fail the property
        if (result.shrunkCounterexample !== undefined) {
          expect(result.shrunkCounterexample).toBeLessThanOrEqual(result.counterexample);
          expect(result.shrunkCounterexample).toBeGreaterThanOrEqual(100);
        }
      }
    });
  });
});