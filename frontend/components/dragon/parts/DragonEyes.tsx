'use client'

import React from 'react'
import { useDragonInteraction } from '../DragonInteractionController'
import { useDragonOrientation } from '../../../hooks/useDragonInteraction'

export const DragonEyes = React.memo(function DragonEyes() {
  const { state } = useDragonInteraction()
  const { eyeTransform } = useDragonOrientation()

  return (
    <div 
      className="absolute top-[30%] left-[40%] w-[20%] h-[10%] pointer-events-none"
      style={{
        transform: eyeTransform
      }}
    >
      {/* Eye glow effect */}
      {(state === 'ready' || state === 'active') && (
        <>
          <div className="absolute left-0 w-2 h-2 bg-red-500 rounded-full animate-pulse blur-sm" />
          <div className="absolute right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse blur-sm" />
        </>
      )}
    </div>
  )
})