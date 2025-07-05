'use client'

import React from 'react'
import { cn } from '@lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Textarea = React.memo(function Textarea({
  label,
  error,
  helperText,
  className,
  ...props
}: TextareaProps) {
  const hasError = Boolean(error)

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-300">
          {label}
        </label>
      )}
      
      <textarea
        className={cn(
          'w-full rounded-lg border bg-gray-900 text-red-100 px-3 py-2 focus:outline-none focus:ring-2 transition-colors resize-none',
          hasError 
            ? 'border-red-500 focus:ring-red-600' 
            : 'border-red-700 focus:ring-red-600',
          className
        )}
        {...props}
      />
      
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