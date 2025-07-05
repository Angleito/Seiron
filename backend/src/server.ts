import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';

import { chatRouter } from './routes/chat';
import { portfolioRouter } from './routes/portfolio';
import { aiRouter } from './routes/ai';
import { confirmationRouter } from './routes/confirmation';
import voiceRouter from './routes/voice';
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

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

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

// Initialize services
const socketService = new SocketService(io);
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

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  socket.on('join_portfolio', (walletAddress: string) => {
    socketService.addUserSocket(walletAddress, socket);
    socket.join(`portfolio_${walletAddress}`);
  });

  socket.on('chat_message', async (data) => {
    const { walletAddress, message } = data;
    
    // Process chat message and emit response
    const response = await aiService.processMessage(message, walletAddress)();
    
    if (response._tag === 'Left') {
      socket.emit('chat_response', { success: false, error: response.left.message });
    } else {
      socket.emit('chat_response', { success: true, data: response.right });
    }
  });

  // Confirmation-related events
  socket.on('confirm_transaction', async (data) => {
    const { transactionId, walletAddress } = data;
    
    const result = await confirmationService.confirmTransaction(transactionId, walletAddress)();
    
    if (result._tag === 'Left') {
      socket.emit('confirmation_result', { success: false, error: result.left.message });
    } else {
      socket.emit('confirmation_result', { success: true, data: result.right });
    }
  });

  socket.on('reject_transaction', async (data) => {
    const { transactionId, walletAddress, reason } = data;
    
    const result = await confirmationService.rejectTransaction(transactionId, walletAddress, reason)();
    
    if (result._tag === 'Left') {
      socket.emit('confirmation_result', { success: false, error: result.left.message });
    } else {
      socket.emit('confirmation_result', { success: true, data: result.right });
    }
  });

  socket.on('get_pending_transactions', async (walletAddress: string) => {
    const result = await confirmationService.getPendingTransactionsForWallet(walletAddress)();
    
    if (result._tag === 'Left') {
      socket.emit('pending_transactions', { success: false, error: result.left.message });
    } else {
      socket.emit('pending_transactions', { success: true, data: result.right });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    socketService.removeUserSocket(socket);
  });
});

const PORT = process.env.PORT || 8000;

server.listen(PORT, () => {
  console.log(`🚀 Sei Portfolio Manager API running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export { app, server, io };