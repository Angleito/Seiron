'use client'

import React from 'react'
import { EnhancedChat } from '../EnhancedChatWrapper'
import { VoiceEnabledChat } from '../VoiceEnabledChat'
import { VoiceErrorBoundary, SpeechRecognitionErrorBoundary, TTSErrorBoundary } from '@components/error-boundaries'
import { VoiceInterface } from '@components/voice/VoiceInterface'
import { useEnhancedErrorHandler } from '@hooks/useEnhancedErrorHandler'
import { DragonBallLoadingStates } from '../parts/DragonBallLoadingStates'
import { ChatErrorIndicator } from '../parts/ChatErrorRecovery'

/**
 * Example implementation showing comprehensive error handling and loading states
 * for the Seiron chat system with Dragon Ball Z theming
 */
export const ErrorHandlingExample = () => {
  const [isLoading, setIsLoading] = React.useState(false)
  const [aiResponse, setAiResponse] = React.useState<string | null>(null)
  
  const errorHandler = useEnhancedErrorHandler({
    maxRetries: 3,
    exponentialBackoff: true,
    onError: (error) => {
      console.log('Chat error detected:', error)
    },
    onMaxRetriesReached: (error) => {
      console.log('Maximum retries reached:', error)
    }
  })

  // Simulate various operations with error handling
  const simulateAPICall = async () => {
    setIsLoading(true)
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Randomly fail to demonstrate error handling
      if (Math.random() > 0.7) {
        throw new Error('Network request failed')
      }
      
      setAiResponse("I am Seiron, the mighty dragon! How may I assist you today?")
    } catch (error) {
      errorHandler.handleError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-orange-300 text-center mb-8">
          Seiron Chat Error Handling Demo
        </h1>

        {/* Example 1: Full Chat with Enhanced Error Handling */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-200">
            1. Enhanced Chat with Comprehensive Error Handling
          </h2>
          <EnhancedChat
            userId="demo-user"
            sessionId="demo-session"
            showErrorRecovery={true}
            enableAutoRecovery={true}
            onError={(error) => console.error('Chat error:', error)}
          >
            <VoiceEnabledChat />
          </EnhancedChat>
        </section>

        {/* Example 2: Voice Components with Error Boundaries */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-200">
            2. Voice Interface with Specialized Error Boundaries
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-400">Speech Recognition</h3>
              <SpeechRecognitionErrorBoundary>
                <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                  <VoiceInterface />
                </div>
              </SpeechRecognitionErrorBoundary>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-400">Text-to-Speech</h3>
              <TTSErrorBoundary>
                <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                  <button 
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded"
                    onClick={() => {
                      // Simulate TTS
                      const utterance = new SpeechSynthesisUtterance("Dragon voice test")
                      speechSynthesis.speak(utterance)
                    }}
                  >
                    Test Dragon Voice
                  </button>
                </div>
              </TTSErrorBoundary>
            </div>
          </div>
        </section>

        {/* Example 3: Loading States Gallery */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-200">
            3. Dragon Ball Z Themed Loading States
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-400">AI Response Loading</h3>
              <DragonBallLoadingStates.AI 
                message="Seiron is powering up..." 
                showDragon={true}
              />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-400">Voice Processing</h3>
              <DragonBallLoadingStates.Voice operation="processing" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-400">Session Creation</h3>
              <div className="h-64 overflow-hidden">
                <DragonBallLoadingStates.Session />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-400">Reconnecting</h3>
              <DragonBallLoadingStates.Reconnecting attempt={2} maxAttempts={3} />
            </div>
          </div>
        </section>

        {/* Example 4: Error Indicators */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-200">
            4. Error Indicators and Recovery
          </h2>
          <div className="space-y-4">
            {errorHandler.errors.map(error => (
              <ChatErrorIndicator
                key={error.id}
                error={error}
                onRetry={() => errorHandler.retryOperation(simulateAPICall, error.id)}
                onDismiss={() => errorHandler.dismissError(error.id)}
              />
            ))}
            
            {errorHandler.errors.length === 0 && (
              <div className="text-center p-8 text-gray-500">
                <p>No errors detected. System operating at full power!</p>
                <button
                  onClick={simulateAPICall}
                  className="mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded"
                >
                  Trigger Test Error (30% chance)
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Example 5: Loading State Demo */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-200">
            5. Loading State with API Simulation
          </h2>
          <div className="p-6 bg-gray-900/50 rounded-lg border border-gray-700">
            {isLoading ? (
              <DragonBallLoadingStates.AI 
                message="Channeling the eternal dragon's wisdom..."
                showDragon={true}
              />
            ) : aiResponse ? (
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <span className="text-3xl">🐉</span>
                  <div className="flex-1">
                    <p className="text-gray-200">{aiResponse}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setAiResponse(null)
                    simulateAPICall()
                  }}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded"
                >
                  Ask Another Question
                </button>
              </div>
            ) : (
              <button
                onClick={simulateAPICall}
                className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded"
              >
                Summon Seiron
              </button>
            )}
          </div>
        </section>

        {/* Example 6: Special Effects */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-200">
            6. Dragon Ball Z Special Effects
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <DragonBallLoadingStates.KiCharging size="lg" color="orange" />
              <p className="text-xs text-gray-400 mt-2">Ki Charging</p>
            </div>
            <div className="text-center">
              <DragonBallLoadingStates.KiCharging size="lg" color="blue" />
              <p className="text-xs text-gray-400 mt-2">Spirit Energy</p>
            </div>
            <div className="text-center">
              <DragonBallLoadingStates.KiCharging size="lg" color="purple" />
              <p className="text-xs text-gray-400 mt-2">Dark Energy</p>
            </div>
            <div className="text-center">
              <DragonBallLoadingStates.KiCharging size="lg" color="yellow" />
              <p className="text-xs text-gray-400 mt-2">Super Saiyan</p>
            </div>
          </div>
          <div className="flex justify-center">
            <DragonBallLoadingStates.DragonBallCollector />
          </div>
          <div className="max-w-md mx-auto">
            <DragonBallLoadingStates.PowerLevelScanner 
              currentLevel={7500} 
              maxLevel={9000} 
            />
          </div>
        </section>
      </div>
    </div>
  )
}