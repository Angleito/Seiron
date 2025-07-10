'use client'

import React, { useState } from 'react'
import { DragonSprite2D, DragonSpriteType, DragonAnimationState, DragonMood } from './DragonSprite2D'
import { VoiceAnimationState } from './DragonRenderer'

interface DragonShowcaseProps {
  className?: string
}

export const DragonSprite2DShowcase: React.FC<DragonShowcaseProps> = ({ className = '' }) => {
  const [selectedDragon, setSelectedDragon] = useState<DragonSpriteType | null>(null)
  const [globalAnimationState, setGlobalAnimationState] = useState<DragonAnimationState>('idle')
  const [globalMood, setGlobalMood] = useState<DragonMood>('calm')
  const [voiceState, setVoiceState] = useState<VoiceAnimationState>({
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    isIdle: true,
    volume: 0
  })
  const [enableEffects, setEnableEffects] = useState({
    particles: true,
    aura: true,
    breath: true,
    wings: true
  })

  const dragonTypes: DragonSpriteType[] = [
    'shenron', 'porunga', 'baby', 'guardian', 'storm', 'fire', 'ice', 'earth'
  ]

  const animationStates: DragonAnimationState[] = [
    'idle', 'active', 'excited', 'attacking', 'defending', 'casting', 'sleeping'
  ]

  const moods: DragonMood[] = [
    'calm', 'happy', 'angry', 'sad', 'focused', 'playful', 'majestic'
  ]

  const simulateVoiceState = (state: keyof VoiceAnimationState) => {
    setVoiceState(prev => ({
      isListening: false,
      isSpeaking: false,
      isProcessing: false,
      isIdle: false,
      volume: 0,
      [state]: true,
      ...(state === 'isSpeaking' && { volume: 0.8 })
    }))

    setTimeout(() => {
      setVoiceState({
        isListening: false,
        isSpeaking: false,
        isProcessing: false,
        isIdle: true,
        volume: 0
      })
    }, 3000)
  }

  const getDragonInfo = (type: DragonSpriteType) => {
    const info = {
      shenron: { name: 'Shenron', element: 'Wish', power: 'Eternal' },
      porunga: { name: 'Porunga', element: 'Namekian', power: 'Three Wishes' },
      baby: { name: 'Baby Dragon', element: 'Playful', power: 'Growing' },
      guardian: { name: 'Guardian', element: 'Protection', power: 'Shield' },
      storm: { name: 'Storm Dragon', element: 'Lightning', power: 'Thunder' },
      fire: { name: 'Fire Dragon', element: 'Fire', power: 'Inferno' },
      ice: { name: 'Ice Dragon', element: 'Ice', power: 'Blizzard' },
      earth: { name: 'Earth Dragon', element: 'Earth', power: 'Earthquake' }
    }
    return info[type]
  }

  return (
    <div className={`dragon-showcase ${className}`}>
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-4">2D Dragon Sprite Showcase</h2>
        <p className="text-gray-300 max-w-2xl mx-auto">
          Interactive CSS-based dragon sprites with advanced animations, voice integration, and customizable effects.
        </p>
      </div>

      {/* Controls Panel */}
      <div className="bg-black/30 backdrop-blur-sm rounded-lg p-6 mb-8 border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Animation State */}
          <div>
            <h3 className="text-white font-semibold mb-3">Animation State</h3>
            <div className="space-y-2">
              {animationStates.map(state => (
                <button
                  key={state}
                  onClick={() => setGlobalAnimationState(state)}
                  className={`w-full px-3 py-2 rounded text-sm transition-colors ${
                    globalAnimationState === state
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {state.charAt(0).toUpperCase() + state.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Mood */}
          <div>
            <h3 className="text-white font-semibold mb-3">Mood</h3>
            <div className="space-y-2">
              {moods.map(mood => (
                <button
                  key={mood}
                  onClick={() => setGlobalMood(mood)}
                  className={`w-full px-3 py-2 rounded text-sm transition-colors ${
                    globalMood === mood
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {mood.charAt(0).toUpperCase() + mood.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Voice States */}
          <div>
            <h3 className="text-white font-semibold mb-3">Voice States</h3>
            <div className="space-y-2">
              <button
                onClick={() => simulateVoiceState('isListening')}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
              >
                Listening
              </button>
              <button
                onClick={() => simulateVoiceState('isSpeaking')}
                className="w-full px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
              >
                Speaking
              </button>
              <button
                onClick={() => simulateVoiceState('isProcessing')}
                className="w-full px-3 py-2 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 transition-colors"
              >
                Processing
              </button>
              <button
                onClick={() => simulateVoiceState('isIdle')}
                className="w-full px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Effects */}
          <div>
            <h3 className="text-white font-semibold mb-3">Effects</h3>
            <div className="space-y-2">
              <label className="flex items-center text-gray-300">
                <input
                  type="checkbox"
                  checked={enableEffects.particles}
                  onChange={(e) => setEnableEffects(prev => ({ ...prev, particles: e.target.checked }))}
                  className="mr-2"
                />
                Particles
              </label>
              <label className="flex items-center text-gray-300">
                <input
                  type="checkbox"
                  checked={enableEffects.aura}
                  onChange={(e) => setEnableEffects(prev => ({ ...prev, aura: e.target.checked }))}
                  className="mr-2"
                />
                Aura
              </label>
              <label className="flex items-center text-gray-300">
                <input
                  type="checkbox"
                  checked={enableEffects.breath}
                  onChange={(e) => setEnableEffects(prev => ({ ...prev, breath: e.target.checked }))}
                  className="mr-2"
                />
                Breath
              </label>
              <label className="flex items-center text-gray-300">
                <input
                  type="checkbox"
                  checked={enableEffects.wings}
                  onChange={(e) => setEnableEffects(prev => ({ ...prev, wings: e.target.checked }))}
                  className="mr-2"
                />
                Wings
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Dragon Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {dragonTypes.map(type => {
          const info = getDragonInfo(type)
          return (
            <div
              key={type}
              className={`bg-black/20 backdrop-blur-sm rounded-lg p-6 border-2 transition-all duration-300 ${
                selectedDragon === type
                  ? 'border-yellow-400 bg-yellow-400/10'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              {/* Dragon Info */}
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-white mb-1">{info.name}</h3>
                <div className="flex justify-center gap-2 text-sm">
                  <span className="px-2 py-1 bg-blue-600 text-white rounded">{info.element}</span>
                  <span className="px-2 py-1 bg-purple-600 text-white rounded">{info.power}</span>
                </div>
              </div>

              {/* Dragon Sprite */}
              <div className="flex justify-center mb-4">
                <DragonSprite2D
                  type={type}
                  size="medium"
                  mood={globalMood}
                  animationState={globalAnimationState}
                  voiceState={voiceState}
                  enableParticles={enableEffects.particles}
                  enableAura={enableEffects.aura}
                  enableBreath={enableEffects.breath}
                  enableWings={enableEffects.wings}
                  onClick={() => setSelectedDragon(selectedDragon === type ? null : type)}
                />
              </div>

              {/* Dragon Status */}
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-2">
                  Status: {selectedDragon === type ? 'Selected' : 'Ready'}
                </div>
                <div className="text-xs text-gray-400">
                  State: {globalAnimationState} | Mood: {globalMood}
                </div>
                {voiceState.isSpeaking && (
                  <div className="text-xs text-green-400 mt-1">🎤 Speaking</div>
                )}
                {voiceState.isListening && (
                  <div className="text-xs text-blue-400 mt-1">👂 Listening</div>
                )}
                {voiceState.isProcessing && (
                  <div className="text-xs text-yellow-400 mt-1">⚡ Processing</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Performance Info */}
      <div className="mt-8 p-4 bg-black/20 backdrop-blur-sm rounded-lg border border-gray-700">
        <h3 className="text-white font-semibold mb-2">Performance Features</h3>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• Pure CSS animations with hardware acceleration</li>
          <li>• Responsive design optimized for all screen sizes</li>
          <li>• Reduced motion support for accessibility</li>
          <li>• Mobile-optimized particle effects</li>
          <li>• Memory-efficient animation loops</li>
          <li>• Voice state integration for reactive behaviors</li>
        </ul>
      </div>
    </div>
  )
}

export default DragonSprite2DShowcase