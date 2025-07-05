import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, Mail } from 'lucide-react'
import { logger } from '@lib/logger'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string
}

export class RootErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `seiron-${Date.now().toString(36)}`
    return {
      hasError: true,
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log critical error
    logger.error('Critical application error:', {
      errorId: this.state.errorId,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    })

    this.setState({ errorInfo })

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { 
      //   contexts: { 
      //     react: errorInfo,
      //     errorId: this.state.errorId 
      //   } 
      // })
    }
  }

  handleReload = () => {
    // Clear any cached state before reloading
    try {
      sessionStorage.clear()
      localStorage.setItem('last_error_reload', Date.now().toString())
    } catch (e) {
      // Ignore storage errors
    }
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            {/* Dragon-themed error header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-red-600 blur-xl opacity-50 animate-pulse"></div>
                  <div className="relative bg-gradient-to-br from-red-900 to-red-950 p-6 rounded-full">
                    <AlertTriangle className="h-16 w-16 text-red-400" />
                  </div>
                </div>
              </div>
              
              <h1 className="text-4xl font-bold text-red-100 mb-2">
                The Dragon Has Fallen
              </h1>
              
              <p className="text-xl text-gray-400">
                Seiron encountered a critical error
              </p>
            </div>

            {/* Error details card */}
            <div className="bg-gray-900 rounded-lg shadow-2xl border border-red-800 overflow-hidden">
              <div className="bg-gradient-to-r from-red-900/20 to-orange-900/20 px-6 py-4 border-b border-red-800">
                <h2 className="text-lg font-semibold text-red-100">
                  What happened?
                </h2>
              </div>
              
              <div className="p-6">
                <p className="text-gray-300 mb-4">
                  An unexpected error occurred that prevented the application from continuing. 
                  This has been logged and our team will investigate.
                </p>

                {/* Error details in development */}
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <div className="mb-6 space-y-3">
                    <div className="p-4 bg-gray-800 rounded border border-gray-700">
                      <h3 className="text-sm font-semibold text-red-400 mb-2">
                        Error Message:
                      </h3>
                      <p className="text-sm font-mono text-gray-300 break-words">
                        {this.state.error.message}
                      </p>
                    </div>
                    
                    <details className="p-4 bg-gray-800 rounded border border-gray-700">
                      <summary className="text-sm font-semibold text-gray-400 cursor-pointer hover:text-gray-300">
                        Stack Trace
                      </summary>
                      <pre className="mt-3 text-xs font-mono text-gray-500 overflow-auto max-h-48">
                        {this.state.error.stack}
                      </pre>
                    </details>

                    {this.state.errorInfo && (
                      <details className="p-4 bg-gray-800 rounded border border-gray-700">
                        <summary className="text-sm font-semibold text-gray-400 cursor-pointer hover:text-gray-300">
                          Component Stack
                        </summary>
                        <pre className="mt-3 text-xs font-mono text-gray-500 overflow-auto max-h-48">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={this.handleReload}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                  >
                    <RefreshCw className="h-5 w-5" />
                    Reload Application
                  </button>
                  
                  <button
                    onClick={() => window.location.href = '/'}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-100 rounded-lg transition-colors font-medium"
                  >
                    <Home className="h-5 w-5" />
                    Go to Home
                  </button>
                </div>

                {/* Error ID */}
                <div className="mt-6 pt-4 border-t border-gray-800">
                  <p className="text-xs text-gray-500 text-center">
                    Error ID: <code className="font-mono bg-gray-800 px-2 py-1 rounded">
                      {this.state.errorId}
                    </code>
                  </p>
                </div>
              </div>
            </div>

            {/* Support info */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                If this problem persists, please contact support with the error ID above.
              </p>
              <a 
                href="mailto:support@seiron.app?subject=Error%20Report"
                className="inline-flex items-center gap-2 mt-2 text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                <Mail className="h-4 w-4" />
                support@seiron.app
              </a>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}