# End-to-End LangChain Integration Testing Framework

A comprehensive E2E testing framework for LangChain-integrated Sei Agent Kit with Docker validation, functional programming principles, and comprehensive conversation flow testing.

## 🌟 Overview

This testing framework provides comprehensive end-to-end validation of the complete conversational AI experience, from natural language input through to protocol execution. It uses functional programming principles, property-based testing, and Docker-based isolation to ensure reliable, performant, and user-friendly interaction with DeFi protocols.

## 🏗️ Framework Architecture

```
test/e2e/
├── conversations/          # Conversation flow tests
│   ├── single-turn.test.ts    # Simple, direct commands
│   └── multi-turn.test.ts     # Complex, multi-step conversations
├── memory/                 # Memory integration tests
│   ├── cross-session.test.ts  # Cross-session context preservation
│   └── consistency.test.ts    # Memory operation consistency
├── nlp/                    # NLP robustness tests
│   └── robustness.test.ts     # Natural language variation handling
├── execution/              # Protocol execution tests
│   └── protocol-pipeline.test.ts # NL to protocol execution pipeline
├── performance/            # Performance and load tests
│   └── concurrent-users.test.ts  # Concurrent user and load testing
├── simulation/             # Conversation simulation tools
│   └── conversation-simulator.ts # Realistic user behavior simulation
├── utils/                  # Test utilities and generators
│   └── property-generators.ts    # Property-based test data generators
├── reporters/              # Custom test reporters
│   └── performance-reporter.js   # Performance metrics reporting
├── docker/                 # Docker configurations
├── fixtures/               # Test data and scenarios
└── setup.ts               # Global test setup and utilities
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- Docker and Docker Compose
- OpenAI API key (for testing)

### Installation

```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.e2e.example .env.e2e

# Edit environment variables
vi .env.e2e
```

### Environment Configuration

Configure your `.env.e2e` file:

```bash
# API Configuration
E2E_API_URL=http://localhost:3001
E2E_CONCURRENT_USERS=10
E2E_LOAD_DURATION=300000

# Test Wallet (for simulation)
E2E_TEST_WALLET=0x742d35Cc6634C0532925a3b8D48C37Fc48c4e8D9
E2E_TEST_PRIVATE_KEY=test-private-key

# OpenAI (use test key or mock)
OPENAI_API_KEY=your-test-api-key

# Feature Flags
ENABLE_EXTERNAL_APIS=false
ENABLE_BLOCKCHAIN_CALLS=false
ENABLE_PERFORMANCE_MONITORING=true
```

### Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test categories
npm run test:e2e -- conversations/
npm run test:e2e -- memory/
npm run test:e2e -- nlp/
npm run test:e2e -- execution/
npm run test:e2e -- performance/

# Run with Docker (recommended)
docker-compose -f docker-compose.e2e.yml up --build
npm run test:e2e
docker-compose -f docker-compose.e2e.yml down
```

### Quick Test

```bash
# Run a quick smoke test
npm run test:e2e -- conversations/single-turn.test.ts --testNamePattern="should execute simple lending commands"
```

## 🧪 Test Categories

### 1. Conversation Flow Tests

Tests the complete conversation experience from user input to bot response.

#### Single-Turn Tests (`conversations/single-turn.test.ts`)
- **Simple Command Execution**: Direct commands like "Lend 1000 USDC"
- **Property-Based Testing**: Random valid commands with fast-check
- **Error Handling**: Invalid inputs and malformed requests
- **Response Time Validation**: Performance thresholds
- **User Context Integration**: User preferences and experience levels

```typescript
// Example: Testing simple lending commands
it('should execute simple lending commands correctly', async () => {
  const user = MockDataGenerators.userProfile();
  const message = 'Lend 1000 USDC';
  
  const result = await client.sendMessage(message, user.userId);
  const response = TestAssertions.expectEither(result);
  
  expect(response).toBeValidConversationResponse();
  expect(response.intent.toLowerCase()).toContain('lend');
  expect(response.parameters.amount).toBe(1000);
  expect(response.parameters.asset).toBe('USDC');
});
```

#### Multi-Turn Tests (`conversations/multi-turn.test.ts`)
- **Progressive Intent Resolution**: Building context across turns
- **Context Preservation**: Maintaining conversation state
- **Complex Multi-Step Operations**: Yield optimization workflows
- **Error Recovery**: Graceful handling of multi-turn errors

```typescript
// Example: Multi-turn yield optimization
it('should resolve ambiguous lending request through multiple turns', async () => {
  const session = new ConversationSession(E2E_CONFIG.API_BASE_URL, user.userId);
  
  // Turn 1: Ambiguous request
  const turn1 = await session.sendMessage('I want to earn yield');
  expect(response1.needsDisambiguation).toBe(true);
  
  // Turn 2: Provide details
  const turn2 = await session.sendMessage('I have 5000 USDC');
  expect(response2.parameters.amount).toBe(5000);
  
  // Turn 3: Complete specification
  const turn3 = await session.sendMessage('I prefer low risk');
  expect(response3.command.riskLevel).toBe('low');
});
```

### 2. Memory Integration Tests

Tests memory persistence and context preservation across conversation sessions.

#### Cross-Session Tests (`memory/cross-session.test.ts`)
- **User Preference Persistence**: Maintaining user settings across sessions
- **Conversation History**: Accessing previous conversation context
- **Operational Memory**: Remembering past operations and transactions
- **Context Consistency**: Ensuring memory consistency under concurrent access

```typescript
// Example: Testing preference persistence
it('should persist user preferences across sessions', async () => {
  // Session 1: Set preferences
  const session1 = await client.createSession(user.userId);
  await client.updateUserPreferences(user.userId, preferences);
  await client.endSession(session1);
  
  // Session 2: Use persisted preferences
  const session2 = await client.createSession(user.userId);
  const response = await client.sendMessage('Lend 1000 USDC', user.userId, session2);
  
  // Should reflect stored preferences
  expect(response.parameters.protocol).toBeIn(preferences.preferredProtocols);
});
```

#### Consistency Tests (`memory/consistency.test.ts`)
- **Idempotency**: Duplicate operations handled correctly
- **Concurrent Operations**: Memory consistency under load
- **Data Integrity**: Validation and consistency checks
- **Performance Under Load**: Memory operations at scale

### 3. NLP Robustness Tests

Tests natural language processing resilience with varied user inputs.

#### Robustness Tests (`nlp/robustness.test.ts`)
- **Intent Recognition**: Consistent intent detection across variations
- **Parameter Extraction**: Accurate entity extraction from natural language
- **Typo Handling**: Graceful handling of misspellings and typos
- **Edge Cases**: Very long/short inputs, special characters, multilingual

```typescript
// Example: Testing intent consistency
it('should recognize similar intents consistently', async () => {
  const variations = [
    'Lend 1000 USDC',
    'I want to lend 1000 USDC',
    'Supply 1000 USDC for lending',
    'Deposit 1000 USDC to earn interest'
  ];
  
  const intents = await Promise.all(
    variations.map(v => client.extractIntent(v))
  );
  
  // All should produce similar intent
  const uniqueIntents = new Set(intents.map(i => i.intent));
  expect(uniqueIntents.size).toBeLessThanOrEqual(2);
});
```

### 4. Protocol Execution Tests

Tests the complete pipeline from natural language to protocol execution.

#### Pipeline Tests (`execution/protocol-pipeline.test.ts`)
- **End-to-End Execution**: Complete NL to protocol execution
- **Operation Status Tracking**: Monitoring operation progress
- **Error Handling**: Network errors, insufficient balance, invalid protocols
- **Risk Assessment**: Risk validation and user constraint checking
- **State Validation**: Portfolio state changes after operations

```typescript
// Example: End-to-end lending execution
it('should execute simple lending command end-to-end', async () => {
  const command = 'Lend 1000 USDC on YeiFinance';
  
  // Get initial state
  const initialState = await client.getPortfolioState(user.userId, true);
  
  // Execute command
  const execution = await client.executeCommand(command, user.userId);
  
  expect(execution.operation.type).toBe('lending');
  expect(execution.operation.protocol).toBe('YeiFinance');
  
  // Validate state change
  const finalState = await client.getPortfolioState(user.userId);
  expect(finalState.positions.length).toBeGreaterThan(initialState.positions.length);
});
```

### 5. Performance and Load Tests

Tests system performance under concurrent user load and stress scenarios.

#### Concurrent User Tests (`performance/concurrent-users.test.ts`)
- **Basic Concurrency**: 10+ concurrent users performing operations
- **Load Testing**: Sustained load with ramp-up and cool-down
- **Stress Testing**: Memory stress and rapid successive requests
- **Performance Degradation**: Performance under increasing load
- **Burst Load**: Handling sudden traffic spikes

```typescript
// Example: Concurrent user testing
it('should handle 10 concurrent users performing simple operations', async () => {
  const userCount = 10;
  const scenario = () => ({
    turns: [
      { input: 'Show my portfolio', expectedIntent: 'portfolio' },
      { input: 'Lend 100 USDC', expectedIntent: 'lending' }
    ]
  });
  
  const result = await simulator.simulateConcurrentUsers(userCount, 30000, scenario);
  const conversations = TestAssertions.expectEither(result);
  
  const successRate = conversations.filter(c => c.success).length / conversations.length;
  expect(successRate).toBeGreaterThanOrEqual(0.8); // 80% success rate
});
```

## 🔧 Test Utilities and Tools

### Property Generators

Comprehensive property generators for realistic test data:

```typescript
import { PropertyGenerators } from './utils/property-generators';

// Generate user profiles
const userProfile = PropertyGenerators.UserProfile.basicProfile();

// Generate conversation scenarios
const scenario = PropertyGenerators.Conversation.conversationScenario();

// Generate operations
const lendingOp = PropertyGenerators.Operation.lendingOperation();
```

### Conversation Simulator

Realistic user behavior simulation:

```typescript
import { ConversationSimulator } from './simulation/conversation-simulator';

const simulator = new ConversationSimulator(API_URL);

// Simulate single user
const result = await simulator.simulateUserConversation(userProfile, scenario);

// Simulate concurrent users
const results = await simulator.simulateConcurrentUsers(10, 30000, scenarioGenerator);

// Load testing
const loadResult = await simulator.simulateLoadTest(loadConfig);
```

### Performance Monitoring

Built-in performance monitoring and reporting:

```typescript
// Custom Jest reporter tracks:
// - Response times and distribution
// - Memory usage patterns
// - Error categorization
// - Conversation metrics
// - Throughput and success rates

// Results saved to: test-results/e2e/performance.json
```

## 🐳 Docker Integration

### Docker Compose Setup

The framework includes a comprehensive Docker Compose configuration:

```yaml
# docker-compose.e2e.yml
services:
  langchain-api:          # Main API server
  redis:                  # Memory storage
  protocol-simulator:     # Blockchain simulation
  conversation-tester:    # Automated conversation testing
  memory-store:          # PostgreSQL for persistent memory
  performance-monitor:   # Prometheus metrics
  grafana:              # Metrics visualization
  load-tester:          # Load testing service
```

### Running with Docker

```bash
# Start all services
docker-compose -f docker-compose.e2e.yml up --build

# Run specific services
docker-compose -f docker-compose.e2e.yml up langchain-api redis protocol-simulator

# View logs
docker-compose -f docker-compose.e2e.yml logs -f langchain-api

# Clean up
docker-compose -f docker-compose.e2e.yml down --volumes
```

## 📊 Performance Thresholds

Default performance thresholds (configurable in `setup.ts`):

```typescript
PERFORMANCE_THRESHOLDS: {
  RESPONSE_TIME_MS: 2000,        // Max response time
  MEMORY_USAGE_MB: 512,          // Max memory usage
  THROUGHPUT_RPS: 10,            // Min requests per second
  ERROR_RATE: 0.01,              // Max error rate (1%)
  CONCURRENT_CONVERSATIONS: 50    // Max concurrent conversations
}
```

## 📈 Monitoring and Reporting

### Performance Reports

Automatic generation of comprehensive performance reports:

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "summary": {
    "totalTests": 156,
    "passedTests": 142,
    "failedTests": 14,
    "successRate": 0.91,
    "averageTestTime": 1250
  },
  "performance": {
    "averageResponseTime": 850,
    "memoryUsagePeak": 234567890,
    "responseTimeDistribution": {
      "p50": 750,
      "p95": 1800,
      "p99": 2100
    }
  },
  "conversation": {
    "averageResponseTime": 920,
    "totalConversations": 1250,
    "successRate": 0.94,
    "memoryPersistenceRate": 0.98
  },
  "recommendations": [
    {
      "type": "performance",
      "priority": "medium",
      "message": "Consider optimizing NLP processing for faster response times"
    }
  ]
}
```

### Grafana Dashboards

Pre-configured Grafana dashboards for:
- Real-time conversation metrics
- Memory usage patterns
- Response time distributions
- Error rate tracking
- Throughput monitoring

Access at: `http://localhost:3000` (admin/admin)

## 🧬 Functional Programming Principles

The framework emphasizes functional programming principles:

### Pure Functions for Testing
```typescript
// Conversation flows as deterministic transformations
const processConversationTurn = (input: string, context: Context): Either<Error, Response>

// Monadic error handling
pipe(
  conversation,
  E.chain(validateIntent),
  E.chain(extractParameters),
  E.chain(executeOperation),
  E.fold(handleError, handleSuccess)
)
```

### Property-Based Testing
```typescript
// Test conversation properties across random inputs
fc.assert(fc.asyncProperty(
  TestUtils.conversationScenarios.multiTurn(),
  async (scenario) => {
    const result = await processScenario(scenario);
    return validateScenarioProperties(result);
  }
));
```

### Immutable Test State
```typescript
// All test data is immutable and functional
const testState = pipe(
  initialState,
  addUser(userProfile),
  addPreferences(preferences),
  addConversationHistory(history)
);
```

## 🔧 Configuration Options

### Environment Variables

```bash
# Test Configuration
E2E_CONCURRENT_USERS=10          # Number of concurrent users for load testing
E2E_LOAD_DURATION=300000         # Load test duration in milliseconds
E2E_TEST_TIMEOUT=60000           # Individual test timeout

# Performance Thresholds
MAX_RESPONSE_TIME=2000           # Maximum acceptable response time (ms)
MAX_MEMORY_USAGE=512             # Maximum memory usage (MB)
MIN_SUCCESS_RATE=0.95            # Minimum success rate threshold

# Feature Flags
ENABLE_EXTERNAL_APIS=false       # Enable real API calls
ENABLE_BLOCKCHAIN_CALLS=false    # Enable real blockchain transactions
ENABLE_PERFORMANCE_MONITORING=true # Enable performance tracking
DEBUG_E2E=false                  # Enable debug logging
```

### Test Customization

```typescript
// Custom test configurations
const customConfig = {
  conversationTimeout: 30000,
  memoryPersistenceTimeout: 10000,
  maxRetryAttempts: 3,
  performanceThresholds: {
    responseTime: 1500,
    memoryUsage: 256 * 1024 * 1024,
    errorRate: 0.005
  }
};
```

## 🚨 Troubleshooting

### Common Issues

#### Docker Services Not Starting
```bash
# Check Docker daemon
docker info

# Check port conflicts
lsof -i :3001 -i :6379 -i :5432

# Reset Docker state
docker-compose -f docker-compose.e2e.yml down --volumes
docker system prune -f
```

#### Memory Issues During Testing
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Monitor memory usage
npm run test:e2e -- --detectOpenHandles --forceExit
```

#### Test Timeouts
```bash
# Increase test timeout
npm run test:e2e -- --testTimeout=120000

# Run tests with verbose output
npm run test:e2e -- --verbose --detectOpenHandles
```

### Debug Mode

Enable debug mode for detailed logging:

```bash
export DEBUG_E2E=true
export VERBOSE_LOGGING=true
npm run test:e2e
```

## 📚 Best Practices

### 1. Test Organization
- Keep tests focused and atomic
- Use descriptive test names
- Group related tests in describe blocks
- Separate setup and teardown logic

### 2. Property-Based Testing
- Use property-based testing for edge cases
- Generate realistic test data
- Test invariants and properties
- Combine with example-based tests

### 3. Performance Testing
- Set realistic performance thresholds
- Test under various load conditions
- Monitor memory usage and cleanup
- Use proper concurrency controls

### 4. Error Handling
- Test both happy and error paths
- Validate error messages are user-friendly
- Test error recovery scenarios
- Monitor error rates and patterns

### 5. Docker Usage
- Use Docker for consistent test environments
- Isolate test data and state
- Clean up resources after tests
- Monitor container resource usage

## 📖 Examples

### Basic Conversation Test
```typescript
it('should handle a complete lending workflow', async () => {
  const user = MockDataGenerators.userProfile();
  const client = new ConversationClient(E2E_CONFIG.API_BASE_URL);
  
  // Step 1: Intent expression
  const step1 = await client.sendMessage('I want to earn yield', user.userId);
  const response1 = TestAssertions.expectEither(step1);
  expect(response1.needsDisambiguation).toBe(true);
  
  // Step 2: Parameter specification
  const step2 = await client.sendMessage('5000 USDC, low risk', user.userId);
  const response2 = TestAssertions.expectEither(step2);
  expect(response2.command).toBeDefined();
  expect(response2.command.parameters.amount).toBe(5000);
  expect(response2.command.riskLevel).toBe('low');
});
```

### Memory Persistence Test
```typescript
it('should remember operations across sessions', async () => {
  const user = MockDataGenerators.userProfile();
  
  // Session 1: Perform operation
  const session1 = await client.createSession(user.userId);
  await client.sendMessage('Lend 1000 USDC on YeiFinance', user.userId, session1);
  await client.endSession(session1);
  
  // Session 2: Reference previous operation
  const session2 = await client.createSession(user.userId);
  const response = await client.sendMessage('What was my last operation?', user.userId, session2);
  
  expect(response.message.toLowerCase()).toContain('usdc');
  expect(response.message.toLowerCase()).toContain('yeifinance');
});
```

### Load Testing Example
```typescript
it('should handle sustained load', async () => {
  const loadConfig = {
    maxConcurrentUsers: 20,
    rampUpTime: 30000,
    duration: 120000,
    scenarioTypes: ['lending', 'swapping']
  };
  
  const result = await simulator.simulateLoadTest(loadConfig);
  const loadTestResult = TestAssertions.expectEither(result);
  
  expect(loadTestResult.errorRate).toBeLessThan(0.05);
  expect(loadTestResult.averageResponseTime).toBeLessThan(2000);
  expect(loadTestResult.throughput).toBeGreaterThan(5);
});
```

## 🤝 Contributing

### Adding New Tests

1. **Choose the appropriate category** (conversations, memory, nlp, execution, performance)
2. **Follow the functional programming patterns** used in existing tests
3. **Use property-based testing** for comprehensive coverage
4. **Include performance validation** where appropriate
5. **Add proper documentation** and examples

### Test File Template

```typescript
/**
 * @fileoverview [Description of test file purpose]
 * [Detailed description of what this test file validates]
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import * as fc from 'fast-check';
import { 
  E2E_CONFIG, 
  TestUtils, 
  TestAssertions, 
  MockDataGenerators,
  DockerUtils 
} from '../setup';

describe('[Test Category] E2E Tests', () => {
  let dockerAvailable: boolean;
  
  beforeAll(async () => {
    dockerAvailable = await DockerUtils.isDockerRunning();
    if (dockerAvailable) {
      await DockerUtils.waitForService(`${E2E_CONFIG.API_BASE_URL}/health`);
    }
  });
  
  describe('[Test Group]', () => {
    it('should [test description]', async () => {
      // Test implementation
    });
  });
  
  // Skip tests if Docker is not available
  if (!dockerAvailable) {
    it.skip('Docker-based tests skipped - Docker not available', () => {});
  }
});
```

## 📄 License

This E2E testing framework is part of the Sei AI Portfolio Manager project and is licensed under the MIT License.

---

## 🔗 Related Documentation

- [LangChain Integration README](../../src/langchain/README.md)
- [Testing Infrastructure](../../backend/TESTING_INFRASTRUCTURE.md)
- [API Documentation](../../backend/docs/api/api-reference.md)
- [Functional Programming Guide](../../backend/docs/guides/functional-programming.md)

For more detailed information about specific test categories or configuration options, please refer to the individual test files and their inline documentation.