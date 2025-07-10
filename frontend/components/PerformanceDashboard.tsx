'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { 
  Activity, AlertTriangle, CheckCircle, Clock, MemoryStick, Zap, 
  TrendingUp, TrendingDown, Settings, Download, RefreshCw, 
  BarChart3, PieChart, LineChart, Filter, Calendar, Bell, BellOff
} from 'lucide-react'
import { ModelPerformanceMetrics, PerformanceAlert, PerformanceDataPoint } from '../hooks/useModelPerformanceTracking'

interface PerformanceDashboardProps {
  currentMetrics: ModelPerformanceMetrics | null
  performanceHistory: PerformanceDataPoint[]
  activeAlerts: PerformanceAlert[]
  isTracking: boolean
  currentModelId: string | null
  onExportData?: () => string
  onClearAlerts?: () => void
  onAcknowledgeAlert?: (alertId: string) => void
  onRefreshData?: () => void
  className?: string
}

interface MetricCardProps {
  title: string
  value: string | number
  unit?: string
  icon: React.ReactNode
  trend?: number
  status?: 'good' | 'warning' | 'error'
  subtitle?: string
  onClick?: () => void
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit = '',
  icon,
  trend,
  status = 'good',
  subtitle,
  onClick
}) => {
  const statusColors = {
    good: 'border-green-500/50 bg-green-900/20',
    warning: 'border-yellow-500/50 bg-yellow-900/20',
    error: 'border-red-500/50 bg-red-900/20'
  }
  
  const statusIconColors = {
    good: 'text-green-400',
    warning: 'text-yellow-400',
    error: 'text-red-400'
  }
  
  return (
    <div 
      className={`bg-black/20 border rounded-lg p-4 transition-all hover:bg-black/30 ${statusColors[status]} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={statusIconColors[status]}>{icon}</span>
          <h3 className="text-sm font-medium text-yellow-400">{title}</h3>
        </div>
        {trend !== undefined && (
          <div className="flex items-center gap-1">
            {trend > 0 ? (
              <TrendingUp className="h-3 w-3 text-green-400" />
            ) : trend < 0 ? (
              <TrendingDown className="h-3 w-3 text-red-400" />
            ) : null}
            <span className={`text-xs ${trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-gray-400'}`}>
              {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
      
      <div className="mb-1">
        <span className="text-2xl font-bold text-white">{value}</span>
        {unit && <span className="text-sm text-gray-400 ml-1">{unit}</span>}
      </div>
      
      {subtitle && (
        <p className="text-xs text-gray-400">{subtitle}</p>
      )}
    </div>
  )
}

interface AlertBadgeProps {
  alert: PerformanceAlert
  onAcknowledge?: (alertId: string) => void
}

const AlertBadge: React.FC<AlertBadgeProps> = ({ alert, onAcknowledge }) => {
  const alertColors = {
    info: 'border-blue-500/50 bg-blue-900/20 text-blue-100',
    warning: 'border-yellow-500/50 bg-yellow-900/20 text-yellow-100',
    error: 'border-red-500/50 bg-red-900/20 text-red-100',
    critical: 'border-red-600/50 bg-red-900/30 text-red-100'
  }
  
  const alertIcons = {
    info: <CheckCircle className="h-4 w-4" />,
    warning: <AlertTriangle className="h-4 w-4" />,
    error: <AlertTriangle className="h-4 w-4" />,
    critical: <AlertTriangle className="h-4 w-4" />
  }
  
  return (
    <div className={`border rounded-lg p-3 ${alertColors[alert.type]} ${alert.acknowledged ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-2">
        {alertIcons[alert.type]}
        <div className="flex-1">
          <p className="text-sm font-medium">{alert.message}</p>
          <p className="text-xs opacity-70 mt-1">{alert.suggestion}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs opacity-60">
              {new Date(alert.timestamp).toLocaleTimeString()}
            </span>
            {!alert.acknowledged && onAcknowledge && (
              <button
                onClick={() => onAcknowledge(alert.id)}
                className="text-xs opacity-70 hover:opacity-100 transition-opacity underline"
              >
                Acknowledge
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface PerformanceChartProps {
  data: PerformanceDataPoint[]
  metric: keyof ModelPerformanceMetrics
  title: string
  height?: number
  showGrid?: boolean
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({
  data,
  metric,
  title,
  height = 120,
  showGrid = true
}) => {
  const maxDataPoints = 60
  const recentData = data.slice(-maxDataPoints)
  
  if (recentData.length === 0) {
    return (
      <div className="bg-black/20 border border-yellow-500/30 rounded-lg p-4">
        <h4 className="text-sm font-medium text-yellow-400 mb-3">{title}</h4>
        <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
          No data available
        </div>
      </div>
    )
  }
  
  const values = recentData.map(d => {
    const value = d.metrics[metric]
    if (typeof value === 'number') return value
    if (typeof value === 'object' && value !== null && 'jsHeapUsed' in value) {
      return (value as any).jsHeapUsed
    }
    return 0
  }).filter(v => v > 0)
  
  if (values.length === 0) return null
  
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const range = maxValue - minValue || 1
  
  const getY = (value: number) => {
    return height - ((value - minValue) / range) * (height - 10)
  }
  
  const getX = (index: number) => {
    return (index / Math.max(values.length - 1, 1)) * 100
  }
  
  const pathData = values.map((value, index) => {
    const x = getX(index)
    const y = getY(value)
    return `${index === 0 ? 'M' : 'L'}${x},${y}`
  }).join('')
  
  const currentValue = values[values.length - 1]
  const previousValue = values[values.length - 2]
  const trend = previousValue ? ((currentValue - previousValue) / previousValue) * 100 : 0
  
  return (
    <div className="bg-black/20 border border-yellow-500/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-yellow-400">{title}</h4>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {typeof currentValue === 'number' ? currentValue.toFixed(1) : currentValue}
          </span>
          {trend !== 0 && (
            <div className="flex items-center gap-1">
              {trend > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-400" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-400" />
              )}
              <span className={`text-xs ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </div>
      
      <div className="relative" style={{ height }}>
        <svg className="w-full h-full" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
          {/* Grid lines */}
          {showGrid && (
            <defs>
              <pattern id={`grid-${title}`} width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
              </pattern>
            </defs>
          )}
          {showGrid && <rect width="100" height={height} fill={`url(#grid-${title})`} />}
          
          {/* Area fill */}
          {values.length > 1 && (
            <path
              d={`${pathData}L100,${height}L0,${height}Z`}
              fill="rgba(59, 130, 246, 0.1)"
              stroke="none"
            />
          )}
          
          {/* Line */}
          {values.length > 1 && (
            <path
              d={pathData}
              fill="none"
              stroke="rgba(59, 130, 246, 0.8)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          )}
          
          {/* Current value point */}
          {values.length > 0 && (
            <circle
              cx={getX(values.length - 1)}
              cy={getY(currentValue)}
              r="3"
              fill="rgba(59, 130, 246, 1)"
              stroke="white"
              strokeWidth="1"
            />
          )}
        </svg>
        
        {/* Value range indicators */}
        <div className="absolute left-0 top-0 text-xs text-gray-400">
          {maxValue.toFixed(1)}
        </div>
        <div className="absolute left-0 bottom-0 text-xs text-gray-400">
          {minValue.toFixed(1)}
        </div>
        
        {/* Time indicator */}
        <div className="absolute right-0 bottom-0 text-xs text-gray-400">
          Now
        </div>
      </div>
    </div>
  )
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  currentMetrics,
  performanceHistory,
  activeAlerts,
  isTracking,
  currentModelId,
  onExportData,
  onClearAlerts,
  onAcknowledgeAlert,
  onRefreshData,
  className = ''
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<'5m' | '15m' | '1h' | '6h'>('15m')
  const [selectedMetric, setSelectedMetric] = useState<keyof ModelPerformanceMetrics>('fps')
  const [showNotifications, setShowNotifications] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  
  // Filter data based on selected time range
  const filteredHistory = useMemo(() => {
    if (performanceHistory.length === 0) return []
    
    const timeRanges = {
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000
    }
    
    const cutoffTime = Date.now() - timeRanges[selectedTimeRange]
    return performanceHistory.filter(point => point.timestamp >= cutoffTime)
  }, [performanceHistory, selectedTimeRange])
  
  // Calculate trends
  const calculateTrend = useMemo(() => {
    if (filteredHistory.length < 10) return 0
    
    const recent = filteredHistory.slice(-5)
    const previous = filteredHistory.slice(-10, -5)
    
    if (previous.length === 0) return 0
    
    const recentAvg = recent.reduce((acc, point) => {
      const value = point.metrics[selectedMetric]
      return acc + (typeof value === 'number' ? value : 0)
    }, 0) / recent.length
    
    const previousAvg = previous.reduce((acc, point) => {
      const value = point.metrics[selectedMetric]
      return acc + (typeof value === 'number' ? value : 0)
    }, 0) / previous.length
    
    return previousAvg !== 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0
  }, [filteredHistory, selectedMetric])
  
  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || !onRefreshData) return
    
    const interval = setInterval(() => {
      onRefreshData()
    }, 5000) // Refresh every 5 seconds
    
    return () => clearInterval(interval)
  }, [autoRefresh, onRefreshData])
  
  // Get status for metrics
  const getMetricStatus = (value: number, thresholds: { good: number; warning: number }): 'good' | 'warning' | 'error' => {
    if (value >= thresholds.good) return 'good'
    if (value >= thresholds.warning) return 'warning'
    return 'error'
  }
  
  // Active alerts count
  const unacknowledgedAlerts = activeAlerts.filter(alert => !alert.acknowledged)
  
  return (
    <div className={`bg-gradient-to-br from-gray-900/50 via-gray-800/50 to-gray-900/50 border border-yellow-500/30 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-yellow-400 mb-2">Performance Dashboard</h2>
          <div className="flex items-center gap-4 text-sm text-gray-300">
            <span className="flex items-center gap-2">
              <Activity className={`h-4 w-4 ${isTracking ? 'text-green-400' : 'text-gray-400'}`} />
              {isTracking ? 'Tracking' : 'Not Tracking'}
            </span>
            {currentModelId && (
              <span className="text-yellow-200">Model: {currentModelId}</span>
            )}
            <span className="text-gray-400">•</span>
            <span>{filteredHistory.length} data points</span>
            {unacknowledgedAlerts.length > 0 && (
              <>
                <span className="text-gray-400">•</span>
                <span className="flex items-center gap-1 text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  {unacknowledgedAlerts.length} alerts
                </span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Time range selector */}
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as typeof selectedTimeRange)}
            className="p-2 bg-black/30 border border-yellow-500/30 rounded text-yellow-400 text-xs"
          >
            <option value="5m">Last 5 minutes</option>
            <option value="15m">Last 15 minutes</option>
            <option value="1h">Last hour</option>
            <option value="6h">Last 6 hours</option>
          </select>
          
          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`p-2 rounded border transition-colors ${
              autoRefresh 
                ? 'bg-green-500/20 border-green-500/50 text-green-400' 
                : 'bg-gray-500/20 border-gray-500/50 text-gray-400'
            }`}
            title="Toggle Auto-refresh"
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
          </button>
          
          {/* Notifications toggle */}
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2 rounded border transition-colors ${
              showNotifications 
                ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' 
                : 'bg-gray-500/20 border-gray-500/50 text-gray-400'
            }`}
            title="Toggle Notifications"
          >
            {showNotifications ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          </button>
          
          {/* Export data */}
          {onExportData && (
            <button
              onClick={() => {
                const data = onExportData()
                const blob = new Blob([data], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `performance-data-${new Date().toISOString().split('T')[0]}.json`
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="p-2 bg-purple-500/20 border border-purple-500/50 rounded text-purple-400 hover:bg-purple-500/30 transition-colors"
              title="Export Data"
            >
              <Download className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Current Metrics Overview */}
      {currentMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="FPS"
            value={currentMetrics.fps}
            icon={<Zap className="h-4 w-4" />}
            status={getMetricStatus(currentMetrics.fps, { good: 45, warning: 30 })}
            trend={calculateTrend}
            subtitle={`${currentMetrics.minFps}-${currentMetrics.maxFps} range`}
          />
          
          <MetricCard
            title="Memory Usage"
            value={(currentMetrics.memoryUsage.jsHeapUsed / 1024 / 1024).toFixed(1)}
            unit="MB"
            icon={<MemoryStick className="h-4 w-4" />}
            status={getMetricStatus(
              (currentMetrics.memoryUsage.jsHeapUsed / currentMetrics.memoryUsage.jsHeapLimit) * 100, 
              { good: 30, warning: 60 }
            )}
            subtitle={`${((currentMetrics.memoryUsage.jsHeapUsed / currentMetrics.memoryUsage.jsHeapLimit) * 100).toFixed(1)}% of limit`}
          />
          
          <MetricCard
            title="Render Time"
            value={currentMetrics.renderTime.toFixed(2)}
            unit="ms"
            icon={<Clock className="h-4 w-4" />}
            status={getMetricStatus(currentMetrics.renderTime, { good: 16, warning: 33 })}
            subtitle={`Target: <16ms`}
          />
          
          <MetricCard
            title="Performance Score"
            value={currentMetrics.performanceScore}
            unit="%"
            icon={<BarChart3 className="h-4 w-4" />}
            status={getMetricStatus(currentMetrics.performanceScore, { good: 80, warning: 60 })}
            subtitle={`Quality: ${currentMetrics.qualityLevel}`}
          />
        </div>
      )}
      
      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <PerformanceChart
          data={filteredHistory}
          metric="fps"
          title="FPS Over Time"
          height={150}
        />
        
        <PerformanceChart
          data={filteredHistory}
          metric="memoryUsage"
          title="Memory Usage (MB)"
          height={150}
        />
        
        <PerformanceChart
          data={filteredHistory}
          metric="performanceScore"
          title="Performance Score"
          height={150}
        />
        
        <PerformanceChart
          data={filteredHistory}
          metric="renderTime"
          title="Render Time (ms)"
          height={150}
        />
      </div>
      
      {/* Advanced Metrics */}
      {currentMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-black/20 border border-yellow-500/30 rounded-lg p-4">
            <h3 className="text-sm font-medium text-yellow-400 mb-3">WebGL Context Health</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">WebGL2 Support:</span>
                <span className={currentMetrics.webglContextHealth.isWebGL2 ? 'text-green-400' : 'text-red-400'}>
                  {currentMetrics.webglContextHealth.isWebGL2 ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Max Texture Size:</span>
                <span className="text-white">{currentMetrics.webglContextHealth.maxTextureSize}px</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Context Losses:</span>
                <span className="text-white">{currentMetrics.webglContextHealth.contextLossCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Extensions:</span>
                <span className="text-white">{currentMetrics.webglContextHealth.extensionSupport.length}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-black/20 border border-yellow-500/30 rounded-lg p-4">
            <h3 className="text-sm font-medium text-yellow-400 mb-3">Stability Metrics</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Errors:</span>
                <span className={currentMetrics.errorCount > 0 ? 'text-red-400' : 'text-green-400'}>
                  {currentMetrics.errorCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Warnings:</span>
                <span className={currentMetrics.warningCount > 0 ? 'text-yellow-400' : 'text-green-400'}>
                  {currentMetrics.warningCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Crashes:</span>
                <span className={currentMetrics.crashCount > 0 ? 'text-red-400' : 'text-green-400'}>
                  {currentMetrics.crashCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Recoveries:</span>
                <span className="text-blue-400">{currentMetrics.recoveryCount}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-black/20 border border-yellow-500/30 rounded-lg p-4">
            <h3 className="text-sm font-medium text-yellow-400 mb-3">Quality Settings</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Current Level:</span>
                <span className="text-white capitalize">{currentMetrics.qualityLevel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Adaptive Quality:</span>
                <span className={currentMetrics.adaptiveQualityActive ? 'text-green-400' : 'text-gray-400'}>
                  {currentMetrics.adaptiveQualityActive ? 'Active' : 'Disabled'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Auto Reductions:</span>
                <span className="text-white">{currentMetrics.qualityReductions}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Alerts Section */}
      {showNotifications && activeAlerts.length > 0 && (
        <div className="bg-black/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-red-400">
              Performance Alerts ({unacknowledgedAlerts.length} unacknowledged)
            </h3>
            {onClearAlerts && (
              <button
                onClick={onClearAlerts}
                className="text-xs text-gray-400 hover:text-white transition-colors underline"
              >
                Clear All
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
            {activeAlerts.slice(0, 6).map((alert) => (
              <AlertBadge
                key={alert.id}
                alert={alert}
                onAcknowledge={onAcknowledgeAlert}
              />
            ))}
          </div>
          
          {activeAlerts.length > 6 && (
            <div className="mt-3 text-center text-xs text-gray-400">
              ... and {activeAlerts.length - 6} more alerts
            </div>
          )}
        </div>
      )}
      
      {/* No Data State */}
      {!isTracking && (
        <div className="text-center py-12">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">Performance Tracking Disabled</h3>
          <p className="text-sm text-gray-500">
            Start tracking to see real-time performance metrics and analytics.
          </p>
        </div>
      )}
    </div>
  )
}

export default PerformanceDashboard