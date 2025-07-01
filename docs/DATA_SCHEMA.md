# Data Schema Documentation

This document describes the data structures used throughout the Sei AI Portfolio Data Collection system.

## Table of Contents

1. [Raw Data Formats](#raw-data-formats)
2. [Processed Data Structures](#processed-data-structures)
3. [ML Dataset Format](#ml-dataset-format)
4. [OpenAI Training Format](#openai-training-format)
5. [Type Definitions](#type-definitions)

## Raw Data Formats

### BlockData

Raw blockchain data collected from Sei Network.

```typescript
interface BlockData {
  blockNumber: number;
  timestamp: number;          // Unix timestamp in seconds
  transactionCount: number;
  gasUsed: number;
  gasLimit: number;
  baseFeePerGas: string;      // Wei as string
  utilizationRate: number;    // gasUsed / gasLimit
}
```

Example:
```json
{
  "blockNumber": 12345678,
  "timestamp": 1700000000,
  "transactionCount": 125,
  "gasUsed": 15000000,
  "gasLimit": 30000000,
  "baseFeePerGas": "1000000000",
  "utilizationRate": 0.5
}
```

### TransactionData

Individual transaction details.

```typescript
interface TransactionData {
  hash: string;
  from: string;
  to: string | null;
  value: string;              // Wei as string
  gasPrice: string;           // Wei as string
  gasUsed: number;
  blockNumber: number;
  timestamp: number;
  input: string;              // Hex encoded
  status: boolean;
}
```

### PriceData

Market price information with decimal precision.

```typescript
interface PriceData {
  asset: string;
  price: number;
  volume24h: number;
  marketCap: number;
  timestamp: number;
  source: string;
  confidence: number;         // 0-1 confidence score
}
```

### DeFiProtocolData

DeFi protocol metrics.

```typescript
interface TVLData {
  protocolId: string;
  protocolName: string;
  totalValueLocked: string;   // USD value as string
  pools: Array<{
    poolId: string;
    assets: string[];
    tvl: string;
    apy: number;
  }>;
  timestamp: number;
}

interface YieldRate {
  protocolId: string;
  poolId: string;
  apy: number;
  apr: number;
  rewardTokens: string[];
  timestamp: number;
}
```

### OracleData

Oracle price feed data.

```typescript
interface OraclePrice {
  provider: string;           // 'sei-native' | 'pyth' | 'band'
  asset: string;
  price: number;
  timestamp: number;
  confidence: number;         // Price confidence 0-1
  round: number;              // Oracle round ID
}

interface OracleFeed {
  prices: OraclePrice[];
  timestamp: number;
  providers: string[];
}
```

## Processed Data Structures

### NormalizedData

Standardized data format after normalization.

```typescript
interface NormalizedData {
  timestamp: number;          // Milliseconds
  prices: Record<string, bigint>;     // Normalized to smallest unit
  volumes: Record<string, bigint>;    // Normalized volumes
  metadata: {
    source: string;
    processingTime: number;
    quality: number;
  };
}
```

### TimeSeriesData

Aggregated time series data.

```typescript
interface TimeSeriesData {
  timestamps: number[];       // Array of timestamps
  data: Record<string, {
    prices: number[];
    volumes: number[];
    [key: string]: number[];  // Additional metrics
  }>;
  interval: string;           // '1m' | '5m' | '15m' | '1h' | '1d'
}
```

### FeatureSet

Engineered features ready for ML.

```typescript
interface FeatureSet {
  features: string[];         // Feature names
  data: Array<{
    timestamp: number;
    features: number[];       // Feature values
    quality: number;          // Data quality score
  }>;
  statistics: {
    mean: number[];
    std: number[];
    min: number[];
    max: number[];
  };
}
```

## ML Dataset Format

### MLDataset

Complete dataset structure for machine learning.

```typescript
interface MLDataset {
  metadata: {
    version: string;
    chainId: number;
    timeRange: {
      start: number;
      end: number;
    };
    features: string[];       // Feature descriptions
  };
  data: Array<{
    timestamp: number;
    features: number[];       // Input features
    labels: number[];         // Target labels
    quality: number;          // Sample quality 0-1
  }>;
  features: string[];         // Feature column names
  labels: string[];           // Label column names
}
```

Example structure:
```json
{
  "metadata": {
    "version": "1.0.0",
    "chainId": 1329,
    "timeRange": {
      "start": 1700000000000,
      "end": 1700086400000
    },
    "features": ["returns", "rsi", "volatility", "volume_ratio"]
  },
  "data": [
    {
      "timestamp": 1700000000000,
      "features": [0.02, 65.5, 0.15, 1.2],
      "labels": [0.3, 0.7],
      "quality": 0.98
    }
  ],
  "features": ["SEI_returns", "SEI_rsi", "SEI_volatility", "volume_ratio"],
  "labels": ["optimal_sei_weight", "optimal_eth_weight"]
}
```

## OpenAI Training Format

### Fine-tuning Format

JSONL format for OpenAI fine-tuning.

```jsonl
{"messages": [
  {"role": "system", "content": "You are a portfolio optimization AI trained on Sei blockchain data."},
  {"role": "user", "content": "Market conditions: {\"returns\": 0.02, \"rsi\": 65.5, \"volatility\": 0.15}"},
  {"role": "assistant", "content": "Optimal allocation: {\"SEI\": 0.3, \"ETH\": 0.7}"}
]}
```

### Training Manifest

Configuration for OpenAI training jobs.

```typescript
interface OpenAIManifest {
  training_file: string;
  validation_file: string;
  model: string;
  hyperparameters: {
    n_epochs: number;
    batch_size: number;
    learning_rate_multiplier: number;
    prompt_loss_weight: number;
  };
  metadata: {
    dataset: string;
    features: string[];
    samples: {
      training: number;
      validation: number;
    };
  };
}
```

## Type Definitions

### Core Types

```typescript
// Result type for functional error handling
type Result<T> = Either<DataError, T>;

// Error types
interface DataError {
  type: 'network' | 'validation' | 'storage' | 'processing';
  message: string;
  timestamp: number;
  context?: any;
}

// Time range
interface TimeRange {
  start: number;
  end: number;
}

// Asset information
interface Asset {
  symbol: string;
  decimals: number;
  address?: string;
}
```

### Feature Types

```typescript
// Technical indicator results
interface RSIResult {
  values: number[];
  period: number;
}

interface MACDResult {
  macd: number[];
  signal: number[];
  histogram: number[];
}

interface BollingerBands {
  upper: number[];
  middle: number[];
  lower: number[];
  period: number;
  stdDev: number;
}
```

### Configuration Types

```typescript
interface CollectorConfig {
  rpcUrl: string;
  wsUrl?: string;
  contracts: Record<string, string>;
  rateLimit?: number;
  timeout?: number;
}

interface ProcessingOptions {
  features: string[];
  windows: number[];
  fillMethod: 'forward' | 'backward' | 'interpolate';
  outlierDetection: boolean;
  qualityThreshold: number;
}
```

## Data Quality Metrics

Each data point includes quality metrics:

```typescript
interface QualityMetrics {
  completeness: number;       // 0-1, missing data ratio
  consistency: number;        // 0-1, cross-validation score
  timeliness: number;         // 0-1, data freshness
  accuracy: number;           // 0-1, validation checks passed
  overall: number;            // Weighted average
}
```

## Storage Structure

### File Organization

```
datasets/
├── raw/
│   └── YYYY-MM-DD/
│       ├── blocks_*.json
│       ├── transactions_*.json
│       ├── prices_*.json
│       └── protocols_*.json
├── processed/
│   ├── features_*.json
│   ├── normalized_*.json
│   └── aggregated_*.json
├── ml/
│   ├── training_*.json
│   ├── validation_*.json
│   └── test_*.json
└── checkpoints/
    └── collector_*.json
```

### Compression

Large datasets support gzip compression:

```typescript
interface CompressedDataset {
  format: 'gzip';
  originalSize: number;
  compressedSize: number;
  checksum: string;
  data: Buffer;             // Gzipped data
}
```

## Best Practices

1. **Immutability**: All data structures are immutable
2. **Type Safety**: Use TypeScript types for all data
3. **Validation**: Validate data at every transformation
4. **Versioning**: Include version in all datasets
5. **Timestamps**: Use milliseconds for all timestamps
6. **BigInt**: Use for precise financial calculations
7. **Decimals**: Track decimal places for each asset
8. **Error Handling**: Use Result types for all operations