'use client'

import React, { useMemo, useCallback, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { VoiceAnimationState } from './dragon/DragonRenderer'
import { voiceStateTo2DProps } from '../utils/voice-dragon-mapping'
import { 
  createPerformancePropComparison,
  useDragonPerformance,
  adjustAnimationQuality
} from '../utils/dragon-performance'

export interface SimpleDragonSpriteProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  onClick?: () => void
  enableHover?: boolean
  voiceState?: VoiceAnimationState
  enablePerformanceMode?: boolean
  maxAnimationQuality?: number
  preloadImage?: boolean
}

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
  xl: 'w-48 h-48'
}

// Performance-aware prop comparison
const propComparison = createPerformancePropComparison<SimpleDragonSpriteProps>(['voiceState'])

const SimpleDragonSpriteInternal: React.FC<SimpleDragonSpriteProps> = ({
  size = 'lg',
  className = '',
  onClick,
  enableHover = true,
  voiceState,
  enablePerformanceMode = true,
  maxAnimationQuality = 1.0,
  preloadImage = true
}) => {
  // Performance monitoring
  const performance = useDragonPerformance({
    config: {
      targetFPS: 60,
      adaptiveLOD: enablePerformanceMode,
      autoOptimization: enablePerformanceMode,
      maxMemoryMB: 32 // Sprite uses minimal memory
    }
  })
  
  // Image preloading and caching
  const imageRef = useRef<HTMLImageElement | null>(null)
  const isImageLoadedRef = useRef(false)
  
  // Preload image for better performance
  useEffect(() => {
    if (preloadImage && !isImageLoadedRef.current) {
      const img = new Image()
      img.onload = () => {
        isImageLoadedRef.current = true
        if (performance.storeInMemory) {
          performance.storeInMemory('textures', 'dragon-logo', img, img.width * img.height * 4)
        }
      }
      img.src = '/dragon-logo.png'
      imageRef.current = img
    }
  }, [preloadImage, performance])
  // Performance-aware voice properties calculation
  const voiceProps = useMemo(() => {
    // Skip complex calculations in performance mode
    if (performance.shouldReduceQuality || !voiceState) {
      return {
        scale: 1.0,
        shouldPulse: false,
        shouldGlow: false,
        glowIntensity: 0,
        rotationSpeed: 'slow'
      }
    }
    
    return voiceStateTo2DProps(voiceState)
  }, [voiceState, performance.shouldReduceQuality])

  // Performance-aware base animations
  const baseAnimations = useMemo(() => {
    // Disable animations in performance mode
    if (performance.shouldDisableAnimations) {
      return {
        scale: voiceProps.scale,
        transition: { duration: 0 }
      }
    }
    
    const baseConfig = {
      type: 'spring',
      stiffness: 300,
      damping: 20,
      duration: 0.3
    }
    
    const animations: any = {
      scale: voiceProps.scale,
      transition: adjustAnimationQuality(baseConfig, performance.currentLOD, performance.metrics.fps)
    }

    // Add pulsing animation for speaking/listening states
    if (voiceProps.shouldPulse && !performance.shouldReduceQuality) {
      animations.scale = [voiceProps.scale, voiceProps.scale * 1.1, voiceProps.scale]
      animations.transition = {
        ...animations.transition,
        repeat: Infinity,
        duration: (voiceState?.isSpeaking ? 0.5 : 0.8) * maxAnimationQuality
      }
    }

    return animations
  }, [voiceProps, voiceState, performance.shouldDisableAnimations, performance.shouldReduceQuality, performance.currentLOD, performance.metrics.fps, maxAnimationQuality])

  // Performance-aware glow effect style
  const glowStyle = useMemo(() => {
    // Disable glow effects in performance mode
    if (performance.shouldReduceQuality || !voiceProps.shouldGlow || !voiceProps.glowIntensity) {
      return {}
    }

    const intensity = voiceProps.glowIntensity * maxAnimationQuality
    const color = voiceState?.isSpeaking ? 'rgba(255, 165, 0, ' : 'rgba(255, 255, 255, '
    
    // Simplified glow for better performance
    if (performance.currentLOD.level > 2) {
      return {
        filter: `drop-shadow(0 0 ${intensity * 10}px ${color}${intensity * 0.6}))`
      }
    }
    
    return {
      filter: `drop-shadow(0 0 ${intensity * 20}px ${color}${intensity})) drop-shadow(0 0 ${intensity * 10}px ${color}${intensity * 0.8}))`
    }
  }, [voiceProps.shouldGlow, voiceProps.glowIntensity, voiceState, performance.shouldReduceQuality, performance.currentLOD.level, maxAnimationQuality])

  return (
    <motion.div
      className={`${sizeClasses[size]} ${className} cursor-pointer select-none relative`}
      onClick={onClick}
      whileHover={enableHover ? { scale: voiceProps.scale * 1.05 } : undefined}
      whileTap={{ scale: voiceProps.scale * 0.95 }}
      animate={baseAnimations}
    >
      <img
        src="/dragon-logo.png"
        alt="Seiron Dragon"
        className="w-full h-full object-contain filter drop-shadow-lg"
        style={glowStyle}
        draggable={false}
      />
      
      {/* Performance-aware voice state visual indicators */}
      {voiceState && !performance.shouldDisableAnimations && (
        <>
          {/* Breathing animation overlay */}
          {voiceState.isIdle && !performance.shouldReduceQuality && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, transparent 70%)'
              }}
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.02, 1]
              }}
              transition={{
                duration: 3 * maxAnimationQuality,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
          )}
          
          {/* Energy particles for speaking */}
          {voiceState.isSpeaking && performance.currentLOD.level < 3 && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(performance.currentLOD.level < 2 ? 6 : 3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-orange-400 rounded-full"
                  style={{
                    top: '50%',
                    left: '50%',
                    transformOrigin: 'center'
                  }}
                  animate={{
                    x: [0, (Math.cos(i * Math.PI / 3) * 50)],
                    y: [0, (Math.sin(i * Math.PI / 3) * 50)],
                    opacity: [1, 0],
                    scale: [0.5, 1.5]
                  }}
                  transition={{
                    duration: 0.8 * maxAnimationQuality,
                    repeat: Infinity,
                    delay: i * 0.1,
                    ease: 'easeOut'
                  }}
                />
              ))}
            </div>
          )}
          
          {/* Listening ripple effect */}
          {voiceState.isListening && (
            <motion.div
              className="absolute inset-0 border-2 border-blue-400 rounded-full"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.8, 0.2, 0.8]
              }}
              transition={{
                duration: 1.5 * maxAnimationQuality,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
          )}
          
          {/* Processing spinner */}
          {voiceState.isProcessing && (
            <motion.div
              className="absolute inset-0 border-4 border-t-purple-500 border-transparent rounded-full"
              animate={{
                rotate: 360
              }}
              transition={{
                duration: 1 / maxAnimationQuality,
                repeat: Infinity,
                ease: 'linear'
              }}
            />
          )}
        </>
      )}
    </motion.div>
  )
}

// Memoized component with performance-aware prop comparison
const SimpleDragonSprite = React.memo(SimpleDragonSpriteInternal, (prevProps, nextProps) => {
  return propComparison(prevProps, nextProps)
})

// Add display name for debugging
SimpleDragonSprite.displayName = 'SimpleDragonSprite'

export default SimpleDragonSprite