/**
 * Mock Socket.IO for testing real-time communication // TODO: REMOVE_MOCK - Mock-related keywords
 */

import { EventEmitter } from 'events';

// Mock Socket implementation // TODO: REMOVE_MOCK - Mock-related keywords
export class MockSocket extends EventEmitter { // TODO: REMOVE_MOCK - Mock-related keywords
  public id: string;
  public connected: boolean = true;
  public rooms: Set<string> = new Set();
  
  constructor(id: string = 'mock-socket-id') { // TODO: REMOVE_MOCK - Mock-related keywords
    super();
    this.id = id;
  }
  
  emit = jest.fn().mockReturnValue(true); // TODO: REMOVE_MOCK - Mock-related keywords
  join = jest.fn().mockReturnValue(this); // TODO: REMOVE_MOCK - Mock-related keywords
  leave = jest.fn().mockReturnValue(this); // TODO: REMOVE_MOCK - Mock-related keywords
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

// Mock Server implementation // TODO: REMOVE_MOCK - Mock-related keywords
export class MockServer extends EventEmitter { // TODO: REMOVE_MOCK - Mock-related keywords
  public sockets: Map<string, MockSocket> = new Map(); // TODO: REMOVE_MOCK - Mock-related keywords
  
  emit = jest.fn().mockReturnValue(true); // TODO: REMOVE_MOCK - Mock-related keywords
  to = jest.fn().mockReturnValue(this); // TODO: REMOVE_MOCK - Mock-related keywords
  in = jest.fn().mockReturnValue(this); // TODO: REMOVE_MOCK - Mock-related keywords
  
  // Simulate socket connection
  simulateConnection(socketId: string = 'mock-socket-id'): MockSocket { // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
    const socket = new MockSocket(socketId); // TODO: REMOVE_MOCK - Mock-related keywords
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

// Create mock Socket.IO server // TODO: REMOVE_MOCK - Mock-related keywords
export const createMockSocketServer = (): MockServer => { // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
  return new MockServer(); // TODO: REMOVE_MOCK - Mock-related keywords
};

// Mock portfolio update data // TODO: REMOVE_MOCK - Mock-related keywords
export const createMockPortfolioUpdate = (type: string = 'position_update', data: any = {}) => ({ // TODO: REMOVE_MOCK - Mock-related keywords
  type,
  data: {
    ...data,
    timestamp: new Date().toISOString()
  },
  timestamp: new Date().toISOString()
});

// Mock chat response data // TODO: REMOVE_MOCK - Mock-related keywords
export const createMockChatResponse = (message: string = 'Test response') => ({ // TODO: REMOVE_MOCK - Mock-related keywords
  message,
  timestamp: new Date().toISOString(),
  suggestions: [
    'Show portfolio',
    'Check positions',
    'Get help'
  ]
});

// Mock transaction update data // TODO: REMOVE_MOCK - Mock-related keywords
export const createMockTransactionUpdate = ( // TODO: REMOVE_MOCK - Mock-related keywords
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

// Mock error notification data // TODO: REMOVE_MOCK - Mock-related keywords
export const createMockErrorNotification = (error: string = 'Test error') => ({ // TODO: REMOVE_MOCK - Mock-related keywords
  type: 'error',
  data: {
    error,
    context: 'test',
    timestamp: new Date().toISOString()
  },
  timestamp: new Date().toISOString()
});

// Setup Socket.IO mocks for tests // TODO: REMOVE_MOCK - Mock-related keywords
export const setupSocketMocks = () => { // TODO: REMOVE_MOCK - Mock-related keywords
  const mockServer = createMockSocketServer(); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
  const mockSocket = new MockSocket(); // TODO: REMOVE_MOCK - Mock-related keywords // TODO: REMOVE_MOCK - Mock-related keywords
  
  return {
    server: mockServer, // TODO: REMOVE_MOCK - Mock-related keywords
    socket: mockSocket // TODO: REMOVE_MOCK - Mock-related keywords
  };
};

// Utility to simulate real-time events
export const simulateRealTimeEvents = (server: MockServer, walletAddress: string) => { // TODO: REMOVE_MOCK - Mock-related keywords
  const socket = server.simulateConnection('test-socket-1');
  
  // Simulate joining wallet room
  socket.join(walletAddress);
  
  // Simulate portfolio update
  setTimeout(() => {
    server.emit('portfolio_update', createMockPortfolioUpdate()); // TODO: REMOVE_MOCK - Mock-related keywords
  }, 100);
  
  // Simulate chat response
  setTimeout(() => {
    server.emit('chat_response', createMockChatResponse()); // TODO: REMOVE_MOCK - Mock-related keywords
  }, 200);
  
  // Simulate transaction update
  setTimeout(() => {
    server.emit('transaction_update', createMockTransactionUpdate()); // TODO: REMOVE_MOCK - Mock-related keywords
  }, 300);
  
  return socket;
};

// Test helper for Socket.IO integration
export const createSocketTestHelper = () => {
  const server = createMockSocketServer(); // TODO: REMOVE_MOCK - Mock-related keywords
  const clients: MockSocket[] = []; // TODO: REMOVE_MOCK - Mock-related keywords
  
  const addClient = (id?: string) => {
    const socket = server.simulateConnection(id);
    clients.push(socket);
    return socket;
  };
  
  const removeClient = (socket: MockSocket) => { // TODO: REMOVE_MOCK - Mock-related keywords
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