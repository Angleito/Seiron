# Utility Functions Library

A comprehensive collection of pure functional utilities for Sei blockchain operations, time series processing, and mathematical computations designed to support the entire data collection and analysis system.

## 🚀 Overview

This library provides three main utility modules:

- **`sei.ts`** - Sei blockchain-specific operations
- **`time.ts`** - Time series processing and temporal data manipulation
- **`math.ts`** - Mathematical operations for financial calculations

All utilities follow functional programming principles with pure functions, immutable data structures, and comprehensive error handling using Either types.

## 📦 Installation & Usage

```typescript
// Import specific utilities
import { formatSeiAddress, calculateGasCost } from './utils/sei';
import { aggregateByTimeframe, synchronizeTimestamps } from './utils/time';
import { calculateReturns, calculateSharpeRatio } from './utils/math';

// Import entire modules
import SeiUtils from './utils/sei';
import TimeUtils from './utils/time';
import MathUtils from './utils/math';

// Import everything
import { Utils, CommonUtils } from './utils';
```

## 🔗 Sei Blockchain Utilities

### Core Functions

#### `formatSeiAddress(address: string)`
Validates and formats Sei blockchain addresses with comprehensive validation.

```typescript
const result = formatSeiAddress('sei1abc123...');
if (isRight(result)) {
  console.log('Valid address:', result.right.address);
} else {
  console.error('Invalid address:', result.left.message);
}
```

#### `calculateGasCost(gasUsed: number, gasPrice: number)`
Calculates transaction gas costs using BigNumber for precision.

```typescript
const gasCost = calculateGasCost(21000, 0.02);
console.log('Gas cost:', gasCost.toString());
```

#### `validateSeiTransaction(tx: Transaction)`
Validates transaction objects for completeness and correctness.

```typescript
const isValid = validateSeiTransaction({
  hash: '0x123...',
  blockHeight: 1000,
  timestamp: Date.now(),
  gasUsed: 21000,
  gasPrice: 0.02,
  success: true,
  events: []
});
```

### Network Operations

#### `connectToSei(config: SeiConfig)`
Creates a connection to the Sei network with error handling.

```typescript
const config = createDefaultSeiConfig({
  rpcUrl: 'https://rpc.sei-apis.com',
  chainId: 'pacific-1'
});

const connectionResult = await connectToSei(config);
if (isRight(connectionResult)) {
  const client = connectionResult.right;
  console.log('Connected to block height:', client.blockHeight);
}
```

### Functional Composition

```typescript
// Compose address validation with transaction creation
const processTransaction = composeEither(
  formatSeiAddress,
  (address) => createTransaction(address)
);

// Curried gas calculation
const calculateWithDefaultGas = calculateGasCostCurried(0.02);
const cost = calculateWithDefaultGas(21000);
```

## ⏰ Time Series Utilities

### Core Functions

#### `parseTimestamp(timestamp: number)`
Converts Unix timestamps to Date objects with auto-detection of seconds/milliseconds.

```typescript
const date = parseTimestamp(1640995200); // Auto-detects format
console.log(date.toISOString());
```

#### `formatTimeRange(start: Date, end: Date)`
Creates validated time range objects.

```typescript
const rangeResult = formatTimeRange(
  new Date('2024-01-01'),
  new Date('2024-12-31')
);

if (isRight(rangeResult)) {
  const range = rangeResult.right;
  console.log('Duration:', range.duration, 'ms');
}
```

#### `aggregateByTimeframe(timeframe: Timeframe)`
Aggregates timestamped data into OHLCV format by timeframe.

```typescript
const aggregateHourly = aggregateByTimeframe('1h');
const hourlyData = aggregateHourly(tickData);

// Each result contains: timestamp, open, high, low, close, volume, count
```

### Time Synchronization

#### `synchronizeTimestamps(datasets: TimestampedData[][])`
Aligns multiple time series datasets to common timestamps.

```typescript
const [priceData, volumeData, indicatorData] = synchronizeTimestamps([
  priceTimeSeries,
  volumeTimeSeries,
  indicatorTimeSeries
]);

// All datasets now have aligned timestamps
```

#### `fillTimeSeriesGaps(data: TimestampedData[], timeframe: Timeframe)`
Fills missing data points in time series.

```typescript
const filledData = fillTimeSeriesGaps(sparseData, '1h');
// Gaps are filled with forward-fill interpolation
```

### Advanced Time Operations

```typescript
// Generate time intervals
const intervals = generateTimeIntervals(
  new Date('2024-01-01'),
  new Date('2024-01-31'),
  '1d'
);

// Resample data to different frequency
const dailyData = resampleTimeSeries(hourlyData, '1d');

// Compose time transformations
const processTimeSeries = composeTimeSeriesTransforms(
  (data) => fillTimeSeriesGaps(data, '1h'),
  (data) => resampleTimeSeries(data, '1d'),
  aggregateByTimeframeCurried('1w')
);
```

## 🧮 Mathematical Utilities

### Statistical Functions

#### `calculateReturns(prices: number[])`
Computes returns from price series.

```typescript
const returnsResult = calculateReturns([100, 105, 102, 108]);
if (isRight(returnsResult)) {
  const returns = returnsResult.right;
  console.log('Returns:', returns); // [0.05, -0.0286, 0.0588]
}
```

#### `calculateVolatility(returns: number[], periodsPerYear: number)`
Calculates annualized volatility.

```typescript
const volResult = calculateVolatility(returns, 252);
if (isRight(volResult)) {
  console.log('Annual volatility:', volResult.right);
}
```

#### `calculateSharpeRatio(returns: number[], riskFreeRate: number)`
Computes risk-adjusted returns.

```typescript
const sharpeResult = calculateSharpeRatio(returns, 0.02, 252);
if (isRight(sharpeResult)) {
  console.log('Sharpe ratio:', sharpeResult.right);
}
```

### Technical Indicators

#### `calculateMovingAverage(period: number)`
Simple Moving Average with functional composition.

```typescript
const sma20 = calculateMovingAverage(20);
const ma20Result = sma20(prices);
```

#### `calculateEMA(period: number)`
Exponential Moving Average.

```typescript
const ema12 = calculateEMA(12);
const ema12Result = ema12(prices);
```

#### `calculateRSI(prices: number[], period: number)`
Relative Strength Index.

```typescript
const rsiResult = calculateRSI(prices, 14);
if (isRight(rsiResult)) {
  const rsi = rsiResult.right;
  // RSI values from 0-100
}
```

#### `calculateMACD(prices: number[], fast: number, slow: number, signal: number)`
Moving Average Convergence Divergence.

```typescript
const macdResult = calculateMACD(prices, 12, 26, 9);
if (isRight(macdResult)) {
  const { line, signal, histogram } = macdResult.right;
}
```

### Risk Calculations

#### `calculateCorrelation(x: number[], y: number[])`
Pearson correlation coefficient.

```typescript
const corrResult = calculateCorrelation(stockReturns, marketReturns);
if (isRight(corrResult)) {
  console.log('Correlation:', corrResult.right);
}
```

#### `calculateMaxDrawdown(values: number[])`
Maximum portfolio drawdown.

```typescript
const drawdownResult = calculateMaxDrawdown(portfolioValues);
if (isRight(drawdownResult)) {
  console.log('Max drawdown:', drawdownResult.right);
}
```

### Data Normalization

#### `normalizeValues(values: number[])`
Min-max normalization to 0-1 range.

```typescript
const normalizedResult = normalizeValues(prices);
if (isRight(normalizedResult)) {
  const normalized = normalizedResult.right;
  // All values scaled to 0-1 range
}
```

#### `standardizeValues(values: number[])`
Z-score standardization.

```typescript
const standardizedResult = standardizeValues(returns);
if (isRight(standardizedResult)) {
  const standardized = standardizedResult.right;
  // Mean = 0, std = 1
}
```

## 🔧 Functional Programming Features

### Curried Functions

All major functions have curried versions for partial application:

```typescript
// Traditional usage
const ma20 = calculateMovingAverage(20)(prices);

// Curried usage
const ma20Calculator = calculateMovingAverageCurried(20);
const ma20 = ma20Calculator(prices);

// Partial application
const calculateDailyVol = calculateVolatilityCurried(252);
const vol = calculateDailyVol(returns);
```

### Function Composition

```typescript
// Compose mathematical operations
const analyzeReturns = composeMath(
  calculateReturns,
  calculateVolatilityCurried(252)
);

// Pipeline processing
const processData = pipeline(
  (prices: number[]) => calculateReturns(prices),
  (returns) => normalizeValues(returns),
  (normalized) => calculateMovingAverage(20)(normalized)
);
```

### Error Handling with Either Types

```typescript
// Chain operations with error propagation
const result = chainEither(
  formatSeiAddress(address),
  (validAddress) => validateTransaction(validAddress)
);

// Map over successful results
const mappedResult = mapRight(
  calculateReturns(prices),
  (returns) => returns.map(r => r * 100) // Convert to percentages
);
```

## 📊 Usage Examples

### Portfolio Analysis

```typescript
async function analyzePortfolio(prices: number[]) {
  // Calculate returns
  const returnsResult = calculateReturns(prices);
  if (isLeft(returnsResult)) return returnsResult;
  
  const returns = returnsResult.right;
  
  // Calculate metrics
  const volResult = calculateVolatility(returns, 252);
  const sharpeResult = calculateSharpeRatio(returns, 0.02, 252);
  const drawdownResult = calculateMaxDrawdown(prices);
  
  if (isLeft(volResult) || isLeft(sharpeResult) || isLeft(drawdownResult)) {
    return left({ type: 'CALCULATION_ERROR', message: 'Failed to calculate metrics' });
  }
  
  return right({
    volatility: volResult.right,
    sharpeRatio: sharpeResult.right,
    maxDrawdown: drawdownResult.right
  });
}
```

### Multi-Asset Data Processing

```typescript
async function processMultiAssetData(
  assetData: { [symbol: string]: TimestampedData[] }
) {
  // Synchronize all time series
  const datasets = Object.values(assetData);
  const synchronized = synchronizeTimestamps(datasets);
  
  // Aggregate to daily timeframe
  const aggregateDaily = aggregateByTimeframe('1d');
  const dailyData = synchronized.map(aggregateDaily);
  
  // Calculate correlation matrix
  const correlations: { [key: string]: { [key: string]: number } } = {};
  const symbols = Object.keys(assetData);
  
  for (let i = 0; i < symbols.length; i++) {
    correlations[symbols[i]] = {};
    for (let j = 0; j < symbols.length; j++) {
      const returns1 = dailyData[i].map(d => d.close);
      const returns2 = dailyData[j].map(d => d.close);
      
      const corrResult = calculateCorrelation(returns1, returns2);
      correlations[symbols[i]][symbols[j]] = isRight(corrResult) ? corrResult.right : 0;
    }
  }
  
  return correlations;
}
```

### Real-time Sei Network Monitoring

```typescript
async function monitorSeiNetwork() {
  const config = createDefaultSeiConfig();
  const connectionResult = await connectToSei(config);
  
  if (isLeft(connectionResult)) {
    console.error('Connection failed:', connectionResult.left.message);
    return;
  }
  
  const client = connectionResult.right;
  
  // Monitor transactions
  setInterval(async () => {
    try {
      // Mock getting latest transactions
      const transactions = await getLatestTransactions(client);
      
      const validTransactions = transactions.filter(validateSeiTransaction);
      const totalGasCost = validTransactions.reduce((sum, tx) => {
        return sum.plus(calculateGasCost(tx.gasUsed, tx.gasPrice));
      }, new BigNumber(0));
      
      console.log(`Processed ${validTransactions.length} transactions`);
      console.log(`Total gas cost: ${formatSeiAmount(totalGasCost)}`);
      
    } catch (error) {
      console.error('Monitoring error:', error);
    }
  }, 5000);
}
```

## 🧪 Testing

All utilities are designed for easy testing with pure functions:

```typescript
describe('Mathematical Utilities', () => {
  test('calculateReturns handles valid input', () => {
    const prices = [100, 105, 102, 108];
    const result = calculateReturns(prices);
    
    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.right).toHaveLength(3);
      expect(result.right[0]).toBeCloseTo(0.05);
    }
  });
  
  test('calculateReturns handles invalid input', () => {
    const result = calculateReturns([]);
    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) {
      expect(result.left.type).toBe('INSUFFICIENT_DATA');
    }
  });
});
```

## 🚀 Performance Considerations

- All functions use lazy evaluation where possible
- BigNumber.js for precise decimal calculations
- Efficient algorithms optimized for financial data
- Memory-conscious implementations for large datasets
- Functional composition reduces intermediate allocations

## 📝 Type Safety

Full TypeScript support with:

- Comprehensive type definitions
- Either types for error handling
- Generic functions where appropriate
- Immutable data structures
- Strict null checks compatibility

## 🔗 Integration

These utilities integrate seamlessly with:

- Data collection pipelines
- Real-time streaming systems
- Batch processing workflows
- API endpoints and services
- Frontend visualization components

## 📚 Additional Resources

- **Constants**: See `constants.ts` for all configuration values
- **Types**: See `types.ts` for comprehensive type definitions
- **Examples**: Check the `/examples` directory for usage patterns
- **Tests**: See `/tests` directory for comprehensive test suites

---

Built with ❤️ for robust, functional data processing in TypeScript.