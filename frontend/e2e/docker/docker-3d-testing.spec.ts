/**
 * Docker-Specific 3D Model Loading Tests
 * 
 * This test suite is specifically designed for Docker container environments,
 * where WebGL may not be available and fallback systems should activate.
 * It validates that the application gracefully handles headless environments.
 */

import { test, expect, devices } from '@playwright/test';
import { DragonTestHelper } from '../utils/DragonTestHelper';

// Docker-specific configuration
test.use({
  // Use headless Chrome with limited capabilities to simulate Docker
  ...devices['Desktop Chrome'],
  launchOptions: {
    args: [
      '--headless=new',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-images',
      '--disable-javascript-harmony-shipping',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--use-gl=swiftshader', // Software rendering
      '--enable-unsafe-webgl'
    ]
  }
});

test.describe('Docker Environment 3D Model Testing', () => {
  let helper: DragonTestHelper;

  test.beforeEach(async ({ page, context }) => {
    helper = new DragonTestHelper(page, context);
    
    await helper.setupMonitoring({
      trackNetworkRequests: true,
      trackConsoleMessages: true,
      trackJSErrors: true,
      trackPerformance: true,
      takeScreenshots: true
    });

    // Set environment indicators for Docker testing
    await page.addInitScript(() => {
      // Mark this as a Docker test environment
      (window as any).DOCKER_TEST_MODE = true;
      (window as any).HEADLESS_MODE = true;
      
      // Mock navigator.userAgent to indicate headless
      Object.defineProperty(navigator, 'userAgent', {
        value: navigator.userAgent + ' HeadlessChrome/DockerTest',
        writable: false
      });
    });
  });

  test.afterEach(async () => {
    await helper.cleanup();
  });

  test('should detect Docker/headless environment correctly', async ({ page }) => {
    await page.goto('/dragons/webgl-3d');
    
    // Wait for environment detection
    await page.waitForTimeout(2000);

    const environmentDetection = await page.evaluate(() => {
      return {
        isHeadless: /HeadlessChrome/.test(navigator.userAgent),
        dockerTestMode: (window as any).DOCKER_TEST_MODE,
        webglSupported: (() => {
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
          return !!gl;
        })(),
        canvas2dSupported: (() => {
          const canvas = document.createElement('canvas');
          return !!canvas.getContext('2d');
        })(),
        fallbackManagerDetected: typeof (window as any).webglFallbackManager !== 'undefined',
        environmentInfo: (window as any).webglFallbackManager?.getEnvironment?.() || null
      };
    });

    await helper.takeScreenshot('docker-environment-detection');

    // Verify Docker environment is properly detected
    expect(environmentDetection.isHeadless).toBe(true);
    expect(environmentDetection.dockerTestMode).toBe(true);
    expect(environmentDetection.canvas2dSupported).toBe(true);

    // In Docker, WebGL might not be supported, but fallback should be available
    if (!environmentDetection.webglSupported) {
      expect(environmentDetection.fallbackManagerDetected).toBe(true);
    }

    console.log('Docker Environment Detection:', environmentDetection);
  });

  test('should activate appropriate fallback rendering in Docker', async ({ page }) => {
    await page.goto('/dragons/webgl-3d');
    
    // Wait for fallback systems to initialize
    const finalState = await helper.waitForRenderingStabilization(20000);
    
    await helper.takeScreenshot('docker-fallback-rendering');

    // In Docker environment, we expect fallback rendering
    const hasAnyRendering = finalState.canvasElements > 0 || 
                           finalState.asciiElements > 0 || 
                           finalState.fallbackElements > 0;
    
    expect(hasAnyRendering).toBe(true);

    // Should have minimal loading elements (not stuck)
    expect(finalState.loadingElements).toBeLessThanOrEqual(1);

    // Should have fallback manager active
    expect(finalState.fallbackManagerActive).toBe(true);

    // Verify ASCII fallback is working for headless environments
    if (!finalState.webglSupported) {
      expect(finalState.asciiElements).toBeGreaterThan(0);
    }

    console.log('Docker Fallback State:', finalState);
  });

  test('should handle model file requests gracefully in Docker', async ({ page }) => {
    const modelRequests: Array<{ url: string; status: number; error?: string }> = [];
    
    // Track model requests
    page.on('response', async (response) => {
      const url = response.url();
      const isModelFile = /\.(glb|gltf|obj|fbx|dae)(\?|$)/i.test(url) || 
                         url.includes('model') || 
                         url.includes('dragon');
      
      if (isModelFile) {
        modelRequests.push({
          url,
          status: response.status()
        });
      }
    });

    page.on('requestfailed', (request) => {
      const url = request.url();
      const isModelFile = /\.(glb|gltf|obj|fbx|dae)(\?|$)/i.test(url) || 
                         url.includes('model') || 
                         url.includes('dragon');
      
      if (isModelFile) {
        modelRequests.push({
          url,
          status: 0,
          error: request.failure()?.errorText
        });
      }
    });

    await page.goto('/dragons/webgl-3d');
    
    // Wait for model loading attempts
    await page.waitForTimeout(8000);

    await helper.takeScreenshot('docker-model-requests');

    console.log(`Model requests in Docker: ${modelRequests.length}`);
    console.log('Model requests:', modelRequests);

    // In Docker with fallback mode, there might be no model requests (which is fine)
    // But if there are model requests, they shouldn't all fail
    if (modelRequests.length > 0) {
      const failedRequests = modelRequests.filter(r => r.status === 0 || r.status >= 400);
      const successRate = (modelRequests.length - failedRequests.length) / modelRequests.length;
      
      // At least 50% of model requests should succeed if any are made
      expect(successRate).toBeGreaterThanOrEqual(0.5);
    }
  });

  test('should demonstrate ASCII dragon fallback in Docker', async ({ page }) => {
    await page.goto('/dragons/webgl-3d');
    
    // Wait for ASCII fallback to load
    await page.waitForTimeout(5000);

    const asciiDragonInfo = await page.evaluate(() => {
      const asciiElements = document.querySelectorAll('[data-dragon-type="ascii"], pre, [class*="ascii"]');
      const dragonContent = Array.from(asciiElements).map(el => ({
        tagName: el.tagName,
        className: el.className,
        content: el.textContent?.substring(0, 100) || '', // First 100 chars
        visible: el.offsetWidth > 0 && el.offsetHeight > 0,
        styles: window.getComputedStyle(el).display
      }));

      return {
        asciiElementCount: asciiElements.length,
        dragonContent,
        hasVisibleAscii: dragonContent.some(d => d.visible),
        totalTextContent: Array.from(asciiElements).reduce((total, el) => total + (el.textContent?.length || 0), 0)
      };
    });

    await helper.takeScreenshot('docker-ascii-dragon');

    // Verify ASCII dragon is present and visible
    expect(asciiDragonInfo.asciiElementCount).toBeGreaterThan(0);
    expect(asciiDragonInfo.hasVisibleAscii).toBe(true);
    expect(asciiDragonInfo.totalTextContent).toBeGreaterThan(10); // Should have actual content

    console.log('ASCII Dragon Info:', asciiDragonInfo);

    // Test ASCII dragon interactivity (if any)
    const firstAsciiElement = page.locator('[data-dragon-type="ascii"], pre, [class*="ascii"]').first();
    if (await firstAsciiElement.count() > 0) {
      // Try hovering or clicking ASCII dragon
      await firstAsciiElement.hover();
      await page.waitForTimeout(1000);
      
      await helper.takeScreenshot('docker-ascii-dragon-interaction');
    }
  });

  test('should validate Canvas2D fallback rendering in Docker', async ({ page }) => {
    await page.goto('/dragons/webgl-3d');
    
    // Wait for Canvas2D fallback
    await page.waitForTimeout(5000);

    const canvas2DInfo = await page.evaluate(() => {
      const canvases = Array.from(document.querySelectorAll('canvas'));
      const canvas2DElements = canvases.filter(canvas => {
        const ctx = canvas.getContext('2d');
        return ctx !== null;
      });

      return {
        totalCanvases: canvases.length,
        canvas2DCanvases: canvas2DElements.length,
        canvasDetails: canvas2DElements.map(canvas => ({
          width: canvas.width,
          height: canvas.height,
          visible: canvas.offsetWidth > 0 && canvas.offsetHeight > 0,
          hasImageData: (() => {
            try {
              const ctx = canvas.getContext('2d');
              if (!ctx) return false;
              const imageData = ctx.getImageData(0, 0, Math.min(canvas.width, 1), Math.min(canvas.height, 1));
              return imageData.data.length > 0;
            } catch (e) {
              return false;
            }
          })()
        }))
      };
    });

    await helper.takeScreenshot('docker-canvas2d-fallback');

    console.log('Canvas2D Info:', canvas2DInfo);

    // Should have at least one canvas if Canvas2D fallback is active
    if (canvas2DInfo.canvas2DCanvases > 0) {
      expect(canvas2DInfo.canvasDetails.some(c => c.visible)).toBe(true);
      expect(canvas2DInfo.canvasDetails.some(c => c.width > 0 && c.height > 0)).toBe(true);
    }
  });

  test('should monitor performance in Docker environment', async ({ page }) => {
    await page.goto('/dragons/webgl-3d');
    
    // Take initial performance snapshot
    await helper.takePerformanceSnapshot();
    
    // Wait for rendering to stabilize
    await page.waitForTimeout(3000);
    await helper.takePerformanceSnapshot();
    
    // Interact with any available controls
    const interactableElements = await page.locator('button, [role="button"], [data-testid]').all();
    for (let i = 0; i < Math.min(interactableElements.length, 3); i++) {
      try {
        await interactableElements[i].click();
        await page.waitForTimeout(1000);
        await helper.takePerformanceSnapshot();
      } catch (e) {
        // Continue if interaction fails
      }
    }

    // Final performance snapshot
    await helper.takePerformanceSnapshot();
    
    const performanceAnalysis = helper.getPerformanceAnalysis();
    
    await helper.takeScreenshot('docker-performance-final');

    // Verify reasonable performance in Docker
    if (performanceAnalysis) {
      expect(performanceAnalysis.duration).toBeLessThan(30000); // 30 seconds max
      
      // Memory usage should be reasonable (less than 100MB growth)
      if (performanceAnalysis.memoryGrowth !== null) {
        expect(performanceAnalysis.memoryGrowth).toBeLessThan(100 * 1024 * 1024);
      }
    }

    console.log('Docker Performance Analysis:', performanceAnalysis);
  });

  test('should validate fallback system error handling in Docker', async ({ page }) => {
    // Inject errors to test error handling
    await page.addInitScript(() => {
      // Simulate WebGL failure
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(contextType: string, ...args: any[]) {
        if (contextType === 'webgl' || contextType === 'experimental-webgl' || contextType === 'webgl2') {
          throw new Error('Simulated WebGL failure for Docker testing');
        }
        return originalGetContext.call(this, contextType, ...args);
      };
    });

    await page.goto('/dragons/webgl-3d');
    
    // Wait for error handling and fallback
    await page.waitForTimeout(5000);

    const errorHandlingInfo = await page.evaluate(() => {
      return {
        errorBoundaries: document.querySelectorAll('[data-error-boundary]').length,
        errorMessages: document.querySelectorAll('[data-error], [class*="error"]').length,
        fallbackActive: document.querySelectorAll('[data-fallback], [class*="fallback"]').length > 0,
        asciiActive: document.querySelectorAll('[data-dragon-type="ascii"]').length > 0,
        mockCanvasActive: document.querySelectorAll('[data-mock-canvas]').length > 0,
        hasRecoveryUI: document.querySelectorAll('[data-recovery], [class*="recovery"]').length > 0
      };
    });

    await helper.takeScreenshot('docker-error-handling');

    // Verify graceful error handling
    expect(errorHandlingInfo.fallbackActive || errorHandlingInfo.asciiActive || errorHandlingInfo.mockCanvasActive).toBe(true);
    
    // Should not have unhandled error states
    expect(errorHandlingInfo.errorMessages).toBeLessThanOrEqual(1);

    console.log('Docker Error Handling Info:', errorHandlingInfo);
  });

  test('should complete full Docker compatibility test', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/dragons/webgl-3d');
    
    // Comprehensive Docker environment test
    const dockerCompatibility = await page.evaluate(() => {
      const environmentChecks = {
        headlessDetected: /HeadlessChrome/.test(navigator.userAgent),
        webglAvailable: (() => {
          try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return !!gl;
          } catch (e) {
            return false;
          }
        })(),
        canvas2dAvailable: (() => {
          try {
            const canvas = document.createElement('canvas');
            return !!canvas.getContext('2d');
          } catch (e) {
            return false;
          }
        })(),
        fallbackSystemActive: typeof (window as any).webglFallbackManager !== 'undefined',
        modelCacheServiceActive: typeof (window as any).ModelCacheService !== 'undefined'
      };

      const renderingChecks = {
        hasAnyCanvas: document.querySelectorAll('canvas').length > 0,
        hasAsciiDragon: document.querySelectorAll('[data-dragon-type="ascii"], pre, [class*="ascii"]').length > 0,
        hasFallbackRenderer: document.querySelectorAll('[data-fallback], [class*="fallback"]').length > 0,
        hasErrorStates: document.querySelectorAll('[data-error], [class*="error"]').length,
        hasLoadingStates: document.querySelectorAll('[data-loading], [class*="loading"]').length,
        hasDragonElements: document.querySelectorAll('[data-testid*="dragon"], [class*="dragon"]').length > 0
      };

      const performanceChecks = {
        memoryUsage: (performance as any).memory ? {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          limit: (performance as any).memory.jsHeapSizeLimit
        } : null,
        resourceCount: performance.getEntriesByType('resource').length,
        navigationTiming: (() => {
          const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          return nav ? {
            domContentLoaded: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
            loadComplete: nav.loadEventEnd - nav.loadEventStart
          } : null;
        })()
      };

      return {
        environmentChecks,
        renderingChecks,
        performanceChecks,
        overallHealth: {
          hasWorkingRendering: renderingChecks.hasAnyCanvas || renderingChecks.hasAsciiDragon || renderingChecks.hasFallbackRenderer,
          hasMinimalErrors: renderingChecks.hasErrorStates <= 1,
          hasStableLoading: renderingChecks.hasLoadingStates === 0,
          hasDragonPresence: renderingChecks.hasDragonElements
        }
      };
    });

    const testDuration = Date.now() - startTime;

    await helper.takeScreenshot('docker-compatibility-final');

    // Verify Docker compatibility requirements
    expect(dockerCompatibility.environmentChecks.headlessDetected).toBe(true);
    expect(dockerCompatibility.environmentChecks.canvas2dAvailable).toBe(true);
    expect(dockerCompatibility.overallHealth.hasWorkingRendering).toBe(true);
    expect(dockerCompatibility.overallHealth.hasMinimalErrors).toBe(true);
    expect(dockerCompatibility.overallHealth.hasStableLoading).toBe(true);

    // Performance should be reasonable
    expect(testDuration).toBeLessThan(30000); // 30 seconds max

    console.log('Docker Compatibility Results:', dockerCompatibility);

    // Generate final report
    const report = await helper.generateTestReport({
      networkRequests: [],
      consoleMessages: [],
      jsErrors: [],
      testName: 'Docker Compatibility Test'
    });

    // Attach Docker compatibility report
    test.info().attachments.push({
      name: 'Docker Compatibility Report',
      contentType: 'application/json',
      body: Buffer.from(JSON.stringify({
        dockerCompatibility,
        testDuration,
        healthScore: report.healthScore
      }, null, 2))
    });
  });
});