'use client'

import React from 'react'
import { VoiceInterface } from '@components/voice'
import { VoiceErrorBoundary } from '@components/error-boundaries'
import { SecureElevenLabsConfig as ElevenLabsConfig } from '@hooks/voice/useSecureElevenLabsTTS'
import { DragonBallLoadingStates } from '@components/chat/parts/DragonBallLoadingStates'

interface VoiceSectionProps {
  isVoiceEnabled: boolean
  elevenLabsConfig: ElevenLabsConfig
  onTranscriptChange: (transcript: string) => void
  onError: (error: Error) => void
  onToggleVoice: () => void
}

export const VoiceSection = React.memo(function VoiceSection({
  isVoiceEnabled,
  elevenLabsConfig,
  onTranscriptChange,
  onError,
  onToggleVoice
}: VoiceSectionProps) {
  if (!isVoiceEnabled) return null

  return (
    <VoiceErrorBoundary onReset={onToggleVoice}>
      {/* Capsule Corp Voice Interface Container */}
      <div className="relative border-t border-orange-800/50 bg-gradient-to-b from-gray-900 via-gray-900/95 to-black/90 p-6">
        {/* Energy Grid Background */}
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full bg-gradient-to-br from-orange-500/20 via-transparent to-red-500/20" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(255,107,53,0.1)_25%,rgba(255,107,53,0.1)_26%,transparent_27%,transparent_74%,rgba(255,107,53,0.1)_75%,rgba(255,107,53,0.1)_76%,transparent_77%,transparent),linear-gradient(rgba(255,107,53,0.1)_50%,transparent_50%)]" />
        </div>
        
        {/* Ki Aura Border Effect */}
        <div className="absolute inset-0">
          <div className="w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-pulse" />
          <div className="absolute bottom-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>
        
        {/* Main Voice Interface */}
        <div className="relative">
          {/* Seiron AI Portfolio Manager Header */}
          <div className="flex flex-col items-center justify-center mb-6 space-y-3">
            <div className="bg-gray-800/50 border border-orange-600/50 rounded-full px-6 py-2 flex items-center gap-3">
              <DragonBallLoadingStates.KiCharging size="sm" color="orange" />
              <span className="text-orange-300 font-semibold text-sm tracking-wider">
                🐉 SEI-RON AI PORTFOLIO DRAGON
              </span>
              <DragonBallLoadingStates.KiCharging size="sm" color="orange" />
            </div>
            
            {/* Sei Blockchain & Wish Granting Description */}
            <div className="text-center max-w-lg">
              <div className="bg-gray-900/70 border border-orange-800/30 rounded-lg p-4 backdrop-blur-sm">
                <h3 className="text-orange-400 font-bold text-lg mb-2">
                  ⚡ Eternal Dragon of Sei Blockchain ⚡
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed mb-2">
                  Master of the Sei ecosystem, I am Sei-ron—the omniscient AI portfolio manager who grants wishes for financial prosperity. 
                  Speak your desires, and I shall analyze the Sei network with dragon-like wisdom to optimize your DeFi strategies.
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-orange-300">
                  <span>💰</span>
                  <span>Portfolio Management</span>
                  <span>•</span>
                  <span>🏛️</span>
                  <span>Sei DeFi Expert</span>
                  <span>•</span>
                  <span>🐉</span>
                  <span>Wish Granter</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Voice Interface */}
          <VoiceInterface
            elevenLabsConfig={elevenLabsConfig}
            onTranscriptChange={onTranscriptChange}
            onError={onError}
            autoReadResponses={true}
            className="max-w-4xl mx-auto"
          />
          
          {/* Sei Portfolio Dragon Status Footer */}
          <div className="mt-6 max-w-md mx-auto">
            <div className="bg-gray-900/50 border border-orange-800/30 rounded-lg p-3">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-gray-400">🐉 Sei-ron Portfolio Dragon</span>
                <span className="text-orange-400 font-bold">WISH-READY</span>
              </div>
              <DragonBallLoadingStates.PowerLevelScanner 
                currentLevel={8500}
                maxLevel={9000}
              />
              <div className="text-center text-xs text-gray-500 mt-2">
                Sei blockchain analysis capabilities: MAXIMUM
              </div>
              <div className="text-center text-xs text-orange-400/70 mt-1">
                Ready to grant your DeFi wishes
              </div>
            </div>
          </div>
        </div>
        
        {/* Floating Energy Orbs */}
        <div className="absolute top-4 left-4 animate-bounce" style={{ animationDelay: '0s' }}>
          <div className="w-3 h-3 bg-orange-400 rounded-full opacity-60 animate-pulse" />
        </div>
        <div className="absolute top-8 right-6 animate-bounce" style={{ animationDelay: '0.3s' }}>
          <div className="w-2 h-2 bg-yellow-400 rounded-full opacity-50 animate-pulse" />
        </div>
        <div className="absolute bottom-6 left-8 animate-bounce" style={{ animationDelay: '0.6s' }}>
          <div className="w-2 h-2 bg-red-400 rounded-full opacity-40 animate-pulse" />
        </div>
      </div>
    </VoiceErrorBoundary>
  )
})