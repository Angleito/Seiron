import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { logger } from '@lib/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  name?: string
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { name = 'Unknown', onError } = this.props
    
    // Log error details
    logger.error(`Error in ${name} boundary:`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    })

    // Update state with error info
    this.setState({
      error,
      errorInfo
    })

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo)
    }

    // In production, you might want to send errors to an error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { contexts: { react: errorInfo } })
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  override render() {
    const { hasError, error } = this.state
    const { children, fallback, name = 'Application' } = this.props

    if (hasError) {
      // If custom fallback is provided, use it
      if (fallback) {
        return <>{fallback}</>
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-950 to-black p-4">
          <div className="max-w-md w-full bg-gray-900 rounded-lg shadow-xl border border-red-800 p-6">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-red-900/20 p-3 rounded-full">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-red-100 text-center mb-2">
              Oops! Something went wrong
            </h2>
            
            <p className="text-gray-400 text-center mb-4">
              The {name} encountered an unexpected error.
            </p>

            {/* Error details in development */}
            {process.env.NODE_ENV === 'development' && error && (
              <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-700">
                <p className="text-sm font-mono text-red-400 break-words">
                  {error.message}
                </p>
                <details className="mt-2">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                    Stack trace
                  </summary>
                  <pre className="mt-2 text-xs text-gray-600 overflow-auto max-h-32">
                    {error.stack}
                  </pre>
                </details>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
              
              <button
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Reload Page
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-700 hover:bg-gray-800 text-gray-300 rounded transition-colors"
              >
                <Home className="h-4 w-4" />
                Go to Home
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              Error ID: {Date.now().toString(36)}
            </p>
          </div>
        </div>
      )
    }

    return children
  }
}

// Convenience wrapper for async components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Hook for error handling in functional components
export function useErrorHandler() {
  return (error: Error) => {
    throw error // This will be caught by the nearest error boundary
  }
}