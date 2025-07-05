import { InteractiveDragon } from '@components/dragon/InteractiveDragon'
import { useState } from 'react'

export default function DragonDemoPage() {
  const [size, setSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('lg')
  const [showDragonBalls, setShowDragonBalls] = useState(true)
  const [enableParticles, setEnableParticles] = useState(true)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900/20 to-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 seiron-text">
          Interactive Dragon Demo
        </h1>
        <p className="text-center text-gray-300 mb-12">
          Move your cursor near the dragon to see it come alive!
        </p>

        {/* Dragon Showcase */}
        <div className="flex justify-center items-center mb-12 min-h-[400px]">
          <InteractiveDragon 
            size={size}
            showDragonBalls={showDragonBalls}
            enableParticles={enableParticles}
          />
        </div>

        {/* Controls */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-orange-400">Controls</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
                <option value="xl">Extra Large</option>
              </select>
            </div>

            {/* Dragon Balls Toggle */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Dragon Balls
              </label>
              <button
                onClick={() => setShowDragonBalls(!showDragonBalls)}
                className={`w-full px-4 py-2 rounded-md transition-colors ${
                  showDragonBalls
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                {showDragonBalls ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            {/* Particles Toggle */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Particles
              </label>
              <button
                onClick={() => setEnableParticles(!enableParticles)}
                className={`w-full px-4 py-2 rounded-md transition-colors ${
                  enableParticles
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                {enableParticles ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>
        </div>

        {/* Interaction Guide */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-orange-400">
            Interaction States
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-300 mb-2">Idle</h3>
              <p className="text-sm text-gray-400">
                Dragon is relaxed, gently floating
              </p>
            </div>
            
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <h3 className="font-semibold text-yellow-400 mb-2">Attention</h3>
              <p className="text-sm text-gray-400">
                Dragon notices you approaching (300px range)
              </p>
            </div>
            
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <h3 className="font-semibold text-orange-400 mb-2">Ready</h3>
              <p className="text-sm text-gray-400">
                Dragon is alert and ready (150px range)
              </p>
            </div>
            
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <h3 className="font-semibold text-red-400 mb-2">Active</h3>
              <p className="text-sm text-gray-400">
                Dragon is fully engaged (50px range or touching)
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-900/30 rounded-lg">
            <h3 className="font-semibold text-blue-400 mb-2">Mobile Support</h3>
            <p className="text-sm text-gray-300">
              On touch devices: Tap to activate, hold for ready state, swipe for special effects
            </p>
          </div>
        </div>

        {/* Performance Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Performance mode adjusts automatically based on your device capabilities</p>
          <p>Animations and effects are optimized for smooth interaction</p>
        </div>
      </div>
    </div>
  )
}