'use client'

import React, { useRef, useEffect } from 'react'
import { StreamMessage } from '../ChatStreamService'
import { ChatMessage } from '../parts/ChatMessage'
import { TypingIndicator } from '../parts/TypingIndicator'
import { VoiceTranscriptPreview } from '../parts/VoiceTranscriptPreview'

interface TypingIndicatorData {
  agentId: string
  agentType: string
  timestamp: Date
}

interface MessagesAreaProps {
  messages: StreamMessage[]
  typingIndicators: TypingIndicatorData[]
  voiceTranscript: string
  onRetryMessage: (messageId: string) => void
}

export const MessagesArea = React.memo(function MessagesArea({
  messages,
  typingIndicators,
  voiceTranscript,
  onRetryMessage
}: MessagesAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingIndicators, voiceTranscript])

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          message={message}
          onRetry={onRetryMessage}
        />
      ))}
      
      {/* Typing Indicators */}
      <TypingIndicator indicators={typingIndicators} />
      
      {/* Voice transcript preview */}
      <VoiceTranscriptPreview transcript={voiceTranscript} />
      
      <div ref={messagesEndRef} />
    </div>
  )
})