import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import axios, { AxiosInstance } from 'axios';
import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import { logger } from '../utils/logger';

export interface HiveIntelligenceConfig {
  apiKey: string;
  baseUrl?: string;
  maxRequestsPerMinute?: number;
  cacheTTL?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface BlockchainQueryParams {
  query: string;
  temperature?: number;
  includeDataSources?: boolean;
  maxTokens?: number;
}

export interface BlockchainQueryResponse {
  query: string;
  response: string;
  sources?: string[];
  creditsUsed: number;
  timestamp: string;
}

interface HiveAPIResponse {
  results: {
    answer: string;
    sources?: string[];
  };
  metadata: {
    credits_used: number;
  };
}

interface CacheEntry {
  data: BlockchainQueryResponse;
  expiresAt: number;
}

export class HiveIntelligenceAdapter extends EventEmitter {
  public readonly name = 'HiveIntelligence';
  public readonly version = '1.0.0';
  public isInitialized = false;

  private axiosInstance: AxiosInstance;
  private rateLimiter: Map<string, number[]> = new Map();
  private cache: Map<string, CacheEntry> = new Map();
  private cacheCleanupInterval?: NodeJS.Timeout;
  private readonly encryptedApiKey: string;

  constructor(private config: HiveIntelligenceConfig) {
    super();
    
    // Encrypt API key in memory for additional security
    this.encryptedApiKey = this.encryptApiKey(config.apiKey);
    
    // Initialize axios with secure configuration
    this.axiosInstance = axios.create({
      baseURL: config.baseUrl || 'https://api.hiveintelligence.xyz/v1',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Seiron-Chatbot/1.0'
      }
    });

    // Add request interceptor to inject auth header
    this.axiosInstance.interceptors.request.use(config => {
      config.headers['Authorization'] = `Bearer ${this.decryptApiKey(this.encryptedApiKey)}`;
      return config;
    });

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      response => response,
      error => {
        // Sanitize error to prevent API key leakage
        if (error.config?.headers?.Authorization) {
          error.config.headers.Authorization = '[REDACTED]';
        }
        return Promise.reject(error);
      }
    );

    this.setupCacheCleanup();
  }

  /**
   * Initialize the adapter and verify API connectivity
   */
  public initialize = (): TE.TaskEither<Error, void> => {
    return pipe(
      TE.tryCatch(
        async () => {
          // Test API connection with a simple query
          const testQuery = await this.axiosInstance.post('/search', {
            query: 'What is Sei network?',
            temperature: 0.1,
            include_data_sources: false
          });

          if (testQuery.status === 200) {
            this.isInitialized = true;
            logger.info('HiveIntelligence adapter initialized successfully');
            this.emit('initialized');
          }
        },
        error => new Error(`Failed to initialize HiveIntelligence adapter: ${this.sanitizeError(error)}`)
      ),
      TE.mapLeft(error => {
        logger.error('HiveIntelligence initialization failed:', error);
        return error;
      })
    );
  };

  /**
   * Query blockchain data using natural language
   */
  public queryBlockchainData = (params: BlockchainQueryParams): TE.TaskEither<Error, BlockchainQueryResponse> => {
    return pipe(
      // Check rate limit
      this.checkRateLimit('query'),
      TE.chain(() => {
        // Check cache first
        const cacheKey = this.getCacheKey(params);
        const cached = this.getFromCache(cacheKey);
        
        if (cached) {
          logger.debug('Returning cached blockchain query result');
          return TE.right(cached);
        }

        // Make API request
        return this.performQuery(params);
      }),
      TE.map(response => {
        // Cache the response
        const cacheKey = this.getCacheKey(params);
        this.setCache(cacheKey, response);
        
        // Emit event for monitoring
        this.emit('query', {
          query: params.query,
          creditsUsed: response.creditsUsed,
          cached: false
        });

        return response;
      }),
      TE.mapLeft(error => {
        logger.error('Blockchain query failed:', error);
        this.emit('error', error);
        return error;
      })
    );
  };

  /**
   * Get current credit usage and limits
   */
  public getUsageInfo = (): TE.TaskEither<Error, { creditsUsed: number; dailyLimit: number }> => {
    // This would typically make an API call to get usage info
    // For now, we'll track it locally
    return TE.right({
      creditsUsed: this.calculateDailyUsage(),
      dailyLimit: 10 // Free tier limit
    });
  };

  /**
   * Clear cache and reset rate limiters
   */
  public reset = (): void => {
    this.cache.clear();
    this.rateLimiter.clear();
    logger.info('HiveIntelligence adapter reset');
  };

  /**
   * Cleanup resources
   */
  public destroy = (): void => {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
    }
    this.reset();
    this.removeAllListeners();
    logger.info('HiveIntelligence adapter destroyed');
  };

  // Private helper methods

  private performQuery = (params: BlockchainQueryParams): TE.TaskEither<Error, BlockchainQueryResponse> => {
    return pipe(
      TE.tryCatch(
        async () => {
          const response = await this.axiosInstance.post<HiveAPIResponse>('/search', {
            query: params.query,
            temperature: params.temperature ?? 0.3,
            include_data_sources: params.includeDataSources ?? true,
            max_tokens: params.maxTokens ?? 500
          });

          return this.transformResponse(params.query, response.data);
        },
        error => new Error(`API request failed: ${this.sanitizeError(error)}`)
      ),
      // Retry logic
      TE.orElse((error) => {
        const retryAttempts = this.config.retryAttempts ?? 2;
        if (retryAttempts > 0) {
          logger.warn(`Retrying query, attempts remaining: ${retryAttempts}`);
          return pipe(
            TE.of(undefined),
            TE.delay(this.config.retryDelay ?? 1000),
            TE.chain(() => this.performQuery({ ...params, retryAttempts: retryAttempts - 1 } as any))
          );
        }
        return TE.left(error);
      })
    );
  };

  private transformResponse = (query: string, apiResponse: HiveAPIResponse): BlockchainQueryResponse => {
    return {
      query,
      response: apiResponse.results.answer,
      sources: apiResponse.results.sources,
      creditsUsed: apiResponse.metadata.credits_used,
      timestamp: new Date().toISOString()
    };
  };

  private checkRateLimit = (operation: string): TE.TaskEither<Error, void> => {
    const maxRequests = this.config.maxRequestsPerMinute ?? 20;
    const now = Date.now();
    const windowMs = 60000; // 1 minute

    const timestamps = this.rateLimiter.get(operation) || [];
    const recentTimestamps = timestamps.filter(t => now - t < windowMs);

    if (recentTimestamps.length >= maxRequests) {
      const oldestTimestamp = recentTimestamps[0];
      const waitTime = windowMs - (now - oldestTimestamp);
      return TE.left(new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`));
    }

    recentTimestamps.push(now);
    this.rateLimiter.set(operation, recentTimestamps);

    return TE.right(undefined);
  };

  private getCacheKey = (params: BlockchainQueryParams): string => {
    const normalizedQuery = params.query.toLowerCase().trim();
    return createHash('sha256')
      .update(`${normalizedQuery}-${params.temperature ?? 0.3}-${params.includeDataSources ?? true}`)
      .digest('hex');
  };

  private getFromCache = (key: string): BlockchainQueryResponse | null => {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  };

  private setCache = (key: string, data: BlockchainQueryResponse): void => {
    const ttl = (this.config.cacheTTL ?? 300) * 1000; // Convert to milliseconds
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl
    });
  };

  private setupCacheCleanup = (): void => {
    // Clean up expired cache entries every minute
    this.cacheCleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key);
        }
      }
    }, 60000);
  };

  private calculateDailyUsage = (): number => {
    // In a real implementation, this would track actual usage
    // For now, return a placeholder
    return 0;
  };

  private encryptApiKey = (apiKey: string): string => {
    // Simple obfuscation for in-memory storage
    // In production, use proper encryption with AES-256-GCM
    return Buffer.from(apiKey).toString('base64');
  };

  private decryptApiKey = (encryptedKey: string): string => {
    // Decrypt the obfuscated key
    return Buffer.from(encryptedKey, 'base64').toString();
  };

  private sanitizeError = (error: any): string => {
    // Remove sensitive information from error messages
    const message = error?.message || String(error);
    return message
      .replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]')
      .replace(/apiKey['":\s]+[^'",\s}]+/gi, 'apiKey: [REDACTED]');
  };
}

// Factory function
export const createHiveIntelligenceAdapter = (config: HiveIntelligenceConfig): HiveIntelligenceAdapter => {
  return new HiveIntelligenceAdapter(config);
};