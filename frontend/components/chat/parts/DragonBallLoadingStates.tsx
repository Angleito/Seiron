'use client'

import React from 'react'
import { DragonRenderer } from '@components/dragon/DragonRenderer'

// Ki charging animation component
const KiChargingAnimation = React.memo(function KiChargingAnimation({ 
  size = 'md',
  color = 'orange'
}: { 
  size?: 'sm' | 'md' | 'lg'
  color?: 'orange' | 'blue' | 'purple' | 'yellow'
}) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  }
  
  const colorClasses = {
    orange: 'from-orange-400 to-red-500',
    blue: 'from-blue-400 to-cyan-500',
    purple: 'from-purple-400 to-pink-500',
    yellow: 'from-yellow-400 to-orange-500'
  }

  return (
    <div className={`${sizeClasses[size]} relative`}>
      <div className={`absolute inset-0 bg-gradient-to-r ${colorClasses[color]} rounded-full animate-pulse`} />
      <div className={`absolute inset-0 bg-gradient-to-r ${colorClasses[color]} rounded-full animate-ping`} />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-white font-bold animate-bounce">気</span>
      </div>
    </div>
  )
})

// Dragon Ball collecting animation
const DragonBallCollector = React.memo(function DragonBallCollector() {
  return (
    <div className="flex items-center gap-2">
      {[...Array(7)].map((_, i) => (
        <div
          key={i}
          className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 animate-pulse relative"
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-orange-900">
            {i + 1}
          </div>
          <div className="absolute inset-0 rounded-full bg-orange-300 opacity-50 animate-ping" 
               style={{ animationDelay: `${i * 0.1}s` }} />
        </div>
      ))}
    </div>
  )
})

// Power level scanner animation
const PowerLevelScanner = React.memo(function PowerLevelScanner({ 
  currentLevel = 0,
  maxLevel = 9000
}: {
  currentLevel?: number
  maxLevel?: number
}) {
  const percentage = (currentLevel / maxLevel) * 100

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400">Power Level</span>
        <span className="text-sm font-bold text-orange-400 animate-pulse">
          {currentLevel.toLocaleString()}
        </span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-orange-400 to-red-500 transition-all duration-1000"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
})

// AI Response Loading with Dragon Ball Z theme
export const DragonBallAILoadingState = React.memo(function DragonBallAILoadingState({
  message = "Seiron is gathering energy...",
  showDragon = true,
  className = ''
}: {
  message?: string
  showDragon?: boolean
  className?: string
}) {
  const [powerLevel, setPowerLevel] = React.useState(0)
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setPowerLevel(prev => Math.min(prev + Math.floor(Math.random() * 500), 9000))
    }, 100)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className={`flex items-start gap-4 p-4 ${className}`}>
      {showDragon && (
        <div className="flex-shrink-0">
          <DragonRenderer
            size="sm"
            voiceState={{
              isListening: false,
              isSpeaking: false,
              isProcessing: true,
              isIdle: false,
              volume: 0.5,
              emotion: 'focused'
            }}
          />
        </div>
      )}
      
      <div className="flex-1 space-y-3">
        <div className="bg-gray-900/50 border border-orange-800/30 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <KiChargingAnimation size="md" color="orange" />
            <span className="text-orange-300 font-semibold">{message}</span>
          </div>
          
          <PowerLevelScanner currentLevel={powerLevel} />
          
          <div className="mt-3 text-xs text-gray-500">
            Charging Kamehameha wave...
          </div>
        </div>
      </div>
    </div>
  )
})

// Voice Processing Loading
export const DragonBallVoiceLoadingState = React.memo(function DragonBallVoiceLoadingState({
  operation,
  className = ''
}: {
  operation: 'listening' | 'processing' | 'speaking' | 'initializing'
  className?: string
}) {
  const configs = {
    listening: {
      icon: '👂',
      message: 'Sensing your investment wishes...',
      subMessage: 'Share your DeFi desires with Sei-ron',
      color: 'blue' as const
    },
    processing: {
      icon: '🧠',
      message: 'Analyzing Sei network data...',
      subMessage: 'Dragon wisdom processing your request',
      color: 'purple' as const
    },
    speaking: {
      icon: '🐉',
      message: 'Sei-ron grants your wish...',
      subMessage: 'Portfolio dragon sharing Sei insights',
      color: 'orange' as const
    },
    initializing: {
      icon: '⚡',
      message: 'Awakening portfolio dragon...',
      subMessage: 'Connecting to Sei blockchain oracles',
      color: 'yellow' as const
    }
  }

  const config = configs[operation]

  return (
    <div className={`bg-gray-900/30 border border-gray-700/50 rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-4">
        <div className="relative">
          <span className="text-3xl animate-bounce">{config.icon}</span>
          <KiChargingAnimation size="sm" color={config.color} />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-gray-200 font-semibold">{config.message}</span>
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 bg-gradient-to-r ${
                    config.color === 'orange' ? 'from-orange-400 to-red-500' :
                    config.color === 'blue' ? 'from-blue-400 to-cyan-500' :
                    config.color === 'purple' ? 'from-purple-400 to-pink-500' :
                    'from-yellow-400 to-orange-500'
                  } rounded-full animate-pulse`}
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
          <div className="text-xs text-gray-400">{config.subMessage}</div>
        </div>
      </div>
    </div>
  )
})

// Session Creation Loading
export const DragonBallSessionLoadingState = React.memo(function DragonBallSessionLoadingState({
  className = ''
}: {
  className?: string
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <div className="bg-gray-900/50 border border-orange-800/50 rounded-lg p-8 max-w-md w-full">
        <div className="flex flex-col items-center">
          <div className="mb-6">
            <DragonBallCollector />
          </div>
          
          <h3 className="text-xl font-bold text-orange-300 mb-2">
            Summoning Shenron...
          </h3>
          
          <p className="text-gray-400 text-center mb-4">
            Creating a new Dragon Ball Z chat session
          </p>
          
          <div className="w-full space-y-2">
            <div className="flex items-center gap-2">
              <KiChargingAnimation size="sm" color="orange" />
              <span className="text-sm text-gray-300">Gathering Dragon Balls...</span>
            </div>
            <div className="flex items-center gap-2">
              <KiChargingAnimation size="sm" color="yellow" />
              <span className="text-sm text-gray-300">Channeling eternal dragon...</span>
            </div>
            <div className="flex items-center gap-2">
              <KiChargingAnimation size="sm" color="blue" />
              <span className="text-sm text-gray-300">Preparing wish interface...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

// Message History Loading with Capsule Corp theme
export const DragonBallHistoryLoadingState = React.memo(function DragonBallHistoryLoadingState({
  className = ''
}: {
  className?: string
}) {
  return (
    <div className={`space-y-4 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500/20 rounded-full animate-pulse" />
          <div className="h-4 w-32 bg-gray-700/30 rounded animate-pulse" />
        </div>
        <div className="text-xs text-gray-500">Loading Capsule Corp. Database...</div>
      </div>

      {/* Message placeholders */}
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}
        >
          <div className={`
            max-w-[80%] p-4 rounded-lg
            ${i % 2 === 0 
              ? 'bg-gray-800/30 border border-gray-700/30' 
              : 'bg-orange-900/20 border border-orange-800/30'
            }
          `}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-6 h-6 rounded-full animate-pulse ${
                i % 2 === 0 ? 'bg-gray-600/30' : 'bg-orange-600/30'
              }`} />
              <div className={`h-3 w-20 rounded animate-pulse ${
                i % 2 === 0 ? 'bg-gray-600/30' : 'bg-orange-600/30'
              }`} />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full bg-white/10 rounded animate-pulse" />
              <div className="h-3 w-4/5 bg-white/10 rounded animate-pulse" />
            </div>
          </div>
        </div>
      ))}
      
      <div className="text-center text-xs text-gray-500 mt-4">
        <DragonBallCollector />
      </div>
    </div>
  )
})

// Reconnection Loading
export const DragonBallReconnectingState = React.memo(function DragonBallReconnectingState({
  attempt = 1,
  maxAttempts = 3,
  className = ''
}: {
  attempt?: number
  maxAttempts?: number
  className?: string
}) {
  return (
    <div className={`bg-gray-900/50 border border-orange-800/50 rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="relative">
          <KiChargingAnimation size="md" color="yellow" />
        </div>
        
        <div className="flex-1">
          <div className="font-semibold text-orange-300 mb-1">
            Using Instant Transmission...
          </div>
          <div className="text-sm text-gray-400">
            Reconnection attempt {attempt} of {maxAttempts}
          </div>
          <div className="mt-2">
            <PowerLevelScanner 
              currentLevel={attempt * 3000} 
              maxLevel={maxAttempts * 3000} 
            />
          </div>
        </div>
      </div>
    </div>
  )
})

// Error Recovery Loading
export const DragonBallErrorRecoveryState = React.memo(function DragonBallErrorRecoveryState({
  message = "Using Senzu Bean to recover...",
  className = ''
}: {
  message?: string
  className?: string
}) {
  return (
    <div className={`flex items-center justify-center p-6 ${className}`}>
      <div className="bg-gray-900/50 border border-green-800/50 rounded-lg p-6 max-w-md w-full">
        <div className="flex flex-col items-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center animate-pulse">
              <span className="text-3xl">🌿</span>
            </div>
          </div>
          
          <h3 className="text-lg font-semibold text-green-300 mb-2">{message}</h3>
          
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <KiChargingAnimation size="sm" color="yellow" />
            <span>Restoring system vitality...</span>
          </div>
        </div>
      </div>
    </div>
  )
})

// Export all loading states
export const DragonBallLoadingStates = {
  AI: DragonBallAILoadingState,
  Voice: DragonBallVoiceLoadingState,
  Session: DragonBallSessionLoadingState,
  History: DragonBallHistoryLoadingState,
  Reconnecting: DragonBallReconnectingState,
  ErrorRecovery: DragonBallErrorRecoveryState,
  KiCharging: KiChargingAnimation,
  DragonBallCollector,
  PowerLevelScanner
}