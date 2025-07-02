# Portfolio Management Module

This module handles overall portfolio tracking, performance monitoring, and position management.

## Components

- **Position Tracker**: Monitors all DeFi positions across protocols
- **Performance Calculator**: Tracks returns, APY, and fees
- **Balance Manager**: Manages asset balances and allocations
- **Report Generator**: Creates performance reports and analytics

## Key Features

- Real-time portfolio valuation
- Cross-protocol position aggregation
- Historical performance tracking
- Tax reporting support
- Multi-wallet management

## Position Types

- **Lending Positions**: Tracks supplied assets and earned interest
- **LP Positions**: Monitors liquidity pools and earned fees
- **Staked Assets**: Tracks staking positions and rewards
- **Idle Assets**: Monitors undeployed capital

## Usage

```typescript
import { PortfolioManager } from './PortfolioManager';

const portfolio = new PortfolioManager({
  wallets: [wallet1, wallet2],
  baseCurrency: 'USD',
  trackGas: true
});

const summary = await portfolio.getPortfolioSummary();
const performance = await portfolio.calculatePerformance('30d');
```