'use client'

import React, { useState } from 'react'
import { DragonBallOrbitalSystem } from './DragonBallOrbitalSystem'
import { DragonInteractionProvider } from './dragon/DragonInteractionController'

export function DragonBallOrbitalDemo() {
  const [orbitalMode, setOrbitalMode] = useState<'circular' | 'elliptical'>('elliptical')
  const [showTrails, setShowTrails] = useState(true)
  const [wishCount, setWishCount] = useState(0)
  
  const handleWishGranted = () => {
    setWishCount(prev => prev + 1)
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-yellow-400">
          Dragon Ball Orbital System
        </h1>
        
        {/* Controls */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setOrbitalMode(mode => mode === 'circular' ? 'elliptical' : 'circular')}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
          >
            Mode: {orbitalMode === 'circular' ? 'Circular' : 'Elliptical'}
          </button>
          
          <button
            onClick={() => setShowTrails(!showTrails)}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
          >
            Trails: {showTrails ? 'On' : 'Off'}
          </button>
        </div>
        
        {/* Instructions */}
        <div className="text-center mb-8 space-y-2">
          <p className="text-yellow-300">Move your mouse near the dragon balls to see them react!</p>
          <p className="text-yellow-300">Hover over individual balls to lift them from orbit</p>
          <p className="text-yellow-300">Click on balls to create repulsion waves</p>
          <p className="text-yellow-300">Bring all balls to the center to make a wish!</p>
        </div>
        
        {/* Wish Counter */}
        {wishCount > 0 && (
          <div className="text-center mb-4">
            <p className="text-2xl text-yellow-400">Wishes Granted: {wishCount}</p>
          </div>
        )}
        
        {/* Dragon Ball Orbital System */}
        <div className="flex justify-center items-center" style={{ minHeight: '400px' }}>
          <DragonInteractionProvider>
            <DragonBallOrbitalSystem
              radius={180}
              ballSize={36}
              orbitalMode={orbitalMode}
              showTrails={showTrails}
              onWishGranted={handleWishGranted}
              className="relative"
            />
          </DragonInteractionProvider>
        </div>
        
        {/* Legend */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="font-bold text-yellow-400 mb-2">Dragon States</h3>
            <ul className="space-y-1">
              <li>Idle: Normal orbit</li>
              <li>Attention: Faster orbit</li>
              <li>Ready: Power building</li>
              <li>Active: Maximum power!</li>
            </ul>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="font-bold text-yellow-400 mb-2">Interactions</h3>
            <ul className="space-y-1">
              <li>Mouse proximity</li>
              <li>Hover effects</li>
              <li>Click repulsion</li>
              <li>Touch gestures</li>
            </ul>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="font-bold text-yellow-400 mb-2">Physics</h3>
            <ul className="space-y-1">
              <li>Gravitational pull</li>
              <li>Spring forces</li>
              <li>Collision detection</li>
              <li>Momentum conservation</li>
            </ul>
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="font-bold text-yellow-400 mb-2">Performance</h3>
            <ul className="space-y-1">
              <li>60 FPS target</li>
              <li>GPU acceleration</li>
              <li>Adaptive quality</li>
              <li>Spatial partitioning</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}