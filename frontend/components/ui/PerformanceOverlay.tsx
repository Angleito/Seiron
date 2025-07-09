import React from 'react'
import { PerformanceMetrics } from '@/hooks/usePerformanceMonitor'

interface PerformanceOverlayProps {
  metrics: PerformanceMetrics
  isVisible?: boolean
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

export const PerformanceOverlay: React.FC<PerformanceOverlayProps> = ({
  metrics,
  isVisible = true,
  position = 'top-right'
}) => {
  if (!isVisible) return null

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  }

  return (
    <div className={`fixed ${positionClasses[position]} bg-black bg-opacity-50 text-white p-2 rounded text-xs z-50`}>
      <div>FPS: {metrics.fps}</div>
      <div>Frame Time: {metrics.frameTime.toFixed(2)}ms</div>
      <div>Render Time: {metrics.renderTime.toFixed(2)}ms</div>
      {metrics.memoryUsage && (
        <div>Memory: {(metrics.memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB</div>
      )}
    </div>
  )
}