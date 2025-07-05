import { UserIntent, TaskResult, AgentStreamEvent, Either } from '../types/agent'
import { logger, logRequest, logResponse, time, timeEnd } from './logger'
import { 
  AdapterAction, 
  AdapterActionResult, 
  AdapterType, 
  getAdapterFactory,
  SAKOperationResult,
  SAKTool,
  HiveAnalyticsResult,
  HiveSearchResult,
  HiveCreditUsage,
  MCPNetworkStatus,
  MCPWalletBalance,
  MCPTransactionResult,
  MCPContractQueryResult
} from './adapters'
import { WebSocketManager, WebSocketManagerImpl } from './services/WebSocketManager'

// Re-export types for backward compatibility
export type { 
  AdapterAction, 
  SAKOperationResult, 
  HiveAnalyticsResult,
  MCPNetworkStatus 
} from './adapters'

export interface OrchestratorConfig {
  apiEndpoint: string
  wsEndpoint: string
  timeout?: number
}

export class Orchestrator {
  private config: OrchestratorConfig
  private wsManager: WebSocketManager
  private adapterFactory: ReturnType<typeof getAdapterFactory>

  constructor(config: OrchestratorConfig) {
    this.config = {
      timeout: 30000, // 30 seconds default
      ...config,
    }
    
    // Initialize WebSocket manager
    this.wsManager = new WebSocketManagerImpl({
      wsEndpoint: this.config.wsEndpoint,
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
    })
    
    // Initialize adapter factory
    this.adapterFactory = getAdapterFactory({
      apiEndpoint: this.config.apiEndpoint,
      timeout: this.config.timeout,
    })
  }

  /**
   * Enhanced HTTP request wrapper with comprehensive logging
   */
  private async makeRequest<T>(
    url: string,
    options: RequestInit,
    context?: string
  ): Promise<Either<string, T>> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const performanceLabel = `${context || 'HTTP'}_${options.method || 'GET'}_${url.split('/').pop()}`
    
    // Start performance timing
    time(performanceLabel, { 
      requestId, 
      context,
      url,
      method: options.method || 'GET'
    })
    
    // Log request initiation
    logRequest({
      requestId,
      method: options.method || 'GET',
      url,
      headers: options.headers as Record<string, string>,
      body: options.body ? JSON.parse(options.body as string) : undefined,
      startTime: Date.now()
    })
    
    try {
      // Add request ID to headers
      const enhancedOptions: RequestInit = {
        ...options,
        headers: {
          ...options.headers,
          'X-Request-ID': requestId,
          'X-Client-Version': '1.0.0',
          'X-Client-Type': 'frontend'
        }
      }
      
      logger.debug('Making HTTP request', {
        requestId,
        method: options.method || 'GET',
        url,
        timeout: this.config.timeout,
        context
      })
      
      const response = await fetch(url, {
        ...enhancedOptions,
        signal: AbortSignal.timeout(this.config.timeout!),
      })
      
      const responseText = await response.text()
      let responseData: T
      
      try {
        responseData = responseText ? JSON.parse(responseText) : null
      } catch (parseError) {
        logger.warn('Failed to parse response as JSON', {
          requestId,
          responseText: responseText.substring(0, 500),
          parseError
        })
        responseData = responseText as unknown as T
      }
      
      // Log response
      logResponse(requestId, {
        status: response.status,
        statusText: response.statusText,
        response: responseData
      })
      
      // End performance timing
      const timer = timeEnd(performanceLabel, {
        status: response.status,
        success: response.ok
      })
      
      if (!response.ok) {
        const error = responseData as any
        const errorMessage = error?.message || `HTTP ${response.status}: ${response.statusText}`
        
        logger.error('HTTP request failed', {
          requestId,
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          duration: timer?.duration,
          context
        })
        
        return { _tag: 'Left', left: errorMessage }
      }
      
      logger.info('HTTP request successful', {
        requestId,
        status: response.status,
        duration: timer?.duration,
        responseSize: responseText.length,
        context
      })
      
      return { _tag: 'Right', right: responseData }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      // Log error response
      logResponse(requestId, {
        error: error instanceof Error ? error : new Error(errorMessage)
      })
      
      // End performance timing with error
      const timer = timeEnd(performanceLabel, {
        error: true,
        errorType: error instanceof Error ? error.name : 'Unknown'
      })
      
      logger.error('HTTP request error', {
        requestId,
        error: errorMessage,
        duration: timer?.duration,
        context,
        url,
        method: options.method || 'GET'
      })
      
      return { _tag: 'Left', left: errorMessage }
    }
  }

  async processIntent(intent: UserIntent): Promise<Either<string, TaskResult>> {
    return this.makeRequest<TaskResult>(
      `${this.config.apiEndpoint}/process-intent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ intent }),
      },
      'PROCESS_INTENT'
    )
  }

  // ============================================================================
  // Sei Agent Kit Integration Methods
  // ============================================================================

  private async ensureAdapterConnected(type: AdapterType): Promise<void> {
    let adapter = this.adapterFactory.getAdapter(type)
    if (!adapter) {
      adapter = this.adapterFactory.createAdapter(type)
    }
    
    if (!adapter.isConnected()) {
      await adapter.connect()
    }
  }

  async executeSAKAction<T>(
    toolName: string,
    params: Record<string, unknown>,
    context?: Record<string, unknown>
  ): Promise<Either<string, SAKOperationResult<T>>> {
    try {
      await this.ensureAdapterConnected('sak')
      const adapter = this.adapterFactory.getSAKAdapter()!
      return await adapter.executeTool(toolName, params, context)
    } catch (error) {
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async listSAKTools(): Promise<Either<string, SAKTool[]>> {
    try {
      await this.ensureAdapterConnected('sak')
      const adapter = this.adapterFactory.getSAKAdapter()!
      const result = await adapter.listTools()
      
      if (result._tag === 'Right') {
        return { _tag: 'Right', right: result.right }
      } else {
        return result
      }
    } catch (error) {
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  // ============================================================================
  // Hive Intelligence Integration Methods
  // ============================================================================

  async executeHiveSearch(
    query: string,
    metadata?: Record<string, unknown>
  ): Promise<Either<string, HiveSearchResult>> {
    try {
      await this.ensureAdapterConnected('hive')
      const adapter = this.adapterFactory.getHiveAdapter()!
      return await adapter.search(query, metadata)
    } catch (error) {
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async getHiveAnalytics(
    query: string,
    walletAddress?: string
  ): Promise<Either<string, HiveAnalyticsResult>> {
    try {
      await this.ensureAdapterConnected('hive')
      const adapter = this.adapterFactory.getHiveAdapter()!
      return await adapter.getAnalytics(query, walletAddress)
    } catch (error) {
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async getHivePortfolioAnalysis(
    walletAddress: string,
    additionalParams?: Record<string, unknown>
  ): Promise<Either<string, HiveAnalyticsResult>> {
    try {
      await this.ensureAdapterConnected('hive')
      const adapter = this.adapterFactory.getHiveAdapter()!
      return await adapter.getPortfolioAnalysis(walletAddress, additionalParams)
    } catch (error) {
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async getHiveCreditUsage(): Promise<Either<string, HiveCreditUsage>> {
    try {
      await this.ensureAdapterConnected('hive')
      const adapter = this.adapterFactory.getHiveAdapter()!
      return await adapter.getCreditUsage()
    } catch (error) {
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async getSeiNetworkData(): Promise<Either<string, HiveAnalyticsResult>> {
    try {
      await this.ensureAdapterConnected('hive')
      const adapter = this.adapterFactory.getHiveAdapter()!
      return await adapter.getSeiNetworkData()
    } catch (error) {
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async getSeiTokenData(symbol: string): Promise<Either<string, HiveAnalyticsResult>> {
    try {
      await this.ensureAdapterConnected('hive')
      const adapter = this.adapterFactory.getHiveAdapter()!
      return await adapter.getSeiTokenData(symbol)
    } catch (error) {
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async getCryptoMarketData(symbols: string[]): Promise<Either<string, HiveAnalyticsResult>> {
    try {
      await this.ensureAdapterConnected('hive')
      const adapter = this.adapterFactory.getHiveAdapter()!
      return await adapter.getCryptoMarketData(symbols)
    } catch (error) {
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async getSeiDeFiData(): Promise<Either<string, HiveAnalyticsResult>> {
    try {
      await this.ensureAdapterConnected('hive')
      const adapter = this.adapterFactory.getHiveAdapter()!
      return await adapter.getSeiDeFiData()
    } catch (error) {
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async getSeiWalletAnalysis(address: string): Promise<Either<string, HiveAnalyticsResult>> {
    try {
      await this.ensureAdapterConnected('hive')
      const adapter = this.adapterFactory.getHiveAdapter()!
      return await adapter.getSeiWalletAnalysis(address)
    } catch (error) {
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  // ============================================================================
  // MCP Protocol Integration Methods
  // ============================================================================

  async getMCPNetworkStatus(): Promise<Either<string, MCPNetworkStatus>> {
    try {
      await this.ensureAdapterConnected('mcp')
      const adapter = this.adapterFactory.getMCPAdapter()!
      return await adapter.getNetworkStatus()
    } catch (error) {
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async getMCPWalletBalance(address: string): Promise<Either<string, MCPWalletBalance>> {
    try {
      await this.ensureAdapterConnected('mcp')
      const adapter = this.adapterFactory.getMCPAdapter()!
      return await adapter.getWalletBalance(address)
    } catch (error) {
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async executeMCPTransaction(
    transactionRequest: Record<string, unknown>
  ): Promise<Either<string, MCPTransactionResult>> {
    try {
      await this.ensureAdapterConnected('mcp')
      const adapter = this.adapterFactory.getMCPAdapter()!
      return await adapter.sendTransaction(transactionRequest)
    } catch (error) {
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async queryMCPContract(
    contractAddress: string,
    query: Record<string, unknown>
  ): Promise<Either<string, MCPContractQueryResult>> {
    try {
      await this.ensureAdapterConnected('mcp')
      const adapter = this.adapterFactory.getMCPAdapter()!
      return await adapter.queryContract(contractAddress, query)
    } catch (error) {
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  // ============================================================================
  // Generic Adapter Action Execution
  // ============================================================================

  async executeAdapterAction(action: AdapterAction): Promise<Either<string, AdapterActionResult>> {
    const startTime = Date.now()
    
    try {
      let result: Either<string, unknown>
      
      switch (action.type) {
        case 'sak':
          result = await this.executeSAKAction(action.action, action.params)
          break
        case 'hive':
          if (action.action === 'search') {
            result = await this.executeHiveSearch(action.params.query as string, action.params.metadata as Record<string, unknown> | undefined)
          } else if (action.action === 'analytics') {
            result = await this.getHiveAnalytics(action.params.query as string, action.params.walletAddress as string | undefined)
          } else if (action.action === 'portfolio_analysis') {
            result = await this.getHivePortfolioAnalysis(action.params.walletAddress as string, action.params)
          } else if (action.action === 'credits') {
            result = await this.getHiveCreditUsage()
          } else if (action.action === 'sei_network_data') {
            result = await this.getSeiNetworkData()
          } else if (action.action === 'sei_token_data') {
            result = await this.getSeiTokenData(action.params.symbol as string)
          } else if (action.action === 'crypto_market_data') {
            result = await this.getCryptoMarketData(action.params.symbols as string[])
          } else if (action.action === 'sei_defi_data') {
            result = await this.getSeiDeFiData()
          } else if (action.action === 'sei_wallet_analysis') {
            result = await this.getSeiWalletAnalysis(action.params.address as string)
          } else {
            return { 
              _tag: 'Left', 
              left: `Unsupported Hive action: ${action.action}` 
            }
          }
          break
        case 'mcp':
          if (action.action === 'get_network_status') {
            result = await this.getMCPNetworkStatus()
          } else if (action.action === 'get_wallet_balance') {
            result = await this.getMCPWalletBalance(action.params.address as string)
          } else if (action.action === 'send_transaction') {
            result = await this.executeMCPTransaction(action.params)
          } else if (action.action === 'query_contract') {
            result = await this.queryMCPContract(action.params.contractAddress as string, action.params.query as Record<string, unknown>)
          } else {
            return { 
              _tag: 'Left', 
              left: `Unsupported MCP action: ${action.action}` 
            }
          }
          break
        default:
          return { 
            _tag: 'Left', 
            left: `Unsupported adapter type: ${action.type}` 
          }
      }
      
      const executionTime = Date.now() - startTime
      
      if (result._tag === 'Right') {
        const actionResult: AdapterActionResult = {
          success: true,
          data: result.right,
          metadata: {
            executionTime,
            adapterType: action.type,
            action: action.action,
            timestamp: Date.now(),
          }
        }
        return { _tag: 'Right', right: actionResult }
      } else {
        const actionResult: AdapterActionResult = {
          success: false,
          error: {
            code: 'ADAPTER_ACTION_FAILED',
            message: result.left,
          },
          metadata: {
            executionTime,
            adapterType: action.type,
            action: action.action,
            timestamp: Date.now(),
          }
        }
        return { _tag: 'Right', right: actionResult }
      }
    } catch (error) {
      const executionTime = Date.now() - startTime
      const actionResult: AdapterActionResult = {
        success: false,
        error: {
          code: 'ADAPTER_ACTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        },
        metadata: {
          executionTime,
          adapterType: action.type,
          action: action.action,
          timestamp: Date.now(),
        }
      }
      return { _tag: 'Right', right: actionResult }
    }
  }

  // ============================================================================
  // WebSocket Management
  // ============================================================================

  async connectWebSocket(sessionId: string): Promise<void> {
    try {
      await this.wsManager.connect(sessionId)
    } catch (error) {
      logger.error('Failed to connect WebSocket:', error)
      throw error
    }
  }

  async disconnectWebSocket(): Promise<void> {
    try {
      await this.wsManager.disconnect()
    } catch (error) {
      logger.error('Failed to disconnect WebSocket:', error)
      throw error
    }
  }

  isWebSocketConnected(): boolean {
    return this.wsManager.isConnected()
  }

  getWebSocketConnectionState() {
    return this.wsManager.getConnectionState()
  }

  async sendWebSocketMessage(message: unknown): Promise<void> {
    try {
      await this.wsManager.sendMessage(message)
    } catch (error) {
      logger.error('Failed to send WebSocket message:', error)
      throw error
    }
  }

  on(eventType: string, handler: (event: AgentStreamEvent) => void): () => void {
    return this.wsManager.on(eventType, handler)
  }

  off(eventType: string, handler: (event: AgentStreamEvent) => void): void {
    this.wsManager.off(eventType, handler)
  }

  // ============================================================================
  // Adapter Management
  // ============================================================================

  async getAdapterHealth(): Promise<Map<AdapterType, unknown>> {
    return await this.adapterFactory.getHealthStatus()
  }

  async connectAllAdapters(): Promise<void> {
    await this.adapterFactory.connectAll()
  }

  async disconnectAllAdapters(): Promise<void> {
    await this.adapterFactory.disconnectAll()
  }

  getAdapter(type: AdapterType) {
    return this.adapterFactory.getAdapter(type)
  }

  getAllAdapters() {
    return this.adapterFactory.getAllAdapters()
  }

  async createAdapter(type: AdapterType, config?: Record<string, unknown>) {
    const adapterConfig = config ? {
      apiEndpoint: config.apiEndpoint as string || this.config.apiEndpoint,
      timeout: config.timeout as number | undefined
    } : undefined
    return this.adapterFactory.createAdapter(type, adapterConfig)
  }

  async destroyAdapter(type: AdapterType): Promise<void> {
    await this.adapterFactory.destroyAdapter(type)
  }
}

// Singleton instance
let orchestratorInstance: Orchestrator | null = null

export function getOrchestrator(config?: OrchestratorConfig): Orchestrator {
  if (!orchestratorInstance && config) {
    orchestratorInstance = new Orchestrator(config)
  }
  
  if (!orchestratorInstance) {
    throw new Error('Orchestrator not initialized. Please provide config on first call.')
  }
  
  return orchestratorInstance
}