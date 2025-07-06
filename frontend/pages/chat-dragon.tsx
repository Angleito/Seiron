'use client'

import React from 'react'
import { VoiceEnabledChatWithDragon } from '@/components/chat/VoiceEnabledChatWithDragon'

export default function ChatDragonPage() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      <VoiceEnabledChatWithDragon className="h-full" />
    </div>
  )
}