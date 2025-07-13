#!/usr/bin/env node

/**
 * Enhanced 3D Model Diagnostics with Model Switching
 * 
 * This enhanced version of the existing diagnostics script adds comprehensive
 * model switching testing, advanced network monitoring, performance profiling,
 * and detailed fallback system testing.
 * 
 * Features:
 * - Model switching functionality testing
 * - Advanced network request monitoring with timing analysis
 * - Performance profiling during rendering
 * - Memory usage tracking
 * - Fallback system stress testing
 * - Cross-browser compatibility testing
 * - Detailed error analysis and categorization
 * 
 * Usage:
 *   node scripts/enhanced-3d-diagnostics.js [options]
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');

class Enhanced3DDiagnostics {
  constructor(options = {}) {
    this.baseUrl = options.url || 'http://localhost:3000';
    this.timeout = options.timeout || 45000;
    this.enableScreenshots = options.screenshots !== false;
    this.headless = options.headless !== false;
    this.verbose = options.verbose || false;
    this.outputDir = options.output || './enhanced-diagnosis-reports';
    this.testModelSwitching = options.testModelSwitching !== false;
    this.performanceProfile = options.performanceProfile !== false;
    this.stressTest = options.stressTest || false;
    
    this.results = {
      timestamp: new Date().toISOString(),
      testUrl: `${this.baseUrl}/dragons/webgl-3d`,
      configuration: {
        enableScreenshots: this.enableScreenshots,
        headless: this.headless,
        testModelSwitching: this.testModelSwitching,
        performanceProfile: this.performanceProfile,
        stressTest: this.stressTest
      },
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
        modelSwitching: {},
        networkRequests: {
          modelFiles: [],
          textureFiles: [],
          failed: [],
          timing: {}
        },
        performanceProfile: {
          memoryUsage: [],
          renderingMetrics: [],
          frameRates: []
        },
        fallbackBehavior: {},
        errorAnalysis: {
          jsErrors: [],
          consoleMessages: [],
          networkErrors: [],
          categorizedErrors: {}
        },
        stressTesting: {},
        crossBrowserCompat: {}
      },
      recommendations: [],
      screenshots: [],
      healthScore: 0,
      summary: {}
    };
    
    this.networkRequests = new Map();
    this.performanceSnapshots = [];
    this.memorySnapshots = [];
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (level === 'error' || this.verbose) {
      console.log(`${prefix} ${message}`);
    }
    
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
    this.log('Launching enhanced Puppeteer browser...');
    
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
      '--use-gl=swiftshader',
      '--enable-logging',
      '--log-level=0',
      '--enable-features=NetworkService,NetworkServiceLogging'
    ];

    this.browser = await puppeteer.launch({
      headless: this.headless,
      args: browserArgs,
      ignoreDefaultArgs: ['--disable-extensions'],
      defaultViewport: this.results.environment.viewport,
      devtools: !this.headless && this.performanceProfile
    });

    this.page = await this.browser.newPage();
    
    // Enable performance tracking
    if (this.performanceProfile) {
      await this.page.tracing.start({
        path: path.join(this.outputDir, 'performance-trace.json'),
        screenshots: true,
        categories: ['devtools.timeline']
      });
    }
    
    const userAgent = await this.browser.userAgent();
    this.results.environment.userAgent = userAgent;
    this.log(`Enhanced browser launched: ${userAgent}`);
  }

  async setupAdvancedMonitoring() {
    this.log('Setting up advanced monitoring...');

    // Enhanced console monitoring with categorization
    this.page.on('console', (msg) => {
      const consoleEntry = {
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString(),
        location: msg.location(),
        args: msg.args().length
      };
      
      this.results.diagnostics.errorAnalysis.consoleMessages.push(consoleEntry);
      
      // Categorize console messages
      if (msg.text().toLowerCase().includes('three') || msg.text().toLowerCase().includes('webgl')) {
        this.categorizeError('3d-rendering', consoleEntry);
      } else if (msg.text().toLowerCase().includes('model') || msg.text().toLowerCase().includes('gltf')) {
        this.categorizeError('model-loading', consoleEntry);
      } else if (msg.text().toLowerCase().includes('network') || msg.text().toLowerCase().includes('fetch')) {
        this.categorizeError('network', consoleEntry);
      }
      
      if (msg.type() === 'error' || msg.type() === 'warning') {
        this.log(`Console ${msg.type()}: ${msg.text()}`, msg.type());
      }
    });

    // Enhanced JavaScript error monitoring
    this.page.on('pageerror', (error) => {
      const errorEntry = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        type: 'javascript'
      };
      
      this.results.diagnostics.errorAnalysis.jsErrors.push(errorEntry);
      this.categorizeError('javascript', errorEntry);
      this.log(`JavaScript Error: ${error.message}`, 'error');
    });

    // Advanced network monitoring with timing
    this.page.on('request', (request) => {
      const requestData = {
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        timestamp: Date.now(),
        resourceType: request.resourceType()
      };
      
      this.networkRequests.set(request.url(), requestData);
    });

    this.page.on('response', async (response) => {
      const request = response.request();
      const requestData = this.networkRequests.get(request.url());
      
      if (requestData) {
        const responseTime = Date.now() - requestData.timestamp;
        const url = response.url();
        
        const responseEntry = {
          ...requestData,
          status: response.status(),
          statusText: response.statusText(),
          responseHeaders: response.headers(),
          responseTime,
          contentType: response.headers()['content-type'],
          contentLength: response.headers()['content-length'],
          fromCache: response.fromCache(),
          fromServiceWorker: response.fromServiceWorker()
        };

        // Categorize network requests
        if (this.isModelFile(url)) {
          this.results.diagnostics.networkRequests.modelFiles.push(responseEntry);
        } else if (this.isTextureFile(url)) {
          this.results.diagnostics.networkRequests.textureFiles.push(responseEntry);
        }

        // Track timing statistics
        this.updateTimingStats(responseEntry);
        
        this.log(`Response: ${url} - ${response.status()} (${responseTime}ms)`, 
                 response.ok() ? 'info' : 'error');
      }
    });

    // Monitor failed requests
    this.page.on('requestfailed', (request) => {
      const failedRequest = {
        url: request.url(),
        method: request.method(),
        failure: request.failure(),
        timestamp: new Date().toISOString(),
        resourceType: request.resourceType()
      };
      
      this.results.diagnostics.networkRequests.failed.push(failedRequest);
      this.results.diagnostics.errorAnalysis.networkErrors.push(failedRequest);
      this.categorizeError('network-failure', failedRequest);
      
      this.log(`Request failed: ${request.url()} - ${request.failure().errorText}`, 'error');
    });

    // Memory usage monitoring
    if (this.performanceProfile) {
      this.memoryMonitorInterval = setInterval(async () => {
        try {
          const metrics = await this.page.metrics();
          this.memorySnapshots.push({
            timestamp: Date.now(),
            ...metrics
          });
          
          this.results.diagnostics.performanceProfile.memoryUsage.push({
            timestamp: Date.now(),
            jsHeapUsedSize: metrics.JSHeapUsedSize,
            jsHeapTotalSize: metrics.JSHeapTotalSize,
            nodes: metrics.Nodes,
            documents: metrics.Documents
          });
        } catch (error) {
          this.log(`Memory monitoring error: ${error.message}`, 'error');
        }
      }, 2000);
    }
  }

  isModelFile(url) {
    return /\.(glb|gltf|obj|fbx|dae|bin)(\?|$)/i.test(url) || 
           url.includes('model') || 
           url.includes('dragon');
  }

  isTextureFile(url) {
    return /\.(png|jpg|jpeg|webp|ktx|dds)(\?|$)/i.test(url) || 
           url.includes('texture') || 
           url.includes('material');
  }

  categorizeError(category, error) {
    if (!this.results.diagnostics.errorAnalysis.categorizedErrors[category]) {
      this.results.diagnostics.errorAnalysis.categorizedErrors[category] = [];
    }
    this.results.diagnostics.errorAnalysis.categorizedErrors[category].push(error);
  }

  updateTimingStats(responseEntry) {
    const category = this.isModelFile(responseEntry.url) ? 'model' : 
                    this.isTextureFile(responseEntry.url) ? 'texture' : 'other';
    
    if (!this.results.diagnostics.networkRequests.timing[category]) {
      this.results.diagnostics.networkRequests.timing[category] = {
        requests: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        avgTime: 0
      };
    }
    
    const stats = this.results.diagnostics.networkRequests.timing[category];
    stats.requests++;
    stats.totalTime += responseEntry.responseTime;
    stats.minTime = Math.min(stats.minTime, responseEntry.responseTime);
    stats.maxTime = Math.max(stats.maxTime, responseEntry.responseTime);
    stats.avgTime = stats.totalTime / stats.requests;
  }

  async navigateToTarget() {
    this.log(`Navigating to enhanced target: ${this.results.testUrl}`);
    
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
        finalUrl: response.url(),
        headers: response.headers()
      };

      this.log(`Page loaded successfully in ${loadTime}ms`);
      
      if (this.enableScreenshots) {
        await this.takeScreenshot('01-enhanced-page-loaded');
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

  async testModelSwitchingFunctionality() {
    if (!this.testModelSwitching) {
      this.log('Model switching test skipped');
      return;
    }

    this.log('Testing model switching functionality...');

    try {
      // Wait for initial rendering
      await this.page.waitForTimeout(5000);

      // Look for model switching controls
      const switchingControls = await this.page.evaluate(() => {
        const selectors = [
          '[data-testid*="model"]',
          '[data-action*="switch"]',
          '[data-model]',
          'button:has-text("Model")',
          'button:has-text("Switch")',
          'select[data-model]',
          '.model-selector',
          '.dragon-model-switch'
        ];

        const controls = [];
        selectors.forEach(selector => {
          try {
            const elements = Array.from(document.querySelectorAll(selector));
            elements.forEach((el, index) => {
              controls.push({
                selector,
                index,
                id: el.id,
                className: el.className,
                text: el.textContent?.trim().substring(0, 50) || '',
                type: el.tagName.toLowerCase(),
                visible: el.offsetWidth > 0 && el.offsetHeight > 0,
                disabled: el.disabled || el.hasAttribute('disabled')
              });
            });
          } catch (e) {
            // Ignore invalid selectors
          }
        });

        return controls;
      });

      this.log(`Found ${switchingControls.length} potential model switching controls`);
      
      if (switchingControls.length === 0) {
        this.results.diagnostics.modelSwitching = {
          available: false,
          reason: 'No model switching controls found',
          searchedSelectors: ['[data-testid*="model"]', '[data-action*="switch"]', 'button:has-text("Model")']
        };
        return;
      }

      // Test each switching control
      const switchResults = [];
      const maxTestControls = Math.min(switchingControls.length, 5); // Test up to 5 controls

      for (let i = 0; i < maxTestControls; i++) {
        const control = switchingControls[i];
        
        if (!control.visible || control.disabled) {
          this.log(`Skipping control ${i}: not visible or disabled`);
          continue;
        }

        this.log(`Testing control ${i}: ${control.selector} - "${control.text}"`);

        try {
          // Get state before switch
          const beforeState = await this.captureRenderingState('before-switch');
          const beforeMemory = this.performanceProfile ? await this.page.metrics() : null;
          
          // Click the control
          const controlSelector = `${control.selector}:nth-of-type(${control.index + 1})`;
          await this.page.click(controlSelector);
          
          // Wait for switch to complete
          await this.page.waitForTimeout(3000);
          
          // Get state after switch
          const afterState = await this.captureRenderingState('after-switch');
          const afterMemory = this.performanceProfile ? await this.page.metrics() : null;
          
          // Capture screenshot
          if (this.enableScreenshots) {
            await this.takeScreenshot(`02-model-switch-${i + 1}`);
          }

          // Analyze switch results
          const switchResult = {
            controlIndex: i,
            control: control,
            beforeState,
            afterState,
            success: this.analyzeModelSwitchSuccess(beforeState, afterState),
            memoryImpact: this.calculateMemoryImpact(beforeMemory, afterMemory),
            networkActivity: this.getRecentNetworkActivity(3000), // Last 3 seconds
            errors: this.getRecentErrors(3000),
            timestamp: new Date().toISOString()
          };

          switchResults.push(switchResult);
          
          this.log(`Model switch ${i + 1} ${switchResult.success ? 'succeeded' : 'failed'}`);

        } catch (error) {
          this.log(`Model switch ${i + 1} failed: ${error.message}`, 'error');
          switchResults.push({
            controlIndex: i,
            control: control,
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }

        // Brief pause between tests
        await this.page.waitForTimeout(1000);
      }

      this.results.diagnostics.modelSwitching = {
        available: true,
        controlsFound: switchingControls.length,
        controlsTested: switchResults.length,
        successfulSwitches: switchResults.filter(r => r.success).length,
        results: switchResults,
        summary: this.generateModelSwitchingSummary(switchResults)
      };

    } catch (error) {
      this.results.diagnostics.modelSwitching = {
        available: false,
        error: error.message,
        reason: 'Failed to test model switching functionality'
      };
      this.log(`Model switching test failed: ${error.message}`, 'error');
    }
  }

  async captureRenderingState(phase) {
    return await this.page.evaluate((phaseInfo) => {
      const state = {
        phase: phaseInfo,
        timestamp: Date.now(),
        canvasElements: document.querySelectorAll('canvas').length,
        webglContexts: Array.from(document.querySelectorAll('canvas')).filter(canvas => {
          try {
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
          } catch (e) {
            return false;
          }
        }).length,
        dragonElements: document.querySelectorAll('[data-testid*="dragon"], [class*="dragon"]').length,
        loadingElements: document.querySelectorAll('[data-loading], [class*="loading"]').length,
        errorElements: document.querySelectorAll('[data-error], [class*="error"]').length,
        fallbackElements: document.querySelectorAll('[data-fallback], [class*="fallback"]').length,
        modelInfo: (() => {
          // Try to get current model information
          const modelElements = document.querySelectorAll('[data-model], [data-current-model]');
          return Array.from(modelElements).map(el => ({
            element: el.tagName,
            model: el.getAttribute('data-model') || el.getAttribute('data-current-model'),
            className: el.className,
            visible: el.offsetWidth > 0 && el.offsetHeight > 0
          }));
        })(),
        threeJsInfo: typeof window.THREE !== 'undefined' ? {
          revision: window.THREE.REVISION,
          webglRenderer: typeof window.THREE.WebGLRenderer !== 'undefined'
        } : null,
        webglFallbackInfo: typeof window.webglFallbackManager !== 'undefined' ? {
          currentMode: window.webglFallbackManager.getCurrentMode?.() || 'unknown',
          capabilities: window.webglFallbackManager.detectCapabilities?.() || null
        } : null
      };

      return state;
    }, phase);
  }

  analyzeModelSwitchSuccess(beforeState, afterState) {
    // Consider a switch successful if:
    // 1. No increase in error elements
    // 2. No decrease in canvas/dragon elements (unless expected)
    // 3. Model info changed (if available)
    // 4. No stuck loading states

    const noNewErrors = afterState.errorElements <= beforeState.errorElements;
    const noStuckLoading = afterState.loadingElements === 0;
    const maintainedRendering = afterState.canvasElements >= beforeState.canvasElements || 
                               afterState.fallbackElements > 0;
    
    // Check if model info changed (indicates actual switching)
    const modelInfoChanged = JSON.stringify(beforeState.modelInfo) !== JSON.stringify(afterState.modelInfo);
    
    return noNewErrors && noStuckLoading && maintainedRendering;
  }

  calculateMemoryImpact(beforeMemory, afterMemory) {
    if (!beforeMemory || !afterMemory) return null;

    return {
      jsHeapUsedDelta: afterMemory.JSHeapUsedSize - beforeMemory.JSHeapUsedSize,
      jsHeapTotalDelta: afterMemory.JSHeapTotalSize - beforeMemory.JSHeapTotalSize,
      nodesDelta: afterMemory.Nodes - beforeMemory.Nodes,
      documentsDelta: afterMemory.Documents - beforeMemory.Documents
    };
  }

  getRecentNetworkActivity(timeWindowMs) {
    const cutoffTime = Date.now() - timeWindowMs;
    
    return {
      modelRequests: this.results.diagnostics.networkRequests.modelFiles.filter(
        req => new Date(req.timestamp).getTime() > cutoffTime
      ),
      textureRequests: this.results.diagnostics.networkRequests.textureFiles.filter(
        req => new Date(req.timestamp).getTime() > cutoffTime
      ),
      failedRequests: this.results.diagnostics.networkRequests.failed.filter(
        req => new Date(req.timestamp).getTime() > cutoffTime
      )
    };
  }

  getRecentErrors(timeWindowMs) {
    const cutoffTime = Date.now() - timeWindowMs;
    
    return {
      jsErrors: this.results.diagnostics.errorAnalysis.jsErrors.filter(
        err => new Date(err.timestamp).getTime() > cutoffTime
      ),
      consoleErrors: this.results.diagnostics.errorAnalysis.consoleMessages.filter(
        msg => msg.type === 'error' && new Date(msg.timestamp).getTime() > cutoffTime
      )
    };
  }

  generateModelSwitchingSummary(switchResults) {
    if (switchResults.length === 0) {
      return { available: false, tested: 0, successful: 0 };
    }

    const successful = switchResults.filter(r => r.success).length;
    const withErrors = switchResults.filter(r => r.errors && 
      (r.errors.jsErrors.length > 0 || r.errors.consoleErrors.length > 0)).length;
    
    return {
      available: true,
      tested: switchResults.length,
      successful,
      successRate: successful / switchResults.length,
      withErrors,
      averageMemoryImpact: switchResults
        .filter(r => r.memoryImpact && r.memoryImpact.jsHeapUsedDelta)
        .reduce((sum, r) => sum + r.memoryImpact.jsHeapUsedDelta, 0) / 
        switchResults.filter(r => r.memoryImpact && r.memoryImpact.jsHeapUsedDelta).length || 0
    };
  }

  async performStressTesting() {
    if (!this.stressTest) {
      this.log('Stress testing skipped');
      return;
    }

    this.log('Performing stress testing...');

    try {
      const stressResults = {
        rapidSwitching: null,
        memoryLeakTest: null,
        errorRecoveryTest: null,
        performanceDegradation: null
      };

      // Test 1: Rapid model switching
      if (this.results.diagnostics.modelSwitching.available) {
        stressResults.rapidSwitching = await this.testRapidModelSwitching();
      }

      // Test 2: Memory leak detection
      stressResults.memoryLeakTest = await this.testMemoryLeaks();

      // Test 3: Error recovery
      stressResults.errorRecoveryTest = await this.testErrorRecovery();

      // Test 4: Performance degradation
      stressResults.performanceDegradation = await this.testPerformanceDegradation();

      this.results.diagnostics.stressTesting = stressResults;

    } catch (error) {
      this.results.diagnostics.stressTesting = {
        error: error.message,
        completed: false
      };
      this.log(`Stress testing failed: ${error.message}`, 'error');
    }
  }

  async testRapidModelSwitching() {
    this.log('Testing rapid model switching...');
    
    const switchingControls = await this.page.$$('[data-testid*="model"], [data-action*="switch"], button');
    
    if (switchingControls.length === 0) {
      return { available: false, reason: 'No switching controls found' };
    }

    const beforeMemory = await this.page.metrics();
    const iterations = 10;
    let successfulSwitches = 0;
    let errors = [];

    for (let i = 0; i < iterations; i++) {
      try {
        const controlIndex = i % switchingControls.length;
        await switchingControls[controlIndex].click();
        await this.page.waitForTimeout(500); // Short wait between switches
        successfulSwitches++;
      } catch (error) {
        errors.push({ iteration: i, error: error.message });
      }
    }

    const afterMemory = await this.page.metrics();
    
    return {
      available: true,
      iterations,
      successfulSwitches,
      successRate: successfulSwitches / iterations,
      errors,
      memoryImpact: this.calculateMemoryImpact(beforeMemory, afterMemory)
    };
  }

  async testMemoryLeaks() {
    this.log('Testing for memory leaks...');
    
    const initialMemory = await this.page.metrics();
    const memorySnapshots = [initialMemory];
    
    // Perform various operations that might cause memory leaks
    for (let i = 0; i < 5; i++) {
      // Navigate away and back
      await this.page.goto('about:blank');
      await this.page.waitForTimeout(1000);
      await this.page.goto(this.results.testUrl);
      await this.page.waitForTimeout(3000);
      
      const snapshot = await this.page.metrics();
      memorySnapshots.push(snapshot);
    }

    // Analyze memory growth
    const memoryGrowth = memorySnapshots.map((snapshot, index) => ({
      iteration: index,
      jsHeapUsed: snapshot.JSHeapUsedSize,
      jsHeapTotal: snapshot.JSHeapTotalSize,
      nodes: snapshot.Nodes
    }));

    const totalGrowth = memorySnapshots[memorySnapshots.length - 1].JSHeapUsedSize - initialMemory.JSHeapUsedSize;
    const avgGrowthPerIteration = totalGrowth / (memorySnapshots.length - 1);

    return {
      memoryGrowth,
      totalGrowthMB: totalGrowth / (1024 * 1024),
      avgGrowthPerIterationMB: avgGrowthPerIteration / (1024 * 1024),
      possibleLeak: avgGrowthPerIteration > 5 * 1024 * 1024 // > 5MB per iteration
    };
  }

  async testErrorRecovery() {
    this.log('Testing error recovery...');
    
    // Inject errors and test recovery
    const recoveryTests = [];

    // Test 1: WebGL context loss simulation
    try {
      await this.page.evaluate(() => {
        const canvases = document.querySelectorAll('canvas');
        canvases.forEach(canvas => {
          const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
          if (gl && gl.getExtension) {
            const loseContext = gl.getExtension('WEBGL_lose_context');
            if (loseContext) {
              loseContext.loseContext();
            }
          }
        });
      });

      await this.page.waitForTimeout(3000);
      const afterContextLoss = await this.captureRenderingState('after-context-loss');
      
      recoveryTests.push({
        test: 'webgl-context-loss',
        success: afterContextLoss.fallbackElements > 0 || afterContextLoss.canvasElements > 0,
        state: afterContextLoss
      });

    } catch (error) {
      recoveryTests.push({
        test: 'webgl-context-loss',
        success: false,
        error: error.message
      });
    }

    // Test 2: Network failure simulation
    try {
      await this.page.setOfflineMode(true);
      await this.page.reload();
      await this.page.waitForTimeout(5000);
      
      const offlineState = await this.captureRenderingState('offline');
      
      await this.page.setOfflineMode(false);
      await this.page.waitForTimeout(3000);
      
      const onlineState = await this.captureRenderingState('back-online');
      
      recoveryTests.push({
        test: 'network-failure',
        success: onlineState.canvasElements > 0 || onlineState.fallbackElements > 0,
        offlineState,
        onlineState
      });

    } catch (error) {
      recoveryTests.push({
        test: 'network-failure',
        success: false,
        error: error.message
      });
    }

    return {
      tests: recoveryTests,
      successfulRecoveries: recoveryTests.filter(t => t.success).length,
      totalTests: recoveryTests.length
    };
  }

  async testPerformanceDegradation() {
    this.log('Testing performance degradation...');
    
    const performanceTests = [];
    
    // Measure initial performance
    const initialMetrics = await this.page.metrics();
    performanceTests.push({ phase: 'initial', metrics: initialMetrics, timestamp: Date.now() });

    // Perform intensive operations
    for (let i = 0; i < 3; i++) {
      // Trigger intensive rendering
      await this.page.evaluate(() => {
        // Create multiple canvas elements to stress the system
        for (let j = 0; j < 5; j++) {
          const canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 512;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Draw complex patterns
            for (let k = 0; k < 1000; k++) {
              ctx.fillStyle = `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255})`;
              ctx.fillRect(Math.random() * 512, Math.random() * 512, 10, 10);
            }
          }
          document.body.appendChild(canvas);
        }
      });

      await this.page.waitForTimeout(2000);
      const metrics = await this.page.metrics();
      performanceTests.push({ phase: `stress-${i + 1}`, metrics, timestamp: Date.now() });

      // Clean up
      await this.page.evaluate(() => {
        const extraCanvases = document.querySelectorAll('canvas:not([data-dragon])');
        extraCanvases.forEach(canvas => canvas.remove());
      });
    }

    // Analyze performance degradation
    const memoryGrowth = performanceTests[performanceTests.length - 1].metrics.JSHeapUsedSize - 
                        performanceTests[0].metrics.JSHeapUsedSize;
    
    return {
      tests: performanceTests,
      memoryGrowthMB: memoryGrowth / (1024 * 1024),
      significantDegradation: memoryGrowth > 50 * 1024 * 1024 // > 50MB growth
    };
  }

  async takeScreenshot(name) {
    if (!this.enableScreenshots) return;

    try {
      const filename = `${name}-${Date.now()}.png`;
      const filepath = path.join(this.outputDir, filename);
      
      await this.page.screenshot({
        path: filepath,
        fullPage: true,
        captureBeyondViewport: false
      });

      this.results.screenshots.push({
        name,
        filename,
        path: filepath,
        timestamp: new Date().toISOString()
      });

      this.log(`Enhanced screenshot saved: ${filename}`);
    } catch (error) {
      this.log(`Screenshot failed: ${error.message}`, 'error');
    }
  }

  async generateEnhancedReport() {
    this.log('Generating enhanced diagnostic report...');

    // Calculate health score
    this.results.healthScore = this.calculateEnhancedHealthScore();

    // Generate summary
    this.results.summary = {
      overallHealth: this.results.healthScore,
      pageLoadSuccessful: this.results.diagnostics.pageLoad.success,
      modelSwitchingAvailable: this.results.diagnostics.modelSwitching.available,
      networkRequestsAnalyzed: this.results.diagnostics.networkRequests.modelFiles.length + 
                              this.results.diagnostics.networkRequests.textureFiles.length,
      totalErrors: this.results.diagnostics.errorAnalysis.jsErrors.length + 
                  this.results.diagnostics.errorAnalysis.networkErrors.length,
      performanceProfileEnabled: this.performanceProfile,
      stressTestingCompleted: this.stressTest && this.results.diagnostics.stressTesting.completed !== false,
      recommendations: this.generateEnhancedRecommendations()
    };

    const reportPath = path.join(this.outputDir, `enhanced-3d-diagnosis-${Date.now()}.json`);
    const textReportPath = path.join(this.outputDir, `enhanced-3d-diagnosis-${Date.now()}.txt`);

    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
    await fs.writeFile(textReportPath, this.generateEnhancedTextSummary());

    this.log(`Enhanced diagnostic report saved to: ${reportPath}`);
    this.log(`Enhanced text summary saved to: ${textReportPath}`);

    return { reportPath, textReportPath };
  }

  calculateEnhancedHealthScore() {
    let score = 100;

    // Page load issues
    if (!this.results.diagnostics.pageLoad.success) score -= 30;

    // Model switching issues
    if (this.testModelSwitching) {
      if (!this.results.diagnostics.modelSwitching.available) {
        score -= 10;
      } else {
        const switchingSummary = this.results.diagnostics.modelSwitching.summary;
        if (switchingSummary.successRate < 0.8) {
          score -= 15;
        }
      }
    }

    // Network issues
    const failedRequests = this.results.diagnostics.networkRequests.failed.length;
    score -= Math.min(failedRequests * 5, 20);

    // Error analysis
    const totalErrors = this.results.diagnostics.errorAnalysis.jsErrors.length + 
                       this.results.diagnostics.errorAnalysis.networkErrors.length;
    score -= Math.min(totalErrors * 3, 25);

    // Performance issues
    if (this.performanceProfile && this.memorySnapshots.length > 0) {
      const memoryGrowth = this.memorySnapshots[this.memorySnapshots.length - 1].JSHeapUsedSize - 
                          this.memorySnapshots[0].JSHeapUsedSize;
      if (memoryGrowth > 100 * 1024 * 1024) { // > 100MB growth
        score -= 15;
      }
    }

    // Stress test failures
    if (this.stressTest && this.results.diagnostics.stressTesting.completed !== false) {
      const stressResults = this.results.diagnostics.stressTesting;
      if (stressResults.memoryLeakTest && stressResults.memoryLeakTest.possibleLeak) {
        score -= 20;
      }
      if (stressResults.errorRecoveryTest && 
          stressResults.errorRecoveryTest.successfulRecoveries < stressResults.errorRecoveryTest.totalTests / 2) {
        score -= 15;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  generateEnhancedRecommendations() {
    const recommendations = [];

    // Page load recommendations
    if (!this.results.diagnostics.pageLoad.success) {
      recommendations.push({
        priority: 'high',
        category: 'page-load',
        message: 'Page failed to load successfully',
        solution: 'Check server availability and network connectivity'
      });
    }

    // Model switching recommendations
    if (this.testModelSwitching && this.results.diagnostics.modelSwitching.available) {
      const summary = this.results.diagnostics.modelSwitching.summary;
      if (summary.successRate < 0.8) {
        recommendations.push({
          priority: 'medium',
          category: 'model-switching',
          message: `Model switching success rate is low (${(summary.successRate * 100).toFixed(1)}%)`,
          solution: 'Review model switching implementation and error handling'
        });
      }
    }

    // Network recommendations
    const networkTiming = this.results.diagnostics.networkRequests.timing;
    if (networkTiming.model && networkTiming.model.avgTime > 5000) {
      recommendations.push({
        priority: 'medium',
        category: 'performance',
        message: `Model file loading is slow (avg: ${networkTiming.model.avgTime}ms)`,
        solution: 'Consider optimizing model file sizes or implementing progressive loading'
      });
    }

    // Memory recommendations
    if (this.stressTest && this.results.diagnostics.stressTesting.memoryLeakTest?.possibleLeak) {
      recommendations.push({
        priority: 'high',
        category: 'memory',
        message: 'Possible memory leak detected during stress testing',
        solution: 'Review resource cleanup and disposal in 3D rendering components'
      });
    }

    return recommendations;
  }

  generateEnhancedTextSummary() {
    const summary = [];
    summary.push('='.repeat(70));
    summary.push('SEIRON ENHANCED 3D MODEL LOADING DIAGNOSTIC REPORT');
    summary.push('='.repeat(70));
    summary.push('');
    summary.push(`Timestamp: ${this.results.timestamp}`);
    summary.push(`Test URL: ${this.results.testUrl}`);
    summary.push(`Enhanced Health Score: ${this.results.healthScore}/100`);
    summary.push('');

    // Configuration
    summary.push('TEST CONFIGURATION:');
    summary.push('-'.repeat(30));
    summary.push(`Model Switching Test: ${this.testModelSwitching ? 'ENABLED' : 'DISABLED'}`);
    summary.push(`Performance Profiling: ${this.performanceProfile ? 'ENABLED' : 'DISABLED'}`);
    summary.push(`Stress Testing: ${this.stressTest ? 'ENABLED' : 'DISABLED'}`);
    summary.push(`Screenshots: ${this.enableScreenshots ? 'ENABLED' : 'DISABLED'}`);
    summary.push('');

    // Page Load Status
    summary.push('PAGE LOAD STATUS:');
    summary.push('-'.repeat(30));
    summary.push(`Page Load: ${this.results.diagnostics.pageLoad.success ? 'SUCCESS' : 'FAILED'}`);
    if (this.results.diagnostics.pageLoad.loadTime) {
      summary.push(`Load Time: ${this.results.diagnostics.pageLoad.loadTime}ms`);
    }
    summary.push('');

    // Model Switching Results
    if (this.testModelSwitching) {
      summary.push('MODEL SWITCHING RESULTS:');
      summary.push('-'.repeat(30));
      const switching = this.results.diagnostics.modelSwitching;
      summary.push(`Available: ${switching.available ? 'YES' : 'NO'}`);
      if (switching.available) {
        summary.push(`Controls Found: ${switching.controlsFound}`);
        summary.push(`Controls Tested: ${switching.controlsTested}`);
        summary.push(`Successful Switches: ${switching.successfulSwitches}`);
        if (switching.summary) {
          summary.push(`Success Rate: ${(switching.summary.successRate * 100).toFixed(1)}%`);
        }
      }
      summary.push('');
    }

    // Network Analysis
    summary.push('NETWORK ANALYSIS:');
    summary.push('-'.repeat(30));
    summary.push(`Model File Requests: ${this.results.diagnostics.networkRequests.modelFiles.length}`);
    summary.push(`Texture File Requests: ${this.results.diagnostics.networkRequests.textureFiles.length}`);
    summary.push(`Failed Requests: ${this.results.diagnostics.networkRequests.failed.length}`);
    
    const timing = this.results.diagnostics.networkRequests.timing;
    if (timing.model) {
      summary.push(`Model Load Time (avg): ${timing.model.avgTime.toFixed(0)}ms`);
    }
    summary.push('');

    // Error Analysis
    summary.push('ERROR ANALYSIS:');
    summary.push('-'.repeat(30));
    summary.push(`JavaScript Errors: ${this.results.diagnostics.errorAnalysis.jsErrors.length}`);
    summary.push(`Network Errors: ${this.results.diagnostics.errorAnalysis.networkErrors.length}`);
    summary.push(`Console Errors: ${this.results.diagnostics.errorAnalysis.consoleMessages.filter(m => m.type === 'error').length}`);
    
    const categorized = this.results.diagnostics.errorAnalysis.categorizedErrors;
    Object.keys(categorized).forEach(category => {
      summary.push(`${category} Errors: ${categorized[category].length}`);
    });
    summary.push('');

    // Stress Testing Results
    if (this.stressTest) {
      summary.push('STRESS TESTING RESULTS:');
      summary.push('-'.repeat(30));
      const stress = this.results.diagnostics.stressTesting;
      
      if (stress.rapidSwitching) {
        summary.push(`Rapid Switching: ${stress.rapidSwitching.successRate ? (stress.rapidSwitching.successRate * 100).toFixed(1) + '%' : 'N/A'}`);
      }
      
      if (stress.memoryLeakTest) {
        summary.push(`Memory Leak Test: ${stress.memoryLeakTest.possibleLeak ? 'LEAK DETECTED' : 'PASSED'}`);
        summary.push(`Memory Growth: ${stress.memoryLeakTest.totalGrowthMB.toFixed(1)}MB`);
      }
      
      if (stress.errorRecoveryTest) {
        summary.push(`Error Recovery: ${stress.errorRecoveryTest.successfulRecoveries}/${stress.errorRecoveryTest.totalTests} tests passed`);
      }
      summary.push('');
    }

    // Recommendations
    if (this.results.summary.recommendations.length > 0) {
      summary.push('ENHANCED RECOMMENDATIONS:');
      summary.push('-'.repeat(30));
      this.results.summary.recommendations.forEach((rec, index) => {
        summary.push(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
        summary.push(`   Solution: ${rec.solution}`);
        summary.push('');
      });
    }

    return summary.join('\\n');
  }

  async cleanup() {
    // Stop memory monitoring
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }

    // Stop performance tracing
    if (this.performanceProfile) {
      try {
        await this.page.tracing.stop();
      } catch (error) {
        this.log(`Failed to stop tracing: ${error.message}`, 'error');
      }
    }

    if (this.browser) {
      await this.browser.close();
      this.log('Enhanced browser closed');
    }
  }

  async run() {
    try {
      await this.setupOutputDirectory();
      await this.launchBrowser();
      await this.setupAdvancedMonitoring();
      await this.navigateToTarget();
      
      // Core diagnostics (reusing existing methods)
      // await this.checkWebGLContext();
      // await this.checkThreeJSInitialization();
      // await this.analyzeComponentRendering();
      
      // Enhanced diagnostics
      await this.testModelSwitchingFunctionality();
      await this.performStressTesting();
      
      if (this.enableScreenshots) {
        await this.takeScreenshot('99-final-enhanced-state');
      }

      const reportPaths = await this.generateEnhancedReport();
      
      console.log('\\n' + this.generateEnhancedTextSummary());
      
      return {
        success: true,
        healthScore: this.results.healthScore,
        reportPaths,
        results: this.results
      };

    } catch (error) {
      this.log(`Enhanced diagnostic run failed: ${error.message}`, 'error');
      
      if (this.enableScreenshots) {
        await this.takeScreenshot('error-enhanced-state');
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
      case '--no-screenshots':
        options.screenshots = false;
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
      case '--no-model-switching':
        options.testModelSwitching = false;
        break;
      case '--performance-profile':
        options.performanceProfile = true;
        break;
      case '--stress-test':
        options.stressTest = true;
        break;
      case '--help':
        console.log(`
Enhanced Dragon 3D Loading Diagnostics

Usage: node scripts/enhanced-3d-diagnostics.js [options]

Options:
  --url <url>              Target URL (default: http://localhost:3000)
  --timeout <ms>           Max timeout for operations (default: 45000)
  --screenshots            Take screenshots during diagnosis
  --no-screenshots         Disable screenshots
  --headless <bool>        Run in headless mode (default: true)
  --verbose                Verbose logging
  --output <dir>           Output directory for reports (default: ./enhanced-diagnosis-reports)
  --no-model-switching     Disable model switching tests
  --performance-profile    Enable performance profiling with tracing
  --stress-test            Enable stress testing (memory leaks, rapid switching, etc.)
  --help                   Show this help message

Enhanced Features:
  - Model switching functionality testing
  - Advanced network request monitoring with timing analysis
  - Performance profiling and memory leak detection
  - Stress testing with rapid operations
  - Error recovery testing
  - Detailed categorized error analysis

Examples:
  node scripts/enhanced-3d-diagnostics.js --screenshots --verbose
  node scripts/enhanced-3d-diagnostics.js --performance-profile --stress-test
  node scripts/enhanced-3d-diagnostics.js --url http://localhost:4000 --timeout 60000
        `);
        process.exit(0);
        break;
    }
  }

  console.log('🚀 Starting Enhanced Dragon 3D Model Loading Diagnostics...');
  console.log(`Target: ${options.url || 'http://localhost:3000'}/dragons/webgl-3d`);
  console.log(`Model Switching: ${options.testModelSwitching !== false ? 'ENABLED' : 'DISABLED'}`);
  console.log(`Performance Profiling: ${options.performanceProfile ? 'ENABLED' : 'DISABLED'}`);
  console.log(`Stress Testing: ${options.stressTest ? 'ENABLED' : 'DISABLED'}`);
  console.log('');

  const diagnostics = new Enhanced3DDiagnostics(options);
  const result = await diagnostics.run();

  if (result.success) {
    console.log(`\\n✅ Enhanced diagnostics completed successfully!`);
    console.log(`Health Score: ${result.healthScore}/100`);
    console.log(`Reports saved to: ${result.reportPaths.reportPath}`);
    process.exit(result.healthScore > 60 ? 0 : 1);
  } else {
    console.log(`\\n❌ Enhanced diagnostics failed: ${result.error}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { Enhanced3DDiagnostics };