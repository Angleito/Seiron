import { describe, it, expect } from '@jest/globals';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';

import {
  normalizePrice,
  normalizeVolume,
  normalizeTimestamp,
  normalizeData,
  createNormalizer
} from '../../../src/transformers/normalize';
import { RawData, NormalizedData } from '../../../src/types';

describe('Normalize Transformer', () => {
  describe('normalizePrice', () => {
    it('should normalize price to base unit', () => {
      const result = normalizePrice(123.45, 18);
      expect(result).toBe(123450000000000000000n);
    });

    it('should handle zero price', () => {
      const result = normalizePrice(0, 18);
      expect(result).toBe(0n);
    });

    it('should handle negative prices', () => {
      const result = normalizePrice(-10, 6);
      expect(result).toBe(-10000000n);
    });

    it('should handle different decimals', () => {
      expect(normalizePrice(1, 6)).toBe(1000000n);
      expect(normalizePrice(1, 8)).toBe(100000000n);
      expect(normalizePrice(1, 18)).toBe(1000000000000000000n);
    });
  });

  describe('normalizeVolume', () => {
    it('should normalize volume correctly', () => {
      const result = normalizeVolume('1000000', 6);
      expect(result).toBe(1n);
    });

    it('should handle large volumes', () => {
      const result = normalizeVolume('1000000000000000000', 18);
      expect(result).toBe(1n);
    });

    it('should return 0 for invalid volume', () => {
      const result = normalizeVolume('invalid', 6);
      expect(result).toBe(0n);
    });
  });

  describe('normalizeTimestamp', () => {
    it('should convert seconds to milliseconds', () => {
      const result = normalizeTimestamp(1700000000);
      expect(result).toBe(1700000000000);
    });

    it('should keep milliseconds unchanged', () => {
      const result = normalizeTimestamp(1700000000000);
      expect(result).toBe(1700000000000);
    });

    it('should handle edge cases', () => {
      expect(normalizeTimestamp(0)).toBe(0);
      expect(normalizeTimestamp(1)).toBe(1000);
    });
  });

  describe('normalizeData', () => {
    const mockRawData: RawData = {
      timestamp: 1700000000,
      prices: {
        SEI: { value: 0.5, decimals: 18 },
        ETH: { value: 2000, decimals: 18 },
        BTC: { value: 40000, decimals: 8 }
      },
      volumes: {
        SEI: '1000000000000000000000',
        ETH: '500000000000000000000',
        BTC: '1000000000'
      },
      metadata: {
        source: 'test',
        version: '1.0'
      }
    };

    it('should normalize raw data successfully', () => {
      const result = normalizeData(mockRawData);

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        const normalized = result.right;
        expect(normalized.timestamp).toBe(1700000000000);
        expect(normalized.prices.SEI).toBe(500000000000000000n);
        expect(normalized.prices.ETH).toBe(2000000000000000000000n);
        expect(normalized.volumes.SEI).toBe(1000n);
      }
    });

    it('should handle missing data gracefully', () => {
      const incompleteData: RawData = {
        timestamp: 1700000000,
        prices: {},
        volumes: {},
        metadata: { source: 'test' }
      };

      const result = normalizeData(incompleteData);

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(Object.keys(result.right.prices).length).toBe(0);
        expect(Object.keys(result.right.volumes).length).toBe(0);
      }
    });

    it('should validate normalized data', () => {
      const invalidData: RawData = {
        timestamp: -1, // Invalid timestamp
        prices: {
          SEI: { value: 0.5, decimals: 18 }
        },
        volumes: {},
        metadata: {}
      };

      const result = normalizeData(invalidData);

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.type).toBe('validation');
      }
    });
  });

  describe('createNormalizer', () => {
    const normalizer = createNormalizer({
      defaultDecimals: 18,
      validateData: true
    });

    it('should create a configured normalizer', () => {
      const rawData: RawData = {
        timestamp: Date.now() / 1000,
        prices: {
          TEST: { value: 100 } // No decimals specified
        },
        volumes: {
          TEST: '1000000000000000000'
        },
        metadata: {}
      };

      const result = normalizer(rawData);

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        // Should use default decimals (18)
        expect(result.right.prices.TEST).toBe(100000000000000000000n);
      }
    });

    it('should handle batch normalization', () => {
      const batchData: RawData[] = [
        {
          timestamp: 1700000000,
          prices: { SEI: { value: 0.5, decimals: 18 } },
          volumes: { SEI: '1000000000000000000' },
          metadata: {}
        },
        {
          timestamp: 1700000400,
          prices: { SEI: { value: 0.6, decimals: 18 } },
          volumes: { SEI: '2000000000000000000' },
          metadata: {}
        }
      ];

      const results = batchData.map(normalizer);
      const allSuccessful = results.every(E.isRight);

      expect(allSuccessful).toBe(true);
      expect(results.length).toBe(2);
    });
  });

  describe('Functional composition', () => {
    it('should compose normalization functions', () => {
      const normalizePipeline = pipe(
        (data: RawData) => E.right(data),
        E.chain(normalizeData),
        E.map(normalized => ({
          ...normalized,
          computed: {
            totalVolume: Object.values(normalized.volumes)
              .reduce((sum, vol) => sum + vol, 0n)
          }
        }))
      );

      const rawData: RawData = {
        timestamp: Date.now() / 1000,
        prices: {
          A: { value: 1, decimals: 6 },
          B: { value: 2, decimals: 6 }
        },
        volumes: {
          A: '1000000',
          B: '2000000'
        },
        metadata: {}
      };

      const result = normalizePipeline(rawData);

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.computed.totalVolume).toBe(3n);
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle extremely large numbers', () => {
      const result = normalizePrice(1e20, 18);
      expect(result).toBe(100000000000000000000000000000000000000n);
    });

    it('should handle very small decimals', () => {
      const result = normalizePrice(0.000001, 18);
      expect(result).toBe(1000000000000n);
    });

    it('should handle mixed decimal formats', () => {
      const rawData: RawData = {
        timestamp: Date.now() / 1000,
        prices: {
          USDT: { value: 1, decimals: 6 },
          WBTC: { value: 40000, decimals: 8 },
          SEI: { value: 0.5, decimals: 18 }
        },
        volumes: {
          USDT: '1000000',
          WBTC: '100000000',
          SEI: '1000000000000000000'
        },
        metadata: {}
      };

      const result = normalizeData(rawData);

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        // All prices should be normalized correctly despite different decimals
        expect(result.right.prices.USDT).toBe(1000000n);
        expect(result.right.prices.WBTC).toBe(4000000000000n);
        expect(result.right.prices.SEI).toBe(500000000000000000n);
      }
    });
  });
});