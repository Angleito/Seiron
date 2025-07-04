'use client'

import React, { useRef, useEffect, useState } from 'react'
import Image from 'next/image'
import { DragonInteractionProvider, useDragonInteraction, useDragonAnimationClasses } from './DragonInteractionController'
import { useDragonState, useDragonOrientation, useDragonAnimation } from '@/hooks/useDragonInteraction'
import { useAnimationPerformance } from '@/hooks/useAnimationPerformance'

interface InteractiveDragonProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showDragonBalls?: boolean
  enableParticles?: boolean
  className?: string
}

const sizeConfig = {
  sm: { width: 120, height: 120, containerSize: 'w-32 h-32' },
  md: { width: 200, height: 200, containerSize: 'w-52 h-52' },
  lg: { width: 300, height: 300, containerSize: 'w-80 h-80' },
  xl: { width: 400, height: 400, containerSize: 'w-96 h-96' }
}

// Dragon component that uses the interaction context
function DragonCore({ size = 'lg', showDragonBalls = true, enableParticles = true, className = '' }: InteractiveDragonProps) {
  const config = sizeConfig[size]
  const animationClasses = useDragonAnimationClasses()
  const { state, intensity, isHovered, setHovered } = useDragonInteraction()
  const { headTransform, eyeTransform, bodyRotation } = useDragonOrientation()
  const { animationSpeed, particleCount, glowIntensity, enableGlow, enableComplexAnimations } = useDragonAnimation()
  
  // State-based visual effects
  const getAuraColor = () => {
    switch (state) {
      case 'active':
        return 'from-red-600/40 via-orange-500/40 to-yellow-400/40'
      case 'ready':
        return 'from-red-500/30 via-orange-500/30 to-yellow-500/30'
      case 'attention':
        return 'from-red-500/20 via-orange-500/20 to-yellow-500/20'
      default:
        return 'from-red-500/10 via-orange-500/10 to-yellow-500/10'
    }
  }
  
  const getDragonBallSpeed = () => {
    switch (state) {
      case 'active':
        return 'animate-dragon-balls-fast'
      case 'ready':
        return 'animate-dragon-balls-orbit'
      default:
        return 'animate-dragon-balls-orbit'
    }
  }
  
  return (
    <div 
      className={`relative ${config.containerSize} ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Dynamic Aura */}
      {enableGlow && (
        <div 
          className={`absolute inset-0 rounded-full bg-gradient-to-r ${getAuraColor()} blur-xl transition-all duration-500`}
          style={{ opacity: glowIntensity }}
        />
      )}
      
      {/* Dragon Balls Orbiting */}
      {showDragonBalls && enableComplexAnimations && (
        <div className={`absolute inset-0 ${getDragonBallSpeed()}`}>
          {[1, 2, 3, 4, 5, 6, 7].map((stars, index) => (
            <DragonBall
              key={stars}
              stars={stars}
              index={index}
              size={config.width}
              intensity={intensity}
              isActive={state === 'active'}
            />
          ))}
        </div>
      )}

      {/* Main Dragon with Interactive Transforms */}
      <div 
        className={`relative ${config.containerSize} ${animationClasses.join(' ')}`}
        style={{
          transform: `perspective(1000px) rotateY(${bodyRotation}deg)`,
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Dragon Head (follows cursor) */}
        <div 
          className="relative w-full h-full transition-transform duration-200"
          style={{
            transform: headTransform
          }}
        >
          <Image
            src="/images/seiron.png"
            alt="Seiron - The Wish-Granting Dragon"
            width={config.width}
            height={config.height}
            className="object-contain filter drop-shadow-2xl"
            priority
          />
          
          {/* Dragon Eyes (track cursor) */}
          <div 
            className="absolute top-[30%] left-[40%] w-[20%] h-[10%] pointer-events-none"
            style={{
              transform: eyeTransform
            }}
          >
            {/* Eye glow effect */}
            {(state === 'ready' || state === 'active') && (
              <>
                <div className="absolute left-0 w-2 h-2 bg-red-500 rounded-full animate-pulse blur-sm" />
                <div className="absolute right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse blur-sm" />
              </>
            )}
          </div>
        </div>
        
        {/* Dragon Breath Effect */}
        {state === 'active' && enableComplexAnimations && (
          <div className="absolute bottom-[20%] left-[50%] transform -translate-x-1/2">
            <div className="relative">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-4 h-4 bg-gradient-to-r from-red-500 to-orange-400 rounded-full animate-dragon-fire"
                  style={{
                    left: `${i * 10}px`,
                    animationDelay: `${i * 0.1}s`,
                    filter: 'blur(2px)'
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Particles */}
      {enableParticles && (
        <ParticleSystem count={particleCount} intensity={intensity} />
      )}

      {/* Power Rings */}
      {(state === 'ready' || state === 'active') && (
        <>
          <div className="absolute inset-0 border-2 border-red-500/20 rounded-full animate-power-ring" />
          {state === 'active' && (
            <div className="absolute inset-0 border-2 border-orange-500/20 rounded-full animate-power-ring animation-delay-200" />
          )}
        </>
      )}
      
      {/* Interaction Feedback Text */}
      {state !== 'idle' && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 pointer-events-none">
          <p className="text-xs text-orange-400 animate-pulse whitespace-nowrap">
            {state === 'attention' && 'The dragon notices you...'}
            {state === 'ready' && 'Ready to grant wishes!'}
            {state === 'active' && 'Make your wish!'}
          </p>
        </div>
      )}
    </div>
  )
}

// Dragon Ball Component
function DragonBall({ 
  stars, 
  index, 
  size, 
  intensity, 
  isActive 
}: { 
  stars: number
  index: number
  size: number
  intensity: string
  isActive: boolean 
}) {
  const glowIntensity = {
    low: 'shadow-lg',
    medium: 'shadow-xl',
    high: 'shadow-2xl',
    max: 'shadow-2xl drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]'
  }[intensity]
  
  return (
    <div
      className={`absolute w-8 h-8 animate-dragon-ball-float ${isActive ? 'scale-110' : ''}`}
      style={{
        transform: `rotate(${index * 51.43}deg) translateX(${size * 0.6}px) rotate(-${index * 51.43}deg)`,
        animationDelay: `${index * 0.2}s`,
        transition: 'transform 0.3s ease-in-out'
      }}
    >
      <div className={`w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full ${glowIntensity} relative overflow-hidden transition-all duration-300`}>
        {/* Star pattern */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-red-600 text-xs font-bold">
            {'★'.repeat(stars)}
          </div>
        </div>
        {/* Dynamic shine */}
        <div 
          className="absolute top-1 left-1 w-3 h-3 bg-yellow-200 rounded-full transition-opacity duration-300"
          style={{ opacity: isActive ? 0.9 : 0.7 }}
        />
      </div>
    </div>
  )
}

// Particle System Component
function ParticleSystem({ count, intensity }: { count: number; intensity: string }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: Math.random() * 4,
    duration: 3 + Math.random() * 2,
    size: Math.random() * 3 + 1
  }))
  
  const particleOpacity = {
    low: 0.3,
    medium: 0.5,
    high: 0.7,
    max: 0.9
  }[intensity]
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute bg-orange-400 rounded-full animate-ember-rise"
          style={{
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            left: particle.left,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
            opacity: particleOpacity
          }}
        />
      ))}
    </div>
  )
}

// Main Interactive Dragon Component with Provider
export function InteractiveDragon(props: InteractiveDragonProps) {
  const dragonRef = useRef<HTMLDivElement>(null)
  const { performanceMode } = useAnimationPerformance()
  
  // Adjust props based on performance
  const adjustedProps = {
    ...props,
    enableParticles: props.enableParticles !== false && performanceMode !== 'minimal',
    showDragonBalls: props.showDragonBalls !== false && performanceMode !== 'minimal'
  }
  
  return (
    <DragonInteractionProvider dragonRef={dragonRef}>
      <div ref={dragonRef} className="relative">
        <DragonCore {...adjustedProps} />
      </div>
    </DragonInteractionProvider>
  )
}