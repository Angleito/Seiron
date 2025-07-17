import React, { useEffect, useState, useCallback } from 'react'

interface DragonSummoningLightningProps {
  isActive?: boolean
  onLightningComplete?: () => void
}

export const DragonSummoningLightning: React.FC<DragonSummoningLightningProps> = ({
  isActive = false,
  onLightningComplete
}) => {
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isActive && !isAnimating) {
      setIsAnimating(true)
      // Complete after all lightning animations finish
      const timer = setTimeout(() => {
        setIsAnimating(false)
        onLightningComplete?.()
      }, 5000) // 5 seconds for full lightning sequence

      return () => clearTimeout(timer)
    }
    return undefined
  }, [isActive, isAnimating, onLightningComplete])

  // Simple random lightning path - no complex algorithms
  const generateSimpleLightningPath = useCallback((startX: number, startY: number, endX: number, endY: number, segments: number = 15) => {
    const points: Array<{x: number, y: number}> = []
    points.push({ x: startX, y: startY })
    
    for (let i = 1; i < segments; i++) {
      const progress = i / segments
      
      // Simple linear progression with random deviations
      const baseX = startX + (endX - startX) * progress
      const baseY = startY + (endY - startY) * progress
      
      // Random horizontal deviation
      const maxDeviation = 12 * (1 - Math.abs(progress - 0.5) * 2)
      const randomX = baseX + (Math.random() - 0.5) * maxDeviation
      const randomY = baseY + (Math.random() - 0.5) * 4
      
      points.push({ x: randomX, y: randomY })
    }
    
    points.push({ x: endX, y: endY })
    return points.reduce((path, point, index) => {
      return index === 0 ? `M${point.x} ${point.y}` : `${path} L${point.x} ${point.y}`
    }, '')
  }, [])

  // Generate simple random lightning paths
  const lightningPaths = React.useMemo(() => {
    const paths = []
    const numPaths = 5 + Math.floor(Math.random() * 4) // 5-8 lightning bolts
    
    for (let i = 0; i < numPaths; i++) {
      const startX = 10 + Math.random() * 80 // Random start across top
      const startY = 0 + Math.random() * 10  // Start from top area
      const endX = 15 + Math.random() * 70  // Random end position
      const endY = 80 + Math.random() * 15  // End near bottom
      
      const path = generateSimpleLightningPath(startX, startY, endX, endY, 10 + Math.floor(Math.random() * 10))
      
      paths.push({
        path,
        delay: 2.0 + Math.random() * 1.5, // Random delay between 2-3.5 seconds
        duration: 0.3, // Simple duration
        width: 0.2 + Math.random() * 0.3, // Random width
        intensity: 0.7 + Math.random() * 0.3
      })
    }
    
    return paths
  }, [generateSimpleLightningPath])

  return (
    <div className="lightning-svg-container">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="dragonLightningGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="30%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#e6e6fa" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#d1d5db" stopOpacity="0.5" />
          </linearGradient>
          <filter id="dragonLightningGlow">
            <feGaussianBlur stdDeviation="0.8" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {isActive && lightningPaths.map((lightning, index) => (
          <path
            key={index}
            d={lightning.path}
            stroke="url(#dragonLightningGradient)"
            strokeWidth={lightning.width}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#dragonLightningGlow)"
            opacity={0}
            style={{
              animation: isAnimating ? 
                `fadeInOut ${lightning.duration}s ease-in-out ${lightning.delay}s` : 'none'
            }}
          />
        ))}
      </svg>
    </div>
  )
}

export default DragonSummoningLightning