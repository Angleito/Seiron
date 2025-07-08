import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import { EventEmitter } from 'events';
import axios, { AxiosInstance } from 'axios';
import { OpenAI } from 'openai';
import { HiveIntelligenceAdapter as IHiveIntelligenceAdapter } from '../services/SeiIntegrationService';
import type {
  HiveResponse,
  HiveQueryMetadata,
  HiveAnalyticsResult,
  HiveSearchResult,
  HiveInsight,
  HiveRecommendation
} from '../services/SeiIntegrationService';
import logger from '../utils/logger';

/**
 * Real HiveIntelligenceAdapter Implementation
 * 
 * This adapter provides AI-powered blockchain search and analytics using OpenAI
 * for natural language processing and intelligent insights generation.
 */
export class HiveIntelligenceAdapter extends EventEmitter implements IHiveIntelligenceAdapter {
  private openai: OpenAI;
  private axiosInstance: AxiosInstance;
  private creditUsage: {
    usedCredits: number;
    totalCredits: number;
    remainingCredits: number;
  };
  private rateLimiter: Map<string, number[]> = new Map();
  private cache: Map<string, { data: any; expiresAt: number }> = new Map();

  constructor(private config: {
    openaiApiKey: string;
    baseUrl?: string;
    maxRequestsPerMinute?: number;
    cacheEnabled?: boolean;
    cacheTTL?: number;
  }) {
    super();
    
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey
    });

    this.axiosInstance = axios.create({
      baseURL: config.baseUrl || 'https://api.dexscreener.com/latest',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Seiron/1.0.0 HiveIntelligence'
      }
    });

    this.creditUsage = {
      usedCredits: 0,
      totalCredits: 10000,
      remainingCredits: 10000
    };

    // Setup cache cleanup
    if (config.cacheEnabled !== false) {
      setInterval(() => this.cleanupCache(), 60000); // Clean every minute
    }
  }

  /**
   * Perform AI-powered search on blockchain data
   */
  public search = (
    query: string,
    metadata?: HiveQueryMetadata
  ): TE.TaskEither<Error, HiveResponse> => {
    const cacheKey = this.getCacheKey('search', query, metadata);
    
    // Check cache first
    if (this.config.cacheEnabled !== false) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return TE.right(cached);
      }
    }

    return pipe(
      this.checkRateLimit('search'),
      TE.chain(() => this.performSearch(query, metadata)),
      TE.map(results => {
        const response: HiveResponse = {
          data: results
        };
        
        // Cache the response
        if (this.config.cacheEnabled !== false) {
          this.setInCache(cacheKey, response);
        }
        
        // Update credit usage
        this.updateCreditUsage(results.length * 10);
        
        return response;
      }),
      TE.mapLeft(error => {
        logger.error('Hive search failed:', error);
        return error;
      })
    );
  };

  /**
   * Get AI-powered analytics and insights
   */
  public getAnalytics = (
    query: string,
    metadata?: HiveQueryMetadata
  ): TE.TaskEither<Error, HiveResponse> => {
    const cacheKey = this.getCacheKey('analytics', query, metadata);
    
    // Check cache first
    if (this.config.cacheEnabled !== false) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return TE.right(cached);
      }
    }

    return pipe(
      this.checkRateLimit('analytics'),
      TE.chain(() => this.performAnalytics(query, metadata)),
      TE.map(analytics => {
        const response: HiveResponse = {
          data: analytics
        };
        
        // Cache the response
        if (this.config.cacheEnabled !== false) {
          this.setInCache(cacheKey, response);
        }
        
        // Update credit usage
        this.updateCreditUsage(50);
        
        return response;
      }),
      TE.mapLeft(error => {
        logger.error('Hive analytics failed:', error);
        return error;
      })
    );
  };

  /**
   * Install Hive plugin
   */
  public installHivePlugin = (): TE.TaskEither<Error, void> => {
    return TE.tryCatch(
      async () => {
        // Test OpenAI connection
        await this.openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [{ role: 'user', content: 'Test connection' }],
          max_tokens: 10
        });
        
        logger.info('Hive Intelligence adapter initialized successfully');
        this.emit('hive:initialized');
      },
      error => new Error(`Failed to initialize Hive Intelligence: ${error}`)
    );
  };

  /**
   * Get credit usage
   */
  public getCreditUsage = (): TE.TaskEither<Error, {
    usedCredits: number;
    totalCredits: number;
    remainingCredits: number;
  }> => {
    return TE.right(this.creditUsage);
  };

  // ============================================================================
  // Private Implementation Methods
  // ============================================================================

  /**
   * Perform the actual search using AI
   */
  private performSearch = async (
    query: string,
    metadata?: HiveQueryMetadata
  ): Promise<HiveSearchResult[]> => {
    try {
      // Get blockchain data from external sources
      const blockchainData = await this.fetchBlockchainData(metadata?.walletAddress);
      
      // Use AI to analyze and search
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are a blockchain data analyst specializing in the Sei Network. 
                     Analyze the provided data and respond to search queries with relevant insights.
                     Format your response as a JSON array of search results.`
          },
          {
            role: 'user',
            content: `Query: ${query}\n\nData: ${JSON.stringify(blockchainData)}\n\n
                     Provide search results as JSON with this structure:
                     [{
                       "id": "unique-id",
                       "title": "Result title",
                       "description": "Detailed description",
                       "type": "transaction|address|token|protocol|event",
                       "chain": "sei",
                       "relevanceScore": 0-100,
                       "data": {},
                       "timestamp": "ISO-8601"
                     }]`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 2000
      });

      const response = JSON.parse(completion.choices[0].message.content || '{}');
      return response.results || [];
    } catch (error) {
      logger.error('AI search failed:', error);
      throw error;
    }
  };

  /**
   * Perform analytics using AI
   */
  private performAnalytics = async (
    query: string,
    metadata?: HiveQueryMetadata
  ): Promise<HiveAnalyticsResult> => {
    try {
      // Get comprehensive blockchain data
      const blockchainData = await this.fetchBlockchainData(metadata?.walletAddress);
      const marketData = await this.fetchMarketData();
      
      // Use AI to generate analytics
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are a blockchain analytics expert specializing in DeFi and the Sei Network.
                     Provide comprehensive analytics, insights, and recommendations based on the data.
                     Focus on risk analysis, yield opportunities, and market trends.`
          },
          {
            role: 'user',
            content: `Query: ${query}\n\nBlockchain Data: ${JSON.stringify(blockchainData)}\n\n
                     Market Data: ${JSON.stringify(marketData)}\n\n
                     Provide analytics as JSON with this structure:
                     {
                       "insights": [{
                         "id": "unique-id",
                         "type": "trend|anomaly|opportunity|risk|correlation",
                         "title": "Insight title",
                         "description": "Detailed description",
                         "confidence": 0-100,
                         "data": {}
                       }],
                       "recommendations": [{
                         "id": "unique-id",
                         "type": "buy|sell|hold|monitor|optimize",
                         "title": "Recommendation title",
                         "description": "Detailed description",
                         "priority": "high|medium|low",
                         "expectedImpact": 0-100,
                         "actionItems": []
                       }]
                     }`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
        max_tokens: 3000
      });

      const response = JSON.parse(completion.choices[0].message.content || '{}');
      return {
        insights: response.insights || [],
        recommendations: response.recommendations || []
      };
    } catch (error) {
      logger.error('AI analytics failed:', error);
      throw error;
    }
  };

  /**
   * Fetch blockchain data from external sources
   */
  private fetchBlockchainData = async (walletAddress?: string): Promise<any> => {
    try {
      const data: any = {};
      
      // Fetch token data from DexScreener
      try {
        const tokenResponse = await this.axiosInstance.get('/dex/search', {
          params: { q: 'sei' }
        });
        data.tokens = tokenResponse.data.pairs || [];
      } catch (error) {
        logger.warn('Failed to fetch token data:', error);
      }
      
      // If wallet address provided, fetch wallet-specific data
      if (walletAddress) {
        // This would typically connect to Sei Network RPC
        // For now, we'll return mock data structure
        data.wallet = {
          address: walletAddress,
          // Additional wallet data would be fetched here
        };
      }
      
      return data;
    } catch (error) {
      logger.error('Failed to fetch blockchain data:', error);
      return {};
    }
  };

  /**
   * Fetch market data
   */
  private fetchMarketData = async (): Promise<any> => {
    try {
      // Fetch market data from various sources
      // This is a simplified version - real implementation would aggregate multiple sources
      const response = await this.axiosInstance.get('/dex/tokens/sei');
      return response.data || {};
    } catch (error) {
      logger.warn('Failed to fetch market data:', error);
      return {};
    }
  };

  /**
   * Check rate limit
   */
  private checkRateLimit = (operation: string): TE.TaskEither<Error, void> => {
    const maxRequests = this.config.maxRequestsPerMinute || 60;
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    
    // Get request timestamps for this operation
    const timestamps = this.rateLimiter.get(operation) || [];
    
    // Remove old timestamps
    const recentTimestamps = timestamps.filter(t => now - t < windowMs);
    
    if (recentTimestamps.length >= maxRequests) {
      return TE.left(new Error('Rate limit exceeded'));
    }
    
    // Add current timestamp
    recentTimestamps.push(now);
    this.rateLimiter.set(operation, recentTimestamps);
    
    return TE.right(undefined);
  };

  /**
   * Update credit usage
   */
  private updateCreditUsage = (credits: number): void => {
    this.creditUsage.usedCredits += credits;
    this.creditUsage.remainingCredits = Math.max(0, this.creditUsage.totalCredits - this.creditUsage.usedCredits);
    
    // Emit alert if running low on credits
    if (this.creditUsage.remainingCredits < 1000) {
      this.emit('hive:credit:alert', {
        remainingCredits: this.creditUsage.remainingCredits,
        totalCredits: this.creditUsage.totalCredits
      });
    }
  };

  /**
   * Cache management
   */
  private getCacheKey = (operation: string, query: string, metadata?: any): string => {
    return `hive:${operation}:${Buffer.from(JSON.stringify({ query, metadata })).toString('base64')}`;
  };

  private getFromCache = (key: string): any => {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  };

  private setInCache = (key: string, data: any): void => {
    const ttl = this.config.cacheTTL || 300000; // 5 minutes default
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl
    });
  };

  private cleanupCache = (): void => {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  };
}