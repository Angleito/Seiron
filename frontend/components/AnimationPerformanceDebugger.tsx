'use client'

import { useEffect, useState } from 'react'
import { useAnimationPerformance, type QualityLevel } from '../hooks/useAnimationPerformance'

interface AnimationPerformanceDebuggerProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  expanded?: boolean
  onQualityOverride?: (level: QualityLevel | null) => void
}

export function AnimationPerformanceDebugger({
  position = 'top-right',
  expanded = true,
  onQualityOverride
}: AnimationPerformanceDebuggerProps) {
  const {
    qualityLevel,
    metrics,
    isMonitoring,
    shouldReduceMotion,
    startMonitoring,
    stopMonitoring,
    forceQualityLevel,
    resetMetrics
  } = useAnimationPerformance()
  
  const [isExpanded, setIsExpanded] = useState(expanded)
  const [selectedQuality, setSelectedQuality] = useState<QualityLevel | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [fpsHistory, setFpsHistory] = useState<number[]>([])
  
  // Track FPS history
  useEffect(() => {
    if (isMonitoring && metrics.fps > 0) {
      setFpsHistory(prev => {
        const newHistory = [...prev, metrics.fps]
        // Keep last 60 samples
        return newHistory.slice(-60)
      })
    }
  }, [metrics.fps, isMonitoring])
  
  // Auto-start monitoring in development
  useEffect(() => {
    if (import.meta.env.DEV) {
      startMonitoring()
    }
    return () => stopMonitoring()
  }, [startMonitoring, stopMonitoring])
  
  const handleQualityChange = (level: QualityLevel | null) => {
    setSelectedQuality(level)
    if (level) {
      forceQualityLevel(level)
      onQualityOverride?.(level)
    } else {
      onQualityOverride?.(null)
    }
  }
  
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  }
  
  const getFPSColor = (fps: number) => {
    if (fps >= 55) return 'text-green-400'
    if (fps >= 45) return 'text-yellow-400'
    if (fps >= 30) return 'text-orange-400'
    return 'text-red-400'
  }
  
  const getQualityColor = (level: QualityLevel) => {
    if (level > 75) return 'text-green-400'
    if (level > 50) return 'text-yellow-400'
    return 'text-orange-400'
  }
  
  // Don't render in production unless explicitly enabled
  if (import.meta.env.PROD && !window.location.search.includes('debug=true')) {
    return null
  }
  
  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      <div className="bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-2xl border border-gray-700 overflow-hidden">
        {/* Header */}
        <div 
          className="flex items-center justify-between p-2 bg-gray-800 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <h3 className="text-xs font-bold text-white">Animation Performance</h3>
          <button className="text-gray-400 hover:text-white">
            {isExpanded ? '−' : '+'}
          </button>
        </div>
        
        {isExpanded && (
          <div className="p-3 space-y-3">
            {/* Main Metrics */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-800/50 rounded p-2">
                <div className="text-gray-400 text-xs">FPS</div>
                <div className={`text-lg font-mono ${getFPSColor(metrics.fps)}`}>
                  {metrics.fps.toFixed(1)}
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded p-2">
                <div className="text-gray-400 text-xs">Quality</div>
                <div className={`text-lg font-mono ${getQualityColor(qualityLevel)}`}>
                  {qualityLevel}%
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded p-2">
                <div className="text-gray-400 text-xs">Frame Time</div>
                <div className="text-sm font-mono text-white">
                  {metrics.frameTime.toFixed(1)}ms
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded p-2">
                <div className="text-gray-400 text-xs">Dropped</div>
                <div className="text-sm font-mono text-white">
                  {metrics.droppedFrames}
                </div>
              </div>
            </div>
            
            {/* System Info */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">CPU Usage:</span>
                <span className="text-white font-mono">{metrics.cpuUsage}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Memory:</span>
                <span className="text-white font-mono">{metrics.memoryUsage}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Reduced Motion:</span>
                <span className={`font-mono ${shouldReduceMotion ? 'text-yellow-400' : 'text-gray-400'}`}>
                  {shouldReduceMotion ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>
            
            {/* Quality Override */}
            <div className="border-t border-gray-700 pt-2">
              <div className="text-xs text-gray-400 mb-1">Quality Override</div>
              <div className="flex gap-1">
                {([25, 50, 75] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => handleQualityChange(level === selectedQuality ? null : level)}
                    className={`
                      px-2 py-1 text-xs rounded transition-colors
                      ${selectedQuality === level 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }
                    `}
                  >
                    {level}%
                  </button>
                ))}
                <button
                  onClick={() => handleQualityChange(null)}
                  className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
                >
                  Auto
                </button>
              </div>
            </div>
            
            {/* FPS History */}
            <div className="border-t border-gray-700 pt-2">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-xs text-gray-400 hover:text-white mb-1"
              >
                {showHistory ? 'Hide' : 'Show'} FPS History
              </button>
              
              {showHistory && fpsHistory.length > 0 && (
                <div className="h-20 bg-gray-800/50 rounded p-2">
                  <svg className="w-full h-full" viewBox="0 0 100 40">
                    <polyline
                      fill="none"
                      stroke="rgba(34, 197, 94, 0.5)"
                      strokeWidth="1"
                      points={fpsHistory.map((fps, i) => {
                        const x = (i / (fpsHistory.length - 1)) * 100
                        const y = 40 - (fps / 60) * 40
                        return `${x},${y}`
                      }).join(' ')}
                    />
                    {/* 60 FPS line */}
                    <line x1="0" y1="0" x2="100" y2="0" stroke="rgba(34, 197, 94, 0.2)" strokeWidth="1" />
                    {/* 30 FPS line */}
                    <line x1="0" y1="20" x2="100" y2="20" stroke="rgba(251, 146, 60, 0.2)" strokeWidth="1" />
                  </svg>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>60 FPS</span>
                    <span>30 FPS</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-gray-700">
              <button
                onClick={resetMetrics}
                className="flex-1 px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
              >
                Reset
              </button>
              <button
                onClick={() => isMonitoring ? stopMonitoring() : startMonitoring()}
                className={`
                  flex-1 px-2 py-1 text-xs rounded
                  ${isMonitoring 
                    ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30' 
                    : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                  }
                `}
              >
                {isMonitoring ? 'Stop' : 'Start'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}