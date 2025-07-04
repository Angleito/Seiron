'use client'

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { useDragonInteraction } from '../DragonInteractionController'
import {
  DragonBallState,
  Vector2D,
  calculateEllipticalOrbit,
  generateOrbitalParams,
  calculateOrbitalSpeed
} from '@/utils/dragonBallPhysics'
import { 
  DRAGON_BALL_PRESETS, 
  DRAGON_BALL_STARS, 
  ANIMATION_TIMING,
  ORBITAL_PHYSICS 
} from '../constants'

interface SVGAnimatedDragonBallProps {
  ballId: number
  starCount: number
  size: number
  orbitRadius: number
  orbitSpeed: number
  orbitPattern: 'circular' | 'elliptical' | 'chaotic' | 'figure-eight'
  isActive: boolean
  isHovered: boolean
  isInteractive: boolean
  powerLevel: number
  glowIntensity: number
  animationDuration: number
  phaseOffset: number
  onInteraction?: (ballId: number, type: string, event?: React.MouseEvent | React.TouchEvent) => void
}

interface EnhancedSVGDragonBallsProps {
  radius?: number
  ballSize?: number
  className?: string
  onWishGranted?: () => void
  orbitalMode?: 'circular' | 'elliptical' | 'chaotic' | 'figure-eight'
  showTrails?: boolean
  interactive?: boolean
  config?: typeof DRAGON_BALL_PRESETS.classic
  dragonState?: 'idle' | 'attention' | 'ready' | 'active' | 'powering-up'
  useNativeAnimations?: boolean
}

// Enhanced SVG Dragon Ball with native SVG animations
const SVGAnimatedDragonBall: React.FC<SVGAnimatedDragonBallProps> = ({
  ballId,
  starCount,
  size,
  orbitRadius,
  orbitSpeed,
  orbitPattern,
  isActive,
  isHovered,
  isInteractive,
  powerLevel,
  glowIntensity,
  animationDuration,
  phaseOffset,
  onInteraction
}) => {
  const ballConfig = DRAGON_BALL_STARS[ballId - 1]
  const radius = size / 2
  
  // Calculate animation path based on orbit pattern
  const getAnimationPath = () => {
    switch (orbitPattern) {
      case 'elliptical': {
        const params = generateOrbitalParams(ballId - 1, 7)
        const semiMinorAxis = params.semiMajorAxis * Math.sqrt(1 - params.eccentricity ** 2)
        return `M ${params.semiMajorAxis} 0 
                A ${params.semiMajorAxis} ${semiMinorAxis} 0 1 1 ${-params.semiMajorAxis} 0 
                A ${params.semiMajorAxis} ${semiMinorAxis} 0 1 1 ${params.semiMajorAxis} 0`
      }
      case 'figure-eight': {
        const r = orbitRadius
        return `M ${r} 0 
                Q 0 ${-r/2} ${-r} 0 
                Q 0 ${r/2} ${r} 0 
                Q 0 ${-r/2} ${-r} 0 
                Q 0 ${r/2} ${r} 0`
      }
      case 'chaotic': {
        // Complex chaotic path
        const r = orbitRadius
        return `M ${r} 0 
                Q ${r*0.7} ${-r*0.3} ${r*0.3} ${-r*0.8}
                Q ${-r*0.2} ${-r*0.9} ${-r*0.6} ${-r*0.4}
                Q ${-r*0.9} ${r*0.1} ${-r*0.5} ${r*0.7}
                Q ${r*0.1} ${r*0.9} ${r*0.8} ${r*0.2}
                Q ${r*0.9} ${-r*0.5} ${r} 0`
      }
      default: // circular
        return `M ${orbitRadius} 0 
                A ${orbitRadius} ${orbitRadius} 0 1 1 ${-orbitRadius} 0 
                A ${orbitRadius} ${orbitRadius} 0 1 1 ${orbitRadius} 0`
    }
  }
  
  // Calculate star positions in a grid pattern
  const getStarPositions = (count: number, ballRadius: number) => {
    const positions: { x: number, y: number }[] = []
    
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
  const animationPath = getAnimationPath()
  const scaledDuration = animationDuration / orbitSpeed
  
  const glowId = `animated-ball-glow-${ballId}`
  const gradientId = `animated-ball-gradient-${ballId}`
  const pathId = `orbit-path-${ballId}`
  
  const handleInteraction = useCallback((type: string, event?: React.MouseEvent | React.TouchEvent) => {
    if (isInteractive && onInteraction) {
      onInteraction(ballId, type, event)
    }
  }, [ballId, isInteractive, onInteraction])
  
  return (
    <g className="animated-dragon-ball">
      {/* Definitions */}
      <defs>
        {/* Orbit path for animation */}
        <path id={pathId} d={animationPath} fill="none" stroke="none" />
        
        {/* Radial gradient for ball */}
        <radialGradient id={gradientId} cx="30%" cy="30%">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.4)" />
          <stop offset="25%" stopColor="rgba(255, 220, 100, 0.8)" />
          <stop offset="70%" stopColor="rgba(255, 140, 0, 0.9)" />
          <stop offset="100%" stopColor="rgba(200, 50, 0, 1)" />
        </radialGradient>
        
        {/* Enhanced glow filter */}
        <filter id={glowId} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation={glowIntensity * 3} result="coloredBlur"/>
          <feFlood floodColor="rgba(251, 191, 36, 0.8)" result="glowColor"/>
          <feComposite in="glowColor" in2="coloredBlur" operator="in" result="softGlowColored"/>
          <feMerge> 
            <feMergeNode in="softGlowColored"/>
            <feMergeNode in="SourceGraphic"/> 
          </feMerge>
        </filter>
      </defs>
      
      {/* Orbit path visualization (optional) */}
      {orbitPattern !== 'circular' && (
        <path
          d={animationPath}
          fill="none"
          stroke="rgba(251, 191, 36, 0.1)"
          strokeWidth="1"
          strokeDasharray="3,3"
          opacity="0.3"
        />
      )}
      
      {/* Animated dragon ball group */}
      <g
        className={`dragon-ball-orbit ${isHovered ? 'hovered' : ''} ${isActive ? 'active' : ''}`}
        style={{ cursor: isInteractive ? 'pointer' : 'default' }}
        onMouseEnter={() => handleInteraction('hover')}
        onMouseLeave={() => handleInteraction('leave')}
        onClick={(e) => handleInteraction('click', e)}
      >
        {/* SVG Animation along path */}
        <animateMotion
          dur={`${scaledDuration}s`}
          repeatCount="indefinite"
          begin={`${phaseOffset}s`}
          rotate="auto"
        >
          <mpath href={`#${pathId}`} />
        </animateMotion>
        
        {/* Outer glow when active or hovered */}
        {(isActive || isHovered) && (
          <circle
            cx="0"
            cy="0"
            r={radius + 4}
            fill="rgba(251, 191, 36, 0.2)"
            filter={`url(#${glowId})`}
          >
            {isActive && (
              <animate
                attributeName="r"
                values={`${radius + 2};${radius + 6};${radius + 2}`}
                dur="1s"
                repeatCount="indefinite"
              />
            )}
          </circle>
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
        >
          {/* Scale animation on hover */}
          {isHovered && (
            <animateTransform
              attributeName="transform"
              type="scale"
              values="1;1.15;1"
              dur="0.3s"
              repeatCount="1"
            />
          )}
          
          {/* Power pulse animation */}
          {isActive && (
            <animate
              attributeName="opacity"
              values="0.8;1;0.8"
              dur="0.8s"
              repeatCount="indefinite"
            />
          )}
        </circle>
        
        {/* Highlight on ball */}
        <ellipse
          cx={-radius * 0.3}
          cy={-radius * 0.3}
          rx={radius * 0.25}
          ry={radius * 0.18}
          fill="rgba(255, 255, 255, 0.7)"
          opacity="0.9"
        />
        
        {/* Stars with individual animations */}
        {starPositions.map((pos, index) => (
          <g key={index} transform={`translate(${pos.x}, ${pos.y})`}>
            {/* Star background */}
            <circle
              cx="0"
              cy="0"
              r={radius * 0.09}
              fill="rgba(120, 0, 0, 0.9)"
            />
            
            {/* Animated star symbol */}
            <text
              x="0"
              y="0"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={radius * 0.14}
              fill="rgba(220, 0, 0, 1)"
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
            >
              ★
              {/* Star twinkle animation */}
              <animate
                attributeName="opacity"
                values="0.6;1;0.6"
                dur={isActive ? "0.4s" : "2.5s"}
                begin={`${index * 0.15}s`}
                repeatCount="indefinite"
              />
              
              {/* Scale twinkle */}
              {isActive && (
                <animateTransform
                  attributeName="transform"
                  type="scale"
                  values="0.8;1.2;0.8"
                  dur="0.6s"
                  begin={`${index * 0.1}s`}
                  repeatCount="indefinite"
                />
              )}
            </text>
          </g>
        ))}
        
        {/* Power aura overlay */}
        {isActive && (
          <circle
            cx="0"
            cy="0"
            r={radius * 1.2}
            fill="rgba(251, 191, 36, 0.15)"
            opacity="0.8"
          >
            <animate
              attributeName="r"
              values={`${radius * 1.1};${radius * 1.3};${radius * 1.1}`}
              dur="1.2s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.5;0.8;0.5"
              dur="1.2s"
              repeatCount="indefinite"
            />
          </circle>
        )}
      </g>
    </g>
  )
}

// Enhanced SVG Dragon Balls System with Native Animations
export const EnhancedSVGDragonBalls: React.FC<EnhancedSVGDragonBallsProps> = ({
  radius = 150,
  ballSize = 32,
  className = '',
  onWishGranted,
  orbitalMode = 'elliptical',
  showTrails = false, // Disabled for native animation version
  interactive = true,
  config = DRAGON_BALL_PRESETS.classic,
  dragonState = 'idle',
  useNativeAnimations = true
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const { state: interactionState, intensity, performanceMode } = useDragonInteraction()
  
  const [ballStates, setBallStates] = useState<Array<{id: number, isHovered: boolean}>>(() =>
    Array.from({ length: config.count }, (_, index) => ({
      id: index + 1,
      isHovered: false
    }))
  )
  
  const [isWishing, setIsWishing] = useState(false)
  const [wishProgress, setWishProgress] = useState(0)
  
  // Calculate animation duration based on performance mode and dragon state
  const getAnimationDuration = useMemo(() => {
    const baseDuration = ANIMATION_TIMING.dragonBallOrbit / 1000 // Convert to seconds
    const currentDragonState = dragonState || interactionState
    
    let speedMultiplier = config.orbitSpeed
    
    // Adjust speed based on dragon state
    if (currentDragonState === 'active') {
      speedMultiplier *= 2.5
    } else if (currentDragonState === 'ready') {
      speedMultiplier *= 1.8
    }
    
    // Adjust for intensity
    const intensityMultiplier = {
      low: 1,
      medium: 1.3,
      high: 1.6,
      max: 2
    }[intensity] || 1
    
    // Adjust for performance mode
    const performanceMultiplier = {
      quality: 1,
      balanced: 1.2,
      performance: 1.5
    }[performanceMode] || 1
    
    return baseDuration / (speedMultiplier * intensityMultiplier / performanceMultiplier)
  }, [config.orbitSpeed, dragonState, interactionState, intensity, performanceMode])
  
  // Handle ball interactions
  const handleBallInteraction = useCallback((ballId: number, type: string, event?: React.MouseEvent | React.TouchEvent) => {
    if (!interactive || !config.interactionEnabled) return
    
    switch (type) {
      case 'hover':
        setBallStates(prev => prev.map(ball => 
          ball.id === ballId ? { ...ball, isHovered: true } : ball
        ))
        break
        
      case 'leave':
        setBallStates(prev => prev.map(ball => 
          ball.id === ballId ? { ...ball, isHovered: false } : ball
        ))
        break
        
      case 'click':
        if (event) {
          event.stopPropagation()
          
          // Check if all balls are active for wish granting
          const allActive = dragonState === 'active' && !isWishing
          if (allActive) {
            triggerWishAnimation()
          }
        }
        break
    }
  }, [interactive, config.interactionEnabled, dragonState, isWishing])
  
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
  
  const currentDragonState = dragonState || interactionState
  const isActive = currentDragonState === 'active' || currentDragonState === 'powering-up'
  
  return (
    <div className={`enhanced-dragon-balls-container ${className}`}>
      <svg
        ref={svgRef}
        width={radius * 2.4} // Extra space for outer orbits
        height={radius * 2.4}
        viewBox={`${-radius * 1.2} ${-radius * 1.2} ${radius * 2.4} ${radius * 2.4}`}
        className="enhanced-dragon-balls-svg"
        style={{ 
          overflow: 'visible',
          filter: isActive ? 'drop-shadow(0 0 25px rgba(251, 191, 36, 0.7))' : undefined
        }}
      >
        {/* Global definitions */}
        <defs>
          {/* Central energy gradient */}
          <radialGradient id="central-energy-gradient">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.9)" />
            <stop offset="30%" stopColor="rgba(255, 200, 0, 0.8)" />
            <stop offset="70%" stopColor="rgba(239, 68, 68, 0.9)" />
            <stop offset="100%" stopColor="rgba(180, 30, 30, 1)" />
          </radialGradient>
          
          {/* Wish effect gradient */}
          <radialGradient id="wish-gradient">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.8)" />
            <stop offset="50%" stopColor="rgba(251, 191, 36, 0.6)" />
            <stop offset="100%" stopColor="rgba(251, 191, 36, 0.2)" />
          </radialGradient>
        </defs>
        
        {/* Dragon Balls with native SVG animations */}
        {Array.from({ length: config.count }, (_, index) => {
          const ballId = index + 1
          const ballState = ballStates.find(b => b.id === ballId)
          const phaseOffset = (index * getAnimationDuration) / config.count // Stagger animations
          
          return (
            <SVGAnimatedDragonBall
              key={ballId}
              ballId={ballId}
              starCount={ballId}
              size={ballSize}
              orbitRadius={radius * (0.7 + index * 0.05)} // Varied orbit radii
              orbitSpeed={config.orbitSpeed}
              orbitPattern={orbitalMode}
              isActive={isActive}
              isHovered={ballState?.isHovered || false}
              isInteractive={interactive && config.interactionEnabled}
              powerLevel={isActive ? 100 : 50}
              glowIntensity={ballState?.isHovered ? 4 : isActive ? 3 : 1}
              animationDuration={getAnimationDuration}
              phaseOffset={phaseOffset}
              onInteraction={handleBallInteraction}
            />
          )
        })}
        
        {/* Central energy core with pulsing animation */}
        <g className="central-energy-core">
          <circle
            cx="0"
            cy="0"
            r={isActive ? 12 : currentDragonState === 'ready' ? 8 : 6}
            fill="url(#central-energy-gradient)"
            opacity={isActive ? 1 : currentDragonState === 'ready' ? 0.8 : 0.6}
          >
            {/* Pulsing animation */}
            <animate
              attributeName="r"
              values={isActive ? "8;15;8" : "4;8;4"}
              dur={isActive ? "0.8s" : "2s"}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values={isActive ? "0.8;1;0.8" : "0.4;0.8;0.4"}
              dur={isActive ? "1s" : "3s"}
              repeatCount="indefinite"
            />
          </circle>
          
          {/* Energy rings */}
          {isActive && (
            <>
              <circle
                cx="0"
                cy="0"
                r="20"
                fill="none"
                stroke="rgba(251, 191, 36, 0.4)"
                strokeWidth="2"
                opacity="0.6"
              >
                <animate
                  attributeName="r"
                  values="15;25;15"
                  dur="1.5s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.8;0.3;0.8"
                  dur="1.5s"
                  repeatCount="indefinite"
                />
              </circle>
              
              <circle
                cx="0"
                cy="0"
                r="30"
                fill="none"
                stroke="rgba(239, 68, 68, 0.3)"
                strokeWidth="1"
                opacity="0.4"
              >
                <animate
                  attributeName="r"
                  values="25;35;25"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </circle>
            </>
          )}
        </g>
        
        {/* Wish granting effect with SVG animations */}
        {isWishing && (
          <g className="wish-effect">
            {/* Expanding energy wave */}
            <circle
              cx="0"
              cy="0"
              r="0"
              fill="url(#wish-gradient)"
              opacity="0.8"
            >
              <animate
                attributeName="r"
                values={`0;${radius * 1.5}`}
                dur="3s"
                repeatCount="1"
              />
              <animate
                attributeName="opacity"
                values="0.8;0.3;0"
                dur="3s"
                repeatCount="1"
              />
            </circle>
            
            {/* Rotating energy spirals */}
            <g>
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0;360"
                dur="2s"
                repeatCount="indefinite"
              />
              {[0, 120, 240].map((angle, i) => (
                <path
                  key={i}
                  d={`M 0,0 Q ${radius * 0.3},${radius * 0.3} ${radius * 0.8},0 Q ${radius * 0.3},${-radius * 0.3} 0,0`}
                  fill="none"
                  stroke="rgba(251, 191, 36, 0.6)"
                  strokeWidth="3"
                  transform={`rotate(${angle})`}
                  opacity="0.7"
                />
              ))}
            </g>
            
            {/* Wish text with animation */}
            <text
              x="0"
              y="0"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="20"
              fontWeight="bold"
              fill="rgba(251, 191, 36, 1)"
              fontFamily="Arial, sans-serif"
            >
              WISH GRANTED!
              <animate
                attributeName="opacity"
                values="0;1;1;1;0"
                dur="3s"
                repeatCount="1"
              />
              <animateTransform
                attributeName="transform"
                type="scale"
                values="0.5;1.2;1;1;0.8"
                dur="3s"
                repeatCount="1"
              />
            </text>
          </g>
        )}
      </svg>
      
      {/* Power level indicator */}
      {(currentDragonState !== 'idle' && currentDragonState !== undefined) && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="px-3 py-1 bg-red-900/90 text-yellow-400 text-xs font-bold rounded-full border border-yellow-400/60 shadow-lg">
            Power Level: {
              currentDragonState === 'active' ? 'MAXIMUM!' :
              currentDragonState === 'ready' ? 'Rising...' :
              currentDragonState === 'powering-up' ? 'CHARGING!' :
              'Detected'
            }
          </div>
        </div>
      )}
    </div>
  )
}

export default EnhancedSVGDragonBalls