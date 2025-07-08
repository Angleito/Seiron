'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useChatStream } from '../chat/useChatStream'
import { useChatSessions } from '../../hooks/useChatSessions'
import { useChatHistory } from '../../hooks/useChatHistory'
import { useVoiceInterfaceAudio } from '@components/voice'
import { SecureElevenLabsConfig as ElevenLabsConfig } from '@hooks/voice/useSecureElevenLabsTTS'
import { logger } from '@lib/logger'
import { sanitizeVoiceTranscript, sanitizeChatMessage } from '@lib/sanitize'
import { pipe } from 'fp-ts/function'
import * as O from 'fp-ts/Option'
import * as A from 'fp-ts/Array'
import * as E from 'fp-ts/Either'
import { ChatSession, ChatPersistenceError, ChatMessage as PersistenceMessage } from '../../services/chat-persistence.service'
import { EnhancedVoiceEnabledChatPresentation } from '../chat/EnhancedVoiceEnabledChatPresentation'
import { ChatMessage, UnifiedChatMessage, getMessageTimestamp } from '../../types/components/chat'
import { StreamMessage } from '../../types/chat-stream'
import { useAIMemory } from '@hooks/chat/useAIMemory'
import { ChatPreferences, ChatPreferencesData } from '../chat/ChatPreferences'

interface EnhancedVoiceEnabledChatContainerProps {
  userId?: string
  initialSessionId?: string
  enablePersistence?: boolean
  enableSessionManagement?: boolean
  autoLoadHistory?: boolean
  enableAIMemory?: boolean
  enablePreferences?: boolean
  initialPreferences?: Partial<ChatPreferencesData>
  className?: string
}

// Generate unique session ID
const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Convert StreamMessage to UnifiedChatMessage
function streamMessageToUnified(msg: StreamMessage): UnifiedChatMessage {
  return {
    ...msg,
    role: msg.type === 'agent' ? 'assistant' : msg.type as 'user' | 'system',
    type: msg.type,
    timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)
  }
}

// Convert PersistenceMessage to UnifiedChatMessage
function persistenceMessageToUnified(msg: PersistenceMessage): UnifiedChatMessage {
  const type = msg.role === 'assistant' ? 'agent' : msg.role as 'user' | 'system'
  return {
    ...msg,
    type,
    role: msg.role,
    timestamp: new Date(msg.created_at),
    created_at: msg.created_at
  }
}

/**
 * Enhanced container component that manages chat state, voice logic, persistence, and data flow
 */
export const EnhancedVoiceEnabledChatContainer = React.memo(function EnhancedVoiceEnabledChatContainer({
  userId = 'anonymous',
  initialSessionId,
  enablePersistence = true,
  enableSessionManagement = true,
  autoLoadHistory = true,
  enableAIMemory = true,
  enablePreferences = true,
  initialPreferences,
  className = ''
}: EnhancedVoiceEnabledChatContainerProps) {
  // Basic chat state
  const [input, setInput] = useState('')
  const [currentSessionId, setCurrentSessionId] = useState(initialSessionId || generateSessionId())
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [lastProcessedTranscript, setLastProcessedTranscript] = useState('')
  
  // UI state
  const [showSessionManager, setShowSessionManager] = useState(enableSessionManagement)
  const [showMessageHistory, setShowMessageHistory] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [persistenceErrors, setPersistenceErrors] = useState<ChatPersistenceError[]>([])
  const [userPreferences, setUserPreferences] = useState<ChatPreferencesData | undefined>(initialPreferences as ChatPreferencesData | undefined)
  
  // ElevenLabs configuration - memoized
  const elevenLabsConfig: ElevenLabsConfig = useMemo(() => ({
    voiceId: import.meta.env.VITE_ELEVENLABS_VOICE_ID || '',
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
  
  // Session management hook
  const {
    sessions,
    stats,
    isLoading: isLoadingSessions,
    isCreating: isCreatingSession,
    error: sessionError,
    createSession,
    updateSession,
    deleteSession,
    archiveSession,
    searchSessions,
    clearError: clearSessionError,
    activeSessions
  } = useChatSessions({
    userId,
    autoLoad: enablePersistence && enableSessionManagement
  })

  // Message history hook
  const {
    messages: historicalMessages,
    sessionInfo,
    pagination,
    isLoading: isLoadingHistory,
    loadMessages,
    loadMoreMessages,
    clearError: clearHistoryError,
    error: historyError
  } = useChatHistory({
    sessionId: currentSessionId,
    userId,
    autoLoad: enablePersistence && autoLoadHistory,
    onMessagesLoaded: (messages) => {
      logger.debug('Historical messages loaded', { 
        sessionId: currentSessionId, 
        messageCount: messages.length 
      })
    }
  })

  // Real-time chat stream
  const {
    messages: streamMessages,
    typingIndicators,
    connectionStatus,
    isLoading: isStreamLoading,
    sendMessage,
    sendVoiceMessage,
    retryFailedMessage,
    clearMessages
  } = useChatStream({
    sessionId: currentSessionId,
    onMessage: (message) => {
      logger.debug('New stream message received', { messageId: message.id })
    },
    onConnectionChange: (status) => {
      logger.debug('Connection status:', status)
    }
  })

  // AI Memory hook for persistent user context
  const {
    memories,
    isLoading: isLoadingMemory,
    saveMemory,
    updateMemory,
    getMemory,
    searchMemories,
    getMemoriesByCategory,
    hasMemory
  } = useAIMemory({
    userId,
    sessionId: currentSessionId,
    autoSync: enableAIMemory,
    onSyncError: (error) => {
      handlePersistenceError({
        type: 'unknown',
        message: `AI Memory sync error: ${error.message}`,
        details: { originalError: error.message }
      })
    }
  })

  // Load user preferences from memory on mount
  useEffect(() => {
    if (enableAIMemory && enablePreferences && !userPreferences) {
      const prefMemory = getMemory('chat_preferences')
      if (O.isSome(prefMemory)) {
        setUserPreferences(prefMemory.value.value as ChatPreferencesData)
      }
    }
  }, [enableAIMemory, enablePreferences, getMemory, userPreferences])

  // Combine historical and stream messages
  const allMessages = useMemo(() => {
    if (!enablePersistence) {
      return streamMessages.map(streamMessageToUnified)
    }
    
    // Convert messages to unified format
    const unifiedStreamMessages = streamMessages.map(streamMessageToUnified)
    const unifiedHistoricalMessages = historicalMessages.map(persistenceMessageToUnified)
    
    // Merge messages, avoiding duplicates
    const streamMessageIds = new Set(unifiedStreamMessages.map(m => m.id))
    const uniqueHistoricalMessages = unifiedHistoricalMessages.filter(m => !streamMessageIds.has(m.id))
    
    return [...uniqueHistoricalMessages, ...unifiedStreamMessages].sort((a, b) => 
      getMessageTimestamp(a).getTime() - getMessageTimestamp(b).getTime()
    )
  }, [historicalMessages, streamMessages, enablePersistence])

  // Combined loading state
  const isLoading = useMemo(() => 
    isStreamLoading || (enablePersistence && (isLoadingSessions || isLoadingHistory)),
    [isStreamLoading, isLoadingSessions, isLoadingHistory, enablePersistence]
  )

  // Handle session selection
  const handleSessionSelect = useCallback(async (sessionId: string) => {
    if (sessionId === currentSessionId) return
    
    logger.info('Switching to session', { sessionId, previousSession: currentSessionId })
    
    setCurrentSessionId(sessionId)
    clearMessages() // Clear current stream messages
    
    if (enablePersistence) {
      // Load historical messages for the new session
      await loadMessages()
    }
  }, [currentSessionId, clearMessages, loadMessages, enablePersistence])

  // Handle session creation
  const handleSessionCreate = useCallback(async (title: string, description?: string) => {
    if (!enablePersistence) {
      // For non-persistent mode, just generate a new session ID
      const newSessionId = generateSessionId()
      setCurrentSessionId(newSessionId)
      clearMessages()
      return
    }

    const session = await createSession(title, description, {
      theme: 'dragon-ball-z',
      voiceEnabled: isVoiceEnabled,
      createdFrom: 'chat-interface'
    })

    if (session) {
      logger.info('New session created and selected', { sessionId: session.id })
      setCurrentSessionId(session.id)
      clearMessages()
    }
  }, [createSession, clearMessages, isVoiceEnabled, enablePersistence])

  // Build AI context from memory and preferences
  const buildAIContext = useCallback(() => {
    const context: Record<string, any> = {}
    
    if (enableAIMemory) {
      // Add user preferences
      if (userPreferences) {
        context.preferences = userPreferences
      }
      
      // Add relevant memories
      const contextMemories = getMemoriesByCategory('context')
      const factMemories = getMemoriesByCategory('fact')
      
      if (contextMemories.length > 0) {
        context.contextHistory = contextMemories.map(m => ({
          key: m.key,
          value: m.value,
          confidence: m.confidence
        }))
      }
      
      if (factMemories.length > 0) {
        context.knownFacts = factMemories.map(m => ({
          key: m.key,
          value: m.value,
          confidence: m.confidence
        }))
      }
    }
    
    return context
  }, [enableAIMemory, userPreferences, getMemoriesByCategory])

  // Handle voice transcript updates with sentence completion detection
  const handleTranscriptChange = useCallback((transcript: string) => {
    const sanitizedTranscript = sanitizeVoiceTranscript(transcript)
    setVoiceTranscript(sanitizedTranscript)
    
    // Check if the transcript is different from last processed and ends with sentence terminator
    if (sanitizedTranscript !== lastProcessedTranscript && 
        sanitizedTranscript.trim() && 
        sanitizedTranscript.match(/[.!?]$/)) {
      setLastProcessedTranscript(sanitizedTranscript)
      const aiContext = buildAIContext()
      
      sendVoiceMessage(sanitizedTranscript.trim(), {
        voiceEnabled: true,
        timestamp: Date.now(),
        sessionId: currentSessionId,
        ...(Object.keys(aiContext).length > 0 && { aiContext })
      })
      setVoiceTranscript('')
    }
  }, [lastProcessedTranscript, sendVoiceMessage, currentSessionId, buildAIContext])
  
  // Handle text input send
  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading) return
    
    const sanitizedInput = sanitizeChatMessage(input.trim())
    const aiContext = buildAIContext()
    
    sendMessage(sanitizedInput, {
      sessionId: currentSessionId,
      timestamp: Date.now(),
      ...(Object.keys(aiContext).length > 0 && { aiContext })
    })
    setInput('')
  }, [input, isLoading, sendMessage, currentSessionId, buildAIContext])
  
  // Handle voice errors
  const handleVoiceError = useCallback((error: Error) => {
    logger.error('Voice interface error:', error)
    const persistenceError: ChatPersistenceError = {
      type: 'unknown',
      message: `Voice error: ${error.message}`,
      details: { originalError: error.message }
    }
    setPersistenceErrors(prev => [...prev, persistenceError])
  }, [])

  // Handle persistence errors
  const handlePersistenceError = useCallback((error: ChatPersistenceError) => {
    logger.error('Persistence error:', error)
    setPersistenceErrors(prev => [...prev, error])
  }, [])

  // Clear persistence error
  const clearPersistenceError = useCallback((index: number) => {
    setPersistenceErrors(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Handle preferences save
  const handlePreferencesSave = useCallback((preferences: ChatPreferencesData) => {
    setUserPreferences(preferences)
    // Preferences are already saved to memory by the ChatPreferences component
    logger.info('User preferences updated', { preferences })
  }, [])

  // Auto-play AI responses when voice is enabled and save to memory if enabled
  useEffect(() => {
    if (allMessages.length === 0) return
    
    pipe(
      A.last(allMessages),
      O.filter((lastMessage) => 
        (lastMessage.type === 'agent' || lastMessage.role === 'assistant') && 
        !lastMessage.metadata?.error && 
        (lastMessage.status === 'delivered' || !lastMessage.status)
      ),
      O.map((lastMessage) => {
        // Auto-play voice if enabled
        if (isVoiceEnabled && !isPlaying) {
          playResponse(lastMessage.content).catch(error => {
            logger.error('Failed to play audio response:', error)
          })
        }
        
        // Auto-learn from AI responses if enabled
        if (enableAIMemory && userPreferences?.autoLearn && lastMessage.metadata?.reasoning) {
          // Save AI reasoning as context
          saveMemory(
            `ai_reasoning_${Date.now()}`,
            {
              content: lastMessage.content,
              reasoning: lastMessage.metadata.reasoning,
              confidence: lastMessage.metadata.confidence || 0.8
            },
            'context',
            lastMessage.metadata.confidence || 0.8
          ).then(result => {
            if (E.isLeft(result)) {
              logger.error('Failed to save AI reasoning to memory:', result.left)
            }
          })
        }
      })
    )
  }, [allMessages, isVoiceEnabled, isPlaying, playResponse, enableAIMemory, userPreferences, saveMemory])

  // Handle errors from hooks
  useEffect(() => {
    if (sessionError) {
      handlePersistenceError(sessionError)
    }
  }, [sessionError, handlePersistenceError])

  useEffect(() => {
    if (historyError) {
      handlePersistenceError(historyError)
    }
  }, [historyError, handlePersistenceError])

  // Transform typing indicators for presentation
  const transformedTypingIndicators = typingIndicators.map(indicator => ({
    agentId: indicator.agentId,
    agentType: indicator.agentType as string,
    timestamp: new Date(indicator.timestamp)
  }))

  // Get current session info
  const currentSession = useMemo(() => {
    const foundSession = sessions.find(s => s.id === currentSessionId)
    if (foundSession) {
      return foundSession
    }
    // If we have sessionInfo but it doesn't have all fields, provide defaults
    if (sessionInfo) {
      return {
        ...sessionInfo,
        is_archived: false,
        message_count: allMessages.length
      }
    }
    return null
  }, [sessions, currentSessionId, sessionInfo, allMessages.length])

  return (
    <EnhancedVoiceEnabledChatPresentation
      // Basic chat props
      input={input}
      isVoiceEnabled={isVoiceEnabled}
      voiceTranscript={voiceTranscript}
      messages={allMessages}
      typingIndicators={transformedTypingIndicators}
      connectionStatus={connectionStatus}
      isLoading={isLoading}
      elevenLabsConfig={elevenLabsConfig}
      
      // Persistence props
      enablePersistence={enablePersistence}
      enableSessionManagement={enableSessionManagement}
      userId={userId}
      currentSession={currentSession}
      currentSessionId={currentSessionId}
      
      // Session management
      sessions={sessions}
      sessionStats={stats}
      isLoadingSessions={isLoadingSessions}
      isCreatingSession={isCreatingSession}
      showSessionManager={showSessionManager}
      
      // Message history
      historicalMessages={historicalMessages}
      messagesPagination={pagination}
      isLoadingHistory={isLoadingHistory}
      showMessageHistory={showMessageHistory}
      
      // Error handling
      persistenceErrors={persistenceErrors}
      
      // AI integration props
      enableAIMemory={enableAIMemory}
      enablePreferences={enablePreferences}
      userPreferences={userPreferences}
      showPreferences={showPreferences}
      aiMemories={memories}
      isLoadingMemory={isLoadingMemory}
      
      // Event handlers
      onInputChange={setInput}
      onSend={handleSend}
      onToggleVoice={() => setIsVoiceEnabled(!isVoiceEnabled)}
      onTranscriptChange={handleTranscriptChange}
      onVoiceError={handleVoiceError}
      onRetryMessage={retryFailedMessage}
      
      // Session management handlers
      onSessionSelect={handleSessionSelect}
      onSessionCreate={handleSessionCreate}
      onSessionUpdate={updateSession}
      onSessionDelete={deleteSession}
      onSessionArchive={archiveSession}
      onSessionSearch={searchSessions}
      onToggleSessionManager={() => setShowSessionManager(!showSessionManager)}
      
      // Message history handlers
      onLoadMoreMessages={loadMoreMessages}
      onToggleMessageHistory={() => setShowMessageHistory(!showMessageHistory)}
      
      // Error handlers
      onClearPersistenceError={clearPersistenceError}
      onClearSessionError={clearSessionError}
      onClearHistoryError={clearHistoryError}
      
      // AI/Preferences handlers
      onTogglePreferences={() => setShowPreferences(!showPreferences)}
      onPreferencesSave={handlePreferencesSave}
      
      className={className}
    />
  )
})