/**
 * Performance Testing Utilities for React Optimizations
 * 
 * This file provides utilities to measure and verify the performance improvements
 * from React.memo, useMemo, useCallback, and useEffect optimizations.
 */

import React, { Profiler, ProfilerOnRenderCallback, useState, useEffect } from 'react'
import { logger } from '@lib/logger'

// Performance metrics interface
interface PerformanceMetrics {
  componentName: string
  renderCount: number
  totalRenderTime: number
  averageRenderTime: number
  lastRenderTime: number
  memoizationHits: number
  reRenderReasons: string[]
}

// Global performance store
const performanceStore = new Map<string, PerformanceMetrics>()

/**
 * Performance profiler wrapper component
 * Tracks render performance for optimized components
 */
export function PerformanceProfiler({ 
  id, 
  children 
}: { 
  id: string
  children: React.ReactNode 
}) {
  const onRender: ProfilerOnRenderCallback = (
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime
  ) => {
    const existing = performanceStore.get(id) || {
      componentName: id,
      renderCount: 0,
      totalRenderTime: 0,
      averageRenderTime: 0,
      lastRenderTime: 0,
      memoizationHits: 0,
      reRenderReasons: []
    }

    const updated: PerformanceMetrics = {
      ...existing,
      renderCount: existing.renderCount + 1,
      totalRenderTime: existing.totalRenderTime + actualDuration,
      lastRenderTime: actualDuration,
      averageRenderTime: (existing.totalRenderTime + actualDuration) / (existing.renderCount + 1)
    }

    performanceStore.set(id, updated)

    // Log performance data in development
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`Performance - ${id}:`, {
        phase,
        actualDuration: `${actualDuration.toFixed(2)}ms`,
        baseDuration: `${baseDuration.toFixed(2)}ms`,
        renderCount: updated.renderCount,
        averageRenderTime: `${updated.averageRenderTime.toFixed(2)}ms`
      })
    }
  }

  return (
    <Profiler id={id} onRender={onRender}>
      {children}
    </Profiler>
  )
}

/**
 * Hook to track memoization effectiveness
 */
export function useMemoizationTracker(componentName: string, dependencies: any[]) {
  const [prevDeps, setPrevDeps] = useState<any[]>(dependencies)
  
  useEffect(() => {
    const existing = performanceStore.get(componentName) || {
      componentName,
      renderCount: 0,
      totalRenderTime: 0,
      averageRenderTime: 0,
      lastRenderTime: 0,
      memoizationHits: 0,
      reRenderReasons: []
    }

    // Check if dependencies changed
    const depsChanged = dependencies.some((dep, index) => dep !== prevDeps[index])
    
    if (!depsChanged && prevDeps.length > 0) {
      // Memoization hit - dependencies didn't change
      existing.memoizationHits++
    } else if (depsChanged) {
      // Track which dependencies changed
      const changedDeps = dependencies
        .map((dep, index) => dep !== prevDeps[index] ? `dep[${index}]` : null)
        .filter(Boolean) as string[]
      
      existing.reRenderReasons.push(`Dependencies changed: ${changedDeps.join(', ')}`)
    }

    performanceStore.set(componentName, existing)
    setPrevDeps(dependencies)
  }, dependencies)
}

/**
 * Performance test component for Dragon components
 */
export function DragonPerformanceTest() {
  const [testResults, setTestResults] = useState<PerformanceMetrics[]>([])
  
  const runPerformanceTest = () => {
    const results = Array.from(performanceStore.values())
    setTestResults(results)
    
    // Log comprehensive results
    logger.info('Performance Test Results:', {
      totalComponents: results.length,
      results: results.map(r => ({
        component: r.componentName,
        renders: r.renderCount,
        avgTime: `${r.averageRenderTime.toFixed(2)}ms`,
        memoHits: r.memoizationHits,
        efficiency: r.memoizationHits > 0 ? `${((r.memoizationHits / r.renderCount) * 100).toFixed(1)}%` : '0%'
      }))
    })
  }

  const clearResults = () => {
    performanceStore.clear()
    setTestResults([])
  }

  if (process.env.NODE_ENV !== 'development') {
    return null // Only show in development
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg max-w-md z-50">
      <h3 className="text-lg font-bold mb-2">🐉 Performance Monitor</h3>
      
      <div className="space-y-2 mb-4">
        <button
          onClick={runPerformanceTest}
          className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
        >
          Run Test
        </button>
        <button
          onClick={clearResults}
          className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-sm ml-2"
        >
          Clear
        </button>
      </div>

      {testResults.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          <h4 className="font-semibold text-orange-400">Test Results:</h4>
          {testResults.map((result) => (
            <div key={result.componentName} className="text-xs bg-gray-800 p-2 rounded">
              <div className="font-medium text-yellow-400">{result.componentName}</div>
              <div>Renders: {result.renderCount}</div>
              <div>Avg Time: {result.averageRenderTime.toFixed(2)}ms</div>
              <div>Memo Hits: {result.memoizationHits}</div>
              <div className="text-green-400">
                Efficiency: {result.memoizationHits > 0 ? 
                  `${((result.memoizationHits / result.renderCount) * 100).toFixed(1)}%` : 
                  '0%'
                }
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Higher-order component to wrap components with performance tracking
 */
export function withPerformanceTracking<T extends object>(
  Component: React.ComponentType<T>,
  componentName: string
) {
  const WrappedComponent = React.memo((props: T) => {
    return (
      <PerformanceProfiler id={componentName}>
        <Component {...props} />
      </PerformanceProfiler>
    )
  })

  WrappedComponent.displayName = `withPerformanceTracking(${componentName})`
  return WrappedComponent
}

/**
 * Get performance metrics for a specific component
 */
export function getPerformanceMetrics(componentName: string): PerformanceMetrics | null {
  return performanceStore.get(componentName) || null
}

/**
 * Get all performance metrics
 */
export function getAllPerformanceMetrics(): PerformanceMetrics[] {
  return Array.from(performanceStore.values())
}

/**
 * Reset performance metrics for a component
 */
export function resetPerformanceMetrics(componentName?: string) {
  if (componentName) {
    performanceStore.delete(componentName)
  } else {
    performanceStore.clear()
  }
}

/**
 * Performance optimization verification checklist
 */
export const OPTIMIZATION_CHECKLIST = {
  reactMemo: {
    name: 'React.memo Implementation',
    description: 'Components wrapped with React.memo to prevent unnecessary re-renders',
    components: [
      'SimpleDragonSprite',
      'VoiceEnabledChat',
      'PortfolioSidebar'
    ]
  },
  useMemo: {
    name: 'useMemo for Expensive Calculations',
    description: 'Heavy computations memoized with proper dependencies',
    optimizations: [
      'Voice configurations',
      'Asset calculations'
    ]
  },
  useCallback: {
    name: 'useCallback for Event Handlers',
    description: 'Event handlers wrapped with useCallback to prevent prop changes',
    handlers: [
      'Voice command handlers',
      'Portfolio fetch functions',
      'Simple interaction callbacks'
    ]
  },
  useEffect: {
    name: 'Optimized useEffect Dependencies',
    description: 'Combined related effects and proper dependency arrays',
    improvements: [
      'Combined callback effects',
      'Proper cleanup functions',
      'Minimal dependency arrays'
    ]
  }
} as const

/**
 * Validate optimization implementation
 */
export function validateOptimizations(): Record<string, boolean> {
  return {
    performanceProfilerActive: performanceStore.size > 0,
    componentsTracked: performanceStore.size >= 5,
    memoizationEffective: Array.from(performanceStore.values())
      .some(metric => metric.memoizationHits > 0),
    renderTimesAcceptable: Array.from(performanceStore.values())
      .every(metric => metric.averageRenderTime < 16), // 60fps threshold
  }
}