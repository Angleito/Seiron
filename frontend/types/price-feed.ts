import { Observable } from 'rxjs';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';

// Core types
export type Asset = 'SEI' | 'BTC' | 'ETH';

export type PriceSource = 'oracle' | 'coingecko' | 'pyth';

export interface PriceData {
  asset: Asset;
  price: number;
  timestamp: number;
  source: PriceSource;
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
  pollInterval?: number;
  cacheTimeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

// Hook return type
export interface UsePriceFeedReturn extends PriceFeedState {
  refresh: () => void;
  getPriceStream: () => Observable<Record<Asset, PriceData | null>>;
  getAssetPriceStream: (asset: Asset) => Observable<PriceData | null>;
}

// API response types
export interface OracleResponse {
  price: number;
  confidence?: number;
  timestamp?: number;
}

export interface CoinGeckoResponse {
  [coinId: string]: {
    usd: number;
    usd_24h_change?: number;
    usd_market_cap?: number;
    usd_24h_vol?: number;
  };
}

export interface PythResponse {
  price: number;
  confidence: number;
  expo: number;
  timestamp: number;
}

// Error types
export class PriceFeedError extends Error {
  constructor(
    message: string,
    public source: PriceSource,
    public asset: Asset,
    public cause?: Error
  ) {
    super(message);
    this.name = 'PriceFeedError';
  }
}

// Functional types
export type PriceFetcher = (asset: Asset) => TE.TaskEither<PriceFeedError, PriceData>;

export type PriceValidator = (data: unknown) => E.Either<Error, PriceData>;

export type PriceTransformer = (data: PriceData) => PriceData;

// Cache types
export interface CacheEntry<T> {
  data: T;
  expiry: number;
}

export interface PriceCache {
  get(asset: Asset): O.Option<PriceData>;
  set(data: PriceData): void;
  clear(): void;
}

// Utility types
export type PriceHistory = {
  asset: Asset;
  prices: Array<{
    price: number;
    timestamp: number;
    source: PriceSource;
  }>;
};

export type PriceAggregation = {
  asset: Asset;
  average: number;
  median: number;
  min: number;
  max: number;
  sources: PriceSource[];
  timestamp: number;
};

// Type guards
export const isAsset = (value: unknown): value is Asset => {
  return typeof value === 'string' && ['SEI', 'BTC', 'ETH'].includes(value);
};

export const isPriceSource = (value: unknown): value is PriceSource => {
  return typeof value === 'string' && ['oracle', 'coingecko', 'pyth'].includes(value);
};

export const isPriceData = (value: unknown): value is PriceData => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'asset' in value &&
    'price' in value &&
    'timestamp' in value &&
    'source' in value &&
    isAsset((value as any).asset) &&
    typeof (value as any).price === 'number' &&
    typeof (value as any).timestamp === 'number' &&
    isPriceSource((value as any).source)
  );
};

// Constants
export const ASSET_DECIMALS: Record<Asset, number> = {
  SEI: 6,
  BTC: 8,
  ETH: 18
};

export const COINGECKO_IDS: Record<Asset, string> = {
  SEI: 'sei-network',
  BTC: 'bitcoin',
  ETH: 'ethereum'
};

export const PYTH_PRICE_IDS: Record<Asset, string> = {
  SEI: '0x1234567890abcdef', // Example, replace with real IDs
  BTC: '0xfedcba0987654321',
  ETH: '0xabcdef1234567890'
};