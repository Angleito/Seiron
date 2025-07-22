import { Request, Response, NextFunction, RequestHandler } from 'express';
import { createHash } from 'crypto';
import logger from '../utils/logger';
import { securityAuditService } from '../services/SecurityAuditService';
import { apiKeyValidationService } from '../services/ApiKeyValidationService';

/**
 * Rate Limit Configuration
 */
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  onLimitReached?: (req: Request, res: Response) => void;
  message?: string | ((req: Request, res: Response) => string);
}

/**
 * Rate Limit Store Entry
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequestTime: number;
  lastRequestTime: number;
  requests: Array<{
    timestamp: number;
    ip: string;
    userAgent?: string;
    endpoint: string;
    success: boolean;
  }>;
}

/**
 * API Key Rate Limiter
 * Provides sophisticated rate limiting based on API keys with intelligent tracking
 */
export class ApiKeyRateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private readonly cleanupInterval: NodeJS.Timeout;
  private readonly maxStoreSize = 100000;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000);
  }

  /**
   * Create rate limit middleware for API keys
   */
  public createApiKeyRateLimit(config: RateLimitConfig): RequestHandler {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const key = this.generateRateLimitKey(req, config);
        const now = Date.now();
        
        // Get or create rate limit entry
        let entry = this.store.get(key);
        
        if (!entry) {
          entry = {
            count: 0,
            resetTime: now + config.windowMs,
            firstRequestTime: now,
            lastRequestTime: now,
            requests: []
          };
          this.store.set(key, entry);
        }

        // Check if window has expired
        if (now >= entry.resetTime) {
          // Reset the window
          entry.count = 0;
          entry.resetTime = now + config.windowMs;
          entry.firstRequestTime = now;
          entry.requests = [];
        }

        // Check rate limit
        if (entry.count >= config.maxRequests) {
          this.handleRateLimitExceeded(req, res, config, entry);
          return;
        }

        // Track the request
        this.trackRequest(entry, req, now);

        // Add rate limit headers
        this.addRateLimitHeaders(res, entry, config);

        // Continue to next middleware
        next();
      } catch (error) {
        logger.error('API key rate limiter error', {
          error: error instanceof Error ? error.message : String(error),
          ip: req.ip,
          path: req.path
        });
        
        // Continue on error to avoid breaking the application
        next();
      }
    };
  }

  /**
   * Create smart rate limiter that adapts based on API key type and usage patterns
   */
  public createSmartRateLimit(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const apiKey = this.extractApiKey(req);
        
        if (!apiKey) {
          // Use default rate limiting for unauthenticated requests
          const defaultConfig: RateLimitConfig = {
            windowMs: 15 * 60 * 1000, // 15 minutes
            maxRequests: 100,
            message: 'Too many requests from this IP'
          };
          
          return this.createApiKeyRateLimit(defaultConfig)(req, res, next);
        }

        // Get API key configuration for smart limiting
        this.getSmartRateLimit(apiKey, req).then(config => {
          if (config) {
            return this.createApiKeyRateLimit(config)(req, res, next);
          } else {
            // Use default config if key validation fails
            const defaultConfig: RateLimitConfig = {
              windowMs: 5 * 60 * 1000, // 5 minutes
              maxRequests: 50,
              message: 'Invalid API key - reduced rate limit applied'
            };
            
            return this.createApiKeyRateLimit(defaultConfig)(req, res, next);
          }
        }).catch(error => {
          logger.error('Smart rate limiter error', {
            error: error instanceof Error ? error.message : String(error)
          });
          next();
        });
      } catch (error) {
        logger.error('Smart rate limiter setup error', {
          error: error instanceof Error ? error.message : String(error)
        });
        next();
      }
    };
  }

  /**
   * Create burst protection middleware
   */
  public createBurstProtection(config: {
    burstLimit: number;
    burstWindowMs: number;
    baseConfig: RateLimitConfig;
  }): RequestHandler {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const key = this.generateRateLimitKey(req, config.baseConfig);
        const now = Date.now();
        const entry = this.store.get(key);

        if (entry) {
          // Check for burst patterns
          const recentRequests = entry.requests.filter(
            r => now - r.timestamp <= config.burstWindowMs
          );

          if (recentRequests.length >= config.burstLimit) {
            // Burst detected - apply stricter limiting
            logger.warn('Burst pattern detected', {
              key,
              requestCount: recentRequests.length,
              timeframe: config.burstWindowMs,
              ip: req.ip
            });

            securityAuditService.logSuspiciousActivity(
              `Burst traffic pattern detected: ${recentRequests.length} requests in ${config.burstWindowMs}ms`,
              req.ip,
              req.get('User-Agent'),
              undefined,
              { 
                requestCount: recentRequests.length,
                timeframe: config.burstWindowMs,
                rateLimitKey: key
              }
            );

            res.status(429).json({
              error: 'Burst limit exceeded',
              message: 'Too many requests in a short time period',
              retryAfter: Math.ceil(config.burstWindowMs / 1000),
              code: 'BURST_LIMIT_EXCEEDED'
            });
            return;
          }
        }

        // Apply normal rate limiting
        this.createApiKeyRateLimit(config.baseConfig)(req, res, next);
      } catch (error) {
        logger.error('Burst protection error', {
          error: error instanceof Error ? error.message : String(error)
        });
        next();
      }
    };
  }

  /**
   * Get smart rate limit configuration based on API key
   */
  private async getSmartRateLimit(
    apiKey: string, 
    req: Request
  ): Promise<RateLimitConfig | null> {
    try {
      const validationResult = await apiKeyValidationService.validateKey(
        apiKey,
        [],
        {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: req.path
        }
      );

      if (!validationResult.isValid || !validationResult.keyConfig) {
        return null;
      }

      const keyConfig = validationResult.keyConfig;
      const baseLimit = keyConfig.rateLimit?.maxRequests || 1000;
      const baseWindow = keyConfig.rateLimit?.windowMs || 60 * 60 * 1000; // 1 hour

      // Adjust limits based on key type and endpoint
      let multiplier = 1;
      
      if (keyConfig.isInternal) {
        multiplier = 2; // Internal keys get higher limits
      }

      // Adjust based on endpoint type
      if (req.path.includes('/health') || req.path.includes('/status')) {
        multiplier *= 5; // Health checks get much higher limits
      } else if (req.path.includes('/ai/') || req.path.includes('/chat/')) {
        multiplier *= 0.5; // AI endpoints get reduced limits
      }

      return {
        windowMs: baseWindow,
        maxRequests: Math.floor(baseLimit * multiplier),
        keyGenerator: (req) => this.generateApiKeyBasedKey(req, keyConfig.name),
        message: `Rate limit exceeded for API key: ${keyConfig.name}`
      };
    } catch (error) {
      logger.error('Error getting smart rate limit config', {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Generate rate limit key
   */
  private generateRateLimitKey(req: Request, config: RateLimitConfig): string {
    if (config.keyGenerator) {
      return config.keyGenerator(req);
    }

    const apiKey = this.extractApiKey(req);
    if (apiKey) {
      return this.hashApiKey(apiKey);
    }

    // Fall back to IP-based limiting
    return this.getClientIdentifier(req);
  }

  /**
   * Generate API key-based rate limit key
   */
  private generateApiKeyBasedKey(req: Request, keyName: string): string {
    return `api_key:${keyName}:${this.getClientIdentifier(req)}`;
  }

  /**
   * Extract API key from request
   */
  private extractApiKey(req: Request): string | null {
    // Check various locations for API key
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    const apiKeyHeader = req.headers['x-api-key'] as string;
    if (apiKeyHeader) {
      return apiKeyHeader;
    }

    const queryApiKey = req.query.api_key as string;
    if (queryApiKey) {
      return queryApiKey;
    }

    return null;
  }

  /**
   * Get client identifier (IP with fallbacks)
   */
  private getClientIdentifier(req: Request): string {
    return req.headers['x-forwarded-for'] as string ||
           req.headers['x-real-ip'] as string ||
           req.connection.remoteAddress ||
           req.ip ||
           'unknown';
  }

  /**
   * Hash API key for storage
   */
  private hashApiKey(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Track request in rate limit entry
   */
  private trackRequest(entry: RateLimitEntry, req: Request, now: number): void {
    entry.count++;
    entry.lastRequestTime = now;
    
    // Keep track of recent requests for analysis
    entry.requests.push({
      timestamp: now,
      ip: req.ip || 'unknown',
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      success: true // Will be updated by response middleware
    });

    // Limit request history size
    if (entry.requests.length > 100) {
      entry.requests = entry.requests.slice(-50);
    }
  }

  /**
   * Handle rate limit exceeded
   */
  private handleRateLimitExceeded(
    req: Request,
    res: Response,
    config: RateLimitConfig,
    entry: RateLimitEntry
  ): void {
    const retryAfter = Math.ceil((entry.resetTime - Date.now()) / 1000);
    
    // Log rate limit event
    securityAuditService.logRateLimitEvent(
      req.ip || 'unknown',
      req.path,
      config.maxRequests,
      entry.count,
      {
        apiKey: this.extractApiKey(req) ? 'present' : 'missing',
        userAgent: req.get('User-Agent'),
        windowMs: config.windowMs
      }
    );

    // Execute custom handler if provided
    if (config.onLimitReached) {
      config.onLimitReached(req, res);
    }

    // Set rate limit headers
    this.addRateLimitHeaders(res, entry, config);
    res.setHeader('Retry-After', retryAfter.toString());

    // Send error response
    const message = typeof config.message === 'function' 
      ? config.message(req, res)
      : config.message || 'Too many requests';

    res.status(429).json({
      error: 'Rate limit exceeded',
      message,
      retryAfter,
      limit: config.maxRequests,
      remaining: 0,
      resetTime: new Date(entry.resetTime).toISOString(),
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }

  /**
   * Add rate limit headers to response
   */
  private addRateLimitHeaders(
    res: Response,
    entry: RateLimitEntry,
    config: RateLimitConfig
  ): void {
    const remaining = Math.max(0, config.maxRequests - entry.count);
    const resetTime = Math.ceil((entry.resetTime - Date.now()) / 1000);

    res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', resetTime.toString());
    res.setHeader('X-RateLimit-Window', Math.ceil(config.windowMs / 1000).toString());
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let removedCount = 0;
    const initialSize = this.store.size;

    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetTime + 60000) { // Add 1 minute buffer
        this.store.delete(key);
        removedCount++;
      }
    }

    // If store is too large, remove oldest entries
    if (this.store.size > this.maxStoreSize) {
      const entries = Array.from(this.store.entries())
        .sort(([,a], [,b]) => a.lastRequestTime - b.lastRequestTime);
      
      const toRemove = entries.slice(0, this.store.size - this.maxStoreSize);
      toRemove.forEach(([key]) => this.store.delete(key));
      removedCount += toRemove.length;
    }

    if (removedCount > 0) {
      logger.debug('Rate limit store cleanup completed', {
        removedEntries: removedCount,
        remainingEntries: this.store.size,
        initialSize
      });
    }
  }

  /**
   * Get rate limit statistics
   */
  public getStatistics(): {
    totalEntries: number;
    activeEntries: number;
    topKeys: Array<{ key: string; count: number; lastRequest: Date }>;
    memoryUsage: string;
  } {
    const now = Date.now();
    const activeEntries = Array.from(this.store.values())
      .filter(entry => now < entry.resetTime);

    const entries = Array.from(this.store.entries());
    const topKeys = entries
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 10)
      .map(([key, entry]) => ({
        key: key.substring(0, 8) + '...', // Truncate for privacy
        count: entry.count,
        lastRequest: new Date(entry.lastRequestTime)
      }));

    const memoryUsage = `${Math.round(
      (this.store.size * 200) / 1024 / 1024 * 100
    ) / 100} MB`; // Rough estimate

    return {
      totalEntries: this.store.size,
      activeEntries: activeEntries.length,
      topKeys,
      memoryUsage
    };
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

/**
 * Singleton instance
 */
export const apiKeyRateLimiter = new ApiKeyRateLimiter();

/**
 * Pre-configured rate limit middlewares
 */
export const rateLimitMiddleware = {
  /**
   * General API rate limiting
   */
  general: apiKeyRateLimiter.createApiKeyRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000,
    message: 'Too many requests, please try again later'
  }),

  /**
   * Strict rate limiting for authentication endpoints
   */
  auth: apiKeyRateLimiter.createApiKeyRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
    message: 'Too many authentication attempts, please try again later'
  }),

  /**
   * Moderate rate limiting for AI/Chat endpoints
   */
  ai: apiKeyRateLimiter.createApiKeyRateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 100,
    message: 'AI request limit exceeded, please wait before trying again'
  }),

  /**
   * Lenient rate limiting for portfolio data
   */
  portfolio: apiKeyRateLimiter.createApiKeyRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 500,
    message: 'Portfolio data request limit exceeded'
  }),

  /**
   * Smart rate limiting that adapts to API key
   */
  smart: apiKeyRateLimiter.createSmartRateLimit(),

  /**
   * Burst protection for all endpoints
   */
  burstProtection: apiKeyRateLimiter.createBurstProtection({
    burstLimit: 20,
    burstWindowMs: 60 * 1000, // 1 minute
    baseConfig: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000
    }
  })
};