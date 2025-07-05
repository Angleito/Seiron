# usePriceFeed Hook Documentation

## Overview

The `usePriceFeed` hook provides a reactive, fault-tolerant price feed system for cryptocurrency assets in the Seiron frontend. It leverages RxJS observables for real-time updates and fp-ts for functional programming patterns, ensuring type safety and composability.

## Features

- **Multi-source price fetching** with automatic fallback (Oracle → CoinGecko → Pyth)
- **Reactive updates** using RxJS observables
- **Intelligent caching** to reduce API calls
- **Automatic deduplication** of identical price updates
- **Configurable polling intervals** and retry strategies
- **Property-based testing** for reliability
- **Full TypeScript support** with comprehensive type definitions

## Installation

The hook requires the following dependencies (already installed):
- `rxjs`: For reactive programming
- `fp-ts`: For functional programming utilities
- `react`: Core React library

## Basic Usage

```typescript
import { usePriceFeed } from '@/hooks/usePriceFeed';

function PriceDisplay() {
  const { prices, loading, error } = usePriceFeed({
    assets: ['SEI', 'BTC', 'ETH'],
    pollInterval: 30000, // 30 seconds
  });

  if (loading) return <div>Loading prices...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {Object.entries(prices).map(([asset, data]) => (
        <div key={asset}>
          {asset}: {data ? `$${data.price.toFixed(2)}` : 'N/A'}
        </div>
      ))}
    </div>
  );
}
```

## API Reference

### `usePriceFeed(config: PriceFeedConfig)`

#### Parameters

```typescript
interface PriceFeedConfig {
  assets: Asset[];           // Array of assets to track ('SEI', 'BTC', 'ETH')
  pollInterval?: number;     // Polling interval in ms (default: 30000)
  cacheTimeout?: number;     // Cache timeout in ms (default: 60000)
  retryAttempts?: number;    // Number of retry attempts (default: 3)
  retryDelay?: number;       // Delay between retries in ms (default: 1000)
}
```

#### Returns

```typescript
interface UsePriceFeedReturn {
  prices: Record<Asset, PriceData | null>;    // Current prices for all assets
  loading: boolean;                           // Loading state
  error: Error | null;                        // Error state
  lastUpdate: number | null;                  // Timestamp of last update
  refresh: () => void;                        // Manual refresh function
  getPriceStream: () => Observable<Record<Asset, PriceData | null>>;
  getAssetPriceStream: (asset: Asset) => Observable<PriceData | null>;
}
```

### Price Data Structure

```typescript
interface PriceData {
  asset: Asset;              // Asset symbol
  price: number;             // Price in USD
  timestamp: number;         // Unix timestamp
  source: PriceSource;       // Data source ('oracle', 'coingecko', 'pyth')
  confidence?: number;       // Price confidence (0-1)
}
```

## Advanced Usage

### Using Price Streams

```typescript
function PriceMonitor() {
  const { getAssetPriceStream } = usePriceFeed({
    assets: ['SEI'],
    pollInterval: 5000,
  });

  useEffect(() => {
    const subscription = getAssetPriceStream('SEI')
      .pipe(
        filter(data => data !== null),
        map(data => data!.price),
        distinctUntilChanged()
      )
      .subscribe(price => {
        console.log('SEI price updated:', price);
      });

    return () => subscription.unsubscribe();
  }, [getAssetPriceStream]);

  return <div>Monitoring SEI price...</div>;
}
```

### Manual Refresh

```typescript
function RefreshablePrices() {
  const { prices, refresh, loading } = usePriceFeed({
    assets: ['BTC', 'ETH'],
  });

  return (
    <div>
      <button onClick={refresh} disabled={loading}>
        Refresh Prices
      </button>
      {/* Price display */}
    </div>
  );
}
```

### Error Handling with Fallbacks

The hook automatically handles errors and falls back to alternative data sources:

1. **Primary**: Oracle API (`/api/oracle/prices`)
2. **Secondary**: CoinGecko API
3. **Tertiary**: Pyth Network

Each source is tried in order until successful data is retrieved.

## Performance Considerations

1. **Caching**: Prices are cached for the configured timeout to reduce API calls
2. **Deduplication**: Identical price updates are filtered out to prevent unnecessary re-renders
3. **Shared Observables**: Price streams are shared across subscribers for efficiency
4. **Batch Updates**: Multiple price updates are batched with a 100ms debounce

## Testing

The hook includes comprehensive property-based tests using fast-check:

```bash
npm test -- usePriceFeed.test.ts
```

Key test properties:
- Prices are always non-negative
- State structure is always valid
- Cache prevents redundant API calls
- Fallback mechanism works correctly
- Price updates are deduplicated

## Best Practices

1. **Asset Selection**: Only request assets you need to minimize API calls
2. **Polling Interval**: Use longer intervals (30s+) for production to respect rate limits
3. **Error Handling**: Always handle the error state in your UI
4. **Cleanup**: The hook automatically cleans up subscriptions, but ensure parent components unmount properly
5. **Price Formatting**: Use the provided `formatPrice` helper for consistent display

## Helper Functions

### `formatPrice(price: number): string`
Formats a price value as USD currency with appropriate decimal places.

### `getPriceChange(current: number, previous: number): number`
Calculates the percentage change between two prices.

### `isPriceData(value: unknown): value is PriceData`
Type guard to validate price data objects.

## Integration with Sei Oracle

The hook is designed to work seamlessly with the Sei blockchain oracle system. When the Oracle API is available, it provides:
- High-frequency price updates
- On-chain price verification
- Confidence scores for price accuracy

## Troubleshooting

### Prices not updating
- Check network connectivity
- Verify API endpoints are accessible
- Ensure polling interval is not too long

### High API usage
- Increase cache timeout
- Reduce polling frequency
- Limit number of tracked assets

### Type errors
- Ensure all assets are valid: 'SEI', 'BTC', or 'ETH'
- Import types from `@/types/price-feed`