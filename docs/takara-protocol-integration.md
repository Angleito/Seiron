# Takara Protocol Integration Guide

## Overview

The Takara Protocol Wrapper provides comprehensive integration with the Takara lending and borrowing platform on the Sei Network. Built on a Compound V2 fork with Sei-specific optimizations, it offers secure, efficient, and feature-rich lending operations using functional programming patterns with fp-ts.

## Features

### Core Lending Operations
- **Supply/Deposit**: Earn interest on deposited assets
- **Withdraw/Redeem**: Withdraw supplied assets with accrued interest
- **Borrow**: Borrow assets against supplied collateral
- **Repay**: Repay borrowed assets with interest
- **Market Management**: Enter/exit markets for collateral usage

### Advanced Features
- **Multi-Protocol Integration**: Seamless integration with YeiFinance adapter
- **Automated Protocol Selection**: Choose optimal protocol based on rates and risk
- **Risk Assessment Tools**: Comprehensive liquidation risk analysis
- **Yield Optimization**: Compare rates across protocols for maximum returns
- **Health Factor Monitoring**: Real-time position health tracking
- **Emergency Actions**: Automated risk mitigation strategies

### Supported Assets
- **SEI**: Native Sei Network token
- **iSEI**: Liquid staked SEI
- **USDT**: Tether USD (6 decimals)
- **USDC**: USD Coin (6 decimals)
- **fastUSD**: Sei ecosystem stablecoin
- **uBTC**: Wrapped Bitcoin (8 decimals)

## Architecture

### Class Structure

```typescript
TakaraProtocolWrapper implements ILendingAdapter {
  // Core lending operations
  supply(params: SupplyParams): Promise<Result<LendingTransaction>>
  withdraw(params: WithdrawParams): Promise<Result<LendingTransaction>>
  borrow(params: BorrowParams): Promise<Result<LendingTransaction>>
  repay(params: RepayParams): Promise<Result<LendingTransaction>>
  
  // Data retrieval
  getUserAccountData(user: string): Promise<Result<UserAccountData>>
  getUserReserveData(user: string, asset: string): Promise<Result<UserReserveData>>
  getReserveData(asset: string): Promise<Result<ReserveData>>
  getHealthFactor(user: string): Promise<Result<HealthFactorData>>
  getLendingRates(asset: string): Promise<Result<LendingRatesData>>
  
  // Market management
  enterMarkets(assets: string[]): Promise<Result<void>>
  exitMarket(asset: string): Promise<Result<void>>
}
```

### Enhanced LendingManager

```typescript
LendingManager {
  // Multi-protocol operations
  getCurrentRates(asset: string): Promise<Result<ProtocolComparison>>
  getAllRates(asset?: string): Promise<Result<LendingRate[]>>
  getUserPositions(user: string): Promise<Result<LendingPosition[]>>
  getAccountHealth(user: string): Promise<Result<AccountHealthData>>
  
  // Unified lending interface
  supply(params: LendingParams): Promise<Result<LendingTransaction>>
  withdraw(params: LendingParams): Promise<Result<LendingTransaction>>
  borrow(params: LendingParams): Promise<Result<LendingTransaction>>
  repay(params: LendingParams): Promise<Result<LendingTransaction>>
}
```

## Quick Start

### Basic Setup

```typescript
import { ethers } from 'ethers';
import { TakaraProtocolWrapper } from './protocols/sei/adapters/TakaraProtocolWrapper';

// Initialize provider and signer
const provider = new ethers.JsonRpcProvider('https://evm-rpc.sei-apis.com');
const signer = new ethers.Wallet('your-private-key', provider);

// Create Takara wrapper
const takaraWrapper = new TakaraProtocolWrapper(provider, signer);
```

### Supply Assets

```typescript
import * as E from 'fp-ts/Either';

const supplyResult = await takaraWrapper.supply({
  asset: 'SEI',
  amount: ethers.parseEther('100'), // 100 SEI
  referralCode: 0,
});

if (E.isRight(supplyResult)) {
  console.log('Supply successful:', supplyResult.right.txHash);
} else {
  console.error('Supply failed:', supplyResult.left.message);
}
```

### Borrow Assets

```typescript
// Check health factor first
const healthFactor = await takaraWrapper.getHealthFactor(userAddress);
if (E.isRight(healthFactor) && healthFactor.right.isHealthy) {
  const borrowResult = await takaraWrapper.borrow({
    asset: 'USDT',
    amount: BigInt('50000000'), // 50 USDT (6 decimals)
    interestRateMode: 'variable',
  });
  
  if (E.isRight(borrowResult)) {
    console.log('Borrow successful:', borrowResult.right.txHash);
  }
}
```

### Enhanced Multi-Protocol Usage

```typescript
import { LendingManager } from '../lending/LendingManager';

const lendingManager = new LendingManager({
  wallet: signer,
  protocol: 'auto', // Auto-select best protocol
  provider,
  signer,
});

// Compare protocols
const comparison = await lendingManager.getCurrentRates('SEI');
if (E.isRight(comparison)) {
  console.log('Best supply protocol:', comparison.right.bestSupplyProtocol);
  console.log('Rate advantage:', comparison.right.rateAdvantage, '%');
}

// Supply using optimal protocol
const result = await lendingManager.supply({
  asset: 'SEI',
  amount: ethers.parseEther('50'),
  protocol: 'auto',
});
```

## Risk Management

### Health Factor Monitoring

```typescript
import { TakaraRiskAssessment } from './protocols/sei/adapters/TakaraProtocolWrapper';

const healthFactor = await takaraWrapper.getHealthFactor(userAddress);
if (E.isRight(healthFactor)) {
  const risk = TakaraRiskAssessment.calculateLiquidationRisk(
    healthFactor.right.healthFactor
  );
  
  console.log('Liquidation risk:', risk); // 'low' | 'medium' | 'high' | 'critical'
}
```

### Optimal Borrow Calculation

```typescript
const accountData = await takaraWrapper.getUserAccountData(userAddress);
if (E.isRight(accountData)) {
  const optimalAmount = TakaraRiskAssessment.calculateOptimalBorrowAmount(
    accountData.right.totalCollateralBase,
    BigInt('750000000000000000'), // 75% collateral factor
    accountData.right.totalDebtBase,
    BigInt('1500000000000000000') // Target health factor: 1.5
  );
  
  console.log('Safe borrow amount:', ethers.formatEther(optimalAmount));
}
```

### Position Health Score

```typescript
const healthScore = TakaraRiskAssessment.calculatePositionHealthScore(
  healthFactor.right.healthFactor,
  utilizationRate,
  diversificationScore // 0-1
);

console.log('Position health:', (healthScore * 100).toFixed(2), '%');
```

## Error Handling

### Comprehensive Error Types

```typescript
type TakaraError = 
  | { type: 'market_not_listed'; message: string }
  | { type: 'market_not_entered'; message: string }
  | { type: 'insufficient_cash'; message: string }
  | { type: 'borrow_cap_exceeded'; message: string }
  | { type: 'supply_cap_exceeded'; message: string }
  | { type: 'comptroller_rejection'; message: string; code: number }
  | { type: 'price_error'; message: string }
  | { type: 'math_error'; message: string }
  | { type: 'token_insufficient_allowance'; message: string }
  | { type: 'token_transfer_failed'; message: string }
  | { type: 'liquidation_invalid'; message: string }
  | { type: 'liquidation_too_much'; message: string }
  | { type: 'health_factor_too_low'; message: string }
  | { type: 'insufficient_collateral'; message: string }
  | { type: 'asset_not_supported'; message: string }
  | { type: 'contract_error'; message: string; code?: string }
  | { type: 'network_error'; message: string };
```

### Error Handling Pattern

```typescript
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';

const result = await takaraWrapper.supply(params);

pipe(
  result,
  E.fold(
    (error) => {
      switch (error.type) {
        case 'supply_cap_exceeded':
          console.error('Supply cap reached for this asset');
          break;
        case 'token_insufficient_allowance':
          console.error('Need to approve token spending');
          break;
        case 'health_factor_too_low':
          console.error('Account health factor too low');
          break;
        default:
          console.error('Transaction failed:', error.message);
      }
    },
    (transaction) => {
      console.log('Transaction successful:', transaction.txHash);
    }
  )
);
```

## Advanced Usage

### Market Management

```typescript
// Enter markets to use assets as collateral
await takaraWrapper.enterMarkets(['SEI', 'USDT']);

// Exit market (stop using as collateral)
await takaraWrapper.exitMarket('SEI');
```

### Comprehensive Position Monitoring

```typescript
const positions = await lendingManager.getUserPositions(userAddress);
if (E.isRight(positions)) {
  positions.right.forEach(position => {
    console.log(`${position.protocol} ${position.asset} ${position.type}:`);
    console.log(`  Amount: ${ethers.formatEther(position.currentBalance)}`);
    console.log(`  APY: ${position.currentApy.toFixed(2)}%`);
    console.log(`  Risk: ${position.liquidationRisk}`);
  });
}
```

### Cross-Protocol Health Monitoring

```typescript
const overallHealth = await lendingManager.getAccountHealth(userAddress);
if (E.isRight(overallHealth)) {
  const health = overallHealth.right;
  console.log('Total Collateral:', ethers.formatEther(health.totalCollateralValue));
  console.log('Total Debt:', ethers.formatEther(health.totalDebtValue));
  console.log('Overall Health Factor:', ethers.formatEther(health.healthFactor));
  console.log('Liquidation Risk:', health.liquidationRisk);
  
  // Protocol breakdown
  health.protocolBreakdown.forEach(protocol => {
    console.log(`${protocol.protocol}:`);
    console.log(`  Collateral: ${ethers.formatEther(protocol.collateralValue)}`);
    console.log(`  Debt: ${ethers.formatEther(protocol.debtValue)}`);
  });
}
```

## Integration with Existing Systems

### Agent Integration

```typescript
// In lending agent
import { TakaraProtocolWrapper } from '../protocols/sei/adapters/TakaraProtocolWrapper';

class LendingAgent {
  private takaraWrapper: TakaraProtocolWrapper;
  
  async executeLendingStrategy(params: LendingStrategyParams) {
    // Use Takara wrapper for lending operations
    const result = await this.takaraWrapper.supply(params);
    return this.handleResult(result);
  }
}
```

### Chat Command Integration

```typescript
// In chat commands
export async function handleSupplyCommand(asset: string, amount: string) {
  const lendingManager = new LendingManager(config);
  
  const result = await lendingManager.supply({
    asset,
    amount: ethers.parseEther(amount),
    protocol: 'auto',
  });
  
  if (E.isRight(result)) {
    return `✅ Supplied ${amount} ${asset} successfully via optimal protocol`;
  } else {
    return `❌ Supply failed: ${result.left.message}`;
  }
}
```

## Configuration

### Protocol Addresses

```typescript
export const TAKARA_ADDRESSES = {
  COMPTROLLER: '0x...', // Comptroller contract
  PRICE_ORACLE: '0x...', // Price oracle contract
  INTEREST_RATE_MODEL: '0x...', // Interest rate model
  LIQUIDATION_INCENTIVE: '0x...', // Liquidation incentive
} as const;
```

### Asset Configuration

```typescript
// Each asset includes comprehensive configuration
{
  symbol: 'SEI',
  address: '0x...',
  decimals: 18,
  cTokenAddress: '0x...', // Compound-style token
  collateralFactor: 750000000000000000n, // 75%
  liquidationThreshold: 850000000000000000n, // 85%
  liquidationIncentive: 1100000000000000000n, // 110%
  borrowCap: 0n, // 0 = no cap
  supplyCap: 0n, // 0 = no cap
  isActive: true,
  isFrozen: false,
  isPaused: false,
}
```

## Security Considerations

### Safe Practices
1. **Health Factor Monitoring**: Always maintain health factor > 1.3
2. **Risk Diversification**: Don't put all collateral in one asset
3. **Market Conditions**: Monitor utilization rates and liquidity
4. **Emergency Procedures**: Have liquidation mitigation strategies ready
5. **Smart Contract Risks**: Understand protocol-specific risks

### Automated Safety Features
- Pre-transaction health factor checks
- Borrow amount optimization
- Utilization rate monitoring
- Liquidation risk alerts
- Emergency action recommendations

## Testing

### Unit Tests Structure

```typescript
describe('TakaraProtocolWrapper', () => {
  describe('supply operations', () => {
    it('should supply assets successfully');
    it('should handle supply cap exceeded');
    it('should validate asset support');
  });
  
  describe('borrow operations', () => {
    it('should borrow against collateral');
    it('should prevent unhealthy borrows');
    it('should handle insufficient liquidity');
  });
  
  describe('risk management', () => {
    it('should calculate liquidation risk correctly');
    it('should optimize borrow amounts');
    it('should assess position health');
  });
});
```

### Integration Tests

```typescript
describe('LendingManager Integration', () => {
  it('should compare protocols correctly');
  it('should route to optimal protocol');
  it('should aggregate positions across protocols');
  it('should handle cross-protocol health monitoring');
});
```

## Troubleshooting

### Common Issues

1. **Transaction Failures**
   - Check gas limits and network congestion
   - Verify asset support and market status
   - Ensure sufficient allowances

2. **Health Factor Issues**
   - Monitor collateral value changes
   - Consider asset price volatility
   - Implement automated rebalancing

3. **Rate Comparison Errors**
   - Check network connectivity
   - Verify contract addresses
   - Handle temporary oracle failures

4. **Position Synchronization**
   - Account for block confirmation delays
   - Implement proper error recovery
   - Monitor transaction status

## Performance Optimization

### Caching Strategies
- Cache protocol configurations
- Batch multiple data requests
- Implement smart refresh logic

### Gas Optimization
- Batch operations when possible
- Use optimal gas price strategies
- Implement transaction retry logic

## Roadmap

### Future Enhancements
- [ ] Flash loan integration
- [ ] Automated yield farming strategies
- [ ] Cross-chain lending support
- [ ] Advanced liquidation protection
- [ ] AI-powered risk management
- [ ] Governance token integration

## Support

For technical support and questions:
- Review the example implementations
- Check the comprehensive error types
- Refer to the Sei Network documentation
- Contact the development team

## License

This integration is provided under the MIT License. See LICENSE file for details.