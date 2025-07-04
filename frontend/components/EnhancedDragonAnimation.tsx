'use client'

import { motion, useAnimation, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'

interface EnhancedDragonAnimationProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showDragonBalls?: boolean
  className?: string
  enableGestures?: boolean
}

const sizeConfig = {
  sm: { width: 120, height: 120, containerSize: 'w-32 h-32' },
  md: { width: 200, height: 200, containerSize: 'w-52 h-52' },
  lg: { width: 300, height: 300, containerSize: 'w-80 h-80' },
  xl: { width: 400, height: 400, containerSize: 'w-96 h-96' }
}

// Dragon State Types
type DragonState = 'idle' | 'attention' | 'ready' | 'active'

export function EnhancedDragonAnimation({ 
  size = 'lg', 
  showDragonBalls = true, 
  className = '',
  enableGestures = true
}: EnhancedDragonAnimationProps) {
  const [dragonState, setDragonState] = useState<DragonState>('idle')
  const [isHovered, setIsHovered] = useState(false)
  const controls = useAnimation()
  const containerRef = useRef<HTMLDivElement>(null)
  const config = sizeConfig[size]

  // Motion values for cursor tracking
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  
  // Transform mouse position to rotation
  const rotateX = useTransform(mouseY, [-300, 300], [5, -5])
  const rotateY = useTransform(mouseX, [-300, 300], [-5, 5])

  // Breathing animation variant
  const breathingVariants = {
    idle: {
      scale: [1, 1.02, 1],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  }

  // Dragon state variants
  const dragonVariants = {
    idle: {
      scale: 1,
      filter: "brightness(1) contrast(1)",
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 20
      }
    },
    attention: {
      scale: 1.05,
      filter: "brightness(1.1) contrast(1.05)",
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25
      }
    },
    ready: {
      scale: [1.05, 1.1, 1.05],
      filter: [
        "brightness(1.1) contrast(1.1)",
        "brightness(1.3) contrast(1.2)",
        "brightness(1.1) contrast(1.1)"
      ],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    },
    active: {
      scale: [1.1, 1.15, 1.1],
      filter: [
        "brightness(1.3) contrast(1.3) hue-rotate(0deg)",
        "brightness(1.5) contrast(1.4) hue-rotate(20deg)",
        "brightness(1.3) contrast(1.3) hue-rotate(0deg)"
      ],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  }

  // Floating animation
  const floatingAnimation = {
    y: [0, -15, -5, -18, 0],
    x: [0, 5, -2, -3, 0],
    rotate: [0, 2, -1, -1.5, 0],
    transition: {
      duration: 8,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }

  // Wind drift animation
  const windDriftAnimation = {
    x: [0, 10, -5, 8, 0],
    skewX: [0, 2, -1, 1.5, 0],
    transition: {
      duration: 15,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }

  // Dragon ball orbit variants
  const dragonBallOrbitVariants = {
    normal: {
      rotate: 360,
      transition: {
        duration: 15,
        repeat: Infinity,
        ease: "linear"
      }
    },
    fast: {
      rotate: 720,
      transition: {
        duration: 5,
        repeat: Infinity,
        ease: "linear"
      }
    }
  }

  // Aura pulse animation
  const auraPulseVariants = {
    idle: {
      opacity: [0.3, 0.5, 0.3],
      scale: [1, 1.1, 1],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    },
    active: {
      opacity: [0.5, 0.8, 0.5],
      scale: [1.2, 1.4, 1.2],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  }

  // Handle mouse movement for eye tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        
        mouseX.set(e.clientX - centerX)
        mouseY.set(e.clientY - centerY)

        // Update dragon state based on distance
        const distance = Math.sqrt(
          Math.pow(e.clientX - centerX, 2) + 
          Math.pow(e.clientY - centerY, 2)
        )

        if (distance < 200) {
          setDragonState('ready')
        } else if (distance < 400) {
          setDragonState('attention')
        } else {
          setDragonState('idle')
        }
      }
    }

    if (enableGestures) {
      window.addEventListener('mousemove', handleMouseMove)
      return () => window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [mouseX, mouseY, enableGestures])

  // Particle generation
  const generateParticles = () => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100 - 50,
      y: 0,
      delay: i * 0.3,
      duration: 3 + Math.random() * 2
    }))
  }

  const [particles, setParticles] = useState(generateParticles())

  // Regenerate particles periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(generateParticles())
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <motion.div 
      ref={containerRef}
      className={`relative ${config.containerSize} ${className} dragon-3d-container`}
      onMouseEnter={() => {
        setIsHovered(true)
        if (!enableGestures) setDragonState('attention')
      }}
      onMouseLeave={() => {
        setIsHovered(false)
        setDragonState('idle')
      }}
      onClick={() => setDragonState('active')}
    >
      {/* Dragon Aura Background */}
      <motion.div 
        className="absolute inset-[-50%] pointer-events-none"
        variants={auraPulseVariants}
        animate={dragonState === 'active' ? 'active' : 'idle'}
      >
        <div className="absolute inset-0 bg-gradient-radial from-red-500/40 via-orange-500/30 to-transparent rounded-full blur-3xl" />
      </motion.div>

      {/* Magical Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <AnimatePresence>
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute w-1 h-1"
              initial={{ 
                x: particle.x,
                y: config.height,
                opacity: 0,
                scale: 0
              }}
              animate={{ 
                x: particle.x + Math.random() * 50,
                y: -20,
                opacity: [0, 1, 1, 0],
                scale: [0, 1.5, 1, 0]
              }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{
                duration: particle.duration,
                delay: particle.delay,
                ease: "easeOut"
              }}
            >
              <div className="w-full h-full bg-gradient-radial from-yellow-400 to-orange-400 rounded-full shadow-glow" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {/* Dragon Balls Orbiting */}
      {showDragonBalls && (
        <motion.div 
          className="absolute inset-0"
          variants={dragonBallOrbitVariants}
          animate={dragonState === 'active' ? 'fast' : 'normal'}
        >
          {[1, 2, 3, 4, 5, 6, 7].map((stars, index) => (
            <motion.div
              key={stars}
              className="absolute w-8 h-8"
              style={{
                transform: `rotate(${index * 51.43}deg) translateX(${config.width * 0.6}px) rotate(-${index * 51.43}deg)`,
              }}
              animate={{
                y: [0, -3, 0],
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 4,
                delay: index * 0.2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <motion.div 
                className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full shadow-lg relative overflow-hidden"
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-red-600 text-xs font-bold">
                    {'★'.repeat(stars)}
                  </div>
                </div>
                <motion.div 
                  className="absolute top-1 left-1 w-3 h-3 bg-yellow-200 rounded-full"
                  animate={{
                    opacity: [0.7, 1, 0.7],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Main Dragon Container */}
      <motion.div
        className={`relative ${config.containerSize} dragon-transform`}
        animate={controls}
        variants={dragonVariants}
        initial="idle"
      >
        {/* Breathing Layer */}
        <motion.div
          className="absolute inset-0"
          variants={breathingVariants}
          animate="idle"
        >
          {/* Floating Animation Layer */}
          <motion.div
            className="absolute inset-0"
            animate={floatingAnimation}
          >
            {/* Wind Drift Layer */}
            <motion.div
              className="absolute inset-0"
              animate={windDriftAnimation}
            >
              {/* 3D Rotation Layer */}
              <motion.div
                className="absolute inset-0"
                style={{
                  rotateX: enableGestures ? rotateX : 0,
                  rotateY: enableGestures ? rotateY : 0,
                }}
              >
                {/* Dragon Image */}
                <Image
                  src="/images/seiron.png"
                  alt="Seiron - The Wish-Granting Dragon"
                  width={config.width}
                  height={config.height}
                  className="object-contain filter drop-shadow-2xl"
                  priority
                />
                
                {/* Dragon Glow Overlay */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  animate={{
                    opacity: dragonState === 'active' ? [0.3, 0.6, 0.3] : 0,
                  }}
                  transition={{
                    duration: 1,
                    repeat: dragonState === 'active' ? Infinity : 0,
                    ease: "easeInOut"
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-radial from-red-400/50 via-orange-400/30 to-transparent rounded-full blur-2xl" />
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Power Rings */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          opacity: dragonState === 'ready' || dragonState === 'active' ? 1 : 0,
        }}
      >
        {[1, 2, 3].map((ring) => (
          <motion.div
            key={ring}
            className="absolute inset-0 border-2 border-red-500/30 rounded-full"
            animate={{
              scale: [1, 1.2 + ring * 0.1, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2 + ring * 0.5,
              delay: ring * 0.2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        ))}
      </motion.div>

      {/* Floating Embers */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-orange-400 rounded-full"
            style={{
              left: `${20 + i * 10}%`,
            }}
            animate={{
              y: [-config.height, -20],
              opacity: [0, 0.8, 0],
              scale: [0.5, 1, 0.3],
            }}
            transition={{
              duration: 3 + i * 0.5,
              delay: i * 0.8,
              repeat: Infinity,
              ease: "easeOut"
            }}
          />
        ))}
      </div>

      {/* State Indicator */}
      <motion.div
        className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-xs font-bold"
        animate={{
          opacity: dragonState === 'idle' ? 0 : 1,
        }}
      >
        <span className={`
          px-2 py-1 rounded-full
          ${dragonState === 'attention' ? 'bg-yellow-500/20 text-yellow-500' : ''}
          ${dragonState === 'ready' ? 'bg-orange-500/20 text-orange-500' : ''}
          ${dragonState === 'active' ? 'bg-red-500/20 text-red-500' : ''}
        `}>
          {dragonState.toUpperCase()}
        </span>
      </motion.div>
    </motion.div>
  )
}