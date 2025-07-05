'use client'

import React, { useMemo } from 'react'

interface ParticleSystemProps {
  count: number
  intensity: string
}

export const ParticleSystem = React.memo(function ParticleSystem({ count, intensity }: ParticleSystemProps) {
  const particles = useMemo(() => Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: Math.random() * 4,
    duration: 3 + Math.random() * 2,
    size: Math.random() * 3 + 1
  })), [count])
  
  const particleOpacity = useMemo(() => ({
    low: 0.3,
    medium: 0.5,
    high: 0.7,
    max: 0.9
  }[intensity]), [intensity])
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute bg-orange-400 rounded-full animate-ember-rise"
          style={{
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            left: particle.left,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
            opacity: particleOpacity
          }}
        />
      ))}
    </div>
  )
})