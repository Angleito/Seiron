import React, { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface LightningEffectProps {
  className?: string
  frequency?: 'low' | 'medium' | 'high'
  intensity?: 'subtle' | 'normal' | 'intense'
  enabled?: boolean
  reducedMotion?: boolean
  maxBolts?: number
  onLightningStrike?: (isActive: boolean) => void
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
  maxBolts = 3,
  onLightningStrike
}) => {
  const [lightningBolts, setLightningBolts] = useState<LightningBolt[]>([])
  const [isFlashing, setIsFlashing] = useState(false)

  const frequencyConfig = {
    low: { minDelay: 45000, maxDelay: 90000 },    // 45-90 seconds (rare, dramatic)
    medium: { minDelay: 25000, maxDelay: 60000 }, // 25-60 seconds (moderate storms)
    high: { minDelay: 15000, maxDelay: 35000 }    // 15-35 seconds (intense storms)
  }

  const intensityConfig = {
    subtle: { maxBolts: 1, flashIntensity: 0.08, glowSize: 6, duration: 80 },
    normal: { maxBolts: 1, flashIntensity: 0.15, glowSize: 10, duration: 120 },
    intense: { maxBolts: 1, flashIntensity: 0.25, glowSize: 14, duration: 150 }
  }

  const generateJaggedPath = (startX: number, startY: number, endX: number, endY: number, segments: number = 15): LightningPoint[] => {
    const points: LightningPoint[] = []
    points.push({ x: startX, y: startY })
    
    for (let i = 1; i < segments; i++) {
      const progress = i / segments
      const baseX = startX + (endX - startX) * progress
      const baseY = startY + (endY - startY) * progress
      
      // More realistic lightning with primarily vertical movement and limited horizontal deviation
      const maxHorizontalDeviation = 4 // Reduced from 8 for more realistic look
      const maxVerticalDeviation = 1.5 // Reduced from 3 for straighter path
      
      // Reduce deviation at start and end for more natural attachment points
      const deviationFactor = Math.sin(progress * Math.PI) // Peak deviation in middle
      const offsetX = (Math.random() - 0.5) * maxHorizontalDeviation * deviationFactor
      const offsetY = (Math.random() - 0.5) * maxVerticalDeviation * deviationFactor
      
      points.push({
        x: baseX + offsetX,
        y: baseY + offsetY
      })
    }
    
    points.push({ x: endX, y: endY })
    return points
  }

  const generateLightningBolt = useCallback((): LightningBolt => {
    // Start from clouds area (top 20% of screen)
    const startX = 20 + Math.random() * 60 // More centered starting position
    const startY = -2 + Math.random() * 8  // Start from cloud layer
    
    // End position with limited horizontal drift for more realistic vertical path
    const maxHorizontalDrift = 20 // Reduced from 40 for more vertical lightning
    const endX = startX + (Math.random() - 0.5) * maxHorizontalDrift
    const endY = 85 + Math.random() * 15
    
    // Generate main lightning path with optimal segment count
    const mainSegments = 15 + Math.floor(Math.random() * 8) // Reduced from 20-35
    const mainPath = generateJaggedPath(startX, startY, endX, endY, mainSegments)
    
    // Generate fewer, more realistic branches
    const branches: LightningBranch[] = []
    const numBranches = Math.floor(Math.random() * 2) + 1 // 1-2 branches (reduced from 2-5)
    
    for (let i = 0; i < numBranches; i++) {
      // Pick random point along main path (avoid first and last 25%)
      const branchIndex = Math.floor(mainPath.length * 0.25 + Math.random() * mainPath.length * 0.5)
      const branchStart = mainPath[branchIndex]
      
      if (branchStart) {
        // More realistic branch angles (20-45 degrees)
        const branchLength = 8 + Math.random() * 15 // Shorter branches
        const maxAngle = Math.PI * 0.25 // ±45 degrees (reduced from ±72)
        const angle = (Math.random() - 0.5) * maxAngle
        
        const branchEndX = branchStart.x + Math.cos(angle) * branchLength
        const branchEndY = branchStart.y + Math.sin(Math.abs(angle)) * branchLength + Math.random() * 5
        
        // Generate branch path with fewer segments
        const branchSegments = 4 + Math.floor(Math.random() * 4) // Reduced from 8-14
        const branchPath = generateJaggedPath(branchStart.x, branchStart.y, branchEndX, branchEndY, branchSegments)
        
        branches.push({
          points: branchPath,
          width: 0.2 + Math.random() * 0.25, // Thinner branches
          opacity: 0.7 + Math.random() * 0.2
        })
      }
    }

    return {
      id: `lightning-${Date.now()}-${Math.random()}`,
      mainPath,
      branches,
      opacity: 0.85 + Math.random() * 0.15,
      duration: 80 + Math.random() * 60 // Faster, more realistic duration
    }
  }, [])

  const triggerLightning = useCallback(() => {
    if (!enabled || reducedMotion) return

    const config = intensityConfig[intensity]
    // Always generate exactly 1 bolt for realism
    const newBolts = [generateLightningBolt()]

    setLightningBolts(newBolts)
    setIsFlashing(true)
    onLightningStrike?.(true)

    // Use configured duration for more realistic timing
    const flashDuration = config.duration
    setTimeout(() => {
      setLightningBolts([])
      setIsFlashing(false)
      onLightningStrike?.(false)
    }, flashDuration)
  }, [enabled, reducedMotion, intensity, generateLightningBolt, onLightningStrike])

  useEffect(() => {
    if (!enabled || reducedMotion) return

    const scheduleNext = () => {
      const config = frequencyConfig[frequency]
      const delay = config.minDelay + Math.random() * (config.maxDelay - config.minDelay)
      
      const timeoutId = setTimeout(() => {
        triggerLightning()
        scheduleNext()
      }, delay)
      
      // Return cleanup function
      return () => clearTimeout(timeoutId)
    }

    const cleanup = scheduleNext()
    
    // Cleanup on unmount or dependency change
    return cleanup
  }, [enabled, reducedMotion, frequency, triggerLightning])

  if (!enabled || reducedMotion) return null

  return (
    <div className={cn("absolute inset-0 pointer-events-none", className)}>
      {/* Lightning flash overlay - Enhanced golden theme */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-100 bg-gradient-to-b from-yellow-50/30 via-yellow-200/15 to-amber-100/5",
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
            <stop offset="15%" stopColor="#fef3c7" stopOpacity="0.98" />
            <stop offset="40%" stopColor="#fbbf24" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0.65" />
          </linearGradient>
          <linearGradient id="lightningCore" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="30%" stopColor="#fef9c3" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.85" />
          </linearGradient>
          <filter id="lightningGlow">
            <feGaussianBlur stdDeviation="1.2" result="coloredBlur"/>
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
              {/* Main lightning bolt - realistic thickness */}
              <path
                d={mainPathD}
                stroke="url(#lightningGradient)"
                strokeWidth="0.5"
                fill="none"
                opacity={bolt.opacity}
                filter="url(#lightningGlow)"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* Bright core for main bolt - golden theme */}
              <path
                d={mainPathD}
                stroke="url(#lightningCore)"
                strokeWidth="0.2"
                fill="none"
                opacity={bolt.opacity * 0.9}
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
                      opacity={branch.opacity * bolt.opacity * 0.8}
                      filter="url(#lightningGlow)"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d={branchPathD}
                      stroke="url(#lightningCore)"
                      strokeWidth={branch.width * 0.5}
                      fill="none"
                      opacity={branch.opacity * bolt.opacity * 0.7}
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
      
      {/* Enhanced golden glow effects along main path */}
      {lightningBolts.map((bolt) => {
        // Create fewer, more subtle glow points for performance
        const glowPoints = bolt.mainPath.filter((_, index) => index % 4 === 0) // Every 4th point (reduced from 3rd)
        
        return glowPoints.map((point, index) => (
          <div
            key={`glow-${bolt.id}-${index}`}
            className="absolute rounded-full bg-gradient-to-r from-yellow-200/20 to-amber-300/15 blur-md"
            style={{
              left: `${point.x}%`,
              top: `${point.y}%`,
              width: `${intensityConfig[intensity].glowSize}px`,
              height: `${intensityConfig[intensity].glowSize}px`,
              opacity: bolt.opacity * 0.25, // Slightly reduced for subtlety
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