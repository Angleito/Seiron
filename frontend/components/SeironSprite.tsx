// import React from 'react' // Not needed for modern React
import { cn } from '@lib/utils'

interface SeironSpriteProps {
  className?: string
  variant?: 'hero' | 'corner' | 'watermark' | 'logo' | 'icon'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animated?: boolean
}

export function SeironSprite({ 
  className, 
  variant = 'logo',
  size = 'md',
  animated = true
}: SeironSpriteProps) {
  
  const sizeConfig = {
    sm: 'w-12 h-12',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48'
  }

  const variantConfig = {
    hero: {
      className: 'opacity-100',
      size: 'xl' as const
    },
    corner: {
      className: 'opacity-80',
      size: 'lg' as const
    },
    watermark: {
      className: 'opacity-[0.03] pointer-events-none select-none grayscale',
      size: 'xl' as const
    },
    logo: {
      className: 'opacity-90',
      size: 'md' as const
    },
    icon: {
      className: 'opacity-100',
      size: 'sm' as const
    }
  }

  const config = variantConfig[variant]
  const finalSize = sizeConfig[size] || sizeConfig[config.size]
  
  return (
    <div 
      className={cn(
        'relative flex items-center justify-center',
        finalSize,
        config.className,
        animated && 'transition-all duration-300',
        className
      )}
    >
      {/* Simple dragon emoji placeholder */}
      <div className={cn(
        'text-6xl select-none',
        animated && 'hover:scale-110 transition-transform duration-300'
      )}>
        🐉
      </div>
      
      {/* Glow effect for non-watermark variants */}
      {variant !== 'watermark' && (
        <div className={cn(
          'absolute inset-0 rounded-full',
          'bg-gradient-to-r from-red-500/10 to-orange-500/10',
          animated && 'animate-pulse'
        )} />
      )}
    </div>
  )
}

export default SeironSprite