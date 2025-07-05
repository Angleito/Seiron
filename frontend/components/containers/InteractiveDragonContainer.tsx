'use client'

import React, { useRef, useMemo } from 'react'
import { DragonInteractionProvider } from '../dragon/DragonInteractionController'
import { useAnimationPerformance } from '../../hooks/useAnimationPerformance'
import { InteractiveDragonPresentation } from '../dragon/InteractiveDragonPresentation'

interface InteractiveDragonContainerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showDragonBalls?: boolean
  enableParticles?: boolean
  className?: string
}

/**
 * Container component that manages dragon interaction state and performance optimization
 */
export const InteractiveDragonContainer = React.memo(function InteractiveDragonContainer(props: InteractiveDragonContainerProps) {
  const dragonRef = useRef<HTMLDivElement>(null)
  const { performanceMode } = useAnimationPerformance()
  
  // Adjust props based on performance - memoized
  const adjustedProps = useMemo(() => ({
    ...props,
    enableParticles: props.enableParticles !== false && performanceMode !== 'performance',
    showDragonBalls: props.showDragonBalls !== false && performanceMode !== 'performance'
  }), [props, performanceMode])
  
  return (
    <DragonInteractionProvider dragonRef={dragonRef}>
      <div ref={dragonRef} className="relative">
        <InteractiveDragonPresentation {...adjustedProps} />
      </div>
    </DragonInteractionProvider>
  )
})