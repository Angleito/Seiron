/**
 * High Performance SVG Dragon Example
 * 
 * Demonstrates maximum performance optimization techniques
 * for mobile devices and low-end hardware.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { EnhancedDragonCharacter, detectDeviceType } from '@/components/dragon'
import { useAnimationPerformance } from '@/components/dragon/hooks'
import type { DragonState, PerformanceMode } from '@/components/dragon/types'

export function HighPerformanceDragon() {
  const [currentFPS, setCurrentFPS] = useState(60)
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>('performance')
  const [autoOptimize, setAutoOptimize] = useState(true)
  
  const deviceType = detectDeviceType()
  const { metrics, qualityLevel } = useAnimationPerformance(autoOptimize)

  // Adaptive configuration based on performance
  const dragonConfig = useMemo(() => {
    const isMobile = deviceType === 'mobile'
    const isLowPerformance = qualityLevel < 50
    
    return {
      size: isMobile ? 'md' : 'lg' as const,
      renderMode: 'svg' as const,
      svgQuality: isLowPerformance ? 'minimal' : 'standard' as const,
      enableSVGAnimations: !isLowPerformance,
      interactive: true,
      showDragonBalls: !isLowPerformance,
      animationConfig: {
        performanceMode,
        autoQualityAdjustment: autoOptimize,
        enableParticles: qualityLevel > 60,
        enableAura: qualityLevel > 75,
        enableBreathing: qualityLevel > 40,
        enableMicroMovements: qualityLevel > 50,
        particleCount: Math.max(5, Math.floor(qualityLevel / 10)),
        reducedMotion: false
      },
      dragonBallConfig: {
        count: isLowPerformance ? 3 : isMobile ? 4 : 7,
        orbitPattern: isLowPerformance ? 'circular' : 'elliptical' as const,
        interactionEnabled: !isLowPerformance
      }
    }
  }, [deviceType, qualityLevel, performanceMode, autoOptimize])

  // Mock FPS monitoring (in real app, this would be actual performance data)
  useEffect(() => {
    const interval = setInterval(() => {
      const baseFPS = dragonConfig.svgQuality === 'minimal' ? 60 : 
                     dragonConfig.svgQuality === 'standard' ? 55 : 50
      const mockFPS = Math.max(30, baseFPS + Math.random() * 10 - 5)
      setCurrentFPS(Math.round(mockFPS))
    }, 1000)

    return () => clearInterval(interval)
  }, [dragonConfig.svgQuality])

  const handleStateChange = useCallback((state: DragonState) => {
    console.log('Dragon state changed:', state, 'Performance:', qualityLevel)
  }, [qualityLevel])

  const getPerformanceColor = (fps: number) => {
    if (fps >= 55) return 'text-green-400'
    if (fps >= 45) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getQualityBadge = (quality: number) => {
    if (quality >= 75) return { label: 'High', color: 'bg-green-600' }
    if (quality >= 50) return { label: 'Medium', color: 'bg-yellow-600' }
    return { label: 'Low', color: 'bg-red-600' }
  }

  const qualityBadge = getQualityBadge(qualityLevel)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            High Performance SVG Dragon
          </h1>
          <p className="text-gray-300 text-lg">
            Optimized for mobile devices and low-end hardware with adaptive quality adjustment
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Dragon Display */}
          <div className="lg:col-span-2">
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-blue-500/20">
              <div className="flex items-center justify-center min-h-[400px]">
                <EnhancedDragonCharacter
                  {...dragonConfig}
                  onStateChange={handleStateChange}
                />
              </div>
              
              {/* Performance Metrics */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-black/20 rounded-lg p-3 text-center">
                  <div className="text-gray-400 text-sm">FPS</div>
                  <div className={`text-2xl font-bold ${getPerformanceColor(currentFPS)}`}>
                    {currentFPS}
                  </div>
                </div>
                <div className="bg-black/20 rounded-lg p-3 text-center">
                  <div className="text-gray-400 text-sm">Quality</div>
                  <div className="flex items-center justify-center">
                    <span className={`px-2 py-1 rounded text-white text-sm ${qualityBadge.color}`}>
                      {qualityBadge.label}
                    </span>
                  </div>
                </div>
                <div className="bg-black/20 rounded-lg p-3 text-center">
                  <div className="text-gray-400 text-sm">Device</div>
                  <div className="text-blue-400 font-semibold text-sm">
                    {deviceType}
                  </div>
                </div>
                <div className="bg-black/20 rounded-lg p-3 text-center">
                  <div className="text-gray-400 text-sm">Mode</div>
                  <div className="text-purple-400 font-semibold text-sm">
                    {performanceMode}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Controls */}
          <div className="space-y-6">
            {/* Performance Mode */}
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20">
              <h3 className="text-lg font-semibold text-white mb-4">Performance Mode</h3>
              <div className="space-y-3">
                <label className="flex items-center text-white">
                  <input
                    type="radio"
                    name="performance"
                    checked={performanceMode === 'performance'}
                    onChange={() => setPerformanceMode('performance')}
                    className="mr-3"
                  />
                  Performance (Fastest)
                </label>
                <label className="flex items-center text-white">
                  <input
                    type="radio"
                    name="performance"
                    checked={performanceMode === 'balanced'}
                    onChange={() => setPerformanceMode('balanced')}
                    className="mr-3"
                  />
                  Balanced (Recommended)
                </label>
                <label className="flex items-center text-white">
                  <input
                    type="radio"
                    name="performance"
                    checked={performanceMode === 'quality'}
                    onChange={() => setPerformanceMode('quality')}
                    className="mr-3"
                  />
                  Quality (Best Visual)
                </label>
              </div>
            </div>

            {/* Auto Optimization */}
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20">
              <h3 className="text-lg font-semibold text-white mb-4">Auto Optimization</h3>
              <label className="flex items-center text-white">
                <input
                  type="checkbox"
                  checked={autoOptimize}
                  onChange={(e) => setAutoOptimize(e.target.checked)}
                  className="mr-3 rounded"
                />
                Enable Adaptive Quality
              </label>
              <p className="text-gray-400 text-sm mt-2">
                Automatically adjusts quality based on performance metrics
              </p>
            </div>

            {/* Current Configuration */}
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20">
              <h3 className="text-lg font-semibold text-white mb-4">Current Config</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">SVG Quality:</span>
                  <span className="text-white">{dragonConfig.svgQuality}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Animations:</span>
                  <span className="text-white">
                    {dragonConfig.enableSVGAnimations ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Particles:</span>
                  <span className="text-white">
                    {dragonConfig.animationConfig.enableParticles ? dragonConfig.animationConfig.particleCount : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Dragon Balls:</span>
                  <span className="text-white">{dragonConfig.dragonBallConfig.count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Aura:</span>
                  <span className="text-white">
                    {dragonConfig.animationConfig.enableAura ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Performance Tips */}
            <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-green-400 mb-4">Performance Tips</h3>
              <ul className="text-green-300 text-sm space-y-2">
                <li>• Enable auto optimization for best results</li>
                <li>• Use 'minimal' quality on mobile devices</li>
                <li>• Disable particles below 60% quality</li>
                <li>• Reduce dragon ball count for better FPS</li>
                <li>• Monitor FPS and adjust accordingly</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HighPerformanceDragon