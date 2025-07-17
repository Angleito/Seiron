import React, { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface LightningEffectProps {
  className?: string
  frequency?: 'low' | 'medium' | 'high'
  intensity?: 'subtle' | 'normal' | 'intense'
  enabled?: boolean
  reducedMotion?: boolean
  onLightningStrike?: (isActive: boolean) => void
  triggerLightning?: boolean
  onTriggerComplete?: () => void
}

interface LightningPoint {
  x: number
  y: number
}

interface LightningBranch {
  points: LightningPoint[]
  width: number
  opacity: number
  generation: number
}

interface LightningBolt {
  id: string
  mainPath: LightningPoint[]
  branches: LightningBranch[]
  opacity: number
  duration: number
  phase: 'stepped-leader' | 'return-stroke' | 'complete'
  leaderProgress: number
  strokeWidth: number
}

export const LightningEffect = React.memo<LightningEffectProps>(({
  className,
  frequency = 'medium',
  intensity = 'normal',
  enabled = true,
  reducedMotion = false,
  onLightningStrike,
  triggerLightning = false,
  onTriggerComplete
}) => {
  const [lightningBolts, setLightningBolts] = useState<LightningBolt[]>([])

  // Poisson distribution lambda rates (strikes per second)
  const poissonLambda = {
    low: 0.015,    // 0.015 strikes/sec = average 67 seconds between strikes
    medium: 0.035, // 0.035 strikes/sec = average 29 seconds between strikes  
    high: 0.07     // 0.07 strikes/sec = average 14 seconds between strikes
  }

  const intensityConfig = {
    subtle: { maxBolts: 1, flashIntensity: 0.08, glowSize: 6, duration: 80, baseWidth: 1.5 },
    normal: { maxBolts: 1, flashIntensity: 0.15, glowSize: 10, duration: 120, baseWidth: 2.5 },
    intense: { maxBolts: 1, flashIntensity: 0.25, glowSize: 14, duration: 150, baseWidth: 4 }
  }

  // Fractal lightning path generation using recursive mid-point displacement
  const generateFractalPath = (start: LightningPoint, end: LightningPoint, roughness = 30, depth = 6): LightningPoint[] => {
    if (depth === 0) return [start, end]
    
    const mid: LightningPoint = {
      x: (start.x + end.x) / 2 + (Math.random() - 0.5) * roughness,
      y: (start.y + end.y) / 2 + (Math.random() - 0.5) * roughness
    }
    
    return [
      ...generateFractalPath(start, mid, roughness * 0.55, depth - 1).slice(0, -1),
      ...generateFractalPath(mid, end, roughness * 0.55, depth - 1)
    ]
  }

  // Variable width calculation with tapering formula
  const calculateVariableWidth = (index: number, total: number, baseWidth: number): number => {
    if (total <= 1) return baseWidth
    return baseWidth * (1.2 - Math.pow(index / total, 2))
  }

  // Simple, truly random lightning path generation (legacy - kept for reference)
  const generateRandomLightningPath = (startX: number, startY: number, endX: number, endY: number, segments: number = 15): LightningPoint[] => {
    const points: LightningPoint[] = []
    points.push({ x: startX, y: startY })
    
    for (let i = 1; i < segments; i++) {
      const progress = i / segments
      
      // Simple linear progression with random deviations
      const baseX = startX + (endX - startX) * progress
      const baseY = startY + (endY - startY) * progress
      
      // Random horizontal deviation - much simpler and more natural
      const maxDeviation = 15 * (1 - Math.abs(progress - 0.5) * 2) // More deviation in middle
      const randomX = baseX + (Math.random() - 0.5) * maxDeviation
      const randomY = baseY + (Math.random() - 0.5) * 5 // Small vertical randomness
      
      points.push({ x: randomX, y: randomY })
    }
    
    points.push({ x: endX, y: endY })
    return points
  }

  // Advanced probabilistic branching system with recursive depth and visual tapering
  const generateAdvancedBranches = (
    mainPath: LightningPoint[], 
    parentRoughness: number = 20, 
    generation: number = 0,
    maxGeneration: number = 2
  ): LightningBranch[] => {
    const branches: LightningBranch[] = []
    
    // Performance limit: don't exceed max generation depth
    if (generation > maxGeneration) return branches
    
    // Calculate visual tapering for this generation
    const widthMultiplier = Math.pow(0.6, generation + 1)
    const opacityMultiplier = Math.pow(0.65, generation + 1)
    
    // Per-segment branching: iterate through path segments
    for (let i = 0; i < mainPath.length - 1; i++) {
      // 12% probability per segment to spawn a branch
      if (Math.random() < 0.12) {
        const segmentStart = mainPath[i]
        const segmentEnd = mainPath[i + 1]
        
        // Skip if either point is undefined
        if (!segmentStart || !segmentEnd) continue
        
        // Calculate parent segment direction vector for direction inheritance
        const segmentDx = segmentEnd.x - segmentStart.x
        const segmentDy = segmentEnd.y - segmentStart.y
        const segmentAngle = Math.atan2(segmentDy, segmentDx)
        
        // Branch angle deviation from parent direction (±45 degrees)
        const angleDeviation = (Math.random() - 0.5) * Math.PI * 0.5
        const branchAngle = segmentAngle + angleDeviation
        
        // Branch length decreases with generation
        const baseLength = 12 + Math.random() * 18
        const generationLengthMultiplier = Math.pow(0.7, generation)
        const branchLength = baseLength * generationLengthMultiplier
        
        // Calculate branch end point
        const branchEndX = segmentStart.x + Math.cos(branchAngle) * branchLength
        const branchEndY = segmentStart.y + Math.sin(branchAngle) * branchLength
        
        // Generate fractal branch path with reduced depth and roughness
        const branchRoughness = parentRoughness * 0.7
        const branchDepth = Math.max(2, 6 - 2 * (generation + 1)) // depth 4, 2, 0 for generations 0, 1, 2
        const branchPath = generateFractalPath(
          { x: segmentStart.x, y: segmentStart.y },
          { x: branchEndX, y: branchEndY },
          branchRoughness,
          branchDepth
        )
        
        // Create branch with visual tapering
        const branch: LightningBranch = {
          points: branchPath,
          width: (0.1 + Math.random() * 0.1) * widthMultiplier,
          opacity: (0.5 + Math.random() * 0.3) * opacityMultiplier,
          generation: generation + 1
        }
        
        branches.push(branch)
        
        // Recursive sub-branching: branches can spawn their own branches
        if (generation < maxGeneration && Math.random() < 0.4) { // 40% chance for sub-branches
          const subBranches = generateAdvancedBranches(
            branchPath, 
            branchRoughness, 
            generation + 1, 
            maxGeneration
          )
          branches.push(...subBranches)
        }
        
        // Performance limit: cap total branches per generation
        if (branches.length >= 8) break
      }
    }
    
    return branches
  }

  const generateLightningBolt = useCallback((): LightningBolt => {
    // Simple random starting and ending positions
    const startX = 20 + Math.random() * 60 // Random start across top
    const startY = 0 + Math.random() * 5   // Start from top
    
    // Random ground target
    const endX = 25 + Math.random() * 50 // Random end position
    const endY = 85 + Math.random() * 10  // End near bottom
    
    // Generate fractal path with appropriate roughness and depth
    const roughness = 15 + Math.random() * 20 // 15-35 roughness for natural variation
    const depth = 6 // Main path uses depth 6 as specified
    const mainPath = generateFractalPath({ x: startX, y: startY }, { x: endX, y: endY }, roughness, depth)
    
    // Generate advanced branches with probabilistic system
    const branches = generateAdvancedBranches(mainPath, roughness)
    
    return {
      id: `lightning-${Date.now()}-${Math.random()}`,
      mainPath,
      branches,
      opacity: 0.8 + Math.random() * 0.2,
      duration: 100 + Math.random() * 50,
      phase: 'return-stroke' as const, // Skip complex phases
      leaderProgress: 1,
      strokeWidth: 0.2 + Math.random() * 0.2
    }
  }, [])

  // Poisson distribution delay generation for realistic lightning timing
  const generatePoissonDelay = useCallback((lambda: number): number => {
    // Poisson process: -ln(1-U)/λ transforms uniform random to exponential inter-arrival times
    const uniformRandom = Math.random()
    const poissonDelay = -Math.log(1 - uniformRandom) / lambda * 1000 // convert to milliseconds
    return poissonDelay
  }, [])

  // Global screen flash function for realistic lightning atmosphere
  const triggerScreenFlash = useCallback(() => {
    const flashOverlay = document.createElement('div')
    flashOverlay.className = 'screen-flash-lightning active'
    flashOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(136,221,255,0.4) 20%, rgba(0,153,255,0.2) 40%, transparent 60%);
      opacity: 0;
      pointer-events: none;
      z-index: 9999;
      mix-blend-mode: screen;
    `
    document.body.appendChild(flashOverlay)
    
    // Flash animation timing
    requestAnimationFrame(() => {
      flashOverlay.style.opacity = '0.8'
      setTimeout(() => {
        flashOverlay.style.opacity = '0'
        setTimeout(() => {
          document.body.removeChild(flashOverlay)
        }, 60)
      }, 60)
    })
  }, [])

  const triggerLightningStrike = useCallback(() => {
    if (!enabled || reducedMotion) return

    const config = intensityConfig[intensity]
    const newBolt = generateLightningBolt()

    // Add lightning bolt with CSS animation
    setLightningBolts([newBolt])
    onLightningStrike?.(true)

    // Trigger screen flashes at animation peaks (0ms and 200ms)
    triggerScreenFlash() // Initial flash at 0%
    setTimeout(() => {
      triggerScreenFlash() // Return stroke flash at 40% (200ms into 500ms animation)
    }, 200)

    // Remove bolt after animation completes (500ms)
    setTimeout(() => {
      setLightningBolts([])
      onLightningStrike?.(false)
    }, 500)
  }, [enabled, reducedMotion, intensity, generateLightningBolt, onLightningStrike, triggerScreenFlash])

  useEffect(() => {
    if (!enabled || reducedMotion) return

    let timeoutId: NodeJS.Timeout

    const scheduleNext = () => {
      const lambda = poissonLambda[frequency]
      const nextDelay = generatePoissonDelay(lambda)
      
      timeoutId = setTimeout(() => {
        triggerLightningStrike()
        scheduleNext()
      }, nextDelay)
    }

    scheduleNext()
    
    // Cleanup on unmount or dependency change
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [enabled, reducedMotion, frequency, triggerLightningStrike, generatePoissonDelay])

  // Handle external lightning triggers (e.g., from button clicks)
  useEffect(() => {
    if (triggerLightning && enabled && !reducedMotion) {
      // Add small pre-strike delay for realism (atmospheric buildup)
      // Use a very high lambda for short delay: 50 strikes/sec = ~20ms average
      const preStrikeDelay = generatePoissonDelay(50) 
      
      setTimeout(() => {
        triggerLightningStrike()
        onTriggerComplete?.() // Notify parent that trigger is complete
      }, preStrikeDelay)
    }
  }, [triggerLightning, enabled, reducedMotion, triggerLightningStrike, onTriggerComplete, generatePoissonDelay])

  if (!enabled || reducedMotion) return null

  return (
    <div className={cn("absolute inset-0 pointer-events-none", className)}>
      {/* Lightning bolts */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ zIndex: 40 }}>
        <defs>
          <linearGradient id="lightningGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="30%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#e6e6fa" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#d1d5db" stopOpacity="0.5" />
          </linearGradient>
          {/* Enhanced lightning glow filter with stronger atmospheric effect */}
          <filter id="lightningGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          {/* Inner core layer - crisp rendering for sharp lightning core */}
          <filter id="innerCore">
            <feGaussianBlur stdDeviation="0.2" result="sharpCore"/>
            <feMerge>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          {/* Legacy outer glow filter - kept for backward compatibility */}
          <filter id="outerGlow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {lightningBolts.map((bolt) => {
          const baseWidth = intensityConfig[intensity].baseWidth
          
          return (
            <g 
              key={bolt.id} 
              style={{ 
                mixBlendMode: 'screen',
                animation: 'multiFlash 0.5s steps(1,end)'
              }}
            >
              {/* Outer glow layer for main path */}
              {bolt.mainPath.map((point, index) => {
                if (index === bolt.mainPath.length - 1) return null
                const nextPoint = bolt.mainPath[index + 1]
                if (!nextPoint) return null
                const segmentWidth = calculateVariableWidth(index, bolt.mainPath.length - 1, baseWidth)
                const outerWidth = segmentWidth * 1.8
                
                return (
                  <line
                    key={`outer-main-${index}`}
                    x1={point.x}
                    y1={point.y}
                    x2={nextPoint.x}
                    y2={nextPoint.y}
                    stroke="#88ddff"
                    strokeWidth={outerWidth}
                    opacity={0.4 * bolt.opacity}
                    filter="url(#lightningGlow)"
                    strokeLinecap="round"
                  />
                )
              })}
              
              {/* Inner core layer for main path */}
              {bolt.mainPath.map((point, index) => {
                if (index === bolt.mainPath.length - 1) return null
                const nextPoint = bolt.mainPath[index + 1]
                if (!nextPoint) return null
                const segmentWidth = calculateVariableWidth(index, bolt.mainPath.length - 1, baseWidth)
                
                return (
                  <line
                    key={`inner-main-${index}`}
                    x1={point.x}
                    y1={point.y}
                    x2={nextPoint.x}
                    y2={nextPoint.y}
                    stroke="#ffffff"
                    strokeWidth={segmentWidth}
                    opacity={bolt.opacity}
                    filter="url(#innerCore)"
                    strokeLinecap="round"
                  />
                )
              })}
              
              {/* Dual-layer rendering for branches */}
              {bolt.branches.map((branch, branchIndex) => (
                <g key={`branch-${branchIndex}-gen${branch.generation}`}>
                  {/* Outer glow layer for branch */}
                  {branch.points.map((point, index) => {
                    if (index === branch.points.length - 1) return null
                    const nextPoint = branch.points[index + 1]
                    if (!nextPoint) return null
                    const branchBaseWidth = baseWidth * Math.pow(0.6, branch.generation)
                    const segmentWidth = calculateVariableWidth(index, branch.points.length - 1, branchBaseWidth)
                    const outerWidth = segmentWidth * 1.8
                    
                    return (
                      <line
                        key={`outer-branch-${branchIndex}-${index}`}
                        x1={point.x}
                        y1={point.y}
                        x2={nextPoint.x}
                        y2={nextPoint.y}
                        stroke="#88ddff"
                        strokeWidth={outerWidth}
                        opacity={0.4 * branch.opacity * bolt.opacity}
                        filter="url(#lightningGlow)"
                        strokeLinecap="round"
                      />
                    )
                  })}
                  
                  {/* Inner core layer for branch */}
                  {branch.points.map((point, index) => {
                    if (index === branch.points.length - 1) return null
                    const nextPoint = branch.points[index + 1]
                    if (!nextPoint) return null
                    const branchBaseWidth = baseWidth * Math.pow(0.6, branch.generation)
                    const segmentWidth = calculateVariableWidth(index, branch.points.length - 1, branchBaseWidth)
                    
                    return (
                      <line
                        key={`inner-branch-${branchIndex}-${index}`}
                        x1={point.x}
                        y1={point.y}
                        x2={nextPoint.x}
                        y2={nextPoint.y}
                        stroke="#ffffff"
                        strokeWidth={segmentWidth}
                        opacity={branch.opacity * bolt.opacity}
                        filter="url(#innerCore)"
                        strokeLinecap="round"
                      />
                    )
                  })}
                </g>
              ))}
            </g>
          )
        })}
      </svg>
      
      {/* Simple glow effects */}
      {lightningBolts.map((bolt) => {
        // Simple glow points - much less complex
        const glowPoints = bolt.mainPath.filter((_, index) => index % 5 === 0) // Every 5th point
        
        return glowPoints.map((point, index) => (
          <div
            key={`glow-${bolt.id}-${index}`}
            className="absolute rounded-full bg-white/20 blur-sm pointer-events-none"
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