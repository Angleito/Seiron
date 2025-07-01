import { describe, it, expect } from '@jest/globals';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';

import {
  calculateReturns,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateVolatility,
  engineerFeatures,
  createFeatureEngineering
} from '../../../src/transformers/features';
import { TimeSeriesData, FeatureSet } from '../../../src/types';

describe('Features Transformer', () => {
  const mockPrices = [100, 102, 101, 103, 105, 104, 106, 108, 107, 109];
  const mockVolumes = [1000, 1200, 900, 1300, 1500, 1100, 1600, 1800, 1400, 2000];

  describe('calculateReturns', () => {
    it('should calculate simple returns correctly', () => {
      const result = calculateReturns(mockPrices, 'simple');
      
      expect(result.length).toBe(mockPrices.length - 1);
      expect(result[0]).toBeCloseTo(0.02, 4); // (102-100)/100
      expect(result[1]).toBeCloseTo(-0.0098, 4); // (101-102)/102
    });

    it('should calculate log returns correctly', () => {
      const result = calculateReturns(mockPrices, 'log');
      
      expect(result.length).toBe(mockPrices.length - 1);
      expect(result[0]).toBeCloseTo(Math.log(102/100), 4);
      expect(result[1]).toBeCloseTo(Math.log(101/102), 4);
    });

    it('should handle empty array', () => {
      const result = calculateReturns([], 'simple');
      expect(result).toEqual([]);
    });

    it('should handle single element array', () => {
      const result = calculateReturns([100], 'simple');
      expect(result).toEqual([]);
    });
  });

  describe('calculateRSI', () => {
    it('should calculate RSI with default period', () => {
      const prices = Array.from({ length: 20 }, (_, i) => 100 + i * 2);
      const result = calculateRSI(prices);
      
      expect(result.length).toBe(prices.length);
      // First 14 values should be NaN
      expect(result.slice(0, 14).every(v => isNaN(v))).toBe(true);
      // After period, should have valid RSI values
      expect(result[14]).toBeGreaterThan(70); // Strong uptrend
    });

    it('should calculate RSI with custom period', () => {
      const result = calculateRSI(mockPrices, 5);
      
      expect(result.length).toBe(mockPrices.length);
      expect(result.slice(0, 5).every(v => isNaN(v))).toBe(true);
      expect(result[5]).toBeGreaterThan(0);
      expect(result[5]).toBeLessThan(100);
    });

    it('should handle flat prices', () => {
      const flatPrices = Array(20).fill(100);
      const result = calculateRSI(flatPrices);
      
      // RSI should be 50 for flat prices (after initial period)
      const validRSI = result.filter(v => !isNaN(v));
      validRSI.forEach(rsi => {
        expect(rsi).toBeCloseTo(50, 0);
      });
    });
  });

  describe('calculateMACD', () => {
    it('should calculate MACD with default parameters', () => {
      const prices = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i * 0.1) * 10);
      const result = calculateMACD(prices);
      
      expect(result).toHaveProperty('macd');
      expect(result).toHaveProperty('signal');
      expect(result).toHaveProperty('histogram');
      expect(result.macd.length).toBe(prices.length);
      expect(result.signal.length).toBe(prices.length);
      expect(result.histogram.length).toBe(prices.length);
    });

    it('should calculate MACD with custom parameters', () => {
      const result = calculateMACD(mockPrices, 3, 6, 4);
      
      expect(result.macd.length).toBe(mockPrices.length);
      // First values should be NaN until enough data
      expect(isNaN(result.macd[0])).toBe(true);
      expect(isNaN(result.signal[0])).toBe(true);
    });

    it('should calculate histogram correctly', () => {
      const prices = [100, 102, 104, 103, 105, 107, 106, 108, 110, 109];
      const result = calculateMACD(prices, 3, 6, 4);
      
      result.histogram.forEach((hist, i) => {
        if (!isNaN(hist)) {
          expect(hist).toBeCloseTo(result.macd[i] - result.signal[i], 10);
        }
      });
    });
  });

  describe('calculateBollingerBands', () => {
    it('should calculate Bollinger Bands correctly', () => {
      const result = calculateBollingerBands(mockPrices, 5, 2);
      
      expect(result).toHaveProperty('upper');
      expect(result).toHaveProperty('middle');
      expect(result).toHaveProperty('lower');
      expect(result.upper.length).toBe(mockPrices.length);
      
      // Middle band should be SMA
      result.middle.forEach((mid, i) => {
        if (i >= 4) {
          const sma = mockPrices.slice(i - 4, i + 1).reduce((a, b) => a + b) / 5;
          expect(mid).toBeCloseTo(sma, 10);
        }
      });
      
      // Upper band > middle band > lower band
      result.upper.forEach((upper, i) => {
        if (!isNaN(upper)) {
          expect(upper).toBeGreaterThan(result.middle[i]);
          expect(result.middle[i]).toBeGreaterThan(result.lower[i]);
        }
      });
    });

    it('should handle different standard deviations', () => {
      const result1 = calculateBollingerBands(mockPrices, 5, 1);
      const result2 = calculateBollingerBands(mockPrices, 5, 3);
      
      // Larger stdDev should create wider bands
      result1.upper.forEach((upper1, i) => {
        if (!isNaN(upper1) && !isNaN(result2.upper[i])) {
          const width1 = upper1 - result1.lower[i];
          const width2 = result2.upper[i] - result2.lower[i];
          expect(width2).toBeGreaterThan(width1);
        }
      });
    });
  });

  describe('calculateVolatility', () => {
    it('should calculate volatility correctly', () => {
      const result = calculateVolatility(mockPrices, 5);
      
      expect(result.length).toBe(mockPrices.length);
      expect(result.slice(0, 5).every(v => isNaN(v))).toBe(true);
      expect(result[5]).toBeGreaterThan(0);
    });

    it('should return higher volatility for more volatile data', () => {
      const stablePrices = Array(20).fill(100);
      const volatilePrices = Array.from({ length: 20 }, (_, i) => 100 + (i % 2 ? 10 : -10));
      
      const stableVol = calculateVolatility(stablePrices, 5);
      const highVol = calculateVolatility(volatilePrices, 5);
      
      const avgStable = stableVol.filter(v => !isNaN(v)).reduce((a, b) => a + b) / stableVol.filter(v => !isNaN(v)).length;
      const avgHigh = highVol.filter(v => !isNaN(v)).reduce((a, b) => a + b) / highVol.filter(v => !isNaN(v)).length;
      
      expect(avgHigh).toBeGreaterThan(avgStable);
    });
  });

  describe('engineerFeatures', () => {
    const mockTimeSeries: TimeSeriesData = {
      timestamps: Array.from({ length: 50 }, (_, i) => Date.now() - i * 60000).reverse(),
      data: {
        SEI: {
          prices: Array.from({ length: 50 }, (_, i) => 0.5 + Math.sin(i * 0.1) * 0.1),
          volumes: Array.from({ length: 50 }, (_, i) => 1000000 + Math.random() * 500000)
        },
        ETH: {
          prices: Array.from({ length: 50 }, (_, i) => 2000 + Math.sin(i * 0.15) * 100),
          volumes: Array.from({ length: 50 }, (_, i) => 500000 + Math.random() * 250000)
        }
      },
      interval: '5m'
    };

    it('should engineer all requested features', () => {
      const options = {
        features: ['returns', 'rsi', 'macd', 'bollinger', 'volatility'],
        fillMethod: 'forward' as const
      };

      const result = engineerFeatures(mockTimeSeries, options);

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        const features = result.right;
        expect(features.features).toContain('SEI_returns');
        expect(features.features).toContain('SEI_rsi');
        expect(features.features).toContain('SEI_macd');
        expect(features.features).toContain('SEI_macd_signal');
        expect(features.features).toContain('SEI_bb_upper');
        expect(features.features).toContain('SEI_volatility');
        expect(features.features).toContain('ETH_returns');
        expect(features.data.length).toBeGreaterThan(0);
      }
    });

    it('should handle missing data with forward fill', () => {
      const sparseData = { ...mockTimeSeries };
      // Add some NaN values
      sparseData.data.SEI.prices[10] = NaN;
      sparseData.data.SEI.prices[11] = NaN;

      const result = engineerFeatures(sparseData, {
        features: ['returns'],
        fillMethod: 'forward'
      });

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        // Check that NaN values were filled
        const seiReturnsIndex = result.right.features.indexOf('SEI_returns');
        const filledValues = result.right.data.map(d => d.features[seiReturnsIndex]);
        expect(filledValues.every(v => !isNaN(v))).toBe(true);
      }
    });

    it('should validate feature data quality', () => {
      const badData = {
        ...mockTimeSeries,
        data: {
          SEI: {
            prices: Array(50).fill(NaN),
            volumes: Array(50).fill(0)
          }
        }
      };

      const result = engineerFeatures(badData, {
        features: ['returns', 'rsi'],
        fillMethod: 'forward'
      });

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.type).toBe('validation');
      }
    });
  });

  describe('createFeatureEngineering', () => {
    it('should create a configured feature engineering pipeline', () => {
      const featureEngine = createFeatureEngineering({
        defaultFeatures: ['returns', 'volatility'],
        rsiPeriod: 10,
        volatilityWindow: 10
      });

      const mockData: TimeSeriesData = {
        timestamps: Array.from({ length: 20 }, (_, i) => Date.now() - i * 60000).reverse(),
        data: {
          TEST: {
            prices: Array.from({ length: 20 }, (_, i) => 100 + i),
            volumes: Array.from({ length: 20 }, () => 1000)
          }
        },
        interval: '1m'
      };

      const result = featureEngine(mockData);

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.features).toContain('TEST_returns');
        expect(result.right.features).toContain('TEST_volatility');
      }
    });
  });

  describe('Functional composition', () => {
    it('should compose feature engineering functions', () => {
      const customFeaturePipeline = pipe(
        (data: TimeSeriesData) => E.right(data),
        E.chain(data => engineerFeatures(data, {
          features: ['returns', 'rsi'],
          fillMethod: 'forward'
        })),
        E.map(features => ({
          ...features,
          customFeatures: {
            avgReturn: features.data.reduce((sum, d) => sum + d.features[0], 0) / features.data.length
          }
        }))
      );

      const mockData: TimeSeriesData = {
        timestamps: Array.from({ length: 30 }, (_, i) => Date.now() - i * 60000).reverse(),
        data: {
          TEST: {
            prices: Array.from({ length: 30 }, (_, i) => 100 + Math.random() * 10),
            volumes: Array.from({ length: 30 }, () => 1000)
          }
        },
        interval: '1m'
      };

      const result = customFeaturePipeline(mockData);

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.customFeatures).toHaveProperty('avgReturn');
        expect(typeof result.right.customFeatures.avgReturn).toBe('number');
      }
    });
  });
});