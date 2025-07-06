import React, { useMemo } from 'react'
import { cn } from '@lib/utils'

interface StormCloudProps {
  className?: string
  layer?: 'background' | 'midground' | 'foreground'
  scrollY?: number
  opacity?: number
  animationSpeed?: 'slow' | 'medium' | 'fast'
  size?: 'small' | 'medium' | 'large'
  enableParallax?: boolean
  reducedMotion?: boolean
}

export const StormCloud = React.memo<StormCloudProps>(({ 
  className, 
  layer = 'background',
  scrollY = 0,
  opacity = 0.8,
  animationSpeed = 'medium',
  size = 'medium',
  enableParallax = true,
  reducedMotion = false
}) => {
  const layerConfig = useMemo(() => ({
    background: { scale: 1.2, blur: reducedMotion ? 0 : 8, zIndex: 10 },
    midground: { scale: 1.5, blur: reducedMotion ? 0 : 4, zIndex: 20 },
    foreground: { scale: 2, blur: reducedMotion ? 0 : 2, zIndex: 30 }
  }), [reducedMotion])

  const sizeConfig = useMemo(() => ({
    small: { width: '60%', height: '40%' },
    medium: { width: '100%', height: '60%' },
    large: { width: '140%', height: '80%' }
  }), [])

  const speedConfig = useMemo(() => ({
    slow: reducedMotion ? 0 : 20,
    medium: reducedMotion ? 0 : 15,
    fast: reducedMotion ? 0 : 10
  }), [reducedMotion])

  const config = layerConfig[layer]
  const sizeStyle = sizeConfig[size]
  const duration = speedConfig[animationSpeed]

  // Apply parallax effect based on scroll with performance checks
  const parallaxOffset = useMemo(() => {
    if (!enableParallax || reducedMotion) return 0
    return scrollY * (config.scale * 0.1)
  }, [scrollY, config.scale, enableParallax, reducedMotion])

  return (
    <div 
      className={cn(
        "absolute inset-0 overflow-hidden pointer-events-none",
        className
      )}
      style={{
        zIndex: config.zIndex,
        transform: `translateY(${parallaxOffset}px)`,
        filter: `blur(${config.blur}px)`,
        opacity
      }}
    >
      <svg 
        className="absolute w-full h-full" 
        style={{
          width: sizeStyle.width,
          height: sizeStyle.height,
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) scale(${config.scale})`
        }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`stormGradient-${layer}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#450a0a" stopOpacity="0.9" />
            <stop offset="30%" stopColor="#991b1b" stopOpacity="0.7" />
            <stop offset="70%" stopColor="#b91c1c" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0.3" />
          </linearGradient>
          <filter id={`stormGlow-${layer}`}>
            <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Main cloud formations */}
        <path
          className={`animate-storm-drift-${animationSpeed}`}
          d="M0,120 Q100,80 200,120 Q300,160 400,120 Q500,80 600,120 Q700,160 800,120 L800,0 L0,0 Z"
          fill={`url(#stormGradient-${layer})`}
          filter={`url(#stormGlow-${layer})`}
        />
        <path
          className={`animate-storm-drift-reverse-${animationSpeed}`}
          d="M0,180 Q120,140 240,180 Q360,220 480,180 Q600,140 720,180 Q840,220 960,180 L960,0 L0,0 Z"
          fill={`url(#stormGradient-${layer})`}
          opacity="0.6"
        />
        <path
          className={`animate-storm-drift-${animationSpeed}`}
          d="M-200,100 Q-50,60 100,100 Q250,140 400,100 Q550,60 700,100 Q850,140 1000,100 L1000,0 L-200,0 Z"
          fill={`url(#stormGradient-${layer})`}
          opacity="0.4"
        />
      </svg>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes storm-drift-slow {
          0% { transform: translateX(0) scaleY(1); }
          33% { transform: translateX(-5%) scaleY(1.1); }
          66% { transform: translateX(5%) scaleY(0.9); }
          100% { transform: translateX(0) scaleY(1); }
        }
        @keyframes storm-drift-medium {
          0% { transform: translateX(0) scaleY(1); }
          33% { transform: translateX(-8%) scaleY(1.15); }
          66% { transform: translateX(8%) scaleY(0.85); }
          100% { transform: translateX(0) scaleY(1); }
        }
        @keyframes storm-drift-fast {
          0% { transform: translateX(0) scaleY(1); }
          33% { transform: translateX(-12%) scaleY(1.2); }
          66% { transform: translateX(12%) scaleY(0.8); }
          100% { transform: translateX(0) scaleY(1); }
        }
        @keyframes storm-drift-reverse-slow {
          0% { transform: translateX(0) scaleY(1); }
          33% { transform: translateX(5%) scaleY(0.9); }
          66% { transform: translateX(-5%) scaleY(1.1); }
          100% { transform: translateX(0) scaleY(1); }
        }
        @keyframes storm-drift-reverse-medium {
          0% { transform: translateX(0) scaleY(1); }
          33% { transform: translateX(8%) scaleY(0.85); }
          66% { transform: translateX(-8%) scaleY(1.15); }
          100% { transform: translateX(0) scaleY(1); }
        }
        @keyframes storm-drift-reverse-fast {
          0% { transform: translateX(0) scaleY(1); }
          33% { transform: translateX(12%) scaleY(0.8); }
          66% { transform: translateX(-12%) scaleY(1.2); }
          100% { transform: translateX(0) scaleY(1); }
        }
        .animate-storm-drift-slow {
          animation: ${duration > 0 ? `storm-drift-slow ${duration}s ease-in-out infinite` : 'none'};
        }
        .animate-storm-drift-medium {
          animation: ${duration > 0 ? `storm-drift-medium ${duration}s ease-in-out infinite` : 'none'};
        }
        .animate-storm-drift-fast {
          animation: ${duration > 0 ? `storm-drift-fast ${duration}s ease-in-out infinite` : 'none'};
        }
        .animate-storm-drift-reverse-slow {
          animation: ${duration > 0 ? `storm-drift-reverse-slow ${duration + 5}s ease-in-out infinite` : 'none'};
        }
        .animate-storm-drift-reverse-medium {
          animation: ${duration > 0 ? `storm-drift-reverse-medium ${duration + 3}s ease-in-out infinite` : 'none'};
        }
        .animate-storm-drift-reverse-fast {
          animation: ${duration > 0 ? `storm-drift-reverse-fast ${duration + 2}s ease-in-out infinite` : 'none'};
        }
        
        /* Performance optimizations */
        .storm-cloud-optimized {
          will-change: transform;
          transform: translateZ(0);
        }
        
        @media (max-width: 768px) {
          .storm-cloud-optimized {
            will-change: auto;
          }
        }
      `}} />
    </div>
  )
})

StormCloud.displayName = 'StormCloud'

export default StormCloud