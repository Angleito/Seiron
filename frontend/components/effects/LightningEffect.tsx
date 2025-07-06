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

interface LightningBolt {
  id: string
  x: number
  y: number
  width: number
  height: number
  opacity: number
  duration: number
  branches: Array<{
    x1: number
    y1: number
    x2: number
    y2: number
  }>
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
    low: { minDelay: 8000, maxDelay: 15000 },
    medium: { minDelay: 4000, maxDelay: 8000 },
    high: { minDelay: 2000, maxDelay: 5000 }
  }

  const intensityConfig = {
    subtle: { maxBolts: 1, flashIntensity: 0.1, glowSize: 20 },
    normal: { maxBolts: 2, flashIntensity: 0.2, glowSize: 40 },
    intense: { maxBolts: 3, flashIntensity: 0.35, glowSize: 60 }
  }

  const generateLightningBolt = useCallback((): LightningBolt => {
    const x = Math.random() * 100
    const y = Math.random() * 30
    const width = 2 + Math.random() * 4
    const height = 40 + Math.random() * 60
    const branches = []
    
    // Generate main bolt path
    const segments = 8 + Math.floor(Math.random() * 12)
    for (let i = 0; i < segments; i++) {
      const progress = i / segments
      const baseX = x + (Math.random() - 0.5) * 20
      const baseY = y + progress * height
      
      // Add some branching
      if (Math.random() < 0.3) {
        branches.push({
          x1: baseX,
          y1: baseY,
          x2: baseX + (Math.random() - 0.5) * 30,
          y2: baseY + Math.random() * 20
        })
      }
    }

    return {
      id: `lightning-${Date.now()}-${Math.random()}`,
      x,
      y,
      width,
      height,
      opacity: 0.8 + Math.random() * 0.2,
      duration: 150 + Math.random() * 100,
      branches
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
      <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 40 }}>
        <defs>
          <linearGradient id="lightningGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0.6" />
          </linearGradient>
          <filter id="lightningGlow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {lightningBolts.map((bolt) => (
          <g key={bolt.id}>
            {/* Main bolt */}
            <path
              d={`M${bolt.x}% ${bolt.y}% L${bolt.x + (Math.random() - 0.5) * 2}% ${bolt.y + bolt.height * 0.25}% L${bolt.x + (Math.random() - 0.5) * 4}% ${bolt.y + bolt.height * 0.5}% L${bolt.x + (Math.random() - 0.5) * 2}% ${bolt.y + bolt.height * 0.75}% L${bolt.x + (Math.random() - 0.5) * 3}% ${bolt.y + bolt.height}%`}
              stroke="url(#lightningGradient)"
              strokeWidth={bolt.width}
              fill="none"
              opacity={bolt.opacity}
              filter="url(#lightningGlow)"
            />
            
            {/* Branch bolts */}
            {bolt.branches.map((branch, index) => (
              <line
                key={index}
                x1={`${branch.x1}%`}
                y1={`${branch.y1}%`}
                x2={`${branch.x2}%`}
                y2={`${branch.y2}%`}
                stroke="url(#lightningGradient)"
                strokeWidth={bolt.width * 0.6}
                opacity={bolt.opacity * 0.7}
                filter="url(#lightningGlow)"
              />
            ))}
          </g>
        ))}
      </svg>
      
      {/* Glow effects */}
      {lightningBolts.map((bolt) => (
        <div
          key={`glow-${bolt.id}`}
          className="absolute rounded-full bg-yellow-400/20 blur-2xl"
          style={{
            left: `${bolt.x}%`,
            top: `${bolt.y}%`,
            width: `${intensityConfig[intensity].glowSize}px`,
            height: `${bolt.height}%`,
            opacity: bolt.opacity * 0.5,
            transform: 'translate(-50%, -50%)',
            zIndex: 35
          }}
        />
      ))}
    </div>
  )
})

LightningEffect.displayName = 'LightningEffect'

export default LightningEffect