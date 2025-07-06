/**
 * Dragon Test Setup
 * Global setup for dragon component testing
 */

import 'jest-canvas-mock'
import { TextEncoder, TextDecoder } from 'util'
import { toMatchImageSnapshot } from 'jest-image-snapshot'

// Extend Jest matchers for visual regression testing
expect.extend({ toMatchImageSnapshot })

// Global polyfills
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock performance API if not available
if (typeof global.performance === 'undefined') {
  global.performance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    getEntries: jest.fn(() => [])
  }
}

// Mock requestAnimationFrame
if (typeof global.requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (callback) => {
    return setTimeout(callback, 16)
  }
}

if (typeof global.cancelAnimationFrame === 'undefined') {
  global.cancelAnimationFrame = (id) => {
    clearTimeout(id)
  }
}

// Mock ResizeObserver
if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    constructor(callback) {
      this.callback = callback
    }
    
    observe() {
      // Mock implementation
    }
    
    unobserve() {
      // Mock implementation
    }
    
    disconnect() {
      // Mock implementation
    }
  }
}

// Mock IntersectionObserver
if (typeof global.IntersectionObserver === 'undefined') {
  global.IntersectionObserver = class IntersectionObserver {
    constructor(callback) {
      this.callback = callback
    }
    
    observe() {
      // Mock implementation
    }
    
    unobserve() {
      // Mock implementation
    }
    
    disconnect() {
      // Mock implementation
    }
  }
}

// Mock WebGL context for Three.js
const mockWebGLContext = {
  canvas: document.createElement('canvas'),
  getParameter: jest.fn(),
  getExtension: jest.fn(),
  createShader: jest.fn(),
  shaderSource: jest.fn(),
  compileShader: jest.fn(),
  createProgram: jest.fn(),
  attachShader: jest.fn(),
  linkProgram: jest.fn(),
  useProgram: jest.fn(),
  createBuffer: jest.fn(),
  bindBuffer: jest.fn(),
  bufferData: jest.fn(),
  getAttribLocation: jest.fn(),
  enableVertexAttribArray: jest.fn(),
  vertexAttribPointer: jest.fn(),
  getUniformLocation: jest.fn(),
  uniform1f: jest.fn(),
  uniform2f: jest.fn(),
  uniform3f: jest.fn(),
  uniform4f: jest.fn(),
  uniformMatrix4fv: jest.fn(),
  drawArrays: jest.fn(),
  drawElements: jest.fn(),
  clear: jest.fn(),
  clearColor: jest.fn(),
  enable: jest.fn(),
  disable: jest.fn(),
  viewport: jest.fn()
}

// Mock HTMLCanvasElement.getContext for WebGL
HTMLCanvasElement.prototype.getContext = jest.fn((contextType) => {
  if (contextType === 'webgl' || contextType === 'experimental-webgl') {
    return mockWebGLContext
  }
  if (contextType === '2d') {
    return {
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      getImageData: jest.fn(() => ({ data: new Array(4) })),
      putImageData: jest.fn(),
      createImageData: jest.fn(() => ({ data: new Array(4) })),
      setTransform: jest.fn(),
      drawImage: jest.fn(),
      save: jest.fn(),
      fillText: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      stroke: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
      rotate: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      measureText: jest.fn(() => ({ width: 0 })),
      transform: jest.fn(),
      rect: jest.fn(),
      clip: jest.fn()
    }
  }
  return null
})

// Mock HTMLMediaElement methods
Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
  writable: true,
  value: jest.fn().mockImplementation(() => Promise.resolve())
})

Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
  writable: true,
  value: jest.fn()
})

Object.defineProperty(window.HTMLMediaElement.prototype, 'load', {
  writable: true,
  value: jest.fn()
})

// Mock Web Audio API
global.AudioContext = jest.fn().mockImplementation(() => ({
  createOscillator: jest.fn(() => ({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    frequency: { value: 0 }
  })),
  createGain: jest.fn(() => ({
    connect: jest.fn(),
    gain: { value: 0 }
  })),
  destination: {}
}))

global.webkitAudioContext = global.AudioContext

// Mock Speech Recognition API
global.SpeechRecognition = jest.fn().mockImplementation(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  abort: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  continuous: false,
  interimResults: false,
  lang: 'en-US'
}))

global.webkitSpeechRecognition = global.SpeechRecognition

// Mock Speech Synthesis API
global.speechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  getVoices: jest.fn(() => []),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}

global.SpeechSynthesisUtterance = jest.fn().mockImplementation((text) => ({
  text,
  voice: null,
  volume: 1,
  rate: 1,
  pitch: 1,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}))

// Console overrides for cleaner test output
const originalError = console.error
const originalWarn = console.warn

beforeAll(() => {
  // Suppress expected warnings/errors in tests
  console.error = (...args) => {
    const message = args[0]
    if (
      typeof message === 'string' && (
        message.includes('Warning: ReactDOM.render is no longer supported') ||
        message.includes('Warning: componentWillReceiveProps has been renamed') ||
        message.includes('Three.js') ||
        message.includes('WebGL')
      )
    ) {
      return
    }
    originalError.call(console, ...args)
  }
  
  console.warn = (...args) => {
    const message = args[0]
    if (
      typeof message === 'string' && (
        message.includes('componentWillReceiveProps has been renamed') ||
        message.includes('Three.js') ||
        message.includes('WebGL')
      )
    ) {
      return
    }
    originalWarn.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
  console.warn = originalWarn
})

// Global test utilities
global.dragonTestUtils = {
  // Mock timer utilities
  advanceTimers: (ms) => {
    jest.advanceTimersByTime(ms)
  },
  
  // Mock animation frame utilities
  mockAnimationFrame: () => {
    let frameId = 0
    const callbacks = new Map()
    
    global.requestAnimationFrame = jest.fn((callback) => {
      const id = ++frameId
      callbacks.set(id, callback)
      return id
    })
    
    global.cancelAnimationFrame = jest.fn((id) => {
      callbacks.delete(id)
    })
    
    return {
      executeFrame: (timestamp = performance.now()) => {
        callbacks.forEach(callback => callback(timestamp))
        callbacks.clear()
      },
      getCallbackCount: () => callbacks.size
    }
  },
  
  // Mock WebGL utilities
  mockWebGL: () => mockWebGLContext,
  
  // Performance measurement utilities
  measurePerformance: (operation) => {
    const start = performance.now()
    const result = operation()
    const end = performance.now()
    return { result, time: end - start }
  },
  
  // Visual regression utilities
  setupVisualTests: () => {
    // Configure jest-image-snapshot
    const customConfig = {
      threshold: 0.1,
      comparisonMethod: 'ssim',
      customDiffConfig: {
        threshold: 0.1,
      },
      failureThreshold: 0.05,
      failureThresholdType: 'percent'
    }
    
    expect.extend({
      toMatchDragonSnapshot(received, identifier) {
        return toMatchImageSnapshot.call(this, received, {
          ...customConfig,
          customSnapshotIdentifier: `dragon-${identifier}`
        })
      }
    })
  }
}

// Initialize global utilities
global.dragonTestUtils.setupVisualTests()

// Export for external use
module.exports = {
  mockWebGLContext,
  dragonTestUtils: global.dragonTestUtils
}