# Sei AI Portfolio Data Collection

A functional programming-based data collection and processing system for AI-powered portfolio management on the Sei Network EVM blockchain. This system collects, processes, and prepares blockchain data for training machine learning models using OpenAI's fine-tuning capabilities.

## 🚀 Features

- **Functional Architecture**: Pure functions and immutable data structures throughout
- **Sei-Optimized**: Leverages Sei's 400ms block time and parallelized execution
- **Multi-Source Data Collection**: 
  - On-chain data (blocks, transactions, events)
  - Market data (prices, volumes, liquidity)
  - DeFi protocols (TVL, yields, positions)
  - Oracle feeds (native Sei oracle, Pyth, Band)
- **Advanced Feature Engineering**: Technical indicators, volatility metrics, correlations
- **OpenAI Integration**: Direct export to OpenAI fine-tuning format
- **Modular Design**: Each component is independent and composable
- **High Performance**: Parallel processing with configurable concurrency
- **Type Safety**: Full TypeScript with strict typing

## 📋 Requirements

- Node.js >= 16.0.0
- npm >= 8.0.0
- TypeScript >= 5.0.0
- Sei Network RPC access

## 🛠 Installation

```bash
# Clone the repository
git clone https://github.com/your-org/sei-portfolio-data.git
cd sei-portfolio-data

# Install dependencies
npm install

# Build the project
npm run build
```

## 🚦 Quick Start

### 1. Configure the system

Edit `config/collectors.json` to set up your data sources:

```json
{
  "networks": {
    "mainnet": {
      "chainId": 1329,
      "rpcUrl": "https://rpc.sei-apis.com",
      "wsUrl": "wss://ws.sei-apis.com"
    }
  },
  "marketData": {
    "providers": ["coingecko", "coinmarketcap"],
    "assets": ["SEI", "ETH", "BTC", "USDT", "USDC"]
  }
}
```

### 2. Start data collection

```bash
# Start continuous collection (every 60 seconds)
npm run collect:start

# Or run in interactive mode
npm run collect:interactive

# Check collection status
npm run collect:status
```

### 3. Process collected data

```bash
# Process raw data into ML-ready features
npm run process:run -- --features returns,rsi,volatility --windows 5,15,60

# Process with OpenAI format
npm run process:run -- --openai
```

### 4. Export for training

```bash
# Export as OpenAI fine-tuning dataset
npm run export:dataset -- -i datasets/processed/latest.json -f openai

# Export to cloud storage
npm run export:cloud -- -i datasets/processed -p aws -b my-ml-bucket
```

## 📊 Data Pipeline

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Collectors    │────▶│   Transformers   │────▶│     Storage     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │                         │
        ▼                        ▼                         ▼
   - Chain Data           - Normalize              - Raw Data
   - Market Data          - Aggregate              - Processed
   - DeFi Protocols       - Features               - ML Datasets
   - Oracle Feeds         - Validate               - Checkpoints
```

## 🔧 Architecture

### Functional Programming Patterns

All modules follow functional programming principles:

```typescript
// Pure functions with immutable data
const collectBlockData = (
  client: PublicClient,
  blockNumber: number
): TaskEither<DataError, BlockData> =>
  pipe(
    fetchBlock(client, blockNumber),
    TE.chain(validateBlock),
    TE.map(transformToBlockData)
  );

// Composable pipelines
const processData = pipe(
  normalizeData,
  E.chain(aggregateTimeSeriesData),
  E.chain(engineerFeatures),
  E.chain(validateDataQuality)
);
```

### Key Modules

- **Collectors**: Gather data from various sources
  - `chain.ts`: Blockchain data collection
  - `market.ts`: Price and volume data
  - `defi.ts`: DeFi protocol metrics
  - `oracle.ts`: Oracle price feeds

- **Transformers**: Process and enrich data
  - `normalize.ts`: Standardize data formats
  - `aggregate.ts`: Time-based aggregations
  - `features.ts`: Technical indicators
  - `validate.ts`: Data quality checks

- **Storage**: Persist data efficiently
  - `writer.ts`: Atomic file operations
  - `schema.ts`: Data structure definitions
  - `index.ts`: Fast data retrieval

- **Training**: OpenAI integration
  - `prepare.ts`: Format for fine-tuning
  - `train.ts`: Training orchestration
  - `evaluate.ts`: Model evaluation

## 📝 Scripts

### Collection Scripts
- `npm run collect` - Show collection help
- `npm run collect:start` - Start continuous collection
- `npm run collect:interactive` - Interactive collection mode
- `npm run collect:status` - Show collection status

### Processing Scripts
- `npm run process` - Show processing help
- `npm run process:run` - Process raw data
- `npm run process:validate` - Validate datasets

### Export Scripts
- `npm run export` - Show export help
- `npm run export:dataset` - Export datasets
- `npm run export:cloud` - Upload to cloud

### Development Scripts
- `npm run build` - Build TypeScript
- `npm test` - Run tests
- `npm run test:coverage` - Coverage report
- `npm run lint` - Run linter
- `npm run format` - Format code

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## 📈 Feature Engineering

The system generates a comprehensive set of features:

### Price Features
- Simple and log returns
- Price momentum
- Rate of change

### Technical Indicators
- RSI (Relative Strength Index)
- MACD (Moving Average Convergence Divergence)
- Bollinger Bands
- Moving averages (SMA, EMA)

### Volatility Metrics
- Historical volatility
- GARCH volatility
- Realized volatility

### Market Microstructure
- Volume profiles
- Liquidity metrics
- Order flow imbalance

### On-Chain Metrics
- Gas usage patterns
- Transaction velocity
- Active addresses
- MEV activity

## 🤖 OpenAI Training Integration

The system seamlessly integrates with OpenAI's fine-tuning API:

```typescript
// Prepare dataset for OpenAI
const dataset = await prepareOpenAIDataset(processedData);

// Train model
const model = await trainModel({
  trainingFile: 'training.jsonl',
  validationFile: 'validation.jsonl',
  model: 'gpt-3.5-turbo',
  hyperparameters: {
    nEpochs: 3,
    batchSize: 4,
    learningRateMultiplier: 0.1
  }
});

// Deploy for portfolio predictions
const prediction = await model.predict({
  marketConditions: currentData,
  riskTolerance: 'moderate'
});
```

## 🔐 Security

- No private keys or sensitive data in code
- Environment variables for credentials
- Read-only blockchain access
- Data validation at every step
- Audit logs for all operations

## 📚 Documentation

- [Data Schema](docs/DATA_SCHEMA.md) - Detailed data structures
- [Features Guide](docs/FEATURES.md) - Feature descriptions
- [API Reference](docs/API.md) - Function documentation
- [Contributing](CONTRIBUTING.md) - Contribution guidelines

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Sei Network team for blockchain infrastructure
- OpenAI for fine-tuning capabilities
- fp-ts community for functional programming tools