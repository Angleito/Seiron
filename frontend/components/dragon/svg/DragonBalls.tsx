'use client'

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { useDragonInteraction } from '../DragonInteractionController'
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
import { 
  DRAGON_BALL_PRESETS, 
  DRAGON_BALL_STARS, 
  ANIMATION_TIMING,
  ORBITAL_PHYSICS 
} from '../constants'

interface SVGDragonBallProps {
  ballId: number
  starCount: number
  position: { x: number, y: number }
  size: number
  orbitAngle: number
  isActive: boolean
  isHovered: boolean
  isInteractive: boolean
  powerLevel: number
  glowIntensity: number
  onInteraction?: (ballId: number, type: string, event?: React.MouseEvent | React.TouchEvent) => void
}

interface SVGDragonBallsProps {
  radius?: number
  ballSize?: number
  className?: string
  onWishGranted?: () => void
  orbitalMode?: 'circular' | 'elliptical' | 'chaotic' | 'figure-eight'
  showTrails?: boolean
  interactive?: boolean
  config?: typeof DRAGON_BALL_PRESETS.classic
  dragonState?: 'idle' | 'attention' | 'ready' | 'active' | 'powering-up'
}

// SVG Dragon Ball Component
const SVGDragonBall: React.FC<SVGDragonBallProps> = ({
  ballId,
  starCount,
  position,
  size,
  orbitAngle,
  isActive,
  isHovered,
  isInteractive,
  powerLevel,
  glowIntensity,
  onInteraction
}) => {
  const ballConfig = DRAGON_BALL_STARS[ballId - 1]
  const radius = size / 2
  
  // Calculate star positions in a grid pattern
  const getStarPositions = (count: number, ballRadius: number) => {
    const positions: { x: number, y: number }[] = []
    const starSize = Math.max(2, ballRadius * 0.15)
    
    if (count === 1) {
      positions.push({ x: 0, y: 0 })
    } else if (count <= 4) {
      // 2x2 grid for 2-4 stars
      const spacing = ballRadius * 0.4
      const startX = count === 2 ? -spacing / 2 : -spacing
      const startY = count <= 2 ? 0 : -spacing / 2
      
      for (let i = 0; i < count; i++) {
        const col = i % 2
        const row = Math.floor(i / 2)
        positions.push({
          x: startX + col * spacing,
          y: startY + row * spacing
        })
      }
    } else {
      // Circular arrangement for 5-7 stars
      const angleStep = (2 * Math.PI) / count
      const starRadius = ballRadius * 0.3
      
      for (let i = 0; i < count; i++) {
        const angle = i * angleStep - Math.PI / 2
        positions.push({
          x: Math.cos(angle) * starRadius,
          y: Math.sin(angle) * starRadius
        })
      }
    }
    
    return positions
  }
  
  const starPositions = getStarPositions(starCount, radius)
  const glowId = `dragon-ball-glow-${ballId}`
  const gradientId = `dragon-ball-gradient-${ballId}`
  
  const handleInteraction = useCallback((type: string, event?: React.MouseEvent | React.TouchEvent) => {
    if (isInteractive && onInteraction) {
      onInteraction(ballId, type, event)
    }
  }, [ballId, isInteractive, onInteraction])
  
  return (
    <g 
      className={`dragon-ball ${isHovered ? 'hovered' : ''} ${isActive ? 'active' : ''}`}
      transform={`translate(${position.x}, ${position.y})`}
      style={{
        cursor: isInteractive ? 'pointer' : 'default',
        transition: 'transform 0.15s ease-out'
      }}
      onMouseEnter={() => handleInteraction('hover')}
      onMouseLeave={() => handleInteraction('leave')}
      onClick={(e) => handleInteraction('click', e)}
    >
      {/* Definitions for gradients and filters */}
      <defs>
        {/* Radial gradient for ball */}
        <radialGradient id={gradientId} cx="30%" cy="30%">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.4)" />
          <stop offset="25%" stopColor="rgba(255, 220, 100, 0.8)" />
          <stop offset="70%" stopColor="rgba(255, 140, 0, 0.9)" />
          <stop offset="100%" stopColor="rgba(200, 50, 0, 1)" />
        </radialGradient>
        
        {/* Glow filter */}
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={glowIntensity * 2} result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/> 
          </feMerge>
        </filter>
      </defs>
      
      {/* Outer glow when active or hovered */}
      {(isActive || isHovered) && (
        <circle
          cx="0"
          cy="0"
          r={radius + 3}
          fill="rgba(251, 191, 36, 0.3)"
          filter={`url(#${glowId})`}
          className={isActive ? 'animate-pulse' : ''}
        />
      )}
      
      {/* Main dragon ball */}
      <circle
        cx="0"
        cy="0"
        r={radius}
        fill={`url(#${gradientId})`}
        stroke="rgba(200, 50, 0, 0.8)"
        strokeWidth="1"
        filter={isHovered ? `url(#${glowId})` : undefined}
        className={`
          transition-all duration-150
          ${isHovered ? 'scale-110' : 'scale-100'}
          ${isActive ? 'animate-power-pulse' : ''}
        `}
        style={{
          transformOrigin: 'center',
          transform: `scale(${isHovered ? 1.1 : 1})`
        }}
      />
      
      {/* Highlight on ball */}
      <ellipse
        cx={-radius * 0.3}
        cy={-radius * 0.3}
        rx={radius * 0.2}
        ry={radius * 0.15}
        fill="rgba(255, 255, 255, 0.6)"
        opacity="0.8"
      />
      
      {/* Stars */}
      {starPositions.map((pos, index) => (
        <g key={index} transform={`translate(${pos.x}, ${pos.y})`}>
          {/* Star background */}
          <circle
            cx="0"
            cy="0"
            r={radius * 0.08}
            fill="rgba(100, 0, 0, 0.8)"
          />
          {/* Star symbol */}
          <text
            x="0"
            y="0"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={radius * 0.12}
            fill="rgba(200, 0, 0, 1)"
            fontWeight="bold"
            className={isActive ? 'animate-star-twinkle' : ''}
            style={{
              fontFamily: 'Arial, sans-serif',
              animationDelay: `${index * 0.2}s`,
              animationDuration: isActive ? '0.5s' : '3s'
            }}
          >
            ★
          </text>
        </g>
      ))}
      
      {/* Power glow overlay */}
      {isActive && (
        <circle
          cx="0"
          cy="0"
          r={radius}
          fill="rgba(251, 191, 36, 0.2)"
          className="animate-pulse"
        />
      )}
    </g>
  )
}

// Main SVG Dragon Balls System
export const SVGDragonBalls: React.FC<SVGDragonBallsProps> = ({
  radius = 150,
  ballSize = 32,
  className = '',
  onWishGranted,
  orbitalMode = 'elliptical',
  showTrails = true,
  interactive = true,
  config = DRAGON_BALL_PRESETS.classic,
  dragonState = 'idle'
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const animationFrameRef = useRef<number>()
  const lastTimeRef = useRef<number>(0)
  const spatialGrid = useRef(new SpatialGrid())
  
  const { state: interactionState, intensity, performanceMode } = useDragonInteraction()
  
  // Initialize dragon balls with orbital parameters
  const [dragonBalls, setDragonBalls] = useState<DragonBallState[]>(() => 
    Array.from({ length: config.count }, (_, index) => {
      const ballId = index + 1
      const orbitalParams = generateOrbitalParams(index, config.count)
      const initialPos = orbitalMode === 'elliptical' 
        ? calculateEllipticalOrbit(orbitalParams, 0)
        : {
            x: Math.cos(index * 2 * Math.PI / config.count) * radius,
            y: Math.sin(index * 2 * Math.PI / config.count) * radius
          }
      
      return {
        id: ballId,
        position: initialPos,
        velocity: { x: 0, y: 0 },
        angle: index * 2 * Math.PI / config.count,
        angularVelocity: calculateOrbitalSpeed(ANIMATION_TIMING.dragonBallOrbit / 1000, 0, intensity),
        orbitRadius: orbitalParams.semiMajorAxis,
        orbitEccentricity: orbitalParams.eccentricity,
        orbitSpeed: config.orbitSpeed,
        mass: 1,
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
    showTrails && performanceMode !== 'performance' && config.individualAnimation,
    [showTrails, performanceMode, config.individualAnimation]
  )
  
  const collisionEnabled = useMemo(() =>
    performanceMode === 'quality' && config.individualAnimation,
    [performanceMode, config.individualAnimation]
  )
  
  // Handle ball interactions
  const handleBallInteraction = useCallback((ballId: number, type: string, event?: React.MouseEvent | React.TouchEvent) => {
    if (!interactive || !config.interactionEnabled) return
    
    switch (type) {
      case 'hover':
        setDragonBalls(prev => prev.map(ball => 
          ball.id === ballId ? { ...ball, isHovered: true } : ball
        ))
        break
        
      case 'leave':
        setDragonBalls(prev => prev.map(ball => 
          ball.id === ballId ? { ...ball, isHovered: false } : ball
        ))
        break
        
      case 'click':
        if (event && svgRef.current) {
          event.stopPropagation()
          const rect = svgRef.current.getBoundingClientRect()
          const clickPos = {
            x: (event as React.MouseEvent).clientX - rect.left - rect.width / 2,
            y: (event as React.MouseEvent).clientY - rect.top - rect.height / 2
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
        }
        break
    }
  }, [dragonBalls, interactive, config.interactionEnabled, isWishing])
  
  // Trigger wish-granting animation
  const triggerWishAnimation = useCallback(() => {
    setIsWishing(true)
    setWishProgress(0)
    
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
    const deltaTime = Math.min((currentTime - lastTimeRef.current) / 1000, 0.1)
    lastTimeRef.current = currentTime
    
    if (!deltaTime || deltaTime <= 0) return
    
    spatialGrid.current.clear()
    
    setDragonBalls(prevBalls => {
      const currentDragonState = dragonState || interactionState
      const centerMass = currentDragonState === 'active' ? 2000 : 1000
      
      const newBalls = prevBalls.map((ball, index) => {
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
          const orbitalParams = generateOrbitalParams(index, config.count)
          const time = currentTime / 1000
          const speed = calculateOrbitalSpeed(
            ANIMATION_TIMING.dragonBallOrbit / 1000, 
            currentDragonState === 'active' ? 2 : 0, 
            intensity
          ) * config.orbitSpeed
          
          let targetPos: Vector2D
          
          switch (orbitalMode) {
            case 'elliptical':
              targetPos = calculateEllipticalOrbit(orbitalParams, time * speed, centerMass)
              break
            case 'chaotic':
              // Add some chaos to the orbit
              const chaosX = Math.sin(time * speed * 3) * 20
              const chaosY = Math.cos(time * speed * 2.7) * 15
              targetPos = calculateEllipticalOrbit(orbitalParams, time * speed, centerMass)
              targetPos.x += chaosX
              targetPos.y += chaosY
              break
            case 'figure-eight':
              // Figure-8 pattern
              const t = time * speed * 0.5
              targetPos = {
                x: Math.sin(t) * config.orbitRadius,
                y: Math.sin(t * 2) * config.orbitRadius * 0.5
              }
              break
            default: // circular
              const angle = ball.angle + ball.angularVelocity * deltaTime
              targetPos = {
                x: Math.cos(angle) * ball.orbitRadius,
                y: Math.sin(angle) * ball.orbitRadius
              }
          }
          
          // Orbital force (spring to ideal position)
          if (!ball.isHovered) {
            forces.push(calculateSpringForce(ball.position, targetPos, ORBITAL_PHYSICS.springConstant))
          }
          
          // Gravitational pull to center when dragon powers up
          if (currentDragonState === 'active' || currentDragonState === 'ready') {
            forces.push(calculateGravitationalForce(
              ball.position,
              { x: 0, y: 0 },
              ball.mass,
              centerMass * (currentDragonState === 'active' ? 0.2 : 0.1)
            ))
          }
          
          // Click repulsion
          if (clickPosition) {
            forces.push(calculateRepulsionForce(
              ball.position, 
              clickPosition, 
              ORBITAL_PHYSICS.repulsionForce * 50
            ))
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
    interactionState, 
    intensity, 
    orbitalMode, 
    clickPosition, 
    isWishing, 
    wishProgress, 
    ballSize, 
    collisionEnabled,
    config
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
  
  return (
    <div className={`dragon-balls-container ${className}`}>
      <svg
        ref={svgRef}
        width={radius * 2}
        height={radius * 2}
        viewBox={`${-radius} ${-radius} ${radius * 2} ${radius * 2}`}
        className="dragon-balls-svg"
        style={{ 
          overflow: 'visible',
          filter: dragonState === 'active' ? 'drop-shadow(0 0 20px rgba(251, 191, 36, 0.6))' : undefined
        }}
      >
        {/* Background orbital rings */}
        {orbitalMode === 'elliptical' && !isWishing && (
          <g className="orbital-rings" opacity={performanceMode === 'performance' ? 0 : 0.2}>
            {dragonBalls.map((ball, index) => {
              const params = generateOrbitalParams(index, config.count)
              return (
                <ellipse
                  key={ball.id}
                  cx="0"
                  cy="0"
                  rx={params.semiMajorAxis}
                  ry={params.semiMajorAxis * Math.sqrt(1 - params.eccentricity ** 2)}
                  fill="none"
                  stroke="rgba(251, 191, 36, 0.3)"
                  strokeWidth="1"
                  className="animate-pulse"
                />
              )
            })}
          </g>
        )}
        
        {/* Dragon Ball trails */}
        {trailEnabled && dragonBalls.map(ball => (
          ball.trail.length > 1 && (
            <g key={`trail-${ball.id}`} className="ball-trail">
              <defs>
                <linearGradient id={`trail-gradient-${ball.id}`}>
                  <stop offset="0%" stopColor="rgba(251, 191, 36, 0)" />
                  <stop offset="100%" stopColor="rgba(251, 191, 36, 0.8)" />
                </linearGradient>
              </defs>
              <path
                d={`M ${ball.trail.map(pos => `${pos.x},${pos.y}`).join(' L ')}`}
                fill="none"
                stroke={`url(#trail-gradient-${ball.id})`}
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.6"
              />
            </g>
          )
        ))}
        
        {/* Dragon Balls */}
        {dragonBalls.map((ball, index) => (
          <SVGDragonBall
            key={ball.id}
            ballId={ball.id}
            starCount={ball.id}
            position={ball.position}
            size={ballSize}
            orbitAngle={ball.angle}
            isActive={dragonState === 'active' || interactionState === 'active'}
            isHovered={ball.isHovered}
            isInteractive={interactive && config.interactionEnabled}
            powerLevel={dragonState === 'active' ? 100 : 50}
            glowIntensity={ball.isHovered ? 3 : dragonState === 'active' ? 2 : 1}
            onInteraction={handleBallInteraction}
          />
        ))}
        
        {/* Central energy core */}
        <g className="energy-core">
          <circle
            cx="0"
            cy="0"
            r={dragonState === 'active' ? 8 : dragonState === 'ready' ? 6 : 4}
            fill="url(#energy-core-gradient)"
            className={dragonState === 'active' ? 'animate-power-surge' : 'animate-power-pulse'}
            opacity={dragonState === 'active' ? 1 : dragonState === 'ready' ? 0.8 : 0.6}
          />
          <defs>
            <radialGradient id="energy-core-gradient">
              <stop offset="0%" stopColor="rgba(239, 68, 68, 1)" />
              <stop offset="100%" stopColor="rgba(251, 146, 60, 1)" />
            </radialGradient>
          </defs>
        </g>
        
        {/* Wish granting effect */}
        {isWishing && (
          <g className="wish-effect">
            <circle
              cx="0"
              cy="0"
              r={(1 - wishProgress) * radius}
              fill="rgba(251, 191, 36, 0.3)"
              className="animate-ping"
            />
            <text
              x="0"
              y="0"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="24"
              fill="rgba(251, 191, 36, 1)"
              fontWeight="bold"
              className="animate-pulse"
            >
              WISH GRANTED!
            </text>
          </g>
        )}
      </svg>
      
      {/* Power level indicator */}
      {(dragonState !== 'idle' && dragonState !== undefined) && (
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

export default SVGDragonBalls