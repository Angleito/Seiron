import { Socket, Server } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { createServiceLogger } from '../services/LoggingService';
import { SocketService } from '../services/SocketService';
import { performance } from 'perf_hooks';

/**
 * WebSocket Middleware for Authentication, Rate Limiting, and Error Handling
 * 
 * This middleware provides comprehensive logging and monitoring for WebSocket connections
 * following the Dragon Ball Z theme and functional programming patterns.
 */

const logger = createServiceLogger('WebSocketMiddleware');

// ============================================================================
// Interfaces and Types
// ============================================================================

export interface WebSocketUser {
  walletAddress: string;
  authenticated: boolean;
  connectionTime: Date;
  lastActivity: Date;
  messageCount: number;
  errorCount: number;
}

export interface RateLimitConfig {
  maxMessages: number;
  windowMs: number;
  maxConnections: number;
  connectionWindowMs: number;
}

export interface WebSocketMiddlewareOptions {
  rateLimitConfig?: RateLimitConfig;
  enableAuthLogging?: boolean;
  enableRateLimitLogging?: boolean;
  enableErrorLogging?: boolean;
  enablePerformanceLogging?: boolean;
}

// ============================================================================
// Rate Limiting Store
// ============================================================================

class RateLimitStore {
  private messageWindows: Map<string, { count: number; resetTime: number }> = new Map();
  private connectionWindows: Map<string, { count: number; resetTime: number }> = new Map();

  public checkMessageLimit(socketId: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const window = this.messageWindows.get(socketId);

    if (!window || now > window.resetTime) {
      this.messageWindows.set(socketId, {
        count: 1,
        resetTime: now + config.windowMs
      });
      return true;
    }

    if (window.count >= config.maxMessages) {
      return false;
    }

    window.count++;
    return true;
  }

  public checkConnectionLimit(ipAddress: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const window = this.connectionWindows.get(ipAddress);

    if (!window || now > window.resetTime) {
      this.connectionWindows.set(ipAddress, {
        count: 1,
        resetTime: now + config.connectionWindowMs
      });
      return true;
    }

    if (window.count >= config.maxConnections) {
      return false;
    }

    window.count++;
    return true;
  }

  public cleanup(): void {
    const now = Date.now();
    
    // Clean up expired message windows
    this.messageWindows.forEach((window, key) => {
      if (now > window.resetTime) {
        this.messageWindows.delete(key);
      }
    });

    // Clean up expired connection windows
    this.connectionWindows.forEach((window, key) => {
      if (now > window.resetTime) {
        this.connectionWindows.delete(key);
      }
    });
  }
}

// ============================================================================
// WebSocket Middleware Implementation
// ============================================================================

export class WebSocketMiddleware {
  private rateLimitStore = new RateLimitStore();
  private authenticatedUsers: Map<string, WebSocketUser> = new Map();
  private options: Required<WebSocketMiddlewareOptions>;

  constructor(options: WebSocketMiddlewareOptions = {}) {
    this.options = {
      rateLimitConfig: {
        maxMessages: 100,
        windowMs: 60000, // 1 minute
        maxConnections: 10,
        connectionWindowMs: 60000 // 1 minute
      },
      enableAuthLogging: true,
      enableRateLimitLogging: true,
      enableErrorLogging: true,
      enablePerformanceLogging: true,
      ...options
    };

    // Clean up rate limit store every 5 minutes
    setInterval(() => {
      this.rateLimitStore.cleanup();
    }, 5 * 60 * 1000);

    logger.info('WebSocket middleware initialized', {
      metadata: {
        rateLimitConfig: this.options.rateLimitConfig,
        enabledFeatures: {
          authLogging: this.options.enableAuthLogging,
          rateLimitLogging: this.options.enableRateLimitLogging,
          errorLogging: this.options.enableErrorLogging,
          performanceLogging: this.options.enablePerformanceLogging
        }
      }
    });
  }

  /**
   * Authentication middleware
   */
  public authenticationMiddleware = (
    socket: Socket,
    next: (err?: ExtendedError) => void
  ) => {
    const startTime = performance.now();
    const ipAddress = socket.handshake.address;
    const userAgent = socket.handshake.headers['user-agent'];
    const walletAddress = socket.handshake.auth?.walletAddress;

    if (this.options.enableAuthLogging) {
      logger.info('Authentication attempt', {
        metadata: {
          socketId: socket.id,
          ipAddress,
          userAgent,
          walletAddress: walletAddress ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` : 'none',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if wallet address is provided
    if (!walletAddress || typeof walletAddress !== 'string') {
      const error = new Error('Wallet address is required for authentication') as ExtendedError;
      error.data = { code: 'WALLET_REQUIRED' };
      
      if (this.options.enableAuthLogging) {
        logger.warn('Authentication failed - no wallet address', {
          metadata: {
            socketId: socket.id,
            ipAddress,
            userAgent,
            duration: `${(performance.now() - startTime).toFixed(2)}ms`
          }
        });
      }
      
      return next(error);
    }

    // Basic wallet address validation
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      const error = new Error('Invalid wallet address format') as ExtendedError;
      error.data = { code: 'INVALID_WALLET_FORMAT' };
      
      if (this.options.enableAuthLogging) {
        logger.warn('Authentication failed - invalid wallet format', {
          metadata: {
            socketId: socket.id,
            ipAddress,
            walletAddress: walletAddress.substring(0, 10) + '...',
            duration: `${(performance.now() - startTime).toFixed(2)}ms`
          }
        });
      }
      
      return next(error);
    }

    // Store authenticated user
    const user: WebSocketUser = {
      walletAddress,
      authenticated: true,
      connectionTime: new Date(),
      lastActivity: new Date(),
      messageCount: 0,
      errorCount: 0
    };

    this.authenticatedUsers.set(socket.id, user);

    if (this.options.enableAuthLogging) {
      logger.info('Authentication successful', {
        walletAddress,
        metadata: {
          socketId: socket.id,
          ipAddress,
          userAgent,
          duration: `${(performance.now() - startTime).toFixed(2)}ms`
        }
      });
    }

    next();
  };

  /**
   * Rate limiting middleware
   */
  public rateLimitMiddleware = (
    socket: Socket,
    next: (err?: ExtendedError) => void
  ) => {
    const ipAddress = socket.handshake.address;
    
    // Check connection rate limit
    if (!this.rateLimitStore.checkConnectionLimit(ipAddress, this.options.rateLimitConfig)) {
      const error = new Error('Too many connections from this IP') as ExtendedError;
      error.data = { code: 'CONNECTION_RATE_LIMIT' };
      
      if (this.options.enableRateLimitLogging) {
        logger.warn('Connection rate limit exceeded', {
          metadata: {
            socketId: socket.id,
            ipAddress,
            maxConnections: this.options.rateLimitConfig.maxConnections,
            windowMs: this.options.rateLimitConfig.connectionWindowMs
          }
        });
      }
      
      return next(error);
    }

    if (this.options.enableRateLimitLogging) {
      logger.debug('Connection rate limit check passed', {
        metadata: {
          socketId: socket.id,
          ipAddress,
          maxConnections: this.options.rateLimitConfig.maxConnections
        }
      });
    }

    next();
  };

  /**
   * Error handling middleware
   */
  public errorHandlingMiddleware = (
    socket: Socket,
    next: (err?: ExtendedError) => void
  ) => {
    const user = this.authenticatedUsers.get(socket.id);
    
    // Wrap socket event handlers with error handling
    const originalEmit = socket.emit;
    socket.emit = function(eventName: string, ...args: any[]) {
      try {
        return originalEmit.apply(this, [eventName, ...args]);
      } catch (error) {
        if (user) {
          user.errorCount++;
          user.lastActivity = new Date();
        }

        logger.error('Socket emit error', {
          walletAddress: user?.walletAddress,
          metadata: {
            socketId: socket.id,
            eventName,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }, error as Error);

        // Emit error to client
        socket.emit('error', {
          code: 'EMIT_ERROR',
          message: 'Failed to emit event',
          eventName
        });

        return false;
      }
    };

    next();
  };

  /**
   * Message rate limiting for individual sockets
   */
  public createMessageRateLimiter = (socketService: SocketService) => {
    return (eventName: string, handler: (data: any, socket: Socket) => void) => {
      return (data: any, socket: Socket) => {
        const user = this.authenticatedUsers.get(socket.id);
        
        // Check message rate limit
        if (!this.rateLimitStore.checkMessageLimit(socket.id, this.options.rateLimitConfig)) {
          if (user) {
            user.errorCount++;
            user.lastActivity = new Date();
          }

          if (this.options.enableRateLimitLogging) {
            logger.warn('Message rate limit exceeded', {
              walletAddress: user?.walletAddress,
              metadata: {
                socketId: socket.id,
                eventName,
                maxMessages: this.options.rateLimitConfig.maxMessages,
                windowMs: this.options.rateLimitConfig.windowMs
              }
            });
          }

          socket.emit('error', {
            code: 'MESSAGE_RATE_LIMIT',
            message: 'Too many messages, please slow down',
            eventName
          });
          return;
        }

        // Update user activity
        if (user) {
          user.messageCount++;
          user.lastActivity = new Date();
        }

        // Log message routing
        socketService.logMessageRouting(eventName, data, socket);

        try {
          handler(data, socket);
        } catch (error) {
          if (user) {
            user.errorCount++;
            user.lastActivity = new Date();
          }

          socketService.logMessageDeliveryFailure(eventName, error as Error, socket);

          socket.emit('error', {
            code: 'HANDLER_ERROR',
            message: 'Failed to process message',
            eventName
          });
        }
      };
    };
  };

  /**
   * Connection cleanup handler
   */
  public createDisconnectHandler = (socketService: SocketService) => {
    return (socket: Socket) => {
      const user = this.authenticatedUsers.get(socket.id);
      
      if (user && this.options.enableAuthLogging) {
        const sessionDuration = Date.now() - user.connectionTime.getTime();
        
        logger.info('User session ended', {
          walletAddress: user.walletAddress,
          metadata: {
            socketId: socket.id,
            sessionDuration: `${sessionDuration}ms`,
            messageCount: user.messageCount,
            errorCount: user.errorCount,
            lastActivity: user.lastActivity.toISOString()
          }
        });
      }

      // Clean up user data
      this.authenticatedUsers.delete(socket.id);
      
      // Call socketService cleanup
      socketService.removeUserSocket(socket);
    };
  };

  /**
   * Get authenticated user info
   */
  public getAuthenticatedUser(socketId: string): WebSocketUser | undefined {
    return this.authenticatedUsers.get(socketId);
  }

  /**
   * Get all authenticated users
   */
  public getAllAuthenticatedUsers(): WebSocketUser[] {
    return Array.from(this.authenticatedUsers.values());
  }

  /**
   * Get middleware statistics
   */
  public getMiddlewareStats(): {
    authenticatedUsers: number;
    totalMessages: number;
    totalErrors: number;
    avgSessionDuration: number;
    rateLimitViolations: number;
  } {
    const users = Array.from(this.authenticatedUsers.values());
    const now = Date.now();
    
    return {
      authenticatedUsers: users.length,
      totalMessages: users.reduce((sum, user) => sum + user.messageCount, 0),
      totalErrors: users.reduce((sum, user) => sum + user.errorCount, 0),
      avgSessionDuration: users.length > 0 
        ? users.reduce((sum, user) => sum + (now - user.connectionTime.getTime()), 0) / users.length
        : 0,
      rateLimitViolations: users.reduce((sum, user) => sum + user.errorCount, 0) // Approximate
    };
  }
}

// ============================================================================
// Default Export
// ============================================================================

export const createWebSocketMiddleware = (options?: WebSocketMiddlewareOptions): WebSocketMiddleware => {
  return new WebSocketMiddleware(options);
};