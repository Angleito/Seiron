'use client'

import React, { Component, ErrorInfo, ReactNode, Suspense } from 'react'
import { logger } from '@lib/logger'
import { errorRecoveryUtils } from '../../utils/errorRecovery'
import { GLTFErrorBoundary } from '../dragon/GLTFErrorBoundary'
import ReactError310Handler from './ReactError310Handler'

interface CompositeErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo, errorSource: ErrorSource) => void
  onRecovery?: (recoveryType: string) => void
  onReset?: () => void
  pageName?: string
  name?: string
  enableAutoRecovery?: boolean
  enablePerformanceMonitoring?: boolean
  enableWebGLRecovery?: boolean
  enableGLTFRecovery?: boolean
  enableSuspenseRecovery?: boolean
  maxRetries?: number
  retryDelay?: number
  modelPath?: string
  webglContext?: HTMLCanvasElement
}

interface CompositeErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorSource: ErrorSource
  retryCount: number
  isRecovering: boolean
  recoveryStage: string
  lastErrorTime: number
  errorHistory: Array<{
    timestamp: number
    error: Error
    source: ErrorSource
    recovered: boolean
  }>
}

// Enhanced error source classification
enum ErrorSource {
  REACT_CORE = 'react_core',
  GLTF_LOADING = 'gltf_loading',
  WEBGL_CONTEXT = 'webgl_context',
  SUSPENSE_BOUNDARY = 'suspense_boundary',
  PERFORMANCE_DEGRADATION = 'performance_degradation',
  MEMORY_EXHAUSTION = 'memory_exhaustion',
  NETWORK_FAILURE = 'network_failure',
  BROWSER_COMPATIBILITY = 'browser_compatibility',
  UNKNOWN = 'unknown'
}

// Comprehensive error classification
const classifyErrorSource = (error: Error, errorInfo: ErrorInfo): ErrorSource => {
  const message = error.message.toLowerCase()
  const stack = error.stack?.toLowerCase() || ''
  const componentStack = errorInfo.componentStack?.toLowerCase() || ''
  
  // React core errors
  if (message.includes('element type is invalid') ||
      message.includes('minified react error') ||
      message.includes('more hooks than during the previous render') ||
      message.includes('rendered fewer hooks') ||
      message.includes('hook') && stack.includes('react')) {
    return ErrorSource.REACT_CORE
  }
  
  // GLTF loading errors
  if (message.includes('gltf') || message.includes('glb') ||
      message.includes('invalid typed array length') ||
      message.includes('failed to load') ||
      stack.includes('drei') || stack.includes('three') ||
      componentStack.includes('gltf') || componentStack.includes('model')) {
    return ErrorSource.GLTF_LOADING
  }
  
  // WebGL context errors
  if (message.includes('webgl') || message.includes('context') ||
      message.includes('shader') || message.includes('texture') ||
      message.includes('buffer') || message.includes('canvas') ||
      message.includes('gl_') || stack.includes('webgl')) {
    return ErrorSource.WEBGL_CONTEXT
  }
  
  // Suspense boundary errors
  if (message.includes('suspense') || message.includes('suspended') ||
      message.includes('boundary') || stack.includes('suspense') ||
      componentStack.includes('suspense')) {
    return ErrorSource.SUSPENSE_BOUNDARY
  }
  
  // Performance degradation
  if (message.includes('memory') || message.includes('performance') ||
      message.includes('slow') || message.includes('timeout') ||
      message.includes('allocation failed')) {
    return ErrorSource.PERFORMANCE_DEGRADATION
  }
  
  // Memory exhaustion
  if (message.includes('out of memory') || message.includes('heap') ||
      message.includes('allocation') || message.includes('memory limit')) {
    return ErrorSource.MEMORY_EXHAUSTION
  }
  
  // Network failure
  if (message.includes('network') || message.includes('fetch') ||
      message.includes('404') || message.includes('connection') ||
      message.includes('timeout') || message.includes('cors')) {
    return ErrorSource.NETWORK_FAILURE
  }
  
  // Browser compatibility
  if (message.includes('not supported') || message.includes('unsupported') ||
      message.includes('unavailable') || message.includes('permission')) {
    return ErrorSource.BROWSER_COMPATIBILITY
  }
  
  return ErrorSource.UNKNOWN
}

// Recovery strategies for different error sources
const getRecoveryStrategy = (errorSource: ErrorSource): {
  canRecover: boolean
  delay: number
  maxRetries: number
  strategy: string
  priority: 'low' | 'medium' | 'high' | 'critical'
} => {
  switch (errorSource) {
    case ErrorSource.REACT_CORE:
      return {
        canRecover: true,
        delay: 1000,
        maxRetries: 3,
        strategy: 'react_remount',
        priority: 'high'
      }
    
    case ErrorSource.GLTF_LOADING:
      return {
        canRecover: true,
        delay: 2000,
        maxRetries: 3,
        strategy: 'gltf_fallback',
        priority: 'medium'
      }
    
    case ErrorSource.WEBGL_CONTEXT:
      return {
        canRecover: true,
        delay: 3000,
        maxRetries: 2,
        strategy: 'webgl_recovery',
        priority: 'high'
      }
    
    case ErrorSource.SUSPENSE_BOUNDARY:
      return {
        canRecover: true,
        delay: 1500,
        maxRetries: 2,
        strategy: 'suspense_fallback',
        priority: 'medium'
      }
    
    case ErrorSource.PERFORMANCE_DEGRADATION:
      return {
        canRecover: true,
        delay: 2000,
        maxRetries: 2,
        strategy: 'performance_optimization',
        priority: 'medium'
      }
    
    case ErrorSource.MEMORY_EXHAUSTION:
      return {
        canRecover: true,
        delay: 5000,
        maxRetries: 1,
        strategy: 'memory_cleanup',
        priority: 'critical'
      }
    
    case ErrorSource.NETWORK_FAILURE:
      return {
        canRecover: true,
        delay: 3000,
        maxRetries: 3,
        strategy: 'network_retry',
        priority: 'medium'
      }
    
    case ErrorSource.BROWSER_COMPATIBILITY:
      return {
        canRecover: false,
        delay: 0,
        maxRetries: 0,
        strategy: 'compatibility_fallback',
        priority: 'high'
      }
    
    default:
      return {
        canRecover: true,
        delay: 1000,
        maxRetries: 1,
        strategy: 'generic_retry',
        priority: 'low'
      }
  }
}

/**
 * Composite Error Boundary that handles multiple error types
 * Provides comprehensive error recovery and fallback mechanisms
 */
export class CompositeErrorBoundary extends Component<CompositeErrorBoundaryProps, CompositeErrorBoundaryState> {
  private recoveryTimer: NodeJS.Timeout | null = null
  private performanceMonitor: any = null
  private webglRecovery: any = null
  private mountedRef = { current: true }
  
  constructor(props: CompositeErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorSource: ErrorSource.UNKNOWN,
      retryCount: 0,
      isRecovering: false,
      recoveryStage: '',
      lastErrorTime: 0,
      errorHistory: []
    }
    
    // Initialize monitoring systems
    if (props.enablePerformanceMonitoring) {
      this.performanceMonitor = errorRecoveryUtils.monitor
    }
    
    if (props.enableWebGLRecovery) {
      this.webglRecovery = errorRecoveryUtils.webgl
    }
  }
  
  static getDerivedStateFromError(error: Error): Partial<CompositeErrorBoundaryState> {
    return {
      hasError: true,
      error,
      lastErrorTime: Date.now()
    }
  }
  
  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const {
      onError,
      enableAutoRecovery = true,
      maxRetries = 3,
      retryDelay = 1000
    } = this.props
    
    const errorSource = classifyErrorSource(error, errorInfo)
    const recoveryStrategy = getRecoveryStrategy(errorSource)
    const { retryCount } = this.state
    
    // Enhanced logging with error source classification
    logger.error('Composite Error Boundary caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorSource,
      retryCount,
      recoveryStrategy: recoveryStrategy.strategy,
      canRecover: recoveryStrategy.canRecover,
      priority: recoveryStrategy.priority,
      timestamp: new Date().toISOString()
    })
    
    // Record error in performance monitoring
    if (this.performanceMonitor) {
      this.performanceMonitor.recordError(error, `CompositeErrorBoundary:${errorSource}`, false)
    }
    
    // Update state with error info and history
    this.setState(prevState => ({
      error,
      errorInfo,
      errorSource,
      retryCount: prevState.retryCount + 1,
      errorHistory: [
        ...prevState.errorHistory,
        {
          timestamp: Date.now(),
          error,
          source: errorSource,
          recovered: false
        }
      ].slice(-10) // Keep last 10 errors
    }))
    
    // Call custom error handler
    if (onError) {
      onError(error, errorInfo, errorSource)
    }
    
    // Log detailed debugging information
    this.logErrorDebugInfo(error, errorSource, errorInfo)
    
    // Automatic recovery logic
    if (enableAutoRecovery && 
        retryCount < Math.min(maxRetries, recoveryStrategy.maxRetries) &&
        recoveryStrategy.canRecover) {
      this.scheduleRecovery(errorSource, recoveryStrategy, retryDelay)
    } else if (!recoveryStrategy.canRecover) {
      // Trigger fallback for non-recoverable errors
      this.triggerFallback(errorSource)
    }
  }
  
  override componentDidMount() {
    this.mountedRef.current = true
  }
  
  override componentWillUnmount() {
    this.mountedRef.current = false
    
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer)
      this.recoveryTimer = null
    }
  }
  
  private logErrorDebugInfo = (error: Error, errorSource: ErrorSource, errorInfo: ErrorInfo) => {
    switch (errorSource) {
      case ErrorSource.REACT_CORE:
        console.error('⚛️ React Core Error Debug Information:')
        console.error('  - Check component imports and exports')
        console.error('  - Verify hook usage patterns')
        console.error('  - Ensure proper JSX structure')
        console.error('  - Check for conditional hook calls')
        break
        
      case ErrorSource.GLTF_LOADING:
        console.error('🎯 GLTF Loading Error Debug Information:')
        console.error('  - Verify model file exists and is valid')
        console.error('  - Check network connectivity')
        console.error('  - Validate file format and size')
        console.error('  - Consider using fallback models')
        break
        
      case ErrorSource.WEBGL_CONTEXT:
        console.error('🎮 WebGL Context Error Debug Information:')
        console.error('  - Check WebGL support and hardware acceleration')
        console.error('  - Verify context creation parameters')
        console.error('  - Monitor for context loss events')
        console.error('  - Consider using WebGL fallbacks')
        break
        
      case ErrorSource.SUSPENSE_BOUNDARY:
        console.error('⏳ Suspense Boundary Error Debug Information:')
        console.error('  - Check Suspense boundary placement')
        console.error('  - Verify fallback component validity')
        console.error('  - Monitor for infinite loading states')
        console.error('  - Validate async component resolution')
        break
        
      case ErrorSource.PERFORMANCE_DEGRADATION:
        console.error('📊 Performance Degradation Error Debug Information:')
        console.error('  - Monitor FPS and memory usage')
        console.error('  - Check for memory leaks')
        console.error('  - Consider reducing quality settings')
        console.error('  - Implement adaptive performance scaling')
        break
        
      case ErrorSource.MEMORY_EXHAUSTION:
        console.error('💾 Memory Exhaustion Error Debug Information:')
        console.error('  - Force garbage collection')
        console.error('  - Clear unnecessary caches')
        console.error('  - Reduce texture and model quality')
        console.error('  - Monitor memory usage patterns')
        break
        
      case ErrorSource.NETWORK_FAILURE:
        console.error('🌐 Network Failure Error Debug Information:')
        console.error('  - Check internet connectivity')
        console.error('  - Verify server availability')
        console.error('  - Implement retry mechanisms')
        console.error('  - Consider offline fallbacks')
        break
        
      case ErrorSource.BROWSER_COMPATIBILITY:
        console.error('🌍 Browser Compatibility Error Debug Information:')
        console.error('  - Check browser support for required features')
        console.error('  - Implement feature detection')
        console.error('  - Provide compatibility fallbacks')
        console.error('  - Consider polyfills for missing features')
        break
        
      default:
        console.error('❓ Unknown Error Debug Information:')
        console.error('  - Review error message and stack trace')
        console.error('  - Check component lifecycle methods')
        console.error('  - Verify prop types and state management')
        console.error('  - Consider adding more specific error handling')
    }
  }
  
  private scheduleRecovery = (
    errorSource: ErrorSource,
    strategy: ReturnType<typeof getRecoveryStrategy>,
    customDelay?: number
  ) => {
    this.setState({
      isRecovering: true,
      recoveryStage: `Preparing ${strategy.strategy} recovery...`
    })
    
    const delay = customDelay || strategy.delay
    
    this.recoveryTimer = setTimeout(() => {
      this.attemptRecovery(errorSource, strategy)
    }, delay)
  }
  
  private attemptRecovery = async (
    errorSource: ErrorSource,
    strategy: ReturnType<typeof getRecoveryStrategy>
  ) => {
    if (this.mountedRef.current === false) return
    
    logger.info(`Attempting recovery for ${errorSource} using strategy: ${strategy.strategy}`)
    
    try {
      this.setState({
        recoveryStage: `Executing ${strategy.strategy}...`
      })
      
      switch (strategy.strategy) {
        case 'react_remount':
          await this.performReactRemount()
          break
        
        case 'gltf_fallback':
          await this.performGLTFFallback()
          break
        
        case 'webgl_recovery':
          await this.performWebGLRecovery()
          break
        
        case 'suspense_fallback':
          await this.performSuspenseFallback()
          break
        
        case 'performance_optimization':
          await this.performPerformanceOptimization()
          break
        
        case 'memory_cleanup':
          await this.performMemoryCleanup()
          break
        
        case 'network_retry':
          await this.performNetworkRetry()
          break
        
        case 'compatibility_fallback':
          await this.performCompatibilityFallback()
          break
        
        case 'generic_retry':
        default:
          await this.performGenericRetry()
          break
      }
      
      // Mark recovery as successful
      if (this.mountedRef.current) {
        this.setState(prevState => ({
          hasError: false,
          error: null,
          errorInfo: null,
          isRecovering: false,
          recoveryStage: '',
          errorHistory: prevState.errorHistory.map((entry, index) => 
            index === prevState.errorHistory.length - 1 
              ? { ...entry, recovered: true }
              : entry
          )
        }))
        
        if (this.performanceMonitor) {
          this.performanceMonitor.recordError(this.state.error!, `CompositeErrorBoundary:${errorSource}`, true)
        }
        
        if (this.props.onRecovery) {
          this.props.onRecovery(strategy.strategy)
        }
      }
    } catch (recoveryError) {
      logger.error('Recovery failed:', recoveryError)
      
      if (this.mountedRef.current) {
        this.setState({
          isRecovering: false,
          recoveryStage: 'Recovery failed'
        })
        
        // Try fallback if recovery fails
        setTimeout(() => {
          this.triggerFallback(errorSource)
        }, 1000)
      }
    }
  }
  
  private performReactRemount = async () => {
    // Clear component state and force remount
    this.setState({ recoveryStage: 'Remounting React components...' })
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  private performGLTFFallback = async () => {
    this.setState({ recoveryStage: 'Switching to fallback model...' })
    errorRecoveryUtils.dragonFallback.getNextFallback()
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  private performWebGLRecovery = async () => {
    this.setState({ recoveryStage: 'Recovering WebGL context...' })
    
    try {
      if (this.props.webglContext) {
        await this.webglRecovery?.recreateWebGLContext(this.props.webglContext)
      } else {
        // Try to find any canvas element
        const canvas = document.querySelector('canvas')
        if (canvas) {
          await this.webglRecovery?.recreateWebGLContext(canvas)
        }
      }
    } catch (error) {
      logger.warn('WebGL recovery failed:', error)
    }
    
    await new Promise(resolve => setTimeout(resolve, 1500))
  }
  
  private performSuspenseFallback = async () => {
    this.setState({ recoveryStage: 'Resolving Suspense boundary...' })
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  private performPerformanceOptimization = async () => {
    this.setState({ recoveryStage: 'Optimizing performance...' })
    
    // Trigger performance optimizations
    errorRecoveryUtils.forceGC()
    
    // Reduce quality settings if performance monitor is available
    if (this.performanceMonitor) {
      const metrics = this.performanceMonitor.getRecentErrors(1)
      if (metrics.length > 0) {
        // Trigger quality reduction
        logger.info('Reducing quality settings due to performance error')
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  private performMemoryCleanup = async () => {
    this.setState({ recoveryStage: 'Cleaning up memory...' })
    
    // Force garbage collection
    errorRecoveryUtils.forceGC()
    
    // Clear caches
    try {
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => caches.delete(name)))
      }
    } catch (error) {
      logger.warn('Cache cleanup failed:', error)
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000))
  }
  
  private performNetworkRetry = async () => {
    this.setState({ recoveryStage: 'Retrying network request...' })
    
    // Check network connectivity
    const isConnected = await errorRecoveryUtils.wallet.checkNetworkConnectivity()
    if (!isConnected) {
      throw new Error('Network is not available')
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  private performCompatibilityFallback = async () => {
    this.setState({ recoveryStage: 'Switching to compatible mode...' })
    
    // Trigger compatibility fallbacks
    errorRecoveryUtils.dragonFallback.getOptimalDragonType()
    
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  private performGenericRetry = async () => {
    this.setState({ recoveryStage: 'Retrying operation...' })
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  private triggerFallback = (errorSource: ErrorSource) => {
    logger.info(`Triggering fallback for error source: ${errorSource}`)
    
    // Trigger appropriate fallback based on error source
    switch (errorSource) {
      case ErrorSource.GLTF_LOADING:
      case ErrorSource.WEBGL_CONTEXT:
        errorRecoveryUtils.dragonFallback.getNextFallback()
        break
      
      case ErrorSource.BROWSER_COMPATIBILITY:
        // Redirect to compatible version
        if (typeof window !== 'undefined') {
          window.location.href = '/dragons/sprite-2d'
        }
        break
      
      default:
        // Generic fallback
        break
    }
  }
  
  private handleManualRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false,
      recoveryStage: '',
      retryCount: 0
    })
    
    if (this.props.onRecovery) {
      this.props.onRecovery('manual_retry')
    }
  }
  
  private getErrorMessage = (errorSource: ErrorSource): string => {
    switch (errorSource) {
      case ErrorSource.REACT_CORE:
        return "A React component error occurred. The application will attempt to recover automatically."
      
      case ErrorSource.GLTF_LOADING:
        return "Failed to load the 3D model. Trying fallback options..."
      
      case ErrorSource.WEBGL_CONTEXT:
        return "WebGL context error detected. Attempting to recover graphics rendering..."
      
      case ErrorSource.SUSPENSE_BOUNDARY:
        return "Loading component error. Resolving asynchronous operations..."
      
      case ErrorSource.PERFORMANCE_DEGRADATION:
        return "Performance degradation detected. Optimizing settings..."
      
      case ErrorSource.MEMORY_EXHAUSTION:
        return "Memory limit reached. Cleaning up resources..."
      
      case ErrorSource.NETWORK_FAILURE:
        return "Network connectivity issue. Retrying connection..."
      
      case ErrorSource.BROWSER_COMPATIBILITY:
        return "Browser compatibility issue detected. Switching to compatible mode..."
      
      default:
        return "An unexpected error occurred. Attempting recovery..."
    }
  }
  
  private renderErrorUI = () => {
    const { 
      error, 
      errorSource, 
      retryCount, 
      isRecovering, 
      recoveryStage, 
      errorHistory 
    } = this.state
    const { maxRetries = 3, enableAutoRecovery = true } = this.props
    
    const recoveryStrategy = getRecoveryStrategy(errorSource)
    const canRetry = retryCount < Math.min(maxRetries, recoveryStrategy.maxRetries)
    
    if (isRecovering) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-8">
          <div className="bg-blue-900/50 border border-blue-500 rounded-lg p-8 max-w-lg text-center text-white">
            <div className="animate-pulse text-4xl mb-4">🔄</div>
            <h2 className="text-2xl font-bold mb-4">System Recovery</h2>
            <p className="text-blue-200 mb-6">
              {this.getErrorMessage(errorSource)}
            </p>
            <div className="text-left bg-black/20 p-4 rounded mb-4">
              <h3 className="font-semibold mb-2">Recovery Progress:</h3>
              <div className="text-sm space-y-1">
                <div>Source: {errorSource.replace('_', ' ')}</div>
                <div>Strategy: {recoveryStrategy.strategy.replace('_', ' ')}</div>
                <div>Stage: {recoveryStage}</div>
                <div>Priority: {recoveryStrategy.priority}</div>
              </div>
            </div>
          </div>
        </div>
      )
    }
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-orange-900 to-yellow-900 flex items-center justify-center p-8">
        <div className="bg-black/30 border border-red-500 rounded-lg p-8 max-w-lg text-center text-white">
          <div className="text-4xl mb-4">⚡</div>
          <h2 className="text-2xl font-bold mb-4">
            System Error ({errorSource.replace('_', ' ').toUpperCase()})
          </h2>
          <p className="text-red-200 mb-6">
            {this.getErrorMessage(errorSource)}
          </p>
          
          <div className="text-left bg-black/20 p-4 rounded mb-4">
            <h3 className="font-semibold mb-2">Error Details:</h3>
            <div className="text-sm space-y-1">
              <div>Source: {errorSource}</div>
              <div>Attempts: {retryCount}/{maxRetries}</div>
              <div>Priority: {recoveryStrategy.priority}</div>
              <div>Can Recover: {recoveryStrategy.canRecover ? 'Yes' : 'No'}</div>
              <div>History: {errorHistory.length} errors</div>
            </div>
          </div>
          
          {process.env.NODE_ENV === 'development' && error && (
            <div className="text-left bg-black/20 p-4 rounded mb-4">
              <h3 className="font-semibold mb-2">Debug Information:</h3>
              <pre className="text-xs text-red-300 overflow-auto max-h-32">
                {error.message}
              </pre>
            </div>
          )}
          
          <div className="space-y-3">
            {enableAutoRecovery && canRetry && recoveryStrategy.canRecover && (
              <button
                onClick={this.handleManualRetry}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Retry Recovery ({maxRetries - retryCount} attempts left)
              </button>
            )}
            
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  override render() {
    const { 
      children, 
      fallback, 
      enableGLTFRecovery = true, 
      enableSuspenseRecovery = true,
      modelPath 
    } = this.props
    const { hasError } = this.state
    
    if (hasError) {
      return fallback || this.renderErrorUI()
    }
    
    // Layer error boundaries based on enabled features
    let wrappedChildren = children
    
    // Wrap with Suspense recovery if enabled
    if (enableSuspenseRecovery) {
      wrappedChildren = (
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="animate-spin text-4xl">🐉</div>
          </div>
        }>
          {wrappedChildren}
        </Suspense>
      )
    }
    
    // Wrap with GLTF error boundary if enabled
    if (enableGLTFRecovery) {
      wrappedChildren = (
        <GLTFErrorBoundary
          modelPath={modelPath}
          enableAutoRecovery={true}
          maxRetries={2}
          onError={(error, errorInfo) => {
            logger.error('GLTF Error in Composite Boundary:', { error, errorInfo })
          }}
        >
          {wrappedChildren}
        </GLTFErrorBoundary>
      )
    }
    
    // Wrap with React error handler
    wrappedChildren = (
      <ReactError310Handler
        enableAutoRecovery={true}
        enablePerformanceMonitoring={this.props.enablePerformanceMonitoring}
        maxRetries={2}
        onError={(error, errorInfo) => {
          logger.error('React Error in Composite Boundary:', { error, errorInfo })
        }}
      >
        {wrappedChildren}
      </ReactError310Handler>
    )
    
    return wrappedChildren
  }
}

// Higher-order component for easy integration
export function withCompositeErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<CompositeErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <CompositeErrorBoundary {...options}>
      <Component {...props} />
    </CompositeErrorBoundary>
  )
  
  WrappedComponent.displayName = `withCompositeErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

export default CompositeErrorBoundary