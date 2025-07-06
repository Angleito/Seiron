'use client'

import React, { useState } from 'react'
import ASCIIDragon from './ASCIIDragon'

const ASCIIDragonExample: React.FC = () => {
  const [pose, setPose] = useState<'coiled' | 'flying' | 'attacking' | 'sleeping'>('coiled')
  const [size, setSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('lg')
  const [speed, setSpeed] = useState<'slow' | 'normal' | 'fast'>('normal')
  const [enableTypewriter, setEnableTypewriter] = useState(true)
  const [enableBreathing, setEnableBreathing] = useState(true)
  const [enableFloating, setEnableFloating] = useState(true)

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">ASCII Dragon Showcase</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Controls</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Pose</label>
                <select 
                  value={pose} 
                  onChange={(e) => setPose(e.target.value as any)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                >
                  <option value="coiled">Coiled</option>
                  <option value="flying">Flying</option>
                  <option value="attacking">Attacking</option>
                  <option value="sleeping">Sleeping</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Size</label>
                <select 
                  value={size} 
                  onChange={(e) => setSize(e.target.value as any)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                >
                  <option value="sm">Small</option>
                  <option value="md">Medium</option>
                  <option value="lg">Large</option>
                  <option value="xl">Extra Large</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Speed</label>
                <select 
                  value={speed} 
                  onChange={(e) => setSpeed(e.target.value as any)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                >
                  <option value="slow">Slow</option>
                  <option value="normal">Normal</option>
                  <option value="fast">Fast</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    checked={enableTypewriter}
                    onChange={(e) => setEnableTypewriter(e.target.checked)}
                    className="mr-2"
                  />
                  Typewriter Effect
                </label>
                
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    checked={enableBreathing}
                    onChange={(e) => setEnableBreathing(e.target.checked)}
                    className="mr-2"
                  />
                  Breathing Animation
                </label>
                
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    checked={enableFloating}
                    onChange={(e) => setEnableFloating(e.target.checked)}
                    className="mr-2"
                  />
                  Floating Animation
                </label>
              </div>
            </div>
          </div>
          
          {/* Dragon Display */}
          <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6 flex items-center justify-center">
            <ASCIIDragon
              pose={pose}
              size={size}
              speed={speed}
              enableTypewriter={enableTypewriter}
              enableBreathing={enableBreathing}
              enableFloating={enableFloating}
              enableHover={true}
              onClick={() => console.log('Dragon clicked!')}
              className="border border-gray-600 rounded-lg bg-gray-900"
            />
          </div>
        </div>
        
        {/* Feature Descriptions */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Poses</h3>
              <ul className="text-sm space-y-1">
                <li><strong>Coiled:</strong> Serpentine, resting position</li>
                <li><strong>Flying:</strong> Wings spread, ready to soar</li>
                <li><strong>Attacking:</strong> Aggressive stance with fire</li>
                <li><strong>Sleeping:</strong> Peaceful, eyes closed</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Animations</h3>
              <ul className="text-sm space-y-1">
                <li><strong>Typewriter:</strong> Characters appear one by one</li>
                <li><strong>Breathing:</strong> Character intensity changes</li>
                <li><strong>Floating:</strong> Gentle movement and rotation</li>
                <li><strong>Hover:</strong> Scale effect on mouse over</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ASCIIDragonExample