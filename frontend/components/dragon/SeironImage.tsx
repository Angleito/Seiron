// Remove next/image import - using standard img tag for Vite
import { cn } from '@lib/utils'
import { motion } from 'framer-motion'

type SeironImageVariant = 'hero' | 'background' | 'corner' | 'watermark'

interface SeironImageProps {
  variant?: SeironImageVariant
  className?: string
  onClick?: () => void
  enableHoverEffects?: boolean
}

interface VariantConfig {
  width: number
  height: number
  containerClass: string
  imageClass: string
  opacity: string
  blendMode: string
  effects: {
    blur?: string
    glow?: boolean
    breathe?: boolean
    hover?: boolean
    mask?: boolean
  }
}

export function SeironImage({ 
  variant = 'hero', 
  className,
  onClick,
  enableHoverEffects = true
}: SeironImageProps) {
  const variantConfigs: Record<SeironImageVariant, VariantConfig> = {
    hero: {
      width: 800,
      height: 800,
      containerClass: 'w-full max-w-[800px] h-[600px] md:h-[800px]',
      imageClass: 'w-full h-full object-contain',
      opacity: 'opacity-100',
      blendMode: 'mix-blend-screen',
      effects: {
        glow: true,
        breathe: true,
        hover: true,
        mask: true
      }
    },
    background: {
      width: 1920,
      height: 1080,
      containerClass: 'fixed inset-0 w-full h-full',
      imageClass: 'w-full h-full object-cover',
      opacity: 'opacity-10 md:opacity-20',
      blendMode: 'mix-blend-screen',
      effects: {
        blur: 'blur-sm',
        mask: true
      }
    },
    corner: {
      width: 300,
      height: 300,
      containerClass: 'w-[150px] h-[150px] md:w-[200px] md:h-[200px] lg:w-[300px] lg:h-[300px]',
      imageClass: 'w-full h-full object-contain',
      opacity: 'opacity-70 hover:opacity-90',
      blendMode: 'mix-blend-screen',
      effects: {
        hover: true,
        glow: true
      }
    },
    watermark: {
      width: 200,
      height: 200,
      containerClass: 'w-[100px] h-[100px] md:w-[150px] md:h-[150px] lg:w-[200px] lg:h-[200px]',
      imageClass: 'w-full h-full object-contain',
      opacity: 'opacity-5 md:opacity-10',
      blendMode: 'mix-blend-screen',
      effects: {
        blur: 'blur-[2px]'
      }
    }
  }

  const config = variantConfigs[variant]
  const shouldAnimate = config.effects.breathe || (config.effects.hover && enableHoverEffects)

  return (
    <motion.div 
      className={cn(
        'relative group overflow-hidden',
        config.containerClass,
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      whileHover={shouldAnimate && config.effects.hover ? { scale: 1.05 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Radial gradient mask for edge fading */}
      {config.effects.mask && (
        <div 
          className={cn(
            'absolute inset-0 pointer-events-none z-20',
            variant === 'hero' && 'bg-gradient-radial from-transparent via-transparent to-black/50',
            variant === 'background' && 'bg-gradient-radial from-transparent via-transparent to-black/80',
            variant === 'corner' && 'bg-gradient-radial from-transparent to-black/30',
            variant === 'watermark' && 'bg-gradient-radial from-transparent to-black/40'
          )}
        />
      )}
      
      {/* Glow effect for certain variants */}
      {config.effects.glow && (
        <motion.div 
          className={cn(
            'absolute inset-0 pointer-events-none',
            variant === 'hero' && 'bg-gradient-radial from-orange-600/20 via-red-600/10 to-transparent blur-xl',
            variant === 'corner' && 'bg-gradient-radial from-orange-500/10 via-red-500/5 to-transparent blur-lg'
          )}
          animate={variant === 'hero' ? {
            opacity: [0.5, 1, 0.5],
            scale: [0.95, 1.05, 0.95]
          } : undefined}
          transition={{ 
            duration: 4, 
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      )}
      
      {/* Dragon image with variant-specific styling */}
      <div 
        className={cn(
          'relative w-full h-full',
          config.effects.breathe && 'animate-dragon-breathe',
          config.effects.blur,
          config.opacity,
          'transition-opacity duration-300'
        )}
      >
        <img
          src="/images/seiron.png"
          alt="Seiron - The Eternal Dragon"
          width={config.width}
          height={config.height}
          className={cn(config.imageClass, config.blendMode)}
          loading={variant === 'hero' ? 'eager' : 'lazy'}
        />
        
        {/* Fire effect overlay for interactive variants */}
        {(variant === 'hero' || variant === 'corner') && enableHoverEffects && (
          <motion.div 
            className="absolute inset-0 bg-gradient-to-t from-orange-600/40 via-red-600/20 to-transparent pointer-events-none"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </div>
      
      {/* Floating embers effect for hero variant */}
      {variant === 'hero' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={`ember-${i}`}
              className={cn(
                'absolute w-1 h-1 md:w-2 md:h-2 rounded-full',
                i % 3 === 0 ? 'bg-orange-400' : i % 3 === 1 ? 'bg-red-400' : 'bg-yellow-400'
              )}
              initial={{ 
                x: Math.random() * 100 + '%',
                y: '100%',
                opacity: 0 
              }}
              animate={{
                y: '-20%',
                opacity: [0, 1, 0.8, 0],
                x: `${Math.random() * 100}%`
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: i * 0.5,
                ease: 'easeOut'
              }}
            />
          ))}
        </div>
      )}
      
      {/* Hover indicator for corner variant */}
      {variant === 'corner' && enableHoverEffects && (
        <motion.div
          className="absolute bottom-2 right-2 w-2 h-2 bg-orange-500 rounded-full"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      )}
    </motion.div>
  )
}

export default SeironImage