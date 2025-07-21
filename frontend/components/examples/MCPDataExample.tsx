'use client'

import React, { useState, useEffect } from 'react'
import { useMCPClient, MCPClientManager } from '@/lib/mcp/client'
import { 
  HiveIntelligenceConfig, 
  SeiBlockchainConfig, 
  PortfolioManagerConfig 
} from '@/lib/mcp/servers'
import { logger } from '@/lib/logger'
import { Loader2, CheckCircle, XCircle, RefreshCw, Brain, Wallet, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Example component demonstrating how to use MCP clients to fetch data
 * Shows best practices for error handling, loading states, and data display
 */
export function MCPDataExample() {
  // State for each MCP server connection
  const [hiveData, setHiveData] = useState<any>(null)
  const [seiData, setSeiData] = useState<any>(null)
  const [portfolioData, setPortfolioData] = useState<any>(null)
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize MCP clients for each server
  const hiveClient = useMCPClient(HiveIntelligenceConfig)
  const seiClient = useMCPClient(SeiBlockchainConfig)
  const portfolioClient = useMCPClient(PortfolioManagerConfig)

  // Example: Fetch market data from Hive Intelligence
  const fetchHiveMarketData = async () => {
    setLoading(prev => ({ ...prev, hive: true }))
    setErrors(prev => ({ ...prev, hive: '' }))
    
    try {
      const result = await hiveClient.callTool('getMarketData', {
        assets: ['SEI', 'USDC'],
        timeframe: '1h',
        includeIndicators: true
      })
      
      setHiveData(result.content)
      logger.info('Hive market data fetched:', result)
    } catch (error) {
      logger.error('Failed to fetch Hive data:', error)
      setErrors(prev => ({ ...prev, hive: error.message }))
    } finally {
      setLoading(prev => ({ ...prev, hive: false }))
    }
  }

  // Example: Fetch wallet balance from SEI blockchain
  const fetchSeiBalance = async () => {
    setLoading(prev => ({ ...prev, sei: true }))
    setErrors(prev => ({ ...prev, sei: '' }))
    
    try {
      // For demo, using a sample wallet address
      const result = await seiClient.callTool('getWalletBalance', {
        address: 'sei1example...',
        includeStaking: true,
        includeDeFi: true
      })
      
      setSeiData(result.content)
      logger.info('SEI balance fetched:', result)
    } catch (error) {
      logger.error('Failed to fetch SEI data:', error)
      setErrors(prev => ({ ...prev, sei: error.message }))
    } finally {
      setLoading(prev => ({ ...prev, sei: false }))
    }
  }

  // Example: Analyze portfolio composition
  const fetchPortfolioAnalysis = async () => {
    setLoading(prev => ({ ...prev, portfolio: true }))
    setErrors(prev => ({ ...prev, portfolio: '' }))
    
    try {
      const result = await portfolioClient.callTool('analyzePortfolioComposition', {
        walletAddress: 'sei1example...',
        includeDeFi: true,
        includeNFTs: false
      })
      
      setPortfolioData(result.content)
      logger.info('Portfolio analysis fetched:', result)
    } catch (error) {
      logger.error('Failed to fetch portfolio data:', error)
      setErrors(prev => ({ ...prev, portfolio: error.message }))
    } finally {
      setLoading(prev => ({ ...prev, portfolio: false }))
    }
  }

  // Example: Using MCPClientManager for batch operations
  const fetchAllData = async () => {
    const manager = new MCPClientManager()
    
    // Add all server configurations
    await manager.addServer('hive', HiveIntelligenceConfig)
    await manager.addServer('sei', SeiBlockchainConfig)
    await manager.addServer('portfolio', PortfolioManagerConfig)
    
    // Connect to all servers
    await manager.connectAll()
    
    // Fetch data from all servers in parallel
    await Promise.all([
      fetchHiveMarketData(),
      fetchSeiBalance(),
      fetchPortfolioAnalysis()
    ])
  }

  // Connection status display
  const ConnectionStatus = ({ connected, name }: { connected: boolean; name: string }) => (
    <div className="flex items-center gap-2">
      {connected ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-red-500" />
      )}
      <span className="text-sm">{name}: {connected ? 'Connected' : 'Disconnected'}</span>
    </div>
  )

  // Data display component
  const DataDisplay = ({ 
    title, 
    data, 
    loading, 
    error, 
    onRefresh,
    icon: Icon 
  }: { 
    title: string
    data: any
    loading: boolean
    error: string
    onRefresh: () => void
    icon: React.ComponentType<any>
  }) => (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Icon className="h-5 w-5 text-blue-600" />
          {title}
        </h3>
        <button
          onClick={onRefresh}
          disabled={loading}
          className={cn(
            "p-2 rounded-full transition-colors",
            loading ? "bg-gray-100" : "hover:bg-gray-100"
          )}
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          Error: {error}
        </div>
      )}

      {!loading && !error && data && (
        <div className="space-y-2">
          <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-auto max-h-64">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}

      {!loading && !error && !data && (
        <div className="text-center py-8 text-gray-500">
          <p>No data available</p>
          <button
            onClick={onRefresh}
            className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
          >
            Fetch Data
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6 p-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="text-xl font-bold text-blue-900 mb-2">MCP Data Example</h2>
        <p className="text-blue-700 text-sm mb-4">
          This component demonstrates how to use MCP clients to fetch data from different servers.
          Each section shows proper error handling, loading states, and data display patterns.
        </p>
        
        {/* Connection Status */}
        <div className="flex flex-wrap gap-4 mt-4">
          <ConnectionStatus connected={hiveClient.connected} name="Hive Intelligence" />
          <ConnectionStatus connected={seiClient.connected} name="SEI Blockchain" />
          <ConnectionStatus connected={portfolioClient.connected} name="Portfolio Manager" />
        </div>

        {/* Batch Fetch Button */}
        <button
          onClick={fetchAllData}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Fetch All Data
        </button>
      </div>

      {/* Data Display Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DataDisplay
          title="Hive Market Data"
          data={hiveData}
          loading={loading.hive}
          error={errors.hive}
          onRefresh={fetchHiveMarketData}
          icon={Brain}
        />

        <DataDisplay
          title="SEI Wallet Balance"
          data={seiData}
          loading={loading.sei}
          error={errors.sei}
          onRefresh={fetchSeiBalance}
          icon={Wallet}
        />

        <DataDisplay
          title="Portfolio Analysis"
          data={portfolioData}
          loading={loading.portfolio}
          error={errors.portfolio}
          onRefresh={fetchPortfolioAnalysis}
          icon={BarChart3}
        />
      </div>

      {/* Usage Examples */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="font-semibold mb-2">Usage Examples:</h3>
        <div className="space-y-3 text-sm">
          <div>
            <code className="bg-white px-2 py-1 rounded border">useMCPClient(config)</code>
            <p className="text-gray-600 mt-1">Hook to create and manage MCP client connections</p>
          </div>
          <div>
            <code className="bg-white px-2 py-1 rounded border">client.callTool(toolName, args)</code>
            <p className="text-gray-600 mt-1">Call a specific tool on the MCP server</p>
          </div>
          <div>
            <code className="bg-white px-2 py-1 rounded border">MCPClientManager</code>
            <p className="text-gray-600 mt-1">Manage multiple MCP server connections</p>
          </div>
        </div>
      </div>

      {/* Best Practices */}
      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
        <h3 className="font-semibold mb-2 text-green-900">Best Practices:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-green-800">
          <li>Always handle loading states and errors gracefully</li>
          <li>Use proper TypeScript types for MCP responses</li>
          <li>Implement retry logic for failed requests</li>
          <li>Cache responses when appropriate to reduce API calls</li>
          <li>Show connection status to users</li>
          <li>Provide fallback UI when MCP servers are unavailable</li>
        </ul>
      </div>
    </div>
  )
}