import { Request, Response, NextFunction, RequestHandler } from 'express';
import { Either, left, right } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import { createHash, timingSafeEqual } from 'crypto';
import logger from '../utils/logger';
import { apiKeyValidationService } from '../services/ApiKeyValidationService';

/**
 * MCP Server Authentication Context
 */
interface McpAuthContext {
  serverId: string;
  serverName: string;
  permissions: string[];
  rateLimit: {
    maxRequests: number;
    windowMs: number;
  };
}

/**
 * MCP Request with authentication context
 */
export interface McpAuthenticatedRequest extends Request {
  mcpAuth?: McpAuthContext;
}

/**
 * MCP Authentication Configuration
 */
interface McpAuthConfig {
  servers: Record<string, {
    name: string;
    apiKey?: string;
    permissions: string[];
    rateLimit?: {
      maxRequests: number;
      windowMs: number;
    };
    enabled: boolean;
  }>;
  requireAuth: boolean;
  defaultPermissions: string[];
}

/**
 * MCP Authentication Service
 */
class McpAuthenticationService {
  private config: McpAuthConfig;
  private serverSessions: Map<string, {
    serverId: string;
    lastActivity: Date;
    requestCount: number;
    windowStart: Date;
  }> = new Map();

  constructor() {
    this.config = this.initializeConfig();
    this.startSessionCleanup();
  }

  /**
   * Initialize MCP authentication configuration
   */
  private initializeConfig(): McpAuthConfig {
    return {
      servers: {
        'hive-intelligence': {
          name: 'Hive Intelligence Server',
          apiKey: process.env.HIVE_MCP_API_KEY || process.env.MCP_API_KEY,
          permissions: ['market_data', 'sentiment_analysis', 'price_predictions'],
          rateLimit: {
            maxRequests: 1000,
            windowMs: 60 * 60 * 1000, // 1 hour
          },
          enabled: true
        },
        'sei-blockchain': {
          name: 'Sei Blockchain Server',
          apiKey: process.env.SEI_MCP_API_KEY || process.env.MCP_API_KEY,
          permissions: ['blockchain_operations', 'wallet_queries', 'defi_interactions'],
          rateLimit: {
            maxRequests: 500,
            windowMs: 60 * 60 * 1000, // 1 hour
          },
          enabled: true
        },
        'portfolio-manager': {
          name: 'Portfolio Manager Server',
          apiKey: process.env.PORTFOLIO_MCP_API_KEY || process.env.MCP_API_KEY,
          permissions: ['portfolio_analytics', 'risk_assessment', 'optimization_strategies'],
          rateLimit: {
            maxRequests: 800,
            windowMs: 60 * 60 * 1000, // 1 hour
          },
          enabled: true
        }
      },
      requireAuth: process.env.NODE_ENV === 'production',
      defaultPermissions: ['read']
    };
  }

  /**
   * Authenticate MCP server request
   */
  public async authenticateMcpRequest(
    req: Request,
    serverId?: string
  ): Promise<Either<Error, McpAuthContext>> {
    try {
      // Extract authentication information
      const authHeader = req.headers['x-mcp-auth'] as string;
      const apiKey = req.headers['x-api-key'] as string || req.headers['authorization']?.replace('Bearer ', '');
      const serverIdFromHeader = req.headers['x-mcp-server-id'] as string;
      
      const targetServerId = serverId || serverIdFromHeader;
      
      if (!targetServerId) {
        return left(new Error('MCP server ID is required'));
      }

      const serverConfig = this.config.servers[targetServerId];
      if (!serverConfig) {
        return left(new Error(`Unknown MCP server: ${targetServerId}`));
      }

      if (!serverConfig.enabled) {
        return left(new Error(`MCP server ${targetServerId} is disabled`));
      }

      // Skip authentication in development if not required
      if (!this.config.requireAuth && process.env.NODE_ENV !== 'production') {
        logger.debug('Skipping MCP authentication in development mode', {
          serverId: targetServerId,
          serverName: serverConfig.name
        });

        return right({
          serverId: targetServerId,
          serverName: serverConfig.name,
          permissions: serverConfig.permissions,
          rateLimit: serverConfig.rateLimit || { maxRequests: 1000, windowMs: 60 * 60 * 1000 }
        });
      }

      // Validate API key if provided in server config
      if (serverConfig.apiKey) {
        if (!apiKey) {
          return left(new Error('API key is required for MCP server authentication'));
        }

        // Use API key validation service
        const validationResult = await apiKeyValidationService.validateKey(
          apiKey,
          serverConfig.permissions,
          {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            endpoint: `mcp://${targetServerId}`
          }
        );

        if (!validationResult.isValid) {
          return left(new Error(validationResult.reason || 'Invalid API key'));
        }
      }

      // Check rate limits
      const rateLimitResult = this.checkMcpRateLimit(targetServerId, serverConfig);
      if (!rateLimitResult.allowed) {
        return left(new Error('MCP server rate limit exceeded'));
      }

      // Update session tracking
      this.updateSessionTracking(targetServerId);

      return right({
        serverId: targetServerId,
        serverName: serverConfig.name,
        permissions: serverConfig.permissions,
        rateLimit: serverConfig.rateLimit || { maxRequests: 1000, windowMs: 60 * 60 * 1000 }
      });
    } catch (error) {
      logger.error('MCP authentication error', {
        error: error instanceof Error ? error.message : String(error),
        serverId: serverId || 'unknown'
      });
      return left(new Error('MCP authentication failed'));
    }
  }

  /**
   * Check MCP server rate limits
   */
  private checkMcpRateLimit(serverId: string, serverConfig: any): {
    allowed: boolean;
    currentUsage: number;
  } {
    if (!serverConfig.rateLimit) {
      return { allowed: true, currentUsage: 0 };
    }

    const session = this.serverSessions.get(serverId);
    const now = new Date();

    if (!session) {
      return { allowed: true, currentUsage: 0 };
    }

    // Check if we're in a new window
    const windowElapsed = now.getTime() - session.windowStart.getTime();
    if (windowElapsed >= serverConfig.rateLimit.windowMs) {
      // Reset the window
      session.requestCount = 0;
      session.windowStart = now;
      return { allowed: true, currentUsage: 0 };
    }

    // Check if we've exceeded the limit
    return {
      allowed: session.requestCount < serverConfig.rateLimit.maxRequests,
      currentUsage: session.requestCount
    };
  }

  /**
   * Update session tracking for MCP server
   */
  private updateSessionTracking(serverId: string): void {
    const now = new Date();
    const session = this.serverSessions.get(serverId);

    if (!session) {
      this.serverSessions.set(serverId, {
        serverId,
        lastActivity: now,
        requestCount: 1,
        windowStart: now
      });
    } else {
      session.requestCount++;
      session.lastActivity = now;
    }
  }

  /**
   * Get MCP server statistics
   */
  public getMcpServerStats(): Record<string, {
    name: string;
    enabled: boolean;
    requestCount: number;
    lastActivity?: Date;
    rateLimitStatus: 'ok' | 'approaching_limit' | 'exceeded';
  }> {
    const stats: Record<string, any> = {};

    for (const [serverId, serverConfig] of Object.entries(this.config.servers)) {
      const session = this.serverSessions.get(serverId);
      
      let rateLimitStatus: 'ok' | 'approaching_limit' | 'exceeded' = 'ok';
      
      if (serverConfig.rateLimit && session) {
        const rateLimitResult = this.checkMcpRateLimit(serverId, serverConfig);
        const utilizationPercentage = (rateLimitResult.currentUsage / serverConfig.rateLimit.maxRequests) * 100;
        
        if (utilizationPercentage >= 90) {
          rateLimitStatus = 'exceeded';
        } else if (utilizationPercentage >= 70) {
          rateLimitStatus = 'approaching_limit';
        }
      }

      stats[serverId] = {
        name: serverConfig.name,
        enabled: serverConfig.enabled,
        requestCount: session?.requestCount || 0,
        lastActivity: session?.lastActivity,
        rateLimitStatus
      };
    }

    return stats;
  }

  /**
   * Start session cleanup timer
   */
  private startSessionCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60 * 60 * 1000); // Run every hour
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    const maxIdleTime = 24 * 60 * 60 * 1000; // 24 hours

    const sessionEntries = Array.from(this.serverSessions.entries());
    for (const [serverId, session] of sessionEntries) {
      const timeSinceLastActivity = now.getTime() - session.lastActivity.getTime();
      if (timeSinceLastActivity > maxIdleTime) {
        this.serverSessions.delete(serverId);
      }
    }
  }
}

// Singleton instance
const mcpAuthService = new McpAuthenticationService();

/**
 * MCP Authentication Middleware Factory
 */
export const createMcpAuthMiddleware = (requiredPermissions: string[] = []) => {
  return async (req: McpAuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authResult = await mcpAuthService.authenticateMcpRequest(req);
      
      if (authResult._tag === 'Left') {
        logger.warn('MCP authentication failed', {
          error: authResult.left.message,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path
        });
        
        res.status(401).json({
          error: 'MCP authentication failed',
          message: authResult.left.message,
          code: 'MCP_AUTH_FAILED'
        });
        return;
      }

      const authContext = authResult.right;

      // Check required permissions
      if (requiredPermissions.length > 0) {
        const hasRequiredPermissions = requiredPermissions.every(permission =>
          authContext.permissions.includes(permission)
        );

        if (!hasRequiredPermissions) {
          logger.warn('Insufficient MCP permissions', {
            serverId: authContext.serverId,
            required: requiredPermissions,
            available: authContext.permissions,
            ip: req.ip
          });

          res.status(403).json({
            error: 'Insufficient permissions',
            message: 'MCP server does not have required permissions for this operation',
            required: requiredPermissions,
            available: authContext.permissions,
            code: 'MCP_INSUFFICIENT_PERMISSIONS'
          });
          return;
        }
      }

      // Add authentication context to request
      req.mcpAuth = authContext;

      logger.debug('MCP authentication successful', {
        serverId: authContext.serverId,
        serverName: authContext.serverName,
        permissions: authContext.permissions,
        ip: req.ip
      });

      next();
    } catch (error) {
      logger.error('MCP authentication middleware error', {
        error: error instanceof Error ? error.message : String(error),
        ip: req.ip,
        path: req.path
      });

      res.status(500).json({
        error: 'Internal authentication error',
        code: 'MCP_AUTH_ERROR'
      });
    }
  };
};

/**
 * MCP Server ID validation middleware
 */
export const validateMcpServerId = (allowedServers?: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const serverId = req.headers['x-mcp-server-id'] as string || req.params.serverId;
    
    if (!serverId) {
      res.status(400).json({
        error: 'MCP server ID is required',
        code: 'MCP_SERVER_ID_MISSING'
      });
      return;
    }

    if (allowedServers && !allowedServers.includes(serverId)) {
      res.status(400).json({
        error: 'Invalid MCP server ID',
        allowed: allowedServers,
        provided: serverId,
        code: 'MCP_SERVER_ID_INVALID'
      });
      return;
    }

    next();
  };
};

/**
 * MCP Health check middleware
 */
export const mcpHealthCheck: RequestHandler = async (req, res, next) => {
  try {
    const stats = mcpAuthService.getMcpServerStats();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      mcpServers: stats,
      summary: {
        totalServers: Object.keys(stats).length,
        enabledServers: Object.values(stats).filter(s => s.enabled).length,
        activeServers: Object.values(stats).filter(s => s.requestCount > 0).length
      }
    });
  } catch (error) {
    logger.error('MCP health check error', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    res.status(500).json({
      status: 'error',
      error: 'Failed to get MCP server status'
    });
  }
};

/**
 * Create MCP-specific rate limiter
 */
export const createMcpRateLimit = () => {
  const requestCounts: Map<string, {
    count: number;
    resetTime: number;
  }> = new Map();

  return (req: McpAuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.mcpAuth) {
      return next();
    }

    const { serverId, rateLimit } = req.mcpAuth;
    const now = Date.now();
    const windowMs = rateLimit.windowMs;
    const maxRequests = rateLimit.maxRequests;

    const key = `mcp:${serverId}:${req.ip}`;
    const current = requestCounts.get(key);

    if (!current || now > current.resetTime) {
      // New window or expired window
      requestCounts.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    if (current.count >= maxRequests) {
      logger.warn('MCP rate limit exceeded', {
        serverId,
        ip: req.ip,
        currentCount: current.count,
        maxRequests
      });

      res.status(429).json({
        error: 'Rate limit exceeded for MCP server',
        serverId,
        maxRequests,
        windowMs,
        resetTime: new Date(current.resetTime).toISOString(),
        code: 'MCP_RATE_LIMIT_EXCEEDED'
      });
      return;
    }

    // Increment counter
    current.count++;
    next();
  };
};

export { mcpAuthService };