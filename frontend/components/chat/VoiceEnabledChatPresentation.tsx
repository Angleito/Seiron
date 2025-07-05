'use client'

import React from 'react'
import { StreamMessage } from './ChatStreamService'
import { ElevenLabsConfig } from '@hooks/voice/useElevenLabsTTS'
import { ChatStatusBar } from './parts/ChatStatusBar'
import { MessagesArea } from './sections/MessagesArea'
import { VoiceSection } from './sections/VoiceSection'
import { ChatInput } from './parts/ChatInput'

interface ConnectionStatus {
  isConnected: boolean
  lastConnected?: Date
  reconnectAttempts?: number
}

interface TypingIndicatorData {
  agentId: string
  agentType: string
  timestamp: Date
}

interface VoiceEnabledChatPresentationProps {
  // State
  input: string
  isVoiceEnabled: boolean
  voiceTranscript: string
  
  // Data
  messages: StreamMessage[]
  typingIndicators: TypingIndicatorData[]
  connectionStatus?: ConnectionStatus
  isLoading: boolean
  elevenLabsConfig: ElevenLabsConfig
  
  // Handlers
  onInputChange: (value: string) => void
  onSend: () => void
  onToggleVoice: () => void
  onTranscriptChange: (transcript: string) => void
  onVoiceError: (error: Error) => void
  onRetryMessage: (messageId: string) => void
}

/**
 * Pure presentation component for Voice Enabled Chat
 * Focuses solely on rendering and UI composition
 */
export const VoiceEnabledChatPresentation = React.memo(function VoiceEnabledChatPresentation({
  // State
  input,
  isVoiceEnabled,
  voiceTranscript,
  
  // Data
  messages,
  typingIndicators,
  connectionStatus,
  isLoading,
  elevenLabsConfig,
  
  // Handlers
  onInputChange,
  onSend,
  onToggleVoice,
  onTranscriptChange,
  onVoiceError,
  onRetryMessage
}: VoiceEnabledChatPresentationProps) {
  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-950 to-black">
      {/* Status Bar */}
      <ChatStatusBar
        connectionStatus={connectionStatus}
        isVoiceEnabled={isVoiceEnabled}
        onToggleVoice={onToggleVoice}
      />
      
      {/* Messages Area */}
      <MessagesArea
        messages={messages}
        typingIndicators={typingIndicators}
        voiceTranscript={voiceTranscript}
        onRetryMessage={onRetryMessage}
      />
      
      {/* Voice Interface */}
      <VoiceSection
        isVoiceEnabled={isVoiceEnabled}
        elevenLabsConfig={elevenLabsConfig}
        onTranscriptChange={onTranscriptChange}
        onError={onVoiceError}
        onToggleVoice={() => {}} // Reset handled by container
      />
      
      {/* Input Area */}
      <ChatInput
        input={input}
        onInputChange={onInputChange}
        onSend={onSend}
        isLoading={isLoading}
        disabled={isVoiceEnabled && voiceTranscript.length > 0}
        placeholder="Type your message..."
      />
    </div>
  )
})