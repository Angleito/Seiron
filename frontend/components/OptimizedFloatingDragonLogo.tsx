
import { useEffect, useRef, useState } from 'react'
import { useAnimationPerformance, QUALITY_FEATURES } from '../hooks/useAnimationPerformance'

interface OptimizedFloatingDragonLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showDragonBalls?: boolean
  className?: string
  enablePerformanceMonitoring?: boolean
  onQualityChange?: (level: 'low' | 'medium' | 'high') => void
}

const sizeConfig = {
  sm: { width: 120, height: 120, containerSize: 'w-32 h-32' },
  md: { width: 200, height: 200, containerSize: 'w-52 h-52' },
  lg: { width: 300, height: 300, containerSize: 'w-80 h-80' },
  xl: { width: 400, height: 400, containerSize: 'w-96 h-96' }
}

export function OptimizedFloatingDragonLogo({ 
  size = 'lg', 
  showDragonBalls = true, 
  className = '',
  enablePerformanceMonitoring = true,
  onQualityChange
}: OptimizedFloatingDragonLogoProps) {
  const [isHovered, setIsHovered] = useState(false)
  const config = sizeConfig[size]
  const containerRef = useRef<HTMLDivElement>(null)
  
  const {
    qualityLevel,
    metrics,
    isMonitoring,
    shouldReduceMotion,
    startMonitoring,
    stopMonitoring
  } = useAnimationPerformance()
  
  const features = QUALITY_FEATURES[qualityLevel]
  
  // Notify parent of quality changes
  useEffect(() => {
    onQualityChange?.(qualityLevel)
  }, [qualityLevel, onQualityChange])
  
  // Start monitoring when component mounts and is visible
  useEffect(() => {
    if (!enablePerformanceMonitoring) return
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            startMonitoring()
          } else {
            stopMonitoring()
          }
        })
      },
      { threshold: 0.1 }
    )
    
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }
    
    return () => {
      observer.disconnect()
      stopMonitoring()
    }
  }, [enablePerformanceMonitoring, startMonitoring, stopMonitoring])
  
  // CSS classes for different quality levels
  const getAnimationClasses = () => {
    if (shouldReduceMotion) return ''
    
    const baseClasses = []
    
    if (features.dragonFloat) {
      baseClasses.push('animate-dragon-float')
    }
    
    return baseClasses.join(' ')
  }
  
  const getDragonBallClasses = () => {
    if (shouldReduceMotion) return ''
    
    return isHovered && features.complexPhysics 
      ? 'animate-dragon-balls-fast' 
      : 'animate-dragon-balls-orbit'
  }

  return (
    <div 
      ref={containerRef}
      className={`relative ${config.containerSize} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        // Enable GPU acceleration
        transform: 'translateZ(0)',
        willChange: features.complexPhysics ? 'transform' : 'auto',
        // Optimize paint and layout
        contain: 'layout style paint',
      }}
    >
      {/* Performance Monitor (Development Only) */}
      {import.meta.env.DEV && isMonitoring && (
        <div className="absolute -top-20 left-0 z-50 bg-black/80 text-white p-2 rounded text-xs font-mono">
          <div>FPS: {metrics.fps}</div>
          <div>Quality: {qualityLevel}</div>
          <div>Frame Time: {metrics.frameTime}ms</div>
        </div>
      )}
      
      {/* Mystical Aura - Only on medium/high quality */}
      {features.glowEffects && (
        <div 
          className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500/20 via-orange-500/20 to-yellow-500/20 blur-xl animate-dragon-pulse"
          style={{
            // Reduce paint area
            willChange: 'opacity',
            containIntrinsicSize: `${config.width}px ${config.height}px`,
          }}
        />
      )}
      
      {/* Dragon Balls Orbiting */}
      {showDragonBalls && features.dragonBallOrbit && (
        <div 
          className={`absolute inset-0 ${getDragonBallClasses()}`}
          style={{
            willChange: features.complexPhysics ? 'transform' : 'auto',
          }}
        >
          {[1, 2, 3, 4, 5, 6, 7].map((stars, index) => (
            <div
              key={stars}
              className={`absolute w-8 h-8 ${features.dragonBallFloat ? 'animate-dragon-ball-float' : ''}`}
              style={{
                transform: `rotate(${index * 51.43}deg) translateX(${config.width * 0.6}px) rotate(-${index * 51.43}deg)`,
                animationDelay: features.dragonBallFloat ? `${index * 0.2}s` : '0s',
                willChange: features.dragonBallFloat ? 'transform' : 'auto',
              }}
            >
              <div className={`
                w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full relative overflow-hidden
                ${features.shadowEffects ? 'shadow-lg' : ''}
              `}>
                {/* Star pattern - simplified for low quality */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-red-600 text-xs font-bold">
                    {qualityLevel === 'low' ? stars : '★'.repeat(stars)}
                  </div>
                </div>
                {/* Ball shine effect - only on medium/high */}
                {features.glowEffects && (
                  <div className="absolute top-1 left-1 w-3 h-3 bg-yellow-200 rounded-full opacity-70" />
                )}
              </div>
              
              {/* Trail effects - only on high quality */}
              {features.trailEffects && (
                <div 
                  className="absolute w-1 h-1 bg-yellow-400 rounded-full opacity-60 animate-trail"
                  style={{
                    transform: 'translateX(-20px)',
                    animationDelay: `${index * 0.1}s`
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Main Dragon Image */}
      <div className={`
        relative ${config.containerSize} 
        ${getAnimationClasses()}
        transition-transform duration-300 
        ${isHovered && !shouldReduceMotion ? 'scale-110' : 'scale-100'}
      `}
      style={{
        willChange: features.dragonFloat ? 'transform' : 'auto',
      }}>
        <img
          src="/images/seiron.png"
          alt="Seiron - The Wish-Granting Dragon"
          width={config.width}
          height={config.height}
          className={`object-contain ${features.shadowEffects ? 'filter drop-shadow-2xl' : ''}`}
          loading="eager"
        />
        
        {/* Dragon Glow Effect on Hover - only on high quality */}
        {isHovered && features.glowEffects && (
          <div className="absolute inset-0 bg-gradient-to-r from-red-400/30 via-orange-400/30 to-yellow-400/30 rounded-full blur-2xl animate-mystical-glow" />
        )}
      </div>

      {/* Floating Embers - only on medium/high quality */}
      {features.emberParticles && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(qualityLevel === 'high' ? 6 : 3)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-orange-400 rounded-full animate-ember-rise opacity-60"
              style={{
                left: `${20 + i * 15}%`,
                animationDelay: `${i * 0.8}s`,
                animationDuration: `${3 + i * 0.5}s`,
                willChange: 'transform, opacity',
              }}
            />
          ))}
        </div>
      )}

      {/* Power Aura Ring - only on high quality */}
      {features.powerRings && (
        <div 
          className="absolute inset-0 border-2 border-red-500/20 rounded-full animate-power-ring"
          style={{
            willChange: 'transform, opacity',
          }}
        />
      )}
    </div>
  )
}