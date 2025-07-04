import { UserIntent, TaskResult, AgentStreamEvent, Either } from '@/types/agent'

// New adapter-related types
export interface AdapterAction {
  type: 'sak' | 'hive' | 'mcp'
  action: string
  params: Record<string, any>
  description: string
}

export interface SAKOperationResult<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  metadata?: {
    gasUsed?: number
    txHash?: string
    blockNumber?: number
    timestamp?: number
    dragonBallMessage?: string
  }
}

export interface HiveAnalyticsResult {
  insights: Array<{
    id: string
    type: string
    title: string
    description: string
    confidence: number
  }>
  recommendations: Array<{
    id: string
    type: string
    title: string
    priority: string
    expectedImpact: number
  }>
  metadata: {
    queryId: string
    creditsUsed: number
    timestamp: number
  }
}

export interface MCPNetworkStatus {
  blockNumber: number
  networkStatus: 'healthy' | 'congested' | 'offline'
  gasPrice: string
  validators: number
  totalSupply: string
}

export interface OrchestratorConfig {
  apiEndpoint: string
  wsEndpoint: string
  timeout?: number
}

export class Orchestrator {
  private config: OrchestratorConfig
  private ws: WebSocket | null = null
  private eventHandlers: Map<string, Set<(event: AgentStreamEvent) => void>> = new Map()

  constructor(config: OrchestratorConfig) {
    this.config = {
      timeout: 30000, // 30 seconds default
      ...config,
    }
  }

  async processIntent(intent: UserIntent): Promise<Either<string, TaskResult>> {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/process-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ intent }),
        signal: AbortSignal.timeout(this.config.timeout!),
      })

      if (!response.ok) {
        const error = await response.json()
        return { _tag: 'Left', left: error.message || 'Failed to process intent' }
      }

      const result = await response.json()
      return { _tag: 'Right', right: result }
    } catch (error) {
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  // ============================================================================
  // Sei Agent Kit Integration Methods
  // ============================================================================

  async executeSAKAction<T>(
    toolName: string,
    params: Record<string, any>,
    context?: Record<string, any>
  ): Promise<Either<string, SAKOperationResult<T>>> {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/sak/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ toolName, params, context }),
        signal: AbortSignal.timeout(this.config.timeout!),
      })

      if (!response.ok) {
        const error = await response.json()
        return { _tag: 'Left', left: error.message || 'Failed to execute SAK action' }
      }

      const result = await response.json()
      return { _tag: 'Right', right: result }
    } catch (error) {
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async listSAKTools(): Promise<Either<string, any[]>> {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/sak/tools`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.config.timeout!),
      })

      if (!response.ok) {
        const error = await response.json()
        return { _tag: 'Left', left: error.message || 'Failed to list SAK tools' }
      }

      const result = await response.json()
      return { _tag: 'Right', right: result.tools || [] }
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
    metadata?: Record<string, any>
  ): Promise<Either<string, any>> {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/hive/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, metadata }),
        signal: AbortSignal.timeout(this.config.timeout!),
      })

      if (!response.ok) {
        const error = await response.json()
        return { _tag: 'Left', left: error.message || 'Failed to execute Hive search' }
      }

      const result = await response.json()
      return { _tag: 'Right', right: result }
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
      const response = await fetch(`${this.config.apiEndpoint}/hive/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, walletAddress }),
        signal: AbortSignal.timeout(this.config.timeout!),
      })

      if (!response.ok) {
        const error = await response.json()
        return { _tag: 'Left', left: error.message || 'Failed to get Hive analytics' }
      }

      const result = await response.json()
      return { _tag: 'Right', right: result }
    } catch (error) {
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async getHivePortfolioAnalysis(
    walletAddress: string,
    additionalParams?: Record<string, any>
  ): Promise<Either<string, HiveAnalyticsResult>> {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/hive/portfolio-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress, ...additionalParams }),
        signal: AbortSignal.timeout(this.config.timeout!),
      })

      if (!response.ok) {
        const error = await response.json()
        return { _tag: 'Left', left: error.message || 'Failed to get Hive portfolio analysis' }
      }

      const result = await response.json()
      return { _tag: 'Right', right: result }
    } catch (error) {
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async getHiveCreditUsage(): Promise<Either<string, any>> {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/hive/credits`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.config.timeout!),
      })

      if (!response.ok) {
        const error = await response.json()
        return { _tag: 'Left', left: error.message || 'Failed to get Hive credit usage' }
      }

      const result = await response.json()
      return { _tag: 'Right', right: result }
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
      const response = await fetch(`${this.config.apiEndpoint}/mcp/network-status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.config.timeout!),
      })

      if (!response.ok) {
        const error = await response.json()
        return { _tag: 'Left', left: error.message || 'Failed to get MCP network status' }
      }

      const result = await response.json()
      return { _tag: 'Right', right: result }
    } catch (error) {
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async getMCPWalletBalance(address: string): Promise<Either<string, any>> {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/mcp/balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
        signal: AbortSignal.timeout(this.config.timeout!),
      })

      if (!response.ok) {
        const error = await response.json()
        return { _tag: 'Left', left: error.message || 'Failed to get MCP wallet balance' }
      }

      const result = await response.json()
      return { _tag: 'Right', right: result }
    } catch (error) {
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async executeMCPTransaction(
    transactionRequest: Record<string, any>
  ): Promise<Either<string, any>> {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/mcp/transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionRequest),
        signal: AbortSignal.timeout(this.config.timeout!),
      })

      if (!response.ok) {
        const error = await response.json()
        return { _tag: 'Left', left: error.message || 'Failed to execute MCP transaction' }
      }

      const result = await response.json()
      return { _tag: 'Right', right: result }
    } catch (error) {
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async queryMCPContract(
    contractAddress: string,
    query: Record<string, any>
  ): Promise<Either<string, any>> {
    try {
      const response = await fetch(`${this.config.apiEndpoint}/mcp/contract/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contractAddress, query }),
        signal: AbortSignal.timeout(this.config.timeout!),
      })

      if (!response.ok) {
        const error = await response.json()
        return { _tag: 'Left', left: error.message || 'Failed to query MCP contract' }
      }

      const result = await response.json()
      return { _tag: 'Right', right: result }
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

  async executeAdapterAction(action: AdapterAction): Promise<Either<string, any>> {
    switch (action.type) {
      case 'sak':
        return this.executeSAKAction(action.action, action.params)
      case 'hive':
        if (action.action === 'search') {
          return this.executeHiveSearch(action.params.query, action.params.metadata)
        } else if (action.action === 'analytics') {
          return this.getHiveAnalytics(action.params.query, action.params.walletAddress)
        } else if (action.action === 'portfolio_analysis') {
          return this.getHivePortfolioAnalysis(action.params.walletAddress, action.params)
        }
        break
      case 'mcp':
        if (action.action === 'get_network_status') {
          return this.getMCPNetworkStatus()
        } else if (action.action === 'get_wallet_balance') {
          return this.getMCPWalletBalance(action.params.address)
        } else if (action.action === 'send_transaction') {
          return this.executeMCPTransaction(action.params)
        } else if (action.action === 'query_contract') {
          return this.queryMCPContract(action.params.contractAddress, action.params.query)
        }
        break
    }
    
    return { 
      _tag: 'Left', 
      left: `Unsupported adapter action: ${action.type}.${action.action}` 
    }
  }

  connectWebSocket(sessionId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    this.ws = new WebSocket(`${this.config.wsEndpoint}/chat/${sessionId}`)

    this.ws.onopen = () => {
      console.log('WebSocket connected to orchestrator')
    }

    this.ws.onmessage = (event) => {
      try {
        const streamEvent: AgentStreamEvent = JSON.parse(event.data)
        this.emitEvent(streamEvent.type, streamEvent)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    this.ws.onclose = () => {
      console.log('WebSocket disconnected')
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (sessionId) {
          this.connectWebSocket(sessionId)
        }
      }, 5000)
    }
  }

  disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  on(eventType: string, handler: (event: AgentStreamEvent) => void): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set())
    }
    
    this.eventHandlers.get(eventType)!.add(handler)

    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(eventType)?.delete(handler)
    }
  }

  private emitEvent(eventType: string, event: AgentStreamEvent): void {
    const handlers = this.eventHandlers.get(eventType) || new Set()
    handlers.forEach(handler => {
      try {
        handler(event)
      } catch (error) {
        console.error('Event handler error:', error)
      }
    })
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