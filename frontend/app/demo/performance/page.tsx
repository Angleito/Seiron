'use client'

import { useState } from 'react'
import { DragonRenderer } from '@/components/dragon/DragonRenderer'
import { usePerformanceMonitor, PerformanceOverlay } from '@/hooks/usePerformanceMonitor'

export default function PerformanceDemoPage() {
  const [showOverlay, setShowOverlay] = useState(true)
  const [dragonType, setDragonType] = useState<'glb' | '2d' | 'ascii'>('glb')
  
  // Monitor page performance
  const pagePerformance = usePerformanceMonitor({
    componentName: 'PerformanceDemo',
    enabled: true
  })

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">🐉 Dragon Performance Monitor</h1>
        
        {/* Controls */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showOverlay}
                onChange={(e) => setShowOverlay(e.target.checked)}
                className="w-4 h-4"
              />
              <span>Show Performance Overlay</span>
            </label>
          </div>
          
          <div className="flex items-center gap-4">
            <label>Dragon Type:</label>
            <select
              value={dragonType}
              onChange={(e) => setDragonType(e.target.value as any)}
              className="bg-gray-800 px-4 py-2 rounded"
            >
              <option value="glb">GLB (3D Model)</option>
              <option value="2d">2D (Sprite)</option>
              <option value="ascii">ASCII (Text)</option>
            </select>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={() => pagePerformance.logMetrics()}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
            >
              Log Metrics to Console
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded"
            >
              Reload Page
            </button>
          </div>
        </div>
        
        {/* Performance Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-800 p-4 rounded">
            <h3 className="font-semibold mb-2">Performance Score</h3>
            <div className="text-2xl font-mono">
              {pagePerformance.performanceScore}%
            </div>
            <div className="text-sm text-gray-400 mt-1">
              {pagePerformance.recommendation}
            </div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded">
            <h3 className="font-semibold mb-2">Current FPS</h3>
            <div className="text-2xl font-mono">
              {pagePerformance.metrics.fps}
            </div>
            <div className="text-sm text-gray-400 mt-1">
              Target: 60 FPS
            </div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded">
            <h3 className="font-semibold mb-2">Render Quality</h3>
            <div className="text-2xl font-mono">
              {pagePerformance.isHighPerformance ? 'High' : 
               pagePerformance.shouldReduceQuality ? 'Low' : 'Medium'}
            </div>
            <div className="text-sm text-gray-400 mt-1">
              {pagePerformance.shouldDisableAnimations && 'Animations disabled'}
            </div>
          </div>
        </div>
        
        {/* Dragon Container */}
        <div className="relative h-[600px] bg-gray-800 rounded-lg overflow-hidden">
          <DragonRenderer
            key={dragonType} // Force remount when type changes
            size="lg"
            dragonType={dragonType}
            enableFallback={true}
            fallbackType="2d"
            enableAnimations={true}
            enablePerformanceMonitor={showOverlay}
            performanceMonitorPosition="top-right"
            voiceState={{
              isListening: false,
              isSpeaking: false,
              isProcessing: false,
              isIdle: true,
              volume: 0.5,
              emotion: 'calm'
            }}
            onError={(error, type) => {
              console.error(`Dragon ${type} error:`, error)
            }}
            onFallback={(fromType, toType) => {
              console.log(`Dragon fallback: ${fromType} → ${toType}`)
            }}
            className="w-full h-full"
          />
        </div>
        
        {/* Instructions */}
        <div className="mt-8 bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Performance Monitoring Instructions</h2>
          <ul className="space-y-2 text-gray-300">
            <li>• The overlay shows real-time performance metrics in the top-right corner</li>
            <li>• FPS color coding: Green (55+), Yellow (30-54), Red (&lt;30)</li>
            <li>• Loading time is tracked and displayed when the dragon loads</li>
            <li>• The dragon will auto-downgrade quality if performance is poor</li>
            <li>• Open the browser console to see detailed performance logs</li>
            <li>• Memory usage is displayed if your browser supports the Performance Memory API</li>
          </ul>
        </div>
      </div>
      
      {/* Page Performance Overlay */}
      <PerformanceOverlay
        metrics={pagePerformance.metrics}
        isVisible={showOverlay}
        position="bottom-left"
      />
    </div>
  )
}