'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { logger } from '@lib/logger'
import { errorRecoveryUtils } from '../../utils/errorRecovery'
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor'

interface PerformanceErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo, performanceContext: PerformanceContext) => void
  onRecovery?: (recoveryType: string, performanceImpact: PerformanceImpact) => void
  onPerformanceDegradation?: (metrics: PerformanceMetrics) => void
  enableAutoRecovery?: boolean
  enablePerformanceMonitoring?: boolean
  enableAdaptiveQuality?: boolean
  maxRetries?: number
  retryDelay?: number
  performanceThresholds?: PerformanceThresholds
  qualitySettings?: QualitySettings
}

interface PerformanceErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
  isRecovering: boolean
  performanceContext: PerformanceContext
  qualityLevel: QualityLevel
  errorHistory: Array<{
    timestamp: number
    error: Error
    performanceContext: PerformanceContext
    recovered: boolean
  }>
}

// Performance-related types
interface PerformanceContext {
  fps: number
  memoryUsage: number
  renderTime: number
  loadTime: number
  errorCount: number
  recoveryTime: number
  qualityLevel: QualityLevel
  adaptiveQualityActive: boolean
}

interface PerformanceThresholds {
  minFPS: number
  maxMemoryUsage: number
  maxRenderTime: number
  maxLoadTime: number
  maxErrorRate: number
}

interface QualitySettings {
  resolution: number
  antialiasing: boolean
  shadows: boolean
  particles: boolean
  animations: boolean
  textures: 'low' | 'medium' | 'high'
}

interface PerformanceMetrics {
  fps: number
  frameTime: number
  renderTime: number
  memoryUsage?: {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  }
}

interface PerformanceImpact {
  fpsImprovement: number
  memoryReduction: number
  renderTimeReduction: number
  qualityReduction: number
}

enum QualityLevel {
  ULTRA = 'ultra',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  MINIMAL = 'minimal'
}

// Performance-aware error classification
const classifyPerformanceError = (
  error: Error,
  performanceContext: PerformanceContext
): {
  isPerformanceRelated: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
  suggestedAction: string
} => {
  const message = error.message.toLowerCase()
  const { fps, memoryUsage, renderTime, errorCount } = performanceContext
  
  // Memory-related errors
  if (message.includes('memory') || message.includes('heap') || 
      message.includes('allocation') || memoryUsage > 0.9) {
    return {
      isPerformanceRelated: true,
      severity: 'critical',
      suggestedAction: 'memory_cleanup'
    }
  }
  
  // FPS-related errors
  if (fps < 15 || message.includes('performance') || message.includes('slow')) {
    return {
      isPerformanceRelated: true,
      severity: 'high',
      suggestedAction: 'quality_reduction'
    }
  }
  
  // Render time issues
  if (renderTime > 50 || message.includes('render') || message.includes('timeout')) {
    return {
      isPerformanceRelated: true,
      severity: 'medium',
      suggestedAction: 'render_optimization'
    }
  }
  
  // High error rate
  if (errorCount > 5) {
    return {
      isPerformanceRelated: true,
      severity: 'high',
      suggestedAction: 'error_prevention'
    }
  }
  
  // WebGL/Graphics errors
  if (message.includes('webgl') || message.includes('context') || 
      message.includes('shader') || message.includes('texture')) {
    return {
      isPerformanceRelated: true,
      severity: 'medium',
      suggestedAction: 'graphics_fallback'
    }
  }
  
  return {
    isPerformanceRelated: false,
    severity: 'low',
    suggestedAction: 'standard_recovery'
  }
}

// Quality level adjustments based on performance
const getQualityAdjustment = (
  currentQuality: QualityLevel,
  performanceContext: PerformanceContext
): {
  newQuality: QualityLevel
  settings: QualitySettings
} => {
  const { fps, memoryUsage, renderTime } = performanceContext
  
  // Aggressive quality reduction for poor performance
  if (fps < 15 || memoryUsage > 0.9 || renderTime > 50) {
    return {
      newQuality: QualityLevel.MINIMAL,
      settings: {
        resolution: 0.5,
        antialiasing: false,
        shadows: false,
        particles: false,
        animations: false,
        textures: 'low'
      }
    }
  }
  
  // Moderate quality reduction
  if (fps < 25 || memoryUsage > 0.8 || renderTime > 35) {
    return {
      newQuality: QualityLevel.LOW,
      settings: {
        resolution: 0.75,
        antialiasing: false,
        shadows: false,
        particles: false,
        animations: true,
        textures: 'low'
      }
    }
  }
  
  // Minor quality reduction
  if (fps < 35 || memoryUsage > 0.7 || renderTime > 25) {
    return {
      newQuality: QualityLevel.MEDIUM,
      settings: {
        resolution: 0.85,
        antialiasing: true,
        shadows: true,
        particles: false,
        animations: true,
        textures: 'medium'
      }
    }
  }
  
  // High quality for good performance
  if (fps > 45 && memoryUsage < 0.6 && renderTime < 20) {
    return {
      newQuality: QualityLevel.HIGH,
      settings: {
        resolution: 1.0,
        antialiasing: true,
        shadows: true,
        particles: true,
        animations: true,
        textures: 'high'
      }
    }
  }
  
  // Ultra quality for excellent performance
  if (fps > 55 && memoryUsage < 0.5 && renderTime < 15) {
    return {
      newQuality: QualityLevel.ULTRA,
      settings: {
        resolution: 1.2,
        antialiasing: true,
        shadows: true,
        particles: true,
        animations: true,
        textures: 'high'
      }
    }
  }
  
  // Return current quality if no change needed
  return {
    newQuality: currentQuality,
    settings: {
      resolution: 1.0,
      antialiasing: true,
      shadows: true,
      particles: true,
      animations: true,
      textures: 'high'
    }
  }
}

/**
 * Performance-aware Error Boundary with adaptive quality control
 */
export class PerformanceErrorBoundary extends Component<PerformanceErrorBoundaryProps, PerformanceErrorBoundaryState> {
  private performanceMonitor: ReturnType<typeof usePerformanceMonitor> | null = null
  private recoveryTimer: NodeJS.Timeout | null = null
  private performanceCheckInterval: NodeJS.Timeout | null = null
  private mountedRef = { current: true }
  
  constructor(props: PerformanceErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRecovering: false,
      performanceContext: {
        fps: 60,
        memoryUsage: 0,
        renderTime: 0,
        loadTime: 0,
        errorCount: 0,
        recoveryTime: 0,
        qualityLevel: QualityLevel.HIGH,
        adaptiveQualityActive: false
      },
      qualityLevel: QualityLevel.HIGH,
      errorHistory: []
    }
  }
  
  static getDerivedStateFromError(error: Error): Partial<PerformanceErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }
  
  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const {
      onError,
      enableAutoRecovery = true,
      enableAdaptiveQuality = true,
      maxRetries = 3,
      retryDelay = 1000
    } = this.props
    
    const { retryCount, performanceContext } = this.state
    const performanceClassification = classifyPerformanceError(error, performanceContext)
    
    // Enhanced logging with performance context
    logger.error('Performance Error Boundary caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      performanceContext,
      performanceClassification,
      retryCount,
      timestamp: new Date().toISOString()
    })
    
    // Record error in performance monitoring
    if (this.performanceMonitor) {
      errorRecoveryUtils.monitor.recordError(error, 'PerformanceErrorBoundary', false)
    }
    
    // Update state with error and performance context
    this.setState(prevState => ({
      error,
      errorInfo,
      retryCount: prevState.retryCount + 1,
      performanceContext: {
        ...prevState.performanceContext,
        errorCount: prevState.performanceContext.errorCount + 1
      },
      errorHistory: [
        ...prevState.errorHistory,
        {
          timestamp: Date.now(),
          error,
          performanceContext,
          recovered: false
        }
      ].slice(-20) // Keep last 20 errors
    }))
    
    // Call custom error handler with performance context
    if (onError) {
      onError(error, errorInfo, performanceContext)
    }
    
    // Performance-based recovery logic
    if (enableAutoRecovery && retryCount < maxRetries) {
      if (performanceClassification.isPerformanceRelated) {
        this.schedulePerformanceRecovery(performanceClassification, retryDelay)
      } else {
        this.scheduleStandardRecovery(retryDelay)
      }
    }
    
    // Adaptive quality adjustment
    if (enableAdaptiveQuality && performanceClassification.isPerformanceRelated) {
      this.adjustQualitySettings()
    }
  }
  
  override componentDidMount() {
    this.mountedRef.current = true
    
    // Initialize performance monitoring
    if (this.props.enablePerformanceMonitoring) {
      this.startPerformanceMonitoring()
    }
  }
  
  override componentWillUnmount() {
    this.mountedRef.current = false
    
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer)
      this.recoveryTimer = null
    }
    
    if (this.performanceCheckInterval) {
      clearInterval(this.performanceCheckInterval)
      this.performanceCheckInterval = null
    }
  }
  
  private startPerformanceMonitoring = () => {
    // Performance monitoring with adaptive quality
    this.performanceCheckInterval = setInterval(() => {
      if (this.mountedRef.current === false) return
      
      const performanceMetrics = this.getPerformanceMetrics()
      const performanceContext = this.updatePerformanceContext(performanceMetrics)
      
      // Check for performance degradation
      if (this.shouldTriggerPerformanceRecovery(performanceContext)) {
        this.handlePerformanceDegradation(performanceContext)
      }
      
      // Adaptive quality adjustment
      if (this.props.enableAdaptiveQuality) {
        this.checkAdaptiveQuality(performanceContext)
      }
    }, 2000) // Check every 2 seconds
  }
  
  private getPerformanceMetrics = (): PerformanceMetrics => {
    // Get performance metrics from browser APIs
    const performanceEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const memoryInfo = (performance as any).memory
    
    return {
      fps: 60, // This would be measured from animation frame callbacks
      frameTime: 16.67, // 1000ms / 60fps
      renderTime: performanceEntry?.loadEventEnd - performanceEntry?.loadEventStart || 0,
      memoryUsage: memoryInfo ? {
        usedJSHeapSize: memoryInfo.usedJSHeapSize,
        totalJSHeapSize: memoryInfo.totalJSHeapSize,
        jsHeapSizeLimit: memoryInfo.jsHeapSizeLimit
      } : undefined
    }
  }
  
  private updatePerformanceContext = (metrics: PerformanceMetrics): PerformanceContext => {
    const memoryUsageRatio = metrics.memoryUsage 
      ? metrics.memoryUsage.usedJSHeapSize / metrics.memoryUsage.jsHeapSizeLimit
      : 0
    
    const newContext: PerformanceContext = {
      fps: metrics.fps,
      memoryUsage: memoryUsageRatio,
      renderTime: metrics.renderTime,
      loadTime: metrics.renderTime,
      errorCount: this.state.performanceContext.errorCount,
      recoveryTime: this.state.performanceContext.recoveryTime,
      qualityLevel: this.state.qualityLevel,
      adaptiveQualityActive: this.state.performanceContext.adaptiveQualityActive
    }
    
    this.setState({ performanceContext: newContext })
    return newContext
  }
  
  private shouldTriggerPerformanceRecovery = (context: PerformanceContext): boolean => {
    const {
      performanceThresholds = {
        minFPS: 20,
        maxMemoryUsage: 0.8,
        maxRenderTime: 50,
        maxLoadTime: 5000,
        maxErrorRate: 0.1
      }
    } = this.props
    
    return (
      context.fps < performanceThresholds.minFPS ||
      context.memoryUsage > performanceThresholds.maxMemoryUsage ||
      context.renderTime > performanceThresholds.maxRenderTime ||
      context.loadTime > performanceThresholds.maxLoadTime ||
      context.errorCount > 3
    )
  }
  
  private handlePerformanceDegradation = (context: PerformanceContext) => {
    logger.warn('Performance degradation detected:', context)
    
    if (this.props.onPerformanceDegradation) {
      this.props.onPerformanceDegradation({
        fps: context.fps,
        frameTime: 1000 / context.fps,
        renderTime: context.renderTime,
        memoryUsage: context.memoryUsage ? {
          usedJSHeapSize: context.memoryUsage * 1024 * 1024 * 1024,
          totalJSHeapSize: context.memoryUsage * 1024 * 1024 * 1024,
          jsHeapSizeLimit: 1024 * 1024 * 1024
        } : undefined
      })
    }
    
    // Trigger automatic quality reduction
    if (this.props.enableAdaptiveQuality) {
      this.adjustQualitySettings()
    }
  }
  
  private checkAdaptiveQuality = (context: PerformanceContext) => {
    const qualityAdjustment = getQualityAdjustment(this.state.qualityLevel, context)
    
    if (qualityAdjustment.newQuality !== this.state.qualityLevel) {
      logger.info(`Adaptive quality change: ${this.state.qualityLevel} → ${qualityAdjustment.newQuality}`)
      
      this.setState({
        qualityLevel: qualityAdjustment.newQuality,
        performanceContext: {
          ...context,
          qualityLevel: qualityAdjustment.newQuality,
          adaptiveQualityActive: true
        }
      })
    }
  }
  
  private adjustQualitySettings = () => {
    const { performanceContext } = this.state
    const qualityAdjustment = getQualityAdjustment(this.state.qualityLevel, performanceContext)
    
    logger.info('Adjusting quality settings due to performance issues:', qualityAdjustment)
    
    this.setState({
      qualityLevel: qualityAdjustment.newQuality,
      performanceContext: {
        ...performanceContext,
        qualityLevel: qualityAdjustment.newQuality,
        adaptiveQualityActive: true
      }
    })
  }
  
  private schedulePerformanceRecovery = (
    classification: ReturnType<typeof classifyPerformanceError>,
    delay: number
  ) => {
    this.setState({ isRecovering: true })
    
    this.recoveryTimer = setTimeout(() => {
      this.attemptPerformanceRecovery(classification)
    }, delay)
  }
  
  private scheduleStandardRecovery = (delay: number) => {
    this.setState({ isRecovering: true })
    
    this.recoveryTimer = setTimeout(() => {
      this.attemptStandardRecovery()
    }, delay)
  }
  
  private attemptPerformanceRecovery = async (
    classification: ReturnType<typeof classifyPerformanceError>
  ) => {
    if (this.mountedRef.current === false) return
    
    const recoveryStartTime = Date.now()
    
    try {
      logger.info(`Attempting performance recovery: ${classification.suggestedAction}`)
      
      switch (classification.suggestedAction) {
        case 'memory_cleanup':
          await this.performMemoryCleanup()
          break
        
        case 'quality_reduction':
          await this.performQualityReduction()
          break
        
        case 'render_optimization':
          await this.performRenderOptimization()
          break
        
        case 'error_prevention':
          await this.performErrorPrevention()
          break
        
        case 'graphics_fallback':
          await this.performGraphicsFallback()
          break
        
        case 'standard_recovery':
        default:
          await this.performStandardRecovery()
          break
      }
      
      // Calculate recovery impact
      const recoveryTime = Date.now() - recoveryStartTime
      const performanceImpact = this.calculatePerformanceImpact(recoveryStartTime)
      
      // Mark recovery as successful
      if (this.mountedRef.current) {
        this.setState(prevState => ({
          hasError: false,
          error: null,
          errorInfo: null,
          isRecovering: false,
          performanceContext: {
            ...prevState.performanceContext,
            recoveryTime
          },
          errorHistory: prevState.errorHistory.map((entry, index) => 
            index === prevState.errorHistory.length - 1 
              ? { ...entry, recovered: true }
              : entry
          )
        }))
        
        if (this.props.onRecovery) {
          this.props.onRecovery(classification.suggestedAction, performanceImpact)
        }
      }
    } catch (recoveryError) {
      logger.error('Performance recovery failed:', recoveryError)
      
      if (this.mountedRef.current) {
        this.setState({ isRecovering: false })
      }
    }
  }
  
  private attemptStandardRecovery = async () => {
    if (this.mountedRef.current === false) return
    
    await new Promise(resolve => setTimeout(resolve, 500))
    
    if (this.mountedRef.current) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRecovering: false
      })
    }
  }
  
  private performMemoryCleanup = async () => {
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
    
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  private performQualityReduction = async () => {
    // Reduce quality settings
    const { performanceContext } = this.state
    const qualityAdjustment = getQualityAdjustment(QualityLevel.LOW, performanceContext)
    
    this.setState({
      qualityLevel: qualityAdjustment.newQuality,
      performanceContext: {
        ...performanceContext,
        qualityLevel: qualityAdjustment.newQuality,
        adaptiveQualityActive: true
      }
    })
    
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  private performRenderOptimization = async () => {
    // Optimize rendering settings
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  
  private performErrorPrevention = async () => {
    // Implement error prevention strategies
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  private performGraphicsFallback = async () => {
    // Switch to graphics fallback
    errorRecoveryUtils.dragonFallback.getNextFallback()
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  private performStandardRecovery = async () => {
    // Standard recovery process
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  private calculatePerformanceImpact = (recoveryStartTime: number): PerformanceImpact => {
    const { performanceContext } = this.state
    
    // This would calculate actual performance improvements
    // For now, return estimated values
    return {
      fpsImprovement: 5,
      memoryReduction: 0.1,
      renderTimeReduction: 5,
      qualityReduction: performanceContext.adaptiveQualityActive ? 0.2 : 0
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
  }
  
  private renderPerformanceErrorUI = () => {
    const { 
      error, 
      performanceContext, 
      qualityLevel, 
      retryCount, 
      isRecovering 
    } = this.state
    const { maxRetries = 3, enableAutoRecovery = true } = this.props
    
    if (isRecovering) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-8">
          <div className="bg-blue-900/50 border border-blue-500 rounded-lg p-8 max-w-lg text-center text-white">
            <div className="animate-pulse text-4xl mb-4">⚡</div>
            <h2 className="text-2xl font-bold mb-4">Performance Recovery</h2>
            <p className="text-blue-200 mb-6">
              Optimizing performance and recovering from errors...
            </p>
            <div className="text-left bg-black/20 p-4 rounded mb-4">
              <h3 className="font-semibold mb-2">Current Performance:</h3>
              <div className="text-sm space-y-1">
                <div>FPS: {performanceContext.fps.toFixed(1)}</div>
                <div>Memory: {(performanceContext.memoryUsage * 100).toFixed(1)}%</div>
                <div>Quality: {qualityLevel}</div>
                <div>Adaptive: {performanceContext.adaptiveQualityActive ? 'Active' : 'Inactive'}</div>
              </div>
            </div>
          </div>
        </div>
      )
    }
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-orange-900 to-yellow-900 flex items-center justify-center p-8">
        <div className="bg-black/30 border border-red-500 rounded-lg p-8 max-w-lg text-center text-white">
          <div className="text-4xl mb-4">📊</div>
          <h2 className="text-2xl font-bold mb-4">Performance Error</h2>
          <p className="text-red-200 mb-6">
            A performance-related error occurred. The system is optimizing settings to improve stability.
          </p>
          
          <div className="text-left bg-black/20 p-4 rounded mb-4">
            <h3 className="font-semibold mb-2">Performance Metrics:</h3>
            <div className="text-sm space-y-1">
              <div>FPS: {performanceContext.fps.toFixed(1)}</div>
              <div>Memory Usage: {(performanceContext.memoryUsage * 100).toFixed(1)}%</div>
              <div>Render Time: {performanceContext.renderTime.toFixed(1)}ms</div>
              <div>Quality Level: {qualityLevel}</div>
              <div>Error Count: {performanceContext.errorCount}</div>
              <div>Adaptive Quality: {performanceContext.adaptiveQualityActive ? 'Active' : 'Inactive'}</div>
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
            {enableAutoRecovery && retryCount < maxRetries && (
              <button
                onClick={this.handleManualRetry}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Retry with Optimized Settings ({maxRetries - retryCount} attempts left)
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
    const { children, fallback } = this.props
    const { hasError } = this.state
    
    if (hasError) {
      return fallback || this.renderPerformanceErrorUI()
    }
    
    return children
  }
}

// Higher-order component for performance error boundary
export function withPerformanceErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<PerformanceErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <PerformanceErrorBoundary {...options}>
      <Component {...props} />
    </PerformanceErrorBoundary>
  )
  
  WrappedComponent.displayName = `withPerformanceErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

export default PerformanceErrorBoundary