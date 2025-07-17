'use client'

import React, { useEffect, useState, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@lib/utils'

export interface VoiceIndicatorProps {
  /** Whether voice is currently being detected */
  isActive: boolean
  /** Current audio level (0-1) */
  audioLevel?: number
  /** Type of activity - affects visualization style */
  activityType: 'listening' | 'speaking' | 'processing' | 'idle'
  /** Visual style variant */
  variant?: 'bars' | 'waveform' | 'circular' | 'minimal'
  /** Size of the indicator */
  size?: 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  className?: string
  /** Whether to show activity level text */
  showLevel?: boolean
  /** Color theme */
  theme?: 'blue' | 'orange' | 'purple' | 'green'
}

interface BarData {
  id: number
  height: number
  delay: number
}

export const VoiceIndicator = React.memo(function VoiceIndicator({
  isActive,
  audioLevel = 0,
  activityType,
  variant = 'bars',
  size = 'md',
  className = '',
  showLevel = false,
  theme = 'blue'
}: VoiceIndicatorProps) {
  const [bars, setBars] = useState<BarData[]>([])
  const [waveformData, setWaveformData] = useState<number[]>([])
  const animationRef = useRef<number>()

  // Configuration based on size
  const sizeConfig = useMemo(() => {
    switch (size) {
      case 'sm':
        return { barCount: 5, maxHeight: 20, width: 60, spacing: 2 }
      case 'lg':
        return { barCount: 12, maxHeight: 60, width: 140, spacing: 3 }
      default:
        return { barCount: 8, maxHeight: 40, width: 100, spacing: 2.5 }
    }
  }, [size])

  // Theme colors
  const themeConfig = useMemo(() => {
    switch (theme) {
      case 'orange':
        return {
          primary: 'bg-orange-500',
          secondary: 'bg-orange-600',
          glow: 'shadow-orange-500/50',
          text: 'text-orange-400'
        }
      case 'purple':
        return {
          primary: 'bg-purple-500',
          secondary: 'bg-purple-600',
          glow: 'shadow-purple-500/50',
          text: 'text-purple-400'
        }
      case 'green':
        return {
          primary: 'bg-green-500',
          secondary: 'bg-green-600',
          glow: 'shadow-green-500/50',
          text: 'text-green-400'
        }
      default:
        return {
          primary: 'bg-blue-500',
          secondary: 'bg-blue-600',
          glow: 'shadow-blue-500/50',
          text: 'text-blue-400'
        }
    }
  }, [theme])

  // Initialize bars
  useEffect(() => {
    const initialBars: BarData[] = Array.from({ length: sizeConfig.barCount }, (_, i) => ({
      id: i,
      height: Math.random() * 0.3 + 0.1, // Start with low random heights
      delay: i * 0.1
    }))
    setBars(initialBars)

    // Initialize waveform data
    setWaveformData(Array(50).fill(0))
  }, [sizeConfig.barCount])

  // Animate bars and waveform
  useEffect(() => {
    if (!isActive) {
      // Gradually reduce to baseline when inactive
      setBars(prev => prev.map(bar => ({
        ...bar,
        height: Math.max(0.1, bar.height * 0.9)
      })))
      setWaveformData(prev => prev.map(val => val * 0.95))
      return
    }

    const animate = () => {
      setBars(prev => prev.map(bar => {
        let targetHeight = 0.1
        
        switch (activityType) {
          case 'listening':
            // Responsive to audio input
            targetHeight = Math.random() * audioLevel * 0.8 + audioLevel * 0.2 + 0.1
            break
          case 'speaking':
            // Steady rhythmic pattern
            targetHeight = Math.sin(Date.now() * 0.01 + bar.id) * 0.4 + 0.5
            break
          case 'processing':
            // Wave-like pattern
            targetHeight = Math.sin(Date.now() * 0.005 + bar.id * 0.5) * 0.3 + 0.4
            break
          default:
            targetHeight = 0.1
        }

        return {
          ...bar,
          height: bar.height + (targetHeight - bar.height) * 0.3
        }
      }))

      // Update waveform data
      setWaveformData(prev => {
        const newData = [...prev]
        newData.shift()
        
        let newValue = 0
        switch (activityType) {
          case 'listening':
            newValue = audioLevel * (0.5 + Math.random() * 0.5)
            break
          case 'speaking':
            newValue = Math.sin(Date.now() * 0.01) * 0.5 + 0.5
            break
          case 'processing':
            newValue = Math.sin(Date.now() * 0.008) * 0.3 + 0.3
            break
        }
        
        newData.push(newValue)
        return newData
      })

      if (isActive) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isActive, audioLevel, activityType])

  // Cleanup animation frame
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const renderBars = () => (
    <div 
      className="flex items-end justify-center gap-1" 
      style={{ width: sizeConfig.width }}
    >
      {bars.map((bar) => (
        <motion.div
          key={bar.id}
          className={cn(
            'rounded-full transition-all duration-100',
            themeConfig.primary,
            isActive && themeConfig.glow
          )}
          style={{
            width: sizeConfig.spacing * 2,
            height: `${Math.max(4, bar.height * sizeConfig.maxHeight)}px`,
          }}
          animate={{
            scaleY: isActive ? 1 : 0.2,
            opacity: isActive ? 1 : 0.3
          }}
          transition={{
            duration: 0.1,
            delay: bar.delay * 0.05
          }}
        />
      ))}
    </div>
  )

  const renderWaveform = () => (
    <div className="relative" style={{ width: sizeConfig.width, height: sizeConfig.maxHeight }}>
      <svg 
        width="100%" 
        height="100%" 
        className="overflow-visible"
      >
        <motion.path
          d={`M 0 ${sizeConfig.maxHeight / 2} ${waveformData
            .map((value, i) => 
              `L ${(i / (waveformData.length - 1)) * sizeConfig.width} ${
                sizeConfig.maxHeight / 2 - (value * sizeConfig.maxHeight / 2 - sizeConfig.maxHeight / 4)
              }`
            )
            .join(' ')}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className={cn(themeConfig.text, isActive && 'drop-shadow-glow')}
          animate={{
            opacity: isActive ? 1 : 0.3,
            pathLength: isActive ? 1 : 0.5
          }}
        />
      </svg>
    </div>
  )

  const renderCircular = () => {
    const radius = sizeConfig.maxHeight / 2 - 4
    const circumference = 2 * Math.PI * radius
    const averageLevel = bars.reduce((sum, bar) => sum + bar.height, 0) / bars.length
    
    return (
      <div className="relative" style={{ width: sizeConfig.maxHeight, height: sizeConfig.maxHeight }}>
        <motion.div
          className={cn(
            'absolute inset-0 rounded-full border-4',
            'transition-all duration-200',
            isActive ? themeConfig.primary.replace('bg-', 'border-') : 'border-gray-600'
          )}
          animate={{
            scale: isActive ? 1 + averageLevel * 0.2 : 1,
            opacity: isActive ? 1 : 0.5
          }}
        />
        
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <motion.circle
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - averageLevel)}
            className={themeConfig.text}
            animate={{
              strokeDashoffset: isActive 
                ? circumference * (1 - averageLevel)
                : circumference * 0.9
            }}
            transition={{ duration: 0.3 }}
          />
        </svg>
        
        {/* Center indicator */}
        <motion.div
          className={cn(
            'absolute inset-4 rounded-full',
            themeConfig.primary,
            isActive && themeConfig.glow
          )}
          animate={{
            scale: isActive ? 1 + averageLevel * 0.3 : 0.5,
            opacity: isActive ? 0.8 : 0.2
          }}
        />
      </div>
    )
  }

  const renderMinimal = () => (
    <motion.div
      className={cn(
        'w-3 h-3 rounded-full',
        themeConfig.primary,
        isActive && themeConfig.glow
      )}
      animate={{
        scale: isActive ? [1, 1.5, 1] : 1,
        opacity: isActive ? 1 : 0.3
      }}
      transition={{
        scale: isActive ? {
          duration: 1,
          repeat: Infinity,
          ease: "easeInOut"
        } : { duration: 0.2 },
        opacity: { duration: 0.2 }
      }}
    />
  )

  const renderIndicator = () => {
    switch (variant) {
      case 'waveform':
        return renderWaveform()
      case 'circular':
        return renderCircular()
      case 'minimal':
        return renderMinimal()
      default:
        return renderBars()
    }
  }

  return (
    <div className={cn(
      'flex flex-col items-center space-y-2',
      className
    )}>
      <div className="flex items-center justify-center">
        {renderIndicator()}
      </div>
      
      <AnimatePresence>
        {showLevel && isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="text-center"
          >
            <div className={cn('text-xs font-medium', themeConfig.text)}>
              {Math.round(audioLevel * 100)}%
            </div>
            <div className="text-xs text-gray-500 capitalize">
              {activityType}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

export default VoiceIndicator