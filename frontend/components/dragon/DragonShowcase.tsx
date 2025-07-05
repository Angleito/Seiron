'use client'

import { useState, useEffect } from 'react'
import { EnhancedDragonCharacter } from './EnhancedDragonCharacter'
import { DragonPresets, createDragonConfig, detectDeviceType } from './index'
import type { DragonState, DragonMood, PerformanceMode } from './types'
import { logger } from '@lib/logger'


export function DragonShowcase() {
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof DragonPresets>('Balanced')
  const [customState, setCustomState] = useState<DragonState>('idle')
  const [customMood, setCustomMood] = useState<DragonMood>('neutral')
  const [customSize, setCustomSize] = useState<'sm' | 'md' | 'lg' | 'xl' | 'xxl'>('lg')
  const [showDragonBalls, setShowDragonBalls] = useState(true)
  const [interactive, setInteractive] = useState(true)
  const [enableCursorTracking, setEnableCursorTracking] = useState(true)
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>('balanced')
  
  const [powerLevel, setPowerLevel] = useState(1000)
  const [currentFPS, setCurrentFPS] = useState(60)
  
  // SVG Configuration states
  const [renderMode, setRenderMode] = useState<'svg' | 'png' | 'auto'>('svg')
  const [svgQuality, setSvgQuality] = useState<'minimal' | 'standard' | 'enhanced'>('standard')
  const [enableSVGAnimations, setEnableSVGAnimations] = useState(true)

  const deviceType = detectDeviceType()

  // Monitor performance with state change prevention
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate FPS monitoring (in real implementation, this would be actual FPS)
      const baseFPS = 60
      const mockFPS = Math.max(30, Math.min(60, baseFPS + Math.random() * 5 - 2.5))
      const newFPS = Math.round(mockFPS)
      
      setCurrentFPS(prev => {
        // Only update if FPS changed
        if (prev === newFPS) return prev
        return newFPS
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const handleStateChange = (state: DragonState) => {
    logger.debug('Dragon state changed to:', state)
  }

  const handleMoodChange = (mood: DragonMood) => {
    logger.debug('Dragon mood changed to:', mood)
  }

  const handlePowerLevelChange = (level: number) => {
    logger.debug('Dragon power level changed to:', level)
  }

  const handleInteraction = (type: string) => {
    logger.debug('Dragon interaction:', type)
  }

  const dragonConfig = createDragonConfig(selectedPreset, {
    size: customSize,
    initialState: customState,
    initialMood: customMood,
    interactive,
    showDragonBalls,
    enableCursorTracking,
    animationConfig: {
      performanceMode,
      autoQualityAdjustment: true,
      enableParticles: true,
      enableAura: true
    },
    onStateChange: handleStateChange,
    onMoodChange: handleMoodChange,
    onPowerLevelChange: (level: number) => {
      setPowerLevel(level)
      handlePowerLevelChange(level)
    },
    onInteraction: handleInteraction
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-orange-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-white mb-8">
          Enhanced Dragon Animation Showcase
        </h1>
        <p className="text-center text-gray-300 mb-12">
          Experience the mystical power of Seiron with enhanced animations and scalable performance
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Dragon Display */}
          <div className="lg:col-span-2">
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-red-500/20">
              <div className="flex items-center justify-center min-h-[500px]">
                <EnhancedDragonCharacter {...dragonConfig} />
              </div>
              
              <div className="mt-8 text-center space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-2 gap-4 text-sm">
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="text-gray-400">FPS</div>
                    <div className={`font-semibold ${currentFPS >= 55 ? 'text-green-400' : currentFPS >= 45 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {currentFPS}
                    </div>
                  </div>
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="text-gray-400">Power Level</div>
                    <div className={`font-semibold ${powerLevel > 9000 ? 'text-red-400' : powerLevel > 5000 ? 'text-orange-400' : 'text-white'}`}>
                      {powerLevel > 9000 ? 'Over 9000!' : powerLevel}
                    </div>
                  </div>
                </div>
                
                <p className="text-white font-semibold">
                  Device: <span className="text-yellow-400">{deviceType}</span>
                </p>
                <p className="text-gray-300 text-sm">
                  Hover, click, or touch the dragon to interact
                </p>
                <p className="text-gray-400 text-xs">
                  On mobile: Swipe up/down to change power, pinch to power up
                </p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-6">
            {/* Preset Selection */}
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-red-500/20">
              <h3 className="text-lg font-semibold text-white mb-4">Dragon Presets</h3>
              <select 
                value={selectedPreset}
                onChange={(e) => setSelectedPreset(e.target.value as keyof typeof DragonPresets)}
                className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-600 focus:border-red-500 focus:outline-none"
              >
                {Object.keys(DragonPresets).map(preset => (
                  <option key={preset} value={preset}>{preset}</option>
                ))}
              </select>
            </div>

            {/* State Controls */}
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-red-500/20">
              <h3 className="text-lg font-semibold text-white mb-4">Dragon State</h3>
              <div className="space-y-3">
                <select 
                  value={customState}
                  onChange={(e) => setCustomState(e.target.value as DragonState)}
                  className="w-full p-2 rounded bg-gray-800 text-white border border-gray-600"
                >
                  {['idle', 'attention', 'ready', 'active', 'powering-up', 'arms-crossed', 'sleeping', 'awakening'].map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>

                <select 
                  value={customMood}
                  onChange={(e) => setCustomMood(e.target.value as DragonMood)}
                  className="w-full p-2 rounded bg-gray-800 text-white border border-gray-600"
                >
                  {['neutral', 'happy', 'excited', 'powerful', 'mystical', 'focused', 'aggressive', 'confident'].map(mood => (
                    <option key={mood} value={mood}>{mood}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* SVG Configuration */}
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-red-500/20">
              <h3 className="text-lg font-semibold text-white mb-4">SVG Configuration</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Render Mode</label>
                  <select 
                    value={renderMode}
                    onChange={(e) => setRenderMode(e.target.value as 'svg' | 'png' | 'auto')}
                    className="w-full p-2 rounded bg-gray-800 text-white border border-gray-600"
                  >
                    <option value="svg">SVG (Recommended)</option>
                    <option value="png">PNG (Legacy)</option>
                    <option value="auto">Auto Detection</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1">SVG Quality</label>
                  <select 
                    value={svgQuality}
                    onChange={(e) => setSvgQuality(e.target.value as 'minimal' | 'standard' | 'enhanced')}
                    className="w-full p-2 rounded bg-gray-800 text-white border border-gray-600"
                    disabled={renderMode === 'png'}
                  >
                    <option value="minimal">Minimal (Fastest)</option>
                    <option value="standard">Standard (Balanced)</option>
                    <option value="enhanced">Enhanced (Best Quality)</option>
                  </select>
                </div>

                <label className="flex items-center text-white">
                  <input
                    type="checkbox"
                    checked={enableSVGAnimations}
                    onChange={(e) => setEnableSVGAnimations(e.target.checked)}
                    disabled={renderMode === 'png'}
                    className="mr-3 rounded"
                  />
                  SVG Animations
                </label>
              </div>
            </div>

            {/* Size and Performance */}
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-red-500/20">
              <h3 className="text-lg font-semibold text-white mb-4">Display & Performance</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Size</label>
                  <select 
                    value={customSize}
                    onChange={(e) => setCustomSize(e.target.value as typeof customSize)}
                    className="w-full p-2 rounded bg-gray-800 text-white border border-gray-600"
                  >
                    {['sm', 'md', 'lg', 'xl', 'xxl'].map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1">Performance Mode</label>
                  <select 
                    value={performanceMode}
                    onChange={(e) => setPerformanceMode(e.target.value as PerformanceMode)}
                    className="w-full p-2 rounded bg-gray-800 text-white border border-gray-600"
                  >
                    <option value="quality">Quality (Best Visual)</option>
                    <option value="balanced">Balanced (Recommended)</option>
                    <option value="performance">Performance (Fastest)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-1">Power Level: {powerLevel}</label>
                  <input
                    type="range"
                    min="1000"
                    max="9500"
                    step="100"
                    value={powerLevel}
                    onChange={(e) => setPowerLevel(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Feature Toggles */}
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-red-500/20">
              <h3 className="text-lg font-semibold text-white mb-4">Features</h3>
              <div className="space-y-3">
                <label className="flex items-center text-white">
                  <input
                    type="checkbox"
                    checked={showDragonBalls}
                    onChange={(e) => setShowDragonBalls(e.target.checked)}
                    className="mr-3 rounded"
                  />
                  Dragon Balls
                </label>
                
                <label className="flex items-center text-white">
                  <input
                    type="checkbox"
                    checked={interactive}
                    onChange={(e) => setInteractive(e.target.checked)}
                    className="mr-3 rounded"
                  />
                  Interactive
                </label>
                
                <label className="flex items-center text-white">
                  <input
                    type="checkbox"
                    checked={enableCursorTracking}
                    onChange={(e) => setEnableCursorTracking(e.target.checked)}
                    className="mr-3 rounded"
                  />
                  Cursor Tracking
                </label>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-red-500/20">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  onClick={() => {
                    setSelectedPreset('PowerfulDragon')
                    setPowerLevel(8500)
                  }}
                  className="p-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                >
                  Power Up
                </button>
                <button
                  onClick={() => setSelectedPreset('AttentiveDragon')}
                  className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                >
                  Attention
                </button>
                <button
                  onClick={() => setSelectedPreset('ConfidentDragon')}
                  className="p-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm transition-colors"
                >
                  Arms Crossed
                </button>
                <button
                  onClick={() => {
                    setSelectedPreset('IdleDragon')
                    setPowerLevel(1000)
                  }}
                  className="p-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
                >
                  Reset Idle
                </button>
              </div>
              
              <div className="border-t border-gray-600 pt-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Quick Presets</h4>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => {
                      setPerformanceMode('quality')
                    }}
                    className="p-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                  >
                    Max Quality
                  </button>
                  <button
                    onClick={() => {
                      setPerformanceMode('performance')
                    }}
                    className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors"
                  >
                    Mobile Optimized
                  </button>
                  <button
                    onClick={() => {
                      setPowerLevel(9001)
                      setCustomState('powering-up')
                      setCustomMood('powerful')
                    }}
                    className="p-2 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm transition-colors"
                  >
                    Over 9000!
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-12 bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-red-500/20">
          <h3 className="text-xl font-semibold text-white mb-4">Enhanced Dragon Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm">
            <div>
              <h4 className="font-semibold text-yellow-400 mb-2">🎭 States & Moods</h4>
              <ul className="text-gray-300 space-y-1">
                <li>• 8 distinct dragon states</li>
                <li>• 8 different moods</li>
                <li>• Automatic state transitions</li>
                <li>• Arms-crossed anticipation pose</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-green-400 mb-2">🖼️ Graphics</h4>
              <ul className="text-gray-300 space-y-1">
                <li>• High-quality animations</li>
                <li>• Smooth transitions</li>
                <li>• Particle effects</li>
                <li>• Dynamic rendering</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-blue-400 mb-2">🎮 Interactions</h4>
              <ul className="text-gray-300 space-y-1">
                <li>• Cursor tracking & eye movement</li>
                <li>• Touch gestures (mobile)</li>
                <li>• Proximity detection</li>
                <li>• Power level control</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-purple-400 mb-2">⚡ Performance</h4>
              <ul className="text-gray-300 space-y-1">
                <li>• GPU-accelerated SVG transforms</li>
                <li>• Adaptive quality levels</li>
                <li>• Real-time FPS monitoring</li>
                <li>• Optimized for mobile devices</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
            <h4 className="font-semibold text-green-400 mb-2">✨ Performance Benefits</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
              <ul className="space-y-1">
                <li>• Optimized rendering engine</li>
                <li>• Efficient animation system</li>
                <li>• Adaptive quality settings</li>
              </ul>
              <ul className="space-y-1">
                <li>• Enhanced accessibility features</li>
                <li>• Better memory efficiency</li>
                <li>• Mobile-optimized performance</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}