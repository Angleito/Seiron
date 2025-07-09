import React, { useState, useEffect } from 'react'
import VoiceInterface from '../components/voice/VoiceInterface'
import VoiceConfigDebugger from '../components/voice/VoiceConfigDebugger'
import { useSpeechRecognition } from '../hooks/voice/useSpeechRecognition'
import { useElevenLabsTTS } from '../hooks/voice/useElevenLabsTTS'
import { logger } from '../lib/logger'
// Note: voiceLogger removed - using console methods for logging

const VoiceTestPage: React.FC = () => {
  const [showDebugger, setShowDebugger] = useState(true)
  const [testTranscript, setTestTranscript] = useState('')
  const [testError, setTestError] = useState<Error | null>(null)
  const [testResults, setTestResults] = useState<Array<{
    test: string
    status: 'pending' | 'pass' | 'fail'
    message: string
    timestamp: Date
  }>>([])

  // Test configuration
  const elevenLabsConfig = {
    apiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '',
    voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || '',
    modelId: 'eleven_monolingual_v1',
    voiceSettings: {
      stability: 0.5,
      similarityBoost: 0.5
    }
  }

  const speechRecognition = useSpeechRecognition()
  const tts = useElevenLabsTTS(elevenLabsConfig)

  const addTestResult = (test: string, status: 'pass' | 'fail', message: string) => {
    setTestResults(prev => [
      ...prev,
      {
        test,
        status,
        message,
        timestamp: new Date()
      }
    ])
  }

  const runTests = async () => {
    logger.info('🧪 Starting voice feature tests')
    setTestResults([])

    // Test 1: Environment Variables
    logger.debug('🧪 Testing environment variables')
    if (process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY) {
      addTestResult('Environment Variables', 'pass', 'ElevenLabs API key is set')
    } else {
      addTestResult('Environment Variables', 'fail', 'ElevenLabs API key is missing')
    }

    // Test 2: Speech Recognition Support
    logger.debug('🧪 Testing speech recognition support')
    if (speechRecognition.isSupported) {
      addTestResult('Speech Recognition', 'pass', 'Browser supports speech recognition')
    } else {
      addTestResult('Speech Recognition', 'fail', 'Browser does not support speech recognition')
    }

    // Test 3: Audio Context Support
    logger.debug('🧪 Testing audio context support')
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (AudioContextClass) {
        const testContext = new AudioContextClass()
        await testContext.close()
        addTestResult('Audio Context', 'pass', 'Audio context is available')
      } else {
        addTestResult('Audio Context', 'fail', 'Audio context is not available')
      }
    } catch (error) {
      addTestResult('Audio Context', 'fail', `Audio context error: ${error}`)
    }

    // Test 4: IndexedDB Support
    logger.debug('🧪 Testing IndexedDB support')
    if (window.indexedDB) {
      addTestResult('IndexedDB', 'pass', 'IndexedDB is available for caching')
    } else {
      addTestResult('IndexedDB', 'fail', 'IndexedDB is not available')
    }

    // Test 5: ElevenLabs API Test
    if (elevenLabsConfig.apiKey && elevenLabsConfig.voiceId) {
      logger.debug('🧪 Testing ElevenLabs API connection')
      try {
        const testResult = await tts.speak('Testing ElevenLabs connection')()
        if (testResult._tag === 'Right') {
          addTestResult('ElevenLabs API', 'pass', 'API connection successful')
        } else {
          addTestResult('ElevenLabs API', 'fail', `API test failed: ${testResult.left.message}`)
        }
      } catch (error) {
        addTestResult('ElevenLabs API', 'fail', `API test error: ${error}`)
      }
    } else {
      addTestResult('ElevenLabs API', 'fail', 'Missing API key or voice ID')
    }

    // Test 6: Microphone Permission
    logger.debug('🧪 Testing microphone permissions')
    try {
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        if (permission.state === 'granted') {
          addTestResult('Microphone Permission', 'pass', 'Microphone permission granted')
        } else if (permission.state === 'denied') {
          addTestResult('Microphone Permission', 'fail', 'Microphone permission denied')
        } else {
          addTestResult('Microphone Permission', 'pass', 'Microphone permission prompt required')
        }
      } else {
        addTestResult('Microphone Permission', 'fail', 'Permission API not available')
      }
    } catch (error) {
      addTestResult('Microphone Permission', 'fail', `Permission check error: ${error}`)
    }

    logger.info('🧪 Voice feature tests completed')
  }

  const clearLogs = () => {
    logger.info('🧹 Clearing voice logs')
    setTestResults([])
    setTestTranscript('')
    setTestError(null)
  }

  const exportLogs = () => {
    const sessionInfo = { component: 'VoiceTestPage', timestamp: new Date().toISOString() }
    const logData = {
      sessionInfo,
      testResults,
      environment: {
        userAgent: navigator.userAgent,
        hasElevenLabsKey: !!elevenLabsConfig.apiKey,
        keyLength: elevenLabsConfig.apiKey?.length || 0,
        voiceId: elevenLabsConfig.voiceId,
        timestamp: new Date().toISOString()
      },
      speechRecognitionState: {
        isSupported: speechRecognition.isSupported,
        isListening: speechRecognition.isListening,
        hasTranscript: speechRecognition.hasTranscript(),
        hasError: speechRecognition.hasError()
      },
      ttsState: {
        isSpeaking: tts.isSpeaking,
        isLoading: tts.isLoading,
        hasError: !!tts.error
      }
    }

    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `voice-debug-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    logger.info('🔽 Voice debug logs exported')
  }

  const testTTS = async () => {
    const testText = "Hello! This is a test of the ElevenLabs text-to-speech functionality. If you can hear this, the voice system is working correctly."
    logger.info('🔊 Testing TTS with sample text')
    
    try {
      const result = await tts.speak(testText)()
      if (result._tag === 'Right') {
        addTestResult('TTS Test', 'pass', 'Text-to-speech test successful')
      } else {
        addTestResult('TTS Test', 'fail', `TTS test failed: ${result.left.message}`)
      }
    } catch (error) {
      addTestResult('TTS Test', 'fail', `TTS test error: ${error}`)
    }
  }

  useEffect(() => {
    logger.info('🧪 Voice Test Page mounted')
    console.log('🧪 Voice Test Page session started')

    return () => {
      console.log('🧪 Voice Test Page session ended')
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🎤 Voice Features Test Page</h1>
          <p className="text-gray-400">
            Test and debug voice recognition and text-to-speech functionality
          </p>
        </div>

        {/* Debug Controls */}
        <div className="mb-8 flex flex-wrap gap-4">
          <button
            onClick={runTests}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            🧪 Run Tests
          </button>
          <button
            onClick={testTTS}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          >
            🔊 Test TTS
          </button>
          <button
            onClick={clearLogs}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
          >
            🧹 Clear Logs
          </button>
          <button
            onClick={exportLogs}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            🔽 Export Debug Data
          </button>
          <button
            onClick={() => setShowDebugger(!showDebugger)}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
          >
            {showDebugger ? '👁️ Hide' : '👁️ Show'} Debugger
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Voice Interface Test */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">🎙️ Voice Interface Test</h2>
            <VoiceInterface
              elevenLabsConfig={elevenLabsConfig}
              onTranscriptChange={(transcript) => {
                setTestTranscript(transcript)
                logger.debug('🎤 Transcript updated in test page', { transcript })
              }}
              onError={(error) => {
                setTestError(error)
                logger.error('🚨 Error in test page', { error: error.message })
              }}
              autoReadResponses={false}
              className="border border-gray-700 rounded-lg"
            />
            
            {testTranscript && (
              <div className="mt-4 p-3 bg-gray-700 rounded">
                <h3 className="font-medium text-green-400 mb-2">Latest Transcript:</h3>
                <p className="text-sm">{testTranscript}</p>
              </div>
            )}
            
            {testError && (
              <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded">
                <h3 className="font-medium text-red-400 mb-2">Latest Error:</h3>
                <p className="text-sm">{testError.message}</p>
              </div>
            )}
          </div>

          {/* Test Results */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">🧪 Test Results</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {testResults.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  Click "Run Tests" to check voice functionality
                </p>
              ) : (
                testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded border-l-4 ${
                      result.status === 'pass'
                        ? 'bg-green-900/20 border-green-500'
                        : result.status === 'fail'
                        ? 'bg-red-900/20 border-red-500'
                        : 'bg-yellow-900/20 border-yellow-500'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-medium">{result.test}</h3>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          result.status === 'pass'
                            ? 'bg-green-600 text-white'
                            : result.status === 'fail'
                            ? 'bg-red-600 text-white'
                            : 'bg-yellow-600 text-white'
                        }`}
                      >
                        {result.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300">{result.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {result.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Current State Display */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-medium text-blue-400 mb-2">Speech Recognition</h3>
            <div className="space-y-1 text-sm">
              <div>Supported: {speechRecognition.isSupported ? '✅' : '❌'}</div>
              <div>Listening: {speechRecognition.isListening ? '🔴' : '⚫'}</div>
              <div>Has Transcript: {speechRecognition.hasTranscript() ? '📝' : '📄'}</div>
              <div>Has Error: {speechRecognition.hasError() ? '⚠️' : '✅'}</div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-medium text-orange-400 mb-2">Text-to-Speech</h3>
            <div className="space-y-1 text-sm">
              <div>Speaking: {tts.isSpeaking ? '🔊' : '🔇'}</div>
              <div>Loading: {tts.isLoading ? '⏳' : '✅'}</div>
              <div>Has Error: {tts.error ? '⚠️' : '✅'}</div>
              <div>Error Type: {tts.error?.type || 'None'}</div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-medium text-purple-400 mb-2">Configuration</h3>
            <div className="space-y-1 text-sm">
              <div>API Key: {elevenLabsConfig.apiKey ? `Set (${elevenLabsConfig.apiKey.length} chars)` : 'Missing'}</div>
              <div>Voice ID: {elevenLabsConfig.voiceId || 'Missing'}</div>
              <div>Model: {elevenLabsConfig.modelId}</div>
              <div>Voice Enabled: {process.env.NEXT_PUBLIC_VOICE_ENABLED || 'Not set'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Debug Panel */}
      <VoiceConfigDebugger visible={showDebugger} />
    </div>
  )
}

export default VoiceTestPage