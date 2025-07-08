import React, { useState } from 'react'
import { useSecureElevenLabsTTS } from '../../hooks/voice'
import { pipe } from 'fp-ts/function'
import * as TE from 'fp-ts/TaskEither'

interface SecureVoiceExampleProps {
  voiceId?: string
  className?: string
}

export const SecureVoiceExample: React.FC<SecureVoiceExampleProps> = ({
  voiceId = process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || '',
  className = ''
}) => {
  const [text, setText] = useState('Hello! This is a secure voice synthesis example.')
  const [lastError, setLastError] = useState<string | null>(null)

  const tts = useSecureElevenLabsTTS({
    voiceId,
    modelId: 'eleven_monolingual_v1',
    voiceSettings: {
      stability: 0.5,
      similarity_boost: 0.8,
      style: 0.0,
      use_speaker_boost: false
    }
  })

  const handleSpeak = async () => {
    if (!text.trim()) {
      setLastError('Please enter some text to speak')
      return
    }

    setLastError(null)
    
    const result = await tts.speak(text.trim())()
    
    pipe(
      result,
      TE.fold(
        (error) => {
          console.error('Voice synthesis error:', error)
          switch (error.type) {
            case 'QUOTA_EXCEEDED':
              setLastError('Rate limit exceeded. Please try again in a moment.')
              break
            case 'API_ERROR':
              setLastError(`API Error: ${error.message}`)
              break
            case 'NETWORK_ERROR':
              setLastError('Network error. Please check your connection.')
              break
            case 'AUDIO_ERROR':
              setLastError('Audio playback error. Please try again.')
              break
            default:
              setLastError(`Unknown error: ${error.message}`)
          }
        },
        () => {
          console.log('Voice synthesis completed successfully')
        }
      )
    )
  }

  const handleStop = () => {
    tts.stop()
    setLastError(null)
  }

  const handleClearCache = () => {
    tts.clearCache()
    console.log('Voice synthesis cache cleared')
  }

  const cacheStats = tts.getCacheStats()

  return (
    <div className={`secure-voice-example ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Secure Voice Synthesis Example</h3>
        <p className="text-sm text-gray-600 mb-4">
          This example uses the secure server-side API for voice synthesis.
        </p>
      </div>

      <div className="mb-4">
        <label htmlFor="voice-text" className="block text-sm font-medium mb-2">
          Text to Speak:
        </label>
        <textarea
          id="voice-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
          maxLength={1000}
          placeholder="Enter text to synthesize..."
        />
        <div className="text-xs text-gray-500 mt-1">
          {text.length}/1000 characters
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={handleSpeak}
          disabled={tts.isLoading || tts.isSpeaking || !text.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
        >
          {tts.isLoading ? 'Loading...' : tts.isSpeaking ? 'Speaking...' : 'Speak'}
        </button>

        <button
          onClick={handleStop}
          disabled={!tts.isSpeaking}
          className="px-4 py-2 bg-red-500 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-red-600 transition-colors"
        >
          Stop
        </button>

        <button
          onClick={handleClearCache}
          className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
        >
          Clear Cache
        </button>
      </div>

      {lastError && (
        <div className="p-3 bg-red-100 border border-red-300 rounded-md mb-4">
          <p className="text-red-700 text-sm">{lastError}</p>
        </div>
      )}

      <div className="text-xs text-gray-600 space-y-1">
        <div>Status: {tts.isLoading ? 'Loading' : tts.isSpeaking ? 'Speaking' : 'Ready'}</div>
        <div>Cache: {cacheStats.size}/{cacheStats.maxSize} items</div>
        <div>Voice ID: {voiceId || 'Not configured'}</div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">Security Features:</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>✅ Server-side API key management</li>
          <li>✅ Built-in rate limiting (10 requests/minute)</li>
          <li>✅ Input validation and sanitization</li>
          <li>✅ Client-side caching</li>
          <li>✅ Proper CORS configuration</li>
        </ul>
      </div>
    </div>
  )
}

export default SecureVoiceExample