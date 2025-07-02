/**
 * Simplified API server for testing Docker setup
 */
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: Date.now(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'AI Portfolio Manager API is running!',
    features: [
      'Multi-agent orchestration',
      'DeFi portfolio management', 
      'Performance optimization',
      'WebSocket support'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AI Portfolio Manager API running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});