'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, MessageCircle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { logger } from '@lib/logger'

interface ProductionErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string
  showDetails: boolean
  retryCount: number
  lastErrorTime: number
  userAgent: string
}

interface ProductionErrorBoundaryProps {
  children: ReactNode
  fallback?: React.ComponentType<{
    error: Error
    errorInfo: ErrorInfo
    retry: () => void
    errorId: string
  }>
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void
  maxRetries?: number
  retryDelay?: number
  showUserReporting?: boolean
  contactEmail?: string
  supportUrl?: string
  hideErrorDetails?: boolean
}

// Production-ready error boundary with user-friendly fallbacks
export class ProductionErrorBoundary extends Component<
  ProductionErrorBoundaryProps,
  ProductionErrorBoundaryState
> {
  private retryTimer: NodeJS.Timeout | null = null

  constructor(props: ProductionErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      showDetails: false,
      retryCount: 0,
      lastErrorTime: 0,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : ''
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ProductionErrorBoundaryState> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return {
      hasError: true,
      error,
      errorId,
      lastErrorTime: Date.now()
    }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, maxRetries = 3, retryDelay = 2000 } = this.props
    const { errorId, retryCount } = this.state

    // Log error with context
    logger.error('Production Error Boundary caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId,
      retryCount,
      userAgent: this.state.userAgent,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    })

    // Update state
    this.setState(prevState => ({
      errorInfo,
      retryCount: prevState.retryCount + 1
    }))

    // Call custom error handler
    if (onError) {
      onError(error, errorInfo, errorId)
    }

    // Auto-retry for transient errors
    if (retryCount < maxRetries && this.isTransientError(error)) {
      this.scheduleRetry(retryDelay)
    }
  }

  private isTransientError = (error: Error): boolean => {
    const transientPatterns = [
      'ChunkLoadError',
      'Loading chunk',
      'Network error',
      'fetch',
      'XMLHttpRequest'
    ]
    
    return transientPatterns.some(pattern => 
      error.message.includes(pattern) || error.name.includes(pattern)
    )
  }

  private scheduleRetry = (delay: number) => {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
    }
    
    this.retryTimer = setTimeout(() => {
      this.handleRetry()
    }, delay)
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    })
  }

  private handleReportError = () => {
    const { error, errorInfo, errorId, userAgent } = this.state
    const { contactEmail, supportUrl } = this.props
    
    if (contactEmail) {
      const subject = `Seiron Error Report - ${errorId}`
      const body = `
Error ID: ${errorId}
Timestamp: ${new Date().toISOString()}
User Agent: ${userAgent}
URL: ${window.location.href}

Error Message: ${error?.message || 'Unknown error'}

Error Stack:
${error?.stack || 'No stack trace available'}

Component Stack:
${errorInfo?.componentStack || 'No component stack available'}

Please describe what you were doing when this error occurred:
[User description here]
      `.trim()
      
      window.open(`mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
    } else if (supportUrl) {
      window.open(supportUrl, '_blank')
    }
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  private handleReload = () => {
    window.location.reload()
  }

  private getErrorCategory = (error: Error): string => {
    if (error.message.includes('ChunkLoadError') || error.message.includes('Loading chunk')) {
      return 'loading'
    }
    if (error.message.includes('Network') || error.message.includes('fetch')) {
      return 'network'
    }
    if (error.message.includes('WebGL') || error.message.includes('3D')) {
      return 'graphics'
    }
    if (error.message.includes('Permission') || error.message.includes('denied')) {
      return 'permission'
    }
    return 'unknown'
  }

  private getErrorSolution = (category: string): string => {
    switch (category) {
      case 'loading':
        return 'Try refreshing the page or clearing your browser cache.'
      case 'network':
        return 'Check your internet connection and try again.'
      case 'graphics':
        return 'Try using a different browser or enable hardware acceleration.'
      case 'permission':
        return 'Check your browser permissions and try again.'
      default:
        return 'Try refreshing the page or contact support if the problem persists.'
    }
  }

  override componentWillUnmount() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
    }
  }

  private renderErrorFallback = () => {
    const { error, errorInfo, errorId, showDetails, retryCount, userAgent } = this.state
    const { 
      maxRetries = 3, 
      showUserReporting = true, 
      contactEmail, 
      supportUrl, 
      hideErrorDetails = false 
    } = this.props

    if (!error) return null

    const errorCategory = this.getErrorCategory(error)
    const errorSolution = this.getErrorSolution(errorCategory)
    const canRetry = retryCount < maxRetries
    const shouldShowReporting = showUserReporting && (contactEmail || supportUrl)

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-gray-800 border border-red-500/30 rounded-lg shadow-2xl">
          {/* Header */}
          <div className="bg-red-600/20 border-b border-red-500/30 p-6">
            <div className="flex items-center gap-4">
              <div className="bg-red-500/20 p-3 rounded-full">
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-red-100">
                  Oops! Something went wrong
                </h1>
                <p className="text-red-200 mt-1">
                  We're sorry for the inconvenience. The dragon encountered an unexpected error.
                </p>
              </div>
            </div>
          </div>

          {/* Error Details */}
          <div className="p-6">
            <div className="space-y-4">
              {/* Error ID */}
              <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">Error ID</span>
                  <code className="text-xs bg-gray-800 px-2 py-1 rounded text-yellow-400">
                    {errorId}
                  </code>
                </div>
              </div>

              {/* Solution */}
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <h3 className="font-semibold text-blue-100 mb-2">What you can try:</h3>
                <p className="text-blue-200 text-sm">{errorSolution}</p>
              </div>

              {/* Technical Details (Developer Mode) */}
              {!hideErrorDetails && (
                <div className="bg-gray-700/30 border border-gray-600/50 rounded-lg">
                  <button
                    onClick={() => this.setState({ showDetails: !showDetails })}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-700/20 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-300">
                      Technical Details
                    </span>
                    {showDetails ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                  
                  {showDetails && (
                    <div className="border-t border-gray-600/50 p-4">
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                            Error Message
                          </label>
                          <div className="bg-gray-800 rounded p-3 mt-1">
                            <code className="text-xs text-red-300 break-words">
                              {error.message}
                            </code>
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                            Component Stack
                          </label>
                          <div className="bg-gray-800 rounded p-3 mt-1 max-h-32 overflow-y-auto">
                            <code className="text-xs text-gray-300 whitespace-pre-wrap">
                              {errorInfo?.componentStack}
                            </code>
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                            Browser Info
                          </label>
                          <div className="bg-gray-800 rounded p-3 mt-1">
                            <code className="text-xs text-gray-300 break-words">
                              {userAgent}
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                {canRetry && (
                  <button
                    onClick={this.handleRetry}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again ({maxRetries - retryCount} attempts left)
                  </button>
                )}
                
                <button
                  onClick={this.handleReload}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload Page
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Home className="h-4 w-4" />
                  Go Home
                </button>
              </div>

              {/* User Reporting */}
              {shouldShowReporting && (
                <div className="border-t border-gray-600/50 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-200">Need help?</h3>
                      <p className="text-sm text-gray-400">
                        Report this error to get assistance
                      </p>
                    </div>
                    <button
                      onClick={this.handleReportError}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600/20 border border-green-500/50 text-green-400 rounded-lg hover:bg-green-600/30 transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Report Error
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  override render() {
    const { children, fallback } = this.props
    const { hasError, error, errorInfo, errorId } = this.state

    if (hasError) {
      if (fallback && error && errorInfo) {
        const FallbackComponent = fallback
        return <FallbackComponent error={error} errorInfo={errorInfo} retry={this.handleRetry} errorId={errorId} />
      }
      return this.renderErrorFallback()
    }

    return children
  }
}

export default ProductionErrorBoundary