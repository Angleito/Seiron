'use client'

import React, { Component, ErrorInfo, ReactNode, useState, useEffect } from 'react'
import { AlertTriangle, RefreshCw, FileX, Loader } from 'lucide-react'
import { logger } from '@lib/logger'
import { errorRecoveryUtils } from '../../utils/errorRecovery'

// Global circuit breaker singleton to prevent mount/unmount cycles across all instances
class GlobalGLTFCircuitBreaker {
  private static instance: GlobalGLTFCircuitBreaker
  private circuitStates: Map<string, {
    level: 'closed' | 'open' | 'half-open' | 'permanent'
    errorCount: number
    mountAttempts: number
    lastMountTime: number
    lastErrorTime: number
    consecutiveErrors: number
    consecutiveMountFailures: number
    cooldownEnd: number
    permanentFallbackTriggered: boolean
    errorSignatures: ErrorSignature[]
    mountCycleDetected: boolean
    lastRecoveryAttempt: number
    recoveryCount: number
  }> = new Map()
  
  private globalMountTracking: {
    mountAttempts: number
    lastMountTime: number
    rapidMountCount: number
  } = {
    mountAttempts: 0,
    lastMountTime: 0,
    rapidMountCount: 0
  }
  
  static getInstance(): GlobalGLTFCircuitBreaker {
    if (!GlobalGLTFCircuitBreaker.instance) {
      GlobalGLTFCircuitBreaker.instance = new GlobalGLTFCircuitBreaker()
    }
    return GlobalGLTFCircuitBreaker.instance
  }
  
  // Track mount attempts globally to detect cross-component cycling
  trackMountAttempt(componentId: string): boolean {
    const now = Date.now()
    const state = this.getComponentState(componentId)
    
    // Update global tracking
    if (now - this.globalMountTracking.lastMountTime < 3000) {
      this.globalMountTracking.rapidMountCount++
    } else {
      this.globalMountTracking.rapidMountCount = 0
    }
    
    this.globalMountTracking.mountAttempts++
    this.globalMountTracking.lastMountTime = now
    
    // Update component-specific tracking
    state.mountAttempts++
    state.lastMountTime = now
    
    // Detect rapid mounting patterns
    const isRapidMount = now - state.lastMountTime < 2000
    const hasGlobalRapidMounts = this.globalMountTracking.rapidMountCount > 5
    const hasComponentRapidMounts = state.mountAttempts > 3 && isRapidMount
    
    if (hasGlobalRapidMounts || hasComponentRapidMounts) {
      state.mountCycleDetected = true
      state.level = 'permanent'
      state.permanentFallbackTriggered = true
      
      logger.error('GLTF Global Circuit Breaker: Mount/unmount cycle detected', {
        componentId,
        globalRapidMounts: this.globalMountTracking.rapidMountCount,
        componentMountAttempts: state.mountAttempts,
        timeSinceLastMount: now - state.lastMountTime,
        level: 'PERMANENT_FALLBACK'
      })
      
      return true // Cycle detected
    }
    
    return false
  }
  
  // Record error with advanced pattern detection
  recordError(componentId: string, errorSignature: ErrorSignature): 'allow' | 'block' | 'permanent' {
    const now = Date.now()
    const state = this.getComponentState(componentId)
    
    // Add error to signature history
    state.errorSignatures.push(errorSignature)
    if (state.errorSignatures.length > 15) {
      state.errorSignatures = state.errorSignatures.slice(-15) // Keep last 15
    }
    
    // Analyze error patterns
    const recentErrors = state.errorSignatures.filter(sig => now - sig.timestamp < 60000) // Last minute
    const identicalErrors = recentErrors.filter(sig => this.isIdenticalError(sig, errorSignature))
    const similarErrors = recentErrors.filter(sig => this.isSimilarError(sig, errorSignature))
    
    state.errorCount++
    state.consecutiveErrors++
    state.lastErrorTime = now
    
    // Permanent fallback conditions
    if (state.level === 'permanent' || state.mountCycleDetected) {
      return 'permanent'
    }
    
    // Critical error pattern detection
    if (identicalErrors.length >= 4 || similarErrors.length >= 7) {
      state.level = 'permanent'
      state.permanentFallbackTriggered = true
      logger.error('GLTF Circuit Breaker: Critical error pattern detected, permanent fallback activated', {
        componentId,
        identicalErrors: identicalErrors.length,
        similarErrors: similarErrors.length,
        level: 'PERMANENT'
      })
      return 'permanent'
    }
    
    // Progressive circuit breaker logic
    if (state.level === 'closed') {
      // Trigger circuit breaker with progressive thresholds
      if (identicalErrors.length >= 2 || state.consecutiveErrors >= 3) {
        state.level = 'open'
        state.cooldownEnd = now + this.calculateCooldownPeriod(state.consecutiveErrors)
        
        logger.warn('GLTF Circuit Breaker OPENED', {
          componentId,
          consecutiveErrors: state.consecutiveErrors,
          identicalErrors: identicalErrors.length,
          cooldownPeriod: state.cooldownEnd - now
        })
      }
    }
    
    // Check circuit breaker state
    if (state.level === 'open') {
      if (now > state.cooldownEnd) {
        state.level = 'half-open'
        logger.info('GLTF Circuit Breaker moved to HALF-OPEN', { componentId })
        return 'allow'
      } else {
        return 'block'
      }
    }
    
    if (state.level === 'half-open') {
      // Any error in half-open state triggers escalation
      state.level = 'open'
      state.cooldownEnd = now + this.calculateCooldownPeriod(state.consecutiveErrors, true)
      logger.warn('GLTF Circuit Breaker back to OPEN from half-open', { componentId })
      return 'block'
    }
    
    return 'allow'
  }
  
  // Smart recovery with time-based backoff
  canAttemptRecovery(componentId: string): boolean {
    const state = this.getComponentState(componentId)
    const now = Date.now()
    
    if (state.level === 'permanent' || state.mountCycleDetected) {
      return false
    }
    
    if (state.level === 'open' && now < state.cooldownEnd) {
      return false
    }
    
    // Progressive recovery delays
    const minRecoveryInterval = Math.min(30000, 5000 * Math.pow(2, state.recoveryCount))
    if (now - state.lastRecoveryAttempt < minRecoveryInterval) {
      return false
    }
    
    return true
  }
  
  // Record successful recovery
  recordSuccessfulRecovery(componentId: string): void {
    const state = this.getComponentState(componentId)
    
    // Gradually reset circuit breaker
    state.consecutiveErrors = Math.max(0, state.consecutiveErrors - 2)
    state.errorCount = Math.max(0, state.errorCount - 1)
    state.lastRecoveryAttempt = Date.now()
    state.recoveryCount++
    
    if (state.consecutiveErrors === 0) {
      state.level = 'closed'
      logger.info('GLTF Circuit Breaker reset to CLOSED after successful recovery', {
        componentId,
        recoveryCount: state.recoveryCount
      })
    } else {
      state.level = 'half-open'
      logger.info('GLTF Circuit Breaker moved to HALF-OPEN after partial recovery', {
        componentId,
        remainingErrors: state.consecutiveErrors
      })
    }
  }
  
  // Record failed recovery
  recordFailedRecovery(componentId: string): void {
    const state = this.getComponentState(componentId)
    state.consecutiveMountFailures++
    state.lastRecoveryAttempt = Date.now()
    
    // Escalate to permanent if too many recovery failures
    if (state.consecutiveMountFailures >= 3) {
      state.level = 'permanent'
      state.permanentFallbackTriggered = true
      logger.error('GLTF Circuit Breaker: Too many recovery failures, permanent fallback activated', {
        componentId,
        consecutiveMountFailures: state.consecutiveMountFailures
      })
    }
  }
  
  // Get circuit breaker status
  getStatus(componentId: string): {
    level: string
    canMount: boolean
    canRecover: boolean
    shouldFallback: boolean
    cooldownRemaining: number
    errorCount: number
    mountAttempts: number
  } {
    const state = this.getComponentState(componentId)
    const now = Date.now()
    
    return {
      level: state.level,
      canMount: state.level !== 'permanent' && !state.mountCycleDetected,
      canRecover: this.canAttemptRecovery(componentId),
      shouldFallback: state.level === 'permanent' || state.permanentFallbackTriggered,
      cooldownRemaining: Math.max(0, state.cooldownEnd - now),
      errorCount: state.errorCount,
      mountAttempts: state.mountAttempts
    }
  }
  
  private getComponentState(componentId: string) {
    if (!this.circuitStates.has(componentId)) {
      this.circuitStates.set(componentId, {
        level: 'closed',
        errorCount: 0,
        mountAttempts: 0,
        lastMountTime: 0,
        lastErrorTime: 0,
        consecutiveErrors: 0,
        consecutiveMountFailures: 0,
        cooldownEnd: 0,
        permanentFallbackTriggered: false,
        errorSignatures: [],
        mountCycleDetected: false,
        lastRecoveryAttempt: 0,
        recoveryCount: 0
      })
    }
    return this.circuitStates.get(componentId)!
  }
  
  private calculateCooldownPeriod(consecutiveErrors: number, isEscalation = false): number {
    const baseDelay = isEscalation ? 10000 : 5000
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, consecutiveErrors - 1), 60000)
    return exponentialDelay
  }
  
  private isIdenticalError(sig1: ErrorSignature, sig2: ErrorSignature): boolean {
    return sig1.message === sig2.message && 
           sig1.type === sig2.type &&
           sig1.stack.slice(0, 300) === sig2.stack.slice(0, 300)
  }
  
  private isSimilarError(sig1: ErrorSignature, sig2: ErrorSignature): boolean {
    return sig1.type === sig2.type && (
      sig1.message.includes(sig2.message.slice(0, 50)) || 
      sig2.message.includes(sig1.message.slice(0, 50))
    )
  }
  
  // Reset component state (for testing or force reset)
  resetComponent(componentId: string): void {
    this.circuitStates.delete(componentId)
    logger.info('GLTF Circuit Breaker state reset for component', { componentId })
  }
  
  // Get global statistics
  getGlobalStats(): {
    totalComponents: number
    openCircuits: number
    permanentFallbacks: number
    totalMountAttempts: number
    rapidMountCount: number
  } {
    const states = Array.from(this.circuitStates.values())
    return {
      totalComponents: states.length,
      openCircuits: states.filter(s => s.level === 'open').length,
      permanentFallbacks: states.filter(s => s.level === 'permanent').length,
      totalMountAttempts: this.globalMountTracking.mountAttempts,
      rapidMountCount: this.globalMountTracking.rapidMountCount
    }
  }
}

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
  private globalCircuitBreaker = GlobalGLTFCircuitBreaker.getInstance()
  private componentId: string
  
  constructor(props: GLTFErrorBoundaryProps) {
    super(props)
    
    // Generate unique component ID for circuit breaker tracking
    this.componentId = `gltf-boundary-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
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
  
  // DEPRECATED: Replaced by global circuit breaker
  // This method is kept for backward compatibility but is no longer used
  private updateCircuitBreaker(errorSignature: ErrorSignature): CircuitBreakerState {
    // Return minimal state as this is handled by global circuit breaker now
    return {
      level: 'closed',
      errorCount: 0,
      lastErrorTime: Date.now(),
      consecutiveErrors: 0,
      errorSignatures: [],
      cooldownEnd: 0
    }
  }
  
  // DEPRECATED: Replaced by global circuit breaker mount tracking
  // This method is kept for backward compatibility but is no longer used
  private detectMountCycles(): boolean {
    // Mount cycle detection is now handled by the global circuit breaker
    return false
  }
  
  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, enableAutoRecovery = true, maxRetries = 3 } = this.props
    const { retryCount } = this.state
    
    const errorType = classifyGLTFError(error)
    const recoveryStrategy = getRecoveryStrategy(errorType)
    const currentTime = Date.now()
    
    // CRITICAL FIX: Create error signature for global circuit breaker
    const errorSignature = this.createErrorSignature(error, errorInfo)
    
    // CRITICAL FIX: Use global circuit breaker to prevent cycles
    const circuitBreakerDecision = this.globalCircuitBreaker.recordError(this.componentId, errorSignature)
    
    if (circuitBreakerDecision === 'permanent') {
      logger.error('GLTF Global Circuit Breaker: Permanent fallback triggered', {
        componentId: this.componentId,
        errorType,
        errorMessage: error.message
      })
      
      this.setState({
        isInErrorLoop: true,
        errorLoopCount: 999 // Prevent any recovery attempts
      })
      
      // Force immediate permanent fallback
      setTimeout(() => this.triggerFallback(errorType), 100)
      return
    }
    
    if (circuitBreakerDecision === 'block') {
      const status = this.globalCircuitBreaker.getStatus(this.componentId)
      
      logger.warn('GLTF Global Circuit Breaker: Error handling blocked during cooldown', {
        componentId: this.componentId,
        level: status.level,
        cooldownRemaining: status.cooldownRemaining,
        errorCount: status.errorCount
      })
      
      this.setState(prevState => ({
        errorSignatures: [...prevState.errorSignatures, errorSignature],
        isInErrorLoop: true
      }))
      
      // Schedule fallback after cooldown
      setTimeout(() => this.triggerFallback(errorType), Math.min(status.cooldownRemaining, 5000))
      return
    }
    
    // Enhanced logging with global circuit breaker info
    const globalStatus = this.globalCircuitBreaker.getStatus(this.componentId)
    
    logger.error('GLTF Error Boundary caught error:', {
      componentId: this.componentId,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorType,
      retryCount,
      modelPath: this.props.modelPath,
      recoveryStrategy: recoveryStrategy.strategy,
      canRecover: recoveryStrategy.canRecover,
      globalCircuitBreaker: {
        level: globalStatus.level,
        errorCount: globalStatus.errorCount,
        mountAttempts: globalStatus.mountAttempts,
        canRecover: globalStatus.canRecover
      }
    })
    
    // Update local state
    this.setState(prevState => ({
      error,
      errorInfo,
      retryCount: prevState.retryCount + 1,
      recoveryAttempts: prevState.recoveryAttempts + 1,
      lastErrorMessage: error.message,
      lastErrorTime: currentTime,
      errorSignatures: [...prevState.errorSignatures, errorSignature].slice(-10)
    }))
    
    // Call custom error handler
    if (onError) {
      onError(error, errorInfo)
    }
    
    // Recovery logic with global circuit breaker consideration
    if (enableAutoRecovery && 
        globalStatus.canRecover &&
        retryCount < Math.min(maxRetries, recoveryStrategy.maxRetries) &&
        recoveryStrategy.canRecover) {
      this.scheduleRecovery(errorType, recoveryStrategy)
    } else {
      // Trigger fallback for non-recoverable errors or circuit breaker block
      this.triggerFallback(errorType)
    }
  }
  
  override componentDidMount() {
    this.mountedRef.current = true
    
    // CRITICAL FIX: Track mount attempts with global circuit breaker
    const mountCycleDetected = this.globalCircuitBreaker.trackMountAttempt(this.componentId)
    
    if (mountCycleDetected) {
      logger.error('GLTF Error Boundary: Mount cycle detected during mount', {
        componentId: this.componentId
      })
      
      this.setState({
        isInErrorLoop: true,
        errorLoopCount: 999,
        mountCycles: 999
      })
      
      // Trigger immediate fallback
      setTimeout(() => this.triggerFallback(GLTFErrorType.GENERIC_ERROR), 100)
      return
    }
    
    const globalStatus = this.globalCircuitBreaker.getStatus(this.componentId)
    
    logger.debug('GLTF Error Boundary mounted', {
      componentId: this.componentId,
      globalStatus: {
        level: globalStatus.level,
        canMount: globalStatus.canMount,
        mountAttempts: globalStatus.mountAttempts,
        errorCount: globalStatus.errorCount
      }
    })
    
    // If circuit breaker says we should fallback immediately, do so
    if (globalStatus.shouldFallback) {
      logger.info('GLTF Error Boundary: Immediate fallback required per circuit breaker', {
        componentId: this.componentId
      })
      
      this.setState({
        isInErrorLoop: true,
        errorLoopCount: 999
      })
      
      setTimeout(() => this.triggerFallback(GLTFErrorType.GENERIC_ERROR), 200)
    }
  }
  
  override componentWillUnmount() {
    this.mountedRef.current = false
    
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer)
      this.recoveryTimer = null
    }
    
    // Log unmount for debugging
    logger.debug('GLTF Error Boundary unmounting', {
      componentId: this.componentId,
      globalStatus: this.globalCircuitBreaker.getStatus(this.componentId)
    })
  }
  
  private scheduleRecovery = (errorType: GLTFErrorType, strategy: ReturnType<typeof getRecoveryStrategy>) => {
    this.setState({ isRecovering: true })
    
    this.recoveryTimer = setTimeout(() => {
      this.attemptRecovery(errorType, strategy)
    }, strategy.recoveryDelay)
  }
  
  private attemptRecovery = async (errorType: GLTFErrorType, strategy: ReturnType<typeof getRecoveryStrategy>) => {
    if (this.mountedRef.current === false) return
    
    // Check if recovery is allowed by global circuit breaker
    const globalStatus = this.globalCircuitBreaker.getStatus(this.componentId)
    if (!globalStatus.canRecover) {
      logger.warn('GLTF recovery blocked by global circuit breaker', {
        componentId: this.componentId,
        level: globalStatus.level
      })
      
      this.setState({ isRecovering: false })
      this.triggerFallback(errorType)
      return
    }
    
    logger.info(`Attempting GLTF recovery for ${errorType} using strategy: ${strategy.strategy}`, {
      componentId: this.componentId
    })
    
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
      
      // If recovery successful, notify global circuit breaker and reset state
      if (this.mountedRef.current) {
        this.globalCircuitBreaker.recordSuccessfulRecovery(this.componentId)
        
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
          isRecovering: false,
          isInErrorLoop: false,
          errorLoopCount: 0
        })
        
        logger.info('GLTF Error Boundary: Successful recovery', {
          componentId: this.componentId,
          strategy: strategy.strategy
        })
        
        if (this.props.onRecovery) {
          this.props.onRecovery()
        }
      }
    } catch (recoveryError) {
      logger.error('GLTF recovery failed:', recoveryError)
      
      // Notify global circuit breaker of failed recovery
      this.globalCircuitBreaker.recordFailedRecovery(this.componentId)
      
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
      errorSignatures
    } = this.state
    const { maxRetries = 3, modelPath, enableDebugInfo = false } = this.props
    
    // Get current status from global circuit breaker
    const globalStatus = this.globalCircuitBreaker.getStatus(this.componentId)
    const globalStats = this.globalCircuitBreaker.getGlobalStats()
    
    const recoveryStrategy = getRecoveryStrategy(errorType)
    const canRetry = retryCount < Math.min(maxRetries, recoveryStrategy.maxRetries) && 
                     !isInErrorLoop && 
                     globalStatus.canRecover
    
    // Enhanced error loop detection with global circuit breaker
    if (isInErrorLoop || globalStatus.shouldFallback || globalStatus.level === 'permanent') {
      const isPermanentFallback = globalStatus.level === 'permanent'
      const isCircuitOpen = globalStatus.level === 'open'
      
      return (
        <div className="flex items-center justify-center min-h-[200px] bg-gradient-to-b from-red-900 to-gray-800">
          <div className="text-center max-w-md">
            <div className="text-4xl mb-4">
              {isPermanentFallback ? '🛡️' : isCircuitOpen ? '🚫' : '⚠️'}
            </div>
            <h3 className="text-xl font-bold text-red-300 mb-2">
              {isPermanentFallback ? 'Permanent Fallback Mode' : 
               isCircuitOpen ? 'Circuit Breaker Active' : 'Error Loop Detected'}
            </h3>
            <p className="text-red-200 mb-4">
              {isPermanentFallback 
                ? 'Critical error patterns detected. Dragon model permanently disabled to ensure stability.'
                : isCircuitOpen
                ? 'Too many errors detected. Dragon model temporarily disabled to prevent crashes.'
                : 'Dragon model encountered repeated errors. Switching to fallback mode.'
              }
            </p>
            <div className="text-sm text-red-400">
              <p>Global Status: {globalStatus.level.toUpperCase()}</p>
              <p>Component Errors: {globalStatus.errorCount}</p>
              <p>Mount Attempts: {globalStatus.mountAttempts}</p>
              {globalStatus.cooldownRemaining > 0 && (
                <p>Cooldown: {Math.ceil(globalStatus.cooldownRemaining / 1000)}s remaining</p>
              )}
              {enableDebugInfo && (
                <>
                  <p>Global Components: {globalStats.totalComponents}</p>
                  <p>Open Circuits: {globalStats.openCircuits}</p>
                  <p>Permanent Fallbacks: {globalStats.permanentFallbacks}</p>
                </>
              )}
              <p>{isPermanentFallback ? 'Permanent fallback active' : 'Fallback will activate automatically'}</p>
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
                <p>Global Circuit: {globalStatus.level} | Errors: {globalStatus.errorCount}</p>
                <p>Signatures: {errorSignatures.length} | Mounts: {globalStatus.mountAttempts}</p>
                <p>Component ID: {this.componentId.slice(-8)}</p>
                {globalStatus.cooldownRemaining > 0 && (
                  <p>Cooldown: {Math.ceil(globalStatus.cooldownRemaining / 1000)}s</p>
                )}
                <p>Can Recover: {globalStatus.canRecover ? 'Yes' : 'No'}</p>
                <p>Should Fallback: {globalStatus.shouldFallback ? 'Yes' : 'No'}</p>
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

// Utility functions for external use
export const resetGLTFCircuitBreaker = (componentId?: string) => {
  const circuitBreaker = GlobalGLTFCircuitBreaker.getInstance()
  if (componentId) {
    circuitBreaker.resetComponent(componentId)
  } else {
    // Reset all components - useful for testing or manual recovery
    const stats = circuitBreaker.getGlobalStats()
    logger.info('Resetting all GLTF circuit breakers', { stats })
    // Note: This would require adding a resetAll method to the circuit breaker
  }
}

export const getGLTFCircuitBreakerStats = () => {
  const circuitBreaker = GlobalGLTFCircuitBreaker.getInstance()
  return circuitBreaker.getGlobalStats()
}

export const getGLTFComponentStatus = (componentId: string) => {
  const circuitBreaker = GlobalGLTFCircuitBreaker.getInstance()
  return circuitBreaker.getStatus(componentId)
}

// Hook for monitoring circuit breaker status
export const useGLTFCircuitBreakerStatus = (componentId?: string) => {
  const [stats, setStats] = useState(getGLTFCircuitBreakerStats())
  const [componentStatus, setComponentStatus] = useState(
    componentId ? getGLTFComponentStatus(componentId) : null
  )
  
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(getGLTFCircuitBreakerStats())
      if (componentId) {
        setComponentStatus(getGLTFComponentStatus(componentId))
      }
    }, 1000)
    
    return () => clearInterval(interval)
  }, [componentId])
  
  return {
    globalStats: stats,
    componentStatus,
    resetComponent: componentId ? () => resetGLTFCircuitBreaker(componentId) : undefined
  }
}

export default GLTFErrorBoundary