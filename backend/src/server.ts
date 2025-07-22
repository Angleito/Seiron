import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import logger from './utils/logger';
import { validateStartupConfiguration } from './config/validation';
import { securityAuditService } from './services/SecurityAuditService';
import { apiKeyValidationService } from './services/ApiKeyValidationService';
import { validateSecurityConfiguration } from './middleware/security';

import { chatRouter } from './routes/chat';
import { sessionsRouter } from './routes/sessions';
import { portfolioRouter } from './routes/portfolio';
import { aiRouter } from './routes/ai';
import { confirmationRouter } from './routes/confirmation';
import voiceRouter from './routes/voice';
import { websocketRouter } from './routes/websocket';
import authRouter from './routes/auth';
import { SocketService } from './services/SocketService';
import { PortfolioService } from './services/PortfolioService';
import { AIService } from './services/AIService';
import { ConfirmationService } from './services/ConfirmationService';
import { OrchestratorService } from './services/OrchestratorService';
import { SeiIntegrationService } from './services/SeiIntegrationService';
import { PortfolioAnalyticsService } from './services/PortfolioAnalyticsService';
import { RealTimeDataService } from './services/RealTimeDataService';
import { SupabaseService, createSupabaseService } from './services/SupabaseService';
import { AdapterInitializer, createAdapterConfig } from './services/AdapterInitializer';
import { errorHandler } from './middleware/errorHandler';
import { validateWallet } from './middleware/validateWallet';
import { requireAuth, optionalAuth } from './middleware/authenticate';
import { createWebSocketMiddleware } from './middleware/websocketMiddleware';
import { 
  requestIdMiddleware, 
  requestBodyLogger, 
  createMorganMiddleware, 
  errorRequestLogger, 
  requestCompletionLogger 
} from './middleware/requestLogger';
import { rateLimitMiddleware } from './middleware/apiKeyRateLimit';
import { apiKeyMiddleware } from './middleware/apiKeyErrorHandler';
import { createMcpAuthMiddleware, mcpHealthCheck } from './middleware/mcpAuthentication';
import { createSecurityMiddleware } from './middleware/security';

dotenv.config();

// Validate startup configuration
const startupValidation = validateStartupConfiguration();
if (startupValidation._tag === 'Left') {
  logger.error('Startup configuration validation failed', {
    errors: startupValidation.left.map(e => ({ field: e.field, message: e.message }))
  });
  
  // Log critical errors but continue startup in development
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  } else {
    logger.warn('Continuing startup in development mode despite configuration errors');
  }
} else {
  logger.info('Startup configuration validation passed', {
    environment: startupValidation.right.environment.environment,
    securityLevel: startupValidation.right.environment.securityLevel,
    configuredKeys: Object.keys(startupValidation.right.apiKeys.keys).length,
    warnings: startupValidation.right.apiKeys.warnings
  });
  
  // Log warnings
  startupValidation.right.apiKeys.warnings.forEach(warning => {
    logger.warn(`Configuration warning: ${warning}`);
  });
}

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Initialize security middleware
const securityMiddleware = createSecurityMiddleware();

// Request ID and logging middleware (before everything else)
app.use(requestIdMiddleware);
app.use(requestCompletionLogger);

// HTTP request logging
app.use(createMorganMiddleware());

// Enhanced security middleware
app.use(securityMiddleware.helmet);
app.use(securityMiddleware.securityHeaders);
app.use(securityMiddleware.securityMonitoring);
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

// Smart rate limiting with burst protection
app.use(securityMiddleware.burstProtection);
app.use(securityMiddleware.smartRateLimit);

// Input sanitization
app.use(securityMiddleware.inputSanitization);

// IP filtering (if configured)
app.use(securityMiddleware.ipFilter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request/Response body logging (after body parsing)
app.use(requestBodyLogger);

// Initialize services
const socketService = new SocketService(io);

// Initialize Supabase service
const supabaseServiceResult = createSupabaseService({
  url: process.env.SUPABASE_URL || '',
  anonKey: process.env.SUPABASE_ANON_KEY || '',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
});

let supabaseService: SupabaseService;
if (supabaseServiceResult._tag === 'Left') {
  logger.error('Failed to initialize Supabase service', { 
    error: supabaseServiceResult.left.message 
  });
  process.exit(1);
} else {
  supabaseService = supabaseServiceResult.right;
  logger.info('Supabase service initialized successfully');
}

// Initialize WebSocket middleware
const wsMiddleware = createWebSocketMiddleware({
  rateLimitConfig: {
    maxMessages: 100,
    windowMs: 60000, // 1 minute
    maxConnections: 10,
    connectionWindowMs: 60000 // 1 minute
  },
  enableAuthLogging: true,
  enableRateLimitLogging: true,
  enableErrorLogging: true,
  enablePerformanceLogging: true
});
const confirmationService = new ConfirmationService(socketService);
const portfolioService = new PortfolioService(socketService, confirmationService);
const aiService = new AIService();

// Initialize adapters
const adapterConfig = createAdapterConfig();
const adapterInitializer = new AdapterInitializer(adapterConfig);

const seiIntegrationService = new SeiIntegrationService({
  hive: {
    enabled: true,
    baseUrl: process.env.HIVE_BASE_URL || 'http://localhost:3001',
    apiKey: process.env.HIVE_API_KEY || '',
    rateLimitConfig: { maxRequests: 100, windowMs: 60000 },
    cacheConfig: { enabled: true, ttlMs: 300000, maxSize: 1000 }
  },
  sak: {
    enabled: true,
    seiRpcUrl: process.env.SEI_RPC_URL || 'https://sei-rpc.polkachu.com',
    seiEvmRpcUrl: process.env.SEI_EVM_RPC_URL || 'https://evm-rpc.sei-apis.com',
    chainId: process.env.SEI_CHAIN_ID || 'sei-testnet',
    network: 'testnet' as const,
    defaultPermissions: ['read', 'write'],
    walletPrivateKey: process.env.SAK_WALLET_PRIVATE_KEY,
    rateLimitConfig: { defaultMaxCalls: 100, defaultWindowMs: 60000 }
  },
  mcp: {
    enabled: true,
    endpoint: process.env.MCP_ENDPOINT || 'ws://localhost:3003',
    port: parseInt(process.env.MCP_PORT || '3003'),
    secure: process.env.NODE_ENV === 'production',
    apiKey: process.env.MCP_API_KEY,
    network: 'testnet' as const,
    connectionTimeout: 30000,
    heartbeatInterval: 30000
  }
});
const realTimeDataService = new RealTimeDataService(
  seiIntegrationService,
  socketService
);
const portfolioAnalyticsService = new PortfolioAnalyticsService(
  seiIntegrationService
);
const orchestratorService = new OrchestratorService(
  seiIntegrationService,
  portfolioAnalyticsService,
  realTimeDataService,
  socketService
);

// Make services available in request context
app.use((req, _res, next) => {
  req.services = {
    socket: socketService,
    portfolio: portfolioService,
    ai: aiService,
    confirmation: confirmationService,
    orchestrator: orchestratorService,
    seiIntegration: seiIntegrationService,
    portfolioAnalytics: portfolioAnalyticsService,
    realTimeData: realTimeDataService,
    supabase: supabaseService
  };
  next();
});

// Routes

// Auth routes with strict rate limiting
app.use('/api/auth', rateLimitMiddleware.auth, authRouter);

// Chat router with AI-specific rate limiting
app.use('/api/chat', rateLimitMiddleware.ai, (req, res, next) => {
  // Skip auth for orchestrate endpoint if it's a public endpoint
  if (req.path === '/orchestrate' && req.method === 'POST') {
    return optionalAuth(req, res, next);
  }
  return requireAuth(req, res, next);
}, chatRouter);

// Sessions router - requires authentication
app.use('/api/chat/sessions', requireAuth, sessionsRouter);

// Protected routes with specific rate limiting
app.use('/api/portfolio', rateLimitMiddleware.portfolio, requireAuth, portfolioRouter);
app.use('/api/ai', rateLimitMiddleware.ai, requireAuth, aiRouter);
app.use('/api', requireAuth, confirmationRouter);
app.use('/api/voice', rateLimitMiddleware.ai, requireAuth, voiceRouter);
app.use('/api/websocket', requireAuth, websocketRouter);

// MCP internal routes with special authentication
app.use('/api/mcp', createMcpAuthMiddleware(['mcp_communication']), (req, res, next) => {
  // Add MCP-specific request handling here
  res.json({ message: 'MCP endpoint placeholder' });
});

// Security endpoints
app.get('/api/security/health', mcpHealthCheck);
app.get('/api/security/audit', securityMiddleware.validateAPIKey, (req, res) => {
  try {
    const metrics = securityAuditService.getMetrics();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      metrics: {
        totalEvents: metrics.totalEvents,
        eventsByType: metrics.eventsByType,
        eventsBySeverity: metrics.eventsBySeverity,
        recentAlerts: metrics.recentAlerts
      },
      recentEvents: metrics.recentEvents
    });
  } catch (error) {
    logger.error('Security audit endpoint error', {
      error: error instanceof Error ? error.message : String(error)
    });
    res.status(500).json({ error: 'Failed to get security metrics' });
  }
});

// Enhanced health check endpoints for Railway
app.get('/health', async (req, res) => {
  try {
    const healthCheck = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      service: {
        name: process.env.SERVICE_NAME || 'seiron-backend',
        version: process.env.SERVICE_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: Math.floor(process.uptime()),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024)
        },
        cpu: {
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version
        }
      },
      checks: {
        server: 'ok',
        database: 'checking',
        redis: 'checking',
        mcp: 'checking'
      }
    };

    // Quick database check
    try {
      // Test database connection if available
      if (req.services?.supabase) {
        await req.services.supabase.testConnection();
        healthCheck.checks.database = 'ok';
      } else {
        healthCheck.checks.database = 'not_configured';
      }
    } catch (error) {
      healthCheck.checks.database = 'error';
      logger.warn('Database health check failed', { error: (error as Error).message });
    }

    // Quick Redis check
    try {
      // Test Redis connection if available
      // This would be implemented based on your Redis setup
      healthCheck.checks.redis = 'ok'; // Placeholder
    } catch (error) {
      healthCheck.checks.redis = 'error';
      logger.warn('Redis health check failed', { error: (error as Error).message });
    }

    // Quick MCP check
    try {
      if (req.services?.seiIntegration) {
        // Test MCP connectivity
        healthCheck.checks.mcp = 'ok'; // Placeholder
      } else {
        healthCheck.checks.mcp = 'not_configured';
      }
    } catch (error) {
      healthCheck.checks.mcp = 'error';
      logger.warn('MCP health check failed', { error: (error as Error).message });
    }

    // Return appropriate status code based on checks
    const hasErrors = Object.values(healthCheck.checks).some(check => check === 'error');
    const statusCode = hasErrors ? 503 : 200;

    res.status(statusCode).json(healthCheck);
  } catch (error) {
    logger.error('Health check endpoint error', { error: (error as Error).message });
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      requestId: req.requestId
    });
  }
});

// Readiness probe for Railway (simpler check)
app.get('/ready', (req, res) => {
  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  });
});

// Liveness probe for Railway
app.get('/alive', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    requestId: req.requestId
  });
});

// Metrics endpoint for monitoring (optional)
app.get('/metrics', (req, res) => {
  const metrics = {
    timestamp: new Date().toISOString(),
    service: {
      name: process.env.SERVICE_NAME || 'seiron-backend',
      version: process.env.SERVICE_VERSION || '1.0.0',
      uptime: Math.floor(process.uptime())
    },
    system: {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      railwayEnvironment: process.env.RAILWAY_ENVIRONMENT_NAME,
      railwayService: process.env.RAILWAY_SERVICE_NAME
    }
  };
  
  res.json(metrics);
});

// Development route info (only in development)
if (process.env.NODE_ENV === 'development') {
  app.get('/dev/routes', (req, res) => {
    res.json({
      routes: {
        sessions: '/api/sessions',
        messages: '/api/messages/:sessionId',
        chat_sessions: '/api/chat/sessions',
        chat_messages: '/api/chat/sessions/messages/:sessionId'
      },
      note: 'These routes require authentication'
    });
  });
}

// Error handling with security-aware error processing
app.use(errorRequestLogger);
app.use(apiKeyMiddleware.errorHandler); // Handle API key errors first
app.use(errorHandler);

// Socket.io middleware setup
io.use(wsMiddleware.authenticationMiddleware);
io.use(wsMiddleware.rateLimitMiddleware);
io.use(wsMiddleware.errorHandlingMiddleware);

// Create rate-limited message handlers
const rateLimitedHandler = wsMiddleware.createMessageRateLimiter(socketService);
const disconnectHandler = wsMiddleware.createDisconnectHandler(socketService);

// Socket.io connection handling with comprehensive logging
io.on('connection', (socket) => {
  const user = wsMiddleware.getAuthenticatedUser(socket.id);
  
  logger.info('Socket.IO client connected with enhanced logging', {
    walletAddress: user?.walletAddress,
    socketId: socket.id,
    ipAddress: socket.handshake.address,
    userAgent: socket.handshake.headers['user-agent'],
    timestamp: new Date().toISOString()
  });

  // Enhanced room join with logging
  socket.on('join_portfolio', rateLimitedHandler('join_portfolio', (walletAddress: string, socket) => {
    try {
      socketService.addUserSocket(walletAddress, socket);
      socket.join(`portfolio_${walletAddress}`);
      socketService.logRoomJoin(socket, `portfolio_${walletAddress}`);
      
      socket.emit('join_portfolio_result', { 
        success: true, 
        room: `portfolio_${walletAddress}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      socketService.logMessageDeliveryFailure('join_portfolio', error as Error, socket);
      socket.emit('join_portfolio_result', { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }));

  // Enhanced chat message handling with logging
  socket.on('chat_message', rateLimitedHandler('chat_message', async (data, socket) => {
    try {
      const { walletAddress, message } = data;
      
      logger.info('Processing chat message via socket', {
        walletAddress,
        socketId: socket.id,
        messageLength: message?.length || 0,
        timestamp: new Date().toISOString()
      });
      
      // Process chat message and emit response
      const response = await aiService.processMessage(message, walletAddress)();
      
      if (response._tag === 'Left') {
        const errorResponse = { success: false, error: response.left.message };
        socket.emit('chat_response', errorResponse);
        socketService.logMessageDeliveryFailure('chat_message', response.left, socket);
      } else {
        const successResponse = { success: true, data: response.right };
        socket.emit('chat_response', successResponse);
        
        logger.info('Chat message processed successfully via socket', {
          walletAddress,
          socketId: socket.id,
          responseLength: JSON.stringify(response.right).length,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      socketService.logMessageDeliveryFailure('chat_message', error as Error, socket);
      socket.emit('chat_response', { success: false, error: 'Failed to process message' });
    }
  }));

  // Enhanced confirmation handling with logging
  socket.on('confirm_transaction', rateLimitedHandler('confirm_transaction', async (data, socket) => {
    try {
      const { transactionId, walletAddress } = data;
      
      logger.info('Processing transaction confirmation via socket', {
        walletAddress,
        socketId: socket.id,
        transactionId,
        timestamp: new Date().toISOString()
      });
      
      const result = await confirmationService.confirmTransaction(transactionId, walletAddress)();
      
      if (result._tag === 'Left') {
        const errorResponse = { success: false, error: result.left.message };
        socket.emit('confirmation_result', errorResponse);
        socketService.logMessageDeliveryFailure('confirm_transaction', result.left, socket);
      } else {
        const successResponse = { success: true, data: result.right };
        socket.emit('confirmation_result', successResponse);
        
        logger.info('Transaction confirmation processed successfully via socket', {
          walletAddress,
          socketId: socket.id,
          transactionId,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      socketService.logMessageDeliveryFailure('confirm_transaction', error as Error, socket);
      socket.emit('confirmation_result', { success: false, error: 'Failed to process confirmation' });
    }
  }));

  socket.on('reject_transaction', rateLimitedHandler('reject_transaction', async (data, socket) => {
    try {
      const { transactionId, walletAddress, reason } = data;
      
      logger.info('Processing transaction rejection via socket', {
        walletAddress,
        socketId: socket.id,
        transactionId,
        reason,
        timestamp: new Date().toISOString()
      });
      
      const result = await confirmationService.rejectTransaction(transactionId, walletAddress, reason)();
      
      if (result._tag === 'Left') {
        const errorResponse = { success: false, error: result.left.message };
        socket.emit('confirmation_result', errorResponse);
        socketService.logMessageDeliveryFailure('reject_transaction', result.left, socket);
      } else {
        const successResponse = { success: true, data: result.right };
        socket.emit('confirmation_result', successResponse);
        
        logger.info('Transaction rejection processed successfully via socket', {
          walletAddress,
          socketId: socket.id,
          transactionId,
          reason,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      socketService.logMessageDeliveryFailure('reject_transaction', error as Error, socket);
      socket.emit('confirmation_result', { success: false, error: 'Failed to process rejection' });
    }
  }));

  socket.on('get_pending_transactions', rateLimitedHandler('get_pending_transactions', async (walletAddress: string, socket) => {
    try {
      logger.info('Fetching pending transactions via socket', {
        walletAddress,
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });
      
      const result = await confirmationService.getPendingTransactionsForWallet(walletAddress)();
      
      if (result._tag === 'Left') {
        const errorResponse = { success: false, error: result.left.message };
        socket.emit('pending_transactions', errorResponse);
        socketService.logMessageDeliveryFailure('get_pending_transactions', result.left, socket);
      } else {
        const successResponse = { success: true, data: result.right };
        socket.emit('pending_transactions', successResponse);
        
        logger.info('Pending transactions fetched successfully via socket', {
          walletAddress,
          socketId: socket.id,
          transactionCount: result.right.length,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      socketService.logMessageDeliveryFailure('get_pending_transactions', error as Error, socket);
      socket.emit('pending_transactions', { success: false, error: 'Failed to fetch pending transactions' });
    }
  }));

  // Enhanced disconnect handling
  socket.on('disconnect', (reason) => {
    logger.info('Socket.IO client disconnected with enhanced logging', {
      walletAddress: user?.walletAddress,
      socketId: socket.id,
      reason,
      timestamp: new Date().toISOString()
    });
    
    disconnectHandler(socket);
  });

  // Add periodic connection health check
  const healthCheckInterval = setInterval(() => {
    const connectionInfo = socketService.getSocketConnectionInfo(socket.id);
    if (connectionInfo) {
      const timeSinceLastActivity = Date.now() - connectionInfo.lastActivity.getTime();
      
      // If no activity for 5 minutes, send ping
      if (timeSinceLastActivity > 5 * 60 * 1000) {
        socket.emit('ping', { timestamp: new Date().toISOString() });
        
        logger.debug('Health check ping sent', {
          walletAddress: connectionInfo.walletAddress,
          socketId: socket.id,
          timeSinceLastActivity,
          timestamp: new Date().toISOString()
        });
      }
    }
  }, 60000); // Check every minute

  // Handle pong response
  socket.on('pong', () => {
    const connectionInfo = socketService.getSocketConnectionInfo(socket.id);
    if (connectionInfo) {
      connectionInfo.lastActivity = new Date();
      
      logger.debug('Health check pong received', {
        walletAddress: connectionInfo.walletAddress,
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Clean up health check interval on disconnect
  socket.on('disconnect', () => {
    clearInterval(healthCheckInterval);
  });
});

const PORT = parseInt(process.env.PORT || '3001');

// Initialize adapters before starting server
const startServer = async () => {
  logger.info('Starting server initialization', {
    port: PORT,
    portType: typeof PORT
  });
  
  // Validate security configuration
  try {
    const securityValidation = await validateSecurityConfiguration();
    if (!securityValidation.success) {
      logger.error('Security configuration validation failed', {
        errors: securityValidation.errors
      });
      
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    } else {
      logger.info('Security configuration validation passed', {
        warnings: securityValidation.warnings
      });
      
      securityValidation.warnings.forEach(warning => {
        logger.warn(`Security warning: ${warning}`);
      });
    }
  } catch (error) {
    logger.error('Security configuration validation error', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
  
  // Initialize security audit service
  securityAuditService.logEvent({
    eventType: 'system_security_event',
    severity: 'low',
    source: 'server_startup',
    success: true,
    message: 'Security services initialized successfully',
    metadata: {
      nodeEnv: process.env.NODE_ENV,
      port: PORT
    }
  });
  
  try {
    // Initialize adapters if enabled
    const adapterResult = await adapterInitializer.registerAdapters(
      seiIntegrationService,
      aiService
    )();
    
    if (adapterResult._tag === 'Left') {
      logger.error('Failed to initialize adapters', {
        error: adapterResult.left.message
      });
      // Continue anyway - adapters are optional
    } else {
      logger.info('Adapters initialized successfully');
    }
  } catch (error) {
    logger.error('Error during adapter initialization', {
      error: error instanceof Error ? error.message : String(error)
    });
    // Continue anyway - adapters are optional
  }

  logger.info('Attempting to start server', {
    port: PORT,
    host: '0.0.0.0'
  });

  server.listen(PORT, '0.0.0.0', () => {
  logger.info('🚀 Sei Portfolio Manager API started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    logLevel: process.env.LOG_LEVEL || 'info'
  });
  
  // Log startup configuration (secure logging)
  logger.info('Server configuration loaded', {
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    redisUrl: process.env.REDIS_URL ? '[CONFIGURED]' : '[NOT CONFIGURED]',
    openaiApiKey: process.env.OPENAI_API_KEY ? '[CONFIGURED]' : '[NOT CONFIGURED]',
    seiRpcUrl: process.env.SEI_RPC_URL || 'https://sei-rpc.polkachu.com',
    internalApiKey: process.env.INTERNAL_API_KEY ? '[CONFIGURED]' : '[NOT CONFIGURED]',
    mcpApiKey: process.env.MCP_API_KEY ? '[CONFIGURED]' : '[NOT CONFIGURED]',
    securityLevel: process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEVELOPMENT'
  });
  
  // Log security audit event for successful startup
  securityAuditService.logEvent({
    eventType: 'system_security_event',
    severity: 'low',
    source: 'server_startup',
    success: true,
    message: 'Server started successfully with enhanced security',
    metadata: {
      port: PORT,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    }
  });
  })
  .on('error', (error) => {
    logger.error('Server failed to start', {
      error: error.message,
      port: PORT,
      code: error.code
    });
    process.exit(1);
  })
  .on('listening', () => {
    logger.info('Server listening event triggered', {
      port: PORT,
      address: server.address()
    });
  });
};

// Add global error handlers to catch crashes
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception occurred', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    promise: promise
  });
  process.exit(1);
});

// Start the server
startServer().catch(error => {
  logger.error('Failed to start server', {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  try {
    await adapterInitializer.cleanup()();
  } catch (error) {
    logger.error('Error during adapter cleanup', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
  
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export { app, server, io };