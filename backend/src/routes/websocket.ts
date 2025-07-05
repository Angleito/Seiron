import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { createServiceLogger } from '../services/LoggingService';
import { validateWallet } from '../middleware/validateWallet';

/**
 * WebSocket Monitoring API Routes
 * 
 * Provides endpoints for monitoring WebSocket connections, metrics, and health status.
 * These endpoints are crucial for debugging real-time communication issues.
 */

const router = Router();
const logger = createServiceLogger('WebSocketRoutes');

/**
 * GET /api/websocket/metrics
 * Get current WebSocket metrics and statistics
 */
router.get('/metrics', (req, res) => {
  try {
    const socketService = req.services.socket;
    const metrics = socketService.getWebSocketMetrics();
    const healthStatus = socketService.getHealthStatus();
    
    logger.info('WebSocket metrics requested', {
      metadata: {
        requestId: req.headers['x-request-id'],
        activeConnections: metrics.activeConnections,
        totalMessages: metrics.totalMessages,
        healthStatus: healthStatus.status
      }
    });

    res.json({
      success: true,
      data: {
        metrics,
        health: healthStatus,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get WebSocket metrics', {
      metadata: {
        requestId: req.headers['x-request-id'],
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, error as Error);

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve WebSocket metrics'
    });
  }
});

/**
 * GET /api/websocket/connections
 * Get information about all active WebSocket connections
 */
router.get('/connections', (req, res) => {
  try {
    const socketService = req.services.socket;
    const connections = socketService.getActiveConnections();
    
    // Sanitize sensitive information
    const sanitizedConnections = connections.map(conn => ({
      id: conn.id,
      walletAddress: conn.walletAddress ? 
        `${conn.walletAddress.substring(0, 6)}...${conn.walletAddress.substring(conn.walletAddress.length - 4)}` :
        null,
      connectedAt: conn.connectedAt,
      lastActivity: conn.lastActivity,
      messageCount: conn.messageCount,
      errorCount: conn.errorCount,
      rooms: conn.rooms,
      sessionDuration: Date.now() - conn.connectedAt.getTime()
    }));

    logger.info('WebSocket connections requested', {
      metadata: {
        requestId: req.headers['x-request-id'],
        connectionCount: connections.length
      }
    });

    res.json({
      success: true,
      data: {
        connections: sanitizedConnections,
        count: connections.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get WebSocket connections', {
      metadata: {
        requestId: req.headers['x-request-id'],
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, error as Error);

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve WebSocket connections'
    });
  }
});

/**
 * GET /api/websocket/connection/:socketId
 * Get detailed information about a specific WebSocket connection
 */
router.get('/connection/:socketId', (req, res) => {
  try {
    const { socketId } = req.params;
    const socketService = req.services.socket;
    const connectionInfo = socketService.getSocketConnectionInfo(socketId);

    if (!connectionInfo) {
      return res.status(404).json({
        success: false,
        error: 'Socket connection not found'
      });
    }

    // Sanitize sensitive information
    const sanitizedConnection = {
      id: connectionInfo.id,
      walletAddress: connectionInfo.walletAddress ? 
        `${connectionInfo.walletAddress.substring(0, 6)}...${connectionInfo.walletAddress.substring(connectionInfo.walletAddress.length - 4)}` :
        null,
      connectedAt: connectionInfo.connectedAt,
      lastActivity: connectionInfo.lastActivity,
      messageCount: connectionInfo.messageCount,
      errorCount: connectionInfo.errorCount,
      rooms: connectionInfo.rooms,
      sessionDuration: Date.now() - connectionInfo.connectedAt.getTime(),
      userAgent: connectionInfo.userAgent,
      ipAddress: connectionInfo.ipAddress ? 
        connectionInfo.ipAddress.split('.').map((part, index) => index < 2 ? part : 'x').join('.') :
        null
    };

    logger.info('WebSocket connection details requested', {
      metadata: {
        requestId: req.headers['x-request-id'],
        socketId,
        walletAddress: connectionInfo.walletAddress
      }
    });

    res.json({
      success: true,
      data: {
        connection: sanitizedConnection,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get WebSocket connection details', {
      metadata: {
        requestId: req.headers['x-request-id'],
        socketId: req.params.socketId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, error as Error);

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve WebSocket connection details'
    });
  }
});

/**
 * GET /api/websocket/user/:walletAddress/stats
 * Get connection statistics for a specific user
 */
router.get('/user/:walletAddress/stats', validateWallet, (req, res) => {
  try {
    const { walletAddress } = req.params;
    const socketService = req.services.socket;
    const userStats = socketService.getUserConnectionStats(walletAddress);

    logger.info('User WebSocket stats requested', {
      walletAddress,
      metadata: {
        requestId: req.headers['x-request-id'],
        activeConnections: userStats.activeConnections,
        totalMessages: userStats.totalMessages
      }
    });

    res.json({
      success: true,
      data: {
        walletAddress,
        stats: userStats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get user WebSocket stats', {
      walletAddress: req.params.walletAddress,
      metadata: {
        requestId: req.headers['x-request-id'],
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, error as Error);

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user WebSocket statistics'
    });
  }
});

/**
 * POST /api/websocket/user/:walletAddress/disconnect
 * Force disconnect all sockets for a user (admin debugging feature)
 */
router.post('/user/:walletAddress/disconnect', [
  validateWallet,
  body('reason').optional().isString().withMessage('Reason must be a string')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const { walletAddress } = req.params;
    const { reason } = req.body;
    const socketService = req.services.socket;

    logger.warn('Force disconnecting user sockets', {
      walletAddress,
      metadata: {
        requestId: req.headers['x-request-id'],
        reason: reason || 'Admin requested',
        timestamp: new Date().toISOString()
      }
    });

    socketService.forceDisconnectUser(walletAddress);

    res.json({
      success: true,
      data: {
        walletAddress,
        action: 'force_disconnect',
        reason: reason || 'Admin requested',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to force disconnect user', {
      walletAddress: req.params.walletAddress,
      metadata: {
        requestId: req.headers['x-request-id'],
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, error as Error);

    res.status(500).json({
      success: false,
      error: 'Failed to disconnect user sockets'
    });
  }
});

/**
 * GET /api/websocket/health
 * Get WebSocket service health status
 */
router.get('/health', (req, res) => {
  try {
    const socketService = req.services.socket;
    const healthStatus = socketService.getHealthStatus();

    const httpStatusCode = healthStatus.status === 'healthy' ? 200 :
                          healthStatus.status === 'degraded' ? 206 : 503;

    logger.info('WebSocket health check requested', {
      metadata: {
        requestId: req.headers['x-request-id'],
        healthStatus: healthStatus.status,
        issueCount: healthStatus.issues.length
      }
    });

    res.status(httpStatusCode).json({
      success: healthStatus.status !== 'unhealthy',
      data: {
        status: healthStatus.status,
        metrics: healthStatus.metrics,
        issues: healthStatus.issues,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get WebSocket health status', {
      metadata: {
        requestId: req.headers['x-request-id'],
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, error as Error);

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve WebSocket health status'
    });
  }
});

/**
 * GET /api/websocket/logs
 * Get recent WebSocket-related logs (filtered from main logging service)
 */
router.get('/logs', [
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
  query('level').optional().isIn(['debug', 'info', 'warn', 'error', 'fatal']).withMessage('Invalid log level'),
  query('socketId').optional().isString().withMessage('Socket ID must be a string')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const level = req.query.level as string;
    const socketId = req.query.socketId as string;

    // This would need to be implemented in the LoggingService
    // For now, return a placeholder response
    const logs = []; // TODO: Implement log filtering in LoggingService

    logger.info('WebSocket logs requested', {
      metadata: {
        requestId: req.headers['x-request-id'],
        limit,
        level,
        socketId
      }
    });

    res.json({
      success: true,
      data: {
        logs,
        filters: {
          limit,
          level,
          socketId
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get WebSocket logs', {
      metadata: {
        requestId: req.headers['x-request-id'],
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }, error as Error);

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve WebSocket logs'
    });
  }
});

export { router as websocketRouter };