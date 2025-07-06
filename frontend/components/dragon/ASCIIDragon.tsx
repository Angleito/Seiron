'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { VoiceAnimationState } from './DragonRenderer'
import { 
  voiceStateToASCIIPose, 
  voiceStateToAnimationSpeed, 
  shouldShowBreathing, 
  shouldShowFloating,
  shouldShowEnergyEffects 
} from '../../utils/voice-dragon-mapping'
import { 
  createPerformancePropComparison,
  createMemoizedCalculation,
  useDragonPerformance
} from '../../utils/dragon-performance'

export interface ASCIIDragonProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  onClick?: () => void
  enableHover?: boolean
  enableTypewriter?: boolean
  enableBreathing?: boolean
  enableFloating?: boolean
  pose?: 'coiled' | 'flying' | 'attacking' | 'sleeping'
  speed?: 'slow' | 'normal' | 'fast'
  voiceState?: VoiceAnimationState
  enablePerformanceMode?: boolean
  maxAnimationQuality?: number
}

// ASCII Dragon Art Patterns
const dragonPatterns = {
  coiled: {
    sm: [
      "    /\\_/\\",
      "   ( o.o )",
      "    > ^ <",
      "  /~~~~~\\",
      " (  ~~~  )",
      "  \\~~~~~/"
    ],
    md: [
      "        /\\_/\\",
      "       ( o.o )",
      "      __> ^ <__",
      "     /~~~~~~~~~\\",
      "    (  ~~~~~~~  )",
      "   (  ~~~~~~~~~  )",
      "  (  ~~~~~~~~~~~  )",
      "   \\~~~~~~~~~~~~~/",
      "    \\~~~~~~~~~~~/"
    ],
    lg: [
      "            /\\_/\\",
      "           ( o.o )",
      "          __> ^ <__",
      "         /~~~~~~~~~~~\\",
      "        (  ~~~~~~~~~  )",
      "       (  ~~~~~~~~~~~  )",
      "      (  ~~~~~~~~~~~~~  )",
      "     (  ~~~~~~~~~~~~~~~  )",
      "    (  ~~~~~~~~~~~~~~~~~  )",
      "     \\~~~~~~~~~~~~~~~~~~/",
      "      \\~~~~~~~~~~~~~~~~/",
      "       \\~~~~~~~~~~~~~~/",
      "        \\~~~~~~~~~~~~/"
    ],
    xl: [
      "                /\\_/\\",
      "               ( o.o )",
      "              __> ^ <__",
      "             /~~~~~~~~~~~\\",
      "            (  ~~~~~~~~~  )",
      "           (  ~~~~~~~~~~~  )",
      "          (  ~~~~~~~~~~~~~  )",
      "         (  ~~~~~~~~~~~~~~~  )",
      "        (  ~~~~~~~~~~~~~~~~~  )",
      "       (  ~~~~~~~~~~~~~~~~~~~  )",
      "      (  ~~~~~~~~~~~~~~~~~~~~~  )",
      "     (  ~~~~~~~~~~~~~~~~~~~~~~~  )",
      "      \\~~~~~~~~~~~~~~~~~~~~~~~~/",
      "       \\~~~~~~~~~~~~~~~~~~~~~~/",
      "        \\~~~~~~~~~~~~~~~~~~~~/",
      "         \\~~~~~~~~~~~~~~~~~~/",
      "          \\~~~~~~~~~~~~~~~~/",
      "           \\~~~~~~~~~~~~~~/",
      "            \\~~~~~~~~~~~~/"
    ]
  },
  flying: {
    sm: [
      "  /\\_/\\",
      " ( o.o )",
      "  > ^ <",
      " /|   |\\",
      "/  ~~~  \\",
      "\\  ~~~  /",
      " \\|___|/"
    ],
    md: [
      "    /\\_/\\",
      "   ( o.o )",
      "    > ^ <",
      "   /|   |\\",
      "  / |~~~| \\",
      " /  |~~~|  \\",
      "/   |~~~|   \\",
      "\\   |~~~|   /",
      " \\  |~~~|  /",
      "  \\ |~~~| /",
      "   \\|___|/"
    ],
    lg: [
      "      /\\_/\\",
      "     ( o.o )",
      "      > ^ <",
      "     /|   |\\",
      "    / |~~~| \\",
      "   /  |~~~|  \\",
      "  /   |~~~|   \\",
      " /    |~~~|    \\",
      "/     |~~~|     \\",
      "\\     |~~~|     /",
      " \\    |~~~|    /",
      "  \\   |~~~|   /",
      "   \\  |~~~|  /",
      "    \\ |~~~| /",
      "     \\|___|/"
    ],
    xl: [
      "        /\\_/\\",
      "       ( o.o )",
      "        > ^ <",
      "       /|   |\\",
      "      / |~~~| \\",
      "     /  |~~~|  \\",
      "    /   |~~~|   \\",
      "   /    |~~~|    \\",
      "  /     |~~~|     \\",
      " /      |~~~|      \\",
      "/       |~~~|       \\",
      "\\       |~~~|       /",
      " \\      |~~~|      /",
      "  \\     |~~~|     /",
      "   \\    |~~~|    /",
      "    \\   |~~~|   /",
      "     \\  |~~~|  /",
      "      \\ |~~~| /",
      "       \\|___|/"
    ]
  },
  attacking: {
    sm: [
      "  /\\_/\\",
      " ( >.< )",
      "  \\|^|/",
      "   |||",
      "  /~~~\\",
      " (  ~  )",
      "  \\___/"
    ],
    md: [
      "    /\\_/\\",
      "   ( >.< )",
      "    \\|^|/",
      "     |||",
      "    /|||\\",
      "   /~~~~~\\",
      "  (  ~~~  )",
      "   \\~~~~~/"
    ],
    lg: [
      "      /\\_/\\",
      "     ( >.< )",
      "      \\|^|/",
      "       |||",
      "      /|||\\",
      "     /|||||\\",
      "    /~~~~~~~\\",
      "   (  ~~~~~  )",
      "  (  ~~~~~~~  )",
      "   \\~~~~~~~/"
    ],
    xl: [
      "        /\\_/\\",
      "       ( >.< )",
      "        \\|^|/",
      "         |||",
      "        /|||\\",
      "       /|||||\\",
      "      /|||||||\\",
      "     /~~~~~~~~~\\",
      "    (  ~~~~~~~  )",
      "   (  ~~~~~~~~~  )",
      "  (  ~~~~~~~~~~~  )",
      "   \\~~~~~~~~~~~/"
    ]
  },
  sleeping: {
    sm: [
      "  /\\_/\\",
      " ( -.- )",
      "  > z <",
      "  /~~~\\",
      " (  ~  )",
      "  \\___/"
    ],
    md: [
      "    /\\_/\\",
      "   ( -.- )",
      "    > z <",
      "   /~~~~~\\",
      "  (  ~~~  )",
      "   \\~~~~~/"
    ],
    lg: [
      "      /\\_/\\",
      "     ( -.- )",
      "      > z <",
      "     /~~~~~\\",
      "    (  ~~~  )",
      "   (  ~~~~~  )",
      "    \\~~~~~/"
    ],
    xl: [
      "        /\\_/\\",
      "       ( -.- )",
      "        > z <",
      "       /~~~~~\\",
      "      (  ~~~  )",
      "     (  ~~~~~  )",
      "    (  ~~~~~~~  )",
      "     \\~~~~~~~/"
    ]
  }
}

// Animation timing configurations
const animationConfigs = {
  slow: {
    typewriter: 150,
    breathing: 6000,
    floating: 12000
  },
  normal: {
    typewriter: 100,
    breathing: 4000,
    floating: 8000
  },
  fast: {
    typewriter: 50,
    breathing: 2000,
    floating: 4000
  }
}

// Size configurations
const sizeConfigs = {
  sm: {
    fontSize: 'text-xs',
    lineHeight: 'leading-3',
    padding: 'p-2'
  },
  md: {
    fontSize: 'text-sm',
    lineHeight: 'leading-4',
    padding: 'p-3'
  },
  lg: {
    fontSize: 'text-base',
    lineHeight: 'leading-5',
    padding: 'p-4'
  },
  xl: {
    fontSize: 'text-lg',
    lineHeight: 'leading-6',
    padding: 'p-6'
  }
}

// Memoized expensive calculations
const memoizedCharacterIntensity = createMemoizedCalculation(
  (input: { char: string; intensity: number; voiceEffect: boolean; voiceIntensity: number }) => {
    const { char, intensity, voiceEffect, voiceIntensity } = input
    
    const intensityMap: { [key: string]: string[] } = {
      '~': ['·', '~', '≈', '∼', '≋'],
      '|': ['¦', '|', '‖', '║', '▌'],
      '-': ['·', '-', '–', '—', '═'],
      '^': ['·', '^', '∧', '▲', '◆'],
      'o': ['·', 'o', 'O', '●', '◉'],
      '.': ['.', '·', '•', '●', '◉'],
      '/': ['/', '/', '⟋', '⟍', '╱'],
      '\\': ['\\', '\\', '⟍', '⟋', '╲']
    }

    // Voice-enhanced character mapping for energy effects
    if (voiceEffect) {
      const energyMap: { [key: string]: string[] } = {
        '~': ['≈', '∼', '≋', '〜', '⌇'],
        '|': ['‖', '║', '▌', '█', '▆'],
        '^': ['∧', '▲', '◆', '♦', '◊'],
        'o': ['O', '●', '◉', '◎', '☉']
      }
      
      const energyVariations = energyMap[char]
      if (energyVariations) {
        const energyIndex = Math.floor((intensity + voiceIntensity) / 2 * (energyVariations.length - 1))
        const safeIndex = Math.max(0, Math.min(energyIndex, energyVariations.length - 1))
        return energyVariations[safeIndex] ?? char
      }
    }

    const variations = intensityMap[char]
    if (variations) {
      const index = Math.floor(intensity * (variations.length - 1))
      const safeIndex = Math.max(0, Math.min(index, variations.length - 1))
      return variations[safeIndex] ?? char
    }

    return char
  },
  (input) => `${input.char}-${input.intensity.toFixed(2)}-${input.voiceEffect}-${input.voiceIntensity.toFixed(2)}`
)

// Performance-aware prop comparison
const propComparison = createPerformancePropComparison<ASCIIDragonProps>(['voiceState'])

const ASCIIDragonInternal: React.FC<ASCIIDragonProps> = ({
  size = 'lg',
  className = '',
  onClick,
  enableHover = true,
  enableTypewriter = true,
  enableBreathing = true,
  enableFloating = true,
  pose = 'coiled',
  speed = 'normal',
  voiceState,
  enablePerformanceMode = true,
  maxAnimationQuality = 1.0
}) => {
  const [displayedLines, setDisplayedLines] = useState<string[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [breathingIntensity, setBreathingIntensity] = useState(1)
  const [voiceIntensity, setVoiceIntensity] = useState(1)
  
  // Performance monitoring
  const performance = useDragonPerformance({
    config: {
      targetFPS: 60,
      adaptiveLOD: enablePerformanceMode,
      autoOptimization: enablePerformanceMode,
      maxMemoryMB: 64 // ASCII dragon uses less memory
    }
  })
  
  // Performance-aware refs
  const typewriterIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const breathingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const voiceIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Voice state overrides
  const effectivePose = useMemo(() => 
    voiceState ? voiceStateToASCIIPose(voiceState) : pose, 
    [voiceState, pose]
  )
  
  const effectiveSpeed = useMemo(() => 
    voiceState ? voiceStateToAnimationSpeed(voiceState) : speed, 
    [voiceState, speed]
  )
  
  const effectiveBreathing = useMemo(() => 
    voiceState ? shouldShowBreathing(voiceState) : enableBreathing, 
    [voiceState, enableBreathing]
  )
  
  const effectiveFloating = useMemo(() => 
    voiceState ? shouldShowFloating(voiceState) : enableFloating, 
    [voiceState, enableFloating]
  )

  const dragonArt = useMemo(() => dragonPatterns[effectivePose][size], [effectivePose, size])
  const config = animationConfigs[effectiveSpeed]
  const sizeConfig = sizeConfigs[size]

  // Performance-aware typewriter effect
  useEffect(() => {
    // Clear existing interval
    if (typewriterIntervalRef.current) {
      clearInterval(typewriterIntervalRef.current)
      typewriterIntervalRef.current = null
    }
    
    if (!enableTypewriter || performance.shouldDisableAnimations) {
      setDisplayedLines(dragonArt)
      setIsComplete(true)
      return
    }

    setDisplayedLines([])
    setIsComplete(false)

    let lineIndex = 0
    let charIndex = 0
    const currentLines: string[] = []
    
    // Adjust speed based on performance
    const adjustedSpeed = performance.shouldReduceQuality 
      ? config.typewriter * 2 
      : config.typewriter * maxAnimationQuality

    typewriterIntervalRef.current = setInterval(() => {
      if (lineIndex >= dragonArt.length) {
        setIsComplete(true)
        if (typewriterIntervalRef.current) {
          clearInterval(typewriterIntervalRef.current)
          typewriterIntervalRef.current = null
        }
        return
      }

      const currentLine = dragonArt[lineIndex]
      if (!currentLine || charIndex >= currentLine.length) {
        lineIndex++
        charIndex = 0
        return
      }

      const displayLine = currentLine.substring(0, charIndex + 1)
      const newLines = [...currentLines]
      newLines[lineIndex] = displayLine
      setDisplayedLines([...newLines])
      charIndex++
    }, adjustedSpeed)

    return () => {
      if (typewriterIntervalRef.current) {
        clearInterval(typewriterIntervalRef.current)
        typewriterIntervalRef.current = null
      }
    }
  }, [dragonArt, enableTypewriter, config.typewriter, performance.shouldDisableAnimations, performance.shouldReduceQuality, maxAnimationQuality])

  // Performance-aware voice intensity animation
  useEffect(() => {
    // Clear existing interval
    if (voiceIntervalRef.current) {
      clearInterval(voiceIntervalRef.current)
      voiceIntervalRef.current = null
    }
    
    if (!voiceState || performance.shouldDisableAnimations) {
      setVoiceIntensity(1)
      return
    }

    const targetIntensity = voiceState.volume || 0.5
    const updateInterval = performance.shouldReduceQuality ? 100 : 50
    
    voiceIntervalRef.current = setInterval(() => {
      setVoiceIntensity(prev => {
        const diff = targetIntensity - prev
        const smoothingFactor = performance.shouldReduceQuality ? 0.2 : 0.1
        return prev + diff * smoothingFactor
      })
    }, updateInterval)

    return () => {
      if (voiceIntervalRef.current) {
        clearInterval(voiceIntervalRef.current)
        voiceIntervalRef.current = null
      }
    }
  }, [voiceState, performance.shouldDisableAnimations, performance.shouldReduceQuality])

  // Performance-aware breathing effect with voice state
  useEffect(() => {
    // Clear existing interval
    if (breathingIntervalRef.current) {
      clearInterval(breathingIntervalRef.current)
      breathingIntervalRef.current = null
    }
    
    if (!effectiveBreathing || performance.shouldDisableAnimations) return

    const updateInterval = performance.shouldReduceQuality ? 100 : 50
    
    breathingIntervalRef.current = setInterval(() => {
      setBreathingIntensity(() => {
        const baseIntensity = 0.85 + Math.sin(Date.now() / config.breathing) * 0.15
        
        // Skip complex voice calculations in performance mode
        if (performance.shouldReduceQuality) {
          return Math.max(0.7, Math.min(1.15, baseIntensity))
        }
        
        // Enhance breathing with voice intensity for certain states
        if (voiceState?.isListening) {
          const voiceBoost = 0.1 * voiceIntensity
          return Math.max(0.7, Math.min(1.3, baseIntensity + voiceBoost))
        }
        
        if (voiceState?.isSpeaking) {
          const speakingBoost = 0.2 * voiceIntensity
          return Math.max(0.9, Math.min(1.4, baseIntensity + speakingBoost))
        }
        
        return Math.max(0.7, Math.min(1.15, baseIntensity))
      })
    }, updateInterval)

    return () => {
      if (breathingIntervalRef.current) {
        clearInterval(breathingIntervalRef.current)
        breathingIntervalRef.current = null
      }
    }
  }, [effectiveBreathing, config.breathing, voiceState, voiceIntensity, performance.shouldDisableAnimations, performance.shouldReduceQuality])

  // Performance-aware character intensity adjustment
  const adjustCharacterIntensity = useCallback((char: string, intensity: number, voiceEffect: boolean = false): string => {
    // Skip complex calculations in performance mode
    if (performance.shouldReduceQuality) {
      return char
    }
    
    return memoizedCharacterIntensity({
      char,
      intensity,
      voiceEffect: voiceEffect && !!voiceState?.isSpeaking,
      voiceIntensity
    })
  }, [performance.shouldReduceQuality, voiceState?.isSpeaking, voiceIntensity])

  // Apply breathing and voice effects to characters
  const processedLines = useMemo(() => {
    if (!effectiveBreathing) return displayedLines

    const shouldUseVoiceEffects = shouldShowEnergyEffects(voiceState || { 
      isListening: false, 
      isSpeaking: false, 
      isProcessing: false, 
      isIdle: true 
    })

    return displayedLines.map(line => 
      line.split('').map(char => 
        adjustCharacterIntensity(char, breathingIntensity, shouldUseVoiceEffects)
      ).join('')
    )
  }, [displayedLines, breathingIntensity, effectiveBreathing, voiceState, voiceIntensity])

  // Performance-aware floating animation with voice state
  const floatingAnimation = useMemo(() => {
    // Disable complex animations in performance mode
    if (performance.shouldDisableAnimations) {
      return undefined
    }
    
    const baseAnimation = {
      y: [0, -10, 0],
      x: [0, 5, 0],
      rotate: [0, 1, 0]
    }
    
    // Reduce animation complexity in low performance mode
    if (performance.shouldReduceQuality) {
      return {
        y: [0, -5, 0],
        transition: {
          duration: (config.floating / 1000) * 1.5,
          repeat: Infinity,
          ease: 'linear' as const
        }
      }
    }

    // Enhance animation based on voice state
    if (voiceState?.isSpeaking) {
      return {
        ...baseAnimation,
        y: [0, -15, 0, -8, 0],
        x: [0, 8, 0, -3, 0],
        rotate: [0, 2, 0, -1, 0],
        transition: {
          duration: (config.floating / 1000) * 0.7 * maxAnimationQuality,
          repeat: Infinity,
          ease: 'easeInOut' as const
        }
      }
    }

    if (voiceState?.isListening) {
      return {
        ...baseAnimation,
        y: [0, -12, 0],
        x: [0, 6, 0],
        rotate: [0, 1.5, 0],
        transition: {
          duration: (config.floating / 1000) * 0.8 * maxAnimationQuality,
          repeat: Infinity,
          ease: 'easeInOut' as const
        }
      }
    }

    return {
      ...baseAnimation,
      transition: {
        duration: (config.floating / 1000) * maxAnimationQuality,
        repeat: Infinity,
        ease: 'easeInOut' as const
      }
    }
  }, [config.floating, voiceState, performance.shouldDisableAnimations, performance.shouldReduceQuality, maxAnimationQuality])

  // Spacing adjustment for floating
  const spacingStyle = useMemo(() => {
    const baseSpacing = effectiveFloating ? 'tracking-wide' : 'tracking-normal'
    return baseSpacing
  }, [effectiveFloating])

  return (
    <motion.div
      className={`${sizeConfig.padding} ${className} cursor-pointer select-none font-mono ${spacingStyle}`}
      onClick={onClick}
      whileHover={enableHover ? { scale: 1.02 } : undefined}
      whileTap={{ scale: 0.98 }}
      animate={effectiveFloating ? floatingAnimation : undefined}
      transition={effectiveFloating ? undefined : { type: 'spring', stiffness: 300, damping: 20 }}
    >
      <div className="relative">
        <AnimatePresence>
          <motion.pre
            className={`${sizeConfig.fontSize} ${sizeConfig.lineHeight} whitespace-pre text-white/90 leading-tight`}
            initial={{ opacity: 0 }}
            animate={{ opacity: isComplete ? 1 : 0.8 }}
            transition={{ duration: 0.3 }}
            style={{
              transform: enableBreathing ? `scale(${breathingIntensity})` : 'scale(1)',
              transformOrigin: 'center center'
            }}
          >
            {processedLines.map((line, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                {line}
              </motion.div>
            ))}
          </motion.pre>
        </AnimatePresence>
        
        {/* Enhanced glow effect with voice state */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: voiceState?.isSpeaking 
              ? 'radial-gradient(circle at center, rgba(255,165,0,0.2) 0%, transparent 70%)'
              : voiceState?.isListening
              ? 'radial-gradient(circle at center, rgba(0,150,255,0.15) 0%, transparent 70%)'
              : 'radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, transparent 70%)',
            opacity: effectiveBreathing ? breathingIntensity * 0.3 : 0.2
          }}
        />
        
        {/* Voice state specific effects */}
        {voiceState && (
          <>
            {/* Speaking energy waves */}
            {voiceState.isSpeaking && (
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={`wave-${i}`}
                    className="absolute inset-0 border border-orange-400/30 rounded-lg"
                    animate={{
                      scale: [1, 1.1 + i * 0.05, 1],
                      opacity: [0.6, 0.2, 0.6]
                    }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      delay: i * 0.3,
                      ease: 'easeInOut'
                    }}
                  />
                ))}
              </div>
            )}
            
            {/* Listening pulse */}
            {voiceState.isListening && (
              <motion.div
                className="absolute inset-0 border-2 border-blue-400/40 rounded-lg pointer-events-none"
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.7, 0.3, 0.7]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />
            )}
            
            {/* Processing indicator */}
            {voiceState.isProcessing && (
              <div className="absolute -top-1 -right-1 w-3 h-3">
                <motion.div
                  className="w-full h-full bg-purple-400 rounded-full"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.8, 0.4, 0.8]
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                />
              </div>
            )}
            
            {/* Error state indicator */}
            {voiceState.emotion === 'angry' && (
              <motion.div
                className="absolute inset-0 border-2 border-red-500/50 rounded-lg pointer-events-none"
                animate={{
                  opacity: [0.8, 0.3, 0.8]
                }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              />
            )}
          </>
        )}
      </div>
    </motion.div>
  )
}

// Memoized component with performance-aware prop comparison
const ASCIIDragon = React.memo(ASCIIDragonInternal, (prevProps, nextProps) => {
  return propComparison(prevProps, nextProps)
})

// Add display name for debugging
ASCIIDragon.displayName = 'ASCIIDragon'

export default ASCIIDragon