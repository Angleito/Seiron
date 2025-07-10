'use client'

import React, { useState, useEffect, useRef } from 'react'
import { VoiceAnimationState } from '../../components/dragon/DragonRenderer'
import { DragonSprite2DShowcase } from '../../components/dragon/DragonSprite2DShowcase'

const Sprite2DPage: React.FC = () => {
  const [showBackgroundAnimation, setShowBackgroundAnimation] = useState(true)
  const [showShowcase, setShowShowcase] = useState(true)
  const [showLegacyDemo, setShowLegacyDemo] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 relative overflow-hidden">
      {/* Animated Background */}
      {showBackgroundAnimation && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 30 }, (_, i) => (
            <div
              key={i}
              className="absolute opacity-20 text-yellow-400"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`,
                fontSize: `${12 + Math.random() * 8}px`
              }}
            >
              {Math.random() > 0.5 ? '⭐' : '✨'}
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="relative z-10 pt-8 pb-6 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
          2D Sprite Dragons
        </h1>
        <p className="text-xl text-gray-300 max-w-4xl mx-auto px-4">
          Advanced CSS-based dragon sprites with Dragon Ball Z theming, voice integration, 
          and interactive animations. Experience the power of pure CSS art combined with 
          modern web technologies.
        </p>
      </div>

      {/* Top Controls */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 mb-8">
        <div className="bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-gray-700">
          <div className="flex flex-wrap justify-center gap-4">
            <label className="flex items-center text-gray-300">
              <input
                type="checkbox"
                checked={showBackgroundAnimation}
                onChange={(e) => setShowBackgroundAnimation(e.target.checked)}
                className="mr-2"
              />
              Background Animation
            </label>
            <label className="flex items-center text-gray-300">
              <input
                type="checkbox"
                checked={showShowcase}
                onChange={(e) => setShowShowcase(e.target.checked)}
                className="mr-2"
              />
              Advanced Showcase
            </label>
            <label className="flex items-center text-gray-300">
              <input
                type="checkbox"
                checked={showLegacyDemo}
                onChange={(e) => setShowLegacyDemo(e.target.checked)}
                className="mr-2"
              />
              Legacy Demo
            </label>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 pb-12">
        {showShowcase && (
          <div className="mb-12">
            <DragonSprite2DShowcase />
          </div>
        )}

        {showLegacyDemo && (
          <div className="bg-black/20 backdrop-blur-sm rounded-lg p-8 border border-gray-700">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">
              Legacy Unicode Dragon Demo
            </h2>
            <LegacyDragonDemo />
          </div>
        )}

        {/* Technical Information */}
        <div className="bg-black/30 backdrop-blur-sm rounded-lg p-8 border border-gray-700 mt-8">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">
            Technical Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-4">🎨</div>
              <h3 className="text-xl font-semibold text-white mb-2">Pure CSS Art</h3>
              <p className="text-gray-300">
                Dragons created using only CSS gradients, shapes, and transforms - no images required.
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold text-white mb-2">Hardware Acceleration</h3>
              <p className="text-gray-300">
                Optimized animations using CSS transforms and GPU acceleration for smooth performance.
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🎤</div>
              <h3 className="text-xl font-semibold text-white mb-2">Voice Integration</h3>
              <p className="text-gray-300">
                Dragons respond to voice states with reactive animations and visual effects.
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-xl font-semibold text-white mb-2">Mobile Optimized</h3>
              <p className="text-gray-300">
                Responsive design with performance optimizations for mobile devices.
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">♿</div>
              <h3 className="text-xl font-semibold text-white mb-2">Accessibility</h3>
              <p className="text-gray-300">
                Supports reduced motion preferences and high contrast modes.
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🔧</div>
              <h3 className="text-xl font-semibold text-white mb-2">Customizable</h3>
              <p className="text-gray-300">
                Extensive customization options for colors, animations, and behaviors.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
      `}</style>
    </div>
  )
}

// Legacy demo component for comparison
const LegacyDragonDemo: React.FC = () => {
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  const dragonFrames = ['🐉', '🐲', '🔥🐉', '⚡🐉', '💫🐉']

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isAnimating) {
      interval = setInterval(() => {
        setCurrentFrame(prev => (prev + 1) % dragonFrames.length)
      }, 500)
    }
    return () => clearInterval(interval)
  }, [isAnimating, dragonFrames.length])

  return (
    <div className="text-center">
      <div className="text-8xl mb-8 transition-all duration-300">
        {dragonFrames[currentFrame]}
      </div>
      <button
        onClick={() => setIsAnimating(!isAnimating)}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        {isAnimating ? 'Stop Animation' : 'Start Animation'}
      </button>
      <div className="mt-4 text-gray-400">
        <p>Simple Unicode-based dragon animation</p>
        <p>Frame: {currentFrame + 1} / {dragonFrames.length}</p>
      </div>
    </div>
  )
}

export default Sprite2DPage