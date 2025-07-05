import { createServer } from 'http';
import { Server } from 'socket.io';
import { Client } from 'socket.io-client';
import { SocketService } from '../services/SocketService';
import { createWebSocketMiddleware } from '../middleware/websocketMiddleware';
import { createServiceLogger } from '../services/LoggingService';

/**
 * WebSocket Logging Test Script
 * 
 * This script tests the comprehensive WebSocket logging implementation
 * by simulating various connection scenarios and message patterns.
 */

const logger = createServiceLogger('WebSocketTest');

async function testWebSocketLogging() {
  console.log('🐉 Starting WebSocket Logging Test...\n');

  // Create test server
  const server = createServer();
  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });

  // Initialize services
  const socketService = new SocketService(io);
  const wsMiddleware = createWebSocketMiddleware({
    rateLimitConfig: {
      maxMessages: 10,
      windowMs: 10000, // 10 seconds for testing
      maxConnections: 5,
      connectionWindowMs: 10000
    },
    enableAuthLogging: true,
    enableRateLimitLogging: true,
    enableErrorLogging: true,
    enablePerformanceLogging: true
  });

  // Setup middleware
  io.use(wsMiddleware.authenticationMiddleware);
  io.use(wsMiddleware.rateLimitMiddleware);
  io.use(wsMiddleware.errorHandlingMiddleware);

  const rateLimitedHandler = wsMiddleware.createMessageRateLimiter(socketService);
  const disconnectHandler = wsMiddleware.createDisconnectHandler(socketService);

  // Setup connection handling
  io.on('connection', (socket) => {
    const user = wsMiddleware.getAuthenticatedUser(socket.id);
    
    logger.info('Test client connected', {
      walletAddress: user?.walletAddress,
      metadata: { socketId: socket.id }
    });

    socket.on('join_portfolio', rateLimitedHandler('join_portfolio', (walletAddress: string, socket) => {
      socketService.addUserSocket(walletAddress, socket);
      socket.join(`portfolio_${walletAddress}`);
      socketService.logRoomJoin(socket, `portfolio_${walletAddress}`);
      socket.emit('join_result', { success: true });
    }));

    socket.on('test_message', rateLimitedHandler('test_message', (data, socket) => {
      logger.info('Received test message', { metadata: { data } });
      socket.emit('test_response', { success: true, echo: data });
    }));

    socket.on('disconnect', (reason) => {
      logger.info('Test client disconnected', { 
        walletAddress: user?.walletAddress,
        metadata: { socketId: socket.id, reason }
      });
      disconnectHandler(socket);
    });
  });

  // Start server
  const PORT = 8888;
  server.listen(PORT, () => {
    console.log(`🚀 Test server running on port ${PORT}\n`);
    runTests();
  });

  async function runTests() {
    try {
      // Test 1: Valid connection with authentication
      console.log('📝 Test 1: Valid connection with authentication');
      const validClient = new Client(`http://localhost:${PORT}`, {
        auth: {
          walletAddress: '0x1234567890123456789012345678901234567890'
        }
      });

      await new Promise((resolve) => {
        validClient.on('connect', () => {
          console.log('✅ Valid client connected successfully');
          resolve(true);
        });
      });

      // Test 2: Join portfolio room
      console.log('\n📝 Test 2: Join portfolio room');
      validClient.emit('join_portfolio', '0x1234567890123456789012345678901234567890');
      
      await new Promise((resolve) => {
        validClient.on('join_result', (data) => {
          console.log('✅ Portfolio room joined:', data);
          resolve(true);
        });
      });

      // Test 3: Send multiple messages (rate limiting test)
      console.log('\n📝 Test 3: Rate limiting test');
      for (let i = 0; i < 15; i++) {
        validClient.emit('test_message', { message: `Test message ${i}`, timestamp: Date.now() });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test 4: Invalid authentication
      console.log('\n📝 Test 4: Invalid authentication');
      const invalidClient = new Client(`http://localhost:${PORT}`, {
        auth: {
          walletAddress: 'invalid-address'
        }
      });

      invalidClient.on('connect_error', (error) => {
        console.log('✅ Invalid authentication rejected:', error.message);
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test 5: Check metrics
      console.log('\n📝 Test 5: WebSocket metrics');
      const metrics = socketService.getWebSocketMetrics();
      const healthStatus = socketService.getHealthStatus();
      
      console.log('📊 Current Metrics:');
      console.log(`   Active Connections: ${metrics.activeConnections}`);
      console.log(`   Total Messages: ${metrics.totalMessages}`);
      console.log(`   Error Count: ${metrics.errorCount}`);
      console.log(`   Health Status: ${healthStatus.status}`);
      console.log(`   Message Types:`, metrics.messagesByType);

      // Test 6: Connection info
      console.log('\n📝 Test 6: Connection information');
      const connections = socketService.getActiveConnections();
      connections.forEach(conn => {
        console.log(`📱 Connection ${conn.id}:`);
        console.log(`   Wallet: ${conn.walletAddress}`);
        console.log(`   Messages: ${conn.messageCount}`);
        console.log(`   Errors: ${conn.errorCount}`);
        console.log(`   Rooms: ${conn.rooms.join(', ')}`);
      });

      // Test 7: Middleware stats
      console.log('\n📝 Test 7: Middleware statistics');
      const middlewareStats = wsMiddleware.getMiddlewareStats();
      console.log('🔧 Middleware Stats:');
      console.log(`   Authenticated Users: ${middlewareStats.authenticatedUsers}`);
      console.log(`   Total Messages: ${middlewareStats.totalMessages}`);
      console.log(`   Total Errors: ${middlewareStats.totalErrors}`);
      console.log(`   Avg Session Duration: ${middlewareStats.avgSessionDuration.toFixed(2)}ms`);

      // Cleanup
      console.log('\n🧹 Cleaning up...');
      validClient.disconnect();
      invalidClient.disconnect();
      
      setTimeout(() => {
        server.close();
        console.log('\n✨ WebSocket logging test completed successfully!');
        process.exit(0);
      }, 2000);

    } catch (error) {
      console.error('❌ Test failed:', error);
      server.close();
      process.exit(1);
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run tests
if (require.main === module) {
  testWebSocketLogging().catch(console.error);
}

export { testWebSocketLogging };