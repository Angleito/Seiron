import React, { useEffect, useState } from 'react'

interface DragonSummoningLightningProps {
  isActive?: boolean
  onLightningComplete?: () => void
}

/**
 * DragonSummoningLightning component - provides visual lightning flash effects
 * Creates a pulsing white flash effect synchronized with lightning strikes
 */
const DragonSummoningLightning: React.FC<DragonSummoningLightningProps> = ({ 
  isActive = false, 
  onLightningComplete 
}) => {
  const [lightningStrikes, setLightningStrikes] = useState(0)

  useEffect(() => {
    if (!isActive) return

    const interval = setInterval(() => {
      setLightningStrikes(prev => prev + 1)
    }, 500)

    // Complete after 10 strikes (5 seconds)
    const timeout = setTimeout(() => {
      onLightningComplete?.()
      clearInterval(interval)
    }, 5000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [isActive, onLightningComplete])

  if (!isActive) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      pointerEvents: 'none',
      zIndex: 9998,
      background: lightningStrikes % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.1)',
      transition: 'background 0.1s'
    }}>
      {/* Lightning flash effect only - text removed */}
    </div>
  )
}

export default DragonSummoningLightning