'use client'

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { useDragonInteraction } from './dragon/DragonInteractionController'
import {
  DragonBallState,
  Vector2D,
  calculateEllipticalOrbit,
  calculateGravitationalForce,
  calculateSpringForce,
  calculateRepulsionForce,
  detectCollision,
  resolveCollision,
  updateBallPhysics,
  calculateOrbitalSpeed,
  generateOrbitalParams,
  calculateWishPath,
  SpatialGrid
} from '@/utils/dragonBallPhysics'

interface DragonBallOrbitalSystemProps {
  radius?: number
  ballSize?: number
  className?: string
  onWishGranted?: () => void
  orbitalMode?: 'circular' | 'elliptical'
  showTrails?: boolean
  interactive?: boolean
}

// Dragon ball configurations
const DRAGON_BALLS = [
  { id: 1, stars: 1, color: 'from-yellow-400 to-orange-400', mass: 1 },
  { id: 2, stars: 2, color: 'from-orange-400 to-red-400', mass: 1.1 },
  { id: 3, stars: 3, color: 'from-yellow-300 to-yellow-500', mass: 0.9 },
  { id: 4, stars: 4, color: 'from-orange-300 to-orange-500', mass: 1.2 },
  { id: 5, stars: 5, color: 'from-yellow-400 to-orange-400', mass: 0.8 },
  { id: 6, stars: 6, color: 'from-orange-400 to-red-400', mass: 1.3 },
  { id: 7, stars: 7, color: 'from-yellow-300 to-yellow-500', mass: 1.1 }
]

export function DragonBallOrbitalSystem({
  radius = 150,
  ballSize = 32,
  className = '',
  onWishGranted,
  orbitalMode = 'elliptical',
  showTrails = true,
  interactive = true
}: DragonBallOrbitalSystemProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number>()
  const lastTimeRef = useRef<number>(0)
  const spatialGrid = useRef(new SpatialGrid())
  
  const { state: dragonState, intensity, performanceMode } = useDragonInteraction()
  
  // Initialize dragon balls with orbital parameters
  const [dragonBalls, setDragonBalls] = useState<DragonBallState[]>(() => 
    DRAGON_BALLS.map((ball, index) => {
      const orbitalParams = generateOrbitalParams(index, DRAGON_BALLS.length)
      const initialPos = orbitalMode === 'elliptical' 
        ? calculateEllipticalOrbit(orbitalParams, 0)
        : {
            x: Math.cos(index * 2 * Math.PI / DRAGON_BALLS.length) * radius,
            y: Math.sin(index * 2 * Math.PI / DRAGON_BALLS.length) * radius
          }
      
      return {
        id: ball.id,
        position: initialPos,
        velocity: { x: 0, y: 0 },
        angle: index * 2 * Math.PI / DRAGON_BALLS.length,
        angularVelocity: calculateOrbitalSpeed(15, 0, intensity),
        orbitRadius: orbitalParams.semiMajorAxis,
        orbitEccentricity: orbitalParams.eccentricity,
        orbitSpeed: 1,
        mass: ball.mass,
        isHovered: false,
        isClicked: false,
        trail: []
      }
    })
  )
  
  const [clickPosition, setClickPosition] = useState<Vector2D | null>(null)
  const [isWishing, setIsWishing] = useState(false)
  const [wishProgress, setWishProgress] = useState(0)
  
  // Performance settings based on mode
  const trailEnabled = useMemo(() => 
    showTrails && performanceMode !== 'minimal',
    [showTrails, performanceMode]
  )
  
  const collisionEnabled = useMemo(() =>
    performanceMode === 'full',
    [performanceMode]
  )
  
  // Handle ball hover
  const handleBallHover = useCallback((ballId: number, isHovered: boolean) => {
    if (!interactive) return
    
    setDragonBalls(prev => prev.map(ball => 
      ball.id === ballId ? { ...ball, isHovered } : ball
    ))
  }, [interactive])
  
  // Handle ball click
  const handleBallClick = useCallback((ballId: number, event: React.MouseEvent) => {
    if (!interactive) return
    
    event.stopPropagation()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const clickPos = {
      x: event.clientX - rect.left - rect.width / 2,
      y: event.clientY - rect.top - rect.height / 2
    }
    
    setClickPosition(clickPos)
    setTimeout(() => setClickPosition(null), 500)
    
    // Check if all balls are close to center for wish granting
    const allNearCenter = dragonBalls.every(ball => {
      const dist = Math.sqrt(ball.position.x ** 2 + ball.position.y ** 2)
      return dist < 50
    })
    
    if (allNearCenter && !isWishing) {
      triggerWishAnimation()
    }
  }, [dragonBalls, isWishing, interactive])
  
  // Trigger wish-granting animation
  const triggerWishAnimation = useCallback(() => {
    setIsWishing(true)
    setWishProgress(0)
    
    // Animate wish progress
    const startTime = Date.now()
    const animateWish = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / 3000, 1) // 3 second animation
      
      setWishProgress(progress)
      
      if (progress < 1) {
        requestAnimationFrame(animateWish)
      } else {
        setIsWishing(false)
        onWishGranted?.()
      }
    }
    
    requestAnimationFrame(animateWish)
  }, [onWishGranted])
  
  // Physics update loop
  const updatePhysics = useCallback((currentTime: number) => {
    const deltaTime = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1) // Cap at 100ms
    lastTimeRef.current = currentTime
    
    if (!deltaTime || deltaTime <= 0) return
    
    // Clear spatial grid
    spatialGrid.current.clear()
    
    setDragonBalls(prevBalls => {
      const centerMass = dragonState === 'active' ? 2000 : 1000
      const newBalls = prevBalls.map((ball, index) => {
        // Add to spatial grid
        spatialGrid.current.add(ball)
        
        const forces: Vector2D[] = []
        
        if (isWishing) {
          // Wish animation - spiral to center
          const targetPos = calculateWishPath(
            ball.position,
            { x: 0, y: 0 },
            wishProgress
          )
          forces.push(calculateSpringForce(ball.position, targetPos, 0.3))
        } else {
          // Normal orbital motion
          const orbitalParams = generateOrbitalParams(index, DRAGON_BALLS.length)
          const time = currentTime / 1000
          const speed = calculateOrbitalSpeed(15, dragonState === 'active' ? 2 : 0, intensity)
          
          let targetPos: Vector2D
          if (orbitalMode === 'elliptical') {
            targetPos = calculateEllipticalOrbit(
              orbitalParams,
              time * speed,
              centerMass
            )
          } else {
            // Circular orbit
            const angle = ball.angle + ball.angularVelocity * deltaTime
            targetPos = {
              x: Math.cos(angle) * ball.orbitRadius,
              y: Math.sin(angle) * ball.orbitRadius
            }
          }
          
          // Orbital force (spring to ideal position)
          if (!ball.isHovered) {
            forces.push(calculateSpringForce(ball.position, targetPos, 0.1))
          }
          
          // Gravitational pull to center when dragon powers up
          if (dragonState === 'active' || dragonState === 'ready') {
            forces.push(calculateGravitationalForce(
              ball.position,
              { x: 0, y: 0 },
              ball.mass,
              centerMass * (dragonState === 'active' ? 0.2 : 0.1)
            ))
          }
          
          // Click repulsion
          if (clickPosition) {
            forces.push(calculateRepulsionForce(ball.position, clickPosition, 100))
          }
          
          // Hover lift
          if (ball.isHovered) {
            forces.push({ x: 0, y: -5 })
          }
        }
        
        // Update physics
        let updatedBall = updateBallPhysics(ball, forces, deltaTime)
        
        // Update angle for circular motion
        if (orbitalMode === 'circular' && !ball.isHovered && !isWishing) {
          updatedBall.angle += updatedBall.angularVelocity * deltaTime
        }
        
        return updatedBall
      })
      
      // Collision detection and response
      if (collisionEnabled && !isWishing) {
        for (let i = 0; i < newBalls.length; i++) {
          const nearbyBalls = spatialGrid.current.getNearby(newBalls[i].position)
          
          for (const other of nearbyBalls) {
            if (other.id <= newBalls[i].id) continue // Avoid duplicate checks
            
            const j = newBalls.findIndex(b => b.id === other.id)
            if (detectCollision(newBalls[i], newBalls[j], ballSize / 2)) {
              const { v1, v2 } = resolveCollision(newBalls[i], newBalls[j])
              newBalls[i].velocity = v1
              newBalls[j].velocity = v2
            }
          }
        }
      }
      
      return newBalls
    })
    
    // Continue animation
    animationFrameRef.current = requestAnimationFrame(updatePhysics)
  }, [dragonState, intensity, orbitalMode, clickPosition, isWishing, wishProgress, ballSize, collisionEnabled])
  
  // Start animation loop
  useEffect(() => {
    lastTimeRef.current = performance.now()
    animationFrameRef.current = requestAnimationFrame(updatePhysics)
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [updatePhysics])
  
  // Update orbital speeds based on dragon state
  useEffect(() => {
    const newSpeed = calculateOrbitalSpeed(15, dragonState === 'active' ? 2 : 0, intensity)
    setDragonBalls(prev => prev.map(ball => ({
      ...ball,
      angularVelocity: newSpeed * (1 + ball.id * 0.05) // Slight variation per ball
    })))
  }, [dragonState, intensity])
  
  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
      style={{ width: `${radius * 2}px`, height: `${radius * 2}px` }}
    >
      {/* Orbital rings visualization */}
      {orbitalMode === 'elliptical' && !isWishing && (
        <svg 
          className="absolute inset-0 pointer-events-none"
          width={radius * 2} 
          height={radius * 2}
          style={{ opacity: performanceMode === 'minimal' ? 0 : 0.2 }}
        >
          <g transform={`translate(${radius}, ${radius})`}>
            {dragonBalls.map((ball, index) => {
              const params = generateOrbitalParams(index, DRAGON_BALLS.length)
              return (
                <ellipse
                  key={ball.id}
                  cx="0"
                  cy="0"
                  rx={params.semiMajorAxis}
                  ry={params.semiMajorAxis * Math.sqrt(1 - params.eccentricity ** 2)}
                  fill="none"
                  stroke="rgba(251, 191, 36, 0.2)"
                  strokeWidth="1"
                  className="animate-pulse"
                />
              )
            })}
          </g>
        </svg>
      )}
      
      {/* Dragon Balls */}
      {dragonBalls.map((ball, index) => {
        const ballConfig = DRAGON_BALLS.find(b => b.id === ball.id)!
        
        return (
          <div key={ball.id}>
            {/* Trail effect */}
            {trailEnabled && ball.trail.length > 1 && (
              <svg 
                className="absolute inset-0 pointer-events-none"
                width={radius * 2} 
                height={radius * 2}
              >
                <g transform={`translate(${radius}, ${radius})`}>
                  <path
                    d={`M ${ball.trail.map((pos, i) => 
                      `${pos.x},${pos.y}`
                    ).join(' L ')}`}
                    fill="none"
                    stroke={`url(#trail-gradient-${ball.id})`}
                    strokeWidth="2"
                    strokeLinecap="round"
                    opacity={0.6}
                  />
                  <defs>
                    <linearGradient id={`trail-gradient-${ball.id}`}>
                      <stop offset="0%" stopColor="rgba(251, 191, 36, 0)" />
                      <stop offset="100%" stopColor="rgba(251, 191, 36, 0.8)" />
                    </linearGradient>
                  </defs>
                </g>
              </svg>
            )}
            
            {/* Dragon Ball */}
            <div
              className={`
                absolute rounded-full cursor-pointer
                transition-all duration-150
                ${ball.isHovered ? 'z-10' : 'z-0'}
              `}
              style={{
                width: `${ballSize}px`,
                height: `${ballSize}px`,
                transform: `translate(
                  ${radius + ball.position.x - ballSize / 2}px,
                  ${radius + ball.position.y - ballSize / 2}px
                ) scale(${ball.isHovered ? 1.2 : 1})`,
                filter: ball.isHovered 
                  ? 'drop-shadow(0 0 20px rgba(251, 191, 36, 0.8))' 
                  : dragonState === 'active'
                  ? 'drop-shadow(0 0 15px rgba(251, 191, 36, 0.6))'
                  : 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.4))'
              }}
              onMouseEnter={() => handleBallHover(ball.id, true)}
              onMouseLeave={() => handleBallHover(ball.id, false)}
              onClick={(e) => handleBallClick(ball.id, e)}
            >
              {/* Ball gradient */}
              <div className={`
                w-full h-full rounded-full relative overflow-hidden
                bg-gradient-to-br ${ballConfig.color}
                ${dragonState === 'active' ? 'animate-power-pulse' : ''}
              `}>
                {/* Stars */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-red-600 text-xs font-bold leading-none">
                    {Array.from({ length: ballConfig.stars }, (_, i) => (
                      <span 
                        key={i} 
                        className="inline-block animate-star-twinkle"
                        style={{ 
                          animationDelay: `${i * 0.2}s`,
                          animationDuration: isWishing ? '0.5s' : '3s'
                        }}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Highlight */}
                <div className="absolute top-1 left-1 w-2 h-2 bg-yellow-200 rounded-full opacity-80" />
                
                {/* Power glow */}
                {(dragonState === 'active' || dragonState === 'ready') && (
                  <div className="absolute inset-0 rounded-full bg-gradient-radial from-yellow-400/40 to-transparent animate-pulse" />
                )}
              </div>
            </div>
          </div>
        )
      })}
      
      {/* Central energy core */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className={`
          transition-all duration-500
          ${dragonState === 'active' 
            ? 'w-8 h-8 opacity-100' 
            : dragonState === 'ready'
            ? 'w-6 h-6 opacity-80'
            : 'w-4 h-4 opacity-60'
          }
          bg-gradient-radial from-red-500 to-orange-500 rounded-full
          ${dragonState === 'active' ? 'animate-power-surge' : 'animate-power-pulse'}
        `} />
      </div>
      
      {/* Wish granting effect */}
      {isWishing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div 
            className="absolute rounded-full bg-gradient-radial from-yellow-400/60 via-orange-400/40 to-transparent animate-ping"
            style={{
              width: `${(1 - wishProgress) * radius * 2}px`,
              height: `${(1 - wishProgress) * radius * 2}px`,
            }}
          />
          <div className="text-yellow-400 font-bold text-2xl animate-pulse">
            WISH GRANTED!
          </div>
        </div>
      )}
      
      {/* Power level indicator */}
      {dragonState !== 'idle' && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="px-3 py-1 bg-red-900/80 text-yellow-400 text-xs font-bold rounded-full border border-yellow-400/50">
            Power Level: {
              dragonState === 'active' ? 'MAXIMUM!' :
              dragonState === 'ready' ? 'Rising...' :
              'Detected'
            }
          </div>
        </div>
      )}
    </div>
  )
}