import React from 'react'
import { DragonBallErrorBoundary } from './DragonBallErrorBoundary'
import { DragonRenderer } from '@components/dragon/DragonRenderer'
import { DragonBallLoadingStates } from '@components/chat/parts/DragonBallLoadingStates'

interface ChatErrorBoundaryProps {
  children: React.ReactNode
  onReset?: () => void
}

const ChatErrorFallback = ({ 
  error, 
  resetError 
}: { 
  error: Error
  resetError: () => void 
}) => {
  const [isRecovering, setIsRecovering] = React.useState(false)

  const handleReset = async () => {
    setIsRecovering(true)
    await new Promise(resolve => setTimeout(resolve, 2000)) // Simulate recovery
    resetError()
  }

  if (isRecovering) {
    return <DragonBallLoadingStates.ErrorRecovery message="Gathering Senzu Beans..." />
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gray-900/50 rounded-lg border border-orange-800">
      <div className="relative mb-6">
        <DragonRenderer
          size="lg"
          voiceState={{
            isListening: false,
            isSpeaking: false,
            isProcessing: false,
            isIdle: false,
            volume: 0,
            emotion: 'angry'
          }}
        />
        <div className="absolute -top-2 -right-2">
          <span className="text-4xl animate-pulse">💥</span>
        </div>
      </div>
      
      <h3 className="text-2xl font-bold text-orange-300 mb-2">
        The Chat System Has Fallen!
      </h3>
      
      <p className="text-gray-400 text-center mb-6 max-w-md">
        Even the mighty Seiron has encountered a critical error! 
        Your conversation history remains safe in the Hyperbolic Time Chamber.
      </p>

      <div className="w-full max-w-xs space-y-4">
        <div className="bg-black/30 rounded p-3 text-sm text-gray-400">
          <div className="font-semibold text-orange-400 mb-1">Error Details:</div>
          <div className="font-mono text-xs">{error.message || 'Unknown chat system error'}</div>
        </div>
        
        <button
          onClick={handleReset}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-all transform hover:scale-105 font-semibold"
        >
          <span className="text-xl">🐉</span>
          Summon Shenron to Restore Chat
        </button>
        
        <button
          onClick={() => window.location.href = '/'}
          className="w-full text-gray-400 hover:text-gray-300 text-sm"
        >
          Return to Kame House
        </button>
      </div>
    </div>
  )
}

export function ChatErrorBoundary({ children, onReset }: ChatErrorBoundaryProps) {
  return (
    <DragonBallErrorBoundary
      name="Chat System"
      level="feature"
      enableDragonAnimation={true}
      fallback={
        <ChatErrorFallback 
          error={new Error('Chat system error')} 
          resetError={onReset || (() => window.location.reload())} 
        />
      }
    >
      {children}
    </DragonBallErrorBoundary>
  )
}