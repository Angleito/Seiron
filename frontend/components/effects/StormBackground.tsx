import React, { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react'
import { cn } from '@/lib/utils'
import { StormCloud } from './StormCloud'
import { useStormPerformance, useLazyStormEffects } from '@/hooks/useStormPerformance'

// Lazy load heavy components
const LightningEffect = lazy(() => import('./LightningEffect'))
const FogOverlay = lazy(() => import('./FogOverlay'))
const DragonHead3D = lazy(() => import('./DragonHead3DOptimized'))

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
  const [isLightningActive, setIsLightningActive] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const shouldAnimate = animated && !prefersReducedMotion
  const scrollState = useScrollTracking(shouldAnimate)
  
  // Use performance hook to detect device capabilities
  const { isMobile, isTablet, config: perfConfig } = useStormPerformance()

  // Normalize intensity to 0-1 range
  const normalizedIntensity = Math.max(0, Math.min(1, intensity))

  // Calculate dynamic properties based on intensity and device
  const stormConfig = useMemo(() => {
    // Base configuration
    let baseConfig = {
      clouds: {
        opacity: 0.3 + (normalizedIntensity * 0.5),
        speed: normalizedIntensity < 0.3 ? 'slow' as const : normalizedIntensity < 0.7 ? 'medium' as const : 'fast' as const,
        layerCount: Math.ceil(2 + normalizedIntensity * 2) // 2-4 layers
      },
      lightning: {
        enabled: false, // Temporarily disabled for performance
        // enabled: normalizedIntensity > 0.2,
        frequency: normalizedIntensity < 0.4 ? 'low' as const : normalizedIntensity < 0.8 ? 'medium' as const : 'high' as const,
        intensity: normalizedIntensity < 0.3 ? 'subtle' as const : normalizedIntensity < 0.7 ? 'normal' as const : 'intense' as const,
        maxBolts: Math.ceil(1 + normalizedIntensity * 2) // 1-3 bolts
      },
      fog: {
        density: 0.2 + (normalizedIntensity * 0.6),
        speed: 0.5 + (normalizedIntensity * 1.5),
        opacity: 0.1 + (normalizedIntensity * 0.2),
        particleCount: Math.ceil(4 + normalizedIntensity * 8) // 4-12 particles
      },
      enableParallax: true
    }
    
    // Apply device-specific optimizations
    if (isMobile) {
      baseConfig.clouds.layerCount = Math.min(1, baseConfig.clouds.layerCount)
      baseConfig.clouds.speed = 'slow'
      baseConfig.fog.particleCount = Math.min(2, baseConfig.fog.particleCount)
      baseConfig.fog.opacity *= 0.5
      baseConfig.enableParallax = false
    } else if (isTablet) {
      baseConfig.clouds.layerCount = Math.min(2, baseConfig.clouds.layerCount)
      baseConfig.fog.particleCount = Math.min(4, baseConfig.fog.particleCount)
      baseConfig.fog.opacity *= 0.7
    }
    
    return baseConfig
  }, [normalizedIntensity, isMobile, isTablet])

  // Loading state management
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 100) // Brief loading delay to prevent flash

    return () => clearTimeout(timer)
  }, [])

  // Cloud layers with proper z-index ordering
  const cloudLayers = useMemo(() => {
    const layers = []
    const layerConfigs = ['background', 'midground', 'foreground'] as const
    
    for (let i = 0; i < Math.min(stormConfig.clouds.layerCount, 3); i++) {
      const layerType = layerConfigs[i]
      const baseZIndex = 10 + (i * 10)
      
      layers.push({
        key: `cloud-${layerType}`,
        type: layerType,
        zIndex: baseZIndex,
        opacity: stormConfig.clouds.opacity * (1 - i * 0.1),
        size: i === 0 ? 'large' as const : i === 1 ? 'medium' as const : 'small' as const
      })
    }
    
    return layers
  }, [stormConfig.clouds.layerCount, stormConfig.clouds.opacity])

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

  return (
    <div 
      className={cn(
        "relative w-full h-full overflow-hidden",
        "bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900",
        className
      )}
      role="presentation"
      aria-label="Storm background effect"
    >
      {/* Base atmospheric gradient */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-red-950/20 via-slate-900/80 to-slate-950/90"
        style={{ zIndex: 5 }}
      />
      
      {/* Storm cloud layers */}
      {cloudLayers.map((layer) => (
        <StormCloud
          key={layer.key}
          className="absolute inset-0"
          layer={layer.type}
          scrollY={shouldAnimate ? scrollState.scrollY : 0}
          opacity={layer.opacity}
          animationSpeed={stormConfig.clouds.speed}
          size={layer.size}
          enableParallax={shouldAnimate && stormConfig.enableParallax}
          reducedMotion={prefersReducedMotion}
        />
      ))}
      
      {/* Dragon Head - positioned behind fog but in front of clouds */}
      <Suspense fallback={null}>
        <DragonHead3D
          className="absolute inset-0"
          intensity={normalizedIntensity}
          enableEyeTracking={shouldAnimate}
          lightningActive={isLightningActive}
        />
      </Suspense>
      
      {/* Lightning effects - Temporarily disabled for performance */}
      {/* {stormConfig.lightning.enabled && (
        <Suspense fallback={null}>
          <LightningEffect
            className="absolute inset-0"
            frequency={stormConfig.lightning.frequency}
            intensity={stormConfig.lightning.intensity}
            enabled={shouldAnimate}
            reducedMotion={prefersReducedMotion}
            maxBolts={stormConfig.lightning.maxBolts}
            onLightningStrike={(isActive: boolean) => setIsLightningActive(isActive)}
          />
        </Suspense>
      )} */}
      
      {/* Fog overlay - Lazy loaded */}
      <Suspense fallback={null}>
        <FogOverlay
          className="absolute inset-0"
          density={stormConfig.fog.density}
          speed={shouldAnimate ? stormConfig.fog.speed : 0}
          opacity={stormConfig.fog.opacity}
          enableParallax={shouldAnimate && stormConfig.enableParallax}
          particleCount={shouldAnimate ? stormConfig.fog.particleCount : 0}
          reducedMotion={prefersReducedMotion}
        />
      </Suspense>
      
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
      
      {/* Z-Index Hierarchy Documentation:
          - Background gradient: z-5
          - Cloud layers: z-10-30 (StormCloud components)
          - Dragon Head 3D: no explicit z-index (between clouds and fog)
          - Lightning Effects: z-40-50 (LightningEffect SVG and flash)
          - Fog layers: z-10 (FogOverlay)
          - Atmospheric overlay: z-60
          - Content container: z-50 (buttons and interactive elements)
          - Homepage button container: z-[100] (highest priority)
       */}
      
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