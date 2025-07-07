'use client'
import { cn } from '@lib/utils'
import { useEffect, useState } from 'react'

interface SeironImageProps {
  className?: string
  variant?: 'watermark' | 'logo' | 'icon'
  opacity?: number
  enableMysticalEffects?: boolean
}

export function SeironImage({ 
  className, 
  variant = 'logo',
  opacity = 1,
  enableMysticalEffects = true
}: SeironImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  
  const variantConfig = {
    watermark: {
      width: 400,
      height: 400,
      className: 'pointer-events-none select-none',
      defaultOpacity: 0.03
    },
    logo: {
      width: 200,
      height: 200,
      className: '',
      defaultOpacity: 1
    },
    icon: {
      width: 50,
      height: 50,
      className: '',
      defaultOpacity: 1
    }
  }

  const config = variantConfig[variant]
  const finalOpacity = variant === 'watermark' ? config.defaultOpacity : opacity
  
  // Generate mystical glow animation for the dragon
  const getMysticalFilter = () => {
    if (!enableMysticalEffects) return ''
    
    switch (variant) {
      case 'watermark':
        return 'drop-shadow(0 0 20px rgba(255, 59, 48, 0.3)) drop-shadow(0 0 40px rgba(255, 215, 0, 0.2)) drop-shadow(0 0 60px rgba(139, 69, 255, 0.1))'
      case 'logo':
        return 'drop-shadow(0 0 10px rgba(255, 59, 48, 0.5)) drop-shadow(0 0 20px rgba(255, 215, 0, 0.3))'
      default:
        return 'drop-shadow(0 0 5px rgba(255, 59, 48, 0.4))'
    }
  }
  
  return (
    <div 
      className={cn(
        'relative group',
        config.className,
        className
      )}
      style={{ opacity: finalOpacity }}
    >
      {/* Mystical energy aura around the dragon */}
      {enableMysticalEffects && variant === 'watermark' && (
        <>
          {/* Dragon energy ripples */}
          <div className="absolute inset-0 scale-110 animate-pulse opacity-30">
            <div className="absolute inset-0 bg-gradient-radial from-red-400/20 via-gold-400/10 to-transparent blur-xl" />
          </div>
          
          {/* Floating dragon balls effect */}
          <div className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-br from-gold-400 to-gold-600 rounded-full blur-sm animate-cosmic-float opacity-20" 
               style={{ animationDelay: '0s', animationDuration: '6s' }} />
          <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-gradient-to-br from-red-400 to-red-600 rounded-full blur-sm animate-cosmic-float opacity-20" 
               style={{ animationDelay: '2s', animationDuration: '8s' }} />
          <div className="absolute top-1/2 -right-8 w-5 h-5 bg-gradient-to-br from-cosmic-purple-400 to-cosmic-purple-600 rounded-full blur-sm animate-cosmic-float opacity-20" 
               style={{ animationDelay: '4s', animationDuration: '7s' }} />
        </>
      )}
      
      {/* Main dragon image with mystical effects */}
      <img
        src="/images/seiron.png"
        alt="Seiron Dragon"
        width={config.width}
        height={config.height}
        onLoad={() => setIsLoaded(true)}
        className={cn(
          'transition-all duration-1000',
          variant === 'watermark' && 'mix-blend-luminosity',
          isLoaded ? 'opacity-100' : 'opacity-0',
          enableMysticalEffects && 'animate-dragon-breathe'
        )}
        style={{
          filter: getMysticalFilter(),
          transform: variant === 'watermark' ? 'rotate(-5deg)' : undefined
        }}
        loading={variant !== 'watermark' ? 'eager' : 'lazy'}
      />
      
      {/* Dragon fire glow effect */}
      {enableMysticalEffects && variant !== 'icon' && (
        <div className="absolute inset-0 pointer-events-none">
          <div 
            className="absolute bottom-1/4 left-1/4 w-1/2 h-1/2 bg-gradient-radial from-red-400/20 to-transparent blur-2xl animate-mystical-glow"
            style={{ animationDelay: '1s' }}
          />
        </div>
      )}
    </div>
  )
}