# Sei Protocol Integration

Comprehensive TypeScript integration for Silo (staking) and Citrex (perpetual trading) protocols on Sei Network.

## Overview

This integration provides a complete solution for interacting with Sei Network's DeFi protocols:

- **Silo Protocol**: Advanced staking platform with lockup periods, reward multipliers, and slashing protection
- **Citrex Protocol**: Perpetual trading platform with leverage, margin management, and liquidation protection

## Features

### Core Functionality
- ✅ **Complete Protocol Coverage**: Full API coverage for both Silo and Citrex protocols
- ✅ **Type Safety**: Comprehensive TypeScript types with fp-ts functional programming patterns
- ✅ **Error Handling**: Robust error handling with retry mechanisms and user-friendly messages
- ✅ **Risk Management**: Advanced risk analysis and monitoring for both staking and trading
- ✅ **Portfolio Integration**: Seamless integration with existing portfolio management system

### Silo Protocol Features
- ✅ **Flexible Staking**: Support for flexible and fixed-term staking with multipliers
- ✅ **Reward Management**: Automatic reward calculation and claiming
- ✅ **Penalty Calculation**: Early unstaking penalty computation
- ✅ **Slashing Protection**: Risk assessment for validator slashing events
- ✅ **APY Estimation**: Accurate return estimation with compounding

### Citrex Protocol Features
- ✅ **Perpetual Trading**: Long/short positions with leverage up to 50x
- ✅ **Risk Management**: Liquidation monitoring and margin management
- ✅ **PnL Tracking**: Real-time unrealized and realized profit/loss calculation
- ✅ **Funding Rates**: Automatic funding rate calculations and payments
- ✅ **Order Management**: Market, limit, and stop orders with advanced options

## Installation

```typescript
import {
  setupSeiProtocols,
  SEI_MAINNET_CONFIG,
  SeiProtocolIntegration,
  SeiRiskManager
} from './protocols/sei';
```

## Quick Start

### Basic Setup

```typescript
import { setupSeiProtocols, SEI_MAINNET_CONFIG } from './protocols/sei';

// Initialize with default mainnet configuration
const seiProtocols = setupSeiProtocols(SEI_MAINNET_CONFIG);

// Initialize protocols
await seiProtocols.initialize()();

// Access individual adapters
const silo = seiProtocols.silo;
const citrex = seiProtocols.citrex;
```

### Custom Configuration

```typescript
import { SeiProtocolConfig, SeiProtocolIntegration } from './protocols/sei';

const customConfig: SeiProtocolConfig = {
  network: 'mainnet',
  rpcUrl: 'https://your-custom-rpc.com',
  contractAddresses: {
    silo: {
      stakingContract: 'sei1your-silo-contract',
      rewardDistributor: 'sei1your-reward-contract',
      // ... other contracts
    },
    citrex: {
      perpetualTrading: 'sei1your-citrex-contract',
      vault: 'sei1your-vault-contract',
      // ... other contracts
    }
  },
  defaultSlippage: 0.005,
  gasLimits: {
    stake: 200000,
    unstake: 250000,
    // ... other limits
  }
};

const integration = setupSeiProtocols(customConfig);
```

## Silo Protocol Usage

### Staking Operations

```typescript
import { SiloStakeParams } from './protocols/sei';

const walletAddress = 'sei1your-wallet-address';

// 1. Get staking pool information
const poolInfo = await silo.getStakingPoolInfo('sei1token-address')();

if (poolInfo._tag === 'Right') {
  console.log(`APR: ${poolInfo.right.apr * 100}%`);
  console.log(`Total Staked: $${poolInfo.right.totalStakedUSD}`);
}

// 2. Estimate staking returns
const stakeParams: SiloStakeParams = {
  walletAddress,
  token: 'sei1token-address',
  amount: '1000000000000000000000', // 1000 tokens
  stakingPeriod: 2592000, // 30 days
  acceptSlashingRisk: true
};

const returns = await silo.estimateStakingReturns(stakeParams)();

if (returns._tag === 'Right') {
  console.log(`Daily Rewards: $${returns.right.dailyRewards}`);
  console.log(`APY: ${returns.right.apy * 100}%`);
}

// 3. Stake tokens
const stakeResult = await silo.stake(stakeParams)();

if (stakeResult._tag === 'Right') {
  console.log(`Staking successful: ${stakeResult.right}`);
} else {
  console.error(`Staking failed: ${stakeResult.left.userMessage}`);
}
```

### Managing Staking Positions

```typescript
// Get all staking positions
const positions = await silo.getStakingPositions(walletAddress)();

if (positions._tag === 'Right') {
  positions.right.forEach(position => {
    console.log(`Position: ${position.stakedTokenSymbol}`);
    console.log(`Amount: ${position.stakedAmountFormatted}`);
    console.log(`Value: $${position.valueUSD}`);
    console.log(`Locked: ${position.stakingPeriod.isLocked}`);
    console.log(`Pending Rewards: $${position.pendingRewardsUSD}`);
  });
}

// Claim rewards
const claimResult = await silo.claimRewards({
  walletAddress,
  positionId: 'silo-pos-1'
})();

// Unstake tokens (with penalty calculation)
const penaltyInfo = await silo.calculateUnstakePenalty('silo-pos-1', '500000000000000000000')();

if (penaltyInfo._tag === 'Right') {
  console.log(`Penalty: ${penaltyInfo.right.penalty * 100}%`);
  console.log(`Net Amount: ${penaltyInfo.right.netAmount}`);
}

const unstakeResult = await silo.unstake({
  walletAddress,
  positionId: 'silo-pos-1',
  amount: '500000000000000000000',
  acceptPenalty: true
})();
```

## Citrex Protocol Usage

### Market Data and Analysis

```typescript
// Get all available markets
const markets = await citrex.getMarketData()();

if (markets._tag === 'Right') {
  markets.right.forEach(market => {
    console.log(`Market: ${market.symbol}`);
    console.log(`Mark Price: $${market.markPrice}`);
    console.log(`24h Change: ${market.priceChangePercent24h}%`);
    console.log(`Funding Rate: ${market.fundingRate * 100}%`);
    console.log(`Max Leverage: ${market.maxLeverage}x`);
  });
}

// Get specific market data
const seiMarket = await citrex.getMarketData('SEI-USDC')();
const markPrice = await citrex.getMarkPrice('SEI-USDC')();
const fundingRate = await citrex.getFundingRate('SEI-USDC')();
```

### Trading Operations

```typescript
import { CitrexOpenPositionParams } from './protocols/sei';

// Open a leveraged position
const openParams: CitrexOpenPositionParams = {
  walletAddress,
  market: 'SEI-USDC',
  side: 'long',
  size: '1000', // 1000 SEI
  orderType: 'market',
  leverage: 5,
  collateral: '100', // 100 USDC
  reduceOnly: false
};

const openResult = await citrex.openPosition(openParams)();

if (openResult._tag === 'Right') {
  console.log(`Position opened: ${openResult.right}`);
} else {
  console.error(`Failed to open position: ${openResult.left.userMessage}`);
}

// Monitor positions
const positions = await citrex.getPositions(walletAddress)();

if (positions._tag === 'Right') {
  positions.right.forEach(position => {
    console.log(`Market: ${position.marketSymbol}`);
    console.log(`Side: ${position.side}`);
    console.log(`Size: ${position.sizeFormatted}`);
    console.log(`Entry Price: $${position.entryPrice}`);
    console.log(`Mark Price: $${position.markPrice}`);
    console.log(`PnL: $${position.pnl.unrealized}`);
    console.log(`Liquidation Risk: ${position.risk.liquidationRisk}`);
  });
}

// Close position
const closeResult = await citrex.closePosition({
  walletAddress,
  positionId: 'citrex-pos-1',
  orderType: 'market',
  reduceOnly: true
})();
```

### Risk Management

```typescript
// Get liquidation information
const liquidationInfo = await citrex.getLiquidationInfo('citrex-pos-1')();

if (liquidationInfo._tag === 'Right') {
  const info = liquidationInfo.right;
  console.log(`Liquidation Price: $${info.liquidationPrice}`);
  console.log(`Margin Ratio: ${info.marginRatio * 100}%`);
  console.log(`Time to Liquidation: ${info.timeToLiquidation}s`);
  
  if (info.actions.addMargin > 0) {
    console.log(`Add $${info.actions.addMargin} margin to improve safety`);
  }
}

// Adjust position to manage risk
const adjustResult = await citrex.adjustPosition({
  walletAddress,
  positionId: 'citrex-pos-1',
  action: 'add_margin',
  amount: '50' // Add 50 USDC margin
})();
```

## Portfolio Integration

### Comprehensive Portfolio View

```typescript
import { SeiProtocolIntegration } from './protocols/sei';

const integration = new SeiProtocolIntegration(publicClient, walletClient, config);
await integration.initialize()();

// Get combined portfolio value
const portfolioValue = await integration.getProtocolPortfolioValue(walletAddress)();

if (portfolioValue._tag === 'Right') {
  const portfolio = portfolioValue.right;
  console.log(`Total Value: $${portfolio.totalValueUSD}`);
  console.log(`Staking Value: $${portfolio.siloValueUSD}`);
  console.log(`Trading Value: $${portfolio.citrexValueUSD}`);
  console.log(`Unrealized PnL: $${portfolio.breakdown.unrealizedPnL}`);
}

// Get detailed metrics
const metrics = await integration.getProtocolMetrics(walletAddress)();

if (metrics._tag === 'Right') {
  const m = metrics.right;
  console.log('Staking Metrics:');
  console.log(`  Average APY: ${m.stakingMetrics.averageAPY * 100}%`);
  console.log(`  Risk Score: ${m.stakingMetrics.riskScore}/100`);
  
  console.log('Trading Metrics:');
  console.log(`  Total Positions: ${m.tradingMetrics.totalPositions}`);
  console.log(`  Average Leverage: ${m.tradingMetrics.averageLeverage}x`);
  console.log(`  Liquidation Risk: ${m.tradingMetrics.liquidationRisk}/100`);
}
```

## Risk Management

### Automated Risk Monitoring

```typescript
import { createSeiRiskManager } from './protocols/sei';

const riskManager = createSeiRiskManager({
  updateInterval: 30000, // 30 seconds
  alertThresholds: {
    liquidation: 0.15,    // 15% liquidation risk
    concentration: 0.4,   // 40% concentration
    correlation: 0.8,     // 80% correlation
    volatility: 0.3       // 30% volatility
  },
  automatedActions: {
    enableLiquidationProtection: true,
    enableRiskAlerts: true
  }
});

// Start monitoring
riskManager.startMonitoring(
  walletAddress,
  async () => await integration.getAllPositions(walletAddress)(),
  async () => 10000, // Portfolio value
  (alert) => {
    console.log(`🚨 RISK ALERT: ${alert.message}`);
    console.log(`Severity: ${alert.severity}`);
    console.log(`Recommendations: ${alert.action.recommendations.join(', ')}`);
  }
);

// Validate operations before execution
const validation = await riskManager.validateOperation(
  'open_position',
  openParams,
  currentPositions,
  portfolioValue
)();

if (validation._tag === 'Right') {
  if (validation.right.allowed) {
    // Proceed with operation
  } else {
    console.warn('Operation blocked by risk limits:');
    validation.right.reasons.forEach(reason => console.log(`- ${reason}`));
  }
}
```

### Custom Risk Analysis

```typescript
const positions = await integration.getAllPositions(walletAddress)();

if (positions._tag === 'Right') {
  const riskAnalysis = await riskManager.analyzeRisk(
    walletAddress, 
    positions.right, 
    portfolioValue
  )();
  
  if (riskAnalysis._tag === 'Right') {
    const risk = riskAnalysis.right;
    
    console.log('Risk Analysis:');
    console.log(`Health Factor: ${risk.healthFactor}`);
    console.log(`Liquidation Risk: ${risk.liquidationRisk}`);
    console.log(`Concentration Risk: ${risk.concentrationRisk}%`);
    
    console.log('Protocol-Specific Risks:');
    console.log(`Silo Staking Risk: ${risk.protocolSpecific.silo.stakingRisk}%`);
    console.log(`Citrex Liquidation Risk: ${risk.protocolSpecific.citrex.liquidationRisk}%`);
  }
}
```

## Error Handling

### Robust Error Management

```typescript
import { 
  SeiProtocolErrorHandler, 
  createSafeOperation, 
  createRetryableOperation 
} from './protocols/sei';

// Wrap operations with error handling
const safeStake = createSafeOperation(
  () => silo.stake(stakeParams)(),
  'stake_tokens',
  stakeParams
);

const result = await safeStake();

if (result._tag === 'Left') {
  const errorDetails = result.left;
  console.error(`Operation failed: ${errorDetails.userMessage}`);
  console.log(`Suggestions: ${errorDetails.suggestions.join(', ')}`);
  console.log(`Retryable: ${errorDetails.retryable}`);
}

// Automatic retry for network issues
const retryableStake = createRetryableOperation(
  () => silo.stake(stakeParams)(),
  'stake_tokens',
  stakeParams,
  3 // Max 3 retries
);

const retryResult = await retryableStake();
```

### Error Types and Handling

```typescript
import { SiloProtocolError, CitrexProtocolError } from './protocols/sei';

try {
  await silo.stake(invalidParams)();
} catch (error) {
  if (error instanceof SiloProtocolError) {
    switch (error.code) {
      case 'INSUFFICIENT_STAKE':
        console.log('Increase stake amount');
        break;
      case 'EARLY_UNSTAKE_PENALTY':
        console.log('Consider waiting for lockup period');
        break;
      default:
        console.log(`Silo error: ${error.message}`);
    }
  }
}
```

## Testing

### Running Tests

```bash
# Run all Sei protocol tests
npm test -- --testPathPattern="protocols/sei"

# Run specific protocol tests
npm test -- SiloProtocolWrapper.test.ts
npm test -- CitrexProtocolWrapper.test.ts

# Run integration tests
npm test -- SeiProtocolIntegration.test.ts
```

### Test Structure

```
__tests__/
├── SiloProtocolWrapper.test.ts      # Silo protocol unit tests
├── CitrexProtocolWrapper.test.ts    # Citrex protocol unit tests
├── SeiProtocolIntegration.test.ts   # Integration tests
├── SeiRiskManager.test.ts           # Risk management tests
└── errors/
    └── ErrorHandler.test.ts         # Error handling tests
```

## Configuration

### Network Configurations

```typescript
// Mainnet (Production)
const mainnetConfig = {
  network: 'mainnet',
  rpcUrl: 'https://evm-rpc.sei-apis.com',
  // ... production contract addresses
};

// Testnet (Development)
const testnetConfig = {
  network: 'testnet',
  rpcUrl: 'https://evm-rpc-testnet.sei-apis.com',
  // ... testnet contract addresses
};

// Devnet (Local Development)
const devnetConfig = {
  network: 'devnet',
  rpcUrl: 'https://evm-rpc-arctic-1.sei-apis.com',
  // ... devnet contract addresses
};
```

### Gas Optimization

```typescript
const optimizedConfig = {
  ...baseConfig,
  gasLimits: {
    stake: 180000,        // Optimized for simple staking
    unstake: 220000,      // Account for penalty calculations
    claimRewards: 120000, // Simple reward claiming
    openPosition: 280000, // Perpetual position opening
    closePosition: 230000,// Position closing with PnL
    adjustPosition: 180000 // Position adjustments
  }
};
```

## API Reference

### Core Classes

- `SiloProtocolWrapper`: Silo staking protocol adapter
- `CitrexProtocolWrapper`: Citrex perpetual trading adapter
- `SeiProtocolIntegration`: Combined protocol integration
- `SeiRiskManager`: Risk management and monitoring
- `SeiProtocolErrorHandler`: Error handling utilities

### Key Types

- `SeiProtocolConfig`: Main configuration interface
- `SiloStakingPosition`: Staking position representation
- `CitrexPerpetualPosition`: Trading position representation
- `SeiRiskMetrics`: Comprehensive risk metrics
- `SeiRiskAlert`: Risk alert notifications

See the [types.ts](./types.ts) file for complete type definitions.

## Contributing

1. Follow existing code patterns with fp-ts functional programming
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Ensure error handling is consistent
5. Test with both mainnet and testnet configurations

## Security Considerations

- Always validate user inputs before contract interactions
- Use the built-in risk management features
- Monitor positions regularly for liquidation risk
- Keep private keys secure and never log them
- Use the error handling utilities for graceful failures
- Test thoroughly on testnet before mainnet deployment

## License

This integration is part of the Sei AI Portfolio Manager project. See the main project license for details.