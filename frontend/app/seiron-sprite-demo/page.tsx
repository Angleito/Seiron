'use client'

import { useState } from 'react'
import { SeironSprite } from '@/components'

export default function SeironSpriteDemoPage() {
  const [size, setSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('lg')
  const [interactive, setInteractive] = useState(true)

  const handleInteraction = (type: 'hover' | 'click' | 'touch') => {
    console.log(`Dragon interaction: ${type}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900/20 to-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400">
          Seiron Sprite with Mystical Particles
        </h1>
        <p className="text-center text-gray-300 mb-12">
          A canvas-based dragon with mystical particle effects, orbital coins, and interactive animations
        </p>

        {/* Dragon Showcase */}
        <div className="flex justify-center items-center mb-12 min-h-[500px]">
          <SeironSprite 
            size={size}
            interactive={interactive}
            onInteraction={handleInteraction}
            className="border-2 border-gray-700/50 rounded-xl shadow-2xl"
          />
        </div>

        {/* Controls */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-orange-400">Controls</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Size Control */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Dragon Size
              </label>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value as any)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              >
                <option value="sm">Small (120x120)</option>
                <option value="md">Medium (200x200)</option>
                <option value="lg">Large (300x300)</option>
                <option value="xl">Extra Large (400x400)</option>
              </select>
            </div>

            {/* Interactive Toggle */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Interactive Mode
              </label>
              <button
                onClick={() => setInteractive(!interactive)}
                className={`w-full px-4 py-2 rounded-md transition-colors ${
                  interactive
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                {interactive ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-orange-400">
            Mystical Particle System Features
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <h3 className="font-semibold text-yellow-400 mb-2">✨ Sparkles</h3>
              <p className="text-sm text-gray-400">
                Four-pointed star particles that drift upward with gentle rotation
              </p>
            </div>
            
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <h3 className="font-semibold text-red-400 mb-2">🔥 Embers</h3>
              <p className="text-sm text-gray-400">
                Teardrop-shaped particles that float away from the dragon
              </p>
            </div>
            
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <h3 className="font-semibold text-orange-400 mb-2">⚡ Energy Orbs</h3>
              <p className="text-sm text-gray-400">
                Glowing orbs with radial gradients and pulsing effects
              </p>
            </div>
            
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-400 mb-2">🎭 Hover Effects</h3>
              <p className="text-sm text-gray-400">
                Increased particle intensity when hovering over the dragon
              </p>
            </div>
            
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-400 mb-2">🚀 Performance</h3>
              <p className="text-sm text-gray-400">
                Particle pooling system with limited count for optimization
              </p>
            </div>
            
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-400 mb-2">🌀 Physics</h3>
              <p className="text-sm text-gray-400">
                Gravity, air resistance, and drift motion for realistic movement
              </p>
            </div>
          </div>
        </div>

        {/* Dragon Features */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-orange-400">
            Dragon Features
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <h3 className="font-semibold text-red-400 mb-2">Serpentine Body</h3>
              <p className="text-sm text-gray-400">
                Undulating dragon body with gradient coloring and scale textures
              </p>
            </div>
            
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <h3 className="font-semibold text-orange-400 mb-2">Glowing Eyes</h3>
              <p className="text-sm text-gray-400">
                Animated red eyes with multiple glow layers and blinking
              </p>
            </div>
            
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <h3 className="font-semibold text-yellow-400 mb-2">Orbital Coins</h3>
              <p className="text-sm text-gray-400">
                Bitcoin and SEI coins orbiting around the dragon with 3D depth
              </p>
            </div>
            
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-400 mb-2">Mystical Aura</h3>
              <p className="text-sm text-gray-400">
                Radial gradient aura that appears when hovering over the dragon
              </p>
            </div>
          </div>
        </div>

        {/* Performance Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Canvas-based rendering with 60fps animation target</p>
          <p>Particle system limited to 50 particles for optimal performance</p>
          <p>All animations are GPU-accelerated when possible</p>
        </div>
      </div>
    </div>
  )
}