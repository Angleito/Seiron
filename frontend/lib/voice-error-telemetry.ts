/**
 * Error Reporting and Telemetry System for Voice Errors
 */

import { logger } from './logger'
import { VoiceErrorDetails, VoiceErrorType, VoiceRecoveryStrategy } from './voice-error-recovery'
import { VoiceSystemHealth, PerformanceDegradationAlert } from './voice-performance-monitor'
import { NetworkMetrics } from './network-monitor'

// ============================================================================
// Telemetry Types
// ============================================================================

export enum TelemetryEventType {
  ERROR = 'error',
  RECOVERY = 'recovery',
  PERFORMANCE = 'performance',
  USER_ACTION = 'user_action',
  SYSTEM_STATE = 'system_state',
  FEATURE_USAGE = 'feature_usage'
}

export enum TelemetryLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export interface TelemetryEvent {
  id: string
  timestamp: Date
  type: TelemetryEventType
  level: TelemetryLevel
  category: string
  message: string
  data: Record<string, any>
  userId?: string
  sessionId: string
  userAgent: string
  url: string
  buildVersion?: string
}

export interface VoiceErrorTelemetryData {
  errorDetails: VoiceErrorDetails
  systemHealth: Partial<VoiceSystemHealth>
  networkMetrics: Partial<NetworkMetrics>
  userContext: {
    hadPreviousErrors: boolean
    currentActivity: string
    timeSpentInVoice: number
    preferredMode: '3d' | '2d' | 'ascii' | 'text'
  }
  deviceInfo: {
    platform: string
    browser: string
    hasWebGL: boolean
    hasMicrophone: boolean
    memoryLimit: number
  }
  recoveryAttempted: boolean
  recoverySuccessful?: boolean
  timeToRecover?: number
}

export interface TelemetryConfig {
  enabled: boolean
  endpoint?: string
  apiKey?: string
  batchSize: number
  flushInterval: number
  retryAttempts: number
  enableLocalStorage: boolean
  enableConsoleLogging: boolean
  samplingRate: number
  includeUserAgent: boolean
  includeUrl: boolean
  enablePerformanceTracking: boolean
  privacyMode: boolean
  allowedDomains: string[]
}

export interface TelemetryBatch {
  events: TelemetryEvent[]
  timestamp: Date
  batchId: string
  checksum: string
}

// ============================================================================
// Voice Error Telemetry System
// ============================================================================

export class VoiceErrorTelemetry {
  private static instance: VoiceErrorTelemetry
  private config: TelemetryConfig
  private eventQueue: TelemetryEvent[] = []
  private sessionId: string
  private isFlushingQueue = false
  private flushTimer?: NodeJS.Timeout
  private retryQueue: TelemetryBatch[] = []

  private constructor() {
    this.config = {
      enabled: true,
      batchSize: 10,
      flushInterval: 30000, // 30 seconds
      retryAttempts: 3,
      enableLocalStorage: true,
      enableConsoleLogging: process.env.NODE_ENV === 'development',
      samplingRate: 1.0, // 100% for voice errors (they're important)
      includeUserAgent: true,
      includeUrl: false, // Privacy: don't include full URL
      enablePerformanceTracking: true,
      privacyMode: false,
      allowedDomains: ['seiron.app', 'localhost']
    }

    this.sessionId = this.generateSessionId()
    this.setupEventListeners()
    this.startPeriodicFlush()
    this.loadPendingEvents()
  }

  static getInstance(): VoiceErrorTelemetry {
    if (!this.instance) {
      this.instance = new VoiceErrorTelemetry()
    }
    return this.instance
  }

  private generateSessionId(): string {
    return `voice_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private setupEventListeners(): void {
    // Listen for page unload to flush pending events
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushImmediately()
      })

      // Listen for visibility changes to flush when tab becomes hidden
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.flushImmediately()
        }
      })
    }
  }

  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushEvents()
    }, this.config.flushInterval)
  }

  private loadPendingEvents(): void {
    if (!this.config.enableLocalStorage || typeof localStorage === 'undefined') return

    try {
      const pendingEvents = localStorage.getItem('voice_telemetry_pending')
      if (pendingEvents) {
        const events: TelemetryEvent[] = JSON.parse(pendingEvents)
        this.eventQueue.push(...events)
        localStorage.removeItem('voice_telemetry_pending')
        logger.debug(`Loaded ${events.length} pending telemetry events`)
      }
    } catch (error) {
      logger.warn('Failed to load pending telemetry events:', error)
    }
  }

  // ============================================================================
  // Public API
  // ============================================================================

  public updateConfig(config: Partial<TelemetryConfig>): void {
    this.config = { ...this.config, ...config }
    logger.debug('Voice telemetry config updated', config)
  }

  public recordVoiceError(
    errorDetails: VoiceErrorDetails,
    systemHealth?: Partial<VoiceSystemHealth>,
    networkMetrics?: Partial<NetworkMetrics>,
    userContext?: Partial<VoiceErrorTelemetryData['userContext']>
  ): void {
    if (!this.shouldSample()) return

    const telemetryData: VoiceErrorTelemetryData = {
      errorDetails,
      systemHealth: systemHealth || {},
      networkMetrics: networkMetrics || {},
      userContext: {
        hadPreviousErrors: false,
        currentActivity: 'voice_chat',
        timeSpentInVoice: 0,
        preferredMode: '3d',
        ...userContext
      },
      deviceInfo: this.getDeviceInfo(),
      recoveryAttempted: false
    }

    this.addEvent({
      type: TelemetryEventType.ERROR,
      level: this.mapSeverityToLevel(errorDetails.severity),
      category: 'voice_error',
      message: `Voice error: ${errorDetails.type}`,
      data: telemetryData
    })

    // Log for debugging if enabled
    if (this.config.enableConsoleLogging) {
      console.group('🔊 Voice Error Telemetry')
      console.error('Error Type:', errorDetails.type)
      console.error('Message:', errorDetails.message)
      console.error('Recovery Strategy:', errorDetails.recoveryStrategy)
      console.error('System Health:', systemHealth)
      console.groupEnd()
    }
  }

  public recordVoiceRecovery(
    errorType: VoiceErrorType,
    successful: boolean,
    timeToRecover: number,
    strategyUsed: VoiceRecoveryStrategy,
    metadata?: Record<string, any>
  ): void {
    if (!this.shouldSample()) return

    this.addEvent({
      type: TelemetryEventType.RECOVERY,
      level: successful ? TelemetryLevel.INFO : TelemetryLevel.WARNING,
      category: 'voice_recovery',
      message: `Voice recovery ${successful ? 'succeeded' : 'failed'}: ${errorType}`,
      data: {
        errorType,
        successful,
        timeToRecover,
        strategyUsed,
        metadata: metadata || {}
      }
    })

    if (this.config.enableConsoleLogging) {
      console.log(`🔧 Voice Recovery: ${errorType} - ${successful ? 'Success' : 'Failed'} (${timeToRecover}ms)`)
    }
  }

  public recordPerformanceDegradation(alert: PerformanceDegradationAlert): void {
    if (!this.shouldSample()) return

    this.addEvent({
      type: TelemetryEventType.PERFORMANCE,
      level: this.mapAlertSeverityToLevel(alert.severity),
      category: 'voice_performance',
      message: `Performance degradation: ${alert.type}`,
      data: {
        alertId: alert.id,
        alertType: alert.type,
        severity: alert.severity,
        metrics: alert.metrics,
        suggestedActions: alert.suggestedActions,
        autoActionTaken: alert.autoActionTaken
      }
    })
  }

  public recordUserAction(
    action: string,
    category: string,
    metadata?: Record<string, any>
  ): void {
    if (!this.shouldSample()) return

    this.addEvent({
      type: TelemetryEventType.USER_ACTION,
      level: TelemetryLevel.INFO,
      category,
      message: `User action: ${action}`,
      data: {
        action,
        timestamp: Date.now(),
        metadata: metadata || {}
      }
    })
  }

  public recordFeatureUsage(
    feature: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    if (!this.shouldSample()) return

    this.addEvent({
      type: TelemetryEventType.FEATURE_USAGE,
      level: TelemetryLevel.INFO,
      category: 'voice_feature',
      message: `Feature usage: ${feature}`,
      data: {
        feature,
        duration,
        success,
        timestamp: Date.now(),
        metadata: metadata || {}
      }
    })
  }

  public recordSystemState(
    state: Partial<VoiceSystemHealth>,
    context?: Record<string, any>
  ): void {
    if (!this.shouldSample()) return

    this.addEvent({
      type: TelemetryEventType.SYSTEM_STATE,
      level: TelemetryLevel.DEBUG,
      category: 'voice_system',
      message: 'System state snapshot',
      data: {
        systemHealth: state,
        context: context || {},
        timestamp: Date.now()
      }
    })
  }

  // ============================================================================
  // Event Management
  // ============================================================================

  private addEvent(eventData: Omit<TelemetryEvent, 'id' | 'timestamp' | 'sessionId' | 'userAgent' | 'url' | 'buildVersion'>): void {
    if (!this.config.enabled) return

    const event: TelemetryEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      sessionId: this.sessionId,
      userAgent: this.config.includeUserAgent ? navigator.userAgent : '',
      url: this.config.includeUrl ? this.getSafeUrl() : '',
      buildVersion: process.env.REACT_APP_VERSION || 'unknown',
      ...eventData
    }

    this.eventQueue.push(event)

    // Flush immediately for critical errors
    if (event.level === TelemetryLevel.CRITICAL) {
      this.flushImmediately()
    } else if (this.eventQueue.length >= this.config.batchSize) {
      this.flushEvents()
    }
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getSafeUrl(): string {
    if (typeof window === 'undefined') return ''
    
    // Only include pathname, not query params or hash for privacy
    return window.location.pathname
  }

  private shouldSample(): boolean {
    return Math.random() < this.config.samplingRate
  }

  // ============================================================================
  // Event Flushing
  // ============================================================================

  private async flushEvents(): Promise<void> {
    if (this.isFlushingQueue || this.eventQueue.length === 0) return

    this.isFlushingQueue = true

    try {
      const eventsToFlush = this.eventQueue.splice(0, this.config.batchSize)
      const batch = this.createBatch(eventsToFlush)

      await this.sendBatch(batch)
      
      if (this.config.enableConsoleLogging) {
        logger.debug(`Flushed ${eventsToFlush.length} telemetry events`)
      }
    } catch (error) {
      logger.error('Failed to flush telemetry events:', error)
      // Events will be retried on next flush
    } finally {
      this.isFlushingQueue = false
    }
  }

  private flushImmediately(): void {
    // Save pending events to localStorage for next session
    if (this.config.enableLocalStorage && this.eventQueue.length > 0) {
      try {
        localStorage.setItem('voice_telemetry_pending', JSON.stringify(this.eventQueue))
      } catch (error) {
        logger.warn('Failed to save pending telemetry events:', error)
      }
    }

    // Try to send immediately using sendBeacon if available
    if (typeof navigator !== 'undefined' && navigator.sendBeacon && this.config.endpoint) {
      const batch = this.createBatch(this.eventQueue)
      const data = JSON.stringify(batch)
      
      try {
        navigator.sendBeacon(this.config.endpoint, data)
        this.eventQueue = []
      } catch (error) {
        logger.warn('Failed to send telemetry via beacon:', error)
      }
    }
  }

  private createBatch(events: TelemetryEvent[]): TelemetryBatch {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const batch: TelemetryBatch = {
      events,
      timestamp: new Date(),
      batchId,
      checksum: this.calculateChecksum(events)
    }
    return batch
  }

  private calculateChecksum(events: TelemetryEvent[]): string {
    const data = JSON.stringify(events.map(e => e.id).sort())
    return btoa(data).substr(0, 16)
  }

  private async sendBatch(batch: TelemetryBatch): Promise<void> {
    if (!this.config.endpoint) {
      if (this.config.enableConsoleLogging) {
        console.log('📊 Telemetry Batch (no endpoint configured):', batch)
      }
      return
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(batch)
    })

    if (!response.ok) {
      throw new Error(`Telemetry API error: ${response.status} ${response.statusText}`)
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private mapSeverityToLevel(severity: string): TelemetryLevel {
    switch (severity) {
      case 'low': return TelemetryLevel.INFO
      case 'medium': return TelemetryLevel.WARNING
      case 'high': return TelemetryLevel.ERROR
      case 'critical': return TelemetryLevel.CRITICAL
      default: return TelemetryLevel.WARNING
    }
  }

  private mapAlertSeverityToLevel(severity: 'low' | 'medium' | 'high' | 'critical'): TelemetryLevel {
    switch (severity) {
      case 'low': return TelemetryLevel.INFO
      case 'medium': return TelemetryLevel.WARNING
      case 'high': return TelemetryLevel.ERROR
      case 'critical': return TelemetryLevel.CRITICAL
    }
  }

  private getDeviceInfo(): VoiceErrorTelemetryData['deviceInfo'] {
    const isWebGLSupported = () => {
      try {
        const canvas = document.createElement('canvas')
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
        return !!gl
      } catch (e) {
        return false
      }
    }

    const hasMicrophone = () => {
      return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    }

    const getMemoryLimit = () => {
      if (typeof performance !== 'undefined' && 'memory' in performance) {
        const memory = (performance as any).memory
        return memory.jsHeapSizeLimit / 1024 / 1024 // MB
      }
      return 0
    }

    return {
      platform: navigator.platform || 'unknown',
      browser: this.getBrowserInfo(),
      hasWebGL: isWebGLSupported(),
      hasMicrophone: hasMicrophone(),
      memoryLimit: getMemoryLimit()
    }
  }

  private getBrowserInfo(): string {
    const userAgent = navigator.userAgent
    
    if (userAgent.includes('Chrome')) return 'Chrome'
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari'
    if (userAgent.includes('Edge')) return 'Edge'
    if (userAgent.includes('Opera')) return 'Opera'
    
    return 'Unknown'
  }

  // ============================================================================
  // Analytics and Reporting
  // ============================================================================

  public getErrorStats(timeRange?: { start: Date; end: Date }): {
    totalErrors: number
    errorsByType: Record<VoiceErrorType, number>
    recoveryRate: number
    avgRecoveryTime: number
  } {
    // This would typically query stored events or an analytics backend
    // For now, return empty stats
    return {
      totalErrors: 0,
      errorsByType: {} as Record<VoiceErrorType, number>,
      recoveryRate: 0,
      avgRecoveryTime: 0
    }
  }

  public getPerformanceStats(): {
    avgLatencies: Record<string, number>
    errorRates: Record<string, number>
    systemHealthTrend: Array<{ timestamp: Date; health: number }>
  } {
    // This would typically query performance metrics
    return {
      avgLatencies: {},
      errorRates: {},
      systemHealthTrend: []
    }
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  public dispose(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = undefined
    }

    // Flush any remaining events
    this.flushImmediately()

    logger.debug('Voice error telemetry system disposed')
  }
}

// ============================================================================
// React Hook for Telemetry
// ============================================================================

import { useEffect, useCallback } from 'react'

export function useVoiceTelemetry() {
  const telemetry = VoiceErrorTelemetry.getInstance()

  useEffect(() => {
    // Initialize telemetry when component mounts
    return () => {
      // Cleanup is handled by the singleton
    }
  }, [])

  const recordError = useCallback((
    errorDetails: VoiceErrorDetails,
    systemHealth?: Partial<VoiceSystemHealth>,
    networkMetrics?: Partial<NetworkMetrics>
  ) => {
    telemetry.recordVoiceError(errorDetails, systemHealth, networkMetrics)
  }, [telemetry])

  const recordRecovery = useCallback((
    errorType: VoiceErrorType,
    successful: boolean,
    timeToRecover: number,
    strategy: VoiceRecoveryStrategy
  ) => {
    telemetry.recordVoiceRecovery(errorType, successful, timeToRecover, strategy)
  }, [telemetry])

  const recordUserAction = useCallback((action: string, category: string, metadata?: Record<string, any>) => {
    telemetry.recordUserAction(action, category, metadata)
  }, [telemetry])

  const recordFeatureUsage = useCallback((
    feature: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, any>
  ) => {
    telemetry.recordFeatureUsage(feature, duration, success, metadata)
  }, [telemetry])

  return {
    recordError,
    recordRecovery,
    recordUserAction,
    recordFeatureUsage
  }
}

// Export singleton instance
export const voiceTelemetry = VoiceErrorTelemetry.getInstance()