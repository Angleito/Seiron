'use client'

import React, { useMemo } from 'react'
import { StreamMessage } from './ChatStreamService'
import { UnifiedChatMessage } from '../../types/components/chat'
import { SecureElevenLabsConfig as ElevenLabsConfig } from '@hooks/voice/useSecureElevenLabsTTS'
import { ChatSession, ChatMessage, ChatPersistenceError, PaginationInfo } from '../../services/chat-persistence.service'

// Convert UnifiedChatMessage to StreamMessage
function unifiedToStreamMessage(msg: UnifiedChatMessage): StreamMessage {
  return {
    id: msg.id,
    type: msg.type,
    content: msg.content,
    timestamp: msg.timestamp,
    status: msg.status,
    agentType: msg.agentType,
    metadata: msg.metadata as any // Type cast to handle metadata differences
  }
}
import { ChatStatusBar } from './parts/ChatStatusBar'
import { MessagesArea } from './sections/MessagesArea'
import { VoiceSection } from './sections/VoiceSection'
import { ChatInput } from './parts/ChatInput'
import { SessionManager } from './parts/SessionManager'
import { MessagePagination } from './parts/MessagePagination'
import { ChatLoadingStates } from './parts/ChatLoadingStates'
import { ChatErrorStates } from './parts/ChatErrorStates'
// import { SessionSearchFilter } from './parts/SessionSearchFilter'
import { Button } from '../ui/forms/Button'
import { Card } from '../ui/display/Card'
import { Badge } from '../ui/display/Badge'
import { ChatPreferences } from './ChatPreferences'

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

interface SessionStats {
  total_sessions: number
  active_sessions: number
  archived_sessions: number
  total_messages: number
}

interface EnhancedVoiceEnabledChatPresentationProps {
  // Basic chat props
  input: string
  isVoiceEnabled: boolean
  voiceTranscript: string
  messages: UnifiedChatMessage[]
  typingIndicators: TypingIndicatorData[]
  connectionStatus?: ConnectionStatus
  isLoading: boolean
  elevenLabsConfig: ElevenLabsConfig
  
  // Persistence props
  enablePersistence: boolean
  enableSessionManagement: boolean
  userId: string
  currentSession?: ChatSession | null
  currentSessionId: string
  
  // Session management
  sessions: ChatSession[]
  sessionStats?: SessionStats | null
  isLoadingSessions: boolean
  isCreatingSession: boolean
  showSessionManager: boolean
  
  // Message history
  historicalMessages: ChatMessage[]
  messagesPagination?: PaginationInfo | null
  isLoadingHistory: boolean
  showMessageHistory: boolean
  
  // Error handling
  persistenceErrors: ChatPersistenceError[]
  
  // AI integration props
  enableAIMemory?: boolean
  enablePreferences?: boolean
  userPreferences?: any // ChatPreferencesData
  showPreferences?: boolean
  aiMemories?: any[] // AIMemoryEntry[]
  isLoadingMemory?: boolean
  isMemoryUsingFallback?: boolean
  isMemoryBackendAvailable?: boolean
  memoryError?: Error | null
  
  // Event handlers
  onInputChange: (value: string) => void
  onSend: () => void
  onToggleVoice: () => void
  onTranscriptChange: (transcript: string) => void
  onVoiceError: (error: Error) => void
  onRetryMessage: (messageId: string) => void
  
  // Session management handlers
  onSessionSelect: (sessionId: string) => void
  onSessionCreate: (title: string, description?: string) => void
  onSessionUpdate: (sessionId: string, updates: Partial<ChatSession>) => void
  onSessionDelete: (sessionId: string) => void
  onSessionArchive: (sessionId: string, archived: boolean) => void
  onSessionSearch: (query: string) => void
  onToggleSessionManager: () => void
  
  // Message history handlers
  onLoadMoreMessages: () => void
  onToggleMessageHistory: () => void
  
  // Error handlers
  onClearPersistenceError: (index: number) => void
  onClearSessionError: () => void
  onClearHistoryError: () => void
  
  // AI/Preferences handlers
  onTogglePreferences?: () => void
  onPreferencesSave?: (preferences: any) => void
  
  className?: string
}

/**
 * Enhanced presentation component for Voice Enabled Chat with persistence
 */
export const EnhancedVoiceEnabledChatPresentation = React.memo(function EnhancedVoiceEnabledChatPresentation({
  // Basic chat props
  input,
  isVoiceEnabled,
  voiceTranscript,
  messages,
  typingIndicators,
  connectionStatus,
  isLoading,
  elevenLabsConfig,
  
  // Persistence props
  enablePersistence,
  enableSessionManagement,
  userId,
  currentSession,
  currentSessionId,
  
  // Session management
  // sessions,
  // sessionStats,
  isLoadingSessions,
  isCreatingSession,
  showSessionManager,
  
  // Message history
  // historicalMessages,
  messagesPagination,
  isLoadingHistory,
  showMessageHistory,
  
  // Error handling
  persistenceErrors,
  
  // AI integration props
  enableAIMemory,
  enablePreferences,
  userPreferences,
  showPreferences,
  // aiMemories,
  isLoadingMemory,
  isMemoryUsingFallback,
  isMemoryBackendAvailable,
  memoryError,
  
  // Event handlers
  onInputChange,
  onSend,
  onToggleVoice,
  onTranscriptChange,
  onVoiceError,
  onRetryMessage,
  
  // Session management handlers
  onSessionSelect,
  onSessionCreate,
  // onSessionUpdate,
  // onSessionDelete,
  // onSessionArchive,
  // onSessionSearch,
  onToggleSessionManager,
  
  // Message history handlers
  onLoadMoreMessages,
  onToggleMessageHistory,
  
  // Error handlers
  onClearPersistenceError,
  onClearSessionError,
  onClearHistoryError,
  
  // AI/Preferences handlers
  onTogglePreferences,
  onPreferencesSave,
  
  className = ''
}: EnhancedVoiceEnabledChatPresentationProps) {
  
  // Show initial loading state if everything is loading
  if (enablePersistence && isLoadingSessions && isLoadingHistory && messages.length === 0) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <ChatLoadingStates.ChatInitial />
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full bg-gradient-to-b from-gray-950 to-black ${className}`}>
      {/* Global Error Toasts */}
      {persistenceErrors.map((error, index) => (
        <ChatErrorStates.Toast
          key={index}
          error={error}
          onDismiss={() => onClearPersistenceError(index)}
        />
      ))}

      {/* Enhanced Status Bar */}
      <div className="flex items-center justify-between p-4 border-b border-orange-500/30 bg-gradient-to-r from-orange-900/20 to-red-900/20">
        <div className="flex items-center gap-4">
          <ChatStatusBar
            connectionStatus={connectionStatus}
            isVoiceEnabled={isVoiceEnabled}
            onToggleVoice={onToggleVoice}
          />
          
          {/* Current Session Info */}
          {enablePersistence && currentSession && (
            <div className="flex items-center gap-2">
              <span className="text-orange-300/70 text-sm">📝</span>
              <span className="text-orange-300 text-sm font-medium">{currentSession.title}</span>
              <Badge variant="warning" size="sm">
                {currentSession.message_count} messages
              </Badge>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Session Management Toggle */}
          {enableSessionManagement && (
            <Button
              onClick={onToggleSessionManager}
              variant={showSessionManager ? 'secondary' : 'ghost'}
              size="sm"
              className={showSessionManager ? 'bg-orange-600 text-white' : 'text-orange-300 hover:text-orange-200'}
            >
              🗂️ Sessions
            </Button>
          )}
          
          {/* Message History Toggle */}
          {enablePersistence && messagesPagination && messagesPagination.total > 0 && (
            <Button
              onClick={onToggleMessageHistory}
              variant={showMessageHistory ? 'secondary' : 'ghost'}
              size="sm"
              className={showMessageHistory ? 'bg-orange-600 text-white' : 'text-orange-300 hover:text-orange-200'}
            >
              📚 History ({messagesPagination.total})
            </Button>
          )}
          
          {/* AI Preferences Toggle */}
          {enablePreferences && (
            <Button
              onClick={onTogglePreferences}
              variant={showPreferences ? 'secondary' : 'ghost'}
              size="sm"
              className={showPreferences ? 'bg-orange-600 text-white' : 'text-orange-300 hover:text-orange-200'}
            >
              ⚙️ AI Settings
            </Button>
          )}
          
          {/* AI Memory Indicator */}
          {enableAIMemory && (
            <div className="flex items-center gap-1">
              {isLoadingMemory ? (
                <div className="animate-pulse text-orange-300 text-sm">🧠 Syncing...</div>
              ) : memoryError ? (
                <Badge variant="error" size="sm" title={memoryError.message}>
                  🧠 Memory Error
                </Badge>
              ) : isMemoryUsingFallback ? (
                <Badge variant="warning" size="sm" title="Using local storage fallback">
                  🧠 Memory (Offline)
                </Badge>
              ) : !isMemoryBackendAvailable ? (
                <Badge variant="secondary" size="sm" title="Backend unavailable">
                  🧠 Memory (Local)
                </Badge>
              ) : (
                <Badge variant="success" size="sm">
                  🧠 Memory Active
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* Session Manager Sidebar */}
        {enableSessionManagement && showSessionManager && (
          <div className="w-80 border-r border-orange-500/30 bg-gradient-to-b from-orange-900/10 to-red-900/10 flex flex-col">
            {isLoadingSessions ? (
              <div className="p-4">
                <ChatLoadingStates.Sessions />
              </div>
            ) : (
              <div className="flex-1 overflow-hidden">
                <SessionManager
                  userId={userId}
                  currentSessionId={currentSessionId}
                  onSessionSelect={onSessionSelect}
                  onSessionCreate={(session) => onSessionCreate(session.title, session.description)}
                  className="h-full"
                />
              </div>
            )}
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Message History Panel */}
          {enablePersistence && showMessageHistory && messagesPagination && (
            <div className="border-b border-orange-500/30 bg-gradient-to-r from-orange-900/10 to-red-900/10">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-orange-300 flex items-center gap-2">
                    <span>📚</span>
                    Message History
                  </h3>
                  <Button
                    onClick={onToggleMessageHistory}
                    variant="ghost"
                    size="sm"
                    className="text-orange-300 hover:text-orange-200"
                  >
                    ✕
                  </Button>
                </div>
                
                {isLoadingHistory ? (
                  <ChatLoadingStates.Messages messageCount={3} />
                ) : (
                  <MessagePagination
                    currentPage={messagesPagination.page}
                    totalPages={messagesPagination.totalPages}
                    totalMessages={messagesPagination.total}
                    messagesPerPage={messagesPagination.limit}
                    hasNextPage={messagesPagination.hasNext}
                    hasPreviousPage={messagesPagination.hasPrev}
                    isLoading={isLoadingHistory}
                    isLoadingMore={false}
                    onGoToPage={(_page) => {/* Handle page change */}}
                    onGoToNextPage={() => {/* Handle next page */}}
                    onGoToPreviousPage={() => {/* Handle previous page */}}
                    onLoadMoreMessages={onLoadMoreMessages}
                    showLoadMore={true}
                    showPageNumbers={true}
                    showMessageCount={true}
                    className="max-h-32 overflow-y-auto"
                  />
                )}
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 min-h-0">
            <MessagesArea
              messages={useMemo(() => messages.map(unifiedToStreamMessage), [messages])}
              typingIndicators={typingIndicators}
              voiceTranscript={voiceTranscript}
              onRetryMessage={onRetryMessage}
              sessionId={currentSessionId}
            />
          </div>

          {/* Voice Interface */}
          <VoiceSection
            isVoiceEnabled={isVoiceEnabled}
            elevenLabsConfig={elevenLabsConfig}
            onTranscriptChange={onTranscriptChange}
            onError={onVoiceError}
            onToggleVoice={() => {}} // Reset handled by container
          />

          {/* Input Area */}
          <div className="border-t border-orange-500/30">
            <ChatInput
              input={input}
              onInputChange={onInputChange}
              onSend={onSend}
              isLoading={isLoading}
              disabled={isVoiceEnabled && voiceTranscript.length > 0}
              placeholder={
                enablePersistence && currentSession 
                  ? `Message ${currentSession.title}...` 
                  : "Type your message..."
              }
            />
          </div>
        </div>
      </div>

      {/* Session Creation Modal */}
      {isCreatingSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 bg-gradient-to-r from-orange-900/90 to-red-900/90 border-orange-500/70 max-w-md w-full mx-4">
            <ChatLoadingStates.SessionCreating />
          </Card>
        </div>
      )}

      {/* Error Recovery */}
      {persistenceErrors.length > 0 && persistenceErrors.some(e => e.type === 'network') && (
        <div className="fixed bottom-4 left-4 z-40">
          <ChatErrorStates.Network
            onRetry={() => {
              onClearSessionError()
              onClearHistoryError()
            }}
          />
        </div>
      )}

      {/* AI Preferences Modal */}
      {showPreferences && enablePreferences && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="my-8">
            <ChatPreferences
              userId={userId}
              sessionId={currentSessionId}
              initialPreferences={userPreferences}
              onSave={onPreferencesSave}
              onClose={onTogglePreferences}
            />
          </div>
        </div>
      )}
    </div>
  )
})