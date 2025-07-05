'use client'

import React from 'react'
import { cn } from '@lib/utils'
import { LucideIcon } from 'lucide-react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  icon?: LucideIcon
  iconPosition?: 'left' | 'right'
}

export const Input = React.memo(function Input({
  label,
  error,
  helperText,
  icon: Icon,
  iconPosition = 'left',
  className,
  ...props
}: InputProps) {
  const hasError = Boolean(error)

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-300">
          {label}
        </label>
      )}
      
      <div className="relative">
        {Icon && iconPosition === 'left' && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className={cn(
              'h-4 w-4',
              hasError ? 'text-red-400' : 'text-gray-400'
            )} />
          </div>
        )}
        
        <input
          className={cn(
            'w-full rounded-lg border bg-gray-900 text-red-100 px-3 py-2 focus:outline-none focus:ring-2 transition-colors',
            hasError 
              ? 'border-red-500 focus:ring-red-600' 
              : 'border-red-700 focus:ring-red-600',
            Icon && iconPosition === 'left' && 'pl-10',
            Icon && iconPosition === 'right' && 'pr-10',
            className
          )}
          {...props}
        />
        
        {Icon && iconPosition === 'right' && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Icon className={cn(
              'h-4 w-4',
              hasError ? 'text-red-400' : 'text-gray-400'
            )} />
          </div>
        )}
      </div>
      
      {(error || helperText) && (
        <p className={cn(
          'text-xs',
          hasError ? 'text-red-400' : 'text-gray-500'
        )}>
          {error || helperText}
        </p>
      )}
    </div>
  )
})