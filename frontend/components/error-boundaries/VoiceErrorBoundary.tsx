import React from 'react'
import { DragonBallErrorBoundary } from './DragonBallErrorBoundary'
import { DragonRenderer } from '@components/dragon/DragonRenderer'
import { Button } from '@components/ui/forms/Button'
import { errorRecoveryUtils } from '@utils/errorRecovery'
import { logger } from '@lib/logger'

interface VoiceErrorBoundaryProps {
  children: React.ReactNode
  onReset?: () => void
}

// Voice error classification
enum VoiceErrorType {
  MICROPHONE_PERMISSION = 'microphone_permission',
  AUDIO_OUTPUT = 'audio_output',
  NETWORK_ERROR = 'network_error',
  TTS_API_ERROR = 'tts_api_error',
  SPEECH_RECOGNITION_ERROR = 'speech_recognition_error',
  BROWSER_SUPPORT = 'browser_support',
  GENERIC_ERROR = 'generic_error'
}

// Classify voice errors
const classifyVoiceError = (error: Error): VoiceErrorType => {
  const message = error.message.toLowerCase()
  
  if (message.includes('permission') || message.includes('denied') || message.includes('microphone')) {
    return VoiceErrorType.MICROPHONE_PERMISSION
  }
  if (message.includes('audio') || message.includes('speaker') || message.includes('output')) {
    return VoiceErrorType.AUDIO_OUTPUT
  }
  if (message.includes('network') || message.includes('connection') || message.includes('fetch')) {
    return VoiceErrorType.NETWORK_ERROR
  }
  if (message.includes('tts') || message.includes('text-to-speech') || message.includes('elevenlabs')) {
    return VoiceErrorType.TTS_API_ERROR
  }
  if (message.includes('speech') || message.includes('recognition') || message.includes('transcript')) {
    return VoiceErrorType.SPEECH_RECOGNITION_ERROR
  }
  if (message.includes('not supported') || message.includes('browser')) {
    return VoiceErrorType.BROWSER_SUPPORT
  }
  
  return VoiceErrorType.GENERIC_ERROR
}

const VoiceErrorFallback = ({ 
  error, 
  resetError 
}: { 
  error: Error
  resetError: () => void 
}) => {
  const errorType = classifyVoiceError(error)
  
  // Record error for monitoring
  React.useEffect(() => {
    errorRecoveryUtils.monitor.recordError(error, 'VoiceSystem', false)
  }, [error])
  
  const getErrorTitle = (type: VoiceErrorType): string => {
    switch (type) {
      case VoiceErrorType.MICROPHONE_PERMISSION:
        return "Microphone Access Denied!"
      case VoiceErrorType.AUDIO_OUTPUT:
        return "Audio Output Error!"
      case VoiceErrorType.NETWORK_ERROR:
        return "Network Connection Lost!"
      case VoiceErrorType.TTS_API_ERROR:
        return "Voice Synthesis Failed!"
      case VoiceErrorType.SPEECH_RECOGNITION_ERROR:
        return "Speech Recognition Error!"
      case VoiceErrorType.BROWSER_SUPPORT:
        return "Browser Not Supported!"
      default:
        return "Voice System Malfunction!"
    }
  }
  
  const getErrorMessage = (type: VoiceErrorType): string => {
    switch (type) {
      case VoiceErrorType.MICROPHONE_PERMISSION:
        return "Please grant microphone permission to use voice features."
      case VoiceErrorType.AUDIO_OUTPUT:
        return "Unable to play audio. Check your speaker settings."
      case VoiceErrorType.NETWORK_ERROR:
        return "Network connection is required for voice features."
      case VoiceErrorType.TTS_API_ERROR:
        return "Voice synthesis service is temporarily unavailable."
      case VoiceErrorType.SPEECH_RECOGNITION_ERROR:
        return "Speech recognition is not working properly."
      case VoiceErrorType.BROWSER_SUPPORT:
        return "Your browser doesn't support voice features."
      default:
        return "The Dragon's voice has been silenced!"
    }
  }
  
  const getTroubleshootingSteps = (type: VoiceErrorType): Array<{ icon: string; text: string }> => {
    switch (type) {
      case VoiceErrorType.MICROPHONE_PERMISSION:
        return [
          { icon: '🔒', text: 'Click the lock icon in your browser' },
          { icon: '🎤', text: 'Allow microphone access' },
          { icon: '🔄', text: 'Refresh and try again' }
        ]
      case VoiceErrorType.AUDIO_OUTPUT:
        return [
          { icon: '🔊', text: 'Check speaker volume' },
          { icon: '🎧', text: 'Verify audio output device' },
          { icon: '🔄', text: 'Restart your browser' }
        ]
      case VoiceErrorType.NETWORK_ERROR:
        return [
          { icon: '🌐', text: 'Check internet connection' },
          { icon: '🔄', text: 'Refresh the page' },
          { icon: '⏰', text: 'Try again in a moment' }
        ]
      case VoiceErrorType.TTS_API_ERROR:
        return [
          { icon: '🔑', text: 'Check API key configuration' },
          { icon: '🌐', text: 'Verify service availability' },
          { icon: '🔄', text: 'Try again later' }
        ]
      case VoiceErrorType.BROWSER_SUPPORT:
        return [
          { icon: '🌐', text: 'Use Chrome or Firefox' },
          { icon: '🔄', text: 'Update your browser' },
          { icon: '🔧', text: 'Enable experimental features' }
        ]
      default:
        return [
          { icon: '🎤', text: 'Check microphone permissions' },
          { icon: '🔊', text: 'Verify audio output settings' },
          { icon: '🌐', text: 'Ensure stable connection' }
        ]
    }
  }
  
  const handleRetryWithRecovery = async () => {
    try {
      // Attempt specific recovery based on error type
      if (errorType === VoiceErrorType.MICROPHONE_PERMISSION) {
        // Try to request microphone permission again
        await navigator.mediaDevices.getUserMedia({ audio: true })
      }
      
      resetError()
      errorRecoveryUtils.monitor.recordError(error, 'VoiceSystem', true)
    } catch (recoveryError) {
      logger.error('Voice recovery failed:', recoveryError)
      resetError() // Still reset even if recovery fails
    }
  }
  
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gray-900/50 rounded-lg border border-orange-800/50">
      <div className="mb-4">
        <DragonRenderer
          size="md"
          voiceState={{
            isListening: false,
            isSpeaking: false,
            isProcessing: false,
            isIdle: false,
            volume: 0,
            emotion: 'angry'
          }}
        />
      </div>
      
      <h3 className="text-xl font-bold text-orange-300 mb-2">
        {getErrorTitle(errorType)}
      </h3>
      
      <p className="text-gray-400 text-center mb-4 max-w-md">
        {getErrorMessage(errorType)}
      </p>
      
      <div className="space-y-3 w-full max-w-xs">
        <div className="text-sm text-gray-500 space-y-1">
          {getTroubleshootingSteps(errorType).map((step, index) => (
            <div key={index} className="flex items-center gap-2">
              <span>{step.icon}</span>
              <span>{step.text}</span>
            </div>
          ))}
        </div>
        
        <Button
          onClick={handleRetryWithRecovery}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white"
        >
          <span className="mr-2">🐉</span>
          Restore Dragon Voice
        </Button>
        
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-600 mt-2 p-2 bg-gray-800 rounded">
            <div className="font-semibold">Debug Info:</div>
            <div>Error Type: {errorType}</div>
            <div>Message: {error.message}</div>
          </div>
        )}
      </div>
    </div>
  )
}

export function VoiceErrorBoundary({ children, onReset }: VoiceErrorBoundaryProps) {
  return (
    <DragonBallErrorBoundary
      name="Voice System"
      level="component"
      enableDragonAnimation={true}
      fallback={
        <VoiceErrorFallback 
          error={new Error('Voice system error')} 
          resetError={onReset || (() => window.location.reload())} 
        />
      }
    >
      {children}
    </DragonBallErrorBoundary>
  )
}

// Specialized error boundaries for different voice components
export const SpeechRecognitionErrorBoundary: React.FC<{ 
  children: React.ReactNode
  onRecovery?: () => void
}> = ({ children, onRecovery }) => {
  const handleSpeechError = (error: Error) => {
    errorRecoveryUtils.monitor.recordError(error, 'SpeechRecognition', false)
    
    // Try to recover speech recognition
    if (onRecovery) {
      setTimeout(() => {
        onRecovery()
        errorRecoveryUtils.monitor.recordError(error, 'SpeechRecognition', true)
      }, 2000)
    }
  }
  
  return (
    <DragonBallErrorBoundary
      name="Speech Recognition"
      level="component"
      onError={handleSpeechError}
      fallback={
        <div className="p-4 bg-gray-900/50 rounded border border-blue-800/50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎤❌</span>
            <div>
              <h4 className="font-semibold text-blue-300">Speech Recognition Error</h4>
              <p className="text-sm text-gray-400">Unable to process voice input</p>
              {onRecovery && (
                <button
                  onClick={onRecovery}
                  className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                >
                  Try to recover
                </button>
              )}
            </div>
          </div>
        </div>
      }
    >
      {children}
    </DragonBallErrorBoundary>
  )
}

export const TTSErrorBoundary: React.FC<{ 
  children: React.ReactNode
  onRecovery?: () => void
}> = ({ children, onRecovery }) => {
  const handleTTSError = (error: Error) => {
    errorRecoveryUtils.monitor.recordError(error, 'TextToSpeech', false)
    
    // Try to recover TTS
    if (onRecovery) {
      setTimeout(() => {
        onRecovery()
        errorRecoveryUtils.monitor.recordError(error, 'TextToSpeech', true)
      }, 3000)
    }
  }
  
  return (
    <DragonBallErrorBoundary
      name="Text-to-Speech"
      level="component"
      onError={handleTTSError}
      fallback={
        <div className="p-4 bg-gray-900/50 rounded border border-orange-800/50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔊❌</span>
            <div>
              <h4 className="font-semibold text-orange-300">Text-to-Speech Error</h4>
              <p className="text-sm text-gray-400">Dragon voice synthesis failed</p>
              {onRecovery && (
                <button
                  onClick={onRecovery}
                  className="mt-2 text-xs text-orange-400 hover:text-orange-300"
                >
                  Try to recover
                </button>
              )}
            </div>
          </div>
        </div>
      }
    >
      {children}
    </DragonBallErrorBoundary>
  )
}