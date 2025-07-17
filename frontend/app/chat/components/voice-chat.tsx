/**
 * Voice Chat Component for Sei Investment Platform
 * 
 * This is the main client component for the voice-enabled chat interface.
 * It integrates all voice functionality with the chat system and provides
 * a complete Dragon Ball Z themed experience.
 * 
 * Features:
 * - Voice input/output with ElevenLabs integration
 * - Real-time streaming chat responses
 * - Memory persistence with conversation history
 * - Error recovery and graceful degradation
 * - Accessibility support with ARIA labels
 * - Responsive design for mobile and desktop
 * 
 * @fileoverview Main voice chat client component
 */

'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { VoiceButton } from './VoiceButton'
import { useVoiceChat } from '@/hooks/chat/useVoiceChat'
import { ChatMessage } from '@/components/chat/parts/ChatMessage'
import { TypingIndicator } from '@/components/chat/parts/TypingIndicator'
import { ChatErrorRecovery } from '@/components/chat/parts/ChatErrorRecovery'
import { ChatStatusBar } from '@/components/chat/parts/ChatStatusBar'
import { DragonRenderer } from '@/components/dragon/DragonRenderer'
import { StormBackground } from '@/components/effects/StormBackground'
import { cn } from '@/lib/utils'

/**
 * Props interface for the voice chat component
 */
interface VoiceChatProps {
  readonly className?: string
  readonly enableDragon?: boolean
  readonly enableStormEffect?: boolean
  readonly maxMessages?: number
}

/**
 * Message interface for chat display
 */
interface ChatMessageData {
  readonly id: string
  readonly role: 'user' | 'assistant'
  readonly content: string
  readonly timestamp: Date
  readonly isVoice?: boolean
  readonly isStreaming?: boolean
  readonly error?: string
}

/**
 * Voice Chat Component
 * 
 * Main interface for voice-enabled investment advisory chat with Dragon Ball Z theming.
 * Integrates voice input/output, streaming responses, and visual effects.
 * 
 * @param className - Additional CSS classes
 * @param enableDragon - Whether to show 3D dragon (default: true)
 * @param enableStormEffect - Whether to show background storm (default: true)
 * @param maxMessages - Maximum number of messages to display (default: 50)
 */
export const VoiceChat: React.FC<VoiceChatProps> = React.memo(({
  className,
  enableDragon = true,
  enableStormEffect = true,
  maxMessages = 50
}) => {
  // Voice chat hook with all functionality
  const {
    // Voice states
    isListening,
    isSpeaking,
    isProcessing,
    speakerEnabled,
    voiceEnabled,
    powerLevel,
    
    // Chat states
    messages,
    isStreaming,
    error,
    
    // Actions
    startListening,
    stopListening,
    toggleSpeaker,
    sendMessage,
    clearError,
    resetSession,
    
    // Connection status
    isConnected,
    connectionStatus
  } = useVoiceChat()

  const [voiceMode, setVoiceMode] = React.useState<'toggle' | 'push'>('toggle')
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  // Auto-scroll to latest message
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle voice listening state changes
  const handleListeningChange = React.useCallback((listening: boolean) => {
    if (listening) {
      startListening()
    } else {
      stopListening()
    }
  }, [startListening, stopListening])

  // Handle manual text message sending (fallback)
  const handleSendTextMessage = React.useCallback((text: string) => {
    if (text.trim()) {
      sendMessage(text)
    }
  }, [sendMessage])

  // Limit displayed messages for performance
  const displayMessages = React.useMemo(() => {
    return messages.slice(-maxMessages)
  }, [messages, maxMessages])

  // Dragon animation state based on voice activity
  const dragonAnimationState = React.useMemo(() => {
    if (isSpeaking) return 'speaking'
    if (isProcessing) return 'thinking'
    if (isListening) return 'listening'
    return 'idle'
  }, [isListening, isSpeaking, isProcessing])

  if (error && !isConnected) {
    return (
      <ChatErrorRecovery
        error={error}
        onRetry={clearError}
        onReset={resetSession}
        className="h-full"
      />
    )
  }

  return (
    <div className={cn('h-full w-full flex flex-col relative overflow-hidden', className)}>
      {/* Background Effects */}
      {enableStormEffect && (
        <StormBackground
          intensity={isListening ? 0.8 : isSpeaking ? 0.6 : 0.3}
          className="absolute inset-0"
        />
      )}

      {/* Status Bar */}
      <ChatStatusBar
        isConnected={isConnected}
        connectionStatus={connectionStatus}
        voiceEnabled={voiceEnabled}
        messageCount={messages.length}
        className="flex-shrink-0"
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex">
        {/* Dragon Display Area */}
        {enableDragon && (
          <div className="hidden lg:flex lg:w-1/3 xl:w-1/4 relative">
            <DragonRenderer
              animationState={dragonAnimationState}
              powerLevel={powerLevel}
              className="w-full h-full"
            />
          </div>
        )}

        {/* Chat Messages Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            <AnimatePresence initial={false}>
              {displayMessages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChatMessage
                    role={message.role}
                    content={message.content}
                    timestamp={message.timestamp}
                    isVoice={message.isVoice}
                    isStreaming={message.isStreaming}
                    error={message.error}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing/Processing Indicator */}
            <AnimatePresence>
              {(isProcessing || isStreaming) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <TypingIndicator
                    isVoiceInput={isListening}
                    isProcessing={isProcessing}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>

          {/* Voice Controls */}
          <div className="flex-shrink-0 p-6 bg-gray-900/50 backdrop-blur-sm border-t border-gray-700/50">
            <div className="flex flex-col items-center space-y-4">
              {/* Voice Button */}
              <VoiceButton
                mode={voiceMode}
                isListening={isListening}
                isSpeaking={isSpeaking}
                isProcessing={isProcessing}
                disabled={!voiceEnabled}
                onListeningChange={handleListeningChange}
                speakerEnabled={speakerEnabled}
                onSpeakerToggle={toggleSpeaker}
                showPowerLevel={true}
                powerLevel={powerLevel}
              />

              {/* Mode Toggle */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setVoiceMode('toggle')}
                  className={cn(
                    'px-3 py-1 text-xs rounded-full transition-colors',
                    voiceMode === 'toggle'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  )}
                >
                  Toggle
                </button>
                <button
                  onClick={() => setVoiceMode('push')}
                  className={cn(
                    'px-3 py-1 text-xs rounded-full transition-colors',
                    voiceMode === 'push'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  )}
                >
                  Push-to-Talk
                </button>
              </div>

              {/* Voice Status */}
              <div className="text-center">
                <div className="text-sm text-gray-400">
                  {isListening && 'Listening for your voice...'}
                  {isProcessing && 'Processing your request...'}
                  {isSpeaking && 'Seiron is speaking...'}
                  {!isListening && !isProcessing && !isSpeaking && (
                    voiceMode === 'push' 
                      ? 'Hold the button to speak' 
                      : 'Click the button to activate voice'
                  )}
                </div>
                
                {/* Power Level Display */}
                {powerLevel > 0 && (
                  <div className="text-xs text-yellow-400 mt-1">
                    Dragon Power: {powerLevel}% ⚡
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-4 left-4 right-4 bg-red-900/90 backdrop-blur-sm border border-red-500/50 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-red-300 font-medium">Voice System Error</div>
                <div className="text-red-400 text-sm">{error}</div>
              </div>
              <button
                onClick={clearError}
                className="text-red-300 hover:text-red-200 transition-colors"
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Accessibility */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {isListening && 'Voice input is active'}
        {isSpeaking && 'AI assistant is speaking'}
        {isProcessing && 'Processing voice input'}
        {error && `Error: ${error}`}
      </div>
    </div>
  )
})

VoiceChat.displayName = 'VoiceChat'

export default VoiceChat