import React, { useState, useCallback } from 'react'
import { VoiceInterface, useVoiceInterfaceAudio } from './index'
import { ElevenLabsConfig } from '../../hooks/voice/useElevenLabsTTS'

/**
 * Example implementation of the VoiceInterface component
 * Demonstrates integration with a chat interface and AI responses
 */
const VoiceInterfaceExample: React.FC = () => {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([])
  const [isProcessing, setIsProcessing] = useState(false)

  // ElevenLabs configuration - now using backend proxy
  const elevenLabsConfig: ElevenLabsConfig = {
    apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    modelId: 'eleven_monolingual_v1',
    voiceSettings: {
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0.5,
      useSpeakerBoost: true
    }
  }

  // Hook for programmatic audio playback
  const { playResponse } = useVoiceInterfaceAudio(elevenLabsConfig)

  // Handle transcript from voice input
  const handleTranscriptChange = useCallback(async (transcript: string) => {
    if (!transcript.trim() || isProcessing) return

    // Check if the transcript ends with a sentence terminator
    if (transcript.match(/[.!?]$/)) {
      setIsProcessing(true)
      
      // Add user message
      setMessages(prev => [...prev, { role: 'user', content: transcript }])

      try {
        // Simulate AI response (replace with actual API call)
        const response = await simulateAIResponse(transcript)
        
        // Add assistant message
        setMessages(prev => [...prev, { role: 'assistant', content: response }])
        
        // Play the response audio
        await playResponse(response)
      } catch (error) {
        console.error('Error processing voice input:', error)
      } finally {
        setIsProcessing(false)
      }
    }
  }, [isProcessing, playResponse])

  // Handle errors
  const handleError = useCallback((error: Error) => {
    console.error('Voice interface error:', error)
    // You could show a toast notification here
  }, [])

  // Simulate AI response (replace with actual implementation)
  const simulateAIResponse = async (input: string): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const responses = [
      "I understand you're asking about the Dragon Ball theme. The power levels are over 9000!",
      "Let me help you with your portfolio management using the power of the dragon.",
      "Your request has been processed. The dragon spirits are pleased.",
      "Excellent question! The Seiron system is designed to optimize your DeFi strategies.",
      "I've analyzed your request. The dragon's wisdom suggests a balanced approach."
    ]
    
    return responses[Math.floor(Math.random() * responses.length)]
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-orange-500/30 p-4">
        <h1 className="text-2xl font-bold text-orange-500 text-center">
          🐉 Seiron Voice Assistant
        </h1>
      </header>

      {/* Chat Messages */}
      <div className="max-w-4xl mx-auto p-4 space-y-4 mb-32">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md p-4 rounded-lg ${
                message.role === 'user'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-800 text-gray-100 border border-orange-500/30'
              }`}
            >
              <p className="text-sm font-semibold mb-1">
                {message.role === 'user' ? '🗣️ You' : '🐉 Seiron'}
              </p>
              <p>{message.content}</p>
            </div>
          </div>
        ))}
        
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-gray-800 p-4 rounded-lg border border-orange-500/30">
              <div className="flex items-center space-x-2">
                <div className="animate-bounce">🐉</div>
                <span className="text-orange-400 animate-pulse">Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Voice Interface */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-orange-500/30 p-4">
        <VoiceInterface
          elevenLabsConfig={elevenLabsConfig}
          onTranscriptChange={handleTranscriptChange}
          onError={handleError}
          autoReadResponses={true}
          className="max-w-4xl mx-auto"
        />
      </div>

      {/* Instructions */}
      {messages.length === 0 && (
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4 p-8 bg-gray-800/50 rounded-lg border border-orange-500/30">
            <h2 className="text-xl font-semibold text-orange-400">
              Welcome to Seiron Voice Assistant
            </h2>
            <p className="text-gray-400 max-w-md">
              Click the microphone button and speak your request. 
              End your sentence with a period, question mark, or exclamation point 
              to send the message.
            </p>
            <div className="flex justify-center space-x-4 text-sm text-gray-500">
              <span>🎤 = Start/Stop Recording</span>
              <span>🔊 = Toggle Auto-Speak</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VoiceInterfaceExample