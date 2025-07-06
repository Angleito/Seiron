'use client'

import React from 'react'
import { ChatErrorBoundary } from '@components/error-boundaries'
import { VoiceEnabledChatContainer } from '../containers/VoiceEnabledChatContainer'
import { EnhancedVoiceEnabledChatContainer } from '../containers/EnhancedVoiceEnabledChatContainer'

interface VoiceEnabledChatProps {
  // Enhanced persistence features
  userId?: string
  initialSessionId?: string
  enablePersistence?: boolean
  enableSessionManagement?: boolean
  autoLoadHistory?: boolean
  
  // Legacy support
  useLegacyMode?: boolean
  
  className?: string
}

/**
 * Main Voice Enabled Chat Component
 * Uses container/presentation pattern for better separation of concerns
 * Now supports both legacy mode and enhanced persistence features
 */
export const VoiceEnabledChat = React.memo(function VoiceEnabledChat({
  userId = 'anonymous',
  initialSessionId,
  enablePersistence = true,
  enableSessionManagement = true,
  autoLoadHistory = true,
  useLegacyMode = false,
  className = ''
}: VoiceEnabledChatProps) {
  return (
    <ChatErrorBoundary>
      {useLegacyMode ? (
        <VoiceEnabledChatContainer />
      ) : (
        <EnhancedVoiceEnabledChatContainer
          userId={userId}
          initialSessionId={initialSessionId}
          enablePersistence={enablePersistence}
          enableSessionManagement={enableSessionManagement}
          autoLoadHistory={autoLoadHistory}
          className={className}
        />
      )}
    </ChatErrorBoundary>
  )
})