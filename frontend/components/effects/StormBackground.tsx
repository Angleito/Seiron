import React, { useEffect, useState, useCallback } from 'react'
import { cn } from '../../lib/utils'
import { DragonRenderer, VoiceAnimationState } from '../dragon/DragonRenderer'

interface StormBackgroundProps {
  className?: string
  intensity?: number // 0-1, controls overall storm intensity
  animated?: boolean // whether animations are enabled
  children?: React.ReactNode
}

interface ScrollState {
  scrollY: number
  scrollDirection: 'up' | 'down' | 'none'
}

// Custom hook for scroll tracking with performance optimization
const useScrollTracking = (enabled: boolean) => {
  const [scrollState, setScrollState] = useState<ScrollState>({
    scrollY: 0,
    scrollDirection: 'none'
  })

  useEffect(() => {
    if (!enabled) return

    let lastScrollY = 0
    let ticking = false

    const updateScrollState = () => {
      const scrollY = window.scrollY
      const direction = scrollY > lastScrollY ? 'down' : scrollY < lastScrollY ? 'up' : 'none'
      
      setScrollState({
        scrollY,
        scrollDirection: direction
      })
      
      lastScrollY = scrollY
      ticking = false
    }

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollState)
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [enabled])

  return scrollState
}

// Custom hook for reduced motion preference
const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  return prefersReducedMotion
}

export const StormBackground = React.memo<StormBackgroundProps>(({
  className,
  intensity = 0.6,
  animated = true,
  children
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const prefersReducedMotion = useReducedMotion()
  const shouldAnimate = animated && !prefersReducedMotion
  const scrollState = useScrollTracking(shouldAnimate)
  
  // Simple device detection
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [dragonError, setDragonError] = useState(false)
  
  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      setIsMobile(width < 768)
      setIsTablet(width >= 768 && width < 1024)
    }
    
    checkDevice()
    window.addEventListener('resize', checkDevice)
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  // Normalize intensity to 0-1 range
  const normalizedIntensity = Math.max(0, Math.min(1, intensity))

  // Loading state management
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 100) // Brief loading delay to prevent flash

    return () => clearTimeout(timer)
  }, [])

  // Parallax effect calculation
  const calculateParallaxOffset = useCallback((baseMultiplier: number) => {
    if (!shouldAnimate) return 0
    
    const scrollProgress = scrollState.scrollY * 0.1
    const parallaxStrength = normalizedIntensity * 0.5
    
    return scrollProgress * baseMultiplier * parallaxStrength
  }, [scrollState.scrollY, normalizedIntensity, shouldAnimate])

  if (isLoading) {
    return (
      <div className={cn(
        "absolute inset-0 bg-gradient-to-b from-slate-900 to-slate-800",
        className
      )}>
        {children}
      </div>
    )
  }

  // Debug logging
  useEffect(() => {
    console.log('🌩️ StormBackground mounted with:', {
      className,
      intensity,
      animated,
      isMobile,
      isTablet,
      shouldAnimate
    })
  }, [className, intensity, animated, isMobile, isTablet, shouldAnimate])

  return (
    <div 
      className={cn(
        "relative w-full h-full overflow-hidden",
        "bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900",
        className
      )}
      style={{
        // Ensure minimum dimensions
        minHeight: '500px',
        minWidth: '100%'
      }}
      role="presentation"
      aria-label="Storm background effect"
    >
      {/* Base atmospheric gradient */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-red-950/20 via-slate-900/80 to-slate-950/90"
        style={{ zIndex: 5 }}
      />
      
      {/* Dragon Head - Main focus element - using modern DragonRenderer */}
      <div 
        className="absolute" 
        style={{
          // Explicit positioning and sizing
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px',
          height: '600px',
          // Debug styling - removed for production
          // border: '3px solid blue',
          // backgroundColor: 'rgba(0, 0, 255, 0.1)',
          zIndex: 20
        }}
      >
        {!dragonError ? (
          <DragonRenderer
            className="w-full h-full"
            size="lg"
            dragonType="ascii"
            enableFallback={true}
            fallbackType="ascii"
            enableAnimations={shouldAnimate}
            voiceState={{
              isListening: false,
              isSpeaking: false,
              isProcessing: false,
              isIdle: true,
              volume: normalizedIntensity,
              emotion: 'calm'
            }}
            onError={(error, type) => {
              console.error(`Dragon ${type} error in StormBackground:`, error)
              setDragonError(true)
            }}
            onFallback={(fromType, toType) => {
              console.log(`Dragon fallback in StormBackground: ${fromType} → ${toType}`)
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-yellow-400">
            <div className="text-center">
              <div className="text-8xl mb-4">🐉</div>
              <div className="text-2xl font-bold">Dragon Loading...</div>
            </div>
          </div>
        )}
      </div>
      
      {/* Atmospheric enhancement overlay */}
      <div 
        className="absolute inset-0 bg-gradient-to-t from-transparent via-red-950/5 to-red-900/10 pointer-events-none"
        style={{ 
          zIndex: 60,
          transform: shouldAnimate ? `translateY(${calculateParallaxOffset(0.05)}px)` : 'none'
        }}
      />
      
      {/* Content container - Highest z-index for interactive elements like buttons */}
      <div 
        className="relative z-50 w-full h-full"
        style={{
          transform: shouldAnimate ? `translateY(${calculateParallaxOffset(-0.02)}px)` : 'none'
        }}
      >
        {children}
      </div>
      
      {/* Accessibility: Reduce motion styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media (prefers-reduced-motion: reduce) {
            .storm-background * {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          }
        `
      }} />
    </div>
  )
})

StormBackground.displayName = 'StormBackground'

export default StormBackground