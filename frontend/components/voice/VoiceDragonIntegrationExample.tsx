'use client'

import React, { useState, useCallback, useEffect } from 'react'
import VoiceInterface from './VoiceInterface'
import { DragonType, VoiceAnimationState } from '../dragon/DragonRenderer'
import { createVoiceAnimationState } from '../../utils/voice-dragon-mapping'
import { logger } from '../../lib/logger'

export interface VoiceDragonIntegrationExampleProps {
  elevenLabsConfig: {
    apiKey: string
    voiceId: string
    modelId?: string
  }
}

/**
 * Simple example showing basic voice-dragon integration
 * Perfect for documentation and getting started guides
 */
const VoiceDragonIntegrationExample: React.FC<VoiceDragonIntegrationExampleProps> = ({
  elevenLabsConfig
}) => {
  const [selectedDragonType, setSelectedDragonType] = useState<DragonType>('2d')
  const [transcript, setTranscript] = useState('')
  const [lastError, setLastError] = useState<string>('')
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [voiceState, setVoiceState] = useState<VoiceAnimationState>(
    createVoiceAnimationState(false, false, false, false)
  )
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('disconnected')

  // Enhanced transcript handler with voice state tracking
  const handleTranscriptChange = useCallback((newTranscript: string) => {
    setTranscript(newTranscript)
    setIsVoiceActive(newTranscript.length > 0)
    
    // Update voice state based on transcript activity
    const newVoiceState = createVoiceAnimationState(
      newTranscript.length > 0,
      false,
      false,
      false,
      Math.min(newTranscript.length / 100, 1.0)
    )
    setVoiceState(newVoiceState)
    
    logger.debug('🎙️ Voice transcript updated', { 
      transcriptLength: newTranscript.length,
      voiceState: newVoiceState 
    })
  }, [])

  // Enhanced error handler with recovery suggestions
  const handleVoiceError = useCallback((error: Error) => {
    setLastError(error.message)
    setConnectionStatus('error')
    
    // Update voice state to show error
    const errorVoiceState = createVoiceAnimationState(false, false, false, true)
    setVoiceState(errorVoiceState)
    
    logger.error('🔊 Voice error occurred', { 
      error: error.message,
      type: error.name,
      stack: error.stack 
    })
  }, [])

  // Enhanced dragon click handler with feedback
  const handleDragonClick = useCallback(() => {
    logger.debug('🐉 Dragon clicked in integration example')
    
    // Trigger a brief excitement state
    const excitedState = createVoiceAnimationState(false, false, false, false, 0.8)
    excitedState.emotion = 'excited'
    setVoiceState(excitedState)
    
    // Reset to normal after a brief moment
    setTimeout(() => {
      const normalState = createVoiceAnimationState(false, false, false, false)
      setVoiceState(normalState)
    }, 1500)
  }, [])

  // Monitor connection status
  useEffect(() => {
    if (elevenLabsConfig.apiKey) {
      setConnectionStatus('connected')
    } else {
      setConnectionStatus('error')
      setLastError('ElevenLabs API key not configured')
    }
  }, [elevenLabsConfig.apiKey])

  // Clear error after some time
  useEffect(() => {
    if (lastError) {
      const timer = setTimeout(() => {
        setLastError('')
      }, 10000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [lastError])

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          🐉 Voice-Dragon Integration
        </h2>
        <p className="text-gray-300">
          Dragons that react to your voice in real-time
        </p>
        
        {/* Connection Status */}
        <div className={`mt-2 inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${
          connectionStatus === 'connected' ? 'bg-green-900/50 text-green-300' :
          connectionStatus === 'error' ? 'bg-red-900/50 text-red-300' :
          connectionStatus === 'connecting' ? 'bg-yellow-900/50 text-yellow-300' :
          'bg-gray-900/50 text-gray-300'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' :
            connectionStatus === 'error' ? 'bg-red-400' :
            connectionStatus === 'connecting' ? 'bg-yellow-400 animate-ping' :
            'bg-gray-400'
          }`}></div>
          <span>
            {connectionStatus === 'connected' ? 'Ready' :
             connectionStatus === 'error' ? 'Error' :
             connectionStatus === 'connecting' ? 'Connecting...' :
             'Disconnected'}
          </span>
        </div>
      </div>

      {/* Dragon Type Selector */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Choose Dragon Type:
        </label>
        <div className="flex flex-wrap gap-3">
          {([
            { type: '2d', label: '🖼️ 2D Sprite', description: 'Fast and lightweight' },
            { type: '3d', label: '🎮 3D Model', description: 'Immersive experience' },
            { type: 'ascii', label: '💻 ASCII Art', description: 'Retro terminal style' }
          ] as const).map(({ type, label, description }) => (
            <button
              key={type}
              onClick={() => setSelectedDragonType(type)}
              className={`flex-1 min-w-[120px] p-3 rounded-lg border transition-all ${
                selectedDragonType === type
                  ? 'bg-orange-600 border-orange-500 text-white'
                  : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <div className="font-medium">{label}</div>
              <div className="text-xs opacity-75">{description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Voice Interface with Dragon */}
      <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-700">
        <VoiceInterface
          elevenLabsConfig={elevenLabsConfig}
          onTranscriptChange={handleTranscriptChange}
          onError={handleVoiceError}
          autoReadResponses={true}
          dragonType={selectedDragonType}
          dragonSize="lg"
          enableDragonAnimations={true}
          onDragonClick={handleDragonClick}
        />
      </div>

      {/* Status Display */}
      <div className="space-y-4">
        {/* Voice Activity Indicator */}
        {isVoiceActive && (
          <div className="bg-green-900/30 rounded-lg p-3 border border-green-700">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-300 font-medium">🎙️ Voice Activity Detected</span>
            </div>
            <div className="mt-2 text-sm text-green-200">
              <p>Dragon State: <span className="text-green-400">{voiceState.emotion}</span></p>
              <p>Volume Level: <span className="text-green-400">{((voiceState.volume || 0) * 100).toFixed(0)}%</span></p>
            </div>
          </div>
        )}
        
        {/* Transcript */}
        {transcript && (
          <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-700">
            <h3 className="text-blue-300 font-medium mb-2">📝 Current Transcript:</h3>
            <p className="text-white">{transcript}</p>
            <div className="mt-2 text-xs text-blue-300">
              Length: {transcript.length} characters
            </div>
          </div>
        )}

        {/* Enhanced Error Display with Recovery */}
        {lastError && (
          <div className="bg-red-900/30 rounded-lg p-4 border border-red-700">
            <h3 className="text-red-300 font-medium mb-2">❌ Voice Integration Error:</h3>
            <p className="text-red-200 mb-3">{lastError}</p>
            
            {/* Error-specific recovery suggestions */}
            <div className="text-sm text-red-300 mb-3">
              <p className="font-medium mb-1">💡 Troubleshooting:</p>
              <ul className="list-disc list-inside space-y-1 text-red-200">
                {lastError.includes('API key') && (
                  <li>Check your ElevenLabs API key in environment variables</li>
                )}
                {lastError.includes('microphone') && (
                  <li>Allow microphone permissions in your browser</li>
                )}
                {lastError.includes('network') && (
                  <li>Check your internet connection</li>
                )}
                {lastError.includes('Speech') && (
                  <li>Try using Chrome, Edge, or Safari for speech recognition</li>
                )}
                <li>Refresh the page and try again</li>
                <li>Check browser console for detailed error logs</li>
              </ul>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setLastError('')}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
              >
                Clear Error
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
              >
                Reload Page
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Usage Instructions */}
      <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
        <h3 className="text-gray-300 font-medium mb-3">🔧 How to Use:</h3>
        <ol className="text-sm text-gray-400 space-y-2">
          <li><strong>1.</strong> Click the microphone button to start listening</li>
          <li><strong>2.</strong> Speak your message - watch the dragon react!</li>
          <li><strong>3.</strong> Toggle the speaker to enable AI response playback</li>
          <li><strong>4.</strong> Try different dragon types to see various animations</li>
          <li><strong>5.</strong> Click the dragon for fun interactions</li>
        </ol>
      </div>

      {/* Code Example */}
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
        <h3 className="text-gray-300 font-medium mb-3">💻 Code Example:</h3>
        <pre className="text-xs text-gray-400 overflow-x-auto">
{`import VoiceInterface from './components/voice/VoiceInterface'

<VoiceInterface
  elevenLabsConfig={{
    apiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY,
    voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID
  }}
  dragonType="2d"
  dragonSize="lg"
  enableDragonAnimations={true}
  onTranscriptChange={(transcript) => console.log(transcript)}
  onError={(error) => console.error(error)}
  onDragonClick={() => console.log('Dragon clicked!')}
/>`}
        </pre>
      </div>
    </div>
  )
}

export default VoiceDragonIntegrationExample