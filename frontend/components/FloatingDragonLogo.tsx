'use client'

import Image from 'next/image'
import { useState } from 'react'

interface FloatingDragonLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
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
      

      {/* Main Dragon Image */}
      <div className={`
        relative ${config.containerSize} 
        animate-dragon-float 
        transition-transform duration-300 
        ${isHovered ? 'scale-110' : 'scale-100'}
      `}>
        <Image
          src="/images/seiron.webp"
          alt="Seiron - The Wish-Granting Dragon"
          width={config.width}
          height={config.height}
          className="object-contain filter drop-shadow-2xl"
          priority
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