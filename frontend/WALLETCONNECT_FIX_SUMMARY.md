# WalletConnect Core Multiple Initialization Fix

## Problem
The application was showing the warning:
```
WalletConnect Core is already initialized, skipping init
```

This was occurring because:
1. Privy internally uses WalletConnect
2. React.StrictMode in development causes components to mount twice
3. No mechanism existed to prevent duplicate initialization

## Solution Implemented

### 1. Created WalletConnectManager (`utils/walletConnectManager.ts`)
- Singleton pattern to ensure only one instance
- Console warning/error filters to suppress duplicate initialization warnings
- Proper cleanup for hot module replacement
- Thread-safe initialization with promise handling

### 2. Created WalletConnectProvider (`components/wallet/WalletConnectProvider.tsx`)
- React context provider for WalletConnect state
- Manages initialization lifecycle
- Provides hooks for components to check initialization status

### 3. Updated Application Structure
- Modified `main.tsx` to initialize WalletConnectManager early
- Wrapped PrivyProvider with WalletConnectProvider in both `main.tsx` and `providers.tsx`
- Ensured console filters are active before any WalletConnect code runs

## How It Works

1. **Early Initialization**: The WalletConnectManager is initialized in `main.tsx` before React renders
2. **Console Filtering**: Warnings about duplicate initialization are filtered and logged to debug instead
3. **Singleton Pattern**: Ensures only one manager instance exists, preventing duplicate initialization
4. **Provider Wrapper**: WalletConnectProvider wraps PrivyProvider to manage the initialization lifecycle

## Coinbase Smart Wallet Compatibility

The system already handles Coinbase Smart Wallet incompatibility with Sei Network (chain 1329):

1. **Wallet Compatibility Configuration** (`utils/walletCompatibility.ts`):
   - Coinbase is marked as unsupported for Sei Network
   - Clear error messages explain the incompatibility
   - Recommends using MetaMask or WalletConnect instead

2. **Privy Configuration** (`config/privy.ts`):
   - Explicitly excludes Coinbase Smart Wallet from wallet list
   - Filters out all Coinbase wallet variants

3. **Wagmi Configuration** (`config/wagmi.ts`):
   - Only includes MetaMask and injected wallet connectors
   - WalletConnect has been removed to prevent issues

## Testing

Run the tests with:
```bash
npm test -- walletConnectManager
```

## Verification

1. Start the development server: `npm run dev`
2. Open the browser console
3. You should no longer see "WalletConnect Core is already initialized" warnings
4. Debug messages will show filter activity: `[WalletConnect] Suppressed warning: ...`

## Notes

- The solution is backwards compatible
- Works in both development and production
- Handles React.StrictMode properly
- Includes cleanup for hot module replacement
- Does not interfere with Privy's internal WalletConnect usage