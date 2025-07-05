'use client'

import React from 'react'
import { Mic } from 'lucide-react'
import { useSanitizedContent, SANITIZE_CONFIGS } from '@lib/sanitize'

interface VoiceTranscriptPreviewProps {
  transcript: string
}

// Safe message content renderer for voice transcript
const SafeTranscriptContent = React.memo(function SafeTranscriptContent({ 
  content 
}: { 
  content: string 
}) {
  const { sanitized, isValid } = useSanitizedContent(
    content, 
    SANITIZE_CONFIGS.CHAT_MESSAGE
  )
  
  if (!isValid) {
    return (
      <div className="text-yellow-400 text-sm">
        ⚠️ Transcript content filtered
      </div>
    )
  }
  
  return <span className="whitespace-pre-wrap">{sanitized}</span>
})

export const VoiceTranscriptPreview = React.memo(function VoiceTranscriptPreview({
  transcript
}: VoiceTranscriptPreviewProps) {
  if (!transcript) return null

  return (
    <div className="flex justify-end">
      <div className="bg-gray-800 rounded-lg px-4 py-2 max-w-[70%]">
        <div className="flex items-center gap-2 mb-1">
          <Mic className="h-4 w-4 text-red-400 animate-pulse" />
          <span className="text-xs text-red-400">Listening...</span>
        </div>
        <SafeTranscriptContent content={transcript} />
      </div>
    </div>
  )
})