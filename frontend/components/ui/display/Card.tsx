'use client'

import React from 'react'
import { cn } from '@lib/utils'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'gradient' | 'glass'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

const cardVariants = {
  default: 'bg-gray-900 border border-red-500/20',
  gradient: 'bg-gradient-to-br from-gray-900/50 to-black/50 border border-red-500/10',
  glass: 'bg-black/30 border border-red-500/5 backdrop-blur-sm'
}

const cardPadding = {
  none: '',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6'
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
        'rounded-lg',
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