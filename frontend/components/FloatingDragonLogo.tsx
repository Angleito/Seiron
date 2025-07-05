'use client'

import { useState } from 'react'

interface FloatingDragonLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showDragonBalls?: boolean
  className?: string
}

const sizeConfig = {
  sm: { width: 120, height: 120, containerSize: 'w-32 h-32' },
  md: { width: 200, height: 200, containerSize: 'w-52 h-52' },
  lg: { width: 300, height: 300, containerSize: 'w-80 h-80' },
  xl: { width: 400, height: 400, containerSize: 'w-96 h-96' }
}

export function FloatingDragonLogo({ 
  size = 'lg', 
  showDragonBalls = true, 
  className = '' 
}: FloatingDragonLogoProps) {
  const [isHovered, setIsHovered] = useState(false)
  const config = sizeConfig[size]

  return (
    <div 
      className={`relative ${config.containerSize} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Mystical Aura */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500/20 via-orange-500/20 to-yellow-500/20 blur-xl animate-dragon-pulse" />
      
      {/* Dragon Balls Orbiting (if enabled) */}
      {showDragonBalls && (
        <div className="absolute inset-0 animate-dragon-balls-orbit">
          {[1, 2, 3, 4, 5, 6, 7].map((stars, index) => (
            <div
              key={stars}
              className="absolute w-8 h-8 animate-dragon-ball-float"
              style={{
                transform: `rotate(${index * 51.43}deg) translateX(${config.width * 0.6}px) rotate(-${index * 51.43}deg)`,
                animationDelay: `${index * 0.2}s`
              }}
            >
              <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full shadow-lg relative overflow-hidden">
                {/* Star pattern inside ball */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-red-600 text-xs font-bold">
                    {'★'.repeat(stars)}
                  </div>
                </div>
                {/* Ball shine effect */}
                <div className="absolute top-1 left-1 w-3 h-3 bg-yellow-200 rounded-full opacity-70" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Dragon Image */}
      <div className={`
        relative ${config.containerSize} 
        animate-dragon-float 
        transition-transform duration-300 
        ${isHovered ? 'scale-110' : 'scale-100'}
      `}>
        <img
          src="/images/seiron.png"
          alt="Seiron - The Wish-Granting Dragon"
          width={config.width}
          height={config.height}
          className="object-contain filter drop-shadow-2xl"
          loading="eager"
        />
        
        {/* Dragon Glow Effect on Hover */}
        {isHovered && (
          <div className="absolute inset-0 bg-gradient-to-r from-red-400/30 via-orange-400/30 to-yellow-400/30 rounded-full blur-2xl animate-mystical-glow" />
        )}
      </div>

      {/* Floating Embers */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-orange-400 rounded-full animate-ember-rise opacity-60"
            style={{
              left: `${20 + i * 15}%`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${3 + i * 0.5}s`
            }}
          />
        ))}
      </div>

      {/* Power Aura Ring */}
      <div className="absolute inset-0 border-2 border-red-500/20 rounded-full animate-power-ring" />
    </div>
  )
}