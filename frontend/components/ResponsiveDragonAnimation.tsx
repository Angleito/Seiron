'use client'

import { useResponsive, getResponsiveValue } from '@hooks/useResponsive'
import { FloatingDragonLogo } from './FloatingDragonLogo'
import { CirclingDragonBalls } from './CirclingDragonBalls'
import { useState, useEffect } from 'react'

interface ResponsiveDragonAnimationProps {
  className?: string
  showDragonBalls?: boolean
  interactive?: boolean
  autoScale?: boolean
  performanceMode?: 'auto' | 'high' | 'balanced' | 'low'
}

// Performance configurations
const PERFORMANCE_CONFIG = {
  high: {
    dragonBallCount: 7,
    animationSpeed: 'normal' as const,
    particleEffects: true,
    glowEffects: true,
    complexAnimations: true
  },
  balanced: {
    dragonBallCount: 5,
    animationSpeed: 'normal' as const,
    particleEffects: true,
    glowEffects: true,
    complexAnimations: false
  },
  low: {
    dragonBallCount: 3,
    animationSpeed: 'slow' as const,
    particleEffects: false,
    glowEffects: false,
    complexAnimations: false
  }
}

export function ResponsiveDragonAnimation({
  className = '',
  showDragonBalls = true,
  interactive = true,
  autoScale = true,
  performanceMode = 'auto'
}: ResponsiveDragonAnimationProps) {
  const {
    breakpoint,
    isPortrait,
    isLandscape,
    isTouchDevice,
    prefersReducedMotion,
    isLowBattery,
    width,
    height,
    pixelRatio
  } = useResponsive()

  const [isPressed, setIsPressed] = useState(false)
  const [powerLevel, setPowerLevel] = useState(1)
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 })

  // Determine actual performance mode
  const getActualPerformanceMode = () => {
    if (performanceMode !== 'auto') return performanceMode
    
    // Auto-detect best performance mode
    if (prefersReducedMotion || isLowBattery) return 'low'
    if (width < 768 || pixelRatio > 2) return 'balanced'
    return 'high'
  }

  const actualPerformanceMode = getActualPerformanceMode()
  const performanceConfig = PERFORMANCE_CONFIG[actualPerformanceMode]

  // Responsive sizing configuration
  const dragonSize = getResponsiveValue(breakpoint, {
    xs: 'sm',
    sm: 'sm',
    md: 'md',
    lg: 'lg',
    xl: 'xl',
    '2xl': 'xl'
  }, 'md') as 'sm' | 'md' | 'lg' | 'xl' || 'md'

  // Dragon ball configuration based on screen size and orientation
  const getDragonBallConfig = () => {
    const baseRadius = getResponsiveValue(breakpoint, {
      xs: 60,
      sm: 80,
      md: 120,
      lg: 150,
      xl: 180,
      '2xl': 200
    }, 100)

    const ballSize = getResponsiveValue(breakpoint, {
      xs: 20,
      sm: 24,
      md: 28,
      lg: 32,
      xl: 36,
      '2xl': 40
    }, 28)

    // Adjust for orientation
    const orientationMultiplier = isPortrait ? 0.8 : 1
    
    return {
      radius: Math.min(baseRadius * orientationMultiplier, width * 0.35),
      ballSize: ballSize * orientationMultiplier,
      ballCount: Math.min(performanceConfig.dragonBallCount, isPortrait ? 5 : 7)
    }
  }

  const dragonBallConfig = getDragonBallConfig()

  // Touch interaction handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!interactive || !isTouchDevice) return
    
    const touch = e.touches[0]
    if (!touch) return
    
    setTouchStartPos({ x: touch.clientX, y: touch.clientY })
    setIsPressed(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!interactive || !isPressed) return
    
    const touch = e.touches[0]
    if (!touch) return
    
    const deltaX = touch.clientX - touchStartPos.x
    const deltaY = touch.clientY - touchStartPos.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    
    // Swipe detection for power-up
    if (distance > 50) {
      setPowerLevel(Math.min(powerLevel + 0.1, 3))
    }
  }

  const handleTouchEnd = () => {
    setIsPressed(false)
    // Gradually decrease power level
    const decreasePower = setInterval(() => {
      setPowerLevel(prev => {
        if (prev <= 1) {
          clearInterval(decreasePower)
          return 1
        }
        return prev - 0.05
      })
    }, 100)
  }

  // Mouse interaction for non-touch devices
  const handleMouseDown = () => {
    if (!interactive || isTouchDevice) return
    setIsPressed(true)
  }

  const handleMouseUp = () => {
    if (!interactive || isTouchDevice) return
    setIsPressed(false)
  }

  // Accessibility keyboard controls
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!interactive) return
    
    switch (e.key) {
      case ' ':
      case 'Enter':
        setIsPressed(true)
        setPowerLevel(Math.min(powerLevel + 0.5, 3))
        break
      case 'ArrowUp':
        setPowerLevel(Math.min(powerLevel + 0.2, 3))
        break
      case 'ArrowDown':
        setPowerLevel(Math.max(powerLevel - 0.2, 1))
        break
    }
  }

  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      setIsPressed(false)
    }
  }

  // Calculate container size based on viewport
  const containerStyle = autoScale ? {
    width: isPortrait ? '90vw' : '50vw',
    maxWidth: isPortrait ? '400px' : '600px',
    height: isPortrait ? 'auto' : '70vh',
    maxHeight: '600px'
  } : {}

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={containerStyle}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      tabIndex={interactive ? 0 : -1}
      role={interactive ? "button" : "img"}
      aria-label={interactive ? "Interactive dragon animation. Press and hold to power up." : "Dragon animation"}
      aria-pressed={isPressed}
    >
      {/* Performance indicator for development */}
      {import.meta.env.DEV && (
        <div className="absolute top-0 left-0 bg-black/50 text-white text-xs p-1 rounded z-50">
          {actualPerformanceMode} | {breakpoint} | {isPortrait ? 'P' : 'L'}
        </div>
      )}

      {/* Dragon Balls Container */}
      {showDragonBalls && performanceConfig.dragonBallCount > 0 && (
        <div 
          className={`absolute inset-0 flex items-center justify-center transition-transform duration-300 ${
            isPressed ? 'scale-110' : 'scale-100'
          }`}
          style={{
            filter: performanceConfig.glowEffects && powerLevel > 1 
              ? `drop-shadow(0 0 ${20 * powerLevel}px rgba(251, 191, 36, ${0.3 * powerLevel}))`
              : undefined
          }}
        >
          <CirclingDragonBalls
            radius={dragonBallConfig.radius}
            ballSize={dragonBallConfig.ballSize}
            speed={performanceConfig.animationSpeed}
            interactive={interactive && !prefersReducedMotion}
            className={prefersReducedMotion ? 'motion-reduce' : ''}
          />
        </div>
      )}

      {/* Main Dragon */}
      <div 
        className={`relative z-10 transition-all duration-300 ${
          isPressed ? 'scale-125' : 'scale-100'
        }`}
        style={{
          transform: `scale(${powerLevel})`,
          filter: performanceConfig.complexAnimations && powerLevel > 1.5
            ? `brightness(${1 + (powerLevel - 1) * 0.3}) contrast(${1 + (powerLevel - 1) * 0.2})`
            : undefined
        }}
      >
        <FloatingDragonLogo
          size={dragonSize}
          showDragonBalls={false}
          className={prefersReducedMotion ? 'motion-reduce' : ''}
        />
      </div>

      {/* Power level indicator */}
      {interactive && powerLevel > 1.1 && (
        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
          <div className="relative w-32 h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-yellow-400 to-red-500 transition-all duration-300"
              style={{ width: `${((powerLevel - 1) / 2) * 100}%` }}
            />
          </div>
          <div className="text-center text-xs text-yellow-400 mt-1 font-bold">
            Power: {Math.round((powerLevel - 1) * 100)}%
          </div>
        </div>
      )}

      {/* Touch interaction hint */}
      {interactive && isTouchDevice && (
        <div className="absolute -bottom-20 left-1/2 transform -translate-x-1/2 text-center">
          <p className="text-xs text-gray-500 animate-pulse">
            {isPressed ? 'Swipe to charge power!' : 'Press and hold the dragon'}
          </p>
        </div>
      )}

      {/* Accessibility announcements */}
      <div className="sr-only" role="status" aria-live="polite">
        {powerLevel > 1.5 && `Dragon power level: ${Math.round((powerLevel - 1) * 100)}%`}
      </div>
    </div>
  )
}