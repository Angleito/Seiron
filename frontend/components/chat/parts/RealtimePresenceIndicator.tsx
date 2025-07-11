import { useState } from 'react'
import { Button } from '@/components/ui/forms/Button'
import { PresenceState } from '@/types/realtime'

export interface RealtimePresenceIndicatorProps {
  presence: PresenceState[]
  myPresence: PresenceState | null
  onStatusChange: (status: 'online' | 'away' | 'offline') => void
  className?: string
}

export function RealtimePresenceIndicator({
  presence,
  myPresence,
  onStatusChange,
  className = '',
}: RealtimePresenceIndicatorProps) {
  const [showDetails, setShowDetails] = useState(false)
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return '🟢'
      case 'away': return '🟡'
      case 'offline': return '⚫'
      default: return '❓'
    }
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-600 dark:text-green-400'
      case 'away': return 'text-yellow-600 dark:text-yellow-400'
      case 'offline': return 'text-gray-600 dark:text-gray-400'
      default: return 'text-gray-500'
    }
  }
  
  const formatLastSeen = (lastSeen: string) => {
    const date = new Date(lastSeen)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString()
  }
  
  const onlineUsers = presence.filter(p => p.status === 'online')
  const awayUsers = presence.filter(p => p.status === 'away')
  const totalUsers = presence.length
  
  return (
    <div className={`realtime-presence-indicator bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 ${className}`}>
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              👥 {totalUsers} user{totalUsers !== 1 ? 's' : ''}
            </span>
            {onlineUsers.length > 0 && (
              <span className="text-xs text-green-600 dark:text-green-400">
                ({onlineUsers.length} online)
              </span>
            )}
          </div>
          
          {myPresence && (
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-500">You:</span>
              <span className={`text-xs font-medium ${getStatusColor(myPresence.status)}`}>
                {getStatusIcon(myPresence.status)} {myPresence.status}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Status Change Buttons */}
          <div className="flex items-center space-x-1">
            <Button
              onClick={() => onStatusChange('online')}
              size="sm"
              variant={myPresence?.status === 'online' ? 'primary' : 'secondary'}
              className="text-xs px-2 py-1 h-auto"
              title="Set status to online"
            >
              🟢
            </Button>
            <Button
              onClick={() => onStatusChange('away')}
              size="sm"
              variant={myPresence?.status === 'away' ? 'primary' : 'secondary'}
              className="text-xs px-2 py-1 h-auto"
              title="Set status to away"
            >
              🟡
            </Button>
            <Button
              onClick={() => onStatusChange('offline')}
              size="sm"
              variant={myPresence?.status === 'offline' ? 'primary' : 'secondary'}
              className="text-xs px-2 py-1 h-auto"
              title="Set status to offline"
            >
              ⚫
            </Button>
          </div>
          
          <Button
            onClick={() => setShowDetails(!showDetails)}
            size="sm"
            variant="ghost"
            className="text-xs px-2 py-1 h-auto"
          >
            {showDetails ? '▲' : '▼'}
          </Button>
        </div>
      </div>
      
      {/* Details Panel */}
      {showDetails && (
        <div className="px-3 pb-3 border-t border-blue-200 dark:border-blue-800">
          <div className="mt-2 space-y-2">
            {presence.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-2">
                No users currently connected
              </p>
            ) : (
              <>
                {/* Online Users */}
                {onlineUsers.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">
                      Online ({onlineUsers.length})
                    </h4>
                    <div className="grid grid-cols-2 gap-1">
                      {onlineUsers.map((user) => (
                        <div
                          key={user.user_id}
                          className="flex items-center space-x-2 text-xs"
                        >
                          <span className="text-green-600 dark:text-green-400">
                            {getStatusIcon(user.status)}
                          </span>
                          <span className="font-medium truncate">
                            {user.metadata?.user_name || `User ${user.user_id.slice(-4)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Away Users */}
                {awayUsers.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-yellow-700 dark:text-yellow-300 mb-1">
                      Away ({awayUsers.length})
                    </h4>
                    <div className="grid grid-cols-2 gap-1">
                      {awayUsers.map((user) => (
                        <div
                          key={user.user_id}
                          className="flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="text-yellow-600 dark:text-yellow-400">
                              {getStatusIcon(user.status)}
                            </span>
                            <span className="font-medium truncate">
                              {user.metadata?.user_name || `User ${user.user_id.slice(-4)}`}
                            </span>
                          </div>
                          <span className="text-gray-500 text-xs">
                            {formatLastSeen(user.last_seen)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}