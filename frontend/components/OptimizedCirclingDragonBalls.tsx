'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAnimationPerformance, QUALITY_FEATURES } from '../hooks/useAnimationPerformance'

interface OptimizedCirclingDragonBallsProps {
  radius?: number
  ballSize?: number
  speed?: 'slow' | 'normal' | 'fast'
  className?: string
  interactive?: boolean
  enablePerformanceMonitoring?: boolean
  onQualityChange?: (level: 'low' | 'medium' | 'high') => void
}

const speedConfig = {
  slow: 20000,  // 20s in ms
  normal: 15000, // 15s in ms
  fast: 10000   // 10s in ms
}

// Optimized physics simulation for orbital motion
class DragonBallPhysics {
  private balls: Array<{
    angle: number
    velocity: number
    radius: number
    targetRadius: number
  }> = []
  
  constructor(count: number, baseRadius: number) {
    for (let i = 0; i < count; i++) {
      this.balls.push({
        angle: (i * 360 / count) * Math.PI / 180,
        velocity: 1,
        radius: baseRadius,
        targetRadius: baseRadius
      })
    }
  }
  
  update(deltaTime: number, isHovered: boolean, qualityLevel: string) {
    const speedMultiplier = isHovered ? 2 : 1
    const physicsEnabled = qualityLevel === 'high'
    
    this.balls.forEach((ball, index) => {
      // Update angle
      ball.angle += (ball.velocity * speedMultiplier * deltaTime) / 1000
      
      // Apply physics only on high quality
      if (physicsEnabled && isHovered) {
        // Orbital eccentricity
        ball.targetRadius = 150 + Math.sin(ball.angle * 2) * 20
        ball.radius += (ball.targetRadius - ball.radius) * 0.1
        
        // Varying speeds
        ball.velocity = 1 + Math.sin(ball.angle + index) * 0.2
      }
    })
  }
  
  getPositions() {
    return this.balls.map(ball => ({
      x: Math.cos(ball.angle) * ball.radius,
      y: Math.sin(ball.angle) * ball.radius,
      scale: 1 + (ball.radius - 150) / 100 // Scale based on distance
    }))
  }
}

export function OptimizedCirclingDragonBalls({ 
  radius = 150, 
  ballSize = 32, 
  speed = 'normal',
  className = '',
  interactive = true,
  enablePerformanceMonitoring = true,
  onQualityChange
}: OptimizedCirclingDragonBallsProps) {
  const [isHovered, setIsHovered] = useState(false)
  const animationRef = useRef<number>()
  const lastTimeRef = useRef<number>(0)
  const physicsRef = useRef<DragonBallPhysics>()
  const containerRef = useRef<HTMLDivElement>(null)
  const [ballPositions, setBallPositions] = useState<Array<{x: number, y: number, scale: number}>>([])
  
  const {
    qualityLevel,
    shouldReduceMotion,
    startMonitoring,
    stopMonitoring
  } = useAnimationPerformance()
  
  const features = QUALITY_FEATURES[qualityLevel]
  
  // Initialize physics engine
  useEffect(() => {
    physicsRef.current = new DragonBallPhysics(7, radius)
  }, [radius])
  
  // Notify parent of quality changes
  useEffect(() => {
    onQualityChange?.(qualityLevel)
  }, [qualityLevel, onQualityChange])
  
  // Performance monitoring
  useEffect(() => {
    if (!enablePerformanceMonitoring) return
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            startMonitoring()
          } else {
            stopMonitoring()
          }
        })
      },
      { threshold: 0.1 }
    )
    
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }
    
    return () => {
      observer.disconnect()
      stopMonitoring()
    }
  }, [enablePerformanceMonitoring, startMonitoring, stopMonitoring])
  
  // Animation loop for physics-based movement (high quality only)
  const animate = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp
    
    const deltaTime = timestamp - lastTimeRef.current
    lastTimeRef.current = timestamp
    
    if (physicsRef.current && features.complexPhysics && !shouldReduceMotion) {
      physicsRef.current.update(deltaTime, isHovered, qualityLevel)
      setBallPositions(physicsRef.current.getPositions())
    }
    
    if (features.complexPhysics) {
      animationRef.current = requestAnimationFrame(animate)
    }
  }, [features.complexPhysics, isHovered, qualityLevel, shouldReduceMotion])
  
  // Start/stop animation based on quality level
  useEffect(() => {
    if (features.complexPhysics && !shouldReduceMotion) {
      animationRef.current = requestAnimationFrame(animate)
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [features.complexPhysics, animate, shouldReduceMotion])

  // Dragon Ball star patterns
  const dragonBalls = [
    { stars: 1, color: 'from-yellow-400 to-orange-400' },
    { stars: 2, color: 'from-orange-400 to-red-400' },
    { stars: 3, color: 'from-yellow-300 to-yellow-500' },
    { stars: 4, color: 'from-orange-300 to-orange-500' },
    { stars: 5, color: 'from-yellow-400 to-orange-400' },
    { stars: 6, color: 'from-orange-400 to-red-400' },
    { stars: 7, color: 'from-yellow-300 to-yellow-500' }
  ]
  
  const animationDuration = isHovered ? speedConfig.fast : speedConfig[speed]

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
      style={{ 
        width: `${radius * 2}px`, 
        height: `${radius * 2}px`,
        contain: 'layout style paint',
        transform: 'translateZ(0)', // Force GPU layer
      }}
      onMouseEnter={() => interactive && setIsHovered(true)}
      onMouseLeave={() => interactive && setIsHovered(false)}
    >
      {/* Orbital Path Ring - only on medium/high quality */}
      {features.glowEffects && (
        <div 
          className="absolute border border-yellow-400/20 rounded-full animate-pulse"
          style={{
            width: `${radius * 2}px`,
            height: `${radius * 2}px`,
            top: 0,
            left: 0,
            willChange: 'opacity',
          }}
        />
      )}

      {/* Dragon Balls Container */}
      {features.complexPhysics ? (
        // Physics-based positioning for high quality
        <div className="absolute inset-0">
          {dragonBalls.map((ball, index) => {
            const position = ballPositions[index] || { x: 0, y: 0, scale: 1 }
            return (
              <div
                key={index}
                className="absolute"
                style={{
                  width: `${ballSize}px`,
                  height: `${ballSize}px`,
                  transform: `translate(${radius + position.x - ballSize/2}px, ${radius + position.y - ballSize/2}px) scale(${position.scale})`,
                  willChange: 'transform',
                }}
              >
                <DragonBall 
                  ball={ball} 
                  size={ballSize}
                  features={features}
                  qualityLevel={qualityLevel}
                  index={index}
                />
              </div>
            )
          })}
        </div>
      ) : (
        // CSS-based animation for low/medium quality
        <div 
          className={`absolute inset-0 ${shouldReduceMotion ? '' : (isHovered ? 'animate-dragon-balls-fast' : 'animate-dragon-balls-orbit')}`}
          style={{ 
            animationDuration: shouldReduceMotion ? '0s' : `${animationDuration}ms`,
            willChange: features.dragonBallOrbit ? 'transform' : 'auto',
          }}
        >
          {dragonBalls.map((ball, index) => (
            <div
              key={index}
              className="absolute"
              style={{
                width: `${ballSize}px`,
                height: `${ballSize}px`,
                transform: `rotate(${index * 51.43}deg) translateX(${radius}px) rotate(-${index * 51.43}deg)`,
                transformOrigin: `${radius}px ${radius}px`,
                top: `${radius - ballSize / 2}px`,
                left: `${radius - ballSize / 2}px`,
              }}
            >
              <DragonBall 
                ball={ball} 
                size={ballSize}
                features={features}
                qualityLevel={qualityLevel}
                index={index}
              />
            </div>
          ))}
        </div>
      )}

      {/* Central energy burst - only on medium/high quality */}
      {features.glowEffects && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 bg-gradient-to-r from-red-400 to-orange-400 rounded-full animate-power-pulse" />
        </div>
      )}

      {/* Power level indicator */}
      {isHovered && interactive && features.glowEffects && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="px-3 py-1 bg-red-900/80 text-yellow-400 text-xs font-bold rounded-full border border-yellow-400/50">
            Power Level: {qualityLevel === 'high' ? 'Over 9000!' : qualityLevel === 'medium' ? '5000' : '1000'}
          </div>
        </div>
      )}
    </div>
  )
}

// Separate DragonBall component for better performance
function DragonBall({ 
  ball, 
  features, 
  qualityLevel, 
  index 
}: { 
  ball: { stars: number; color: string }
  size: number
  features: typeof QUALITY_FEATURES[keyof typeof QUALITY_FEATURES]
  qualityLevel: string
  index: number
}) {
  return (
    <div className={`
      w-full h-full rounded-full relative overflow-hidden
      bg-gradient-to-br ${ball.color}
      transition-transform duration-300
      ${features.dragonBallFloat ? 'animate-dragon-ball-float' : ''}
      ${features.shadowEffects ? 'shadow-lg' : ''}
    `}
    style={{ 
      animationDelay: features.dragonBallFloat ? `${index * 0.3}s` : '0s',
      willChange: features.dragonBallFloat ? 'transform' : 'auto',
    }}
    >
      {/* Stars inside the ball */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-red-600 text-xs font-bold leading-none">
          {qualityLevel === 'low' ? (
            <span>{ball.stars}</span>
          ) : (
            Array.from({ length: ball.stars }, (_, i) => (
              <span 
                key={i} 
                className={features.glowEffects ? "inline-block animate-star-twinkle" : "inline-block"}
                style={{ animationDelay: features.glowEffects ? `${i * 0.2}s` : '0s' }}
              >
                ★
              </span>
            ))
          )}
        </div>
      </div>

      {/* Ball highlight - only on medium/high quality */}
      {features.glowEffects && (
        <div className="absolute top-1 left-1 w-2 h-2 bg-yellow-200 rounded-full opacity-80" />
      )}

      {/* Mystical glow - only on high quality */}
      {features.glowEffects && qualityLevel === 'high' && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400/30 to-transparent animate-mystical-glow" />
      )}

      {/* Particle trail effect - only on high quality */}
      {features.trailEffects && (
        <div className="absolute -inset-1 rounded-full bg-yellow-400/20 blur-sm animate-pulse" />
      )}
    </div>
  )
}