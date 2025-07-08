'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronUp, Zap, Activity, TrendingUp } from 'lucide-react'
import { cn } from '../../lib/utils'
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor'

interface ScrollSection {
  id: string
  name: string
  powerLevel: number
  color: string
  aura: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

interface ScrollProgressIndicatorProps {
  sections?: ScrollSection[]
  className?: string
  showLabels?: boolean
  enableParticles?: boolean
  enableSounds?: boolean
  position?: 'right' | 'left'
  size?: 'sm' | 'md' | 'lg'
}

const DEFAULT_SECTIONS: ScrollSection[] = [
  {
    id: 'hero',
    name: 'Base Form',
    powerLevel: 1000,
    color: 'text-gray-400',
    aura: 'bg-gray-400/20',
    icon: Activity,
    description: 'Beginning your journey'
  },
  {
    id: 'features',
    name: 'Training',
    powerLevel: 25000,
    color: 'text-blue-400',
    aura: 'bg-blue-400/30',
    icon: TrendingUp,
    description: 'Discovering capabilities'
  },
  {
    id: 'capabilities',
    name: 'Power Up',
    powerLevel: 75000,
    color: 'text-yellow-400',
    aura: 'bg-yellow-400/40',
    icon: Zap,
    description: 'Unleashing potential'
  },
  {
    id: 'cta',
    name: 'Ultra Instinct',
    powerLevel: 150000,
    color: 'text-purple-400',
    aura: 'bg-purple-400/50',
    icon: ChevronUp,
    description: 'Achieving mastery'
  }
]

export const ScrollProgressIndicator: React.FC<ScrollProgressIndicatorProps> = ({
  sections = DEFAULT_SECTIONS,
  className = '',
  showLabels = true,
  enableParticles = true,
  enableSounds = false,
  position = 'right',
  size = 'md'
}) => {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [activeSection, setActiveSection] = useState(0)
  const [isCharging, setIsCharging] = useState(false)
  const [sectionProgress, setSectionProgress] = useState<number[]>(new Array(sections.length).fill(0))
  const [isVisible, setIsVisible] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver>()
  const lastScrollTimeRef = useRef(0)
  const chargingTimeoutRef = useRef<NodeJS.Timeout>()
  
  const { performanceScore, shouldReduceQuality } = usePerformanceMonitor({
    enabled: enableParticles,
    warningThreshold: { fps: 30 }
  })

  const sizeClasses = {
    sm: 'w-1 h-24',
    md: 'w-1.5 h-32',
    lg: 'w-2 h-40'
  }

  const labelSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  // Throttled scroll handler for performance
  const handleScroll = useCallback(() => {
    const now = Date.now()
    if (now - lastScrollTimeRef.current < 16) return // 60fps throttle
    lastScrollTimeRef.current = now

    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
    const currentScroll = window.scrollY
    const progress = Math.min(currentScroll / scrollHeight, 1)
    
    setScrollProgress(progress)
    
    // Trigger charging effect during scroll
    setIsCharging(true)
    
    if (chargingTimeoutRef.current) {
      clearTimeout(chargingTimeoutRef.current)
    }
    
    chargingTimeoutRef.current = setTimeout(() => {
      setIsCharging(false)
    }, 150)

    // Calculate section progress
    const newSectionProgress = sections.map((_, index) => {
      const sectionStart = index / sections.length
      const sectionEnd = (index + 1) / sections.length
      
      if (progress <= sectionStart) return 0
      if (progress >= sectionEnd) return 1
      
      return (progress - sectionStart) / (sectionEnd - sectionStart)
    })
    
    setSectionProgress(newSectionProgress)
    
    // Update active section
    const newActiveSection = Math.floor(progress * sections.length)
    if (newActiveSection !== activeSection && newActiveSection < sections.length) {
      setActiveSection(newActiveSection)
    }
  }, [sections.length, activeSection])

  // Set up scroll listener and intersection observer
  useEffect(() => {
    // Set up scroll listener
    const throttledScrollHandler = () => handleScroll()
    window.addEventListener('scroll', throttledScrollHandler, { passive: true })
    
    // Set up intersection observer for visibility
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry) {
          setIsVisible(entry.isIntersecting)
        }
      },
      { threshold: 0.1 }
    )
    
    if (containerRef.current) {
      observerRef.current.observe(containerRef.current)
    }
    
    // Initial calculation
    handleScroll()
    
    return () => {
      window.removeEventListener('scroll', throttledScrollHandler)
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
      if (chargingTimeoutRef.current) {
        clearTimeout(chargingTimeoutRef.current)
      }
    }
  }, [handleScroll])

  // Handle section click navigation
  const handleSectionClick = useCallback((sectionIndex: number) => {
    const section = sections[sectionIndex]
    if (section) {
      const sectionElement = document.getElementById(section.id)
      if (sectionElement) {
        sectionElement.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        })
      }
    }
  }, [sections])

  // Calculate current power level based on progress
  const currentPowerLevel = useMemo(() => {
    if (activeSection >= sections.length) {
      const lastSection = sections[sections.length - 1]
      return lastSection?.powerLevel || 0
    }
    
    const currentSection = sections[activeSection]
    const nextSection = sections[activeSection + 1]
    
    if (!currentSection) return 0
    if (!nextSection) return currentSection.powerLevel
    
    const sectionProg = sectionProgress[activeSection] || 0
    const powerDiff = nextSection.powerLevel - currentSection.powerLevel
    
    return Math.floor(currentSection.powerLevel + (powerDiff * sectionProg))
  }, [activeSection, sectionProgress, sections])

  const formatPowerLevel = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return value.toString()
  }

  if (!isVisible) return null

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, x: position === 'right' ? 100 : -100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: position === 'right' ? 100 : -100 }}
      className={cn(
        'fixed z-50 flex flex-col items-center space-y-4',
        position === 'right' ? 'right-4 lg:right-8' : 'left-4 lg:left-8',
        'top-1/2 -translate-y-1/2',
        'hidden md:flex', // Hide on mobile, show horizontal version instead
        className
      )}
    >
      {/* Power Level Display */}
      <motion.div
        className="flex flex-col items-center space-y-2 mb-4"
        animate={{
          scale: isCharging ? [1, 1.05, 1] : 1
        }}
        transition={{ duration: 0.3 }}
      >
        <div className={cn(
          'font-black tracking-tight',
          sections[activeSection]?.color || 'text-gray-400',
          labelSizeClasses[size]
        )}>
          {formatPowerLevel(currentPowerLevel)}
        </div>
        
        {showLabels && (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'text-xs font-semibold px-2 py-1 rounded-full',
                'bg-black/80 border',
                sections[activeSection]?.color.replace('text-', 'border-') || 'border-gray-400',
                sections[activeSection]?.color || 'text-gray-400'
              )}
            >
              {sections[activeSection]?.name || 'Base Form'}
            </motion.div>
          </AnimatePresence>
        )}
      </motion.div>

      {/* Power Meter Segments */}
      <div className="relative flex flex-col space-y-2">
        {/* Background Track */}
        <div className={cn(
          'absolute left-1/2 -translate-x-1/2 bg-gray-800/50 rounded-full',
          sizeClasses[size]
        )} />
        
        {/* Progress Segments */}
        {sections.map((section, index) => {
          const IconComponent = section.icon
          const isActive = index <= activeSection
          const progress = sectionProgress[index] || 0
          
          return (
            <motion.button
              key={section.id}
              onClick={() => handleSectionClick(index)}
              className={cn(
                'relative flex items-center justify-center',
                'hover:scale-110 transition-transform cursor-pointer',
                'focus:outline-none focus:ring-2 focus:ring-yellow-400/50 rounded-full'
              )}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Section Progress Bar */}
              <div className={cn(
                'relative rounded-full border-2',
                sizeClasses[size],
                isActive ? 'border-yellow-400' : 'border-gray-600'
              )}>
                {/* Progress Fill */}
                <motion.div
                  className={cn(
                    'absolute bottom-0 left-0 right-0 rounded-full',
                    isActive ? section.aura : 'bg-gray-600/30'
                  )}
                  initial={{ height: 0 }}
                  animate={{ height: `${progress * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
                
                {/* Charging Effect */}
                {isCharging && isActive && (
                  <motion.div
                    className={cn(
                      'absolute inset-0 rounded-full',
                      section.aura.replace('/20', '/40').replace('/30', '/60')
                    )}
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.3, 0.7, 0.3]
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                )}
              </div>
              
              {/* Section Icon */}
              <div className={cn(
                'absolute inset-0 flex items-center justify-center',
                isActive ? section.color : 'text-gray-500'
              )}>
                <IconComponent className="w-3 h-3" />
              </div>
              
              {/* Power Level Label */}
              {showLabels && (
                <motion.div
                  className={cn(
                    'absolute whitespace-nowrap text-xs font-semibold',
                    position === 'right' ? '-left-16' : '-right-16',
                    isActive ? section.color : 'text-gray-500'
                  )}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: index === activeSection ? 1 : 0.7 }}
                  transition={{ duration: 0.2 }}
                >
                  {formatPowerLevel(section.powerLevel)}
                </motion.div>
              )}
            </motion.button>
          )
        })}
        
        {/* Energy Particles */}
        {enableParticles && isCharging && !shouldReduceQuality && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-yellow-400 rounded-full"
                style={{
                  left: `${45 + Math.random() * 10}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [-10, -30, -10],
                  x: [0, Math.random() * 20 - 10, 0],
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Overall Progress Arc */}
      <motion.div
        className="relative w-8 h-8 mt-4"
        animate={{
          rotate: isCharging ? [0, 360] : 0
        }}
        transition={{
          duration: 2,
          repeat: isCharging ? Infinity : 0,
          ease: "linear"
        }}
      >
        <svg viewBox="0 0 32 32" className="w-full h-full">
          <circle
            cx="16"
            cy="16"
            r="14"
            fill="none"
            stroke="rgb(75, 85, 99)"
            strokeWidth="2"
            className="opacity-30"
          />
          <motion.circle
            cx="16"
            cy="16"
            r="14"
            fill="none"
            stroke="rgb(251, 191, 36)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 14}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 14 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 14 * (1 - scrollProgress) }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="drop-shadow-sm"
            style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }}
          />
        </svg>
      </motion.div>
    </motion.div>
  )
}

// Mobile Horizontal Version
export const ScrollProgressIndicatorMobile: React.FC<Omit<ScrollProgressIndicatorProps, 'position'>> = ({
  sections = DEFAULT_SECTIONS,
  className = '',
  showLabels = false,
  enableParticles = false,
  size = 'sm'
}) => {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [activeSection, setActiveSection] = useState(0)
  const [isCharging, setIsCharging] = useState(false)
  
  const lastScrollTimeRef = useRef(0)
  const chargingTimeoutRef = useRef<NodeJS.Timeout>()

  const handleScroll = useCallback(() => {
    const now = Date.now()
    if (now - lastScrollTimeRef.current < 16) return
    lastScrollTimeRef.current = now

    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
    const currentScroll = window.scrollY
    const progress = Math.min(currentScroll / scrollHeight, 1)
    
    setScrollProgress(progress)
    setActiveSection(Math.floor(progress * sections.length))
    
    setIsCharging(true)
    if (chargingTimeoutRef.current) {
      clearTimeout(chargingTimeoutRef.current)
    }
    chargingTimeoutRef.current = setTimeout(() => setIsCharging(false), 150)
  }, [sections.length])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (chargingTimeoutRef.current) {
        clearTimeout(chargingTimeoutRef.current)
      }
    }
  }, [handleScroll])

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'fixed bottom-4 left-4 right-4 z-50',
        'flex md:hidden items-center space-x-4',
        'bg-black/80 backdrop-blur-sm rounded-full px-4 py-2',
        'border border-gray-700',
        className
      )}
    >
      {/* Progress Bar */}
      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className={cn(
            'h-full rounded-full',
            sections[activeSection]?.aura || 'bg-gray-400'
          )}
          initial={{ width: 0 }}
          animate={{ width: `${scrollProgress * 100}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>
      
      {/* Current Section */}
      <div className={cn(
        'text-xs font-semibold',
        sections[activeSection]?.color || 'text-gray-400'
      )}>
        {sections[activeSection]?.name || 'Base Form'}
      </div>
      
      {/* Charging Indicator */}
      {isCharging && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="text-yellow-400"
        >
          <Zap className="w-4 h-4" />
        </motion.div>
      )}
    </motion.div>
  )
}

export default ScrollProgressIndicator