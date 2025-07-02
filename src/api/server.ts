import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { createOrchestrator, Orchestrator } from '../orchestrator';
import { AIPortfolioManagerEnhanced } from '../AIPortfolioManagerEnhanced';
import { UserIntent, TaskResult } from '../orchestrator/types';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Initialize enhanced portfolio manager
const portfolioManager = new AIPortfolioManagerEnhanced({
  network: 'sei-mainnet',
  wallet: process.env.WALLET_ADDRESS || '',
  aiModel: 'balanced-defi',
  autoExecute: true
});

// WebSocket connections
const clients = new Map<string, any>();

wss.on('connection', (ws, req) => {
  const sessionId = req.url?.split('session=')[1] || `session_${Date.now()}`;
  clients.set(sessionId, ws);
  
  console.log(`WebSocket client connected: ${sessionId}`);
  
  ws.on('close', () => {
    clients.delete(sessionId);
    console.log(`WebSocket client disconnected: ${sessionId}`);
  });
  
  ws.on('error', (error) => {
    console.error(`WebSocket error for ${sessionId}:`, error);
  });
});

// Broadcast to specific session
function broadcastToSession(sessionId: string, data: any) {
  const client = clients.get(sessionId);
  if (client && client.readyState === 1) { // OPEN
    client.send(JSON.stringify(data));
  }
}

// Process intent endpoint
app.post('/api/process-intent', async (req, res) => {
  try {
    const { intent, sessionId }: { intent: UserIntent; sessionId: string } = req.body;
    
    console.log(`Processing intent for session ${sessionId}:`, intent);
    
    // Send initial acknowledgment
    broadcastToSession(sessionId, {
      type: 'agent_status',
      status: 'processing',
      message: 'Processing your request...',
      timestamp: Date.now()
    });
    
    // Get orchestrator from portfolio manager
    const orchestrator = (portfolioManager as any).orchestrator as Orchestrator;
    
    // Process intent
    const result = await orchestrator.processIntent(intent);
    
    // Send progress updates
    orchestrator.on('task:start', (task) => {
      broadcastToSession(sessionId, {
        type: 'task_progress',
        taskId: task.id,
        agent: task.agentId,
        status: 'started',
        message: `${task.agentId} is working on your request...`,
        timestamp: Date.now()
      });
    });
    
    orchestrator.on('task:complete', (task) => {
      broadcastToSession(sessionId, {
        type: 'task_progress',
        taskId: task.id,
        agent: task.agentId,
        status: 'completed',
        result: task.result,
        timestamp: Date.now()
      });
    });
    
    // Send final result
    res.json({
      success: true,
      result,
      agentType: result.metadata?.agentId || 'unknown',
      executionTime: result.executionTime,
      confidence: result.confidence
    });
    
  } catch (error) {
    console.error('Error processing intent:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get portfolio status
app.get('/api/portfolio/status', async (req, res) => {
  try {
    const status = await portfolioManager.getCachedPortfolioSummary();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get performance metrics
app.get('/api/metrics', async (req, res) => {
  try {
    const metrics = portfolioManager.getPerformanceMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: Date.now() });
});

// Start server
const PORT = process.env.API_PORT || 3001;

async function startServer() {
  try {
    // Warm cache on startup
    await portfolioManager.warmCache();
    
    server.listen(PORT, () => {
      console.log(`API server running on http://localhost:${PORT}`);
      console.log(`WebSocket server running on ws://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  
  // Close WebSocket connections
  clients.forEach((client) => {
    client.close();
  });
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start the server
startServer();