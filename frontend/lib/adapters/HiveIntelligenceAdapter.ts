import { Either } from '../../types/agent'
import { 
  AdapterConfig, 
  AdapterHealth, 
  HiveIntelligenceAdapter, 
  HiveAnalyticsResult, 
  HiveSearchResult, 
  HiveCreditUsage 
} from './types'
import { logger } from '../logger'

export class HiveIntelligenceAdapterImpl implements HiveIntelligenceAdapter {
  public readonly name = 'HiveIntelligence'
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
      // Test connection by checking credit usage
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
      // Test basic functionality by checking credit usage
      const creditResult = await this.getCreditUsage()
      const latencyMs = Date.now() - startTime
      
      this.lastHealthCheck = Date.now()
      
      if (creditResult._tag === 'Right') {
        const health: AdapterHealth = {
          status: 'healthy',
          lastChecked: this.lastHealthCheck,
          latencyMs,
          errorCount: this.errorCount,
        }
        
        // Check if we're running low on credits
        const credits = creditResult.right
        if (credits.remainingCredits < 100) {
          health.status = 'degraded'
        }
        
        return { _tag: 'Right', right: health }
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

  async search(
    query: string,
    metadata?: Record<string, any>
  ): Promise<Either<string, HiveSearchResult>> {
    try {
      logger.info(`Executing Hive search: ${query}`, { metadata })
      
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
        this.errorCount++
        logger.error(`Hive search failed: ${query}`, error)
        return { 
          _tag: 'Left', 
          left: error.message || 'Failed to execute Hive search' 
        }
      }

      const result = await response.json()
      
      // Transform the result to match our interface
      const searchResult: HiveSearchResult = {
        results: result.results || [],
        totalResults: result.totalResults || 0,
        creditsUsed: result.creditsUsed || 0,
        processingTime: result.processingTime || 0,
      }
      
      logger.info(`Hive search completed: ${query}`, {
        resultsCount: searchResult.results.length,
        creditsUsed: searchResult.creditsUsed
      })
      
      return { _tag: 'Right', right: searchResult }
    } catch (error) {
      this.errorCount++
      logger.error(`Hive search error: ${query}`, error)
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async getAnalytics(
    query: string,
    walletAddress?: string
  ): Promise<Either<string, HiveAnalyticsResult>> {
    try {
      logger.info(`Getting Hive analytics: ${query}`, { walletAddress })
      
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
        this.errorCount++
        logger.error(`Hive analytics failed: ${query}`, error)
        return { 
          _tag: 'Left', 
          left: error.message || 'Failed to get Hive analytics' 
        }
      }

      const result = await response.json()
      
      // Ensure the result matches our interface
      const analyticsResult: HiveAnalyticsResult = {
        insights: result.insights || [],
        recommendations: result.recommendations || [],
        metadata: {
          queryId: result.metadata?.queryId || '',
          creditsUsed: result.metadata?.creditsUsed || 0,
          timestamp: result.metadata?.timestamp || Date.now(),
        }
      }
      
      logger.info(`Hive analytics completed: ${query}`, {
        insightsCount: analyticsResult.insights.length,
        recommendationsCount: analyticsResult.recommendations.length,
        creditsUsed: analyticsResult.metadata.creditsUsed
      })
      
      return { _tag: 'Right', right: analyticsResult }
    } catch (error) {
      this.errorCount++
      logger.error(`Hive analytics error: ${query}`, error)
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async getPortfolioAnalysis(
    walletAddress: string,
    additionalParams?: Record<string, any>
  ): Promise<Either<string, HiveAnalyticsResult>> {
    try {
      logger.info(`Getting Hive portfolio analysis: ${walletAddress}`, additionalParams)
      
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
        this.errorCount++
        logger.error(`Hive portfolio analysis failed: ${walletAddress}`, error)
        return { 
          _tag: 'Left', 
          left: error.message || 'Failed to get Hive portfolio analysis' 
        }
      }

      const result = await response.json()
      
      // Ensure the result matches our interface
      const analysisResult: HiveAnalyticsResult = {
        insights: result.insights || [],
        recommendations: result.recommendations || [],
        metadata: {
          queryId: result.metadata?.queryId || '',
          creditsUsed: result.metadata?.creditsUsed || 0,
          timestamp: result.metadata?.timestamp || Date.now(),
        }
      }
      
      logger.info(`Hive portfolio analysis completed: ${walletAddress}`, {
        insightsCount: analysisResult.insights.length,
        recommendationsCount: analysisResult.recommendations.length,
        creditsUsed: analysisResult.metadata.creditsUsed
      })
      
      return { _tag: 'Right', right: analysisResult }
    } catch (error) {
      this.errorCount++
      logger.error(`Hive portfolio analysis error: ${walletAddress}`, error)
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async getCreditUsage(): Promise<Either<string, HiveCreditUsage>> {
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
        this.errorCount++
        logger.error('Hive credit usage failed', error)
        return { 
          _tag: 'Left', 
          left: error.message || 'Failed to get Hive credit usage' 
        }
      }

      const result = await response.json()
      
      // Ensure the result matches our interface
      const creditUsage: HiveCreditUsage = {
        totalCredits: result.totalCredits || 0,
        usedCredits: result.usedCredits || 0,
        remainingCredits: result.remainingCredits || 0,
        billingPeriod: {
          start: result.billingPeriod?.start || '',
          end: result.billingPeriod?.end || '',
        },
        usage: result.usage || [],
      }
      
      logger.info('Hive credit usage retrieved', {
        remainingCredits: creditUsage.remainingCredits,
        usedCredits: creditUsage.usedCredits
      })
      
      return { _tag: 'Right', right: creditUsage }
    } catch (error) {
      this.errorCount++
      logger.error('Hive credit usage error', error)
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async getSeiNetworkData(): Promise<Either<string, HiveAnalyticsResult>> {
    try {
      const query = "Get SEI network status including current validators, staking information, network health metrics, total supply, active validators, and recent network performance data"
      
      logger.info('Getting SEI network data via Hive Intelligence')
      
      const response = await fetch(`${this.config.apiEndpoint}/hive/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, context: 'sei_network' }),
        signal: AbortSignal.timeout(this.config.timeout!),
      })

      if (!response.ok) {
        const error = await response.json()
        this.errorCount++
        logger.error('SEI network data request failed', error)
        return { 
          _tag: 'Left', 
          left: error.message || 'Failed to get SEI network data' 
        }
      }

      const result = await response.json()
      
      const analyticsResult: HiveAnalyticsResult = {
        insights: result.insights || [],
        recommendations: result.recommendations || [],
        metadata: {
          queryId: result.metadata?.queryId || '',
          creditsUsed: result.metadata?.creditsUsed || 0,
          timestamp: result.metadata?.timestamp || Date.now(),
        }
      }
      
      logger.info('SEI network data retrieved successfully', {
        insightsCount: analyticsResult.insights.length,
        creditsUsed: analyticsResult.metadata.creditsUsed
      })
      
      return { _tag: 'Right', right: analyticsResult }
    } catch (error) {
      this.errorCount++
      logger.error('SEI network data error', error)
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async getSeiTokenData(symbol: string): Promise<Either<string, HiveAnalyticsResult>> {
    try {
      const query = `Get comprehensive SEI token data for ${symbol} including current price, trading volume, market cap, price history, liquidity metrics, and token distribution analysis`
      
      logger.info(`Getting SEI token data for ${symbol} via Hive Intelligence`)
      
      const response = await fetch(`${this.config.apiEndpoint}/hive/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, context: 'sei_token', symbol }),
        signal: AbortSignal.timeout(this.config.timeout!),
      })

      if (!response.ok) {
        const error = await response.json()
        this.errorCount++
        logger.error(`SEI token data request failed for ${symbol}`, error)
        return { 
          _tag: 'Left', 
          left: error.message || `Failed to get SEI token data for ${symbol}` 
        }
      }

      const result = await response.json()
      
      const analyticsResult: HiveAnalyticsResult = {
        insights: result.insights || [],
        recommendations: result.recommendations || [],
        metadata: {
          queryId: result.metadata?.queryId || '',
          creditsUsed: result.metadata?.creditsUsed || 0,
          timestamp: result.metadata?.timestamp || Date.now(),
        }
      }
      
      logger.info(`SEI token data retrieved successfully for ${symbol}`, {
        insightsCount: analyticsResult.insights.length,
        creditsUsed: analyticsResult.metadata.creditsUsed
      })
      
      return { _tag: 'Right', right: analyticsResult }
    } catch (error) {
      this.errorCount++
      logger.error(`SEI token data error for ${symbol}`, error)
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async getCryptoMarketData(symbols: string[]): Promise<Either<string, HiveAnalyticsResult>> {
    try {
      const symbolsList = symbols.join(', ')
      const query = `Get comprehensive crypto market data for multiple symbols: ${symbolsList}. Include current prices, 24h trading volumes, market caps, price changes, technical indicators, and market sentiment analysis`
      
      logger.info(`Getting crypto market data for symbols: ${symbolsList}`)
      
      const response = await fetch(`${this.config.apiEndpoint}/hive/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, context: 'crypto_market', symbols }),
        signal: AbortSignal.timeout(this.config.timeout!),
      })

      if (!response.ok) {
        const error = await response.json()
        this.errorCount++
        logger.error(`Crypto market data request failed for symbols: ${symbolsList}`, error)
        return { 
          _tag: 'Left', 
          left: error.message || `Failed to get crypto market data for symbols: ${symbolsList}` 
        }
      }

      const result = await response.json()
      
      const analyticsResult: HiveAnalyticsResult = {
        insights: result.insights || [],
        recommendations: result.recommendations || [],
        metadata: {
          queryId: result.metadata?.queryId || '',
          creditsUsed: result.metadata?.creditsUsed || 0,
          timestamp: result.metadata?.timestamp || Date.now(),
        }
      }
      
      logger.info(`Crypto market data retrieved successfully for ${symbols.length} symbols`, {
        insightsCount: analyticsResult.insights.length,
        creditsUsed: analyticsResult.metadata.creditsUsed
      })
      
      return { _tag: 'Right', right: analyticsResult }
    } catch (error) {
      this.errorCount++
      logger.error(`Crypto market data error for symbols: ${symbols.join(', ')}`, error)
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async getSeiDeFiData(): Promise<Either<string, HiveAnalyticsResult>> {
    try {
      const query = "Get comprehensive SEI DeFi ecosystem data including active protocols, total value locked (TVL), yield farming opportunities, liquidity pools, governance tokens, and risk assessments for major DeFi protocols on the SEI network"
      
      logger.info('Getting SEI DeFi data via Hive Intelligence')
      
      const response = await fetch(`${this.config.apiEndpoint}/hive/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, context: 'sei_defi' }),
        signal: AbortSignal.timeout(this.config.timeout!),
      })

      if (!response.ok) {
        const error = await response.json()
        this.errorCount++
        logger.error('SEI DeFi data request failed', error)
        return { 
          _tag: 'Left', 
          left: error.message || 'Failed to get SEI DeFi data' 
        }
      }

      const result = await response.json()
      
      const analyticsResult: HiveAnalyticsResult = {
        insights: result.insights || [],
        recommendations: result.recommendations || [],
        metadata: {
          queryId: result.metadata?.queryId || '',
          creditsUsed: result.metadata?.creditsUsed || 0,
          timestamp: result.metadata?.timestamp || Date.now(),
        }
      }
      
      logger.info('SEI DeFi data retrieved successfully', {
        insightsCount: analyticsResult.insights.length,
        recommendationsCount: analyticsResult.recommendations.length,
        creditsUsed: analyticsResult.metadata.creditsUsed
      })
      
      return { _tag: 'Right', right: analyticsResult }
    } catch (error) {
      this.errorCount++
      logger.error('SEI DeFi data error', error)
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  async getSeiWalletAnalysis(address: string): Promise<Either<string, HiveAnalyticsResult>> {
    try {
      const query = `Analyze SEI wallet ${address} including token holdings, transaction history, DeFi participation, staking activities, portfolio performance, risk profile, and personalized recommendations for optimization`
      
      logger.info(`Getting SEI wallet analysis for ${address}`)
      
      const response = await fetch(`${this.config.apiEndpoint}/hive/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, context: 'sei_wallet', walletAddress: address }),
        signal: AbortSignal.timeout(this.config.timeout!),
      })

      if (!response.ok) {
        const error = await response.json()
        this.errorCount++
        logger.error(`SEI wallet analysis request failed for ${address}`, error)
        return { 
          _tag: 'Left', 
          left: error.message || `Failed to get SEI wallet analysis for ${address}` 
        }
      }

      const result = await response.json()
      
      const analyticsResult: HiveAnalyticsResult = {
        insights: result.insights || [],
        recommendations: result.recommendations || [],
        metadata: {
          queryId: result.metadata?.queryId || '',
          creditsUsed: result.metadata?.creditsUsed || 0,
          timestamp: result.metadata?.timestamp || Date.now(),
        }
      }
      
      logger.info(`SEI wallet analysis retrieved successfully for ${address}`, {
        insightsCount: analyticsResult.insights.length,
        recommendationsCount: analyticsResult.recommendations.length,
        creditsUsed: analyticsResult.metadata.creditsUsed
      })
      
      return { _tag: 'Right', right: analyticsResult }
    } catch (error) {
      this.errorCount++
      logger.error(`SEI wallet analysis error for ${address}`, error)
      return { 
        _tag: 'Left', 
        left: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }
}

export { HiveIntelligenceAdapterImpl as HiveIntelligenceAdapter }