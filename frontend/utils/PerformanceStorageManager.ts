'use client'

import { PerformanceDataPoint, ModelPerformanceMetrics } from '../hooks/useModelPerformanceTracking'

// Storage configuration
interface StorageConfig {
  maxStorageSize: number // in bytes
  maxHistoryAge: number // in milliseconds
  compressionEnabled: boolean
  sessionOnly: boolean
}

// Session metadata
interface SessionMetadata {
  sessionId: string
  startTime: number
  endTime: number
  deviceInfo: {
    userAgent: string
    platform: string
    screenResolution: string
    deviceMemory: number
    hardwareConcurrency: number
  }
  modelsUsed: string[]
  totalDataPoints: number
  averagePerformanceScore: number
}

// Analytics data structures
interface PerformanceAnalytics {
  totalSessions: number
  totalDataPoints: number
  averageSessionDuration: number
  mostUsedModels: Array<{
    modelId: string
    usageCount: number
    averagePerformance: number
  }>
  performanceTrends: Array<{
    date: string
    averageFPS: number
    averageMemory: number
    averageScore: number
  }>
  deviceStats: {
    mobileUsage: number
    desktopUsage: number
    tabletUsage: number
    averageDeviceMemory: number
  }
}

// Compressed data format for storage
interface CompressedDataPoint {
  t: number // timestamp
  m: string // modelId
  f: number // fps
  s: number // performanceScore
  mem: number // memory usage (in MB)
  rt: number // render time
  lt: number // load time
  q: string // quality level
  e: number // error count
  w: number // warning count
}

/**
 * Performance Storage Manager
 * Handles persistence of performance data with session management,
 * compression, analytics, and data lifecycle management
 */
export class PerformanceStorageManager {
  private static instance: PerformanceStorageManager
  private config: StorageConfig
  private currentSessionId: string
  private sessionStartTime: number
  private lastSyncTime: number = 0
  
  private readonly STORAGE_KEYS = {
    PERFORMANCE_DATA: 'seiron_performance_data',
    SESSION_METADATA: 'seiron_session_metadata', 
    ANALYTICS: 'seiron_performance_analytics',
    STORAGE_CONFIG: 'seiron_storage_config'
  }
  
  static getInstance(): PerformanceStorageManager {
    if (!PerformanceStorageManager.instance) {
      PerformanceStorageManager.instance = new PerformanceStorageManager()
    }
    return PerformanceStorageManager.instance
  }
  
  constructor() {
    this.config = this.loadStorageConfig()
    this.currentSessionId = this.generateSessionId()
    this.sessionStartTime = Date.now()
    
    // Initialize new session
    this.initializeSession()
    
    // Setup cleanup intervals
    this.setupMaintenanceTasks()
  }
  
  /**
   * Load storage configuration from localStorage or use defaults
   */
  private loadStorageConfig(): StorageConfig {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.STORAGE_CONFIG)
      if (stored) {
        return { ...this.getDefaultConfig(), ...JSON.parse(stored) }
      }
    } catch (error) {
      console.warn('Failed to load storage config, using defaults:', error)
    }
    
    return this.getDefaultConfig()
  }
  
  private getDefaultConfig(): StorageConfig {
    return {
      maxStorageSize: 50 * 1024 * 1024, // 50MB
      maxHistoryAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      compressionEnabled: true,
      sessionOnly: false
    }
  }
  
  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  /**
   * Initialize new session metadata
   */
  private initializeSession(): void {
    const deviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      deviceMemory: (navigator as any).deviceMemory || 4,
      hardwareConcurrency: navigator.hardwareConcurrency || 4
    }
    
    const sessionMetadata: SessionMetadata = {
      sessionId: this.currentSessionId,
      startTime: this.sessionStartTime,
      endTime: 0, // Will be set when session ends
      deviceInfo,
      modelsUsed: [],
      totalDataPoints: 0,
      averagePerformanceScore: 0
    }
    
    try {
      const existingSessions = this.loadSessionMetadata()
      existingSessions.push(sessionMetadata)
      localStorage.setItem(this.STORAGE_KEYS.SESSION_METADATA, JSON.stringify(existingSessions))
    } catch (error) {
      console.error('Failed to initialize session:', error)
    }
  }
  
  /**
   * Store performance data point
   */
  async storePerformanceData(dataPoint: PerformanceDataPoint): Promise<void> {
    try {
      // Load existing data
      const existingData = this.loadPerformanceData()
      
      // Add new data point
      existingData.push(dataPoint)
      
      // Apply compression if enabled
      const dataToStore = this.config.compressionEnabled 
        ? this.compressPerformanceData(existingData)
        : existingData
      
      // Check storage size limits
      const dataSize = new Blob([JSON.stringify(dataToStore)]).size
      if (dataSize > this.config.maxStorageSize) {
        await this.performStorageCleanup()
      }
      
      // Store data
      if (this.config.sessionOnly) {
        sessionStorage.setItem(this.STORAGE_KEYS.PERFORMANCE_DATA, JSON.stringify(dataToStore))
      } else {
        localStorage.setItem(this.STORAGE_KEYS.PERFORMANCE_DATA, JSON.stringify(dataToStore))
      }
      
      // Update session metadata
      await this.updateSessionMetadata(dataPoint)
      
      // Update analytics periodically
      if (Date.now() - this.lastSyncTime > 30000) { // Every 30 seconds
        await this.updateAnalytics()
        this.lastSyncTime = Date.now()
      }
      
    } catch (error) {
      console.error('Failed to store performance data:', error)
    }
  }
  
  /**
   * Load performance data from storage
   */
  loadPerformanceData(): PerformanceDataPoint[] {
    try {
      const storage = this.config.sessionOnly ? sessionStorage : localStorage
      const stored = storage.getItem(this.STORAGE_KEYS.PERFORMANCE_DATA)
      
      if (!stored) return []
      
      const data = JSON.parse(stored)
      
      // Decompress if necessary
      return this.config.compressionEnabled && this.isCompressedData(data)
        ? this.decompressPerformanceData(data)
        : data
        
    } catch (error) {
      console.error('Failed to load performance data:', error)
      return []
    }
  }
  
  /**
   * Compress performance data for storage efficiency
   */
  private compressPerformanceData(data: PerformanceDataPoint[]): CompressedDataPoint[] {
    return data.map(point => ({
      t: point.timestamp,
      m: point.modelId,
      f: Math.round(point.metrics.fps),
      s: Math.round(point.metrics.performanceScore),
      mem: Math.round(point.metrics.memoryUsage.jsHeapUsed / 1024 / 1024),
      rt: Math.round(point.metrics.renderTime * 100) / 100,
      lt: point.metrics.loadTime,
      q: point.metrics.qualityLevel,
      e: point.metrics.errorCount,
      w: point.metrics.warningCount
    }))
  }
  
  /**
   * Decompress performance data from storage
   */
  private decompressPerformanceData(compressedData: CompressedDataPoint[]): PerformanceDataPoint[] {
    return compressedData.map(point => ({
      timestamp: point.t,
      modelId: point.m,
      metrics: {
        fps: point.f,
        avgFps: point.f, // Approximation
        minFps: point.f * 0.8, // Approximation
        maxFps: point.f * 1.2, // Approximation
        frameTime: 1000 / point.f,
        renderTime: point.rt,
        memoryUsage: {
          jsHeapUsed: point.mem * 1024 * 1024,
          jsHeapTotal: point.mem * 1024 * 1024 * 1.5, // Approximation
          jsHeapLimit: point.mem * 1024 * 1024 * 2, // Approximation
          webglMemoryEstimate: point.mem * 1024 * 1024 * 0.3 // Approximation
        },
        loadTime: point.lt,
        initializationTime: 0,
        modelSize: 0,
        textureMemory: 0,
        geometryMemory: 0,
        drawCalls: 0,
        triangles: 0,
        vertices: 0,
        texturesLoaded: 0,
        shadersCompiled: 0,
        performanceScore: point.s,
        webglContextHealth: {
          contextLossCount: 0,
          contextRestoreCount: 0,
          extensionSupport: [],
          maxTextureSize: 2048,
          maxViewportDims: [1920, 1080] as [number, number],
          isWebGL2: false
        },
        qualityLevel: point.q as 'low' | 'medium' | 'high' | 'ultra',
        adaptiveQualityActive: false,
        qualityReductions: 0,
        errorCount: point.e,
        warningCount: point.w,
        crashCount: 0,
        recoveryCount: 0
      } as ModelPerformanceMetrics,
      deviceInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        hardwareConcurrency: navigator.hardwareConcurrency || 4,
        deviceMemory: (navigator as any).deviceMemory || 4,
        connection: 'unknown'
      }
    }))
  }
  
  /**
   * Check if data is in compressed format
   */
  private isCompressedData(data: any): boolean {
    return Array.isArray(data) && data.length > 0 && 
           typeof data[0] === 'object' && 't' in data[0] && 'm' in data[0]
  }
  
  /**
   * Update session metadata with new data point
   */
  private async updateSessionMetadata(dataPoint: PerformanceDataPoint): Promise<void> {
    try {
      const sessions = this.loadSessionMetadata()
      const currentSession = sessions.find(s => s.sessionId === this.currentSessionId)
      
      if (currentSession) {
        // Update models used
        if (!currentSession.modelsUsed.includes(dataPoint.modelId)) {
          currentSession.modelsUsed.push(dataPoint.modelId)
        }
        
        // Update data point count
        currentSession.totalDataPoints++
        
        // Update average performance score
        const currentAvg = currentSession.averagePerformanceScore
        const newCount = currentSession.totalDataPoints
        currentSession.averagePerformanceScore = 
          (currentAvg * (newCount - 1) + dataPoint.metrics.performanceScore) / newCount
        
        // Save updated sessions
        localStorage.setItem(this.STORAGE_KEYS.SESSION_METADATA, JSON.stringify(sessions))
      }
    } catch (error) {
      console.error('Failed to update session metadata:', error)
    }
  }
  
  /**
   * Load session metadata
   */
  private loadSessionMetadata(): SessionMetadata[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.SESSION_METADATA)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to load session metadata:', error)
      return []
    }
  }
  
  /**
   * End current session
   */
  endCurrentSession(): void {
    try {
      const sessions = this.loadSessionMetadata()
      const currentSession = sessions.find(s => s.sessionId === this.currentSessionId)
      
      if (currentSession) {
        currentSession.endTime = Date.now()
        localStorage.setItem(this.STORAGE_KEYS.SESSION_METADATA, JSON.stringify(sessions))
      }
    } catch (error) {
      console.error('Failed to end session:', error)
    }
  }
  
  /**
   * Generate performance analytics
   */
  async updateAnalytics(): Promise<void> {
    try {
      const performanceData = this.loadPerformanceData()
      const sessions = this.loadSessionMetadata()
      
      if (performanceData.length === 0) return
      
      // Calculate analytics
      const analytics: PerformanceAnalytics = {
        totalSessions: sessions.length,
        totalDataPoints: performanceData.length,
        averageSessionDuration: this.calculateAverageSessionDuration(sessions),
        mostUsedModels: this.calculateMostUsedModels(performanceData),
        performanceTrends: this.calculatePerformanceTrends(performanceData),
        deviceStats: this.calculateDeviceStats(sessions)
      }
      
      // Store analytics
      localStorage.setItem(this.STORAGE_KEYS.ANALYTICS, JSON.stringify(analytics))
      
    } catch (error) {
      console.error('Failed to update analytics:', error)
    }
  }
  
  /**
   * Get performance analytics
   */
  getAnalytics(): PerformanceAnalytics | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.ANALYTICS)
      return stored ? JSON.parse(stored) : null
    } catch (error) {
      console.error('Failed to load analytics:', error)
      return null
    }
  }
  
  /**
   * Calculate average session duration
   */
  private calculateAverageSessionDuration(sessions: SessionMetadata[]): number {
    const completedSessions = sessions.filter(s => s.endTime > 0)
    if (completedSessions.length === 0) return 0
    
    const totalDuration = completedSessions.reduce((sum, session) => {
      return sum + (session.endTime - session.startTime)
    }, 0)
    
    return totalDuration / completedSessions.length
  }
  
  /**
   * Calculate most used models
   */
  private calculateMostUsedModels(data: PerformanceDataPoint[]): Array<{modelId: string; usageCount: number; averagePerformance: number}> {
    const modelStats = new Map<string, {count: number; totalScore: number}>()
    
    data.forEach(point => {
      if (!point.modelId) {
        return // Skip points without modelId
      }
      const existing = modelStats.get(point.modelId) || {count: 0, totalScore: 0}
      existing.count++
      existing.totalScore += point.metrics.performanceScore
      modelStats.set(point.modelId, existing)
    })
    
    return Array.from(modelStats.entries()).map(([modelId, stats]) => ({
      modelId,
      usageCount: stats.count,
      averagePerformance: stats.totalScore / stats.count
    })).sort((a, b) => b.usageCount - a.usageCount)
  }
  
  /**
   * Calculate performance trends over time
   */
  private calculatePerformanceTrends(data: PerformanceDataPoint[]): Array<{date: string; averageFPS: number; averageMemory: number; averageScore: number}> {
    const dailyStats = new Map<string, {fps: number[]; memory: number[]; scores: number[]}>()
    
    data.forEach(point => {
      const dateStr = new Date(point.timestamp).toISOString().split('T')[0]
      if (!dateStr) {
        return // Skip if date extraction fails
      }
      const existing = dailyStats.get(dateStr) || {fps: [], memory: [], scores: []}
      
      existing.fps.push(point.metrics.fps)
      existing.memory.push(point.metrics.memoryUsage.jsHeapUsed / 1024 / 1024)
      existing.scores.push(point.metrics.performanceScore)
      
      dailyStats.set(dateStr, existing)
    })
    
    return Array.from(dailyStats.entries()).map(([date, stats]) => ({
      date,
      averageFPS: stats.fps.reduce((a, b) => a + b, 0) / stats.fps.length,
      averageMemory: stats.memory.reduce((a, b) => a + b, 0) / stats.memory.length,
      averageScore: stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length
    })).sort((a, b) => a.date.localeCompare(b.date))
  }
  
  /**
   * Calculate device statistics
   */
  private calculateDeviceStats(sessions: SessionMetadata[]): {mobileUsage: number; desktopUsage: number; tabletUsage: number; averageDeviceMemory: number} {
    let mobileCount = 0
    let desktopCount = 0
    let tabletCount = 0
    let totalMemory = 0
    
    sessions.forEach(session => {
      const userAgent = session.deviceInfo.userAgent.toLowerCase()
      
      if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
        mobileCount++
      } else if (userAgent.includes('ipad') || userAgent.includes('tablet')) {
        tabletCount++
      } else {
        desktopCount++
      }
      
      totalMemory += session.deviceInfo.deviceMemory
    })
    
    const total = sessions.length || 1
    
    return {
      mobileUsage: (mobileCount / total) * 100,
      desktopUsage: (desktopCount / total) * 100,
      tabletUsage: (tabletCount / total) * 100,
      averageDeviceMemory: totalMemory / total
    }
  }
  
  /**
   * Perform storage cleanup to manage size
   */
  private async performStorageCleanup(): Promise<void> {
    try {
      const data = this.loadPerformanceData()
      const cutoffTime = Date.now() - this.config.maxHistoryAge
      
      // Remove old data points
      const filteredData = data.filter(point => point.timestamp > cutoffTime)
      
      // If still too large, keep only the most recent 70% of data
      if (filteredData.length > 0) {
        const maxKeep = Math.floor(filteredData.length * 0.7)
        const cleanedData = filteredData.slice(-maxKeep)
        
        // Store cleaned data
        const dataToStore = this.config.compressionEnabled 
          ? this.compressPerformanceData(cleanedData)
          : cleanedData
        
        const storage = this.config.sessionOnly ? sessionStorage : localStorage
        storage.setItem(this.STORAGE_KEYS.PERFORMANCE_DATA, JSON.stringify(dataToStore))
        
        console.log(`Storage cleanup: removed ${data.length - cleanedData.length} old data points`)
      }
      
    } catch (error) {
      console.error('Failed to perform storage cleanup:', error)
    }
  }
  
  /**
   * Export all performance data
   */
  exportAllData(): string {
    const performanceData = this.loadPerformanceData()
    const sessions = this.loadSessionMetadata()
    const analytics = this.getAnalytics()
    
    return JSON.stringify({
      exportTimestamp: new Date().toISOString(),
      currentSessionId: this.currentSessionId,
      performanceData,
      sessions,
      analytics,
      config: this.config
    }, null, 2)
  }
  
  /**
   * Import performance data
   */
  async importData(importedData: string): Promise<boolean> {
    try {
      const data = JSON.parse(importedData)
      
      if (data.performanceData) {
        // Merge with existing data
        const existingData = this.loadPerformanceData()
        const mergedData = [...existingData, ...data.performanceData]
        
        const storage = this.config.sessionOnly ? sessionStorage : localStorage
        storage.setItem(this.STORAGE_KEYS.PERFORMANCE_DATA, JSON.stringify(mergedData))
      }
      
      if (data.sessions) {
        const existingSessions = this.loadSessionMetadata()
        const mergedSessions = [...existingSessions, ...data.sessions]
        localStorage.setItem(this.STORAGE_KEYS.SESSION_METADATA, JSON.stringify(mergedSessions))
      }
      
      // Regenerate analytics
      await this.updateAnalytics()
      
      return true
    } catch (error) {
      console.error('Failed to import data:', error)
      return false
    }
  }
  
  /**
   * Clear all stored data
   */
  clearAllData(): void {
    try {
      const storage = this.config.sessionOnly ? sessionStorage : localStorage
      storage.removeItem(this.STORAGE_KEYS.PERFORMANCE_DATA)
      localStorage.removeItem(this.STORAGE_KEYS.SESSION_METADATA)
      localStorage.removeItem(this.STORAGE_KEYS.ANALYTICS)
      
      console.log('All performance data cleared')
    } catch (error) {
      console.error('Failed to clear data:', error)
    }
  }
  
  /**
   * Get storage usage statistics
   */
  getStorageStats(): {usedBytes: number; maxBytes: number; dataPoints: number; sessions: number} {
    try {
      const storage = this.config.sessionOnly ? sessionStorage : localStorage
      const performanceData = storage.getItem(this.STORAGE_KEYS.PERFORMANCE_DATA) || '[]'
      const sessionData = localStorage.getItem(this.STORAGE_KEYS.SESSION_METADATA) || '[]'
      
      const usedBytes = new Blob([performanceData, sessionData]).size
      const dataPoints = JSON.parse(performanceData).length
      const sessions = JSON.parse(sessionData).length
      
      return {
        usedBytes,
        maxBytes: this.config.maxStorageSize,
        dataPoints,
        sessions
      }
    } catch (error) {
      console.error('Failed to get storage stats:', error)
      return {usedBytes: 0, maxBytes: this.config.maxStorageSize, dataPoints: 0, sessions: 0}
    }
  }
  
  /**
   * Setup maintenance tasks
   */
  private setupMaintenanceTasks(): void {
    // Cleanup old data every hour
    setInterval(() => {
      this.performStorageCleanup()
    }, 60 * 60 * 1000)
    
    // Update analytics every 5 minutes
    setInterval(() => {
      this.updateAnalytics()
    }, 5 * 60 * 1000)
    
    // End session on page unload
    window.addEventListener('beforeunload', () => {
      this.endCurrentSession()
    })
  }
  
  /**
   * Update storage configuration
   */
  updateConfig(newConfig: Partial<StorageConfig>): void {
    this.config = { ...this.config, ...newConfig }
    localStorage.setItem(this.STORAGE_KEYS.STORAGE_CONFIG, JSON.stringify(this.config))
  }
}

// Singleton instance
export const performanceStorageManager = PerformanceStorageManager.getInstance()

export default PerformanceStorageManager