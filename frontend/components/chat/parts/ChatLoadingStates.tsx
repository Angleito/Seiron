'use client'

import React from 'react'
import { LoadingSpinner } from '../../ui/feedback/LoadingSpinner'
import { Card } from '../../ui/display/Card'

// Loading state for chat sessions
export const SessionsLoadingState = React.memo(function SessionsLoadingState({
  className = ''
}: {
  className?: string
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-32 bg-gray-600/30 rounded animate-pulse"></div>
        <div className="h-8 w-24 bg-gray-700/30 rounded animate-pulse"></div>
      </div>
      
      {/* Stats loading */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-800/30 border border-gray-700/30 rounded animate-pulse"></div>
        ))}
      </div>
      
      {/* Session cards loading */}
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="p-3 bg-gray-900/20 border-gray-700/30">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="h-4 w-3/4 bg-gray-600/30 rounded animate-pulse mb-2"></div>
              <div className="h-3 w-1/2 bg-gray-600/20 rounded animate-pulse"></div>
            </div>
            <div className="flex gap-1">
              <div className="h-6 w-6 bg-gray-600/20 rounded animate-pulse"></div>
              <div className="h-6 w-6 bg-gray-600/20 rounded animate-pulse"></div>
              <div className="h-6 w-6 bg-gray-700/20 rounded animate-pulse"></div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
})

// Loading state for chat messages
export const MessagesLoadingState = React.memo(function MessagesLoadingState({
  messageCount = 3,
  className = ''
}: {
  messageCount?: number
  className?: string
}) {
  return (
    <div className={`space-y-4 p-4 ${className}`}>
      {[...Array(messageCount)].map((_, i) => (
        <div
          key={i}
          className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}
        >
          <div
            className={`max-w-[80%] p-3 rounded-lg animate-pulse ${
              i % 2 === 0
                ? 'bg-gray-800/30 border border-gray-700/30'
                : 'bg-gray-700/30 border border-gray-600/30'
            }`}
          >
            <div className="space-y-2">
              <div className="h-3 w-full bg-white/20 rounded animate-pulse"></div>
              <div className="h-3 w-4/5 bg-white/20 rounded animate-pulse"></div>
              {Math.random() > 0.5 && (
                <div className="h-3 w-3/5 bg-white/20 rounded animate-pulse"></div>
              )}
            </div>
            <div className="h-2 w-12 bg-white/10 rounded animate-pulse mt-2"></div>
          </div>
        </div>
      ))}
    </div>
  )
})

// Loading state for message history
export const MessageHistoryLoadingState = React.memo(function MessageHistoryLoadingState({
  className = ''
}: {
  className?: string
}) {
  return (
    <div className={`${className}`}>
      {/* Header loading */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/30">
        <div className="h-6 w-48 bg-gray-600/30 rounded animate-pulse"></div>
        <div className="h-4 w-24 bg-gray-600/20 rounded animate-pulse"></div>
      </div>
      
      {/* Messages loading */}
      <MessagesLoadingState messageCount={5} />
      
      {/* Pagination loading */}
      <div className="flex justify-between items-center p-4 border-t border-gray-700/30">
        <div className="h-8 w-20 bg-gray-600/30 rounded animate-pulse"></div>
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 w-8 bg-gray-600/30 rounded animate-pulse"></div>
          ))}
        </div>
        <div className="h-8 w-16 bg-gray-600/30 rounded animate-pulse"></div>
      </div>
    </div>
  )
})

// Loading state for initial chat load
export const ChatInitialLoadingState = React.memo(function ChatInitialLoadingState({
  className = ''
}: {
  className?: string
}) {
  return (
    <div className={`flex flex-col h-full bg-gradient-to-b from-gray-950 to-black ${className}`}>
      {/* Status bar loading */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/30">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 bg-gray-600/50 rounded-full animate-pulse"></div>
          <div className="h-4 w-24 bg-gray-600/30 rounded animate-pulse"></div>
        </div>
        <div className="h-8 w-32 bg-gray-700/30 rounded animate-pulse"></div>
      </div>
      
      {/* Main content loading */}
      <div className="flex-1 flex">
        {/* Sidebar loading */}
        <div className="w-80 border-r border-gray-700/30">
          <SessionsLoadingState />
        </div>
        
        {/* Chat area loading */}
        <div className="flex-1 flex flex-col">
          <MessageHistoryLoadingState />
        </div>
      </div>
    </div>
  )
})

// Loading state for creating new session
export const SessionCreatingState = React.memo(function SessionCreatingState({
  className = ''
}: {
  className?: string
}) {
  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <div className="bg-gray-900/30 border border-gray-700/50 rounded-lg p-6 flex items-center gap-4">
        <LoadingSpinner size="lg" />
        <div className="text-gray-300">
          <div className="font-semibold mb-1">Creating New Session</div>
          <div className="text-size-3 text-gray-400">Setting up your Dragon Ball Z chat experience...</div>
        </div>
      </div>
    </div>
  )
})

// Loading state for voice operations
export const VoiceLoadingState = React.memo(function VoiceLoadingState({
  operation,
  className = ''
}: {
  operation: 'listening' | 'processing' | 'speaking' | 'initializing'
  className?: string
}) {
  const messages = {
    listening: 'Listening for your command...',
    processing: 'Processing voice input...',
    speaking: 'Dragon is speaking...',
    initializing: 'Initializing voice interface...'
  }

  const icons = {
    listening: '🎤',
    processing: '🧠',
    speaking: '🐉',
    initializing: '⚡'
  }

  return (
    <div className={`flex items-center gap-3 p-3 bg-gray-900/30 border border-gray-700/50 rounded-lg ${className}`}>
      <div className="text-size-1 animate-pulse">{icons[operation]}</div>
      <div className="flex items-center gap-2">
        <LoadingSpinner size="sm" />
        <span className="text-gray-300 text-size-3">{messages[operation]}</span>
      </div>
    </div>
  )
})

// Loading state for message operations
export const MessageOperationLoadingState = React.memo(function MessageOperationLoadingState({
  operation,
  className = ''
}: {
  operation: 'sending' | 'editing' | 'deleting' | 'retrying'
  className?: string
}) {
  const messages = {
    sending: 'Sending message...',
    editing: 'Updating message...',
    deleting: 'Deleting message...',
    retrying: 'Retrying message...'
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 bg-gray-700/20 border border-gray-600/30 rounded-full ${className}`}>
      <LoadingSpinner size="sm" />
      <span className="text-gray-300 text-size-4">{messages[operation]}</span>
    </div>
  )
})

// Loading state for error recovery
export const ErrorRecoveryLoadingState = React.memo(function ErrorRecoveryLoadingState({
  className = ''
}: {
  className?: string
}) {
  return (
    <div className={`flex items-center justify-center p-6 ${className}`}>
      <div className="bg-gray-900/30 border border-gray-700/50 rounded-lg p-4 flex items-center gap-3">
        <LoadingSpinner size="md" />
        <div className="text-gray-300">
          <div className="font-semibold mb-1">Recovering from Error</div>
          <div className="text-size-3 text-gray-400">Attempting to restore connection...</div>
        </div>
      </div>
    </div>
  )
})

// Typing indicator with Dragon Ball Z theming
export const DragonTypingIndicator = React.memo(function DragonTypingIndicator({
  agentName = 'Seiron',
  className = ''
}: {
  agentName?: string
  className?: string
}) {
  return (
    <div className={`flex items-center gap-3 p-3 ${className}`}>
      <div className="text-size-1 animate-bounce">🐉</div>
      <div className="flex items-center gap-2">
        <span className="text-gray-300 text-size-3 font-normal">{agentName} is thinking</span>
        <div className="flex gap-1">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"
              style={{ animationDelay: `${i * 0.2}s` }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  )
})

// Combined loading states export
export const ChatLoadingStates = {
  Sessions: SessionsLoadingState,
  Messages: MessagesLoadingState,
  MessageHistory: MessageHistoryLoadingState,
  ChatInitial: ChatInitialLoadingState,
  SessionCreating: SessionCreatingState,
  Voice: VoiceLoadingState,
  MessageOperation: MessageOperationLoadingState,
  ErrorRecovery: ErrorRecoveryLoadingState,
  DragonTyping: DragonTypingIndicator
}