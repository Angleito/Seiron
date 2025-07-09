# Enhanced Error Boundaries Documentation

This directory contains React error boundary components for gracefully handling errors throughout the Seiron application, with specialized error recovery mechanisms for WebGL, wallet connections, voice systems, and more.

## Overview

Error boundaries are React components that catch JavaScript errors anywhere in their child component tree, log those errors, and display a fallback UI instead of the component tree that crashed. Our enhanced system includes:

- **Specialized Error Boundaries**: WebGL, Wallet, Voice, and Dragon-specific error handling
- **Progressive Fallback Systems**: Automatic degradation (3D → 2D → ASCII)
- **Error Recovery Mechanisms**: Automatic retry with exponential backoff
- **Error Monitoring**: Real-time error tracking and statistics
- **Dragon Ball Z Theming**: Immersive error messages with power level indicators

## Components

### Core Error Boundaries

#### 1. `ErrorBoundary` (Base Component)

The generic error boundary component that can be used anywhere in the application.

```tsx
import { ErrorBoundary } from '@/components/error-boundaries'

<ErrorBoundary
  name="MyComponent"
  fallback={<CustomErrorUI />}
  onError={(error, errorInfo) => console.log(error)}
>
  <YourComponent />
</ErrorBoundary>
```

**Props:**
- `name?: string` - Name of the component/section for error messages
- `fallback?: ReactNode` - Custom fallback UI to display on error
- `onError?: (error: Error, errorInfo: ErrorInfo) => void` - Callback when error occurs

#### 2. `DragonBallErrorBoundary`

Dragon Ball Z themed error boundary with power level indicators and auto-recovery.

```tsx
import { DragonBallErrorBoundary } from '@/components/error-boundaries'

<DragonBallErrorBoundary
  name="Chat System"
  level="feature"
  enableDragonAnimation={true}
>
  <ChatInterface />
</DragonBallErrorBoundary>
```

**Props:**
- `level: 'component' | 'feature' | 'page' | 'app'` - Error severity level
- `enableDragonAnimation?: boolean` - Show dragon animations
- Auto-recovery for component-level errors

### Specialized Error Boundaries

#### 3. `WebGLErrorBoundary`

Handles WebGL context loss and 3D graphics errors with progressive fallback.

```tsx
import { WebGLErrorBoundary, DragonWebGLErrorBoundary } from '@/components/error-boundaries'

<WebGLErrorBoundary
  enableAutoRecovery={true}
  enableContextLossRecovery={true}
  maxRetries={3}
>
  <Dragon3DComponent />
</WebGLErrorBoundary>

// Or use the Dragon-themed version
<DragonWebGLErrorBoundary>
  <Dragon3DComponent />
</DragonWebGLErrorBoundary>
```

**Features:**
- WebGL context loss detection and recovery
- Hardware acceleration detection
- Progressive fallback (3D → 2D → ASCII)
- Memory cleanup on errors
- Automatic retry with exponential backoff

#### 4. `WalletErrorBoundary`

Handles wallet connection errors with retry mechanisms and network detection.

```tsx
import { WalletErrorBoundary, DragonWalletErrorBoundary } from '@/components/error-boundaries'

<WalletErrorBoundary
  enableAutoRecovery={true}
  maxRetries={3}
  onWalletReconnect={() => attemptReconnection()}
>
  <WalletInterface />
</WalletErrorBoundary>

// Or use the Dragon-themed version
<DragonWalletErrorBoundary>
  <WalletInterface />
</DragonWalletErrorBoundary>
```

**Features:**
- Connection retry with exponential backoff
- Wallet availability detection
- Network error handling
- User rejection recovery
- Installation guidance

#### 5. `VoiceErrorBoundary`

Handles voice system errors with contextual troubleshooting.

```tsx
import { VoiceErrorBoundary, SpeechRecognitionErrorBoundary, TTSErrorBoundary } from '@/components/error-boundaries'

<VoiceErrorBoundary onReset={() => resetVoiceSystem()}>
  <VoiceInterface />
</VoiceErrorBoundary>

// Specialized boundaries
<SpeechRecognitionErrorBoundary onRecovery={() => restartSpeechRecognition()}>
  <SpeechComponent />
</SpeechRecognitionErrorBoundary>

<TTSErrorBoundary onRecovery={() => restartTTS()}>
  <TTSComponent />
</TTSErrorBoundary>
```

**Features:**
- Error type classification (microphone, TTS, network, etc.)
- Contextual troubleshooting steps
- Permission request retry
- Browser compatibility checking

### Error Recovery Utilities

#### 6. `errorRecoveryUtils`

Comprehensive error recovery utilities for common scenarios.

```tsx
import { errorRecoveryUtils } from '@/components/error-boundaries'

// Retry with exponential backoff
const result = await errorRecoveryUtils.retryAsync(async () => {
  return await riskyOperation()
}, { maxRetries: 3, retryDelay: 1000 })

// WebGL recovery
const webglRecovery = errorRecoveryUtils.webgl
if (webglRecovery.isWebGLSupported()) {
  // Use 3D dragon
} else {
  // Fallback to 2D
}

// Wallet recovery
const walletRecovery = errorRecoveryUtils.wallet
if (walletRecovery.isWalletAvailable()) {
  await walletRecovery.attemptReconnection(connectWallet)
}

// Dragon fallback system
const dragonFallback = errorRecoveryUtils.dragonFallback
const optimalType = dragonFallback.getOptimalDragonType()

// Error monitoring
const monitor = errorRecoveryUtils.monitor
monitor.recordError(error, 'ComponentName', recovered)
const stats = monitor.getErrorStats()
```

#### 7. `ErrorMonitoringDashboard`

Real-time error monitoring and statistics dashboard.

```tsx
import { ErrorMonitoringDashboard, useErrorMonitoring } from '@/components/error-boundaries'

// Dashboard component
<ErrorMonitoringDashboard
  enabled={true}
  position="bottom-right"
  compact={false}
/>

// Hook for error monitoring
function MyComponent() {
  const { errorStats, recordError, clearErrors } = useErrorMonitoring()
  
  const handleError = (error: Error) => {
    recordError(error, 'MyComponent', false)
  }
  
  return (
    <div>
      <p>Total Errors: {errorStats.totalErrors}</p>
      <p>Recovered: {errorStats.recoveredErrors}</p>
      <button onClick={clearErrors}>Clear</button>
    </div>
  )
}
```

## Utilities and HOCs

### Higher-Order Components

#### `withErrorBoundary` HOC

Higher-order component for wrapping components with error boundaries.

```tsx
const SafeComponent = withErrorBoundary(YourComponent, {
  name: 'YourComponent',
  fallback: <ErrorFallback />
})
```

#### `withWebGLErrorBoundary` HOC

Specialized HOC for WebGL components.

```tsx
const Safe3DComponent = withWebGLErrorBoundary(Dragon3DComponent, {
  enableAutoRecovery: true,
  maxRetries: 3
})
```

#### `withWalletErrorBoundary` HOC

Specialized HOC for wallet components.

```tsx
const SafeWalletComponent = withWalletErrorBoundary(WalletComponent, {
  enableAutoRecovery: true
})
```

### Hooks

#### `useErrorHandler` Hook

Hook for throwing errors that will be caught by the nearest error boundary.

```tsx
function MyComponent() {
  const throwError = useErrorHandler()
  
  const handleError = (error: Error) => {
    throwError(error) // Will be caught by error boundary
  }
}
```

#### `useErrorMonitoring` Hook

Hook for error monitoring and statistics.

```tsx
function MyComponent() {
  const { errorStats, recordError, clearErrors } = useErrorMonitoring()
  
  return (
    <div>
      <p>Errors: {errorStats.totalErrors}</p>
      <p>Recovery Rate: {errorStats.recoveredErrors / errorStats.totalErrors * 100}%</p>
    </div>
  )
}
```

### Factory Functions

#### `createErrorBoundary`

Factory function for creating themed error boundaries.

```tsx
const MyErrorBoundary = createErrorBoundary('MyComponent', 'feature')

<MyErrorBoundary>
  <MyComponent />
</MyErrorBoundary>
```

#### `createMonitoredErrorBoundary`

Factory function for creating error boundaries with monitoring.

```tsx
const MonitoredBoundary = createMonitoredErrorBoundary('MyComponent', 'component')

<MonitoredBoundary>
  <MyComponent />
</MonitoredBoundary>
```

## Implementation Guide

### 1. Enhanced Application Structure

```
App
├── RootErrorBoundary
│   ├── ErrorMonitoringDashboard
│   └── Providers
│       └── Router
│           ├── PageErrorBoundary (Home)
│           │   └── HomePage
│           │       ├── DragonWebGLErrorBoundary
│           │       │   └── EnhancedDragonRenderer
│           │       └── DragonWalletErrorBoundary
│           │           └── WalletConnectButton
│           ├── PageErrorBoundary (Dashboard)
│           │   └── DashboardPage
│           │       ├── ChatErrorBoundary
│           │       │   └── ChatInterface
│           │       └── VoiceErrorBoundary
│           │           ├── SpeechRecognitionErrorBoundary
│           │           │   └── SpeechRecognition
│           │           └── TTSErrorBoundary
│           │               └── TextToSpeech
│           └── PageErrorBoundary (Voice)
│               └── VoiceTestPage
│                   └── VoiceErrorBoundary
│                       └── VoiceInterface
```

### 2. Best Practices

1. **Layered Error Handling**: Use multiple error boundary layers for better isolation
2. **Specialized Boundaries**: Use specific error boundaries for different error types
3. **Progressive Fallback**: Implement fallback chains (3D → 2D → ASCII)
4. **Error Recovery**: Enable automatic recovery with exponential backoff
5. **Error Monitoring**: Track errors and recovery rates
6. **User Experience**: Provide contextual error messages and recovery options
7. **Performance**: Clean up resources on errors to prevent memory leaks

### 3. Error Recovery Strategies

1. **Automatic Recovery**: Retry failed operations with exponential backoff
2. **Progressive Degradation**: Fallback to simpler alternatives (3D → 2D → ASCII)
3. **Context-Aware Recovery**: Different recovery strategies based on error type
4. **Resource Cleanup**: Properly dispose of WebGL contexts, audio contexts, etc.
5. **User Guidance**: Provide clear instructions for manual recovery
6. **Monitoring Integration**: Track error patterns and recovery success rates

### 4. Error Types and Handling

#### WebGL Errors
- Context loss detection and recovery
- Hardware acceleration checking
- Memory cleanup
- Progressive fallback to 2D/ASCII

#### Wallet Errors
- Connection retry with exponential backoff
- Network error detection
- User rejection handling
- Installation guidance

#### Voice Errors
- Permission request retry
- Browser compatibility checking
- Network error handling
- Contextual troubleshooting

## Testing

Run the error boundary tests:

```bash
# Run all error boundary tests
npm test error-boundaries

# Run specific test suites
npm test WebGLErrorBoundary
npm test WalletErrorBoundary
npm test VoiceErrorBoundary

# Test error recovery mechanisms
npm test errorRecovery
```

### Testing Error Scenarios

```tsx
// Test WebGL context loss
const canvas = document.querySelector('canvas')
const gl = canvas.getContext('webgl')
const loseContext = gl.getExtension('WEBGL_lose_context')
loseContext.loseContext()

// Test wallet connection failure
throw new Error('MetaMask not found')

// Test voice permission denial
throw new Error('Microphone permission denied')
```

## Production Considerations

1. **Error Tracking**: Integrate with error tracking services (e.g., Sentry)
2. **User Feedback**: Collect error reports from users
3. **Performance**: Error boundaries have minimal performance impact
4. **Monitoring**: Set up alerts for error boundary triggers
5. **Recovery Metrics**: Track recovery success rates
6. **Progressive Enhancement**: Gracefully degrade features when errors occur

### Production Error Handling

```tsx
// Production error reporter
const reportError = (error: Error, context: string, recovered: boolean) => {
  if (process.env.NODE_ENV === 'production') {
    // Send to error tracking service
    Sentry.captureException(error, {
      contexts: {
        errorBoundary: {
          context,
          recovered,
          timestamp: Date.now()
        }
      }
    })
  }
}

// Configure error boundaries for production
<DragonBallErrorBoundary
  name="CriticalComponent"
  level="feature"
  onError={(error, errorInfo) => {
    reportError(error, 'CriticalComponent', false)
  }}
>
  <CriticalComponent />
</DragonBallErrorBoundary>
```

## Examples

See `/components/error-boundaries/ErrorBoundaryDemo.tsx` for comprehensive usage examples including:

- WebGL error simulation and recovery
- Wallet connection error handling
- Voice system error recovery
- Error monitoring dashboard
- Progressive fallback demonstrations

## Migration Guide

To add enhanced error boundaries to existing components:

1. **Identify Error-Prone Areas**: WebGL contexts, wallet connections, voice systems
2. **Choose Appropriate Boundaries**: Use specialized boundaries for specific error types
3. **Enable Error Recovery**: Configure automatic retry and fallback mechanisms
4. **Add Error Monitoring**: Track error patterns and recovery success
5. **Test Error Scenarios**: Simulate errors to verify recovery mechanisms
6. **Monitor Production**: Set up alerts and tracking for error boundary triggers

### Migration Checklist

- [ ] Wrap 3D/WebGL components with `DragonWebGLErrorBoundary`
- [ ] Wrap wallet components with `DragonWalletErrorBoundary`
- [ ] Wrap voice components with `VoiceErrorBoundary`
- [ ] Enable error monitoring dashboard in development
- [ ] Configure error tracking for production
- [ ] Test error recovery mechanisms
- [ ] Set up error rate monitoring and alerts
- [ ] Document component-specific error handling

## Error Recovery Utilities Reference

### `errorRecoveryUtils.retryAsync`
```tsx
const result = await errorRecoveryUtils.retryAsync(operation, {
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true
})
```

### `errorRecoveryUtils.webgl`
```tsx
const webgl = errorRecoveryUtils.webgl
if (webgl.isWebGLSupported()) {
  // Use WebGL
} else {
  // Use fallback
}
```

### `errorRecoveryUtils.wallet`
```tsx
const wallet = errorRecoveryUtils.wallet
if (wallet.isWalletAvailable()) {
  await wallet.attemptReconnection(connectFunction)
}
```

### `errorRecoveryUtils.dragonFallback`
```tsx
const fallback = errorRecoveryUtils.dragonFallback
const optimalType = fallback.getOptimalDragonType()
```

### `errorRecoveryUtils.monitor`
```tsx
const monitor = errorRecoveryUtils.monitor
monitor.recordError(error, 'Component', recovered)
const stats = monitor.getErrorStats()
```