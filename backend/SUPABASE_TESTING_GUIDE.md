# Supabase Integration Testing Guide

This guide covers the comprehensive testing infrastructure for Supabase functionality in the Seiron backend.

## 🗄️ Overview

The Supabase integration tests validate:

- **Database Operations**: CRUD operations for users, sessions, and messages
- **Message Persistence**: Chat message storage and retrieval with crypto context
- **Session Management**: User session creation, tracking, and cleanup
- **Real-time Functionality**: WebSocket subscriptions and live updates
- **Security & RLS**: Row Level Security policies and access controls
- **Error Handling**: Network failures, validation errors, and recovery mechanisms

## 📁 Test Structure

```
backend/src/
├── __tests__/
│   ├── SupabaseService.integration.test.ts      # Core service tests
│   ├── realtime.supabase.integration.test.ts    # Real-time functionality
│   ├── security.supabase.integration.test.ts    # Security and RLS tests
│   ├── error-handling.supabase.integration.test.ts # Error scenarios
│   ├── supabase.integration.runner.ts          # Test orchestrator
│   ├── supabase.test.setup.js                  # Test setup
│   ├── supabase.global.setup.js               # Global setup
│   ├── supabase.global.teardown.js            # Global teardown
│   └── supabase.results.processor.js          # Results processing
├── __mocks__/
│   └── supabase.ts                            # Comprehensive Supabase mock
└── routes/__tests__/
    └── chat.supabase.integration.test.ts      # Chat API with Supabase
```

## 🚀 Running Tests

### Quick Start

```bash
# Run all Supabase integration tests
npm run test:supabase

# Run with coverage
npm run test:supabase:coverage

# Run in watch mode for development
npm run test:supabase:watch

# Run the orchestrated test suite with detailed reporting
npm run test:supabase:runner
```

### Individual Test Suites

```bash
# Core Supabase service functionality
npx jest src/services/__tests__/SupabaseService.integration.test.ts

# Chat API integration
npx jest src/routes/__tests__/chat.supabase.integration.test.ts

# Real-time subscriptions
npx jest src/__tests__/realtime.supabase.integration.test.ts

# Security and RLS policies
npx jest src/__tests__/security.supabase.integration.test.ts

# Error handling scenarios
npx jest src/__tests__/error-handling.supabase.integration.test.ts
```

## 🧪 Test Categories

### 1. Database Operations (`SupabaseService.integration.test.ts`)

Tests core database functionality:

- **User Management**: Create/retrieve users by wallet address
- **Session Management**: Session creation, activation, and retrieval
- **Message Operations**: CRUD operations for chat messages
- **Crypto Context**: Storage and retrieval of blockchain-related data
- **Pagination**: Conversation history with proper pagination
- **Health Checks**: Database connectivity validation

```typescript
describe('Database Operations', () => {
  it('should create a new user successfully', async () => {
    const result = await supabaseService.getOrCreateUser(testWallet)();
    expect(result).toBeSuccessfulSupabaseResponse();
  });
});
```

### 2. Chat API Integration (`chat.supabase.integration.test.ts`)

Tests API endpoints with database persistence:

- **Message Persistence**: User and AI messages saved to database
- **Crypto Context Storage**: Portfolio data and transaction context
- **Session Tracking**: Messages associated with chat sessions
- **History Retrieval**: Paginated conversation history
- **Error Recovery**: Graceful handling of database failures

```typescript
describe('POST /api/chat/message', () => {
  it('should save user message and AI response to Supabase', async () => {
    const response = await request(app)
      .post('/api/chat/message')
      .send({ message: testMessage, walletAddress: testWallet });
    
    expect(response.body.data.persistence.user_message_saved).toBe(true);
    expect(response.body.data.persistence.ai_response_saved).toBe(true);
  });
});
```

### 3. Real-time Functionality (`realtime.supabase.integration.test.ts`)

Tests WebSocket and subscription features:

- **Message Subscriptions**: Real-time message updates
- **Session Rooms**: Socket.IO room management
- **Event Broadcasting**: Multi-client message delivery
- **Connection Management**: Subscribe/unsubscribe handling
- **Performance**: High-frequency event handling

```typescript
describe('Real-time Message Subscriptions', () => {
  it('should subscribe to new messages for a session', async () => {
    const messagePromise = new Promise(resolve => {
      clientSocket.on('new_message', resolve);
    });
    
    // Trigger real-time event
    mockSupabaseClient._triggerRealTimeEvent('messages', 'INSERT', testMessage);
    
    const receivedMessage = await messagePromise;
    expect(receivedMessage).toEqual(testMessage);
  });
});
```

### 4. Security & RLS (`security.supabase.integration.test.ts`)

Tests security policies and access controls:

- **Authentication**: User authentication and session management
- **Authorization**: Resource access based on ownership
- **RLS Policies**: Row Level Security enforcement
- **Data Sanitization**: Sensitive data filtering
- **Access Controls**: Wallet-based permission validation

```typescript
describe('Authentication and Authorization', () => {
  it('should enforce session ownership in RLS policies', async () => {
    // User tries to access another user's session
    const result = await supabaseService.getOrCreateSession(otherUserId)();
    expect(result).toBeFailedSupabaseResponse();
  });
});
```

### 5. Error Handling (`error-handling.supabase.integration.test.ts`)

Tests comprehensive error scenarios:

- **Network Failures**: Timeout and connection errors
- **Database Errors**: Constraint violations and query failures
- **Validation Errors**: Input validation and type checking
- **Rate Limiting**: API rate limit handling
- **Recovery Mechanisms**: Retry logic and graceful degradation

```typescript
describe('Network and Connection Errors', () => {
  it('should handle network timeouts gracefully', async () => {
    mockSupabaseClient._simulateError('network');
    
    const result = await supabaseService.createMessage(messageData)();
    expect(result).toBeFailedSupabaseResponse();
    expect(result.left.message).toContain('Network timeout');
  });
});
```

## 🛠️ Mock Infrastructure

### Comprehensive Supabase Mock

The mock system provides realistic simulation of Supabase operations:

```typescript
// Create mock client with full functionality
const mockClient = createMockSupabaseClient();

// Simulate different error conditions
mockClient.setErrorMode(true, 'network');
mockClient.setErrorMode(true, 'validation');
mockClient.setErrorMode(true, 'auth');

// Control latency for performance testing
mockClient.setLatency(100); // 100ms delay

// Trigger real-time events
mockClient.triggerRealTimeEvent('messages', 'INSERT', messageData);
```

### Test Utilities

Global test utilities available in all tests:

```typescript
// Create test data
const wallet = global.testUtils.createTestWallet();
const user = global.testUtils.createTestUser(wallet);
const session = global.testUtils.createTestSession(user.id);
const message = global.testUtils.createTestMessage(session.id, user.id);

// Mock portfolio data
const portfolio = global.testUtils.createMockPortfolio(wallet);

// Wait for async operations
await global.testUtils.waitFor(100);
```

### Custom Jest Matchers

Extended Jest matchers for Supabase testing:

```typescript
// Validate TaskEither responses
expect(result).toBeValidSupabaseResponse();
expect(result).toBeSuccessfulSupabaseResponse();
expect(result).toBeFailedSupabaseResponse();

// Validate message structure
expect(message).toHaveValidMessageStructure();
```

## 📊 Test Reports

### Automated Reporting

Tests generate comprehensive reports:

```bash
# Generated files in test-results/supabase-integration/
├── report.json          # JSON test results
├── report.html          # HTML test report
├── jest-report.html     # Jest HTML reporter
├── junit.xml           # JUnit XML for CI/CD
├── detailed-results.json # Detailed test analysis
└── summary.json        # Brief summary
```

### Report Contents

- **Summary Statistics**: Pass/fail counts, duration, success rate
- **Category Breakdown**: Tests by functionality area
- **Failed Test Details**: Error messages and stack traces
- **Coverage Information**: Code coverage per file
- **Performance Metrics**: Test execution times

### CI/CD Integration

Reports are formatted for integration with CI/CD systems:

```yaml
# Example GitHub Actions usage
- name: Run Supabase Integration Tests
  run: npm run test:supabase:coverage

- name: Upload Test Results
  uses: actions/upload-artifact@v3
  with:
    name: supabase-test-results
    path: test-results/supabase-integration/
```

## 🔧 Configuration

### Jest Configuration

Specific configuration for Supabase tests (`jest.supabase.integration.config.js`):

- **Extended Timeout**: 30 seconds for integration tests
- **Mock Setup**: Automatic Supabase mocking
- **Custom Matchers**: Supabase-specific assertions
- **Coverage Targets**: 80% minimum, 90% for core services
- **Reporters**: Multiple output formats

### Environment Variables

Required environment variables for testing:

```bash
NODE_ENV=test
SUPABASE_URL=https://test.supabase.co
SUPABASE_ANON_KEY=test-anon-key
SUPABASE_SERVICE_ROLE_KEY=test-service-role-key
```

## 🐛 Debugging

### Verbose Logging

Enable detailed test logging:

```bash
JEST_VERBOSE=true npm run test:supabase
```

### Debug Individual Tests

```bash
# Debug specific test file with verbose output
npx jest --config jest.supabase.integration.config.js \
  --verbose --detectOpenHandles \
  src/services/__tests__/SupabaseService.integration.test.ts
```

### Mock State Inspection

Access mock state during tests:

```typescript
// Get current mock state
const state = mockSupabaseClient.getState();
console.log('Users:', state.users.size);
console.log('Messages:', state.messages.size);

// Check active subscriptions
const subscriptions = mockSupabaseClient._getActiveSubscriptions();
console.log('Active subscriptions:', subscriptions.length);
```

## 🚀 Performance Testing

### Load Testing

Tests include performance scenarios:

```typescript
describe('Performance and Rate Limiting', () => {
  it('should handle high-frequency events efficiently', async () => {
    const eventCount = 100;
    // Test rapid event processing
  });
});
```

### Memory Management

Tests validate memory usage:

```typescript
it('should handle large payload errors', async () => {
  const largeContent = 'x'.repeat(1000000); // 1MB content
  // Test memory allocation
});
```

## 📝 Best Practices

### Writing Supabase Tests

1. **Use TaskEither Pattern**: All Supabase operations return TaskEither
2. **Mock Realistic Scenarios**: Include network delays and errors
3. **Test Error Paths**: Validate error handling comprehensively
4. **Verify Data Persistence**: Ensure data is correctly stored/retrieved
5. **Test Security**: Validate access controls and RLS policies

### Test Organization

1. **Group by Functionality**: Database, API, real-time, security
2. **Use Descriptive Names**: Clear test and describe block names
3. **Setup and Teardown**: Proper test isolation
4. **Mock Management**: Reset mocks between tests
5. **Assert Specifically**: Use custom matchers for clarity

### Performance Considerations

1. **Parallel Execution**: Tests run in parallel when possible
2. **Resource Cleanup**: Proper cleanup to prevent memory leaks
3. **Timeout Management**: Appropriate timeouts for integration tests
4. **Mock Optimization**: Efficient mock implementations

## 🤝 Contributing

### Adding New Tests

1. Create test file following naming convention: `*.supabase.integration.test.ts`
2. Use existing mock infrastructure and test utilities
3. Include both success and error scenarios
4. Update test runner configuration if needed

### Extending Mocks

1. Add new functionality to `MockSupabaseClient`
2. Implement realistic behavior and error simulation
3. Update test utilities for new data types
4. Document new mock capabilities

### Improving Reports

1. Extend results processor for new metrics
2. Update HTML template for better visualization
3. Add new custom Jest matchers
4. Enhance CI/CD integration

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Jest Testing Framework](https://jestjs.io/)
- [Socket.IO Testing](https://socket.io/docs/v4/testing/)
- [fp-ts TaskEither](https://gcanti.github.io/fp-ts/modules/TaskEither.ts.html)

---

For questions or issues with the Supabase testing infrastructure, refer to the existing test files for examples or consult the team documentation.