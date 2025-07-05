# WalletContext

A functional wallet context implementation using state machine pattern, fp-ts, and TypeScript discriminated unions.

## Features

- **State Machine Pattern**: Wallet states are modeled as a discriminated union (Disconnected, Connecting, Connected, Error)
- **fp-ts Integration**: Uses Option type for nullable values and functional composition
- **Pure Reducer**: State transitions are handled by a pure reducer function with pattern matching
- **LocalStorage Persistence**: Wallet state is persisted and restored from localStorage
- **Analytics Events**: Emits analytics events on state changes
- **TypeScript Safety**: Full type safety with discriminated unions
- **Privy Integration**: Seamlessly integrates with existing Privy wallet system

## Installation

The WalletContext is already integrated into the application through the providers. No additional setup needed.

## Usage

### Basic Usage

```tsx
import { useWallet } from '@/contexts/WalletContext'

function MyComponent() {
  const { state, connect, disconnect, isConnected, address } = useWallet()
  
  // Pattern match on state
  switch (state.type) {
    case 'Disconnected':
      return <button onClick={connect}>Connect</button>
    case 'Connecting':
      return <div>Connecting...</div>
    case 'Connected':
      return <div>Connected to {state.address}</div>
    case 'Error':
      return <div>Error: {state.error}</div>
  }
}
```

### Using fp-ts Options

```tsx
import { useWallet } from '@/contexts/WalletContext'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'

function AddressDisplay() {
  const { address } = useWallet()
  
  const formattedAddress = pipe(
    address,
    O.map(addr => `${addr.slice(0, 6)}...${addr.slice(-4)}`),
    O.getOrElse(() => 'Not connected')
  )
  
  return <span>{formattedAddress}</span>
}
```

### Guard Components

```tsx
import { useWallet } from '@/contexts/WalletContext'

function ProtectedContent({ children }: { children: React.ReactNode }) {
  const { state, connect } = useWallet()
  
  if (state.type !== 'Connected') {
    return (
      <div>
        <p>Please connect your wallet</p>
        <button onClick={connect}>Connect</button>
      </div>
    )
  }
  
  return <>{children}</>
}
```

## State Types

```typescript
type WalletState =
  | { type: 'Disconnected' }
  | { type: 'Connecting' }
  | { type: 'Connected'; address: string; chainId: number }
  | { type: 'Error'; error: string }
```

## API Reference

### useWallet Hook

Returns the wallet context with the following properties:

- `state: WalletState` - Current wallet state
- `connect: () => Promise<void>` - Connect wallet function
- `disconnect: () => Promise<void>` - Disconnect wallet function
- `isConnecting: boolean` - Whether wallet is currently connecting
- `isConnected: boolean` - Whether wallet is connected
- `address: Option<string>` - Wallet address as fp-ts Option
- `chainId: Option<number>` - Chain ID as fp-ts Option

### Utility Functions

- `isConnected(state: WalletState): boolean` - Type guard for connected state
- `isError(state: WalletState): boolean` - Type guard for error state
- `getAddress(state: WalletState): Option<string>` - Extract address as Option
- `getChainId(state: WalletState): Option<number>` - Extract chain ID as Option

## Analytics Events

The WalletContext emits the following analytics events:

- `wallet_connected` - When wallet successfully connects
- `wallet_disconnected` - When wallet disconnects
- `wallet_error` - When an error occurs
- `chain_changed` - When the chain changes
- `account_changed` - When the account changes

Listen for events:
```typescript
window.addEventListener('wallet-analytics', (event: CustomEvent) => {
  console.log('Analytics event:', event.detail)
})
```

## Testing

Run tests with:
```bash
npm test contexts/__tests__/WalletContext.test.tsx
```

The test suite covers:
- State transitions
- LocalStorage persistence
- Analytics events
- Error handling
- Integration with Privy/Wagmi
- Utility functions
- Edge cases

## Examples

See `WalletContext.example.tsx` for complete examples including:
- Basic wallet connection UI
- Custom hooks using the context
- Guard components
- fp-ts usage patterns