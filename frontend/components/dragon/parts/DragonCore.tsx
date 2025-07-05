'use client'

import React, { useMemo } from 'react'
import { useDragonInteraction } from '../DragonInteractionController'
import { useDragonOrientation } from '../../../hooks/useDragonInteraction'
import { DragonEyes } from './DragonEyes'
import { DragonBreath } from '../effects/DragonBreath'

interface DragonCoreProps {
  width: number
  height: number
  containerSize: string
  enableGlow?: boolean
  enableComplexAnimations?: boolean
}

export const DragonCore = React.memo(function DragonCore({
  width,
  height,
  containerSize,
  enableGlow = true,
  enableComplexAnimations = true
}: DragonCoreProps) {
  const { state } = useDragonInteraction()
  const { headTransform, bodyRotation } = useDragonOrientation()

  // Animation classes based on state - memoized
  const animationClasses = useMemo(() => {
    const classes = ['transition-all duration-500']
    
    switch (state) {
      case 'active':
        classes.push('animate-pulse')
        break
      case 'ready':
        classes.push('animate-bounce')
        break
      case 'attention':
        classes.push('animate-pulse')
        break
    }
    
    return classes
  }, [state])

  return (
    <div 
      className={`relative ${containerSize} ${animationClasses.join(' ')}`}
      style={{
        transform: `perspective(1000px) rotateY(${bodyRotation}deg)`,
        transformStyle: 'preserve-3d'
      }}
    >
      {/* Dragon Head (follows cursor) */}
      <div 
        className="relative w-full h-full transition-transform duration-200"
        style={{
          transform: headTransform
        }}
      >
        <img
          src="/images/seiron.png"
          alt="Seiron - The Wish-Granting Dragon"
          width={width}
          height={height}
          className="object-contain filter drop-shadow-2xl"
          loading="eager"
        />
        
        {/* Dragon Eyes */}
        <DragonEyes />
      </div>
      
      {/* Dragon Breath Effect */}
      {state === 'active' && enableComplexAnimations && (
        <DragonBreath />
      )}
    </div>
  )
})