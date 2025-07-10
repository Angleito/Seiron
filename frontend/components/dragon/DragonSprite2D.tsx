'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { VoiceAnimationState } from './DragonRenderer'

// Extended Dragon Sprite Types
export type DragonSpriteType = 'shenron' | 'porunga' | 'baby' | 'guardian' | 'storm' | 'fire' | 'ice' | 'earth'
export type DragonAnimationState = 'idle' | 'active' | 'sleeping' | 'excited' | 'attacking' | 'defending' | 'casting'
export type DragonSize = 'tiny' | 'small' | 'medium' | 'large' | 'giant'
export type DragonMood = 'calm' | 'happy' | 'angry' | 'sad' | 'focused' | 'playful' | 'majestic'

interface DragonSpriteProps {
  type: DragonSpriteType
  size?: DragonSize
  mood?: DragonMood
  animationState?: DragonAnimationState
  voiceState?: VoiceAnimationState
  enableInteraction?: boolean
  enableParticles?: boolean
  enableAura?: boolean
  enableBreath?: boolean
  enableWings?: boolean
  customColors?: {
    primary: string
    secondary: string
    accent: string
    glow: string
  }
  onClick?: () => void
  onHover?: (isHovered: boolean) => void
  onAnimationComplete?: (animationType: string) => void
  className?: string
}

interface DragonConfig {
  name: string
  description: string
  baseColors: {
    primary: string
    secondary: string
    accent: string
    glow: string
  }
  features: {
    hasWings: boolean
    hasHorns: boolean
    hasSpikes: boolean
    hasAura: boolean
    breathType: 'fire' | 'ice' | 'lightning' | 'energy' | 'none'
  }
  personality: {
    aggression: number // 0-1
    playfulness: number // 0-1
    majesty: number // 0-1
    energy: number // 0-1
  }
  animations: {
    breathingSpeed: number
    wingSpeed: number
    tailSpeed: number
    auraSpeed: number
  }
}

// Dragon Configurations
const dragonConfigs: Record<DragonSpriteType, DragonConfig> = {
  shenron: {
    name: 'Shenron',
    description: 'The eternal dragon of Earth',
    baseColors: {
      primary: '#22c55e',
      secondary: '#16a34a',
      accent: '#dcfce7',
      glow: 'rgba(34, 197, 94, 0.6)'
    },
    features: {
      hasWings: false,
      hasHorns: true,
      hasSpikes: true,
      hasAura: true,
      breathType: 'energy'
    },
    personality: {
      aggression: 0.1,
      playfulness: 0.2,
      majesty: 1.0,
      energy: 0.8
    },
    animations: {
      breathingSpeed: 0.8,
      wingSpeed: 0,
      tailSpeed: 0.6,
      auraSpeed: 0.7
    }
  },
  porunga: {
    name: 'Porunga',
    description: 'The Namekian dragon of wishes',
    baseColors: {
      primary: '#f97316',
      secondary: '#ea580c',
      accent: '#fed7aa',
      glow: 'rgba(249, 115, 22, 0.6)'
    },
    features: {
      hasWings: false,
      hasHorns: true,
      hasSpikes: false,
      hasAura: true,
      breathType: 'energy'
    },
    personality: {
      aggression: 0.2,
      playfulness: 0.3,
      majesty: 0.9,
      energy: 0.7
    },
    animations: {
      breathingSpeed: 0.9,
      wingSpeed: 0,
      tailSpeed: 0.7,
      auraSpeed: 0.8
    }
  },
  baby: {
    name: 'Baby Dragon',
    description: 'A playful young dragon',
    baseColors: {
      primary: '#3b82f6',
      secondary: '#2563eb',
      accent: '#dbeafe',
      glow: 'rgba(59, 130, 246, 0.6)'
    },
    features: {
      hasWings: true,
      hasHorns: false,
      hasSpikes: false,
      hasAura: false,
      breathType: 'fire'
    },
    personality: {
      aggression: 0.1,
      playfulness: 1.0,
      majesty: 0.2,
      energy: 0.9
    },
    animations: {
      breathingSpeed: 1.5,
      wingSpeed: 1.8,
      tailSpeed: 1.3,
      auraSpeed: 0
    }
  },
  guardian: {
    name: 'Guardian Dragon',
    description: 'Protector of the sacred realm',
    baseColors: {
      primary: '#8b5cf6',
      secondary: '#7c3aed',
      accent: '#e9d5ff',
      glow: 'rgba(139, 92, 246, 0.6)'
    },
    features: {
      hasWings: true,
      hasHorns: true,
      hasSpikes: true,
      hasAura: true,
      breathType: 'energy'
    },
    personality: {
      aggression: 0.4,
      playfulness: 0.2,
      majesty: 0.9,
      energy: 0.6
    },
    animations: {
      breathingSpeed: 0.6,
      wingSpeed: 0.8,
      tailSpeed: 0.5,
      auraSpeed: 0.6
    }
  },
  storm: {
    name: 'Storm Dragon',
    description: 'Master of lightning and wind',
    baseColors: {
      primary: '#eab308',
      secondary: '#ca8a04',
      accent: '#fef3c7',
      glow: 'rgba(234, 179, 8, 0.6)'
    },
    features: {
      hasWings: true,
      hasHorns: true,
      hasSpikes: true,
      hasAura: true,
      breathType: 'lightning'
    },
    personality: {
      aggression: 0.7,
      playfulness: 0.4,
      majesty: 0.7,
      energy: 1.0
    },
    animations: {
      breathingSpeed: 1.2,
      wingSpeed: 1.5,
      tailSpeed: 1.0,
      auraSpeed: 1.3
    }
  },
  fire: {
    name: 'Fire Dragon',
    description: 'Born from the flames of battle',
    baseColors: {
      primary: '#ef4444',
      secondary: '#dc2626',
      accent: '#fecaca',
      glow: 'rgba(239, 68, 68, 0.6)'
    },
    features: {
      hasWings: true,
      hasHorns: true,
      hasSpikes: true,
      hasAura: true,
      breathType: 'fire'
    },
    personality: {
      aggression: 0.9,
      playfulness: 0.3,
      majesty: 0.6,
      energy: 0.8
    },
    animations: {
      breathingSpeed: 1.3,
      wingSpeed: 1.2,
      tailSpeed: 1.1,
      auraSpeed: 1.1
    }
  },
  ice: {
    name: 'Ice Dragon',
    description: 'Frozen guardian of the north',
    baseColors: {
      primary: '#06b6d4',
      secondary: '#0891b2',
      accent: '#cffafe',
      glow: 'rgba(6, 182, 212, 0.6)'
    },
    features: {
      hasWings: true,
      hasHorns: true,
      hasSpikes: true,
      hasAura: true,
      breathType: 'ice'
    },
    personality: {
      aggression: 0.3,
      playfulness: 0.1,
      majesty: 0.8,
      energy: 0.4
    },
    animations: {
      breathingSpeed: 0.5,
      wingSpeed: 0.7,
      tailSpeed: 0.4,
      auraSpeed: 0.5
    }
  },
  earth: {
    name: 'Earth Dragon',
    description: 'Ancient guardian of the land',
    baseColors: {
      primary: '#84cc16',
      secondary: '#65a30d',
      accent: '#ecfccb',
      glow: 'rgba(132, 204, 22, 0.6)'
    },
    features: {
      hasWings: false,
      hasHorns: true,
      hasSpikes: true,
      hasAura: true,
      breathType: 'energy'
    },
    personality: {
      aggression: 0.2,
      playfulness: 0.1,
      majesty: 1.0,
      energy: 0.3
    },
    animations: {
      breathingSpeed: 0.4,
      wingSpeed: 0,
      tailSpeed: 0.3,
      auraSpeed: 0.4
    }
  }
}

// Size configurations
const sizeConfigs = {
  tiny: { scale: 0.5, width: 80, height: 48 },
  small: { scale: 0.75, width: 120, height: 72 },
  medium: { scale: 1, width: 160, height: 96 },
  large: { scale: 1.25, width: 200, height: 120 },
  giant: { scale: 1.5, width: 240, height: 144 }
}

export const DragonSprite2D: React.FC<DragonSpriteProps> = ({
  type,
  size = 'medium',
  mood = 'calm',
  animationState = 'idle',
  voiceState,
  enableInteraction = true,
  enableParticles = true,
  enableAura = true,
  enableBreath = true,
  enableWings = true,
  customColors,
  onClick,
  onHover,
  onAnimationComplete,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [isClicked, setIsClicked] = useState(false)
  const [animationFrame, setAnimationFrame] = useState(0)
  const [currentMood, setCurrentMood] = useState(mood)
  const [particleCount, setParticleCount] = useState(0)
  const dragonRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()

  const config = dragonConfigs[type]
  const sizeConfig = sizeConfigs[size]
  const colors = customColors || config.baseColors

  // Animation loop
  useEffect(() => {
    const animate = () => {
      setAnimationFrame(prev => prev + 1)
      animationRef.current = requestAnimationFrame(animate)
    }
    animate()
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  // Handle interactions
  const handleMouseEnter = useCallback(() => {
    if (!enableInteraction) return
    setIsHovered(true)
    onHover?.(true)
  }, [enableInteraction, onHover])

  const handleMouseLeave = useCallback(() => {
    if (!enableInteraction) return
    setIsHovered(false)
    onHover?.(false)
  }, [enableInteraction, onHover])

  const handleClick = useCallback(() => {
    if (!enableInteraction) return
    setIsClicked(true)
    onClick?.()
    setTimeout(() => setIsClicked(false), 300)
  }, [enableInteraction, onClick])

  // Dynamic mood changes based on voice state
  useEffect(() => {
    if (!voiceState) return
    
    if (voiceState.isSpeaking) {
      setCurrentMood('focused')
    } else if (voiceState.isListening) {
      setCurrentMood('focused')
    } else if (voiceState.isProcessing) {
      setCurrentMood('focused')
    } else {
      setCurrentMood(mood)
    }
  }, [voiceState, mood])

  // Get dynamic scale based on state
  const getDynamicScale = () => {
    let baseScale = sizeConfig.scale
    
    if (isClicked) baseScale *= 1.2
    else if (isHovered) baseScale *= 1.05
    else if (voiceState?.isSpeaking) baseScale *= 1.08
    else if (voiceState?.isListening) baseScale *= 1.03
    
    // Add breathing effect
    const breathingMultiplier = 1 + Math.sin(animationFrame * 0.02 * config.animations.breathingSpeed) * 0.02
    
    return baseScale * breathingMultiplier
  }

  // Get dynamic glow intensity
  const getGlowIntensity = () => {
    let baseIntensity = 0.4
    
    if (isClicked) baseIntensity = 1.0
    else if (isHovered) baseIntensity = 0.7
    else if (voiceState?.isSpeaking) baseIntensity = 0.8
    else if (voiceState?.isListening) baseIntensity = 0.6
    
    // Add pulsing effect
    const pulseMultiplier = 1 + Math.sin(animationFrame * 0.03 * config.animations.auraSpeed) * 0.3
    
    return Math.min(baseIntensity * pulseMultiplier, 1.0)
  }

  // Get animation classes
  const getAnimationClasses = () => {
    const classes = ['dragon-sprite-2d']
    
    if (isClicked) classes.push('clicked')
    else if (isHovered) classes.push('hovered')
    else if (voiceState?.isSpeaking) classes.push('speaking')
    else if (voiceState?.isListening) classes.push('listening')
    else if (voiceState?.isProcessing) classes.push('processing')
    
    classes.push(`mood-${currentMood}`)
    classes.push(`state-${animationState}`)
    classes.push(`type-${type}`)
    
    return classes.join(' ')
  }

  return (
    <div
      ref={dragonRef}
      className={`${getAnimationClasses()} ${className}`}
      style={{
        transform: `scale(${getDynamicScale()})`,
        filter: enableAura && config.features.hasAura ? 
          `drop-shadow(0 0 ${20 + getGlowIntensity() * 30}px ${colors.glow})` : 
          'none',
        cursor: enableInteraction ? 'pointer' : 'default',
        userSelect: 'none',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Main Dragon Body */}
      <div
        className="dragon-body-2d"
        style={{
          width: `${sizeConfig.width}px`,
          height: `${sizeConfig.height}px`,
          background: `linear-gradient(45deg, ${colors.primary}, ${colors.secondary})`,
          borderRadius: type === 'shenron' || type === 'porunga' ? '50%' : '60px 60px 30px 30px',
          border: `2px solid ${colors.secondary}`,
          position: 'relative',
          boxShadow: `inset 0 0 20px ${colors.accent}`,
          overflow: 'visible'
        }}
      >
        {/* Dragon Head */}
        <div
          className="dragon-head-2d"
          style={{
            width: `${sizeConfig.width * 0.3}px`,
            height: `${sizeConfig.height * 0.33}px`,
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
            borderRadius: '30px 30px 20px 20px',
            position: 'absolute',
            top: type === 'shenron' || type === 'porunga' ? '10px' : '-20px',
            left: `${sizeConfig.width * 0.35}px`,
            border: `2px solid ${colors.secondary}`,
            boxShadow: `inset 0 0 10px ${colors.accent}`
          }}
        >
          {/* Eyes */}
          <div className="dragon-eyes">
            <div 
              className="eye left"
              style={{
                position: 'absolute',
                top: '6px',
                left: '8px',
                width: '8px',
                height: '8px',
                background: currentMood === 'angry' ? '#ff0000' : '#ff4444',
                borderRadius: '50%',
                animation: 'eye-glow 2s ease-in-out infinite'
              }}
            />
            <div 
              className="eye right"
              style={{
                position: 'absolute',
                top: '6px',
                right: '8px',
                width: '8px',
                height: '8px',
                background: currentMood === 'angry' ? '#ff0000' : '#ff4444',
                borderRadius: '50%',
                animation: 'eye-glow 2s ease-in-out infinite'
              }}
            />
          </div>
          
          {/* Horns */}
          {config.features.hasHorns && (
            <div className="dragon-horns">
              <div 
                className="horn left"
                style={{
                  position: 'absolute',
                  top: '-8px',
                  left: '6px',
                  width: '4px',
                  height: '12px',
                  background: colors.secondary,
                  borderRadius: '2px 2px 0 0',
                  transform: 'rotate(-10deg)'
                }}
              />
              <div 
                className="horn right"
                style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '6px',
                  width: '4px',
                  height: '12px',
                  background: colors.secondary,
                  borderRadius: '2px 2px 0 0',
                  transform: 'rotate(10deg)'
                }}
              />
            </div>
          )}
        </div>

        {/* Wings */}
        {enableWings && config.features.hasWings && (
          <div className="dragon-wings">
            <div
              className="wing left"
              style={{
                position: 'absolute',
                width: `${sizeConfig.width * 0.4}px`,
                height: `${sizeConfig.height * 0.5}px`,
                background: `linear-gradient(45deg, ${colors.accent}, ${colors.primary})`,
                borderRadius: '50px 20px 50px 20px',
                top: `${sizeConfig.height * 0.1}px`,
                left: `${-sizeConfig.width * 0.3}px`,
                border: `2px solid ${colors.secondary}`,
                transformOrigin: 'right center',
                animation: `wing-flap-left ${2 / config.animations.wingSpeed}s ease-in-out infinite`
              }}
            />
            <div
              className="wing right"
              style={{
                position: 'absolute',
                width: `${sizeConfig.width * 0.4}px`,
                height: `${sizeConfig.height * 0.5}px`,
                background: `linear-gradient(45deg, ${colors.accent}, ${colors.primary})`,
                borderRadius: '20px 50px 20px 50px',
                top: `${sizeConfig.height * 0.1}px`,
                right: `${-sizeConfig.width * 0.3}px`,
                border: `2px solid ${colors.secondary}`,
                transformOrigin: 'left center',
                animation: `wing-flap-right ${2 / config.animations.wingSpeed}s ease-in-out infinite`
              }}
            />
          </div>
        )}

        {/* Tail */}
        <div
          className="dragon-tail-2d"
          style={{
            position: 'absolute',
            width: `${sizeConfig.width * 0.6}px`,
            height: `${sizeConfig.height * 0.17}px`,
            background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
            borderRadius: '10px',
            bottom: `${sizeConfig.height * 0.17}px`,
            right: `${-sizeConfig.width * 0.4}px`,
            border: `2px solid ${colors.secondary}`,
            transformOrigin: 'left center',
            animation: `tail-sway ${4 / config.animations.tailSpeed}s ease-in-out infinite`
          }}
        />

        {/* Spikes */}
        {config.features.hasSpikes && (
          <div className="dragon-spikes">
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className="spike"
                style={{
                  position: 'absolute',
                  width: '6px',
                  height: '12px',
                  background: colors.secondary,
                  borderRadius: '3px 3px 0 0',
                  top: '-6px',
                  left: `${20 + i * 20}px`,
                  transform: `rotate(${(i - 2) * 15}deg)`
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Aura Effect */}
      {enableAura && config.features.hasAura && (
        <div
          className="dragon-aura-2d"
          style={{
            position: 'absolute',
            inset: `-${sizeConfig.width * 0.25}px`,
            background: `radial-gradient(circle, transparent 50%, ${colors.glow} 70%, transparent 85%)`,
            borderRadius: '50%',
            animation: `aura-pulse ${3 / config.animations.auraSpeed}s ease-in-out infinite`,
            pointerEvents: 'none'
          }}
        />
      )}

      {/* Breath Effect */}
      {enableBreath && config.features.breathType !== 'none' && (isHovered || voiceState?.isSpeaking) && (
        <div className="dragon-breath-2d">
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className="breath-particle-2d"
              style={{
                position: 'absolute',
                width: '6px',
                height: '6px',
                background: config.features.breathType === 'fire' ? 
                  `radial-gradient(circle, #ff4444, #ff0000)` :
                  config.features.breathType === 'ice' ?
                  `radial-gradient(circle, #44ccff, #0088ff)` :
                  config.features.breathType === 'lightning' ?
                  `radial-gradient(circle, #ffff44, #ffcc00)` :
                  `radial-gradient(circle, ${colors.primary}, ${colors.secondary})`,
                borderRadius: '50%',
                left: `${sizeConfig.width * 0.8 + i * 8}px`,
                top: `${sizeConfig.height * 0.4 + Math.sin(animationFrame * 0.1 + i) * 8}px`,
                animation: `breath-${config.features.breathType} ${1 + i * 0.15}s ease-out infinite`,
                animationDelay: `${i * 0.1}s`,
                pointerEvents: 'none'
              }}
            />
          ))}
        </div>
      )}

      {/* Particle Effects */}
      {enableParticles && (isHovered || isClicked) && (
        <div className="dragon-particles-2d">
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className="particle-2d"
              style={{
                position: 'absolute',
                width: '3px',
                height: '3px',
                background: colors.accent,
                borderRadius: '50%',
                left: `${Math.random() * sizeConfig.width}px`,
                top: `${Math.random() * sizeConfig.height}px`,
                animation: `particle-float ${2 + Math.random() * 2}s ease-out infinite`,
                animationDelay: `${Math.random() * 2}s`,
                pointerEvents: 'none'
              }}
            />
          ))}
        </div>
      )}

      {/* Embedded Styles */}
      <style jsx>{`
        @keyframes eye-glow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        
        @keyframes particle-float {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(${Math.random() * 60 - 30}px, -40px) scale(0.3); opacity: 0; }
        }
        
        @keyframes breath-fire {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(50px, -30px) scale(0.2); opacity: 0; }
        }
        
        @keyframes breath-ice {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(40px, -20px) scale(0.3); opacity: 0; }
        }
        
        @keyframes breath-lightning {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(60px, -40px) scale(0.1); opacity: 0; }
        }
        
        @keyframes breath-energy {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(45px, -25px) scale(0.4); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

export default DragonSprite2D