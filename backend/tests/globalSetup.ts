/**
 * Jest global setup
 * Runs once before all tests
 */

import { createServer } from 'http';
import { Server } from 'socket.io';

export default async function globalSetup() {
  console.log('🚀 Setting up test environment...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.REDIS_URL = 'redis://localhost:6379/1';
  process.env.OPENAI_API_KEY = 'test-key';
  
  // Create test server instance for Socket.IO tests
  const httpServer = createServer();
  const io = new Server(httpServer);
  
  // Store server instances globally for tests
  (global as any).__TEST_SERVER__ = httpServer;
  (global as any).__TEST_IO__ = io;
  
  // Start test server on random port
  await new Promise<void>((resolve) => {
    httpServer.listen(0, () => {
      const address = httpServer.address();
      const port = address && typeof address === 'object' ? address.port : 0;
      console.log(`📡 Test server running on port ${port}`);
      (global as any).__TEST_PORT__ = port;
      resolve();
    });
  });
  
  console.log('✅ Test environment setup complete');
}