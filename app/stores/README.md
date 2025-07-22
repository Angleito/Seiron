# Zustand State Management

This directory contains the Zustand state management stores for the Seiron Next.js application.

## Store Structure

### 1. **authStore.ts**
Manages user authentication, wallet connection, and Privy integration.

```typescript
const { user, isAuthenticated, connectWallet, logout } = useAuth();
```

### 2. **portfolioStore.ts**
Handles portfolio data including positions, transactions, and market data.

```typescript
const { positions, stats, fetchPortfolio } = usePortfolio();
```

### 3. **chatStore.ts**
Manages chat sessions, messages, AI state, and voice interactions.

```typescript
const { sendMessage, currentSession, voiceState } = useChat();
```

### 4. **uiStore.ts**
Controls UI state including modals, notifications, loading states, and theme.

```typescript
const { openModal, addNotification, theme, setTheme } = useUI();
```

### 5. **rootStore.ts**
Combines all stores and provides global utilities.

```typescript
const { auth, portfolio, chat, ui } = useRootStore();
```

## Usage

### Basic Store Usage

```typescript
import { useAuth, usePortfolio, useChat, useUI } from '@/app/hooks';

function MyComponent() {
  const { user, login } = useAuth();
  const { positions } = usePortfolio();
  const { sendMessage } = useChat();
  const { theme, setTheme } = useUI();
  
  // Use store state and actions
}
```

### SSR Safety

All stores are SSR-safe. The `authStore` and `chatStore` use persistence only on the client side:

```typescript
// Stores check for window object before using localStorage
export const useAuthStore = typeof window !== 'undefined'
  ? create(persist(...)) // Client version with persistence
  : create(...);         // Server version without persistence
```

### Notifications

Use the notification helpers for consistent user feedback:

```typescript
const notify = useNotifications();

notify.success('Operation completed!');
notify.error('Something went wrong', 'Please try again');
notify.warning('Low balance', 'You need more funds');
notify.info('New feature available');
```

### Modals

Use the modal hook for type-safe modal management:

```typescript
const walletModal = useModal('wallet-connect');

// Open modal with data
walletModal.open({ provider: 'metamask' });

// Check if open
if (walletModal.isOpen) {
  // Access modal data
  console.log(walletModal.data);
}

// Close modal
walletModal.close();
```

### Loading States

Manage loading states with the loading helper:

```typescript
const [isLoading, setLoading] = useLoadingState('myOperation');

// Or use withLoading wrapper
const { withLoading } = useUI();

await withLoading('fetchData', async () => {
  // This operation will automatically set loading state
  await fetchSomeData();
});
```

## Best Practices

1. **Use hooks instead of direct store access**
   ```typescript
   // Good
   import { useAuth } from '@/app/hooks';
   
   // Avoid
   import { useAuthStore } from '@/app/stores/authStore';
   ```

2. **Handle errors with notifications**
   ```typescript
   try {
     await someOperation();
     notify.success('Success!');
   } catch (error) {
     notify.error('Failed', error.message);
   }
   ```

3. **Use TypeScript types**
   ```typescript
   import type { User, Position, Message } from '@/app/hooks';
   ```

4. **Reset stores on logout**
   ```typescript
   import { resetAllStores } from '@/app/hooks';
   
   const handleLogout = () => {
     resetAllStores();
     // Additional cleanup
   };
   ```

## Integration with Existing Code

The stores are designed to work with the existing API structure:

- Auth API: `/api/auth/login`
- Portfolio API: `/api/portfolio`
- Chat API: `/api/chat`

The stores handle API calls internally and manage loading/error states automatically.