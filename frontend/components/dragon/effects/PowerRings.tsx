'use client'

import React from 'react'
import { useDragonInteraction } from '../DragonInteractionController'

export const PowerRings = React.memo(function PowerRings() {
  const { state } = useDragonInteraction()

  if (state === 'idle') {
    return null
  }

  return (
    <>
      <div className="absolute inset-0 border-2 border-red-500/20 rounded-full animate-power-ring" />
      {state === 'active' && (
        <div className="absolute inset-0 border-2 border-orange-500/20 rounded-full animate-power-ring animation-delay-200" />
      )}
    </>
  )
})