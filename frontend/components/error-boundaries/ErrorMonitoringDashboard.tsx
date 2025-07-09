import React, { useState, useEffect } from 'react'
import { BarChart, RefreshCw, AlertTriangle, CheckCircle, XCircle, Activity } from 'lucide-react'
import { errorRecoveryUtils } from '@utils/errorRecovery'
import { logger } from '@lib/logger'

interface ErrorMonitoringDashboardProps {
  enabled?: boolean
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  compact?: boolean
}

export const ErrorMonitoringDashboard: React.FC<ErrorMonitoringDashboardProps> = ({
  enabled = false,
  position = 'bottom-right',
  compact = false
}) => {
  const [errorStats, setErrorStats] = useState(errorRecoveryUtils.monitor.getErrorStats())
  const [recentErrors, setRecentErrors] = useState(errorRecoveryUtils.monitor.getRecentErrors(5))
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (!enabled) return

    const updateStats = () => {
      setErrorStats(errorRecoveryUtils.monitor.getErrorStats())
      setRecentErrors(errorRecoveryUtils.monitor.getRecentErrors(5))
    }

    // Update every 5 seconds
    const interval = setInterval(updateStats, 5000)

    return () => clearInterval(interval)
  }, [enabled])

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4'
      case 'top-right':
        return 'top-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      case 'bottom-right':
      default:
        return 'bottom-4 right-4'
    }
  }

  const getStatusColor = () => {
    if (errorStats.totalErrors === 0) return 'text-green-400'
    if (errorStats.recoveredErrors / errorStats.totalErrors > 0.8) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getStatusIcon = () => {
    if (errorStats.totalErrors === 0) return <CheckCircle className="w-4 h-4" />
    if (errorStats.recoveredErrors / errorStats.totalErrors > 0.8) return <AlertTriangle className="w-4 h-4" />
    return <XCircle className="w-4 h-4" />
  }

  const handleClearErrors = () => {
    errorRecoveryUtils.monitor.clearHistory()
    setErrorStats(errorRecoveryUtils.monitor.getErrorStats())
    setRecentErrors([])
    logger.info('Error monitoring history cleared')
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const getErrorTypeColor = (context: string) => {
    if (context.includes('Dragon')) return 'text-orange-400'
    if (context.includes('Wallet')) return 'text-purple-400'
    if (context.includes('Voice')) return 'text-blue-400'
    return 'text-gray-400'
  }

  if (!enabled) return null

  return (
    <div className={`fixed ${getPositionClasses()} z-50 max-w-sm`}>
      {/* Compact view */}
      {compact || !isExpanded ? (
        <div
          className="bg-gray-900/90 backdrop-blur-sm border border-gray-700/50 rounded-lg p-3 cursor-pointer hover:bg-gray-800/90 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-300">Errors</span>
            <div className={`flex items-center space-x-1 ${getStatusColor()}`}>
              {getStatusIcon()}
              <span className="text-sm">{errorStats.totalErrors}</span>
            </div>
            {errorStats.totalErrors > 0 && (
              <div className="text-xs text-gray-500">
                ({errorStats.recoveredErrors} recovered)
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Expanded view */
        <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4 w-80">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <BarChart className="w-5 h-5 text-gray-400" />
              <span className="font-semibold text-gray-200">Error Monitor</span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-gray-300 transition-colors"
            >
              ×
            </button>
          </div>

          {/* Error Statistics */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-800/50 rounded p-2">
              <div className="text-xs text-gray-500">Total Errors</div>
              <div className="text-lg font-semibold text-white">{errorStats.totalErrors}</div>
            </div>
            <div className="bg-gray-800/50 rounded p-2">
              <div className="text-xs text-gray-500">Recovered</div>
              <div className="text-lg font-semibold text-green-400">{errorStats.recoveredErrors}</div>
            </div>
            <div className="bg-gray-800/50 rounded p-2">
              <div className="text-xs text-gray-500">Unique</div>
              <div className="text-lg font-semibold text-blue-400">{errorStats.uniqueErrors}</div>
            </div>
            <div className="bg-gray-800/50 rounded p-2">
              <div className="text-xs text-gray-500">Recovery Rate</div>
              <div className="text-lg font-semibold text-yellow-400">
                {errorStats.totalErrors > 0
                  ? Math.round((errorStats.recoveredErrors / errorStats.totalErrors) * 100)
                  : 0}%
              </div>
            </div>
          </div>

          {/* Recent Errors */}
          <div className="mb-4">
            <div className="text-sm font-medium text-gray-300 mb-2">Recent Errors</div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {recentErrors.length > 0 ? (
                recentErrors.map((errorEntry, index) => (
                  <div key={index} className="bg-gray-800/30 rounded p-2">
                    <div className="flex items-center justify-between">
                      <div className={`text-xs font-medium ${getErrorTypeColor(errorEntry.context)}`}>
                        {errorEntry.context}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatTimestamp(errorEntry.timestamp)}
                      </div>
                    </div>
                    <div className="text-xs text-gray-300 mt-1 truncate">
                      {errorEntry.error.message}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className={`text-xs ${errorEntry.recovered ? 'text-green-400' : 'text-red-400'}`}>
                        {errorEntry.recovered ? 'Recovered' : 'Failed'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-500 text-center py-4">
                  No recent errors
                </div>
              )}
            </div>
          </div>

          {/* Top Errors */}
          {errorStats.topErrors.length > 0 && (
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-300 mb-2">Top Errors</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {errorStats.topErrors.slice(0, 3).map((errorEntry, index) => (
                  <div key={index} className="bg-gray-800/30 rounded p-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-300 truncate flex-1">
                        {errorEntry.error.split(':').pop() || errorEntry.error}
                      </div>
                      <div className="text-xs text-red-400 ml-2">
                        {errorEntry.count}×
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-2">
            <button
              onClick={handleClearErrors}
              className="flex items-center space-x-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Clear</span>
            </button>
            <button
              onClick={() => {
                const stats = errorRecoveryUtils.monitor.getErrorStats()
                const recent = errorRecoveryUtils.monitor.getRecentErrors(20)
                console.log('Error Monitor Data:', { stats, recent })
              }}
              className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs transition-colors"
            >
              <Activity className="w-3 h-3" />
              <span>Export</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Hook for easy error monitoring integration
export const useErrorMonitoring = () => {
  const [errorStats, setErrorStats] = useState(errorRecoveryUtils.monitor.getErrorStats())

  useEffect(() => {
    const updateStats = () => {
      setErrorStats(errorRecoveryUtils.monitor.getErrorStats())
    }

    const interval = setInterval(updateStats, 5000)
    return () => clearInterval(interval)
  }, [])

  const recordError = (error: Error, context: string, recovered: boolean = false) => {
    errorRecoveryUtils.monitor.recordError(error, context, recovered)
    setErrorStats(errorRecoveryUtils.monitor.getErrorStats())
  }

  const clearErrors = () => {
    errorRecoveryUtils.monitor.clearHistory()
    setErrorStats(errorRecoveryUtils.monitor.getErrorStats())
  }

  return {
    errorStats,
    recordError,
    clearErrors
  }
}

export default ErrorMonitoringDashboard