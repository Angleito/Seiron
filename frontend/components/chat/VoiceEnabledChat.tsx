'use client'

import React from 'react'
import { ChatErrorBoundary } from '@components/error-boundaries'
import { VoiceEnabledChatContainer } from '../containers/VoiceEnabledChatContainer'

/**
 * Main Voice Enabled Chat Component
 * Uses container/presentation pattern for better separation of concerns
 */
export const VoiceEnabledChat = React.memo(function VoiceEnabledChat() {
  return (
    <ChatErrorBoundary>
      <VoiceEnabledChatContainer />
    </ChatErrorBoundary>
  )
})