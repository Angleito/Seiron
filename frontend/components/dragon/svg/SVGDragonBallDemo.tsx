'use client'

import React, { useState, useCallback } from 'react'
import { SVGDragonBalls } from './DragonBalls'
import { EnhancedSVGDragonBalls } from './EnhancedSVGDragonBalls'
import { PerformanceSVGDragonBalls } from './PerformanceSVGDragonBalls'
import { 
  DRAGON_BALL_PRESETS, 
  DRAGON_SIZE_CONFIG,
  selectOptimalDragonBallComponent,
  DEFAULT_SVG_CONFIG 
} from './index'

interface SVGDragonBallDemoProps {
  className?: string
}

type ComponentType = 'standard' | 'enhanced' | 'performance'
type DragonState = 'idle' | 'attention' | 'ready' | 'active' | 'powering-up'
type OrbitPattern = 'circular' | 'elliptical' | 'chaotic' | 'figure-eight'

export const SVGDragonBallDemo: React.FC<SVGDragonBallDemoProps> = ({
  className = ''
}) => {
  const [selectedComponent, setSelectedComponent] = useState<ComponentType>('enhanced')
  const [dragonState, setDragonState] = useState<DragonState>('idle')
  const [orbitPattern, setOrbitPattern] = useState<OrbitPattern>('elliptical')
  const [ballCount, setBallCount] = useState(7)
  const [orbitSpeed, setOrbitSpeed] = useState(1.0)
  const [ballSize, setBallSize] = useState(32)
  const [radius, setRadius] = useState(150)
  const [interactive, setInteractive] = useState(true)
  const [wishCount, setWishCount] = useState(0)
  
  const handleWishGranted = useCallback(() => {
    setWishCount(prev => prev + 1)
    // Show a celebration animation or message
    setTimeout(() => {
      setDragonState('idle')
    }, 3000)
  }, [])
  
  const config = {
    count: ballCount,
    orbitPattern,
    orbitSpeed,
    orbitRadius: radius,
    individualAnimation: selectedComponent !== 'performance',
    interactionEnabled: interactive
  }
  
  const renderSelectedComponent = () => {
    const commonProps = {
      radius,
      ballSize,
      orbitalMode: orbitPattern,
      interactive,
      config,
      dragonState,
      onWishGranted: handleWishGranted,
      className: "mx-auto"
    }
    
    switch (selectedComponent) {
      case 'standard':
        return <SVGDragonBalls {...commonProps} />
      case 'enhanced':
        return <EnhancedSVGDragonBalls {...commonProps} useNativeAnimations={true} />
      case 'performance':
        return <PerformanceSVGDragonBalls {...commonProps} enableGPUAcceleration={true} />
      default:
        return <EnhancedSVGDragonBalls {...commonProps} />
    }
  }
  
  const optimal = selectOptimalDragonBallComponent({
    performanceMode: selectedComponent === 'performance' ? 'performance' : 'quality',
    complexity: selectedComponent === 'enhanced' ? 'maximum' : 'enhanced',
    interactivity: interactive ? 'full' : 'none',
    visualQuality: selectedComponent === 'performance' ? 'minimal' : 'premium'
  })
  
  return (
    <div className={`svg-dragon-ball-demo p-6 bg-gray-900 text-white min-h-screen ${className}`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-yellow-400 mb-2">
            SVG Dragon Ball System Demo
          </h1>
          <p className="text-gray-300">
            Experience the enhanced SVG-based orbital animation system
          </p>
          {wishCount > 0 && (
            <div className="mt-2 text-green-400">
              Wishes granted: {wishCount} ⭐
            </div>
          )}
        </div>
        
        {/* Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Component Selection */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-yellow-400">Component Type</h3>
            <div className="space-y-2">
              {(['standard', 'enhanced', 'performance'] as ComponentType[]).map(type => (
                <label key={type} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value={type}
                    checked={selectedComponent === type}
                    onChange={(e) => setSelectedComponent(e.target.value as ComponentType)}
                    className="text-yellow-400"
                  />
                  <span className="capitalize">{type}</span>
                  {type === 'enhanced' && <span className="text-xs text-green-400">(Recommended)</span>}
                </label>
              ))}
            </div>
            <div className="mt-3 text-xs text-gray-400">
              <strong>Optimal:</strong> {optimal.component}
            </div>
          </div>
          
          {/* Dragon State */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-yellow-400">Dragon State</h3>
            <div className="space-y-2">
              {(['idle', 'attention', 'ready', 'active', 'powering-up'] as DragonState[]).map(state => (
                <label key={state} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value={state}
                    checked={dragonState === state}
                    onChange={(e) => setDragonState(e.target.value as DragonState)}
                    className="text-yellow-400"
                  />
                  <span className="capitalize">{state.replace('-', ' ')}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* Orbit Pattern */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-yellow-400">Orbit Pattern</h3>
            <div className="space-y-2">
              {(['circular', 'elliptical', 'chaotic', 'figure-eight'] as OrbitPattern[]).map(pattern => (
                <label key={pattern} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value={pattern}
                    checked={orbitPattern === pattern}
                    onChange={(e) => setOrbitPattern(e.target.value as OrbitPattern)}
                    className="text-yellow-400"
                  />
                  <span className="capitalize">{pattern.replace('-', ' ')}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        
        {/* Advanced Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 p-4 rounded-lg">
            <label className="block text-sm font-medium mb-2">Dragon Ball Count</label>
            <input
              type="range"
              min="3"
              max="7"
              value={ballCount}
              onChange={(e) => setBallCount(Number(e.target.value))}
              className="w-full"
            />
            <div className="text-center text-sm text-gray-400">{ballCount}</div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <label className="block text-sm font-medium mb-2">Orbit Speed</label>
            <input
              type="range"
              min="0.2"
              max="2.0"
              step="0.1"
              value={orbitSpeed}
              onChange={(e) => setOrbitSpeed(Number(e.target.value))}
              className="w-full"
            />
            <div className="text-center text-sm text-gray-400">{orbitSpeed.toFixed(1)}x</div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <label className="block text-sm font-medium mb-2">Ball Size</label>
            <input
              type="range"
              min="20"
              max="50"
              value={ballSize}
              onChange={(e) => setBallSize(Number(e.target.value))}
              className="w-full"
            />
            <div className="text-center text-sm text-gray-400">{ballSize}px</div>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <label className="block text-sm font-medium mb-2">Orbit Radius</label>
            <input
              type="range"
              min="100"
              max="250"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full"
            />
            <div className="text-center text-sm text-gray-400">{radius}px</div>
          </div>
        </div>
        
        {/* Options */}
        <div className="bg-gray-800 p-4 rounded-lg mb-8">
          <h3 className="text-lg font-semibold mb-3 text-yellow-400">Options</h3>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={interactive}
                onChange={(e) => setInteractive(e.target.checked)}
                className="text-yellow-400"
              />
              <span>Interactive</span>
            </label>
          </div>
        </div>
        
        {/* Demo Area */}
        <div className="bg-gray-800 rounded-lg p-8 mb-8">
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            {renderSelectedComponent()}
          </div>
          
          {/* Instructions */}
          <div className="mt-6 text-center text-gray-300">
            <p className="mb-2">
              <strong>Instructions:</strong>
            </p>
            <ul className="text-sm space-y-1">
              <li>• Hover over dragon balls to see interaction effects</li>
              <li>• Click dragon balls for repulsion effects</li>
              <li>• Set dragon state to "Active" and click any ball to grant a wish</li>
              <li>• Experiment with different orbit patterns and speeds</li>
            </ul>
          </div>
        </div>
        
        {/* Performance Info */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-yellow-400">Performance Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <strong>Current Component:</strong> {selectedComponent}
              <br />
              <strong>Recommended:</strong> {optimal.component.replace('SVGDragonBalls', '')}
            </div>
            <div>
              <strong>Dragon Balls:</strong> {ballCount}
              <br />
              <strong>Animations:</strong> {selectedComponent === 'enhanced' ? 'Native SVG' : 'Optimized'}
            </div>
            <div>
              <strong>Interactivity:</strong> {interactive ? 'Enabled' : 'Disabled'}
              <br />
              <strong>GPU Acceleration:</strong> {selectedComponent !== 'standard' ? 'Enabled' : 'CSS'}
            </div>
          </div>
        </div>
        
        {/* Preset Buttons */}
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <button
            onClick={() => {
              setSelectedComponent('enhanced')
              setDragonState('active')
              setOrbitPattern('elliptical')
              setBallCount(7)
              setOrbitSpeed(1.5)
            }}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors"
          >
            🐉 Epic Mode
          </button>
          
          <button
            onClick={() => {
              setSelectedComponent('performance')
              setDragonState('idle')
              setOrbitPattern('circular')
              setBallCount(4)
              setOrbitSpeed(0.8)
            }}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
          >
            ⚡ Performance Mode
          </button>
          
          <button
            onClick={() => {
              setSelectedComponent('enhanced')
              setDragonState('ready')
              setOrbitPattern('chaotic')
              setBallCount(7)
              setOrbitSpeed(2.0)
            }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
          >
            🌀 Chaos Mode
          </button>
          
          <button
            onClick={() => {
              setSelectedComponent('enhanced')
              setDragonState('powering-up')
              setOrbitPattern('figure-eight')
              setBallCount(6)
              setOrbitSpeed(1.2)
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
          >
            ∞ Figure-8 Mode
          </button>
        </div>
      </div>
    </div>
  )
}

export default SVGDragonBallDemo