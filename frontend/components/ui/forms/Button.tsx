'use client'

import React from 'react'
import { cn } from '@lib/utils'
import { LucideIcon } from 'lucide-react'

/**
 * Props for the Button component
 * @interface ButtonProps
 * @extends React.ButtonHTMLAttributes<HTMLButtonElement>
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant of the button */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  /** Size variant of the button */
  size?: 'sm' | 'md' | 'lg'
  /** Optional Lucide icon to display in the button */
  icon?: LucideIcon
  /** Position of the icon relative to the text */
  iconPosition?: 'left' | 'right'
  /** Whether the button is in a loading state */
  loading?: boolean
  /** Button content */
  children: React.ReactNode
}

const buttonVariants = {
  primary: 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800',
  secondary: 'bg-gray-200 text-gray-700 hover:bg-gray-300',
  danger: 'bg-red-500 text-white hover:bg-red-600',
  ghost: 'text-gray-400 hover:text-white hover:bg-gray-800'
}

const buttonSizes = {
  sm: 'px-3 py-1 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3 text-lg'
}

/**
 * A reusable button component with multiple variants, sizes, and states.
 * 
 * Features:
 * - Multiple visual variants (primary, secondary, danger, ghost)
 * - Different sizes (sm, md, lg)
 * - Optional icons with configurable positioning
 * - Loading state with spinner
 * - Full accessibility support
 * - Memoized for performance optimization
 * 
 * @param props - Button props
 * @param props.variant - Visual style variant of the button
 * @param props.size - Size variant of the button
 * @param props.icon - Optional Lucide icon component
 * @param props.iconPosition - Position of the icon ('left' or 'right')
 * @param props.loading - Whether the button shows a loading spinner
 * @param props.disabled - Whether the button is disabled
 * @param props.className - Additional CSS classes
 * @param props.children - Button content
 * @returns Memoized button component
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <Button onClick={handleClick}>
 *   Click me
 * </Button>
 * 
 * // With icon and variant
 * <Button 
 *   variant="primary" 
 *   icon={Play} 
 *   iconPosition="left"
 *   onClick={handlePlay}
 * >
 *   Play Video
 * </Button>
 * 
 * // Loading state
 * <Button loading disabled>
 *   Processing...
 * </Button>
 * ```
 */
export const Button = React.memo(function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
      )}
      {Icon && iconPosition === 'left' && !loading && (
        <Icon className="h-4 w-4" />
      )}
      {children}
      {Icon && iconPosition === 'right' && !loading && (
        <Icon className="h-4 w-4" />
      )}
    </button>
  )
})