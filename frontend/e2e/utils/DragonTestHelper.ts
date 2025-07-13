/**
 * DragonTestHelper - Comprehensive testing utility for Dragon 3D components
 * 
 * This helper class provides utilities for testing the dragon rendering system,
 * including screenshot management, performance monitoring, state analysis,
 * and comprehensive reporting.
 */

import { Page, BrowserContext, expect } from '@playwright/test';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export interface MonitoringOptions {
  trackNetworkRequests?: boolean;
  trackConsoleMessages?: boolean;
  trackJSErrors?: boolean;
  trackPerformance?: boolean;
  takeScreenshots?: boolean;
}

export interface TestReportData {
  networkRequests: Array<{ url: string; status: number; timing: number }>;
  consoleMessages: Array<{ type: string; text: string; timestamp: number }>;
  jsErrors: Array<{ message: string; stack?: string; timestamp: number }>;
  testName: string;
}

export interface RenderingState {
  webglSupported: boolean;
  threeJsLoaded: boolean;
  canvasElements: number;
  asciiElements: number;
  fallbackElements: number;
  errorElements: number;
  loadingElements: number;
  dragonElements: number;
  renderingMode: string;
  fallbackManagerActive: boolean;
}

export interface PerformanceSnapshot {
  timestamp: number;
  memoryUsage?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  frameRate?: number;
  renderTime?: number;
}

export class DragonTestHelper {
  private page: Page;
  private context: BrowserContext;
  private screenshotCounter = 0;
  private screenshotsDir: string;
  private performanceSnapshots: PerformanceSnapshot[] = [];
  private monitoringEnabled = false;

  constructor(page: Page, context: BrowserContext) {
    this.page = page;
    this.context = context;
    this.screenshotsDir = join(process.cwd(), 'test-results', 'dragon-screenshots');
  }

  /**
   * Set up comprehensive monitoring for the test session
   */
  async setupMonitoring(options: MonitoringOptions = {}) {
    this.monitoringEnabled = true;

    // Create screenshots directory
    if (options.takeScreenshots) {
      await mkdir(this.screenshotsDir, { recursive: true });
    }

    // Inject performance monitoring script if needed
    if (options.trackPerformance) {
      await this.page.addInitScript(() => {
        // Performance monitoring setup
        (window as any).dragonTestPerformance = {
          snapshots: [],
          startTime: Date.now(),
          
          takeSnapshot: () => {
            const snapshot = {
              timestamp: Date.now(),
              memoryUsage: (performance as any).memory ? {
                usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
                totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
                jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
              } : undefined
            };
            
            (window as any).dragonTestPerformance.snapshots.push(snapshot);
            return snapshot;
          },
          
          getSnapshots: () => (window as any).dragonTestPerformance.snapshots
        };

        // Take initial snapshot
        (window as any).dragonTestPerformance.takeSnapshot();
      });
    }

    // Set up 3D-specific debugging
    await this.page.addInitScript(() => {
      // Dragon testing utilities
      (window as any).dragonTestUtils = {
        // WebGL detection
        detectWebGLCapabilities: () => {
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
          const gl2 = canvas.getContext('webgl2');
          
          if (!gl) {
            return {
              supported: false,
              version: null,
              vendor: null,
              renderer: null
            };
          }

          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          
          return {
            supported: true,
            version: gl.getParameter(gl.VERSION),
            vendor: gl.getParameter(gl.VENDOR),
            renderer: gl.getParameter(gl.RENDERER),
            unmaskedVendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : null,
            unmaskedRenderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : null,
            webgl2Supported: !!gl2,
            maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
            extensions: gl.getSupportedExtensions()
          };
        },

        // Three.js detection
        detectThreeJS: () => {
          return {
            loaded: typeof (window as any).THREE !== 'undefined',
            version: (window as any).THREE?.REVISION || null,
            components: {
              webGLRenderer: typeof (window as any).THREE?.WebGLRenderer !== 'undefined',
              scene: typeof (window as any).THREE?.Scene !== 'undefined',
              camera: typeof (window as any).THREE?.PerspectiveCamera !== 'undefined',
              gltfLoader: typeof (window as any).THREE?.GLTFLoader !== 'undefined'
            }
          };
        },

        // Dragon component detection
        detectDragonComponents: () => {
          return {
            dragonRenderer: document.querySelectorAll('[data-component="DragonRenderer"]').length,
            dragonFallback: document.querySelectorAll('[data-component="DragonFallbackRenderer"]').length,
            seironGLB: document.querySelectorAll('[class*="SeironGLB"]').length,
            dragonHead3D: document.querySelectorAll('[class*="DragonHead3D"]').length,
            asciiDragon: document.querySelectorAll('[data-dragon-type="ascii"]').length,
            sprite2D: document.querySelectorAll('[data-dragon-type="2d"]').length,
            webgl3D: document.querySelectorAll('[data-dragon-type="3d"]').length,
            totalCanvas: document.querySelectorAll('canvas').length,
            errorBoundaries: document.querySelectorAll('[data-error-boundary]').length
          };
        },

        // Model loading detection
        detectModelLoading: () => {
          const loadingElements = document.querySelectorAll('[data-loading]');
          const errorElements = document.querySelectorAll('[data-error]');
          
          return {
            isLoading: loadingElements.length > 0,
            hasErrors: errorElements.length > 0,
            loadingCount: loadingElements.length,
            errorCount: errorElements.length,
            loadingStates: Array.from(loadingElements).map(el => ({
              element: el.tagName,
              state: el.getAttribute('data-loading'),
              visible: el.offsetWidth > 0 && el.offsetHeight > 0
            }))
          };
        },

        // Fallback system detection
        detectFallbackSystem: () => {
          return {
            webglFallbackManager: typeof (window as any).webglFallbackManager !== 'undefined',
            modelCacheService: typeof (window as any).ModelCacheService !== 'undefined',
            currentMode: (window as any).webglFallbackManager?.getCurrentMode?.() || 'unknown',
            capabilities: (window as any).webglFallbackManager?.detectCapabilities?.() || null,
            environment: (window as any).webglFallbackManager?.getEnvironment?.() || null
          };
        }
      };
    });
  }

  /**
   * Take a screenshot with automatic naming and organization
   */
  async takeScreenshot(name: string, options: { fullPage?: boolean } = {}) {
    if (!this.monitoringEnabled) return;

    const timestamp = Date.now();
    const filename = `${String(this.screenshotCounter).padStart(2, '0')}-${name}-${timestamp}.png`;
    const filepath = join(this.screenshotsDir, filename);

    try {
      await this.page.screenshot({
        path: filepath,
        fullPage: options.fullPage !== false,
        animations: 'disabled' // For consistent screenshots
      });

      this.screenshotCounter++;
      console.log(`Screenshot saved: ${filename}`);
      
      return {
        name,
        filename,
        path: filepath,
        timestamp
      };
    } catch (error) {
      console.error(`Failed to take screenshot ${name}:`, error);
      return null;
    }
  }

  /**
   * Get current rendering state of the dragon system
   */
  async getCurrentRenderingState(): Promise<RenderingState> {
    return await this.page.evaluate(() => {
      const utils = (window as any).dragonTestUtils;
      
      const webglInfo = utils.detectWebGLCapabilities();
      const threeInfo = utils.detectThreeJS();
      const components = utils.detectDragonComponents();
      const loading = utils.detectModelLoading();
      const fallback = utils.detectFallbackSystem();

      return {
        webglSupported: webglInfo.supported,
        threeJsLoaded: threeInfo.loaded,
        canvasElements: components.totalCanvas,
        asciiElements: components.asciiDragon,
        fallbackElements: components.dragonFallback,
        errorElements: components.errorBoundaries,
        loadingElements: loading.loadingCount,
        dragonElements: components.dragonRenderer + components.seironGLB + components.dragonHead3D,
        renderingMode: fallback.currentMode,
        fallbackManagerActive: fallback.webglFallbackManager
      };
    });
  }

  /**
   * Wait for dragon rendering to stabilize
   */
  async waitForRenderingStabilization(timeoutMs = 15000): Promise<RenderingState> {
    const startTime = Date.now();
    let lastState: RenderingState | null = null;
    let stableStateCount = 0;
    const requiredStableCount = 3; // Require 3 consecutive stable readings

    while (Date.now() - startTime < timeoutMs) {
      const currentState = await this.getCurrentRenderingState();
      
      if (lastState && 
          currentState.canvasElements === lastState.canvasElements &&
          currentState.loadingElements === lastState.loadingElements &&
          currentState.errorElements === lastState.errorElements) {
        stableStateCount++;
        
        if (stableStateCount >= requiredStableCount) {
          console.log('Dragon rendering stabilized');
          return currentState;
        }
      } else {
        stableStateCount = 0;
      }
      
      lastState = currentState;
      await this.page.waitForTimeout(1000);
    }

    console.log('Dragon rendering stabilization timeout reached');
    return lastState || await this.getCurrentRenderingState();
  }

  /**
   * Test model switching functionality
   */
  async testModelSwitching(): Promise<{
    available: boolean;
    switchResults: Array<{
      controlIndex: number;
      beforeState: RenderingState;
      afterState: RenderingState;
      success: boolean;
      errors: string[];
    }>;
  }> {
    const switchingControls = await this.page.locator('[data-testid*="model"], [data-action*="switch"], button:has-text("Model")').all();
    
    if (switchingControls.length === 0) {
      return {
        available: false,
        switchResults: []
      };
    }

    const switchResults = [];

    for (let i = 0; i < Math.min(switchingControls.length, 3); i++) {
      const control = switchingControls[i];
      const beforeState = await this.getCurrentRenderingState();
      const beforeErrors = await this.getJavaScriptErrors();
      
      try {
        await control.click();
        await this.page.waitForTimeout(2000); // Wait for switch to complete
        
        const afterState = await this.getCurrentRenderingState();
        const afterErrors = await this.getJavaScriptErrors();
        const newErrors = afterErrors.slice(beforeErrors.length);
        
        await this.takeScreenshot(`model-switch-${i + 1}`);
        
        switchResults.push({
          controlIndex: i,
          beforeState,
          afterState,
          success: newErrors.length === 0,
          errors: newErrors.map(e => e.message)
        });
      } catch (error) {
        switchResults.push({
          controlIndex: i,
          beforeState,
          afterState: beforeState,
          success: false,
          errors: [error.message]
        });
      }
    }

    return {
      available: true,
      switchResults
    };
  }

  /**
   * Get JavaScript errors that occurred during testing
   */
  async getJavaScriptErrors(): Promise<Array<{ message: string; stack?: string; timestamp: number }>> {
    return await this.page.evaluate(() => {
      return (window as any).dragonTestErrors || [];
    });
  }

  /**
   * Take a performance snapshot
   */
  async takePerformanceSnapshot(): Promise<PerformanceSnapshot> {
    if (!this.monitoringEnabled) {
      return { timestamp: Date.now() };
    }

    const snapshot = await this.page.evaluate(() => {
      return (window as any).dragonTestPerformance?.takeSnapshot() || { timestamp: Date.now() };
    });

    this.performanceSnapshots.push(snapshot);
    return snapshot;
  }

  /**
   * Analyze performance over time
   */
  getPerformanceAnalysis() {
    if (this.performanceSnapshots.length < 2) {
      return null;
    }

    const first = this.performanceSnapshots[0];
    const last = this.performanceSnapshots[this.performanceSnapshots.length - 1];
    
    return {
      duration: last.timestamp - first.timestamp,
      memoryGrowth: last.memoryUsage && first.memoryUsage ? 
        last.memoryUsage.usedJSHeapSize - first.memoryUsage.usedJSHeapSize : null,
      snapshotCount: this.performanceSnapshots.length,
      averageMemoryUsage: this.performanceSnapshots
        .filter(s => s.memoryUsage)
        .reduce((sum, s) => sum + (s.memoryUsage?.usedJSHeapSize || 0), 0) / 
        this.performanceSnapshots.filter(s => s.memoryUsage).length
    };
  }

  /**
   * Generate comprehensive test report
   */
  async generateTestReport(data: TestReportData): Promise<any> {
    const finalState = await this.getCurrentRenderingState();
    const performanceAnalysis = this.getPerformanceAnalysis();
    
    const diagnostics = await this.page.evaluate(() => {
      const utils = (window as any).dragonTestUtils;
      
      return {
        webgl: utils.detectWebGLCapabilities(),
        threejs: utils.detectThreeJS(),
        components: utils.detectDragonComponents(),
        loading: utils.detectModelLoading(),
        fallback: utils.detectFallbackSystem()
      };
    });

    const report = {
      testInfo: {
        name: data.testName,
        timestamp: new Date().toISOString(),
        url: this.page.url(),
        userAgent: await this.page.evaluate(() => navigator.userAgent)
      },
      
      finalRenderingState: finalState,
      
      diagnostics,
      
      performance: {
        analysis: performanceAnalysis,
        snapshots: this.performanceSnapshots
      },
      
      networkActivity: {
        modelRequests: data.networkRequests.filter(r => 
          /\.(glb|gltf|obj|fbx|dae)(\?|$)/i.test(r.url) ||
          r.url.includes('model') ||
          r.url.includes('dragon')
        ),
        totalRequests: data.networkRequests.length
      },
      
      errors: {
        javascript: data.jsErrors,
        console: data.consoleMessages.filter(m => m.type === 'error'),
        warnings: data.consoleMessages.filter(m => m.type === 'warning')
      },
      
      recommendations: this.generateRecommendations(finalState, diagnostics, data.jsErrors),
      
      healthScore: this.calculateHealthScore(finalState, diagnostics, data.jsErrors)
    };

    // Save report to file
    const reportPath = join(this.screenshotsDir, `test-report-${data.testName.replace(/\s+/g, '-')}-${Date.now()}.json`);
    await writeFile(reportPath, JSON.stringify(report, null, 2));

    return report;
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(state: RenderingState, diagnostics: any, errors: any[]): string[] {
    const recommendations = [];

    if (!state.webglSupported && state.asciiElements === 0 && state.fallbackElements === 0) {
      recommendations.push('WebGL not supported and no fallback rendering detected - ensure fallback systems are working');
    }

    if (state.loadingElements > 0) {
      recommendations.push('Components appear stuck in loading state - check for timeout issues');
    }

    if (errors.length > 3) {
      recommendations.push('Multiple JavaScript errors detected - review error handling');
    }

    if (!diagnostics.threejs.loaded) {
      recommendations.push('Three.js not loaded properly - check bundle includes');
    }

    if (state.dragonElements === 0) {
      recommendations.push('No dragon components detected - verify component mounting');
    }

    if (state.webglSupported && state.asciiElements > 0) {
      recommendations.push('WebGL is supported but ASCII fallback is active - investigate 3D rendering issues');
    }

    if (diagnostics.fallback.webglFallbackManager && state.canvasElements === 0) {
      recommendations.push('Fallback manager active but no canvas elements - check fallback implementation');
    }

    return recommendations;
  }

  /**
   * Calculate health score based on test results
   */
  private calculateHealthScore(state: RenderingState, diagnostics: any, errors: any[]): number {
    let score = 100;

    // Deduct for critical issues
    if (!state.webglSupported && state.asciiElements === 0 && state.fallbackElements === 0) {
      score -= 40; // No rendering at all
    }

    if (state.loadingElements > 0) {
      score -= 20; // Stuck loading
    }

    if (errors.length > 0) {
      score -= Math.min(errors.length * 5, 30); // Up to 30 points for errors
    }

    if (!diagnostics.threejs.loaded) {
      score -= 15; // Three.js not loaded
    }

    // Add points for successful fallback
    if (!state.webglSupported && (state.asciiElements > 0 || state.fallbackElements > 0)) {
      score += 20; // Successful fallback
    }

    // Add points for successful 3D rendering
    if (state.webglSupported && state.canvasElements > 0) {
      score += 25; // Successful 3D rendering
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Clean up test resources
   */
  async cleanup() {
    // Reset performance monitoring
    this.performanceSnapshots = [];
    this.screenshotCounter = 0;

    // Clean up any injected scripts
    await this.page.evaluate(() => {
      delete (window as any).dragonTestUtils;
      delete (window as any).dragonTestPerformance;
      delete (window as any).dragonTestErrors;
    });
  }
}