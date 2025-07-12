'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, FileX, Loader } from 'lucide-react'
import { logger } from '@lib/logger'
import { errorRecoveryUtils } from '../../utils/errorRecovery'

// Types for GLTF-specific errors
interface GLTFErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  onRecovery?: () => void
  onFallback?: () => void
  enableAutoRecovery?: boolean
  maxRetries?: number
  modelPath?: string
  enableDebugInfo?: boolean
}

interface GLTFErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
  isRecovering: boolean
  errorType: GLTFErrorType
  lastErrorTime: number
  recoveryAttempts: number
  isInErrorLoop: boolean
  errorLoopCount: number
  lastErrorMessage: string
}

// GLTF-specific error types
enum GLTFErrorType {
  LOADING_ERROR = 'loading_error',
  PARSING_ERROR = 'parsing_error',
  MEMORY_ERROR = 'memory_error',
  NETWORK_ERROR = 'network_error',
  VALIDATION_ERROR = 'validation_error',
  ANIMATION_ERROR = 'animation_error',
  MATERIAL_ERROR = 'material_error',
  TEXTURE_ERROR = 'texture_error',
  GEOMETRY_ERROR = 'geometry_error',
  GENERIC_ERROR = 'generic_error'
}

// Error classification for GLTF errors
const classifyGLTFError = (error: Error): GLTFErrorType => {
  const message = error.message.toLowerCase()
  const stack = error.stack?.toLowerCase() || ''
  
  // Network-related errors
  if (message.includes('network') || message.includes('fetch') || 
      message.includes('404') || message.includes('connection')) {
    return GLTFErrorType.NETWORK_ERROR
  }
  
  // GLTF parsing errors
  if (message.includes('gltf') || message.includes('glb') || 
      message.includes('invalid typed array length') || 
      message.includes('unexpected end of data')) {
    return GLTFErrorType.PARSING_ERROR
  }
  
  // Memory errors
  if (message.includes('memory') || message.includes('out of memory') ||
      message.includes('allocation failed')) {
    return GLTFErrorType.MEMORY_ERROR
  }
  
  // Animation errors
  if (message.includes('animation') || message.includes('mixer') ||
      message.includes('clip') || message.includes('action')) {
    return GLTFErrorType.ANIMATION_ERROR
  }
  
  // Material errors
  if (message.includes('material') || message.includes('shader') ||
      message.includes('uniform') || message.includes('attribute')) {
    return GLTFErrorType.MATERIAL_ERROR
  }
  
  // Texture errors
  if (message.includes('texture') || message.includes('image') ||
      message.includes('canvas') || message.includes('webgl')) {
    return GLTFErrorType.TEXTURE_ERROR
  }
  
  // Geometry errors
  if (message.includes('geometry') || message.includes('buffer') ||
      message.includes('vertices') || message.includes('indices')) {
    return GLTFErrorType.GEOMETRY_ERROR
  }
  
  // Validation errors
  if (message.includes('validation') || message.includes('invalid') ||
      message.includes('missing') || message.includes('required')) {
    return GLTFErrorType.VALIDATION_ERROR
  }
  
  // Loading errors
  if (message.includes('load') || message.includes('import') ||
      message.includes('file') || message.includes('path')) {
    return GLTFErrorType.LOADING_ERROR
  }
  
  return GLTFErrorType.GENERIC_ERROR
}

// Recovery strategies for different error types
const getRecoveryStrategy = (errorType: GLTFErrorType): {
  canRecover: boolean
  recoveryDelay: number
  maxRetries: number
  strategy: string
} => {
  switch (errorType) {
    case GLTFErrorType.NETWORK_ERROR:
      return {
        canRecover: true,
        recoveryDelay: 2000,
        maxRetries: 3,
        strategy: 'retry_with_backoff'
      }
    
    case GLTFErrorType.LOADING_ERROR:
      return {
        canRecover: true,
        recoveryDelay: 1000,
        maxRetries: 2,
        strategy: 'retry_immediate'
      }
    
    case GLTFErrorType.MEMORY_ERROR:
      return {
        canRecover: true,
        recoveryDelay: 5000,
        maxRetries: 1,
        strategy: 'cleanup_and_retry'
      }
    
    case GLTFErrorType.PARSING_ERROR:
      return {
        canRecover: false,
        recoveryDelay: 0,
        maxRetries: 0,
        strategy: 'fallback_model'
      }
    
    case GLTFErrorType.VALIDATION_ERROR:
      return {
        canRecover: false,
        recoveryDelay: 0,
        maxRetries: 0,
        strategy: 'fallback_model'
      }
    
    case GLTFErrorType.ANIMATION_ERROR:
      return {
        canRecover: true,
        recoveryDelay: 500,
        maxRetries: 1,
        strategy: 'disable_animations'
      }
    
    case GLTFErrorType.MATERIAL_ERROR:
    case GLTFErrorType.TEXTURE_ERROR:
      return {
        canRecover: true,
        recoveryDelay: 1000,
        maxRetries: 2,
        strategy: 'fallback_materials'
      }
    
    case GLTFErrorType.GEOMETRY_ERROR:
      return {
        canRecover: false,
        recoveryDelay: 0,
        maxRetries: 0,
        strategy: 'fallback_model'
      }
    
    default:
      return {
        canRecover: true,
        recoveryDelay: 1000,
        maxRetries: 1,
        strategy: 'retry_once'
      }
  }
}

// Error boundary component specifically for GLTF errors
export class GLTFErrorBoundary extends Component<GLTFErrorBoundaryProps, GLTFErrorBoundaryState> {
  private recoveryTimer: NodeJS.Timeout | null = null
  private mountedRef = { current: true }
  
  constructor(props: GLTFErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRecovering: false,
      errorType: GLTFErrorType.GENERIC_ERROR,
      lastErrorTime: 0,
      recoveryAttempts: 0,
      isInErrorLoop: false,
      errorLoopCount: 0,
      lastErrorMessage: ''
    }
    
    // Set mounted ref
    this.mountedRef.current = true
  }
  
  static getDerivedStateFromError(error: Error): Partial<GLTFErrorBoundaryState> {
    const errorType = classifyGLTFError(error)
    const currentTime = Date.now()
    
    return {
      hasError: true,
      error,
      errorType,
      lastErrorTime: currentTime
    }
  }
  
  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, enableAutoRecovery = true, maxRetries = 3 } = this.props
    const { retryCount, lastErrorMessage, errorLoopCount, lastErrorTime } = this.state
    
    const errorType = classifyGLTFError(error)
    const recoveryStrategy = getRecoveryStrategy(errorType)
    const currentTime = Date.now()
    
    // CRITICAL FIX: Circuit breaker logic to prevent infinite error loops
    const isSameError = error.message === lastErrorMessage
    const isRecentError = currentTime - lastErrorTime < 1000 // Less than 1 second
    const isErrorLoop = isSameError && isRecentError && errorLoopCount >= 2
    
    if (isErrorLoop) {
      logger.error('GLTF Error Loop detected - breaking circuit:', {
        error: error.message,
        errorLoopCount: errorLoopCount + 1,
        lastErrorTime,
        currentTime
      })
      
      this.setState(prevState => ({
        isInErrorLoop: true,
        errorLoopCount: prevState.errorLoopCount + 1,
        lastErrorMessage: error.message
      }))
      
      // Force fallback without recovery attempts
      setTimeout(() => {
        this.triggerFallback(errorType)
      }, 100)
      
      return
    }
    
    // Enhanced logging for GLTF errors
    logger.error('GLTF Error Boundary caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorType,
      retryCount,
      modelPath: this.props.modelPath,
      recoveryStrategy: recoveryStrategy.strategy,
      canRecover: recoveryStrategy.canRecover
    })
    
    // Update state with error info
    this.setState(prevState => ({
      error,
      errorInfo,
      retryCount: prevState.retryCount + 1,
      recoveryAttempts: prevState.recoveryAttempts + 1,
      lastErrorMessage: error.message,
      errorLoopCount: isSameError && isRecentError ? prevState.errorLoopCount + 1 : 0
    }))
    
    // Call custom error handler
    if (onError) {
      onError(error, errorInfo)
    }
    
    // Automatic recovery logic
    if (enableAutoRecovery && 
        retryCount < Math.min(maxRetries, recoveryStrategy.maxRetries) &&
        recoveryStrategy.canRecover) {
      this.scheduleRecovery(errorType, recoveryStrategy)
    } else if (!recoveryStrategy.canRecover) {
      // Trigger fallback for non-recoverable errors
      this.triggerFallback(errorType)
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
  
  private scheduleRecovery = (errorType: GLTFErrorType, strategy: ReturnType<typeof getRecoveryStrategy>) => {
    this.setState({ isRecovering: true })
    
    this.recoveryTimer = setTimeout(() => {
      this.attemptRecovery(errorType, strategy)
    }, strategy.recoveryDelay)
  }
  
  private attemptRecovery = async (errorType: GLTFErrorType, strategy: ReturnType<typeof getRecoveryStrategy>) => {
    if (this.mountedRef.current === false) return
    
    logger.info(`Attempting GLTF recovery for ${errorType} using strategy: ${strategy.strategy}`)
    
    try {
      switch (strategy.strategy) {
        case 'cleanup_and_retry':
          await this.performCleanupAndRetry()
          break
        
        case 'retry_with_backoff':
          await this.performRetryWithBackoff()
          break
        
        case 'disable_animations':
          await this.performAnimationDisableRetry()
          break
        
        case 'fallback_materials':
          await this.performMaterialFallback()
          break
        
        case 'retry_immediate':
        case 'retry_once':
        default:
          await this.performSimpleRetry()
          break
      }
      
      // If recovery successful, reset error state
      if (this.mountedRef.current) {
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
          isRecovering: false
        })
        
        if (this.props.onRecovery) {
          this.props.onRecovery()
        }
      }
    } catch (recoveryError) {
      logger.error('GLTF recovery failed:', recoveryError)
      
      if (this.mountedRef.current) {
        this.setState({ isRecovering: false })
        this.triggerFallback(errorType)
      }
    }
  }
  
  private performCleanupAndRetry = async () => {
    // Force garbage collection if available
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        ;(window as any).gc()
      } catch (e) {
        // Ignore if GC is not available
      }
    }
    
    // Clear GLTF cache
    try {
      const { useGLTF } = await import('@react-three/drei')
      // Clear specific model if known, otherwise clear common models
      if (this.props.modelPath) {
        useGLTF.clear(this.props.modelPath)
      } else {
        // Clear known models
        const knownModels = ['/models/seiron.glb', '/models/seiron_animated.gltf']
        knownModels.forEach(model => {
          try {
            useGLTF.clear(model)
          } catch (e) {
            // Ignore errors for uncached models
          }
        })
      }
    } catch (e) {
      logger.warn('Failed to clear GLTF cache during recovery')
    }
    
    // Wait a bit for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  private performRetryWithBackoff = async () => {
    const backoffDelay = Math.min(1000 * Math.pow(2, this.state.retryCount), 8000)
    await new Promise(resolve => setTimeout(resolve, backoffDelay))
  }
  
  private performAnimationDisableRetry = async () => {
    // This would be implemented by the parent component
    // For now, just a simple retry
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  private performMaterialFallback = async () => {
    // This would be implemented by the parent component
    // For now, just a simple retry
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  private performSimpleRetry = async () => {
    // Simple retry with no special handling
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  private triggerFallback = (errorType: GLTFErrorType) => {
    logger.info(`Triggering fallback for GLTF error type: ${errorType}`)
    
    if (this.props.onFallback) {
      this.props.onFallback()
    }
  }
  
  private handleManualRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false,
      retryCount: 0
    })
    
    if (this.props.onRecovery) {
      this.props.onRecovery()
    }
  }
  
  private handleFallback = () => {
    this.triggerFallback(this.state.errorType)
  }
  
  private getErrorMessage = (errorType: GLTFErrorType): string => {
    switch (errorType) {
      case GLTFErrorType.NETWORK_ERROR:
        return "Network error loading dragon model. Check your connection."
      
      case GLTFErrorType.LOADING_ERROR:
        return "Failed to load dragon model. The file may be missing or corrupted."
      
      case GLTFErrorType.PARSING_ERROR:
        return "Dragon model file is corrupted or in an unsupported format."
      
      case GLTFErrorType.MEMORY_ERROR:
        return "Not enough memory to load the dragon model. Try closing other applications."
      
      case GLTFErrorType.VALIDATION_ERROR:
        return "Dragon model failed validation. The file may be incomplete."
      
      case GLTFErrorType.ANIMATION_ERROR:
        return "Dragon animations failed to load. The model will display without animations."
      
      case GLTFErrorType.MATERIAL_ERROR:
        return "Dragon materials failed to load. The model may appear with incorrect colors."
      
      case GLTFErrorType.TEXTURE_ERROR:
        return "Dragon textures failed to load. The model may appear without proper textures."
      
      case GLTFErrorType.GEOMETRY_ERROR:
        return "Dragon geometry is corrupted. Using fallback model."
      
      default:
        return "An unexpected error occurred while loading the dragon model."
    }
  }
  
  private renderErrorUI = () => {
    const { error, errorType, retryCount, isRecovering, recoveryAttempts, isInErrorLoop, errorLoopCount } = this.state
    const { maxRetries = 3, modelPath, enableDebugInfo = false } = this.props
    
    const recoveryStrategy = getRecoveryStrategy(errorType)
    const canRetry = retryCount < Math.min(maxRetries, recoveryStrategy.maxRetries) && !isInErrorLoop
    
    if (isInErrorLoop) {
      return (
        <div className="flex items-center justify-center min-h-[200px] bg-gradient-to-b from-red-900 to-gray-800">
          <div className="text-center max-w-md">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-xl font-bold text-red-300 mb-2">Error Loop Detected</h3>
            <p className="text-red-200 mb-4">
              Dragon model encountered repeated errors. Switching to fallback mode.
            </p>
            <div className="text-sm text-red-400">
              <p>Error loops: {errorLoopCount}</p>
              <p>Fallback will activate automatically</p>
            </div>
          </div>
        </div>
      )
    }
    
    if (isRecovering) {
      return (
        <div className="flex items-center justify-center min-h-[200px] bg-gradient-to-b from-gray-900 to-gray-800">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-4">🐉</div>
            <h3 className="text-xl font-bold text-blue-300 mb-2">Dragon Model Recovering...</h3>
            <p className="text-gray-400">Attempting to restore the dragon model</p>
            <div className="mt-4 text-sm text-gray-500">
              <p>Strategy: {recoveryStrategy.strategy.replace('_', ' ')}</p>
              <p>Attempt: {recoveryAttempts}</p>
            </div>
          </div>
        </div>
      )
    }
    
    return (
      <div className="flex items-center justify-center min-h-[200px] bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl border border-red-700 p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-red-900/20 p-3 rounded-full">
              {errorType === GLTFErrorType.NETWORK_ERROR && <FileX className="h-8 w-8 text-red-500" />}
              {errorType === GLTFErrorType.LOADING_ERROR && <Loader className="h-8 w-8 text-red-500" />}
              {[GLTFErrorType.PARSING_ERROR, GLTFErrorType.VALIDATION_ERROR, GLTFErrorType.GEOMETRY_ERROR].includes(errorType) && 
                <AlertTriangle className="h-8 w-8 text-red-500" />}
              {![GLTFErrorType.NETWORK_ERROR, GLTFErrorType.LOADING_ERROR, GLTFErrorType.PARSING_ERROR, GLTFErrorType.VALIDATION_ERROR, GLTFErrorType.GEOMETRY_ERROR].includes(errorType) && 
                <AlertTriangle className="h-8 w-8 text-orange-500" />}
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-red-100 text-center mb-2">
            Dragon Model Error
          </h2>
          
          <p className="text-gray-400 text-center mb-4">
            {this.getErrorMessage(errorType)}
          </p>
          
          {enableDebugInfo && error && (
            <div className="mb-4 p-3 bg-gray-700 rounded border border-gray-600">
              <p className="text-sm font-mono text-red-400 break-words">
                {error.message}
              </p>
              {modelPath && (
                <p className="text-xs text-gray-500 mt-1">
                  Model: {modelPath}
                </p>
              )}
            </div>
          )}
          
          <div className="space-y-3">
            {canRetry && recoveryStrategy.canRecover && (
              <button
                onClick={this.handleManualRetry}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Retry Loading ({maxRetries - retryCount} attempts left)
              </button>
            )}
            
            <button
              onClick={this.handleFallback}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-gray-100 rounded transition-colors"
            >
              <FileX className="h-4 w-4" />
              Use Fallback Dragon
            </button>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Error: {errorType.replace('_', ' ')} | Attempts: {retryCount}/{maxRetries}
            </p>
            {recoveryStrategy.strategy && (
              <p className="text-xs text-gray-600 mt-1">
                Strategy: {recoveryStrategy.strategy.replace('_', ' ')}
              </p>
            )}
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

// Higher-order component for wrapping GLTF components
export function withGLTFErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<GLTFErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <GLTFErrorBoundary {...options}>
      <Component {...props} />
    </GLTFErrorBoundary>
  )
  
  WrappedComponent.displayName = `withGLTFErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Specialized error boundary for Dragon GLTF components
export const DragonGLTFErrorBoundary: React.FC<{
  children: ReactNode
  modelPath?: string
  onFallback?: () => void
}> = ({ children, modelPath, onFallback }) => (
  <GLTFErrorBoundary
    modelPath={modelPath}
    enableAutoRecovery={true}
    maxRetries={2}
    enableDebugInfo={process.env.NODE_ENV === 'development'}
    onError={(error, errorInfo) => {
      logger.error('Dragon GLTF Error:', { error, errorInfo, modelPath })
    }}
    onFallback={onFallback}
  >
    {children}
  </GLTFErrorBoundary>
)

export default GLTFErrorBoundary