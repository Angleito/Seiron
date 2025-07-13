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

  const generateJaggedPath = (startX: number, startY: number, endX: number, endY: number, segments: number = 20): LightningPoint[] => {
    const points: LightningPoint[] = []
    points.push({ x: startX, y: startY })
    
    for (let i = 1; i < segments; i++) {
      const progress = i / segments
      const baseX = startX + (endX - startX) * progress
      const baseY = startY + (endY - startY) * progress
      
      // Enhanced jagged pattern with more aggressive deviations
      const maxHorizontalDeviation = 8 // Increased for more dramatic jaggedness
      const maxVerticalDeviation = 4 // Increased for more erratic path
      
      // Create sharper, more angular deviations
      const sharpnessFactor = Math.pow(Math.sin(progress * Math.PI * 2), 2) // Creates multiple sharp peaks
      const randomFactor = Math.random() > 0.7 ? 2 : 1 // 30% chance of extra sharp deviation
      
      const offsetX = (Math.random() - 0.5) * maxHorizontalDeviation * sharpnessFactor * randomFactor
      const offsetY = (Math.random() - 0.5) * maxVerticalDeviation * sharpnessFactor * randomFactor
      
      // Add micro-jaggedness between major points
      const microJag = i % 3 === 0 ? (Math.random() - 0.5) * 2 : 0
      
      points.push({
        x: baseX + offsetX + microJag,
        y: baseY + offsetY + microJag * 0.5
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
    
    // Generate main lightning path with more segments for jaggedness
    const mainSegments = 25 + Math.floor(Math.random() * 15) // Increased for more detailed jagged pattern
    const mainPath = generateJaggedPath(startX, startY, endX, endY, mainSegments)
    
    // Generate realistic fractal branches
    const branches: LightningBranch[] = []
    const numBranches = Math.floor(Math.random() * 3) + 2 // 2-4 branches for more realistic pattern
    
    // Create primary branches from different points on main path
    const primaryBranchPoints = [0.3, 0.5, 0.7] // Top, middle, bottom thirds
    
    for (let i = 0; i < numBranches; i++) {
      const progressPoint = primaryBranchPoints[i % primaryBranchPoints.length] + (Math.random() - 0.5) * 0.1
      const branchIndex = Math.floor(mainPath.length * progressPoint)
      const branchStart = mainPath[branchIndex]
      
      if (branchStart) {
        // Realistic branching with physics-based angles
        const branchLength = 6 + Math.random() * 12
        const baseAngle = Math.PI * 0.15 + Math.random() * Math.PI * 0.2 // 27-63 degrees
        const angle = Math.random() > 0.5 ? baseAngle : -baseAngle // Random left/right
        
        const branchEndX = branchStart.x + Math.cos(angle) * branchLength
        const branchEndY = branchStart.y + Math.sin(Math.abs(angle)) * branchLength * 0.8 + Math.random() * 3
        
        // Generate highly jagged branch path
        const branchSegments = 10 + Math.floor(Math.random() * 8)
        const branchPath = generateJaggedPath(branchStart.x, branchStart.y, branchEndX, branchEndY, branchSegments)
        
        branches.push({
          points: branchPath,
          width: 0.08 + Math.random() * 0.15, // Ultra-thin branches
          opacity: 0.5 + Math.random() * 0.4
        })
        
        // Add secondary micro-branches (fractal pattern)
        if (Math.random() > 0.6 && branchPath.length > 5) {
          const microBranchStart = branchPath[Math.floor(branchPath.length * 0.6)]
          const microLength = 3 + Math.random() * 6
          const microAngle = angle + (Math.random() - 0.5) * Math.PI * 0.3
          
          const microEndX = microBranchStart.x + Math.cos(microAngle) * microLength
          const microEndY = microBranchStart.y + Math.sin(Math.abs(microAngle)) * microLength * 0.6
          
          const microSegments = 4 + Math.floor(Math.random() * 4)
          const microPath = generateJaggedPath(microBranchStart.x, microBranchStart.y, microEndX, microEndY, microSegments)
          
          branches.push({
            points: microPath,
            width: 0.05 + Math.random() * 0.08, // Extremely thin micro-branches
            opacity: 0.3 + Math.random() * 0.3
          })
        }
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
              {/* Main lightning bolt - ultra-thin realistic thickness */}
              <path
                d={mainPathD}
                stroke="url(#lightningGradient)"
                strokeWidth="0.3"
                fill="none"
                opacity={bolt.opacity}
                filter="url(#lightningGlow)"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* Bright core for main bolt - even thinner core */}
              <path
                d={mainPathD}
                stroke="url(#lightningCore)"
                strokeWidth="0.1"
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
                      strokeWidth={branch.width * 0.4}
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