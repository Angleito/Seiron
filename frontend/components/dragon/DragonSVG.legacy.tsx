'use client'

import { motion } from 'framer-motion'
import type { DragonState, DragonMood } from './types'

interface DragonSVGProps {
  state: DragonState
  mood: DragonMood
  powerLevel: number
  size: { width: number; height: number }
  className?: string
  enableAnimations?: boolean
  qualityLevel?: number
  isHovered?: boolean
  breathingRate?: number
  eyePosition?: { x: number; y: number }
  armsVariant?: 'crossed' | 'ready' | 'attack' | 'defensive' | 'open'
  isTouching?: boolean
  touchPosition?: { x: number; y: number }
}

// Dragon body parts with state-responsive colors and gradients
const getDragonColors = (state: DragonState, powerLevel: number) => {
  const baseColors = {
    idle: { primary: '#ef4444', secondary: '#fb923c', accent: '#fcd34d' },
    attention: { primary: '#dc2626', secondary: '#ea580c', accent: '#f59e0b' },
    ready: { primary: '#b91c1c', secondary: '#c2410c', accent: '#d97706' },
    active: { primary: '#991b1b', secondary: '#9a3412', accent: '#b45309' },
    'powering-up': { primary: '#7f1d1d', secondary: '#7c2d12', accent: '#92400e' },
    'arms-crossed': { primary: '#dc2626', secondary: '#ea580c', accent: '#f59e0b' },
    sleeping: { primary: '#6b7280', secondary: '#9ca3af', accent: '#d1d5db' },
    awakening: { primary: '#8b5cf6', secondary: '#a78bfa', accent: '#c4b5fd' }
  }

  const colors = baseColors[state] || baseColors.idle
  
  // Power level affects saturation and brightness
  const powerMultiplier = Math.min(1 + (powerLevel / 10000), 2)
  
  return {
    primary: colors.primary,
    secondary: colors.secondary,
    accent: colors.accent,
    glow: state === 'powering-up' ? '#facc15' : colors.accent,
    powerMultiplier
  }
}

// Eye animation based on state and mouse tracking
const getEyeAnimation = (state: DragonState, eyePosition?: { x: number; y: number }) => {
  const baseEye = { cx: 180, cy: 120, pupilX: 180, pupilY: 120 }
  
  if (eyePosition && state !== 'sleeping') {
    // Track mouse/touch position
    const maxMovement = 8
    const trackingX = Math.max(-maxMovement, Math.min(maxMovement, eyePosition.x * 0.1))
    const trackingY = Math.max(-maxMovement, Math.min(maxMovement, eyePosition.y * 0.1))
    
    return {
      ...baseEye,
      pupilX: baseEye.pupilX + trackingX,
      pupilY: baseEye.pupilY + trackingY
    }
  }
  
  // State-based eye behavior
  switch (state) {
    case 'sleeping':
      return { ...baseEye, pupilX: baseEye.pupilX, pupilY: baseEye.pupilY + 10, closed: true }
    case 'attention':
      return { ...baseEye, pupilX: baseEye.pupilX - 3, pupilY: baseEye.pupilY - 2 }
    case 'ready':
      return { ...baseEye, pupilX: baseEye.pupilX, pupilY: baseEye.pupilY - 3 }
    case 'active':
    case 'powering-up':
      return { ...baseEye, pupilX: baseEye.pupilX, pupilY: baseEye.pupilY - 5 }
    default:
      return baseEye
  }
}

// Wing position based on state
const getWingAnimation = (state: DragonState) => {
  switch (state) {
    case 'sleeping':
      return { rotation: -25, y: 20 }
    case 'attention':
      return { rotation: -10, y: 5 }
    case 'ready':
      return { rotation: -5, y: 0 }
    case 'active':
    case 'powering-up':
      return { rotation: 0, y: -10 }
    case 'arms-crossed':
      return { rotation: -15, y: 10 }
    default:
      return { rotation: -8, y: 2 }
  }
}

export function DragonSVG({
  state,
  mood,
  powerLevel,
  size,
  className = '',
  enableAnimations = true,
  qualityLevel = 75,
  isHovered = false,
  breathingRate = 1,
  eyePosition,
  armsVariant = 'open',
  isTouching = false,
  touchPosition
}: DragonSVGProps) {
  const colors = getDragonColors(state, powerLevel)
  const eyeAnim = getEyeAnimation(state, eyePosition)
  const wingAnim = getWingAnimation(state)
  
  // Performance-based feature toggles
  const enableComplexAnimations = qualityLevel > 50
  const enableParticleEffects = qualityLevel > 75
  const enableHighQualityFilters = qualityLevel > 60
  const shouldUseGPUAcceleration = qualityLevel > 30
  
  // Responsive animation scaling
  const isMobile = size.width < 200
  const animationScale = isMobile ? 0.8 : 1
  const animationDuration = isMobile ? 1.5 : 1
  
  // Animation variants for different SVG elements
  const bodyVariants = {
    idle: { 
      scale: 1,
      filter: 'brightness(1) saturate(1)',
      transition: { duration: 0.6, ease: 'easeInOut' }
    },
    attention: { 
      scale: 1.02,
      filter: 'brightness(1.05) saturate(1.1)',
      transition: { duration: 0.4 }
    },
    ready: { 
      scale: 1.05,
      filter: 'brightness(1.1) saturate(1.2)',
      transition: { duration: 0.8 }
    },
    active: { 
      scale: 1.1,
      filter: 'brightness(1.2) saturate(1.3)',
      transition: { duration: 0.6 }
    },
    'powering-up': { 
      scale: [1, 1.15, 1.1],
      filter: [
        'brightness(1.2) saturate(1.3)',
        'brightness(1.5) saturate(1.6) hue-rotate(10deg)',
        'brightness(1.3) saturate(1.4) hue-rotate(5deg)'
      ],
      transition: { duration: 1.5, times: [0, 0.6, 1] }
    },
    'arms-crossed': { 
      scale: 1.08,
      filter: 'brightness(1.15) saturate(1.3)',
      transition: { duration: 0.8 }
    },
    sleeping: { 
      scale: 0.95,
      filter: 'brightness(0.8) saturate(0.7)',
      transition: { duration: 1.2 }
    },
    awakening: { 
      scale: [0.95, 1.1, 1.02],
      filter: [
        'brightness(0.8) saturate(0.7)',
        'brightness(1.3) saturate(1.4) hue-rotate(15deg)',
        'brightness(1.05) saturate(1.1)'
      ],
      transition: { duration: 2, times: [0, 0.7, 1] }
    }
  }

  const glowVariants = {
    idle: { opacity: 0.2, scale: 1 },
    attention: { opacity: 0.3, scale: 1.1 },
    ready: { opacity: 0.4, scale: 1.2 },
    active: { opacity: 0.6, scale: 1.3 },
    'powering-up': { 
      opacity: [0.6, 1, 0.8], 
      scale: [1.3, 1.8, 1.5],
      transition: { duration: 1.5, repeat: Infinity }
    },
    'arms-crossed': { opacity: 0.5, scale: 1.25 },
    sleeping: { opacity: 0.1, scale: 0.9 },
    awakening: { opacity: [0.1, 0.8, 0.4], scale: [0.9, 1.4, 1.1] }
  }

  // Calculate responsive scale factor
  const scaleFactor = Math.min(size.width / 400, size.height / 400)
  const responsiveViewBox = `0 0 ${400 / scaleFactor} ${400 / scaleFactor}`
  
  return (
    <motion.svg
      width={size.width}
      height={size.height}
      viewBox={responsiveViewBox}
      className={`dragon-svg ${className}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ 
        filter: state === 'powering-up' && enableHighQualityFilters ? 
          'drop-shadow(0 0 20px rgba(251, 191, 36, 0.6))' : 'none',
        willChange: enableAnimations && shouldUseGPUAcceleration ? 'transform, filter' : 'auto',
        maxWidth: '100%',
        maxHeight: '100%'
      }}
      initial={state}
      animate={state}
      variants={bodyVariants}
    >
      {/* Definitions for gradients and filters */}
      <defs>
        {/* Body gradient */}
        <radialGradient id={`bodyGradient-${state}`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={colors.accent} stopOpacity="0.9" />
          <stop offset="50%" stopColor={colors.primary} stopOpacity="1" />
          <stop offset="100%" stopColor={colors.secondary} stopOpacity="0.8" />
        </radialGradient>
        
        {/* Belly gradient */}
        <linearGradient id={`bellyGradient-${state}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={colors.accent} stopOpacity="0.7" />
          <stop offset="100%" stopColor={colors.secondary} stopOpacity="0.9" />
        </linearGradient>
        
        {/* Wing gradient */}
        <radialGradient id={`wingGradient-${state}`} cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor={colors.accent} stopOpacity="0.6" />
          <stop offset="50%" stopColor={colors.primary} stopOpacity="0.8" />
          <stop offset="100%" stopColor={colors.secondary} stopOpacity="0.9" />
        </radialGradient>
        
        {/* Power glow filter */}
        <filter id="powerGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        
        {/* Breathing animation filter */}
        <filter id="breathingGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1" result="breathing"/>
          <feMerge>
            <feMergeNode in="breathing"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Background glow aura - Performance aware */}
      {enableAnimations && enableComplexAnimations && (
        <motion.circle
          cx="200"
          cy="200"
          r="180"
          fill={`url(#bodyGradient-${state})`}
          opacity="0.1"
          className="dragon-aura"
          variants={glowVariants}
          initial={state}
          animate={state}
          style={{
            filter: enableHighQualityFilters ? 'blur(20px)' : 'blur(10px)',
            willChange: shouldUseGPUAcceleration ? 'opacity, transform' : 'auto'
          }}
        />
      )}

      {/* Dragon Body */}
      <motion.g className="dragon-body" filter={enableAnimations ? "url(#breathingGlow)" : undefined}>
        {/* Main body */}
        <motion.ellipse
          cx="200"
          cy="220"
          rx="80"
          ry="100"
          fill={`url(#bodyGradient-${state})`}
          className="dragon-main-body"
          animate={{
            scale: enableAnimations ? [1, 1 + (breathingRate * 0.02 * animationScale), 1] : 1
          }}
          transition={{
            duration: (4 / breathingRate) * animationDuration,
            repeat: enableAnimations ? Infinity : 0,
            ease: 'easeInOut'
          }}
        />
        
        {/* Belly */}
        <motion.ellipse
          cx="200"
          cy="240"
          rx="50"
          ry="70"
          fill={`url(#bellyGradient-${state})`}
          className="dragon-belly"
          animate={{
            scale: enableAnimations ? [1, 1 + (breathingRate * 0.015 * animationScale), 1] : 1
          }}
          transition={{
            duration: (4 / breathingRate) * animationDuration,
            repeat: enableAnimations ? Infinity : 0,
            ease: 'easeInOut',
            delay: 0.2
          }}
        />

        {/* Head */}
        <motion.ellipse
          cx="200"
          cy="140"
          rx="60"
          ry="50"
          fill={`url(#bodyGradient-${state})`}
          className="dragon-head"
          animate={enableAnimations ? {
            scale: [1, 1 + (breathingRate * 0.01 * animationScale), 1],
            rotateZ: state === 'attention' ? [-0.5, 0.5, -0.5] : 0
          } : {}}
          transition={{
            duration: (4 / breathingRate) * animationDuration,
            repeat: enableAnimations ? Infinity : 0,
            ease: 'easeInOut'
          }}
        />

        {/* Snout */}
        <motion.ellipse
          cx="200"
          cy="165"
          rx="25"
          ry="20"
          fill={colors.secondary}
          className="dragon-snout"
        />
      </motion.g>

      {/* Wings */}
      <motion.g 
        className="dragon-wings"
        animate={enableAnimations ? {
          rotateZ: wingAnim.rotation,
          y: wingAnim.y,
          scale: state === 'powering-up' ? [1, 1.1, 1.05] : 1
        } : {}}
        style={{ transformOrigin: '200px 200px' }}
        transition={{
          duration: state === 'powering-up' ? 1.5 : 2,
          repeat: enableAnimations && state === 'powering-up' ? Infinity : 0,
          ease: 'easeInOut'
        }}
      >
        {/* Left wing */}
        <motion.path
          d="M120 160 Q80 120, 60 180 Q70 220, 120 200 Z"
          fill={`url(#wingGradient-${state})`}
          className="dragon-wing-left"
          animate={enableAnimations ? {
            scale: [1, 1.02, 1],
          } : {}}
          transition={{
            duration: 6 / breathingRate,
            repeat: enableAnimations ? Infinity : 0,
            ease: 'easeInOut'
          }}
        />
        
        {/* Right wing */}
        <motion.path
          d="M280 160 Q320 120, 340 180 Q330 220, 280 200 Z"
          fill={`url(#wingGradient-${state})`}
          className="dragon-wing-right"
          animate={enableAnimations ? {
            scale: [1, 1.02, 1],
          } : {}}
          transition={{
            duration: 6 / breathingRate,
            repeat: enableAnimations ? Infinity : 0,
            ease: 'easeInOut',
            delay: 0.3
          }}
        />
      </motion.g>

      {/* Arms */}
      <motion.g 
        className="dragon-arms"
        animate={armsVariant === 'crossed' ? {
          rotateZ: -10,
          x: 20
        } : armsVariant === 'ready' ? {
          rotateZ: 5,
          x: -10
        } : {}}
        style={{ transformOrigin: '200px 200px' }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
      >
        {/* Left arm */}
        <motion.ellipse
          cx="160"
          cy="200"
          rx="15"
          ry="40"
          fill={colors.primary}
          className="dragon-arm-left"
          animate={enableAnimations ? {
            rotateZ: armsVariant === 'crossed' ? 45 : armsVariant === 'ready' ? -15 : 0
          } : {}}
          style={{ transformOrigin: '160px 200px' }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        />
        
        {/* Right arm */}
        <motion.ellipse
          cx="240"
          cy="200"
          rx="15"
          ry="40"
          fill={colors.primary}
          className="dragon-arm-right"
          animate={enableAnimations ? {
            rotateZ: armsVariant === 'crossed' ? -45 : armsVariant === 'ready' ? 15 : 0
          } : {}}
          style={{ transformOrigin: '240px 200px' }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        />
      </motion.g>

      {/* Eyes */}
      <motion.g className="dragon-eyes">
        {/* Left eye */}
        <motion.circle
          cx="180"
          cy="120"
          r="12"
          fill="white"
          className="dragon-eye-left"
          animate={eyeAnim.closed ? { scaleY: 0.1 } : { scaleY: 1 }}
          transition={{ duration: 0.3 }}
        />
        <motion.circle
          cx={eyeAnim.pupilX - 20}
          cy={eyeAnim.pupilY}
          r="6"
          fill="black"
          className="dragon-pupil-left"
          animate={eyeAnim.closed ? { opacity: 0 } : { opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
        
        {/* Right eye */}
        <motion.circle
          cx="220"
          cy="120"
          r="12"
          fill="white"
          className="dragon-eye-right"
          animate={eyeAnim.closed ? { scaleY: 0.1 } : { scaleY: 1 }}
          transition={{ duration: 0.3 }}
        />
        <motion.circle
          cx={eyeAnim.pupilX + 20}
          cy={eyeAnim.pupilY}
          r="6"
          fill="black"
          className="dragon-pupil-right"
          animate={eyeAnim.closed ? { opacity: 0 } : { opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      </motion.g>

      {/* Nostrils */}
      <motion.g className="dragon-nostrils">
        <motion.ellipse
          cx="192"
          cy="155"
          rx="3"
          ry="2"
          fill="black"
          className="dragon-nostril-left"
          animate={enableAnimations && state === 'powering-up' ? {
            scale: [1, 1.5, 1],
            fill: ['black', colors.glow, 'black']
          } : {}}
          transition={{
            duration: 1.5,
            repeat: enableAnimations && state === 'powering-up' ? Infinity : 0
          }}
        />
        <motion.ellipse
          cx="208"
          cy="155"
          rx="3"
          ry="2"
          fill="black"
          className="dragon-nostril-right"
          animate={enableAnimations && state === 'powering-up' ? {
            scale: [1, 1.5, 1],
            fill: ['black', colors.glow, 'black']
          } : {}}
          transition={{
            duration: 1.5,
            repeat: enableAnimations && state === 'powering-up' ? Infinity : 0,
            delay: 0.2
          }}
        />
      </motion.g>

      {/* Tail */}
      <motion.path
        d="M120 280 Q100 320, 140 350 Q160 360, 180 340 Q160 320, 140 300 L120 280"
        fill={colors.primary}
        className="dragon-tail"
        animate={enableAnimations ? {
          rotateZ: [0, 5, 0, -5, 0],
          scale: [1, 1.02, 1]
        } : {}}
        style={{ transformOrigin: '120px 280px' }}
        transition={{
          duration: 8 / breathingRate,
          repeat: enableAnimations ? Infinity : 0,
          ease: 'easeInOut'
        }}
      />

      {/* Power aura effect for powering-up state - Performance aware */}
      {enableAnimations && state === 'powering-up' && enableComplexAnimations && (
        <motion.g className="power-aura">
          <motion.circle
            cx="200"
            cy="200"
            r="150"
            fill="none"
            stroke={colors.glow}
            strokeWidth={enableHighQualityFilters ? "2" : "1"}
            opacity="0.6"
            className="power-ring"
            animate={{
              scale: enableParticleEffects ? [1, 1.3, 1] : [1, 1.15, 1],
              opacity: [0.6, 0.2, 0.6],
              rotate: enableParticleEffects ? [0, 360] : 0
            }}
            transition={{
              duration: enableParticleEffects ? 2 : 3,
              repeat: Infinity,
              ease: 'linear'
            }}
            style={{
              willChange: shouldUseGPUAcceleration ? 'transform, opacity' : 'auto'
            }}
          />
          {enableParticleEffects && (
            <motion.circle
              cx="200"
              cy="200"
              r="120"
              fill="none"
              stroke={colors.accent}
              strokeWidth="1"
              opacity="0.4"
              className="power-ring-inner"
              animate={{
                scale: [1.2, 0.8, 1.2],
                opacity: [0.4, 0.8, 0.4],
                rotate: [360, 0]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'linear'
              }}
              style={{
                willChange: shouldUseGPUAcceleration ? 'transform, opacity' : 'auto'
              }}
            />
          )}
        </motion.g>
      )}

      {/* Hover effects - Performance aware */}
      {isHovered && enableAnimations && enableComplexAnimations && (
        <motion.circle
          cx="200"
          cy="200"
          r="160"
          fill="none"
          stroke={colors.accent}
          strokeWidth="1"
          opacity="0.3"
          className="hover-ring"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1.1, opacity: 0.3 }}
          exit={{ scale: 1.3, opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            willChange: shouldUseGPUAcceleration ? 'transform, opacity' : 'auto'
          }}
        />
      )}

      {/* Touch feedback effects */}
      {isTouching && enableAnimations && touchPosition && (
        <motion.g className="touch-feedback">
          {/* Touch ripple effect */}
          <motion.circle
            cx={touchPosition.x * (400 / size.width)}
            cy={touchPosition.y * (400 / size.height)}
            r="0"
            fill="none"
            stroke={colors.glow}
            strokeWidth="2"
            opacity="0.6"
            className="touch-ripple"
            animate={{
              r: [0, 50, 80],
              opacity: [0.6, 0.3, 0],
              strokeWidth: [2, 1, 0]
            }}
            transition={{
              duration: 0.8,
              ease: 'easeOut'
            }}
          />
          
          {/* Touch glow */}
          <motion.circle
            cx={touchPosition.x * (400 / size.width)}
            cy={touchPosition.y * (400 / size.height)}
            r="20"
            fill={colors.accent}
            opacity="0.4"
            className="touch-glow"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.4 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              filter: 'blur(8px)'
            }}
          />
        </motion.g>
      )}

      {/* Interaction response - Dragon reacts to touch */}
      {(isHovered || isTouching) && enableAnimations && (
        <motion.g className="interaction-response">
          {/* Enhanced eye glow */}
          <motion.circle
            cx="180"
            cy="120"
            r="15"
            fill={colors.glow}
            opacity="0"
            className="eye-glow-left"
            animate={{
              opacity: isTouching ? [0, 0.6, 0.3] : isHovered ? 0.2 : 0,
              scale: isTouching ? [1, 1.2, 1.1] : 1
            }}
            transition={{
              duration: isTouching ? 0.4 : 0.6,
              ease: 'easeOut'
            }}
            style={{
              filter: 'blur(4px)'
            }}
          />
          <motion.circle
            cx="220"
            cy="120"
            r="15"
            fill={colors.glow}
            opacity="0"
            className="eye-glow-right"
            animate={{
              opacity: isTouching ? [0, 0.6, 0.3] : isHovered ? 0.2 : 0,
              scale: isTouching ? [1, 1.2, 1.1] : 1
            }}
            transition={{
              duration: isTouching ? 0.4 : 0.6,
              ease: 'easeOut',
              delay: 0.1
            }}
            style={{
              filter: 'blur(4px)'
            }}
          />
        </motion.g>
      )}
    </motion.svg>
  )
}