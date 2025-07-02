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
import { SocketService } from './services/SocketService';
import { PortfolioService } from './services/PortfolioService';
import { AIService } from './services/AIService';
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
const portfolioService = new PortfolioService();
const aiService = new AIService();

// Make services available in request context
app.use((req, _res, next) => {
  req.services = {
    socket: socketService,
    portfolio: portfolioService,
    ai: aiService
  };
  next();
});

// Routes
app.use('/api/chat', validateWallet, chatRouter);
app.use('/api/portfolio', validateWallet, portfolioRouter);
app.use('/api/ai', validateWallet, aiRouter);

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
    const response = await pipe(
      aiService.processMessage(message, walletAddress),
      TE.fold(
        (error) => TE.of({ success: false, error: error.message }),
        (result) => TE.of({ success: true, data: result })
      )
    )();

    socket.emit('chat_response', response);
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