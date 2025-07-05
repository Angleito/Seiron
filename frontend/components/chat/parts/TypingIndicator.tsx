'use client'

import React from 'react'
import { Sparkles } from 'lucide-react'

interface TypingIndicatorData {
  agentId: string
  agentType: string
  timestamp: Date
}

interface TypingIndicatorProps {
  indicators: TypingIndicatorData[]
}

export const TypingIndicator = React.memo(function TypingIndicator({
  indicators
}: TypingIndicatorProps) {
  if (indicators.length === 0) return null

  return (
    <div className="space-y-2">
      {indicators.map((indicator) => (
        <div key={indicator.agentId} className="flex justify-start">
          <div className="bg-gray-900 rounded-lg px-4 py-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 animate-spin text-red-400" />
              <span className="text-sm text-red-300">
                {indicator.agentType.replace('_', ' ')} is typing...
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
})