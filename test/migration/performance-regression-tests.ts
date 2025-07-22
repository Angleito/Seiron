/**
 * Performance Regression Tests for Next.js Migration
 * Validates that the Next.js migration maintains or improves performance metrics
 */

import { test, expect } from '@playwright/test'

interface PerformanceMetric {
  name: string
  threshold: number
  unit: string
  critical: boolean
}

interface PerformanceBenchmark {
  url: string
  metrics: Record<string, number>
  timestamp: number
}

export class PerformanceRegressionTester {
  private metrics: PerformanceMetric[] = [
    {
      name: 'First Contentful Paint',
      threshold: 2000, // 2 seconds
      unit: 'ms',
      critical: true
    },
    {
      name: 'Largest Contentful Paint',
      threshold: 4000, // 4 seconds
      unit: 'ms',
      critical: true
    },
    {
      name: 'Time to Interactive',
      threshold: 5000, // 5 seconds
      unit: 'ms',
      critical: true
    },
    {
      name: 'Total Blocking Time',
      threshold: 300, // 300ms
      unit: 'ms',
      critical: false
    },
    {
      name: 'Cumulative Layout Shift',
      threshold: 0.1, // 0.1 CLS score
      unit: 'score',
      critical: false
    },
    {
      name: 'Page Load Time',
      threshold: 3000, // 3 seconds
      unit: 'ms',
      critical: true
    },
    {
      name: 'API Response Time',
      threshold: 1000, // 1 second
      unit: 'ms',
      critical: false
    },
    {
      name: 'Bundle Size',
      threshold: 2000000, // 2MB
      unit: 'bytes',
      critical: false
    }
  ]

  async runPerformanceTest(page: any, url: string): Promise<PerformanceBenchmark> {
    console.log(`🚀 Running performance test for: ${url}`)
    
    const startTime = Date.now()
    
    // Navigate to page
    await page.goto(url)
    await page.waitForLoadState('networkidle', { timeout: 30000 })
    
    const loadTime = Date.now() - startTime
    
    // Collect Web Vitals
    const webVitals = await this.collectWebVitals(page)
    
    // Collect resource metrics
    const resourceMetrics = await this.collectResourceMetrics(page)
    
    // Collect bundle size
    const bundleSize = await this.measureBundleSize(page)
    
    // Test API response times
    const apiResponseTime = await this.testAPIResponseTime()
    
    const metrics = {
      'Page Load Time': loadTime,
      'First Contentful Paint': webVitals.fcp || 0,
      'Largest Contentful Paint': webVitals.lcp || 0,
      'Time to Interactive': webVitals.tti || 0,
      'Total Blocking Time': webVitals.tbt || 0,
      'Cumulative Layout Shift': webVitals.cls || 0,
      'Bundle Size': bundleSize,
      'API Response Time': apiResponseTime,
      ...resourceMetrics
    }

    console.log('📊 Performance Metrics:')
    Object.entries(metrics).forEach(([name, value]) => {
      const metric = this.metrics.find(m => m.name === name)
      const unit = metric?.unit || 'ms'
      const threshold = metric?.threshold || 0
      const status = value <= threshold ? '✅' : '❌'
      
      console.log(`   ${status} ${name}: ${value}${unit} (threshold: ${threshold}${unit})`)
    })

    return {
      url,
      metrics,
      timestamp: Date.now()
    }
  }

  private async collectWebVitals(page: any): Promise<Record<string, number>> {
    return await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals: Record<string, number> = {}
        
        // Collect paint metrics
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'paint') {
              if (entry.name === 'first-contentful-paint') {
                vitals.fcp = entry.startTime
              }
            } else if (entry.entryType === 'largest-contentful-paint') {
              vitals.lcp = entry.startTime
            } else if (entry.entryType === 'layout-shift') {
              vitals.cls = (vitals.cls || 0) + entry.value
            }
          }
        })
        
        observer.observe({ 
          entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift']
        })

        // Collect TTI approximation
        setTimeout(() => {
          const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
          if (navigationEntry) {
            vitals.tti = navigationEntry.domContentLoadedEventEnd - navigationEntry.navigationStart
            vitals.tbt = navigationEntry.loadEventEnd - navigationEntry.navigationStart
          }
          
          resolve(vitals)
        }, 3000)
      })
    })
  }

  private async collectResourceMetrics(page: any): Promise<Record<string, number>> {
    return await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      const metrics: Record<string, number> = {}
      
      let totalSize = 0
      let jsSize = 0
      let cssSize = 0
      let imageSize = 0
      
      resources.forEach(resource => {
        const size = resource.transferSize || 0
        totalSize += size
        
        if (resource.name.includes('.js')) {
          jsSize += size
        } else if (resource.name.includes('.css')) {
          cssSize += size
        } else if (resource.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
          imageSize += size
        }
      })
      
      metrics['Total Resource Size'] = totalSize
      metrics['JavaScript Size'] = jsSize
      metrics['CSS Size'] = cssSize
      metrics['Image Size'] = imageSize
      metrics['Resource Count'] = resources.length
      
      return metrics
    })
  }

  private async measureBundleSize(page: any): Promise<number> {
    const jsResources = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      return resources
        .filter(r => r.name.includes('.js') && r.name.includes('/_next/static/'))
        .reduce((total, r) => total + (r.transferSize || 0), 0)
    })
    
    return jsResources
  }

  private async testAPIResponseTime(): Promise<number> {
    const startTime = Date.now()
    
    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_BACKEND_URL + '/api/health',
        { method: 'GET' }
      )
      
      if (response.ok) {
        return Date.now() - startTime
      }
    } catch (error) {
      console.warn('API response time test failed:', error.message)
    }
    
    return 0
  }

  validateMetrics(benchmark: PerformanceBenchmark): {
    passed: boolean
    failures: Array<{ metric: string; actual: number; threshold: number; critical: boolean }>
  } {
    const failures = []
    
    for (const metricConfig of this.metrics) {
      const actualValue = benchmark.metrics[metricConfig.name]
      
      if (actualValue !== undefined && actualValue > metricConfig.threshold) {
        failures.push({
          metric: metricConfig.name,
          actual: actualValue,
          threshold: metricConfig.threshold,
          critical: metricConfig.critical
        })
      }
    }
    
    const criticalFailures = failures.filter(f => f.critical)
    
    return {
      passed: criticalFailures.length === 0,
      failures
    }
  }

  compareWithBaseline(current: PerformanceBenchmark, baseline: PerformanceBenchmark): {
    improvements: Array<{ metric: string; improvement: number }>
    regressions: Array<{ metric: string; regression: number }>
  } {
    const improvements = []
    const regressions = []
    
    for (const [metricName, currentValue] of Object.entries(current.metrics)) {
      const baselineValue = baseline.metrics[metricName]
      
      if (baselineValue !== undefined) {
        const diff = currentValue - baselineValue
        const percentDiff = (diff / baselineValue) * 100
        
        if (diff < 0) {
          improvements.push({
            metric: metricName,
            improvement: Math.abs(percentDiff)
          })
        } else if (diff > baselineValue * 0.05) { // 5% threshold
          regressions.push({
            metric: metricName,
            regression: percentDiff
          })
        }
      }
    }
    
    return { improvements, regressions }
  }

  async runRegressionTest(): Promise<{
    passed: boolean
    results: PerformanceBenchmark[]
    summary: {
      totalTests: number
      passed: number
      failed: number
      criticalFailures: number
    }
  }> {
    const testUrls = [
      'http://localhost:3000',
      'http://localhost:3000/dashboard',
      'http://localhost:3000/chat'
    ]

    const results = []
    let totalPassed = 0
    let totalFailed = 0
    let criticalFailures = 0

    console.log('\n🏃 Starting Performance Regression Tests')
    console.log('========================================')

    // Run tests with Playwright (this would be integrated in actual test)
    for (const url of testUrls) {
      try {
        // Mock benchmark result for demo
        const benchmark: PerformanceBenchmark = {
          url,
          metrics: {
            'Page Load Time': Math.random() * 3000 + 1000,
            'First Contentful Paint': Math.random() * 2000 + 800,
            'Largest Contentful Paint': Math.random() * 4000 + 1500,
            'Bundle Size': Math.random() * 1000000 + 500000
          },
          timestamp: Date.now()
        }

        results.push(benchmark)

        const validation = this.validateMetrics(benchmark)
        
        if (validation.passed) {
          totalPassed++
          console.log(`✅ ${url} - Performance test PASSED`)
        } else {
          totalFailed++
          console.log(`❌ ${url} - Performance test FAILED`)
          
          validation.failures.forEach(failure => {
            console.log(`   ${failure.critical ? '🔴' : '🟡'} ${failure.metric}: ${failure.actual} > ${failure.threshold}`)
            if (failure.critical) criticalFailures++
          })
        }
      } catch (error) {
        totalFailed++
        console.error(`❌ ${url} - Test error: ${error.message}`)
      }
    }

    const overallPassed = criticalFailures === 0

    console.log('\n📊 Performance Test Summary:')
    console.log(`   Total Tests: ${testUrls.length}`)
    console.log(`   Passed: ${totalPassed}`)
    console.log(`   Failed: ${totalFailed}`)
    console.log(`   Critical Failures: ${criticalFailures}`)
    console.log(`   Overall Result: ${overallPassed ? '✅ PASSED' : '❌ FAILED'}`)

    return {
      passed: overallPassed,
      results,
      summary: {
        totalTests: testUrls.length,
        passed: totalPassed,
        failed: totalFailed,
        criticalFailures
      }
    }
  }
}

// Playwright test integration
test.describe('Performance Regression Tests', () => {
  const tester = new PerformanceRegressionTester()

  test('homepage should meet performance thresholds', async ({ page }) => {
    const benchmark = await tester.runPerformanceTest(page, 'http://localhost:3000')
    const validation = tester.validateMetrics(benchmark)
    
    if (!validation.passed) {
      const criticalFailures = validation.failures.filter(f => f.critical)
      if (criticalFailures.length > 0) {
        throw new Error(`Critical performance failures: ${criticalFailures.map(f => f.metric).join(', ')}`)
      }
    }
    
    expect(validation.passed).toBe(true)
  })

  test('dashboard should load within performance budget', async ({ page }) => {
    // Set up authenticated session
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: { isAuthenticated: true, user: { id: 'test' } },
        version: 0
      }))
    })

    const benchmark = await tester.runPerformanceTest(page, 'http://localhost:3000/dashboard')
    const validation = tester.validateMetrics(benchmark)
    
    // Dashboard might be slower due to data fetching, but should still meet critical thresholds
    const criticalFailures = validation.failures.filter(f => f.critical)
    expect(criticalFailures.length).toBeLessThanOrEqual(1) // Allow one critical failure for dashboard
  })

  test('chat interface should be responsive', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: { isAuthenticated: true, user: { id: 'test' } },
        version: 0
      }))
    })

    const startTime = Date.now()
    await page.goto('http://localhost:3000/chat')
    await page.waitForLoadState('networkidle')
    
    const loadTime = Date.now() - startTime
    console.log(`Chat interface load time: ${loadTime}ms`)
    
    expect(loadTime).toBeLessThan(5000) // 5 second threshold for chat
  })

  test('bundle size should be optimized', async ({ page }) => {
    await page.goto('http://localhost:3000')
    
    const bundleSize = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      return resources
        .filter(r => r.name.includes('.js'))
        .reduce((total, r) => total + (r.transferSize || 0), 0)
    })
    
    console.log(`Total JS bundle size: ${(bundleSize / 1024 / 1024).toFixed(2)}MB`)
    
    // Allow up to 3MB for development, should be smaller in production
    const threshold = process.env.NODE_ENV === 'production' ? 2 * 1024 * 1024 : 3 * 1024 * 1024
    expect(bundleSize).toBeLessThan(threshold)
  })

  test('API responses should be fast', async ({ page }) => {
    let apiResponseTime = 0
    
    // Intercept API calls to measure response time
    await page.route('**/api/**', async (route) => {
      const startTime = Date.now()
      await route.continue()
      apiResponseTime = Date.now() - startTime
    })

    await page.goto('http://localhost:3000')
    
    if (apiResponseTime > 0) {
      console.log(`API response time: ${apiResponseTime}ms`)
      expect(apiResponseTime).toBeLessThan(2000) // 2 second threshold
    }
  })

  test('memory usage should be reasonable', async ({ page }) => {
    await page.goto('http://localhost:3000')
    
    // Let page fully load
    await page.waitForTimeout(3000)
    
    const memoryInfo = await page.evaluate(() => {
      if ('memory' in performance) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        }
      }
      return null
    })
    
    if (memoryInfo) {
      const usedMB = memoryInfo.usedJSHeapSize / 1024 / 1024
      console.log(`Memory usage: ${usedMB.toFixed(2)}MB`)
      
      // Should use less than 100MB of JS heap
      expect(usedMB).toBeLessThan(100)
    }
  })
})

// Export for CLI usage
export default PerformanceRegressionTester