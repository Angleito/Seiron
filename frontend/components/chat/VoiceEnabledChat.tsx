'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Send, Mic, MicOff, Sparkles, AlertCircle } from 'lucide-react'
import { cn } from '@lib/utils'
import { useChatStream } from './useChatStream'
import { StreamMessage } from './ChatStreamService'
import { VoiceInterface, useVoiceInterfaceAudio } from '@components/voice'
import { ElevenLabsConfig } from '@hooks/voice/useElevenLabsTTS'
import { ChatErrorBoundary, VoiceErrorBoundary } from '@components/error-boundaries'
import { logger } from '@lib/logger'
import { sanitizeVoiceTranscript, sanitizeChatMessage, useSanitizedContent, SANITIZE_CONFIGS } from '@lib/sanitize'
import { pipe } from 'fp-ts/function'
import * as O from 'fp-ts/Option'
import * as A from 'fp-ts/Array'

// Generate unique session ID
const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Safe message content renderer - memoized
const SafeMessageContent = React.memo(function SafeMessageContent({ content, type }: { content: string; type: 'user' | 'agent' | 'system' }) {
  const { sanitized, isValid, warnings } = useSanitizedContent(
    content, 
    type === 'user' ? SANITIZE_CONFIGS.CHAT_MESSAGE : SANITIZE_CONFIGS.TEXT_ONLY
  )
  
  // Log warnings in development
  if (process.env.NODE_ENV === 'development' && warnings.length > 0) {
    logger.warn('Message sanitization warnings:', warnings)
  }
  
  // If content is potentially unsafe, show a warning
  if (!isValid) {
    return (
      <div className="text-yellow-400 text-sm">
        ⚠️ Message content filtered for security
      </div>
    )
  }
  
  return <span className="whitespace-pre-wrap">{sanitized}</span>
})

const VoiceEnabledChatContent = React.memo(function VoiceEnabledChatContent() {
  const [input, setInput] = useState('')
  const [sessionId] = useState(generateSessionId())
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [lastProcessedTranscript, setLastProcessedTranscript] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // ElevenLabs configuration - now using backend proxy - memoized
  const elevenLabsConfig: ElevenLabsConfig = useMemo(() => ({
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    modelId: 'eleven_monolingual_v1',
    voiceSettings: {
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0.5,
      useSpeakerBoost: true
    }
  }), [])
  
  // Hook for programmatic audio playback
  const { playResponse, isPlaying } = useVoiceInterfaceAudio(elevenLabsConfig)
  
  // Initialize chat stream
  const {
    messages,
    typingIndicators,
    connectionStatus,
    isLoading,
    sendMessage,
    sendVoiceMessage,
    retryFailedMessage
  } = useChatStream({
    sessionId,
    onMessage: (_message) => {
      // Auto-scroll on new message
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    },
    onConnectionChange: (status) => {
      logger.debug('Connection status:', status)
    }
  })
  
  // Handle voice transcript updates with sentence completion detection
  const handleTranscriptChange = useCallback((transcript: string) => {
    // Sanitize voice transcript to prevent XSS
    const sanitizedTranscript = sanitizeVoiceTranscript(transcript)
    setVoiceTranscript(sanitizedTranscript)
    
    // Check if the transcript is different from last processed and ends with sentence terminator
    if (sanitizedTranscript !== lastProcessedTranscript && sanitizedTranscript.trim() && sanitizedTranscript.match(/[.!?]$/)) {
      setLastProcessedTranscript(sanitizedTranscript)
      sendVoiceMessage(sanitizedTranscript.trim(), {
        voiceEnabled: true,
        timestamp: Date.now()
      })
      setVoiceTranscript('')
    }
  }, [lastProcessedTranscript, sendVoiceMessage])
  
  // Handle text input send - memoized
  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading) return
    
    // Sanitize user input to prevent XSS
    const sanitizedInput = sanitizeChatMessage(input.trim())
    sendMessage(sanitizedInput)
    setInput('')
  }, [input, isLoading, sendMessage])
  
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])
  
  // Handle voice errors
  const handleVoiceError = useCallback((error: Error) => {
    logger.error('Voice interface error:', error)
    // Could add toast notification here
  }, [])
  
  // Auto-play AI responses when voice is enabled
  useEffect(() => {
    if (!isVoiceEnabled || messages.length === 0) return
    
    pipe(
      A.last(messages),
      O.filter((lastMessage: StreamMessage) => 
        lastMessage.type === 'agent' && 
        !lastMessage.metadata?.error && 
        lastMessage.status === 'delivered' &&
        !isPlaying
      ),
      O.map((lastMessage: StreamMessage) => {
        // Play the AI response
        playResponse(lastMessage.content).catch(error => {
          logger.error('Failed to play audio response:', error)
        })
      })
    )
  }, [messages, isVoiceEnabled, isPlaying, playResponse])
  
  // Message status icon - memoized
  const getStatusIcon = useCallback((status?: StreamMessage['status']): string | null => {
    if (!status) return null
    
    switch (status) {
      case 'pending': return '○'
      case 'sending': return '◐'
      case 'sent': return '◑'
      case 'delivered': return '●'
      case 'failed': return '✗'
      default: return null
    }
  }, [])
  
  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-950 to-black">
      {/* Status Bar */}
      <div className="px-4 py-2 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "h-2 w-2 rounded-full",
              pipe(
                O.fromNullable(connectionStatus),
                O.map(status => status.isConnected),
                O.getOrElse(() => false)
              ) ? "bg-green-500" : "bg-red-500"
            )} />
            <span className="text-sm text-red-700">
              {pipe(
                O.fromNullable(connectionStatus),
                O.map(status => status.isConnected),
                O.getOrElse(() => false)
              ) ? 'Connected' : 'Connecting...'}
            </span>
          </div>
          
          <button
            onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
            className={cn(
              "flex items-center gap-2 px-3 py-1 rounded transition-colors",
              isVoiceEnabled 
                ? "bg-red-600 text-white" 
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            )}
          >
            {isVoiceEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            <span className="text-sm">Voice {isVoiceEnabled ? 'On' : 'Off'}</span>
          </button>
        </div>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex',
              message.type === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-[70%] rounded-lg px-4 py-2',
                message.type === 'user'
                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-white'
                  : message.type === 'system'
                  ? 'bg-gray-800 text-gray-300 italic'
                  : message.metadata?.error
                  ? 'bg-red-100 text-red-900'
                  : 'bg-gray-900 text-red-100'
              )}
            >
              {/* Voice indicator for voice messages */}
              {message.metadata?.source === 'voice' && (
                <div className="flex items-center gap-1 mb-1">
                  <Mic className="h-3 w-3" />
                  <span className="text-xs opacity-75">Voice message</span>
                </div>
              )}
              
              <SafeMessageContent content={message.content} type={message.type} />
              
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs opacity-75">
                  {message.timestamp.toLocaleTimeString()}
                </span>
                
                {/* Status indicator */}
                {message.status && message.type === 'user' && (
                  <span className={cn(
                    'text-xs',
                    message.status === 'failed' ? 'text-red-400' : 'opacity-75'
                  )}>
                    {getStatusIcon(message.status)}
                  </span>
                )}
                
                {/* Retry button for failed messages */}
                {message.status === 'failed' && (
                  <button
                    onClick={() => retryFailedMessage(message.id)}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                  >
                    <AlertCircle className="h-3 w-3" />
                    Retry
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* Typing Indicators */}
        {typingIndicators.length > 0 && (
          <div className="space-y-2">
            {typingIndicators.map((indicator) => (
              <div key={indicator.agentId} className="flex justify-start">
                <div className="bg-gray-900 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 animate-spin text-red-400" />
                    <span className="text-sm text-red-300">
                      {indicator.agentType.replace('_', ' ')} is typing...
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Voice transcript preview */}
        {voiceTranscript && (
          <div className="flex justify-end">
            <div className="bg-gray-800 rounded-lg px-4 py-2 max-w-[70%]">
              <div className="flex items-center gap-2 mb-1">
                <Mic className="h-4 w-4 text-red-400 animate-pulse" />
                <span className="text-xs text-red-400">Listening...</span>
              </div>
              <SafeMessageContent content={voiceTranscript} type="user" />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Voice Interface */}
      {isVoiceEnabled && (
        <VoiceErrorBoundary onReset={() => setIsVoiceEnabled(false)}>
          <div className="border-t border-gray-800 bg-gray-900 p-4">
            <VoiceInterface
              elevenLabsConfig={elevenLabsConfig}
              onTranscriptChange={handleTranscriptChange}
              onError={handleVoiceError}
              autoReadResponses={true}
              className="max-w-4xl mx-auto"
            />
          </div>
        </VoiceErrorBoundary>
      )}
      
      {/* Input Area */}
      <div className="border-t border-red-800 p-4 bg-gradient-to-r from-gray-900 to-black">
        <div className="flex space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="w-full resize-none rounded-lg border border-red-700 bg-gray-900 text-red-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-600"
            rows={1}
            disabled={isVoiceEnabled && voiceTranscript.length > 0}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || (isVoiceEnabled && voiceTranscript.length > 0)}
            className="rounded-lg bg-gradient-to-r from-red-600 to-red-700 px-4 py-2 text-white hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
            <Sparkles className="h-3 w-3 animate-spin" />
            Processing...
          </div>
        )}
      </div>
    </div>
  )
})

export const VoiceEnabledChat = React.memo(function VoiceEnabledChat() {
  return (
    <ChatErrorBoundary>
      <VoiceEnabledChatContent />
    </ChatErrorBoundary>
  )
})