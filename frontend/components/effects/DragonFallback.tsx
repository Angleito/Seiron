'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface DragonFallbackProps {
  className?: string
  intensity?: number
  enableEyeTracking?: boolean
  lightningActive?: boolean
  loadingTimeout?: number
  onLoadError?: (error: Error) => void
  forceQuality?: 'low' | 'medium' | 'high' | 'auto'
  showPerformanceOverlay?: boolean
}

/**
 * Simple 2D dragon fallback component for when 3D fails to load
 */
export const DragonFallback: React.FC<DragonFallbackProps> = ({
  className = '',
  intensity = 0.6,
  enableEyeTracking,
  lightningActive,
  loadingTimeout,
  onLoadError,
  forceQuality,
  showPerformanceOverlay
}) => {
  return (
    <div className={`${className} flex items-center justify-center`}>
      <motion.div
        className="relative"
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.7, 1, 0.7]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* Dragon Emoji with glow effect */}
        <div className="relative">
          <div 
            className="text-8xl filter drop-shadow-2xl"
            style={{
              filter: `drop-shadow(0 0 ${20 * intensity}px rgba(255, 204, 0, 0.8))`
            }}
          >
            🐉
          </div>
          
          {/* Glowing aura */}
          <motion.div
            className="absolute inset-0 bg-gradient-radial from-yellow-400/30 via-red-500/20 to-transparent rounded-full blur-xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>
        
        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-yellow-400 rounded-full"
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + (i % 2) * 40}%`,
            }}
            animate={{
              y: [-10, -30, -10],
              x: [0, Math.random() * 20 - 10, 0],
              opacity: [0, 1, 0],
              scale: [0, 1, 0]
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeInOut"
            }}
          />
        ))}
      </motion.div>
    </div>
  )
}

export default DragonFallback