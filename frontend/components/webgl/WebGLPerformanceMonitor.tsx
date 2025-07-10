'use client'

import React, { useEffect, useState } from 'react'
import { AlertTriangle, Info, X, Settings, Monitor } from 'lucide-react'
import { useWebGLRecovery } from '../../utils/webglRecovery'

interface WebGLPerformanceMonitorProps {
  enabled?: boolean
  showNotifications?: boolean
  allowManualQualityControl?: boolean
}

const WebGLPerformanceMonitor: React.FC<WebGLPerformanceMonitorProps> = ({
  enabled = true,
  showNotifications = true,
  allowManualQualityControl = true
}) => {
  const {
    diagnostics,
    setQualityLevel,
    dismissNotification,
    clearNotifications
  } = useWebGLRecovery()

  const [showPanel, setShowPanel] = useState(false)
  const [currentQuality, setCurrentQuality] = useState(4)

  // Update quality level when diagnostics change
  useEffect(() => {
    setCurrentQuality(diagnostics.qualityLevel)
  }, [diagnostics.qualityLevel])

  // Get active (non-dismissed) notifications
  const activeNotifications = diagnostics.userNotifications.filter(n => !n.dismissed)

  // Get notification icon
  const getNotificationIcon = (type: 'info' | 'warning' | 'error') => {
    switch (type) {
      case 'info':
        return <Info className="h-4 w-4 text-blue-400" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-400" />
    }
  }

  // Get notification colors
  const getNotificationColors = (type: 'info' | 'warning' | 'error') => {
    switch (type) {
      case 'info':
        return 'border-blue-800 bg-blue-900/20 text-blue-100'
      case 'warning':
        return 'border-yellow-800 bg-yellow-900/20 text-yellow-100'
      case 'error':
        return 'border-red-800 bg-red-900/20 text-red-100'
    }
  }

  // Get risk level color
  const getRiskColor = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'low':
        return 'text-green-400'
      case 'medium':
        return 'text-yellow-400'
      case 'high':
        return 'text-red-400'
    }
  }

  // Get quality level description
  const getQualityDescription = (level: number) => {
    switch (level) {
      case 4:
        return 'Maximum - All effects enabled'
      case 3:
        return 'High - Reduced particles'
      case 2:
        return 'Medium - No antialiasing'
      case 1:
        return 'Low - Basic rendering'
      case 0:
        return 'Minimal - Performance priority'
      default:
        return 'Unknown'
    }
  }

  // Handle quality level change
  const handleQualityChange = (level: number) => {
    setQualityLevel(level)
    setCurrentQuality(level)
  }

  if (!enabled) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Notifications */}
      {showNotifications && activeNotifications.length > 0 && (
        <div className="mb-4 space-y-2">
          {activeNotifications.slice(-3).map((notification) => (
            <div
              key={notification.id}
              className={`p-3 rounded-lg border backdrop-blur-sm ${getNotificationColors(notification.type)} 
                max-w-sm shadow-lg animate-in slide-in-from-right`}
            >
              <div className="flex items-start gap-2">
                {getNotificationIcon(notification.type)}
                <div className="flex-1">
                  <p className="text-sm font-medium">{notification.message}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {notification.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                <button
                  onClick={() => dismissNotification(notification.id)}
                  className="opacity-70 hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Performance Monitor Panel */}
      <div className="relative">
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="bg-gray-900/80 backdrop-blur-sm border border-gray-700 rounded-lg p-3 
            hover:bg-gray-800/80 transition-colors shadow-lg"
          title="WebGL Performance Monitor"
        >
          <Monitor className="h-5 w-5 text-blue-400" />
          {diagnostics.contextLossRisk === 'high' && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          )}
        </button>

        {showPanel && (
          <div className="absolute bottom-full right-0 mb-2 w-80 bg-gray-900/95 backdrop-blur-sm 
            border border-gray-700 rounded-lg p-4 shadow-xl animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">WebGL Monitor</h3>
              <button
                onClick={() => setShowPanel(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Performance Metrics */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Performance Score</span>
                <span className="text-sm font-mono text-white">
                  {diagnostics.performanceScore.toFixed(1)}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Memory Usage</span>
                <span className="text-sm font-mono text-white">
                  {diagnostics.memoryUsage.toFixed(1)} MB
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Context Loss Risk</span>
                <span className={`text-sm font-medium ${getRiskColor(diagnostics.contextLossRisk)}`}>
                  {diagnostics.contextLossRisk.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Quality Level</span>
                <span className="text-sm font-mono text-white">
                  {diagnostics.qualityLevel}/4
                </span>
              </div>
            </div>

            {/* Quality Control */}
            {allowManualQualityControl && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-300">Quality Control</span>
                </div>
                
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="4"
                    value={currentQuality}
                    onChange={(e) => handleQualityChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
                      slider:bg-blue-500 slider:h-2 slider:rounded-lg slider:cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Min</span>
                    <span>Max</span>
                  </div>
                  <p className="text-sm text-gray-400">
                    {getQualityDescription(currentQuality)}
                  </p>
                </div>
              </div>
            )}

            {/* Statistics */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400">Context Losses</span>
                  <p className="text-white font-mono">{diagnostics.contextLossCount}</p>
                </div>
                <div>
                  <span className="text-gray-400">Preventive Actions</span>
                  <p className="text-white font-mono">{diagnostics.preventiveMeasuresCount}</p>
                </div>
                <div>
                  <span className="text-gray-400">Recovery Rate</span>
                  <p className="text-white font-mono">
                    {diagnostics.recoveryAttempts > 0 
                      ? `${((diagnostics.successfulRecoveries / diagnostics.recoveryAttempts) * 100).toFixed(1)}%`
                      : 'N/A'
                    }
                  </p>
                </div>
                <div>
                  <span className="text-gray-400">Avg Recovery</span>
                  <p className="text-white font-mono">{diagnostics.averageRecoveryTime.toFixed(0)}ms</p>
                </div>
              </div>
            </div>

            {/* Clear Notifications */}
            {activeNotifications.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <button
                  onClick={clearNotifications}
                  className="w-full text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Clear All Notifications
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default WebGLPerformanceMonitor