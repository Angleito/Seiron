/**
 * Comprehensive 3D Model Loading Test Suite
 * 
 * This test suite provides exhaustive testing of the 3D dragon model loading system,
 * including error scenarios, fallback behavior, performance monitoring, and network
 * request tracking. It's designed to work both in Docker containers and standard
 * browser environments.
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { DragonTestHelper } from '../utils/DragonTestHelper';

// Test configurations for different environments
const TEST_ENVIRONMENTS = {
  docker: {
    expectWebGL: false,
    expectFallback: true,
    timeoutMultiplier: 2,
    description: 'Docker/headless environment'
  },
  browser: {
    expectWebGL: true,
    expectFallback: false,
    timeoutMultiplier: 1,
    description: 'Standard browser environment'
  },
  lowEnd: {
    expectWebGL: false,
    expectFallback: true,
    timeoutMultiplier: 3,
    description: 'Low-end device simulation'
  }
};

// Model files to test
const MODEL_FILES = [
  '/models/dragon_head.glb',
  '/models/dragon_head_optimized.glb',
  '/models/seiron.glb',
  '/models/seiron_optimized.glb',
  '/models/seiron_animated.gltf'
];

test.describe('3D Dragon Model Loading', () => {
  let helper: DragonTestHelper;
  let networkRequests: Array<{ url: string; status: number; timing: number }> = [];
  let consoleMessages: Array<{ type: string; text: string; timestamp: number }> = [];
  let jsErrors: Array<{ message: string; stack?: string; timestamp: number }> = [];

  test.beforeEach(async ({ page, context }) => {
    helper = new DragonTestHelper(page, context);
    networkRequests = [];
    consoleMessages = [];
    jsErrors = [];

    // Set up comprehensive monitoring
    await helper.setupMonitoring({
      trackNetworkRequests: true,
      trackConsoleMessages: true,
      trackJSErrors: true,
      trackPerformance: true,
      takeScreenshots: true
    });

    // Monitor network requests specifically for model files
    page.on('response', async (response) => {
      const url = response.url();
      const isModelFile = /\.(glb|gltf|obj|fbx|dae)(\?|$)/i.test(url) || 
                         url.includes('model') || 
                         url.includes('dragon');
      
      if (isModelFile) {
        const timing = await response.finished();
        networkRequests.push({
          url,
          status: response.status(),
          timing: timing ? Date.now() - timing : 0
        });
      }
    });

    // Monitor console messages
    page.on('console', (msg) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now()
      });
    });

    // Monitor JavaScript errors
    page.on('pageerror', (error) => {
      jsErrors.push({
        message: error.message,
        stack: error.stack,
        timestamp: Date.now()
      });
    });
  });

  test.afterEach(async ({ page }) => {
    // Generate comprehensive test report
    const report = await helper.generateTestReport({
      networkRequests,
      consoleMessages,
      jsErrors,
      testName: test.info().title
    });

    // Attach report to test results
    test.info().attachments.push({
      name: 'Test Report',
      contentType: 'application/json',
      body: Buffer.from(JSON.stringify(report, null, 2))
    });

    await helper.cleanup();
  });

  test('should load WebGL3D page successfully', async ({ page }) => {
    const startTime = Date.now();
    
    // Navigate to the 3D page
    await page.goto('/dragons/webgl-3d', { 
      waitUntil: 'networkidle', 
      timeout: 30000 
    });

    const loadTime = Date.now() - startTime;
    
    // Verify page loaded
    await expect(page).toHaveTitle(/Seiron.*3D/i);
    expect(loadTime).toBeLessThan(15000); // Should load within 15 seconds

    // Take initial screenshot
    await helper.takeScreenshot('01-page-loaded');

    // Check for basic page elements
    await expect(page.locator('body')).toBeVisible();
  });

  test('should detect environment and adapt rendering strategy', async ({ page }) => {
    await page.goto('/dragons/webgl-3d');
    
    // Wait for initial rendering decisions
    await page.waitForTimeout(3000);

    const environmentInfo = await page.evaluate(() => {
      return {
        // Check for WebGL support
        webglSupported: (() => {
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
          return !!gl;
        })(),
        
        // Check for Three.js availability
        threeJsLoaded: typeof (window as any).THREE !== 'undefined',
        
        // Check what rendering mode was selected
        fallbackManagerActive: typeof (window as any).webglFallbackManager !== 'undefined',
        
        // Count different types of elements
        canvasElements: document.querySelectorAll('canvas').length,
        asciiElements: document.querySelectorAll('[data-dragon-type="ascii"], pre, [class*="ascii"]').length,
        fallbackElements: document.querySelectorAll('[data-fallback], [class*="fallback"]').length,
        mockCanvasElements: document.querySelectorAll('[data-mock-canvas]').length,
        
        // Check for error states
        errorElements: document.querySelectorAll('[data-error], [class*="error"]').length,
        loadingElements: document.querySelectorAll('[data-loading], [class*="loading"]').length
      };
    });

    // Take screenshot of environment detection
    await helper.takeScreenshot('02-environment-detection');

    // Log environment detection results
    console.log('Environment Detection Results:', environmentInfo);

    // Verify appropriate rendering strategy was selected
    const hasAnyRendering = environmentInfo.canvasElements > 0 || 
                           environmentInfo.asciiElements > 0 || 
                           environmentInfo.mockCanvasElements > 0;
    
    expect(hasAnyRendering).toBe(true);

    // In Docker/headless, we should have fallback rendering
    if (!environmentInfo.webglSupported) {
      expect(environmentInfo.asciiElements + environmentInfo.mockCanvasElements).toBeGreaterThan(0);
    }
  });

  test('should handle model file accessibility correctly', async ({ page, baseURL }) => {
    await page.goto('/dragons/webgl-3d');

    const modelAccessibility = [];

    // Test each model file
    for (const modelPath of MODEL_FILES) {
      const fullUrl = `${baseURL}${modelPath}`;
      
      try {
        const response = await page.request.get(fullUrl);
        
        modelAccessibility.push({
          path: modelPath,
          url: fullUrl,
          accessible: response.ok(),
          status: response.status(),
          contentType: response.headers()['content-type'],
          contentLength: response.headers()['content-length']
        });
      } catch (error) {
        modelAccessibility.push({
          path: modelPath,
          url: fullUrl,
          accessible: false,
          error: error.message
        });
      }
    }

    // Verify at least some models are accessible
    const accessibleModels = modelAccessibility.filter(m => m.accessible);
    expect(accessibleModels.length).toBeGreaterThan(0);

    // Log model accessibility results
    console.log('Model Accessibility Results:', modelAccessibility);

    // Attach model accessibility report
    test.info().attachments.push({
      name: 'Model Accessibility Report',
      contentType: 'application/json',
      body: Buffer.from(JSON.stringify(modelAccessibility, null, 2))
    });
  });

  test('should complete loading states within reasonable timeouts', async ({ page }) => {
    await page.goto('/dragons/webgl-3d');

    const loadingStates = [];
    let checkCount = 0;
    const maxChecks = 30; // 30 seconds max

    // Monitor loading states over time
    while (checkCount < maxChecks) {
      const state = await page.evaluate(() => {
        return {
          timestamp: Date.now(),
          loadingElements: document.querySelectorAll('[data-loading="true"]').length,
          spinnerElements: document.querySelectorAll('[class*="loading"], [class*="spinner"]').length,
          canvasElements: document.querySelectorAll('canvas').length,
          errorElements: document.querySelectorAll('[data-error], [class*="error"]').length,
          dragonElements: document.querySelectorAll('[data-testid*="dragon"], [class*="dragon"]').length,
          fallbackElements: document.querySelectorAll('[data-fallback], [class*="fallback"]').length,
          asciiElements: document.querySelectorAll('[class*="ascii"], pre').length
        };
      });

      loadingStates.push(state);
      checkCount++;

      // Break if we reach a stable state
      if ((state.canvasElements > 0 || state.fallbackElements > 0 || state.asciiElements > 0) && 
          state.loadingElements === 0) {
        break;
      }

      await page.waitForTimeout(1000);
    }

    // Take screenshot of loading completion
    await helper.takeScreenshot('03-loading-completed');

    const finalState = loadingStates[loadingStates.length - 1];
    
    // Verify loading completed (no stuck loading states)
    expect(finalState.loadingElements).toBe(0);
    
    // Verify some form of rendering succeeded
    const hasSuccessfulRendering = finalState.canvasElements > 0 || 
                                  finalState.fallbackElements > 0 || 
                                  finalState.asciiElements > 0;
    expect(hasSuccessfulRendering).toBe(true);

    // Attach loading states timeline
    test.info().attachments.push({
      name: 'Loading States Timeline',
      contentType: 'application/json',
      body: Buffer.from(JSON.stringify(loadingStates, null, 2))
    });
  });

  test('should test model switching functionality', async ({ page }) => {
    await page.goto('/dragons/webgl-3d');
    
    // Wait for initial load
    await page.waitForTimeout(3000);

    // Look for model switching controls
    const switchingControls = await page.locator('[data-testid*="model"], [data-action*="switch"], button:has-text("Model")').all();
    
    if (switchingControls.length > 0) {
      console.log(`Found ${switchingControls.length} model switching controls`);

      for (let i = 0; i < Math.min(switchingControls.length, 3); i++) {
        const control = switchingControls[i];
        
        // Get initial state
        const beforeState = await helper.getCurrentRenderingState();
        
        // Click the control
        await control.click();
        
        // Wait for potential model switch
        await page.waitForTimeout(2000);
        
        // Get state after click
        const afterState = await helper.getCurrentRenderingState();
        
        // Take screenshot of model switch
        await helper.takeScreenshot(`04-model-switch-${i + 1}`);
        
        // Verify something changed or at least no errors occurred
        const errorElements = await page.locator('[data-error], [class*="error"]').count();
        expect(errorElements).toBe(0);
      }
    } else {
      console.log('No model switching controls found - this may be expected');
    }
  });

  test('should handle WebGL errors gracefully with fallback', async ({ page, browserName }) => {
    // Force WebGL failure for testing fallback
    await page.addInitScript(() => {
      // Mock WebGL context creation to fail
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(contextType: string, ...args: any[]) {
        if (contextType === 'webgl' || contextType === 'experimental-webgl' || contextType === 'webgl2') {
          return null; // Force WebGL failure
        }
        return originalGetContext.call(this, contextType, ...args);
      };
    });

    await page.goto('/dragons/webgl-3d');
    
    // Wait for fallback systems to activate
    await page.waitForTimeout(5000);

    const fallbackState = await page.evaluate(() => {
      return {
        fallbackElements: document.querySelectorAll('[data-fallback], [class*="fallback"]').length,
        asciiElements: document.querySelectorAll('[class*="ascii"], pre').length,
        canvas2DElements: Array.from(document.querySelectorAll('canvas')).filter(canvas => {
          return canvas.getContext('2d') !== null;
        }).length,
        mockCanvasElements: document.querySelectorAll('[data-mock-canvas]').length,
        errorBoundaryActive: document.querySelectorAll('[data-error-boundary]').length > 0,
        webglFallbackManagerActive: typeof (window as any).webglFallbackManager !== 'undefined'
      };
    });

    // Take screenshot of fallback state
    await helper.takeScreenshot('05-webgl-failure-fallback');

    // Verify fallback systems activated
    const hasFallbackRendering = fallbackState.fallbackElements > 0 || 
                                fallbackState.asciiElements > 0 || 
                                fallbackState.canvas2DElements > 0 || 
                                fallbackState.mockCanvasElements > 0;
    
    expect(hasFallbackRendering).toBe(true);

    // No critical errors should occur
    expect(jsErrors.filter(e => e.message.toLowerCase().includes('critical')).length).toBe(0);
  });

  test('should monitor performance metrics during 3D rendering', async ({ page }) => {
    await page.goto('/dragons/webgl-3d');

    // Wait for rendering to stabilize
    await page.waitForTimeout(5000);

    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        navigation: {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          domInteractive: navigation.domInteractive - navigation.fetchStart,
          totalLoadTime: navigation.loadEventEnd - navigation.fetchStart
        },
        paint: paint.reduce((acc, entry) => {
          acc[entry.name] = entry.startTime;
          return acc;
        }, {} as Record<string, number>),
        memory: (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
        } : null,
        resourceCount: performance.getEntriesByType('resource').length
      };
    });

    // Take screenshot of final performance state
    await helper.takeScreenshot('06-performance-metrics');

    // Verify reasonable performance
    expect(performanceMetrics.navigation.totalLoadTime).toBeLessThan(30000); // 30 seconds max
    expect(performanceMetrics.navigation.domContentLoaded).toBeLessThan(10000); // 10 seconds max

    // Attach performance metrics
    test.info().attachments.push({
      name: 'Performance Metrics',
      contentType: 'application/json',
      body: Buffer.from(JSON.stringify(performanceMetrics, null, 2))
    });
  });

  test('should verify dragon renderer types and fallback hierarchy', async ({ page }) => {
    await page.goto('/dragons/webgl-3d');
    
    // Wait for renderer decisions
    await page.waitForTimeout(3000);

    const rendererAnalysis = await page.evaluate(() => {
      // Check for different dragon renderer types
      const rendererInfo = {
        unified: {
          present: !!document.querySelector('[data-component="DragonRenderer"]'),
          count: document.querySelectorAll('[data-component="DragonRenderer"]').length
        },
        webgl3d: {
          present: !!document.querySelector('[data-dragon-type="3d"]'),
          count: document.querySelectorAll('[data-dragon-type="3d"]').length
        },
        sprite2d: {
          present: !!document.querySelector('[data-dragon-type="2d"]'),
          count: document.querySelectorAll('[data-dragon-type="2d"]').length
        },
        ascii: {
          present: !!document.querySelector('[data-dragon-type="ascii"]'),
          count: document.querySelectorAll('[data-dragon-type="ascii"]').length
        },
        fallback: {
          present: !!document.querySelector('[data-component="DragonFallbackRenderer"]'),
          count: document.querySelectorAll('[data-component="DragonFallbackRenderer"]').length
        }
      };

      // Check for specific dragon components mentioned in the project
      const specificComponents = {
        dragonRenderer: document.querySelectorAll('[class*="DragonRenderer"]').length,
        seironGLBDragon: document.querySelectorAll('[class*="SeironGLBDragon"]').length,
        dragonHead3D: document.querySelectorAll('[class*="DragonHead3D"]').length,
        enhancedDragonRenderer: document.querySelectorAll('[class*="EnhancedDragonRenderer"]').length
      };

      // Check fallback system status
      const fallbackSystem = {
        webglFallbackManager: typeof (window as any).webglFallbackManager !== 'undefined',
        modelCacheService: typeof (window as any).ModelCacheService !== 'undefined',
        errorBoundariesActive: document.querySelectorAll('[data-error-boundary]').length,
        currentRenderingMode: (window as any).webglFallbackManager?.getCurrentMode?.() || 'unknown'
      };

      return {
        rendererInfo,
        specificComponents,
        fallbackSystem,
        totalDragonElements: document.querySelectorAll('[data-testid*="dragon"], [class*="dragon"], [id*="dragon"]').length
      };
    });

    // Take screenshot of renderer analysis
    await helper.takeScreenshot('07-renderer-analysis');

    // Verify at least one dragon renderer is active
    const hasActiveRenderer = Object.values(rendererAnalysis.rendererInfo).some(r => r.present) ||
                             Object.values(rendererAnalysis.specificComponents).some(count => count > 0);
    
    expect(hasActiveRenderer).toBe(true);

    // Attach renderer analysis
    test.info().attachments.push({
      name: 'Dragon Renderer Analysis',
      contentType: 'application/json',
      body: Buffer.from(JSON.stringify(rendererAnalysis, null, 2))
    });
  });

  test('should test model cache service functionality', async ({ page }) => {
    await page.goto('/dragons/webgl-3d');
    
    // Wait for services to initialize
    await page.waitForTimeout(3000);

    const cacheServiceInfo = await page.evaluate(() => {
      // Check if ModelCacheService is available
      if (typeof (window as any).ModelCacheService === 'undefined') {
        return { available: false };
      }

      const service = (window as any).ModelCacheService.getInstance();
      
      return {
        available: true,
        stats: service.getCacheStats ? service.getCacheStats() : null,
        methods: Object.getOwnPropertyNames(service).filter(name => typeof service[name] === 'function'),
        cacheSize: service.getCacheSize ? service.getCacheSize() : null,
        hasPreloadMethod: typeof service.preloadModel === 'function',
        hasValidationMethod: typeof service.validateModel === 'function'
      };
    });

    // Take screenshot of cache service state
    await helper.takeScreenshot('08-cache-service-analysis');

    if (cacheServiceInfo.available) {
      // Test cache functionality if available
      console.log('ModelCacheService is available with methods:', cacheServiceInfo.methods);
      
      // Verify essential cache methods exist
      expect(cacheServiceInfo.methods).toContain('getCacheStats');
    } else {
      console.log('ModelCacheService not available - this may be expected in some configurations');
    }

    // Attach cache service info
    test.info().attachments.push({
      name: 'Model Cache Service Analysis',
      contentType: 'application/json',
      body: Buffer.from(JSON.stringify(cacheServiceInfo, null, 2))
    });
  });
});

test.describe('Network Request Monitoring', () => {
  test('should track all model-related network requests', async ({ page }) => {
    const modelRequests: Array<{
      url: string;
      method: string;
      status: number;
      size: number;
      timing: number;
      headers: Record<string, string>;
    }> = [];

    // Intercept all requests
    page.on('response', async (response) => {
      const request = response.request();
      const url = request.url();
      
      // Check if this is a model-related request
      const isModelRequest = /\.(glb|gltf|obj|fbx|dae|bin)(\?|$)/i.test(url) ||
                           url.includes('model') ||
                           url.includes('dragon') ||
                           url.includes('texture');
      
      if (isModelRequest) {
        try {
          const body = await response.body();
          modelRequests.push({
            url,
            method: request.method(),
            status: response.status(),
            size: body.length,
            timing: Date.now(),
            headers: response.headers()
          });
        } catch (error) {
          // Some requests might not have bodies
          modelRequests.push({
            url,
            method: request.method(),
            status: response.status(),
            size: 0,
            timing: Date.now(),
            headers: response.headers()
          });
        }
      }
    });

    await page.goto('/dragons/webgl-3d');
    
    // Wait for all model requests to complete
    await page.waitForTimeout(10000);

    console.log(`Captured ${modelRequests.length} model-related requests`);

    // Verify we captured some model requests (may be 0 in fallback mode)
    if (modelRequests.length > 0) {
      // Check that model files were requested with appropriate headers
      const glbRequests = modelRequests.filter(r => r.url.includes('.glb'));
      const gltfRequests = modelRequests.filter(r => r.url.includes('.gltf'));
      
      console.log(`GLB requests: ${glbRequests.length}, GLTF requests: ${gltfRequests.length}`);
      
      // Verify successful requests
      const successfulRequests = modelRequests.filter(r => r.status >= 200 && r.status < 300);
      expect(successfulRequests.length).toBeGreaterThan(0);
    }

    // Attach network request report
    test.info().attachments.push({
      name: 'Model Network Requests',
      contentType: 'application/json',
      body: Buffer.from(JSON.stringify(modelRequests, null, 2))
    });
  });
});