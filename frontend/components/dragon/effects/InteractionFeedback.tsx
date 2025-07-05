'use client'

import React from 'react'
import { useDragonInteraction } from '../DragonInteractionController'

export const InteractionFeedback = React.memo(function InteractionFeedback() {
  const { state } = useDragonInteraction()

  if (state === 'idle') {
    return null
  }

  return (
    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 pointer-events-none">
      <p className="text-xs text-orange-400 animate-pulse whitespace-nowrap">
        {state === 'attention' && 'The dragon notices you...'}
        {state === 'ready' && 'Ready to grant wishes!'}
        {state === 'active' && 'Make your wish!'}
      </p>
    </div>
  )
})