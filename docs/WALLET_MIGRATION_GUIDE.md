# Seiron Wallet Migration Guide

## Overview

Seiron has migrated from a private key-based system to a non-custodial web wallet integration using Privy. This ensures users maintain full control of their funds while interacting with the AI-powered portfolio management system.

## Key Changes

### 1. No More Private Keys

**Before:**
- Backend required `PRIVATE_KEY` environment variable
- AI agents could execute transactions directly
- System had custody of user funds

**After:**
- No private keys stored anywhere in the system
- Users connect their own wallets (MetaMask, Keplr, etc.)
- All transactions require explicit user approval
- True non-custodial architecture

### 2. Transaction Flow

**Before:**
```typescript
// Old flow - direct execution
const tx = await contract.swap(tokenA, tokenB, amount);
```

**After:**
```typescript
// New flow - user approval required
const txData = prepareSwapTransaction(tokenA, tokenB, amount);
await requestUserApproval(txData);
// User approves in their wallet
```

### 3. Wallet Management

- **Privy Integration**: Seamless wallet connection with social login options
- **Multiple Login Methods**: Email, Google, Discord, Twitter, or direct wallet
- **Embedded Wallets**: Users without crypto wallets get one automatically
- **Sei Network Support**: Full integration with Sei Network (chain ID 1329)

## Setup Instructions

### 1. Get Privy Credentials

1. Sign up at [https://privy.io](https://privy.io)
2. Create a new app
3. Get your App ID and Secret
4. Configure Sei Network in Privy dashboard

### 2. Update Environment Variables

Remove old wallet configuration:
```bash
# Remove these lines from .env
PRIVATE_KEY=...
WALLET_ADDRESS=...
SEI_PRIVATE_KEY=...
```

Add Privy configuration:
```bash
# Add to .env
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
PRIVY_APP_SECRET=your-privy-app-secret
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-walletconnect-id # Optional
```

### 3. Frontend Updates

The frontend now includes:
- `TransactionModal`: Shows transaction details before approval
- `TransactionConfirmation`: Handles user confirmation flow
- `RiskWarning`: Displays transaction risk assessment
- `WalletConnectButton`: Privy-powered wallet connection

### 4. Backend Updates

- All private key dependencies removed
- New confirmation API endpoints: `/api/confirm`, `/api/reject`
- WebSocket events for real-time transaction updates
- Transaction queue management for pending approvals

## For Developers

### Using the New Transaction Flow

```typescript
import { useTransactionFlow } from '@/hooks/useTransactionFlow';

function MyComponent() {
  const { execute, state } = useTransactionFlow({
    onSuccess: (receipt) => console.log('Transaction confirmed!', receipt)
  });

  const handleSwap = async () => {
    // Prepare transaction data
    const txData = {
      to: contractAddress,
      data: encodeSwapData(tokenA, tokenB, amount),
      value: 0n
    };

    // Execute - will prompt user for approval
    await execute(txData);
  };

  return (
    <button onClick={handleSwap} disabled={state.isPending}>
      {state.isPending ? 'Processing...' : 'Swap Tokens'}
    </button>
  );
}
```

### Protocol Integration

All protocol wrappers now return transaction data instead of executing:

```typescript
// Old way
const result = await symphonyWrapper.executeSwap(params);

// New way
const txData = await symphonyWrapper.prepareSwap(params);
// Send to frontend for user approval
```

## Security Benefits

1. **Non-Custodial**: Users retain full control of their funds
2. **Transparent**: All transactions visible before signing
3. **Risk Assessment**: Each transaction includes risk analysis
4. **No Key Storage**: Eliminates private key security concerns

## Migration Checklist

- [ ] Remove all private keys from environment files
- [ ] Update to latest Seiron version
- [ ] Configure Privy credentials
- [ ] Test wallet connection flow
- [ ] Verify transaction approval process
- [ ] Update any custom integrations

## Support

For questions or issues with the migration:
- Check the [Privy documentation](https://docs.privy.io)
- Review the example implementations in `/frontend/components/transactions`
- Open an issue on the Seiron GitHub repository

## Future Enhancements

- Transaction simulation before approval
- Batch transaction support
- Advanced risk scoring
- MEV protection integration
- Hardware wallet support