'use client'

import React from 'react'
import { useDragonInteraction } from './DragonInteractionController'
import { useDragonAnimation } from '../../hooks/useDragonInteraction'
import { DragonCore } from './parts/DragonCore'
import { DragonBallOrbit } from './parts/DragonBallOrbit'
import { DragonAura } from './effects/DragonAura'
import { ParticleSystem } from './effects/ParticleSystem'
import { PowerRings } from './effects/PowerRings'
import { InteractionFeedback } from './effects/InteractionFeedback'

interface InteractiveDragonPresentationProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showDragonBalls?: boolean
  enableParticles?: boolean
  className?: string
}

const sizeConfig = {
  sm: { width: 120, height: 120, containerSize: 'w-32 h-32' },
  md: { width: 200, height: 200, containerSize: 'w-52 h-52' },
  lg: { width: 300, height: 300, containerSize: 'w-80 h-80' },
  xl: { width: 400, height: 400, containerSize: 'w-96 h-96' }
}

/**
 * Pure presentation component for the Interactive Dragon
 * Focuses solely on rendering and visual aspects
 */
export const InteractiveDragonPresentation = React.memo(function InteractiveDragonPresentation({ 
  size = 'lg', 
  showDragonBalls = true, 
  enableParticles = true, 
  className = '' 
}: InteractiveDragonPresentationProps) {
  const config = sizeConfig[size]
  const { setHovered, intensity } = useDragonInteraction()
  const { particleCount, enableComplexAnimations } = useDragonAnimation()
  
  return (
    <div 
      className={`relative ${config.containerSize} ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Dynamic Aura */}
      <DragonAura />
      
      {/* Dragon Balls Orbiting */}
      <DragonBallOrbit
        size={config.width}
        showDragonBalls={showDragonBalls}
        enableComplexAnimations={enableComplexAnimations}
      />

      {/* Main Dragon with Interactive Transforms */}
      <DragonCore
        width={config.width}
        height={config.height}
        containerSize={config.containerSize}
        enableComplexAnimations={enableComplexAnimations}
      />

      {/* Floating Particles */}
      {enableParticles && (
        <ParticleSystem count={particleCount} intensity={intensity} />
      )}

      {/* Power Rings */}
      <PowerRings />
      
      {/* Interaction Feedback Text */}
      <InteractionFeedback />
    </div>
  )
})