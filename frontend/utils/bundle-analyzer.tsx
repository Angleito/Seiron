import React from 'react'

/**
 * Bundle size analyzer and performance monitoring utility
 */

interface BundleMetrics {
  chunkName: string
  size: number
  loadTime: number
  isLazy: boolean
  dependencies: string[]
}

interface LoadingMetrics {
  featureName: string
  loadStartTime: number
  loadEndTime: number
  totalTime: number
  status: 'loading' | 'loaded' | 'error'
  error?: Error
}

export class BundleAnalyzer {
  private static instance: BundleAnalyzer
  private metrics: BundleMetrics[] = []
  private loadingMetrics: Map<string, LoadingMetrics> = new Map()
  private observers: Map<string, PerformanceObserver> = new Map()

  static getInstance(): BundleAnalyzer {
    if (!BundleAnalyzer.instance) {
      BundleAnalyzer.instance = new BundleAnalyzer()
    }
    return BundleAnalyzer.instance
  }

  /**
   * Start monitoring bundle loading performance
   */
  startMonitoring() {
    if (typeof window === 'undefined') return

    // Monitor resource loading
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource' && entry.name.includes('.js')) {
          this.recordBundleMetrics(entry as PerformanceResourceTiming)
        }
      }
    })

    observer.observe({ entryTypes: ['resource'] })
    this.observers.set('resource', observer)

    // Monitor navigation timing
    const navigationObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          this.recordNavigationMetrics(entry as PerformanceNavigationTiming)
        }
      }
    })

    navigationObserver.observe({ entryTypes: ['navigation'] })
    this.observers.set('navigation', navigationObserver)
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers.clear()
  }

  /**
   * Track lazy component loading
   */
  trackLazyLoading(featureName: string): {
    start: () => void
    end: () => void
    error: (error: Error) => void
  } {
    const start = () => {
      this.loadingMetrics.set(featureName, {
        featureName,
        loadStartTime: performance.now(),
        loadEndTime: 0,
        totalTime: 0,
        status: 'loading'
      })
    }

    const end = () => {
      const metric = this.loadingMetrics.get(featureName)
      if (metric) {
        const endTime = performance.now()
        metric.loadEndTime = endTime
        metric.totalTime = endTime - metric.loadStartTime
        metric.status = 'loaded'
        this.loadingMetrics.set(featureName, metric)
      }
    }

    const error = (error: Error) => {
      const metric = this.loadingMetrics.get(featureName)
      if (metric) {
        metric.status = 'error'
        metric.error = error
        this.loadingMetrics.set(featureName, metric)
      }
    }

    return { start, end, error }
  }

  /**
   * Get bundle size estimation
   */
  getBundleSize(chunkName: string): number {
    const metric = this.metrics.find(m => m.chunkName === chunkName)
    return metric?.size || 0
  }

  /**
   * Get loading performance metrics
   */
  getLoadingMetrics(): LoadingMetrics[] {
    return Array.from(this.loadingMetrics.values())
  }

  /**
   * Get bundle optimization report
   */
  getBundleReport(): {
    totalSize: number
    lazyChunks: number
    averageLoadTime: number
    metrics: BundleMetrics[]
    recommendations: string[]
  } {
    const totalSize = this.metrics.reduce((sum, m) => sum + m.size, 0)
    const lazyChunks = this.metrics.filter(m => m.isLazy).length
    const loadTimes = this.metrics.map(m => m.loadTime).filter(t => t > 0)
    const averageLoadTime = loadTimes.length > 0 
      ? loadTimes.reduce((sum, t) => sum + t, 0) / loadTimes.length 
      : 0

    const recommendations = this.generateRecommendations()

    return {
      totalSize,
      lazyChunks,
      averageLoadTime,
      metrics: this.metrics,
      recommendations
    }
  }

  /**
   * Check if lazy loading is working correctly
   */
  verifyLazyLoading(): {
    isWorking: boolean
    issues: string[]
    lazyComponents: string[]
  } {
    const issues: string[] = []
    const lazyComponents: string[] = []

    // Check if lazy components are properly loaded
    const lazyFeatures = [
      'dragon-animations',
      'voice-features', 
      'performance-monitoring'
    ]

    for (const feature of lazyFeatures) {
      const metric = this.loadingMetrics.get(feature)
      if (!metric) {
        issues.push(`${feature} metrics not found`)
      } else if (metric.status === 'error') {
        issues.push(`${feature} failed to load: ${metric.error?.message}`)
      } else if (metric.status === 'loaded') {
        lazyComponents.push(feature)
      }
    }

    return {
      isWorking: issues.length === 0,
      issues,
      lazyComponents
    }
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): string {
    const report = this.getBundleReport()
    const loadingMetrics = this.getLoadingMetrics()
    const lazyLoadingStatus = this.verifyLazyLoading()

    return JSON.stringify({
      timestamp: new Date().toISOString(),
      bundleReport: report,
      loadingMetrics,
      lazyLoadingStatus
    }, null, 2)
  }

  private recordBundleMetrics(entry: PerformanceResourceTiming) {
    const url = new URL(entry.name)
    const chunkName = this.extractChunkName(url.pathname)
    
    if (!chunkName) return

    const size = entry.transferSize || entry.encodedBodySize || 0
    const loadTime = entry.responseEnd - entry.requestStart
    const isLazy = this.isLazyChunk(chunkName)

    this.metrics.push({
      chunkName,
      size,
      loadTime,
      isLazy,
      dependencies: this.extractDependencies(entry)
    })
  }

  private recordNavigationMetrics(entry: PerformanceNavigationTiming) {
    // Record initial page load metrics
    console.log('Navigation timing:', {
      domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      loadComplete: entry.loadEventEnd - entry.loadEventStart,
      totalTime: entry.loadEventEnd - entry.requestStart
    })
  }

  private extractChunkName(pathname: string): string | null {
    const match = pathname.match(/\/js\/([^-]+)-[^.]+\.js$/)
    return match?.[1] ?? null
  }

  private isLazyChunk(chunkName: string): boolean {
    const lazyChunks = [
      'dragon-animations',
      'voice-features',
      'performance-monitoring',
      'chat-features',
      'portfolio-features'
    ]
    return lazyChunks.includes(chunkName)
  }

  private extractDependencies(entry: PerformanceResourceTiming): string[] {
    // This would need to be implemented based on actual bundle analysis
    return []
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = []
    const report = this.getBundleReport()

    if (report.totalSize > 2000000) { // 2MB
      recommendations.push('Consider splitting large bundles further')
    }

    if (report.averageLoadTime > 1000) { // 1 second
      recommendations.push('Optimize chunk loading performance')
    }

    if (report.lazyChunks < 3) {
      recommendations.push('Consider lazy loading more components')
    }

    return recommendations
  }
}

/**
 * Hook for monitoring bundle performance
 */
export const useBundleAnalyzer = () => {
  const analyzer = BundleAnalyzer.getInstance()
  
  React.useEffect(() => {
    analyzer.startMonitoring()
    return () => analyzer.stopMonitoring()
  }, [])

  return {
    trackLazyLoading: analyzer.trackLazyLoading.bind(analyzer),
    getBundleReport: analyzer.getBundleReport.bind(analyzer),
    verifyLazyLoading: analyzer.verifyLazyLoading.bind(analyzer),
    exportMetrics: analyzer.exportMetrics.bind(analyzer)
  }
}

/**
 * Component for displaying bundle analysis results
 */
export const BundleAnalysisReport: React.FC = () => {
  const { getBundleReport, verifyLazyLoading } = useBundleAnalyzer()
  const [report, setReport] = React.useState<ReturnType<typeof getBundleReport> | null>(null)
  const [lazyStatus, setLazyStatus] = React.useState<ReturnType<typeof verifyLazyLoading> | null>(null)

  React.useEffect(() => {
    const interval = setInterval(() => {
      setReport(getBundleReport())
      setLazyStatus(verifyLazyLoading())
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  if (!report || !lazyStatus) return null

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="font-bold mb-2">Bundle Analysis Report</h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p><strong>Total Size:</strong> {(report.totalSize / 1024).toFixed(2)} KB</p>
          <p><strong>Lazy Chunks:</strong> {report.lazyChunks}</p>
          <p><strong>Avg Load Time:</strong> {report.averageLoadTime.toFixed(2)} ms</p>
        </div>
        <div>
          <p><strong>Lazy Loading:</strong> {lazyStatus.isWorking ? '✅ Working' : '❌ Issues'}</p>
          <p><strong>Lazy Components:</strong> {lazyStatus.lazyComponents.length}</p>
        </div>
      </div>
      {report.recommendations.length > 0 && (
        <div className="mt-2">
          <strong>Recommendations:</strong>
          <ul className="list-disc list-inside text-sm">
            {report.recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

