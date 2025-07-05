'use client'

import React, { useRef, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, type Variants } from 'framer-motion'
import { useDragonStateMachine } from './hooks/useDragonStateMachine'
import { useMouseTracking } from './hooks/useMouseTracking'
import { useTouchGestures } from './hooks/useTouchGestures'
import { useReducedMotion } from './hooks/useAnimationPerformance'
// Dragon components will be imported here when needed
import type { EnhancedDragonCharacterProps, InteractionType } from './types'
import { 
  DRAGON_SIZE_CONFIG, 
  DRAGON_ANIMATION_PRESETS, 
  DRAGON_COLORS,
  DRAGON_BALL_STARS,
  DEFAULT_DRAGON_CONFIG 
} from './constants'

// Performance optimized component comparison
const arePropsEqual = (prevProps: EnhancedDragonCharacterProps, nextProps: EnhancedDragonCharacterProps): boolean => {
  // Compare basic props
  if (prevProps.size !== nextProps.size) return false
  if (prevProps.initialState !== nextProps.initialState) return false
  if (prevProps.interactive !== nextProps.interactive) return false
  if (prevProps.showDragonBalls !== nextProps.showDragonBalls) return false
  if (prevProps.enableCursorTracking !== nextProps.enableCursorTracking) return false
  if (prevProps.autoStates !== nextProps.autoStates) return false
  if (prevProps.className !== nextProps.className) return false
  
  // Deep compare animation config
  if (JSON.stringify(prevProps.animationConfig) !== JSON.stringify(nextProps.animationConfig)) return false
  if (JSON.stringify(prevProps.dragonBallConfig) !== JSON.stringify(nextProps.dragonBallConfig)) return false
  
  // Compare callback references (these should be memoized by parent)
  if (prevProps.onStateChange !== nextProps.onStateChange) return false
  if (prevProps.onMoodChange !== nextProps.onMoodChange) return false
  if (prevProps.onPowerLevelChange !== nextProps.onPowerLevelChange) return false
  if (prevProps.onInteraction !== nextProps.onInteraction) return false
  
  return true
}

function EnhancedDragonCharacterInternal({
  size = 'lg',
  initialState = 'idle',
  // initialMood = 'neutral',
  interactive = true,
  showDragonBalls = true,
  animationConfig = {},
  dragonBallConfig = {},
  onStateChange,
  onMoodChange,
  onPowerLevelChange,
  onInteraction,
  className = '',
  // armsVariant = 'crossed',
  enableCursorTracking = true,
  autoStates = true
}: EnhancedDragonCharacterProps) {
  const dragonRef = useRef<HTMLDivElement>(null)
  const cleanupFunctionsRef = useRef<(() => void)[]>([])
  const animationTimersRef = useRef<number[]>([])
  // const [isHovered, setIsHovered] = useState(false)
  // const [dragonsBreathing, setDragonsBreathing] = useState(true)
  // const [touchPosition, setTouchPosition] = useState<{ x: number; y: number } | null>(null)

  // Merge animation config with defaults
  const config = useMemo(() => ({
    ...DEFAULT_DRAGON_CONFIG,
    ...DRAGON_ANIMATION_PRESETS[animationConfig.performanceMode || 'balanced'],
    ...animationConfig
  }), [animationConfig])

  // Hooks
  const reducedMotion = useReducedMotion()
  // const { performanceMode } = useAnimationPerformance(config.autoQualityAdjustment)
  const dragon = useDragonStateMachine(initialState)
  
  const mouseTracking = useMouseTracking({
    elementRef: dragonRef,
    enabled: interactive && enableCursorTracking && !reducedMotion,
    smoothing: 0.1,
    proximityThreshold: 200
  })

  const touchGestures = useTouchGestures({
    enabled: interactive && !reducedMotion,
    onTap: (_gesture) => {
      // setTouchPosition(gesture.startPosition)
      // setTimeout(() => setTouchPosition(null), 800)
      handleInteraction('click')
    },
    onLongPress: (_gesture) => {
      // setTouchPosition(gesture.startPosition)
      // setTimeout(() => setTouchPosition(null), 1200)
      dragon.actions.triggerSpecialAnimation('pulse')
    },
    onSwipe: (gesture) => {
      // setTouchPosition(gesture.startPosition)
      // setTimeout(() => setTouchPosition(null), 600)
      
      const dx = gesture.endPosition.x - gesture.startPosition.x
      const dy = gesture.endPosition.y - gesture.startPosition.y
      
      if (Math.abs(dy) > Math.abs(dx)) {
        if (dy < 0) dragon.actions.powerUp()
        else dragon.actions.powerDown()
      }
    },
    onPinch: (gesture) => {
      if (gesture.scale && gesture.scale > 1.2) {
        dragon.actions.setState('powering-up')
      }
    }
  })

  // Motion values for 3D effects
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const rotateX = useTransform(mouseY, [-300, 300], [5, -5])
  const rotateY = useTransform(mouseX, [-300, 300], [-5, 5])
  
  // Eye tracking position for SVG dragon
  // const [eyePosition, setEyePosition] = useState({ x: 0, y: 0 })
  
  // Update eye position when mouse moves
  useEffect(() => {
    const unsubscribeX = mouseX.onChange((_x) => {
      // setEyePosition(prev => ({ ...prev, x }))
    })
    const unsubscribeY = mouseY.onChange((_y) => {
      // setEyePosition(prev => ({ ...prev, y }))
    })
    
    // Store cleanup functions
    cleanupFunctionsRef.current.push(unsubscribeX, unsubscribeY)
    
    return () => {
      unsubscribeX()
      unsubscribeY()
    }
  }, [mouseX, mouseY])

  // Get size configuration
  const sizeConfig = DRAGON_SIZE_CONFIG[size]

  // Handle interactions
  const handleInteraction = useCallback((type: InteractionType) => {
    if (!interactive) return

    onInteraction?.(type)

    switch (type) {
      case 'hover':
        // setIsHovered(true)
        if (dragon.state === 'idle') {
          dragon.actions.setState('attention')
        }
        break
      case 'leave':
        // setIsHovered(false)
        break
      case 'click':
        if (dragon.state === 'attention') {
          dragon.actions.setState('ready')
        } else if (dragon.state === 'ready') {
          dragon.actions.setState('active')
        } else if (dragon.state === 'arms-crossed') {
          dragon.actions.setState('ready')
        }
        break
      case 'double-click':
        dragon.actions.triggerSpecialAnimation('roar')
        break
    }
  }, [interactive, dragon.state, dragon.actions, onInteraction])

  // Handle mouse movement for 3D effects
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!interactive || !enableCursorTracking || reducedMotion) return
    
    const rect = dragonRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    mouseX.set(e.clientX - centerX)
    mouseY.set(e.clientY - centerY)
  }, [interactive, enableCursorTracking, reducedMotion, mouseX, mouseY])

  // Callback effects
  useEffect(() => {
    onStateChange?.(dragon.state)
  }, [dragon.state, onStateChange])

  useEffect(() => {
    onMoodChange?.(dragon.mood)
  }, [dragon.mood, onMoodChange])

  useEffect(() => {
    onPowerLevelChange?.(dragon.powerLevel)
  }, [dragon.powerLevel, onPowerLevelChange])

  // Auto-transition based on proximity
  useEffect(() => {
    if (!autoStates || !mouseTracking.isMouseActive) return

    let transitionTimer: number
    
    if (mouseTracking.isInProximity && dragon.state === 'idle') {
      transitionTimer = window.setTimeout(() => {
        dragon.actions.setState('attention')
      }, 100) // Small delay to prevent rapid state changes
    } else if (!mouseTracking.isInProximity && dragon.state === 'attention') {
      transitionTimer = window.setTimeout(() => {
        dragon.actions.setState('idle')
      }, 100)
    }
    
    if (transitionTimer) {
      animationTimersRef.current.push(transitionTimer)
    }
    
    return () => {
      if (transitionTimer) {
        clearTimeout(transitionTimer)
        const index = animationTimersRef.current.indexOf(transitionTimer)
        if (index > -1) {
          animationTimersRef.current.splice(index, 1)
        }
      }
    }
  }, [autoStates, mouseTracking.isInProximity, mouseTracking.isMouseActive, dragon.state, dragon.actions])

  // Animation variants based on state - optimized for SVG container - memoized
  const dragonVariants: Variants = useMemo(() => ({
    idle: {
      scale: 1,
      rotate: 0,
      transition: { duration: 0.6, ease: 'easeInOut' }
    },
    attention: {
      scale: 1.01,
      rotate: [-0.3, 0.3, -0.3],
      transition: {
        duration: 0.4,
        rotate: { repeat: Infinity, duration: 4 }
      }
    },
    ready: {
      scale: 1.02,
      transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] }
    },
    active: {
      scale: 1.03,
      transition: { duration: 0.6 }
    },
    'powering-up': {
      scale: [1, 1.05, 1.03],
      transition: { duration: 1.5, times: [0, 0.6, 1] }
    },
    'arms-crossed': {
      scale: 1.02,
      transition: { duration: 0.8 }
    },
    sleeping: {
      scale: 0.98,
      rotate: -1,
      transition: { duration: 1.2, ease: 'easeInOut' }
    },
    awakening: {
      scale: [0.98, 1.05, 1.01],
      rotate: [-1, 1, 0],
      transition: { duration: 2, times: [0, 0.7, 1] }
    }
  }), []) // Variants don't change, so empty dependency array

  
  // Legacy Dragon Ball orbital animation (fallback) - memoized
  const LegacyDragonBalls = useMemo(() => ({ count = 7 }: { count?: number }) => {
    if (!showDragonBalls || reducedMotion) return null

    return (
      <motion.div
        className={`absolute inset-0 ${dragon.state === 'powering-up' ? 'animate-dragon-balls-fast' : 'animate-dragon-balls-orbit'}`}
        style={{
          animationDuration: dragon.state === 'powering-up' ? '3s' : '15s'
        }}
      >
        {DRAGON_BALL_STARS.slice(0, count).map((ball, index) => (
          <motion.div
            key={index}
            className="absolute"
            style={{
              width: `${sizeConfig.dragonBallSize}px`,
              height: `${sizeConfig.dragonBallSize}px`,
              transform: `rotate(${index * (360 / count)}deg) translateX(${sizeConfig.orbitRadius}px) rotate(-${index * (360 / count)}deg)`,
              transformOrigin: `${sizeConfig.orbitRadius}px ${sizeConfig.orbitRadius}px`,
              top: `${sizeConfig.orbitRadius - sizeConfig.dragonBallSize / 2}px`,
              left: `${sizeConfig.orbitRadius - sizeConfig.dragonBallSize / 2}px`,
            }}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
          >
            <div className={`
              w-full h-full rounded-full relative overflow-hidden shadow-lg
              bg-gradient-to-br ${ball.color}
              animate-dragon-ball-float
            `}
            style={{ animationDelay: `${index * 0.3}s` }}
            >
              {/* Stars */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-red-600 text-xs font-bold leading-none">
                  {Array.from({ length: ball.stars }, (_, i) => (
                    <span key={i} className="inline-block animate-star-twinkle" style={{ animationDelay: `${i * 0.2}s` }}>
                      ★
                    </span>
                  ))}
                </div>
              </div>
              {/* Highlight */}
              <div className="absolute top-1 left-1 w-2 h-2 bg-yellow-200 rounded-full opacity-80" />
            </div>
          </motion.div>
        ))}
      </motion.div>
    )
  }, [showDragonBalls, reducedMotion, dragon.state, sizeConfig])

  // Aura effect based on state - memoized
  const DragonAura = useMemo(() => () => {
    if (!config.enableAura || reducedMotion) return null

    const colors = DRAGON_COLORS[dragon.state] || DRAGON_COLORS.idle

    return (
      <motion.div
        className="absolute inset-0 rounded-full blur-xl pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${colors.primary} 0%, ${colors.secondary} 50%, transparent 70%)`
        }}
        animate={{
          scale: dragon.state === 'powering-up' ? [1, 1.5, 1.2] : [1, 1.1, 1],
          opacity: dragon.state === 'active' ? [0.3, 0.6, 0.4] : [0.2, 0.4, 0.3]
        }}
        transition={{
          duration: dragon.state === 'powering-up' ? 1.5 : 3,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />
    )
  }, [config.enableAura, reducedMotion, dragon.state])

  // Particle system - memoized
  const DragonParticles = useMemo(() => () => {
    if (!config.enableParticles || reducedMotion) return null

    const particleCount = config.particleCount

    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: particleCount }, (_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-orange-400 rounded-full"
            style={{
              left: `${20 + (i * 60 / particleCount)}%`,
              bottom: '10%'
            }}
            animate={{
              y: [-100, -200],
              opacity: [0, 1, 0],
              scale: [0.5, 1, 0.3]
            }}
            transition={{
              duration: 3 + (i * 0.5),
              repeat: Infinity,
              delay: i * 0.8,
              ease: 'easeOut'
            }}
          />
        ))}
      </div>
    )
  }, [config.enableParticles, reducedMotion, config.particleCount])

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      // Clear all animation timers
      animationTimersRef.current.forEach(timer => {
        clearTimeout(timer)
      })
      animationTimersRef.current = []
      
      // Execute cleanup functions
      cleanupFunctionsRef.current.forEach(cleanup => {
        try {
          cleanup()
        } catch (error) {
          console.warn('Error during cleanup:', error)
        }
      })
      cleanupFunctionsRef.current = []
      
      // Reset motion values
      mouseX.set(0)
      mouseY.set(0)
    }
  }, [])

  return (
    <motion.div
      ref={dragonRef}
      className={`relative ${sizeConfig.containerSize} ${className} dragon-gpu-accelerated`}
      onMouseMove={handleMouseMove}
      onHoverStart={() => handleInteraction('hover')}
      onHoverEnd={() => handleInteraction('leave')}
      onClick={() => handleInteraction('click')}
      onDoubleClick={() => handleInteraction('double-click')}
      {...touchGestures.gestureHandlers}
      style={{
        rotateX: interactive ? rotateX : 0,
        rotateY: interactive ? rotateY : 0,
        transformStyle: 'preserve-3d',
        perspective: 1000
      }}
      initial="idle"
      animate={dragon.state}
      variants={dragonVariants}
    >
      {/* Dragon Aura */}
      <DragonAura />

      {/* Dragon Balls Orbital System */}
      {showDragonBalls && (
        <LegacyDragonBalls count={dragonBallConfig.count || 7} />
      )}

      {/* Main Dragon Body */}
      <motion.div
        className={`
          relative z-10 ${sizeConfig.containerSize}
          ${touchGestures.isGestureActive ? 'dragon-svg touching' : ''}
          dragon-gpu-accelerated
        `}
        animate={{
          filter: dragon.isTransitioning 
            ? 'brightness(1.3) contrast(1.2)' 
            : 'brightness(1) contrast(1)'
        }}
      >
        {/* Dragon Image Placeholder */}
        <img
          src="/dragon-logo.png"
          alt="Dragon"
          className={`object-contain filter drop-shadow-2xl ${
            'quality-medium'
          } ${reducedMotion ? 'motion-reduce' : ''} ${
            dragon.state === 'powering-up' ? 'dragon-powering-up' : ''
          } ${
            dragon.state === 'awakening' ? 'dragon-awakening' : ''
          }`}
        />

      </motion.div>

      {/* Particle Effects */}
      <DragonParticles />

      {/* Power Level Indicator */}
      <AnimatePresence>
        {dragon.powerLevel > 9000 && (
          <motion.div
            className="absolute -bottom-12 left-1/2 transform -translate-x-1/2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="px-3 py-1 bg-red-900/80 text-yellow-400 text-xs font-bold rounded-full border border-yellow-400/50">
              Power Level: Over 9000!
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Special Animation Effects */}
      <AnimatePresence>
        {dragon.isTransitioning && (
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-r from-red-400/30 via-orange-400/30 to-yellow-400/30 blur-2xl"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1.2 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.6 }}
          />
        )}
      </AnimatePresence>

      {/* Debug Info (Development only) */}
      {import.meta.env.DEV && (
        <div className="absolute -bottom-20 left-0 text-xs text-gray-400 space-y-1">
          <div>State: {dragon.state}</div>
          <div>Mood: {dragon.mood}</div>
          <div>Power: {dragon.powerLevel}</div>
          <div>Quality: Auto</div>
        </div>
      )}
    </motion.div>
  )
}

// Export the memoized component
export const EnhancedDragonCharacter = React.memo(EnhancedDragonCharacterInternal, arePropsEqual)