# Error Boundaries Documentation

This directory contains React error boundary components for gracefully handling errors throughout the Seiron application.

## Overview

Error boundaries are React components that catch JavaScript errors anywhere in their child component tree, log those errors, and display a fallback UI instead of the component tree that crashed.

## Components

### 1. `ErrorBoundary` (Base Component)

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

### 2. `RootErrorBoundary`

Used at the application root to catch critical errors. Provides a comprehensive error page with recovery options.

```tsx
<RootErrorBoundary>
  <App />
</RootErrorBoundary>
```

### 3. `PageErrorBoundary`

Wraps individual pages to provide page-specific error handling.

```tsx
<PageErrorBoundary pageName="Dashboard">
  <DashboardPage />
</PageErrorBoundary>
```

### 4. `ChatErrorBoundary`

Specialized for chat components with chat-specific recovery options.

```tsx
<ChatErrorBoundary onReset={() => resetChat()}>
  <ChatInterface />
</ChatErrorBoundary>
```

### 5. `VoiceErrorBoundary`

Handles voice interface errors gracefully, allowing users to continue with text input.

```tsx
<VoiceErrorBoundary onReset={() => disableVoice()}>
  <VoiceInterface />
</VoiceErrorBoundary>
```

### 6. `DragonErrorBoundary`

Manages dragon animation errors without crashing the entire application.

```tsx
<DragonErrorBoundary>
  <DragonAnimation />
</DragonErrorBoundary>
```

## Utilities

### `withErrorBoundary` HOC

Higher-order component for wrapping components with error boundaries.

```tsx
const SafeComponent = withErrorBoundary(YourComponent, {
  name: 'YourComponent',
  fallback: <ErrorFallback />
})
```

### `useErrorHandler` Hook

Hook for throwing errors that will be caught by the nearest error boundary.

```tsx
function MyComponent() {
  const throwError = useErrorHandler()
  
  const handleError = (error: Error) => {
    throwError(error) // Will be caught by error boundary
  }
}
```

### `useAsyncError` Hook

Specialized hook for handling async errors.

```tsx
function MyComponent() {
  const throwError = useAsyncError()
  
  const fetchData = async () => {
    try {
      await someAsyncOperation()
    } catch (error) {
      throwError(error) // Will be caught by error boundary
    }
  }
}
```

## Implementation Guide

### 1. Application Structure

```
App
├── RootErrorBoundary
│   └── Providers
│       └── Router
│           ├── PageErrorBoundary (Home)
│           │   └── HomePage
│           ├── PageErrorBoundary (Dashboard)
│           │   └── DashboardPage
│           │       ├── ChatErrorBoundary
│           │       │   └── ChatInterface
│           │       └── DragonErrorBoundary
│           │           └── DragonAnimation
│           └── PageErrorBoundary (Voice)
│               └── VoiceTestPage
│                   └── VoiceErrorBoundary
│                       └── VoiceInterface
```

### 2. Best Practices

1. **Granular Boundaries**: Place error boundaries at multiple levels for better error isolation
2. **Meaningful Names**: Always provide a `name` prop for better error messages
3. **Custom Fallbacks**: Use custom fallback UI for better UX
4. **Error Logging**: Implement proper error logging in production
5. **Recovery Actions**: Provide clear recovery actions (reload, go back, reset)

### 3. Error Recovery Strategies

1. **Component Reset**: Allow users to reset the failed component
2. **Page Reload**: Offer full page reload for critical errors
3. **Navigation**: Provide navigation options (go home, go back)
4. **Graceful Degradation**: Continue with reduced functionality where possible

## Testing

Run the error boundary tests:

```bash
npm test error-boundaries
```

## Production Considerations

1. **Error Tracking**: Integrate with error tracking services (e.g., Sentry)
2. **User Feedback**: Collect error reports from users
3. **Performance**: Error boundaries have minimal performance impact
4. **Monitoring**: Set up alerts for error boundary triggers

## Examples

See `/examples/ErrorBoundaryExample.tsx` for comprehensive usage examples.

## Migration Guide

To add error boundaries to existing components:

1. Identify critical sections that need error isolation
2. Wrap components with appropriate error boundaries
3. Add custom error handling logic if needed
4. Test error scenarios thoroughly
5. Monitor error rates in production