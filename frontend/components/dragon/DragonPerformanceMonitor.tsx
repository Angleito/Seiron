'use client'

import React from 'react'
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor'

interface DragonPerformanceMonitorProps {
  enabled?: boolean
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  className?: string
}

export const DragonPerformanceMonitor: React.FC<DragonPerformanceMonitorProps> = ({
  enabled = false,
  position = 'top-left',
  className = ''
}) => {
  const { metrics } = usePerformanceMonitor(enabled)

  if (!enabled) return null

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  }

  const getPerformanceColor = (fps: number) => {
    if (fps >= 50) return 'text-green-400'
    if (fps >= 30) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className={`
      fixed z-[9999] 
      ${positionClasses[position]}
      bg-black/80 backdrop-blur-sm
      rounded-lg p-3 font-mono text-xs
      border border-yellow-400/20
      ${className}
    `}>
      <div className="text-yellow-400 font-bold mb-2">🐉 Dragon Performance</div>
      
      <div className="space-y-1">
        <div className={`flex justify-between ${getPerformanceColor(metrics.fps)}`}>
          <span>FPS:</span>
          <span className="font-bold">{metrics.fps}</span>
        </div>
        
        <div className="flex justify-between text-yellow-400/80">
          <span>Frame Time:</span>
          <span>{metrics.frameTime.toFixed(2)}ms</span>
        </div>
        
        <div className="flex justify-between text-yellow-400/80">
          <span>Render Time:</span>
          <span>{metrics.renderTime.toFixed(2)}ms</span>
        </div>
        
        {metrics.memoryUsage && (
          <>
            <div className="border-t border-yellow-400/20 mt-2 pt-2">
              <div className="text-yellow-400 font-bold mb-1">Memory Usage</div>
              <div className="flex justify-between text-yellow-400/80">
                <span>Used:</span>
                <span>{(metrics.memoryUsage.usedJSHeapSize / 1048576).toFixed(1)}MB</span>
              </div>
              <div className="flex justify-between text-yellow-400/80">
                <span>Total:</span>
                <span>{(metrics.memoryUsage.totalJSHeapSize / 1048576).toFixed(1)}MB</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}