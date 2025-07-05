import { Server, Socket } from 'socket.io';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import { createServiceLogger } from './LoggingService';
import { createServiceErrorHandler } from './ErrorHandlingService';
import { performance } from 'perf_hooks';

export interface PortfolioUpdate {
  type: 'position_update' | 'balance_change' | 'transaction_complete' | 'error' | 
        'confirmation_required' | 'transaction_confirmed' | 'transaction_rejected' | 'transaction_expired';
  data: any;
  timestamp: string;
}

export interface WebSocketMetrics {
  totalConnections: number;
  activeConnections: number;
  totalMessages: number;
  messagesByType: Record<string, number>;
  errorCount: number;
  avgResponseTime: number;
  connectionsPerUser: Record<string, number>;
  roomStats: Record<string, number>;
  reconnectionAttempts: number;
  lastActivity: Date;
}

export interface SocketConnectionInfo {
  id: string;
  walletAddress?: string;
  connectedAt: Date;
  lastActivity: Date;
  messageCount: number;
  errorCount: number;
  userAgent?: string;
  ipAddress?: string;
  rooms: string[];
}

export class SocketService {
  private io: Server;
  private userSockets: Map<string, Socket[]> = new Map();
  private logger = createServiceLogger('SocketService');
  private errorHandler = createServiceErrorHandler('SocketService');
  private socketConnections: Map<string, SocketConnectionInfo> = new Map();
  private metrics: WebSocketMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    totalMessages: 0,
    messagesByType: {},
    errorCount: 0,
    avgResponseTime: 0,
    connectionsPerUser: {},
    roomStats: {},
    reconnectionAttempts: 0,
    lastActivity: new Date()
  };
  private performanceTimers: Map<string, number> = new Map();
  private messageHandlers: Map<string, (data: any, socket: Socket) => void> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.logger.info('SocketService initialized for real-time Dragon Ball themed updates');
    this.initializeMetricsTracking();
  }

  /**
   * Add user socket connection
   */
  public addUserSocket(walletAddress: string, socket: Socket): void {
    const userSockets = this.userSockets.get(walletAddress) || [];
    userSockets.push(socket);
    this.userSockets.set(walletAddress, userSockets);
    
    // Track connection info
    const connectionInfo: SocketConnectionInfo = {
      id: socket.id,
      walletAddress,
      connectedAt: new Date(),
      lastActivity: new Date(),
      messageCount: 0,
      errorCount: 0,
      userAgent: socket.handshake.headers['user-agent'],
      ipAddress: socket.handshake.address,
      rooms: []
    };
    
    this.socketConnections.set(socket.id, connectionInfo);
    
    // Update metrics
    this.metrics.totalConnections++;
    this.metrics.activeConnections++;
    this.metrics.connectionsPerUser[walletAddress] = userSockets.length;
    this.metrics.lastActivity = new Date();
    
    this.logger.info('User socket connected', {
      walletAddress,
      metadata: { 
        socketId: socket.id,
        totalConnections: userSockets.length,
        userAgent: connectionInfo.userAgent,
        ipAddress: connectionInfo.ipAddress,
        totalActiveConnections: this.metrics.activeConnections
      }
    });
  }

  /**
   * Remove user socket connection
   */
  public removeUserSocket(socket: Socket): void {
    const connectionInfo = this.socketConnections.get(socket.id);
    
    for (const [walletAddress, sockets] of Array.from(this.userSockets)) {
      const index = sockets.findIndex(s => s.id === socket.id);
      if (index !== -1) {
        sockets.splice(index, 1);
        if (sockets.length === 0) {
          this.userSockets.delete(walletAddress);
          delete this.metrics.connectionsPerUser[walletAddress];
        } else {
          this.userSockets.set(walletAddress, sockets);
          this.metrics.connectionsPerUser[walletAddress] = sockets.length;
        }
        
        // Update metrics
        this.metrics.activeConnections--;
        this.metrics.lastActivity = new Date();
        
        // Log disconnection with session statistics
        this.logger.info('User socket disconnected', {
          walletAddress,
          metadata: { 
            socketId: socket.id,
            remainingConnections: sockets.length,
            sessionDuration: connectionInfo ? Date.now() - connectionInfo.connectedAt.getTime() : 0,
            totalMessages: connectionInfo?.messageCount || 0,
            errorCount: connectionInfo?.errorCount || 0,
            totalActiveConnections: this.metrics.activeConnections
          }
        });
        
        // Remove connection tracking
        this.socketConnections.delete(socket.id);
        break;
      }
    }
  }

  /**
   * Send portfolio update to specific user
   */
  public sendPortfolioUpdate = (
    walletAddress: string, 
    update: PortfolioUpdate
  ): TE.TaskEither<Error, void> =>
    pipe(
      TE.tryCatch(
        async () => {
          const startTime = performance.now();
          const userSockets = this.userSockets.get(walletAddress);
          
          if (!userSockets || userSockets.length === 0) {
            this.logger.warn('No active sockets for portfolio update', {
              walletAddress,
              metadata: { updateType: update.type }
            });
            throw new Error(`No active sockets for user ${walletAddress}`);
          }

          const updateWithTimestamp = {
            ...update,
            timestamp: new Date().toISOString()
          };

          let deliveredCount = 0;
          let failedCount = 0;

          userSockets.forEach(socket => {
            try {
              socket.emit('portfolio_update', updateWithTimestamp);
              deliveredCount++;
              
              // Track message for connection
              const connectionInfo = this.socketConnections.get(socket.id);
              if (connectionInfo) {
                connectionInfo.messageCount++;
                connectionInfo.lastActivity = new Date();
              }
            } catch (error) {
              failedCount++;
              this.logger.error('Failed to emit portfolio update to socket', {
                walletAddress,
                metadata: { 
                  socketId: socket.id,
                  updateType: update.type,
                  error: error instanceof Error ? error.message : 'Unknown error'
                }
              }, error as Error);
            }
          });

          // Update metrics
          this.metrics.totalMessages++;
          this.metrics.messagesByType['portfolio_update'] = (this.metrics.messagesByType['portfolio_update'] || 0) + 1;
          this.metrics.lastActivity = new Date();
          
          const duration = performance.now() - startTime;
          this.updateResponseTime(duration);

          this.logger.info('Portfolio update sent', {
            walletAddress,
            metadata: { 
              updateType: update.type,
              targetSockets: userSockets.length,
              deliveredCount,
              failedCount,
              duration: `${duration.toFixed(2)}ms`
            }
          });
        },
        (error) => {
          this.metrics.errorCount++;
          return new Error(`Failed to send portfolio update: ${error}`);
        }
      )
    );

  /**
   * Send chat response to specific user
   */
  public sendChatResponse = (
    walletAddress: string,
    response: any
  ): TE.TaskEither<Error, void> =>
    pipe(
      TE.tryCatch(
        async () => {
          const startTime = performance.now();
          const userSockets = this.userSockets.get(walletAddress);
          
          if (!userSockets || userSockets.length === 0) {
            this.logger.warn('No active sockets for chat response', {
              walletAddress,
              metadata: { responseType: typeof response }
            });
            throw new Error(`No active sockets for user ${walletAddress}`);
          }

          let deliveredCount = 0;
          let failedCount = 0;

          userSockets.forEach(socket => {
            try {
              socket.emit('chat_response', response);
              deliveredCount++;
              
              // Track message for connection
              const connectionInfo = this.socketConnections.get(socket.id);
              if (connectionInfo) {
                connectionInfo.messageCount++;
                connectionInfo.lastActivity = new Date();
              }
            } catch (error) {
              failedCount++;
              this.logger.error('Failed to emit chat response to socket', {
                walletAddress,
                metadata: { 
                  socketId: socket.id,
                  error: error instanceof Error ? error.message : 'Unknown error'
                }
              }, error as Error);
            }
          });

          // Update metrics
          this.metrics.totalMessages++;
          this.metrics.messagesByType['chat_response'] = (this.metrics.messagesByType['chat_response'] || 0) + 1;
          this.metrics.lastActivity = new Date();
          
          const duration = performance.now() - startTime;
          this.updateResponseTime(duration);

          this.logger.info('Chat response sent', {
            walletAddress,
            metadata: { 
              targetSockets: userSockets.length,
              deliveredCount,
              failedCount,
              duration: `${duration.toFixed(2)}ms`
            }
          });
        },
        (error) => {
          this.metrics.errorCount++;
          return new Error(`Failed to send chat response: ${error}`);
        }
      )
    );

  /**
   * Broadcast system message to all connected users
   */
  public broadcastSystemMessage = (message: string): TE.TaskEither<Error, void> =>
    TE.tryCatch(
      async () => {
        this.io.emit('system_message', {
          message,
          timestamp: new Date().toISOString()
        });
      },
      (error) => new Error(`Failed to broadcast system message: ${error}`)
    );

  /**
   * Send transaction status update
   */
  public sendTransactionUpdate = (
    walletAddress: string,
    txHash: string,
    status: 'pending' | 'confirmed' | 'failed',
    details?: any
  ): TE.TaskEither<Error, void> =>
    this.sendPortfolioUpdate(walletAddress, {
      type: 'transaction_complete',
      data: {
        txHash,
        status,
        details,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  /**
   * Send error notification to user
   */
  public sendError = (
    walletAddress: string,
    error: string,
    context?: any
  ): TE.TaskEither<Error, void> =>
    this.sendPortfolioUpdate(walletAddress, {
      type: 'error',
      data: {
        error,
        context,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

  /**
   * Get connected users count
   */
  public getConnectedUsersCount(): number {
    return this.userSockets.size;
  }

  /**
   * Get user socket count
   */
  public getUserSocketCount(walletAddress: string): number {
    return this.userSockets.get(walletAddress)?.length || 0;
  }

  /**
   * Check if user is connected
   */
  public isUserConnected(walletAddress: string): boolean {
    return this.getUserSocketCount(walletAddress) > 0;
  }

  /**
   * Send confirmation request to user
   */
  public sendConfirmationRequest = (
    walletAddress: string,
    transactionId: string,
    transactionDetails: any
  ): TE.TaskEither<Error, void> =>
    this.sendPortfolioUpdate(walletAddress, {
      type: 'confirmation_required',
      data: {
        transactionId,
        transaction: transactionDetails,
        requiresAction: true
      },
      timestamp: new Date().toISOString()
    });

  /**
   * Send confirmation status update
   */
  public sendConfirmationStatus = (
    walletAddress: string,
    transactionId: string,
    status: 'confirmed' | 'rejected' | 'expired',
    details?: any
  ): TE.TaskEither<Error, void> => {
    const typeMap = {
      'confirmed': 'transaction_confirmed',
      'rejected': 'transaction_rejected',
      'expired': 'transaction_expired'
    } as const;

    const baseUpdate: PortfolioUpdate = {
      type: typeMap[status],
      data: {
        transactionId,
        status,
        details,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    return this.sendPortfolioUpdate(walletAddress, baseUpdate);
  }

  // ============================================================================
  // WebSocket Monitoring and Metrics
  // ============================================================================

  /**
   * Initialize metrics tracking
   */
  private initializeMetricsTracking(): void {
    // Log metrics every 5 minutes
    setInterval(() => {
      this.logMetrics();
    }, 5 * 60 * 1000);

    // Clean up old performance timers every minute
    setInterval(() => {
      this.cleanupPerformanceTimers();
    }, 60 * 1000);
  }

  /**
   * Log current WebSocket metrics
   */
  private logMetrics(): void {
    this.logger.info('WebSocket metrics update', {
      metadata: {
        activeConnections: this.metrics.activeConnections,
        totalConnections: this.metrics.totalConnections,
        totalMessages: this.metrics.totalMessages,
        errorCount: this.metrics.errorCount,
        avgResponseTime: `${this.metrics.avgResponseTime.toFixed(2)}ms`,
        reconnectionAttempts: this.metrics.reconnectionAttempts,
        messagesByType: this.metrics.messagesByType,
        connectionsPerUser: Object.keys(this.metrics.connectionsPerUser).length,
        roomStats: this.metrics.roomStats
      }
    });
  }

  /**
   * Update response time metrics
   */
  private updateResponseTime(duration: number): void {
    // Simple moving average
    this.metrics.avgResponseTime = (this.metrics.avgResponseTime * 0.9) + (duration * 0.1);
  }

  /**
   * Clean up old performance timers
   */
  private cleanupPerformanceTimers(): void {
    const now = performance.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    this.performanceTimers.forEach((startTime, key) => {
      if (now - startTime > maxAge) {
        this.performanceTimers.delete(key);
        this.logger.warn('Cleaned up stale performance timer', {
          metadata: { timerKey: key, age: now - startTime }
        });
      }
    });
  }

  /**
   * Log room join event
   */
  public logRoomJoin(socket: Socket, roomName: string): void {
    const connectionInfo = this.socketConnections.get(socket.id);
    if (connectionInfo) {
      connectionInfo.rooms.push(roomName);
      connectionInfo.lastActivity = new Date();
    }

    this.metrics.roomStats[roomName] = (this.metrics.roomStats[roomName] || 0) + 1;
    this.metrics.lastActivity = new Date();

    this.logger.info('Socket joined room', {
      metadata: {
        socketId: socket.id,
        roomName,
        walletAddress: connectionInfo?.walletAddress,
        totalRoomMembers: this.metrics.roomStats[roomName]
      }
    });
  }

  /**
   * Log room leave event
   */
  public logRoomLeave(socket: Socket, roomName: string): void {
    const connectionInfo = this.socketConnections.get(socket.id);
    if (connectionInfo) {
      const index = connectionInfo.rooms.indexOf(roomName);
      if (index !== -1) {
        connectionInfo.rooms.splice(index, 1);
      }
      connectionInfo.lastActivity = new Date();
    }

    this.metrics.roomStats[roomName] = Math.max(0, (this.metrics.roomStats[roomName] || 0) - 1);
    this.metrics.lastActivity = new Date();

    this.logger.info('Socket left room', {
      metadata: {
        socketId: socket.id,
        roomName,
        walletAddress: connectionInfo?.walletAddress,
        totalRoomMembers: this.metrics.roomStats[roomName]
      }
    });
  }

  /**
   * Log message routing
   */
  public logMessageRouting(eventName: string, data: any, socket: Socket): void {
    const connectionInfo = this.socketConnections.get(socket.id);
    if (connectionInfo) {
      connectionInfo.messageCount++;
      connectionInfo.lastActivity = new Date();
    }

    this.metrics.totalMessages++;
    this.metrics.messagesByType[eventName] = (this.metrics.messagesByType[eventName] || 0) + 1;
    this.metrics.lastActivity = new Date();

    this.logger.debug('Message routing', {
      metadata: {
        eventName,
        socketId: socket.id,
        walletAddress: connectionInfo?.walletAddress,
        dataSize: JSON.stringify(data).length,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log failed message delivery
   */
  public logMessageDeliveryFailure(eventName: string, error: Error, socket: Socket): void {
    const connectionInfo = this.socketConnections.get(socket.id);
    if (connectionInfo) {
      connectionInfo.errorCount++;
      connectionInfo.lastActivity = new Date();
    }

    this.metrics.errorCount++;
    this.metrics.lastActivity = new Date();

    this.logger.error('Message delivery failed', {
      metadata: {
        eventName,
        socketId: socket.id,
        walletAddress: connectionInfo?.walletAddress,
        error: error.message
      }
    }, error);
  }

  /**
   * Log reconnection attempt
   */
  public logReconnectionAttempt(socket: Socket): void {
    this.metrics.reconnectionAttempts++;
    this.metrics.lastActivity = new Date();

    this.logger.info('Socket reconnection attempt', {
      metadata: {
        socketId: socket.id,
        userAgent: socket.handshake.headers['user-agent'],
        ipAddress: socket.handshake.address,
        totalReconnectionAttempts: this.metrics.reconnectionAttempts
      }
    });
  }

  /**
   * Get current WebSocket metrics
   */
  public getWebSocketMetrics(): WebSocketMetrics {
    return { ...this.metrics };
  }

  /**
   * Get connection info for a specific socket
   */
  public getSocketConnectionInfo(socketId: string): SocketConnectionInfo | undefined {
    return this.socketConnections.get(socketId);
  }

  /**
   * Get all active connections
   */
  public getActiveConnections(): SocketConnectionInfo[] {
    return Array.from(this.socketConnections.values());
  }

  /**
   * Get connection stats for a specific user
   */
  public getUserConnectionStats(walletAddress: string): {
    activeConnections: number;
    totalMessages: number;
    totalErrors: number;
    avgSessionDuration: number;
  } {
    const userConnections = Array.from(this.socketConnections.values())
      .filter(conn => conn.walletAddress === walletAddress);

    const totalMessages = userConnections.reduce((sum, conn) => sum + conn.messageCount, 0);
    const totalErrors = userConnections.reduce((sum, conn) => sum + conn.errorCount, 0);
    const avgSessionDuration = userConnections.length > 0 
      ? userConnections.reduce((sum, conn) => sum + (Date.now() - conn.connectedAt.getTime()), 0) / userConnections.length
      : 0;

    return {
      activeConnections: userConnections.length,
      totalMessages,
      totalErrors,
      avgSessionDuration
    };
  }

  /**
   * Force disconnect all sockets for a user (for debugging)
   */
  public forceDisconnectUser(walletAddress: string): void {
    const userSockets = this.userSockets.get(walletAddress);
    if (userSockets) {
      userSockets.forEach(socket => {
        this.logger.warn('Force disconnecting user socket', {
          walletAddress,
          metadata: { socketId: socket.id }
        });
        socket.disconnect(true);
      });
    }
  }

  /**
   * Get health status of WebSocket service
   */
  public getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: WebSocketMetrics;
    issues: string[];
  } {
    const issues: string[] = [];
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Check for high error rate
    if (this.metrics.errorCount > 100) {
      issues.push('High error count');
      status = 'degraded';
    }

    // Check for slow response times
    if (this.metrics.avgResponseTime > 1000) {
      issues.push('Slow response times');
      status = 'degraded';
    }

    // Check for too many active connections
    if (this.metrics.activeConnections > 1000) {
      issues.push('High connection count');
      status = 'degraded';
    }

    // Check for recent activity
    const timeSinceLastActivity = Date.now() - this.metrics.lastActivity.getTime();
    if (timeSinceLastActivity > 60000) { // 1 minute
      issues.push('No recent activity');
      status = 'unhealthy';
    }

    return {
      status,
      metrics: this.getWebSocketMetrics(),
      issues
    };
  }
}