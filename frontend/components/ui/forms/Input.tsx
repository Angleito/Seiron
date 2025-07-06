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
    <div className="space-y-2">  {/* 8px spacing */}
      {label && (
        <label className="block text-size-3 font-semibold text-gray-100">
          {label}
        </label>
      )}
      
      <div className="relative">
        {Icon && iconPosition === 'left' && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className={cn(
              'h-5 w-5',  // 20px - aligns with 8pt grid
              hasError ? 'text-red-400' : 'text-gray-400'
            )} />
          </div>
        )}
        
        <input
          className={cn(
            'w-full rounded-md border bg-gray-900 text-gray-100 px-4 py-2 text-size-3 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950 transition-all duration-200',
            hasError 
              ? 'border-red-600 focus:ring-red-600' 
              : 'border-gray-700 focus:border-gray-600 focus:ring-gray-600',
            Icon && iconPosition === 'left' && 'pl-12',  // 48px for icon
            Icon && iconPosition === 'right' && 'pr-12', // 48px for icon
            className
          )}
          {...props}
        />
        
        {Icon && iconPosition === 'right' && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Icon className={cn(
              'h-5 w-5',  // 20px - aligns with 8pt grid
              hasError ? 'text-red-400' : 'text-gray-400'
            )} />
          </div>
        )}
      </div>
      
      {(error || helperText) && (
        <p className={cn(
          'text-size-4 mt-1',  // 12px font, 4px margin
          hasError ? 'text-red-500' : 'text-gray-400'
        )}>
          {error || helperText}
        </p>
      )}
    </div>
  )
})