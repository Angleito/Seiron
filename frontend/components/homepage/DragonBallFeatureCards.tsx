'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, Activity, Search, Shield, Zap, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FeatureCard {
  id: string
  title: string
  subtitle: string
  description: string
  icon: React.ComponentType<any>
  color: {
    primary: string
    secondary: string
    glow: string
    star: string
  }
  starCount: number
}

interface DragonBallFeatureCardsProps {
  className?: string
  autoRotate?: boolean
  rotationInterval?: number
}

const FEATURES: FeatureCard[] = [
  {
    id: 'trading',
    title: 'Saiyan Trading',
    subtitle: 'DeFi Protocol Mastery',
    description: 'Harness the power of multiple DeFi protocols with lightning-fast execution and battle-tested strategies.',
    icon: TrendingUp,
    color: {
      primary: 'from-orange-500 to-red-600',
      secondary: 'from-orange-400/20 to-red-500/20',
      glow: 'rgba(255, 107, 53, 0.6)',
      star: '#ff2e2e'
    },
    starCount: 4
  },
  {
    id: 'radar',
    title: 'Dragon Radar',
    subtitle: 'Portfolio Tracking',
    description: 'Track your DeFi positions across the multiverse with real-time insights and mystical analytics.',
    icon: Search,
    color: {
      primary: 'from-blue-500 to-purple-600',
      secondary: 'from-blue-400/20 to-purple-500/20',
      glow: 'rgba(59, 130, 246, 0.6)',
      star: '#3b82f6'
    },
    starCount: 5
  },
  {
    id: 'fusion',
    title: 'Fusion Dance',
    subtitle: 'Lending Strategies',
    description: 'Combine multiple lending protocols into powerful fusion strategies that maximize your yield potential.',
    icon: Sparkles,
    color: {
      primary: 'from-green-500 to-emerald-600',
      secondary: 'from-green-400/20 to-emerald-500/20',
      glow: 'rgba(34, 197, 94, 0.6)',
      star: '#22c55e'
    },
    starCount: 6
  },
  {
    id: 'kamehameha',
    title: 'Kamehameha',
    subtitle: 'Analytics Power',
    description: 'Unleash devastating analytical insights with our signature move - comprehensive DeFi intelligence.',
    icon: Zap,
    color: {
      primary: 'from-yellow-500 to-orange-500',
      secondary: 'from-yellow-400/20 to-orange-400/20',
      glow: 'rgba(255, 211, 61, 0.8)',
      star: '#ffd93d'
    },
    starCount: 7
  }
]

// Helper function to generate symmetrical star positions like DBZ Dragon Balls
const getStarPositions = (starCount: number): Array<{x: number, y: number}> => {
  const positions = {
    4: [
      { x: 32, y: 32 }, // Top-left
      { x: 68, y: 32 }, // Top-right
      { x: 32, y: 68 }, // Bottom-left
      { x: 68, y: 68 }  // Bottom-right
    ],
    5: [
      { x: 32, y: 32 }, // Top-left
      { x: 68, y: 32 }, // Top-right
      { x: 50, y: 50 }, // Center
      { x: 32, y: 68 }, // Bottom-left
      { x: 68, y: 68 }  // Bottom-right
    ],
    6: [
      { x: 30, y: 30 }, // Top-left
      { x: 50, y: 25 }, // Top-center
      { x: 70, y: 30 }, // Top-right
      { x: 30, y: 70 }, // Bottom-left
      { x: 50, y: 75 }, // Bottom-center
      { x: 70, y: 70 }  // Bottom-right
    ],
    7: [
      { x: 28, y: 28 }, // Top-left
      { x: 50, y: 23 }, // Top-center
      { x: 72, y: 28 }, // Top-right
      { x: 25, y: 50 }, // Middle-left
      { x: 50, y: 50 }, // Center
      { x: 75, y: 50 }, // Middle-right
      { x: 50, y: 77 }  // Bottom-center
    ]
  }
  
  return positions[starCount as keyof typeof positions] || positions[4]
}

const DragonBallOrb: React.FC<{
  feature: FeatureCard
  isActive: boolean
  onHover: () => void
  onLeave: () => void
}> = ({ feature, isActive, onHover, onLeave }) => {
  const [isCharging, setIsCharging] = useState(false)
  const orbRef = useRef<HTMLDivElement>(null)

  const handleClick = () => {
    setIsCharging(true)
    setTimeout(() => setIsCharging(false), 1000)
  }

  return (
    <motion.div
      ref={orbRef}
      className="relative group cursor-pointer"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={handleClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Main Dragon Ball Orb */}
      <motion.div
        className={cn(
          "relative w-48 h-48 rounded-full overflow-hidden",
          "bg-gradient-to-br", feature.color.primary,
          "shadow-2xl",
          "storm-gpu-accelerated"
        )}
        animate={{
          rotate: isActive ? 360 : 0,
          boxShadow: isActive 
            ? `0 0 60px ${feature.color.glow}, 0 0 100px ${feature.color.glow}`
            : `0 0 30px ${feature.color.glow}`
        }}
        transition={{
          rotate: { 
            duration: isActive ? 8 : 0, 
            ease: "linear", 
            repeat: isActive ? Infinity : 0 
          },
          boxShadow: { duration: 0.3 }
        }}
      >
        {/* Inner Glow */}
        <div 
          className={cn(
            "absolute inset-2 rounded-full",
            "bg-gradient-to-br", feature.color.secondary,
            "blur-sm opacity-80"
          )}
        />

        {/* Stars with symmetrical positioning */}
        <div className="absolute inset-0">
          {getStarPositions(feature.starCount).map((position, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
              animate={{
                scale: isActive ? [1, 1.2, 1] : 1,
                rotate: isActive ? [0, 180, 360] : 0
              }}
              transition={{
                duration: 2,
                delay: i * 0.1,
                repeat: isActive ? Infinity : 0
              }}
            >
              <div
                className="text-3xl drop-shadow-lg"
                style={{ 
                  color: feature.color.star,
                  filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.5))'
                }}
              >
                ★
              </div>
            </motion.div>
          ))}
        </div>

        {/* Energy Aura */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              className="absolute -inset-4 rounded-full"
              style={{
                background: `radial-gradient(circle, ${feature.color.glow}, transparent 70%)`
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: [0.3, 0.7, 0.3],
                scale: [0.8, 1.2, 0.8]
              }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          )}
        </AnimatePresence>

        {/* Charging Effect */}
        <AnimatePresence>
          {isCharging && (
            <>
              {/* Energy Blast */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `radial-gradient(circle, ${feature.color.glow}, transparent 60%)`
                }}
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 3, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
              
              {/* Lightning Effects */}
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-16 bg-white rounded-full"
                  style={{
                    left: '50%',
                    top: '50%',
                    transformOrigin: 'bottom center',
                    rotate: `${i * 60}deg`
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ 
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0],
                    scaleY: [0, 2, 0]
                  }}
                  transition={{
                    duration: 0.8,
                    delay: i * 0.1,
                    ease: "easeOut"
                  }}
                />
              ))}
            </>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Feature Content Reveal */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            className={cn(
              "absolute inset-0 rounded-full",
              "bg-gradient-to-br from-slate-900/95 to-slate-800/95",
              "backdrop-blur-sm",
              "flex flex-col items-center justify-center text-center p-6",
              "border-2",
              "storm-mystical-aura"
            )}
            style={{ borderColor: feature.color.star }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* Icon */}
            <motion.div
              className="mb-3"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <feature.icon 
                className="w-8 h-8"
                style={{ color: feature.color.star }}
              />
            </motion.div>

            {/* Title */}
            <motion.h3
              className="text-lg font-bold text-white mb-1"
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {feature.title}
            </motion.h3>

            {/* Subtitle */}
            <motion.p
              className="text-sm text-gray-300 mb-2"
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {feature.subtitle}
            </motion.p>

            {/* Description */}
            <motion.p
              className="text-xs text-gray-400 leading-relaxed"
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {feature.description}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export const DragonBallFeatureCards: React.FC<DragonBallFeatureCardsProps> = ({
  className,
  autoRotate = false,
  rotationInterval = 3000
}) => {
  const [activeCard, setActiveCard] = useState<string | null>(null)

  return (
    <div className={cn(
      "relative py-16 overflow-hidden",
      "storm-mystical-background",
      className
    )}>
      {/* Background Energy Grid */}
      <div className="absolute inset-0 opacity-10">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255, 107, 53, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 107, 53, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '30px 30px'
          }}
        />
      </div>

      {/* Header */}
      <div className="text-center mb-16 relative z-10">
        <motion.h2
          className={cn(
            "text-4xl md:text-5xl font-black mb-4",
            "bg-gradient-to-r from-orange-400 via-yellow-400 to-red-500",
            "bg-clip-text text-transparent",
            "storm-power-pulse"
          )}
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          Legendary Powers
        </motion.h2>
        
        <motion.p
          className="text-xl text-gray-300 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        >
          Discover the mystical abilities that make Seiron the ultimate DeFi companion
        </motion.p>
      </div>

      {/* Dragon Ball Grid */}
      <div className="relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto px-6">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 50, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.6,
                delay: index * 0.1,
                ease: "easeOut"
              }}
              className="flex justify-center"
            >
              <DragonBallOrb
                feature={feature}
                isActive={activeCard === feature.id}
                onHover={() => setActiveCard(feature.id)}
                onLeave={() => setActiveCard(null)}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Power Level Indicator */}
      <motion.div
        className="mt-16 text-center relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
      >
        <div className="inline-flex items-center space-x-2 px-6 py-3 rounded-full bg-gradient-to-r from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-yellow-400/30">
          <Activity className="w-5 h-5 text-yellow-400" />
          <span className="text-yellow-400 font-semibold">
            {activeCard ? `${FEATURES.find(f => f.id === activeCard)?.starCount}-Star Dragon Ball: ${FEATURES.find(f => f.id === activeCard)?.title} Activated!` : 'Hover to Activate Dragon Balls (4-7 Stars)'}
          </span>
          <Zap className="w-5 h-5 text-yellow-400" />
        </div>
      </motion.div>

      {/* Mystical Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-yellow-400/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [-20, -40, -20],
              opacity: [0.3, 0.8, 0.3],
              scale: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: i * 0.3,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default DragonBallFeatureCards