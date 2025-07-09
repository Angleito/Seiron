import { WebGLDiagnostics, webglDiagnostics } from '../webglDiagnostics';

// Mock document.createElement to return a mock canvas
const mockCanvas = {
  getContext: jest.fn(),
  remove: jest.fn()
} as any;

const mockWebGLContext = {
  isContextLost: jest.fn(() => false),
  getParameter: jest.fn(),
  getExtension: jest.fn(),
  getSupportedExtensions: jest.fn(() => ['WEBGL_lose_context', 'OES_texture_float']),
  getContextAttributes: jest.fn(() => ({
    antialias: true,
    alpha: true,
    depth: true,
    stencil: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance'
  }))
} as any;

// Mock WebGL2 context
const mockWebGL2Context = {
  ...mockWebGLContext,
  constructor: { name: 'WebGL2RenderingContext' }
} as any;

// Mock performance.memory
const mockMemory = {
  totalJSHeapSize: 100 * 1024 * 1024,
  usedJSHeapSize: 50 * 1024 * 1024,
  jsHeapSizeLimit: 200 * 1024 * 1024
};

Object.defineProperty(performance, 'memory', {
  value: mockMemory,
  writable: false
});

describe('WebGLDiagnostics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock document.createElement
    jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return mockCanvas;
      }
      return document.createElement(tagName);
    });
    
    // Setup mock WebGL context responses
    mockWebGLContext.getParameter.mockImplementation((param: number) => {
      const GL_RENDERER = 0x1F01;
      const GL_VENDOR = 0x1F00;
      const GL_VERSION = 0x1F02;
      const GL_SHADING_LANGUAGE_VERSION = 0x8B8C;
      const GL_MAX_TEXTURE_SIZE = 0x0D33;
      const GL_MAX_VERTEX_ATTRIBS = 0x8869;
      const GL_MAX_FRAGMENT_UNIFORM_VECTORS = 0x8DFD;
      const GL_MAX_VERTEX_UNIFORM_VECTORS = 0x8DFB;
      const GL_MAX_VARYING_VECTORS = 0x8DFC;
      const GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS = 0x8B4D;
      
      switch (param) {
        case GL_RENDERER: return 'Mock WebGL Renderer';
        case GL_VENDOR: return 'Mock WebGL Vendor';
        case GL_VERSION: return 'WebGL 1.0';
        case GL_SHADING_LANGUAGE_VERSION: return 'WebGL GLSL ES 1.0';
        case GL_MAX_TEXTURE_SIZE: return 4096;
        case GL_MAX_VERTEX_ATTRIBS: return 16;
        case GL_MAX_FRAGMENT_UNIFORM_VECTORS: return 1024;
        case GL_MAX_VERTEX_UNIFORM_VECTORS: return 1024;
        case GL_MAX_VARYING_VECTORS: return 30;
        case GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS: return 80;
        case 0x9246: return 'Mock WebGL Renderer'; // UNMASKED_RENDERER_WEBGL
        case 0x9245: return 'Mock WebGL Vendor';   // UNMASKED_VENDOR_WEBGL
        default: return 0;
      }
    });
    
    mockWebGLContext.getExtension.mockImplementation((name: string) => {
      if (name === 'WEBGL_debug_renderer_info') {
        return {
          UNMASKED_RENDERER_WEBGL: 0x9246,
          UNMASKED_VENDOR_WEBGL: 0x9245
        };
      }
      return null;
    });
    
    // Mock WebGL constants
    Object.defineProperty(mockWebGLContext, 'RENDERER', { value: 0x1F01 });
    Object.defineProperty(mockWebGLContext, 'VENDOR', { value: 0x1F00 });
    Object.defineProperty(mockWebGLContext, 'VERSION', { value: 0x1F02 });
    Object.defineProperty(mockWebGLContext, 'SHADING_LANGUAGE_VERSION', { value: 0x8B8C });
    Object.defineProperty(mockWebGLContext, 'MAX_TEXTURE_SIZE', { value: 0x0D33 });
    Object.defineProperty(mockWebGLContext, 'MAX_VERTEX_ATTRIBS', { value: 0x8869 });
    Object.defineProperty(mockWebGLContext, 'MAX_FRAGMENT_UNIFORM_VECTORS', { value: 0x8DFD });
    Object.defineProperty(mockWebGLContext, 'MAX_VERTEX_UNIFORM_VECTORS', { value: 0x8DFB });
    Object.defineProperty(mockWebGLContext, 'MAX_VARYING_VECTORS', { value: 0x8DFC });
    Object.defineProperty(mockWebGLContext, 'MAX_COMBINED_TEXTURE_IMAGE_UNITS', { value: 0x8B4D });
    
    mockCanvas.getContext.mockReturnValue(mockWebGLContext);
    
    // Reset the diagnostics instance
    webglDiagnostics.reset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getInstance', () => {
    it('should return the same instance', () => {
      const instance1 = WebGLDiagnostics.getInstance();
      const instance2 = WebGLDiagnostics.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('getDiagnosticInfo', () => {
    it('should return comprehensive diagnostic information', () => {
      const diagnostics = webglDiagnostics.getDiagnosticInfo();
      
      expect(diagnostics).toHaveProperty('renderer', 'Mock WebGL Renderer');
      expect(diagnostics).toHaveProperty('vendor', 'Mock WebGL Vendor');
      expect(diagnostics).toHaveProperty('version', 'WebGL 1.0');
      expect(diagnostics).toHaveProperty('shadingLanguageVersion', 'WebGL GLSL ES 1.0');
      expect(diagnostics).toHaveProperty('maxTextureSize', 4096);
      expect(diagnostics).toHaveProperty('maxVertexAttributes', 16);
      expect(diagnostics).toHaveProperty('supportedExtensions');
      expect(diagnostics).toHaveProperty('contextAttributes');
      expect(diagnostics).toHaveProperty('memoryInfo');
      expect(diagnostics).toHaveProperty('timestamp');
      
      expect(diagnostics.supportedExtensions).toContain('WEBGL_lose_context');
      expect(diagnostics.supportedExtensions).toContain('OES_texture_float');
    });

    it('should handle WebGL not supported', () => {
      mockCanvas.getContext.mockReturnValue(null);
      
      expect(() => {
        webglDiagnostics.getDiagnosticInfo();
      }).toThrow('WebGL not supported');
    });

    it('should include memory information when available', () => {
      const diagnostics = webglDiagnostics.getDiagnosticInfo();
      
      expect(diagnostics.memoryInfo).toEqual({
        totalJSHeapSize: 100 * 1024 * 1024,
        usedJSHeapSize: 50 * 1024 * 1024,
        jsHeapSizeLimit: 200 * 1024 * 1024
      });
    });
  });

  describe('getHealthMetrics', () => {
    it('should return current health metrics', () => {
      const metrics = webglDiagnostics.getHealthMetrics();
      
      expect(metrics).toHaveProperty('isContextLost', false);
      expect(metrics).toHaveProperty('isContextAvailable', true);
      expect(metrics).toHaveProperty('renderingContextType', 'webgl');
      expect(metrics).toHaveProperty('performanceScore');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('errorCount', 0);
      expect(metrics).toHaveProperty('uptime');
      expect(metrics).toHaveProperty('timestamp');
    });

    it('should detect WebGL2 context', () => {
      // Mock WebGL2RenderingContext constructor
      global.WebGL2RenderingContext = class WebGL2RenderingContext {} as any;
      
      // Create a mock that is instanceof WebGL2RenderingContext
      const mockWebGL2 = Object.create(WebGL2RenderingContext.prototype);
      Object.assign(mockWebGL2, mockWebGL2Context);
      
      mockCanvas.getContext.mockReturnValue(mockWebGL2);
      
      const metrics = webglDiagnostics.getHealthMetrics();
      
      expect(metrics.renderingContextType).toBe('webgl2');
    });

    it('should handle context loss', () => {
      mockWebGLContext.isContextLost.mockReturnValue(true);
      
      const metrics = webglDiagnostics.getHealthMetrics();
      
      expect(metrics.isContextLost).toBe(true);
    });

    it('should handle WebGL not available', () => {
      mockCanvas.getContext.mockReturnValue(null);
      
      const metrics = webglDiagnostics.getHealthMetrics();
      
      expect(metrics.isContextAvailable).toBe(false);
      expect(metrics.isContextLost).toBe(true);
      expect(metrics.renderingContextType).toBe(null);
    });
  });

  describe('performance tracking', () => {
    it('should record performance metrics', () => {
      webglDiagnostics.recordPerformanceMetric(16.67);
      webglDiagnostics.recordPerformanceMetric(20.0);
      
      const metrics = webglDiagnostics.getHealthMetrics();
      
      expect(metrics.performanceScore).toBeLessThan(100);
      expect(metrics.performanceScore).toBeGreaterThan(0);
    });

    it('should limit performance metrics to 100 entries', () => {
      for (let i = 0; i < 150; i++) {
        webglDiagnostics.recordPerformanceMetric(16.67);
      }
      
      // Should not throw or cause issues
      const metrics = webglDiagnostics.getHealthMetrics();
      expect(metrics.performanceScore).toBeDefined();
    });
  });

  describe('memory tracking', () => {
    it('should record memory metrics', () => {
      webglDiagnostics.recordMemoryMetric(50.5);
      
      const metrics = webglDiagnostics.getHealthMetrics();
      
      expect(metrics.memoryUsage).toBe(50.5);
    });

    it('should limit memory metrics to 100 entries', () => {
      for (let i = 0; i < 150; i++) {
        webglDiagnostics.recordMemoryMetric(i);
      }
      
      const metrics = webglDiagnostics.getHealthMetrics();
      expect(metrics.memoryUsage).toBe(149); // Last recorded value
    });
  });

  describe('error tracking', () => {
    it('should record errors', () => {
      webglDiagnostics.recordError('Test error');
      
      const metrics = webglDiagnostics.getHealthMetrics();
      
      expect(metrics.errorCount).toBe(1);
      expect(metrics.lastError).toBe('Test error');
    });

    it('should increment error count', () => {
      webglDiagnostics.recordError('Error 1');
      webglDiagnostics.recordError('Error 2');
      
      const metrics = webglDiagnostics.getHealthMetrics();
      
      expect(metrics.errorCount).toBe(2);
      expect(metrics.lastError).toBe('Error 2');
    });
  });

  describe('testCapabilities', () => {
    it('should test WebGL capabilities', () => {
      const capabilities = webglDiagnostics.testCapabilities();
      
      expect(capabilities).toHaveProperty('webgl', true);
      expect(capabilities).toHaveProperty('webgl2', false);
      expect(capabilities).toHaveProperty('instancing');
      expect(capabilities).toHaveProperty('drawBuffers');
      expect(capabilities).toHaveProperty('vertexArrayObject');
      expect(capabilities).toHaveProperty('textureFloat');
      expect(capabilities).toHaveProperty('depthTexture');
      expect(capabilities).toHaveProperty('loseContext');
    });

    it('should handle WebGL not available', () => {
      mockCanvas.getContext.mockReturnValue(null);
      
      const capabilities = webglDiagnostics.testCapabilities();
      
      expect(capabilities).toEqual({ webgl: false });
    });
  });

  describe('generateReport', () => {
    it('should generate a comprehensive report', () => {
      webglDiagnostics.recordError('Test error');
      webglDiagnostics.recordPerformanceMetric(16.67);
      
      const report = webglDiagnostics.generateReport();
      
      expect(report).toContain('WebGL Diagnostic Report');
      expect(report).toContain('HEALTH METRICS');
      expect(report).toContain('DIAGNOSTIC INFO');
      expect(report).toContain('MEMORY INFO');
      expect(report).toContain('CAPABILITIES');
      expect(report).toContain('SUPPORTED EXTENSIONS');
      expect(report).toContain('CONTEXT ATTRIBUTES');
      expect(report).toContain('Mock WebGL Renderer');
      expect(report).toContain('Test error');
    });

    it('should handle errors gracefully', () => {
      mockCanvas.getContext.mockImplementation(() => {
        throw new Error('Test error');
      });
      
      const report = webglDiagnostics.generateReport();
      
      expect(report).toContain('Error generating WebGL diagnostic report');
    });
  });

  describe('reset', () => {
    it('should reset all metrics', () => {
      webglDiagnostics.recordError('Test error');
      webglDiagnostics.recordPerformanceMetric(16.67);
      webglDiagnostics.recordMemoryMetric(50.0);
      
      let metrics = webglDiagnostics.getHealthMetrics();
      expect(metrics.errorCount).toBe(1);
      
      webglDiagnostics.reset();
      
      metrics = webglDiagnostics.getHealthMetrics();
      expect(metrics.errorCount).toBe(0);
      expect(metrics.lastError).toBeUndefined();
    });
  });
});