'use client'

import React from 'react'
import { cn } from '@/lib/utils'
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
  // Primary uses accent color (10% rule) - for primary CTAs only
  primary: 'bg-red-600 text-white hover:bg-red-500 focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-gray-950',
  // Secondary uses neutral colors (60% rule)
  secondary: 'bg-gray-800 text-gray-100 hover:bg-gray-700 border border-gray-700',
  // Danger variant simplified
  danger: 'bg-red-600 text-white hover:bg-red-500',
  // Ghost uses text only
  ghost: 'text-gray-400 hover:text-gray-100 hover:bg-gray-800/50'
}

const buttonSizes = {
  // Using 8pt grid system and 4 font sizes
  sm: 'px-3 py-2 text-size-4 gap-2',   // 12px padding, 8px py, 12px font
  md: 'px-4 py-2 text-size-3 gap-2',   // 16px padding, 8px py, 14px font  
  lg: 'px-6 py-3 text-size-2 gap-3'    // 24px padding, 12px py, 16px font
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
        'rounded-md font-semibold transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-sm',
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
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