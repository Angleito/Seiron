'use client'

import React, { useRef, useMemo, useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSVGInteraction } from './hooks/useSVGInteraction'
import { useEnhancedMouseTracking } from './hooks/useEnhancedMouseTracking'
import { useEnhancedTouchGestures } from './hooks/useEnhancedTouchGestures'
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation'
import { useDragonStateMachine } from './hooks/useDragonStateMachine'
import type { 
  EnhancedDragonCharacterProps, 
  DragonPart, 
  DragonState,
  TouchGesture,
  SVGInteractionZones
} from './types'
import { DRAGON_SIZE_CONFIG, DRAGON_COLORS } from './constants'

interface SVGDragonCharacterProps extends Omit<EnhancedDragonCharacterProps, 'size'> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
  svgZones?: SVGInteractionZones
  enableAdvancedInteractions?: boolean
  enableCursorEffects?: boolean
  enableHapticFeedback?: boolean
  enableKeyboardNavigation?: boolean
  enableScreenReader?: boolean
  showFocusIndicator?: boolean
  customAnimations?: Record<DragonPart, string>
  onDragonPartClick?: (part: DragonPart, event: MouseEvent) => void
  onGestureDetected?: (gesture: TouchGesture, part?: DragonPart) => void
}

// SVG Dragon Ball Component
const SVGDragonBall: React.FC<{
  id: number
  cx: number
  cy: number
  r: number
  stars: number
  isHovered: boolean
  isPulsing: boolean
  onClick: () => void
}> = ({ id, cx, cy, r, stars, isHovered, isPulsing, onClick }) => {
  const ballColor = useMemo(() => {
    const colors = [
      '#FFD700', '#FF8C00', '#FFD700', '#FF8C00', 
      '#FFD700', '#FF8C00', '#FFD700'
    ]
    return colors[id - 1] || '#FFD700'
  }, [id])

  return (
    <g 
      data-dragon-part="dragon-ball" 
      data-dragon-ball-id={id}
      className="cursor-pointer dragon-ball"
      onClick={onClick}
    >
      <motion.circle
        cx={cx}
        cy={cy}
        r={r}
        fill={`url(#dragonBallGradient${id})`}
        stroke="#B8860B"
        strokeWidth="2"
        className="dragon-ball-sphere"
        animate={{
          scale: isHovered ? 1.1 : 1,
          filter: isPulsing 
            ? 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.8)) brightness(1.2)' 
            : 'drop-shadow(0 0 5px rgba(255, 215, 0, 0.4))'
        }}
        transition={{ duration: 0.2 }}
      />
      
      {/* Dragon Ball Stars */}
      {Array.from({ length: stars }, (_, i) => {
        const angle = (i * 2 * Math.PI) / stars
        const starR = r * 0.6
        const starX = cx + Math.cos(angle) * starR
        const starY = cy + Math.sin(angle) * starR
        
        return (
          <motion.polygon
            key={i}
            points="0,-8 2,-2 8,-2 3,2 5,8 0,4 -5,8 -3,2 -8,-2 -2,-2"
            fill="#FF4500"
            stroke="#8B0000"
            strokeWidth="0.5"
            transform={`translate(${starX}, ${starY}) scale(0.8)`}
            animate={{
              rotate: isPulsing ? 360 : 0,
              scale: isHovered ? 1 : 0.8
            }}
            transition={{ 
              rotate: { duration: 2, repeat: Infinity, ease: "linear" },
              scale: { duration: 0.2 }
            }}
          />
        )
      })}
      
      {/* Gradient Definitions */}
      <defs>
        <radialGradient id={`dragonBallGradient${id}`}>
          <stop offset="0%" stopColor={ballColor} stopOpacity="1" />
          <stop offset="70%" stopColor={ballColor} stopOpacity="0.8" />
          <stop offset="100%" stopColor="#B8860B" stopOpacity="0.6" />
        </radialGradient>
      </defs>
    </g>
  )
}

// SVG Dragon Eye Component
const SVGDragonEye: React.FC<{
  side: 'left' | 'right'
  cx: number
  cy: number
  rotation: { x: number; y: number }
  pupilPosition: { x: number; y: number }
  blinkState: 'open' | 'closing' | 'closed' | 'opening'
  isHovered: boolean
  onClick: () => void
}> = ({ side, cx, cy, rotation, pupilPosition, blinkState, isHovered, onClick }) => {
  const eyeRadius = 18
  const pupilRadius = 8
  const irisRadius = 12
  
  const eyeScale = blinkState === 'closed' ? 0.1 : 
                   blinkState === 'closing' || blinkState === 'opening' ? 0.6 : 1

  return (
    <g 
      data-dragon-part={`${side}-eye`}
      className={`cursor-pointer dragon-eye dragon-eye-${side}`}
      onClick={onClick}
    >
      {/* Eye Background */}
      <motion.ellipse
        cx={cx}
        cy={cy}
        rx={eyeRadius}
        ry={eyeRadius * eyeScale}
        fill="white"
        stroke="#333"
        strokeWidth="2"
        animate={{
          scale: isHovered ? 1.05 : 1,
          filter: isHovered 
            ? 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.8))' 
            : 'none'
        }}
        transition={{ duration: 0.15 }}
      />
      
      {/* Iris */}
      {blinkState !== 'closed' && (
        <motion.circle
          cx={cx + pupilPosition.x}
          cy={cy + pupilPosition.y}
          r={irisRadius}
          fill={side === 'left' ? '#4169E1' : '#DC143C'}
          animate={{
            scaleY: eyeScale,
            x: rotation.x * 2,
            y: rotation.y * 2
          }}
          transition={{ duration: 0.1 }}
        />
      )}
      
      {/* Pupil */}
      {blinkState !== 'closed' && (
        <motion.circle
          cx={cx + pupilPosition.x}
          cy={cy + pupilPosition.y}
          r={pupilRadius}
          fill="black"
          animate={{
            scaleY: eyeScale,
            x: rotation.x * 2,
            y: rotation.y * 2
          }}
          transition={{ duration: 0.1 }}
        />
      )}
      
      {/* Eye Shine */}
      {blinkState !== 'closed' && (
        <motion.circle
          cx={cx + pupilPosition.x - 3}
          cy={cy + pupilPosition.y - 3}
          r={3}
          fill="white"
          opacity="0.8"
          animate={{
            scaleY: eyeScale,
            x: rotation.x * 2,
            y: rotation.y * 2
          }}
          transition={{ duration: 0.1 }}
        />
      )}
    </g>
  )
}

// Main SVG Dragon Component
export const SVGDragonCharacter: React.FC<SVGDragonCharacterProps> = ({
  size = 'lg',
  initialState = 'idle',
  initialMood = 'neutral',
  interactive = true,
  showDragonBalls = true,
  svgZones,
  enableAdvancedInteractions = true,
  enableCursorEffects = true,
  enableHapticFeedback = true,
  enableKeyboardNavigation = true,
  enableScreenReader = true,
  showFocusIndicator = true,
  customAnimations = {},
  onStateChange,
  onMoodChange,
  onPowerLevelChange,
  onInteraction,
  onDragonPartClick,
  onGestureDetected,
  className = '',
  ...props
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoveredPart, setHoveredPart] = useState<DragonPart | null>(null)
  const [activePart, setActivePart] = useState<DragonPart | null>(null)

  // Get size configuration
  const sizeConfig = DRAGON_SIZE_CONFIG[size]
  const svgWidth = sizeConfig.width
  const svgHeight = sizeConfig.height

  // Dragon state machine
  const dragon = useDragonStateMachine(initialState)

  // Enhanced interaction hooks
  const svgInteraction = useSVGInteraction({
    elementRef: svgRef,
    svgZones,
    enabled: interactive && enableAdvancedInteractions,
    enableKeyboardNavigation,
    onPartHover: (part, event) => {
      setHoveredPart(part)
      onInteraction?.('hover')
    },
    onPartClick: (part, event) => {
      setActivePart(part)
      onDragonPartClick?.(part, event)
      handleDragonPartInteraction(part, 'click')
    },
    onGestureDetected: (gesture, part) => {
      onGestureDetected?.(gesture, part)
    }
  })

  const mouseTracking = useEnhancedMouseTracking({
    elementRef: svgRef,
    svgZones,
    enabled: interactive,
    eyeTrackingEnabled: true,
    headRotationEnabled: true,
    cursorEffectsEnabled: enableCursorEffects,
    magneticCursorEnabled: false, // Can be enabled for special effects
    onPartHover: (part) => setHoveredPart(part),
    onProximityChange: (zone) => {
      if (zone === 'inner' && dragon.state === 'idle') {
        dragon.actions.setState('attention')
      } else if (zone === 'none' && dragon.state === 'attention') {
        dragon.actions.setState('idle')
      }
    }
  })

  const touchGestures = useEnhancedTouchGestures({
    enabled: interactive,
    enableHapticFeedback,
    onSVGPartTouch: (part, gesture) => {
      onDragonPartClick?.(part, new MouseEvent('click'))
      handleDragonPartInteraction(part, 'touch')
    },
    onGestureRecognized: (gesture, context) => {
      onGestureDetected?.(gesture, context.targetPart || undefined)
      handleGestureInteraction(gesture, context.targetPart)
    }
  })

  const keyboardNavigation = useKeyboardNavigation({
    enabled: enableKeyboardNavigation,
    enableScreenReader,
    onPartFocus: (part) => {
      if (part) {
        setHoveredPart(part)
        onInteraction?.('keyboard-focus')
      }
    },
    onPartActivate: (part, method) => {
      setActivePart(part)
      handleDragonPartInteraction(part, method)
    }
  })

  // Handle dragon part interactions
  const handleDragonPartInteraction = useCallback((part: DragonPart, method: 'click' | 'touch' | 'keyboard') => {
    switch (part) {
      case 'head':
        if (dragon.state === 'idle') {
          dragon.actions.setState('attention')
        } else if (dragon.state === 'attention') {
          dragon.actions.setState('ready')
        }
        break
      
      case 'left-eye':
      case 'right-eye':
        // Trigger blink animation
        dragon.actions.triggerSpecialAnimation('pulse')
        break
      
      case 'body':
        dragon.actions.powerUp()
        break
      
      case 'left-arm':
      case 'right-arm':
        dragon.actions.triggerSpecialAnimation('shake')
        break
      
      case 'tail':
        dragon.actions.triggerSpecialAnimation('spin')
        break
      
      case 'dragon-ball':
        // Special dragon ball interaction
        dragon.actions.powerUp()
        dragon.actions.triggerSpecialAnimation('roar')
        break
    }

    // Announce action for screen readers
    if (enableScreenReader) {
      const actionMessages = {
        'head': 'Dragon head activated - dragon is now paying attention',
        'left-eye': 'Left eye blinked',
        'right-eye': 'Right eye blinked',
        'body': 'Dragon body activated - power increasing',
        'left-arm': 'Left arm activated',
        'right-arm': 'Right arm activated',
        'tail': 'Dragon tail swished',
        'dragon-ball': 'Dragon ball collected - power surge!'
      }
      keyboardNavigation.actions.announceToScreenReader(actionMessages[part] || `${part} activated`)
    }
  }, [dragon, enableScreenReader, keyboardNavigation.actions])

  // Handle gesture interactions
  const handleGestureInteraction = useCallback((gesture: TouchGesture, part: DragonPart | null) => {
    if (!part) return

    switch (gesture.type) {
      case 'swipe':
        if (part === 'tail') {
          dragon.actions.triggerSpecialAnimation('spin')
        } else if (gesture.velocity.y < -200) {
          dragon.actions.powerUp()
        } else if (gesture.velocity.y > 200) {
          dragon.actions.powerDown()
        }
        break
      
      case 'pinch':
        if (gesture.scale && gesture.scale > 1.3) {
          dragon.actions.setState('powering-up')
        }
        break
      
      case 'long-press':
        dragon.actions.triggerSpecialAnimation('roar')
        break
      
      case 'rotate':
        dragon.actions.triggerSpecialAnimation('spin')
        break
    }
  }, [dragon])

  // Color scheme based on dragon state
  const colorScheme = useMemo(() => {
    return DRAGON_COLORS[dragon.state] || DRAGON_COLORS.idle
  }, [dragon.state])

  // Dragon ball click handler
  const handleDragonBallClick = useCallback((ballId: number) => {
    handleDragonPartInteraction('dragon-ball', 'click')
    
    if (enableScreenReader) {
      keyboardNavigation.actions.announceToScreenReader(`Dragon ball ${ballId} collected!`)
    }
  }, [handleDragonPartInteraction, enableScreenReader, keyboardNavigation.actions])

  // Eye click handlers
  const handleEyeClick = useCallback((side: 'left' | 'right') => {
    handleDragonPartInteraction(`${side}-eye` as DragonPart, 'click')
  }, [handleDragonPartInteraction])

  // Update callbacks when state changes
  useEffect(() => {
    onStateChange?.(dragon.state)
  }, [dragon.state, onStateChange])

  useEffect(() => {
    onMoodChange?.(dragon.mood)
  }, [dragon.mood, onMoodChange])

  useEffect(() => {
    onPowerLevelChange?.(dragon.powerLevel)
  }, [dragon.powerLevel, onPowerLevelChange])

  return (
    <div 
      className={`relative ${sizeConfig.containerSize} ${className}`}
      data-dragon-container
      {...touchGestures.gestureHandlers}
    >
      {/* Focus Indicator */}
      <AnimatePresence>
        {showFocusIndicator && keyboardNavigation.focusIndicator.visible && (
          <motion.div
            className="absolute pointer-events-none z-10"
            style={{
              left: keyboardNavigation.focusIndicator.position.x,
              top: keyboardNavigation.focusIndicator.position.y,
              width: keyboardNavigation.focusIndicator.size.width,
              height: keyboardNavigation.focusIndicator.size.height,
              ...keyboardNavigation.focusIndicator.style
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      {/* Main SVG Dragon */}
      <motion.svg
        ref={svgRef}
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-full"
        role="img"
        aria-label="Interactive mystical dragon"
        {...keyboardNavigation.getAccessibilityProps('body')}
        animate={{
          filter: `drop-shadow(0 0 20px ${colorScheme.primary})`,
          scale: dragon.state === 'powering-up' ? 1.05 : 1
        }}
        transition={{ duration: 0.3 }}
      >
        {/* Gradient Definitions */}
        <defs>
          <radialGradient id="dragonBodyGradient">
            <stop offset="0%" stopColor={colorScheme.primary} />
            <stop offset="50%" stopColor={colorScheme.secondary} />
            <stop offset="100%" stopColor={colorScheme.accent} />
          </radialGradient>
          
          <linearGradient id="dragonHeadGradient">
            <stop offset="0%" stopColor="#FF6B6B" />
            <stop offset="100%" stopColor="#FF4757" />
          </linearGradient>
        </defs>

        {/* Dragon Body */}
        <motion.ellipse
          cx={svgWidth / 2}
          cy={svgHeight / 2 + 50}
          rx={80}
          ry={100}
          fill="url(#dragonBodyGradient)"
          stroke="#333"
          strokeWidth="3"
          data-dragon-part="body"
          className="cursor-pointer dragon-body"
          animate={{
            scale: hoveredPart === 'body' ? 1.02 : 1,
            rx: dragon.state === 'ready' ? 85 : 80
          }}
          transition={{ duration: 0.2 }}
          {...keyboardNavigation.getAccessibilityProps('body')}
        />

        {/* Dragon Head */}
        <motion.circle
          cx={svgWidth / 2}
          cy={svgHeight / 2 - 50}
          r={60}
          fill="url(#dragonHeadGradient)"
          stroke="#333"
          strokeWidth="3"
          data-dragon-part="head"
          className="cursor-pointer dragon-head"
          animate={{
            scale: hoveredPart === 'head' ? 1.03 : 1,
            x: mouseTracking.svgState.headRotation.x,
            y: mouseTracking.svgState.headRotation.y,
            filter: dragon.state === 'active' 
              ? 'drop-shadow(0 0 15px rgba(255, 107, 107, 0.8))' 
              : 'none'
          }}
          transition={{ duration: 0.15 }}
          {...keyboardNavigation.getAccessibilityProps('head')}
        />

        {/* Dragon Eyes */}
        <SVGDragonEye
          side="left"
          cx={svgWidth / 2 - 30}
          cy={svgHeight / 2 - 60}
          rotation={mouseTracking.eyeTracking.leftEye.rotation}
          pupilPosition={mouseTracking.eyeTracking.leftEye.pupilPosition}
          blinkState={mouseTracking.eyeTracking.leftEye.blinkState}
          isHovered={hoveredPart === 'left-eye'}
          onClick={() => handleEyeClick('left')}
        />
        
        <SVGDragonEye
          side="right"
          cx={svgWidth / 2 + 30}
          cy={svgHeight / 2 - 60}
          rotation={mouseTracking.eyeTracking.rightEye.rotation}
          pupilPosition={mouseTracking.eyeTracking.rightEye.pupilPosition}
          blinkState={mouseTracking.eyeTracking.rightEye.blinkState}
          isHovered={hoveredPart === 'right-eye'}
          onClick={() => handleEyeClick('right')}
        />

        {/* Dragon Arms */}
        <motion.path
          d="M150,250 Q120,280 100,350 Q110,360 130,340 Q160,270 150,250"
          fill={colorScheme.secondary}
          stroke="#333"
          strokeWidth="2"
          data-dragon-part="left-arm"
          className="cursor-pointer dragon-arm dragon-arm-left"
          animate={{
            scale: hoveredPart === 'left-arm' ? 1.05 : 1,
            rotateZ: dragon.state === 'arms-crossed' ? -10 : 0
          }}
          transition={{ duration: 0.2 }}
          {...keyboardNavigation.getAccessibilityProps('left-arm')}
        />
        
        <motion.path
          d="M350,250 Q380,280 400,350 Q390,360 370,340 Q340,270 350,250"
          fill={colorScheme.secondary}
          stroke="#333"
          strokeWidth="2"
          data-dragon-part="right-arm"
          className="cursor-pointer dragon-arm dragon-arm-right"
          animate={{
            scale: hoveredPart === 'right-arm' ? 1.05 : 1,
            rotateZ: dragon.state === 'arms-crossed' ? 10 : 0
          }}
          transition={{ duration: 0.2 }}
          {...keyboardNavigation.getAccessibilityProps('right-arm')}
        />

        {/* Dragon Tail */}
        <motion.path
          d="M300,450 Q350,480 380,520 Q420,560 450,600 Q430,610 400,580 Q370,540 320,510 Q270,480 300,450"
          fill={colorScheme.accent}
          stroke="#333"
          strokeWidth="2"
          data-dragon-part="tail"
          className="cursor-pointer dragon-tail"
          animate={{
            scale: hoveredPart === 'tail' ? 1.02 : 1,
            d: dragon.state === 'active' 
              ? "M300,450 Q380,460 400,520 Q440,580 470,600 Q450,610 420,580 Q390,540 340,510 Q290,480 300,450"
              : "M300,450 Q350,480 380,520 Q420,560 450,600 Q430,610 400,580 Q370,540 320,510 Q270,480 300,450"
          }}
          transition={{ duration: 0.3 }}
          {...keyboardNavigation.getAccessibilityProps('tail')}
        />

        {/* Dragon Balls (if enabled) */}
        {showDragonBalls && (
          <g className="dragon-balls">
            {Array.from({ length: 7 }, (_, i) => {
              const angle = (i * 2 * Math.PI) / 7
              const radius = 120
              const ballX = svgWidth / 2 + Math.cos(angle) * radius
              const ballY = svgHeight / 2 + Math.sin(angle) * radius
              
              return (
                <SVGDragonBall
                  key={i + 1}
                  id={i + 1}
                  cx={ballX}
                  cy={ballY}
                  r={sizeConfig.dragonBallSize / 2}
                  stars={i + 1}
                  isHovered={hoveredPart === 'dragon-ball'}
                  isPulsing={dragon.state === 'powering-up'}
                  onClick={() => handleDragonBallClick(i + 1)}
                />
              )
            })}
          </g>
        )}

        {/* Power Aura Effect */}
        <AnimatePresence>
          {dragon.state === 'powering-up' && (
            <motion.circle
              cx={svgWidth / 2}
              cy={svgHeight / 2}
              r={150}
              fill="none"
              stroke="url(#powerAuraGradient)"
              strokeWidth="4"
              opacity="0.7"
              initial={{ r: 100, opacity: 0 }}
              animate={{ 
                r: [150, 170, 150], 
                opacity: [0.7, 0.3, 0.7] 
              }}
              exit={{ r: 100, opacity: 0 }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
            />
          )}
        </AnimatePresence>

        {/* Additional Gradient for Power Aura */}
        <defs>
          <radialGradient id="powerAuraGradient">
            <stop offset="0%" stopColor="#FFD700" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FF6B6B" stopOpacity="0.2" />
          </radialGradient>
        </defs>
      </motion.svg>

      {/* Gesture Trails (if enabled) */}
      <AnimatePresence>
        {touchGestures.gestureTrails.map(trail => (
          <motion.div
            key={trail.id}
            className="absolute pointer-events-none"
            style={{
              left: trail.points[0].x,
              top: trail.points[0].y,
              width: trail.width,
              height: trail.width,
              backgroundColor: trail.color,
              borderRadius: '50%',
              filter: 'blur(1px)'
            }}
            initial={{ opacity: trail.opacity, scale: 1 }}
            animate={{ 
              opacity: 0, 
              scale: 2,
              x: trail.points[trail.points.length - 1].x - trail.points[0].x,
              y: trail.points[trail.points.length - 1].y - trail.points[0].y
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        ))}
      </AnimatePresence>

      {/* Screen Reader Announcements */}
      {enableScreenReader && <keyboardNavigation.AriaLiveRegion />}
    </div>
  )
}

export default SVGDragonCharacter