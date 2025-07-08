'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, TrendingUp, Activity } from 'lucide-react'
import { cn } from '@lib/utils'

interface PowerLevelCounterProps {
  targetValue?: number
  label?: string
  animated?: boolean
  showAura?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onLevelChange?: (level: number) => void
}

const POWER_LEVELS = [
  { threshold: 0, name: 'Earthling', color: 'text-gray-400', aura: 'bg-gray-400/20' },
  { threshold: 1000, name: 'Fighter', color: 'text-blue-400', aura: 'bg-blue-400/20' },
  { threshold: 10000, name: 'Elite', color: 'text-green-400', aura: 'bg-green-400/20' },
  { threshold: 50000, name: 'Super Saiyan', color: 'text-yellow-400', aura: 'bg-yellow-400/30' },
  { threshold: 100000, name: 'Legendary', color: 'text-orange-400', aura: 'bg-orange-400/30' },
  { threshold: 500000, name: 'God Tier', color: 'text-red-400', aura: 'bg-red-400/40' },
]

export const PowerLevelCounter: React.FC<PowerLevelCounterProps> = ({
  targetValue = 42000,
  label = "Portfolio Power Level",
  animated = true,
  showAura = true,
  size = 'lg',
  className = '',
  onLevelChange
}) => {
  const [currentValue, setCurrentValue] = useState(0)
  const [isCharging, setIsCharging] = useState(false)

  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl xl:text-7xl'
  }

  const currentLevel = useMemo(() => {
    const level = POWER_LEVELS.reduceRight((acc, level) => 
      currentValue >= level.threshold ? level : acc
    , POWER_LEVELS[0])
    return level
  }, [currentValue])

  useEffect(() => {
    if (!animated) {
      setCurrentValue(targetValue)
      return
    }

    setIsCharging(true)
    const duration = 3000 // 3 seconds animation
    const steps = 60
    const increment = targetValue / steps
    let step = 0

    const timer = setInterval(() => {
      step++
      const newValue = Math.min(step * increment, targetValue)
      setCurrentValue(Math.floor(newValue))
      
      if (step >= steps) {
        clearInterval(timer)
        setIsCharging(false)
        setCurrentValue(targetValue)
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [targetValue, animated])

  useEffect(() => {
    if (onLevelChange) {
      onLevelChange(currentValue)
    }
  }, [currentValue, onLevelChange])

  const formatPowerLevel = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return value.toString()
  }

  return (
    <div className={cn("relative flex flex-col items-center space-y-4", className)}>
      {/* Power Level Label */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="flex items-center space-x-2"
      >
        <Activity className="w-5 h-5 text-yellow-400" />
        <span className="text-yellow-400/90 font-semibold tracking-wide">
          {label}
        </span>
      </motion.div>

      {/* Main Power Level Display */}
      <div className="relative">
        {/* Aura Effect */}
        {showAura && (
          <motion.div
            className={cn(
              "absolute inset-0 rounded-lg blur-xl",
              currentLevel.aura
            )}
            animate={{
              scale: isCharging ? [1, 1.2, 1] : [1, 1.05, 1],
              opacity: isCharging ? [0.3, 0.7, 0.3] : [0.2, 0.4, 0.2]
            }}
            transition={{
              duration: isCharging ? 0.5 : 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}

        {/* Power Level Number */}
        <motion.div
          className={cn(
            "relative flex items-center justify-center font-black tracking-tight",
            sizeClasses[size],
            currentLevel.color,
            "storm-mystical-aura"
          )}
          animate={{
            scale: isCharging ? [1, 1.1, 1] : 1,
            textShadow: isCharging 
              ? ["0 0 10px currentColor", "0 0 30px currentColor", "0 0 10px currentColor"]
              : "0 0 20px currentColor"
          }}
          transition={{
            duration: 0.3,
            textShadow: { duration: 0.8, repeat: Infinity }
          }}
        >
          {formatPowerLevel(currentValue)}
          {isCharging && (
            <motion.span
              className="ml-2 text-yellow-400"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Zap className="w-8 h-8" />
            </motion.span>
          )}
        </motion.div>
      </div>

      {/* Power Level Tier */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentLevel.name}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.3 }}
          className="flex items-center space-x-2"
        >
          <div className={cn(
            "px-4 py-2 rounded-full font-semibold text-sm",
            "bg-gradient-to-r from-slate-800 to-slate-900",
            "border-2",
            currentLevel.color.replace('text-', 'border-'),
            "shadow-lg",
            currentLevel.aura
          )}>
            <TrendingUp className="inline w-4 h-4 mr-2" />
            {currentLevel.name}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Charging Animation */}
      {isCharging && (
        <motion.div
          className="absolute -inset-4 rounded-2xl border-2 border-yellow-400/50"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}

      {/* Energy Particles */}
      {isCharging && showAura && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-yellow-400 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [-20, -40, -20],
                opacity: [0, 1, 0],
                scale: [0, 1, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default PowerLevelCounter