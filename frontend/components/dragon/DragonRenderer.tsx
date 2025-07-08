'use client'

import React from 'react'

export interface VoiceAnimationState {
  isListening: boolean
  isSpeaking: boolean
  isProcessing: boolean
  isIdle: boolean
  volume: number
  emotion?: 'excited' | 'angry' | 'calm' | 'focused'
}

export interface DragonRendererProps {
  dragonType?: '2d' | '3d' | 'ascii'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  voiceState?: VoiceAnimationState
  enableFallback?: boolean
  fallbackType?: '2d' | '3d' | 'ascii'
  performanceMode?: 'auto' | 'high' | 'medium' | 'low'
  className?: string
}

// Minimal dragon renderer component to fix build errors
export const DragonRenderer: React.FC<DragonRendererProps> = ({
  dragonType = 'ascii',
  size = 'md',
  voiceState,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-12 h-12 text-sm',
    md: 'w-16 h-16 text-base', 
    lg: 'w-24 h-24 text-lg',
    xl: 'w-32 h-32 text-xl'
  }

  const getEmotionColor = () => {
    if (voiceState?.isListening) return 'text-blue-400'
    if (voiceState?.isSpeaking) return 'text-orange-400'
    if (voiceState?.isProcessing) return 'text-purple-400'
    return 'text-gray-400'
  }

  const getDragonASCII = () => {
    if (voiceState?.isSpeaking) {
      return `
        ╭─────╮
       │  ◉ ◉  │
       │   ≋   │ 🔥
        ╰─┬─╯
          │
         ╱│╲
      `
    }
    if (voiceState?.isListening) {
      return `
        ╭─────╮
       │  ● ●  │
       │   ○   │ ⚡
        ╰─┬─╯
          │
         ╱│╲
      `
    }
    return `
      ╭─────╮
     │  ◦ ◦  │
     │   ~   │
      ╰─┬─╯
        │
       ╱│╲
    `
  }

  return (
    <div className={`${sizeClasses[size]} ${getEmotionColor()} ${className} flex items-center justify-center font-mono`}>
      <pre className="text-center leading-none whitespace-pre">
        {getDragonASCII()}
      </pre>
    </div>
  )
}

export default DragonRenderer