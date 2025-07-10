'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { BarChart3, TrendingUp, TrendingDown, Zap, MemoryStick, Clock, AlertTriangle, CheckCircle, RefreshCw, Download, Filter, Eye, EyeOff } from 'lucide-react'
import { ModelPerformanceMetrics, PerformanceDataPoint, ModelComparison } from '../hooks/useModelPerformanceTracking'
import { DragonModelConfig } from '../config/dragonModels'

interface ModelPerformanceComparisonProps {
  modelA: {
    id: string
    name: string
    config: DragonModelConfig
    metrics: ModelPerformanceMetrics[]
    currentMetrics?: ModelPerformanceMetrics
  }
  modelB: {
    id: string
    name: string
    config: DragonModelConfig
    metrics: ModelPerformanceMetrics[]
    currentMetrics?: ModelPerformanceMetrics
  }
  comparison?: ModelComparison
  onModelSelect?: (modelId: string) => void
  onRefreshComparison?: () => void
  onExportData?: () => void
  className?: string
}

interface MetricComparisonCardProps {
  title: string
  icon: React.ReactNode
  valueA: number | string
  valueB: number | string
  unit?: string
  formatValue?: (value: number) => string
  higherIsBetter?: boolean
  showTrend?: boolean
  trendA?: number
  trendB?: number
}

const MetricComparisonCard: React.FC<MetricComparisonCardProps> = ({
  title,
  icon,
  valueA,
  valueB,
  unit = '',
  formatValue,
  higherIsBetter = true,
  showTrend = false,
  trendA,
  trendB
}) => {
  const numValueA = typeof valueA === 'number' ? valueA : parseFloat(valueA.toString())
  const numValueB = typeof valueB === 'number' ? valueB : parseFloat(valueB.toString())
  
  const formattedA = formatValue ? formatValue(numValueA) : numValueA.toString()
  const formattedB = formatValue ? formatValue(numValueB) : numValueB.toString()
  
  const isABetter = higherIsBetter ? numValueA > numValueB : numValueA < numValueB
  const difference = Math.abs(numValueA - numValueB)
  const percentageDiff = numValueB !== 0 ? ((difference / numValueB) * 100) : 0
  
  return (
    <div className="bg-black/20 border border-yellow-500/30 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h4 className="text-sm font-medium text-yellow-400">{title}</h4>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Model A */}
        <div className={`p-3 rounded-lg border ${isABetter ? 'border-green-500/50 bg-green-900/20' : 'border-gray-500/30 bg-gray-900/20'}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Model A</span>
            {isABetter && <CheckCircle className="h-3 w-3 text-green-400" />}
          </div>
          <div className="text-lg font-mono text-white">
            {formattedA} <span className="text-xs text-gray-400">{unit}</span>
          </div>
          {showTrend && trendA !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              {trendA > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-400" />
              ) : trendA < 0 ? (
                <TrendingDown className="h-3 w-3 text-red-400" />
              ) : null}
              <span className="text-xs text-gray-400">
                {trendA > 0 ? '+' : ''}{trendA.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        
        {/* Model B */}
        <div className={`p-3 rounded-lg border ${!isABetter ? 'border-green-500/50 bg-green-900/20' : 'border-gray-500/30 bg-gray-900/20'}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Model B</span>
            {!isABetter && <CheckCircle className="h-3 w-3 text-green-400" />}
          </div>
          <div className="text-lg font-mono text-white">
            {formattedB} <span className="text-xs text-gray-400">{unit}</span>
          </div>
          {showTrend && trendB !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              {trendB > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-400" />
              ) : trendB < 0 ? (
                <TrendingDown className="h-3 w-3 text-red-400" />
              ) : null}
              <span className="text-xs text-gray-400">
                {trendB > 0 ? '+' : ''}{trendB.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </div>
      
      {percentageDiff > 0 && (
        <div className="mt-2 text-center">
          <span className="text-xs text-gray-400">
            {percentageDiff.toFixed(1)}% difference
          </span>
        </div>
      )}
    </div>
  )
}

interface PerformanceChartProps {
  dataA: ModelPerformanceMetrics[]
  dataB: ModelPerformanceMetrics[]
  metric: keyof ModelPerformanceMetrics
  title: string
  color: string
}

const MiniPerformanceChart: React.FC<PerformanceChartProps> = ({
  dataA,
  dataB,
  metric,
  title,
  color
}) => {
  const maxDataPoints = 30
  const recentDataA = dataA.slice(-maxDataPoints)
  const recentDataB = dataB.slice(-maxDataPoints)
  
  const allValues = [
    ...recentDataA.map(d => typeof d[metric] === 'number' ? d[metric] as number : 0),
    ...recentDataB.map(d => typeof d[metric] === 'number' ? d[metric] as number : 0)
  ].filter(v => v > 0)
  
  if (allValues.length === 0) return null
  
  const minValue = Math.min(...allValues)
  const maxValue = Math.max(...allValues)
  const range = maxValue - minValue || 1
  
  const getY = (value: number) => {
    return 100 - ((value - minValue) / range) * 100
  }
  
  const createPath = (data: ModelPerformanceMetrics[]) => {
    if (data.length === 0) return ''
    
    const points = data.map((d, i) => {
      const value = typeof d[metric] === 'number' ? d[metric] as number : 0
      const x = (i / Math.max(data.length - 1, 1)) * 100
      const y = getY(value)
      return `${x},${y}`
    })
    
    return `M${points.join('L')}`
  }
  
  return (
    <div className="bg-black/20 border border-yellow-500/30 rounded-lg p-4">
      <h4 className="text-sm font-medium text-yellow-400 mb-3">{title}</h4>
      <div className="relative h-32">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />
          
          {/* Model A line */}
          {recentDataA.length > 1 && (
            <path
              d={createPath(recentDataA)}
              fill="none"
              stroke="rgba(59, 130, 246, 0.8)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          )}
          
          {/* Model B line */}
          {recentDataB.length > 1 && (
            <path
              d={createPath(recentDataB)}
              fill="none"
              stroke="rgba(249, 115, 22, 0.8)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        
        {/* Legend */}
        <div className="absolute top-2 right-2 text-xs">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-gray-400">Model A</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span className="text-gray-400">Model B</span>
          </div>
        </div>
        
        {/* Value range indicators */}
        <div className="absolute left-0 top-0 text-xs text-gray-400">
          {maxValue.toFixed(1)}
        </div>
        <div className="absolute left-0 bottom-0 text-xs text-gray-400">
          {minValue.toFixed(1)}
        </div>
      </div>
    </div>
  )
}

export const ModelPerformanceComparison: React.FC<ModelPerformanceComparisonProps> = ({
  modelA,
  modelB,
  comparison,
  onModelSelect,
  onRefreshComparison,
  onExportData,
  className = ''
}) => {
  const [selectedView, setSelectedView] = useState<'overview' | 'detailed' | 'charts'>('overview')
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false)
  
  // Calculate average metrics
  const avgMetricsA = useMemo(() => {
    if (modelA.metrics.length === 0) return null
    
    return modelA.metrics.reduce((acc, metrics) => ({
      fps: acc.fps + metrics.fps,
      memoryUsage: acc.memoryUsage + metrics.memoryUsage.jsHeapUsed,
      loadTime: acc.loadTime + metrics.loadTime,
      performanceScore: acc.performanceScore + metrics.performanceScore,
      renderTime: acc.renderTime + metrics.renderTime
    }), { fps: 0, memoryUsage: 0, loadTime: 0, performanceScore: 0, renderTime: 0 })
  }, [modelA.metrics])
  
  const avgMetricsB = useMemo(() => {
    if (modelB.metrics.length === 0) return null
    
    return modelB.metrics.reduce((acc, metrics) => ({
      fps: acc.fps + metrics.fps,
      memoryUsage: acc.memoryUsage + metrics.memoryUsage.jsHeapUsed,
      loadTime: acc.loadTime + metrics.loadTime,
      performanceScore: acc.performanceScore + metrics.performanceScore,
      renderTime: acc.renderTime + metrics.renderTime
    }), { fps: 0, memoryUsage: 0, loadTime: 0, performanceScore: 0, renderTime: 0 })
  }, [modelB.metrics])
  
  // Normalize averages
  if (avgMetricsA && modelA.metrics.length > 0) {
    Object.keys(avgMetricsA).forEach(key => {
      avgMetricsA[key as keyof typeof avgMetricsA] /= modelA.metrics.length
    })
  }
  
  if (avgMetricsB && modelB.metrics.length > 0) {
    Object.keys(avgMetricsB).forEach(key => {
      avgMetricsB[key as keyof typeof avgMetricsB] /= modelB.metrics.length
    })
  }
  
  // Calculate trends (simplified - last 10 vs previous 10 data points)
  const calculateTrend = useCallback((metrics: ModelPerformanceMetrics[], metric: keyof ModelPerformanceMetrics) => {
    if (metrics.length < 10) return 0
    
    const recent = metrics.slice(-10).map(m => typeof m[metric] === 'number' ? m[metric] as number : 0)
    const previous = metrics.slice(-20, -10).map(m => typeof m[metric] === 'number' ? m[metric] as number : 0)
    
    if (previous.length === 0) return 0
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
    const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length
    
    return ((recentAvg - previousAvg) / previousAvg) * 100
  }, [])
  
  const formatMemory = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(1)
  }
  
  const formatTime = (ms: number) => {
    return (ms / 1000).toFixed(2)
  }
  
  const formatPercentage = (score: number) => {
    return `${score.toFixed(1)}%`
  }
  
  return (
    <div className={`bg-gradient-to-br from-amber-900/20 via-red-900/20 to-orange-900/20 border border-yellow-500/30 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-yellow-400 mb-2">Model Performance Comparison</h2>
          <div className="flex items-center gap-4 text-sm text-yellow-200">
            <span>{modelA.name} vs {modelB.name}</span>
            <span className="text-gray-400">•</span>
            <span>{modelA.metrics.length} vs {modelB.metrics.length} data points</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View selector */}
          <div className="flex bg-black/30 rounded-lg p-1">
            {(['overview', 'detailed', 'charts'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setSelectedView(view)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  selectedView === view
                    ? 'bg-yellow-500 text-black'
                    : 'text-yellow-400 hover:bg-yellow-500/20'
                }`}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setShowAdvancedMetrics(!showAdvancedMetrics)}
            className="p-2 bg-blue-500/20 border border-blue-500/50 rounded-lg text-blue-400 hover:bg-blue-500/30 transition-colors"
            title="Toggle Advanced Metrics"
          >
            {showAdvancedMetrics ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          
          {onRefreshComparison && (
            <button
              onClick={onRefreshComparison}
              className="p-2 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 hover:bg-green-500/30 transition-colors"
              title="Refresh Comparison"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
          
          {onExportData && (
            <button
              onClick={onExportData}
              className="p-2 bg-purple-500/20 border border-purple-500/50 rounded-lg text-purple-400 hover:bg-purple-500/30 transition-colors"
              title="Export Data"
            >
              <Download className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Comparison Verdict */}
      {comparison && (
        <div className="mb-6 p-4 bg-black/30 border border-yellow-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <h3 className="text-lg font-semibold text-yellow-400">Comparison Result</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-green-400 mb-2">Winner: {comparison.verdict.winner}</h4>
              <p className="text-sm text-gray-300 mb-3">{comparison.verdict.recommendation}</p>
              <div className="text-xs text-gray-400">
                Performance difference: {comparison.verdict.performanceDiff.toFixed(1)} points
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-yellow-400 mb-2">Key Reasons:</h4>
              <ul className="text-xs text-gray-300 space-y-1">
                {comparison.verdict.reasons.slice(0, 3).map((reason, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-yellow-400 mt-0.5">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {/* Overview View */}
      {selectedView === 'overview' && avgMetricsA && avgMetricsB && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricComparisonCard
            title="Average FPS"
            icon={<Zap className="h-4 w-4 text-green-400" />}
            valueA={avgMetricsA.fps}
            valueB={avgMetricsB.fps}
            unit="fps"
            formatValue={(v) => v.toFixed(1)}
            higherIsBetter={true}
            showTrend={true}
            trendA={calculateTrend(modelA.metrics, 'fps')}
            trendB={calculateTrend(modelB.metrics, 'fps')}
          />
          
          <MetricComparisonCard
            title="Memory Usage"
            icon={<MemoryStick className="h-4 w-4 text-blue-400" />}
            valueA={avgMetricsA.memoryUsage}
            valueB={avgMetricsB.memoryUsage}
            unit="MB"
            formatValue={formatMemory}
            higherIsBetter={false}
            showTrend={true}
            trendA={calculateTrend(modelA.metrics, 'memoryUsage')}
            trendB={calculateTrend(modelB.metrics, 'memoryUsage')}
          />
          
          <MetricComparisonCard
            title="Load Time"
            icon={<Clock className="h-4 w-4 text-purple-400" />}
            valueA={avgMetricsA.loadTime}
            valueB={avgMetricsB.loadTime}
            unit="s"
            formatValue={formatTime}
            higherIsBetter={false}
          />
          
          <MetricComparisonCard
            title="Performance Score"
            icon={<BarChart3 className="h-4 w-4 text-yellow-400" />}
            valueA={avgMetricsA.performanceScore}
            valueB={avgMetricsB.performanceScore}
            unit=""
            formatValue={formatPercentage}
            higherIsBetter={true}
            showTrend={true}
            trendA={calculateTrend(modelA.metrics, 'performanceScore')}
            trendB={calculateTrend(modelB.metrics, 'performanceScore')}
          />
        </div>
      )}
      
      {/* Detailed View */}
      {selectedView === 'detailed' && (
        <div className="space-y-6">
          {/* Model Configuration Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-black/20 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-400 mb-3">{modelA.name}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">File Size:</span>
                  <span className="text-white">{(modelA.config.fileSize / 1024 / 1024).toFixed(1)}MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Quality:</span>
                  <span className="text-white capitalize">{modelA.config.quality}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Type:</span>
                  <span className="text-white capitalize">{modelA.config.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Triangles:</span>
                  <span className="text-white">{modelA.config.performance.triangleCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Vertices:</span>
                  <span className="text-white">{modelA.config.performance.vertexCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Compatibility:</span>
                  <span className={`${
                    modelA.config.compatibility.desktop.performance === 'excellent' ? 'text-green-400' :
                    modelA.config.compatibility.desktop.performance === 'good' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {modelA.config.compatibility.desktop.performance}
                  </span>
                </div>
              </div>
              
              {modelA.currentMetrics && (
                <div className="mt-4 pt-4 border-t border-blue-500/30">
                  <h4 className="text-sm font-medium text-blue-400 mb-2">Current Performance</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">FPS:</span>
                      <span className="ml-1 text-white font-mono">{modelA.currentMetrics.fps}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Score:</span>
                      <span className="ml-1 text-white font-mono">{modelA.currentMetrics.performanceScore}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-black/20 border border-orange-500/30 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-orange-400 mb-3">{modelB.name}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">File Size:</span>
                  <span className="text-white">{(modelB.config.fileSize / 1024 / 1024).toFixed(1)}MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Quality:</span>
                  <span className="text-white capitalize">{modelB.config.quality}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Type:</span>
                  <span className="text-white capitalize">{modelB.config.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Triangles:</span>
                  <span className="text-white">{modelB.config.performance.triangleCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Vertices:</span>
                  <span className="text-white">{modelB.config.performance.vertexCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Compatibility:</span>
                  <span className={`${
                    modelB.config.compatibility.desktop.performance === 'excellent' ? 'text-green-400' :
                    modelB.config.compatibility.desktop.performance === 'good' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {modelB.config.compatibility.desktop.performance}
                  </span>
                </div>
              </div>
              
              {modelB.currentMetrics && (
                <div className="mt-4 pt-4 border-t border-orange-500/30">
                  <h4 className="text-sm font-medium text-orange-400 mb-2">Current Performance</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">FPS:</span>
                      <span className="ml-1 text-white font-mono">{modelB.currentMetrics.fps}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Score:</span>
                      <span className="ml-1 text-white font-mono">{modelB.currentMetrics.performanceScore}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Advanced Metrics */}
          {showAdvancedMetrics && avgMetricsA && avgMetricsB && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <MetricComparisonCard
                title="Render Time"
                icon={<Clock className="h-4 w-4 text-cyan-400" />}
                valueA={avgMetricsA.renderTime}
                valueB={avgMetricsB.renderTime}
                unit="ms"
                formatValue={(v) => v.toFixed(2)}
                higherIsBetter={false}
              />
              
              <div className="bg-black/20 border border-yellow-500/30 rounded-lg p-4">
                <h4 className="text-sm font-medium text-yellow-400 mb-3">Data Quality</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Model A samples:</span>
                    <span className="text-white font-mono">{modelA.metrics.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Model B samples:</span>
                    <span className="text-white font-mono">{modelB.metrics.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Comparison confidence:</span>
                    <span className="text-green-400 font-mono">
                      {Math.min(modelA.metrics.length, modelB.metrics.length) > 50 ? 'High' : 
                       Math.min(modelA.metrics.length, modelB.metrics.length) > 20 ? 'Medium' : 'Low'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="bg-black/20 border border-yellow-500/30 rounded-lg p-4">
                <h4 className="text-sm font-medium text-yellow-400 mb-3">Performance Stability</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">A FPS variance:</span>
                    <span className="text-white font-mono">
                      {modelA.metrics.length > 0 ? 
                        Math.sqrt(modelA.metrics.reduce((acc, m) => acc + Math.pow(m.fps - avgMetricsA!.fps, 2), 0) / modelA.metrics.length).toFixed(1)
                        : '0'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">B FPS variance:</span>
                    <span className="text-white font-mono">
                      {modelB.metrics.length > 0 ? 
                        Math.sqrt(modelB.metrics.reduce((acc, m) => acc + Math.pow(m.fps - avgMetricsB!.fps, 2), 0) / modelB.metrics.length).toFixed(1)
                        : '0'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Charts View */}
      {selectedView === 'charts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MiniPerformanceChart
            dataA={modelA.metrics}
            dataB={modelB.metrics}
            metric="fps"
            title="FPS Over Time"
            color="green"
          />
          
          <MiniPerformanceChart
            dataA={modelA.metrics}
            dataB={modelB.metrics}
            metric="performanceScore"
            title="Performance Score"
            color="yellow"
          />
          
          <MiniPerformanceChart
            dataA={modelA.metrics}
            dataB={modelB.metrics}
            metric="renderTime"
            title="Render Time (ms)"
            color="blue"
          />
          
          <div className="bg-black/20 border border-yellow-500/30 rounded-lg p-4">
            <h4 className="text-sm font-medium text-yellow-400 mb-3">Performance Summary</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Better FPS:</span>
                <span className="text-sm text-white">
                  {avgMetricsA && avgMetricsB && avgMetricsA.fps > avgMetricsB.fps ? modelA.name : modelB.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Lower Memory:</span>
                <span className="text-sm text-white">
                  {avgMetricsA && avgMetricsB && avgMetricsA.memoryUsage < avgMetricsB.memoryUsage ? modelA.name : modelB.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Faster Loading:</span>
                <span className="text-sm text-white">
                  {avgMetricsA && avgMetricsB && avgMetricsA.loadTime < avgMetricsB.loadTime ? modelA.name : modelB.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Overall Winner:</span>
                <span className="text-sm font-semibold text-green-400">
                  {comparison?.verdict.winner || 'Analyzing...'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      {onModelSelect && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={() => onModelSelect(modelA.id)}
            className="px-6 py-2 bg-blue-500/20 border border-blue-500 rounded-lg text-blue-400 hover:bg-blue-500/30 transition-colors"
          >
            Use {modelA.name}
          </button>
          <button
            onClick={() => onModelSelect(modelB.id)}
            className="px-6 py-2 bg-orange-500/20 border border-orange-500 rounded-lg text-orange-400 hover:bg-orange-500/30 transition-colors"
          >
            Use {modelB.name}
          </button>
        </div>
      )}
    </div>
  )
}

export default ModelPerformanceComparison