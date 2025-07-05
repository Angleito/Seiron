# Logging Migration Summary

This document summarizes the migration from `console.*` statements to the new logger utility across the Seiron frontend codebase.

## Logger Utility

A new logger utility has been created at `/lib/logger.ts` that provides:

- **Environment-aware logging**: Different log levels for development vs production
- **Structured logging**: Consistent formatting with timestamps and prefixes
- **Log levels**: DEBUG, INFO, WARN, ERROR, NONE
- **Additional features**: Performance timing, assertions, table logging, and grouping
- **Production logging**: Placeholder for external logging service integration (currently stores to localStorage)

## Usage

```typescript
import { logger } from '@/lib/logger'

// Instead of console.log
logger.debug('Debug message', data)

// Instead of console.info
logger.info('Info message', data)

// Instead of console.warn
logger.warn('Warning message', data)

// Instead of console.error
logger.error('Error message', error)

// Additional features
logger.time('operation')
// ... operation code
logger.timeEnd('operation')

logger.table(data)
logger.assert(condition, 'Assertion message')
```

## Configuration

The logger can be configured globally:

```typescript
import { logger, LogLevel } from '@/lib/logger'

// Set log level
logger.configure({
  level: LogLevel.WARN, // Only show warnings and errors
  enableTimestamp: true,
  enableStackTrace: false,
  prefix: '[Seiron]'
})
```

## Files Migrated

The following files have been updated to use the new logger:

### Core Components
- `/components/voice/VoiceInterface.tsx`
- `/components/chat/useChatStream.ts`
- `/components/chat/ChatStreamService.ts`
- `/components/chat/chat-interface.tsx`
- `/components/chat/VoiceEnabledChat.tsx`
- `/components/wallet/WalletConnectButton.tsx`
- `/components/providers.tsx`
- `/components/ui/LocalFontProvider.tsx`

### Dragon Components
- `/components/dragon/DragonShowcase.tsx`
- `/components/dragon/DragonInteractionDebug.tsx`
- `/components/dragon/hooks/useDragonStateMachine.ts`

### Transaction Components
- `/components/transactions/TransactionModal.tsx`
- `/components/transactions/TransactionDemo.tsx`

### Protocol Integration
- `/components/HiveInsights.tsx`
- `/components/ProtocolIntegration.tsx`
- `/components/SeiNetworkStatus.tsx`
- `/components/portfolio/portfolio-sidebar.tsx`

### Hooks
- `/hooks/useTransactionFlow.ts`
- `/hooks/usePriceFeed.ts`
- `/hooks/useWalletOperations.ts`
- `/hooks/useTransactionStatus.ts`
- `/hooks/useProtocolOperations.ts`
- `/hooks/useAnimationPerformance.ts`

### Configuration & Utilities
- `/lib/orchestrator-client.ts`
- `/contexts/WalletContext.tsx`
- `/config/privy.ts`
- `/app/api/chat/route.ts`

## Files NOT Migrated

The following files were intentionally left unchanged:

### Test Infrastructure
- `/jest.setup.js` - Test setup may need direct console access
- `/jest.visual.setup.js` - Visual test reporting
- `/__tests__/**` - Test files often need console for debugging

### Examples & Demos
- `/examples/price-feed-usage.tsx` - Demo file for developers
- `/src/pages/VoiceTestPage.tsx` - Test page
- `/app/voice-test/page.tsx` - Test page
- `/scripts/generate-qa-report.js` - Build script

## Production Considerations

In production, the logger:
- Only shows WARN and ERROR levels by default
- Stores the last 100 log entries in localStorage for debugging
- Can be integrated with external logging services (Sentry, LogRocket, etc.)

To retrieve stored logs in production:
```typescript
import { logger } from '@/lib/logger'
const storedLogs = logger.getStoredLogs()
```

## Next Steps

1. **External Logging Service**: Implement the `sendToLoggingService` method in the logger to send logs to a real logging service
2. **Log Aggregation**: Set up centralized log collection for production monitoring
3. **Performance Monitoring**: Integrate performance metrics with the logger
4. **Error Tracking**: Connect error logs to error tracking services