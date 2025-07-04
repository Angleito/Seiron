const { TestEnvironment } = require('jest-environment-jsdom')

class PerformanceTestEnvironment extends TestEnvironment {
  constructor(config, context) {
    super(config, context)
    
    // Enable better performance monitoring
    this.global.performance = {
      ...this.global.performance,
      now: () => Date.now(),
      mark: (name) => {},
      measure: (name, start, end) => {},
      getEntriesByType: () => [],
      getEntriesByName: () => [],
      memory: {
        usedJSHeapSize: 1000000,
        totalJSHeapSize: 10000000,
        jsHeapSizeLimit: 100000000,
      }
    }

    // Mock high-precision timer
    let startTime = Date.now()
    this.global.performance.now = () => {
      return Date.now() - startTime + Math.random() * 0.1 // Add tiny variation
    }

    // Enhanced RAF for performance testing
    let rafCallbacks = []
    let rafId = 0
    
    this.global.requestAnimationFrame = (callback) => {
      const id = ++rafId
      rafCallbacks.push({ id, callback })
      
      // Execute immediately in test environment but with slight delay
      setTimeout(() => {
        const index = rafCallbacks.findIndex(c => c.id === id)
        if (index !== -1) {
          const { callback } = rafCallbacks.splice(index, 1)[0]
          callback(this.global.performance.now())
        }
      }, 16) // Simulate 60fps
      
      return id
    }

    this.global.cancelAnimationFrame = (id) => {
      const index = rafCallbacks.findIndex(c => c.id === id)
      if (index !== -1) {
        rafCallbacks.splice(index, 1)
      }
    }

    // Simulate frame drops occasionally for realistic testing
    let frameCount = 0
    const originalRAF = this.global.requestAnimationFrame
    this.global.requestAnimationFrame = (callback) => {
      frameCount++
      // Simulate frame drop every 100 frames (1% drop rate)
      const delay = frameCount % 100 === 0 ? 33 : 16
      return originalRAF(() => {
        setTimeout(() => callback(this.global.performance.now()), delay)
      })
    }
  }

  async setup() {
    await super.setup()
    
    // Add performance testing globals
    this.global.PERFORMANCE_BUDGETS = {
      RENDER_TIME: 16, // 60fps = 16.67ms per frame
      INTERACTION_RESPONSE: 100, // Interactions should respond within 100ms
      MEMORY_LIMIT: 50 * 1024 * 1024, // 50MB memory limit
      BUNDLE_SIZE: 200 * 1024, // 200KB bundle size limit
    }
  }

  async teardown() {
    await super.teardown()
  }
}

module.exports = PerformanceTestEnvironment