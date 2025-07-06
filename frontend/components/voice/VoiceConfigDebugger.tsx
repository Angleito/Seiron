import React, { useEffect, useState } from 'react'
import { logger } from '../../lib/logger'

interface VoiceConfigStatus {
  elevenLabsApiKey: {
    isSet: boolean
    length: number
    source: string
    isValid: boolean
  }
  elevenLabsVoiceId: {
    isSet: boolean
    value: string
    source: string
    isValid: boolean
  }
  voiceEnabled: {
    isSet: boolean
    value: string
    isEnabled: boolean
  }
  browserSupport: {
    speechRecognition: boolean
    audioContext: boolean
    indexedDB: boolean
    webAudio: boolean
  }
  permissions: {
    microphone: string
    notifications: string
  }
}

export const VoiceConfigDebugger: React.FC<{ visible?: boolean }> = ({ visible = false }) => {
  const [status, setStatus] = useState<VoiceConfigStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkConfiguration = async () => {
      logger.debug('🔧 Starting voice configuration check')
      
      try {
        // Check environment variables
        const elevenLabsApiKey = {
          isSet: typeof process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY !== 'undefined',
          length: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY?.length || 0,
          source: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY ? 'env' : 'none',
          isValid: (process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY?.length || 0) > 10
        }
        
        const elevenLabsVoiceId = {
          isSet: typeof process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID !== 'undefined',
          value: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || '',
          source: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID ? 'env' : 'none',
          isValid: (process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID?.length || 0) > 5
        }
        
        const voiceEnabled = {
          isSet: typeof process.env.NEXT_PUBLIC_VOICE_ENABLED !== 'undefined',
          value: process.env.NEXT_PUBLIC_VOICE_ENABLED || 'false',
          isEnabled: process.env.NEXT_PUBLIC_VOICE_ENABLED === 'true'
        }

        // Check browser support
        const browserSupport = {
          speechRecognition: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
          audioContext: !!(window.AudioContext || window.webkitAudioContext),
          indexedDB: !!window.indexedDB,
          webAudio: !!window.AudioContext
        }

        // Check permissions
        let microphonePermission = 'unknown'
        let notificationPermission = 'unknown'

        try {
          if (navigator.permissions) {
            const micResult = await navigator.permissions.query({ name: 'microphone' as PermissionName })
            microphonePermission = micResult.state
            
            const notResult = await navigator.permissions.query({ name: 'notifications' as PermissionName })
            notificationPermission = notResult.state
          }
        } catch (error) {
          logger.warn('🔧 Could not check permissions', { error })
        }

        const configStatus: VoiceConfigStatus = {
          elevenLabsApiKey,
          elevenLabsVoiceId,
          voiceEnabled,
          browserSupport,
          permissions: {
            microphone: microphonePermission,
            notifications: notificationPermission
          }
        }

        logger.debug('🔧 Voice configuration check completed', configStatus)
        setStatus(configStatus)
        
      } catch (error) {
        logger.error('🔧 Voice configuration check failed', { error })
      } finally {
        setIsLoading(false)
      }
    }

    checkConfiguration()
  }, [])

  if (!visible) return null

  if (isLoading) {
    return (
      <div className="fixed top-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg max-w-md z-50">
        <h3 className="text-lg font-semibold mb-2">🔧 Voice Config Check</h3>
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  if (!status) return null

  const StatusIndicator: React.FC<{ isGood: boolean; label: string; value?: string }> = ({ 
    isGood, 
    label, 
    value 
  }) => (
    <div className="flex items-center justify-between py-1">
      <span className="text-size-3">{label}:</span>
      <div className="flex items-center space-x-2">
        {value && <span className="text-size-4 text-gray-400">{value}</span>}
        <div className={`w-3 h-3 rounded-full ${isGood ? 'bg-green-500' : 'bg-red-500'}`} />
      </div>
    </div>
  )

  return (
    <div className="fixed top-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg max-w-md z-50 max-h-96 overflow-y-auto">
      <h3 className="text-lg font-semibold mb-3">🔧 Voice Configuration Debug</h3>
      
      {/* Environment Variables */}
      <div className="mb-4">
        <h4 className="font-normal text-orange-400 mb-2">Environment Variables</h4>
        <StatusIndicator 
          isGood={status.elevenLabsApiKey.isValid} 
          label="ElevenLabs API Key" 
          value={status.elevenLabsApiKey.isSet ? `${status.elevenLabsApiKey.length} chars` : 'not set'}
        />
        <StatusIndicator 
          isGood={status.elevenLabsVoiceId.isValid} 
          label="ElevenLabs Voice ID" 
          value={status.elevenLabsVoiceId.value || 'not set'}
        />
        <StatusIndicator 
          isGood={status.voiceEnabled.isEnabled} 
          label="Voice Enabled" 
          value={status.voiceEnabled.value}
        />
      </div>

      {/* Browser Support */}
      <div className="mb-4">
        <h4 className="font-normal text-blue-400 mb-2">Browser Support</h4>
        <StatusIndicator 
          isGood={status.browserSupport.speechRecognition} 
          label="Speech Recognition"
        />
        <StatusIndicator 
          isGood={status.browserSupport.audioContext} 
          label="Audio Context"
        />
        <StatusIndicator 
          isGood={status.browserSupport.indexedDB} 
          label="IndexedDB"
        />
        <StatusIndicator 
          isGood={status.browserSupport.webAudio} 
          label="Web Audio API"
        />
      </div>

      {/* Permissions */}
      <div className="mb-4">
        <h4 className="font-normal text-purple-400 mb-2">Permissions</h4>
        <StatusIndicator 
          isGood={status.permissions.microphone === 'granted'} 
          label="Microphone" 
          value={status.permissions.microphone}
        />
        <StatusIndicator 
          isGood={status.permissions.notifications === 'granted'} 
          label="Notifications" 
          value={status.permissions.notifications}
        />
      </div>

      {/* Overall Status */}
      <div className="border-t border-gray-600 pt-3">
        <h4 className="font-normal text-yellow-400 mb-2">Overall Status</h4>
        <div className={`text-size-3 p-2 rounded ${
          status.elevenLabsApiKey.isValid && 
          status.elevenLabsVoiceId.isValid && 
          status.voiceEnabled.isEnabled &&
          status.browserSupport.speechRecognition &&
          status.browserSupport.audioContext
            ? 'bg-green-900 text-green-200' 
            : 'bg-red-900 text-red-200'
        }`}>
          {status.elevenLabsApiKey.isValid && 
           status.elevenLabsVoiceId.isValid && 
           status.voiceEnabled.isEnabled &&
           status.browserSupport.speechRecognition &&
           status.browserSupport.audioContext
            ? '✅ Voice features should work' 
            : '❌ Voice features may not work properly'}
        </div>
      </div>
    </div>
  )
}

export default VoiceConfigDebugger