import { Either } from '../../types/agent'
import { 
  AdapterConfig, 
  AdapterHealth, 
  SeiAgentKitAdapter, 
  SAKOperationResult, 
  SAKTool 
} from './types'
import { logger } from '../logger'

export class SeiAgentKitAdapterImpl implements SeiAgentKitAdapter {
  public readonly name = 'SeiAgentKit'
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
      // Test connection by listing tools
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
      // Test basic functionality by attempting to list tools
      const toolsResult = await this.listTools()
      const latencyMs = Date.now() - startTime
      
      this.lastHealthCheck = Date.now()
      
      if (toolsResult._tag === 'Right') {
        return {
          _tag: 'Right',
          right: {
            status: 'healthy',
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

  async executeTool<T>(
    toolName: string,
    params: Record<string, any>,
    context?: Record<string, any>
  ): Promise<Either<string, SAKOperationResult<T>>> {
    try {
      logger.info(`Executing SAK tool: ${toolName}`, { params, context })
      
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
        this.errorCount++
        logger.error(`SAK tool execution failed: ${toolName}`, error)
        return { 
          _tag: 'Left', 
          left: error.message || `Failed to execute SAK tool: ${toolName}` 
        }
      }

      const result = await response.json()
      
      // Add dragon ball message if the operation was successful
      if (result.success && !result.metadata?.dragonBallMessage) {
        result.metadata = {
          ...result.metadata,
          dragonBallMessage: this.generateDragonBallMessage(toolName)
        }
      }
      
      logger.info(`SAK tool executed successfully: ${toolName}`, result)
      return { _tag: 'Right', right: result }
    } catch (error) {
      this.errorCount++
      logger.error(`SAK tool execution error: ${toolName}`, error)
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async listTools(): Promise<Either<string, SAKTool[]>> {
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
        this.errorCount++
        return { 
          _tag: 'Left', 
          left: error.message || 'Failed to list SAK tools' 
        }
      }

      const result = await response.json()
      const tools = result.tools || []
      
      logger.info(`Listed ${tools.length} SAK tools`)
      return { _tag: 'Right', right: tools }
    } catch (error) {
      this.errorCount++
      logger.error('Failed to list SAK tools:', error)
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async getToolDescription(toolName: string): Promise<Either<string, SAKTool>> {
    try {
      const toolsResult = await this.listTools()
      
      if (toolsResult._tag === 'Left') {
        return toolsResult
      }
      
      const tool = toolsResult.right.find(t => t.name === toolName)
      
      if (!tool) {
        return { 
          _tag: 'Left', 
          left: `Tool not found: ${toolName}` 
        }
      }
      
      return { _tag: 'Right', right: tool }
    } catch (error) {
      this.errorCount++
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  private generateDragonBallMessage(toolName: string): string {
    // Generate themed messages based on tool type
    const dragonBallMessages = {
      // Trading related
      swap: [
        "The dragon's wisdom guides your swap! Power level over 9000! 🐉",
        "Goku would be proud of this trade! Kamehameha! 💥",
        "Your trading power is incredible! The dragon balls are aligned! ✨"
      ],
      stake: [
        "Your coins are now training in the hyperbolic time chamber! 🏃‍♂️",
        "Staking complete! Your rewards will grow stronger than a Super Saiyan! 💪",
        "The dragon has blessed your staking! Prepare for legendary gains! 🌟"
      ],
      unstake: [
        "Your coins have completed their training! Time to collect the power! 🎯",
        "Unstaking successful! Your assets are ready for battle! ⚔️",
        "The dragon has released your coins! Use this power wisely! 🔥"
      ],
      // Default messages
      default: [
        "The dragon's power flows through this transaction! 🐉",
        "Your blockchain adventure continues! The dragon balls approve! ✨",
        "Another successful mission! The dragon is pleased! 🌟"
      ]
    }

    // Determine message category
    const toolLower = toolName.toLowerCase()
    let category = 'default'
    
    if (toolLower.includes('swap') || toolLower.includes('trade')) {
      category = 'swap'
    } else if (toolLower.includes('stake') && !toolLower.includes('unstake')) {
      category = 'stake'
    } else if (toolLower.includes('unstake')) {
      category = 'unstake'
    }

    const messages = dragonBallMessages[category as keyof typeof dragonBallMessages]
    if (!messages || messages.length === 0) {
      return dragonBallMessages.default[0]!
    }
    return messages[Math.floor(Math.random() * messages.length)]!
  }
}

export { SeiAgentKitAdapterImpl as SeiAgentKitAdapter }