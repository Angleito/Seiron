'use client'

import React, { useState, useEffect } from 'react'
import { VoiceAnimationState } from './DragonRenderer'

interface SimpleDragonFallbackProps {
  voiceState?: VoiceAnimationState
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'gigantic'
  className?: string
}

export const SimpleDragonFallback: React.FC<SimpleDragonFallbackProps> = ({
  voiceState,
  size = 'gigantic',
  className = ''
}) => {
  const [animationFrame, setAnimationFrame] = useState(0)

  // Simple breathing animation
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 60)
    }, 100)
    return () => clearInterval(interval)
  }, [])

  const sizeStyles = {
    sm: { fontSize: '2rem', width: '4rem', height: '4rem' },
    md: { fontSize: '4rem', width: '8rem', height: '8rem' },
    lg: { fontSize: '6rem', width: '12rem', height: '12rem' },
    xl: { fontSize: '8rem', width: '16rem', height: '16rem' },
    gigantic: { fontSize: '20rem', width: '40rem', height: '40rem' }
  }

  const currentSize = sizeStyles[size]
  
  // Get dragon emoji based on voice state
  const getDragonEmoji = () => {
    if (voiceState?.isSpeaking) return '🔥🐉🔥'
    if (voiceState?.isListening) return '⚡🐉⚡'
    if (voiceState?.isProcessing) return '💜🐉💜'
    return '🐉'
  }

  // Get glow color based on voice state
  const getGlowColor = () => {
    if (voiceState?.isSpeaking) return 'drop-shadow(0 0 30px rgba(251, 191, 36, 0.8))'
    if (voiceState?.isListening) return 'drop-shadow(0 0 30px rgba(59, 130, 246, 0.8))'
    if (voiceState?.isProcessing) return 'drop-shadow(0 0 30px rgba(147, 51, 234, 0.8))'
    return 'drop-shadow(0 0 20px rgba(251, 191, 36, 0.4))'
  }

  // Breathing effect
  const scale = 1 + Math.sin(animationFrame * 0.2) * 0.05

  return (
    <div 
      className={`flex items-center justify-center ${className}`}
      style={{
        width: currentSize.width,
        height: currentSize.height,
        margin: '0 auto'
      }}
    >
      <div
        style={{
          fontSize: currentSize.fontSize,
          transform: `scale(${scale})`,
          filter: getGlowColor(),
          transition: 'filter 0.3s ease',
          textAlign: 'center',
          userSelect: 'none',
          cursor: 'default'
        }}
      >
        {getDragonEmoji()}
      </div>
    </div>
  )
}

export default SimpleDragonFallback