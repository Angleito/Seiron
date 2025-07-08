'use client'

import React, { useState } from 'react'
import { DragonHead3DOptimized } from '@/components/effects/DragonHead3DOptimized'
import { StormBackground } from '@/components/effects/StormBackground'
import { useStormPerformance, StormPerformanceMonitor } from '@/hooks/useStormPerformance'

export function DragonOptimizationExample() {
  const [dragonQuality, setDragonQuality] = useState<'low' | 'medium' | 'high' | 'auto'>('auto')
  const [showStormBackground, setShowStormBackground] = useState(true)
  const [enableEyeTracking, setEnableEyeTracking] = useState(true)
  const [showPerformanceMonitor, setShowPerformanceMonitor] = useState(true)
  const { metrics, config } = useStormPerformance()

  return (
    <div className="relative min-h-screen">
      {/* Storm Background (optional) */}
      {showStormBackground && (
        <StormBackground className="fixed inset-0" intensity={0.5} animated={true} />
      )}

      {/* Performance Monitor */}
      {showPerformanceMonitor && <StormPerformanceMonitor />}

      {/* Content */}
      <div className="relative z-10 container mx-auto p-8">
        <div className="max-w-2xl mx-auto bg-black/80 border border-red-900 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-red-400 mb-2">Dragon Optimization Test</h1>
          <p className="text-gray-400 mb-6">
            Test different dragon rendering modes and performance settings
          </p>

          {/* Current Performance Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-black/50 p-4 rounded-lg">
              <p className="text-sm text-gray-400">FPS</p>
              <p className="text-2xl font-bold text-white">{metrics.fps.toFixed(1)}</p>
            </div>
            <div className="bg-black/50 p-4 rounded-lg">
              <p className="text-sm text-gray-400">Device</p>
              <p className="text-2xl font-bold text-white capitalize">{metrics.deviceType}</p>
            </div>
          </div>

          {/* Dragon Quality Control */}
          <div className="mb-6">
            <label className="block text-white mb-2">Dragon Quality</label>
            <select 
              value={dragonQuality} 
              onChange={(e) => setDragonQuality(e.target.value as any)}
              className="w-full bg-black/50 border border-red-900 text-white p-2 rounded"
            >
              <option value="auto">Auto (Based on Performance)</option>
              <option value="low">Low (CSS Fallback)</option>
              <option value="medium">Medium (Simple 3D)</option>
              <option value="high">High (Full 3D Model)</option>
            </select>
          </div>

          {/* Toggle Controls */}
          <div className="space-y-4 mb-6">
            <label className="flex items-center justify-between text-white cursor-pointer">
              <span>Storm Background</span>
              <input
                type="checkbox"
                checked={showStormBackground}
                onChange={(e) => setShowStormBackground(e.target.checked)}
                className="w-4 h-4 text-red-600"
              />
            </label>
            <label className="flex items-center justify-between text-white cursor-pointer">
              <span>Eye Tracking</span>
              <input
                type="checkbox"
                checked={enableEyeTracking}
                onChange={(e) => setEnableEyeTracking(e.target.checked)}
                className="w-4 h-4 text-red-600"
              />
            </label>
            <label className="flex items-center justify-between text-white cursor-pointer">
              <span>Performance Monitor</span>
              <input
                type="checkbox"
                checked={showPerformanceMonitor}
                onChange={(e) => setShowPerformanceMonitor(e.target.checked)}
                className="w-4 h-4 text-red-600"
              />
            </label>
          </div>

          {/* Current Config Info */}
          <div className="bg-black/50 p-4 rounded-lg text-sm">
            <p className="text-gray-400">Current Rendering Config:</p>
            <p className="text-white mt-1">
              Quality: {config.animationQuality} | 
              Particles: {config.particleCount} | 
              Clouds: {config.cloudLayers}
            </p>
          </div>
        </div>

        {/* Dragon Display Area */}
        <div className="relative h-96 mt-8">
          <DragonHead3DOptimized
            className="absolute inset-0"
            enableEyeTracking={enableEyeTracking}
            forceQuality={dragonQuality}
            intensity={0.8}
          />
        </div>
      </div>
    </div>
  )
}

export default DragonOptimizationExample