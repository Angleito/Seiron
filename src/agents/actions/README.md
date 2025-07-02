# Agent Actions for DeFi Protocols

This directory contains the implementation of DeFi protocol actions for lending and liquidity operations on the Sei Network.

## Overview

The agent actions provide a high-level interface for interacting with:
- **Yei Finance**: Lending protocol for supplying, borrowing, and managing collateralized positions
- **DragonSwap**: Automated Market Maker (AMM) for providing liquidity and token swaps

## Directory Structure

```
actions/
├── lending/          # Yei Finance lending actions
│   └── index.ts     # Deposit, withdraw, borrow, repay operations
├── liquidity/       # DragonSwap liquidity actions
│   └── index.ts     # Add/remove liquidity, swap, collect fees
├── common/          # Shared utilities
│   ├── web3.ts      # Web3 provider and signer management
│   ├── utils.ts     # Helper functions for gas, formatting, etc.
│   └── abis.ts      # Smart contract ABI definitions
├── examples/        # Usage examples
│   └── usage.ts     # Comprehensive examples
└── index.ts         # Main export file
```

## Lending Actions

### deposit
Supply assets to Yei Finance to earn interest.

```typescript
const result = await deposit({
  agentId: 'agent-1',
  walletAddress: '0x...',
  parameters: {
    asset: '0x...', // Token address
    amount: '1000', // Amount to deposit
    onBehalfOf: '0x...', // Optional: deposit for another address
    referralCode: 0 // Optional: referral code
  }
});
```

### withdraw
Remove supplied assets from the lending pool.

```typescript
const result = await withdraw({
  agentId: 'agent-1',
  walletAddress: '0x...',
  parameters: {
    asset: '0x...', // Token address
    amount: '500', // Amount to withdraw or 'max'
    to: '0x...' // Optional: withdraw to different address
  }
});
```

### borrow
Take a loan against deposited collateral.

```typescript
const result = await borrow({
  agentId: 'agent-1',
  walletAddress: '0x...',
  parameters: {
    asset: '0x...', // Token to borrow
    amount: '100', // Amount to borrow
    interestRateMode: 'variable', // 'stable' or 'variable'
    referralCode: 0 // Optional
  }
});
```

### repay
Pay back borrowed assets.

```typescript
const result = await repay({
  agentId: 'agent-1',
  walletAddress: '0x...',
  parameters: {
    asset: '0x...', // Token to repay
    amount: '100', // Amount or 'max' to repay all
    interestRateMode: 'variable', // Must match borrow mode
    onBehalfOf: '0x...' // Optional: repay for another user
  }
});
```

### getHealthFactor
Check the health factor of a position.

```typescript
const result = await getHealthFactor({
  agentId: 'agent-1',
  walletAddress: '0x...',
  parameters: {}
});
```

### monitorPosition
Continuously monitor position health with alerts.

```typescript
const result = await monitorPosition({
  agentId: 'agent-1',
  walletAddress: '0x...',
  parameters: {
    threshold: 1.5, // Alert when health factor drops below
    interval: 60000 // Check every minute
  }
});
```

## Liquidity Actions

### addLiquidity
Provide liquidity to a DragonSwap pool.

```typescript
const result = await addLiquidity({
  agentId: 'agent-1',
  walletAddress: '0x...',
  parameters: {
    token0: '0x...', // First token address
    token1: '0x...', // Second token address
    fee: 3000, // Fee tier (500, 3000, or 10000)
    amount0Desired: '1000', // Token0 amount
    amount1Desired: '500', // Token1 amount
    tickLower: -60000, // Lower price bound
    tickUpper: 60000, // Upper price bound
    deadline: 1234567890 // Optional: transaction deadline
  }
});
```

### removeLiquidity
Withdraw liquidity from a position.

```typescript
const result = await removeLiquidity({
  agentId: 'agent-1',
  walletAddress: '0x...',
  parameters: {
    positionId: '123', // NFT position ID
    liquidity: '1000000', // Amount or 'max'
    amount0Min: '900', // Minimum token0 to receive
    amount1Min: '450' // Minimum token1 to receive
  }
});
```

### swap
Execute a token swap.

```typescript
const result = await swap({
  agentId: 'agent-1',
  walletAddress: '0x...',
  parameters: {
    tokenIn: '0x...', // Token to swap from
    tokenOut: '0x...', // Token to swap to
    amountIn: '100', // Amount to swap
    amountOutMinimum: '95', // Minimum to receive
    fee: 3000 // Pool fee tier
  }
});
```

### collectFees
Collect accumulated trading fees from a position.

```typescript
const result = await collectFees({
  agentId: 'agent-1',
  walletAddress: '0x...',
  parameters: {
    positionId: '123', // NFT position ID
    amount0Max: '1000', // Max token0 to collect
    amount1Max: '500' // Max token1 to collect
  }
});
```

## Error Handling

All actions return a `TaskEither` type from fp-ts, allowing for functional error handling:

```typescript
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';

const result = await deposit(context)();

if (E.isRight(result)) {
  console.log('Success:', result.right.message);
  console.log('Data:', result.right.data);
} else {
  console.error('Error:', result.left.message);
  console.error('Details:', result.left.details);
}
```

## Composing Actions

Actions can be composed using fp-ts for complex operations:

```typescript
const composedOperation = pipe(
  getHealthFactor(context),
  TE.chain((health) => {
    if (parseFloat(health.data.healthFactor) < 1.5) {
      return repay({ ...context, parameters: { amount: '100' } });
    }
    return TE.right(health);
  }),
  TE.chain(() => deposit({ ...context, parameters: { amount: '1000' } }))
);
```

## Gas Estimation

All actions include automatic gas estimation with safety margins:
- Estimates are calculated before transactions
- 10-20% buffer added for safety
- Failed estimations fall back to reasonable defaults

## Transaction Monitoring

Actions support transaction monitoring:
- Wait for confirmations
- Timeout protection
- Receipt parsing for events

## Environment Configuration

Required environment variables:

```bash
# Sei Network RPC
SEI_RPC_URL=https://rpc.sei-apis.com

# Agent private keys (for automated agents)
AGENT_PRIVATE_KEY=0x...
PRIVATE_KEY_0X1234...=0x...
```

## Contract Addresses

Current contract addresses (testnet):

```typescript
// Yei Finance
LENDING_POOL: '0x1234567890123456789012345678901234567890'
POOL_DATA_PROVIDER: '0x2345678901234567890123456789012345678901'

// DragonSwap
POSITION_MANAGER: '0x9012345678901234567890123456789012345678'
ROUTER: '0x8901234567890123456789012345678901234567'
```

## Security Considerations

1. **Private Key Management**: Never commit private keys. Use environment variables.
2. **Slippage Protection**: Always set reasonable slippage tolerances.
3. **Health Factor Monitoring**: Monitor positions to avoid liquidation.
4. **Gas Price Management**: Use appropriate gas pricing for network conditions.
5. **Transaction Validation**: Validate all parameters before execution.

## Testing

Run the examples:

```bash
npm run test:actions
```

Or directly:

```bash
ts-node src/agents/actions/examples/usage.ts
```

## Integration with Agents

Actions are designed to be used by agent implementations:

```typescript
class MyLendingAgent extends BaseAgent {
  async executeLendingStrategy() {
    const context = {
      agentId: this.id,
      walletAddress: this.wallet,
      parameters: { /* ... */ }
    };
    
    const result = await deposit(context)();
    // Handle result...
  }
}
```

## Future Enhancements

- [ ] Multi-protocol aggregation
- [ ] Optimal route finding for swaps
- [ ] Automated rebalancing strategies
- [ ] Flash loan integration
- [ ] Cross-chain operations
- [ ] MEV protection