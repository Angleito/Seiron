'use client'

import { useContext } from 'react'
import { useDragonInteraction as useInteractionContext } from '@components/dragon/DragonInteractionController'

// Re-export the hook from the controller for cleaner imports
export { useDragonInteraction } from '@components/dragon/DragonInteractionController'

// Additional dragon-specific hooks can be added here
export function useDragonState() {
  const { state, intensity, orientation } = useInteractionContext()
  
  return {
    state,
    intensity,
    orientation,
    isIdle: state === 'idle',
    isAttentive: state === 'attention',
    isReady: state === 'ready',
    isActive: state === 'active'
  }
}

export function useDragonOrientation() {
  const { orientation } = useInteractionContext()
  
  // Convert orientation to degrees for easier use in transforms
  const angle = Math.atan2(orientation.y, orientation.x) * (180 / Math.PI)
  
  // Calculate head tilt based on vertical orientation
  const headTilt = orientation.y * 20 // Max 20 degrees tilt
  
  // Calculate body rotation based on horizontal orientation
  const bodyRotation = orientation.x * 15 // Max 15 degrees rotation
  
  return {
    orientation,
    angle,
    headTilt,
    bodyRotation,
    // CSS transform helpers
    headTransform: `rotateX(${-headTilt}deg) rotateY(${bodyRotation}deg)`,
    eyeTransform: `translate(${orientation.x * 5}px, ${orientation.y * 5}px)`
  }
}

export function useDragonAnimation() {
  const { state, intensity, performanceMode } = useInteractionContext()
  
  // Get animation parameters based on state and performance
  const getAnimationSpeed = () => {
    if (performanceMode === 'minimal') return 'slow'
    if (performanceMode === 'reduced') return 'normal'
    
    switch (state) {
      case 'active':
        return 'fast'
      case 'ready':
        return 'normal'
      default:
        return 'slow'
    }
  }
  
  const getParticleCount = () => {
    const baseCount = {
      idle: 3,
      attention: 5,
      ready: 8,
      active: 12
    }[state]
    
    if (performanceMode === 'minimal') return Math.floor(baseCount * 0.3)
    if (performanceMode === 'reduced') return Math.floor(baseCount * 0.6)
    return baseCount
  }
  
  const getGlowIntensity = () => {
    const baseIntensity = {
      low: 0.3,
      medium: 0.5,
      high: 0.7,
      max: 1
    }[intensity]
    
    if (performanceMode === 'minimal') return baseIntensity * 0.5
    return baseIntensity
  }
  
  return {
    animationSpeed: getAnimationSpeed(),
    particleCount: getParticleCount(),
    glowIntensity: getGlowIntensity(),
    enableParticles: performanceMode !== 'minimal',
    enableGlow: performanceMode === 'full',
    enableComplexAnimations: performanceMode === 'full'
  }
}