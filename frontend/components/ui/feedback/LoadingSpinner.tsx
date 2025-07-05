'use client'

import React from 'react'
import { cn } from '@lib/utils'

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'white' | 'red' | 'gray'
  className?: string
}

const sizeStyles = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8'
}

const colorStyles = {
  white: 'border-white border-t-transparent',
  red: 'border-red-400 border-t-transparent',
  gray: 'border-gray-400 border-t-transparent'
}

export const LoadingSpinner = React.memo(function LoadingSpinner({
  size = 'md',
  color = 'white',
  className
}: LoadingSpinnerProps) {
  return (
    <div className={cn(
      'animate-spin rounded-full border-2',
      sizeStyles[size],
      colorStyles[color],
      className
    )} />
  )
})