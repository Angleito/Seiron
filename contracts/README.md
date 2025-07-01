# Sei Blockchain Data Logging System

A minimal, efficient Solidity contract system optimized for Sei blockchain's 400ms block times and parallel execution. Designed specifically for AI training data collection through comprehensive event emission.

## 📋 Overview

This system consists of smart contracts that serve as data logging mechanisms for portfolio events, market data, user behavior, and oracle price feeds. The contracts are optimized for minimal storage and maximum event emission to facilitate off-chain data collection for AI model training.

## 🏗️ Architecture

### Core Contracts

1. **DataLogger.sol** - Main contract for logging portfolio events and data
2. **OracleAggregator.sol** - Specialized contract for oracle price aggregation
3. **IDataLogger.sol** - Interface defining core logging functionality
4. **IOracle.sol** - Interface for oracle interactions
5. **IDataTypes.sol** - Common data structures and types

### Design Principles

- **Single Responsibility**: Each contract has a specific, focused purpose
- **Event-Driven**: All state changes emit comprehensive events
- **Gas Optimized**: Designed for Sei's fast block times and low fees
- **Minimal Storage**: Focus on event emission over on-chain data storage
- **Interface-Driven**: Clean separation of concerns through interfaces

## 🚀 Features

### DataLogger Contract

- **Portfolio Action Logging**: Track buy, sell, stake, unstake operations
- **Market Data Logging**: Record price, volume, volatility metrics
- **User Behavior Logging**: Capture behavioral patterns for AI analysis
- **Oracle Update Logging**: Track price feed updates with confidence levels
- **Batch Operations**: Gas-efficient batch logging for multiple events
- **Authorization System**: Role-based access control for loggers
- **Emergency Controls**: Pause functionality for system maintenance

### OracleAggregator Contract

- **Multi-Oracle Support**: Aggregate data from multiple price sources
- **Confidence Tracking**: Monitor oracle reliability and data quality
- **Price Deviation Detection**: Identify unusual price movements
- **Batch Price Updates**: Process multiple asset prices efficiently
- **Authorization Management**: Control which oracles can update prices
- **Emergency Price Updates**: Manual intervention capability

## 📊 Events & Data Collection

All contracts emit comprehensive events optimized for off-chain data collection:

### Portfolio Events
```solidity
event PortfolioAction(
    address indexed user,
    string indexed action,
    address indexed asset,
    uint256 amount,
    uint256 price,
    uint256 timestamp,
    uint256 blockNumber
);
```

### Market Data Events
```solidity
event MarketData(
    address indexed asset,
    uint256 price,
    uint256 volume,
    uint256 volatility,
    uint256 timestamp,
    uint256 blockNumber
);
```

### User Behavior Events
```solidity
event UserBehavior(
    address indexed user,
    string indexed behaviorType,
    uint256 score,
    bytes metadata,
    uint256 timestamp
);
```

### Oracle Events
```solidity
event OracleUpdate(
    address indexed oracle,
    address indexed asset,
    uint256 price,
    uint256 confidence,
    uint256 timestamp
);
```

## 🛠️ Deployment

### Prerequisites

- Foundry/Forge framework
- Sei network access (testnet/mainnet)
- Private key with sufficient SEI for deployment

### Deployment Script

```bash
# Set environment variables
export PRIVATE_KEY=your_private_key_here
export RPC_URL=https://evm-rpc.sei-apis.com

# Deploy to Sei testnet
forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast --verify

# Deploy to Sei mainnet
forge script script/Deploy.s.sol --rpc-url https://evm-rpc.sei-apis.com --broadcast --verify
```

### Deployed Contract Addresses

After deployment, the script will output contract addresses:

```
=== DEPLOYED CONTRACTS ===
DataLogger: 0x...
OracleAggregator: 0x...
```

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Run all tests
forge test

# Run with verbose output
forge test -vvv

# Run specific test file
forge test --match-contract DataLoggerTest

# Run with gas reporting
forge test --gas-report
```

### Test Coverage

- **Unit Tests**: Individual function testing
- **Integration Tests**: Cross-contract functionality
- **Fuzz Tests**: Property-based testing with random inputs
- **Gas Optimization Tests**: Verify batch operations efficiency

## 📝 Usage Examples

### Initialize Contracts

```solidity
// Deploy DataLogger with initial authorized loggers
address[] memory initialLoggers = new address[](1);
initialLoggers[0] = loggerAddress;
DataLogger dataLogger = new DataLogger(owner, initialLoggers);

// Deploy OracleAggregator
OracleAggregator oracleAgg = new OracleAggregator(owner, address(dataLogger));

// Authorize OracleAggregator to log data
dataLogger.setLoggerAuthorization(address(oracleAgg), true);
```

### Log Portfolio Actions

```solidity
// Single portfolio action
dataLogger.logPortfolioAction(
    userAddress,
    "buy",
    tokenAddress,
    1000, // amount
    100   // price
);

// Batch portfolio actions (gas efficient)
address[] memory users = [user1, user2, user3];
string[] memory actions = ["buy", "sell", "stake"];
address[] memory assets = [token1, token2, token1];
uint256[] memory amounts = [1000, 500, 750];
uint256[] memory prices = [100, 200, 105];

dataLogger.batchLogPortfolioActions(users, actions, assets, amounts, prices);
```

### Update Oracle Prices

```solidity
// Authorize oracle for asset
oracleAgg.setOracleAuthorization(oracleAddress, assetAddress, true);

// Update single price
oracleAgg.updatePrice(
    assetAddress,
    1000,  // price
    9500   // confidence (95%)
);

// Batch price updates
address[] memory assets = [asset1, asset2];
uint256[] memory prices = [1000, 2000];
uint256[] memory confidences = [9500, 9200];

oracleAgg.batchUpdatePrices(assets, prices, confidences);
```

### Log Market Data

```solidity
dataLogger.logMarketData(
    assetAddress,
    1000,   // price
    50000,  // volume
    250     // volatility (2.5%)
);
```

### Log User Behavior

```solidity
bytes memory metadata = abi.encode("risk_profile", "aggressive");
dataLogger.logUserBehavior(
    userAddress,
    "high_frequency_trader",
    8500,    // behavior score
    metadata
);
```

## 🔧 Configuration

### Authorization Management

```solidity
// Authorize new logger
dataLogger.setLoggerAuthorization(newLogger, true);

// Batch authorize multiple loggers
address[] memory loggers = [logger1, logger2];
bool[] memory authorizations = [true, false];
dataLogger.batchSetLoggerAuthorization(loggers, authorizations);

// Authorize oracle for specific asset
oracleAgg.setOracleAuthorization(oracle, asset, true);
```

### Emergency Controls

```solidity
// Pause data logging
dataLogger.setPausedState(true);

// Emergency price update (owner only)
oracleAgg.emergencyPriceUpdate(asset, emergencyPrice, confidence);
```

## 📈 Gas Optimization Features

### Sei-Specific Optimizations

1. **Minimal Storage**: Only essential data stored on-chain
2. **Event-Heavy Design**: Maximum data in events for off-chain collection
3. **Batch Operations**: Process multiple items in single transaction
4. **Immutable Variables**: Use immutable for frequently accessed data
5. **Unchecked Math**: Safe arithmetic optimizations where appropriate
6. **Assembly Usage**: Low-level optimizations for critical paths

### Performance Metrics

- **Single Portfolio Action**: ~50,000 gas
- **Batch Portfolio Actions (10x)**: ~300,000 gas (30k per action)
- **Oracle Price Update**: ~45,000 gas
- **Batch Oracle Updates (10x)**: ~250,000 gas (25k per update)

## 🔒 Security Features

### Access Control
- **Owner-based permissions** for administrative functions
- **Role-based authorization** for loggers and oracles
- **Address validation** for all external addresses

### Input Validation
- **Zero address checks** for all address parameters
- **Range validation** for confidence levels and scores
- **Length validation** for string inputs

### Emergency Mechanisms
- **Pause functionality** for system maintenance
- **Emergency price updates** for oracle failures
- **Authorization revocation** for compromised accounts

## 🌐 Network Configuration

### Sei Mainnet
- **Chain ID**: 1329
- **RPC URL**: https://evm-rpc.sei-apis.com
- **Block Time**: ~400ms
- **Gas Price**: Dynamic based on network load

### Sei Testnet
- **Chain ID**: 713715
- **RPC URL**: https://evm-rpc-testnet.sei-apis.com
- **Faucet**: Available for testing

## 📚 Integration Guide

### Off-Chain Data Collection

1. **Event Listening**: Monitor contract events for real-time data
2. **Batch Processing**: Collect events in batches for efficiency
3. **Data Validation**: Verify event data consistency
4. **Storage Options**: Store in databases, data lakes, or streaming systems

### AI Training Pipeline

1. **Data Extraction**: Parse events into structured data
2. **Feature Engineering**: Transform raw data into ML features
3. **Data Labeling**: Classify behaviors and outcomes
4. **Model Training**: Use data for supervised/unsupervised learning

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation for common solutions

## 🔄 Roadmap

### Phase 1 (Current)
- ✅ Core logging functionality
- ✅ Oracle aggregation
- ✅ Gas optimization for Sei
- ✅ Comprehensive testing

### Phase 2 (Planned)
- 🔄 Advanced analytics events
- 🔄 Cross-chain bridge logging
- 🔄 MEV detection events
- 🔄 Governance proposal logging

### Phase 3 (Future)
- ⏳ ML model integration
- ⏳ Predictive analytics
- ⏳ Real-time alerting system
- ⏳ Advanced visualization tools