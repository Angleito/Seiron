# Data Transformers Module

A comprehensive pure functional data transformation pipeline for financial data processing and feature engineering.

## Overview

The Data Transformers module provides a complete set of immutable, composable functions for processing financial time series data. Built with functional programming principles, all transformations are pure functions with no side effects, making them ideal for streaming data processing and ML feature engineering.

## Architecture

```
src/transformers/
├── types.ts          # Core type definitions and Either types
├── utils.ts          # Functional utility functions
├── normalize.ts      # Data normalization functions
├── aggregate.ts      # Time series aggregation functions
├── features.ts       # Feature engineering functions
├── validate.ts       # Data validation functions
├── pipelines.ts      # Composed transformation pipelines
└── index.ts          # Main exports
```

## Core Principles

1. **Pure Functions**: All transformations are pure with no side effects
2. **Immutable Data**: All operations return new data structures
3. **Composable**: Functions can be easily combined using `pipe()` and `compose()`
4. **Type Safe**: Comprehensive TypeScript types with Either types for error handling
5. **Streaming Ready**: Designed for real-time data processing

## Usage Examples

### Basic Normalization

```typescript
import { normalizeToUSD, normalizeVolume, pipe } from './transformers';

const priceData: PriceData[] = [
  { timestamp: 1625097600000, symbol: 'AAPL', price: 150.0, currency: 'USD' },
  { timestamp: 1625097660000, symbol: 'AAPL', price: 127.5, currency: 'EUR' },
];

// Normalize all prices to USD
const normalizedPrices = normalizeToUSD(priceData);

// Chain multiple normalizations
const processedData = pipe(
  normalizeToUSD,
  (data) => normalizeTimeStamps('minute')(data.map(p => ({
    timestamp: p.timestamp,
    value: p.price,
    metadata: { symbol: p.symbol }
  })))
)(priceData);
```

### Time Series Aggregation

```typescript
import { aggregateByPeriod, calculateOHLCV, computeMovingAverage } from './transformers';

const tradeData: TradeData[] = [
  { timestamp: 1625097600000, symbol: 'BTC', price: 50000, volume: 1.5, side: 'buy' },
  { timestamp: 1625097630000, symbol: 'BTC', price: 50100, volume: 0.8, side: 'sell' },
  // ... more trades
];

// Convert trades to OHLCV candles
const ohlcvData = calculateMultiPeriodOHLCV('5m')(tradeData);

// Calculate moving averages
const prices = ohlcvData.map(candle => candle.close);
const sma20 = computeMovingAverage(20)(prices);
const ema12 = computeEMA(12)(prices);
```

### Feature Engineering

```typescript
import { 
  calculateReturns, 
  addTechnicalIndicators, 
  calculateRSI,
  addVolatilityMetrics
} from './transformers';

// Add technical indicators to OHLCV data
const enrichedData = addTechnicalIndicators(ohlcvData);

// Calculate returns and volatility
const prices = ohlcvData.map(d => d.close);
const returns = calculateReturns(prices);
const volatilityMetrics = addVolatilityMetrics(returns);

// Calculate RSI with custom period
const rsi14 = calculateRSI(prices, 14);
```

### Data Validation

```typescript
import { 
  validateDataPoint, 
  validateDataArray, 
  checkTimestamp,
  isLeft 
} from './transformers';

const rawData: RawDataPoint = {
  timestamp: 1625097600000,
  price: 150.0,
  volume: 1000,
  symbol: 'AAPL'
};

// Validate single data point
const validationResult = validateDataPoint(rawData);
if (isLeft(validationResult)) {
  console.error('Validation failed:', validationResult.left);
} else {
  console.log('Valid data:', validationResult.right);
}

// Validate array of data points
const arrayValidation = validateDataArray(validatePriceData)(priceDataArray);
```

### Complete Processing Pipeline

```typescript
import { processPriceDataPipeline, createFeaturesPipeline, pipe } from './transformers';

// Create a complete processing pipeline
const fullPipeline = pipe(
  processPriceDataPipeline({ batchSize: 1000, errorTolerance: 0.05 }),
  (result) => isLeft(result) ? [] : result.right,
  createFeaturesPipeline()
);

// Process raw price data
const enrichedFeatures = fullPipeline(rawPriceData);
```

### Streaming Data Processing

```typescript
import { createStreamingPipeline, addTechnicalIndicators } from './transformers';

// Create streaming processor with 100-item sliding window
const streamProcessor = createStreamingPipeline(
  addTechnicalIndicators,
  100
);

// Process new data as it arrives
const processNewTrades = (newTrades: TradeData[]) => {
  const ohlcvData = calculateMultiPeriodOHLCV('1m')(newTrades);
  return streamProcessor(ohlcvData);
};
```

## Core Functions

### Normalization (`normalize.ts`)

- `normalizeToUSD(prices)` - Convert prices to USD
- `normalizeVolume(volumes)` - Z-score normalization for volumes
- `normalizeTimeStamps(granularity)` - Round timestamps to intervals
- `normalizeRange(min, max)` - Min-max scaling
- `normalizeZScore(values)` - Z-score standardization
- `normalizeRobust(values)` - Median and IQR based normalization

### Aggregation (`aggregate.ts`)

- `aggregateByPeriod(period)` - Group data by time periods
- `calculateOHLCV(trades)` - Convert trades to OHLCV
- `computeMovingAverage(period)` - Simple moving average
- `computeEMA(period)` - Exponential moving average
- `aggregateVolume(timeframe)` - Volume metrics aggregation
- `calculateVWAP(trades)` - Volume-weighted average price

### Features (`features.ts`)

- `calculateReturns(prices)` - Price returns calculation
- `addTechnicalIndicators(ohlcv)` - Add SMA, EMA, RSI, MACD
- `calculateRSI(prices, period)` - Relative Strength Index
- `calculateBollingerBands(period, multiplier)` - Bollinger Bands
- `calculateCorrelations(assets)` - Asset correlation matrix
- `addVolatilityMetrics(returns)` - Volatility measurements

### Validation (`validate.ts`)

- `validateDataPoint(point)` - Single point validation
- `checkTimestamp(timestamp)` - Timestamp validity
- `checkPriceRanges(price)` - Price range validation
- `validateDataArray(validator)` - Array validation
- `checkDataGaps(interval)` - Time series gap detection
- `validateBusinessRules` - Domain-specific validations

## Error Handling

The module uses Either types for functional error handling:

```typescript
type Either<L, R> = Left<L> | Right<R>;

// Check for errors
if (isLeft(result)) {
  console.error('Error:', result.left);
} else {
  console.log('Success:', result.right);
}
```

## Performance Considerations

1. **Batch Processing**: Use `createBatchPipeline()` for large datasets
2. **Streaming**: Use `createStreamingPipeline()` for real-time data
3. **Memory Management**: Functions create new objects, consider data lifecycle
4. **Caching**: Results of expensive calculations can be cached externally

## Configuration

Pipeline configuration options:

```typescript
interface PipelineConfig {
  batchSize: number;        // Items per batch
  errorTolerance: number;   // Acceptable error rate (0-1)
  retryCount: number;       // Retry attempts on failure
}
```

## Testing

All functions are pure and deterministic, making them easy to test:

```typescript
import { normalizeRange } from './transformers';

describe('normalizeRange', () => {
  it('should normalize values to 0-1 range', () => {
    const values = [10, 20, 30, 40, 50];
    const normalized = normalizeRange(0, 1)(values);
    expect(normalized).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });
});
```

## Advanced Usage

### Custom Pipelines

```typescript
import { pipe, curry, map } from './transformers';

// Create custom transformation
const customNormalization = curry((factor: number) =>
  map((value: number) => value * factor)
);

// Compose with existing functions
const customPipeline = pipe(
  normalizeZScore,
  customNormalization(0.5),
  (values) => values.filter(v => Math.abs(v) <= 2)
);
```

### Multi-Timeframe Analysis

```typescript
import { createMultiTimeframePipeline } from './transformers';

const multiTF = createMultiTimeframePipeline(['1m', '5m', '15m', '1h']);
const results = multiTF(tradeData);

// Access different timeframes
console.log('1m candles:', results['1m']);
console.log('1h candles:', results['1h']);
```

### Data Quality Assessment

```typescript
import { createDataQualityPipeline } from './transformers';

const qualityPipeline = createDataQualityPipeline(validatePriceData);
const { clean, errors, quality } = qualityPipeline(rawData);

console.log(`Quality: ${((1 - quality.errorRate) * 100).toFixed(2)}%`);
console.log(`Clean records: ${quality.validRecords}/${quality.totalRecords}`);
```

## Best Practices

1. **Validation First**: Always validate data before processing
2. **Compose Functions**: Use `pipe()` and `compose()` for readability
3. **Handle Errors**: Use Either types for robust error handling
4. **Batch Large Data**: Process large datasets in batches
5. **Monitor Performance**: Use `withPerformanceMonitoring()` for optimization
6. **Type Safety**: Leverage TypeScript for compile-time safety

## Integration

The module integrates seamlessly with:

- **ML Libraries**: Features ready for scikit-learn, TensorFlow
- **Real-time Systems**: Streaming pipelines for live data
- **Data Stores**: Immutable outputs work with any storage
- **Monitoring**: Built-in performance and quality metrics

## Contributing

When adding new transformations:

1. Follow pure functional patterns
2. Add comprehensive TypeScript types  
3. Include validation and error handling
4. Write unit tests
5. Update documentation with examples