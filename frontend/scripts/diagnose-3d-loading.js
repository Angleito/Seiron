#!/usr/bin/env node

/**
 * Comprehensive Puppeteer script for diagnosing 3D model loading issues
 * 
 * This script analyzes the Dragon 3D WebGL component loading in Docker containers
 * and provides detailed diagnostic information about failures, performance, and fallbacks.
 * 
 * Usage:
 *   node scripts/diagnose-3d-loading.js [options]
 *   
 * Options:
 *   --url <url>         Target URL (default: http://localhost:3000)
 *   --timeout <ms>      Max timeout for operations (default: 30000)
 *   --screenshots       Take screenshots during diagnosis
 *   --headless          Run in headless mode (default: true)
 *   --verbose           Verbose logging
 *   --output <dir>      Output directory for reports (default: ./diagnosis-reports)
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class Dragon3DDiagnostics {
  constructor(options = {}) {
    this.baseUrl = options.url || 'http://localhost:3000';
    this.timeout = options.timeout || 30000;
    this.enableScreenshots = options.screenshots || false;
    this.headless = options.headless !== false;
    this.verbose = options.verbose || false;
    this.outputDir = options.output || './diagnosis-reports';
    
    this.results = {
      timestamp: new Date().toISOString(),
      testUrl: `${this.baseUrl}/dragons/webgl-3d`,
      environment: {
        userAgent: '',
        viewport: { width: 1920, height: 1080 },
        platform: process.platform,
        nodeVersion: process.version
      },
      diagnostics: {
        pageLoad: {},
        webglContext: {},
        threeJsInit: {},
        modelLoading: {},
        networkRequests: {},
        jsErrors: [],
        consoleMessages: [],
        performanceMetrics: {},
        fallbackBehavior: {},
        accessibility: {},
        modelCacheService: {},
        webglFallbackManager: {}
      },
      recommendations: [],
      screenshots: []
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (level === 'error' || this.verbose) {
      console.log(`${prefix} ${message}`);
    }
    
    // Store in results for report
    if (!this.results.diagnostics.logs) {
      this.results.diagnostics.logs = [];
    }
    this.results.diagnostics.logs.push({ timestamp, level, message });
  }

  async setupOutputDirectory() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      this.log(`Output directory created: ${this.outputDir}`);
    } catch (error) {
      this.log(`Failed to create output directory: ${error.message}`, 'error');
      throw error;
    }
  }

  async launchBrowser() {
    this.log('Launching Puppeteer browser...');
    
    const browserArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-gpu-sandbox',
      '--enable-webgl',
      '--enable-accelerated-2d-canvas',
      '--enable-unsafe-webgl',
      '--ignore-gpu-blacklist',
      '--use-gl=swiftshader'  // Software WebGL fallback
    ];

    this.browser = await puppeteer.launch({
      headless: this.headless,
      args: browserArgs,
      ignoreDefaultArgs: ['--disable-extensions'],
      defaultViewport: this.results.environment.viewport
    });

    this.page = await this.browser.newPage();
    
    // Set user agent
    const userAgent = await this.browser.userAgent();
    this.results.environment.userAgent = userAgent;
    this.log(`Browser launched with user agent: ${userAgent}`);
  }

  async setupPageMonitoring() {
    this.log('Setting up page monitoring...');

    // Monitor console messages
    this.page.on('console', (msg) => {
      const consoleEntry = {
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString(),
        location: msg.location()
      };
      
      this.results.diagnostics.consoleMessages.push(consoleEntry);
      
      if (msg.type() === 'error' || msg.type() === 'warning') {
        this.log(`Console ${msg.type()}: ${msg.text()}`, msg.type());
      }
    });

    // Monitor JavaScript errors
    this.page.on('pageerror', (error) => {
      const errorEntry = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
      
      this.results.diagnostics.jsErrors.push(errorEntry);
      this.log(`JavaScript Error: ${error.message}`, 'error');
    });

    // Monitor failed requests
    this.page.on('requestfailed', (request) => {
      const failedRequest = {
        url: request.url(),
        method: request.method(),
        failure: request.failure().errorText,
        timestamp: new Date().toISOString()
      };
      
      if (!this.results.diagnostics.networkRequests.failed) {
        this.results.diagnostics.networkRequests.failed = [];
      }
      this.results.diagnostics.networkRequests.failed.push(failedRequest);
      this.log(`Request failed: ${request.url()} - ${request.failure().errorText}`, 'error');
    });

    // Monitor all requests for model files
    this.page.on('response', (response) => {
      const url = response.url();
      const isModelFile = /\.(glb|gltf|obj|fbx|dae)(\?|$)/i.test(url);
      
      if (isModelFile || url.includes('model') || url.includes('dragon')) {
        const responseEntry = {
          url,
          status: response.status(),
          statusText: response.statusText(),
          contentType: response.headers()['content-type'],
          contentLength: response.headers()['content-length'],
          timestamp: new Date().toISOString(),
          isModelFile
        };
        
        if (!this.results.diagnostics.networkRequests.modelFiles) {
          this.results.diagnostics.networkRequests.modelFiles = [];
        }
        this.results.diagnostics.networkRequests.modelFiles.push(responseEntry);
        
        this.log(`Model file response: ${url} - ${response.status()}`, 
                 response.ok() ? 'info' : 'error');
      }
    });
  }

  async navigateToTarget() {
    this.log(`Navigating to target URL: ${this.results.testUrl}`);
    
    const startTime = Date.now();
    
    try {
      const response = await this.page.goto(this.results.testUrl, {
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: this.timeout
      });

      const loadTime = Date.now() - startTime;
      
      this.results.diagnostics.pageLoad = {
        success: true,
        status: response.status(),
        statusText: response.statusText(),
        loadTime,
        finalUrl: response.url()
      };

      this.log(`Page loaded successfully in ${loadTime}ms`);
      
      if (this.enableScreenshots) {
        await this.takeScreenshot('01-page-loaded');
      }

    } catch (error) {
      const loadTime = Date.now() - startTime;
      
      this.results.diagnostics.pageLoad = {
        success: false,
        error: error.message,
        loadTime
      };

      this.log(`Page load failed after ${loadTime}ms: ${error.message}`, 'error');
      throw error;
    }
  }

  async checkWebGLContext() {
    this.log('Checking WebGL context and fallback capabilities...');

    try {
      const webglInfo = await this.page.evaluate(() => {
        // Check WebGL support
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        const gl2 = canvas.getContext('webgl2');
        
        // Also test Canvas2D fallback
        const ctx2d = canvas.getContext('2d');
        
        // Check for mock WebGL context (fallback system)
        const hasMockWebGL = typeof window.MockWebGLContext !== 'undefined';
        const hasWebGLFallbackManager = typeof window.webglFallbackManager !== 'undefined';
        
        if (!gl) {
          return {
            supported: false,
            error: 'WebGL context creation failed',
            canvas2dSupported: !!ctx2d,
            mockWebGLAvailable: hasMockWebGL,
            fallbackManagerAvailable: hasWebGLFallbackManager,
            fallbackCapabilities: hasWebGLFallbackManager ? 
              window.webglFallbackManager.detectCapabilities() : null
          };
        }

        // Get WebGL info
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        const info = {
          supported: true,
          version: gl.getParameter(gl.VERSION),
          vendor: gl.getParameter(gl.VENDOR),
          renderer: gl.getParameter(gl.RENDERER),
          shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
          webgl2Supported: !!gl2,
          maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
          maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
          maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
          extensions: gl.getSupportedExtensions()
        };

        if (debugInfo) {
          info.unmaskedVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
          info.unmaskedRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }

        // Clean up test canvas
        canvas.remove();
        
        return info;
      });

      this.results.diagnostics.webglContext = webglInfo;
      
      if (webglInfo.supported) {
        this.log(`WebGL supported: ${webglInfo.version}`);
        this.log(`Renderer: ${webglInfo.renderer}`);
      } else {
        this.log(`WebGL not supported: ${webglInfo.error}`, 'error');
        
        // Check fallback options
        if (webglInfo.canvas2dSupported) {
          this.log('Canvas2D fallback available');
          this.results.recommendations.push({
            type: 'medium',
            message: 'WebGL not supported, but Canvas2D fallback is available',
            solution: 'Dragon will render using Canvas2D fallback'
          });
        }
        
        if (webglInfo.fallbackManagerAvailable) {
          this.log('WebGL Fallback Manager is available');
          if (webglInfo.fallbackCapabilities) {
            this.log(`Fallback recommended mode: ${webglInfo.fallbackCapabilities.recommendedMode}`);
          }
          
          this.results.recommendations.push({
            type: 'info',
            message: 'WebGL Fallback Manager will handle graceful degradation',
            solution: 'Fallback system will automatically select best available rendering mode'
          });
        } else {
          this.results.recommendations.push({
            type: 'critical',
            message: 'WebGL is not supported and no fallback system detected',
            solution: 'Enable WebGL in browser or ensure fallback system is loaded'
          });
        }
      }

    } catch (error) {
      this.results.diagnostics.webglContext = {
        supported: false,
        error: error.message
      };
      this.log(`WebGL check failed: ${error.message}`, 'error');
    }
  }

  async checkThreeJSInitialization() {
    this.log('Checking Three.js initialization...');

    try {
      // Wait for Three.js to potentially load
      await this.page.waitForFunction('document.readyState === "complete"', { timeout: 5000 });
      await new Promise(resolve => setTimeout(resolve, 2000));

      const threeJsInfo = await this.page.evaluate(() => {
        // Check if Three.js is available
        if (typeof window.THREE === 'undefined') {
          return {
            loaded: false,
            error: 'THREE is not defined on window object'
          };
        }

        return {
          loaded: true,
          version: window.THREE.REVISION,
          webGLRenderer: typeof window.THREE.WebGLRenderer !== 'undefined',
          scene: typeof window.THREE.Scene !== 'undefined',
          camera: typeof window.THREE.PerspectiveCamera !== 'undefined',
          loader: typeof window.THREE.GLTFLoader !== 'undefined'
        };
      });

      this.results.diagnostics.threeJsInit = threeJsInfo;

      if (threeJsInfo.loaded) {
        this.log(`Three.js loaded successfully, revision: ${threeJsInfo.version}`);
      } else {
        this.log(`Three.js not loaded: ${threeJsInfo.error}`, 'error');
        this.results.recommendations.push({
          type: 'critical',
          message: 'Three.js library not loaded properly',
          solution: 'Check bundle includes Three.js and dependencies'
        });
      }

    } catch (error) {
      this.results.diagnostics.threeJsInit = {
        loaded: false,
        error: error.message
      };
      this.log(`Three.js check failed: ${error.message}`, 'error');
    }
  }

  async analyzeComponentRendering() {
    this.log('Analyzing component rendering...');

    try {
      // Wait for React components to potentially render
      await new Promise(resolve => setTimeout(resolve, 3000));

      const componentInfo = await this.page.evaluate(() => {
        // Look for dragon-related elements
        const dragonElements = {
          dragonContainer: !!document.querySelector('[data-testid*="dragon"]'),
          canvasElements: document.querySelectorAll('canvas').length,
          errorBoundaryActive: !!document.querySelector('[data-error-boundary]'),
          loadingIndicators: document.querySelectorAll('[data-loading]').length,
          fallbackComponents: document.querySelectorAll('[data-fallback]').length,
          dragonFallbackRenderer: !!document.querySelector('[class*="DragonFallback"]'),
          asciiDragon: document.querySelectorAll('pre, [class*="ascii"]').length,
          mockCanvas: document.querySelectorAll('[data-mock-canvas]').length,
          webglFallbackManager: !!window.webglFallbackManager
        };

        // Check for specific dragon component classes
        const specificSelectors = [
          '.dragon-renderer',
          '.dragon-3d',
          '.webgl-dragon',
          '[class*="Dragon"]',
          '[id*="dragon"]'
        ];

        dragonElements.specificElements = {};
        specificSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            dragonElements.specificElements[selector] = {
              count: elements.length,
              visible: Array.from(elements).some(el => 
                el.offsetWidth > 0 && el.offsetHeight > 0
              )
            };
          }
        });

        // Check React error boundaries
        const reactErrors = [];
        const errorElements = document.querySelectorAll('[data-react-error]');
        errorElements.forEach(el => {
          reactErrors.push({
            message: el.textContent || el.innerHTML,
            elementTag: el.tagName
          });
        });

        return {
          ...dragonElements,
          reactErrors,
          documentReady: document.readyState,
          bodyVisible: document.body.offsetWidth > 0,
          reactDevtoolsDetected: window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== undefined
        };
      });

      this.results.diagnostics.componentRendering = componentInfo;

      if (componentInfo.canvasElements === 0 && componentInfo.asciiDragon === 0 && componentInfo.mockCanvas === 0) {
        this.log('No canvas, ASCII, or mock elements found', 'error');
        this.results.recommendations.push({
          type: 'critical',
          message: 'No rendering elements detected - all rendering systems failed',
          solution: 'Check if any Dragon components are mounting successfully'
        });
      } else {
        this.log(`Found ${componentInfo.canvasElements} canvas, ${componentInfo.asciiDragon} ASCII, ${componentInfo.mockCanvas} mock elements`);
        
        if (componentInfo.asciiDragon > 0) {
          this.results.recommendations.push({
            type: 'info',
            message: 'ASCII Dragon fallback is working - suitable for headless environments',
            solution: 'This is expected behavior in Docker/headless environments'
          });
        }
      }

      if (componentInfo.errorBoundaryActive) {
        this.log('Error boundary is active', 'error');
        this.results.recommendations.push({
          type: 'high',
          message: 'React error boundary caught an error',
          solution: 'Check error boundary content for specific error details'
        });
      }

      if (this.enableScreenshots) {
        await this.takeScreenshot('02-component-analysis');
      }

    } catch (error) {
      this.results.diagnostics.componentRendering = {
        error: error.message
      };
      this.log(`Component analysis failed: ${error.message}`, 'error');
    }
  }

  async testModelFileAccessibility() {
    this.log('Testing model file accessibility with ModelCacheService...');

    // First test if ModelCacheService is available
    const modelCacheInfo = await this.page.evaluate(() => {
      if (typeof window !== 'undefined' && window.ModelCacheService) {
        const stats = window.ModelCacheService.getInstance().getCacheStats();
        return {
          available: true,
          stats
        };
      }
      return { available: false };
    });
    
    this.results.diagnostics.modelCacheService = modelCacheInfo;
    
    if (modelCacheInfo.available) {
      this.log('ModelCacheService is available');
      this.log(`Cache stats: ${JSON.stringify(modelCacheInfo.stats)}`);
    } else {
      this.log('ModelCacheService not available, testing direct file access');
    }

    const modelFiles = [
      '/models/dragon_head.glb',
      '/models/dragon_head_optimized.glb',
      '/models/dragon_head.obj',
      '/assets/models/dragon_head.glb',
      '/public/models/dragon_head.glb'
    ];

    const accessibilityResults = [];

    for (const modelPath of modelFiles) {
      const fullUrl = `${this.baseUrl}${modelPath}`;
      
      try {
        this.log(`Testing accessibility of: ${fullUrl}`);
        
        const response = await this.page.goto(fullUrl, { 
          waitUntil: 'networkidle0',
          timeout: 10000 
        });

        const result = {
          path: modelPath,
          url: fullUrl,
          accessible: response.ok(),
          status: response.status(),
          statusText: response.statusText(),
          contentType: response.headers()['content-type'],
          contentLength: response.headers()['content-length'],
          loadTime: 0 // Could add timing here
        };

        accessibilityResults.push(result);

        if (response.ok()) {
          this.log(`✓ ${modelPath} accessible (${response.status()})`);
        } else {
          this.log(`✗ ${modelPath} not accessible (${response.status()})`, 'error');
        }

      } catch (error) {
        const result = {
          path: modelPath,
          url: fullUrl,
          accessible: false,
          error: error.message
        };
        
        accessibilityResults.push(result);
        this.log(`✗ ${modelPath} failed: ${error.message}`, 'error');
      }
    }

    this.results.diagnostics.modelLoading.accessibility = accessibilityResults;

    const accessibleModels = accessibilityResults.filter(r => r.accessible);
    if (accessibleModels.length === 0) {
      this.results.recommendations.push({
        type: 'critical',
        message: 'No model files are accessible',
        solution: 'Verify model files exist in public directory and are served correctly'
      });
    }

    // Return to the main page
    await this.page.goto(this.results.testUrl, { waitUntil: 'networkidle0' });
  }

  async testLoadingStatesAndTimeouts() {
    this.log('Testing loading states and timeouts...');

    try {
      // Wait and monitor for loading states
      const loadingStates = await this.page.evaluate(() => {
        return new Promise((resolve) => {
          const states = [];
          let checkCount = 0;
          const maxChecks = 30; // 30 seconds max

          const checkInterval = setInterval(() => {
            checkCount++;
            
            const currentState = {
              timestamp: Date.now(),
              loadingElements: document.querySelectorAll('[data-loading="true"]').length,
              spinnerElements: document.querySelectorAll('[class*="loading"], [class*="spinner"]').length,
              canvasElements: document.querySelectorAll('canvas').length,
              errorElements: document.querySelectorAll('[data-error], [class*="error"]').length,
              dragonElements: document.querySelectorAll('[data-testid*="dragon"], [class*="dragon"]').length,
              fallbackElements: document.querySelectorAll('[data-fallback], [class*="fallback"]').length,
              mockCanvasElements: document.querySelectorAll('[data-mock-canvas]').length,
              asciiElements: document.querySelectorAll('[class*="ascii"], pre').length
            };

            states.push(currentState);

            // Stop after max checks or if we see a stable state
            if (checkCount >= maxChecks || 
                (currentState.canvasElements > 0 && currentState.loadingElements === 0) ||
                (currentState.fallbackElements > 0 && currentState.loadingElements === 0) ||
                (currentState.asciiElements > 0 && currentState.loadingElements === 0)) {
              clearInterval(checkInterval);
              resolve(states);
            }
          }, 1000);
        });
      });

      this.results.diagnostics.modelLoading.loadingStates = loadingStates;

      // Analyze loading progression
      const finalState = loadingStates[loadingStates.length - 1];
      const hasCanvas = finalState.canvasElements > 0;
      const hasErrors = finalState.errorElements > 0;
      const stuckLoading = finalState.loadingElements > 0;
      const hasFallbackElements = finalState.fallbackElements > 0 || 
                                 finalState.asciiElements > 0 || 
                                 finalState.mockCanvasElements > 0;

      if (stuckLoading) {
        this.log('Loading state appears stuck', 'error');
        this.results.recommendations.push({
          type: 'high',
          message: 'Component appears stuck in loading state',
          solution: 'Check for network timeouts or failed async operations'
        });
      }

      if (hasErrors && !hasCanvas && !hasFallbackElements) {
        this.log('Errors detected without successful rendering', 'error');
        this.results.recommendations.push({
          type: 'high',
          message: 'Errors occurred during initialization with no fallback',
          solution: 'Check console errors and component error boundaries'
        });
      } else if (hasFallbackElements && !hasCanvas) {
        this.log('Fallback rendering active', 'info');
        this.results.recommendations.push({
          type: 'info',
          message: 'Primary rendering failed but fallback is working',
          solution: 'This is expected behavior in headless/limited environments'
        });
      }

      if (this.enableScreenshots) {
        await this.takeScreenshot('03-loading-states');
      }

    } catch (error) {
      this.results.diagnostics.modelLoading.loadingStatesError = error.message;
      this.log(`Loading states test failed: ${error.message}`, 'error');
    }
  }

  async testFallbackMechanisms() {
    this.log('Testing fallback mechanisms...');

    try {
      // Test WebGL fallback system specifically
      const fallbackInfo = await this.page.evaluate(() => {
        // Look for fallback indicators
        const fallbackElements = document.querySelectorAll('[data-fallback]');
        const sprite2DElements = document.querySelectorAll('[class*="sprite"], [data-dragon-type="2d"]');
        const asciiElements = document.querySelectorAll('[data-dragon-type="ascii"], [class*="ascii"], pre');
        const mockCanvasElements = document.querySelectorAll('[data-mock-canvas]');
        const canvas2DElements = document.querySelectorAll('canvas').length;
        
        // Check for WebGL fallback manager diagnostics
        const webglFallbackDiagnostics = window.webglFallbackManager ? 
          window.webglFallbackManager.getDiagnostics() : null;
        
        // Check for Dragon fallback renderer
        const dragonFallbackElements = document.querySelectorAll('[class*="DragonFallback"], [data-component="DragonFallbackRenderer"]');
        
        // Look for debug info elements
        const debugElements = document.querySelectorAll('[class*="debug"]');
        const debugText = Array.from(debugElements).map(el => el.textContent).join(' ');
        
        return {
          fallbackElementsFound: fallbackElements.length,
          sprite2DElementsFound: sprite2DElements.length,
          asciiElementsFound: asciiElements.length,
          mockCanvasElementsFound: mockCanvasElements.length,
          canvas2DElementsFound: canvas2DElements,
          dragonFallbackElementsFound: dragonFallbackElements.length,
          webglFallbackActive: !!webglFallbackDiagnostics,
          webglFallbackDiagnostics,
          debugInfo: debugText,
          fallbackTypes: Array.from(fallbackElements).map(el => ({
            type: el.getAttribute('data-fallback'),
            visible: el.offsetWidth > 0 && el.offsetHeight > 0,
            className: el.className
          })),
          currentRenderingMode: debugText.match(/Mode:\s*(\w+)/)?.[1] || 'unknown'
        };
      });

      this.results.diagnostics.fallbackBehavior = fallbackInfo;

      if (fallbackInfo.fallbackElementsFound > 0 || fallbackInfo.asciiElementsFound > 0) {
        this.log(`Found ${fallbackInfo.fallbackElementsFound} fallback elements and ${fallbackInfo.asciiElementsFound} ASCII elements`);
        this.log(`Current rendering mode: ${fallbackInfo.currentRenderingMode}`);
        
        // In headless environments, fallbacks are expected and good
        if (fallbackInfo.currentRenderingMode === 'mock' || fallbackInfo.asciiElementsFound > 0) {
          this.results.recommendations.push({
            type: 'info',
            message: 'Fallback system working correctly - suitable for headless/Docker environments',
            solution: 'This is the expected behavior in headless environments'
          });
        } else {
          this.results.recommendations.push({
            type: 'medium',
            message: 'Fallback components detected - 3D rendering may have failed',
            solution: 'Verify if this is expected behavior or investigate 3D failure'
          });
        }
      }
      
      if (fallbackInfo.webglFallbackActive) {
        this.log('WebGL fallback manager is active');
        if (fallbackInfo.webglFallbackDiagnostics) {
          const capabilities = fallbackInfo.webglFallbackDiagnostics.capabilities;
          const environment = fallbackInfo.webglFallbackDiagnostics.environment;
          this.log(`Fallback capabilities: headless=${environment.isHeadless}, docker=${environment.isDocker}`);
          this.log(`Recommended mode: ${capabilities?.recommendedMode}`);
        }
      }

      // Test Canvas2D renderer specifically
      const canvas2DInfo = await this.page.evaluate(() => {
        const canvases = Array.from(document.querySelectorAll('canvas'));
        const canvas2DCanvases = canvases.filter(canvas => {
          const ctx = canvas.getContext('2d');
          return ctx !== null;
        });
        
        return {
          totalCanvases: canvases.length,
          canvas2DCanvases: canvas2DCanvases.length,
          canvasInfo: canvas2DCanvases.map(canvas => ({
            width: canvas.width,
            height: canvas.height,
            hasImageData: canvas.getContext('2d') !== null
          }))
        };
      });
      
      if (canvas2DInfo.canvas2DCanvases > 0) {
        this.log(`Found ${canvas2DInfo.canvas2DCanvases} Canvas2D fallback renderers`);
        this.results.recommendations.push({
          type: 'info',
          message: 'Canvas2D fallback renderer is active',
          solution: 'This provides 2D dragon rendering when WebGL is unavailable'
        });
      }

      // Test manual fallback triggers if available
      const fallbackTriggers = await this.page.evaluate(() => {
        // Look for fallback test buttons or triggers
        const triggers = document.querySelectorAll('[data-testid*="fallback"], [data-action*="fallback"]');
        return Array.from(triggers).map(el => ({
          id: el.id,
          testId: el.getAttribute('data-testid'),
          action: el.getAttribute('data-action'),
          visible: el.offsetWidth > 0 && el.offsetHeight > 0
        }));
      });

      if (fallbackTriggers.length > 0) {
        this.log(`Found ${fallbackTriggers.length} fallback triggers`);
        // Could test clicking these in a more advanced version
      }
      
      // Store Canvas2D info
      this.results.diagnostics.fallbackBehavior.canvas2DInfo = canvas2DInfo;

      if (this.enableScreenshots) {
        await this.takeScreenshot('04-fallback-analysis');
      }

    } catch (error) {
      this.results.diagnostics.fallbackBehavior.error = error.message;
      this.log(`Fallback test failed: ${error.message}`, 'error');
    }
  }

  async collectPerformanceMetrics() {
    this.log('Collecting performance metrics...');

    try {
      const metrics = await this.page.evaluate(() => {
        // Get performance timing
        const navigation = performance.getEntriesByType('navigation')[0];
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
          }, {}),
          memory: performance.memory ? {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
          } : null,
          resourceCount: performance.getEntriesByType('resource').length
        };
      });

      // Get additional Puppeteer metrics
      const puppeteerMetrics = await this.page.metrics();

      this.results.diagnostics.performanceMetrics = {
        ...metrics,
        puppeteer: puppeteerMetrics
      };

      this.log(`DOM Content Loaded: ${metrics.navigation.domContentLoaded}ms`);
      this.log(`Total Load Time: ${metrics.navigation.totalLoadTime}ms`);

      if (metrics.navigation.totalLoadTime > 10000) {
        this.results.recommendations.push({
          type: 'medium',
          message: 'Page load time is quite slow (>10s)',
          solution: 'Consider optimizing bundle size and model file sizes'
        });
      }

    } catch (error) {
      this.results.diagnostics.performanceMetrics.error = error.message;
      this.log(`Performance metrics collection failed: ${error.message}`, 'error');
    }
  }

  async takeScreenshot(name) {
    if (!this.enableScreenshots) return;

    try {
      const filename = `${name}-${Date.now()}.png`;
      const filepath = path.join(this.outputDir, filename);
      
      await this.page.screenshot({
        path: filepath,
        fullPage: true
      });

      this.results.screenshots.push({
        name,
        filename,
        path: filepath,
        timestamp: new Date().toISOString()
      });

      this.log(`Screenshot saved: ${filename}`);
    } catch (error) {
      this.log(`Screenshot failed: ${error.message}`, 'error');
    }
  }

  async generateReport() {
    this.log('Generating diagnostic report...');

    // Add summary analysis
    this.results.summary = {
      overallHealth: this.calculateOverallHealth(),
      criticalIssues: this.results.recommendations.filter(r => r.type === 'critical').length,
      highPriorityIssues: this.results.recommendations.filter(r => r.type === 'high').length,
      mediumPriorityIssues: this.results.recommendations.filter(r => r.type === 'medium').length,
      infoItems: this.results.recommendations.filter(r => r.type === 'info').length,
      webglSupported: this.results.diagnostics.webglContext.supported,
      threeJsLoaded: this.results.diagnostics.threeJsInit.loaded,
      pageLoadSuccessful: this.results.diagnostics.pageLoad.success,
      modelsAccessible: this.results.diagnostics.modelLoading.accessibility ? 
        this.results.diagnostics.modelLoading.accessibility.filter(m => m.accessible).length : 0,
      fallbackSystemWorking: this.results.diagnostics.fallbackBehavior?.webglFallbackActive || false,
      currentRenderingMode: this.results.diagnostics.fallbackBehavior?.currentRenderingMode || 'unknown',
      asciiRenderingWorking: (this.results.diagnostics.fallbackBehavior?.asciiElementsFound || 0) > 0,
      canvas2DRenderingWorking: (this.results.diagnostics.fallbackBehavior?.canvas2DInfo?.canvas2DCanvases || 0) > 0,
      modelCacheServiceAvailable: this.results.diagnostics.modelCacheService?.available || false,
      hasAnyRendering: this.hasAnySuccessfulRendering()
    };

    // Generate text summary
    this.results.textSummary = this.generateTextSummary();

    const reportPath = path.join(this.outputDir, `dragon-3d-diagnosis-${Date.now()}.json`);
    const textReportPath = path.join(this.outputDir, `dragon-3d-diagnosis-${Date.now()}.txt`);

    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
    await fs.writeFile(textReportPath, this.results.textSummary);

    this.log(`Diagnostic report saved to: ${reportPath}`);
    this.log(`Text summary saved to: ${textReportPath}`);

    return { reportPath, textReportPath };
  }

  calculateOverallHealth() {
    let score = 100;
    
    // In headless environments, adjust scoring to account for fallback systems
    const isHeadlessOrDocker = this.results.diagnostics.fallbackBehavior?.webglFallbackDiagnostics?.environment?.isHeadless ||
                              this.results.diagnostics.fallbackBehavior?.webglFallbackDiagnostics?.environment?.isDocker;

    if (isHeadlessOrDocker) {
      // In headless/Docker, successful fallback is good
      if (this.results.diagnostics.fallbackBehavior?.asciiElementsFound > 0 ||
          this.results.diagnostics.fallbackBehavior?.mockCanvasElementsFound > 0) {
        this.log('Fallback system working in headless environment - this is expected');
        score += 20; // Bonus for successful fallback
      }
      
      // Don't penalize for lack of WebGL in headless
      if (!this.results.diagnostics.webglContext.supported) {
        this.log('WebGL not supported in headless - using fallback (expected)');
      } else {
        score -= 20; // Less penalty in headless
      }
    } else {
      // Standard browser environment scoring
      if (!this.results.diagnostics.webglContext.supported) score -= 40;
    }

    if (!this.results.diagnostics.threeJsInit.loaded) score -= 20; // Reduced penalty
    if (!this.results.diagnostics.pageLoad.success) score -= 30;

    // High priority issues
    const criticalErrors = this.results.diagnostics.jsErrors.filter(e => 
      e.message.toLowerCase().includes('three') || 
      e.message.toLowerCase().includes('webgl') ||
      e.message.toLowerCase().includes('canvas')
    );
    score -= criticalErrors.length * 5; // Reduced penalty

    // Medium priority issues
    if (this.results.diagnostics.performanceMetrics.navigation?.totalLoadTime > 10000) {
      score -= 10;
    }
    
    // Bonus for successful fallback system
    if (this.results.diagnostics.fallbackBehavior?.webglFallbackActive) {
      score += 10;
    }
    
    // Bonus for ModelCacheService working
    if (this.results.diagnostics.modelCacheService?.available) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }
  
  hasAnySuccessfulRendering() {
    const fallback = this.results.diagnostics.fallbackBehavior;
    const component = this.results.diagnostics.componentRendering;
    
    return (component?.canvasElements > 0) ||
           (fallback?.asciiElementsFound > 0) ||
           (fallback?.canvas2DInfo?.canvas2DCanvases > 0) ||
           (fallback?.mockCanvasElementsFound > 0);
  }

  generateTextSummary() {
    const summary = [];
    summary.push('='.repeat(60));
    summary.push('SEIRON DRAGON 3D DIAGNOSTIC REPORT');
    summary.push('='.repeat(60));
    summary.push('');
    summary.push(`Timestamp: ${this.results.timestamp}`);
    summary.push(`Test URL: ${this.results.testUrl}`);
    summary.push(`Overall Health Score: ${this.results.summary.overallHealth}/100`);
    summary.push('');

    // Critical Status
    summary.push('CRITICAL SYSTEMS STATUS:');
    summary.push('-'.repeat(30));
    summary.push(`✓ Page Load: ${this.results.summary.pageLoadSuccessful ? 'SUCCESS' : 'FAILED'}`);
    summary.push(`✓ WebGL Support: ${this.results.summary.webglSupported ? 'SUPPORTED' : 'NOT SUPPORTED'}`);
    summary.push(`✓ Three.js: ${this.results.summary.threeJsLoaded ? 'LOADED' : 'FAILED TO LOAD'}`);
    summary.push(`✓ Model Files: ${this.results.summary.modelsAccessible} accessible`);
    
    // Fallback System Status
    if (this.results.diagnostics.fallbackBehavior) {
      const fallback = this.results.diagnostics.fallbackBehavior;
      summary.push(`✓ Fallback System: ${fallback.webglFallbackActive ? 'ACTIVE' : 'INACTIVE'}`);
      summary.push(`✓ Rendering Mode: ${fallback.currentRenderingMode || 'UNKNOWN'}`);
      summary.push(`✓ ASCII Fallback: ${fallback.asciiElementsFound > 0 ? 'WORKING' : 'NOT FOUND'}`);
      summary.push(`✓ Canvas2D Fallback: ${fallback.canvas2DElementsFound > 0 ? 'WORKING' : 'NOT FOUND'}`);
      
      if (fallback.webglFallbackDiagnostics?.environment) {
        const env = fallback.webglFallbackDiagnostics.environment;
        summary.push(`✓ Environment: ${env.isHeadless ? 'HEADLESS' : 'BROWSER'} ${env.isDocker ? '(DOCKER)' : ''}`);
      }
    }
    
    if (this.results.diagnostics.modelCacheService) {
      summary.push(`✓ ModelCacheService: ${this.results.diagnostics.modelCacheService.available ? 'AVAILABLE' : 'UNAVAILABLE'}`);
    }
    
    summary.push(`✓ Any Rendering Working: ${this.results.summary.hasAnyRendering ? 'YES' : 'NO'}`);
    summary.push('');

    // Issues Summary
    if (this.results.recommendations.length > 0) {
      summary.push('ISSUES AND INFORMATION:');
      summary.push('-'.repeat(30));
      summary.push(`Critical Issues: ${this.results.summary.criticalIssues}`);
      summary.push(`High Priority: ${this.results.summary.highPriorityIssues}`);
      summary.push(`Medium Priority: ${this.results.summary.mediumPriorityIssues}`);
      summary.push(`Info Items: ${this.results.summary.infoItems}`);
      summary.push('');

      summary.push('DETAILED RECOMMENDATIONS:');
      summary.push('-'.repeat(30));
      
      // Group recommendations by type
      const criticalRecs = this.results.recommendations.filter(r => r.type === 'critical');
      const highRecs = this.results.recommendations.filter(r => r.type === 'high');
      const mediumRecs = this.results.recommendations.filter(r => r.type === 'medium');
      const infoRecs = this.results.recommendations.filter(r => r.type === 'info');
      
      [criticalRecs, highRecs, mediumRecs, infoRecs].forEach((recs, groupIndex) => {
        if (recs.length > 0) {
          const labels = ['CRITICAL', 'HIGH PRIORITY', 'MEDIUM PRIORITY', 'INFORMATION'];
          summary.push(`${labels[groupIndex]} (${recs.length}):`);
          recs.forEach((rec, index) => {
            summary.push(`  ${index + 1}. ${rec.message}`);
            summary.push(`     Solution: ${rec.solution}`);
            summary.push('');
          });
        }
      });
    }

    // JavaScript Errors
    if (this.results.diagnostics.jsErrors.length > 0) {
      summary.push('JAVASCRIPT ERRORS:');
      summary.push('-'.repeat(30));
      this.results.diagnostics.jsErrors.forEach((error, index) => {
        summary.push(`${index + 1}. ${error.message}`);
        if (error.stack) {
          summary.push(`   Stack: ${error.stack.split('\\n')[0]}`);
        }
        summary.push('');
      });
    }

    // Performance Summary
    if (this.results.diagnostics.performanceMetrics.navigation) {
      const nav = this.results.diagnostics.performanceMetrics.navigation;
      summary.push('PERFORMANCE METRICS:');
      summary.push('-'.repeat(30));
      summary.push(`DOM Content Loaded: ${nav.domContentLoaded}ms`);
      summary.push(`Total Load Time: ${nav.totalLoadTime}ms`);
      summary.push(`DOM Interactive: ${nav.domInteractive}ms`);
      summary.push('');
    }

    return summary.join('\\n');
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.log('Browser closed');
    }
  }

  async run() {
    try {
      await this.setupOutputDirectory();
      await this.launchBrowser();
      await this.setupPageMonitoring();
      await this.navigateToTarget();
      await this.checkWebGLContext();
      await this.checkThreeJSInitialization();
      await this.analyzeComponentRendering();
      await this.testModelFileAccessibility();
      await this.testLoadingStatesAndTimeouts();
      await this.testFallbackMechanisms();
      await this.collectPerformanceMetrics();
      
      if (this.enableScreenshots) {
        await this.takeScreenshot('05-final-state');
      }

      const reportPaths = await this.generateReport();
      
      // Output summary to console
      console.log('\\n' + this.results.textSummary);
      
      return {
        success: true,
        healthScore: this.results.summary.overallHealth,
        reportPaths,
        results: this.results
      };

    } catch (error) {
      this.log(`Diagnostic run failed: ${error.message}`, 'error');
      
      if (this.enableScreenshots) {
        await this.takeScreenshot('error-state');
      }

      return {
        success: false,
        error: error.message,
        results: this.results
      };
    } finally {
      await this.cleanup();
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url':
        options.url = args[++i];
        break;
      case '--timeout':
        options.timeout = parseInt(args[++i]);
        break;
      case '--screenshots':
        options.screenshots = true;
        break;
      case '--headless':
        options.headless = args[++i] !== 'false';
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--output':
        options.output = args[++i];
        break;
      case '--help':
        console.log(`
Dragon 3D Loading Diagnostics

Usage: node scripts/diagnose-3d-loading.js [options]

Options:
  --url <url>         Target URL (default: http://localhost:3000)
  --timeout <ms>      Max timeout for operations (default: 30000)
  --screenshots       Take screenshots during diagnosis
  --headless <bool>   Run in headless mode (default: true)
  --verbose           Verbose logging
  --output <dir>      Output directory for reports (default: ./diagnosis-reports)
  --help              Show this help message

Examples:
  node scripts/diagnose-3d-loading.js --screenshots --verbose
  node scripts/diagnose-3d-loading.js --url http://localhost:4000 --timeout 60000
  node scripts/diagnose-3d-loading.js --headless false --output ./my-reports
        `);
        process.exit(0);
        break;
    }
  }

  console.log('🐉 Starting Dragon 3D Model Loading Diagnostics...');
  console.log(`Target: ${options.url || 'http://localhost:3000'}/dragons/webgl-3d`);
  console.log('');

  const diagnostics = new Dragon3DDiagnostics(options);
  const result = await diagnostics.run();

  if (result.success) {
    console.log(`\\n✅ Diagnostics completed successfully!`);
    console.log(`Health Score: ${result.healthScore}/100`);
    console.log(`Reports saved to: ${result.reportPaths.reportPath}`);
    process.exit(result.healthScore > 50 ? 0 : 1);
  } else {
    console.log(`\\n❌ Diagnostics failed: ${result.error}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { Dragon3DDiagnostics };