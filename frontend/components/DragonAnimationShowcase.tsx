'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { EnhancedDragonAnimation } from './EnhancedDragonAnimation'
import { useDragonAnimation, DragonState, DragonMood } from '@hooks/useDragonAnimation'

export function DragonAnimationShowcase() {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const {
    dragonState,
    dragonMood,
    controls,
    setDragonState,
    setDragonMood,
    triggerSpecialAnimation,
    powerLevel,
    isCharging
  } = useDragonAnimation()

  const states: DragonState[] = ['idle', 'attention', 'ready', 'active', 'sleeping', 'awakening']
  const moods: DragonMood[] = ['neutral', 'happy', 'excited', 'powerful', 'mystical']
  const specialAnimations = ['roar', 'spin', 'pulse', 'shake', 'powerUp']

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900/10 to-orange-900/10 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white">
            <span className="seiron-text">Seiron Dragon</span> Animation Showcase
          </h1>
          <p className="text-gray-300">
            Experience the magical animations of the wish-granting dragon
          </p>
        </div>

        {/* Main Dragon Display */}
        <div className="flex justify-center">
          <div className="relative">
            <EnhancedDragonAnimation 
              size="xl" 
              showDragonBalls={true}
              enableGestures={true}
              className="mx-auto"
            />
            
            {/* Power Level Indicator */}
            {powerLevel > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full gradient-shift"
                  initial={{ width: 0 }}
                  animate={{ width: `${powerLevel}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}
            
            {/* Charging Indicator */}
            <AnimatePresence>
              {isCharging && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="absolute inset-0 bg-gradient-radial from-red-500/20 via-orange-500/10 to-transparent animate-power-pulse" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Control Panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* State Controls */}
          <div className="bg-black/50 backdrop-blur-sm rounded-xl p-6 space-y-4">
            <h3 className="text-xl font-semibold text-white mb-4">Dragon States</h3>
            <div className="grid grid-cols-2 gap-2">
              {states.map((state) => (
                <button
                  key={state}
                  onClick={() => setDragonState(state)}
                  className={`
                    px-4 py-2 rounded-lg font-medium transition-all
                    ${dragonState === state 
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/50' 
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }
                  `}
                >
                  {state.charAt(0).toUpperCase() + state.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Mood Controls */}
          <div className="bg-black/50 backdrop-blur-sm rounded-xl p-6 space-y-4">
            <h3 className="text-xl font-semibold text-white mb-4">Dragon Moods</h3>
            <div className="grid grid-cols-2 gap-2">
              {moods.map((mood) => (
                <button
                  key={mood}
                  onClick={() => setDragonMood(mood)}
                  className={`
                    px-4 py-2 rounded-lg font-medium transition-all
                    ${dragonMood === mood 
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/50' 
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }
                  `}
                >
                  {mood.charAt(0).toUpperCase() + mood.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Special Animations */}
          <div className="bg-black/50 backdrop-blur-sm rounded-xl p-6 space-y-4">
            <h3 className="text-xl font-semibold text-white mb-4">Special Animations</h3>
            <div className="grid grid-cols-2 gap-2">
              {specialAnimations.map((anim) => (
                <button
                  key={anim}
                  onClick={() => triggerSpecialAnimation(anim)}
                  className="px-4 py-2 rounded-lg font-medium bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600 transition-all dragon-ball-hover"
                >
                  {anim.charAt(0).toUpperCase() + anim.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Animation Details */}
        <div className="bg-black/50 backdrop-blur-sm rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Animation Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-semibold text-orange-400">Breathing Animation</h4>
              <p className="text-gray-300">Subtle chest rise/fall for lifelike presence</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-orange-400">Micro-movements</h4>
              <p className="text-gray-300">Wing twitches and head movements in idle state</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-orange-400">Physics-based Float</h4>
              <p className="text-gray-300">Complex floating patterns with wind drift</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-orange-400">Interactive States</h4>
              <p className="text-gray-300">Dragon reacts to cursor proximity</p>
            </div>
          </div>
        </div>

        {/* CSS Animation Examples */}
        <div className="bg-black/50 backdrop-blur-sm rounded-xl p-6 space-y-6">
          <h3 className="text-xl font-semibold text-white mb-4">CSS Animation Classes</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Dragon Float Enhanced */}
            <div className="text-center space-y-4">
              <div className="h-32 flex items-center justify-center">
                <div className="w-24 h-24 bg-gradient-to-r from-red-500 to-orange-500 rounded-full dragon-float-enhanced shadow-lg" />
              </div>
              <p className="text-gray-300 font-medium">.dragon-float-enhanced</p>
            </div>

            {/* Dragon Breathe */}
            <div className="text-center space-y-4">
              <div className="h-32 flex items-center justify-center">
                <div className="w-24 h-24 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-lg dragon-breathe shadow-lg" />
              </div>
              <p className="text-gray-300 font-medium">.dragon-breathe</p>
            </div>

            {/* Dragon Idle */}
            <div className="text-center space-y-4">
              <div className="h-32 flex items-center justify-center">
                <div className="w-24 h-24 bg-gradient-to-r from-yellow-500 to-red-500 rounded-full dragon-idle shadow-lg" />
              </div>
              <p className="text-gray-300 font-medium">.dragon-idle</p>
            </div>

            {/* Dragon Ready */}
            <div className="text-center space-y-4">
              <div className="h-32 flex items-center justify-center">
                <div className="w-24 h-24 bg-gradient-to-r from-red-600 to-orange-600 rounded-full dragon-ready shadow-lg" />
              </div>
              <p className="text-gray-300 font-medium">.dragon-ready</p>
            </div>

            {/* Dragon Active */}
            <div className="text-center space-y-4">
              <div className="h-32 flex items-center justify-center">
                <div className="relative">
                  <div className="dragon-aura" />
                  <div className="w-24 h-24 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 rounded-full dragon-active shadow-lg" />
                </div>
              </div>
              <p className="text-gray-300 font-medium">.dragon-active</p>
            </div>

            {/* Dragon Power Button */}
            <div className="text-center space-y-4">
              <div className="h-32 flex items-center justify-center">
                <button className="px-6 py-3 rounded-lg dragon-power-btn text-white font-bold">
                  Power Up
                </button>
              </div>
              <p className="text-gray-300 font-medium">.dragon-power-btn</p>
            </div>
          </div>
        </div>

        {/* Performance Tips */}
        <div className="bg-black/50 backdrop-blur-sm rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Performance Optimization</h3>
          <ul className="space-y-2 text-gray-300">
            <li className="flex items-start">
              <span className="text-green-400 mr-2">✓</span>
              <span>Using <code className="text-orange-400">will-change</code> and <code className="text-orange-400">transform: translateZ(0)</code> for GPU acceleration</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-400 mr-2">✓</span>
              <span>Framer Motion&apos;s <code className="text-orange-400">useAnimation</code> hook for precise control</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-400 mr-2">✓</span>
              <span>Optimized particle system with <code className="text-orange-400">AnimatePresence</code> for cleanup</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-400 mr-2">✓</span>
              <span>CSS animations for continuous effects, Framer Motion for interactive states</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}