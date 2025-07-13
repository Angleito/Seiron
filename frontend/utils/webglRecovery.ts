import { EventEmitter } from 'events';
import * as THREE from 'three';
import React from 'react';
import { webglDiagnostics } from './webglDiagnostics';

export interface WebGLRecoveryConfig {
  maxRecoveryAttempts?: number;
  recoveryDelayMs?: number;
  maxRecoveryDelay?: number;
  fallbackEnabled?: boolean;
  exponentialBackoff?: boolean;
  enablePreventiveMeasures?: boolean;
  performanceThreshold?: number;
  memoryThreshold?: number;
  enableQualityReduction?: boolean;
  enableUserNotifications?: boolean;
  // Enhanced throttling configuration
  enableIntelligentThrottling?: boolean;
  cooldownMultiplier?: number;
  maxCooldownPeriod?: number;
  contextHealthCheckInterval?: number;
  recoverySuccessRateThreshold?: number;
  // Enhanced monitoring configuration
  adaptiveMonitoringEnabled?: boolean;
  minMonitoringInterval?: number;
  maxMonitoringInterval?: number;
  performanceAlertDebounceMs?: number;
  // Batch cleanup configuration
  enableBatchCleanup?: boolean;
  batchCleanupInterval?: number;
  cleanupPriorityThreshold?: number;
  onContextLost?: () => void;
  onContextRestored?: () => void;
  onRecoveryFailed?: () => void;
  onFallback?: () => void;
  onRecoveryAttempt?: (attempt: number) => void;
  onPreventiveMeasure?: (measure: string) => void;
  onQualityReduced?: (level: number) => void;
  onUserNotification?: (message: string, type: 'info' | 'warning' | 'error') => void;
}

export interface WebGLDiagnostics {
  contextLossCount: number;
  recoveryAttempts: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  lastContextLoss?: Date;
  lastSuccessfulRecovery?: Date;
  currentState: 'active' | 'lost' | 'recovering' | 'failed' | 'degraded';
  recoveryHistory: RecoveryAttempt[];
  totalRecoveryTime: number;
  averageRecoveryTime: number;
  performanceScore: number;
  memoryUsage: number;
  qualityLevel: number;
  preventiveMeasuresCount: number;
  contextLossPredictions: number;
  contextLossRisk: 'low' | 'medium' | 'high';
  userNotifications: UserNotification[];
  // Enhanced metrics for optimization
  recoverySuccessRate: number;
  averageCooldownPeriod: number;
  unnecessaryRecoveryAttempts: number;
  batchCleanupEfficiency: number;
  monitoringOverheadMs: number;
  contextHealthScore: number;
  devicePerformanceProfile: 'low-end' | 'mid-range' | 'high-end';
}

interface RecoveryAttempt {
  timestamp: Date;
  attempt: number;
  success: boolean;
  timeTaken: number;
  error?: string;
  strategy?: 'standard' | 'aggressive' | 'conservative';
  qualityLevelBefore?: number;
  qualityLevelAfter?: number;
  // Enhanced recovery tracking
  contextHealthBefore?: number;
  contextHealthAfter?: number;
  cooldownPeriod?: number;
  wasThrottled?: boolean;
  recoveryTrigger?: 'automatic' | 'manual' | 'predictive';
}

interface UserNotification {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'warning' | 'error';
  dismissed: boolean;
  source: 'recovery' | 'prevention' | 'quality' | 'throttling' | 'optimization';
  priority?: 'low' | 'medium' | 'high';
  debounced?: boolean;
}

interface QualitySettings {
  level: number; // 0-4 (0 = minimal, 4 = maximum)
  antialias: boolean;
  shadows: boolean;
  postProcessing: boolean;
  particleCount: number;
  textureQuality: number;
  renderScale: number;
}

export class WebGLRecoveryManager extends EventEmitter {
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private recoveryAttempts = 0;
  private isRecovering = false;
  private recoveryTimer: NodeJS.Timeout | null = null;
  private recoveryStartTime: number | null = null;
  private consecutiveFailures = 0;
  private lastRecoveryAttempt = 0;
  private circuitBreakerOpen = false;
  private circuitBreakerTimeout: NodeJS.Timeout | null = null;
  private contextLossExtension: WEBGL_lose_context | null = null;
  private performanceMonitor: NodeJS.Timeout | null = null;
  private memoryMonitor: NodeJS.Timeout | null = null;
  
  // Enhanced throttling and optimization state
  private intelligentThrottling = {
    enabled: true,
    currentCooldownPeriod: 1000,
    cooldownHistory: [] as number[],
    lastContextHealthCheck: 0,
    recoverySuccessHistory: [] as boolean[],
    unnecessaryAttempts: 0
  };
  
  private adaptiveMonitoring = {
    enabled: true,
    currentInterval: 5000,
    performanceAlertLastFired: 0,
    memoryAlertLastFired: 0,
    stablePerformancePeriod: 0,
    performanceStableThreshold: 30000 // 30 seconds
  };
  
  private batchCleanup = {
    enabled: true,
    pendingOperations: [] as Array<{type: 'texture' | 'geometry' | 'material', resource: any, priority: number}>,
    lastBatchExecution: 0,
    batchTimer: null as NodeJS.Timeout | null
  };
  
  private contextHealth = {
    score: 100,
    lastCheck: 0,
    factors: {
      memoryPressure: 0,
      performanceDegradation: 0,
      errorRate: 0,
      recoveryHistory: 0
    }
  };
  
  private deviceProfile: 'low-end' | 'mid-range' | 'high-end' = 'mid-range';
  private qualitySettings: QualitySettings = {
    level: 4,
    antialias: true,
    shadows: true,
    postProcessing: true,
    particleCount: 100,
    textureQuality: 1.0,
    renderScale: 1.0
  };
  private contextLossWarningShown = false;
  private lastPerformanceCheck = 0;
  private performanceHistory: number[] = [];
  private memoryHistory: number[] = [];
  private diagnostics: WebGLDiagnostics = {
    contextLossCount: 0,
    recoveryAttempts: 0,
    successfulRecoveries: 0,
    failedRecoveries: 0,
    currentState: 'active',
    recoveryHistory: [],
    totalRecoveryTime: 0,
    averageRecoveryTime: 0,
    performanceScore: 100,
    memoryUsage: 0,
    qualityLevel: 4,
    preventiveMeasuresCount: 0,
    contextLossPredictions: 0,
    contextLossRisk: 'low',
    userNotifications: [],
    // Enhanced metrics
    recoverySuccessRate: 1.0,
    averageCooldownPeriod: 1000,
    unnecessaryRecoveryAttempts: 0,
    batchCleanupEfficiency: 1.0,
    monitoringOverheadMs: 0,
    contextHealthScore: 100,
    devicePerformanceProfile: 'mid-range'
  };
  
  private config: Required<WebGLRecoveryConfig> = {
    maxRecoveryAttempts: 3,
    recoveryDelayMs: 1000,
    maxRecoveryDelay: 8000,
    fallbackEnabled: true,
    exponentialBackoff: true,
    enablePreventiveMeasures: true,
    performanceThreshold: 30,
    memoryThreshold: 500,
    enableQualityReduction: true,
    enableUserNotifications: true,
    // Enhanced throttling defaults
    enableIntelligentThrottling: true,
    cooldownMultiplier: 1.5,
    maxCooldownPeriod: 30000, // 30 seconds max cooldown
    contextHealthCheckInterval: 10000, // Check context health every 10 seconds
    recoverySuccessRateThreshold: 0.7, // 70% success rate threshold
    // Enhanced monitoring defaults
    adaptiveMonitoringEnabled: true,
    minMonitoringInterval: 2000, // Minimum 2 seconds
    maxMonitoringInterval: 15000, // Maximum 15 seconds
    performanceAlertDebounceMs: 5000, // 5 second debounce
    // Batch cleanup defaults
    enableBatchCleanup: true,
    batchCleanupInterval: 3000, // Execute batches every 3 seconds
    cleanupPriorityThreshold: 0.8, // High priority threshold
    onContextLost: () => {},
    onContextRestored: () => {},
    onRecoveryFailed: () => {},
    onFallback: () => {},
    onRecoveryAttempt: () => {},
    onPreventiveMeasure: () => {},
    onQualityReduced: () => {},
    onUserNotification: () => {}
  };

  constructor(config?: WebGLRecoveryConfig) {
    super();
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Initialize WebGL recovery management for a canvas
   */
  public initializeRecovery(
    canvas: HTMLCanvasElement,
    renderer?: THREE.WebGLRenderer
  ): void {
    this.canvas = canvas;
    this.renderer = renderer ?? null;
    
    // Get WebGL context
    this.gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    if (!this.gl) {
      console.error('[WebGLRecovery] Failed to get WebGL context');
      this.diagnostics.currentState = 'failed';
      this.addUserNotification('WebGL not available on this device', 'error');
      return;
    }

    // Get the lose context extension for recovery
    this.contextLossExtension = this.gl.getExtension('WEBGL_lose_context');
    
    if (!this.contextLossExtension) {
      console.warn('[WebGLRecovery] WEBGL_lose_context extension not available');
    }

    // Initialize device profiling for optimized recovery strategies
    this.initializeDeviceProfile();
    
    // Initialize intelligent throttling if enabled
    if (this.config.enableIntelligentThrottling) {
      this.initializeIntelligentThrottling();
    }
    
    // Initialize adaptive monitoring if enabled
    if (this.config.adaptiveMonitoringEnabled) {
      this.initializeAdaptiveMonitoring();
    }
    
    // Initialize batch cleanup if enabled
    if (this.config.enableBatchCleanup) {
      this.initializeBatchCleanup();
    }

    // Setup event listeners
    this.setupEventListeners();
    
    // Start preventive monitoring if enabled
    if (this.config.enablePreventiveMeasures) {
      this.startPreventiveMonitoring();
    }
    
    // Initialize quality settings based on device capabilities
    this.initializeQualitySettings();
    
    console.log(`[WebGLRecovery] Initialized optimized WebGL recovery management for ${this.deviceProfile} device`);
    this.addUserNotification('Enhanced 3D Dragon system ready with intelligent recovery', 'info');
  }

  /**
   * Initialize device performance profile for optimized recovery strategies
   */
  private initializeDeviceProfile(): void {
    const monitoringStart = performance.now();
    
    try {
      // Detect device capabilities
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const hardwareConcurrency = navigator.hardwareConcurrency || 4;
      
      // Get memory information
      const memoryInfo = this.getMemoryInfo();
      const memoryLimit = memoryInfo?.jsHeapSizeLimit || 1024 * 1024 * 1024; // 1GB default
      
      // Get WebGL capabilities
      const debugInfo = this.gl?.getExtension('WEBGL_debug_renderer_info');
      const renderer = debugInfo ? this.gl?.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
      const isLowEndGPU = renderer.includes('SwiftShader') || renderer.includes('Software');
      
      // Calculate performance score
      let performanceScore = 100;
      if (isMobile) performanceScore -= 30;
      if (hardwareConcurrency < 4) performanceScore -= 20;
      if (memoryLimit < 2 * 1024 * 1024 * 1024) performanceScore -= 20; // Less than 2GB
      if (isLowEndGPU) performanceScore -= 30;
      
      // Determine device profile
      if (performanceScore >= 70) {
        this.deviceProfile = 'high-end';
      } else if (performanceScore >= 40) {
        this.deviceProfile = 'mid-range';
      } else {
        this.deviceProfile = 'low-end';
      }
      
      this.diagnostics.devicePerformanceProfile = this.deviceProfile;
      
      // Adjust configuration based on device profile
      this.adjustConfigForDevice();
      
      console.log(`[WebGLRecovery] Device profile: ${this.deviceProfile} (score: ${performanceScore})`);
      
    } catch (error) {
      console.warn('[WebGLRecovery] Error during device profiling:', error);
      this.deviceProfile = 'mid-range'; // Safe default
    } finally {
      this.diagnostics.monitoringOverheadMs += performance.now() - monitoringStart;
    }
  }
  
  /**
   * Adjust configuration based on device profile
   */
  private adjustConfigForDevice(): void {
    switch (this.deviceProfile) {
      case 'low-end':
        this.config.maxRecoveryAttempts = 2;
        this.config.recoveryDelayMs = 2000;
        this.config.performanceThreshold = 20;
        this.config.memoryThreshold = 200;
        this.adaptiveMonitoring.currentInterval = 10000; // Less frequent monitoring
        this.batchCleanup.batchTimer = null; // More aggressive batching
        break;
      case 'mid-range':
        // Use default settings
        break;
      case 'high-end':
        this.config.maxRecoveryAttempts = 5;
        this.config.recoveryDelayMs = 500;
        this.config.performanceThreshold = 45;
        this.config.memoryThreshold = 800;
        this.adaptiveMonitoring.currentInterval = 3000; // More frequent monitoring
        break;
    }
  }
  
  /**
   * Initialize intelligent throttling system
   */
  private initializeIntelligentThrottling(): void {
    this.intelligentThrottling.enabled = true;
    this.intelligentThrottling.currentCooldownPeriod = this.config.recoveryDelayMs;
    this.intelligentThrottling.cooldownHistory = [];
    this.intelligentThrottling.recoverySuccessHistory = [];
    this.intelligentThrottling.unnecessaryAttempts = 0;
    
    console.log('[WebGLRecovery] Intelligent throttling system initialized');
  }
  
  /**
   * Initialize adaptive monitoring system
   */
  private initializeAdaptiveMonitoring(): void {
    this.adaptiveMonitoring.enabled = true;
    this.adaptiveMonitoring.performanceAlertLastFired = 0;
    this.adaptiveMonitoring.memoryAlertLastFired = 0;
    this.adaptiveMonitoring.stablePerformancePeriod = 0;
    
    console.log('[WebGLRecovery] Adaptive monitoring system initialized');
  }
  
  /**
   * Initialize batch cleanup system
   */
  private initializeBatchCleanup(): void {
    this.batchCleanup.enabled = true;
    this.batchCleanup.pendingOperations = [];
    this.batchCleanup.lastBatchExecution = 0;
    
    // Start batch processing timer
    this.startBatchCleanupTimer();
    
    console.log('[WebGLRecovery] Batch cleanup system initialized');
  }
  
  /**
   * Start batch cleanup timer
   */
  private startBatchCleanupTimer(): void {
    if (this.batchCleanup.batchTimer) {
      clearInterval(this.batchCleanup.batchTimer);
    }
    
    this.batchCleanup.batchTimer = setInterval(() => {
      this.executeBatchCleanup();
    }, this.config.batchCleanupInterval);
  }
  
  /**
   * Execute batch cleanup operations
   */
  private executeBatchCleanup(): void {
    if (this.batchCleanup.pendingOperations.length === 0) return;
    
    const batchStart = performance.now();
    const operationsToProcess = [...this.batchCleanup.pendingOperations];
    this.batchCleanup.pendingOperations = [];
    
    // Sort by priority (higher priority first)
    operationsToProcess.sort((a, b) => b.priority - a.priority);
    
    let processedCount = 0;
    let errorCount = 0;
    
    for (const operation of operationsToProcess) {
      try {
        switch (operation.type) {
          case 'texture':
            if (operation.resource && typeof operation.resource.dispose === 'function') {
              operation.resource.dispose();
            }
            break;
          case 'geometry':
            if (operation.resource && typeof operation.resource.dispose === 'function') {
              operation.resource.dispose();
            }
            break;
          case 'material':
            this.disposeMaterialBatch(operation.resource);
            break;
        }
        processedCount++;
      } catch (error) {
        errorCount++;
        console.warn(`[WebGLRecovery] Batch cleanup error for ${operation.type}:`, error);
      }
    }
    
    const batchTime = performance.now() - batchStart;
    this.batchCleanup.lastBatchExecution = Date.now();
    
    // Calculate efficiency
    const efficiency = processedCount / (processedCount + errorCount);
    this.diagnostics.batchCleanupEfficiency = efficiency;
    
    if (processedCount > 0) {
      console.log(`[WebGLRecovery] Batch cleanup: ${processedCount} operations in ${batchTime.toFixed(2)}ms (efficiency: ${(efficiency * 100).toFixed(1)}%)`);
    }
  }
  
  /**
   * Dispose material in batch with enhanced cleanup
   */
  private disposeMaterialBatch(material: THREE.Material): void {
    if (!material) return;
    
    try {
      const materialAny = material as any;
      
      // Optimized texture disposal for batch operations
      const textureProps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap'];
      
      for (const prop of textureProps) {
        if (materialAny[prop] && typeof materialAny[prop].dispose === 'function') {
          materialAny[prop].dispose();
          materialAny[prop] = null;
        }
      }
      
      if (typeof material.dispose === 'function') {
        material.dispose();
      }
    } catch (error) {
      console.warn('[WebGLRecovery] Error in batch material disposal:', error);
    }
  }
  
  /**
   * Setup WebGL context event listeners
   */
  private setupEventListeners(): void {
    if (!this.canvas) return;

    // Context lost event
    this.canvas.addEventListener('webglcontextlost', this.handleContextLost);
    
    // Context restored event
    this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
  }

  /**
   * Handle WebGL context lost event with intelligent throttling
   */
  private handleContextLost = (event: Event): void => {
    event.preventDefault(); // Prevent default behavior
    
    const now = Date.now();
    const contextHealthBefore = this.contextHealth.score;
    
    // Check if circuit breaker is open
    if (this.circuitBreakerOpen) {
      console.warn('[WebGLRecovery] Circuit breaker is open, skipping recovery attempt');
      this.intelligentThrottling.unnecessaryAttempts++;
      this.diagnostics.unnecessaryRecoveryAttempts++;
      this.handleRecoveryFailed();
      return;
    }
    
    // Enhanced intelligent throttling check
    if (this.config.enableIntelligentThrottling && this.shouldThrottleRecovery(now)) {
      console.warn('[WebGLRecovery] Recovery throttled due to intelligent throttling system');
      this.intelligentThrottling.unnecessaryAttempts++;
      this.diagnostics.unnecessaryRecoveryAttempts++;
      this.addUserNotification(
        `Recovery throttled for ${(this.intelligentThrottling.currentCooldownPeriod / 1000).toFixed(1)}s`, 
        'warning', 
        'throttling'
      );
      
      // Schedule delayed recovery
      setTimeout(() => {
        if (this.gl && this.gl.isContextLost()) {
          this.handleContextLost(event);
        }
      }, this.intelligentThrottling.currentCooldownPeriod);
      return;
    }
    
    // Context health validation before recovery
    if (this.config.enableIntelligentThrottling) {
      const healthScore = this.calculateContextHealth();
      if (healthScore < 30 && this.diagnostics.contextLossCount > 2) {
        console.warn('[WebGLRecovery] Context health too poor for recovery, triggering fallback');
        this.triggerFallback();
        return;
      }
    }
    
    // Prevent rapid context loss events with enhanced detection
    if (now - this.lastRecoveryAttempt < this.intelligentThrottling.currentCooldownPeriod) {
      console.warn('[WebGLRecovery] Rapid context loss detected, implementing intelligent backoff');
      this.consecutiveFailures++;
      this.adjustCooldownPeriod(false); // Increase cooldown on failure
      
      if (this.consecutiveFailures >= 3) {
        this.openCircuitBreaker();
        return;
      }
    }
    
    // Cancel any ongoing recovery
    this.cancelRecovery();
    
    this.diagnostics.contextLossCount++;
    this.diagnostics.lastContextLoss = new Date();
    this.diagnostics.currentState = 'lost';
    this.recoveryAttempts = 0; // Reset recovery attempts for new context loss
    this.lastRecoveryAttempt = now;
    
    // Update context health
    this.contextHealth.score = Math.max(0, this.contextHealth.score - 20);
    this.contextHealth.lastCheck = now;
    this.diagnostics.contextHealthScore = this.contextHealth.score;
    
    console.warn('[WebGLRecovery] WebGL context lost with enhanced tracking', {
      lossCount: this.diagnostics.contextLossCount,
      timestamp: this.diagnostics.lastContextLoss,
      consecutiveFailures: this.consecutiveFailures,
      contextHealthBefore,
      contextHealthAfter: this.contextHealth.score,
      cooldownPeriod: this.intelligentThrottling.currentCooldownPeriod
    });
    
    // Record error in diagnostics
    webglDiagnostics.recordError(`WebGL context lost (count: ${this.diagnostics.contextLossCount})`);
    webglDiagnostics.recordContextLoss();
    
    this.emit('contextLost');
    this.config.onContextLost();
    
    // Attempt recovery with enhanced strategy selection
    this.attemptRecoveryWithStrategy();
  };
  
  /**
   * Determine if recovery should be throttled
   */
  private shouldThrottleRecovery(now: number): boolean {
    if (!this.intelligentThrottling.enabled) return false;
    
    // Check cooldown period
    if (now - this.lastRecoveryAttempt < this.intelligentThrottling.currentCooldownPeriod) {
      return true;
    }
    
    // Check success rate threshold
    if (this.intelligentThrottling.recoverySuccessHistory.length >= 5) {
      const recentSuccesses = this.intelligentThrottling.recoverySuccessHistory.slice(-5);
      const successRate = recentSuccesses.filter(success => success).length / recentSuccesses.length;
      
      if (successRate < this.config.recoverySuccessRateThreshold) {
        console.warn(`[WebGLRecovery] Recovery success rate too low: ${(successRate * 100).toFixed(1)}%`);
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Calculate current context health score
   */
  private calculateContextHealth(): number {
    let healthScore = 100;
    
    // Factor in memory pressure
    const memoryInfo = this.getMemoryInfo();
    if (memoryInfo) {
      const memoryPressure = (memoryInfo.usedJSHeapSize || 0) / (memoryInfo.jsHeapSizeLimit || 1);
      this.contextHealth.factors.memoryPressure = memoryPressure;
      healthScore -= memoryPressure * 30; // Up to 30 points for memory pressure
    }
    
    // Factor in performance degradation
    const performanceFactor = Math.max(0, (60 - this.diagnostics.performanceScore) / 60);
    this.contextHealth.factors.performanceDegradation = performanceFactor;
    healthScore -= performanceFactor * 25; // Up to 25 points for performance
    
    // Factor in error rate using diagnostics
    const errorFactor = Math.min(1, (this.diagnostics.failedRecoveries + this.diagnostics.contextLossCount) / 10);
    this.contextHealth.factors.errorRate = errorFactor;
    healthScore -= errorFactor * 20; // Up to 20 points for errors
    
    // Factor in recovery history
    const recoveryFactor = Math.min(1, this.diagnostics.contextLossCount / 5);
    this.contextHealth.factors.recoveryHistory = recoveryFactor;
    healthScore -= recoveryFactor * 25; // Up to 25 points for recovery history
    
    this.contextHealth.score = Math.max(0, Math.min(100, healthScore));
    this.contextHealth.lastCheck = Date.now();
    
    return this.contextHealth.score;
  }
  
  /**
   * Adjust cooldown period based on success/failure
   */
  private adjustCooldownPeriod(success: boolean): void {
    if (!this.intelligentThrottling.enabled) return;
    
    if (success) {
      // Reduce cooldown on successful recovery
      this.intelligentThrottling.currentCooldownPeriod = Math.max(
        this.config.recoveryDelayMs,
        this.intelligentThrottling.currentCooldownPeriod / this.config.cooldownMultiplier
      );
    } else {
      // Increase cooldown on failure
      this.intelligentThrottling.currentCooldownPeriod = Math.min(
        this.config.maxCooldownPeriod,
        this.intelligentThrottling.currentCooldownPeriod * this.config.cooldownMultiplier
      );
    }
    
    this.intelligentThrottling.cooldownHistory.push(this.intelligentThrottling.currentCooldownPeriod);
    
    // Keep only last 20 cooldown periods
    if (this.intelligentThrottling.cooldownHistory.length > 20) {
      this.intelligentThrottling.cooldownHistory.shift();
    }
    
    // Update diagnostics
    const avgCooldown = this.intelligentThrottling.cooldownHistory.reduce((sum, val) => sum + val, 0) / 
                       this.intelligentThrottling.cooldownHistory.length;
    this.diagnostics.averageCooldownPeriod = avgCooldown;
  }

  /**
   * Handle WebGL context restored event with enhanced tracking
   */
  private handleContextRestored = (): void => {
    // Verify context is actually restored before proceeding
    if (this.gl && this.gl.isContextLost()) {
      console.warn('[WebGLRecovery] Context restored event fired but context is still lost');
      return;
    }
    
    const recoveryTime = this.recoveryStartTime ? Date.now() - this.recoveryStartTime : 0;
    const contextHealthBefore = this.contextHealth.score;
    
    // Reset circuit breaker on successful recovery
    this.closeCircuitBreaker();
    this.consecutiveFailures = 0;
    
    // Update intelligent throttling
    if (this.config.enableIntelligentThrottling) {
      this.adjustCooldownPeriod(true); // Reduce cooldown on success
      this.intelligentThrottling.recoverySuccessHistory.push(true);
      
      // Keep only last 10 recovery results
      if (this.intelligentThrottling.recoverySuccessHistory.length > 10) {
        this.intelligentThrottling.recoverySuccessHistory.shift();
      }
    }
    
    // Improve context health on successful recovery
    this.contextHealth.score = Math.min(100, this.contextHealth.score + 30);
    this.diagnostics.contextHealthScore = this.contextHealth.score;
    
    this.diagnostics.successfulRecoveries++;
    this.diagnostics.lastSuccessfulRecovery = new Date();
    this.diagnostics.currentState = 'active';
    this.diagnostics.totalRecoveryTime += recoveryTime;
    this.diagnostics.averageRecoveryTime = this.diagnostics.totalRecoveryTime / this.diagnostics.successfulRecoveries;
    
    // Calculate recovery success rate
    const totalAttempts = this.diagnostics.successfulRecoveries + this.diagnostics.failedRecoveries;
    this.diagnostics.recoverySuccessRate = totalAttempts > 0 ? 
      this.diagnostics.successfulRecoveries / totalAttempts : 1.0;
    
    // Record successful recovery attempt with enhanced data
    this.diagnostics.recoveryHistory.push({
      timestamp: new Date(),
      attempt: this.recoveryAttempts,
      success: true,
      timeTaken: recoveryTime,
      contextHealthBefore,
      contextHealthAfter: this.contextHealth.score,
      cooldownPeriod: this.intelligentThrottling.currentCooldownPeriod,
      wasThrottled: false,
      recoveryTrigger: 'automatic'
    });
    
    // Cancel recovery timer
    this.cancelRecovery();
    
    console.log('[WebGLRecovery] WebGL context restored with enhanced tracking', {
      recoveries: this.diagnostics.successfulRecoveries,
      timestamp: this.diagnostics.lastSuccessfulRecovery,
      timeTaken: recoveryTime,
      consecutiveFailures: this.consecutiveFailures,
      contextHealthBefore,
      contextHealthAfter: this.contextHealth.score,
      successRate: (this.diagnostics.recoverySuccessRate * 100).toFixed(1) + '%',
      cooldownPeriod: this.intelligentThrottling.currentCooldownPeriod
    });
    
    this.emit('contextRestored');
    this.config.onContextRestored();
    
    // Reinitialize renderer if available
    if (this.renderer) {
      this.reinitializeRenderer();
    }
    
    // Add success notification
    this.addUserNotification(
      `WebGL context recovered in ${recoveryTime}ms`, 
      'info',
      'recovery'
    );
  };
  
  /**
   * Attempt recovery with intelligent strategy selection
   */
  private attemptRecoveryWithStrategy(): void {
    if (this.isRecovering) {
      console.warn('[WebGLRecovery] Recovery already in progress, skipping');
      return;
    }
    
    if (this.circuitBreakerOpen) {
      console.warn('[WebGLRecovery] Circuit breaker is open, recovery blocked');
      this.handleRecoveryFailed();
      return;
    }
    
    if (this.recoveryAttempts >= this.config.maxRecoveryAttempts) {
      console.warn(`[WebGLRecovery] Maximum recovery attempts (${this.config.maxRecoveryAttempts}) reached`);
      this.consecutiveFailures++;
      this.adjustCooldownPeriod(false); // Increase cooldown on failure
      
      if (this.consecutiveFailures >= 5) {
        this.openCircuitBreaker();
      }
      this.handleRecoveryFailed();
      return;
    }
    
    // Select recovery strategy based on context and device profile
    const strategy = this.selectRecoveryStrategy();
    
    this.isRecovering = true;
    this.recoveryAttempts++;
    this.diagnostics.recoveryAttempts++;
    this.diagnostics.currentState = 'recovering';
    this.recoveryStartTime = Date.now();
    
    console.log(`[WebGLRecovery] Attempting ${strategy} recovery (attempt ${this.recoveryAttempts}/${this.config.maxRecoveryAttempts})`);
    
    // Calculate delay with intelligent strategy
    const delay = this.calculateIntelligentRecoveryDelay(strategy);
    
    // Notify about recovery attempt
    this.config.onRecoveryAttempt(this.recoveryAttempts);
    
    this.recoveryTimer = setTimeout(() => {
      this.performRecoveryWithStrategy(strategy);
    }, delay);
  }
  
  /**
   * Select optimal recovery strategy based on context
   */
  private selectRecoveryStrategy(): 'conservative' | 'standard' | 'aggressive' {
    const contextHealth = this.contextHealth.score;
    const recoverySuccessRate = this.diagnostics.recoverySuccessRate;
    
    // Conservative strategy for poor health or low success rate
    if (contextHealth < 40 || recoverySuccessRate < 0.5 || this.deviceProfile === 'low-end') {
      return 'conservative';
    }
    
    // Aggressive strategy for good health and high success rate
    if (contextHealth > 70 && recoverySuccessRate > 0.8 && this.deviceProfile === 'high-end') {
      return 'aggressive';
    }
    
    // Standard strategy for everything else
    return 'standard';
  }
  
  /**
   * Calculate intelligent recovery delay based on strategy
   */
  private calculateIntelligentRecoveryDelay(strategy: 'conservative' | 'standard' | 'aggressive'): number {
    let baseDelay = this.config.recoveryDelayMs;
    
    // Adjust base delay by strategy
    switch (strategy) {
      case 'conservative':
        baseDelay *= 2; // Longer delay for conservative approach
        break;
      case 'aggressive':
        baseDelay *= 0.5; // Shorter delay for aggressive approach
        break;
      // 'standard' uses base delay as-is
    }
    
    // Apply exponential backoff if enabled
    if (this.config.exponentialBackoff) {
      const exponentialDelay = baseDelay * Math.pow(2, this.recoveryAttempts - 1);
      
      // Add penalty for consecutive failures with intelligent throttling
      const failurePenalty = this.consecutiveFailures > 0 ? 
        1 + (this.consecutiveFailures * 0.3) : 1;
      
      return Math.min(exponentialDelay * failurePenalty, this.config.maxRecoveryDelay);
    }
    
    return baseDelay;
  }
  
  /**
   * Perform recovery with selected strategy
   */
  private performRecoveryWithStrategy(strategy: 'conservative' | 'standard' | 'aggressive'): void {
    if (!this.gl || !this.contextLossExtension) {
      console.error('[WebGLRecovery] Cannot perform recovery: missing context or extension');
      this.recordFailedRecovery('Missing context or extension', strategy);
      this.scheduleNextRecovery();
      return;
    }
    
    try {
      // Pre-recovery cleanup based on strategy
      if (strategy === 'aggressive') {
        this.clearWebGLState();
        this.executeBatchCleanup(); // Force cleanup before recovery
      }
      
      // Double-check context state before attempting restoration
      if (this.gl.isContextLost()) {
        console.log(`[WebGLRecovery] Performing ${strategy} context restoration`);
        
        // Strategy-specific restoration approach
        if (strategy === 'conservative') {
          // Conservative: More validation and longer verification
          this.performConservativeRecovery();
        } else {
          // Standard/Aggressive: Faster restoration
          this.performStandardRecovery();
        }
      } else {
        console.log('[WebGLRecovery] Context is already restored');
        this.handleContextRestored();
      }
    } catch (error) {
      console.error(`[WebGLRecovery] ${strategy} recovery attempt failed:`, error);
      this.recordFailedRecovery(error instanceof Error ? error.message : 'Unknown error', strategy);
      this.scheduleNextRecovery();
    }
  }

  /**
   * Perform conservative recovery with extensive validation
   */
  private performConservativeRecovery(): void {
    // Conservative approach: More validation and longer verification
    this.clearWebGLState();
    
    // Wait before attempting restoration
    setTimeout(() => {
      try {
        this.contextLossExtension!.restoreContext();
        
        // Conservative verification with more attempts
        let verificationAttempts = 0;
        const maxVerificationAttempts = 15;
        
        const verifyRestoration = () => {
          verificationAttempts++;
          
          if (this.gl && !this.gl.isContextLost()) {
            console.log(`[WebGLRecovery] Conservative recovery verified after ${verificationAttempts} attempts`);
            this.handleContextRestored();
          } else if (verificationAttempts < maxVerificationAttempts) {
            setTimeout(verifyRestoration, 100);
          } else {
            console.warn('[WebGLRecovery] Conservative recovery verification failed');
            this.recordFailedRecovery('Conservative recovery verification timeout', 'conservative');
            this.scheduleNextRecovery();
          }
        };
        
        setTimeout(verifyRestoration, 200);
      } catch (error) {
        this.recordFailedRecovery(error instanceof Error ? error.message : 'Conservative recovery error', 'conservative');
        this.scheduleNextRecovery();
      }
    }, 300); // Conservative delay
  }
  
  /**
   * Perform standard recovery
   */
  private performStandardRecovery(): void {
    this.clearWebGLState();
    
    try {
      this.contextLossExtension!.restoreContext();
      
      // Standard verification
      let verificationAttempts = 0;
      const maxVerificationAttempts = 10;
      
      const verifyRestoration = () => {
        verificationAttempts++;
        
        if (this.gl && !this.gl.isContextLost()) {
          console.log(`[WebGLRecovery] Standard recovery verified after ${verificationAttempts} attempts`);
          this.handleContextRestored();
        } else if (verificationAttempts < maxVerificationAttempts) {
          setTimeout(verifyRestoration, 50);
        } else {
          console.warn('[WebGLRecovery] Standard recovery verification failed');
          this.recordFailedRecovery('Standard recovery verification timeout', 'standard');
          this.scheduleNextRecovery();
        }
      };
      
      setTimeout(verifyRestoration, 100);
    } catch (error) {
      this.recordFailedRecovery(error instanceof Error ? error.message : 'Standard recovery error', 'standard');
      this.scheduleNextRecovery();
    }
  }
  
  /**
   * Attempt to recover WebGL context (legacy method - kept for compatibility)
   */
  private attemptRecovery(): void {
    // Redirect to enhanced recovery method
    this.attemptRecoveryWithStrategy();
  }

  /**
   * Calculate recovery delay with exponential backoff and consecutive failure penalty (legacy)
   */
  private calculateRecoveryDelay(): number {
    // Redirect to intelligent delay calculation
    return this.calculateIntelligentRecoveryDelay('standard');
  }

  /**
   * Perform the actual recovery attempt
   */
  private performRecovery(): void {
    if (!this.gl || !this.contextLossExtension) {
      console.error('[WebGLRecovery] Cannot perform recovery: missing context or extension');
      this.recordFailedRecovery('Missing context or extension');
      this.scheduleNextRecovery();
      return;
    }
    
    try {
      // Double-check context state before attempting restoration
      if (this.gl.isContextLost()) {
        console.log('[WebGLRecovery] Forcing context restoration');
        
        // Clear any existing WebGL state that might interfere
        this.clearWebGLState();
        
        // Attempt context restoration
        this.contextLossExtension.restoreContext();
        
        // Give more time for context to be restored and verify multiple times
        let verificationAttempts = 0;
        const maxVerificationAttempts = 10;
        
        const verifyRestoration = () => {
          verificationAttempts++;
          
          if (this.gl && !this.gl.isContextLost()) {
            console.log(`[WebGLRecovery] Context restoration verified after ${verificationAttempts} attempts`);
            this.handleContextRestored();
          } else if (verificationAttempts < maxVerificationAttempts) {
            // Continue verification
            setTimeout(verifyRestoration, 50);
          } else {
            console.warn('[WebGLRecovery] Context restoration verification failed after maximum attempts');
            this.recordFailedRecovery('Context restoration verification timeout');
            this.scheduleNextRecovery();
          }
        };
        
        // Start verification after initial delay
        setTimeout(verifyRestoration, 100);
      } else {
        console.log('[WebGLRecovery] Context is already restored');
        this.handleContextRestored();
      }
    } catch (error) {
      console.error('[WebGLRecovery] Recovery attempt failed:', error);
      this.recordFailedRecovery(error instanceof Error ? error.message : 'Unknown error');
      this.scheduleNextRecovery();
    }
  }

  /**
   * Record a failed recovery attempt with strategy tracking
   */
  private recordFailedRecovery(error: string, strategy?: 'conservative' | 'standard' | 'aggressive'): void {
    const recoveryTime = this.recoveryStartTime ? Date.now() - this.recoveryStartTime : 0;
    const contextHealthBefore = this.contextHealth.score;
    
    // Update intelligent throttling on failure
    if (this.config.enableIntelligentThrottling) {
      this.adjustCooldownPeriod(false);
      this.intelligentThrottling.recoverySuccessHistory.push(false);
      
      if (this.intelligentThrottling.recoverySuccessHistory.length > 10) {
        this.intelligentThrottling.recoverySuccessHistory.shift();
      }
    }
    
    // Decrease context health on failure
    this.contextHealth.score = Math.max(0, this.contextHealth.score - 10);
    this.diagnostics.contextHealthScore = this.contextHealth.score;
    
    this.diagnostics.recoveryHistory.push({
      timestamp: new Date(),
      attempt: this.recoveryAttempts,
      success: false,
      timeTaken: recoveryTime,
      error,
      strategy: strategy || 'standard',
      contextHealthBefore,
      contextHealthAfter: this.contextHealth.score,
      cooldownPeriod: this.intelligentThrottling.currentCooldownPeriod,
      wasThrottled: false,
      recoveryTrigger: 'automatic'
    });
    
    // Update failure metrics
    this.diagnostics.failedRecoveries++;
    const totalAttempts = this.diagnostics.successfulRecoveries + this.diagnostics.failedRecoveries;
    this.diagnostics.recoverySuccessRate = totalAttempts > 0 ? 
      this.diagnostics.successfulRecoveries / totalAttempts : 1.0;
    
    webglDiagnostics.recordError(`Recovery attempt ${this.recoveryAttempts} failed (${strategy}): ${error}`);
  }

  /**
   * Schedule the next recovery attempt
   */
  private scheduleNextRecovery(): void {
    this.isRecovering = false;
    
    if (this.recoveryAttempts < this.config.maxRecoveryAttempts) {
      // Schedule next recovery attempt
      setTimeout(() => {
        this.attemptRecovery();
      }, 500); // Short delay between attempts
    } else {
      this.handleRecoveryFailed();
    }
  }

  /**
   * Cancel ongoing recovery
   */
  private cancelRecovery(): void {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
    
    this.isRecovering = false;
    this.recoveryStartTime = null;
  }

  /**
   * Handle failed recovery
   */
  private handleRecoveryFailed(): void {
    this.diagnostics.failedRecoveries++;
    this.diagnostics.currentState = 'failed';
    
    // Cancel any ongoing recovery
    this.cancelRecovery();
    
    console.error('[WebGLRecovery] Recovery failed after maximum attempts', {
      attempts: this.recoveryAttempts,
      maxAttempts: this.config.maxRecoveryAttempts
    });
    
    // Record error in diagnostics
    webglDiagnostics.recordError(`WebGL recovery failed after ${this.recoveryAttempts} attempts`);
    
    this.emit('recoveryFailed');
    this.config.onRecoveryFailed();
    
    // Clean up resources
    this.cleanupFailedContext();
    
    // Trigger fallback if enabled
    if (this.config.fallbackEnabled) {
      this.triggerFallback();
    }
  }

  /**
   * Clean up failed context and resources
   */
  private cleanupFailedContext(): void {
    try {
      if (this.renderer) {
        console.log('[WebGLRecovery] Disposing failed renderer');
        
        // Force garbage collection of renderer resources
        this.renderer.dispose();
        
        // Clear render targets
        this.renderer.setRenderTarget(null);
        
        // Clear any cached data
        this.renderer.info.memory.geometries = 0;
        this.renderer.info.memory.textures = 0;
        this.renderer.info.render.calls = 0;
        this.renderer.info.render.triangles = 0;
        
        this.renderer = null;
      }
      
      // Clear GL reference
      this.gl = null;
      this.contextLossExtension = null;
      
      // Force garbage collection if available
      this.forceGarbageCollection();
      
      console.log('[WebGLRecovery] Cleaned up failed context resources');
    } catch (error) {
      console.error('[WebGLRecovery] Error during cleanup:', error);
    }
  }

  /**
   * CRITICAL FIX: Enhanced WebGL state clearing with comprehensive reset
   */
  private clearWebGLState(): void {
    if (!this.gl) return;
    
    try {
      // Clear any pending operations
      this.gl.flush();
      this.gl.finish();
      
      // Reset WebGL state to default
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
      this.gl.bindTexture(this.gl.TEXTURE_2D, null);
      this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, null);
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
      this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
      this.gl.useProgram(null);
      
      // Clear additional WebGL 2.0 state if available
      if (this.gl instanceof WebGL2RenderingContext) {
        this.gl.bindVertexArray(null);
        this.gl.bindTransformFeedback(this.gl.TRANSFORM_FEEDBACK, null);
        this.gl.bindSampler(0, null);
      }
      
      // Reset viewport and scissor
      this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
      this.gl.scissor(0, 0, this.gl.canvas.width, this.gl.canvas.height);
      
      // Disable all capabilities
      this.gl.disable(this.gl.BLEND);
      this.gl.disable(this.gl.CULL_FACE);
      this.gl.disable(this.gl.DEPTH_TEST);
      this.gl.disable(this.gl.DITHER);
      this.gl.disable(this.gl.POLYGON_OFFSET_FILL);
      this.gl.disable(this.gl.SAMPLE_ALPHA_TO_COVERAGE);
      this.gl.disable(this.gl.SAMPLE_COVERAGE);
      this.gl.disable(this.gl.SCISSOR_TEST);
      this.gl.disable(this.gl.STENCIL_TEST);
      
      // Clear buffers
      this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT | this.gl.STENCIL_BUFFER_BIT);
      
      console.log('[WebGLRecovery] Cleared WebGL state comprehensively');
    } catch (error) {
      console.warn('[WebGLRecovery] Error clearing WebGL state:', error);
    }
  }
  
  /**
   * Enhanced memory information getter with caching
   */
  private getMemoryInfo(): { totalJSHeapSize?: number; usedJSHeapSize?: number; jsHeapSizeLimit?: number } | undefined {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return {
        totalJSHeapSize: memory.totalJSHeapSize,
        usedJSHeapSize: memory.usedJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      };
    }
    return undefined;
  }
  
  /**
   * CRITICAL FIX: Enhanced garbage collection with intelligent optimization
   */
  private forceGarbageCollection(): void {
    try {
      const gcStart = performance.now();
      console.log('[WebGLRecovery] Starting optimized memory cleanup');
      
      // Get memory info before cleanup
      const memoryBefore = this.getMemoryInfo();
      
      // Clear Three.js specific caches with optimization
      if (typeof THREE !== 'undefined') {
        // Clear material and geometry caches if possible
        if (THREE.Cache) {
          THREE.Cache.clear();
        }
        
        // Clear texture loader cache
        if (THREE.TextureLoader && THREE.TextureLoader.prototype.manager) {
          THREE.DefaultLoadingManager.itemStart = () => {};
          THREE.DefaultLoadingManager.itemEnd = () => {};
          THREE.DefaultLoadingManager.itemError = () => {};
        }
      }
      
      // Intelligent memory pressure handling
      if (memoryBefore && memoryBefore.usedJSHeapSize && memoryBefore.jsHeapSizeLimit) {
        const memoryPressure = (memoryBefore.usedJSHeapSize || 0) / (memoryBefore.jsHeapSizeLimit || 1);
        
        // Only create temporary objects if memory pressure is high
        if (memoryPressure > 0.7) {
          const cleanup = [];
          const iterations = Math.min(30, Math.floor(memoryPressure * 50)); // Adaptive iterations
          
          for (let i = 0; i < iterations; i++) {
            cleanup.push(new Float32Array(5)); // Smaller arrays
          }
          cleanup.length = 0;
        }
      }
      
      // Try to force garbage collection
      if (typeof window !== 'undefined' && 'gc' in window) {
        (window as any).gc();
        console.log('[WebGLRecovery] Forced garbage collection');
      }
      
      // Log performance impact
      const gcTime = performance.now() - gcStart;
      this.diagnostics.monitoringOverheadMs += gcTime;
      
      // Check memory after cleanup
      setTimeout(() => {
        const memoryAfter = this.getMemoryInfo();
        if (memoryBefore && memoryAfter) {
          const memoryFreed = (memoryBefore.usedJSHeapSize || 0) - (memoryAfter.usedJSHeapSize || 0);
          const efficiencyPercent = (memoryFreed / (memoryBefore.usedJSHeapSize || 1)) * 100;
          
          if (memoryFreed > 0) {
            console.log(`[WebGLRecovery] Memory cleanup: freed ${(memoryFreed / 1024 / 1024).toFixed(1)}MB (${efficiencyPercent.toFixed(1)}% efficiency) in ${gcTime.toFixed(1)}ms`);
          } else {
            console.log(`[WebGLRecovery] Memory cleanup completed in ${gcTime.toFixed(1)}ms (no significant memory freed)`);
          }
        }
      }, 100);
      
    } catch (error) {
      console.warn('[WebGLRecovery] Error during optimized garbage collection:', error);
    }
  }

  /**
   * Trigger fallback to 2D rendering
   */
  private triggerFallback(): void {
    console.log('[WebGLRecovery] Triggering fallback to 2D rendering');
    
    this.emit('fallback');
    this.config.onFallback();
  }

  /**
   * Reinitialize Three.js renderer after context restoration
   */
  private reinitializeRenderer(): void {
    if (!this.renderer || !this.canvas) return;
    
    try {
      // Get current renderer size
      const size = this.renderer.getSize(new THREE.Vector2());
      const pixelRatio = this.renderer.getPixelRatio();
      
      console.log('[WebGLRecovery] Reinitializing renderer with size:', size, 'pixelRatio:', pixelRatio);
      
      // Force renderer to reinitialize its context
      this.renderer.forceContextRestore();
      
      // Update renderer reference to new context
      this.renderer.setSize(size.width, size.height);
      this.renderer.setPixelRatio(pixelRatio);
      
      // Reset render state
      this.renderer.resetState();
      
      console.log('[WebGLRecovery] Renderer reinitialized successfully');
      
      // Record successful recovery
      const recoveryTime = this.recoveryStartTime ? Date.now() - this.recoveryStartTime : 0;
      webglDiagnostics.recordError('WebGL context successfully restored');
      webglDiagnostics.recordContextRecovery(recoveryTime);
      
    } catch (error) {
      console.error('[WebGLRecovery] Failed to reinitialize renderer:', error);
      webglDiagnostics.recordError(`Failed to reinitialize renderer: ${error}`);
      this.recordFailedRecovery(`Renderer reinitialize failed: ${error}`);
      this.scheduleNextRecovery();
    }
  }

  /**
   * Get current diagnostics
   */
  public getDiagnostics(): WebGLDiagnostics {
    return { ...this.diagnostics };
  }

  /**
   * Reset diagnostics
   */
  public resetDiagnostics(): void {
    this.diagnostics = {
      contextLossCount: 0,
      recoveryAttempts: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0,
      currentState: 'active',
      recoveryHistory: [],
      totalRecoveryTime: 0,
      averageRecoveryTime: 0,
      performanceScore: 100,
      memoryUsage: 0,
      qualityLevel: 4,
      preventiveMeasuresCount: 0,
      contextLossPredictions: 0,
      contextLossRisk: 'low',
      userNotifications: [],
      // Add missing properties for WebGLDiagnostics interface compatibility
      recoverySuccessRate: 0,
      averageCooldownPeriod: 0,
      unnecessaryRecoveryAttempts: 0,
      batchCleanupEfficiency: 0,
      monitoringOverheadMs: 0,
      contextHealthScore: 100,
      devicePerformanceProfile: 'mid-range' as const
    };
  }

  /**
   * Manually trigger context loss (for testing)
   */
  public simulateContextLoss(): void {
    if (this.gl) {
      const loseContext = this.gl.getExtension('WEBGL_lose_context');
      if (loseContext) {
        loseContext.loseContext();
      }
    }
  }

  /**
   * Check if WebGL is currently available
   */
  public isWebGLAvailable(): boolean {
    return this.gl !== null && !this.gl.isContextLost();
  }

  /**
   * Start preventive monitoring with adaptive intervals
   */
  private startPreventiveMonitoring(): void {
    // Enhanced performance monitoring with adaptive intervals
    this.performanceMonitor = setInterval(() => {
      this.checkPerformanceAdaptive();
    }, this.adaptiveMonitoring.currentInterval);

    // Enhanced memory monitoring with adaptive intervals
    this.memoryMonitor = setInterval(() => {
      this.checkMemoryUsageAdaptive();
    }, this.adaptiveMonitoring.currentInterval * 2); // Memory checks less frequent

    console.log(`[WebGLRecovery] Started adaptive preventive monitoring (interval: ${this.adaptiveMonitoring.currentInterval}ms)`);
  }

  /**
   * Stop preventive monitoring
   */
  private stopPreventiveMonitoring(): void {
    if (this.performanceMonitor) {
      clearInterval(this.performanceMonitor);
      this.performanceMonitor = null;
    }

    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
      this.memoryMonitor = null;
    }

    console.log('[WebGLRecovery] Stopped preventive monitoring');
  }

  /**
   * Check performance and take preventive measures if needed
   */
  private checkPerformance(): void {
    if (!this.renderer) return;

    const now = performance.now();
    const frameTime = now - this.lastPerformanceCheck;
    this.lastPerformanceCheck = now;

    if (frameTime > 0) {
      const fps = 1000 / frameTime;
      this.performanceHistory.push(fps);
      
      // Keep only last 30 readings
      if (this.performanceHistory.length > 30) {
        this.performanceHistory.shift();
      }

      const avgFPS = this.performanceHistory.reduce((sum, val) => sum + val, 0) / this.performanceHistory.length;
      this.diagnostics.performanceScore = Math.min(100, (avgFPS / 60) * 100);

      // Check if performance is below threshold
      if (avgFPS < this.config.performanceThreshold && this.qualitySettings.level > 0) {
        this.reduceQuality('performance');
      }
    }

    // Record performance metric
    webglDiagnostics.recordPerformanceMetric(frameTime);
    
    // Run risk prediction
    this.predictContextLossRisk();
  }

  /**
   * Check memory usage and take preventive measures if needed
   */
  private checkMemoryUsage(): void {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      const usedMemoryMB = memory.usedJSHeapSize / 1024 / 1024;
      // const totalMemoryMB = memory.totalJSHeapSize / 1024 / 1024;
      const limitMemoryMB = memory.jsHeapSizeLimit / 1024 / 1024;
      
      this.memoryHistory.push(usedMemoryMB);
      
      // Keep only last 20 readings
      if (this.memoryHistory.length > 20) {
        this.memoryHistory.shift();
      }

      const avgMemory = this.memoryHistory.reduce((sum, val) => sum + val, 0) / this.memoryHistory.length;
      this.diagnostics.memoryUsage = avgMemory;

      // Calculate memory pressure (percentage of limit being used)
      const memoryPressure = usedMemoryMB / limitMemoryMB;
      
      // More aggressive memory monitoring to prevent context loss
      if (memoryPressure > 0.8) { // Over 80% of memory limit
        console.warn(`[WebGLRecovery] High memory pressure detected: ${memoryPressure.toFixed(2)}`);
        this.addUserNotification(`High memory usage: ${usedMemoryMB.toFixed(0)}MB / ${limitMemoryMB.toFixed(0)}MB`, 'warning');
        
        // Emergency quality reduction
        if (this.qualitySettings.level > 1) {
          this.reduceQuality('memory');
        }
        
        // Force memory cleanup
        this.forceGarbageCollection();
      } else if (memoryPressure > 0.6) { // Over 60% of memory limit
        // Normal quality reduction
        if (avgMemory > this.config.memoryThreshold && this.qualitySettings.level > 0) {
          this.reduceQuality('memory');
        }
      }

      // Record memory metric
      webglDiagnostics.recordMemoryMetric(usedMemoryMB);
    }
  }
  
  /**
   * Check performance with adaptive monitoring and debounced alerts
   */
  private checkPerformanceAdaptive(): void {
    const monitoringStart = performance.now();
    
    if (!this.renderer) {
      this.adjustMonitoringInterval(true); // Reduce frequency if no renderer
      return;
    }

    const now = performance.now();
    const frameTime = now - this.lastPerformanceCheck;
    this.lastPerformanceCheck = now;

    if (frameTime > 0) {
      const fps = 1000 / frameTime;
      this.performanceHistory.push(fps);
      
      // Keep only last 30 readings
      if (this.performanceHistory.length > 30) {
        this.performanceHistory.shift();
      }

      const avgFPS = this.performanceHistory.reduce((sum, val) => sum + val, 0) / this.performanceHistory.length;
      this.diagnostics.performanceScore = Math.min(100, (avgFPS / 60) * 100);

      // Debounced performance alerts
      const shouldAlert = avgFPS < this.config.performanceThreshold && 
                         (now - this.adaptiveMonitoring.performanceAlertLastFired > this.config.performanceAlertDebounceMs);
      
      if (shouldAlert && this.qualitySettings.level > 0) {
        this.adaptiveMonitoring.performanceAlertLastFired = now;
        console.warn(`[WebGLRecovery] Performance alert: ${avgFPS.toFixed(1)} FPS (debounced)`);
        this.reduceQuality('performance');
        this.adjustMonitoringInterval(false); // Increase frequency on issues
      } else if (avgFPS > this.config.performanceThreshold + 10) {
        // Good performance - track stable period
        this.adaptiveMonitoring.stablePerformancePeriod += this.adaptiveMonitoring.currentInterval;
        if (this.adaptiveMonitoring.stablePerformancePeriod > this.adaptiveMonitoring.performanceStableThreshold) {
          this.adjustMonitoringInterval(true); // Reduce frequency when stable
        }
      } else {
        this.adaptiveMonitoring.stablePerformancePeriod = 0; // Reset stable period
      }
    }

    // Record performance metric
    webglDiagnostics.recordPerformanceMetric(frameTime);
    
    // Run risk prediction less frequently
    if (this.diagnostics.contextLossCount > 0 || this.diagnostics.performanceScore < this.config.performanceThreshold) {
      this.predictContextLossRisk();
    }
    
    // Track monitoring overhead
    this.diagnostics.monitoringOverheadMs += performance.now() - monitoringStart;
  }
  
  /**
   * Adjust monitoring interval based on system stability
   */
  private adjustMonitoringInterval(reduceFrequency: boolean): void {
    if (!this.config.adaptiveMonitoringEnabled) return;
    
    const oldInterval = this.adaptiveMonitoring.currentInterval;
    
    if (reduceFrequency) {
      // Increase interval (reduce frequency) when stable
      this.adaptiveMonitoring.currentInterval = Math.min(
        this.config.maxMonitoringInterval,
        this.adaptiveMonitoring.currentInterval * 1.5
      );
    } else {
      // Decrease interval (increase frequency) when issues detected
      this.adaptiveMonitoring.currentInterval = Math.max(
        this.config.minMonitoringInterval,
        this.adaptiveMonitoring.currentInterval * 0.7
      );
    }
    
    // Restart monitoring with new interval if changed significantly
    if (Math.abs(this.adaptiveMonitoring.currentInterval - oldInterval) > 1000) {
      console.log(`[WebGLRecovery] Adjusted monitoring interval: ${oldInterval}ms → ${this.adaptiveMonitoring.currentInterval}ms`);
      
      if (this.performanceMonitor) {
        clearInterval(this.performanceMonitor);
        this.performanceMonitor = setInterval(() => {
          this.checkPerformanceAdaptive();
        }, this.adaptiveMonitoring.currentInterval);
      }
      
      if (this.memoryMonitor) {
        clearInterval(this.memoryMonitor);
        this.memoryMonitor = setInterval(() => {
          this.checkMemoryUsageAdaptive();
        }, this.adaptiveMonitoring.currentInterval * 2);
      }
    }
  }
  
  /**
   * Check memory usage with adaptive monitoring and debounced alerts
   */
  private checkMemoryUsageAdaptive(): void {
    const monitoringStart = performance.now();
    
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      const usedMemoryMB = memory.usedJSHeapSize / 1024 / 1024;
      const limitMemoryMB = memory.jsHeapSizeLimit / 1024 / 1024;
      const now = Date.now();
      
      this.memoryHistory.push(usedMemoryMB);
      
      // Keep only last 20 readings
      if (this.memoryHistory.length > 20) {
        this.memoryHistory.shift();
      }

      const avgMemory = this.memoryHistory.reduce((sum, val) => sum + val, 0) / this.memoryHistory.length;
      this.diagnostics.memoryUsage = avgMemory;

      // Calculate memory pressure (percentage of limit being used)
      const memoryPressure = usedMemoryMB / limitMemoryMB;
      
      // Debounced high memory pressure alerts
      if (memoryPressure > 0.8 && (now - this.adaptiveMonitoring.memoryAlertLastFired > this.config.performanceAlertDebounceMs)) {
        this.adaptiveMonitoring.memoryAlertLastFired = now;
        console.warn(`[WebGLRecovery] High memory pressure detected: ${memoryPressure.toFixed(2)} (debounced)`);
        
        this.addUserNotification(
          `High memory usage: ${usedMemoryMB.toFixed(0)}MB / ${limitMemoryMB.toFixed(0)}MB`, 
          'warning',
          'optimization'
        );
        
        // Emergency quality reduction
        if (this.qualitySettings.level > 1) {
          this.reduceQuality('memory');
        }
        
        // Schedule batch cleanup instead of immediate forced cleanup
        if (this.config.enableBatchCleanup) {
          this.scheduleBatchCleanup('memory', 0.9); // High priority
        } else {
          this.forceGarbageCollection();
        }
        
        this.adjustMonitoringInterval(false); // Increase monitoring frequency
      } else if (memoryPressure > 0.6) {
        // Normal quality reduction with debouncing
        if (avgMemory > this.config.memoryThreshold && this.qualitySettings.level > 0) {
          this.reduceQuality('memory');
        }
      } else if (memoryPressure < 0.4) {
        // Low memory pressure - can reduce monitoring frequency
        this.adjustMonitoringInterval(true);
      }

      // Record memory metric
      webglDiagnostics.recordMemoryMetric(usedMemoryMB);
    }
    
    // Track monitoring overhead
    this.diagnostics.monitoringOverheadMs += performance.now() - monitoringStart;
  }
  
  /**
   * Schedule batch cleanup operation
   */
  private scheduleBatchCleanup(reason: 'memory' | 'performance' | 'manual', priority: number): void {
    if (!this.config.enableBatchCleanup) return;
    
    // Add cleanup operation to batch queue
    this.batchCleanup.pendingOperations.push({
      type: 'material', // Generic cleanup type
      resource: null, // Will be handled by garbage collection
      priority
    });
    
    console.log(`[WebGLRecovery] Scheduled batch cleanup (reason: ${reason}, priority: ${priority})`);
    
    // Force immediate execution for high priority
    if (priority > this.config.cleanupPriorityThreshold) {
      this.executeBatchCleanup();
    }
  }

  /**
   * Reduce quality to prevent context loss
   */
  private reduceQuality(reason: 'performance' | 'memory' | 'recovery'): void {
    if (!this.config.enableQualityReduction || this.qualitySettings.level <= 0) return;

    // const oldLevel = this.qualitySettings.level;
    this.qualitySettings.level = Math.max(0, this.qualitySettings.level - 1);

    // Apply quality reduction
    switch (this.qualitySettings.level) {
      case 3:
        this.qualitySettings.particleCount = Math.floor(this.qualitySettings.particleCount * 0.8);
        break;
      case 2:
        this.qualitySettings.antialias = false;
        this.qualitySettings.particleCount = Math.floor(this.qualitySettings.particleCount * 0.6);
        break;
      case 1:
        this.qualitySettings.shadows = false;
        this.qualitySettings.textureQuality = 0.5;
        this.qualitySettings.particleCount = Math.floor(this.qualitySettings.particleCount * 0.4);
        break;
      case 0:
        this.qualitySettings.postProcessing = false;
        this.qualitySettings.renderScale = 0.5;
        this.qualitySettings.particleCount = Math.floor(this.qualitySettings.particleCount * 0.2);
        break;
    }

    this.diagnostics.qualityLevel = this.qualitySettings.level;
    this.diagnostics.preventiveMeasuresCount++;

    const message = `Quality reduced to level ${this.qualitySettings.level} due to ${reason} concerns`;
    console.log(`[WebGLRecovery] ${message}`);
    
    this.addUserNotification(message, 'warning');
    this.config.onQualityReduced(this.qualitySettings.level);
    this.config.onPreventiveMeasure(`Quality reduction: ${reason}`);
    
    // Update renderer settings if possible
    this.applyQualitySettings();
  }

  /**
   * Apply quality settings to renderer
   */
  private applyQualitySettings(): void {
    if (!this.renderer) return;

    try {
      // Apply render scale
      const size = this.renderer.getSize(new THREE.Vector2());
      const newSize = size.clone().multiplyScalar(this.qualitySettings.renderScale);
      this.renderer.setSize(newSize.x, newSize.y);

      // Emit quality changed event for components to react to
      this.emit('qualityChanged', {
        antialias: this.qualitySettings.antialias,
        shadows: this.qualitySettings.shadows,
        postProcessing: this.qualitySettings.postProcessing,
        level: this.qualitySettings.level
      });

      console.log('[WebGLRecovery] Applied quality settings:', this.qualitySettings);
    } catch (error) {
      console.error('[WebGLRecovery] Failed to apply quality settings:', error);
    }
  }

  /**
   * Initialize quality settings based on device capabilities
   */
  private initializeQualitySettings(): void {
    if (!this.gl) return;

    // Check device capabilities
    const debugInfo = this.gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo ? this.gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
    const vendor = debugInfo ? this.gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : '';

    // Detect mobile/low-end devices
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isLowEnd = renderer.includes('SwiftShader') || renderer.includes('Software') || vendor.includes('Google Inc.');

    if (isMobile || isLowEnd) {
      this.qualitySettings.level = 2;
      this.qualitySettings.antialias = false;
      this.qualitySettings.particleCount = 50;
      this.qualitySettings.textureQuality = 0.75;
      
      this.addUserNotification('Optimized settings for mobile device', 'info');
    }

    // Check available memory
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      const totalMemoryMB = memory.jsHeapSizeLimit / 1024 / 1024;
      
      if (totalMemoryMB < 1000) { // Less than 1GB
        this.qualitySettings.level = Math.min(this.qualitySettings.level, 1);
        this.qualitySettings.renderScale = 0.75;
        this.addUserNotification('Reduced quality due to memory constraints', 'info');
      }
    }

    this.diagnostics.qualityLevel = this.qualitySettings.level;
    console.log('[WebGLRecovery] Initialized quality settings:', this.qualitySettings);
  }

  /**
   * Predict context loss risk based on current metrics
   */
  private predictContextLossRisk(): void {
    let riskScore = 0;

    // Performance risk
    if (this.diagnostics.performanceScore < 30) riskScore += 3;
    else if (this.diagnostics.performanceScore < 60) riskScore += 2;
    else if (this.diagnostics.performanceScore < 80) riskScore += 1;

    // Memory risk
    if (this.diagnostics.memoryUsage > 800) riskScore += 3;
    else if (this.diagnostics.memoryUsage > 500) riskScore += 2;
    else if (this.diagnostics.memoryUsage > 300) riskScore += 1;

    // History risk
    if (this.diagnostics.contextLossCount > 3) riskScore += 2;
    else if (this.diagnostics.contextLossCount > 1) riskScore += 1;

    // Determine risk level
    if (riskScore >= 6) {
      this.diagnostics.contextLossRisk = 'high';
    } else if (riskScore >= 3) {
      this.diagnostics.contextLossRisk = 'medium';
    } else {
      this.diagnostics.contextLossRisk = 'low';
    }

    // Take preventive action for high risk
    if (this.diagnostics.contextLossRisk === 'high' && !this.contextLossWarningShown) {
      this.contextLossWarningShown = true;
      this.diagnostics.contextLossPredictions++;
      
      if (this.qualitySettings.level > 1) {
        this.reduceQuality('recovery');
      }
      
      this.addUserNotification('High context loss risk detected - reducing quality', 'warning');
      this.config.onPreventiveMeasure('Context loss risk mitigation');
    }
  }

  /**
   * Add user notification with enhanced source tracking and debouncing
   */
  private addUserNotification(
    message: string, 
    type: 'info' | 'warning' | 'error', 
    source: 'recovery' | 'prevention' | 'quality' | 'throttling' | 'optimization' = 'recovery',
    priority: 'low' | 'medium' | 'high' = 'medium',
    debounce: boolean = false
  ): void {
    if (!this.config.enableUserNotifications) return;

    // Check for debouncing if enabled
    if (debounce) {
      const recentSimilar = this.diagnostics.userNotifications.find(
        notification => 
          notification.message === message && 
          notification.source === source &&
          Date.now() - notification.timestamp.getTime() < this.config.performanceAlertDebounceMs
      );
      
      if (recentSimilar) {
        console.log(`[WebGLRecovery] Notification debounced: ${message}`);
        return;
      }
    }

    const notification: UserNotification = {
      id: Date.now().toString(),
      timestamp: new Date(),
      message,
      type,
      dismissed: false,
      source,
      priority,
      debounced: debounce
    };

    this.diagnostics.userNotifications.push(notification);
    
    // Keep only last 50 notifications
    if (this.diagnostics.userNotifications.length > 50) {
      this.diagnostics.userNotifications.shift();
    }

    this.config.onUserNotification(message, type);
  }

  /**
   * Get current quality settings
   */
  public getQualitySettings(): QualitySettings {
    return { ...this.qualitySettings };
  }

  /**
   * Manually set quality level
   */
  public setQualityLevel(level: number): void {
    if (level < 0 || level > 4) {
      throw new Error('Quality level must be between 0 and 4');
    }

    this.qualitySettings.level = level;
    this.diagnostics.qualityLevel = level;
    this.applyQualitySettings();
    
    this.addUserNotification(`Quality manually set to level ${level}`, 'info');
  }

  /**
   * Dismiss user notification
   */
  public dismissNotification(id: string): void {
    const notification = this.diagnostics.userNotifications.find(n => n.id === id);
    if (notification) {
      notification.dismissed = true;
    }
  }

  /**
   * Clear all notifications
   */
  public clearNotifications(): void {
    this.diagnostics.userNotifications = [];
  }

  /**
   * Open circuit breaker to prevent further recovery attempts
   */
  private openCircuitBreaker(): void {
    this.circuitBreakerOpen = true;
    this.diagnostics.currentState = 'failed';
    
    console.warn('[WebGLRecovery] Circuit breaker opened - recovery attempts blocked for 30 seconds');
    this.addUserNotification('WebGL recovery temporarily disabled due to repeated failures', 'error');
    
    // Auto-close circuit breaker after 30 seconds
    this.circuitBreakerTimeout = setTimeout(() => {
      this.closeCircuitBreaker();
    }, 30000);
  }
  
  /**
   * Close circuit breaker to allow recovery attempts
   */
  private closeCircuitBreaker(): void {
    if (this.circuitBreakerTimeout) {
      clearTimeout(this.circuitBreakerTimeout);
      this.circuitBreakerTimeout = null;
    }
    
    if (this.circuitBreakerOpen) {
      this.circuitBreakerOpen = false;
      console.log('[WebGLRecovery] Circuit breaker closed - recovery attempts re-enabled');
      this.addUserNotification('WebGL recovery re-enabled', 'info');
    }
  }
  
  /**
   * Reset recovery state for new context loss
   */
  /* private resetRecoveryState(): void {
    this.recoveryAttempts = 0;
    this.isRecovering = false;
    this.recoveryStartTime = null;
    
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
  } */
  
  /**
   * Check if recovery should be allowed
   */
  /* private shouldAllowRecovery(): boolean {
    if (this.circuitBreakerOpen) {
      return false;
    }
    
    if (this.isRecovering) {
      return false;
    }
    
    if (this.recoveryAttempts >= this.config.maxRecoveryAttempts) {
      return false;
    }
    
    // Rate limiting: don't allow recovery attempts more than once per second
    const now = Date.now();
    if (now - this.lastRecoveryAttempt < 1000) {
      return false;
    }
    
    return true;
  } */

  /**
   * Cleanup and remove event listeners
   */
  public dispose(): void {
    // Cancel any ongoing recovery
    this.cancelRecovery();
    
    // Close circuit breaker
    this.closeCircuitBreaker();
    
    // Stop monitoring
    this.stopPreventiveMonitoring();
    
    if (this.canvas) {
      this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
      this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    }
    
    // Clean up resources
    this.cleanupFailedContext();
    
    this.canvas = null;
    this.gl = null;
    this.contextLossExtension = null;
    this.recoveryAttempts = 0;
    this.consecutiveFailures = 0;
    this.removeAllListeners();
    
    console.log('[WebGLRecovery] Disposed WebGL recovery manager');
  }
}

/**
 * React hook for WebGL recovery
 */
export function useWebGLRecovery(config?: WebGLRecoveryConfig) {
  const managerRef = React.useRef<WebGLRecoveryManager | null>(null);
  const [diagnostics, setDiagnostics] = React.useState<WebGLDiagnostics>({
    contextLossCount: 0,
    recoveryAttempts: 0,
    successfulRecoveries: 0,
    failedRecoveries: 0,
    currentState: 'active',
    recoveryHistory: [],
    totalRecoveryTime: 0,
    averageRecoveryTime: 0,
    performanceScore: 100,
    memoryUsage: 0,
    qualityLevel: 4,
    preventiveMeasuresCount: 0,
    contextLossPredictions: 0,
    contextLossRisk: 'low',
    userNotifications: [],
    // Enhanced metrics
    recoverySuccessRate: 1.0,
    averageCooldownPeriod: 1000,
    unnecessaryRecoveryAttempts: 0,
    batchCleanupEfficiency: 1.0,
    monitoringOverheadMs: 0,
    contextHealthScore: 100,
    devicePerformanceProfile: 'mid-range'
  });
  const [shouldFallback, setShouldFallback] = React.useState(false);
  const [isRecovering, setIsRecovering] = React.useState(false);
  const [currentRecoveryAttempt, setCurrentRecoveryAttempt] = React.useState(0);

  React.useEffect(() => {
    const manager = new WebGLRecoveryManager({
      ...config,
      onContextLost: () => {
        config?.onContextLost?.();
        setDiagnostics(manager.getDiagnostics());
        setIsRecovering(true);
      },
      onContextRestored: () => {
        config?.onContextRestored?.();
        setDiagnostics(manager.getDiagnostics());
        setShouldFallback(false);
        setIsRecovering(false);
        setCurrentRecoveryAttempt(0);
      },
      onRecoveryFailed: () => {
        config?.onRecoveryFailed?.();
        setDiagnostics(manager.getDiagnostics());
        setIsRecovering(false);
        setCurrentRecoveryAttempt(0);
      },
      onFallback: () => {
        config?.onFallback?.();
        setShouldFallback(true);
        setIsRecovering(false);
        setCurrentRecoveryAttempt(0);
      },
      onRecoveryAttempt: (attempt: number) => {
        config?.onRecoveryAttempt?.(attempt);
        setCurrentRecoveryAttempt(attempt);
        setDiagnostics(manager.getDiagnostics());
      }
    });

    managerRef.current = manager;

    return () => {
      manager.dispose();
    };
  }, [config]);

  const initializeRecovery = React.useCallback(
    (canvas: HTMLCanvasElement, renderer?: THREE.WebGLRenderer) => {
      managerRef.current?.initializeRecovery(canvas, renderer);
    },
    []
  );

  const simulateContextLoss = React.useCallback(() => {
    managerRef.current?.simulateContextLoss();
  }, []);

  const resetDiagnostics = React.useCallback(() => {
    managerRef.current?.resetDiagnostics();
    setDiagnostics(managerRef.current?.getDiagnostics() || {
      contextLossCount: 0,
      recoveryAttempts: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0,
      currentState: 'active',
      recoveryHistory: [],
      totalRecoveryTime: 0,
      averageRecoveryTime: 0,
      performanceScore: 100,
      memoryUsage: 0,
      qualityLevel: 4,
      preventiveMeasuresCount: 0,
      contextLossPredictions: 0,
      contextLossRisk: 'low',
      userNotifications: [],
      // Enhanced metrics
      recoverySuccessRate: 1.0,
      averageCooldownPeriod: 1000,
      unnecessaryRecoveryAttempts: 0,
      batchCleanupEfficiency: 1.0,
      monitoringOverheadMs: 0,
      contextHealthScore: 100,
      devicePerformanceProfile: 'mid-range'
    });
    setShouldFallback(false);
    setIsRecovering(false);
    setCurrentRecoveryAttempt(0);
  }, []);

  const forceRecovery = React.useCallback(() => {
    if (managerRef.current) {
      managerRef.current.simulateContextLoss();
    }
  }, []);

  const getQualitySettings = React.useCallback(() => {
    return managerRef.current?.getQualitySettings() || {
      level: 4,
      antialias: true,
      shadows: true,
      postProcessing: true,
      particleCount: 100,
      textureQuality: 1.0,
      renderScale: 1.0
    };
  }, []);

  const setQualityLevel = React.useCallback((level: number) => {
    managerRef.current?.setQualityLevel(level);
  }, []);

  const dismissNotification = React.useCallback((id: string) => {
    managerRef.current?.dismissNotification(id);
  }, []);

  const clearNotifications = React.useCallback(() => {
    managerRef.current?.clearNotifications();
  }, []);

  return {
    initializeRecovery,
    diagnostics,
    shouldFallback,
    isRecovering,
    currentRecoveryAttempt,
    simulateContextLoss,
    resetDiagnostics,
    forceRecovery,
    isWebGLAvailable: () => managerRef.current?.isWebGLAvailable() ?? false,
    getQualitySettings,
    setQualityLevel,
    dismissNotification,
    clearNotifications
  };
}

// Export singleton instance for global usage
export const webGLRecoveryManager = new WebGLRecoveryManager();