import { Either, left, right } from 'fp-ts/Either';
import { TaskEither } from 'fp-ts/TaskEither';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { BaseAgent, AgentConfig, AgentError, ActionContext, ActionResult, AgentPlugin } from '../base/BaseAgent';

/**
 * HiveIntelligenceAdapter - Hive Intelligence API Integration
 * 
 * This adapter integrates the Hive Intelligence API with the existing BaseAgent architecture,
 * providing AI-powered blockchain search, analytics, and market intelligence capabilities.
 */

// ============================================================================
// Hive Intelligence Types
// ============================================================================

/**
 * Hive Intelligence API configuration
 */
export interface HiveIntelligenceConfig {
  baseUrl: string;
  apiKey: string;
  version: string;
  rateLimitConfig: {
    maxRequests: number;
    windowMs: number;
  };
  cacheConfig: {
    enabled: boolean;
    ttlMs: number;
    maxSize: number;
  };
  retryConfig: {
    maxRetries: number;
    backoffMs: number;
  };
  creditConfig: {
    trackUsage: boolean;
    maxCreditsPerQuery: number;
    alertThreshold: number;
  };
}

/**
 * Hive Intelligence query types
 */
export interface HiveQuery {
  type: 'search' | 'analytics' | 'portfolio' | 'market' | 'credit';
  query: string;
  parameters?: Record<string, any>;
  metadata?: HiveQueryMetadata;
}

export interface HiveQueryMetadata {
  userId?: string;
  walletAddress?: string;
  chainId?: number;
  network?: string;
  maxResults?: number;
  filters?: Record<string, any>;
  timeRange?: {
    start: string;
    end: string;
  };
}

/**
 * Hive Intelligence response structure
 */
export interface HiveResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    creditsUsed: number;
    queryTime: number;
    resultCount: number;
    timestamp: number;
    queryId: string;
  };
}

/**
 * Hive Intelligence search results
 */
export interface HiveSearchResult {
  id: string;
  title: string;
  description: string;
  type: 'transaction' | 'address' | 'token' | 'protocol' | 'event';
  chain: string;
  relevanceScore: number;
  data: Record<string, any>;
  timestamp: string;
}

/**
 * Hive Intelligence analytics result
 */
export interface HiveAnalyticsResult {
  queryId: string;
  analysisType: 'portfolio' | 'market' | 'risk' | 'performance';
  insights: HiveInsight[];
  metrics: Record<string, number>;
  recommendations: HiveRecommendation[];
  timestamp: string;
}

export interface HiveInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'opportunity' | 'risk' | 'correlation';
  title: string;
  description: string;
  confidence: number;
  data: Record<string, any>;
}

export interface HiveRecommendation {
  id: string;
  type: 'buy' | 'sell' | 'hold' | 'monitor' | 'optimize';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  expectedImpact: number;
  actionItems: string[];
}

/**
 * Credit usage tracking
 */
export interface CreditUsage {
  totalCredits: number;
  usedCredits: number;
  remainingCredits: number;
  resetDate: string;
  queryHistory: CreditQuery[];
}

export interface CreditQuery {
  queryId: string;
  creditsUsed: number;
  queryType: string;
  timestamp: string;
}

// ============================================================================
// Core HiveIntelligenceAdapter Implementation
// ============================================================================

/**
 * HiveIntelligenceAdapter - Main adapter class
 * 
 * This class extends BaseAgent to provide Hive Intelligence API integration
 * while maintaining all existing patterns and functionality.
 */
export class HiveIntelligenceAdapter extends BaseAgent {
  private readonly hiveConfig: HiveIntelligenceConfig;
  private readonly cache: Map<string, CacheEntry> = new Map();
  private readonly rateLimiter: RateLimiter;
  private creditUsage: CreditUsage | null = null;
  private readonly httpClient: HttpClient;

  constructor(config: AgentConfig, hiveConfig: HiveIntelligenceConfig) {
    super(config);
    this.hiveConfig = hiveConfig;
    this.rateLimiter = new RateLimiter(
      this.hiveConfig.rateLimitConfig.maxRequests,
      this.hiveConfig.rateLimitConfig.windowMs
    );
    this.httpClient = new HttpClient(this.hiveConfig);
    
    // Register Hive Intelligence specific actions
    this.registerHiveActions();
  }

  // ============================================================================
  // Public API Methods
  // ============================================================================

  /**
   * Perform a natural language search query
   */
  public search(query: string, metadata?: HiveQueryMetadata): TaskEither<AgentError, HiveResponse<HiveSearchResult[]>> {
    const hiveQuery: HiveQuery = {
      type: 'search',
      query,
      parameters: {},
      metadata
    };

    return this.executeHiveQuery<HiveSearchResult[]>(hiveQuery);
  }

  /**
   * Get AI-powered analytics and insights
   */
  public getAnalytics(query: string, metadata?: HiveQueryMetadata): TaskEither<AgentError, HiveResponse<HiveAnalyticsResult>> {
    const hiveQuery: HiveQuery = {
      type: 'analytics',
      query,
      parameters: {},
      metadata
    };

    return this.executeHiveQuery<HiveAnalyticsResult>(hiveQuery);
  }

  /**
   * Perform portfolio analysis
   */
  public analyzePortfolio(
    walletAddress: string,
    additionalParams?: Record<string, any>
  ): TaskEither<AgentError, HiveResponse<HiveAnalyticsResult>> {
    const hiveQuery: HiveQuery = {
      type: 'portfolio',
      query: `Analyze portfolio for wallet ${walletAddress}`,
      parameters: {
        walletAddress,
        ...additionalParams
      },
      metadata: {
        walletAddress
      }
    };

    return this.executeHiveQuery<HiveAnalyticsResult>(hiveQuery);
  }

  /**
   * Get market intelligence
   */
  public getMarketIntelligence(
    query: string,
    metadata?: HiveQueryMetadata
  ): TaskEither<AgentError, HiveResponse<HiveAnalyticsResult>> {
    const hiveQuery: HiveQuery = {
      type: 'market',
      query,
      parameters: {},
      metadata
    };

    return this.executeHiveQuery<HiveAnalyticsResult>(hiveQuery);
  }

  /**
   * Get credit usage information
   */
  public getCreditUsage(): TaskEither<AgentError, CreditUsage> {
    return pipe(
      this.checkHiveRateLimit(),
      TE.fromEither,
      TE.chain(() => this.httpClient.get<CreditUsage>('/credits/usage')),
      TE.chain(response => {
        if (response.success && response.data) {
          this.creditUsage = response.data;
          return TE.right(response.data);
        }
        return TE.left(this.createError('CREDIT_USAGE_FAILED', 'Failed to get credit usage: Invalid response'));
      })
    );
  }

  /**
   * Install Hive Intelligence integration as a plugin
   */
  public installHivePlugin(): TaskEither<AgentError, void> {
    const plugin: AgentPlugin = {
      id: 'hive-intelligence',
      name: 'Hive Intelligence Integration',
      version: '1.0.0',
      initialize: (agent: BaseAgent) => this.initializeHivePlugin(agent),
      cleanup: () => this.cleanupHivePlugin()
    };

    return this.installPlugin(plugin);
  }

  // ============================================================================
  // Private Implementation Methods
  // ============================================================================

  /**
   * Execute a Hive Intelligence query with caching and rate limiting
   */
  private executeHiveQuery<T>(query: HiveQuery): TaskEither<AgentError, HiveResponse<T>> {
    const cacheKey = this.generateCacheKey(query);
    
    return pipe(
      this.checkHiveRateLimit(),
      TE.fromEither,
      TE.chain(() => {
        // Check cache first
        if (this.hiveConfig.cacheConfig.enabled) {
          const cached = this.getFromCache<HiveResponse<T>>(cacheKey);
          if (cached) {
            return TE.right(cached);
          }
        }

        // Execute query
        return this.performHiveQuery<T>(query);
      }),
      TE.map(response => {
        // Cache successful responses
        if (this.hiveConfig.cacheConfig.enabled && response.success) {
          this.setInCache(cacheKey, response);
        }

        // Track credit usage
        if (this.hiveConfig.creditConfig.trackUsage && response.metadata?.creditsUsed) {
          this.trackCreditUsage(query, response.metadata.creditsUsed);
        }

        return response;
      })
    );
  }

  /**
   * Perform the actual Hive Intelligence API query
   */
  private performHiveQuery<T>(query: HiveQuery): TaskEither<AgentError, HiveResponse<T>> {
    const endpoint = this.getQueryEndpoint(query.type);
    const requestBody = {
      query: query.query,
      parameters: query.parameters || {},
      metadata: query.metadata || {}
    };

    return this.httpClient.post<T>(endpoint, requestBody);
  }

  /**
   * Register Hive Intelligence specific actions
   */
  private registerHiveActions(): void {
    const actions = [
      {
        id: 'hive_search',
        name: 'Hive Intelligence Search',
        description: 'Perform natural language search queries for blockchain/Web3 data',
        handler: this.handleHiveSearch.bind(this),
        validation: [
          { field: 'query', required: true, type: 'string' as const },
          { field: 'metadata', required: false, type: 'object' as const }
        ]
      },
      {
        id: 'hive_analytics',
        name: 'Hive Intelligence Analytics',
        description: 'Get AI-powered analytics and insights',
        handler: this.handleHiveAnalytics.bind(this),
        validation: [
          { field: 'query', required: true, type: 'string' as const },
          { field: 'metadata', required: false, type: 'object' as const }
        ]
      },
      {
        id: 'hive_portfolio_analysis',
        name: 'Hive Portfolio Analysis',
        description: 'Analyze portfolio performance and recommendations',
        handler: this.handleHivePortfolioAnalysis.bind(this),
        validation: [
          { field: 'walletAddress', required: true, type: 'string' as const },
          { field: 'parameters', required: false, type: 'object' as const }
        ]
      },
      {
        id: 'hive_market_intelligence',
        name: 'Hive Market Intelligence',
        description: 'Get market intelligence and trading insights',
        handler: this.handleHiveMarketIntelligence.bind(this),
        validation: [
          { field: 'query', required: true, type: 'string' as const },
          { field: 'metadata', required: false, type: 'object' as const }
        ]
      },
      {
        id: 'hive_credit_usage',
        name: 'Hive Credit Usage',
        description: 'Get current credit usage and limits',
        handler: this.handleHiveCreditUsage.bind(this),
        validation: []
      }
    ];

    actions.forEach(action => {
      this.registerAction(action);
    });
  }

  /**
   * Handle Hive search action
   */
  private handleHiveSearch(context: ActionContext): TaskEither<AgentError, ActionResult> {
    const { query, metadata } = context.parameters;

    return pipe(
      this.search(query, metadata),
      TE.map(response => ({
        success: response.success,
        data: response.data,
        message: response.success 
          ? `Search completed with ${response.data?.length || 0} results`
          : response.error?.message || 'Search failed'
      }))
    );
  }

  /**
   * Handle Hive analytics action
   */
  private handleHiveAnalytics(context: ActionContext): TaskEither<AgentError, ActionResult> {
    const { query, metadata } = context.parameters;

    return pipe(
      this.getAnalytics(query, metadata),
      TE.map(response => ({
        success: response.success,
        data: response.data,
        message: response.success
          ? `Analytics completed with ${response.data?.insights.length || 0} insights`
          : response.error?.message || 'Analytics failed'
      }))
    );
  }

  /**
   * Handle Hive portfolio analysis action
   */
  private handleHivePortfolioAnalysis(context: ActionContext): TaskEither<AgentError, ActionResult> {
    const { walletAddress, parameters } = context.parameters;

    return pipe(
      this.analyzePortfolio(walletAddress, parameters),
      TE.map(response => ({
        success: response.success,
        data: response.data,
        message: response.success
          ? `Portfolio analysis completed for ${walletAddress}`
          : response.error?.message || 'Portfolio analysis failed'
      }))
    );
  }

  /**
   * Handle Hive market intelligence action
   */
  private handleHiveMarketIntelligence(context: ActionContext): TaskEither<AgentError, ActionResult> {
    const { query, metadata } = context.parameters;

    return pipe(
      this.getMarketIntelligence(query, metadata),
      TE.map(response => ({
        success: response.success,
        data: response.data,
        message: response.success
          ? `Market intelligence analysis completed`
          : response.error?.message || 'Market intelligence failed'
      }))
    );
  }

  /**
   * Handle Hive credit usage action
   */
  private handleHiveCreditUsage(context: ActionContext): TaskEither<AgentError, ActionResult> {
    return pipe(
      this.getCreditUsage(),
      TE.map(creditUsage => ({
        success: true,
        data: creditUsage,
        message: `Credit usage: ${creditUsage.usedCredits}/${creditUsage.totalCredits} (${creditUsage.remainingCredits} remaining)`
      }))
    );
  }

  /**
   * Initialize Hive Intelligence plugin
   */
  private initializeHivePlugin(agent: BaseAgent): TaskEither<AgentError, void> {
    return pipe(
      TE.tryCatch(
        async () => {
          // Initialize HTTP client
          await this.httpClient.initialize();
          
          // Setup cache if enabled
          if (this.hiveConfig.cacheConfig.enabled) {
            this.setupCache();
          }
          
          // Load initial credit usage
          if (this.hiveConfig.creditConfig.trackUsage) {
            await this.getCreditUsage()();
          }
          
          this.emit('hive:plugin:initialized', { agentId: agent.getConfig().id });
        },
        error => this.createError('HIVE_PLUGIN_INIT_FAILED', `Failed to initialize Hive plugin: ${error}`)
      )
    );
  }

  /**
   * Cleanup Hive Intelligence plugin
   */
  private cleanupHivePlugin(): TaskEither<AgentError, void> {
    return pipe(
      TE.tryCatch(
        async () => {
          // Clear cache
          this.cache.clear();
          
          // Cleanup HTTP client
          await this.httpClient.cleanup();
          
          this.emit('hive:plugin:cleanup', { agentId: this.getConfig().id });
        },
        error => this.createError('HIVE_PLUGIN_CLEANUP_FAILED', `Failed to cleanup Hive plugin: ${error}`)
      )
    );
  }

  /**
   * Generate cache key for query
   */
  private generateCacheKey(query: HiveQuery): string {
    return `hive:${query.type}:${Buffer.from(JSON.stringify(query)).toString('base64')}`;
  }

  /**
   * Get API endpoint for query type
   */
  private getQueryEndpoint(type: HiveQuery['type']): string {
    const endpoints = {
      search: '/search',
      analytics: '/analytics',
      portfolio: '/portfolio/analyze',
      market: '/market/intelligence',
      credit: '/credits/usage'
    };
    return endpoints[type] || '/search';
  }

  /**
   * Setup cache cleanup
   */
  private setupCache(): void {
    setInterval(() => {
      const now = Date.now();
      this.cache.forEach((entry, key) => {
        if (now > entry.expiresAt) {
          this.cache.delete(key);
        }
      });
    }, 60000); // Clean every minute
  }

  /**
   * Get from cache
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  /**
   * Set in cache
   */
  private setInCache<T>(key: string, data: T, ttlMs?: number): void {
    const ttl = ttlMs || this.hiveConfig.cacheConfig.ttlMs;
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl
    });
  }

  /**
   * Check rate limit
   */
  private checkHiveRateLimit(): Either<AgentError, void> {
    if (!this.rateLimiter.canExecute()) {
      return left(this.createError('RATE_LIMIT_EXCEEDED', 'Hive Intelligence API rate limit exceeded'));
    }
    
    this.rateLimiter.recordExecution();
    return right(undefined);
  }

  /**
   * Track credit usage
   */
  private trackCreditUsage(query: HiveQuery, creditsUsed: number): void {
    if (!this.creditUsage) return;

    const creditQuery: CreditQuery = {
      queryId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      creditsUsed,
      queryType: query.type,
      timestamp: new Date().toISOString()
    };

    this.creditUsage.usedCredits += creditsUsed;
    this.creditUsage.remainingCredits = Math.max(0, this.creditUsage.totalCredits - this.creditUsage.usedCredits);
    this.creditUsage.queryHistory.push(creditQuery);

    // Alert if approaching limit
    if (this.creditUsage.remainingCredits <= this.hiveConfig.creditConfig.alertThreshold) {
      this.emit('hive:credit:alert', {
        remainingCredits: this.creditUsage.remainingCredits,
        totalCredits: this.creditUsage.totalCredits,
        agentId: this.getConfig().id
      });
    }
  }

  // ============================================================================
  // BaseAgent Implementation
  // ============================================================================

  protected initialize(): TaskEither<AgentError, void> {
    return this.initializeHivePlugin(this);
  }

  protected cleanup(): TaskEither<AgentError, void> {
    return this.cleanupHivePlugin();
  }

  // ============================================================================
  // Public Access Methods
  // ============================================================================

  public getHiveConfig(): HiveIntelligenceConfig {
    return this.hiveConfig;
  }

  public getCurrentCreditUsage(): CreditUsage | null {
    return this.creditUsage;
  }
}

// ============================================================================
// Supporting Types and Classes
// ============================================================================

interface CacheEntry {
  data: any;
  expiresAt: number;
}

class RateLimiter {
  private calls: number[] = [];
  
  constructor(
    private maxCalls: number,
    private windowMs: number
  ) {}
  
  canExecute(): boolean {
    this.cleanupOldCalls();
    return this.calls.length < this.maxCalls;
  }
  
  recordExecution(): void {
    this.calls.push(Date.now());
  }
  
  private cleanupOldCalls(): void {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    this.calls = this.calls.filter(time => time > cutoff);
  }
}

class HttpClient {
  private baseUrl: string;
  private apiKey: string;
  private headers: Record<string, string>;

  constructor(private config: HiveIntelligenceConfig) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'User-Agent': 'Seiron/1.0.0 HiveIntelligenceAdapter'
    };
  }

  async initialize(): Promise<void> {
    // Test API connection
    try {
      await this.get('/health');
    } catch (error) {
      throw new Error(`Failed to connect to Hive Intelligence API: ${error}`);
    }
  }

  async cleanup(): Promise<void> {
    // Cleanup any persistent connections
  }

  get<T>(endpoint: string): TaskEither<AgentError, HiveResponse<T>> {
    return TE.tryCatch(
      () => this.request<T>('GET', endpoint),
      error => ({
        code: 'HTTP_CLIENT_ERROR',
        message: `HTTP GET failed: ${error}`,
        details: error,
        timestamp: new Date(),
        agentId: 'http-client'
      })
    );
  }

  post<T>(endpoint: string, data: any): TaskEither<AgentError, HiveResponse<T>> {
    return TE.tryCatch(
      () => this.request<T>('POST', endpoint, data),
      error => ({
        code: 'HTTP_CLIENT_ERROR',
        message: `HTTP POST failed: ${error}`,
        details: error,
        timestamp: new Date(),
        agentId: 'http-client'
      })
    );
  }

  private async request<T>(method: string, endpoint: string, data?: any): Promise<HiveResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: this.headers,
      body: data ? JSON.stringify(data) : undefined
    };

    try {
      const response = await fetch(url, options);
      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: response.status.toString(),
            message: result.message || 'API request failed',
            details: result
          }
        };
      }

      return {
        success: true,
        data: result.data,
        metadata: result.metadata || {
          creditsUsed: result.creditsUsed || 0,
          queryTime: result.queryTime || 0,
          resultCount: result.resultCount || 0,
          timestamp: Date.now(),
          queryId: result.queryId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: `Network error: ${error}`,
          details: error
        }
      };
    }
  }
}

// Note: Types are already exported as part of their declarations above