'use client'

import { useState } from 'react'
import { AccessibleDragonAnimation } from './AccessibleDragonAnimation'
import { ResponsiveDragonAnimation } from './ResponsiveDragonAnimation'
import { useResponsive } from '@hooks/useResponsive'
import { useDragonGestures } from '@hooks/useDragonGestures'
import { usePerformanceMonitor } from '@hooks/usePerformanceMonitor'

export function DragonAnimationDemo() {
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(false)
  const [animationQuality, setAnimationQuality] = useState<'auto' | 'high' | 'balanced' | 'low'>('auto')
  const [dragonPower, setDragonPower] = useState(0)
  const [lastGesture, setLastGesture] = useState('')

  const responsive = useResponsive()
  const performance = usePerformanceMonitor({
    enabled: showPerformanceMonitor,
    onPerformanceWarning: (metrics) => {
      console.warn('Performance warning:', metrics)
      // Auto-adjust quality if performance is poor
      if (metrics.fps < 30 && animationQuality === 'auto') {
        setAnimationQuality('low')
      }
    }
  })

  const gestures = useDragonGestures({
    onTap: () => {
      setLastGesture('Tap detected!')
      setDragonPower(prev => Math.min(prev + 10, 100))
    },
    onLongPress: () => {
      setLastGesture('Long press - Dragon awakens!')
      setDragonPower(100)
    },
    onSwipe: (direction, velocity) => {
      setLastGesture(`Swipe ${direction} at ${Math.round(velocity)}px/s`)
      if (direction === 'up') {
        setDragonPower(prev => Math.min(prev + 20, 100))
      } else if (direction === 'down') {
        setDragonPower(prev => Math.max(prev - 20, 0))
      }
    },
    onPinch: (scale) => {
      setLastGesture(`Pinch scale: ${scale.toFixed(2)}`)
    },
    enabled: responsive.isTouchDevice
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header with controls */}
      <div className="p-4 bg-black/50 backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-white mb-4">
          Responsive Dragon Animation Demo
        </h1>
        
        <div className="flex flex-wrap gap-4 text-white">
          {/* Device info */}
          <div className="text-sm">
            <p>Screen: {responsive.width}x{responsive.height}</p>
            <p>Breakpoint: {responsive.breakpoint}</p>
            <p>Orientation: {responsive.isPortrait ? 'Portrait' : 'Landscape'}</p>
            <p>Touch: {responsive.isTouchDevice ? 'Yes' : 'No'}</p>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowPerformanceMonitor(!showPerformanceMonitor)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
            >
              {showPerformanceMonitor ? 'Hide' : 'Show'} Performance
            </button>
            
            <select
              value={animationQuality}
              onChange={(e) => setAnimationQuality(e.target.value as any)}
              className="px-4 py-2 bg-gray-700 rounded text-sm"
            >
              <option value="auto">Auto Quality</option>
              <option value="high">High Quality</option>
              <option value="balanced">Balanced</option>
              <option value="low">Low Quality</option>
            </select>
          </div>
        </div>

        {/* Gesture feedback */}
        {responsive.isTouchDevice && lastGesture && (
          <div className="mt-2 text-yellow-400 text-sm animate-pulse">
            {lastGesture}
          </div>
        )}
      </div>

      {/* Main dragon animation container */}
      <div className="flex items-center justify-center p-8" style={{ minHeight: '60vh' }}>
        <AccessibleDragonAnimation
          className="w-full max-w-4xl"
          showDragonBalls={true}
          interactive={true}
          autoScale={true}
          highContrastMode="auto"
        />
      </div>

      {/* Dragon power indicator */}
      {dragonPower > 0 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="bg-black/80 rounded-full px-6 py-3">
            <div className="text-center text-white mb-2">Dragon Power</div>
            <div className="w-48 h-4 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-yellow-400 to-red-500 transition-all duration-500"
                style={{ width: `${dragonPower}%` }}
              />
            </div>
            <div className="text-center text-yellow-400 text-sm mt-1">
              {dragonPower}%
            </div>
          </div>
        </div>
      )}

      {/* Performance monitor overlay */}
      {showPerformanceMonitor && (
        <div className="performance-overlay">
          <h3 className="text-sm font-bold mb-2">Performance Monitor</h3>
          <div className="performance-metric">
            <span>FPS:</span>
            <span className={performance.metrics.fps >= 50 ? 'performance-good' : 
                           performance.metrics.fps >= 30 ? 'performance-fair' : 
                           'performance-poor'}>
              {Math.round(performance.metrics.fps)}
            </span>
          </div>
          <div className="performance-metric">
            <span>Frame Time:</span>
            <span>{performance.metrics.frameTime.toFixed(2)}ms</span>
          </div>
          <div className="performance-metric">
            <span>Dropped:</span>
            <span>{performance.metrics.droppedFrames}</span>
          </div>
          <div className="performance-metric">
            <span>Smoothness:</span>
            <span>{(performance.metrics.animationSmoothness * 100).toFixed(0)}%</span>
          </div>
          <div className="performance-metric">
            <span>Score:</span>
            <span className={performance.performanceScore >= 70 ? 'performance-good' : 
                           performance.performanceScore >= 50 ? 'performance-fair' : 
                           'performance-poor'}>
              {performance.performanceScore}/100
            </span>
          </div>
          <div className="text-xs mt-2 text-gray-400">
            {performance.recommendation}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="p-4 text-center text-gray-400">
        {responsive.isTouchDevice ? (
          <div>
            <p>Touch Gestures:</p>
            <p className="text-sm">Tap to charge • Long press for max power • Swipe up/down to adjust</p>
          </div>
        ) : (
          <div>
            <p>Keyboard Controls:</p>
            <p className="text-sm">Space/Enter to activate • Arrow keys to adjust power • Tab to navigate</p>
          </div>
        )}
      </div>

      {/* Import responsive styles */}
      <style>{`
        @import '/styles/dragon-responsive.css';
      `}</style>
    </div>
  )
}