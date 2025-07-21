'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence, LazyMotion, domAnimation } from 'framer-motion'
import { Sparkles, BookOpen, Zap, TrendingUp } from 'lucide-react'
import { StormBackground } from '../effects/StormBackground'
import { LightningEffect } from '../effects/LightningEffect'
import { PowerLevelCounter } from './PowerLevelCounter'
import { DragonRenderer } from '../dragon/DragonRenderer'
import { cn } from '../../lib/utils'
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor'

interface EnhancedHeroSectionProps {
  onNavigate?: (path: string) => void
  showPowerLevel?: boolean
  powerValue?: number
  enableAnimations?: boolean
  customTaglines?: string[]
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  enableVoiceShortcuts?: boolean
  onVoiceCommand?: (command: string) => void
}

const DEFAULT_TAGLINES = [
  "Granting your wildest Sei investing wishes",
  "Master the art of DeFi with legendary powers",
  "Transform into the ultimate portfolio warrior",
  "Ready to power up your portfolio?",
  "Ascend to legendary Saiyan status",
  "Channel the legendary dragon's power"
]

const FLOATING_INDICATORS = [
  { icon: Zap, label: "Power", delay: 0 },
  { icon: TrendingUp, label: "Growth", delay: 0.5 },
  { icon: Sparkles, label: "Magic", delay: 1 }
]

export const EnhancedHeroSection: React.FC<EnhancedHeroSectionProps> = ({
  onNavigate,
  showPowerLevel = true,
  powerValue = 32200,
  enableAnimations = true,
  customTaglines = DEFAULT_TAGLINES,
  size = 'lg',
  className = '',
  enableVoiceShortcuts = true,
  onVoiceCommand
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [currentTaglineIndex, setCurrentTaglineIndex] = useState(0)
  const [powerLevelVisible, setPowerLevelVisible] = useState(false)
  const [triggerLightning, setTriggerLightning] = useState(false)
  const [isLightningActive, setIsLightningActive] = useState(false)
  const [showScreenFlash, setShowScreenFlash] = useState(false)
  const [showAtmosphericFlash, setShowAtmosphericFlash] = useState(false)
  const [voiceCommandActive, setVoiceCommandActive] = useState(false)
  
  // Performance monitoring
  const { shouldReduceQuality, shouldDisableAnimations, performanceScore } = usePerformanceMonitor({
    enabled: enableAnimations,
    warningThreshold: { fps: 30 }
  })
  
  // Dynamic animation state based on performance
  const optimizedAnimations = enableAnimations && !shouldDisableAnimations
  const particleCount = shouldReduceQuality ? 6 : 12

  const sizeClasses = {
    sm: { title: 'text-3xl sm:text-4xl md:text-6xl', subtitle: 'text-base sm:text-lg', spacing: 'mb-6 sm:mb-8' },
    md: { title: 'text-4xl sm:text-6xl md:text-7xl', subtitle: 'text-lg sm:text-xl', spacing: 'mb-8 sm:mb-12' },
    lg: { title: 'text-5xl sm:text-6xl md:text-7xl lg:text-8xl', subtitle: 'text-lg sm:text-xl md:text-2xl', spacing: 'mb-10 sm:mb-16' },
    xl: { title: 'text-6xl sm:text-7xl md:text-8xl lg:text-9xl', subtitle: 'text-xl sm:text-2xl md:text-3xl', spacing: 'mb-12 sm:mb-20' }
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

  // Voice command handler
  const handleVoiceCommand = useCallback((command: string) => {
    if (!enableVoiceShortcuts || !onVoiceCommand) return
    
    const lowerCommand = command.toLowerCase()
    setVoiceCommandActive(true)
    
    setTimeout(() => setVoiceCommandActive(false), 1000)
    
    if (lowerCommand.includes('summon') || lowerCommand.includes('chat')) {
      handleTriggerLightning()
      onVoiceCommand('chat')
      handleNavigation('/chat')
    } else if (lowerCommand.includes('about') || lowerCommand.includes('learn')) {
      onVoiceCommand('about')
      handleNavigation('/about')
    } else if (lowerCommand.includes('portfolio') || lowerCommand.includes('wallet')) {
      onVoiceCommand('portfolio')
      handleNavigation('/portfolio')
    }
  }, [enableVoiceShortcuts, onVoiceCommand, handleTriggerLightning, handleNavigation])

  // Voice shortcuts setup
  useEffect(() => {
    if (!enableVoiceShortcuts || typeof window === 'undefined') return
    
    const handleKeyPress = (e: KeyboardEvent) => {
      // Voice activation with 'V' key
      if (e.key.toLowerCase() === 'v' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        setVoiceCommandActive(!voiceCommandActive)
      }
      
      // Quick navigation shortcuts
      if (e.altKey) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault()
            handleNavigation('/chat')
            handleTriggerLightning()
            break
          case 'a':
            e.preventDefault()
            handleNavigation('/about')
            break
          case 'p':
            e.preventDefault()
            handleNavigation('/portfolio')
            break
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [enableVoiceShortcuts, voiceCommandActive, handleNavigation, handleTriggerLightning])

  return (
    <LazyMotion features={domAnimation}>
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
      <div className="relative z-50 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-4xl w-full">
          
          {/* Voice Command Indicator */}
          <AnimatePresence>
            {enableVoiceShortcuts && voiceCommandActive && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute top-4 right-4 z-[60] flex items-center space-x-2 bg-black/80 backdrop-blur-sm rounded-full px-4 py-2 border border-yellow-400/50"
              >
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                <span className="text-yellow-400 text-sm font-semibold">Voice Active</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Keyboard Shortcuts Hint */}
          <AnimatePresence>
            {enableVoiceShortcuts && isLoaded && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 0.7, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ delay: 3, duration: 0.5 }}
                className="absolute top-4 left-4 z-[60] text-xs text-yellow-400/70 bg-black/60 backdrop-blur-sm rounded px-3 py-2"
              >
                <div>Alt+S: Summon | Alt+A: About | Ctrl+V: Voice</div>
              </motion.div>
            )}
          </AnimatePresence>

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

          {/* Floating Power Indicators - Performance Optimized */}
          {optimizedAnimations && !shouldReduceQuality && (
            <div className="absolute inset-0 pointer-events-none hidden md:block">
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

          {/* Energy Particles - Performance Optimized */}
          {optimizedAnimations && isLoaded && !shouldReduceQuality && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(particleCount)].map((_, i) => (
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
                whileHover={optimizedAnimations ? { 
                  scale: 1.05,
                  y: -2
                } : {}}
                whileTap={optimizedAnimations ? { 
                  scale: 0.98,
                  y: 0
                } : {}}
                transition={optimizedAnimations ? {
                  type: "spring",
                  stiffness: 400,
                  damping: 10,
                  mass: 0.8
                } : {}}
              >
                <Sparkles className="inline mr-3 h-5 w-5 storm-breathing" />
                <span className="relative z-10 text-lg font-extrabold tracking-wide">
                  READY TO POWER UP?
                </span>
                {/* Enhanced electrical power aura with physics-based animation */}
                {!shouldReduceQuality && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-radial from-blue-400/20 via-yellow-400/15 to-transparent rounded-lg blur-lg -z-10"
                    animate={optimizedAnimations ? {
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
                )}
                
                {/* Secondary electrical field */}
                {!shouldReduceQuality && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-radial from-white/10 via-blue-300/20 to-transparent rounded-lg blur-md -z-20"
                    animate={optimizedAnimations ? {
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
                )}
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
                  focus:outline-none focus:ring-4 focus:ring-yellow-400/50
                "
                whileHover={optimizedAnimations ? { scale: 1.05 } : {}}
                whileTap={optimizedAnimations ? { scale: 0.95 } : {}}
                aria-label="Learn about Seiron platform"
                role="button"
              >
                <BookOpen className="inline mr-3 h-5 w-5 storm-power-pulse" />
                <span className="relative z-10 text-lg font-extrabold tracking-wide">
                  ABOUT
                </span>
                {/* Enhanced storm energy effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-500 pointer-events-none" />
                
                {/* Mystical aura effect */}
                {!shouldReduceQuality && (
                  <motion.div
                    className="absolute inset-0 bg-red-900/20 rounded-lg blur-md -z-10"
                    animate={optimizedAnimations ? {
                      scale: [1, 1.05, 1],
                      opacity: [0.1, 0.3, 0.1]
                    } : {}}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                )}
              </motion.button>
            </div>
          </div>
        </div>
        
        {/* Enhanced Atmospheric Enhancement */}
        <motion.div 
          className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/60 via-red-950/20 to-transparent pointer-events-none"
          animate={optimizedAnimations ? {
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
    </LazyMotion>
  )
}

export default EnhancedHeroSection