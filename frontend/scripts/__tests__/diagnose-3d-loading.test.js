/**
 * @jest-environment node
 */

const { Dragon3DDiagnostics } = require('../diagnose-3d-loading');

// Mock Puppeteer
jest.mock('puppeteer', () => ({
  launch: jest.fn(() => Promise.resolve({
    newPage: jest.fn(() => Promise.resolve({
      on: jest.fn(),
      goto: jest.fn(() => Promise.resolve({
        ok: () => true,
        status: () => 200,
        statusText: () => 'OK',
        url: () => 'http://localhost:3000/dragons/webgl-3d'
      })),
      evaluate: jest.fn(() => Promise.resolve({
        supported: false,
        error: 'WebGL context creation failed',
        canvas2dSupported: true,
        mockWebGLAvailable: true,
        fallbackManagerAvailable: true,
        fallbackCapabilities: {
          webgl: false,
          webgl2: false,
          canvas2d: true,
          mockCanvas: true,
          recommendedMode: 'mock'
        }
      })),
      waitForFunction: jest.fn(() => Promise.resolve()),
      screenshot: jest.fn(() => Promise.resolve()),
      metrics: jest.fn(() => Promise.resolve({
        Timestamp: Date.now(),
        Documents: 1,
        Frames: 1,
        JSEventListeners: 10,
        Nodes: 100,
        LayoutCount: 5,
        RecalcStyleCount: 3,
        LayoutDuration: 0.1,
        RecalcStyleDuration: 0.05,
        ScriptDuration: 0.2,
        TaskDuration: 0.3,
        JSHeapUsedSize: 1000000,
        JSHeapTotalSize: 2000000
      }))
    })),
    userAgent: jest.fn(() => Promise.resolve('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 HeadlessChrome/123.0.0.0')),
    close: jest.fn(() => Promise.resolve())
  }))
}));

// Mock fs for file operations
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(() => Promise.resolve()),
    writeFile: jest.fn(() => Promise.resolve())
  }
}));

describe('Dragon3DDiagnostics with Fallback System', () => {
  let diagnostics;

  beforeEach(() => {
    // Mock console methods to reduce noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    diagnostics = new Dragon3DDiagnostics({
      url: 'http://localhost:3000',
      headless: true,
      verbose: false,
      output: './test-diagnosis-output'
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('creates diagnostics instance with correct options', () => {
      expect(diagnostics.baseUrl).toBe('http://localhost:3000');
      expect(diagnostics.headless).toBe(true);
      expect(diagnostics.outputDir).toBe('./test-diagnosis-output');
    });

    it('initializes results structure with fallback diagnostics', () => {
      expect(diagnostics.results.diagnostics).toHaveProperty('fallbackBehavior');
      expect(diagnostics.results.diagnostics).toHaveProperty('modelCacheService');
      expect(diagnostics.results.diagnostics).toHaveProperty('webglFallbackManager');
    });
  });

  describe('WebGL Context Checking with Fallbacks', () => {
    it('detects fallback capabilities when WebGL is not supported', async () => {
      await diagnostics.launchBrowser();
      await diagnostics.setupPageMonitoring();
      
      // Mock evaluate to return fallback info
      diagnostics.page.evaluate.mockResolvedValueOnce({
        supported: false,
        error: 'WebGL context creation failed',
        canvas2dSupported: true,
        mockWebGLAvailable: true,
        fallbackManagerAvailable: true,
        fallbackCapabilities: {
          webgl: false,
          webgl2: false,
          canvas2d: true,
          mockCanvas: true,
          recommendedMode: 'mock'
        }
      });

      await diagnostics.checkWebGLContext();

      expect(diagnostics.results.diagnostics.webglContext.supported).toBe(false);
      expect(diagnostics.results.diagnostics.webglContext.canvas2dSupported).toBe(true);
      expect(diagnostics.results.diagnostics.webglContext.fallbackManagerAvailable).toBe(true);
      
      // Should have recommendations about fallback systems
      const fallbackRecs = diagnostics.results.recommendations.filter(r => 
        r.message.includes('fallback') || r.message.includes('Fallback')
      );
      expect(fallbackRecs.length).toBeGreaterThan(0);
    });
  });

  describe('Fallback Mechanism Testing', () => {
    it('detects and evaluates fallback components', async () => {
      await diagnostics.launchBrowser();
      await diagnostics.setupPageMonitoring();

      // Mock fallback evaluation
      diagnostics.page.evaluate.mockResolvedValueOnce({
        fallbackElementsFound: 1,
        asciiElementsFound: 1,
        mockCanvasElementsFound: 1,
        canvas2DElementsFound: 1,
        dragonFallbackElementsFound: 1,
        webglFallbackActive: true,
        webglFallbackDiagnostics: {
          capabilities: { recommendedMode: 'mock' },
          environment: { isHeadless: true, isDocker: false }
        },
        debugInfo: 'Mode: mock Headless: Yes Docker: No',
        currentRenderingMode: 'mock',
        fallbackTypes: [{ type: 'mock', visible: true, className: 'dragon-fallback' }]
      });

      await diagnostics.testFallbackMechanisms();

      expect(diagnostics.results.diagnostics.fallbackBehavior.webglFallbackActive).toBe(true);
      expect(diagnostics.results.diagnostics.fallbackBehavior.currentRenderingMode).toBe('mock');
      expect(diagnostics.results.diagnostics.fallbackBehavior.asciiElementsFound).toBe(1);

      // Should recognize this as expected behavior in headless
      const infoRecs = diagnostics.results.recommendations.filter(r => r.type === 'info');
      expect(infoRecs.length).toBeGreaterThan(0);
    });

    it('tests Canvas2D fallback specifically', async () => {
      await diagnostics.launchBrowser();
      await diagnostics.setupPageMonitoring();

      // Mock fallback behavior with Canvas2D info
      diagnostics.page.evaluate.mockResolvedValueOnce({
        fallbackElementsFound: 0,
        asciiElementsFound: 0,
        mockCanvasElementsFound: 0,
        canvas2DElementsFound: 2,
        dragonFallbackElementsFound: 1,
        webglFallbackActive: true,
        debugInfo: 'Mode: canvas2d',
        currentRenderingMode: 'canvas2d',
        fallbackTypes: []
      });

      // Mock Canvas2D info evaluation
      diagnostics.page.evaluate.mockResolvedValueOnce({
        totalCanvases: 2,
        canvas2DCanvases: 2,
        canvasInfo: [
          { width: 400, height: 300, hasImageData: true },
          { width: 400, height: 300, hasImageData: true }
        ]
      });

      await diagnostics.testFallbackMechanisms();

      expect(diagnostics.results.diagnostics.fallbackBehavior.canvas2DInfo.canvas2DCanvases).toBe(2);
      
      // Should have info about Canvas2D fallback
      const canvas2DRecs = diagnostics.results.recommendations.filter(r => 
        r.message.includes('Canvas2D')
      );
      expect(canvas2DRecs.length).toBeGreaterThan(0);
    });
  });

  describe('Model Cache Service Testing', () => {
    it('detects ModelCacheService availability', async () => {
      await diagnostics.launchBrowser();
      await diagnostics.setupPageMonitoring();

      // Mock ModelCacheService evaluation
      diagnostics.page.evaluate.mockResolvedValueOnce({
        available: true,
        stats: {
          totalEntries: 5,
          loadedModels: 3,
          loadingModels: 1,
          errorModels: 1,
          activeLoads: 0,
          queuedLoads: 0,
          memoryUsage: 1024000
        }
      });

      await diagnostics.testModelFileAccessibility();

      expect(diagnostics.results.diagnostics.modelCacheService.available).toBe(true);
      expect(diagnostics.results.diagnostics.modelCacheService.stats.totalEntries).toBe(5);
    });
  });

  describe('Health Scoring with Fallbacks', () => {
    it('calculates health score considering fallback systems', async () => {
      // Set up diagnostics results that would normally fail
      diagnostics.results.diagnostics.webglContext = { supported: false };
      diagnostics.results.diagnostics.threeJsInit = { loaded: false };
      diagnostics.results.diagnostics.pageLoad = { success: true };
      diagnostics.results.diagnostics.jsErrors = [];
      
      // But with working fallback system
      diagnostics.results.diagnostics.fallbackBehavior = {
        webglFallbackActive: true,
        asciiElementsFound: 1,
        mockCanvasElementsFound: 1,
        webglFallbackDiagnostics: {
          environment: { isHeadless: true, isDocker: false }
        }
      };
      
      diagnostics.results.diagnostics.modelCacheService = { available: true };

      const healthScore = diagnostics.calculateOverallHealth();

      // Should have a reasonable score due to working fallback
      expect(healthScore).toBeGreaterThan(50);
    });

    it('provides bonus points for working fallback systems', async () => {
      // Set up basic working system
      diagnostics.results.diagnostics.webglContext = { supported: true };
      diagnostics.results.diagnostics.threeJsInit = { loaded: true };
      diagnostics.results.diagnostics.pageLoad = { success: true };
      diagnostics.results.diagnostics.jsErrors = [];
      
      // With additional fallback systems
      diagnostics.results.diagnostics.fallbackBehavior = {
        webglFallbackActive: true
      };
      
      diagnostics.results.diagnostics.modelCacheService = { available: true };

      const healthScore = diagnostics.calculateOverallHealth();

      // Should get bonus points
      expect(healthScore).toBeGreaterThan(100); // Can exceed 100 with bonuses
    });
  });

  describe('Component Rendering Analysis', () => {
    it('detects various rendering elements', async () => {
      await diagnostics.launchBrowser();
      await diagnostics.setupPageMonitoring();

      // Mock component rendering evaluation
      diagnostics.page.evaluate.mockResolvedValueOnce({
        dragonContainer: true,
        canvasElements: 0,
        errorBoundaryActive: false,
        loadingIndicators: 0,
        fallbackComponents: 1,
        dragonFallbackRenderer: true,
        asciiDragon: 1,
        mockCanvas: 1,
        webglFallbackManager: true,
        specificElements: {},
        reactErrors: [],
        documentReady: 'complete',
        bodyVisible: true,
        reactDevtoolsDetected: false
      });

      await diagnostics.analyzeComponentRendering();

      const componentInfo = diagnostics.results.diagnostics.componentRendering;
      expect(componentInfo.dragonFallbackRenderer).toBe(true);
      expect(componentInfo.asciiDragon).toBe(1);
      expect(componentInfo.mockCanvas).toBe(1);
      expect(componentInfo.webglFallbackManager).toBe(true);

      // Should have info recommendation for ASCII dragon
      const asciiRecs = diagnostics.results.recommendations.filter(r => 
        r.message.includes('ASCII Dragon')
      );
      expect(asciiRecs.length).toBeGreaterThan(0);
    });
  });

  describe('Summary Generation', () => {
    it('includes fallback system status in summary', async () => {
      // Set up results with fallback info
      diagnostics.results.diagnostics.pageLoad = { success: true };
      diagnostics.results.diagnostics.webglContext = { supported: false };
      diagnostics.results.diagnostics.threeJsInit = { loaded: false };
      diagnostics.results.diagnostics.modelLoading = { accessibility: [] };
      diagnostics.results.diagnostics.fallbackBehavior = {
        webglFallbackActive: true,
        currentRenderingMode: 'mock',
        asciiElementsFound: 1,
        canvas2DInfo: { canvas2DCanvases: 0 },
        webglFallbackDiagnostics: {
          environment: { isHeadless: true, isDocker: false }
        }
      };
      diagnostics.results.diagnostics.modelCacheService = { available: true };
      diagnostics.results.recommendations = [
        { type: 'info', message: 'Fallback working', solution: 'Expected' }
      ];

      // Generate summary
      diagnostics.results.summary = {
        overallHealth: diagnostics.calculateOverallHealth(),
        criticalIssues: 0,
        highPriorityIssues: 0,
        mediumPriorityIssues: 0,
        infoItems: 1,
        webglSupported: false,
        threeJsLoaded: false,
        pageLoadSuccessful: true,
        modelsAccessible: 0,
        fallbackSystemWorking: true,
        currentRenderingMode: 'mock',
        asciiRenderingWorking: true,
        canvas2DRenderingWorking: false,
        modelCacheServiceAvailable: true,
        hasAnyRendering: diagnostics.hasAnySuccessfulRendering()
      };

      const textSummary = diagnostics.generateTextSummary();

      expect(textSummary).toContain('Fallback System: ACTIVE');
      expect(textSummary).toContain('Rendering Mode: mock');
      expect(textSummary).toContain('ASCII Fallback: WORKING');
      expect(textSummary).toContain('Environment: HEADLESS');
      expect(textSummary).toContain('ModelCacheService: AVAILABLE');
      expect(textSummary).toContain('Any Rendering Working: YES');
    });
  });

  describe('hasAnySuccessfulRendering', () => {
    it('returns true when any rendering system is working', () => {
      // Test with canvas
      diagnostics.results.diagnostics.componentRendering = { canvasElements: 1 };
      expect(diagnostics.hasAnySuccessfulRendering()).toBe(true);

      // Test with ASCII
      diagnostics.results.diagnostics.componentRendering = { canvasElements: 0 };
      diagnostics.results.diagnostics.fallbackBehavior = { asciiElementsFound: 1 };
      expect(diagnostics.hasAnySuccessfulRendering()).toBe(true);

      // Test with Canvas2D
      diagnostics.results.diagnostics.fallbackBehavior = { 
        asciiElementsFound: 0,
        canvas2DInfo: { canvas2DCanvases: 1 }
      };
      expect(diagnostics.hasAnySuccessfulRendering()).toBe(true);

      // Test with mock canvas
      diagnostics.results.diagnostics.fallbackBehavior = { 
        asciiElementsFound: 0,
        canvas2DInfo: { canvas2DCanvases: 0 },
        mockCanvasElementsFound: 1
      };
      expect(diagnostics.hasAnySuccessfulRendering()).toBe(true);

      // Test with nothing working
      diagnostics.results.diagnostics.componentRendering = { canvasElements: 0 };
      diagnostics.results.diagnostics.fallbackBehavior = { 
        asciiElementsFound: 0,
        canvas2DInfo: { canvas2DCanvases: 0 },
        mockCanvasElementsFound: 0
      };
      expect(diagnostics.hasAnySuccessfulRendering()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('handles evaluation errors gracefully', async () => {
      await diagnostics.launchBrowser();
      await diagnostics.setupPageMonitoring();

      // Mock evaluation error
      diagnostics.page.evaluate.mockRejectedValueOnce(new Error('Evaluation failed'));

      await diagnostics.checkWebGLContext();

      expect(diagnostics.results.diagnostics.webglContext.supported).toBe(false);
      expect(diagnostics.results.diagnostics.webglContext.error).toContain('Evaluation failed');
    });
  });
});