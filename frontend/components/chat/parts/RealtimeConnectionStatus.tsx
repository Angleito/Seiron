// import React from 'react'
import { Button } from '@/components/ui/forms/Button'
import { StatusIndicator } from '@/components/ui/feedback/StatusIndicator'

export interface RealtimeConnectionStatusProps {
  isConnected: boolean
  error: Error | null
  onReconnect: () => void
  onDisconnect: () => void
  className?: string
}

export function RealtimeConnectionStatus({
  isConnected,
  error,
  onReconnect,
  onDisconnect,
  className = '',
}: RealtimeConnectionStatusProps) {
  const getConnectionStatus = () => {
    if (error) return 'error'
    if (isConnected) return 'connected'
    return 'connecting'
  }
  
  const getConnectionText = () => {
    if (error) return `Connection Error: ${error.message}`
    if (isConnected) return 'Connected to real-time updates'
    return 'Connecting...'
  }
  
  const getConnectionIcon = () => {
    if (error) return '⚠️'
    if (isConnected) return '🟢'
    return '🟡'
  }
  
  return (
    <div className={`realtime-connection-status flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-center space-x-3">
        <span className="text-lg">{getConnectionIcon()}</span>
        <div className="flex flex-col">
          <StatusIndicator 
            status={getConnectionStatus()} 
            label={getConnectionText()}
            showLabel={true}
            size="sm"
          />
          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {error.stack ? 'Check console for details' : 'Please try reconnecting'}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        {!isConnected && (
          <Button
            onClick={onReconnect}
            size="sm"
            variant="secondary"
            className="text-xs"
          >
            🔄 Reconnect
          </Button>
        )}
        
        {isConnected && (
          <Button
            onClick={onDisconnect}
            size="sm"
            variant="secondary"
            className="text-xs text-red-600 hover:text-red-700"
          >
            ⏸️ Disconnect
          </Button>
        )}
      </div>
    </div>
  )
}