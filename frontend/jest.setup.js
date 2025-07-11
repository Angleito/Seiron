require('@testing-library/jest-dom')
require('jest-canvas-mock')

// Import React for mocks
const React = require('react')

// Mock framer-motion to avoid issues in test environment
jest.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    svg: 'svg',
    circle: 'div',
    ellipse: 'div',
    path: 'div',
    polygon: 'div',
    g: 'g',
  },
  AnimatePresence: ({ children }) => children,
  useAnimation: () => ({
    start: jest.fn(),
    stop: jest.fn(),
    set: jest.fn(),
  }),
}))

// Three.js and React Three Fiber mocks will be handled in individual test files

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
}))

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 16))
global.cancelAnimationFrame = jest.fn()

// Mock performance API
Object.defineProperty(global.performance, 'now', {
  writable: true,
  value: jest.fn(() => Date.now()),
})

Object.defineProperty(global.performance, 'memory', {
  writable: true,
  value: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 10000000,
    jsHeapSizeLimit: 100000000,
  },
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock SVG methods
global.SVGElement = class SVGElement extends Element {
  getBBox() {
    return {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    }
  }
  
  getScreenCTM() {
    return {
      a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
      inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    }
  }
  
  createSVGPoint() {
    return { x: 0, y: 0, matrixTransform: () => ({ x: 0, y: 0 }) }
  }
}

// Mock touch events
global.TouchEvent = class TouchEvent extends Event {
  constructor(type, init = {}) {
    super(type, init)
    this.touches = init.touches || []
    this.targetTouches = init.targetTouches || []
    this.changedTouches = init.changedTouches || []
  }
}

// Mock pointer events
global.PointerEvent = class PointerEvent extends Event {
  constructor(type, init = {}) {
    super(type, init)
    this.pointerId = init.pointerId || 1
    this.pointerType = init.pointerType || 'mouse'
    this.clientX = init.clientX || 0
    this.clientY = init.clientY || 0
  }
}

// Mock console methods for cleaner test output
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalConsoleError.call(console, ...args)
  }
  
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('componentWillReceiveProps') ||
       args[0].includes('componentWillUpdate'))
    ) {
      return
    }
    originalConsoleWarn.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
})

