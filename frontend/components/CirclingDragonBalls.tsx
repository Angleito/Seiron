'use client'

import { useState, useEffect, useRef } from 'react'

interface CirclingDragonBallsProps {
  radius?: number
  ballSize?: number
  speed?: 'slow' | 'normal' | 'fast'
  className?: string
  interactive?: boolean
}

const speedConfig = {
  slow: '20s',
  normal: '15s',
  fast: '10s'
}

export function CirclingDragonBalls({ 
  radius = 150, 
  ballSize = 32, 
  speed = 'normal',
  className = '',
  interactive = true
}: CirclingDragonBallsProps) {
  const [isHovered, setIsHovered] = useState(false)
  const animationDuration = speedConfig[speed]
  const animationTimersRef = useRef<number[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  // Dragon Ball star patterns (1-7 stars)
  const dragonBalls = [
    { stars: 1, color: 'from-yellow-400 to-orange-400' },
    { stars: 2, color: 'from-orange-400 to-red-400' },
    { stars: 3, color: 'from-yellow-300 to-yellow-500' },
    { stars: 4, color: 'from-orange-300 to-orange-500' },
    { stars: 5, color: 'from-yellow-400 to-orange-400' },
    { stars: 6, color: 'from-orange-400 to-red-400' },
    { stars: 7, color: 'from-yellow-300 to-yellow-500' }
  ]
  
  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      // Clear any remaining animation timers
      animationTimersRef.current.forEach(timer => {
        clearTimeout(timer)
      })
      animationTimersRef.current = []
      
      // Reset hover state
      setIsHovered(false)
    }
  }, [])
  
  // Handle hover state changes with cleanup
  useEffect(() => {
    if (!interactive) return
    
    const handleMouseEnter = () => setIsHovered(true)
    const handleMouseLeave = () => setIsHovered(false)
    
    const container = containerRef.current
    if (container) {
      container.addEventListener('mouseenter', handleMouseEnter)
      container.addEventListener('mouseleave', handleMouseLeave)
      
      return () => {
        container.removeEventListener('mouseenter', handleMouseEnter)
        container.removeEventListener('mouseleave', handleMouseLeave)
      }
    }
    
    // Return empty cleanup function if no container
    return () => {}
  }, [interactive])

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
      style={{ width: `${radius * 2}px`, height: `${radius * 2}px` }}
    >
      {/* Orbital Path Ring */}
      <div 
        className="absolute border border-yellow-400/20 rounded-full animate-pulse"
        style={{
          width: `${radius * 2}px`,
          height: `${radius * 2}px`,
          top: 0,
          left: 0
        }}
      />

      {/* Dragon Balls Container */}
      <div 
        className={`absolute inset-0 ${isHovered ? 'animate-dragon-balls-fast' : 'animate-dragon-balls-orbit'}`}
        style={{ animationDuration: isHovered ? '5s' : animationDuration }}
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
            {/* Dragon Ball */}
            <div className={`
              w-full h-full rounded-full relative overflow-hidden shadow-lg
              bg-gradient-to-br ${ball.color}
              transition-transform duration-300
              ${isHovered ? 'scale-125' : 'scale-100'}
              animate-dragon-ball-float
            `}
            style={{ animationDelay: `${index * 0.3}s` }}
            >
              {/* Stars inside the ball */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-red-600 text-xs font-bold leading-none">
                  {Array.from({ length: ball.stars }, (_, i) => (
                    <span key={i} className="inline-block animate-star-twinkle" style={{ animationDelay: `${i * 0.2}s` }}>
                      ★
                    </span>
                  ))}
                </div>
              </div>

              {/* Ball highlight */}
              <div className="absolute top-1 left-1 w-2 h-2 bg-yellow-200 rounded-full opacity-80" />

              {/* Mystical glow */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400/30 to-transparent animate-mystical-glow" />

              {/* Particle trail effect */}
              <div className="absolute -inset-1 rounded-full bg-yellow-400/20 blur-sm animate-pulse" />
            </div>

            {/* Energy trail */}
            <div 
              className="absolute w-1 h-1 bg-yellow-400 rounded-full opacity-60 animate-trail"
              style={{
                transform: 'translateX(-20px)',
                animationDelay: `${index * 0.1}s`
              }}
            />
          </div>
        ))}
      </div>

      {/* Central energy burst */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-4 h-4 bg-gradient-to-r from-red-400 to-orange-400 rounded-full animate-power-pulse" />
      </div>

      {/* Power level indicator */}
      {isHovered && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="px-3 py-1 bg-red-900/80 text-yellow-400 text-xs font-bold rounded-full border border-yellow-400/50">
            Power Level: Over 9000!
          </div>
        </div>
      )}
    </div>
  )
}