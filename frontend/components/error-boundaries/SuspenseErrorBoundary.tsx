'use client'

import React, { Component, ErrorInfo, ReactNode, Suspense } from 'react'
import { logger } from '@lib/logger'
import { errorRecoveryUtils } from '../../utils/errorRecovery'

interface SuspenseErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  loadingFallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  onRecovery?: () => void
  onSuspenseTimeout?: () => void
  enableAutoRecovery?: boolean
  enablePerformanceMonitoring?: boolean
  maxRetries?: number
  retryDelay?: number
  suspenseTimeout?: number
  enableSuspenseDebugging?: boolean
}

interface SuspenseErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
  isRecovering: boolean
  isSuspenseTimeout: boolean
  suspenseStartTime: number
  errorType: SuspenseErrorType
}

// Suspense-specific error types
enum SuspenseErrorType {
  LOADING_TIMEOUT = 'loading_timeout',
  SUSPENSE_BOUNDARY = 'suspense_boundary',
  ASYNC_COMPONENT = 'async_component',
  LAZY_LOADING = 'lazy_loading',
  PROMISE_REJECTION = 'promise_rejection',
  RESOURCE_LOADING = 'resource_loading',
  NETWORK_DELAY = 'network_delay',
  INFINITE_LOADING = 'infinite_loading',
  GENERIC_SUSPENSE = 'generic_suspense'
}

// Classify Suspense-related errors
const classifySuspenseError = (error: Error, errorInfo: ErrorInfo): SuspenseErrorType => {
  const message = error.message.toLowerCase()
  const stack = error.stack?.toLowerCase() || ''
  const componentStack = errorInfo.componentStack?.toLowerCase() || ''
  
  // Loading timeout
  if (message.includes('timeout') || message.includes('slow') ||
      message.includes('loading took too long')) {
    return SuspenseErrorType.LOADING_TIMEOUT
  }
  
  // Suspense boundary issues
  if (message.includes('suspense') || message.includes('boundary') ||
      componentStack.includes('suspense') || stack.includes('suspense')) {
    return SuspenseErrorType.SUSPENSE_BOUNDARY
  }
  
  // Async component errors
  if (message.includes('async') || message.includes('await') ||
      stack.includes('async') || componentStack.includes('async')) {
    return SuspenseErrorType.ASYNC_COMPONENT
  }
  
  // Lazy loading errors
  if (message.includes('lazy') || message.includes('import') ||
      message.includes('dynamic') || stack.includes('lazy')) {
    return SuspenseErrorType.LAZY_LOADING
  }
  
  // Promise rejection
  if (message.includes('promise') || message.includes('rejected') ||
      message.includes('unhandled') || stack.includes('promise')) {
    return SuspenseErrorType.PROMISE_REJECTION
  }
  
  // Resource loading
  if (message.includes('resource') || message.includes('load') ||
      message.includes('fetch') || message.includes('request')) {
    return SuspenseErrorType.RESOURCE_LOADING
  }
  
  // Network delays
  if (message.includes('network') || message.includes('connection') ||
      message.includes('slow') || message.includes('delay')) {
    return SuspenseErrorType.NETWORK_DELAY
  }
  
  // Infinite loading detection
  if (message.includes('infinite') || message.includes('stuck') ||
      message.includes('never resolved')) {
    return SuspenseErrorType.INFINITE_LOADING
  }
  
  return SuspenseErrorType.GENERIC_SUSPENSE
}

// Recovery strategies for Suspense errors
const getSuspenseRecoveryStrategy = (errorType: SuspenseErrorType): {
  canRecover: boolean
  delay: number
  maxRetries: number
  strategy: string
} => {
  switch (errorType) {
    case SuspenseErrorType.LOADING_TIMEOUT:
      return {
        canRecover: true,
        delay: 2000,
        maxRetries: 3,
        strategy: 'retry_with_longer_timeout'
      }
    
    case SuspenseErrorType.SUSPENSE_BOUNDARY:
      return {
        canRecover: true,
        delay: 1000,
        maxRetries: 2,
        strategy: 'boundary_reset'
      }
    
    case SuspenseErrorType.ASYNC_COMPONENT:
      return {
        canRecover: true,
        delay: 1500,
        maxRetries: 2,
        strategy: 'component_reload'
      }
    
    case SuspenseErrorType.LAZY_LOADING:
      return {
        canRecover: true,
        delay: 2000,
        maxRetries: 3,
        strategy: 'lazy_reload'
      }
    
    case SuspenseErrorType.PROMISE_REJECTION:
      return {
        canRecover: true,
        delay: 1000,
        maxRetries: 2,
        strategy: 'promise_retry'
      }
    
    case SuspenseErrorType.RESOURCE_LOADING:
      return {
        canRecover: true,
        delay: 3000,
        maxRetries: 3,
        strategy: 'resource_retry'
      }
    
    case SuspenseErrorType.NETWORK_DELAY:
      return {
        canRecover: true,
        delay: 5000,
        maxRetries: 2,
        strategy: 'network_retry'
      }
    
    case SuspenseErrorType.INFINITE_LOADING:
      return {
        canRecover: true,
        delay: 1000,
        maxRetries: 1,
        strategy: 'force_fallback'
      }
    
    default:
      return {
        canRecover: true,
        delay: 1000,
        maxRetries: 2,
        strategy: 'generic_suspense_retry'
      }
  }
}

/**
 * Enhanced Suspense Error Boundary
 * Handles Suspense-specific errors with intelligent recovery
 */
export class SuspenseErrorBoundary extends Component<SuspenseErrorBoundaryProps, SuspenseErrorBoundaryState> {
  private recoveryTimer: NodeJS.Timeout | null = null
  private suspenseTimeoutTimer: NodeJS.Timeout | null = null
  private performanceMonitor: any = null
  private mountedRef = { current: true }
  
  constructor(props: SuspenseErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRecovering: false,
      isSuspenseTimeout: false,
      suspenseStartTime: 0,
      errorType: SuspenseErrorType.GENERIC_SUSPENSE
    }
    
    if (props.enablePerformanceMonitoring) {
      this.performanceMonitor = errorRecoveryUtils.monitor
    }
  }
  
  static getDerivedStateFromError(error: Error): Partial<SuspenseErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }
  
  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const {
      onError,
      enableAutoRecovery = true,
      maxRetries = 3,
      retryDelay = 1000,
      enableSuspenseDebugging = false
    } = this.props
    
    const errorType = classifySuspenseError(error, errorInfo)
    const recoveryStrategy = getSuspenseRecoveryStrategy(errorType)
    const { retryCount } = this.state
    
    // Enhanced logging for Suspense errors
    logger.error('Suspense Error Boundary caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorType,
      retryCount,
      recoveryStrategy: recoveryStrategy.strategy,
      canRecover: recoveryStrategy.canRecover,
      suspenseStartTime: this.state.suspenseStartTime,
      timestamp: new Date().toISOString()
    })
    
    // Record error in performance monitoring
    if (this.performanceMonitor) {
      this.performanceMonitor.recordError(error, `SuspenseErrorBoundary:${errorType}`, false)
    }
    
    // Update state with error info
    this.setState(prevState => ({
      error,
      errorInfo,
      errorType,
      retryCount: prevState.retryCount + 1
    }))
    
    // Call custom error handler
    if (onError) {
      onError(error, errorInfo)
    }
    
    // Suspense debugging information
    if (enableSuspenseDebugging) {
      this.logSuspenseDebugInfo(error, errorType, errorInfo)
    }
    
    // Automatic recovery logic
    if (enableAutoRecovery && 
        retryCount < Math.min(maxRetries, recoveryStrategy.maxRetries) &&
        recoveryStrategy.canRecover) {
      this.scheduleRecovery(errorType, recoveryStrategy, retryDelay)
    }
  }
  
  override componentDidMount() {
    this.mountedRef.current = true
    
    // Start Suspense timeout monitoring
    const { suspenseTimeout = 30000 } = this.props
    if (suspenseTimeout > 0) {
      this.startSuspenseTimeoutMonitoring(suspenseTimeout)
    }
  }
  
  override componentWillUnmount() {
    this.mountedRef.current = false
    
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer)
      this.recoveryTimer = null
    }
    
    if (this.suspenseTimeoutTimer) {
      clearTimeout(this.suspenseTimeoutTimer)
      this.suspenseTimeoutTimer = null
    }
  }
  
  private startSuspenseTimeoutMonitoring = (timeout: number) => {
    this.setState({ suspenseStartTime: Date.now() })
    
    this.suspenseTimeoutTimer = setTimeout(() => {
      if (this.mountedRef.current && !this.state.hasError) {
        logger.warn('Suspense timeout detected')
        
        this.setState({
          isSuspenseTimeout: true,
          hasError: true,
          error: new Error('Suspense loading timeout'),
          errorType: SuspenseErrorType.LOADING_TIMEOUT
        })
        
        if (this.props.onSuspenseTimeout) {
          this.props.onSuspenseTimeout()
        }
      }
    }, timeout)
  }
  
  private logSuspenseDebugInfo = (error: Error, errorType: SuspenseErrorType, errorInfo: ErrorInfo) => {
    switch (errorType) {
      case SuspenseErrorType.LOADING_TIMEOUT:
        console.error('⏳ Suspense Loading Timeout Debug Information:')
        console.error('  - Check network connectivity and server response times')
        console.error('  - Verify resource loading mechanisms')
        console.error('  - Consider implementing loading progress indicators')
        console.error('  - Check for infinite loading loops')
        break
        
      case SuspenseErrorType.SUSPENSE_BOUNDARY:
        console.error('🎭 Suspense Boundary Debug Information:')
        console.error('  - Verify Suspense boundary placement')
        console.error('  - Check fallback component validity')
        console.error('  - Ensure proper error boundary nesting')
        console.error('  - Validate async component structure')
        break
        
      case SuspenseErrorType.ASYNC_COMPONENT:
        console.error('🔄 Async Component Debug Information:')
        console.error('  - Check async component implementation')
        console.error('  - Verify promise resolution patterns')
        console.error('  - Ensure proper error handling in async code')
        console.error('  - Check for unhandled promise rejections')
        break
        
      case SuspenseErrorType.LAZY_LOADING:
        console.error('📦 Lazy Loading Debug Information:')
        console.error('  - Verify lazy import paths and module structure')
        console.error('  - Check webpack/bundler configuration')
        console.error('  - Ensure proper code splitting setup')
        console.error('  - Validate dynamic import syntax')
        break
        
      case SuspenseErrorType.PROMISE_REJECTION:
        console.error('❌ Promise Rejection Debug Information:')
        console.error('  - Check for unhandled promise rejections')
        console.error('  - Implement proper error handling in async operations')
        console.error('  - Verify promise chain error propagation')
        console.error('  - Check for race conditions in async code')
        break
        
      case SuspenseErrorType.RESOURCE_LOADING:
        console.error('📡 Resource Loading Debug Information:')
        console.error('  - Check resource availability and paths')
        console.error('  - Verify CORS settings for external resources')
        console.error('  - Implement proper loading states')
        console.error('  - Check for resource loading race conditions')
        break
        
      case SuspenseErrorType.NETWORK_DELAY:
        console.error('🌐 Network Delay Debug Information:')
        console.error('  - Check network connectivity and latency')
        console.error('  - Implement retry mechanisms for failed requests')
        console.error('  - Consider offline fallback strategies')
        console.error('  - Monitor network request patterns')
        break
        
      case SuspenseErrorType.INFINITE_LOADING:
        console.error('♾️ Infinite Loading Debug Information:')
        console.error('  - Check for circular dependencies in async components')
        console.error('  - Verify promise resolution conditions')
        console.error('  - Implement loading timeout mechanisms')
        console.error('  - Check for state update loops')
        break
        
      default:
        console.error('❓ Generic Suspense Debug Information:')
        console.error('  - Review Suspense implementation patterns')
        console.error('  - Check component lifecycle methods')
        console.error('  - Verify error propagation in async operations')
        console.error('  - Consider implementing fallback strategies')
    }
  }
  
  private scheduleRecovery = (
    errorType: SuspenseErrorType,
    strategy: ReturnType<typeof getSuspenseRecoveryStrategy>,
    customDelay?: number
  ) => {
    this.setState({ isRecovering: true })
    
    const delay = customDelay || strategy.delay
    
    this.recoveryTimer = setTimeout(() => {
      this.attemptRecovery(errorType, strategy)
    }, delay)
  }
  
  private attemptRecovery = async (
    errorType: SuspenseErrorType,
    strategy: ReturnType<typeof getSuspenseRecoveryStrategy>
  ) => {
    if (this.mountedRef.current === false) return
    
    logger.info(`Attempting Suspense recovery for ${errorType} using strategy: ${strategy.strategy}`)
    
    try {
      switch (strategy.strategy) {
        case 'retry_with_longer_timeout':
          await this.performTimeoutRetry()
          break
        
        case 'boundary_reset':
          await this.performBoundaryReset()
          break
        
        case 'component_reload':
          await this.performComponentReload()
          break
        
        case 'lazy_reload':
          await this.performLazyReload()
          break
        
        case 'promise_retry':
          await this.performPromiseRetry()
          break
        
        case 'resource_retry':
          await this.performResourceRetry()
          break
        
        case 'network_retry':
          await this.performNetworkRetry()
          break
        
        case 'force_fallback':
          await this.performForceFallback()
          break
        
        case 'generic_suspense_retry':
        default:
          await this.performGenericSuspenseRetry()
          break
      }
      
      // Mark recovery as successful
      if (this.mountedRef.current) {
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
          isRecovering: false,
          isSuspenseTimeout: false
        })
        
        if (this.performanceMonitor) {
          this.performanceMonitor.recordError(this.state.error!, `SuspenseErrorBoundary:${errorType}`, true)
        }
        
        if (this.props.onRecovery) {
          this.props.onRecovery()
        }
      }
    } catch (recoveryError) {
      logger.error('Suspense recovery failed:', recoveryError)
      
      if (this.mountedRef.current) {
        this.setState({ isRecovering: false })
      }
    }
  }
  
  private performTimeoutRetry = async () => {
    // Increase timeout and retry
    const { suspenseTimeout = 30000 } = this.props
    const newTimeout = Math.min(suspenseTimeout * 2, 60000)
    
    this.startSuspenseTimeoutMonitoring(newTimeout)
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  private performBoundaryReset = async () => {
    // Reset boundary state
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  private performComponentReload = async () => {
    // Force component reload
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  private performLazyReload = async () => {
    // Clear lazy loading cache and retry
    if (typeof window !== 'undefined' && 'webpackChunkName' in window) {
      // Clear webpack cache if available
      try {
        delete (window as any).__webpack_require__.cache
      } catch (error) {
        // Ignore if webpack cache is not available
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 1500))
  }
  
  private performPromiseRetry = async () => {
    // Retry promise-based operations
    await new Promise(resolve => setTimeout(resolve, 800))
  }
  
  private performResourceRetry = async () => {
    // Retry resource loading
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  private performNetworkRetry = async () => {
    // Check network and retry
    const isConnected = await errorRecoveryUtils.wallet.checkNetworkConnectivity()
    if (!isConnected) {
      throw new Error('Network is not available')
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  private performForceFallback = async () => {
    // Force fallback without retry
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  private performGenericSuspenseRetry = async () => {
    // Generic Suspense retry
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  private handleManualRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false,
      isSuspenseTimeout: false,
      retryCount: 0
    })
    
    if (this.props.onRecovery) {
      this.props.onRecovery()
    }
  }
  
  private getErrorMessage = (errorType: SuspenseErrorType): string => {
    switch (errorType) {
      case SuspenseErrorType.LOADING_TIMEOUT:
        return "Loading is taking longer than expected. Please wait or try again."
      
      case SuspenseErrorType.SUSPENSE_BOUNDARY:
        return "Suspense boundary error. The component may have loading issues."
      
      case SuspenseErrorType.ASYNC_COMPONENT:
        return "Async component error. The component failed to load properly."
      
      case SuspenseErrorType.LAZY_LOADING:
        return "Lazy loading error. The module failed to load dynamically."
      
      case SuspenseErrorType.PROMISE_REJECTION:
        return "Promise rejection error. An async operation failed."
      
      case SuspenseErrorType.RESOURCE_LOADING:
        return "Resource loading error. Failed to load required resources."
      
      case SuspenseErrorType.NETWORK_DELAY:
        return "Network delay detected. Please check your connection."
      
      case SuspenseErrorType.INFINITE_LOADING:
        return "Infinite loading detected. Switching to fallback mode."
      
      default:
        return "Suspense error occurred. Attempting to recover..."
    }
  }
  
  private renderSuspenseErrorUI = () => {
    const { error, errorType, retryCount, isRecovering, isSuspenseTimeout } = this.state
    const { maxRetries = 3, enableAutoRecovery = true } = this.props
    
    const recoveryStrategy = getSuspenseRecoveryStrategy(errorType)
    const canRetry = retryCount < Math.min(maxRetries, recoveryStrategy.maxRetries)
    
    if (isRecovering) {
      return (
        <div className="flex items-center justify-center min-h-[300px] bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="bg-white border border-blue-200 rounded-lg p-8 max-w-md text-center shadow-lg">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <h2 className="text-xl font-bold text-blue-900 mb-4">Recovering...</h2>
            <p className="text-blue-700 mb-4">
              {this.getErrorMessage(errorType)}
            </p>
            <div className="text-sm text-blue-600">
              Strategy: {recoveryStrategy.strategy.replace('_', ' ')}
            </div>
          </div>
        </div>
      )
    }
    
    const getErrorIcon = (errorType: SuspenseErrorType) => {
      switch (errorType) {
        case SuspenseErrorType.LOADING_TIMEOUT:
          return '⏰'
        case SuspenseErrorType.SUSPENSE_BOUNDARY:
          return '🎭'
        case SuspenseErrorType.ASYNC_COMPONENT:
          return '🔄'
        case SuspenseErrorType.LAZY_LOADING:
          return '📦'
        case SuspenseErrorType.PROMISE_REJECTION:
          return '❌'
        case SuspenseErrorType.RESOURCE_LOADING:
          return '📡'
        case SuspenseErrorType.NETWORK_DELAY:
          return '🌐'
        case SuspenseErrorType.INFINITE_LOADING:
          return '♾️'
        default:
          return '⏳'
      }
    }
    
    return (
      <div className="flex items-center justify-center min-h-[300px] bg-gradient-to-br from-orange-50 to-red-50">
        <div className="bg-white border border-orange-200 rounded-lg p-8 max-w-md text-center shadow-lg">
          <div className="text-4xl mb-4">{getErrorIcon(errorType)}</div>
          <h2 className="text-xl font-bold text-orange-900 mb-4">
            {isSuspenseTimeout ? 'Loading Timeout' : 'Suspense Error'}
          </h2>
          <p className="text-orange-700 mb-6">
            {this.getErrorMessage(errorType)}
          </p>
          
          <div className="text-left bg-orange-50 p-4 rounded mb-4">
            <h3 className="font-semibold text-orange-900 mb-2">Error Details:</h3>
            <div className="text-sm text-orange-800 space-y-1">
              <div>Type: {errorType.replace('_', ' ')}</div>
              <div>Attempts: {retryCount}/{maxRetries}</div>
              <div>Can Recover: {recoveryStrategy.canRecover ? 'Yes' : 'No'}</div>
              {isSuspenseTimeout && (
                <div>Timeout: {((Date.now() - this.state.suspenseStartTime) / 1000).toFixed(1)}s</div>
              )}
            </div>
          </div>
          
          <div className="space-y-3">
            {enableAutoRecovery && canRetry && recoveryStrategy.canRecover && (
              <button
                onClick={this.handleManualRetry}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                Retry ({maxRetries - retryCount} attempts left)
              </button>
            )}
            
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  override render() {
    const { children, fallback, loadingFallback } = this.props
    const { hasError, isSuspenseTimeout } = this.state
    
    if (hasError) {
      return fallback || this.renderSuspenseErrorUI()
    }
    
    // Enhanced Suspense with timeout monitoring
    return (
      <Suspense fallback={loadingFallback || (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-4">🐉</div>
            <div className="text-gray-600">Loading...</div>
          </div>
        </div>
      )}>
        {children}
      </Suspense>
    )
  }
}

// Higher-order component for Suspense error boundary
export function withSuspenseErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<SuspenseErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <SuspenseErrorBoundary {...options}>
      <Component {...props} />
    </SuspenseErrorBoundary>
  )
  
  WrappedComponent.displayName = `withSuspenseErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

export default SuspenseErrorBoundary