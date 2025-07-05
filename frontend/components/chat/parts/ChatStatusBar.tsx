'use client'

import React from 'react'
import { Mic, MicOff } from 'lucide-react'
import { cn } from '@lib/utils'
import { pipe } from 'fp-ts/function'
import * as O from 'fp-ts/Option'

interface ConnectionStatus {
  isConnected: boolean
  lastConnected?: Date
  reconnectAttempts?: number
}

interface ChatStatusBarProps {
  connectionStatus?: ConnectionStatus
  isVoiceEnabled: boolean
  onToggleVoice: () => void
}

export const ChatStatusBar = React.memo(function ChatStatusBar({
  connectionStatus,
  isVoiceEnabled,
  onToggleVoice
}: ChatStatusBarProps) {
  const isConnected = pipe(
    O.fromNullable(connectionStatus),
    O.map(status => status.isConnected),
    O.getOrElse(() => false)
  )

  return (
    <div className="px-4 py-2 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "h-2 w-2 rounded-full",
            isConnected ? "bg-green-500" : "bg-red-500"
          )} />
          <span className="text-sm text-red-700">
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
        </div>
        
        <button
          onClick={onToggleVoice}
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
  )
})