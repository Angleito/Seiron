import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';

import {
  mean,
  median,
  standardDeviation,
  correlation,
  covariance,
  percentile,
  exponentialMovingAverage,
  simpleMovingAverage,
  weightedAverage,
  sharpeRatio,
  maxDrawdown,
  beta,
  normalize,
  sigmoid,
  softmax
} from '../../../src/utils/math';

describe('Math Utilities', () => {
  describe('mean', () => {
    it('should calculate mean correctly', () => {
      expect(mean([1, 2, 3, 4, 5])).toBe(3);
      expect(mean([10, 20, 30])).toBe(20);
      expect(mean([-5, 0, 5])).toBe(0);
    });

    it('should handle single element', () => {
      expect(mean([42])).toBe(42);
    });

    it('should return NaN for empty array', () => {
      expect(mean([])).toBeNaN();
    });

    it('should satisfy mathematical properties', () => {
      fc.assert(
        fc.property(fc.array(fc.float({ noNaN: true }), { minLength: 1 }), (arr) => {
          const m = mean(arr);
          const sum = arr.reduce((a, b) => a + b, 0);
          expect(m).toBeCloseTo(sum / arr.length, 10);
        })
      );
    });
  });

  describe('median', () => {
    it('should calculate median for odd length arrays', () => {
      expect(median([1, 2, 3, 4, 5])).toBe(3);
      expect(median([5, 1, 3])).toBe(3);
    });

    it('should calculate median for even length arrays', () => {
      expect(median([1, 2, 3, 4])).toBe(2.5);
      expect(median([10, 20, 30, 40])).toBe(25);
    });

    it('should handle unsorted arrays', () => {
      expect(median([5, 2, 8, 1, 9])).toBe(5);
    });

    it('should be robust to outliers', () => {
      expect(median([1, 2, 3, 4, 1000])).toBe(3);
    });
  });

  describe('standardDeviation', () => {
    it('should calculate standard deviation correctly', () => {
      expect(standardDeviation([1, 2, 3, 4, 5])).toBeCloseTo(1.414, 3);
      expect(standardDeviation([10, 10, 10, 10])).toBe(0);
    });

    it('should handle population vs sample', () => {
      const data = [2, 4, 6, 8, 10];
      const popStd = standardDeviation(data, true);
      const sampleStd = standardDeviation(data, false);
      expect(sampleStd).toBeGreaterThan(popStd);
    });

    it('should satisfy variance relationship', () => {
      fc.assert(
        fc.property(fc.array(fc.float({ noNaN: true }), { minLength: 2 }), (arr) => {
          const std = standardDeviation(arr);
          const variance = std * std;
          const m = mean(arr);
          const expectedVariance = arr.reduce((sum, x) => sum + Math.pow(x - m, 2), 0) / (arr.length - 1);
          expect(variance).toBeCloseTo(expectedVariance, 10);
        })
      );
    });
  });

  describe('correlation', () => {
    it('should calculate correlation coefficient correctly', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10];
      expect(correlation(x, y)).toBeCloseTo(1, 10); // Perfect positive correlation
    });

    it('should handle negative correlation', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [5, 4, 3, 2, 1];
      expect(correlation(x, y)).toBeCloseTo(-1, 10); // Perfect negative correlation
    });

    it('should handle no correlation', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [3, 1, 4, 1, 5];
      const corr = correlation(x, y);
      expect(Math.abs(corr)).toBeLessThan(0.5);
    });

    it('should be symmetric', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 3, 5, 7, 11];
      expect(correlation(x, y)).toBeCloseTo(correlation(y, x), 10);
    });

    it('should be bounded between -1 and 1', () => {
      fc.assert(
        fc.property(
          fc.array(fc.float({ noNaN: true }), { minLength: 2 }),
          fc.array(fc.float({ noNaN: true }), { minLength: 2 }),
          (x, y) => {
            const minLen = Math.min(x.length, y.length);
            const corr = correlation(x.slice(0, minLen), y.slice(0, minLen));
            expect(corr).toBeGreaterThanOrEqual(-1);
            expect(corr).toBeLessThanOrEqual(1);
          }
        )
      );
    });
  });

  describe('percentile', () => {
    it('should calculate percentiles correctly', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      expect(percentile(data, 0)).toBe(1);
      expect(percentile(data, 50)).toBe(5.5);
      expect(percentile(data, 100)).toBe(10);
      expect(percentile(data, 25)).toBe(3.25);
      expect(percentile(data, 75)).toBe(7.75);
    });

    it('should handle unsorted data', () => {
      const data = [5, 2, 8, 1, 9, 3, 7, 4, 6, 10];
      expect(percentile(data, 50)).toBe(5.5);
    });

    it('should handle edge cases', () => {
      expect(percentile([42], 50)).toBe(42);
      expect(percentile([1, 2], 50)).toBe(1.5);
    });
  });

  describe('Moving Averages', () => {
    describe('simpleMovingAverage', () => {
      it('should calculate SMA correctly', () => {
        const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const sma = simpleMovingAverage(data, 3);
        
        expect(sma[0]).toBeNaN();
        expect(sma[1]).toBeNaN();
        expect(sma[2]).toBe(2); // (1+2+3)/3
        expect(sma[3]).toBe(3); // (2+3+4)/3
        expect(sma[9]).toBe(9); // (8+9+10)/3
      });

      it('should handle period larger than data', () => {
        const data = [1, 2, 3];
        const sma = simpleMovingAverage(data, 5);
        expect(sma.every(v => isNaN(v))).toBe(true);
      });
    });

    describe('exponentialMovingAverage', () => {
      it('should calculate EMA correctly', () => {
        const data = [1, 2, 3, 4, 5];
        const ema = exponentialMovingAverage(data, 3);
        
        expect(ema[0]).toBe(1);
        expect(ema[1]).toBeCloseTo(1.5, 10);
        expect(ema[4]).toBeGreaterThan(ema[0]);
      });

      it('should give more weight to recent values', () => {
        const increasing = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const ema = exponentialMovingAverage(increasing, 3);
        const sma = simpleMovingAverage(increasing, 3);
        
        // EMA should be higher than SMA for increasing series
        for (let i = 3; i < 10; i++) {
          expect(ema[i]).toBeGreaterThan(sma[i]);
        }
      });
    });
  });

  describe('Financial Metrics', () => {
    describe('sharpeRatio', () => {
      it('should calculate Sharpe ratio correctly', () => {
        const returns = [0.01, 0.02, -0.005, 0.015, 0.03, -0.01, 0.025];
        const riskFreeRate = 0.02 / 252; // Daily risk-free rate
        const sharpe = sharpeRatio(returns, riskFreeRate);
        
        expect(sharpe).toBeGreaterThan(0); // Positive Sharpe for positive excess returns
      });

      it('should handle negative Sharpe ratios', () => {
        const returns = [-0.01, -0.02, -0.005, -0.015];
        const riskFreeRate = 0.02 / 252;
        const sharpe = sharpeRatio(returns, riskFreeRate);
        
        expect(sharpe).toBeLessThan(0);
      });
    });

    describe('maxDrawdown', () => {
      it('should calculate maximum drawdown correctly', () => {
        const prices = [100, 110, 105, 115, 95, 100, 90, 105];
        const dd = maxDrawdown(prices);
        
        // Max drawdown from 115 to 90 = (90-115)/115 = -0.217
        expect(dd).toBeCloseTo(-0.217, 3);
      });

      it('should return 0 for always increasing prices', () => {
        const prices = [100, 110, 120, 130, 140];
        expect(maxDrawdown(prices)).toBe(0);
      });

      it('should handle single price', () => {
        expect(maxDrawdown([100])).toBe(0);
      });
    });

    describe('beta', () => {
      it('should calculate beta correctly', () => {
        const assetReturns = [0.02, 0.01, -0.01, 0.03, -0.02];
        const marketReturns = [0.01, 0.005, -0.005, 0.015, -0.01];
        const b = beta(assetReturns, marketReturns);
        
        expect(b).toBeCloseTo(2, 1); // Asset is roughly 2x as volatile as market
      });

      it('should return 1 for identical returns', () => {
        const returns = [0.01, -0.02, 0.03, -0.01, 0.02];
        expect(beta(returns, returns)).toBeCloseTo(1, 10);
      });
    });
  });

  describe('Normalization Functions', () => {
    describe('normalize', () => {
      it('should normalize to [0, 1] range', () => {
        const data = [1, 2, 3, 4, 5];
        const normalized = normalize(data);
        
        expect(Math.min(...normalized)).toBe(0);
        expect(Math.max(...normalized)).toBe(1);
        expect(normalized[2]).toBe(0.5); // Middle value
      });

      it('should handle custom range', () => {
        const data = [0, 50, 100];
        const normalized = normalize(data, -1, 1);
        
        expect(normalized[0]).toBe(-1);
        expect(normalized[1]).toBe(0);
        expect(normalized[2]).toBe(1);
      });

      it('should handle constant values', () => {
        const data = [5, 5, 5, 5];
        const normalized = normalize(data);
        expect(normalized.every(v => v === 0.5)).toBe(true);
      });
    });

    describe('sigmoid', () => {
      it('should map values to (0, 1)', () => {
        expect(sigmoid(0)).toBe(0.5);
        expect(sigmoid(10)).toBeCloseTo(1, 5);
        expect(sigmoid(-10)).toBeCloseTo(0, 5);
      });

      it('should be monotonic', () => {
        const values = [-5, -2, 0, 2, 5];
        const sigValues = values.map(sigmoid);
        for (let i = 1; i < sigValues.length; i++) {
          expect(sigValues[i]).toBeGreaterThan(sigValues[i - 1]);
        }
      });
    });

    describe('softmax', () => {
      it('should sum to 1', () => {
        const values = [1, 2, 3, 4, 5];
        const soft = softmax(values);
        expect(soft.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
      });

      it('should preserve relative ordering', () => {
        const values = [1, 3, 2, 5, 4];
        const soft = softmax(values);
        
        // Largest input should have largest softmax value
        const maxIndex = values.indexOf(Math.max(...values));
        const maxSoftIndex = soft.indexOf(Math.max(...soft));
        expect(maxIndex).toBe(maxSoftIndex);
      });

      it('should handle extreme values', () => {
        const values = [1000, 0, -1000];
        const soft = softmax(values);
        
        expect(soft[0]).toBeCloseTo(1, 5);
        expect(soft[1]).toBeCloseTo(0, 5);
        expect(soft[2]).toBeCloseTo(0, 5);
      });
    });
  });

  describe('Property-based tests', () => {
    it('mean should be between min and max', () => {
      fc.assert(
        fc.property(fc.array(fc.float({ noNaN: true }), { minLength: 1 }), (arr) => {
          const m = mean(arr);
          expect(m).toBeGreaterThanOrEqual(Math.min(...arr));
          expect(m).toBeLessThanOrEqual(Math.max(...arr));
        })
      );
    });

    it('correlation should be commutative', () => {
      fc.assert(
        fc.property(
          fc.array(fc.float({ noNaN: true }), { minLength: 2, maxLength: 100 }),
          fc.array(fc.float({ noNaN: true }), { minLength: 2, maxLength: 100 }),
          (x, y) => {
            const len = Math.min(x.length, y.length);
            const x1 = x.slice(0, len);
            const y1 = y.slice(0, len);
            expect(correlation(x1, y1)).toBeCloseTo(correlation(y1, x1), 10);
          }
        )
      );
    });

    it('normalized values should maintain order', () => {
      fc.assert(
        fc.property(fc.array(fc.float({ noNaN: true }), { minLength: 2 }), (arr) => {
          const normalized = normalize(arr);
          for (let i = 0; i < arr.length - 1; i++) {
            if (arr[i] < arr[i + 1]) {
              expect(normalized[i]).toBeLessThanOrEqual(normalized[i + 1]);
            } else if (arr[i] > arr[i + 1]) {
              expect(normalized[i]).toBeGreaterThanOrEqual(normalized[i + 1]);
            }
          }
        })
      );
    });
  });
});