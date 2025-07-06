import React, { useMemo } from 'react'
import { cn } from '@lib/utils'

interface FogOverlayProps {
  className?: string
  density?: number // 0-1, default 0.3
  speed?: number // 0-3, default 1
  color?: string // hex color, default '#991b1b'
  opacity?: number // 0-1, default 0.15
  enableParallax?: boolean // default true
  particleCount?: number // default 6
  reducedMotion?: boolean // default false
}

export function FogOverlay({ 
  className,
  density = 0.3,
  speed = 1,
  color = '#991b1b',
  opacity = 0.15,
  enableParallax = true,
  particleCount = 6,
  reducedMotion = false
}: FogOverlayProps) {
  const fogLayers = useMemo(() => Array.from({ length: 3 }, (_, i) => i), [])
  const particles = useMemo(() => Array.from({ length: Math.max(0, particleCount) }, (_, i) => i), [particleCount])
  
  const effectiveSpeed = useMemo(() => reducedMotion ? 0 : speed, [reducedMotion, speed])
  const effectiveOpacity = useMemo(() => Math.max(0, Math.min(1, opacity)), [opacity])
  const effectiveDensity = useMemo(() => Math.max(0, Math.min(1, density)), [density])
  
  return (
    <div 
      className={cn(
        "absolute inset-0 overflow-hidden pointer-events-none z-10",
        reducedMotion && "reduced-motion",
        className
      )}
      style={{
        opacity: effectiveOpacity,
        willChange: reducedMotion ? 'auto' : 'opacity, transform'
      }}
    >
      {/* Main fog layers */}
      {fogLayers.map((layer) => (
        <div
          key={`fog-layer-${layer}`}
          className="absolute inset-0 w-full h-full"
          style={{
            transform: enableParallax && !reducedMotion ? `translateZ(${layer * 10}px)` : 'none',
            opacity: 1 - (layer * 0.3),
          }}
        >
          <svg 
            className="absolute w-full h-full" 
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            <defs>
              <linearGradient 
                id={`fogGradient-${layer}`} 
                x1="0%" 
                y1="0%" 
                x2="0%" 
                y2="100%"
              >
                <stop 
                  offset="0%" 
                  stopColor={color} 
                  stopOpacity={0.02 * effectiveDensity}
                />
                <stop 
                  offset="70%" 
                  stopColor={color} 
                  stopOpacity={0.1 * effectiveDensity}
                />
                <stop 
                  offset="100%" 
                  stopColor={color} 
                  stopOpacity={0.25 * effectiveDensity}
                />
              </linearGradient>
              
              <filter id={`blur-${layer}`}>
                <feGaussianBlur stdDeviation={2 + layer} result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Wispy fog shapes */}
            <path
              className={`fog-wisp-${layer}`}
              d="M0,80 Q20,60 40,70 T80,75 Q90,80 100,85 L100,100 L0,100 Z"
              fill={`url(#fogGradient-${layer})`}
              filter={`url(#blur-${layer})`}
            />
            
            <path
              className={`fog-wisp-reverse-${layer}`}
              d="M0,90 Q30,70 60,85 T100,80 L100,100 L0,100 Z"
              fill={`url(#fogGradient-${layer})`}
              filter={`url(#blur-${layer})`}
              opacity="0.6"
            />
          </svg>
        </div>
      ))}
      
      {/* Floating particles */}
      {particles.map((particle) => (
        <div
          key={`particle-${particle}`}
          className={`absolute particle-${particle}`}
          style={{
            width: `${2 + Math.random() * 4}px`,
            height: `${2 + Math.random() * 4}px`,
            backgroundColor: color,
            borderRadius: '50%',
            opacity: 0.1 * effectiveDensity,
            left: `${Math.random() * 100}%`,
            top: `${60 + Math.random() * 40}%`,
            filter: 'blur(1px)',
          }}
        />
      ))}
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fogDrift {
          0% { 
            transform: translateX(0) translateY(0) scale(1);
            opacity: 0.3;
          }
          33% { 
            transform: translateX(-10px) translateY(-2px) scale(1.02);
            opacity: 0.6;
          }
          66% { 
            transform: translateX(5px) translateY(2px) scale(0.98);
            opacity: 0.4;
          }
          100% { 
            transform: translateX(0) translateY(0) scale(1);
            opacity: 0.3;
          }
        }
        
        @keyframes fogDriftReverse {
          0% { 
            transform: translateX(0) translateY(0) scale(1);
            opacity: 0.2;
          }
          50% { 
            transform: translateX(15px) translateY(-3px) scale(1.05);
            opacity: 0.5;
          }
          100% { 
            transform: translateX(0) translateY(0) scale(1);
            opacity: 0.2;
          }
        }
        
        @keyframes particleFloat {
          0% { 
            transform: translateY(0) translateX(0);
            opacity: 0.1;
          }
          25% { 
            transform: translateY(-20px) translateX(5px);
            opacity: 0.3;
          }
          50% { 
            transform: translateY(-10px) translateX(-3px);
            opacity: 0.2;
          }
          75% { 
            transform: translateY(-30px) translateX(8px);
            opacity: 0.4;
          }
          100% { 
            transform: translateY(-50px) translateX(0);
            opacity: 0;
          }
        }
        
        .fog-wisp-0 {
          animation: ${effectiveSpeed > 0 ? `fogDrift ${15 / effectiveSpeed}s ease-in-out infinite` : 'none'};
        }
        
        .fog-wisp-1 {
          animation: ${effectiveSpeed > 0 ? `fogDrift ${20 / effectiveSpeed}s ease-in-out infinite ${-2 / effectiveSpeed}s` : 'none'};
        }
        
        .fog-wisp-2 {
          animation: ${effectiveSpeed > 0 ? `fogDrift ${25 / effectiveSpeed}s ease-in-out infinite ${-5 / effectiveSpeed}s` : 'none'};
        }
        
        .fog-wisp-reverse-0 {
          animation: ${effectiveSpeed > 0 ? `fogDriftReverse ${18 / effectiveSpeed}s ease-in-out infinite` : 'none'};
        }
        
        .fog-wisp-reverse-1 {
          animation: ${effectiveSpeed > 0 ? `fogDriftReverse ${22 / effectiveSpeed}s ease-in-out infinite ${-3 / effectiveSpeed}s` : 'none'};
        }
        
        .fog-wisp-reverse-2 {
          animation: ${effectiveSpeed > 0 ? `fogDriftReverse ${28 / effectiveSpeed}s ease-in-out infinite ${-7 / effectiveSpeed}s` : 'none'};
        }
        
        ${particles.map(i => `
          .particle-${i} {
            animation: ${effectiveSpeed > 0 ? `particleFloat ${8 + Math.random() * 4}s ease-out infinite ${Math.random() * 5}s` : 'none'};
          }
        `).join('')}
        
        ${enableParallax && !reducedMotion ? `
          @media (prefers-reduced-motion: no-preference) {
            .absolute.inset-0.w-full.h-full {
              transform-style: preserve-3d;
            }
          }
        ` : ''}
        
        /* Performance optimizations */
        .reduced-motion * {
          animation: none !important;
          transition: none !important;
        }
        
        @media (max-width: 768px) {
          .fog-overlay {
            will-change: auto;
          }
        }
      `}} />
    </div>
  )
}

export default FogOverlay