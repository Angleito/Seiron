import { EventEmitter } from 'events';
import * as THREE from 'three';
import { webglDiagnostics } from './webglDiagnostics';

export interface WebGLRecoveryConfig {
  maxRecoveryAttempts?: number;
  recoveryDelayMs?: number;
  fallbackEnabled?: boolean;
  onContextLost?: () => void;
  onContextRestored?: () => void;
  onRecoveryFailed?: () => void;
  onFallback?: () => void;
}

export interface WebGLDiagnostics {
  contextLossCount: number;
  recoveryAttempts: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  lastContextLoss?: Date;
  lastSuccessfulRecovery?: Date;
  currentState: 'active' | 'lost' | 'recovering' | 'failed';
}

export class WebGLRecoveryManager extends EventEmitter {
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private recoveryAttempts = 0;
  private isRecovering = false;
  private diagnostics: WebGLDiagnostics = {
    contextLossCount: 0,
    recoveryAttempts: 0,
    successfulRecoveries: 0,
    failedRecoveries: 0,
    currentState: 'active'
  };
  
  private config: Required<WebGLRecoveryConfig> = {
    maxRecoveryAttempts: 3,
    recoveryDelayMs: 1000,
    fallbackEnabled: true,
    onContextLost: () => {},
    onContextRestored: () => {},
    onRecoveryFailed: () => {},
    onFallback: () => {}
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
      return;
    }

    // Setup event listeners
    this.setupEventListeners();
    
    console.log('[WebGLRecovery] Initialized WebGL recovery management');
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
    
    this.diagnostics.contextLossCount++;
    this.diagnostics.lastContextLoss = new Date();
    this.diagnostics.currentState = 'lost';
    
    console.warn('[WebGLRecovery] WebGL context lost', {
      lossCount: this.diagnostics.contextLossCount,
      timestamp: this.diagnostics.lastContextLoss
    });
    
    // Record error in diagnostics
    webglDiagnostics.recordError(`WebGL context lost (count: ${this.diagnostics.contextLossCount})`);
    
    this.emit('contextLost');
    this.config.onContextLost();
    
    // Attempt recovery
    if (this.recoveryAttempts < this.config.maxRecoveryAttempts) {
      this.attemptRecovery();
    } else {
      this.handleRecoveryFailed();
    }
  };

  /**
   * Handle WebGL context restored event
   */
  private handleContextRestored = (): void => {
    this.diagnostics.successfulRecoveries++;
    this.diagnostics.lastSuccessfulRecovery = new Date();
    this.diagnostics.currentState = 'active';
    this.isRecovering = false;
    this.recoveryAttempts = 0;
    
    console.log('[WebGLRecovery] WebGL context restored', {
      recoveries: this.diagnostics.successfulRecoveries,
      timestamp: this.diagnostics.lastSuccessfulRecovery
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
    if (this.isRecovering) return;
    
    this.isRecovering = true;
    this.recoveryAttempts++;
    this.diagnostics.recoveryAttempts++;
    this.diagnostics.currentState = 'recovering';
    
    console.log(`[WebGLRecovery] Attempting recovery (attempt ${this.recoveryAttempts}/${this.config.maxRecoveryAttempts})`);
    
    setTimeout(() => {
      if (this.gl && this.gl.isContextLost()) {
        // Force context restoration
        const loseContext = this.gl.getExtension('WEBGL_lose_context');
        if (loseContext) {
          loseContext.restoreContext();
        }
      }
    }, this.config.recoveryDelayMs);
  }

  /**
   * Handle failed recovery
   */
  private handleRecoveryFailed(): void {
    this.diagnostics.failedRecoveries++;
    this.diagnostics.currentState = 'failed';
    
    console.error('[WebGLRecovery] Recovery failed after maximum attempts', {
      attempts: this.recoveryAttempts,
      maxAttempts: this.config.maxRecoveryAttempts
    });
    
    // Record error in diagnostics
    webglDiagnostics.recordError(`WebGL recovery failed after ${this.recoveryAttempts} attempts`);
    
    this.emit('recoveryFailed');
    this.config.onRecoveryFailed();
    
    // Trigger fallback if enabled
    if (this.config.fallbackEnabled) {
      this.triggerFallback();
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
      // Reset renderer state
      this.renderer.dispose();
      
      // Recreate renderer with same configuration
      const params = {
        canvas: this.canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false
      };
      
      // Update renderer reference
      this.renderer.setSize(this.canvas.width, this.canvas.height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      
      console.log('[WebGLRecovery] Renderer reinitialized successfully');
      
      // Record successful recovery
      webglDiagnostics.recordError('WebGL context successfully restored');
      
    } catch (error) {
      console.error('[WebGLRecovery] Failed to reinitialize renderer:', error);
      webglDiagnostics.recordError(`Failed to reinitialize renderer: ${error}`);
      this.handleRecoveryFailed();
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
      currentState: 'active'
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
   * Cleanup and remove event listeners
   */
  public dispose(): void {
    if (this.canvas) {
      this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
      this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    }
    
    this.canvas = null;
    this.gl = null;
    this.renderer = null;
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
    currentState: 'active'
  });
  const [shouldFallback, setShouldFallback] = React.useState(false);

  React.useEffect(() => {
    const manager = new WebGLRecoveryManager({
      ...config,
      onContextLost: () => {
        config?.onContextLost?.();
        setDiagnostics(manager.getDiagnostics());
      },
      onContextRestored: () => {
        config?.onContextRestored?.();
        setDiagnostics(manager.getDiagnostics());
        setShouldFallback(false);
      },
      onRecoveryFailed: () => {
        config?.onRecoveryFailed?.();
        setDiagnostics(manager.getDiagnostics());
      },
      onFallback: () => {
        config?.onFallback?.();
        setShouldFallback(true);
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
      currentState: 'active'
    });
  }, []);

  return {
    initializeRecovery,
    diagnostics,
    shouldFallback,
    simulateContextLoss,
    resetDiagnostics,
    isWebGLAvailable: () => managerRef.current?.isWebGLAvailable() ?? false
  };
}

// Export singleton instance for global usage
export const webGLRecoveryManager = new WebGLRecoveryManager();

import React from 'react';