'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, BookOpen, Zap, TrendingUp } from 'lucide-react'
import { StormBackground } from '../effects/StormBackground'
import { LightningEffect } from '../effects/LightningEffect'
import { PowerLevelCounter } from './PowerLevelCounter'
import { DragonRenderer } from '../dragon/DragonRenderer'
import { cn } from '@/lib/utils'

interface EnhancedHeroSectionProps {
  onNavigate?: (path: string) => void
  showPowerLevel?: boolean
  powerValue?: number
  enableAnimations?: boolean
  customTaglines?: string[]
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const DEFAULT_TAGLINES = [
  "Grant your wildest Sei investing wishes",
  "Unleash your DeFi Saiyan power", 
  "Master the art of yield fusion",
  "Become the legendary portfolio warrior",
  "Ascend to Super Saiyan trading level",
  "Channel your inner financial warrior"
]

const FLOATING_INDICATORS = [
  { icon: Zap, label: "Power", delay: 0 },
  { icon: TrendingUp, label: "Growth", delay: 0.5 },
  { icon: Sparkles, label: "Magic", delay: 1 }
]

export const EnhancedHeroSection: React.FC<EnhancedHeroSectionProps> = ({
  onNavigate,
  showPowerLevel = true,
  powerValue = 42000,
  enableAnimations = true,
  customTaglines = DEFAULT_TAGLINES,
  size = 'lg',
  className = ''
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [currentTaglineIndex, setCurrentTaglineIndex] = useState(0)
  const [powerLevelVisible, setPowerLevelVisible] = useState(false)
  const [triggerLightning, setTriggerLightning] = useState(false)
  const [isLightningActive, setIsLightningActive] = useState(false)
  const [showScreenFlash, setShowScreenFlash] = useState(false)
  const [showAtmosphericFlash, setShowAtmosphericFlash] = useState(false)

  const sizeClasses = {
    sm: { title: 'text-4xl sm:text-6xl', subtitle: 'text-lg', spacing: 'mb-8' },
    md: { title: 'text-6xl sm:text-7xl', subtitle: 'text-xl', spacing: 'mb-12' },
    lg: { title: 'text-8xl', subtitle: 'text-2xl', spacing: 'mb-16' },
    xl: { title: 'text-9xl', subtitle: 'text-3xl', spacing: 'mb-20' }
  }

  const currentSizeClasses = sizeClasses[size]

  // Initialize loading animations
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true)
    }, 200)

    return () => clearTimeout(timer)
  }, [])

  // Show power level after main title loads
  useEffect(() => {
    if (isLoaded && showPowerLevel) {
      const timer = setTimeout(() => {
        setPowerLevelVisible(true)
      }, 800)

      return () => clearTimeout(timer)
    }
    return undefined
  }, [isLoaded, showPowerLevel])

  // Rotate taglines
  useEffect(() => {
    if (!enableAnimations || customTaglines.length <= 1) return undefined

    const interval = setInterval(() => {
      setCurrentTaglineIndex(prev => (prev + 1) % customTaglines.length)
    }, 3000)

    return () => clearInterval(interval)
  }, [enableAnimations, customTaglines.length])

  const handleNavigation = useCallback((path: string) => {
    if (onNavigate) {
      try {
        onNavigate(path)
      } catch (error) {
        console.error(`Navigation error:`, error)
      }
    }
  }, [onNavigate])

  // Lightning effect callbacks
  const handleTriggerLightning = useCallback(() => {
    if (enableAnimations) {
      setTriggerLightning(true)
      // Trigger atmospheric flash for button interactions
      setShowAtmosphericFlash(true)
      setTimeout(() => setShowAtmosphericFlash(false), 300)
    }
  }, [enableAnimations])

  const handleLightningComplete = useCallback(() => {
    setTriggerLightning(false)
  }, [])

  const handleLightningStrike = useCallback((isActive: boolean) => {
    setIsLightningActive(isActive)
    
    if (isActive && enableAnimations) {
      // Trigger coordinated screen flash
      setShowScreenFlash(true)
      setTimeout(() => setShowScreenFlash(false), 150)
    }
  }, [enableAnimations])

  const currentTagline = useMemo(() => {
    return customTaglines[currentTaglineIndex] || customTaglines[0]
  }, [customTaglines, currentTaglineIndex])

  return (
    <StormBackground 
      className={cn("min-h-screen", className)}
      intensity={0.8}
      animated={enableAnimations}
      isLightningActive={isLightningActive}
      lightningIntensity={0.4}
    >
      {/* Gigantic GLB Dragon Background */}
      <div className="absolute inset-0 z-10">
        <DragonRenderer
          size="gigantic"
          enableAnimations={enableAnimations}
          enableProgressiveLoading={true}
          lowQualityModel="/models/seiron_optimized.glb"
          highQualityModel="/models/seiron.glb"
          className="w-full h-full"
        />
      </div>

      {/* Lightning Effects Layer */}
      <LightningEffect
        className="z-40"
        frequency="medium"
        intensity="intense"
        enabled={enableAnimations}
        triggerLightning={triggerLightning}
        onTriggerComplete={handleLightningComplete}
        onLightningStrike={handleLightningStrike}
      />

      {/* Main Content */}
      <div className="relative z-50 flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-4xl">
          
          {/* Power Level Counter - Positioned above title */}
          <AnimatePresence>
            {showPowerLevel && powerLevelVisible && (
              <motion.div
                initial={{ opacity: 0, y: -30, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -30, scale: 0.8 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="mb-8"
              >
                <PowerLevelCounter
                  targetValue={powerValue}
                  label="Seiron Power Level"
                  animated={enableAnimations}
                  showAura={true}
                  size={size === 'xl' ? 'lg' : size === 'lg' ? 'md' : 'sm'}
                  className="storm-hover-glow"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mystical Power Title */}
          <h1 className={cn(
            "font-black mb-4 relative",
            "text-transparent bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text",
            "transition-all duration-1000 ease-out",
            currentSizeClasses.title,
            isLoaded ? 'storm-power-manifestation' : 'opacity-0 scale-0'
          )}>
            <span className="storm-mystical-aura">SEIRON</span>
          </h1>
          
          {/* Animated Rotating Subtitle */}
          <div className={cn(
            "font-light relative",
            currentSizeClasses.subtitle,
            currentSizeClasses.spacing,
            "text-yellow-400/90",
            "transition-all duration-1000 delay-500 ease-out",
            isLoaded ? 'storm-entrance-lightning' : 'opacity-0 translate-y-10'
          )}>
            <div className="relative min-h-[1.5em] flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.span
                  key={currentTaglineIndex}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="storm-hover-glow inline-block"
                >
                  {currentTagline}
                </motion.span>
              </AnimatePresence>
            </div>
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-60" />
          </div>

          {/* Floating Power Indicators */}
          {enableAnimations && (
            <div className="absolute inset-0 pointer-events-none">
              {FLOATING_INDICATORS.map((indicator, index) => (
                <motion.div
                  key={indicator.label}
                  className="absolute"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: isLoaded ? [0, 0.6, 0.3, 0.6, 0.3] : 0,
                    scale: isLoaded ? [0, 1.2, 1, 1.2, 1] : 0,
                    x: isLoaded ? [0, 10, -10, 5, 0] : 0,
                    y: isLoaded ? [0, -5, 5, -3, 0] : 0
                  }}
                  transition={{
                    duration: 4,
                    delay: 2 + indicator.delay,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  style={{
                    left: `${20 + index * 20}%`,
                    top: `${30 + index * 15}%`,
                  }}
                >
                  <div className="flex flex-col items-center space-y-1">
                    <div className="p-2 rounded-full bg-yellow-400/20 border border-yellow-400/50 backdrop-blur-sm">
                      <indicator.icon className="w-4 h-4 text-yellow-400" />
                    </div>
                    <span className="text-xs text-yellow-400/80 font-semibold">
                      {indicator.label}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Energy Particles */}
          {enableAnimations && isLoaded && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-yellow-400 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
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
                    delay: i * 0.3,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>
          )}
          
          {/* Enhanced Action Buttons */}
          <div className={cn(
            "transition-all duration-1000 delay-1000 ease-out",
            "relative z-[100]",
            isLoaded ? 'storm-entrance-dramatic' : 'opacity-0 translate-y-20'
          )}>
            <div className="flex gap-6 justify-center">
              <motion.button
                onClick={() => {
                  handleTriggerLightning()
                  handleNavigation('/chat')
                }}
                onMouseEnter={() => handleTriggerLightning()}
                className="
                  group relative overflow-hidden
                  px-10 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 
                  text-red-950 font-bold rounded-lg
                  storm-summon-enhanced storm-electrical-surge
                  border-2 border-yellow-400
                  shadow-lg shadow-yellow-500/50
                  opacity-100
                  cursor-pointer
                  pointer-events-auto
                  z-10
                  block
                "
                whileHover={enableAnimations ? { 
                  scale: 1.05,
                  y: -2
                } : {}}
                whileTap={enableAnimations ? { 
                  scale: 0.98,
                  y: 0
                } : {}}
                transition={enableAnimations ? {
                  type: "spring",
                  stiffness: 400,
                  damping: 10,
                  mass: 0.8
                } : {}}
              >
                <Sparkles className="inline mr-3 h-5 w-5 storm-breathing" />
                <span className="relative z-10 text-lg font-extrabold tracking-wide">
                  SUMMON
                </span>
                {/* Enhanced electrical power aura with physics-based animation */}
                <motion.div
                  className="absolute inset-0 bg-gradient-radial from-blue-400/20 via-yellow-400/15 to-transparent rounded-lg blur-lg -z-10"
                  animate={enableAnimations ? {
                    scale: [1, 1.15, 1],
                    opacity: [0.3, 0.6, 0.3],
                    rotate: [0, 360]
                  } : {}}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    rotate: {
                      duration: 20,
                      repeat: Infinity,
                      ease: "linear"
                    }
                  }}
                />
                
                {/* Secondary electrical field */}
                <motion.div
                  className="absolute inset-0 bg-gradient-radial from-white/10 via-blue-300/20 to-transparent rounded-lg blur-md -z-20"
                  animate={enableAnimations ? {
                    scale: [1.1, 1, 1.1],
                    opacity: [0.2, 0.5, 0.2]
                  } : {}}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5
                  }}
                />
              </motion.button>
            
              <motion.button
                onClick={() => handleNavigation('/about')}
                className="
                  group relative overflow-hidden
                  px-10 py-4 bg-gradient-to-r from-slate-800 to-slate-900
                  text-yellow-400 font-bold rounded-lg
                  storm-hover-glow storm-hover-vortex
                  border-2 border-yellow-500
                  shadow-lg shadow-red-900/50
                  backdrop-blur-sm
                  transform transition-all duration-300
                  hover:bg-gradient-to-r hover:from-slate-700 hover:to-slate-800
                  hover:border-yellow-400
                  hover:shadow-xl hover:shadow-red-900/60
                  hover:scale-105
                  active:scale-95
                  opacity-100
                  cursor-pointer
                  pointer-events-auto
                  z-10
                  block
                "
                whileHover={enableAnimations ? { scale: 1.05 } : {}}
                whileTap={enableAnimations ? { scale: 0.95 } : {}}
              >
                <BookOpen className="inline mr-3 h-5 w-5 storm-power-pulse" />
                <span className="relative z-10 text-lg font-extrabold tracking-wide">
                  ABOUT
                </span>
                {/* Enhanced storm energy effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-500 pointer-events-none" />
                
                {/* Mystical aura effect */}
                <motion.div
                  className="absolute inset-0 bg-red-900/20 rounded-lg blur-md -z-10"
                  animate={enableAnimations ? {
                    scale: [1, 1.05, 1],
                    opacity: [0.1, 0.3, 0.1]
                  } : {}}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </motion.button>
            </div>
          </div>
        </div>
        
        {/* Enhanced Atmospheric Enhancement */}
        <motion.div 
          className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/60 via-red-950/20 to-transparent pointer-events-none"
          animate={enableAnimations ? {
            opacity: [0.6, 0.8, 0.6]
          } : {}}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Enhanced Screen Flash Coordination */}
      <div className={cn(
        "screen-flash-lightning",
        showScreenFlash && "active"
      )} />
      
      <div className={cn(
        "atmospheric-flash",
        showAtmosphericFlash && "button-triggered"
      )} />
    </StormBackground>
  )
}

export default EnhancedHeroSection