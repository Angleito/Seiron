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

interface ErrorSignature {
  message: string
  stack: string
  type: GLTFErrorType
  timestamp: number
  componentStack: string
}

interface CircuitBreakerState {
  level: 'closed' | 'open' | 'half-open'
  errorCount: number
  lastErrorTime: number
  consecutiveErrors: number
  errorSignatures: ErrorSignature[]
  cooldownEnd: number
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
  circuitBreaker: CircuitBreakerState
  errorSignatures: ErrorSignature[]
  mountCycles: number
  lastMountTime: number
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
      lastErrorMessage: '',
      circuitBreaker: {
        level: 'closed',
        errorCount: 0,
        lastErrorTime: 0,
        consecutiveErrors: 0,
        errorSignatures: [],
        cooldownEnd: 0
      },
      errorSignatures: [],
      mountCycles: 0,
      lastMountTime: Date.now()
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
  
  // CRITICAL FIX: Advanced error signature analysis
  private createErrorSignature(error: Error, errorInfo: ErrorInfo): ErrorSignature {
    return {
      message: error.message,
      stack: error.stack || '',
      type: classifyGLTFError(error),
      timestamp: Date.now(),
      componentStack: errorInfo.componentStack || ''
    }
  }
  
  // CRITICAL FIX: Enhanced error pattern detection
  private isIdenticalError(sig1: ErrorSignature, sig2: ErrorSignature): boolean {
    return sig1.message === sig2.message && 
           sig1.type === sig2.type &&
           sig1.stack.slice(0, 200) === sig2.stack.slice(0, 200) // Compare first 200 chars of stack
  }
  
  private isSimilarError(sig1: ErrorSignature, sig2: ErrorSignature): boolean {
    return sig1.type === sig2.type && 
           sig1.message.includes(sig2.message.slice(0, 50)) || 
           sig2.message.includes(sig1.message.slice(0, 50))
  }
  
  // CRITICAL FIX: Multi-level circuit breaker logic
  private updateCircuitBreaker(errorSignature: ErrorSignature): CircuitBreakerState {
    const now = Date.now()
    const { circuitBreaker, errorSignatures } = this.state
    
    // Add current error to signatures
    const newSignatures = [...errorSignatures, errorSignature].slice(-10) // Keep last 10 errors
    
    // Count identical errors in recent history (last 30 seconds)
    const recentErrors = newSignatures.filter(sig => now - sig.timestamp < 30000)
    const identicalCount = recentErrors.filter(sig => this.isIdenticalError(sig, errorSignature)).length
    const similarCount = recentErrors.filter(sig => this.isSimilarError(sig, errorSignature)).length
    
    // Circuit breaker state machine
    let newState: CircuitBreakerState = { ...circuitBreaker }
    
    if (circuitBreaker.level === 'closed') {
      // Normal operation - check for error threshold
      newState.errorCount++
      newState.consecutiveErrors++
      newState.lastErrorTime = now
      newState.errorSignatures = newSignatures
      
      // Trip circuit if too many errors
      if (identicalCount >= 3 || similarCount >= 5 || newState.consecutiveErrors >= 4) {
        newState.level = 'open'
        newState.cooldownEnd = now + (Math.min(newState.consecutiveErrors, 8) * 2000) // Exponential backoff
        logger.error('GLTF Circuit Breaker OPENED - too many errors detected', {
          identicalCount,
          similarCount,
          consecutiveErrors: newState.consecutiveErrors,
          cooldownPeriod: newState.cooldownEnd - now
        })
      }
    } else if (circuitBreaker.level === 'open') {
      // Circuit is open - check if cooldown period has passed
      if (now > circuitBreaker.cooldownEnd) {
        newState.level = 'half-open'
        logger.info('GLTF Circuit Breaker moved to HALF-OPEN - testing recovery')
      } else {
        // Still in cooldown - reject immediately
        logger.warn('GLTF Circuit Breaker still OPEN - rejecting error handling', {
          remainingCooldown: circuitBreaker.cooldownEnd - now
        })
      }
    } else if (circuitBreaker.level === 'half-open') {
      // Testing recovery - one error puts us back to open
      newState.level = 'open'
      newState.cooldownEnd = now + (newState.consecutiveErrors * 3000) // Longer cooldown
      logger.warn('GLTF Circuit Breaker back to OPEN - recovery failed')
    }
    
    return newState
  }
  
  // CRITICAL FIX: Mount cycle detection to prevent mount/unmount loops
  private detectMountCycles(): boolean {
    const now = Date.now()
    const { mountCycles, lastMountTime } = this.state
    
    // If mount happened within 2 seconds of last mount, it's likely a cycle
    if (now - lastMountTime < 2000) {
      const newMountCycles = mountCycles + 1
      
      this.setState({
        mountCycles: newMountCycles,
        lastMountTime: now
      })
      
      if (newMountCycles >= 3) {
        logger.error('GLTF Error Boundary: Mount/unmount cycle detected', {
          mountCycles: newMountCycles,
          timeSinceLastMount: now - lastMountTime
        })
        return true
      }
    } else {
      // Reset mount cycle counter if enough time has passed
      this.setState({
        mountCycles: 0,
        lastMountTime: now
      })
    }
    
    return false
  }
  
  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, enableAutoRecovery = true, maxRetries = 3 } = this.props
    const { retryCount } = this.state
    
    const errorType = classifyGLTFError(error)
    const recoveryStrategy = getRecoveryStrategy(errorType)
    const currentTime = Date.now()
    
    // CRITICAL FIX: Create error signature for advanced analysis
    const errorSignature = this.createErrorSignature(error, errorInfo)
    
    // CRITICAL FIX: Check for mount/unmount cycles
    const hasMountCycles = this.detectMountCycles()
    if (hasMountCycles) {
      logger.error('GLTF Error Boundary: Mount cycle detected, forcing permanent fallback')
      this.setState({
        isInErrorLoop: true,
        errorLoopCount: 999 // High number to prevent any recovery attempts
      })
      setTimeout(() => this.triggerFallback(errorType), 100)
      return
    }
    
    // CRITICAL FIX: Update circuit breaker with advanced error analysis
    const newCircuitBreakerState = this.updateCircuitBreaker(errorSignature)
    
    // Check if circuit breaker is open (blocking error handling)
    if (newCircuitBreakerState.level === 'open' && currentTime < newCircuitBreakerState.cooldownEnd) {
      logger.warn('GLTF Circuit Breaker OPEN - blocking error handling during cooldown', {
        remainingCooldown: newCircuitBreakerState.cooldownEnd - currentTime,
        consecutiveErrors: newCircuitBreakerState.consecutiveErrors
      })
      
      this.setState(prevState => ({
        circuitBreaker: newCircuitBreakerState,
        errorSignatures: [...prevState.errorSignatures, errorSignature],
        isInErrorLoop: true
      }))
      
      // Force immediate fallback
      setTimeout(() => this.triggerFallback(errorType), 500)
      return
    }
    
    // Enhanced logging for GLTF errors with circuit breaker info
    logger.error('GLTF Error Boundary caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorType,
      retryCount,
      modelPath: this.props.modelPath,
      recoveryStrategy: recoveryStrategy.strategy,
      canRecover: recoveryStrategy.canRecover,
      circuitBreakerLevel: newCircuitBreakerState.level,
      consecutiveErrors: newCircuitBreakerState.consecutiveErrors,
      errorSignatureCount: newCircuitBreakerState.errorSignatures.length
    })
    
    // Update state with enhanced error tracking
    this.setState(prevState => ({
      error,
      errorInfo,
      retryCount: prevState.retryCount + 1,
      recoveryAttempts: prevState.recoveryAttempts + 1,
      lastErrorMessage: error.message,
      lastErrorTime: currentTime,
      circuitBreaker: newCircuitBreakerState,
      errorSignatures: [...prevState.errorSignatures, errorSignature].slice(-10), // Keep last 10
      errorLoopCount: 0 // Reset since we have better circuit breaker detection now
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
    
    // CRITICAL FIX: Detect mount cycles
    this.detectMountCycles()
    
    logger.debug('GLTF Error Boundary mounted', {
      mountCycles: this.state.mountCycles,
      circuitBreakerLevel: this.state.circuitBreaker.level
    })
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
      
      // If recovery successful, reset error state and circuit breaker
      if (this.mountedRef.current) {
        this.setState(prevState => ({
          hasError: false,
          error: null,
          errorInfo: null,
          isRecovering: false,
          // CRITICAL FIX: Reset circuit breaker on successful recovery
          circuitBreaker: {
            ...prevState.circuitBreaker,
            level: 'closed',
            consecutiveErrors: 0,
            errorCount: Math.max(0, prevState.circuitBreaker.errorCount - 1) // Gradually reduce error count
          }
        }))
        
        logger.info('GLTF Error Boundary: Successful recovery, circuit breaker reset to CLOSED')
        
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
    const { 
      error, 
      errorType, 
      retryCount, 
      isRecovering, 
      recoveryAttempts, 
      isInErrorLoop, 
      errorLoopCount,
      circuitBreaker,
      mountCycles,
      errorSignatures
    } = this.state
    const { maxRetries = 3, modelPath, enableDebugInfo = false } = this.props
    
    const recoveryStrategy = getRecoveryStrategy(errorType)
    const canRetry = retryCount < Math.min(maxRetries, recoveryStrategy.maxRetries) && 
                     !isInErrorLoop && 
                     circuitBreaker.level !== 'open' &&
                     mountCycles < 3
    
    if (isInErrorLoop || circuitBreaker.level === 'open') {
      const isCircuitBreakerOpen = circuitBreaker.level === 'open'
      const cooldownRemaining = isCircuitBreakerOpen ? 
        Math.max(0, circuitBreaker.cooldownEnd - Date.now()) : 0
      
      return (
        <div className="flex items-center justify-center min-h-[200px] bg-gradient-to-b from-red-900 to-gray-800">
          <div className="text-center max-w-md">
            <div className="text-4xl mb-4">
              {isCircuitBreakerOpen ? '🚫' : '⚠️'}
            </div>
            <h3 className="text-xl font-bold text-red-300 mb-2">
              {isCircuitBreakerOpen ? 'Circuit Breaker Active' : 'Error Loop Detected'}
            </h3>
            <p className="text-red-200 mb-4">
              {isCircuitBreakerOpen 
                ? 'Too many errors detected. Dragon model temporarily disabled to prevent crashes.'
                : 'Dragon model encountered repeated errors. Switching to fallback mode.'
              }
            </p>
            <div className="text-sm text-red-400">
              {isCircuitBreakerOpen ? (
                <>
                  <p>Circuit breaker: {circuitBreaker.level.toUpperCase()}</p>
                  <p>Consecutive errors: {circuitBreaker.consecutiveErrors}</p>
                  {cooldownRemaining > 0 && (
                    <p>Cooldown: {Math.ceil(cooldownRemaining / 1000)}s remaining</p>
                  )}
                </>
              ) : (
                <>
                  <p>Error loops: {errorLoopCount}</p>
                  <p>Mount cycles: {mountCycles}</p>
                </>
              )}
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
            {enableDebugInfo && (
              <div className="text-xs text-gray-600 mt-2 space-y-1">
                <p>Circuit: {circuitBreaker.level} | Errors: {circuitBreaker.consecutiveErrors}</p>
                <p>Signatures: {errorSignatures.length} | Mounts: {mountCycles}</p>
                {circuitBreaker.level !== 'closed' && circuitBreaker.cooldownEnd > Date.now() && (
                  <p>Cooldown: {Math.ceil((circuitBreaker.cooldownEnd - Date.now()) / 1000)}s</p>
                )}
              </div>
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