# Liquidity Module

This module manages liquidity provision on DragonSwap and other Sei DEXs.

## Components

- **DEX Connector**: Interfaces with DragonSwap contracts
- **Pool Analyzer**: Evaluates pool performance and opportunities
- **Range Manager**: Manages concentrated liquidity positions
- **IL Calculator**: Monitors and predicts impermanent loss

## Key Features

- Automated liquidity provision
- Concentrated liquidity optimization
- Dynamic range adjustments
- Fee collection and reinvestment
- Impermanent loss mitigation

## Supported DEXs

- **DragonSwap**: Primary DEX for liquidity provision
- Future: Additional Sei DEXs

## Usage

```typescript
import { LiquidityManager } from './LiquidityManager';

const lpManager = new LiquidityManager({
  dex: 'dragonswap',
  slippageTolerance: 0.01,
  autoRebalance: true
});

await lpManager.addLiquidity({
  tokenA: 'SEI',
  tokenB: 'USDC',
  amountA: 1000,
  amountB: 500,
  priceRange: { min: 0.45, max: 0.65 }
});
```