import { Either, left, right } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import logger from '../utils/logger';

/**
 * API Key Configuration
 */
export interface ApiKeyConfig {
  key: string;
  name: string;
  scopes: readonly string[];
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  expiresAt?: Date;
  isInternal: boolean;
}

/**
 * API Key Validation Result
 */
export interface ApiKeyValidationResult {
  isValid: boolean;
  keyConfig?: ApiKeyConfig;
  reason?: string;
  rateLimitExceeded?: boolean;
}

/**
 * API Key Usage Tracking
 */
interface ApiKeyUsage {
  keyName: string;
  requestCount: number;
  lastUsed: Date;
  windowStart: Date;
}

/**
 * Security Audit Event
 */
export interface SecurityAuditEvent {
  eventType: 'key_validation' | 'key_rotation' | 'rate_limit_exceeded' | 'invalid_key_attempt';
  timestamp: Date;
  keyName?: string;
  ip?: string;
  userAgent?: string;
  success: boolean;
  details?: Record<string, unknown>;
}

/**
 * API Key Validation Service
 * Provides comprehensive API key validation, rotation, and security auditing
 */
export class ApiKeyValidationService {
  private keys: Map<string, ApiKeyConfig> = new Map();
  private keyUsage: Map<string, ApiKeyUsage> = new Map();
  private auditLog: SecurityAuditEvent[] = [];
  private readonly maxAuditLogSize = 10000;

  constructor() {
    this.initializeKeys();
    this.startCleanupTimer();
  }

  /**
   * Initialize API keys from environment variables
   */
  private initializeKeys(): void {
    try {
      // OpenAI API Key
      if (process.env.OPENAI_API_KEY) {
        this.addKey({
          key: this.hashKey(process.env.OPENAI_API_KEY),
          name: 'openai',
          scopes: ['ai_processing', 'chat'],
          rateLimit: {
            maxRequests: 1000,
            windowMs: 60 * 60 * 1000, // 1 hour
          },
          isInternal: true,
        });
      }

      // MCP Server API Keys
      if (process.env.MCP_API_KEY) {
        this.addKey({
          key: this.hashKey(process.env.MCP_API_KEY),
          name: 'mcp_internal',
          scopes: ['mcp_communication', 'portfolio_data', 'blockchain_operations'],
          rateLimit: {
            maxRequests: 5000,
            windowMs: 60 * 60 * 1000, // 1 hour
          },
          isInternal: true,
        });
      }

      // Hive Intelligence API Key
      if (process.env.HIVE_API_KEY) {
        this.addKey({
          key: this.hashKey(process.env.HIVE_API_KEY),
          name: 'hive_intelligence',
          scopes: ['market_data', 'sentiment_analysis'],
          rateLimit: {
            maxRequests: 2000,
            windowMs: 60 * 60 * 1000, // 1 hour
          },
          isInternal: true,
        });
      }

      // Internal API Key for service-to-service communication
      if (process.env.INTERNAL_API_KEY) {
        this.addKey({
          key: this.hashKey(process.env.INTERNAL_API_KEY),
          name: 'internal_service',
          scopes: ['internal_operations', 'health_checks', 'admin'],
          rateLimit: {
            maxRequests: 10000,
            windowMs: 60 * 60 * 1000, // 1 hour
          },
          isInternal: true,
        });
      }

      // Supabase Service Role Key
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        this.addKey({
          key: this.hashKey(process.env.SUPABASE_SERVICE_ROLE_KEY),
          name: 'supabase_service',
          scopes: ['database_operations', 'admin'],
          rateLimit: {
            maxRequests: 5000,
            windowMs: 60 * 60 * 1000, // 1 hour
          },
          isInternal: true,
        });
      }

      logger.info('API keys initialized', {
        keyCount: this.keys.size,
        keyNames: Array.from(this.keys.values()).map(k => k.name)
      });
    } catch (error) {
      logger.error('Failed to initialize API keys', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Add a new API key configuration
   */
  public addKey(config: ApiKeyConfig): void {
    this.keys.set(config.key, config);
    this.logAuditEvent({
      eventType: 'key_rotation',
      timestamp: new Date(),
      keyName: config.name,
      success: true,
      details: {
        action: 'key_added',
        scopes: config.scopes,
        isInternal: config.isInternal
      }
    });
  }

  /**
   * Remove an API key
   */
  public removeKey(keyHash: string): void {
    const config = this.keys.get(keyHash);
    if (config) {
      this.keys.delete(keyHash);
      this.keyUsage.delete(config.name);
      
      this.logAuditEvent({
        eventType: 'key_rotation',
        timestamp: new Date(),
        keyName: config.name,
        success: true,
        details: {
          action: 'key_removed'
        }
      });
    }
  }

  /**
   * Validate an API key with comprehensive checks
   */
  public async validateKey(
    apiKey: string,
    requiredScopes: string[] = [],
    context: {
      ip?: string;
      userAgent?: string;
      endpoint?: string;
    } = {}
  ): Promise<ApiKeyValidationResult> {
    const startTime = Date.now();
    
    try {
      // Hash the provided key for lookup
      const keyHash = this.hashKey(apiKey);
      const keyConfig = this.keys.get(keyHash);

      // Check if key exists
      if (!keyConfig) {
        this.logAuditEvent({
          eventType: 'invalid_key_attempt',
          timestamp: new Date(),
          ip: context.ip,
          userAgent: context.userAgent,
          success: false,
          details: {
            endpoint: context.endpoint,
            reason: 'key_not_found'
          }
        });

        return {
          isValid: false,
          reason: 'Invalid API key'
        };
      }

      // Check if key is expired
      if (keyConfig.expiresAt && keyConfig.expiresAt < new Date()) {
        this.logAuditEvent({
          eventType: 'key_validation',
          timestamp: new Date(),
          keyName: keyConfig.name,
          ip: context.ip,
          userAgent: context.userAgent,
          success: false,
          details: {
            endpoint: context.endpoint,
            reason: 'key_expired',
            expiresAt: keyConfig.expiresAt
          }
        });

        return {
          isValid: false,
          reason: 'API key has expired'
        };
      }

      // Check scopes
      if (requiredScopes.length > 0) {
        const hasRequiredScopes = requiredScopes.every(scope => 
          keyConfig.scopes.includes(scope)
        );

        if (!hasRequiredScopes) {
          this.logAuditEvent({
            eventType: 'key_validation',
            timestamp: new Date(),
            keyName: keyConfig.name,
            ip: context.ip,
            userAgent: context.userAgent,
            success: false,
            details: {
              endpoint: context.endpoint,
              reason: 'insufficient_scopes',
              requiredScopes,
              availableScopes: keyConfig.scopes
            }
          });

          return {
            isValid: false,
            reason: 'Insufficient permissions for this operation'
          };
        }
      }

      // Check rate limits
      if (keyConfig.rateLimit) {
        const rateLimitResult = this.checkRateLimit(keyConfig);
        if (!rateLimitResult.allowed) {
          this.logAuditEvent({
            eventType: 'rate_limit_exceeded',
            timestamp: new Date(),
            keyName: keyConfig.name,
            ip: context.ip,
            userAgent: context.userAgent,
            success: false,
            details: {
              endpoint: context.endpoint,
              currentUsage: rateLimitResult.currentUsage,
              limit: keyConfig.rateLimit.maxRequests
            }
          });

          return {
            isValid: false,
            rateLimitExceeded: true,
            reason: 'Rate limit exceeded'
          };
        }
      }

      // Update usage tracking
      this.updateUsageTracking(keyConfig.name);

      // Log successful validation
      this.logAuditEvent({
        eventType: 'key_validation',
        timestamp: new Date(),
        keyName: keyConfig.name,
        ip: context.ip,
        userAgent: context.userAgent,
        success: true,
        details: {
          endpoint: context.endpoint,
          validationTime: Date.now() - startTime
        }
      });

      return {
        isValid: true,
        keyConfig
      };
    } catch (error) {
      logger.error('API key validation error', {
        error: error instanceof Error ? error.message : String(error),
        context
      });

      return {
        isValid: false,
        reason: 'Validation error occurred'
      };
    }
  }

  /**
   * Check rate limits for a specific key
   */
  private checkRateLimit(keyConfig: ApiKeyConfig): {
    allowed: boolean;
    currentUsage: number;
  } {
    if (!keyConfig.rateLimit) {
      return { allowed: true, currentUsage: 0 };
    }

    const usage = this.keyUsage.get(keyConfig.name);
    const now = new Date();

    if (!usage) {
      return { allowed: true, currentUsage: 0 };
    }

    // Check if we're in a new window
    const windowElapsed = now.getTime() - usage.windowStart.getTime();
    if (windowElapsed >= keyConfig.rateLimit.windowMs) {
      // Reset the window
      usage.requestCount = 0;
      usage.windowStart = now;
      return { allowed: true, currentUsage: 0 };
    }

    // Check if we've exceeded the limit
    return {
      allowed: usage.requestCount < keyConfig.rateLimit.maxRequests,
      currentUsage: usage.requestCount
    };
  }

  /**
   * Update usage tracking for a key
   */
  private updateUsageTracking(keyName: string): void {
    const now = new Date();
    const usage = this.keyUsage.get(keyName);

    if (!usage) {
      this.keyUsage.set(keyName, {
        keyName,
        requestCount: 1,
        lastUsed: now,
        windowStart: now
      });
    } else {
      usage.requestCount++;
      usage.lastUsed = now;
    }
  }

  /**
   * Rotate API key
   */
  public rotateKey(keyName: string): Either<Error, string> {
    try {
      const existingConfig = Array.from(this.keys.values())
        .find(config => config.name === keyName);

      if (!existingConfig) {
        return left(new Error(`Key ${keyName} not found`));
      }

      // Generate new API key
      const newApiKey = this.generateApiKey();
      const newKeyHash = this.hashKey(newApiKey);

      // Remove old key
      const oldKeyHash = Array.from(this.keys.entries())
        .find(([_, config]) => config.name === keyName)?.[0];

      if (oldKeyHash) {
        this.keys.delete(oldKeyHash);
      }

      // Add new key with same configuration
      const newConfig = {
        ...existingConfig,
        key: newKeyHash
      };
      this.keys.set(newKeyHash, newConfig);

      this.logAuditEvent({
        eventType: 'key_rotation',
        timestamp: new Date(),
        keyName,
        success: true,
        details: {
          action: 'key_rotated'
        }
      });

      return right(newApiKey);
    } catch (error) {
      return left(error as Error);
    }
  }

  /**
   * Get API key usage statistics
   */
  public getKeyUsageStats(): Record<string, {
    requestCount: number;
    lastUsed: Date;
    rateLimitStatus: 'ok' | 'approaching_limit' | 'exceeded';
  }> {
    const stats: Record<string, any> = {};

    const usageEntries = Array.from(this.keyUsage.entries());
    for (const [keyName, usage] of usageEntries) {
      const keyConfig = Array.from(this.keys.values())
        .find(config => config.name === keyName);

      let rateLimitStatus: 'ok' | 'approaching_limit' | 'exceeded' = 'ok';
      
      if (keyConfig?.rateLimit) {
        const rateLimitResult = this.checkRateLimit(keyConfig);
        const utilizationPercentage = (rateLimitResult.currentUsage / keyConfig.rateLimit.maxRequests) * 100;
        
        if (utilizationPercentage >= 90) {
          rateLimitStatus = 'exceeded';
        } else if (utilizationPercentage >= 70) {
          rateLimitStatus = 'approaching_limit';
        }
      }

      stats[keyName] = {
        requestCount: usage.requestCount,
        lastUsed: usage.lastUsed,
        rateLimitStatus
      };
    }

    return stats;
  }

  /**
   * Get security audit log
   */
  public getAuditLog(limit: number = 100): SecurityAuditEvent[] {
    return this.auditLog
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Hash API key for secure storage
   */
  private hashKey(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Generate a new API key
   */
  private generateApiKey(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Secure string comparison to prevent timing attacks
   */
  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    const bufferA = Buffer.from(a, 'utf8');
    const bufferB = Buffer.from(b, 'utf8');

    return timingSafeEqual(bufferA, bufferB);
  }

  /**
   * Log security audit event
   */
  private logAuditEvent(event: SecurityAuditEvent): void {
    this.auditLog.push(event);

    // Keep audit log size manageable
    if (this.auditLog.length > this.maxAuditLogSize) {
      this.auditLog = this.auditLog.slice(-this.maxAuditLogSize);
    }

    // Log significant events
    if (event.eventType === 'invalid_key_attempt' || event.eventType === 'rate_limit_exceeded') {
      logger.warn('Security event', {
        eventType: event.eventType,
        keyName: event.keyName,
        ip: event.ip,
        success: event.success,
        details: event.details
      });
    } else if (event.eventType === 'key_rotation') {
      logger.info('Key rotation event', {
        keyName: event.keyName,
        details: event.details
      });
    }
  }

  /**
   * Start cleanup timer for expired data
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupExpiredData();
    }, 60 * 60 * 1000); // Run every hour
  }

  /**
   * Clean up expired data
   */
  private cleanupExpiredData(): void {
    const now = new Date();

    // Clean up expired keys
    const keyEntries = Array.from(this.keys.entries());
    for (const [keyHash, config] of keyEntries) {
      if (config.expiresAt && config.expiresAt < now) {
        this.removeKey(keyHash);
      }
    }

    // Clean up old usage data
    const usageEntriesForCleanup = Array.from(this.keyUsage.entries());
    for (const [keyName, usage] of usageEntriesForCleanup) {
      const timeSinceLastUse = now.getTime() - usage.lastUsed.getTime();
      if (timeSinceLastUse > 24 * 60 * 60 * 1000) { // 24 hours
        this.keyUsage.delete(keyName);
      }
    }

    logger.debug('Cleanup completed', {
      activeKeys: this.keys.size,
      trackedUsage: this.keyUsage.size,
      auditLogSize: this.auditLog.length
    });
  }

  /**
   * Validate that all required API keys are present
   */
  public validateRequiredKeys(): Either<Error[], void> {
    const requiredKeys = [
      { envVar: 'OPENAI_API_KEY', name: 'OpenAI API' },
      { envVar: 'SUPABASE_URL', name: 'Supabase URL' },
      { envVar: 'SUPABASE_ANON_KEY', name: 'Supabase Anon Key' }
    ];

    const missingKeys: Error[] = [];

    for (const { envVar, name } of requiredKeys) {
      if (!process.env[envVar]) {
        missingKeys.push(new Error(`Missing required environment variable: ${envVar} (${name})`));
      }
    }

    // Optional but recommended keys
    const optionalKeys = [
      { envVar: 'MCP_API_KEY', name: 'MCP Server API Key' },
      { envVar: 'HIVE_API_KEY', name: 'Hive Intelligence API Key' },
      { envVar: 'INTERNAL_API_KEY', name: 'Internal Service API Key' }
    ];

    for (const { envVar, name } of optionalKeys) {
      if (!process.env[envVar]) {
        logger.warn(`Optional API key not configured: ${envVar} (${name})`);
      }
    }

    if (missingKeys.length > 0) {
      return left(missingKeys);
    }

    return right(void 0);
  }
}

/**
 * Singleton instance
 */
export const apiKeyValidationService = new ApiKeyValidationService();