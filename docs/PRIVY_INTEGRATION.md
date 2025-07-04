# Privy Wallet Integration Guide

This guide explains how Seiron integrates Privy as the wallet manager and how protocol wrappers have been updated to work with frontend wallet signing.

## Overview

Seiron now uses Privy for wallet management, replacing the previous wagmi setup. This provides:
- Better user experience with email and social logins
- Embedded wallets for users without crypto wallets
- Seamless integration with existing wallets
- Full support for Sei Network (chain ID 1329)

## Setup

### 1. Environment Variables

Copy `.env.example` to `.env.local` and fill in your Privy credentials:

```bash
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
NEXT_PUBLIC_PRIVY_CLIENT_ID=your_privy_client_id_here
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here # Optional
```

### 2. Privy Configuration

The Privy configuration is located in `frontend/config/privy.ts`:

```typescript
export const privyConfig = {
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID || '',
  clientId: process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID || '',
  config: {
    appearance: {
      theme: 'dark',
      accentColor: '#ef4444', // Dragon Ball theme red
    },
    loginMethods: ['email', 'wallet', 'google', 'discord', 'twitter'],
    defaultChain: seiMainnet,
    supportedChains: [seiMainnet],
  },
}
```

## Frontend Components

### WalletConnectButton

The main wallet connection UI component:

```typescript
import { WalletConnectButton } from '@/components/wallet/WalletConnectButton'

// Usage
<WalletConnectButton />
```

Features:
- Shows "Power Up Wallet" when disconnected
- Displays wallet address and balance when connected
- Dropdown with wallet details and disconnect option
- Dragon Ball Z themed animations

### TransactionModal

Updated to work with Privy for transaction signing:

```typescript
<TransactionModal
  isOpen={isOpen}
  onClose={handleClose}
  transaction={transactionDetails}
  onApprove={(txId, txHash) => handleApprove(txId, txHash)}
  onReject={(txId) => handleReject(txId)}
/>
```

## Hooks

### useWalletOperations

Core hook for wallet interactions:

```typescript
const {
  isConnected,
  address,
  walletClient,
  publicClient,
  prepareTransaction,
  sendTransaction,
  signMessage,
  signTypedData,
  waitForTransaction,
} = useWalletOperations()
```

### useProtocolOperations

Hook for interacting with DeFi protocols:

```typescript
const {
  isConnected,
  address,
  pendingTransactions,
  getSwapQuote,
  prepareSwap,
  executeTransaction,
  rejectTransaction,
} = useProtocolOperations()
```

## Protocol Wrapper Updates

### Frontend Protocol Wrappers

Protocol wrappers have been updated to prepare transactions for frontend signing instead of using private keys:

```typescript
// Old approach (backend with private keys)
const walletClient = createWalletClient({
  account: privateKeyToAccount(PRIVATE_KEY),
  // ...
})
const hash = await walletClient.writeContract({...})

// New approach (frontend preparation)
const preparation = await protocolWrapper.prepareSwapTransaction(request)
// Returns transaction data for frontend to sign
```

### Example: SymphonyProtocolWrapperFrontend

The new frontend wrapper prepares transactions:

```typescript
export interface PreparedTransaction {
  to: Address;
  data: `0x${string}`;
  value?: bigint;
  gasLimit?: bigint;
}

export interface TransactionPreparation {
  transaction: PreparedTransaction;
  metadata: {
    type: 'swap' | 'approve' | 'add_liquidity' | 'remove_liquidity';
    protocol: string;
    description: string;
    riskLevel: 'low' | 'medium' | 'high';
    // ... other metadata
  };
}
```

## Migration Guide

### For Frontend Developers

1. **Replace wagmi hooks with Privy hooks:**
   ```typescript
   // Old
   import { useAccount } from 'wagmi'
   
   // New
   import { useAccount } from '@privy-io/wagmi'
   ```

2. **Use Privy auth hooks:**
   ```typescript
   import { usePrivy, useWallets } from '@privy-io/react-auth'
   
   const { login, logout, authenticated } = usePrivy()
   const { wallets } = useWallets()
   ```

3. **Update transaction flows:**
   ```typescript
   // Prepare transaction with protocol wrapper
   const txData = await prepareSwap(swapRequest)
   
   // Show in TransactionModal for user approval
   // User approves -> execute with wallet
   const hash = await executeTransaction(txData.id)
   ```

### For Backend Developers

1. **Create frontend versions of protocol wrappers:**
   - Remove `WalletClient` dependencies
   - Return prepared transaction data instead of executing
   - Keep all validation and business logic

2. **Update API endpoints:**
   - Return transaction preparation data
   - Don't execute transactions on backend
   - Validate and simulate only

## Security Considerations

1. **Non-custodial:** Users maintain full control of their funds
2. **Transaction validation:** All transactions are validated before signing
3. **Risk assessment:** Each transaction includes risk level metadata
4. **User approval:** All transactions require explicit user approval

## Best Practices

1. **Always validate transactions** before presenting to users
2. **Show clear transaction details** including amounts, tokens, and fees
3. **Include risk warnings** for high-risk operations
4. **Handle errors gracefully** with user-friendly messages
5. **Test thoroughly** on testnet before mainnet deployment

## Troubleshooting

### Common Issues

1. **"Wallet not connected" error**
   - Ensure user is authenticated with Privy
   - Check that wallet is connected to correct chain

2. **Transaction failures**
   - Verify sufficient balance for gas
   - Check token allowances
   - Ensure correct network

3. **Privy not loading**
   - Verify environment variables are set
   - Check Privy app configuration
   - Ensure app ID matches your Privy dashboard

## Resources

- [Privy Documentation](https://docs.privy.io)
- [Sei Network Docs](https://docs.sei.io)
- [Viem Documentation](https://viem.sh)