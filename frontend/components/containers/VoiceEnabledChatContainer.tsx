'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useChatStream } from '../chat/useChatStream'
import { useVoiceInterfaceAudio } from '@components/voice'
import { ElevenLabsConfig } from '@hooks/voice/useElevenLabsTTS'
import { logger } from '@lib/logger'
import { sanitizeVoiceTranscript, sanitizeChatMessage } from '@lib/sanitize'
import { pipe } from 'fp-ts/function'
import * as O from 'fp-ts/Option'
import * as A from 'fp-ts/Array'
import { VoiceEnabledChatPresentation } from '../chat/VoiceEnabledChatPresentation'

// Generate unique session ID
const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

/**
 * Container component that manages chat state, voice logic, and data flow
 */
export const VoiceEnabledChatContainer = React.memo(function VoiceEnabledChatContainer() {
  const [input, setInput] = useState('')
  const [sessionId] = useState(generateSessionId())
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [lastProcessedTranscript, setLastProcessedTranscript] = useState('')
  
  // ElevenLabs configuration - now using backend proxy - memoized
  const elevenLabsConfig: ElevenLabsConfig = useMemo(() => ({
    apiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '',
    voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || '',
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
      // Messages are handled by presentation component
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
      O.filter((lastMessage) => 
        lastMessage.type === 'agent' && 
        !lastMessage.metadata?.error && 
        lastMessage.status === 'delivered' &&
        !isPlaying
      ),
      O.map((lastMessage) => {
        // Play the AI response
        playResponse(lastMessage.content).catch(error => {
          logger.error('Failed to play audio response:', error)
        })
      })
    )
  }, [messages, isVoiceEnabled, isPlaying, playResponse])
  
  // Transform typing indicators for presentation
  const transformedTypingIndicators = typingIndicators.map(indicator => ({
    agentId: indicator.agentId,
    agentType: indicator.agentType as string,
    timestamp: new Date(indicator.timestamp)
  }))
  
  return (
    <VoiceEnabledChatPresentation
      // State
      input={input}
      isVoiceEnabled={isVoiceEnabled}
      voiceTranscript={voiceTranscript}
      
      // Data
      messages={messages}
      typingIndicators={transformedTypingIndicators}
      connectionStatus={connectionStatus}
      isLoading={isLoading}
      elevenLabsConfig={elevenLabsConfig}
      
      // Handlers
      onInputChange={setInput}
      onSend={handleSend}
      onToggleVoice={() => setIsVoiceEnabled(!isVoiceEnabled)}
      onTranscriptChange={handleTranscriptChange}
      onVoiceError={handleVoiceError}
      onRetryMessage={retryFailedMessage}
    />
  )
})