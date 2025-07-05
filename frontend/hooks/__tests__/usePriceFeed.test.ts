import { renderHook, act, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import { Observable, of, throwError } from 'rxjs';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { usePriceFeed, Asset, PriceData, formatPrice, getPriceChange, isPriceData } from '../usePriceFeed';

// Mock fetch
global.fetch = jest.fn();

// Mock modules
jest.mock('rxjs', () => ({
  ...jest.requireActual('rxjs'),
  interval: jest.fn(() => of(0))
}));

describe('usePriceFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Property-based tests', () => {
    // Property: The hook should always return a valid state structure
    it('should always return valid state structure', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom('SEI', 'BTC', 'ETH') as fc.Arbitrary<Asset>, { minLength: 1, maxLength: 3 }),
          fc.nat({ max: 60000 }),
          fc.nat({ max: 120000 }),
          (assets, pollInterval, cacheTimeout) => {
            const { result } = renderHook(() =>
              usePriceFeed({
                assets,
                pollInterval,
                cacheTimeout
              })
            );

            // Check state structure
            expect(result.current).toHaveProperty('prices');
            expect(result.current).toHaveProperty('loading');
            expect(result.current).toHaveProperty('error');
            expect(result.current).toHaveProperty('lastUpdate');
            expect(result.current).toHaveProperty('refresh');
            expect(result.current).toHaveProperty('getPriceStream');
            expect(result.current).toHaveProperty('getAssetPriceStream');

            // Check types
            expect(typeof result.current.loading).toBe('boolean');
            expect(typeof result.current.refresh).toBe('function');
            expect(typeof result.current.getPriceStream).toBe('function');
            expect(typeof result.current.getAssetPriceStream).toBe('function');

            // Check prices object has all requested assets
            assets.forEach(asset => {
              expect(asset in result.current.prices).toBe(true);
            });
          }
        )
      );
    });

    // Property: Prices should always be non-negative when fetched successfully
    it('should never return negative prices', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.constantFrom('SEI', 'BTC', 'ETH') as fc.Arbitrary<Asset>, { minLength: 1 }),
          fc.array(fc.float({ min: 0, max: 100000, noNaN: true }), { minLength: 1 }),
          async (assets, prices) => {
            // Mock successful oracle response
            (global.fetch as jest.Mock).mockImplementation((url: string) => {
              const assetMatch = url.match(/asset=(\w+)/);
              const asset = assetMatch?.[1];
              const assetIndex = assets.indexOf(asset as Asset);
              const price = prices[assetIndex % prices.length];

              return Promise.resolve({
                ok: true,
                json: async () => ({ price, confidence: 0.99 })
              });
            });

            const { result } = renderHook(() =>
              usePriceFeed({ assets, pollInterval: 100 })
            );

            await waitFor(() => {
              expect(result.current.loading).toBe(false);
            }, { timeout: 5000 });

            // Check all prices are non-negative
            Object.values(result.current.prices).forEach(priceData => {
              if (priceData !== null) {
                expect(priceData.price).toBeGreaterThanOrEqual(0);
              }
            });
          }
        ),
        { timeout: 10000 }
      );
    });

    // Property: Cache should prevent redundant API calls
    it('should use cache for subsequent calls within timeout', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('SEI', 'BTC', 'ETH') as fc.Arbitrary<Asset>,
          fc.float({ min: 1, max: 100000, noNaN: true }),
          fc.nat({ min: 1000, max: 5000 }),
          async (asset, price, cacheTimeout) => {
            let fetchCount = 0;
            
            (global.fetch as jest.Mock).mockImplementation(() => {
              fetchCount++;
              return Promise.resolve({
                ok: true,
                json: async () => ({ price, confidence: 0.99 })
              });
            });

            const { result, rerender } = renderHook(() =>
              usePriceFeed({ 
                assets: [asset], 
                pollInterval: 100,
                cacheTimeout 
              })
            );

            await waitFor(() => {
              expect(result.current.loading).toBe(false);
            });

            const initialFetchCount = fetchCount;

            // Trigger immediate re-fetch
            act(() => {
              result.current.refresh();
            });

            // Should use cache, not fetch again immediately
            expect(fetchCount).toBe(initialFetchCount);
          }
        )
      );
    });

    // Property: Fallback mechanism should work when primary source fails
    it('should fallback to alternative sources on failure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('SEI', 'BTC', 'ETH') as fc.Arbitrary<Asset>,
          fc.boolean(),
          fc.boolean(),
          async (asset, oracleFails, coingeckoFails) => {
            let oracleCalled = false;
            let coingeckoCalled = false;

            (global.fetch as jest.Mock).mockImplementation((url: string) => {
              if (url.includes('/api/oracle/')) {
                oracleCalled = true;
                if (oracleFails) {
                  return Promise.resolve({ ok: false, status: 500 });
                }
                return Promise.resolve({
                  ok: true,
                  json: async () => ({ price: 100, confidence: 0.99 })
                });
              }
              
              if (url.includes('coingecko.com')) {
                coingeckoCalled = true;
                if (coingeckoFails) {
                  return Promise.resolve({ ok: false, status: 500 });
                }
                const coinData: Record<string, { usd: number }> = {
                  'sei-network': { usd: 200 },
                  'bitcoin': { usd: 50000 },
                  'ethereum': { usd: 3000 }
                };
                return Promise.resolve({
                  ok: true,
                  json: async () => coinData
                });
              }

              return Promise.reject(new Error('Unknown URL'));
            });

            const { result } = renderHook(() =>
              usePriceFeed({ assets: [asset], pollInterval: 100 })
            );

            await waitFor(() => {
              expect(result.current.loading).toBe(false);
            }, { timeout: 5000 });

            expect(oracleCalled).toBe(true);
            
            if (oracleFails) {
              expect(coingeckoCalled).toBe(true);
            }

            // Should have a price regardless of failures (due to Pyth fallback)
            expect(result.current.prices[asset]).not.toBeNull();
            if (result.current.prices[asset]) {
              expect(result.current.prices[asset]!.price).toBeGreaterThan(0);
            }
          }
        )
      );
    });

    // Property: Price updates should be deduplicated
    it('should deduplicate identical price updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('SEI', 'BTC', 'ETH') as fc.Arbitrary<Asset>,
          fc.float({ min: 1, max: 100000, noNaN: true }),
          fc.nat({ min: 3, max: 10 }),
          async (asset, price, updateCount) => {
            let emissionCount = 0;
            
            (global.fetch as jest.Mock).mockImplementation(() => {
              return Promise.resolve({
                ok: true,
                json: async () => ({ price, confidence: 0.99 })
              });
            });

            const { result } = renderHook(() =>
              usePriceFeed({ assets: [asset], pollInterval: 50 })
            );

            // Subscribe to price stream
            const subscription = result.current.getAssetPriceStream(asset).subscribe(() => {
              emissionCount++;
            });

            await waitFor(() => {
              expect(result.current.loading).toBe(false);
            });

            // Wait for potential duplicate updates
            await new Promise(resolve => setTimeout(resolve, 300));

            // Should only emit once for identical prices
            expect(emissionCount).toBeLessThan(updateCount);

            subscription.unsubscribe();
          }
        )
      );
    });
  });

  describe('Unit tests', () => {
    it('should handle multiple assets simultaneously', async () => {
      const assets: Asset[] = ['SEI', 'BTC', 'ETH'];
      const prices = { SEI: 1.5, BTC: 50000, ETH: 3000 };

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        const assetMatch = url.match(/asset=(\w+)/);
        const asset = assetMatch?.[1] as Asset;
        
        return Promise.resolve({
          ok: true,
          json: async () => ({ price: prices[asset], confidence: 0.99 })
        });
      });

      const { result } = renderHook(() =>
        usePriceFeed({ assets, pollInterval: 100 })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      assets.forEach(asset => {
        expect(result.current.prices[asset]).not.toBeNull();
        expect(result.current.prices[asset]?.price).toBe(prices[asset]);
        expect(result.current.prices[asset]?.source).toBe('oracle');
      });
    });

    it('should handle errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        usePriceFeed({ 
          assets: ['SEI'], 
          pollInterval: 100,
          retryAttempts: 1,
          retryDelay: 50
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 5000 });

      // Should have attempted fallbacks and eventually set a price (even if 0)
      expect(result.current.prices.SEI).not.toBeNull();
    });

    it('should refresh prices on demand', async () => {
      let callCount = 0;
      
      (global.fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ok: true,
          json: async () => ({ price: 100 * callCount, confidence: 0.99 })
        });
      });

      const { result } = renderHook(() =>
        usePriceFeed({ 
          assets: ['SEI'], 
          pollInterval: 10000,
          cacheTimeout: 0 // Disable cache for this test
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const firstPrice = result.current.prices.SEI?.price;

      act(() => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.prices.SEI?.price).not.toBe(firstPrice);
      });

      expect(callCount).toBeGreaterThan(1);
    });
  });

  describe('Helper functions', () => {
    describe('formatPrice', () => {
      it('should format prices correctly', () => {
        fc.assert(
          fc.property(
            fc.float({ min: 0, max: 1000000, noNaN: true }),
            (price) => {
              const formatted = formatPrice(price);
              expect(formatted).toMatch(/^\$[\d,]+(\.\d{2,6})?$/);
              expect(formatted).toContain('$');
            }
          )
        );
      });
    });

    describe('getPriceChange', () => {
      it('should calculate price changes correctly', () => {
        fc.assert(
          fc.property(
            fc.float({ min: 0.01, max: 100000, noNaN: true }),
            fc.float({ min: 0.01, max: 100000, noNaN: true }),
            (current, previous) => {
              const change = getPriceChange(current, previous);
              const expected = ((current - previous) / previous) * 100;
              expect(change).toBeCloseTo(expected, 10);
            }
          )
        );
      });

      it('should handle zero previous price', () => {
        expect(getPriceChange(100, 0)).toBe(0);
      });
    });

    describe('isPriceData', () => {
      it('should validate price data correctly', () => {
        const validPriceData: PriceData = {
          asset: 'SEI',
          price: 100,
          timestamp: Date.now(),
          source: 'oracle'
        };

        expect(isPriceData(validPriceData)).toBe(true);
        expect(isPriceData({})).toBe(false);
        expect(isPriceData(null)).toBe(false);
        expect(isPriceData({ asset: 'SEI' })).toBe(false);
        expect(isPriceData({ ...validPriceData, price: undefined })).toBe(false);
      });
    });
  });

  describe('Observable streams', () => {
    it('should provide price stream for all assets', async () => {
      const assets: Asset[] = ['SEI', 'BTC'];
      const emissions: any[] = [];

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        const assetMatch = url.match(/asset=(\w+)/);
        const asset = assetMatch?.[1];
        const prices = { SEI: 1.5, BTC: 50000 };
        
        return Promise.resolve({
          ok: true,
          json: async () => ({ price: prices[asset as Asset], confidence: 0.99 })
        });
      });

      const { result } = renderHook(() =>
        usePriceFeed({ assets, pollInterval: 100 })
      );

      const subscription = result.current.getPriceStream().subscribe(prices => {
        emissions.push(prices);
      });

      await waitFor(() => {
        expect(emissions.length).toBeGreaterThan(0);
      });

      expect(emissions[emissions.length - 1]).toHaveProperty('SEI');
      expect(emissions[emissions.length - 1]).toHaveProperty('BTC');

      subscription.unsubscribe();
    });

    it('should provide individual asset price stream', async () => {
      const asset: Asset = 'ETH';
      const emissions: any[] = [];

      (global.fetch as jest.Mock).mockImplementation(() => {
        return Promise.resolve({
          ok: true,
          json: async () => ({ price: 3000, confidence: 0.99 })
        });
      });

      const { result } = renderHook(() =>
        usePriceFeed({ assets: [asset], pollInterval: 100 })
      );

      const subscription = result.current.getAssetPriceStream(asset).subscribe(priceData => {
        if (priceData) emissions.push(priceData);
      });

      await waitFor(() => {
        expect(emissions.length).toBeGreaterThan(0);
      });

      expect(emissions[0]).toHaveProperty('asset', asset);
      expect(emissions[0]).toHaveProperty('price', 3000);

      subscription.unsubscribe();
    });
  });
});