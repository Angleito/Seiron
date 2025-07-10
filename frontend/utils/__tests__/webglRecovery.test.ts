import { WebGLRecoveryManager } from '../webglRecovery';
import { webglDiagnostics } from '../webglDiagnostics';

// Mock canvas and WebGL context
const mockCanvas = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  getContext: jest.fn(),
  width: 800,
  height: 600
} as any;

const mockWebGLContext = {
  isContextLost: jest.fn(() => false),
  getExtension: jest.fn((name: string) => {
    if (name === 'WEBGL_lose_context') {
      return {
        loseContext: jest.fn(),
        restoreContext: jest.fn()
      };
    }
    return null;
  })
} as any;

const mockRenderer = {
  dispose: jest.fn(),
  setSize: jest.fn(),
  setPixelRatio: jest.fn(),
  setRenderTarget: jest.fn(),
  forceContextRestore: jest.fn(),
  resetState: jest.fn(),
  getSize: jest.fn(() => ({ width: 800, height: 600 })),
  getPixelRatio: jest.fn(() => 1),
  info: {
    memory: { geometries: 0, textures: 0 },
    render: { calls: 0, triangles: 0 }
  }
} as any;

// Mock webglDiagnostics
jest.mock('../webglDiagnostics', () => ({
  webglDiagnostics: {
    recordError: jest.fn(),
    recordPerformanceMetric: jest.fn(),
    recordMemoryMetric: jest.fn(),
    recordContextLoss: jest.fn(),
    recordContextRecovery: jest.fn()
  }
}));

describe('WebGLRecoveryManager', () => {
  let recoveryManager: WebGLRecoveryManager;
  let mockConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConfig = {
      maxRecoveryAttempts: 3,
      recoveryDelayMs: 1000,
      fallbackEnabled: true,
      onContextLost: jest.fn(),
      onContextRestored: jest.fn(),
      onRecoveryFailed: jest.fn(),
      onFallback: jest.fn()
    };

    recoveryManager = new WebGLRecoveryManager(mockConfig);
    
    // Reset mock context state
    mockWebGLContext.isContextLost.mockReturnValue(false);
    mockWebGLContext.getExtension.mockImplementation((name: string) => {
      if (name === 'WEBGL_lose_context') {
        return {
          loseContext: jest.fn(),
          restoreContext: jest.fn()
        };
      }
      return null;
    });
    
    // Mock canvas.getContext to return our mock context
    mockCanvas.getContext.mockReturnValue(mockWebGLContext);
  });

  afterEach(() => {
    recoveryManager.dispose();
  });

  describe('initialization', () => {
    it('should initialize recovery management successfully', () => {
      recoveryManager.initializeRecovery(mockCanvas, mockRenderer);
      
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith('webglcontextlost', expect.any(Function));
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith('webglcontextrestored', expect.any(Function));
      expect(mockCanvas.getContext).toHaveBeenCalled();
    });

    it('should handle WebGL context not available', () => {
      mockCanvas.getContext.mockReturnValue(null);
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      recoveryManager.initializeRecovery(mockCanvas, mockRenderer);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[WebGLRecovery] Failed to get WebGL context');
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('context loss handling', () => {
    it('should handle context loss event', () => {
      recoveryManager.initializeRecovery(mockCanvas, mockRenderer);
      
      // Get the context lost event handler
      const contextLostHandler = mockCanvas.addEventListener.mock.calls
        .find(call => call[0] === 'webglcontextlost')[1];
      
      const mockEvent = { preventDefault: jest.fn() };
      
      contextLostHandler(mockEvent);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockConfig.onContextLost).toHaveBeenCalled();
      expect(webglDiagnostics.recordError).toHaveBeenCalledWith(expect.stringContaining('WebGL context lost'));
    });

    it('should attempt recovery when context is lost', async () => {
      recoveryManager.initializeRecovery(mockCanvas, mockRenderer);
      
      const contextLostHandler = mockCanvas.addEventListener.mock.calls
        .find(call => call[0] === 'webglcontextlost')[1];
      
      const mockEvent = { preventDefault: jest.fn() };
      
      // Simulate context actually being lost
      mockWebGLContext.isContextLost.mockReturnValue(true);
      
      const restoreContextMock = jest.fn();
      mockWebGLContext.getExtension.mockImplementation((name: string) => {
        if (name === 'WEBGL_lose_context') {
          return {
            loseContext: jest.fn(),
            restoreContext: restoreContextMock
          };
        }
        return null;
      });
      
      contextLostHandler(mockEvent);
      
      // Wait for recovery attempt to be scheduled
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      expect(mockWebGLContext.getExtension).toHaveBeenCalledWith('WEBGL_lose_context');
      expect(restoreContextMock).toHaveBeenCalled();
    });
  });

  describe('context restoration handling', () => {
    it('should handle context restoration event', async () => {
      recoveryManager.initializeRecovery(mockCanvas, mockRenderer);
      
      const contextRestoredHandler = mockCanvas.addEventListener.mock.calls
        .find(call => call[0] === 'webglcontextrestored')[1];
      
      contextRestoredHandler();
      
      expect(mockConfig.onContextRestored).toHaveBeenCalled();
      expect(mockRenderer.forceContextRestore).toHaveBeenCalled();
      expect(mockRenderer.setSize).toHaveBeenCalled();
      expect(mockRenderer.resetState).toHaveBeenCalled();
    });
  });

  describe('recovery failure handling', () => {
    it('should trigger fallback after maximum recovery attempts', () => {
      recoveryManager.initializeRecovery(mockCanvas, mockRenderer);
      
      const contextLostHandler = mockCanvas.addEventListener.mock.calls
        .find(call => call[0] === 'webglcontextlost')[1];
      
      const mockEvent = { preventDefault: jest.fn() };
      
      // Manually set the recovery attempts to be at the limit
      (recoveryManager as any).recoveryAttempts = 3; // Set to max attempts
      
      // Trigger one more context loss event, which should trigger fallback
      contextLostHandler(mockEvent);
      
      expect(mockConfig.onRecoveryFailed).toHaveBeenCalled();
      expect(mockConfig.onFallback).toHaveBeenCalled();
      expect(webglDiagnostics.recordError).toHaveBeenCalledWith(expect.stringContaining('recovery failed'));
    });

    it('should implement circuit breaker for rapid context losses', async () => {
      recoveryManager.initializeRecovery(mockCanvas, mockRenderer);
      
      const contextLostHandler = mockCanvas.addEventListener.mock.calls
        .find(call => call[0] === 'webglcontextlost')[1];
      
      const mockEvent = { preventDefault: jest.fn() };
      
      // Simulate rapid context losses
      for (let i = 0; i < 4; i++) {
        contextLostHandler(mockEvent);
        // Small delay to simulate rapid but not instantaneous losses
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Circuit breaker should be open now
      const diagnostics = recoveryManager.getDiagnostics();
      expect(diagnostics.currentState).toBe('failed');
    });

    it('should prevent recovery when circuit breaker is open', () => {
      recoveryManager.initializeRecovery(mockCanvas, mockRenderer);
      
      // Manually open circuit breaker
      (recoveryManager as any).circuitBreakerOpen = true;
      
      const contextLostHandler = mockCanvas.addEventListener.mock.calls
        .find(call => call[0] === 'webglcontextlost')[1];
      
      const mockEvent = { preventDefault: jest.fn() };
      
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      contextLostHandler(mockEvent);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[WebGLRecovery] Circuit breaker is open, skipping recovery attempt'
      );
      
      consoleWarnSpy.mockRestore();
    });

    it('should rate limit recovery attempts', () => {
      recoveryManager.initializeRecovery(mockCanvas, mockRenderer);
      
      const contextLostHandler = mockCanvas.addEventListener.mock.calls
        .find(call => call[0] === 'webglcontextlost')[1];
      
      const mockEvent = { preventDefault: jest.fn() };
      
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Trigger rapid context losses
      contextLostHandler(mockEvent);
      contextLostHandler(mockEvent); // Should be rate limited
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[WebGLRecovery] Rapid context loss detected, implementing backoff'
      );
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('diagnostics integration', () => {
    it('should record errors in diagnostics', () => {
      recoveryManager.initializeRecovery(mockCanvas, mockRenderer);
      
      const contextLostHandler = mockCanvas.addEventListener.mock.calls
        .find(call => call[0] === 'webglcontextlost')[1];
      
      const mockEvent = { preventDefault: jest.fn() };
      
      contextLostHandler(mockEvent);
      
      expect(webglDiagnostics.recordError).toHaveBeenCalledWith(expect.stringContaining('WebGL context lost'));
    });

    it('should track diagnostics correctly', () => {
      const diagnostics = recoveryManager.getDiagnostics();
      
      expect(diagnostics).toHaveProperty('contextLossCount');
      expect(diagnostics).toHaveProperty('recoveryAttempts');
      expect(diagnostics).toHaveProperty('successfulRecoveries');
      expect(diagnostics).toHaveProperty('failedRecoveries');
      expect(diagnostics).toHaveProperty('currentState');
    });
  });

  describe('utility functions', () => {
    it('should check WebGL availability', () => {
      recoveryManager.initializeRecovery(mockCanvas, mockRenderer);
      
      expect(recoveryManager.isWebGLAvailable()).toBe(true);
      
      mockWebGLContext.isContextLost.mockReturnValue(true);
      expect(recoveryManager.isWebGLAvailable()).toBe(false);
    });

    it('should simulate context loss for testing', () => {
      recoveryManager.initializeRecovery(mockCanvas, mockRenderer);
      
      const loseContextExtension = {
        loseContext: jest.fn(),
        restoreContext: jest.fn()
      };
      
      mockWebGLContext.getExtension.mockReturnValue(loseContextExtension);
      
      recoveryManager.simulateContextLoss();
      
      expect(loseContextExtension.loseContext).toHaveBeenCalled();
    });

    it('should reset diagnostics', () => {
      recoveryManager.initializeRecovery(mockCanvas, mockRenderer);
      
      // Trigger some context loss to populate diagnostics
      const contextLostHandler = mockCanvas.addEventListener.mock.calls
        .find(call => call[0] === 'webglcontextlost')[1];
      
      const mockEvent = { preventDefault: jest.fn() };
      contextLostHandler(mockEvent);
      
      let diagnostics = recoveryManager.getDiagnostics();
      expect(diagnostics.contextLossCount).toBe(1);
      
      recoveryManager.resetDiagnostics();
      
      diagnostics = recoveryManager.getDiagnostics();
      expect(diagnostics.contextLossCount).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should clean up event listeners on dispose', () => {
      recoveryManager.initializeRecovery(mockCanvas, mockRenderer);
      
      recoveryManager.dispose();
      
      expect(mockCanvas.removeEventListener).toHaveBeenCalledWith('webglcontextlost', expect.any(Function));
      expect(mockCanvas.removeEventListener).toHaveBeenCalledWith('webglcontextrestored', expect.any(Function));
    });
  });
});

describe('WebGL Recovery Integration', () => {
  it('should integrate properly with diagnostics system', () => {
    const manager = new WebGLRecoveryManager({
      maxRecoveryAttempts: 2,
      onContextLost: () => {},
      onContextRestored: () => {},
      onRecoveryFailed: () => {},
      onFallback: () => {}
    });
    
    manager.initializeRecovery(mockCanvas, mockRenderer);
    
    const contextLostHandler = mockCanvas.addEventListener.mock.calls
      .find(call => call[0] === 'webglcontextlost')[1];
    
    const mockEvent = { preventDefault: jest.fn() };
    contextLostHandler(mockEvent);
    
    // Should record error in diagnostics
    expect(webglDiagnostics.recordError).toHaveBeenCalled();
    
    manager.dispose();
  });
});