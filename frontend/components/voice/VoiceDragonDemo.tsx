'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import VoiceInterface from './VoiceInterface'
import DragonRenderer, { DragonType, VoiceAnimationState } from '../dragon/DragonRenderer'
import { getOptimalDragonType } from '../../utils/voice-dragon-mapping'
import { logger } from '../../lib/logger'

export interface VoiceDragonDemoProps {
  elevenLabsConfig: {
    apiKey: string
    voiceId: string
    modelId?: string
    voiceSettings?: {
      stability?: number
      similarityBoost?: number
      style?: number
      useSpeakerBoost?: boolean
    }
  }
  className?: string
}

/**
 * Comprehensive demo component showcasing voice-dragon integration
 * Demonstrates all dragon types with synchronized voice animations
 */
const VoiceDragonDemo: React.FC<VoiceDragonDemoProps> = ({
  elevenLabsConfig,
  className = ''
}) => {
  // Demo state
  const [selectedDragonType, setSelectedDragonType] = useState<DragonType>('2d')
  const [autoSelectDragon, setAutoSelectDragon] = useState(false)
  const [enableAnimations, setEnableAnimations] = useState(true)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<Error | null>(null)
  
  // Voice state tracking (real-time from VoiceInterface)
  const [realVoiceState, setRealVoiceState] = useState<VoiceAnimationState>({
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    isIdle: true,
    volume: 0,
    emotion: 'neutral'
  })
  
  // Demo simulation state (for manual testing)
  const [simulatedVoiceState, setSimulatedVoiceState] = useState<VoiceAnimationState>({
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    isIdle: true,
    volume: 0,
    emotion: 'neutral'
  })
  
  // Use simulated or real voice state based on demo mode
  const [useSimulatedState, setUseSimulatedState] = useState(false)
  const activeVoiceState = useSimulatedState ? simulatedVoiceState : realVoiceState

  // Handle voice interface events and update real voice state
  const handleTranscriptChange = useCallback((newTranscript: string) => {
    logger.debug('🎙️ Voice transcript changed', { transcript: newTranscript })
    setTranscript(newTranscript)
    
    // Update real voice state based on transcript activity
    if (!useSimulatedState) {
      setRealVoiceState(prev => ({
        ...prev,
        volume: Math.min(newTranscript.length / 100, 1.0),
        emotion: newTranscript.length > 50 ? 'excited' : newTranscript.length > 0 ? 'happy' : 'neutral'
      }))
    }
  }, [useSimulatedState])

  const handleVoiceError = useCallback((voiceError: Error) => {
    logger.error('🎙️ Voice error occurred', { error: voiceError.message })
    setError(voiceError)
    
    // Update real voice state to show error
    if (!useSimulatedState) {
      setRealVoiceState(prev => ({
        ...prev,
        emotion: 'angry'
      }))
    }
  }, [useSimulatedState])

  // Voice state monitoring from VoiceInterface component
  const handleVoiceStateChange = useCallback((newState: Partial<VoiceAnimationState>) => {
    if (!useSimulatedState) {
      setRealVoiceState(prev => ({
        ...prev,
        ...newState,
        isIdle: !newState.isListening && !newState.isSpeaking && !newState.isProcessing
      }))
    }
  }, [useSimulatedState])

  // Monitor voice interface state through global events (if available)
  useEffect(() => {
    const handleVoiceEvent = (event: CustomEvent) => {
      const { type, data } = event.detail
      logger.debug('🎙️ Voice event received', { type, data })
      
      switch (type) {
        case 'listening_start':
          handleVoiceStateChange({ isListening: true, isIdle: false, volume: 0.8 })
          break
        case 'listening_end':
          handleVoiceStateChange({ isListening: false })
          break
        case 'speaking_start':
          handleVoiceStateChange({ isSpeaking: true, isIdle: false, volume: 1.0, emotion: 'excited' })
          break
        case 'speaking_end':
          handleVoiceStateChange({ isSpeaking: false, emotion: 'neutral' })
          break
        case 'processing_start':
          handleVoiceStateChange({ isProcessing: true, isIdle: false, volume: 0.6 })
          break
        case 'processing_end':
          handleVoiceStateChange({ isProcessing: false })
          break
      }
    }

    window.addEventListener('voiceStateChange', handleVoiceEvent as EventListener)
    return () => window.removeEventListener('voiceStateChange', handleVoiceEvent as EventListener)
  }, [handleVoiceStateChange])

  const handleDragonClick = useCallback(() => {
    logger.debug('🐉 Dragon clicked in demo')
    // React differently based on current mode
    if (useSimulatedState) {
      setSimulatedVoiceState(prev => ({
        ...prev,
        emotion: 'excited'
      }))
      
      setTimeout(() => {
        setSimulatedVoiceState(prev => ({
          ...prev,
          emotion: 'neutral'
        }))
      }, 2000)
    } else {
      // For real voice state, trigger a brief excitement
      setRealVoiceState(prev => ({
        ...prev,
        emotion: 'excited'
      }))
      
      setTimeout(() => {
        setRealVoiceState(prev => ({
          ...prev,
          emotion: prev.isListening ? 'happy' : prev.isSpeaking ? 'excited' : 'neutral'
        }))
      }, 1500)
    }
  }, [useSimulatedState])

  // Auto-select optimal dragon type based on active voice state
  const optimalDragonType = useMemo(() => {
    if (!autoSelectDragon) return selectedDragonType
    return getOptimalDragonType(activeVoiceState, 'auto', true)
  }, [autoSelectDragon, activeVoiceState, selectedDragonType])

  // Demo controls for testing different voice states
  const simulateVoiceState = useCallback((state: Partial<VoiceAnimationState>) => {
    setSimulatedVoiceState(prev => ({
      ...prev,
      ...state,
      isIdle: !state.isListening && !state.isSpeaking && !state.isProcessing
    }))
  }, [])

  // Dragon type options
  const dragonTypes: { type: DragonType; label: string; description: string }[] = [
    { type: '2d', label: '2D Sprite', description: 'Animated PNG with particle effects' },
    { type: '3d', label: '3D Model', description: 'Full 3D dragon with physics' },
    { type: 'ascii', label: 'ASCII Art', description: 'Terminal-style ASCII animation' }
  ]

  return (
    <div className={`flex flex-col space-y-8 p-6 ${className}`}>
      {/* Demo Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">
          🐉 Voice-Dragon Integration Demo
        </h2>
        <p className="text-gray-300">
          Experience how dragons react to voice interactions in real-time
        </p>
      </div>

      {/* Controls Panel */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Demo Controls</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Dragon Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Dragon Type
            </label>
            <div className="space-y-2">
              {dragonTypes.map(({ type, label, description }) => (
                <label key={type} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    value={type}
                    checked={selectedDragonType === type}
                    onChange={(e) => setSelectedDragonType(e.target.value as DragonType)}
                    disabled={autoSelectDragon}
                    className="text-orange-500"
                  />
                  <div>
                    <span className="text-white">{label}</span>
                    <p className="text-xs text-gray-400">{description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Options
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSelectDragon}
                  onChange={(e) => setAutoSelectDragon(e.target.checked)}
                  className="text-orange-500"
                />
                <span className="text-white">Auto-select optimal dragon type</span>
              </label>
              
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableAnimations}
                  onChange={(e) => setEnableAnimations(e.target.checked)}
                  className="text-orange-500"
                />
                <span className="text-white">Enable voice animations</span>
              </label>
              
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useSimulatedState}
                  onChange={(e) => setUseSimulatedState(e.target.checked)}
                  className="text-orange-500"
                />
                <span className="text-white">Use simulated voice state</span>
              </label>
            </div>
          </div>
        </div>

        {/* Voice State Simulation Buttons - Only show in simulation mode */}
        {useSimulatedState && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Simulate Voice States
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => simulateVoiceState({ isListening: true, isIdle: false, volume: 0.8 })}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
              >
                👂 Listening
              </button>
              <button
                onClick={() => simulateVoiceState({ isSpeaking: true, isIdle: false, volume: 1.0 })}
                className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm"
              >
                🗣️ Speaking
              </button>
              <button
                onClick={() => simulateVoiceState({ isProcessing: true, isIdle: false, volume: 0.6 })}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
              >
                ⚙️ Processing
              </button>
              <button
                onClick={() => simulateVoiceState({ emotion: 'angry' })}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
              >
                😠 Error
              </button>
              <button
                onClick={() => simulateVoiceState({ 
                  isListening: false, 
                  isSpeaking: false, 
                  isProcessing: false, 
                  isIdle: true, 
                  volume: 0, 
                  emotion: 'neutral' 
                })}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
              >
                💤 Reset
              </button>
            </div>
          </div>
        )}
        
        {/* Real Voice State Info */}
        {!useSimulatedState && (
          <div className="mt-4 p-3 bg-blue-900/30 rounded border border-blue-700">
            <h4 className="text-sm font-semibold text-blue-300 mb-1">🎙️ Real Voice State Mode:</h4>
            <p className="text-xs text-blue-200">Dragon responds to actual voice interface interactions</p>
          </div>
        )}
      </div>

      {/* Main Demo Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Dragon Display */}
        <div className="flex flex-col items-center space-y-4">
          <h3 className="text-xl font-semibold text-white">Dragon Animation</h3>
          <div className="bg-gray-900/50 rounded-lg p-8 border border-gray-700 min-h-[300px] flex items-center justify-center">
            <DragonRenderer
              dragonType={autoSelectDragon ? optimalDragonType : selectedDragonType}
              size="xl"
              voiceState={enableAnimations ? activeVoiceState : undefined}
              enableHover={true}
              enableFallback={true}
              fallbackType="2d"
              onClick={handleDragonClick}
              onError={(error, dragonType) => logger.error('Dragon error', { error, dragonType })}
              onFallback={(from, to) => logger.info('Dragon fallback', { from, to })}
            />
          </div>
          
          {/* Dragon State Display */}
          <div className="text-center">
            <p className="text-sm text-gray-400">
              Active Type: <span className="text-orange-400 font-semibold">
                {autoSelectDragon ? optimalDragonType : selectedDragonType}
              </span>
            </p>
            {enableAnimations && (
              <div className="mt-2 text-xs text-gray-500">
                <p>Mode: <span className="text-blue-400">{useSimulatedState ? 'Simulated' : 'Real Voice'}</span></p>
                <p>Listening: {activeVoiceState.isListening ? '🟢' : '🔴'}</p>
                <p>Speaking: {activeVoiceState.isSpeaking ? '🟢' : '🔴'}</p>
                <p>Processing: {activeVoiceState.isProcessing ? '🟢' : '🔴'}</p>
                <p>Emotion: <span className="text-purple-400">{activeVoiceState.emotion}</span></p>
                <p>Volume: <span className="text-green-400">{(activeVoiceState.volume || 0).toFixed(1)}</span></p>
              </div>
            )}
          </div>
        </div>

        {/* Voice Interface */}
        <div className="flex flex-col items-center space-y-4">
          <h3 className="text-xl font-semibold text-white">Voice Interface</h3>
          <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-700 w-full">
            <VoiceInterface
              elevenLabsConfig={elevenLabsConfig}
              onTranscriptChange={handleTranscriptChange}
              onError={handleVoiceError}
              autoReadResponses={true}
              dragonType={autoSelectDragon ? optimalDragonType : selectedDragonType}
              dragonSize="lg"
              enableDragonAnimations={enableAnimations}
              onDragonClick={handleDragonClick}
              className="w-full"
            />
            
            {/* Real-time transcript display */}
            {transcript && (
              <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-600">
                <h4 className="text-sm font-semibold text-gray-300 mb-1">Live Transcript:</h4>
                <p className="text-sm text-white">{transcript}</p>
              </div>
            )}
            
            {/* Error display */}
            {error && (
              <div className="mt-4 p-3 bg-red-900/50 rounded border border-red-500">
                <h4 className="text-sm font-semibold text-red-300 mb-1">Error:</h4>
                <p className="text-sm text-red-200">{error.message}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feature Overview */}
      <div className="bg-gray-800/30 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">🎯 Integration Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <h4 className="font-semibold text-orange-400 mb-2">🎨 Visual Feedback</h4>
            <ul className="text-gray-300 space-y-1">
              <li>• Real-time pose changes</li>
              <li>• Volume-based intensity</li>
              <li>• Emotion-driven colors</li>
              <li>• Breathing animations</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-blue-400 mb-2">⚡ Performance</h4>
            <ul className="text-gray-300 space-y-1">
              <li>• Automatic fallbacks</li>
              <li>• 3D support detection</li>
              <li>• Optimized rendering</li>
              <li>• Smooth transitions</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-purple-400 mb-2">🔧 Customization</h4>
            <ul className="text-gray-300 space-y-1">
              <li>• Dragon type selection</li>
              <li>• Animation toggles</li>
              <li>• Voice state mapping</li>
              <li>• Error handling</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VoiceDragonDemo