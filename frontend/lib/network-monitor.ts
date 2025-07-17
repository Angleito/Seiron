/**
 * Network Status Monitoring and Connection Recovery for Voice Features
 */

import { logger } from './logger'
import { fetchWithRetry } from '@utils/apiRetry'

// ============================================================================
// Network Status Types
// ============================================================================

export enum NetworkStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  SLOW = 'slow',
  UNSTABLE = 'unstable'
}

export enum ConnectionQuality {
  EXCELLENT = 'excellent',  // < 100ms latency, high bandwidth
  GOOD = 'good',           // 100-300ms latency, medium bandwidth
  FAIR = 'fair',           // 300-1000ms latency, low bandwidth
  POOR = 'poor'            // > 1000ms latency, very low bandwidth
}

export interface NetworkMetrics {
  status: NetworkStatus
  quality: ConnectionQuality
  latency: number
  bandwidth: number
  effectiveType: string
  downlink: number
  rtt: number
  isOnline: boolean
  lastCheck: Date
}

export interface NetworkChangeEvent {
  previous: NetworkMetrics
  current: NetworkMetrics
  timestamp: Date
}

// ============================================================================
// Network Monitoring Service
// ============================================================================

export class NetworkMonitor {
  private static instance: NetworkMonitor
  private listeners: Set<(event: NetworkChangeEvent) => void> = new Set()
  private currentMetrics: NetworkMetrics
  private monitoringInterval?: NodeJS.Timeout
  private readonly checkInterval = 10000 // 10 seconds
  private readonly testEndpoints = [
    'https://api.github.com/zen',
    'https://httpbin.org/get',
    'https://jsonplaceholder.typicode.com/posts/1'
  ]

  private constructor() {
    this.currentMetrics = this.getInitialMetrics()
    this.setupEventListeners()
    this.startMonitoring()
  }

  static getInstance(): NetworkMonitor {
    if (!this.instance) {
      this.instance = new NetworkMonitor()
    }
    return this.instance
  }

  private getInitialMetrics(): NetworkMetrics {
    return {
      status: navigator.onLine ? NetworkStatus.ONLINE : NetworkStatus.OFFLINE,
      quality: ConnectionQuality.GOOD,
      latency: 0,
      bandwidth: 0,
      effectiveType: this.getEffectiveConnectionType(),
      downlink: this.getDownlink(),
      rtt: this.getRTT(),
      isOnline: navigator.onLine,
      lastCheck: new Date()
    }
  }

  private getEffectiveConnectionType(): string {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection
    return connection?.effectiveType || 'unknown'
  }

  private getDownlink(): number {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection
    return connection?.downlink || 0
  }

  private getRTT(): number {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection
    return connection?.rtt || 0
  }

  private setupEventListeners(): void {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)

    // Listen for connection changes
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection

    if (connection) {
      connection.addEventListener('change', this.handleConnectionChange)
    }

    // Listen for visibility changes to check connection when tab becomes active
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
  }

  private handleOnline = async () => {
    logger.info('Network status changed to online')
    await this.updateMetrics()
  }

  private handleOffline = async () => {
    logger.info('Network status changed to offline')
    await this.updateMetrics()
  }

  private handleConnectionChange = async () => {
    logger.info('Network connection properties changed')
    await this.updateMetrics()
  }

  private handleVisibilityChange = async () => {
    if (!document.hidden) {
      logger.debug('Tab became visible, checking network status')
      await this.updateMetrics()
    }
  }

  private async updateMetrics(): Promise<void> {
    const previousMetrics = { ...this.currentMetrics }
    
    try {
      const newMetrics = await this.measureNetworkQuality()
      this.currentMetrics = newMetrics

      // Notify listeners if there's a significant change
      if (this.hasSignificantChange(previousMetrics, newMetrics)) {
        const changeEvent: NetworkChangeEvent = {
          previous: previousMetrics,
          current: newMetrics,
          timestamp: new Date()
        }

        logger.info('Network metrics changed significantly', {
          previous: previousMetrics,
          current: newMetrics
        })

        this.notifyListeners(changeEvent)
      }
    } catch (error) {
      logger.error('Failed to update network metrics:', error)
    }
  }

  private async measureNetworkQuality(): Promise<NetworkMetrics> {
    const startTime = performance.now()
    let latency = 0
    let isOnline = navigator.onLine

    if (isOnline) {
      try {
        // Test with a lightweight endpoint
        await fetchWithRetry(this.testEndpoints[0], {
          method: 'HEAD',
          cache: 'no-cache'
        }, {
          maxRetries: 1,
          initialDelay: 500
        })
        
        latency = performance.now() - startTime
      } catch (error) {
        // If the test fails, we might be offline or have poor connectivity
        isOnline = false
        latency = Infinity
      }
    }

    // Determine network status
    let status: NetworkStatus
    if (!isOnline) {
      status = NetworkStatus.OFFLINE
    } else if (latency > 5000) {
      status = NetworkStatus.SLOW
    } else if (this.isConnectionUnstable()) {
      status = NetworkStatus.UNSTABLE
    } else {
      status = NetworkStatus.ONLINE
    }

    // Determine connection quality
    let quality: ConnectionQuality
    if (!isOnline || latency === Infinity) {
      quality = ConnectionQuality.POOR
    } else if (latency < 100) {
      quality = ConnectionQuality.EXCELLENT
    } else if (latency < 300) {
      quality = ConnectionQuality.GOOD
    } else if (latency < 1000) {
      quality = ConnectionQuality.FAIR
    } else {
      quality = ConnectionQuality.POOR
    }

    return {
      status,
      quality,
      latency: latency === Infinity ? 0 : latency,
      bandwidth: this.estimateBandwidth(),
      effectiveType: this.getEffectiveConnectionType(),
      downlink: this.getDownlink(),
      rtt: this.getRTT(),
      isOnline,
      lastCheck: new Date()
    }
  }

  private isConnectionUnstable(): boolean {
    // Simple heuristic: if RTT varies significantly, connection might be unstable
    const rtt = this.getRTT()
    const previousRtt = this.currentMetrics.rtt
    
    if (rtt > 0 && previousRtt > 0) {
      const variation = Math.abs(rtt - previousRtt) / Math.max(rtt, previousRtt)
      return variation > 0.5 // 50% variation indicates instability
    }
    
    return false
  }

  private estimateBandwidth(): number {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection
    
    if (connection?.downlink) {
      return connection.downlink * 1024 * 1024 // Convert to bytes per second
    }
    
    // Fallback estimation based on effective type
    const effectiveType = this.getEffectiveConnectionType()
    switch (effectiveType) {
      case 'slow-2g': return 50 * 1024 // 50 KB/s
      case '2g': return 250 * 1024 // 250 KB/s
      case '3g': return 750 * 1024 // 750 KB/s
      case '4g': return 10 * 1024 * 1024 // 10 MB/s
      default: return 1 * 1024 * 1024 // 1 MB/s default
    }
  }

  private hasSignificantChange(previous: NetworkMetrics, current: NetworkMetrics): boolean {
    return (
      previous.status !== current.status ||
      previous.quality !== current.quality ||
      previous.isOnline !== current.isOnline ||
      Math.abs(previous.latency - current.latency) > 500 // 500ms difference
    )
  }

  private notifyListeners(event: NetworkChangeEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        logger.error('Network listener error:', error)
      }
    })
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      await this.updateMetrics()
    }, this.checkInterval)
  }

  // ============================================================================
  // Public API
  // ============================================================================

  getCurrentMetrics(): NetworkMetrics {
    return { ...this.currentMetrics }
  }

  addListener(listener: (event: NetworkChangeEvent) => void): void {
    this.listeners.add(listener)
  }

  removeListener(listener: (event: NetworkChangeEvent) => void): void {
    this.listeners.delete(listener)
  }

  async checkConnectivity(): Promise<NetworkMetrics> {
    await this.updateMetrics()
    return this.getCurrentMetrics()
  }

  isVoiceFeaturesRecommended(): boolean {
    const metrics = this.getCurrentMetrics()
    return (
      metrics.isOnline &&
      metrics.status === NetworkStatus.ONLINE &&
      (metrics.quality === ConnectionQuality.EXCELLENT || metrics.quality === ConnectionQuality.GOOD)
    )
  }

  getRecommendedVoiceSettings(): {
    enableRealTimeTranscription: boolean
    enableHighQualityTTS: boolean
    recommendTextFallback: boolean
    maxRetries: number
  } {
    const metrics = this.getCurrentMetrics()
    
    switch (metrics.quality) {
      case ConnectionQuality.EXCELLENT:
        return {
          enableRealTimeTranscription: true,
          enableHighQualityTTS: true,
          recommendTextFallback: false,
          maxRetries: 3
        }
      
      case ConnectionQuality.GOOD:
        return {
          enableRealTimeTranscription: true,
          enableHighQualityTTS: true,
          recommendTextFallback: false,
          maxRetries: 2
        }
      
      case ConnectionQuality.FAIR:
        return {
          enableRealTimeTranscription: false,
          enableHighQualityTTS: false,
          recommendTextFallback: true,
          maxRetries: 1
        }
      
      case ConnectionQuality.POOR:
      default:
        return {
          enableRealTimeTranscription: false,
          enableHighQualityTTS: false,
          recommendTextFallback: true,
          maxRetries: 0
        }
    }
  }

  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }
    
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection
    
    if (connection) {
      connection.removeEventListener('change', this.handleConnectionChange)
    }
    
    this.listeners.clear()
  }
}

// ============================================================================
// Connection Recovery Utilities
// ============================================================================

export class ConnectionRecovery {
  private static instance: ConnectionRecovery
  private retryQueue: Array<{
    id: string
    operation: () => Promise<any>
    retries: number
    maxRetries: number
    priority: 'low' | 'medium' | 'high'
  }> = []
  private isProcessing = false

  static getInstance(): ConnectionRecovery {
    if (!this.instance) {
      this.instance = new ConnectionRecovery()
    }
    return this.instance
  }

  constructor() {
    // Listen for network recovery
    const networkMonitor = NetworkMonitor.getInstance()
    networkMonitor.addListener(this.handleNetworkChange)
  }

  private handleNetworkChange = (event: NetworkChangeEvent) => {
    // If we've recovered from offline or poor connection, process retry queue
    if (
      event.previous.status === NetworkStatus.OFFLINE &&
      event.current.status === NetworkStatus.ONLINE
    ) {
      logger.info('Network recovered, processing retry queue')
      this.processRetryQueue()
    }
  }

  addToRetryQueue(
    id: string,
    operation: () => Promise<any>,
    maxRetries: number = 3,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): void {
    // Remove existing operation with same ID
    this.retryQueue = this.retryQueue.filter(item => item.id !== id)
    
    // Add new operation
    this.retryQueue.push({
      id,
      operation,
      retries: 0,
      maxRetries,
      priority
    })
    
    // Sort by priority
    this.retryQueue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
    
    logger.debug(`Added operation ${id} to retry queue`, { queueLength: this.retryQueue.length })
  }

  private async processRetryQueue(): Promise<void> {
    if (this.isProcessing || this.retryQueue.length === 0) {
      return
    }

    this.isProcessing = true
    
    try {
      const networkMonitor = NetworkMonitor.getInstance()
      const metrics = networkMonitor.getCurrentMetrics()
      
      // Only process if we have a decent connection
      if (!metrics.isOnline || metrics.quality === ConnectionQuality.POOR) {
        logger.debug('Connection still poor, delaying retry queue processing')
        return
      }
      
      while (this.retryQueue.length > 0) {
        const item = this.retryQueue.shift()!
        
        try {
          logger.debug(`Retrying operation ${item.id} (attempt ${item.retries + 1}/${item.maxRetries})`)
          await item.operation()
          logger.info(`Operation ${item.id} succeeded on retry`)
        } catch (error) {
          item.retries++
          
          if (item.retries < item.maxRetries) {
            // Re-add to queue for another retry
            this.retryQueue.unshift(item)
            logger.warn(`Operation ${item.id} failed, will retry (${item.retries}/${item.maxRetries})`)
          } else {
            logger.error(`Operation ${item.id} failed permanently after ${item.maxRetries} retries:`, error)
          }
        }
        
        // Small delay between operations to avoid overwhelming the network
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } finally {
      this.isProcessing = false
    }
  }

  removeFromRetryQueue(id: string): void {
    this.retryQueue = this.retryQueue.filter(item => item.id !== id)
  }

  getQueueStatus(): {
    length: number
    operations: Array<{ id: string; retries: number; maxRetries: number; priority: string }>
  } {
    return {
      length: this.retryQueue.length,
      operations: this.retryQueue.map(item => ({
        id: item.id,
        retries: item.retries,
        maxRetries: item.maxRetries,
        priority: item.priority
      }))
    }
  }

  clearQueue(): void {
    this.retryQueue = []
    logger.info('Retry queue cleared')
  }
}

// ============================================================================
// Voice-Specific Network Utilities
// ============================================================================

export const voiceNetworkUtils = {
  /**
   * Check if network conditions are suitable for voice features
   */
  isVoiceReady: (): boolean => {
    const monitor = NetworkMonitor.getInstance()
    return monitor.isVoiceFeaturesRecommended()
  },

  /**
   * Get recommended settings for current network conditions
   */
  getVoiceSettings: () => {
    const monitor = NetworkMonitor.getInstance()
    return monitor.getRecommendedVoiceSettings()
  },

  /**
   * Monitor network and adjust voice features accordingly
   */
  startVoiceNetworkMonitoring: (
    onNetworkChange: (suitable: boolean, metrics: NetworkMetrics) => void
  ) => {
    const monitor = NetworkMonitor.getInstance()
    
    const handleChange = (event: NetworkChangeEvent) => {
      const suitable = monitor.isVoiceFeaturesRecommended()
      onNetworkChange(suitable, event.current)
    }
    
    monitor.addListener(handleChange)
    
    // Initial check
    const metrics = monitor.getCurrentMetrics()
    const suitable = monitor.isVoiceFeaturesRecommended()
    onNetworkChange(suitable, metrics)
    
    return () => monitor.removeListener(handleChange)
  },

  /**
   * Queue a voice operation for retry when connection recovers
   */
  queueVoiceOperation: (
    id: string,
    operation: () => Promise<any>,
    priority: 'low' | 'medium' | 'high' = 'high'
  ) => {
    const recovery = ConnectionRecovery.getInstance()
    recovery.addToRetryQueue(id, operation, 2, priority)
  },

  /**
   * Test voice API connectivity
   */
  testVoiceConnectivity: async (): Promise<{
    ttsReachable: boolean
    speechAPIReachable: boolean
    latency: number
    recommendVoice: boolean
  }> => {
    const monitor = NetworkMonitor.getInstance()
    const startTime = performance.now()
    
    let ttsReachable = false
    let speechAPIReachable = false
    
    try {
      // Test ElevenLabs API (or similar TTS endpoint)
      await fetchWithRetry('/api/voice/health', {
        method: 'HEAD',
        cache: 'no-cache'
      }, {
        maxRetries: 1,
        initialDelay: 1000
      })
      ttsReachable = true
    } catch (error) {
      logger.warn('TTS API not reachable:', error)
    }
    
    // Speech Recognition is browser-based, so test general connectivity
    speechAPIReachable = navigator.onLine
    
    const latency = performance.now() - startTime
    const metrics = monitor.getCurrentMetrics()
    const recommendVoice = ttsReachable && speechAPIReachable && 
                          metrics.quality !== ConnectionQuality.POOR
    
    return {
      ttsReachable,
      speechAPIReachable,
      latency,
      recommendVoice
    }
  }
}

// Export singleton instances
export const networkMonitor = NetworkMonitor.getInstance()
export const connectionRecovery = ConnectionRecovery.getInstance()