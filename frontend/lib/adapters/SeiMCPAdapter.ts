import { Either } from '@types/agent'
import { 
  AdapterConfig, 
  AdapterHealth, 
  SeiMCPAdapter, 
  MCPNetworkStatus, 
  MCPWalletBalance, 
  MCPTransactionResult, 
  MCPContractQueryResult 
} from './types'
import { logger } from '../logger'

export class SeiMCPAdapterImpl implements SeiMCPAdapter {
  public readonly name = 'SeiMCP'
  public readonly version = '1.0.0'
  
  private config: AdapterConfig
  private connected = false
  private lastHealthCheck = 0
  private errorCount = 0

  constructor(config: AdapterConfig) {
    this.config = {
      timeout: 30000, // 30 seconds default
      ...config,
    }
  }

  isConnected(): boolean {
    return this.connected
  }

  async connect(): Promise<void> {
    try {
      // Test connection by checking network status
      const healthResult = await this.getHealth()
      if (healthResult._tag === 'Right') {
        this.connected = true
        logger.info(`${this.name} adapter connected successfully`)
      } else {
        throw new Error(`Connection failed: ${healthResult.left}`)
      }
    } catch (error) {
      this.connected = false
      this.errorCount++
      logger.error(`${this.name} adapter connection failed:`, error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false
    logger.info(`${this.name} adapter disconnected`)
  }

  async getHealth(): Promise<Either<string, AdapterHealth>> {
    const startTime = Date.now()
    
    try {
      // Test basic functionality by checking network status
      const networkResult = await this.getNetworkStatus()
      const latencyMs = Date.now() - startTime
      
      this.lastHealthCheck = Date.now()
      
      if (networkResult._tag === 'Right') {
        const networkStatus = networkResult.right
        let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
        
        // Determine health based on network status
        if (networkStatus.networkStatus === 'offline') {
          status = 'unhealthy'
        } else if (networkStatus.networkStatus === 'congested') {
          status = 'degraded'
        }
        
        return {
          _tag: 'Right',
          right: {
            status,
            lastChecked: this.lastHealthCheck,
            latencyMs,
            errorCount: this.errorCount,
          }
        }
      } else {
        return {
          _tag: 'Right',
          right: {
            status: 'unhealthy',
            lastChecked: this.lastHealthCheck,
            latencyMs,
            errorCount: this.errorCount,
          }
        }
      }
    } catch (error) {
      this.errorCount++
      return {
        _tag: 'Left',
        left: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  async getNetworkStatus(): Promise<Either<string, MCPNetworkStatus>> {
    try {
      logger.info('Getting MCP network status')
      
      const response = await fetch(`${this.config.apiEndpoint}/mcp/network-status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(this.config.timeout!),
      })

      if (!response.ok) {
        const error = await response.json()
        this.errorCount++
        logger.error('MCP network status failed', error)
        return { 
          _tag: 'Left', 
          left: error.message || 'Failed to get MCP network status' 
        }
      }

      const result = await response.json()
      
      // Ensure the result matches our interface
      const networkStatus: MCPNetworkStatus = {
        blockNumber: result.blockNumber || 0,
        networkStatus: result.networkStatus || 'offline',
        gasPrice: result.gasPrice || '0',
        validators: result.validators || 0,
        totalSupply: result.totalSupply || '0',
        latestBlockTime: result.latestBlockTime || Date.now(),
        nodeVersion: result.nodeVersion || 'unknown',
      }
      
      logger.info('MCP network status retrieved', {
        blockNumber: networkStatus.blockNumber,
        networkStatus: networkStatus.networkStatus,
        validators: networkStatus.validators
      })
      
      return { _tag: 'Right', right: networkStatus }
    } catch (error) {
      this.errorCount++
      logger.error('MCP network status error', error)
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async getWalletBalance(address: string): Promise<Either<string, MCPWalletBalance>> {
    try {
      logger.info(`Getting MCP wallet balance: ${address}`)
      
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
        this.errorCount++
        logger.error(`MCP wallet balance failed: ${address}`, error)
        return { 
          _tag: 'Left', 
          left: error.message || 'Failed to get MCP wallet balance' 
        }
      }

      const result = await response.json()
      
      // Ensure the result matches our interface
      const walletBalance: MCPWalletBalance = {
        address: result.address || address,
        balance: result.balance || '0',
        tokens: result.tokens || [],
        lastUpdated: result.lastUpdated || Date.now(),
      }
      
      logger.info(`MCP wallet balance retrieved: ${address}`, {
        balance: walletBalance.balance,
        tokenCount: walletBalance.tokens.length
      })
      
      return { _tag: 'Right', right: walletBalance }
    } catch (error) {
      this.errorCount++
      logger.error(`MCP wallet balance error: ${address}`, error)
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async sendTransaction(
    transactionRequest: Record<string, any>
  ): Promise<Either<string, MCPTransactionResult>> {
    try {
      logger.info('Sending MCP transaction', transactionRequest)
      
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
        this.errorCount++
        logger.error('MCP transaction failed', error)
        return { 
          _tag: 'Left', 
          left: error.message || 'Failed to execute MCP transaction' 
        }
      }

      const result = await response.json()
      
      // Ensure the result matches our interface
      const transactionResult: MCPTransactionResult = {
        txHash: result.txHash || '',
        blockNumber: result.blockNumber,
        success: result.success !== false,
        gasUsed: result.gasUsed,
        error: result.error,
        events: result.events || [],
      }
      
      logger.info('MCP transaction completed', {
        txHash: transactionResult.txHash,
        success: transactionResult.success,
        gasUsed: transactionResult.gasUsed
      })
      
      return { _tag: 'Right', right: transactionResult }
    } catch (error) {
      this.errorCount++
      logger.error('MCP transaction error', error)
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async queryContract(
    contractAddress: string,
    query: Record<string, any>
  ): Promise<Either<string, MCPContractQueryResult>> {
    try {
      logger.info(`Querying MCP contract: ${contractAddress}`, query)
      
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
        this.errorCount++
        logger.error(`MCP contract query failed: ${contractAddress}`, error)
        return { 
          _tag: 'Left', 
          left: error.message || 'Failed to query MCP contract' 
        }
      }

      const result = await response.json()
      
      // Ensure the result matches our interface
      const queryResult: MCPContractQueryResult = {
        result: result.result,
        blockNumber: result.blockNumber || 0,
        gasUsed: result.gasUsed,
        timestamp: result.timestamp || Date.now(),
      }
      
      logger.info(`MCP contract query completed: ${contractAddress}`, {
        blockNumber: queryResult.blockNumber,
        gasUsed: queryResult.gasUsed
      })
      
      return { _tag: 'Right', right: queryResult }
    } catch (error) {
      this.errorCount++
      logger.error(`MCP contract query error: ${contractAddress}`, error)
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async estimateGas(
    transactionRequest: Record<string, any>
  ): Promise<Either<string, { gasEstimate: number; gasPrice: string }>> {
    try {
      logger.info('Estimating MCP gas', transactionRequest)
      
      const response = await fetch(`${this.config.apiEndpoint}/mcp/gas-estimate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionRequest),
        signal: AbortSignal.timeout(this.config.timeout!),
      })

      if (!response.ok) {
        const error = await response.json()
        this.errorCount++
        logger.error('MCP gas estimation failed', error)
        return { 
          _tag: 'Left', 
          left: error.message || 'Failed to estimate MCP gas' 
        }
      }

      const result = await response.json()
      
      const gasEstimate = {
        gasEstimate: result.gasEstimate || 0,
        gasPrice: result.gasPrice || '0',
      }
      
      logger.info('MCP gas estimation completed', gasEstimate)
      
      return { _tag: 'Right', right: gasEstimate }
    } catch (error) {
      this.errorCount++
      logger.error('MCP gas estimation error', error)
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }
}

export { SeiMCPAdapterImpl as SeiMCPAdapter }