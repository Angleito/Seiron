'use client'

import React from 'react'
import { SeironGLBDragon } from './SeironGLBDragon'

export interface VoiceAnimationState {
  isListening: boolean
  isSpeaking: boolean
  isProcessing: boolean
  isIdle: boolean
  volume: number
  emotion?: 'excited' | 'angry' | 'calm' | 'focused'
}

export interface DragonRendererProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'gigantic'
  voiceState?: VoiceAnimationState
  enableAnimations?: boolean
  className?: string
}

// Simplified dragon renderer - only 3D GLB rendering
export const DragonRenderer: React.FC<DragonRendererProps> = ({
  size = 'md',
  voiceState,
  enableAnimations = true,
  className = ''
}) => {
  return (
    <div className={`w-full h-full ${className}`}>
      <SeironGLBDragon
        voiceState={voiceState}
        size={size}
        enableAnimations={enableAnimations}
        className="w-full h-full"
      />
    </div>
  )
}

export default DragonRenderer