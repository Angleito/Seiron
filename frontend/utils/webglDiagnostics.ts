import * as THREE from 'three';

export interface WebGLDiagnosticInfo {
  renderer: string;
  vendor: string;
  version: string;
  shadingLanguageVersion: string;
  maxTextureSize: number;
  maxVertexAttributes: number;
  maxFragmentUniforms: number;
  maxVertexUniforms: number;
  maxVaryings: number;
  maxCombinedTextureImageUnits: number;
  supportedExtensions: string[];
  contextAttributes: WebGLContextAttributes | null;
  memoryInfo?: {
    totalJSHeapSize?: number;
    usedJSHeapSize?: number;
    jsHeapSizeLimit?: number;
  };
  timestamp: Date;
}

export interface WebGLHealthMetrics {
  isContextLost: boolean;
  isContextAvailable: boolean;
  renderingContextType: string | null;
  performanceScore: number;
  memoryUsage: number;
  errorCount: number;
  lastError?: string;
  uptime: number;
  timestamp: Date;
}

export class WebGLDiagnostics {
  private static instance: WebGLDiagnostics;
  private errorCount = 0;
  private lastError: string | undefined;
  private startTime = Date.now();
  private performanceMetrics: number[] = [];
  private memoryMetrics: number[] = [];
  private contextLossHistory: Array<{
    timestamp: Date;
    recovered: boolean;
    timeTaken?: number;
  }> = [];

  private constructor() {}

  public static getInstance(): WebGLDiagnostics {
    if (!WebGLDiagnostics.instance) {
      WebGLDiagnostics.instance = new WebGLDiagnostics();
    }
    return WebGLDiagnostics.instance;
  }

  /**
   * Get comprehensive WebGL diagnostic information
   */
  public getDiagnosticInfo(renderer?: THREE.WebGLRenderer): WebGLDiagnosticInfo {
    // Check if we're in a headless environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return this.getHeadlessDiagnosticInfo();
    }

    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
    
    if (!gl) {
      return this.getHeadlessDiagnosticInfo();
    }

    // Get basic WebGL info
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const contextAttributes = gl.getContextAttributes();

    // Get memory info if available
    const memoryInfo = this.getMemoryInfo();

    // Get supported extensions
    const supportedExtensions = gl.getSupportedExtensions() || [];

    const diagnosticInfo: WebGLDiagnosticInfo = {
      renderer: debugInfo 
        ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) 
        : gl.getParameter(gl.RENDERER),
      vendor: debugInfo 
        ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) 
        : gl.getParameter(gl.VENDOR),
      version: gl.getParameter(gl.VERSION),
      shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxVertexAttributes: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
      maxFragmentUniforms: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
      maxVertexUniforms: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
      maxVaryings: gl.getParameter(gl.MAX_VARYING_VECTORS),
      maxCombinedTextureImageUnits: gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
      supportedExtensions,
      contextAttributes,
      memoryInfo,
      timestamp: new Date()
    };

    // Clean up
    canvas.remove();

    return diagnosticInfo;
  }

  /**
   * Get diagnostic info for headless environments
   */
  private getHeadlessDiagnosticInfo(): WebGLDiagnosticInfo {
    return {
      renderer: 'Software Renderer (Headless)',
      vendor: 'Seiron Fallback System',
      version: 'WebGL 1.0 (Mock)',
      shadingLanguageVersion: 'WebGL GLSL ES 1.0 (Mock)',
      maxTextureSize: 2048,
      maxVertexAttributes: 16,
      maxFragmentUniforms: 1024,
      maxVertexUniforms: 1024,
      maxVaryings: 30,
      maxCombinedTextureImageUnits: 32,
      supportedExtensions: ['WEBGL_lose_context'],
      contextAttributes: {
        alpha: true,
        antialias: false,
        depth: true,
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
        stencil: false
      },
      memoryInfo: this.getMemoryInfo(),
      timestamp: new Date()
    };
  }

  /**
   * Get current WebGL health metrics
   */
  public getHealthMetrics(renderer?: THREE.WebGLRenderer): WebGLHealthMetrics {
    // Check if we're in a headless environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return this.getHeadlessHealthMetrics();
    }

    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
    
    const isContextAvailable = gl !== null;
    const isContextLost = gl ? gl.isContextLost() : true;
    const renderingContextType = gl ? (
      typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext ? 'webgl2' : 'webgl'
    ) : null;

    // Calculate performance score
    const performanceScore = this.calculatePerformanceScore();
    
    // Calculate memory usage
    const memoryUsage = this.calculateMemoryUsage();

    const metrics: WebGLHealthMetrics = {
      isContextLost,
      isContextAvailable,
      renderingContextType,
      performanceScore,
      memoryUsage,
      errorCount: this.errorCount,
      lastError: this.lastError,
      uptime: Date.now() - this.startTime,
      timestamp: new Date()
    };

    // Clean up
    canvas.remove();

    return metrics;
  }

  /**
   * Get health metrics for headless environments
   */
  private getHeadlessHealthMetrics(): WebGLHealthMetrics {
    return {
      isContextLost: false,
      isContextAvailable: false,
      renderingContextType: 'mock',
      performanceScore: 50, // Moderate performance for software rendering
      memoryUsage: this.calculateMemoryUsage(),
      errorCount: this.errorCount,
      lastError: this.lastError,
      uptime: Date.now() - this.startTime,
      timestamp: new Date()
    };
  }

  /**
   * Record a performance metric
   */
  public recordPerformanceMetric(value: number): void {
    this.performanceMetrics.push(value);
    
    // Keep only last 100 metrics
    if (this.performanceMetrics.length > 100) {
      this.performanceMetrics.shift();
    }
  }

  /**
   * Record a memory metric
   */
  public recordMemoryMetric(value: number): void {
    this.memoryMetrics.push(value);
    
    // Keep only last 100 metrics
    if (this.memoryMetrics.length > 100) {
      this.memoryMetrics.shift();
    }
  }

  /**
   * Record an error
   */
  public recordError(error: string): void {
    this.errorCount++;
    this.lastError = error;
    
    console.error(`[WebGLDiagnostics] Error #${this.errorCount}: ${error}`);
  }

  /**
   * Record a context loss event
   */
  public recordContextLoss(): void {
    this.contextLossHistory.push({
      timestamp: new Date(),
      recovered: false
    });
  }

  /**
   * Record a successful context recovery
   */
  public recordContextRecovery(timeTaken: number): void {
    const lastLoss = this.contextLossHistory[this.contextLossHistory.length - 1];
    if (lastLoss && !lastLoss.recovered) {
      lastLoss.recovered = true;
      lastLoss.timeTaken = timeTaken;
    }
  }

  /**
   * Get context loss statistics
   */
  public getContextLossStats(): {
    totalLosses: number;
    recoveredLosses: number;
    recoveryRate: number;
    averageRecoveryTime: number;
    recentLosses: Array<{timestamp: Date; recovered: boolean; timeTaken?: number}>;
  } {
    const totalLosses = this.contextLossHistory.length;
    const recoveredLosses = this.contextLossHistory.filter(loss => loss.recovered).length;
    const recoveryRate = totalLosses > 0 ? recoveredLosses / totalLosses : 0;
    
    const recoveryTimes = this.contextLossHistory
      .filter(loss => loss.recovered && loss.timeTaken)
      .map(loss => loss.timeTaken!);
    
    const averageRecoveryTime = recoveryTimes.length > 0 
      ? recoveryTimes.reduce((sum, time) => sum + time, 0) / recoveryTimes.length
      : 0;
    
    // Get last 10 losses
    const recentLosses = this.contextLossHistory.slice(-10);
    
    return {
      totalLosses,
      recoveredLosses,
      recoveryRate,
      averageRecoveryTime,
      recentLosses
    };
  }

  /**
   * Reset all metrics
   */
  public reset(): void {
    this.errorCount = 0;
    this.lastError = undefined;
    this.startTime = Date.now();
    this.performanceMetrics = [];
    this.memoryMetrics = [];
    this.contextLossHistory = [];
  }

  /**
   * Test WebGL capabilities
   */
  public testCapabilities(): Record<string, boolean> {
    // Check if we're in a headless environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return this.getHeadlessCapabilities();
    }

    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
    
    if (!gl) {
      return this.getHeadlessCapabilities();
    }

    const capabilities = {
      webgl: true,
      webgl2: typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext,
      instancing: !!gl.getExtension('ANGLE_instanced_arrays'),
      drawBuffers: !!gl.getExtension('WEBGL_draw_buffers'),
      vertexArrayObject: !!gl.getExtension('OES_vertex_array_object'),
      textureFloat: !!gl.getExtension('OES_texture_float'),
      textureHalfFloat: !!gl.getExtension('OES_texture_half_float'),
      depthTexture: !!gl.getExtension('WEBGL_depth_texture'),
      colorBufferFloat: !!gl.getExtension('EXT_color_buffer_float'),
      colorBufferHalfFloat: !!gl.getExtension('EXT_color_buffer_half_float'),
      sRGB: !!gl.getExtension('EXT_sRGB'),
      anisotropicFiltering: !!gl.getExtension('EXT_texture_filter_anisotropic'),
      standardDerivatives: !!gl.getExtension('OES_standard_derivatives'),
      fragDepth: !!gl.getExtension('EXT_frag_depth'),
      shaderTextureLOD: !!gl.getExtension('EXT_shader_texture_lod'),
      loseContext: !!gl.getExtension('WEBGL_lose_context'),
      debugRendererInfo: !!gl.getExtension('WEBGL_debug_renderer_info'),
      debugShaders: !!gl.getExtension('WEBGL_debug_shaders'),
      compressedTextureS3TC: !!gl.getExtension('WEBGL_compressed_texture_s3tc'),
      compressedTextureETC1: !!gl.getExtension('WEBGL_compressed_texture_etc1'),
      compressedTexturePVRTC: !!gl.getExtension('WEBGL_compressed_texture_pvrtc'),
      compressedTextureATC: !!gl.getExtension('WEBGL_compressed_texture_atc')
    };

    // Clean up
    canvas.remove();

    return capabilities;
  }

  /**
   * Get capabilities for headless environments
   */
  private getHeadlessCapabilities(): Record<string, boolean> {
    return {
      webgl: false,
      webgl2: false,
      headlessMode: true,
      softwareRendering: true,
      mockCanvas: true,
      canvas2d: true,
      instancing: false,
      drawBuffers: false,
      vertexArrayObject: false,
      textureFloat: false,
      textureHalfFloat: false,
      depthTexture: false,
      colorBufferFloat: false,
      colorBufferHalfFloat: false,
      sRGB: false,
      anisotropicFiltering: false,
      standardDerivatives: false,
      fragDepth: false,
      shaderTextureLOD: false,
      loseContext: true, // Mock context loss support
      debugRendererInfo: false,
      debugShaders: false,
      compressedTextureS3TC: false,
      compressedTextureETC1: false,
      compressedTexturePVRTC: false,
      compressedTextureATC: false
    };
  }

  /**
   * Generate a diagnostic report
   */
  public generateReport(renderer?: THREE.WebGLRenderer): string {
    try {
      const diagnosticInfo = this.getDiagnosticInfo(renderer);
      const healthMetrics = this.getHealthMetrics(renderer);
      const capabilities = this.testCapabilities();
      const contextStats = this.getContextLossStats();

      const report = `
WebGL Diagnostic Report
Generated: ${new Date().toISOString()}

=== HEALTH METRICS ===
Context Available: ${healthMetrics.isContextAvailable ? '✅' : '❌'}
Context Lost: ${healthMetrics.isContextLost ? '❌' : '✅'}
Rendering Context: ${healthMetrics.renderingContextType || 'None'}
Performance Score: ${healthMetrics.performanceScore.toFixed(2)}
Memory Usage: ${healthMetrics.memoryUsage.toFixed(2)} MB
Error Count: ${healthMetrics.errorCount}
Last Error: ${healthMetrics.lastError || 'None'}
Uptime: ${(healthMetrics.uptime / 1000).toFixed(2)}s

=== CONTEXT RECOVERY STATS ===
Total Context Losses: ${contextStats.totalLosses}
Recovered Losses: ${contextStats.recoveredLosses}
Recovery Rate: ${(contextStats.recoveryRate * 100).toFixed(2)}%
Average Recovery Time: ${contextStats.averageRecoveryTime.toFixed(2)}ms

=== RECENT CONTEXT LOSSES ===
${contextStats.recentLosses.length > 0 ? contextStats.recentLosses.map(loss => 
  `${loss.timestamp.toISOString()}: ${loss.recovered ? '✅' : '❌'} ${loss.timeTaken ? `(${loss.timeTaken}ms)` : ''}`
).join('\n') : 'No recent context losses'}

=== DIAGNOSTIC INFO ===
Renderer: ${diagnosticInfo.renderer}
Vendor: ${diagnosticInfo.vendor}
Version: ${diagnosticInfo.version}
Shading Language: ${diagnosticInfo.shadingLanguageVersion}
Max Texture Size: ${diagnosticInfo.maxTextureSize}
Max Vertex Attributes: ${diagnosticInfo.maxVertexAttributes}
Max Fragment Uniforms: ${diagnosticInfo.maxFragmentUniforms}
Max Vertex Uniforms: ${diagnosticInfo.maxVertexUniforms}
Max Varyings: ${diagnosticInfo.maxVaryings}
Max Combined Texture Units: ${diagnosticInfo.maxCombinedTextureImageUnits}

=== MEMORY INFO ===
${diagnosticInfo.memoryInfo ? `
Total JS Heap Size: ${((diagnosticInfo.memoryInfo.totalJSHeapSize || 0) / 1024 / 1024).toFixed(2)} MB
Used JS Heap Size: ${((diagnosticInfo.memoryInfo.usedJSHeapSize || 0) / 1024 / 1024).toFixed(2)} MB
JS Heap Size Limit: ${((diagnosticInfo.memoryInfo.jsHeapSizeLimit || 0) / 1024 / 1024).toFixed(2)} MB
` : 'Memory info not available'}

=== CAPABILITIES ===
${Object.entries(capabilities)
  .map(([key, value]) => `${key}: ${value ? '✅' : '❌'}`)
  .join('\n')}

=== SUPPORTED EXTENSIONS ===
${diagnosticInfo.supportedExtensions.join(', ')}

=== CONTEXT ATTRIBUTES ===
${JSON.stringify(diagnosticInfo.contextAttributes, null, 2)}
`;

      return report;
    } catch (error) {
      return `Error generating WebGL diagnostic report: ${error}`;
    }
  }

  /**
   * Get memory information
   */
  private getMemoryInfo(): WebGLDiagnosticInfo['memoryInfo'] {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return {
        totalJSHeapSize: memory.totalJSHeapSize,
        usedJSHeapSize: memory.usedJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      };
    }
    
    // For headless environments, provide reasonable defaults
    if (typeof window === 'undefined') {
      return {
        totalJSHeapSize: 50 * 1024 * 1024, // 50MB default
        usedJSHeapSize: 25 * 1024 * 1024,  // 25MB default
        jsHeapSizeLimit: 100 * 1024 * 1024 // 100MB default
      };
    }
    
    return undefined;
  }

  /**
   * Calculate performance score (0-100)
   */
  private calculatePerformanceScore(): number {
    if (this.performanceMetrics.length === 0) return 100;

    const average = this.performanceMetrics.reduce((sum, val) => sum + val, 0) / this.performanceMetrics.length;
    
    // Assuming 60 FPS is ideal (16.67ms frame time)
    const targetFrameTime = 16.67;
    const score = Math.max(0, Math.min(100, 100 - ((average - targetFrameTime) * 2)));
    
    return score;
  }

  /**
   * Calculate memory usage in MB
   */
  private calculateMemoryUsage(): number {
    if (this.memoryMetrics.length === 0) {
      const memoryInfo = this.getMemoryInfo();
      if (memoryInfo && memoryInfo.usedJSHeapSize) {
        return memoryInfo.usedJSHeapSize / 1024 / 1024;
      }
      return 0;
    }

    const latest = this.memoryMetrics[this.memoryMetrics.length - 1];
    return latest ?? 0;
  }
}

/**
 * Global diagnostics instance
 */
export const webglDiagnostics = WebGLDiagnostics.getInstance();

/**
 * Hook for accessing WebGL diagnostics in React components
 */
export function useWebGLDiagnostics() {
  const [diagnostics, setDiagnostics] = React.useState<WebGLDiagnosticInfo | null>(null);
  const [healthMetrics, setHealthMetrics] = React.useState<WebGLHealthMetrics | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const updateDiagnostics = React.useCallback(async (renderer?: THREE.WebGLRenderer) => {
    setIsLoading(true);
    try {
      const diagnosticInfo = webglDiagnostics.getDiagnosticInfo(renderer);
      const health = webglDiagnostics.getHealthMetrics(renderer);
      
      setDiagnostics(diagnosticInfo);
      setHealthMetrics(health);
    } catch (error) {
      console.error('Failed to update WebGL diagnostics:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateReport = React.useCallback((renderer?: THREE.WebGLRenderer) => {
    return webglDiagnostics.generateReport(renderer);
  }, []);

  const recordError = React.useCallback((error: string) => {
    webglDiagnostics.recordError(error);
  }, []);

  const recordPerformance = React.useCallback((value: number) => {
    webglDiagnostics.recordPerformanceMetric(value);
  }, []);

  const recordMemory = React.useCallback((value: number) => {
    webglDiagnostics.recordMemoryMetric(value);
  }, []);

  return {
    diagnostics,
    healthMetrics,
    isLoading,
    updateDiagnostics,
    generateReport,
    recordError,
    recordPerformance,
    recordMemory
  };
}

import React from 'react';