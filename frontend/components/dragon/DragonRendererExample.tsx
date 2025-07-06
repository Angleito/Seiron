'use client'

import React, { useState, useEffect, useCallback } from 'react'
import DragonRenderer, { 
  DragonType, 
  VoiceAnimationState, 
  DragonPerformanceMetrics,
  dragonUtils
} from './DragonRenderer'
import { logger } from '../../lib/logger'

// Example component showcasing DragonRenderer capabilities
const DragonRendererExample: React.FC = () => {
  // Dragon type selection
  const [dragonType, setDragonType] = useState<DragonType>('2d')
  const [size, setSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('lg')
  
  // Voice simulation state
  const [voiceState, setVoiceState] = useState<VoiceAnimationState>({
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    isIdle: true,
    emotion: 'neutral'
  })
  
  // Performance metrics
  const [performanceMetrics, setPerformanceMetrics] = useState<DragonPerformanceMetrics | null>(null)
  
  // Error tracking
  const [errors, setErrors] = useState<Array<{ error: Error; dragonType: DragonType; timestamp: number }>>([])
  
  // Fallback tracking
  const [fallbacks, setFallbacks] = useState<Array<{ from: DragonType; to: DragonType; timestamp: number }>>([])
  
  // 3D Support detection
  const [is3DSupported] = useState(dragonUtils.detect3DSupport())
  
  // Voice animation simulation
  const simulateVoiceAnimation = useCallback((type: keyof VoiceAnimationState) => {
    logger.info(`Simulating voice animation: ${type}`)
    
    // Reset all states
    setVoiceState({
      isListening: false,
      isSpeaking: false,
      isProcessing: false,
      isIdle: false,
      emotion: 'neutral'
    })
    
    // Set the specific state
    setTimeout(() => {
      setVoiceState(prev => ({ ...prev, [type]: true }))
    }, 100)
    
    // Reset after animation
    setTimeout(() => {
      setVoiceState({
        isListening: false,
        isSpeaking: false,
        isProcessing: false,
        isIdle: true,
        emotion: 'neutral'
      })
    }, 3000)
  }, [])
  
  // Emotion simulation
  const simulateEmotion = useCallback((emotion: VoiceAnimationState['emotion']) => {
    logger.info(`Simulating emotion: ${emotion}`)
    setVoiceState(prev => ({ ...prev, emotion }))
    
    // Reset emotion after 3 seconds
    setTimeout(() => {
      setVoiceState(prev => ({ ...prev, emotion: 'neutral' }))
    }, 3000)
  }, [])
  
  // Error handler
  const handleError = useCallback((error: Error, dragonType: DragonType) => {
    logger.error(`Dragon error in example: ${error.message}`, { dragonType })
    
    setErrors(prev => [...prev, { error, dragonType, timestamp: Date.now() }])
    
    // Keep only last 5 errors
    setErrors(prev => prev.slice(-5))
  }, [])
  
  // Fallback handler
  const handleFallback = useCallback((fromType: DragonType, toType: DragonType) => {
    logger.info(`Dragon fallback in example: ${fromType} -> ${toType}`)
    
    setFallbacks(prev => [...prev, { from: fromType, to: toType, timestamp: Date.now() }])
    
    // Keep only last 5 fallbacks
    setFallbacks(prev => prev.slice(-5))
  }, [])
  
  // Performance metrics handler
  const handlePerformanceMetrics = useCallback((metrics: DragonPerformanceMetrics) => {
    setPerformanceMetrics(metrics)
  }, [])
  
  // Dragon click handler
  const handleDragonClick = useCallback(() => {
    logger.info('Dragon clicked!')
    // Simulate a quick speaking animation
    simulateVoiceAnimation('isSpeaking')
  }, [simulateVoiceAnimation])
  
  // Auto-cycle demonstration
  const [autoCycleEnabled, setAutoCycleEnabled] = useState(false)
  
  useEffect(() => {
    if (!autoCycleEnabled) return
    
    const dragonTypes: DragonType[] = ['2d', 'ascii', '3d']
    let currentIndex = 0
    
    const cycleInterval = setInterval(() => {
      currentIndex = (currentIndex + 1) % dragonTypes.length
      const nextType = dragonTypes[currentIndex]
      if (nextType) {
        setDragonType(nextType)
      }
    }, 5000)
    
    return () => clearInterval(cycleInterval)
  }, [autoCycleEnabled])
  
  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-6 text-center">
        🐉 DragonRenderer Example
      </h1>
      
      {/* Dragon Display */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
          <DragonRenderer
            dragonType={dragonType}
            size={size}
            voiceState={voiceState}
            enableFallback={true}
            fallbackType="2d"
            performanceMode="auto"
            onError={handleError}
            onFallback={handleFallback}
            onPerformanceMetrics={handlePerformanceMetrics}
            onClick={handleDragonClick}
            enableHover={true}
            // Type-specific props
            asciiProps={{
              enableTypewriter: true,
              enableBreathing: true,
              enableFloating: true
            }}
            threeDProps={{
              enableInteraction: true,
              showParticles: true,
              quality: 'medium'
            }}
          />
        </div>
      </div>
      
      {/* Control Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Dragon Type Selection */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Dragon Type</h3>
          <div className="flex flex-wrap gap-2">
            {(['2d', 'ascii', '3d'] as DragonType[]).map(type => (
              <button
                key={type}
                onClick={() => setDragonType(type)}
                disabled={type === '3d' && !is3DSupported}
                className={`px-4 py-2 rounded transition-colors ${
                  dragonType === type
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                } ${type === '3d' && !is3DSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {type.toUpperCase()}
                {type === '3d' && !is3DSupported && ' (Unsupported)'}
              </button>
            ))}
          </div>
          
          <div className="mt-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoCycleEnabled}
                onChange={(e) => setAutoCycleEnabled(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Auto-cycle types (5s)</span>
            </label>
          </div>
        </div>
        
        {/* Size Selection */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Size</h3>
          <div className="flex flex-wrap gap-2">
            {(['sm', 'md', 'lg', 'xl'] as const).map(sizeOption => (
              <button
                key={sizeOption}
                onClick={() => setSize(sizeOption)}
                className={`px-4 py-2 rounded transition-colors ${
                  size === sizeOption
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {sizeOption.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Voice Animation Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Voice States */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Voice States</h3>
          <div className="grid grid-cols-2 gap-2">
            {(['isListening', 'isSpeaking', 'isProcessing'] as const).map(state => (
              <button
                key={state}
                onClick={() => simulateVoiceAnimation(state)}
                className={`px-3 py-2 rounded text-sm transition-colors ${
                  voiceState[state]
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {state.replace('is', '').replace(/([A-Z])/g, ' $1').trim()}
              </button>
            ))}
          </div>
        </div>
        
        {/* Emotions */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Emotions</h3>
          <div className="grid grid-cols-2 gap-2">
            {(['neutral', 'happy', 'angry', 'sleeping', 'excited'] as const).map(emotion => (
              <button
                key={emotion}
                onClick={() => simulateEmotion(emotion)}
                className={`px-3 py-2 rounded text-sm transition-colors ${
                  voiceState.emotion === emotion
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Status Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Performance Metrics */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Performance Metrics</h3>
          {performanceMetrics ? (
            <div className="text-sm space-y-1">
              <p><span className="text-gray-400">Render Time:</span> {performanceMetrics.renderTime}ms</p>
              <p><span className="text-gray-400">Init Time:</span> {performanceMetrics.initTime}ms</p>
              <p><span className="text-gray-400">Dragon Type:</span> {performanceMetrics.dragonType}</p>
              <p><span className="text-gray-400">Fallback Used:</span> {performanceMetrics.fallbackUsed ? 'Yes' : 'No'}</p>
              <p><span className="text-gray-400">Error Count:</span> {performanceMetrics.errorCount}</p>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No metrics available</p>
          )}
        </div>
        
        {/* System Information */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">System Information</h3>
          <div className="text-sm space-y-1">
            <p><span className="text-gray-400">3D Support:</span> {is3DSupported ? 'Yes' : 'No'}</p>
            <p><span className="text-gray-400">Current Type:</span> {dragonType}</p>
            <p><span className="text-gray-400">Voice State:</span> {
              Object.entries(voiceState).filter(([key, value]) => value === true).map(([key]) => key).join(', ') || 'Idle'
            }</p>
            <p><span className="text-gray-400">Current Emotion:</span> {voiceState.emotion}</p>
          </div>
        </div>
      </div>
      
      {/* Error Log */}
      {errors.length > 0 && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold mb-3 text-red-300">Recent Errors</h3>
          <div className="space-y-2">
            {errors.map((errorEntry, index) => (
              <div key={index} className="text-sm bg-red-800/30 rounded p-2">
                <p className="text-red-300">
                  [{errorEntry.dragonType}] {errorEntry.error.message}
                </p>
                <p className="text-xs text-red-400 mt-1">
                  {new Date(errorEntry.timestamp).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Fallback Log */}
      {fallbacks.length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold mb-3 text-yellow-300">Recent Fallbacks</h3>
          <div className="space-y-2">
            {fallbacks.map((fallbackEntry, index) => (
              <div key={index} className="text-sm bg-yellow-800/30 rounded p-2">
                <p className="text-yellow-300">
                  Fallback: {fallbackEntry.from} → {fallbackEntry.to}
                </p>
                <p className="text-xs text-yellow-400 mt-1">
                  {new Date(fallbackEntry.timestamp).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Usage Instructions */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Usage Instructions</h3>
        <div className="text-sm text-gray-300 space-y-2">
          <p>• <strong>Dragon Types:</strong> Switch between 2D sprite, ASCII art, and 3D models</p>
          <p>• <strong>Voice States:</strong> Simulate different voice interaction states</p>
          <p>• <strong>Emotions:</strong> Test different dragon emotional states</p>
          <p>• <strong>Auto-cycle:</strong> Automatically cycle through dragon types</p>
          <p>• <strong>Click Dragon:</strong> Click the dragon to trigger animations</p>
          <p>• <strong>Fallback:</strong> 3D dragons automatically fallback to 2D if unsupported</p>
        </div>
      </div>
    </div>
  )
}

export default DragonRendererExample