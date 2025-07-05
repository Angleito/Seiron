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

import { chatRouter } from './routes/chat';
import { portfolioRouter } from './routes/portfolio';
import { aiRouter } from './routes/ai';
import { confirmationRouter } from './routes/confirmation';
import voiceRouter from './routes/voice';
import { websocketRouter } from './routes/websocket';
import { SocketService } from './services/SocketService';
import { PortfolioService } from './services/PortfolioService';
import { AIService } from './services/AIService';
import { ConfirmationService } from './services/ConfirmationService';
import { OrchestratorService } from './services/OrchestratorService';
import { SeiIntegrationService } from './services/SeiIntegrationService';
import { PortfolioAnalyticsService } from './services/PortfolioAnalyticsService';
import { RealTimeDataService } from './services/RealTimeDataService';
import { errorHandler } from './middleware/errorHandler';
import { validateWallet } from './middleware/validateWallet';
import { createWebSocketMiddleware } from './middleware/websocketMiddleware';
import { 
  requestIdMiddleware, 
  requestBodyLogger, 
  createMorganMiddleware, 
  errorRequestLogger, 
  requestCompletionLogger 
} from './middleware/requestLogger';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Request ID and logging middleware (before everything else)
app.use(requestIdMiddleware);
app.use(requestCompletionLogger);

// HTTP request logging
app.use(createMorganMiddleware());

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request/Response body logging (after body parsing)
app.use(requestBodyLogger);

// Initialize services
const socketService = new SocketService(io);

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
    realTimeData: realTimeDataService
  };
  next();
});

// Routes
// Chat router - orchestrate endpoint doesn't require wallet validation
app.use('/api/chat', (req, res, next) => {
  // Skip wallet validation for orchestrate endpoint
  if (req.path === '/orchestrate' && req.method === 'POST') {
    return next();
  }
  return validateWallet(req, res, next);
}, chatRouter);

app.use('/api/portfolio', validateWallet, portfolioRouter);
app.use('/api/ai', validateWallet, aiRouter);
app.use('/api', validateWallet, confirmationRouter);
app.use('/api/voice', voiceRouter);
app.use('/api/websocket', websocketRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    requestId: req.requestId 
  });
});

// Error handling
app.use(errorRequestLogger);
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

const PORT = process.env.PORT || 8000;

server.listen(PORT, () => {
  logger.info('🚀 Sei Portfolio Manager API started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    logLevel: process.env.LOG_LEVEL || 'info'
  });
  
  // Log startup configuration
  logger.info('Server configuration loaded', {
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    redisUrl: process.env.REDIS_URL ? '[CONFIGURED]' : '[NOT CONFIGURED]',
    openaiApiKey: process.env.OPENAI_API_KEY ? '[CONFIGURED]' : '[NOT CONFIGURED]',
    seiRpcUrl: process.env.SEI_RPC_URL || 'https://sei-rpc.polkachu.com'
  });
});

export { app, server, io };