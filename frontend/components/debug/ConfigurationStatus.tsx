/**
 * Configuration Status Component
 * Displays real-time configuration and backend connectivity status
 */

import React, { useState, useEffect } from 'react'
import { apiClient } from '../../utils/apiClient'
import { envConfig } from '../../utils/envValidation'

interface ConfigurationStatusProps {
  showDetails?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

interface BackendStatus {
  isHealthy: boolean
  responseTime?: number
  lastChecked: Date
  error?: string
}

export const ConfigurationStatus: React.FC<ConfigurationStatusProps> = ({
  showDetails = false,
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}) => {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>({
    isHealthy: false,
    lastChecked: new Date(),
  })
  const [isLoading, setIsLoading] = useState(false)

  const checkBackendHealth = async () => {
    setIsLoading(true)
    const startTime = Date.now()
    
    try {
      const isHealthy = await apiClient.checkBackendHealth()
      const responseTime = Date.now() - startTime
      
      setBackendStatus({
        isHealthy,
        responseTime,
        lastChecked: new Date(),
        error: isHealthy ? undefined : 'Backend is not responding'
      })
    } catch (error) {
      setBackendStatus({
        isHealthy: false,
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkBackendHealth()
    
    if (autoRefresh) {
      const interval = setInterval(checkBackendHealth, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  const apiClientStatus = apiClient.getStatus()

  if (!showDetails) {
    return (
      <div className="inline-flex items-center gap-2 text-sm">
        <div className={`w-2 h-2 rounded-full ${
          backendStatus.isHealthy ? 'bg-green-500' : 'bg-red-500'
        }`} />
        <span>Backend {backendStatus.isHealthy ? 'Connected' : 'Disconnected'}</span>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Configuration Status</h3>
        <button
          onClick={checkBackendHealth}
          disabled={isLoading}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Checking...' : 'Refresh'}
        </button>
      </div>

      {/* Backend Connectivity */}
      <div className="space-y-2">
        <h4 className="font-medium">Backend Connectivity</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Status:</span>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${
                backendStatus.isHealthy ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span>{backendStatus.isHealthy ? 'Healthy' : 'Unhealthy'}</span>
            </div>
          </div>
          <div>
            <span className="text-gray-600">Response Time:</span>
            <div className="mt-1">
              {backendStatus.responseTime ? `${backendStatus.responseTime}ms` : 'N/A'}
            </div>
          </div>
          <div>
            <span className="text-gray-600">Last Checked:</span>
            <div className="mt-1">
              {backendStatus.lastChecked.toLocaleTimeString()}
            </div>
          </div>
          <div>
            <span className="text-gray-600">Backend URL:</span>
            <div className="mt-1 font-mono text-xs">
              {apiClientStatus.backendUrl || 'Not configured'}
            </div>
          </div>
        </div>
        {backendStatus.error && (
          <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
            {backendStatus.error}
          </div>
        )}
      </div>

      {/* API Client Configuration */}
      <div className="space-y-2">
        <h4 className="font-medium">API Client Configuration</h4>
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span>Backend URL:</span>
            <span className="font-mono text-xs">
              {apiClientStatus.hasBackendUrl ? '✓ Configured' : '✗ Not configured'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Fallback to Proxy:</span>
            <span>{apiClientStatus.fallbackEnabled ? '✓ Enabled' : '✗ Disabled'}</span>
          </div>
          <div className="flex justify-between">
            <span>Proxy URL:</span>
            <span className="font-mono text-xs">{apiClientStatus.proxyUrl || 'Current domain'}</span>
          </div>
        </div>
      </div>

      {/* Environment Variables */}
      <div className="space-y-2">
        <h4 className="font-medium">Environment Configuration</h4>
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span>Environment:</span>
            <span>{envConfig.status.prod ? 'Production' : 'Development'}</span>
          </div>
          <div className="flex justify-between">
            <span>Privy Auth:</span>
            <span>{envConfig.isValid.privy ? '✓ Configured' : '✗ Not configured'}</span>
          </div>
          <div className="flex justify-between">
            <span>WalletConnect:</span>
            <span>{envConfig.isValid.walletConnect ? '✓ Configured' : '✗ Not configured'}</span>
          </div>
          <div className="flex justify-between">
            <span>Voice Features:</span>
            <span>{envConfig.isValid.voice ? '✓ Configured' : '✗ Not configured'}</span>
          </div>
        </div>
      </div>

      {/* Deployment Info */}
      <div className="space-y-2">
        <h4 className="font-medium">Deployment Info</h4>
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span>Current URL:</span>
            <span className="font-mono text-xs">{window.location.origin}</span>
          </div>
          <div className="flex justify-between">
            <span>API Strategy:</span>
            <span>{apiClientStatus.hasBackendUrl ? 'Direct Backend' : 'Vercel API Routes'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfigurationStatus