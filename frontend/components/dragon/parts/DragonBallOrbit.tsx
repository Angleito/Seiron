'use client'

import React, { useMemo } from 'react'
import { useDragonInteraction } from '../DragonInteractionController'
import { useDragonAnimation } from '../../../hooks/useDragonInteraction'
import { DragonBall } from './DragonBall'

interface DragonBallOrbitProps {
  size: number
  showDragonBalls?: boolean
  enableComplexAnimations?: boolean
}

export const DragonBallOrbit = React.memo(function DragonBallOrbit({
  size,
  showDragonBalls = true,
  enableComplexAnimations = true
}: DragonBallOrbitProps) {
  const { state, intensity } = useDragonInteraction()
  
  const getDragonBallSpeed = useMemo(() => {
    switch (state) {
      case 'active':
        return 'animate-dragon-balls-fast'
      case 'ready':
        return 'animate-dragon-balls-orbit'
      default:
        return 'animate-dragon-balls-orbit'
    }
  }, [state])

  if (!showDragonBalls || !enableComplexAnimations) {
    return null
  }

  return (
    <div className={`absolute inset-0 ${getDragonBallSpeed}`}>
      {[1, 2, 3, 4, 5, 6, 7].map((stars, index) => (
        <DragonBall
          key={stars}
          stars={stars}
          index={index}
          size={size}
          intensity={intensity}
          isActive={state === 'active'}
        />
      ))}
    </div>
  )
})