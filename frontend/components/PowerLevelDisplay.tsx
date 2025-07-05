'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Crown, Star } from 'lucide-react'
import { cn } from '@lib/utils'

interface PowerLevelConfig {
  level: number
  tier: string
  title: string
  color: string
  bgColor: string
  borderColor: string
  description: string
  minValue: number
  maxValue: number
  emoji: string
  aura: string[]
}

export interface PowerLevelDisplayProps {
  powerLevel: number
  portfolioValue?: number
  animated?: boolean
  showBreakdown?: boolean
  showAura?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onTierChange?: (tier: string) => void
}

const POWER_LEVEL_CONFIGS: PowerLevelConfig[] = [
  {
    level: 1,
    tier: 'Earthling',
    title: 'Mortal Investor',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    description: 'Just starting your investment journey',
    minValue: 0,
    maxValue: 1000,
    emoji: '👤',
    aura: ['bg-gray-200', 'bg-gray-300']
  },
  {
    level: 2,
    tier: 'Fighter',
    title: 'Warrior Trader',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Building strength in the markets',
    minValue: 1000,
    maxValue: 5000,
    emoji: '⚔️',
    aura: ['bg-blue-200', 'bg-blue-300']
  },
  {
    level: 3,
    tier: 'Elite Warrior',
    title: 'Skilled Strategist',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    description: 'Showing impressive market prowess',
    minValue: 5000,
    maxValue: 20000,
    emoji: '🛡️',
    aura: ['bg-green-200', 'bg-green-300']
  },
  {
    level: 4,
    tier: 'Super Saiyan',
    title: 'Golden Investor',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    description: 'Incredible power surging through your portfolio!',
    minValue: 20000,
    maxValue: 50000,
    emoji: '💫',
    aura: ['bg-yellow-200', 'bg-yellow-300', 'bg-yellow-400']
  },
  {
    level: 5,
    tier: 'Super Saiyan 2',
    title: 'Legendary Trader',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    description: 'Your power level is astronomical!',
    minValue: 50000,
    maxValue: 100000,
    emoji: '⚡',
    aura: ['bg-orange-200', 'bg-orange-300', 'bg-orange-400']
  },
  {
    level: 6,
    tier: 'Super Saiyan 3',
    title: 'Market Master',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    description: 'Unbelievable! Your strength knows no bounds!',
    minValue: 100000,
    maxValue: 500000,
    emoji: '🔥',
    aura: ['bg-red-200', 'bg-red-300', 'bg-red-400', 'bg-red-500']
  },
  {
    level: 7,
    tier: 'Super Saiyan God',
    title: 'Divine Investor',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    description: 'You have achieved divine investment status!',
    minValue: 500000,
    maxValue: 1000000,
    emoji: '👑',
    aura: ['bg-purple-200', 'bg-purple-300', 'bg-purple-400', 'bg-purple-500']
  },
  {
    level: 8,
    tier: 'Ultra Instinct',
    title: 'Transcendent Master',
    color: 'text-indigo-600',
    bgColor: 'bg-gradient-to-r from-indigo-50 to-purple-50',
    borderColor: 'border-indigo-300',
    description: 'You have transcended mortal investment understanding!',
    minValue: 1000000,
    maxValue: Infinity,
    emoji: '🌟',
    aura: ['bg-indigo-200', 'bg-purple-200', 'bg-indigo-300', 'bg-purple-300', 'bg-indigo-400']
  }
]

export function PowerLevelDisplay({
  powerLevel,
  portfolioValue,
  animated = true,
  showBreakdown = false,
  showAura = true,
  size = 'md',
  className,
  onTierChange
}: PowerLevelDisplayProps) {
  const [displayLevel, setDisplayLevel] = useState(0)
  const [previousTier, setPreviousTier] = useState<string>('')
  const [isLevelingUp, setIsLevelingUp] = useState(false)

  // Find current tier configuration
  const currentConfig = useMemo(() => {
    return POWER_LEVEL_CONFIGS.find(config => 
      powerLevel >= config.minValue && powerLevel < config.maxValue
    ) || POWER_LEVEL_CONFIGS[POWER_LEVEL_CONFIGS.length - 1] || POWER_LEVEL_CONFIGS[0]
  }, [powerLevel])

  // Calculate progress within current tier
  const tierProgress = useMemo(() => {
    if (!currentConfig || currentConfig.maxValue === Infinity) return 100
    const range = currentConfig.maxValue - currentConfig.minValue
    const progress = range > 0 ? ((powerLevel - currentConfig.minValue) / range) * 100 : 0
    return Math.min(Math.max(progress, 0), 100)
  }, [powerLevel, currentConfig])

  // Animate power level changes
  useEffect(() => {
    if (animated) {
      const increment = Math.ceil((powerLevel - displayLevel) / 20)
      const timer = setInterval(() => {
        setDisplayLevel(prev => {
          const next = prev + increment
          if (next >= powerLevel) {
            clearInterval(timer)
            return powerLevel
          }
          return next
        })
      }, 50)
      return () => clearInterval(timer)
    } else {
      setDisplayLevel(powerLevel)
      return undefined
    }
  }, [powerLevel, animated, displayLevel])

  // Handle tier changes
  useEffect(() => {
    if (!currentConfig) return
    
    if (previousTier && previousTier !== currentConfig.tier) {
      setIsLevelingUp(true)
      onTierChange?.(currentConfig.tier)
      setTimeout(() => setIsLevelingUp(false), 2000)
    }
    setPreviousTier(currentConfig.tier)
  }, [currentConfig?.tier, previousTier, onTierChange, currentConfig])

  const sizeClasses = {
    sm: 'text-sm p-3',
    md: 'text-base p-4',
    lg: 'text-lg p-6'
  }

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  const formatPowerLevel = (level: number) => {
    if (level >= 1000000) {
      return `${(level / 1000000).toFixed(1)}M`
    } else if (level >= 1000) {
      return `${(level / 1000).toFixed(1)}K`
    }
    return level.toLocaleString()
  }

  if (!currentConfig) {
    return (
      <div className={cn("relative p-4 border border-gray-300 rounded-lg", className)}>
        <p className="text-gray-500">Loading power level...</p>
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      {/* Aura Effect */}
      {showAura && animated && (
        <div className="absolute inset-0 -m-2">
          {currentConfig.aura.map((auraColor, index) => (
            <motion.div
              key={index}
              className={cn(
                "absolute inset-0 rounded-lg opacity-20",
                auraColor
              )}
              animate={{
                scale: [1, 1.05 + index * 0.02, 1],
                opacity: [0.1, 0.3, 0.1],
              }}
              transition={{
                duration: 2 + index * 0.5,
                repeat: Infinity,
                delay: index * 0.2,
              }}
            />
          ))}
        </div>
      )}

      {/* Main Display */}
      <motion.div
        className={cn(
          "relative rounded-lg border-2 transition-all duration-500",
          currentConfig.bgColor,
          currentConfig.borderColor,
          sizeClasses[size],
          isLevelingUp && "animate-pulse"
        )}
        animate={isLevelingUp ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.5 }}
      >
        {/* Level Up Animation */}
        <AnimatePresence>
          {isLevelingUp && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 rounded-lg z-10"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
            >
              <div className="text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="text-4xl mb-2"
                >
                  ⭐
                </motion.div>
                <p className="font-bold text-yellow-600">TIER UP!</p>
                <p className="text-sm text-yellow-700">{currentConfig.tier}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{currentConfig.emoji}</span>
            <div>
              <h3 className={cn("font-bold", currentConfig.color)}>
                {currentConfig.title}
              </h3>
              <p className="text-xs text-gray-600">{currentConfig.tier}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              <Zap className={cn(iconSizes[size], currentConfig.color)} />
              <span className={cn("font-bold", currentConfig.color)}>
                {formatPowerLevel(displayLevel)}
              </span>
            </div>
            <p className="text-xs text-gray-500">Power Level</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-600">
              {formatPowerLevel(currentConfig.minValue)}
            </span>
            <span className={cn("font-medium", currentConfig.color)}>
              {tierProgress.toFixed(1)}%
            </span>
            <span className="text-gray-600">
              {currentConfig.maxValue === Infinity ? '∞' : formatPowerLevel(currentConfig.maxValue)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <motion.div
              className={cn(
                "h-full rounded-full bg-gradient-to-r",
                currentConfig.color.replace('text-', 'from-').replace('-600', '-400'),
                currentConfig.color.replace('text-', 'to-').replace('-600', '-600')
              )}
              initial={{ width: 0 }}
              animate={{ width: `${tierProgress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-600 mb-3">
          {currentConfig.description}
        </p>

        {/* Portfolio Value */}
        {portfolioValue && (
          <div className="flex items-center justify-between text-xs border-t pt-2">
            <span className="text-gray-600">Portfolio Value:</span>
            <span className="font-semibold text-gray-800">
              ${portfolioValue.toLocaleString()}
            </span>
          </div>
        )}

        {/* Breakdown */}
        {showBreakdown && (
          <div className="border-t pt-3 mt-3 space-y-2">
            <h4 className="text-xs font-medium text-gray-700">Power Breakdown:</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Base:</span>
                <span>{Math.floor(powerLevel * 0.4).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Portfolio:</span>
                <span>{Math.floor(powerLevel * 0.3).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Performance:</span>
                <span>{Math.floor(powerLevel * 0.2).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Bonus:</span>
                <span>{Math.floor(powerLevel * 0.1).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Next Tier Preview */}
        {currentConfig.level < POWER_LEVEL_CONFIGS.length && (
          <div className="border-t pt-3 mt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Next Tier:</span>
              <div className="flex items-center gap-1">
                <span className="text-gray-800 font-medium">
                  {POWER_LEVEL_CONFIGS[currentConfig.level]?.tier ?? 'Unknown'}
                </span>
                <span className="text-2xl">
                  {POWER_LEVEL_CONFIGS[currentConfig.level]?.emoji ?? '🔥'}
                </span>
              </div>
            </div>
            <div className="mt-1">
              <span className="text-xs text-gray-500">
                Need {formatPowerLevel(Math.max(0, currentConfig.maxValue - powerLevel))} more power
              </span>
            </div>
          </div>
        )}

        {/* Special Effects for High Tiers */}
        {currentConfig.level >= 6 && (
          <motion.div
            className="absolute top-2 right-2 text-yellow-400"
            animate={{ rotate: 360, scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Star className="h-4 w-4" />
          </motion.div>
        )}

        {currentConfig.level >= 7 && (
          <motion.div
            className="absolute top-2 left-2 text-purple-400"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Crown className="h-4 w-4" />
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}