'use client'

import React from 'react'
import { InteractiveDragonContainer } from '../containers/InteractiveDragonContainer'

export interface InteractiveDragonProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showDragonBalls?: boolean
  enableParticles?: boolean
  className?: string
}

/**
 * Main Interactive Dragon Component
 * Uses container/presentation pattern for better separation of concerns
 */
export const InteractiveDragon = React.memo(function InteractiveDragon(props: InteractiveDragonProps) {
  return <InteractiveDragonContainer {...props} />
})
