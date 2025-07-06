'use client'

import React from 'react'
import { cn } from '@lib/utils'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'gradient' | 'glass'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

const cardVariants = {
  // Default uses neutral colors (60% rule)
  default: 'bg-gray-900 border border-gray-800',
  // Gradient variant with subtle neutral colors
  gradient: 'bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800',
  // Glass effect with neutral background
  glass: 'bg-gray-900/50 border border-gray-800/50 backdrop-blur-sm'
}

const cardPadding = {
  // Follows 8pt grid system
  none: '',
  sm: 'p-2',   // 8px
  md: 'p-4',   // 16px
  lg: 'p-6'    // 24px
}

export const Card = React.memo(function Card({
  variant = 'default',
  padding = 'md',
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-md shadow-sm transition-all duration-200',
        // Subtle hover state with accent color (10% rule)
        'hover:border-gray-700 hover:shadow-md',
        cardVariants[variant],
        cardPadding[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})