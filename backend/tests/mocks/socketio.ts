/**
 * Mock Socket.IO for testing real-time communication
 */

import { EventEmitter } from 'events';

// Mock Socket implementation
export class MockSocket extends EventEmitter {
  public id: string;
  public connected: boolean = true;
  public rooms: Set<string> = new Set();
  
  constructor(id: string = 'mock-socket-id') {
    super();
    this.id = id;
  }
  
  emit = jest.fn().mockReturnValue(true);
  join = jest.fn().mockReturnValue(this);
  leave = jest.fn().mockReturnValue(this);
  disconnect = jest.fn();
  
  // Simulate events
  simulateConnect() {
    this.connected = true;
    this.emit('connect');
  }
  
  simulateDisconnect() {
    this.connected = false;
    this.emit('disconnect');
  }
  
  simulateMessage(event: string, data: any) {
    this.emit(event, data);
  }
}

// Mock Server implementation
export class MockServer extends EventEmitter {
  public sockets: Map<string, MockSocket> = new Map();
  
  emit = jest.fn().mockReturnValue(true);
  to = jest.fn().mockReturnValue(this);
  in = jest.fn().mockReturnValue(this);
  
  // Simulate socket connection
  simulateConnection(socketId: string = 'mock-socket-id'): MockSocket {
    const socket = new MockSocket(socketId);
    this.sockets.set(socketId, socket);
    this.emit('connection', socket);
    return socket;
  }
  
  // Simulate socket disconnection
  simulateDisconnection(socketId: string) {
    const socket = this.sockets.get(socketId);
    if (socket) {
      socket.simulateDisconnect();
      this.sockets.delete(socketId);
    }
  }
  
  // Get connected socket count
  getConnectedCount(): number {
    return this.sockets.size;
  }
}

// Create mock Socket.IO server
export const createMockSocketServer = (): MockServer => {
  return new MockServer();
};

// Mock portfolio update data
export const createMockPortfolioUpdate = (type: string = 'position_update', data: any = {}) => ({
  type,
  data: {
    ...data,
    timestamp: new Date().toISOString()
  },
  timestamp: new Date().toISOString()
});

// Mock chat response data
export const createMockChatResponse = (message: string = 'Test response') => ({
  message,
  timestamp: new Date().toISOString(),
  suggestions: [
    'Show portfolio',
    'Check positions',
    'Get help'
  ]
});

// Mock transaction update data
export const createMockTransactionUpdate = (
  txHash: string = '0xabc123',
  status: 'pending' | 'confirmed' | 'failed' = 'confirmed'
) => ({
  type: 'transaction_complete',
  data: {
    txHash,
    status,
    timestamp: new Date().toISOString(),
    details: {
      gasUsed: '21000',
      gasPrice: '20000000000'
    }
  },
  timestamp: new Date().toISOString()
});

// Mock error notification data
export const createMockErrorNotification = (error: string = 'Test error') => ({
  type: 'error',
  data: {
    error,
    context: 'test',
    timestamp: new Date().toISOString()
  },
  timestamp: new Date().toISOString()
});

// Setup Socket.IO mocks for tests
export const setupSocketMocks = () => {
  const mockServer = createMockSocketServer();
  const mockSocket = new MockSocket();
  
  return {
    server: mockServer,
    socket: mockSocket
  };
};

// Utility to simulate real-time events
export const simulateRealTimeEvents = (server: MockServer, walletAddress: string) => {
  const socket = server.simulateConnection('test-socket-1');
  
  // Simulate joining wallet room
  socket.join(walletAddress);
  
  // Simulate portfolio update
  setTimeout(() => {
    server.emit('portfolio_update', createMockPortfolioUpdate());
  }, 100);
  
  // Simulate chat response
  setTimeout(() => {
    server.emit('chat_response', createMockChatResponse());
  }, 200);
  
  // Simulate transaction update
  setTimeout(() => {
    server.emit('transaction_update', createMockTransactionUpdate());
  }, 300);
  
  return socket;
};

// Test helper for Socket.IO integration
export const createSocketTestHelper = () => {
  const server = createMockSocketServer();
  const clients: MockSocket[] = [];
  
  const addClient = (id?: string) => {
    const socket = server.simulateConnection(id);
    clients.push(socket);
    return socket;
  };
  
  const removeClient = (socket: MockSocket) => {
    server.simulateDisconnection(socket.id);
    const index = clients.indexOf(socket);
    if (index > -1) {
      clients.splice(index, 1);
    }
  };
  
  const broadcast = (event: string, data: any) => {
    clients.forEach(client => {
      client.simulateMessage(event, data);
    });
  };
  
  const cleanup = () => {
    clients.forEach(client => {
      server.simulateDisconnection(client.id);
    });
    clients.length = 0;
  };
  
  return {
    server,
    addClient,
    removeClient,
    broadcast,
    cleanup,
    getClientCount: () => clients.length
  };
};