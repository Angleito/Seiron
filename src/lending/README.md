# Yei Finance Lending Adapter

This module provides a TypeScript adapter for interacting with the Yei Finance lending protocol on Sei Network. Yei Finance is an Aave V3 fork optimized for Sei's high-performance blockchain.

## Features

- **Full Aave V3 Compatibility**: Implements standard Aave V3 interfaces
- **Functional Programming**: Built with fp-ts for type-safe, composable operations
- **Type Safety**: Comprehensive TypeScript types for all operations
- **Error Handling**: Robust error handling with typed errors
- **Read Operations**: Query reserves, user positions, and health factors
- **Write Operations**: Supply, withdraw, borrow, and repay assets

## Installation

```bash
npm install ethers fp-ts
```

## Usage

### Basic Setup

```typescript
import { ethers } from 'ethers';
import { createYeiFinanceAdapter } from './lending';

// Initialize provider
const provider = new ethers.JsonRpcProvider('https://evm-rpc.sei-apis.com');

// For read operations
const adapter = createYeiFinanceAdapter(provider);

// For write operations
const signer = new ethers.Wallet(privateKey, provider);
const adapterWithSigner = createYeiFinanceAdapter(provider, signer);
```

### Query Reserve Data

```typescript
import * as E from 'fp-ts/Either';

// Get reserve data for an asset
const reserveData = await adapter.getReserveData('USDC');

if (E.isRight(reserveData)) {
  const data = reserveData.right;
  console.log(`Supply APY: ${data.liquidityRate}`);
  console.log(`Borrow APY: ${data.variableBorrowRate}`);
  console.log(`Available Liquidity: ${data.availableLiquidity}`);
}
```

### Check User Health Factor

```typescript
// Get user account data
const accountData = await adapter.getUserAccountData(userAddress);

if (E.isRight(accountData)) {
  const data = accountData.right;
  console.log(`Health Factor: ${data.healthFactor}`);
  console.log(`Total Collateral: ${data.totalCollateralBase}`);
  console.log(`Total Debt: ${data.totalDebtBase}`);
}
```

### Supply Assets

```typescript
// Supply 100 USDC
const supplyResult = await adapter.supply({
  asset: 'USDC',
  amount: BigInt(100) * BigInt(10 ** 6), // 100 USDC (6 decimals)
  referralCode: 0,
});

if (E.isRight(supplyResult)) {
  console.log(`Transaction: ${supplyResult.right.txHash}`);
}
```

### Borrow Assets

```typescript
// Borrow 50 USDC with variable interest rate
const borrowResult = await adapter.borrow({
  asset: 'USDC',
  amount: BigInt(50) * BigInt(10 ** 6),
  interestRateMode: 'variable',
  referralCode: 0,
});

if (E.isRight(borrowResult)) {
  console.log(`Transaction: ${borrowResult.right.txHash}`);
  console.log(`Borrow Rate: ${borrowResult.right.effectiveRate}`);
}
```

### Repay Debt

```typescript
// Repay all variable debt
const repayResult = await adapter.repay({
  asset: 'USDC',
  amount: 'max', // Repays all debt
  interestRateMode: 'variable',
});
```

## Architecture

### Core Components

1. **YeiFinanceAdapter**: Main adapter class implementing the `ILendingAdapter` interface
2. **Types**: Comprehensive type definitions for all lending operations
3. **Constants**: Protocol addresses, supported assets, and configuration

### Type System

The adapter uses functional programming patterns with fp-ts:

- `Either<Error, T>` for error handling
- `TaskEither` for async operations
- Immutable data structures
- Type-safe error types

### Supported Assets

- SEI (native token)
- USDC
- USDT
- WETH
- WBTC

## Advanced Features

### Health Factor Monitoring

```typescript
const healthData = await adapter.getHealthFactor(userAddress);

if (E.isRight(healthData)) {
  if (healthData.right.canBeLiquidated) {
    console.warn('User position can be liquidated!');
  }
}
```

### Finding Best Rates

```typescript
// Get all reserve data
const assets = await adapter.getSupportedAssets();
const reserveData = await Promise.all(
  assets.map(asset => adapter.getReserveData(asset.symbol))
);

// Find best supply rates
const bestSupplyRates = reserveData
  .filter(E.isRight)
  .map(r => r.right)
  .sort((a, b) => Number(b.liquidityRate - a.liquidityRate));
```

## Error Handling

The adapter provides typed errors for common scenarios:

- `insufficient_collateral`: Not enough collateral for borrowing
- `health_factor_too_low`: Operation would result in liquidation risk
- `asset_not_supported`: Asset not available in the protocol
- `insufficient_liquidity`: Not enough liquidity in the reserve
- `network_error`: RPC or network issues

## Configuration

Update contract addresses in `constants.ts`:

```typescript
export const YEI_FINANCE_ADDRESSES = {
  POOL: 'sei1pool...',
  POOL_DATA_PROVIDER: 'sei1dataprovider...',
  // ... other addresses
};
```

## Safety Considerations

1. **Always check health factor** before borrowing
2. **Use 'max' carefully** when withdrawing collateral
3. **Monitor liquidation thresholds** for each asset
4. **Account for gas costs** in transaction planning
5. **Test on testnet first** before mainnet operations

## Development

### Running Examples

```bash
npx ts-node src/lending/example.ts
```

### Testing

```bash
npm test
```

### Type Checking

```bash
npx tsc --noEmit
```

## License

MIT