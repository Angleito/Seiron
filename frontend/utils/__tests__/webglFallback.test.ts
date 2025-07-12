/**
 * @jest-environment jsdom
 */

import { 
  WebGLFallbackManager, 
  createWebGLFallback, 
  detectWebGLCapabilities, 
  isHeadlessEnvironment,
  createMockWebGLContext
} from '../webglFallback'

// Mock Three.js
jest.mock('three', () => ({
  Scene: jest.fn(() => ({
    add: jest.fn(),
    traverse: jest.fn()
  })),
  PerspectiveCamera: jest.fn(() => ({
    position: { z: 5 }
  })),
  BoxGeometry: jest.fn(),
  MeshBasicMaterial: jest.fn(),
  Mesh: jest.fn(),
  WebGLRenderer: jest.fn(() => ({
    render: jest.fn(),
    dispose: jest.fn(),
    domElement: document.createElement('canvas')
  }))
}))

// Mock performance for Node.js environment
Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    now: jest.fn(() => Date.now()),
    memory: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 4000000
    }
  }
})

describe('WebGLFallbackManager', () => {
  let manager: WebGLFallbackManager

  beforeEach(() => {
    // Reset DOM
    document.head.innerHTML = ''
    document.body.innerHTML = ''
    
    // Mock console methods to reduce noise
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'info').mockImplementation(() => {})

    manager = new WebGLFallbackManager({
      logLevel: 'none'
    })
  })

  afterEach(() => {
    manager.dispose()
    jest.restoreAllMocks()
  })

  describe('Environment Detection', () => {
    it('detects headless environment', () => {
      // Temporarily remove window for headless simulation
      const originalWindow = global.window
      delete (global as any).window

      const headlessManager = new WebGLFallbackManager({ logLevel: 'none' })
      const diagnostics = headlessManager.getDiagnostics()
      
      expect(diagnostics.environment.isHeadless).toBe(true)

      // Restore window
      global.window = originalWindow
    })

    it('detects browser environment', () => {
      const diagnostics = manager.getDiagnostics()
      expect(diagnostics.environment.isHeadless).toBe(false)
    })

    it('detects Docker environment indicators', () => {
      const originalEnv = process.env.DOCKER
      process.env.DOCKER = 'true'

      const dockerManager = new WebGLFallbackManager({ logLevel: 'none' })
      const diagnostics = dockerManager.getDiagnostics()
      
      expect(diagnostics.environment.isDocker).toBe(true)

      process.env.DOCKER = originalEnv
    })
  })

  describe('Capability Detection', () => {
    it('detects WebGL capabilities in browser environment', () => {
      // Mock canvas and WebGL context
      const mockCanvas = document.createElement('canvas')
      const mockGL = {
        isContextLost: () => false,
        getParameter: jest.fn(),
        getExtension: jest.fn(),
        getSupportedExtensions: () => ['WEBGL_lose_context'],
        getContextAttributes: () => ({
          alpha: true,
          antialias: false,
          depth: true
        })
      }

      jest.spyOn(document, 'createElement').mockReturnValue(mockCanvas)
      jest.spyOn(mockCanvas, 'getContext').mockImplementation((type) => {
        if (type === 'webgl2') return mockGL
        if (type === 'webgl' || type === 'experimental-webgl') return mockGL
        if (type === '2d') return {}
        return null
      })

      const capabilities = manager.detectCapabilities()

      expect(capabilities.webgl).toBe(true)
      expect(capabilities.webgl2).toBe(true)
      expect(capabilities.canvas2d).toBe(true)
      expect(capabilities.headlessMode).toBe(false)
    })

    it('provides mock capabilities in headless environment', () => {
      const originalWindow = global.window
      delete (global as any).window

      const headlessManager = new WebGLFallbackManager({ logLevel: 'none' })
      const capabilities = headlessManager.detectCapabilities()

      expect(capabilities.webgl).toBe(false)
      expect(capabilities.webgl2).toBe(false)
      expect(capabilities.headlessMode).toBe(true)
      expect(capabilities.mockCanvas).toBe(true)
      expect(capabilities.recommendedMode).toBe('mock')

      global.window = originalWindow
    })

    it('handles WebGL context creation failure gracefully', () => {
      const mockCanvas = document.createElement('canvas')
      jest.spyOn(document, 'createElement').mockReturnValue(mockCanvas)
      jest.spyOn(mockCanvas, 'getContext').mockReturnValue(null)

      const capabilities = manager.detectCapabilities()

      expect(capabilities.webgl).toBe(false)
      expect(capabilities.webgl2).toBe(false)
      expect(capabilities.recommendedMode).toBe('mock')
    })
  })

  describe('Context Creation', () => {
    it('creates mock context in headless environment', () => {
      const originalWindow = global.window
      delete (global as any).window

      const headlessManager = new WebGLFallbackManager({ logLevel: 'none' })
      const context = headlessManager.createContext('auto')

      expect(context.type).toBe('mock')
      expect(context.isHeadless).toBe(true)
      expect(context.canvas).toBeDefined()
      expect(context.context).toBeDefined()
      expect(context.renderer).toBeDefined()

      global.window = originalWindow
    })

    it('creates WebGL context when available', () => {
      const mockCanvas = document.createElement('canvas')
      const mockGL = {
        isContextLost: () => false,
        getParameter: jest.fn(),
        getExtension: jest.fn(),
        getSupportedExtensions: () => [],
        getContextAttributes: () => ({})
      }

      jest.spyOn(document, 'createElement').mockReturnValue(mockCanvas)
      jest.spyOn(mockCanvas, 'getContext').mockImplementation((type) => {
        if (type === 'webgl' || type === 'experimental-webgl') return mockGL
        if (type === '2d') return {}
        return null
      })

      const context = manager.createContext('webgl')

      expect(context.type).toBe('webgl')
      expect(context.canvas).toBe(mockCanvas)
      expect(context.context).toBe(mockGL)
    })

    it('creates Canvas2D context as fallback', () => {
      const mockCanvas = document.createElement('canvas')
      const mockCtx2D = {
        clearRect: jest.fn(),
        fillRect: jest.fn(),
        strokeRect: jest.fn(),
        beginPath: jest.fn(),
        closePath: jest.fn(),
        fill: jest.fn(),
        stroke: jest.fn()
      }

      jest.spyOn(document, 'createElement').mockReturnValue(mockCanvas)
      jest.spyOn(mockCanvas, 'getContext').mockImplementation((type) => {
        if (type === '2d') return mockCtx2D
        return null
      })

      const context = manager.createContext('canvas2d')

      expect(context.type).toBe('canvas2d')
      expect(context.canvas).toBe(mockCanvas)
      expect(context.context).toBe(mockCtx2D)
    })

    it('falls back through modes when primary fails', () => {
      const mockCanvas = document.createElement('canvas')
      const mockCtx2D = {}

      jest.spyOn(document, 'createElement').mockReturnValue(mockCanvas)
      jest.spyOn(mockCanvas, 'getContext').mockImplementation((type) => {
        if (type === '2d') return mockCtx2D
        return null // WebGL fails
      })

      // Try WebGL first, should fallback to Canvas2D
      const context = manager.createContext('webgl')

      expect(context.type).toBe('canvas2d')
    })
  })

  describe('Three.js Testing', () => {
    it('successfully tests Three.js with WebGL renderer', () => {
      const mockRenderer = {
        render: jest.fn(),
        dispose: jest.fn()
      }

      const context = {
        type: 'webgl' as const,
        context: {},
        canvas: {},
        renderer: mockRenderer,
        capabilities: {} as any,
        isHeadless: false,
        isDocker: false,
        performance: { initTime: 0, renderTime: 0, memoryUsage: 0 }
      }

      // Set current context manually for testing
      ;(manager as any).currentContext = context

      const result = manager.testThreeJS()

      expect(result).toBe(true)
      expect(mockRenderer.render).toHaveBeenCalled()
    })

    it('handles Three.js test failure', () => {
      const mockRenderer = {
        render: jest.fn(() => {
          throw new Error('Render failed')
        }),
        dispose: jest.fn()
      }

      const context = {
        type: 'webgl' as const,
        context: {},
        canvas: {},
        renderer: mockRenderer,
        capabilities: {} as any,
        isHeadless: false,
        isDocker: false,
        performance: { initTime: 0, renderTime: 0, memoryUsage: 0 }
      }

      ;(manager as any).currentContext = context

      const result = manager.testThreeJS()

      expect(result).toBe(false)
    })

    it('returns false when no current context', () => {
      const result = manager.testThreeJS()
      expect(result).toBe(false)
    })
  })

  describe('Performance Tracking', () => {
    it('tracks initialization time', () => {
      const originalWindow = global.window
      delete (global as any).window

      const headlessManager = new WebGLFallbackManager({ logLevel: 'none' })
      const context = headlessManager.createContext('mock')

      expect(context.performance.initTime).toBeGreaterThan(0)

      global.window = originalWindow
    })

    it('tracks render time during Three.js test', () => {
      const mockRenderer = {
        render: jest.fn(),
        dispose: jest.fn()
      }

      const context = {
        type: 'mock' as const,
        context: {},
        canvas: {},
        renderer: mockRenderer,
        capabilities: {} as any,
        isHeadless: true,
        isDocker: false,
        performance: { initTime: 0, renderTime: 0, memoryUsage: 0 }
      }

      ;(manager as any).currentContext = context

      manager.testThreeJS()

      expect(context.performance.renderTime).toBeGreaterThan(0)
    })
  })

  describe('Diagnostics', () => {
    it('provides comprehensive diagnostic information', () => {
      const diagnostics = manager.getDiagnostics()

      expect(diagnostics).toHaveProperty('capabilities')
      expect(diagnostics).toHaveProperty('currentContext')
      expect(diagnostics).toHaveProperty('environment')
      expect(diagnostics).toHaveProperty('performance')

      expect(diagnostics.environment).toHaveProperty('isHeadless')
      expect(diagnostics.environment).toHaveProperty('isDocker')
      expect(diagnostics.environment).toHaveProperty('userAgent')

      expect(diagnostics.performance).toHaveProperty('attemptCount')
      expect(diagnostics.performance).toHaveProperty('lastInitTime')
      expect(diagnostics.performance).toHaveProperty('lastRenderTime')
    })
  })

  describe('Resource Management', () => {
    it('disposes resources properly', () => {
      const mockRenderer = {
        dispose: jest.fn()
      }

      const mockCanvas = {
        remove: jest.fn()
      }

      const context = {
        type: 'webgl' as const,
        context: {},
        canvas: mockCanvas,
        renderer: mockRenderer,
        capabilities: {} as any,
        isHeadless: false,
        isDocker: false,
        performance: { initTime: 0, renderTime: 0, memoryUsage: 0 }
      }

      ;(manager as any).currentContext = context

      manager.dispose()

      expect(mockRenderer.dispose).toHaveBeenCalled()
      expect(mockCanvas.remove).toHaveBeenCalled()
    })

    it('handles disposal errors gracefully', () => {
      const mockRenderer = {
        dispose: jest.fn(() => {
          throw new Error('Disposal failed')
        })
      }

      const context = {
        type: 'webgl' as const,
        context: {},
        canvas: {},
        renderer: mockRenderer,
        capabilities: {} as any,
        isHeadless: false,
        isDocker: false,
        performance: { initTime: 0, renderTime: 0, memoryUsage: 0 }
      }

      ;(manager as any).currentContext = context

      expect(() => manager.dispose()).not.toThrow()
    })
  })
})

describe('Mock WebGL Context', () => {
  it('provides all required WebGL constants', () => {
    const { canvas, context } = createMockWebGLContext()

    expect(context.COLOR_BUFFER_BIT).toBe(0x4000)
    expect(context.DEPTH_BUFFER_BIT).toBe(0x0100)
    expect(context.TRIANGLES).toBe(0x0004)
    expect(context.FLOAT).toBe(0x1406)
    expect(context.RGBA).toBe(0x1908)
  })

  it('implements basic WebGL methods', () => {
    const { context } = createMockWebGLContext()

    expect(typeof context.clear).toBe('function')
    expect(typeof context.clearColor).toBe('function')
    expect(typeof context.enable).toBe('function')
    expect(typeof context.disable).toBe('function')
    expect(typeof context.viewport).toBe('function')
  })

  it('creates and manages mock objects', () => {
    const { context } = createMockWebGLContext()

    const buffer = context.createBuffer()
    expect(buffer).toHaveProperty('id')
    expect(buffer).toHaveProperty('type', 'buffer')

    const shader = context.createShader(context.VERTEX_SHADER)
    expect(shader).toHaveProperty('id')
    expect(shader).toHaveProperty('type', 'shader')
    expect(shader).toHaveProperty('shaderType', context.VERTEX_SHADER)

    const program = context.createProgram()
    expect(program).toHaveProperty('id')
    expect(program).toHaveProperty('type', 'program')
  })

  it('simulates context loss and recovery', () => {
    const { context } = createMockWebGLContext()

    expect(context.isContextLost()).toBe(false)

    context.loseContext()
    expect(context.isContextLost()).toBe(true)

    context.restoreContext()
    expect(context.isContextLost()).toBe(false)
  })

  it('provides mock extensions', () => {
    const { context } = createMockWebGLContext()

    const loseContextExt = context.getExtension('WEBGL_lose_context')
    expect(loseContextExt).toBeDefined()
    expect(typeof loseContextExt.loseContext).toBe('function')
    expect(typeof loseContextExt.restoreContext).toBe('function')

    const unsupportedExt = context.getExtension('UNSUPPORTED_EXTENSION')
    expect(unsupportedExt).toBeNull()
  })

  it('returns correct parameters', () => {
    const { context } = createMockWebGLContext()

    expect(context.getParameter(context.RENDERER)).toBe('Mock Software Renderer')
    expect(context.getParameter(context.VENDOR)).toBe('Seiron Fallback System')
    expect(context.getParameter(context.VERSION)).toBe('WebGL 1.0 (Mock)')
    expect(context.getParameter(context.MAX_TEXTURE_SIZE)).toBe(2048)
  })
})

describe('Helper Functions', () => {
  describe('createWebGLFallback', () => {
    it('creates fallback context with default config', () => {
      const originalWindow = global.window
      delete (global as any).window

      const context = createWebGLFallback()

      expect(context.type).toBe('mock')
      expect(context.isHeadless).toBe(true)

      global.window = originalWindow
    })

    it('creates fallback context with custom config', () => {
      const originalWindow = global.window
      delete (global as any).window

      const context = createWebGLFallback({
        fallbackWidth: 1024,
        fallbackHeight: 768,
        logLevel: 'debug'
      })

      expect(context.type).toBe('mock')
      expect(context.canvas?.width).toBe(1024)
      expect(context.canvas?.height).toBe(768)

      global.window = originalWindow
    })
  })

  describe('detectWebGLCapabilities', () => {
    it('detects capabilities using singleton manager', () => {
      const capabilities = detectWebGLCapabilities()

      expect(capabilities).toHaveProperty('webgl')
      expect(capabilities).toHaveProperty('webgl2')
      expect(capabilities).toHaveProperty('canvas2d')
      expect(capabilities).toHaveProperty('recommendedMode')
    })
  })

  describe('isHeadlessEnvironment', () => {
    it('detects headless environment', () => {
      const originalWindow = global.window
      delete (global as any).window

      expect(isHeadlessEnvironment()).toBe(true)

      global.window = originalWindow
    })

    it('detects browser environment', () => {
      // Mock Chrome runtime
      global.window.chrome = { runtime: {} } as any
      Object.defineProperty(navigator, 'webdriver', { value: false, configurable: true })

      expect(isHeadlessEnvironment()).toBe(false)
    })

    it('detects headless Chrome', () => {
      delete global.window.chrome
      expect(isHeadlessEnvironment()).toBe(true)
    })

    it('detects webdriver mode', () => {
      global.window.chrome = { runtime: {} } as any
      Object.defineProperty(navigator, 'webdriver', { value: true, configurable: true })

      expect(isHeadlessEnvironment()).toBe(true)
    })
  })
})

describe('Mock Canvas', () => {
  it('provides canvas-like interface', () => {
    const { canvas } = createMockWebGLContext()

    expect(canvas.width).toBe(800)
    expect(canvas.height).toBe(600)
    expect(canvas.style).toEqual({
      width: '800px',
      height: '600px'
    })
  })

  it('creates different context types', () => {
    const { canvas } = createMockWebGLContext()

    const webglContext = canvas.getContext('webgl')
    expect(webglContext).toBeDefined()

    const canvas2 = createMockWebGLContext().canvas
    const ctx2d = canvas2.getContext('2d')
    expect(ctx2d).toBeDefined()
  })

  it('provides mock DOM methods', () => {
    const { canvas } = createMockWebGLContext()

    const dataURL = canvas.toDataURL()
    expect(dataURL).toMatch(/^data:image\/png;base64,/)

    const rect = canvas.getBoundingClientRect()
    expect(rect.width).toBe(800)
    expect(rect.height).toBe(600)

    // Test event methods don't throw
    expect(() => {
      canvas.addEventListener('click', () => {})
      canvas.removeEventListener('click', () => {})
      canvas.dispatchEvent(new Event('click'))
    }).not.toThrow()
  })

  it('handles blob conversion', (done) => {
    const { canvas } = createMockWebGLContext()

    canvas.toBlob((blob) => {
      expect(blob).toBeInstanceOf(Blob)
      done()
    })
  })
})