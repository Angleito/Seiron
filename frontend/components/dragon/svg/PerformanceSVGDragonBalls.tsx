'use client'

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { useDragonInteraction } from '../DragonInteractionController'
import {
  DRAGON_BALL_PRESETS, 
  DRAGON_BALL_STARS, 
  ANIMATION_TIMING,
  PERFORMANCE_THRESHOLDS
} from '../constants'

interface PerformanceOptimizedBallProps {
  ballId: number
  starCount: number
  size: number
  orbitRadius: number
  orbitSpeed: number
  orbitPattern: 'circular' | 'elliptical' | 'chaotic' | 'figure-eight'
  isActive: boolean
  isHovered: boolean
  isInteractive: boolean
  animationDuration: number
  phaseOffset: number
  qualityLevel: 'minimal' | 'reduced' | 'full'
  onInteraction?: (ballId: number, type: string) => void
}

interface PerformanceSVGDragonBallsProps {
  radius?: number
  ballSize?: number
  className?: string
  onWishGranted?: () => void
  orbitalMode?: 'circular' | 'elliptical' | 'chaotic' | 'figure-eight'
  interactive?: boolean
  config?: typeof DRAGON_BALL_PRESETS.classic
  dragonState?: 'idle' | 'attention' | 'ready' | 'active' | 'powering-up'
  forceQualityLevel?: 'minimal' | 'reduced' | 'full'
  enableGPUAcceleration?: boolean
}

// Performance-optimized dragon ball component
const PerformanceOptimizedBall: React.FC<PerformanceOptimizedBallProps> = ({
  ballId,
  starCount,
  size,
  orbitRadius,
  orbitSpeed,
  orbitPattern,
  isActive,
  isHovered,
  isInteractive,
  animationDuration,
  phaseOffset,
  qualityLevel,
  onInteraction
}) => {
  const radius = size / 2
  
  // Simplified star positions for performance
  const getOptimizedStarPositions = (count: number, ballRadius: number) => {
    const positions: { x: number, y: number }[] = []
    
    if (count === 1) {
      positions.push({ x: 0, y: 0 })
    } else if (count <= 3) {
      // Simple line arrangement for 2-3 stars
      const spacing = ballRadius * 0.3
      for (let i = 0; i < count; i++) {
        positions.push({
          x: (i - (count - 1) / 2) * spacing,
          y: 0
        })
      }
    } else {
      // Circular arrangement with fewer calculations
      const angleStep = (2 * Math.PI) / count
      const starRadius = ballRadius * 0.25
      
      for (let i = 0; i < count; i++) {
        const angle = i * angleStep
        positions.push({
          x: Math.cos(angle) * starRadius,
          y: Math.sin(angle) * starRadius
        })
      }
    }
    
    return positions
  }
  
  // Simplified animation path for performance
  const getOptimizedAnimationPath = () => {
    switch (orbitPattern) {
      case 'elliptical':
        if (qualityLevel === 'minimal') {
          // Fallback to circular for minimal quality
          return `M ${orbitRadius} 0 A ${orbitRadius} ${orbitRadius} 0 1 1 ${-orbitRadius} 0 A ${orbitRadius} ${orbitRadius} 0 1 1 ${orbitRadius} 0`
        }
        // Simple ellipse
        const minorAxis = orbitRadius * 0.8
        return `M ${orbitRadius} 0 A ${orbitRadius} ${minorAxis} 0 1 1 ${-orbitRadius} 0 A ${orbitRadius} ${minorAxis} 0 1 1 ${orbitRadius} 0`
      
      case 'figure-eight':
        if (qualityLevel === 'minimal') {
          // Fallback to circular
          return `M ${orbitRadius} 0 A ${orbitRadius} ${orbitRadius} 0 1 1 ${-orbitRadius} 0 A ${orbitRadius} ${orbitRadius} 0 1 1 ${orbitRadius} 0`
        }
        // Simplified figure-8
        return `M ${orbitRadius} 0 Q 0 ${-orbitRadius * 0.5} ${-orbitRadius} 0 Q 0 ${orbitRadius * 0.5} ${orbitRadius} 0`
      
      case 'chaotic':
        if (qualityLevel !== 'full') {
          // Fallback to elliptical for non-full quality
          const minorAxis = orbitRadius * 0.7
          return `M ${orbitRadius} 0 A ${orbitRadius} ${minorAxis} 0 1 1 ${-orbitRadius} 0 A ${orbitRadius} ${minorAxis} 0 1 1 ${orbitRadius} 0`
        }
        // Simplified chaotic path
        return `M ${orbitRadius} 0 Q ${orbitRadius * 0.5} ${-orbitRadius * 0.7} ${-orbitRadius * 0.8} ${-orbitRadius * 0.3} Q ${-orbitRadius * 0.3} ${orbitRadius * 0.8} ${orbitRadius * 0.6} ${orbitRadius * 0.4} Q ${orbitRadius * 0.8} ${-orbitRadius * 0.2} ${orbitRadius} 0`
      
      default: // circular
        return `M ${orbitRadius} 0 A ${orbitRadius} ${orbitRadius} 0 1 1 ${-orbitRadius} 0 A ${orbitRadius} ${orbitRadius} 0 1 1 ${orbitRadius} 0`
    }
  }
  
  const starPositions = getOptimizedStarPositions(starCount, radius)
  const animationPath = getOptimizedAnimationPath()
  const pathId = `perf-orbit-path-${ballId}`
  const gradientId = `perf-ball-gradient-${ballId}`
  
  const handleInteraction = useCallback((type: string) => {
    if (isInteractive && onInteraction) {
      onInteraction(ballId, type)
    }
  }, [ballId, isInteractive, onInteraction])
  
  return (
    <g className="performance-dragon-ball">
      <defs>
        {/* Simplified orbit path */}
        <path id={pathId} d={animationPath} fill="none" stroke="none" />
        
        {/* Simplified gradient - only render if quality allows */}
        {qualityLevel !== 'minimal' && (
          <radialGradient id={gradientId} cx="40%" cy="40%">
            <stop offset="0%" stopColor="rgba(255, 220, 100, 0.9)" />
            <stop offset="80%" stopColor="rgba(200, 50, 0, 1)" />
          </radialGradient>
        )}
      </defs>
      
      {/* Animated dragon ball group */}
      <g
        className="dragon-ball-orbit"
        style={{ 
          cursor: isInteractive ? 'pointer' : 'default',
          // Enable GPU acceleration
          transform: 'translateZ(0)',
          willChange: 'transform'
        }}
        onMouseEnter={() => handleInteraction('hover')}
        onMouseLeave={() => handleInteraction('leave')}
        onClick={() => handleInteraction('click')}
      >
        {/* Optimized SVG Animation */}
        <animateMotion
          dur={`${animationDuration / orbitSpeed}s`}
          repeatCount="indefinite"
          begin={`${phaseOffset}s`}
          rotate={qualityLevel === 'full' ? 'auto' : '0'} // Disable rotation for better performance
        >
          <mpath href={`#${pathId}`} />
        </animateMotion>
        
        {/* Simplified glow for hovered/active states */}
        {(isActive || isHovered) && qualityLevel !== 'minimal' && (
          <circle
            cx="0"
            cy="0"
            r={radius + 2}
            fill="rgba(251, 191, 36, 0.3)"
            opacity={isActive ? "0.8" : "0.5"}
          />
        )}
        
        {/* Main dragon ball with simplified rendering */}
        <circle
          cx="0"
          cy="0"
          r={radius}
          fill={qualityLevel !== 'minimal' ? `url(#${gradientId})` : "rgba(255, 140, 0, 0.9)"}
          stroke={qualityLevel === 'full' ? "rgba(200, 50, 0, 0.8)" : "none"}
          strokeWidth={qualityLevel === 'full' ? "1" : "0"}
        />
        
        {/* Simplified highlight */}
        {qualityLevel !== 'minimal' && (
          <ellipse
            cx={-radius * 0.25}
            cy={-radius * 0.25}
            rx={radius * 0.2}
            ry={radius * 0.15}
            fill="rgba(255, 255, 255, 0.6)"
          />
        )}
        
        {/* Optimized stars rendering */}
        {starPositions.map((pos, index) => (
          <g key={index} transform={`translate(${pos.x}, ${pos.y})`}>
            {qualityLevel === 'full' && (
              <circle
                cx="0"
                cy="0"
                r={radius * 0.06}
                fill="rgba(120, 0, 0, 0.8)"
              />
            )}
            
            <text
              x="0"
              y="0"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={radius * 0.1}
              fill="rgba(200, 0, 0, 1)"
              fontWeight="bold"
              fontFamily="monospace" // Use monospace for better performance
            >
              ★
              {/* Simplified star animation - only in full quality */}
              {qualityLevel === 'full' && isActive && (
                <animate
                  attributeName="opacity"
                  values="0.7;1;0.7"
                  dur="1s"
                  begin={`${index * 0.2}s`}
                  repeatCount="indefinite"
                />
              )}
            </text>
          </g>
        ))}
      </g>
    </g>
  )
}

// Performance-optimized SVG Dragon Balls System
export const PerformanceSVGDragonBalls: React.FC<PerformanceSVGDragonBallsProps> = ({
  radius = 150,
  ballSize = 32,
  className = '',
  onWishGranted,
  orbitalMode = 'circular', // Default to circular for better performance
  interactive = true,
  config = DRAGON_BALL_PRESETS.simple, // Default to simpler preset
  dragonState = 'idle',
  forceQualityLevel,
  enableGPUAcceleration = true
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const { state: interactionState, intensity, performanceMode } = useDragonInteraction()
  const [fps, setFps] = useState(60)
  const frameTimeRef = useRef<number[]>([])
  
  // Dynamic quality level based on performance
  const qualityLevel = useMemo(() => {
    if (forceQualityLevel) return forceQualityLevel
    
    if (performanceMode === 'performance' || fps < PERFORMANCE_THRESHOLDS.fps.poor) {
      return 'minimal'
    } else if (performanceMode === 'balanced' || fps < PERFORMANCE_THRESHOLDS.fps.good) {
      return 'reduced'
    } else {
      return 'full'
    }
  }, [forceQualityLevel, performanceMode, fps])
  
  // Optimized ball count based on performance
  const optimizedBallCount = useMemo(() => {
    if (qualityLevel === 'minimal') {
      return Math.min(3, config.count)
    } else if (qualityLevel === 'reduced') {
      return Math.min(5, config.count)
    } else {
      return config.count
    }
  }, [qualityLevel, config.count])
  
  const [ballStates, setBallStates] = useState<Array<{id: number, isHovered: boolean}>>(() =>
    Array.from({ length: optimizedBallCount }, (_, index) => ({
      id: index + 1,
      isHovered: false
    }))
  )
  
  // Performance monitoring
  useEffect(() => {
    let frameCount = 0
    let lastTime = performance.now()
    
    const measureFPS = () => {
      const currentTime = performance.now()
      frameCount++
      
      if (currentTime - lastTime >= 1000) {
        setFps(frameCount)
        frameCount = 0
        lastTime = currentTime
      }
      
      requestAnimationFrame(measureFPS)
    }
    
    const measureId = requestAnimationFrame(measureFPS)
    
    return () => cancelAnimationFrame(measureId)
  }, [])
  
  // Optimized animation duration
  const getAnimationDuration = useMemo(() => {
    const baseDuration = ANIMATION_TIMING.dragonBallOrbit / 1000
    const currentDragonState = dragonState || interactionState
    
    let speedMultiplier = config.orbitSpeed
    
    if (currentDragonState === 'active') {
      speedMultiplier *= qualityLevel === 'minimal' ? 1.5 : 2.5
    } else if (currentDragonState === 'ready') {
      speedMultiplier *= qualityLevel === 'minimal' ? 1.2 : 1.8
    }
    
    // Performance-based adjustments
    if (qualityLevel === 'minimal') {
      speedMultiplier *= 0.8 // Slower animations for better performance
    }
    
    return baseDuration / speedMultiplier
  }, [config.orbitSpeed, dragonState, interactionState, qualityLevel])
  
  // Simplified interaction handling
  const handleBallInteraction = useCallback((ballId: number, type: string) => {
    if (!interactive || !config.interactionEnabled) return
    
    switch (type) {
      case 'hover':
        if (qualityLevel !== 'minimal') {
          setBallStates(prev => prev.map(ball => 
            ball.id === ballId ? { ...ball, isHovered: true } : ball
          ))
        }
        break
        
      case 'leave':
        setBallStates(prev => prev.map(ball => 
          ball.id === ballId ? { ...ball, isHovered: false } : ball
        ))
        break
        
      case 'click':
        if (dragonState === 'active') {
          onWishGranted?.()
        }
        break
    }
  }, [interactive, config.interactionEnabled, dragonState, onWishGranted, qualityLevel])
  
  const currentDragonState = dragonState || interactionState
  const isActive = currentDragonState === 'active' || currentDragonState === 'powering-up'
  
  return (
    <div className={`performance-dragon-balls-container ${className}`}>
      {/* Performance indicator (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-0 right-0 text-xs bg-black/70 text-white p-1 rounded">
          FPS: {fps} | Quality: {qualityLevel} | Balls: {optimizedBallCount}
        </div>
      )}
      
      <svg
        ref={svgRef}
        width={radius * 2}
        height={radius * 2}
        viewBox={`${-radius} ${-radius} ${radius * 2} ${radius * 2}`}
        className="performance-dragon-balls-svg"
        style={{ 
          overflow: 'visible',
          // Enable GPU acceleration
          transform: enableGPUAcceleration ? 'translateZ(0)' : undefined,
          willChange: enableGPUAcceleration ? 'transform' : undefined,
          filter: isActive && qualityLevel !== 'minimal' 
            ? 'drop-shadow(0 0 15px rgba(251, 191, 36, 0.5))' 
            : undefined
        }}
      >
        {/* Optimized dragon balls */}
        {Array.from({ length: optimizedBallCount }, (_, index) => {
          const ballId = index + 1
          const ballState = ballStates.find(b => b.id === ballId)
          const phaseOffset = (index * getAnimationDuration) / optimizedBallCount
          
          return (
            <PerformanceOptimizedBall
              key={ballId}
              ballId={ballId}
              starCount={ballId}
              size={ballSize}
              orbitRadius={radius * (0.6 + index * 0.08)}
              orbitSpeed={config.orbitSpeed}
              orbitPattern={orbitalMode}
              isActive={isActive}
              isHovered={ballState?.isHovered || false}
              isInteractive={interactive && config.interactionEnabled}
              animationDuration={getAnimationDuration}
              phaseOffset={phaseOffset}
              qualityLevel={qualityLevel}
              onInteraction={handleBallInteraction}
            />
          )
        })}
        
        {/* Simplified central energy core */}
        {qualityLevel !== 'minimal' && (
          <circle
            cx="0"
            cy="0"
            r={isActive ? 8 : 4}
            fill="rgba(239, 68, 68, 0.8)"
            opacity={isActive ? 0.9 : 0.6}
          >
            {/* Simplified pulse animation */}
            {isActive && qualityLevel === 'full' && (
              <animate
                attributeName="r"
                values="6;10;6"
                dur="1.5s"
                repeatCount="indefinite"
              />
            )}
          </circle>
        )}
      </svg>
      
      {/* Simplified power level indicator */}
      {(currentDragonState !== 'idle' && qualityLevel !== 'minimal') && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
          <div className="px-2 py-1 bg-red-900/80 text-yellow-400 text-xs rounded">
            {currentDragonState === 'active' ? 'MAX!' : 'PWR'}
          </div>
        </div>
      )}
    </div>
  )
}

export default PerformanceSVGDragonBalls