import { EventEmitter } from 'events';
import * as THREE from 'three';
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
}

interface UserNotification {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'warning' | 'error';
  dismissed: boolean;
  source: 'recovery' | 'prevention' | 'quality';
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
    userNotifications: []
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

    // Setup event listeners
    this.setupEventListeners();
    
    // Start preventive monitoring if enabled
    if (this.config.enablePreventiveMeasures) {
      this.startPreventiveMonitoring();
    }
    
    // Initialize quality settings based on device capabilities
    this.initializeQualitySettings();
    
    console.log('[WebGLRecovery] Initialized WebGL recovery management');
    this.addUserNotification('3D Dragon system ready', 'info');
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
   * Handle WebGL context lost event
   */
  private handleContextLost = (event: Event): void => {
    event.preventDefault(); // Prevent default behavior
    
    // Check if circuit breaker is open
    if (this.circuitBreakerOpen) {
      console.warn('[WebGLRecovery] Circuit breaker is open, skipping recovery attempt');
      this.handleRecoveryFailed();
      return;
    }
    
    // Prevent rapid context loss events
    const now = Date.now();
    if (now - this.lastRecoveryAttempt < 1000) {
      console.warn('[WebGLRecovery] Rapid context loss detected, implementing backoff');
      this.consecutiveFailures++;
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
    
    console.warn('[WebGLRecovery] WebGL context lost', {
      lossCount: this.diagnostics.contextLossCount,
      timestamp: this.diagnostics.lastContextLoss,
      consecutiveFailures: this.consecutiveFailures
    });
    
    // Record error in diagnostics
    webglDiagnostics.recordError(`WebGL context lost (count: ${this.diagnostics.contextLossCount})`);
    webglDiagnostics.recordContextLoss();
    
    this.emit('contextLost');
    this.config.onContextLost();
    
    // Attempt recovery with circuit breaker protection
    this.attemptRecovery();
  };

  /**
   * Handle WebGL context restored event
   */
  private handleContextRestored = (): void => {
    // Verify context is actually restored before proceeding
    if (this.gl && this.gl.isContextLost()) {
      console.warn('[WebGLRecovery] Context restored event fired but context is still lost');
      return;
    }
    
    const recoveryTime = this.recoveryStartTime ? Date.now() - this.recoveryStartTime : 0;
    
    // Reset circuit breaker on successful recovery
    this.closeCircuitBreaker();
    this.consecutiveFailures = 0;
    
    this.diagnostics.successfulRecoveries++;
    this.diagnostics.lastSuccessfulRecovery = new Date();
    this.diagnostics.currentState = 'active';
    this.diagnostics.totalRecoveryTime += recoveryTime;
    this.diagnostics.averageRecoveryTime = this.diagnostics.totalRecoveryTime / this.diagnostics.successfulRecoveries;
    
    // Record successful recovery attempt
    this.diagnostics.recoveryHistory.push({
      timestamp: new Date(),
      attempt: this.recoveryAttempts,
      success: true,
      timeTaken: recoveryTime
    });
    
    // Cancel recovery timer
    this.cancelRecovery();
    
    console.log('[WebGLRecovery] WebGL context restored', {
      recoveries: this.diagnostics.successfulRecoveries,
      timestamp: this.diagnostics.lastSuccessfulRecovery,
      timeTaken: recoveryTime,
      consecutiveFailures: this.consecutiveFailures
    });
    
    this.emit('contextRestored');
    this.config.onContextRestored();
    
    // Reinitialize renderer if available
    if (this.renderer) {
      this.reinitializeRenderer();
    }
  };

  /**
   * Attempt to recover WebGL context
   */
  private attemptRecovery(): void {
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
      if (this.consecutiveFailures >= 5) {
        this.openCircuitBreaker();
      }
      this.handleRecoveryFailed();
      return;
    }
    
    this.isRecovering = true;
    this.recoveryAttempts++;
    this.diagnostics.recoveryAttempts++;
    this.diagnostics.currentState = 'recovering';
    this.recoveryStartTime = Date.now();
    
    console.log(`[WebGLRecovery] Attempting recovery (attempt ${this.recoveryAttempts}/${this.config.maxRecoveryAttempts}, consecutive failures: ${this.consecutiveFailures})`);
    
    // Calculate delay with exponential backoff and consecutive failure penalty
    const delay = this.calculateRecoveryDelay();
    
    // Notify about recovery attempt
    this.config.onRecoveryAttempt(this.recoveryAttempts);
    
    this.recoveryTimer = setTimeout(() => {
      this.performRecovery();
    }, delay);
  }

  /**
   * Calculate recovery delay with exponential backoff and consecutive failure penalty
   */
  private calculateRecoveryDelay(): number {
    if (!this.config.exponentialBackoff) {
      return this.config.recoveryDelayMs;
    }
    
    const baseDelay = this.config.recoveryDelayMs;
    let exponentialDelay = baseDelay * Math.pow(2, this.recoveryAttempts - 1);
    
    // Add penalty for consecutive failures
    if (this.consecutiveFailures > 0) {
      exponentialDelay *= (1 + this.consecutiveFailures * 0.5);
    }
    
    return Math.min(exponentialDelay, this.config.maxRecoveryDelay);
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
   * Record a failed recovery attempt
   */
  private recordFailedRecovery(error: string): void {
    const recoveryTime = this.recoveryStartTime ? Date.now() - this.recoveryStartTime : 0;
    
    this.diagnostics.recoveryHistory.push({
      timestamp: new Date(),
      attempt: this.recoveryAttempts,
      success: false,
      timeTaken: recoveryTime,
      error
    });
    
    webglDiagnostics.recordError(`Recovery attempt ${this.recoveryAttempts} failed: ${error}`);
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
   * Clear WebGL state before recovery attempt
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
      
      console.log('[WebGLRecovery] Cleared WebGL state');
    } catch (error) {
      console.warn('[WebGLRecovery] Error clearing WebGL state:', error);
    }
  }
  
  /**
   * Force garbage collection if possible
   */
  private forceGarbageCollection(): void {
    try {
      // Try to force garbage collection
      if (typeof window !== 'undefined' && 'gc' in window) {
        (window as any).gc();
        console.log('[WebGLRecovery] Forced garbage collection');
      }
      
      // Clear any cached Three.js objects
      if (typeof THREE !== 'undefined') {
        // Note: Material and geometry caches are handled internally by Three.js
        // We don't have direct access to clear them, but disposing of materials
        // and geometries will help with memory cleanup
      }
      
      // Request memory cleanup
      if (typeof window !== 'undefined' && window.performance && (window.performance as any).memory) {
        const memory = (window.performance as any).memory;
        const memoryBefore = memory.usedJSHeapSize;
        
        // Force a minor GC by creating and destroying objects (but only if memory is high)
        if (memoryBefore > 100 * 1024 * 1024) { // Only if using more than 100MB
          const cleanup = [];
          for (let i = 0; i < 100; i++) { // Reduced from 1000 to prevent memory spikes
            cleanup.push(new Float32Array(10));
          }
          cleanup.length = 0;
        }
        
        setTimeout(() => {
          if ((window.performance as any).memory) {
            const memoryAfter = (window.performance as any).memory.usedJSHeapSize;
            console.log(`[WebGLRecovery] Memory cleanup: ${memoryBefore} -> ${memoryAfter} bytes`);
          }
        }, 100);
      }
    } catch (error) {
      console.warn('[WebGLRecovery] Could not force garbage collection:', error);
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
      userNotifications: []
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
   * Start preventive monitoring for performance and memory
   */
  private startPreventiveMonitoring(): void {
    // Performance monitoring
    this.performanceMonitor = setInterval(() => {
      this.checkPerformance();
    }, 5000); // Check every 5 seconds

    // Memory monitoring
    this.memoryMonitor = setInterval(() => {
      this.checkMemoryUsage();
    }, 10000); // Check every 10 seconds

    console.log('[WebGLRecovery] Started preventive monitoring');
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
      const totalMemoryMB = memory.totalJSHeapSize / 1024 / 1024;
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
   * Reduce quality to prevent context loss
   */
  private reduceQuality(reason: 'performance' | 'memory' | 'recovery'): void {
    if (!this.config.enableQualityReduction || this.qualitySettings.level <= 0) return;

    const oldLevel = this.qualitySettings.level;
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
   * Add user notification
   */
  private addUserNotification(message: string, type: 'info' | 'warning' | 'error'): void {
    if (!this.config.enableUserNotifications) return;

    const notification: UserNotification = {
      id: Date.now().toString(),
      timestamp: new Date(),
      message,
      type,
      dismissed: false,
      source: 'recovery'
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
  private resetRecoveryState(): void {
    this.recoveryAttempts = 0;
    this.isRecovering = false;
    this.recoveryStartTime = null;
    
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
  }
  
  /**
   * Check if recovery should be allowed
   */
  private shouldAllowRecovery(): boolean {
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
  }

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
    userNotifications: []
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
  }, []);

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
      userNotifications: []
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

import React from 'react';

// Export singleton instance for global usage
export const webGLRecoveryManager = new WebGLRecoveryManager();