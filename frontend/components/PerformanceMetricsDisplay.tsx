'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { 
  Activity, AlertTriangle, CheckCircle, Zap, MemoryStick, Clock, 
  Cpu, Monitor, TrendingUp, TrendingDown, Eye, EyeOff, Settings,
  Thermometer, Wifi, Battery, BrainCircuit
} from 'lucide-react'
import { ModelPerformanceMetrics, PerformanceAlert } from '../hooks/useModelPerformanceTracking'

interface PerformanceMetricsDisplayProps {
  currentMetrics: ModelPerformanceMetrics | null
  alerts: PerformanceAlert[]
  isTracking: boolean
  compact?: boolean
  showAdvanced?: boolean
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  onToggleAdvanced?: () => void
  onAcknowledgeAlert?: (alertId: string) => void
  className?: string
}

interface MetricIndicatorProps {
  label: string
  value: string | number
  unit?: string
  status: 'good' | 'warning' | 'error'
  icon: React.ReactNode
  trend?: number
  compact?: boolean
  onClick?: () => void
}

const MetricIndicator: React.FC<MetricIndicatorProps> = ({
  label,
  value,
  unit = '',
  status,
  icon,
  trend,
  compact = false,
  onClick
}) => {
  const statusColors = {
    good: 'text-green-400 border-green-500/30',
    warning: 'text-yellow-400 border-yellow-500/30',
    error: 'text-red-400 border-red-500/30'
  }
  
  const bgColors = {
    good: 'bg-green-900/20',
    warning: 'bg-yellow-900/20',
    error: 'bg-red-900/20'
  }
  
  if (compact) {
    return (
      <div 
        className={`flex items-center gap-2 px-2 py-1 rounded border ${statusColors[status]} ${bgColors[status]} ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
        onClick={onClick}
      >
        <span className={statusColors[status]}>{icon}</span>
        <span className="text-white text-sm font-mono">
          {value}{unit}
        </span>
        {trend !== undefined && Math.abs(trend) > 0.5 && (
          <span className={`text-xs ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend > 0 ? '↗' : '↘'}
          </span>
        )}
      </div>
    )
  }
  
  return (
    <div 
      className={`bg-black/30 border rounded-lg p-3 ${statusColors[status]} ${onClick ? 'cursor-pointer hover:bg-black/40' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className={statusColors[status]}>{icon}</span>
          <span className="text-xs text-gray-400">{label}</span>
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
      <div className="text-lg font-mono text-white">
        {value}
        {unit && <span className="text-xs text-gray-400 ml-1">{unit}</span>}
      </div>
    </div>
  )
}

interface AlertBannerProps {
  alerts: PerformanceAlert[]
  onAcknowledge?: (alertId: string) => void
  compact?: boolean
}

const AlertBanner: React.FC<AlertBannerProps> = ({ alerts, onAcknowledge, compact = false }) => {
  const [currentAlertIndex, setCurrentAlertIndex] = useState(0)
  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged)
  
  useEffect(() => {
    if (unacknowledgedAlerts.length > 1) {
      const interval = setInterval(() => {
        setCurrentAlertIndex(prev => (prev + 1) % unacknowledgedAlerts.length)
      }, 3000) // Rotate every 3 seconds
      
      return () => clearInterval(interval)
    }
    return undefined // Explicitly return undefined when no cleanup needed
  }, [unacknowledgedAlerts.length])
  
  if (unacknowledgedAlerts.length === 0) return null
  
  const currentAlert = unacknowledgedAlerts[currentAlertIndex]
  
  // Early return if no current alert
  if (!currentAlert) {
    return null
  }
  
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
  
  if (compact) {
    return (
      <div className={`border rounded px-3 py-1 ${alertColors[currentAlert.type]} animate-pulse`}>
        <div className="flex items-center gap-2">
          {alertIcons[currentAlert.type]}
          <span className="text-sm font-medium truncate">{currentAlert.message}</span>
          {unacknowledgedAlerts.length > 1 && (
            <span className="text-xs opacity-70">({currentAlertIndex + 1}/{unacknowledgedAlerts.length})</span>
          )}
        </div>
      </div>
    )
  }
  
  return (
    <div className={`border rounded-lg p-3 ${alertColors[currentAlert.type]}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          {alertIcons[currentAlert.type]}
          <div>
            <p className="text-sm font-medium">{currentAlert.message}</p>
            <p className="text-xs opacity-70 mt-1">{currentAlert.suggestion}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unacknowledgedAlerts.length > 1 && (
            <span className="text-xs opacity-70">
              {currentAlertIndex + 1}/{unacknowledgedAlerts.length}
            </span>
          )}
          {onAcknowledge && (
            <button
              onClick={() => onAcknowledge(currentAlert.id)}
              className="text-xs opacity-70 hover:opacity-100 transition-opacity underline"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface PerformanceGaugeProps {
  value: number
  max: number
  label: string
  unit?: string
  size?: number
  color?: string
  showValue?: boolean
}

const PerformanceGauge: React.FC<PerformanceGaugeProps> = ({
  value,
  max,
  label,
  unit = '',
  size = 60,
  color = '#22c55e',
  showValue = true
}) => {
  const percentage = Math.min((value / max) * 100, 100)
  const circumference = 2 * Math.PI * (size / 2 - 8)
  const strokeDashoffset = circumference - (percentage / 100) * circumference
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 8}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="4"
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 8}
            stroke={color}
            strokeWidth="4"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300 ease-in-out"
            strokeLinecap="round"
          />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-mono text-white">
              {value.toFixed(0)}{unit}
            </span>
          </div>
        )}
      </div>
      <span className="text-xs text-gray-400 mt-1">{label}</span>
    </div>
  )
}

export const PerformanceMetricsDisplay: React.FC<PerformanceMetricsDisplayProps> = ({
  currentMetrics,
  alerts,
  isTracking,
  compact = false,
  showAdvanced = false,
  position = 'top-right',
  onToggleAdvanced,
  onAcknowledgeAlert,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(true)
  const [autoHide, setAutoHide] = useState(false)
  
  // Position classes
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  }
  
  // Calculate status for metrics
  const getMetricStatus = useMemo(() => {
    if (!currentMetrics) return { fps: 'good', memory: 'good', performance: 'good' }
    
    return {
      fps: currentMetrics.fps >= 45 ? 'good' : currentMetrics.fps >= 30 ? 'warning' : 'error',
      memory: (currentMetrics.memoryUsage.jsHeapUsed / currentMetrics.memoryUsage.jsHeapLimit) < 0.5 ? 'good' : 
              (currentMetrics.memoryUsage.jsHeapUsed / currentMetrics.memoryUsage.jsHeapLimit) < 0.8 ? 'warning' : 'error',
      performance: currentMetrics.performanceScore >= 80 ? 'good' : 
                  currentMetrics.performanceScore >= 60 ? 'warning' : 'error'
    }
  }, [currentMetrics])
  
  // Auto-hide when no issues
  useEffect(() => {
    if (autoHide && currentMetrics) {
      const hasIssues = alerts.some(a => !a.acknowledged) || 
                       getMetricStatus.fps === 'error' || 
                       getMetricStatus.memory === 'error' ||
                       getMetricStatus.performance === 'error'
      
      setIsVisible(hasIssues || !isTracking)
    }
  }, [autoHide, currentMetrics, alerts, getMetricStatus, isTracking])
  
  if (!isVisible && autoHide) {
    return (
      <div className={`fixed ${positionClasses[position]} z-40`}>
        <button
          onClick={() => setIsVisible(true)}
          className="p-2 bg-black/60 border border-gray-500/30 rounded-lg text-gray-400 hover:text-white transition-colors"
          title="Show Performance Metrics"
        >
          <Monitor className="h-4 w-4" />
        </button>
      </div>
    )
  }
  
  return (
    <div className={`fixed ${positionClasses[position]} z-40 ${className}`}>
      <div className="bg-black/80 backdrop-blur-sm border border-yellow-500/30 rounded-lg shadow-xl max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-yellow-500/20">
          <div className="flex items-center gap-2">
            <Activity className={`h-4 w-4 ${isTracking ? 'text-green-400 animate-pulse' : 'text-gray-400'}`} />
            <span className="text-sm font-medium text-yellow-400">
              {compact ? 'Perf' : 'Performance'}
            </span>
            {!isTracking && (
              <span className="text-xs text-red-400">(Disabled)</span>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {onToggleAdvanced && (
              <button
                onClick={onToggleAdvanced}
                className="p-1 text-gray-400 hover:text-white transition-colors"
                title="Toggle Advanced Metrics"
              >
                {showAdvanced ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </button>
            )}
            <button
              onClick={() => setAutoHide(!autoHide)}
              className={`p-1 transition-colors ${autoHide ? 'text-blue-400' : 'text-gray-400 hover:text-white'}`}
              title="Auto-hide when good"
            >
              <Settings className="h-3 w-3" />
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              title="Hide Metrics"
            >
              <EyeOff className="h-3 w-3" />
            </button>
          </div>
        </div>
        
        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="p-3 border-b border-yellow-500/20">
            <AlertBanner 
              alerts={alerts} 
              onAcknowledge={onAcknowledgeAlert}
              compact={compact}
            />
          </div>
        )}
        
        {/* Main Metrics */}
        {currentMetrics && isTracking && (
          <div className="p-3">
            {compact ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MetricIndicator
                    label="FPS"
                    value={currentMetrics.fps}
                    status={getMetricStatus.fps as 'good' | 'warning' | 'error'}
                    icon={<Zap className="h-3 w-3" />}
                    compact={true}
                  />
                  <MetricIndicator
                    label="Memory"
                    value={(currentMetrics.memoryUsage.jsHeapUsed / 1024 / 1024).toFixed(0)}
                    unit="MB"
                    status={getMetricStatus.memory as 'good' | 'warning' | 'error'}
                    icon={<MemoryStick className="h-3 w-3" />}
                    compact={true}
                  />
                </div>
                <MetricIndicator
                  label="Score"
                  value={currentMetrics.performanceScore}
                  unit="%"
                  status={getMetricStatus.performance as 'good' | 'warning' | 'error'}
                  icon={<Activity className="h-3 w-3" />}
                  compact={true}
                />
              </div>
            ) : (
              <div className="space-y-3">
                {/* Primary metrics */}
                <div className="grid grid-cols-2 gap-2">
                  <MetricIndicator
                    label="FPS"
                    value={currentMetrics.fps}
                    status={getMetricStatus.fps as 'good' | 'warning' | 'error'}
                    icon={<Zap className="h-4 w-4" />}
                  />
                  <MetricIndicator
                    label="Memory"
                    value={(currentMetrics.memoryUsage.jsHeapUsed / 1024 / 1024).toFixed(1)}
                    unit="MB"
                    status={getMetricStatus.memory as 'good' | 'warning' | 'error'}
                    icon={<MemoryStick className="h-4 w-4" />}
                  />
                </div>
                
                <MetricIndicator
                  label="Performance Score"
                  value={currentMetrics.performanceScore}
                  unit="%"
                  status={getMetricStatus.performance as 'good' | 'warning' | 'error'}
                  icon={<Activity className="h-4 w-4" />}
                />
                
                {/* Performance gauges */}
                <div className="flex justify-center gap-4 py-2">
                  <PerformanceGauge
                    value={currentMetrics.fps}
                    max={60}
                    label="FPS"
                    size={50}
                    color={getMetricStatus.fps === 'good' ? '#22c55e' : getMetricStatus.fps === 'warning' ? '#f59e0b' : '#ef4444'}
                  />
                  <PerformanceGauge
                    value={(currentMetrics.memoryUsage.jsHeapUsed / currentMetrics.memoryUsage.jsHeapLimit) * 100}
                    max={100}
                    label="Memory"
                    unit="%"
                    size={50}
                    color={getMetricStatus.memory === 'good' ? '#22c55e' : getMetricStatus.memory === 'warning' ? '#f59e0b' : '#ef4444'}
                  />
                  <PerformanceGauge
                    value={currentMetrics.performanceScore}
                    max={100}
                    label="Score"
                    unit="%"
                    size={50}
                    color={getMetricStatus.performance === 'good' ? '#22c55e' : getMetricStatus.performance === 'warning' ? '#f59e0b' : '#ef4444'}
                  />
                </div>
                
                {/* Advanced metrics */}
                {showAdvanced && (
                  <div className="pt-3 border-t border-yellow-500/20">
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <MetricIndicator
                        label="Render Time"
                        value={currentMetrics.renderTime.toFixed(1)}
                        unit="ms"
                        status={currentMetrics.renderTime <= 16 ? 'good' : currentMetrics.renderTime <= 33 ? 'warning' : 'error'}
                        icon={<Clock className="h-4 w-4" />}
                        compact={true}
                      />
                      <MetricIndicator
                        label="Load Time"
                        value={(currentMetrics.loadTime / 1000).toFixed(1)}
                        unit="s"
                        status={currentMetrics.loadTime <= 3000 ? 'good' : currentMetrics.loadTime <= 5000 ? 'warning' : 'error'}
                        icon={<Clock className="h-4 w-4" />}
                        compact={true}
                      />
                    </div>
                    
                    {/* System health indicators */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">WebGL Context:</span>
                        <span className={currentMetrics.webglContextHealth.isWebGL2 ? 'text-green-400' : 'text-yellow-400'}>
                          {currentMetrics.webglContextHealth.isWebGL2 ? 'WebGL2' : 'WebGL1'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Quality Level:</span>
                        <span className="text-white capitalize">{currentMetrics.qualityLevel}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Errors/Warnings:</span>
                        <span className={currentMetrics.errorCount > 0 || currentMetrics.warningCount > 0 ? 'text-red-400' : 'text-green-400'}>
                          {currentMetrics.errorCount}/{currentMetrics.warningCount}
                        </span>
                      </div>
                      {currentMetrics.adaptiveQualityActive && (
                        <div className="flex items-center gap-1 text-xs text-blue-400">
                          <BrainCircuit className="h-3 w-3" />
                          <span>Adaptive Quality Active</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* No tracking state */}
        {!isTracking && (
          <div className="p-4 text-center">
            <Monitor className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Performance tracking disabled</p>
            <p className="text-xs text-gray-500 mt-1">Enable tracking to see metrics</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default PerformanceMetricsDisplay