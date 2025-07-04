'use client'

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { useDragonInteraction } from './dragon/DragonInteractionController'
import { useOrbitalPerformance, useAdaptiveOrbitalQuality } from '@/hooks/useOrbitalPerformance'
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

interface OptimizedDragonBallOrbitalProps {
  radius?: number
  ballSize?: number
  className?: string
  onWishGranted?: () => void
  orbitalMode?: 'circular' | 'elliptical'
  showPerformanceStats?: boolean
}

// Optimized dragon ball configurations with reduced complexity
const DRAGON_BALLS = [
  { id: 1, stars: 1, color: 'from-yellow-400 to-orange-400', mass: 1 },
  { id: 2, stars: 2, color: 'from-orange-400 to-red-400', mass: 1.1 },
  { id: 3, stars: 3, color: 'from-yellow-300 to-yellow-500', mass: 0.9 },
  { id: 4, stars: 4, color: 'from-orange-300 to-orange-500', mass: 1.2 },
  { id: 5, stars: 5, color: 'from-yellow-400 to-orange-400', mass: 0.8 },
  { id: 6, stars: 6, color: 'from-orange-400 to-red-400', mass: 1.3 },
  { id: 7, stars: 7, color: 'from-yellow-300 to-yellow-500', mass: 1.1 }
]

export function OptimizedDragonBallOrbital({
  radius = 150,
  ballSize = 32,
  className = '',
  onWishGranted,
  orbitalMode = 'elliptical',
  showPerformanceStats = false
}: OptimizedDragonBallOrbitalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()
  const lastTimeRef = useRef<number>(0)
  const frameCountRef = useRef<number>(0)
  const spatialGrid = useRef(new SpatialGrid())
  
  const { state: dragonState, intensity, performanceMode } = useDragonInteraction()
  
  // Performance monitoring
  const { metrics, isOptimal } = useOrbitalPerformance({
    onPerformanceChange: (m) => {
      if (m.performanceScore < 70) {
        console.warn('Dragon Ball Orbital System performance degraded:', m)
      }
    }
  })
  
  const adaptiveQuality = useAdaptiveOrbitalQuality(metrics)
  
  // Initialize dragon balls
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
  
  const [hoveredBallId, setHoveredBallId] = useState<number | null>(null)
  const [clickPosition, setClickPosition] = useState<Vector2D | null>(null)
  const [isWishing, setIsWishing] = useState(false)
  const [wishProgress, setWishProgress] = useState(0)
  
  // Optimized physics update with frame skipping
  const updatePhysics = useCallback((currentTime: number) => {
    frameCountRef.current++
    
    // Skip frames based on adaptive quality
    if (frameCountRef.current % adaptiveQuality.updateRate !== 0) {
      animationFrameRef.current = requestAnimationFrame(updatePhysics)
      return
    }
    
    const deltaTime = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1)
    lastTimeRef.current = currentTime
    
    if (!deltaTime || deltaTime <= 0) {
      animationFrameRef.current = requestAnimationFrame(updatePhysics)
      return
    }
    
    // Clear spatial grid
    if (adaptiveQuality.enableCollisions) {
      spatialGrid.current.clear()
    }
    
    setDragonBalls(prevBalls => {
      const centerMass = dragonState === 'active' ? 2000 : 1000
      const newBalls = prevBalls.map((ball, index) => {
        // Add to spatial grid if collisions enabled
        if (adaptiveQuality.enableCollisions) {
          spatialGrid.current.add(ball)
        }
        
        const forces: Vector2D[] = []
        
        if (isWishing) {
          // Simplified wish animation
          const targetPos = { x: 0, y: 0 }
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
          
          // Orbital force
          if (ball.id !== hoveredBallId) {
            forces.push(calculateSpringForce(ball.position, targetPos, 0.1))
          }
          
          // Power state forces
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
          if (ball.id === hoveredBallId) {
            forces.push({ x: 0, y: -5 })
          }
        }
        
        // Update physics
        let updatedBall = updateBallPhysics(ball, forces, deltaTime)
        
        // Update angle for circular motion
        if (orbitalMode === 'circular' && ball.id !== hoveredBallId && !isWishing) {
          updatedBall.angle += updatedBall.angularVelocity * deltaTime
        }
        
        // Update trail if enabled
        if (adaptiveQuality.enableTrails) {
          updatedBall.trail = [
            updatedBall.position,
            ...updatedBall.trail.slice(0, adaptiveQuality.trailLength - 1)
          ]
        }
        
        return updatedBall
      })
      
      // Collision detection if enabled
      if (adaptiveQuality.enableCollisions && !isWishing) {
        for (let i = 0; i < newBalls.length; i++) {
          const nearbyBalls = spatialGrid.current.getNearby(newBalls[i].position)
          
          for (const other of nearbyBalls) {
            if (other.id <= newBalls[i].id) continue
            
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
  }, [
    dragonState, 
    intensity, 
    orbitalMode, 
    clickPosition, 
    hoveredBallId,
    isWishing, 
    ballSize, 
    adaptiveQuality
  ])
  
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
  
  // Handle interactions
  const handleBallClick = useCallback((ballId: number, event: React.MouseEvent) => {
    event.stopPropagation()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const clickPos = {
      x: event.clientX - rect.left - rect.width / 2,
      y: event.clientY - rect.top - rect.height / 2
    }
    
    setClickPosition(clickPos)
    setTimeout(() => setClickPosition(null), 500)
    
    // Check for wish condition
    const allNearCenter = dragonBalls.every(ball => {
      const dist = Math.sqrt(ball.position.x ** 2 + ball.position.y ** 2)
      return dist < 50
    })
    
    if (allNearCenter && !isWishing) {
      setIsWishing(true)
      setTimeout(() => {
        setIsWishing(false)
        onWishGranted?.()
      }, 3000)
    }
  }, [dragonBalls, isWishing, onWishGranted])
  
  // Render using CSS transforms for optimal performance
  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
      style={{ width: `${radius * 2}px`, height: `${radius * 2}px` }}
    >
      {/* Performance Stats */}
      {showPerformanceStats && (
        <div className="absolute top-0 left-0 p-2 bg-black/50 text-white text-xs font-mono rounded">
          <div>FPS: {metrics.fps}</div>
          <div>Frame Time: {metrics.frameTime}ms</div>
          <div>Quality: {adaptiveQuality.quality}</div>
          <div>Score: {metrics.performanceScore}%</div>
        </div>
      )}
      
      {/* Dragon Balls - Using CSS transforms for GPU acceleration */}
      {dragonBalls.map((ball) => {
        const ballConfig = DRAGON_BALLS.find(b => b.id === ball.id)!
        const isHovered = ball.id === hoveredBallId
        
        return (
          <div
            key={ball.id}
            className="absolute will-change-transform"
            style={{
              width: `${ballSize}px`,
              height: `${ballSize}px`,
              transform: `translate3d(
                ${radius + ball.position.x - ballSize / 2}px,
                ${radius + ball.position.y - ballSize / 2}px,
                0
              ) scale(${isHovered ? 1.2 : 1})`,
              transition: isHovered ? 'transform 0.15s ease-out' : 'none'
            }}
            onMouseEnter={() => setHoveredBallId(ball.id)}
            onMouseLeave={() => setHoveredBallId(null)}
            onClick={(e) => handleBallClick(ball.id, e)}
          >
            <div className={`
              w-full h-full rounded-full cursor-pointer
              bg-gradient-to-br ${ballConfig.color}
              ${dragonState === 'active' && adaptiveQuality.quality !== 'low' ? 'animate-power-pulse' : ''}
            `}
            style={{
              boxShadow: isHovered 
                ? '0 0 20px rgba(251, 191, 36, 0.8)' 
                : dragonState === 'active'
                ? '0 0 15px rgba(251, 191, 36, 0.6)'
                : '0 0 10px rgba(251, 191, 36, 0.4)'
            }}
            >
              {/* Stars - simplified rendering */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-red-600 text-xs font-bold">
                  {'★'.repeat(ballConfig.stars)}
                </div>
              </div>
              
              {/* Highlight */}
              <div className="absolute top-1 left-1 w-2 h-2 bg-yellow-200 rounded-full opacity-80" />
            </div>
          </div>
        )
      })}
      
      {/* Central energy core */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className={`
          transition-all duration-500 rounded-full
          ${dragonState === 'active' 
            ? 'w-8 h-8 bg-red-500' 
            : dragonState === 'ready'
            ? 'w-6 h-6 bg-orange-500'
            : 'w-4 h-4 bg-yellow-500'
          }
          ${adaptiveQuality.quality !== 'low' ? 'animate-power-pulse' : ''}
        `} />
      </div>
      
      {/* Wish effect - simplified */}
      {isWishing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-yellow-400 font-bold text-2xl animate-pulse">
            WISH GRANTED!
          </div>
        </div>
      )}
    </div>
  )
}