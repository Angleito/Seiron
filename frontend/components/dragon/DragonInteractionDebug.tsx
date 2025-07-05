'use client'

import React, { useEffect, useState } from 'react'
import { logger } from '@/lib/logger'

export function DragonInteractionDebug() {
  const [renderCount, setRenderCount] = useState(0)
  
  useEffect(() => {
    logger.debug('DragonInteractionDebug rendered:', renderCount)
    setRenderCount(prev => prev + 1)
  }, [])
  
  return (
    <div style={{
      position: 'fixed',
      top: 10,
      right: 10,
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      zIndex: 9999
    }}>
      <div>Render Count: {renderCount}</div>
    </div>
  )
}