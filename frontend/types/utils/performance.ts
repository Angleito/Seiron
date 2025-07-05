// Performance utility types

import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import * as O from 'fp-ts/Option'

// Performance Metrics Types
export interface PerformanceMetric {
  name: string
  value: number
  unit: string
  timestamp: number
  category: 'memory' | 'cpu' | 'network' | 'rendering' | 'user' | 'custom'
  threshold?: {
    warning: number
    critical: number
  }
}

export interface PerformanceReport {
  id: string
  timestamp: number
  duration: number
  metrics: PerformanceMetric[]
  summary: PerformanceSummary
  recommendations: PerformanceRecommendation[]
  deviceInfo: DeviceInfo
  browserInfo: BrowserInfo
}

export interface PerformanceSummary {
  overall: 'excellent' | 'good' | 'needs-improvement' | 'poor'
  score: number // 0-100
  categories: Record<string, {
    score: number
    status: 'excellent' | 'good' | 'needs-improvement' | 'poor'
    impact: 'low' | 'medium' | 'high'
  }>
  keyMetrics: {
    firstContentfulPaint: number
    largestContentfulPaint: number
    firstInputDelay: number
    cumulativeLayoutShift: number
    timeToInteractive: number
  }
}

export interface PerformanceRecommendation {
  id: string
  category: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  impact: string
  effort: 'low' | 'medium' | 'high'
  implementation: {
    steps: string[]
    code?: string
    resources?: string[]
  }
  expectedImprovement: {
    metric: string
    value: number
    unit: string
  }
}

export interface DeviceInfo {
  userAgent: string
  platform: string
  architecture: string
  cores: number
  memory: number
  connection: {
    effectiveType: string
    downlink: number
    rtt: number
  }
  screen: {
    width: number
    height: number
    pixelRatio: number
  }
  viewport: {
    width: number
    height: number
  }
}

export interface BrowserInfo {
  name: string
  version: string
  engine: string
  features: {
    webGL: boolean
    webGL2: boolean
    webAssembly: boolean
    serviceWorker: boolean
    intersectionObserver: boolean
    resizeObserver: boolean
    performanceObserver: boolean
  }
}

// Performance Monitoring Types
export interface PerformanceMonitorConfig {
  enabled: boolean
  sampleRate: number // 0-1
  bufferSize: number
  reportInterval: number
  thresholds: Record<string, {
    warning: number
    critical: number
  }>
  categories: Array<'memory' | 'cpu' | 'network' | 'rendering' | 'user' | 'custom'>
  autoReport: boolean
  sendToAnalytics: boolean
  debugMode: boolean
}

export interface PerformanceMonitor {
  config: PerformanceMonitorConfig
  isMonitoring: boolean
  metrics: PerformanceMetric[]
  reports: PerformanceReport[]
  start: () => TE.TaskEither<Error, void>
  stop: () => void
  reset: () => void
  addMetric: (metric: PerformanceMetric) => void
  generateReport: () => PerformanceReport
  getMetrics: (category?: string) => PerformanceMetric[]
  subscribe: (callback: (metric: PerformanceMetric) => void) => () => void
}

// Animation Performance Types
export interface AnimationPerformanceConfig {
  targetFPS: number
  maxFrameTime: number
  enableAdaptiveQuality: boolean
  qualityLevels: QualityLevel[]
  monitorInterval: number
  onQualityChange: (level: QualityLevel) => void
  onPerformanceIssue: (issue: PerformanceIssue) => void
}

export interface QualityLevel {
  name: string
  level: number // 0-10
  settings: {
    particleCount: number
    animationComplexity: number
    renderDistance: number
    shadowQuality: number
    effectsEnabled: boolean
    antiAliasing: boolean
  }
  requirements: {
    minFPS: number
    maxMemoryUsage: number
    maxCPUUsage: number
  }
}

export interface PerformanceIssue {
  type: 'fps-drop' | 'memory-leak' | 'cpu-spike' | 'frame-skip' | 'layout-thrash'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  metrics: PerformanceMetric[]
  timestamp: number
  suggestions: string[]
}

export interface AnimationPerformanceMetrics {
  fps: number
  averageFPS: number
  frameTime: number
  droppedFrames: number
  memoryUsage: number
  cpuUsage: number
  renderTime: number
  scriptTime: number
  layoutTime: number
  paintTime: number
  qualityLevel: number
  adaptations: number
}

// Bundle Performance Types
export interface BundleAnalysis {
  totalSize: number
  gzippedSize: number
  brotliSize: number
  chunks: BundleChunk[]
  dependencies: BundleDependency[]
  duplicates: BundleDuplicate[]
  recommendations: BundleRecommendation[]
  treemap: TreemapNode[]
}

export interface BundleChunk {
  id: string
  name: string
  size: number
  gzippedSize: number
  modules: BundleModule[]
  isEntry: boolean
  isAsync: boolean
  parents: string[]
  children: string[]
}

export interface BundleModule {
  id: string
  name: string
  size: number
  reasons: string[]
  source?: string
  isAsset: boolean
  isOptimized: boolean
}

export interface BundleDependency {
  name: string
  version: string
  size: number
  usageCount: number
  isTreeShakeable: boolean
  alternativeSuggestions?: string[]
}

export interface BundleDuplicate {
  name: string
  versions: string[]
  totalSize: number
  instances: Array<{
    chunk: string
    version: string
    size: number
  }>
}

export interface BundleRecommendation {
  type: 'code-split' | 'tree-shake' | 'replace-dependency' | 'lazy-load' | 'compress'
  priority: 'low' | 'medium' | 'high'
  description: string
  potentialSavings: number
  implementation: string
}

export interface TreemapNode {
  name: string
  size: number
  children?: TreemapNode[]
  path: string
  type: 'chunk' | 'module' | 'dependency'
}

// Loading Performance Types
export interface LoadingPerformanceMetrics {
  navigation: {
    startTime: number
    domContentLoaded: number
    loadComplete: number
    firstPaint: number
    firstContentfulPaint: number
    largestContentfulPaint: number
    firstInputDelay: number
    cumulativeLayoutShift: number
    timeToInteractive: number
  }
  resources: ResourceMetric[]
  errors: LoadingError[]
  userExperience: {
    bounceRate: number
    conversionRate: number
    userSatisfaction: number
  }
}

export interface ResourceMetric {
  name: string
  type: 'script' | 'stylesheet' | 'image' | 'font' | 'fetch' | 'xmlhttprequest'
  size: number
  loadTime: number
  cacheHit: boolean
  priority: 'high' | 'medium' | 'low'
  blocking: boolean
  critical: boolean
}

export interface LoadingError {
  type: 'network' | 'javascript' | 'css' | 'image' | 'font'
  message: string
  resource: string
  timestamp: number
  impact: 'low' | 'medium' | 'high'
  userAgent: string
}

// Memory Performance Types
export interface MemoryPerformanceMetrics {
  heap: {
    used: number
    total: number
    limit: number
  }
  nonHeap: {
    used: number
    total: number
  }
  external: number
  gc: {
    collections: number
    duration: number
    freed: number
  }
  leaks: MemoryLeak[]
  pressure: 'low' | 'medium' | 'high' | 'critical'
}

export interface MemoryLeak {
  id: string
  type: 'dom-nodes' | 'event-listeners' | 'closures' | 'detached-objects'
  description: string
  size: number
  growth: number
  source?: string
  stackTrace?: string[]
  suggestions: string[]
}

// Network Performance Types
export interface NetworkPerformanceMetrics {
  requests: NetworkRequest[]
  bandwidth: {
    download: number
    upload: number
    latency: number
  }
  caching: {
    hitRate: number
    missRate: number
    efficiency: number
  }
  optimization: {
    compression: boolean
    http2: boolean
    preload: string[]
    prefetch: string[]
  }
  errors: NetworkError[]
}

export interface NetworkRequest {
  id: string
  url: string
  method: string
  status: number
  size: number
  compressedSize?: number
  duration: number
  timing: {
    dns: number
    connect: number
    ssl: number
    send: number
    wait: number
    receive: number
  }
  cacheStatus: 'hit' | 'miss' | 'stale'
  priority: 'high' | 'medium' | 'low'
  type: 'document' | 'script' | 'stylesheet' | 'image' | 'font' | 'fetch' | 'xhr'
}

export interface NetworkError {
  url: string
  type: 'timeout' | 'abort' | 'error' | 'offline'
  status?: number
  message: string
  timestamp: number
  retryCount: number
}

// Performance Observer Types
export interface PerformanceObserverConfig {
  entryTypes: string[]
  buffered: boolean
  callback: (entries: PerformanceEntry[]) => void
}

export interface CustomPerformanceEntry {
  name: string
  entryType: string
  startTime: number
  duration: number
  detail?: Record<string, any>
}

// Performance Testing Types
export interface PerformanceTest {
  id: string
  name: string
  description: string
  category: string
  setup?: () => Promise<void>
  test: () => Promise<PerformanceTestResult>
  teardown?: () => Promise<void>
  expectations: PerformanceExpectation[]
}

export interface PerformanceTestResult {
  passed: boolean
  metrics: PerformanceMetric[]
  duration: number
  errors: Error[]
  warnings: string[]
}

export interface PerformanceExpectation {
  metric: string
  operator: '<' | '<=' | '>' | '>=' | '==' | '!='
  value: number
  description: string
}

export interface PerformanceTestSuite {
  name: string
  tests: PerformanceTest[]
  globalSetup?: () => Promise<void>
  globalTeardown?: () => Promise<void>
  config: {
    timeout: number
    retries: number
    parallel: boolean
  }
}

// Functional Types
export type PerformanceTask<T> = TE.TaskEither<Error, T>
export type PerformanceValidator<T> = (input: unknown) => E.Either<Error, T>
export type PerformanceTransformer<A, B> = (input: A) => B
export type PerformanceReader<T> = (config: PerformanceMonitorConfig) => T

// Performance Hook Types
export interface UsePerformanceMonitorReturn {
  metrics: PerformanceMetric[]
  report: O.Option<PerformanceReport>
  isMonitoring: boolean
  start: () => TE.TaskEither<Error, void>
  stop: () => void
  reset: () => void
  addMetric: (name: string, value: number, category?: string) => void
  generateReport: () => PerformanceReport
  subscribe: (callback: (metric: PerformanceMetric) => void) => () => void
}

export interface UseAnimationPerformanceReturn {
  metrics: AnimationPerformanceMetrics
  qualityLevel: number
  isAdaptive: boolean
  setQualityLevel: (level: number) => void
  enableAdaptive: () => void
  disableAdaptive: () => void
  optimize: () => void
  getRecommendations: () => string[]
}

export interface UseBundleAnalysisReturn {
  analysis: O.Option<BundleAnalysis>
  isAnalyzing: boolean
  analyze: () => TE.TaskEither<Error, BundleAnalysis>
  getRecommendations: () => BundleRecommendation[]
  exportReport: (format: 'json' | 'html' | 'csv') => string
}

export interface UseLoadingPerformanceReturn {
  metrics: LoadingPerformanceMetrics
  isLoading: boolean
  startMeasurement: () => void
  endMeasurement: () => void
  getScore: () => number
  getRecommendations: () => string[]
  exportMetrics: () => string
}

// Constants
export const PERFORMANCE_THRESHOLDS = {
  FPS: {
    EXCELLENT: 60,
    GOOD: 45,
    NEEDS_IMPROVEMENT: 30,
    POOR: 15
  },
  MEMORY: {
    WARNING: 100 * 1024 * 1024, // 100MB
    CRITICAL: 500 * 1024 * 1024 // 500MB
  },
  LOAD_TIME: {
    EXCELLENT: 1000,
    GOOD: 2500,
    NEEDS_IMPROVEMENT: 4000,
    POOR: 8000
  },
  FIRST_CONTENTFUL_PAINT: {
    GOOD: 1800,
    NEEDS_IMPROVEMENT: 3000
  },
  LARGEST_CONTENTFUL_PAINT: {
    GOOD: 2500,
    NEEDS_IMPROVEMENT: 4000
  },
  FIRST_INPUT_DELAY: {
    GOOD: 100,
    NEEDS_IMPROVEMENT: 300
  },
  CUMULATIVE_LAYOUT_SHIFT: {
    GOOD: 0.1,
    NEEDS_IMPROVEMENT: 0.25
  }
} as const