'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface SeironImageProps {
  className?: string
  variant?: 'watermark' | 'logo' | 'icon'
  opacity?: number
}

export function SeironImage({ 
  className, 
  variant = 'logo',
  opacity = 1
}: SeironImageProps) {
  
  const variantConfig = {
    watermark: {
      width: 400,
      height: 400,
      className: 'opacity-[0.03] pointer-events-none select-none'
    },
    logo: {
      width: 200,
      height: 200,
      className: ''
    },
    icon: {
      width: 50,
      height: 50,
      className: ''
    }
  }

  const config = variantConfig[variant]
  
  return (
    <div 
      className={cn(
        'relative',
        config.className,
        className
      )}
      style={{ opacity: variant === 'watermark' ? undefined : opacity }}
    >
      <img
        src="/seiron.png"
        alt="Seiron Dragon"
        width={config.width}
        height={config.height}
        className={cn(
          variant === 'watermark' && 'filter grayscale'
        )}
        loading={variant !== 'watermark' ? 'eager' : 'lazy'}
      />
    </div>
  )
}