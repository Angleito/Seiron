// Performance testing setup

// Enhanced performance monitoring
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      frameCount: 0,
      frameTimes: [],
      renderStart: 0,
      memorySnapshots: [],
    }
    this.rafId = null
  }

  startMonitoring() {
    this.metrics.renderStart = performance.now()
    this.scheduleFrame()
  }

  stopMonitoring() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    return this.getMetrics()
  }

  scheduleFrame() {
    this.rafId = requestAnimationFrame((timestamp) => {
      this.recordFrame(timestamp)
      this.scheduleFrame()
    })
  }

  recordFrame(timestamp) {
    if (this.metrics.frameCount > 0) {
      const frameTime = timestamp - this.lastFrameTime
      this.metrics.frameTimes.push(frameTime)
    }
    this.lastFrameTime = timestamp
    this.metrics.frameCount++

    // Record memory usage every 10 frames
    if (this.metrics.frameCount % 10 === 0 && performance.memory) {
      this.metrics.memorySnapshots.push({
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
        timestamp
      })
    }
  }

  getMetrics() {
    const frameTimes = this.metrics.frameTimes
    const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
    const fps = 1000 / avgFrameTime
    const frameDrops = frameTimes.filter(time => time > 20).length // 20ms = 50fps threshold
    
    const memoryUsage = performance.memory ? {
      peak: Math.max(...this.metrics.memorySnapshots.map(s => s.used)),
      average: this.metrics.memorySnapshots.reduce((a, s) => a + s.used, 0) / this.metrics.memorySnapshots.length,
      growth: this.metrics.memorySnapshots.length > 1 
        ? this.metrics.memorySnapshots[this.metrics.memorySnapshots.length - 1].used - this.metrics.memorySnapshots[0].used
        : 0
    } : null

    return {
      fps: Math.round(fps),
      averageFrameTime: Math.round(avgFrameTime * 100) / 100,
      frameDrops,
      totalFrames: this.metrics.frameCount,
      memoryUsage,
      duration: performance.now() - this.metrics.renderStart
    }
  }
}

// Global performance utilities
global.createPerformanceMonitor = () => new PerformanceMonitor()

// Performance assertion helpers
global.expectGoodPerformance = (metrics, requirements = {}) => {
  const {
    minFps = 30,
    maxFrameDrops = 5,
    maxMemoryGrowth = 10 * 1024 * 1024, // 10MB
    maxAverageFrameTime = 33.33 // 30fps
  } = requirements

  const errors = []

  if (metrics.fps < minFps) {
    errors.push(`FPS too low: ${metrics.fps} < ${minFps}`)
  }

  if (metrics.frameDrops > maxFrameDrops) {
    errors.push(`Too many frame drops: ${metrics.frameDrops} > ${maxFrameDrops}`)
  }

  if (metrics.averageFrameTime > maxAverageFrameTime) {
    errors.push(`Frame time too high: ${metrics.averageFrameTime}ms > ${maxAverageFrameTime}ms`)
  }

  if (metrics.memoryUsage && metrics.memoryUsage.growth > maxMemoryGrowth) {
    errors.push(`Memory growth too high: ${metrics.memoryUsage.growth} bytes > ${maxMemoryGrowth} bytes`)
  }

  if (errors.length > 0) {
    throw new Error(`Performance requirements not met:\n${errors.join('\n')}`)
  }

  return true
}

// Stress testing utilities
global.stressTest = async (testFunction, iterations = 100, concurrency = 1) => {
  const results = []
  const batches = []
  
  for (let i = 0; i < iterations; i += concurrency) {
    const batch = []
    for (let j = 0; j < concurrency && (i + j) < iterations; j++) {
      batch.push(testFunction(i + j))
    }
    batches.push(batch)
  }

  for (const batch of batches) {
    const batchResults = await Promise.all(batch)
    results.push(...batchResults)
  }

  return results
}

// Memory leak detection
global.detectMemoryLeaks = async (testFunction, iterations = 10) => {
  const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0
  const memorySnapshots = []

  for (let i = 0; i < iterations; i++) {
    await testFunction(i)
    
    // Force garbage collection if available (in test environment)
    if (global.gc) {
      global.gc()
    }
    
    if (performance.memory) {
      memorySnapshots.push(performance.memory.usedJSHeapSize)
    }
  }

  const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0
  const memoryGrowth = finalMemory - initialMemory
  const maxGrowth = 5 * 1024 * 1024 // 5MB threshold

  return {
    initialMemory,
    finalMemory,
    memoryGrowth,
    snapshots: memorySnapshots,
    hasLeak: memoryGrowth > maxGrowth,
    threshold: maxGrowth
  }
}

// Animation frame testing utility
global.waitForAnimationFrames = (count = 1) => {
  return new Promise(resolve => {
    let remaining = count
    const tick = () => {
      remaining--
      if (remaining <= 0) {
        resolve()
      } else {
        requestAnimationFrame(tick)
      }
    }
    requestAnimationFrame(tick)
  })
}

// Performance benchmarking
global.benchmark = async (name, testFunction, iterations = 1000) => {
  const times = []
  
  // Warmup
  for (let i = 0; i < Math.min(10, iterations); i++) {
    await testFunction()
  }

  // Actual benchmark
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    await testFunction()
    const end = performance.now()
    times.push(end - start)
  }

  const sortedTimes = times.sort((a, b) => a - b)
  const average = times.reduce((a, b) => a + b) / times.length
  const median = sortedTimes[Math.floor(sortedTimes.length / 2)]
  const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)]
  const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)]

  return {
    name,
    iterations,
    average: Math.round(average * 100) / 100,
    median: Math.round(median * 100) / 100,
    p95: Math.round(p95 * 100) / 100,
    p99: Math.round(p99 * 100) / 100,
    min: Math.round(sortedTimes[0] * 100) / 100,
    max: Math.round(sortedTimes[sortedTimes.length - 1] * 100) / 100,
    times: sortedTimes
  }
}