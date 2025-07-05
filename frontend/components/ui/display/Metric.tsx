'use client'

import React from 'react'
import { cn } from '@lib/utils'
import { LucideIcon } from 'lucide-react'

export interface MetricProps {
  label: string
  value: string | number
  icon?: LucideIcon
  variant?: 'default' | 'success' | 'warning' | 'danger'
  className?: string
}

const metricVariants = {
  default: 'text-white',
  success: 'text-green-400',
  warning: 'text-yellow-400',
  danger: 'text-red-400'
}

export const Metric = React.memo(function Metric({
  label,
  value,
  icon: Icon,
  variant = 'default',
  className
}: MetricProps) {
  return (
    <div className={cn('bg-black/30 rounded-lg p-2 border border-red-500/5', className)}>
      <p className="text-gray-500 text-xs flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </p>
      <p className={cn('text-sm font-medium', metricVariants[variant])}>
        {value}
      </p>
    </div>
  )
})