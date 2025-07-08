import React from 'react'
import { DragonBallErrorBoundary } from './DragonBallErrorBoundary'
import { DragonRenderer } from '@components/dragon/DragonRenderer'
import { Button } from '@components/ui/forms/Button'

interface VoiceErrorBoundaryProps {
  children: React.ReactNode
  onReset?: () => void
}

const VoiceErrorFallback = ({ 
  error, 
  resetError 
}: { 
  error: Error
  resetError: () => void 
}) => {
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
        Voice System Malfunction!
      </h3>
      
      <p className="text-gray-400 text-center mb-4 max-w-md">
        The Dragon's voice has been silenced! {error.message || 'An unknown voice error occurred.'}
      </p>
      
      <div className="space-y-3 w-full max-w-xs">
        <div className="text-sm text-gray-500 space-y-1">
          <div className="flex items-center gap-2">
            <span>🎤</span>
            <span>Check microphone permissions</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🔊</span>
            <span>Verify audio output settings</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🌐</span>
            <span>Ensure stable connection</span>
          </div>
        </div>
        
        <Button
          onClick={resetError}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white"
        >
          <span className="mr-2">🐉</span>
          Restore Dragon Voice
        </Button>
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
export const SpeechRecognitionErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <DragonBallErrorBoundary
    name="Speech Recognition"
    level="component"
    fallback={
      <div className="p-4 bg-gray-900/50 rounded border border-blue-800/50">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎤❌</span>
          <div>
            <h4 className="font-semibold text-blue-300">Speech Recognition Error</h4>
            <p className="text-sm text-gray-400">Unable to process voice input</p>
          </div>
        </div>
      </div>
    }
  >
    {children}
  </DragonBallErrorBoundary>
)

export const TTSErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <DragonBallErrorBoundary
    name="Text-to-Speech"
    level="component"
    fallback={
      <div className="p-4 bg-gray-900/50 rounded border border-orange-800/50">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔊❌</span>
          <div>
            <h4 className="font-semibold text-orange-300">Text-to-Speech Error</h4>
            <p className="text-sm text-gray-400">Dragon voice synthesis failed</p>
          </div>
        </div>
      </div>
    }
  >
    {children}
  </DragonBallErrorBoundary>
)