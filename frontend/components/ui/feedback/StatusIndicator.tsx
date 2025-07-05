'use client'

import React from 'react'
import { cn } from '@lib/utils'

export interface StatusIndicatorProps {
  status: 'connected' | 'connecting' | 'disconnected' | 'error'
  label?: string
  showLabel?: boolean
  size?: 'sm' | 'md'
}

const statusStyles = {
  connected: 'bg-green-500',
  connecting: 'bg-yellow-500 animate-pulse',
  disconnected: 'bg-gray-500',
  error: 'bg-red-500'
}

const statusLabels = {
  connected: 'Connected',
  connecting: 'Connecting...',
  disconnected: 'Disconnected',
  error: 'Connection Error'
}

const sizeStyles = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3'
}

export const StatusIndicator = React.memo(function StatusIndicator({
  status,
  label,
  showLabel = true,
  size = 'sm'
}: StatusIndicatorProps) {
  const displayLabel = label || statusLabels[status]

  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        'rounded-full',
        statusStyles[status],
        sizeStyles[size]
      )} />
      {showLabel && (
        <span className="text-sm text-gray-700">
          {displayLabel}
        </span>
      )}
    </div>
  )
})