'use client'

import React, { useState } from 'react'
import Dragon3D from './Dragon3D'
import { motion } from 'framer-motion'

interface Dragon3DExampleProps {
  className?: string
}

const Dragon3DExample: React.FC<Dragon3DExampleProps> = ({ className = '' }) => {
  const [selectedSize, setSelectedSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('lg')
  const [showParticles, setShowParticles] = useState(true)
  const [animationSpeed, setAnimationSpeed] = useState(1)
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium')
  const [autoRotate, setAutoRotate] = useState(false)
  const [dragonClicked, setDragonClicked] = useState(false)

  const handleDragonClick = () => {
    setDragonClicked(true)
    // Reset after animation
    setTimeout(() => setDragonClicked(false), 2000)
  }

  return (
    <div className={`min-h-screen bg-gray-900 text-white p-8 ${className}`}>
      <div className="max-w-6xl mx-auto">
        <motion.h1 
          className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-red-500 to-yellow-500 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Dragon3D Component Demo
        </motion.h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Dragon Display */}
          <div className="lg:col-span-2">
            <motion.div 
              className="bg-gray-800 rounded-lg p-6 h-96 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <Dragon3D
                size={selectedSize}
                showParticles={showParticles}
                animationSpeed={dragonClicked ? animationSpeed * 2 : animationSpeed}
                quality={quality}
                autoRotate={autoRotate}
                onClick={handleDragonClick}
                enableHover={true}
                enableInteraction={true}
              />
            </motion.div>
            
            {dragonClicked && (
              <motion.div 
                className="text-center mt-4 text-yellow-400 font-bold"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                🐉 Dragon Awakened! 🔥
              </motion.div>
            )}
          </div>

          {/* Controls */}
          <div className="space-y-6">
            <motion.div 
              className="bg-gray-800 rounded-lg p-6"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <h2 className="text-xl font-semibold mb-4 text-yellow-400">Dragon Controls</h2>
              
              {/* Size Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Size</label>
                <div className="flex gap-2">
                  {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        selectedSize === size
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {size.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Animation Speed */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Animation Speed: {animationSpeed}x
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.1"
                  value={animationSpeed}
                  onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Quality Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Quality</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map((qual) => (
                    <button
                      key={qual}
                      onClick={() => setQuality(qual)}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        quality === qual
                          ? 'bg-yellow-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {qual.charAt(0).toUpperCase() + qual.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showParticles}
                    onChange={(e) => setShowParticles(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm">Show Particles</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={autoRotate}
                    onChange={(e) => setAutoRotate(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm">Auto Rotate</span>
                </label>
              </div>
            </motion.div>

            {/* Usage Example */}
            <motion.div 
              className="bg-gray-800 rounded-lg p-6"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <h3 className="text-lg font-semibold mb-3 text-yellow-400">Usage Example</h3>
              <pre className="text-xs bg-gray-900 p-3 rounded overflow-x-auto">
                <code className="text-gray-300">{`<Dragon3D
  size="${selectedSize}"
  animationSpeed={${animationSpeed}}
  quality="${quality}"
  showParticles={${showParticles}}
  autoRotate={${autoRotate}}
  onClick={handleClick}
  enableHover={true}
/>`}</code>
              </pre>
            </motion.div>

            {/* Features */}
            <motion.div 
              className="bg-gray-800 rounded-lg p-6"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              <h3 className="text-lg font-semibold mb-3 text-yellow-400">Features</h3>
              <ul className="text-sm space-y-1 text-gray-300">
                <li>• Procedural 3D geometry</li>
                <li>• Realistic animations</li>
                <li>• Interactive controls</li>
                <li>• Particle effects</li>
                <li>• Performance optimized</li>
                <li>• Responsive design</li>
              </ul>
            </motion.div>
          </div>
        </div>

        {/* Instructions */}
        <motion.div 
          className="mt-8 text-center text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
        >
          <p className="mb-2">🖱️ Click and drag to orbit • 🖱️ Click dragon to activate • ⚙️ Use controls to customize</p>
          <p className="text-sm">Built with Three.js, React Three Fiber, and Framer Motion</p>
        </motion.div>
      </div>
    </div>
  )
}

export default Dragon3DExample