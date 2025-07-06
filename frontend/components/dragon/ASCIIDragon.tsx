'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

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

const ASCIIDragon: React.FC<ASCIIDragonProps> = ({
  size = 'lg',
  className = '',
  onClick,
  enableHover = true,
  enableTypewriter = true,
  enableBreathing = true,
  enableFloating = true,
  pose = 'coiled',
  speed = 'normal'
}) => {
  const [displayedLines, setDisplayedLines] = useState<string[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [breathingIntensity, setBreathingIntensity] = useState(1)

  const dragonArt = useMemo(() => dragonPatterns[pose][size], [pose, size])
  const config = animationConfigs[speed]
  const sizeConfig = sizeConfigs[size]

  // Typewriter effect
  useEffect(() => {
    if (!enableTypewriter) {
      setDisplayedLines(dragonArt)
      setIsComplete(true)
      return
    }

    setDisplayedLines([])
    setIsComplete(false)

    let lineIndex = 0
    let charIndex = 0
    const currentLines: string[] = []

    const typewriterInterval = setInterval(() => {
      if (lineIndex >= dragonArt.length) {
        setIsComplete(true)
        clearInterval(typewriterInterval)
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
    }, config.typewriter)

    return () => clearInterval(typewriterInterval)
  }, [dragonArt, enableTypewriter, config.typewriter])

  // Breathing effect
  useEffect(() => {
    if (!enableBreathing) return

    const breathingInterval = setInterval(() => {
      setBreathingIntensity(() => {
        const newIntensity = 0.85 + Math.sin(Date.now() / config.breathing) * 0.15
        return Math.max(0.7, Math.min(1.15, newIntensity))
      })
    }, 50)

    return () => clearInterval(breathingInterval)
  }, [enableBreathing, config.breathing])

  // Character intensity adjustment for breathing
  const adjustCharacterIntensity = (char: string, intensity: number): string => {
    const intensityMap: { [key: string]: string[] } = {
      '~': ['·', '~', '≈', '∼'],
      '|': ['¦', '|', '‖', '║'],
      '-': ['·', '-', '–', '—'],
      '^': ['·', '^', '∧', '▲'],
      'o': ['·', 'o', 'O', '●']
    }

    if (intensityMap[char]) {
      const variations = intensityMap[char]
      const index = Math.floor(intensity * (variations.length - 1))
      return variations[Math.max(0, Math.min(index, variations.length - 1))]
    }

    return char
  }

  // Apply breathing effect to characters
  const processedLines = useMemo(() => {
    if (!enableBreathing) return displayedLines

    return displayedLines.map(line => 
      line.split('').map(char => 
        adjustCharacterIntensity(char, breathingIntensity)
      ).join('')
    )
  }, [displayedLines, breathingIntensity, enableBreathing])

  // Floating animation variants
  const floatingVariants = {
    animate: {
      y: [0, -10, 0],
      x: [0, 5, 0],
      rotate: [0, 1, 0],
      transition: {
        duration: config.floating / 1000,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    }
  }

  // Spacing adjustment for floating
  const spacingStyle = useMemo(() => {
    const baseSpacing = enableFloating ? 'tracking-wide' : 'tracking-normal'
    return baseSpacing
  }, [enableFloating])

  return (
    <motion.div
      className={`${sizeConfig.padding} ${className} cursor-pointer select-none font-mono ${spacingStyle}`}
      onClick={onClick}
      whileHover={enableHover ? { scale: 1.02 } : undefined}
      whileTap={{ scale: 0.98 }}
      animate={enableFloating ? floatingVariants.animate : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
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
        
        {/* Subtle glow effect */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, transparent 70%)',
            opacity: enableBreathing ? breathingIntensity * 0.3 : 0.2
          }}
        />
      </div>
    </motion.div>
  )
}

export default React.memo(ASCIIDragon)