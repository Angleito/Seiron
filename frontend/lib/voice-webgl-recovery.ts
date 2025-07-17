/**
 * Enhanced WebGL/3D Rendering Error Recovery for Voice Chat Dragon Components
 */

import { logger } from './logger'
import { voiceErrorRecovery, VoiceErrorType } from './voice-error-recovery'
import { WebGLRecoveryManager, WebGLRecoveryConfig } from '@utils/webglRecovery'
import { errorRecoveryUtils } from '@utils/errorRecovery'

// ============================================================================
// Voice-Specific WebGL Types
// ============================================================================

export enum VoiceDragonRenderingState {
  INITIALIZING = 'initializing',
  ACTIVE_3D = 'active_3d',
  DEGRADED_2D = 'degraded_2d',
  ASCII_FALLBACK = 'ascii_fallback',
  ERROR = 'error',
  RECOVERING = 'recovering'
}

export enum DragonAnimationState {
  IDLE = 'idle',
  LISTENING = 'listening',
  SPEAKING = 'speaking',
  PROCESSING = 'processing',
  ERROR = 'error'
}

export interface VoiceDragonConfig {
  enableGLBRendering: boolean
  enable2DFallback: boolean
  enableASCIIFallback: boolean
  autoQualityAdjustment: boolean
  voiceStateAnimation: boolean
  performanceThreshold: number
  memoryLimit: number
  recoveryAttempts: number
  fallbackDelay: number
}

export interface DragonRenderingMetrics {
  currentState: VoiceDragonRenderingState
  animationState: DragonAnimationState
  renderMode: '3d' | '2d' | 'ascii'
  frameRate: number
  memoryUsage: number
  contextLossCount: number
  recoverySuccessRate: number
  qualityLevel: number
  voiceResponseLatency: number
  lastErrorTime?: Date
  lastRecoveryTime?: Date
}

export interface VoiceWebGLErrorDetails {
  errorType: VoiceErrorType
  renderingState: VoiceDragonRenderingState
  animationState: DragonAnimationState
  fallbackAvailable: boolean
  userImpact: 'none' | 'minor' | 'moderate' | 'severe'
  recommendedAction: string
}

// ============================================================================
// Voice-Specific WebGL Recovery Manager
// ============================================================================

export class VoiceWebGLRecoveryManager extends WebGLRecoveryManager {
  private dragonConfig: VoiceDragonConfig
  private renderingMetrics: DragonRenderingMetrics
  private voiceErrorCallbacks: Set<(error: VoiceWebGLErrorDetails) => void> = new Set()
  private dragonfallbackOrder: Array<'3d' | '2d' | 'ascii'> = ['3d', '2d', 'ascii']
  private currentFallbackIndex = 0
  private voiceStateAnimationEnabled = true
  private dragonModelCache: Map<string, any> = new Map()
  private animationFrameId?: number

  constructor(config?: WebGLRecoveryConfig & Partial<VoiceDragonConfig>) {
    // Configure WebGL recovery for voice-specific needs
    const voiceOptimizedConfig: WebGLRecoveryConfig = {
      maxRecoveryAttempts: 2, // Faster fallback for voice
      recoveryDelayMs: 500,   // Quick recovery for real-time interaction
      fallbackEnabled: true,
      enablePreventiveMeasures: true,
      performanceThreshold: 40, // More tolerant for voice interactions
      memoryThreshold: 400,
      enableQualityReduction: true,
      enableUserNotifications: true,
      ...config
    }

    super(voiceOptimizedConfig)

    this.dragonConfig = {
      enableGLBRendering: true,
      enable2DFallback: true,
      enableASCIIFallback: true,
      autoQualityAdjustment: true,
      voiceStateAnimation: true,
      performanceThreshold: 30,
      memoryLimit: 300,
      recoveryAttempts: 2,
      fallbackDelay: 1000,
      ...config
    }

    this.renderingMetrics = {
      currentState: VoiceDragonRenderingState.INITIALIZING,
      animationState: DragonAnimationState.IDLE,
      renderMode: '3d',
      frameRate: 60,
      memoryUsage: 0,
      contextLossCount: 0,
      recoverySuccessRate: 1.0,
      qualityLevel: 4,
      voiceResponseLatency: 0
    }

    this.setupVoiceSpecificHandlers()
  }

  private setupVoiceSpecificHandlers(): void {
    // Override context loss handler for voice-specific behavior
    this.on('contextLost', this.handleVoiceContextLoss.bind(this))
    this.on('contextRestored', this.handleVoiceContextRestore.bind(this))
    this.on('recoveryFailed', this.handleVoiceRecoveryFailed.bind(this))
    this.on('fallback', this.handleVoiceFallback.bind(this))

    // Register voice-specific recovery callbacks
    const recoveryManager = voiceErrorRecovery.getRecoveryManager()
    
    recoveryManager.registerRecoveryCallback(VoiceErrorType.WEBGL_CONTEXT_LOST, async () => {
      await this.attemptDragonModelRecovery()
    })

    recoveryManager.registerRecoveryCallback(VoiceErrorType.MEMORY_EXHAUSTED, async () => {
      await this.performVoiceOptimizedCleanup()
    })
  }

  // ============================================================================
  // Voice-Specific Context Handling
  // ============================================================================

  private async handleVoiceContextLoss(): Promise<void> {
    logger.warn('Voice dragon WebGL context lost')
    
    this.renderingMetrics.currentState = VoiceDragonRenderingState.RECOVERING
    this.renderingMetrics.contextLossCount++
    this.renderingMetrics.lastErrorTime = new Date()

    // Immediately switch to 2D fallback for uninterrupted voice interaction
    if (this.dragonConfig.enable2DFallback) {
      await this.fallbackTo2D()
    }

    // Create voice-specific error details
    const errorDetails: VoiceWebGLErrorDetails = {
      errorType: VoiceErrorType.WEBGL_CONTEXT_LOST,
      renderingState: this.renderingMetrics.currentState,
      animationState: this.renderingMetrics.animationState,
      fallbackAvailable: this.dragonConfig.enable2DFallback,
      userImpact: this.dragonConfig.enable2DFallback ? 'minor' : 'moderate',
      recommendedAction: 'Dragon switched to 2D mode - voice features continue normally'
    }

    this.notifyVoiceErrorCallbacks(errorDetails)
  }

  private async handleVoiceContextRestore(): Promise<void> {
    logger.info('Voice dragon WebGL context restored')
    
    this.renderingMetrics.lastRecoveryTime = new Date()
    this.renderingMetrics.recoverySuccessRate = this.calculateRecoverySuccessRate()

    // Attempt to restore 3D rendering if performance allows
    if (this.renderingMetrics.frameRate > this.dragonConfig.performanceThreshold) {
      await this.restoreTo3D()
    } else {
      logger.info('Keeping 2D mode due to performance concerns')
    }
  }

  private async handleVoiceRecoveryFailed(): Promise<void> {
    logger.error('Voice dragon WebGL recovery failed - falling back to ASCII mode')
    
    this.renderingMetrics.currentState = VoiceDragonRenderingState.ERROR

    if (this.dragonConfig.enableASCIIFallback) {
      await this.fallbackToASCII()
    }

    const errorDetails: VoiceWebGLErrorDetails = {
      errorType: VoiceErrorType.WEBGL_CONTEXT_LOST,
      renderingState: this.renderingMetrics.currentState,
      animationState: this.renderingMetrics.animationState,
      fallbackAvailable: this.dragonConfig.enableASCIIFallback,
      userImpact: 'moderate',
      recommendedAction: 'Dragon switched to ASCII mode - voice features remain fully functional'
    }

    this.notifyVoiceErrorCallbacks(errorDetails)
  }

  private async handleVoiceFallback(): Promise<void> {
    logger.info('Voice dragon triggered fallback mode')
    await this.progressiveFallback()
  }

  // ============================================================================
  // Dragon Rendering Mode Management
  // ============================================================================

  private async fallbackTo2D(): Promise<void> {
    logger.info('Falling back to 2D dragon rendering')
    
    this.renderingMetrics.currentState = VoiceDragonRenderingState.DEGRADED_2D
    this.renderingMetrics.renderMode = '2d'
    this.currentFallbackIndex = 1

    // Cache current 3D state for potential restoration
    await this.cacheDragonState()

    // Switch to 2D dragon component
    this.emit('dragonModeChange', {
      mode: '2d',
      reason: 'webgl_fallback',
      animationState: this.renderingMetrics.animationState
    })

    // Ensure voice state animations continue in 2D
    if (this.voiceStateAnimationEnabled) {
      this.emit('enableVoiceAnimation', { mode: '2d' })
    }
  }

  private async fallbackToASCII(): Promise<void> {
    logger.info('Falling back to ASCII dragon rendering')
    
    this.renderingMetrics.currentState = VoiceDragonRenderingState.ASCII_FALLBACK
    this.renderingMetrics.renderMode = 'ascii'
    this.currentFallbackIndex = 2

    this.emit('dragonModeChange', {
      mode: 'ascii',
      reason: 'recovery_failed',
      animationState: this.renderingMetrics.animationState
    })

    // ASCII dragon can still show voice states through text animation
    if (this.voiceStateAnimationEnabled) {
      this.emit('enableVoiceAnimation', { mode: 'ascii' })
    }
  }

  private async restoreTo3D(): Promise<void> {
    logger.info('Attempting to restore 3D dragon rendering')
    
    this.renderingMetrics.currentState = VoiceDragonRenderingState.ACTIVE_3D
    this.renderingMetrics.renderMode = '3d'
    this.currentFallbackIndex = 0

    // Restore from cache if available
    await this.restoreDragonState()

    this.emit('dragonModeChange', {
      mode: '3d',
      reason: 'recovery_success',
      animationState: this.renderingMetrics.animationState
    })

    // Re-enable full 3D voice animations
    if (this.voiceStateAnimationEnabled) {
      this.emit('enableVoiceAnimation', { mode: '3d' })
    }
  }

  private async progressiveFallback(): Promise<void> {
    const nextMode = this.dragonfallbackOrder[this.currentFallbackIndex + 1]
    
    if (!nextMode) {
      logger.error('No more fallback options available')
      return
    }

    switch (nextMode) {
      case '2d':
        if (this.dragonConfig.enable2DFallback) {
          await this.fallbackTo2D()
        } else {
          await this.progressiveFallback() // Skip to next
        }
        break
      case 'ascii':
        if (this.dragonConfig.enableASCIIFallback) {
          await this.fallbackToASCII()
        }
        break
    }
  }

  // ============================================================================
  // Voice State Integration
  // ============================================================================

  public updateVoiceState(state: {
    isListening: boolean
    isSpeaking: boolean
    isProcessing: boolean
    volume?: number
    emotion?: string
  }): void {
    // Update animation state based on voice state
    let newAnimationState = DragonAnimationState.IDLE

    if (state.isListening) {
      newAnimationState = DragonAnimationState.LISTENING
    } else if (state.isSpeaking) {
      newAnimationState = DragonAnimationState.SPEAKING
    } else if (state.isProcessing) {
      newAnimationState = DragonAnimationState.PROCESSING
    }

    if (newAnimationState !== this.renderingMetrics.animationState) {
      this.renderingMetrics.animationState = newAnimationState
      
      // Emit voice state change for dragon components to react
      this.emit('voiceStateChange', {
        state: newAnimationState,
        renderMode: this.renderingMetrics.renderMode,
        voiceData: state
      })
    }

    // Monitor performance during voice interactions
    this.monitorVoicePerformance(state)
  }

  private monitorVoicePerformance(voiceState: any): void {
    // Check if voice interactions are affecting performance
    const currentFPS = this.renderingMetrics.frameRate
    
    if (voiceState.isSpeaking && currentFPS < this.dragonConfig.performanceThreshold) {
      logger.warn('Performance degradation during voice interaction')
      
      if (this.dragonConfig.autoQualityAdjustment) {
        this.optimizeForVoice()
      }
    }
  }

  private optimizeForVoice(): void {
    logger.info('Optimizing dragon rendering for voice performance')
    
    // Reduce quality specifically for voice interactions
    const currentQuality = this.getQualitySettings()
    
    if (currentQuality.level > 1 && this.renderingMetrics.renderMode === '3d') {
      this.setQualityLevel(Math.max(1, currentQuality.level - 1))
      
      this.emit('qualityOptimized', {
        reason: 'voice_performance',
        newLevel: currentQuality.level - 1,
        renderMode: this.renderingMetrics.renderMode
      })
    } else if (this.renderingMetrics.renderMode === '3d') {
      // If already at minimum 3D quality, fallback to 2D
      this.fallbackTo2D()
    }
  }

  // ============================================================================
  // Dragon Model Recovery
  // ============================================================================

  private async attemptDragonModelRecovery(): Promise<void> {
    logger.info('Attempting dragon model recovery')
    
    try {
      // Clear any corrupted model data
      this.dragonModelCache.clear()
      
      // Force garbage collection to free memory
      errorRecoveryUtils.forceGC()
      
      // Wait for memory to stabilize
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Attempt to reload models with reduced quality
      await this.reloadDragonModels()
      
    } catch (error) {
      logger.error('Dragon model recovery failed:', error)
      await this.progressiveFallback()
    }
  }

  private async reloadDragonModels(): Promise<void> {
    // Emit request to reload dragon models with current quality settings
    this.emit('reloadDragonModels', {
      qualityLevel: this.getQualitySettings().level,
      renderMode: this.renderingMetrics.renderMode
    })
  }

  private async cacheDragonState(): Promise<void> {
    // Cache current dragon state for potential restoration
    try {
      const currentState = {
        animationState: this.renderingMetrics.animationState,
        qualityLevel: this.getQualitySettings().level,
        timestamp: Date.now()
      }
      
      this.dragonModelCache.set('currentState', currentState)
      logger.debug('Dragon state cached for recovery')
    } catch (error) {
      logger.warn('Failed to cache dragon state:', error)
    }
  }

  private async restoreDragonState(): Promise<void> {
    try {
      const cachedState = this.dragonModelCache.get('currentState')
      
      if (cachedState && Date.now() - cachedState.timestamp < 30000) { // 30 second cache
        this.renderingMetrics.animationState = cachedState.animationState
        this.setQualityLevel(cachedState.qualityLevel)
        logger.debug('Dragon state restored from cache')
      }
    } catch (error) {
      logger.warn('Failed to restore dragon state:', error)
    }
  }

  // ============================================================================
  // Voice-Optimized Cleanup
  // ============================================================================

  private async performVoiceOptimizedCleanup(): Promise<void> {
    logger.info('Performing voice-optimized memory cleanup')
    
    try {
      // Clear non-essential dragon assets first
      this.clearNonEssentialAssets()
      
      // Optimize texture quality for voice interactions
      this.optimizeTexturesForVoice()
      
      // Force garbage collection
      errorRecoveryUtils.forceGC()
      
      // Reduce animation complexity during cleanup
      this.reduceAnimationComplexity()
      
    } catch (error) {
      logger.error('Voice-optimized cleanup failed:', error)
    }
  }

  private clearNonEssentialAssets(): void {
    // Clear cached models that aren't currently needed
    const essentialKeys = ['currentState', 'voiceAnimations']
    
    for (const [key] of this.dragonModelCache) {
      if (!essentialKeys.includes(key)) {
        this.dragonModelCache.delete(key)
      }
    }
  }

  private optimizeTexturesForVoice(): void {
    // Reduce texture quality to prioritize voice performance
    const currentQuality = this.getQualitySettings()
    
    if (currentQuality.textureQuality > 0.5) {
      this.emit('optimizeTextures', {
        targetQuality: 0.5,
        reason: 'voice_optimization'
      })
    }
  }

  private reduceAnimationComplexity(): void {
    // Simplify animations during memory pressure
    this.emit('reduceAnimationComplexity', {
      level: 'minimal',
      reason: 'memory_cleanup'
    })
  }

  // ============================================================================
  // Performance Monitoring
  // ============================================================================

  public startVoicePerformanceMonitoring(): void {
    const monitorFrame = () => {
      this.updatePerformanceMetrics()
      this.animationFrameId = requestAnimationFrame(monitorFrame)
    }
    
    this.animationFrameId = requestAnimationFrame(monitorFrame)
    logger.debug('Started voice performance monitoring')
  }

  public stopVoicePerformanceMonitoring(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = undefined
    }
    logger.debug('Stopped voice performance monitoring')
  }

  private updatePerformanceMetrics(): void {
    // Update frame rate
    const now = performance.now()
    const deltaTime = now - (this.lastFrameTime || now)
    this.renderingMetrics.frameRate = 1000 / deltaTime
    this.lastFrameTime = now

    // Update memory usage
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory
      this.renderingMetrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024
    }

    // Check for performance issues
    if (this.renderingMetrics.frameRate < this.dragonConfig.performanceThreshold) {
      this.handlePerformanceDegradation()
    }
  }
  
  private lastFrameTime?: number

  private handlePerformanceDegradation(): void {
    // Only take action if performance has been consistently poor
    if (this.consecutiveFrameDrops > 5) {
      logger.warn('Consistent performance degradation detected in voice dragon rendering')
      
      if (this.dragonConfig.autoQualityAdjustment) {
        this.optimizeForVoice()
      }
      
      this.consecutiveFrameDrops = 0
    } else {
      this.consecutiveFrameDrops++
    }
  }
  
  private consecutiveFrameDrops = 0

  private calculateRecoverySuccessRate(): number {
    const diagnostics = this.getDiagnostics()
    const totalAttempts = diagnostics.successfulRecoveries + diagnostics.failedRecoveries
    return totalAttempts > 0 ? diagnostics.successfulRecoveries / totalAttempts : 1.0
  }

  // ============================================================================
  // Event Listeners and Callbacks
  // ============================================================================

  public addVoiceErrorCallback(callback: (error: VoiceWebGLErrorDetails) => void): void {
    this.voiceErrorCallbacks.add(callback)
  }

  public removeVoiceErrorCallback(callback: (error: VoiceWebGLErrorDetails) => void): void {
    this.voiceErrorCallbacks.delete(callback)
  }

  private notifyVoiceErrorCallbacks(error: VoiceWebGLErrorDetails): void {
    this.voiceErrorCallbacks.forEach(callback => {
      try {
        callback(error)
      } catch (err) {
        logger.error('Voice error callback failed:', err)
      }
    })
  }

  // ============================================================================
  // Public API
  // ============================================================================

  public getDragonMetrics(): DragonRenderingMetrics {
    return { ...this.renderingMetrics }
  }

  public getCurrentRenderMode(): '3d' | '2d' | 'ascii' {
    return this.renderingMetrics.renderMode
  }

  public isVoiceAnimationEnabled(): boolean {
    return this.voiceStateAnimationEnabled
  }

  public setVoiceAnimationEnabled(enabled: boolean): void {
    this.voiceStateAnimationEnabled = enabled
    this.emit('voiceAnimationToggle', { enabled })
  }

  public forceFallbackMode(mode: '2d' | 'ascii'): void {
    switch (mode) {
      case '2d':
        this.fallbackTo2D()
        break
      case 'ascii':
        this.fallbackToASCII()
        break
    }
  }

  public attemptRestore3D(): void {
    if (this.renderingMetrics.renderMode !== '3d') {
      this.restoreTo3D()
    }
  }

  public getVoiceOptimizedConfig(): VoiceDragonConfig {
    return { ...this.dragonConfig }
  }

  public updateDragonConfig(config: Partial<VoiceDragonConfig>): void {
    this.dragonConfig = { ...this.dragonConfig, ...config }
    this.emit('configUpdated', this.dragonConfig)
  }

  override dispose(): void {
    this.stopVoicePerformanceMonitoring()
    this.voiceErrorCallbacks.clear()
    this.dragonModelCache.clear()
    super.dispose()
    logger.debug('Voice WebGL recovery manager disposed')
  }
}

// ============================================================================
// React Hook for Voice WebGL Recovery
// ============================================================================

import { useRef, useState, useEffect, useCallback } from 'react'

export function useVoiceWebGLRecovery(config?: WebGLRecoveryConfig & Partial<VoiceDragonConfig>) {
  const managerRef = useRef<VoiceWebGLRecoveryManager | null>(null)
  const [metrics, setMetrics] = useState<DragonRenderingMetrics>({
    currentState: VoiceDragonRenderingState.INITIALIZING,
    animationState: DragonAnimationState.IDLE,
    renderMode: '3d',
    frameRate: 60,
    memoryUsage: 0,
    contextLossCount: 0,
    recoverySuccessRate: 1.0,
    qualityLevel: 4,
    voiceResponseLatency: 0
  })
  const [currentRenderMode, setCurrentRenderMode] = useState<'3d' | '2d' | 'ascii'>('3d')
  const [isRecovering, setIsRecovering] = useState(false)

  useEffect(() => {
    const manager = new VoiceWebGLRecoveryManager(config)
    managerRef.current = manager

    // Setup event listeners
    manager.on('dragonModeChange', (data: any) => {
      setCurrentRenderMode(data.mode)
      setMetrics(manager.getDragonMetrics())
    })

    manager.on('contextLost', () => {
      setIsRecovering(true)
    })

    manager.on('contextRestored', () => {
      setIsRecovering(false)
      setMetrics(manager.getDragonMetrics())
    })

    manager.on('recoveryFailed', () => {
      setIsRecovering(false)
      setMetrics(manager.getDragonMetrics())
    })

    // Start performance monitoring
    manager.startVoicePerformanceMonitoring()

    return () => {
      manager.dispose()
    }
  }, [])

  const updateVoiceState = useCallback((state: {
    isListening: boolean
    isSpeaking: boolean
    isProcessing: boolean
    volume?: number
    emotion?: string
  }) => {
    managerRef.current?.updateVoiceState(state)
    setMetrics(managerRef.current?.getDragonMetrics() || metrics)
  }, [metrics])

  const forceFallback = useCallback((mode: '2d' | 'ascii') => {
    managerRef.current?.forceFallbackMode(mode)
  }, [])

  const attemptRestore = useCallback(() => {
    managerRef.current?.attemptRestore3D()
  }, [])

  const addErrorCallback = useCallback((callback: (error: VoiceWebGLErrorDetails) => void) => {
    managerRef.current?.addVoiceErrorCallback(callback)
  }, [])

  return {
    metrics,
    currentRenderMode,
    isRecovering,
    updateVoiceState,
    forceFallback,
    attemptRestore,
    addErrorCallback,
    isWebGLAvailable: () => managerRef.current?.isWebGLAvailable() ?? false,
    getCurrentRenderMode: () => managerRef.current?.getCurrentRenderMode() || '3d'
  }
}

// Export singleton for global use
export const voiceWebGLRecovery = new VoiceWebGLRecoveryManager({
  enablePreventiveMeasures: true,
  performanceThreshold: 30,
  memoryThreshold: 300,
  enableVoiceOptimization: true
} as any)