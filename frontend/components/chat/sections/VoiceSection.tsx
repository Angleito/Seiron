'use client'

import React from 'react'
import { VoiceInterface } from '@components/voice'
import { VoiceErrorBoundary } from '@components/error-boundaries'
import { ElevenLabsConfig } from '@hooks/voice/useElevenLabsTTS'

interface VoiceSectionProps {
  isVoiceEnabled: boolean
  elevenLabsConfig: ElevenLabsConfig
  onTranscriptChange: (transcript: string) => void
  onError: (error: Error) => void
  onToggleVoice: () => void
}

export const VoiceSection = React.memo(function VoiceSection({
  isVoiceEnabled,
  elevenLabsConfig,
  onTranscriptChange,
  onError,
  onToggleVoice
}: VoiceSectionProps) {
  if (!isVoiceEnabled) return null

  return (
    <VoiceErrorBoundary onReset={onToggleVoice}>
      <div className="border-t border-gray-800 bg-gray-900 p-4">
        <VoiceInterface
          elevenLabsConfig={elevenLabsConfig}
          onTranscriptChange={onTranscriptChange}
          onError={onError}
          autoReadResponses={true}
          className="max-w-4xl mx-auto"
        />
      </div>
    </VoiceErrorBoundary>
  )
})