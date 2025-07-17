/**
 * Performance Monitoring and Degradation Detection for Voice Features
 */

import { logger } from './logger'
import { voiceErrorRecovery } from './voice-error-recovery'
import { networkMonitor } from './network-monitor'

// ============================================================================
// Performance Monitoring Types
// ============================================================================

export enum VoicePerformanceState {
  OPTIMAL = 'optimal',
  GOOD = 'good',
  DEGRADED = 'degraded',
  POOR = 'poor',
  CRITICAL = 'critical'
}

export enum VoiceOperationType {
  SPEECH_RECOGNITION = 'speech_recognition',
  TEXT_TO_SPEECH = 'text_to_speech',
  AUDIO_PLAYBACK = 'audio_playback',
  MICROPHONE_INPUT = 'microphone_input',
  DRAGON_ANIMATION = 'dragon_animation',
  NETWORK_REQUEST = 'network_request'
}

export interface VoicePerformanceMetrics {
  timestamp: Date
  operationType: VoiceOperationType
  duration: number
  success: boolean
  errorMessage?: string
  metadata?: Record<string, any>
}

export interface VoiceSystemHealth {
  overallState: VoicePerformanceState
  recognitionLatency: number
  synthesisLatency: number
  audioLatency: number
  networkLatency: number
  dragonRenderingFPS: number
  memoryUsage: number
  cpuUsage: number
  errorRate: number
  successRate: number
  lastUpdated: Date
}

export interface PerformanceDegradationAlert {
  id: string
  timestamp: Date
  severity: 'low' | 'medium' | 'high' | 'critical'
  type: 'latency' | 'error_rate' | 'memory' | 'network' | 'rendering'
  message: string
  metrics: Record<string, number>
  suggestedActions: string[]
  autoActionTaken: boolean
}

export interface VoicePerformanceConfig {
  enableRealTimeMonitoring: boolean
  metricsRetentionPeriod: number
  alertThresholds: {
    recognitionLatency: number
    synthesisLatency: number
    audioLatency: number
    errorRate: number
    memoryUsage: number
    renderingFPS: number
  }
  autoOptimization: boolean
  degradationActions: {
    enableQualityReduction: boolean
    enableFallbackModes: boolean
    enableCaching: boolean
    enableThrottling: boolean
  }
}

// ============================================================================
// Voice Performance Monitor
// ============================================================================

export class VoicePerformanceMonitor {
  private static instance: VoicePerformanceMonitor
  private config: VoicePerformanceConfig
  private metrics: VoicePerformanceMetrics[] = []
  private systemHealth: VoiceSystemHealth
  private alerts: PerformanceDegradationAlert[] = []
  private listeners: Set<(health: VoiceSystemHealth) => void> = new Set()
  private alertListeners: Set<(alert: PerformanceDegradationAlert) => void> = new Set()
  private monitoringInterval?: NodeJS.Timeout
  private isMonitoring = false
  private operationStartTimes: Map<string, number> = new Map()
  private performanceObserver?: PerformanceObserver

  private constructor() {
    this.config = {
      enableRealTimeMonitoring: true,
      metricsRetentionPeriod: 300000, // 5 minutes
      alertThresholds: {
        recognitionLatency: 2000,    // 2 seconds
        synthesisLatency: 3000,      // 3 seconds
        audioLatency: 500,           // 500ms
        errorRate: 0.2,              // 20%
        memoryUsage: 500,            // 500MB
        renderingFPS: 30             // 30 FPS
      },
      autoOptimization: true,
      degradationActions: {
        enableQualityReduction: true,
        enableFallbackModes: true,
        enableCaching: true,
        enableThrottling: true
      }
    }

    this.systemHealth = {
      overallState: VoicePerformanceState.OPTIMAL,
      recognitionLatency: 0,
      synthesisLatency: 0,
      audioLatency: 0,
      networkLatency: 0,
      dragonRenderingFPS: 60,
      memoryUsage: 0,
      cpuUsage: 0,
      errorRate: 0,
      successRate: 1.0,
      lastUpdated: new Date()
    }

    this.setupPerformanceObserver()
  }

  static getInstance(): VoicePerformanceMonitor {
    if (!this.instance) {
      this.instance = new VoicePerformanceMonitor()
    }
    return this.instance
  }

  private setupPerformanceObserver(): void {
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          for (const entry of entries) {
            if (entry.name.startsWith('voice_')) {
              this.processPerformanceEntry(entry)
            }
          }
        })

        this.performanceObserver.observe({ 
          entryTypes: ['measure', 'navigation', 'resource'] 
        })
      } catch (error) {
        logger.warn('Performance Observer not available:', error)
      }
    }
  }

  private processPerformanceEntry(entry: PerformanceEntry): void {
    const operationType = this.mapEntryNameToOperationType(entry.name)
    
    if (operationType) {
      this.recordMetric({
        timestamp: new Date(performance.timeOrigin + entry.startTime),
        operationType,
        duration: entry.duration,
        success: true, // Assume success if measured
        metadata: {
          entryType: entry.entryType,
          name: entry.name
        }
      })
    }
  }

  private mapEntryNameToOperationType(name: string): VoiceOperationType | null {
    if (name.includes('speech_recognition')) return VoiceOperationType.SPEECH_RECOGNITION
    if (name.includes('tts') || name.includes('synthesis')) return VoiceOperationType.TEXT_TO_SPEECH
    if (name.includes('audio_playback')) return VoiceOperationType.AUDIO_PLAYBACK
    if (name.includes('microphone')) return VoiceOperationType.MICROPHONE_INPUT
    if (name.includes('dragon') || name.includes('rendering')) return VoiceOperationType.DRAGON_ANIMATION
    if (name.includes('network') || name.includes('fetch')) return VoiceOperationType.NETWORK_REQUEST
    return null
  }

  // ============================================================================
  // Public API
  // ============================================================================

  public startMonitoring(): void {
    if (this.isMonitoring) return

    this.isMonitoring = true
    
    // Start real-time monitoring
    this.monitoringInterval = setInterval(() => {
      this.updateSystemHealth()
      this.checkForDegradation()
      this.cleanupOldMetrics()
    }, 5000) // Update every 5 seconds

    // Monitor network performance
    networkMonitor.addListener((event) => {
      this.recordNetworkPerformance(event)
    })

    logger.info('Voice performance monitoring started')
  }

  public stopMonitoring(): void {
    if (!this.isMonitoring) return

    this.isMonitoring = false

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = undefined
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect()
    }

    logger.info('Voice performance monitoring stopped')
  }

  public recordMetric(metric: VoicePerformanceMetrics): void {
    this.metrics.push(metric)
    
    // Immediately update relevant health metrics
    this.updateHealthMetricForOperation(metric)
    
    // Check for immediate performance issues
    if (metric.duration > this.getLatencyThreshold(metric.operationType)) {
      this.handleLatencyAlert(metric)
    }
    
    if (!metric.success) {
      this.handleErrorAlert(metric)
    }
  }

  public startOperation(operationId: string, operationType: VoiceOperationType): void {
    this.operationStartTimes.set(operationId, performance.now())
    
    // Mark performance for browser measurement
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`voice_${operationType}_start_${operationId}`)
    }
  }

  public endOperation(
    operationId: string, 
    operationType: VoiceOperationType, 
    success: boolean = true, 
    errorMessage?: string,
    metadata?: Record<string, any>
  ): void {
    const startTime = this.operationStartTimes.get(operationId)
    if (!startTime) {
      logger.warn(`No start time found for operation ${operationId}`)
      return
    }

    const duration = performance.now() - startTime
    this.operationStartTimes.delete(operationId)

    // Mark performance end and measure
    if (typeof performance !== 'undefined' && performance.mark && performance.measure) {
      const startMark = `voice_${operationType}_start_${operationId}`
      const endMark = `voice_${operationType}_end_${operationId}`
      const measureName = `voice_${operationType}_${operationId}`
      
      performance.mark(endMark)
      try {
        performance.measure(measureName, startMark, endMark)
      } catch (error) {
        // Ignore measurement errors
      }
    }

    this.recordMetric({
      timestamp: new Date(),
      operationType,
      duration,
      success,
      errorMessage,
      metadata
    })
  }

  public getSystemHealth(): VoiceSystemHealth {
    return { ...this.systemHealth }
  }

  public getRecentMetrics(count: number = 100): VoicePerformanceMetrics[] {
    return this.metrics.slice(-count)
  }

  public getAlerts(severity?: 'low' | 'medium' | 'high' | 'critical'): PerformanceDegradationAlert[] {
    if (severity) {
      return this.alerts.filter(alert => alert.severity === severity)
    }
    return [...this.alerts]
  }

  public addHealthListener(listener: (health: VoiceSystemHealth) => void): void {
    this.listeners.add(listener)
  }

  public removeHealthListener(listener: (health: VoiceSystemHealth) => void): void {
    this.listeners.delete(listener)
  }

  public addAlertListener(listener: (alert: PerformanceDegradationAlert) => void): void {
    this.alertListeners.add(listener)
  }

  public removeAlertListener(listener: (alert: PerformanceDegradationAlert) => void): void {
    this.alertListeners.delete(listener)
  }

  public updateConfig(config: Partial<VoicePerformanceConfig>): void {
    this.config = { ...this.config, ...config }
    logger.info('Voice performance monitor config updated', config)
  }

  // ============================================================================
  // Health Monitoring
  // ============================================================================

  private updateSystemHealth(): void {
    const recentMetrics = this.getRecentMetrics(50) // Last 50 operations
    if (recentMetrics.length === 0) return

    // Calculate latencies by operation type
    this.systemHealth.recognitionLatency = this.calculateAverageLatency(
      recentMetrics, VoiceOperationType.SPEECH_RECOGNITION
    )
    this.systemHealth.synthesisLatency = this.calculateAverageLatency(
      recentMetrics, VoiceOperationType.TEXT_TO_SPEECH
    )
    this.systemHealth.audioLatency = this.calculateAverageLatency(
      recentMetrics, VoiceOperationType.AUDIO_PLAYBACK
    )
    this.systemHealth.networkLatency = this.calculateAverageLatency(
      recentMetrics, VoiceOperationType.NETWORK_REQUEST
    )

    // Calculate error rate
    const totalOperations = recentMetrics.length
    const failedOperations = recentMetrics.filter(m => !m.success).length
    this.systemHealth.errorRate = totalOperations > 0 ? failedOperations / totalOperations : 0
    this.systemHealth.successRate = 1 - this.systemHealth.errorRate

    // Update memory usage
    this.updateMemoryUsage()

    // Update rendering FPS
    this.updateRenderingFPS()

    // Update network latency from network monitor
    const networkMetrics = networkMonitor.getCurrentMetrics()
    this.systemHealth.networkLatency = networkMetrics.latency

    // Determine overall state
    this.systemHealth.overallState = this.calculateOverallState()
    this.systemHealth.lastUpdated = new Date()

    // Notify listeners
    this.notifyHealthListeners()
  }

  private calculateAverageLatency(metrics: VoicePerformanceMetrics[], operationType: VoiceOperationType): number {
    const typeMetrics = metrics.filter(m => m.operationType === operationType && m.success)
    if (typeMetrics.length === 0) return 0
    
    const totalLatency = typeMetrics.reduce((sum, m) => sum + m.duration, 0)
    return totalLatency / typeMetrics.length
  }

  private updateMemoryUsage(): void {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory
      this.systemHealth.memoryUsage = memory.usedJSHeapSize / 1024 / 1024 // MB
    }
  }

  private updateRenderingFPS(): void {
    // FPS calculation would typically come from the dragon rendering system
    // For now, we'll estimate based on animation performance
    const animationMetrics = this.getRecentMetrics(10).filter(
      m => m.operationType === VoiceOperationType.DRAGON_ANIMATION
    )
    
    if (animationMetrics.length > 0) {
      const avgFrameTime = this.calculateAverageLatency(animationMetrics, VoiceOperationType.DRAGON_ANIMATION)
      this.systemHealth.dragonRenderingFPS = avgFrameTime > 0 ? 1000 / avgFrameTime : 60
    }
  }

  private calculateOverallState(): VoicePerformanceState {
    const thresholds = this.config.alertThresholds
    let score = 100

    // Deduct points for high latencies
    if (this.systemHealth.recognitionLatency > thresholds.recognitionLatency) score -= 20
    if (this.systemHealth.synthesisLatency > thresholds.synthesisLatency) score -= 20
    if (this.systemHealth.audioLatency > thresholds.audioLatency) score -= 15

    // Deduct points for high error rate
    if (this.systemHealth.errorRate > thresholds.errorRate) score -= 25

    // Deduct points for low FPS
    if (this.systemHealth.dragonRenderingFPS < thresholds.renderingFPS) score -= 10

    // Deduct points for high memory usage
    if (this.systemHealth.memoryUsage > thresholds.memoryUsage) score -= 10

    // Determine state based on score
    if (score >= 90) return VoicePerformanceState.OPTIMAL
    if (score >= 75) return VoicePerformanceState.GOOD
    if (score >= 60) return VoicePerformanceState.DEGRADED
    if (score >= 40) return VoicePerformanceState.POOR
    return VoicePerformanceState.CRITICAL
  }

  // ============================================================================
  // Degradation Detection and Alerts
  // ============================================================================

  private checkForDegradation(): void {
    this.checkLatencyDegradation()
    this.checkErrorRateDegradation()
    this.checkMemoryDegradation()
    this.checkRenderingDegradation()
  }

  private checkLatencyDegradation(): void {
    const thresholds = this.config.alertThresholds

    if (this.systemHealth.recognitionLatency > thresholds.recognitionLatency) {
      this.createAlert({
        severity: this.systemHealth.recognitionLatency > thresholds.recognitionLatency * 2 ? 'critical' : 'high',
        type: 'latency',
        message: `Speech recognition latency is high: ${this.systemHealth.recognitionLatency.toFixed(0)}ms`,
        metrics: { recognitionLatency: this.systemHealth.recognitionLatency },
        suggestedActions: [
          'Check network connection',
          'Reduce background applications',
          'Consider using text input'
        ]
      })
    }

    if (this.systemHealth.synthesisLatency > thresholds.synthesisLatency) {
      this.createAlert({
        severity: this.systemHealth.synthesisLatency > thresholds.synthesisLatency * 2 ? 'critical' : 'high',
        type: 'latency',
        message: `Voice synthesis latency is high: ${this.systemHealth.synthesisLatency.toFixed(0)}ms`,
        metrics: { synthesisLatency: this.systemHealth.synthesisLatency },
        suggestedActions: [
          'Check API service status',
          'Reduce voice quality',
          'Use browser TTS fallback'
        ]
      })
    }
  }

  private checkErrorRateDegradation(): void {
    if (this.systemHealth.errorRate > this.config.alertThresholds.errorRate) {
      this.createAlert({
        severity: this.systemHealth.errorRate > 0.5 ? 'critical' : 'high',
        type: 'error_rate',
        message: `High error rate in voice operations: ${(this.systemHealth.errorRate * 100).toFixed(1)}%`,
        metrics: { errorRate: this.systemHealth.errorRate },
        suggestedActions: [
          'Check network connectivity',
          'Verify microphone permissions',
          'Restart voice features'
        ]
      })
    }
  }

  private checkMemoryDegradation(): void {
    if (this.systemHealth.memoryUsage > this.config.alertThresholds.memoryUsage) {
      this.createAlert({
        severity: this.systemHealth.memoryUsage > this.config.alertThresholds.memoryUsage * 1.5 ? 'critical' : 'medium',
        type: 'memory',
        message: `High memory usage: ${this.systemHealth.memoryUsage.toFixed(0)}MB`,
        metrics: { memoryUsage: this.systemHealth.memoryUsage },
        suggestedActions: [
          'Close unused browser tabs',
          'Reduce dragon animation quality',
          'Enable memory optimization'
        ]
      })
    }
  }

  private checkRenderingDegradation(): void {
    if (this.systemHealth.dragonRenderingFPS < this.config.alertThresholds.renderingFPS) {
      this.createAlert({
        severity: this.systemHealth.dragonRenderingFPS < 15 ? 'high' : 'medium',
        type: 'rendering',
        message: `Low rendering performance: ${this.systemHealth.dragonRenderingFPS.toFixed(1)} FPS`,
        metrics: { renderingFPS: this.systemHealth.dragonRenderingFPS },
        suggestedActions: [
          'Reduce graphics quality',
          'Switch to 2D dragon mode',
          'Close other applications'
        ]
      })
    }
  }

  private createAlert(alertData: Omit<PerformanceDegradationAlert, 'id' | 'timestamp' | 'autoActionTaken'>): void {
    const alert: PerformanceDegradationAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      autoActionTaken: false,
      ...alertData
    }

    // Check if we already have a similar recent alert
    const recentSimilarAlert = this.alerts.find(
      existingAlert =>
        existingAlert.type === alert.type &&
        Date.now() - existingAlert.timestamp.getTime() < 30000 // 30 seconds
    )

    if (recentSimilarAlert) {
      logger.debug('Suppressing duplicate alert:', alert.message)
      return
    }

    this.alerts.push(alert)

    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50)
    }

    logger.warn('Performance degradation detected:', alert)

    // Take automatic action if enabled
    if (this.config.autoOptimization) {
      this.takeAutomaticAction(alert)
    }

    // Notify listeners
    this.notifyAlertListeners(alert)
  }

  private takeAutomaticAction(alert: PerformanceDegradationAlert): void {
    let actionTaken = false

    switch (alert.type) {
      case 'latency':
        if (this.config.degradationActions.enableThrottling) {
          // Implement request throttling
          actionTaken = true
        }
        break
      case 'memory':
        if (this.config.degradationActions.enableQualityReduction) {
          // Reduce quality automatically
          actionTaken = true
        }
        break
      case 'rendering':
        if (this.config.degradationActions.enableFallbackModes) {
          // Switch to 2D rendering
          actionTaken = true
        }
        break
      case 'error_rate':
        if (this.config.degradationActions.enableCaching) {
          // Enable aggressive caching
          actionTaken = true
        }
        break
    }

    if (actionTaken) {
      alert.autoActionTaken = true
      logger.info(`Automatic action taken for ${alert.type} degradation`)
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private updateHealthMetricForOperation(metric: VoicePerformanceMetrics): void {
    // Update relevant health metric immediately for responsive monitoring
    switch (metric.operationType) {
      case VoiceOperationType.SPEECH_RECOGNITION:
        this.systemHealth.recognitionLatency = metric.duration
        break
      case VoiceOperationType.TEXT_TO_SPEECH:
        this.systemHealth.synthesisLatency = metric.duration
        break
      case VoiceOperationType.AUDIO_PLAYBACK:
        this.systemHealth.audioLatency = metric.duration
        break
      case VoiceOperationType.NETWORK_REQUEST:
        this.systemHealth.networkLatency = metric.duration
        break
    }
  }

  private handleLatencyAlert(metric: VoicePerformanceMetrics): void {
    const threshold = this.getLatencyThreshold(metric.operationType)
    logger.warn(`High latency detected for ${metric.operationType}: ${metric.duration}ms (threshold: ${threshold}ms)`)
  }

  private handleErrorAlert(metric: VoicePerformanceMetrics): void {
    logger.error(`Operation failed: ${metric.operationType}`, {
      duration: metric.duration,
      error: metric.errorMessage,
      metadata: metric.metadata
    })
  }

  private getLatencyThreshold(operationType: VoiceOperationType): number {
    switch (operationType) {
      case VoiceOperationType.SPEECH_RECOGNITION:
        return this.config.alertThresholds.recognitionLatency
      case VoiceOperationType.TEXT_TO_SPEECH:
        return this.config.alertThresholds.synthesisLatency
      case VoiceOperationType.AUDIO_PLAYBACK:
        return this.config.alertThresholds.audioLatency
      default:
        return 1000 // 1 second default
    }
  }

  private recordNetworkPerformance(event: any): void {
    this.recordMetric({
      timestamp: new Date(),
      operationType: VoiceOperationType.NETWORK_REQUEST,
      duration: event.current.latency,
      success: event.current.isOnline,
      metadata: {
        networkStatus: event.current.status,
        quality: event.current.quality
      }
    })
  }

  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - this.config.metricsRetentionPeriod
    this.metrics = this.metrics.filter(metric => metric.timestamp.getTime() > cutoffTime)
  }

  private notifyHealthListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.systemHealth)
      } catch (error) {
        logger.error('Health listener error:', error)
      }
    })
  }

  private notifyAlertListeners(alert: PerformanceDegradationAlert): void {
    this.alertListeners.forEach(listener => {
      try {
        listener(alert)
      } catch (error) {
        logger.error('Alert listener error:', error)
      }
    })
  }

  public dispose(): void {
    this.stopMonitoring()
    this.listeners.clear()
    this.alertListeners.clear()
    this.metrics = []
    this.alerts = []
    this.operationStartTimes.clear()
    logger.debug('Voice performance monitor disposed')
  }
}

// ============================================================================
// Performance Hook for React Components
// ============================================================================

import { useEffect, useState, useCallback } from 'react'

export function useVoicePerformanceMonitoring() {
  const [health, setHealth] = useState<VoiceSystemHealth | null>(null)
  const [alerts, setAlerts] = useState<PerformanceDegradationAlert[]>([])
  const [isMonitoring, setIsMonitoring] = useState(false)

  useEffect(() => {
    const monitor = VoicePerformanceMonitor.getInstance()

    const healthListener = (newHealth: VoiceSystemHealth) => {
      setHealth(newHealth)
    }

    const alertListener = (alert: PerformanceDegradationAlert) => {
      setAlerts(prev => [...prev, alert].slice(-10)) // Keep last 10 alerts
    }

    monitor.addHealthListener(healthListener)
    monitor.addAlertListener(alertListener)

    // Get initial state
    setHealth(monitor.getSystemHealth())
    setAlerts(monitor.getAlerts().slice(-10))

    return () => {
      monitor.removeHealthListener(healthListener)
      monitor.removeAlertListener(alertListener)
    }
  }, [])

  const startMonitoring = useCallback(() => {
    const monitor = VoicePerformanceMonitor.getInstance()
    monitor.startMonitoring()
    setIsMonitoring(true)
  }, [])

  const stopMonitoring = useCallback(() => {
    const monitor = VoicePerformanceMonitor.getInstance()
    monitor.stopMonitoring()
    setIsMonitoring(false)
  }, [])

  const recordOperation = useCallback((
    operationId: string,
    operationType: VoiceOperationType,
    duration: number,
    success: boolean = true,
    errorMessage?: string
  ) => {
    const monitor = VoicePerformanceMonitor.getInstance()
    monitor.recordMetric({
      timestamp: new Date(),
      operationType,
      duration,
      success,
      errorMessage
    })
  }, [])

  const startOperation = useCallback((operationId: string, operationType: VoiceOperationType) => {
    const monitor = VoicePerformanceMonitor.getInstance()
    monitor.startOperation(operationId, operationType)
  }, [])

  const endOperation = useCallback((
    operationId: string,
    operationType: VoiceOperationType,
    success: boolean = true,
    errorMessage?: string
  ) => {
    const monitor = VoicePerformanceMonitor.getInstance()
    monitor.endOperation(operationId, operationType, success, errorMessage)
  }, [])

  return {
    health,
    alerts,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    recordOperation,
    startOperation,
    endOperation
  }
}

// Export singleton instance
export const voicePerformanceMonitor = VoicePerformanceMonitor.getInstance()