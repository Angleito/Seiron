'use client'

import React, { useMemo } from 'react'
import { useDragonInteraction } from '../DragonInteractionController'
import { useDragonAnimation } from '../../../hooks/useDragonInteraction'

export const DragonAura = React.memo(function DragonAura() {
  const { state } = useDragonInteraction()
  const { glowIntensity, enableGlow } = useDragonAnimation()

  // State-based visual effects - memoized
  const getAuraColor = useMemo(() => {
    switch (state) {
      case 'active':
        return 'from-red-600/40 via-orange-500/40 to-yellow-400/40'
      case 'ready':
        return 'from-red-500/30 via-orange-500/30 to-yellow-500/30'
      case 'attention':
        return 'from-red-500/20 via-orange-500/20 to-yellow-500/20'
      default:
        return 'from-red-500/10 via-orange-500/10 to-yellow-500/10'
    }
  }, [state])

  if (!enableGlow) {
    return null
  }

  return (
    <div 
      className={`absolute inset-0 rounded-full bg-gradient-to-r ${getAuraColor} blur-xl transition-all duration-500`}
      style={{ opacity: glowIntensity }}
    />
  )
})