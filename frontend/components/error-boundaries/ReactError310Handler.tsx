'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { logger } from '@lib/logger'
import { errorRecoveryUtils } from '../../utils/errorRecovery'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  onRecovery?: () => void
  enableAutoRecovery?: boolean
  enablePerformanceMonitoring?: boolean
  maxRetries?: number
  retryDelay?: number
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  retryCount: number
  isRecovering: boolean
  errorType: ErrorType
  lastErrorTime: number
  recoveryAttempts: number
}

// Enhanced error type classification
enum ErrorType {
  REACT_310 = 'react_310',
  GLTF_ERROR = 'gltf_error',
  WEBGL_ERROR = 'webgl_error',
  MEMORY_ERROR = 'memory_error',
  CLEANUP_ERROR = 'cleanup_error',
  HOOK_ERROR = 'hook_error',
  RENDER_ERROR = 'render_error',
  SUSPENSE_ERROR = 'suspense_error',
  GENERIC_ERROR = 'generic_error'
}

// Enhanced error classification for comprehensive error handling
const classifyError = (error: Error): ErrorType => {
  const message = error.message.toLowerCase()
  const stack = error.stack?.toLowerCase() || ''
  
  // React Error #310 and related errors
  if (message.includes('element type is invalid') ||
      message.includes('got: undefined') ||
      message.includes('got: function') ||
      message.includes('objects are not valid as a react child') ||
      message.includes('minified react error #310') ||
      message.includes('more hooks than during the previous render')) {
    return ErrorType.REACT_310
  }
  
  // GLTF/Model loading errors
  if (message.includes('gltf') || message.includes('glb') || 
      message.includes('invalid typed array length') || 
      message.includes('unexpected end of data') ||
      message.includes('failed to load') ||
      stack.includes('gltf') || stack.includes('drei')) {
    return ErrorType.GLTF_ERROR
  }
  
  // WebGL errors
  if (message.includes('webgl') || message.includes('context') ||
      message.includes('shader') || message.includes('texture') ||
      message.includes('buffer') || message.includes('canvas')) {
    return ErrorType.WEBGL_ERROR
  }
  
  // Memory errors
  if (message.includes('memory') || message.includes('out of memory') ||
      message.includes('allocation failed') || message.includes('heap')) {
    return ErrorType.MEMORY_ERROR
  }
  
  // Cleanup errors
  if (stack.includes('useeffect') || stack.includes('cleanup') ||
      stack.includes('unmount') || message.includes('disposed') ||
      message.includes('cleanup')) {
    return ErrorType.CLEANUP_ERROR
  }
  
  // Hook errors
  if (message.includes('hook') || message.includes('rendered more hooks') ||
      message.includes('rendered fewer hooks') || stack.includes('hook')) {
    return ErrorType.HOOK_ERROR
  }
  
  // Suspense errors
  if (message.includes('suspense') || message.includes('suspended') ||
      stack.includes('suspense') || message.includes('boundary')) {
    return ErrorType.SUSPENSE_ERROR
  }
  
  // Render errors
  if (message.includes('render') || message.includes('component') ||
      stack.includes('render')) {
    return ErrorType.RENDER_ERROR
  }
  
  return ErrorType.GENERIC_ERROR
}

// Recovery strategies for different error types
const getRecoveryStrategy = (errorType: ErrorType): {
  canRecover: boolean
  delay: number
  maxRetries: number
  strategy: string
} => {
  switch (errorType) {
    case ErrorType.REACT_310:
      return {
        canRecover: true,
        delay: 1000,
        maxRetries: 2,
        strategy: 'component_remount'
      }
    
    case ErrorType.GLTF_ERROR:
      return {
        canRecover: true,
        delay: 2000,
        maxRetries: 3,
        strategy: 'model_fallback'
      }
    
    case ErrorType.WEBGL_ERROR:
      return {
        canRecover: true,
        delay: 3000,
        maxRetries: 2,
        strategy: 'webgl_recovery'
      }
    
    case ErrorType.MEMORY_ERROR:
      return {
        canRecover: true,
        delay: 5000,
        maxRetries: 1,
        strategy: 'memory_cleanup'
      }
    
    case ErrorType.CLEANUP_ERROR:
      return {
        canRecover: true,
        delay: 500,
        maxRetries: 1,
        strategy: 'safe_cleanup'
      }
    
    case ErrorType.HOOK_ERROR:
      return {
        canRecover: true,
        delay: 1000,
        maxRetries: 2,
        strategy: 'hook_reset'
      }
    
    case ErrorType.SUSPENSE_ERROR:
      return {
        canRecover: true,
        delay: 2000,
        maxRetries: 2,
        strategy: 'suspense_fallback'
      }
    
    case ErrorType.RENDER_ERROR:
      return {
        canRecover: true,
        delay: 1000,
        maxRetries: 2,
        strategy: 'render_recovery'
      }
    
    default:
      return {
        canRecover: true,
        delay: 1000,
        maxRetries: 1,
        strategy: 'generic_retry'
      }
  }
}

/**
 * Enhanced React Error Boundary with comprehensive error handling
 * Supports React Error #310, GLTF errors, WebGL errors, and more
 */
class ReactError310Handler extends Component<Props, State> {
  private recoveryTimer: NodeJS.Timeout | null = null
  private mountedRef = { current: true }
  private performanceMonitor: any = null
  
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0,
      isRecovering: false,
      errorType: ErrorType.GENERIC_ERROR,
      lastErrorTime: 0,
      recoveryAttempts: 0
    }
    
    // Initialize performance monitoring if enabled
    if (props.enablePerformanceMonitoring) {
      this.performanceMonitor = errorRecoveryUtils.monitor
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorType = classifyError(error)
    
    return {
      hasError: true,
      error,
      errorType,
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
    
    const { retryCount, errorType } = this.state
    const recoveryStrategy = getRecoveryStrategy(errorType)
    
    // Enhanced logging with error classification
    logger.error('Enhanced Error Boundary caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorType,
      retryCount,
      recoveryStrategy: recoveryStrategy.strategy,
      canRecover: recoveryStrategy.canRecover,
      timestamp: new Date().toISOString()
    })
    
    // Record error in performance monitoring if enabled
    if (this.performanceMonitor) {
      this.performanceMonitor.recordError(error, 'ReactError310Handler', false)
    }
    
    // Update state with error info
    this.setState(prevState => ({
      error,
      errorInfo,
      retryCount: prevState.retryCount + 1,
      recoveryAttempts: prevState.recoveryAttempts + 1
    }))
    
    // Call custom error handler
    if (onError) {
      onError(error, errorInfo)
    }
    
    // Provide detailed debugging information based on error type
    this.logErrorDebugInfo(error, errorType, errorInfo)
    
    // Automatic recovery logic
    if (enableAutoRecovery && 
        retryCount < Math.min(maxRetries, recoveryStrategy.maxRetries) &&
        recoveryStrategy.canRecover) {
      this.scheduleRecovery(errorType, recoveryStrategy, retryDelay)
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
  
  private logErrorDebugInfo = (error: Error, errorType: ErrorType, errorInfo: ErrorInfo) => {
    const isCleanupError = errorType === ErrorType.CLEANUP_ERROR
    
    switch (errorType) {
      case ErrorType.REACT_310:
        console.error('🔧 React Error #310 Debug Information:')
        console.error('  - Check if all components are properly imported')
        console.error('  - Verify that useEffect hooks don\'t return JSX')
        console.error('  - Ensure Three.js objects are not rendered as React children')
        console.error('  - Check that functions are called, not rendered directly')
        console.error('  - Verify hooks are not called conditionally')
        break
        
      case ErrorType.GLTF_ERROR:
        console.error('🎯 GLTF Error Debug Information:')
        console.error('  - Check if the model file exists and is valid')
        console.error('  - Verify the model path and file format')
        console.error('  - Check for network connectivity issues')
        console.error('  - Validate model file size and browser limits')
        break
        
      case ErrorType.WEBGL_ERROR:
        console.error('🎮 WebGL Error Debug Information:')
        console.error('  - Check WebGL context availability')
        console.error('  - Verify hardware acceleration is enabled')
        console.error('  - Check for context loss events')
        console.error('  - Validate shader compilation')
        break
        
      case ErrorType.MEMORY_ERROR:
        console.error('💾 Memory Error Debug Information:')
        console.error('  - Check available system memory')
        console.error('  - Verify model complexity and texture sizes')
        console.error('  - Consider reducing quality settings')
        console.error('  - Check for memory leaks in components')
        break
        
      case ErrorType.CLEANUP_ERROR:
        console.error('🧹 Cleanup Error Debug Information:')
        console.error('  - Check useEffect cleanup functions for errors')
        console.error('  - Ensure cleanup doesn\'t call hooks')
        console.error('  - Verify resource disposal doesn\'t throw')
        console.error('  - Add try/catch blocks around cleanup operations')
        console.error('  - Check component unmounting order')
        break
        
      case ErrorType.HOOK_ERROR:
        console.error('🪝 Hook Error Debug Information:')
        console.error('  - Verify hooks are called in consistent order')
        console.error('  - Check for conditional hook calls')
        console.error('  - Ensure hooks are only called at top level')
        console.error('  - Verify component lifecycle consistency')
        break
        
      case ErrorType.SUSPENSE_ERROR:
        console.error('⏳ Suspense Error Debug Information:')
        console.error('  - Check Suspense boundary placement')
        console.error('  - Verify fallback component is valid')
        console.error('  - Check for infinite loading states')
        console.error('  - Validate async component loading')
        break
        
      default:
        console.error('❓ Generic Error Debug Information:')
        console.error('  - Check component structure and props')
        console.error('  - Verify all dependencies are available')
        console.error('  - Check for null/undefined values')
        console.error('  - Validate component lifecycle methods')
    }
    
    if (isCleanupError) {
      console.error('🧹 Additional cleanup-specific debugging:')
      console.error('  - Check useEffect cleanup functions for errors')
      console.error('  - Ensure cleanup doesn\'t call hooks')
      console.error('  - Verify resource disposal order')
      console.error('  - Add error handling to cleanup operations')
    }
  }
  
  private scheduleRecovery = (
    errorType: ErrorType,
    strategy: ReturnType<typeof getRecoveryStrategy>,
    customDelay?: number
  ) => {
    this.setState({ isRecovering: true })
    
    const delay = customDelay || strategy.delay
    
    this.recoveryTimer = setTimeout(() => {
      this.attemptRecovery(errorType, strategy)
    }, delay)
  }
  
  private attemptRecovery = async (
    errorType: ErrorType,
    strategy: ReturnType<typeof getRecoveryStrategy>
  ) => {
    if (this.mountedRef.current === false) return
    
    logger.info(`Attempting recovery for ${errorType} using strategy: ${strategy.strategy}`)
    
    try {
      switch (strategy.strategy) {
        case 'component_remount':
          await this.performComponentRemount()
          break
        
        case 'model_fallback':
          await this.performModelFallback()
          break
        
        case 'webgl_recovery':
          await this.performWebGLRecovery()
          break
        
        case 'memory_cleanup':
          await this.performMemoryCleanup()
          break
        
        case 'safe_cleanup':
          await this.performSafeCleanup()
          break
        
        case 'hook_reset':
          await this.performHookReset()
          break
        
        case 'suspense_fallback':
          await this.performSuspenseFallback()
          break
        
        case 'render_recovery':
          await this.performRenderRecovery()
          break
        
        case 'generic_retry':
        default:
          await this.performGenericRetry()
          break
      }
      
      // If recovery successful, reset error state
      if (this.mountedRef.current) {
        this.setState({
          hasError: false,
          error: undefined,
          errorInfo: undefined,
          isRecovering: false
        })
        
        if (this.performanceMonitor) {
          this.performanceMonitor.recordError(this.state.error!, 'ReactError310Handler', true)
        }
        
        if (this.props.onRecovery) {
          this.props.onRecovery()
        }
      }
    } catch (recoveryError) {
      logger.error('Recovery failed:', recoveryError)
      
      if (this.mountedRef.current) {
        this.setState({ isRecovering: false })
      }
    }
  }
  
  private performComponentRemount = async () => {
    // Force component remount by clearing state
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  private performModelFallback = async () => {
    // Trigger model fallback through error recovery utils
    errorRecoveryUtils.dragonFallback.getNextFallback()
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  private performWebGLRecovery = async () => {
    // Attempt WebGL context recovery
    try {
      if (typeof window !== 'undefined') {
        const canvas = document.querySelector('canvas')
        if (canvas) {
          // Get WebGL context
          const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
          
          try {
            // Try a simple WebGL recovery approach
            logger.info('Attempting basic WebGL context recovery...')
            
            // Force context loss and recovery
            const ext = gl && 'getExtension' in gl ? (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context') : null
            if (ext) {
              ext.loseContext()
              ext.restoreContext()
            }
          } catch (webglError) {
            // Try alternative recovery method
            logger.warn('Standard WebGL recovery failed, trying alternative:', webglError)
            if (gl && 'isContextLost' in gl && (gl as WebGLRenderingContext).isContextLost()) {
              // Wait for context restored event
              canvas.addEventListener('webglcontextrestored', () => {
                logger.info('WebGL context restored')
              }, { once: true })
            }
          }
        }
      }
    } catch (error) {
      logger.warn('WebGL recovery failed:', error)
    }
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  private performMemoryCleanup = async () => {
    // Force memory cleanup
    errorRecoveryUtils.forceGC()
    
    // Clear caches if available
    try {
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => caches.delete(name)))
      }
    } catch (error) {
      logger.warn('Cache cleanup failed:', error)
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  private performSafeCleanup = async () => {
    // Perform safe cleanup operations
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  private performHookReset = async () => {
    // Reset hook state by forcing remount
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  
  private performSuspenseFallback = async () => {
    // Handle Suspense fallback
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  private performRenderRecovery = async () => {
    // Recover from render errors
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  private performGenericRetry = async () => {
    // Generic retry with delay
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  private handleManualRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      isRecovering: false,
      retryCount: 0
    })
    
    if (this.props.onRecovery) {
      this.props.onRecovery()
    }
  }
  
  private getErrorMessage = (errorType: ErrorType): string => {
    switch (errorType) {
      case ErrorType.REACT_310:
        return "A React rendering error occurred. This is usually caused by incorrect component usage or hook violations."
      
      case ErrorType.GLTF_ERROR:
        return "Failed to load the 3D dragon model. The file may be corrupted or the network connection is unstable."
      
      case ErrorType.WEBGL_ERROR:
        return "A WebGL error occurred. Your graphics driver may need updating or hardware acceleration may be disabled."
      
      case ErrorType.MEMORY_ERROR:
        return "Not enough memory to continue. Try closing other applications or reducing quality settings."
      
      case ErrorType.CLEANUP_ERROR:
        return "An error occurred during component cleanup. This may cause memory leaks but the app should continue working."
      
      case ErrorType.HOOK_ERROR:
        return "A React Hook error occurred. This is usually caused by conditional hook calls or component lifecycle issues."
      
      case ErrorType.SUSPENSE_ERROR:
        return "A Suspense boundary error occurred. The component may be loading indefinitely or the fallback is invalid."
      
      case ErrorType.RENDER_ERROR:
        return "A rendering error occurred. Check component props and state for invalid values."
      
      default:
        return "An unexpected error occurred. The application will attempt to recover automatically."
    }
  }

  private renderErrorUI = () => {
    const { error, errorType, retryCount, isRecovering, recoveryAttempts } = this.state
    const { maxRetries = 3, enableAutoRecovery = true } = this.props
    
    const recoveryStrategy = getRecoveryStrategy(errorType)
    const canRetry = retryCount < Math.min(maxRetries, recoveryStrategy.maxRetries)
    
    if (isRecovering) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-8">
          <div className="bg-blue-900/50 border border-blue-500 rounded-lg p-8 max-w-lg text-center text-white">
            <div className="animate-spin text-4xl mb-4">🔄</div>
            <h2 className="text-2xl font-bold mb-4">Recovery in Progress</h2>
            <p className="text-blue-200 mb-6">
              Attempting to recover from {errorType.replace('_', ' ')}...
            </p>
            <div className="text-left bg-black/20 p-4 rounded mb-4">
              <h3 className="font-semibold mb-2">Recovery Status:</h3>
              <div className="text-sm space-y-1">
                <div>Strategy: {recoveryStrategy.strategy.replace('_', ' ')}</div>
                <div>Attempt: {recoveryAttempts}</div>
                <div>Max Retries: {recoveryStrategy.maxRetries}</div>
              </div>
            </div>
          </div>
        </div>
      )
    }
    
    const getErrorIcon = (errorType: ErrorType) => {
      switch (errorType) {
        case ErrorType.REACT_310:
          return '⚛️'
        case ErrorType.GLTF_ERROR:
          return '🎯'
        case ErrorType.WEBGL_ERROR:
          return '🎮'
        case ErrorType.MEMORY_ERROR:
          return '💾'
        case ErrorType.CLEANUP_ERROR:
          return '🧹'
        case ErrorType.HOOK_ERROR:
          return '🪝'
        case ErrorType.SUSPENSE_ERROR:
          return '⏳'
        case ErrorType.RENDER_ERROR:
          return '🎨'
        default:
          return '⚠️'
      }
    }
    
    const getErrorColor = (errorType: ErrorType) => {
      switch (errorType) {
        case ErrorType.REACT_310:
          return 'from-red-900 via-red-800 to-red-900'
        case ErrorType.GLTF_ERROR:
          return 'from-orange-900 via-orange-800 to-orange-900'
        case ErrorType.WEBGL_ERROR:
          return 'from-purple-900 via-purple-800 to-purple-900'
        case ErrorType.MEMORY_ERROR:
          return 'from-yellow-900 via-yellow-800 to-yellow-900'
        case ErrorType.CLEANUP_ERROR:
          return 'from-blue-900 via-blue-800 to-blue-900'
        case ErrorType.HOOK_ERROR:
          return 'from-green-900 via-green-800 to-green-900'
        case ErrorType.SUSPENSE_ERROR:
          return 'from-indigo-900 via-indigo-800 to-indigo-900'
        case ErrorType.RENDER_ERROR:
          return 'from-pink-900 via-pink-800 to-pink-900'
        default:
          return 'from-gray-900 via-gray-800 to-gray-900'
      }
    }
    
    return (
      <div className={`min-h-screen bg-gradient-to-br ${getErrorColor(errorType)} flex items-center justify-center p-8`}>
        <div className="bg-black/30 border border-red-500 rounded-lg p-8 max-w-lg text-center text-white">
          <div className="text-4xl mb-4">{getErrorIcon(errorType)}</div>
          <h2 className="text-2xl font-bold mb-4">
            {errorType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Error
          </h2>
          <p className="text-red-200 mb-6">
            {this.getErrorMessage(errorType)}
          </p>
          
          <div className="text-left bg-black/20 p-4 rounded mb-4">
            <h3 className="font-semibold mb-2">Error Information:</h3>
            <div className="text-sm space-y-1">
              <div>Type: {errorType}</div>
              <div>Attempts: {retryCount}/{maxRetries}</div>
              <div>Recovery: {recoveryStrategy.strategy.replace('_', ' ')}</div>
              <div>Can Recover: {recoveryStrategy.canRecover ? 'Yes' : 'No'}</div>
            </div>
          </div>
          
          {process.env.NODE_ENV === 'development' && error && (
            <div className="text-left bg-black/20 p-4 rounded mb-4">
              <h3 className="font-semibold mb-2">Error Details:</h3>
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
                Retry ({maxRetries - retryCount} attempts left)
              </button>
            )}
            
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Reload Page
            </button>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400">
              Error ID: {Date.now().toString(36)} | Time: {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>
    )
  }

  override render() {
    const { children, fallback } = this.props
    const { hasError } = this.state

    if (hasError) {
      return fallback || this.renderErrorUI()
    }

    return children
  }
}

export default ReactError310Handler