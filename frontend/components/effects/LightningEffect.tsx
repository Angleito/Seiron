import React, { useState, useEffect, useCallback } from 'react'
import { cn } from '@lib/utils'

interface LightningEffectProps {
  className?: string
  frequency?: 'low' | 'medium' | 'high'
  intensity?: 'subtle' | 'normal' | 'intense'
  enabled?: boolean
  reducedMotion?: boolean
  maxBolts?: number
}

interface LightningPoint {
  x: number
  y: number
}

interface LightningBranch {
  points: LightningPoint[]
  width: number
  opacity: number
}

interface LightningBolt {
  id: string
  mainPath: LightningPoint[]
  branches: LightningBranch[]
  opacity: number
  duration: number
}

export const LightningEffect = React.memo<LightningEffectProps>(({
  className,
  frequency = 'medium',
  intensity = 'normal',
  enabled = true,
  reducedMotion = false,
  maxBolts = 3
}) => {
  const [lightningBolts, setLightningBolts] = useState<LightningBolt[]>([])
  const [isFlashing, setIsFlashing] = useState(false)

  const frequencyConfig = {
    low: { minDelay: 12000, maxDelay: 25000 },
    medium: { minDelay: 6000, maxDelay: 15000 },
    high: { minDelay: 3000, maxDelay: 8000 }
  }

  const intensityConfig = {
    subtle: { maxBolts: 1, flashIntensity: 0.15, glowSize: 8 },
    normal: { maxBolts: 1, flashIntensity: 0.25, glowSize: 12 },
    intense: { maxBolts: 2, flashIntensity: 0.4, glowSize: 16 }
  }

  const generateJaggedPath = (startX: number, startY: number, endX: number, endY: number, segments: number = 15): LightningPoint[] => {
    const points: LightningPoint[] = []
    points.push({ x: startX, y: startY })
    
    for (let i = 1; i < segments; i++) {
      const progress = i / segments
      const baseX = startX + (endX - startX) * progress
      const baseY = startY + (endY - startY) * progress
      
      // Add significant randomness for jagged lightning effect
      const offsetX = (Math.random() - 0.5) * 8 * (1 - Math.abs(progress - 0.5) * 2) // More variation in middle
      const offsetY = (Math.random() - 0.5) * 3
      
      points.push({
        x: baseX + offsetX,
        y: baseY + offsetY
      })
    }
    
    points.push({ x: endX, y: endY })
    return points
  }

  const generateLightningBolt = useCallback((): LightningBolt => {
    // Start from random top position
    const startX = 10 + Math.random() * 80
    const startY = -5 + Math.random() * 15
    
    // End at random bottom position
    const endX = startX + (Math.random() - 0.5) * 40
    const endY = 85 + Math.random() * 20
    
    // Generate main lightning path with many segments for jagged effect
    const mainSegments = 20 + Math.floor(Math.random() * 15)
    const mainPath = generateJaggedPath(startX, startY, endX, endY, mainSegments)
    
    // Generate branches from random points along main path
    const branches: LightningBranch[] = []
    const numBranches = Math.floor(Math.random() * 4) + 2 // 2-5 branches
    
    for (let i = 0; i < numBranches; i++) {
      // Pick random point along main path (avoid first and last 20%)
      const branchIndex = Math.floor(mainPath.length * 0.2 + Math.random() * mainPath.length * 0.6)
      const branchStart = mainPath[branchIndex]
      
      if (branchStart) {
        // Branch goes off at an angle
        const branchLength = 15 + Math.random() * 25
        const angle = (Math.random() - 0.5) * Math.PI * 0.8 // ±72 degrees
        
        const branchEndX = branchStart.x + Math.cos(angle) * branchLength
        const branchEndY = branchStart.y + Math.sin(angle) * branchLength + Math.random() * 10
        
        // Generate branch path
        const branchSegments = 8 + Math.floor(Math.random() * 6)
        const branchPath = generateJaggedPath(branchStart.x, branchStart.y, branchEndX, branchEndY, branchSegments)
        
        branches.push({
          points: branchPath,
          width: 0.3 + Math.random() * 0.4, // Much thinner branches
          opacity: 0.6 + Math.random() * 0.3
        })
      }
    }

    return {
      id: `lightning-${Date.now()}-${Math.random()}`,
      mainPath,
      branches,
      opacity: 0.9 + Math.random() * 0.1,
      duration: 100 + Math.random() * 80
    }
  }, [])

  const triggerLightning = useCallback(() => {
    if (!enabled || reducedMotion) return

    const config = intensityConfig[intensity]
    const boltCount = 1 + Math.floor(Math.random() * Math.min(maxBolts, config.maxBolts))
    const newBolts = Array.from({ length: boltCount }, () => generateLightningBolt())

    setLightningBolts(newBolts)
    setIsFlashing(true)

    // Remove bolts after animation
    setTimeout(() => {
      setLightningBolts([])
      setIsFlashing(false)
    }, Math.max(...newBolts.map(bolt => bolt.duration)))
  }, [enabled, reducedMotion, intensity, maxBolts, generateLightningBolt])

  useEffect(() => {
    if (!enabled || reducedMotion) return

    const scheduleNext = () => {
      const config = frequencyConfig[frequency]
      const delay = config.minDelay + Math.random() * (config.maxDelay - config.minDelay)
      
      setTimeout(() => {
        triggerLightning()
        scheduleNext()
      }, delay)
    }

    scheduleNext()
  }, [enabled, reducedMotion, frequency, triggerLightning])

  if (!enabled || reducedMotion) return null

  return (
    <div className={cn("absolute inset-0 pointer-events-none", className)}>
      {/* Lightning flash overlay */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-75 bg-gradient-to-b from-yellow-100/20 via-yellow-300/10 to-transparent",
          isFlashing ? "opacity-100" : "opacity-0"
        )}
        style={{
          opacity: isFlashing ? intensityConfig[intensity].flashIntensity : 0,
          zIndex: 50
        }}
      />

      {/* Lightning bolts */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ zIndex: 40 }}>
        <defs>
          <linearGradient id="lightningGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="20%" stopColor="#fbbf24" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0.6" />
          </linearGradient>
          <filter id="lightningGlow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {lightningBolts.map((bolt) => {
          // Convert points to SVG path
          const mainPathD = bolt.mainPath.reduce((path, point, index) => {
            return index === 0 ? `M${point.x} ${point.y}` : `${path} L${point.x} ${point.y}`
          }, '')
          
          return (
            <g key={bolt.id}>
              {/* Main lightning bolt - very thin */}
              <path
                d={mainPathD}
                stroke="url(#lightningGradient)"
                strokeWidth="0.4"
                fill="none"
                opacity={bolt.opacity}
                filter="url(#lightningGlow)"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* Secondary glow for main bolt */}
              <path
                d={mainPathD}
                stroke="#ffffff"
                strokeWidth="0.15"
                fill="none"
                opacity={bolt.opacity * 0.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* Branch bolts */}
              {bolt.branches.map((branch, index) => {
                const branchPathD = branch.points.reduce((path, point, pointIndex) => {
                  return pointIndex === 0 ? `M${point.x} ${point.y}` : `${path} L${point.x} ${point.y}`
                }, '')
                
                return (
                  <g key={index}>
                    <path
                      d={branchPathD}
                      stroke="url(#lightningGradient)"
                      strokeWidth={branch.width}
                      fill="none"
                      opacity={branch.opacity * bolt.opacity}
                      filter="url(#lightningGlow)"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d={branchPathD}
                      stroke="#ffffff"
                      strokeWidth={branch.width * 0.4}
                      fill="none"
                      opacity={branch.opacity * bolt.opacity * 0.6}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                )
              })}
            </g>
          )
        })}
      </svg>
      
      {/* Subtle glow effects along main path */}
      {lightningBolts.map((bolt) => {
        // Create glow points along main path
        const glowPoints = bolt.mainPath.filter((_, index) => index % 3 === 0) // Every 3rd point
        
        return glowPoints.map((point, index) => (
          <div
            key={`glow-${bolt.id}-${index}`}
            className="absolute rounded-full bg-white/10 blur-sm"
            style={{
              left: `${point.x}%`,
              top: `${point.y}%`,
              width: `${intensityConfig[intensity].glowSize}px`,
              height: `${intensityConfig[intensity].glowSize}px`,
              opacity: bolt.opacity * 0.3,
              transform: 'translate(-50%, -50%)',
              zIndex: 35
            }}
          />
        ))
      })}
    </div>
  )
})

LightningEffect.displayName = 'LightningEffect'

export default LightningEffect