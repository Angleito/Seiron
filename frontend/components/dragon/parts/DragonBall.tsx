'use client'

import React, { useMemo } from 'react'

interface DragonBallProps {
  stars: number
  index: number
  size: number
  intensity: string
  isActive: boolean
}

export const DragonBall = React.memo(function DragonBall({ 
  stars, 
  index, 
  size, 
  intensity, 
  isActive 
}: DragonBallProps) {
  const glowIntensity = useMemo(() => ({
    low: 'shadow-lg',
    medium: 'shadow-xl',
    high: 'shadow-2xl',
    max: 'shadow-2xl drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]'
  }[intensity]), [intensity])
  
  return (
    <div
      className={`absolute w-8 h-8 animate-dragon-ball-float ${isActive ? 'scale-110' : ''}`}
      style={{
        transform: `rotate(${index * 51.43}deg) translateX(${size * 0.6}px) rotate(-${index * 51.43}deg)`,
        animationDelay: `${index * 0.2}s`,
        transition: 'transform 0.3s ease-in-out'
      }}
    >
      <div className={`w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full ${glowIntensity} relative overflow-hidden transition-all duration-300`}>
        {/* Star pattern */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-red-600 text-xs font-bold">
            {'★'.repeat(stars)}
          </div>
        </div>
        {/* Dynamic shine */}
        <div 
          className="absolute top-1 left-1 w-3 h-3 bg-yellow-200 rounded-full transition-opacity duration-300"
          style={{ opacity: isActive ? 0.9 : 0.7 }}
        />
      </div>
    </div>
  )
})