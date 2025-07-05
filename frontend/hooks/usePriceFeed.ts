import { useEffect, useRef, useState, useCallback } from 'react';
import { Observable, Subject, BehaviorSubject, merge, interval, throwError, of, timer } from 'rxjs';
import { 
  switchMap, 
  map, 
  catchError, 
  retry, 
  distinctUntilChanged, 
  shareReplay,
  takeUntil,
  tap,
  filter,
  debounceTime,
  startWith
} from 'rxjs/operators';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import * as A from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';
import { isDeepStrictEqual } from 'util';

// Types
export type Asset = 'SEI' | 'BTC' | 'ETH';

export interface PriceData {
  asset: Asset;
  price: number;
  timestamp: number;
  source: 'oracle' | 'coingecko' | 'pyth';
  confidence?: number;
}

export interface PriceFeedState {
  prices: Record<Asset, PriceData | null>;
  loading: boolean;
  error: Error | null;
  lastUpdate: number | null;
}

export interface PriceFeedConfig {
  assets: Asset[];
  pollInterval?: number; // milliseconds, default 30000 (30 seconds)
  cacheTimeout?: number; // milliseconds, default 60000 (1 minute)
  retryAttempts?: number; // default 3
  retryDelay?: number; // milliseconds, default 1000
}

// Price cache implementation
class PriceCache {
  private cache = new Map<Asset, { data: PriceData; expiry: number }>();
  
  constructor(private timeout: number) {}
  
  get(asset: Asset): O.Option<PriceData> {
    const cached = this.cache.get(asset);
    if (!cached) return O.none;
    
    if (Date.now() > cached.expiry) {
      this.cache.delete(asset);
      return O.none;
    }
    
    return O.some(cached.data);
  }
  
  set(data: PriceData): void {
    this.cache.set(data.asset, {
      data,
      expiry: Date.now() + this.timeout
    });
  }
  
  clear(): void {
    this.cache.clear();
  }
}

// API clients
const fetchOraclePrice = (asset: Asset): TE.TaskEither<Error, PriceData> =>
  TE.tryCatch(
    async () => {
      const response = await fetch(`/api/oracle/prices?asset=${asset}`);
      if (!response.ok) {
        throw new Error(`Oracle API error: ${response.status}`);
      }
      const data = await response.json();
      return {
        asset,
        price: data.price,
        timestamp: Date.now(),
        source: 'oracle' as const,
        confidence: data.confidence
      };
    },
    (error) => new Error(`Oracle fetch failed: ${String(error)}`)
  );

const fetchCoinGeckoPrice = (asset: Asset): TE.TaskEither<Error, PriceData> =>
  TE.tryCatch(
    async () => {
      const coinIds: Record<Asset, string> = {
        SEI: 'sei-network',
        BTC: 'bitcoin',
        ETH: 'ethereum'
      };
      
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds[asset]}&vs_currencies=usd`
      );
      
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }
      
      const data = await response.json();
      const price = data[coinIds[asset]]?.usd;
      
      if (!price) {
        throw new Error(`No price data for ${asset}`);
      }
      
      return {
        asset,
        price,
        timestamp: Date.now(),
        source: 'coingecko' as const
      };
    },
    (error) => new Error(`CoinGecko fetch failed: ${String(error)}`)
  );

const fetchPythPrice = (asset: Asset): TE.TaskEither<Error, PriceData> =>
  TE.tryCatch(
    async () => {
      // Pyth price feed IDs (these are examples, real ones would be different)
      const pythIds: Record<Asset, string> = {
        SEI: '0x1234...', // Example ID
        BTC: '0x5678...', // Example ID
        ETH: '0x9abc...'  // Example ID
      };
      
      // This is a mock implementation. Real implementation would use Pyth SDK
      const mockPrice = Math.random() * 50000 + 1000; // Random price for demo
      
      return {
        asset,
        price: mockPrice,
        timestamp: Date.now(),
        source: 'pyth' as const,
        confidence: 0.99
      };
    },
    (error) => new Error(`Pyth fetch failed: ${String(error)}`)
  );

// Fallback chain with fp-ts
const fetchPriceWithFallback = (asset: Asset): TE.TaskEither<Error, PriceData> =>
  pipe(
    fetchOraclePrice(asset),
    TE.orElse(() => fetchCoinGeckoPrice(asset)),
    TE.orElse(() => fetchPythPrice(asset))
  );

// Main hook
export function usePriceFeed(config: PriceFeedConfig) {
  const {
    assets,
    pollInterval = 30000,
    cacheTimeout = 60000,
    retryAttempts = 3,
    retryDelay = 1000
  } = config;
  
  const [state, setState] = useState<PriceFeedState>({
    prices: assets.reduce((acc, asset) => ({ ...acc, [asset]: null }), {} as Record<Asset, PriceData | null>),
    loading: true,
    error: null,
    lastUpdate: null
  });
  
  const cache = useRef(new PriceCache(cacheTimeout));
  const destroy$ = useRef(new Subject<void>());
  const priceSubject$ = useRef(new BehaviorSubject<Record<Asset, PriceData | null>>(state.prices));
  
  // Create price observable for each asset
  const createPriceObservable = useCallback((asset: Asset): Observable<PriceData> => {
    return interval(pollInterval).pipe(
      startWith(0), // Start immediately
      switchMap(() => {
        // Check cache first
        const cached = cache.current.get(asset);
        if (O.isSome(cached)) {
          return of(cached.value);
        }
        
        // Fetch with fallback
        return fetchPriceWithFallback(asset)().then(
          E.fold(
            (error) => throwError(() => error),
            (data) => {
              cache.current.set(data);
              return of(data);
            }
          )
        );
      }),
      retry({
        count: retryAttempts,
        delay: retryDelay,
        resetOnSuccess: true
      }),
      distinctUntilChanged((a, b) => 
        a.price === b.price && 
        a.timestamp === b.timestamp &&
        a.source === b.source
      ),
      catchError((error) => {
        console.error(`Price feed error for ${asset}:`, error);
        return of<PriceData>({
          asset,
          price: 0,
          timestamp: Date.now(),
          source: 'oracle' as const
        });
      })
    );
  }, [pollInterval, retryAttempts, retryDelay]);
  
  useEffect(() => {
    const destroy = destroy$.current;
    setState(prev => ({ ...prev, loading: true }));
    
    // Create observables for all assets
    const priceObservables = assets.map(asset => 
      createPriceObservable(asset).pipe(
        map(data => ({ [asset]: data }))
      )
    );
    
    // Merge all price observables
    const allPrices$ = merge(...priceObservables).pipe(
      scan((acc, update) => ({ ...acc, ...update }), {} as Record<Asset, PriceData>),
      debounceTime(100), // Batch updates
      distinctUntilChanged(isDeepStrictEqual),
      tap(prices => {
        priceSubject$.current.next(prices);
      }),
      shareReplay(1),
      takeUntil(destroy)
    );
    
    // Subscribe to updates
    const subscription = allPrices$.subscribe({
      next: (prices) => {
        setState({
          prices: prices as Record<Asset, PriceData | null>,
          loading: false,
          error: null,
          lastUpdate: Date.now()
        });
      },
      error: (error) => {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error : new Error('Unknown error'),
          lastUpdate: Date.now()
        }));
      }
    });
    
    return () => {
      subscription.unsubscribe();
      destroy.next();
      destroy.complete();
      cache.current.clear();
    };
  }, [assets, createPriceObservable]);
  
  // Manual refresh function
  const refresh = useCallback(() => {
    cache.current.clear();
    destroy$.current.next();
    destroy$.current = new Subject<void>();
    
    // Re-trigger the effect by updating a dependency
    setState(prev => ({ ...prev, loading: true }));
  }, []);
  
  // Get price stream as observable
  const getPriceStream = useCallback((): Observable<Record<Asset, PriceData | null>> => {
    return priceSubject$.current.asObservable();
  }, []);
  
  // Get single asset price stream
  const getAssetPriceStream = useCallback((asset: Asset): Observable<PriceData | null> => {
    return priceSubject$.current.pipe(
      map(prices => prices[asset] || null),
      distinctUntilChanged()
    );
  }, []);
  
  return {
    ...state,
    refresh,
    getPriceStream,
    getAssetPriceStream
  };
}

// Helper function to format price
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  }).format(price);
};

// Helper to get price change percentage
export const getPriceChange = (current: number, previous: number): number => {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

// Type guards
export const isPriceData = (value: unknown): value is PriceData => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'asset' in value &&
    'price' in value &&
    'timestamp' in value &&
    'source' in value
  );
};

function scan<T, R>(
  accumulator: (acc: R, value: T) => R, 
  seed: R
): (source: Observable<T>) => Observable<R> {
  return (source: Observable<T>) => 
    new Observable<R>(subscriber => {
      let acc = seed;
      return source.subscribe({
        next(value) {
          try {
            acc = accumulator(acc, value);
            subscriber.next(acc);
          } catch (err) {
            subscriber.error(err);
          }
        },
        error(err) { subscriber.error(err); },
        complete() { subscriber.complete(); }
      });
    });
}