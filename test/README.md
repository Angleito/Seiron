# Sei Agent Kit Integration Testing Infrastructure

This directory contains the comprehensive integration testing infrastructure for the Sei Agent Kit, providing Docker-based validation, property-based testing, and performance monitoring.

## 🏗️ Architecture Overview

The testing infrastructure is built on functional programming principles with the following components:

### Core Components
- **Docker-based Testing Environment**: Isolated containers for protocols, databases, and services
- **Protocol Integration Tests**: Validates Symphony, Takara, and cross-protocol operations
- **Agent Coordination Tests**: Tests multi-agent decision making and orchestration
- **Property-Based Testing**: Mathematical invariant validation using fast-check
- **Performance Validation**: Sei 400ms block time constraint testing
- **Comprehensive Reporting**: Metrics collection and analysis

### Directory Structure
```
test/
├── integration/           # Integration test suites
│   ├── protocols/        # Protocol-specific tests
│   │   ├── symphony.integration.test.ts
│   │   ├── takara.integration.test.ts
│   │   └── cross-protocol.integration.test.ts
│   ├── agents/           # Agent coordination tests
│   │   └── multi-agent-coordination.test.ts
│   └── property/         # Property-based tests
│       └── protocol-invariants.test.ts
├── utils/                # Testing utilities
│   ├── TestEnvironment.ts
│   ├── MetricsCollector.ts
│   ├── PropertyTestRunner.ts
│   ├── AgentTestHarness.ts
│   └── ArbitrageDetector.ts
├── mocks/                # Mock protocol services
│   ├── symphony/
│   └── takara/
├── fixtures/             # Test data and database fixtures
└── monitoring/           # Performance monitoring configuration
```

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+
- 8GB+ RAM for full test suite

### Running Tests

#### All Integration Tests
```bash
./scripts/run-integration-tests.sh
```

#### Specific Test Suites
```bash
# Protocol integration tests only
./scripts/run-integration-tests.sh protocol

# Agent coordination tests only
./scripts/run-integration-tests.sh agents

# Property-based tests only
./scripts/run-integration-tests.sh property

# Performance tests only
./scripts/run-integration-tests.sh performance

# Quick smoke tests
./scripts/run-integration-tests.sh quick
```

#### Manual Docker Commands
```bash
# Start test infrastructure
npm run docker:test:up

# Run specific test suite
npm run test:integration:docker

# View logs
npm run docker:test:logs

# Cleanup
npm run docker:test:down
```

## 🧪 Test Categories

### 1. Protocol Integration Tests

#### Symphony Protocol Tests (`symphony.integration.test.ts`)
- **Swap Quote Validation**: Tests price calculations and routing
- **Route Optimization**: Validates optimal path finding
- **Slippage Protection**: Ensures slippage bounds are respected
- **Gas Estimation**: Validates transaction cost calculations
- **Error Handling**: Tests graceful failure scenarios

#### Takara Protocol Tests (`takara.integration.test.ts`)
- **Lending Operations**: Supply, withdraw, borrow, repay functionality
- **Health Factor Calculations**: Mathematical validation of position health
- **Interest Rate Models**: Tests APY calculations and compounding
- **Liquidation Logic**: Validates liquidation scenarios
- **Risk Management**: Tests collateralization ratios

#### Cross-Protocol Tests (`cross-protocol.integration.test.ts`)
- **Arbitrage Detection**: Tests cross-protocol price discrepancy detection
- **Leverage Operations**: Multi-protocol leveraged position creation
- **Yield Optimization**: Cross-protocol yield farming strategies
- **Value Conservation**: Ensures value preservation across operations

### 2. Agent Coordination Tests (`multi-agent-coordination.test.ts`)

- **Multi-Agent Decision Making**: Tests collaborative decision processes
- **Conflict Resolution**: Validates consensus mechanisms
- **Agent Communication**: Tests inter-agent messaging and coordination
- **Failure Recovery**: Tests agent failure and recovery scenarios
- **Performance Under Load**: Concurrent agent operation testing

### 3. Property-Based Tests (`protocol-invariants.test.ts`)

#### Mathematical Invariants
- **Value Conservation**: Total system value preservation
- **Interest Rate Consistency**: Mathematical relationship validation
- **Liquidity Invariants**: Constant product formula validation
- **Reserve Requirements**: Protocol reserve threshold maintenance

#### Economic Properties
- **Yield Calculations**: Compound interest mathematical validation
- **Risk Metrics**: Risk-return relationship consistency
- **Arbitrage Bounds**: Price discrepancy limitation validation
- **System Health**: Overall protocol health maintenance

## 📊 Performance Testing

### Sei Network Constraints
- **Block Time Compliance**: All operations must complete within 400ms
- **Throughput Testing**: Concurrent operation handling
- **Resource Monitoring**: Memory and CPU usage validation
- **Network Latency**: Cross-protocol communication timing

### Performance Metrics
- **Operation Latency**: P95 and P99 response times
- **Throughput**: Operations per second
- **Error Rates**: Failure percentage under load
- **Resource Utilization**: System resource consumption

## 🔧 Testing Utilities

### TestEnvironment (`TestEnvironment.ts`)
Manages Docker container orchestration and service coordination:
```typescript
const testEnv = await TestEnvironment.create();
await testEnv.waitForServices(['symphony-mock', 'takara-mock']);
await testEnv.resetState();
```

### MetricsCollector (`MetricsCollector.ts`)
Collects and analyzes performance metrics:
```typescript
const metrics = new MetricsCollector('protocol-name');
metrics.recordLatency('operation', duration);
metrics.recordThroughput('operation', count, duration);
```

### PropertyTestRunner (`PropertyTestRunner.ts`)
Provides DeFi-specific property-based testing utilities:
```typescript
const runner = new PropertyTestRunner();
const test = {
  name: 'value conservation',
  generator: runner.generateSwapScenario(),
  property: async (scenario) => { /* test logic */ }
};
await runner.run(test);
```

### AgentTestHarness (`AgentTestHarness.ts`)
Provides agent testing and coordination simulation:
```typescript
const harness = new AgentTestHarness([lendingAgent, liquidityAgent]);
await harness.simulateAgentCoordination({
  agentIds: ['lending-agent-1', 'liquidity-agent-1'],
  coordinationType: 'consensus'
});
```

## 🐳 Docker Infrastructure

### Services
- **sei-testnet**: Local Sei blockchain node
- **redis**: Caching and session management
- **postgres**: Test data persistence
- **symphony-mock**: Mock Symphony protocol API
- **takara-mock**: Mock Takara protocol API
- **prometheus**: Metrics collection
- **grafana**: Performance monitoring dashboard

### Network Configuration
- Isolated Docker network: `sei-test-network`
- Service discovery via container names
- Health checks for all services
- Automatic dependency management

## 📈 Monitoring and Reporting

### Real-time Monitoring
- **Prometheus**: Metrics collection from all services
- **Grafana**: Performance dashboards and alerting
- **Docker Stats**: Container resource monitoring

### Test Reports
- **Coverage Reports**: Code coverage analysis
- **Performance Reports**: Latency and throughput analysis
- **Integration Reports**: Test execution summaries
- **Property Test Results**: Mathematical invariant validation

### Report Locations
```
test-results/
├── integration-test-report.md
├── performance-metrics.json
├── coverage/
│   └── lcov-report/
└── logs/
    ├── sei-testnet.log
    ├── symphony-mock.log
    └── takara-mock.log
```

## 🛠️ Configuration

### Environment Variables
```bash
# Protocol API URLs
SYMPHONY_API_URL=http://symphony-mock:8001
TAKARA_API_URL=http://takara-mock:8002

# Database connections
DATABASE_URL=postgresql://testuser:testpass@postgres:5432/sei_agent_test
REDIS_URL=redis://redis:6379

# Test configuration
TEST_TIMEOUT=60000
MAX_WORKERS=4
PARALLEL_TESTS=true
```

### Docker Compose Profiles
- **default**: Core testing infrastructure
- **monitoring**: Adds Prometheus and Grafana
- **performance**: Includes performance testing tools

## 🔍 Debugging

### Common Issues

#### Services Not Starting
```bash
# Check service health
docker-compose -f docker-compose.test.yml ps

# View service logs
docker-compose -f docker-compose.test.yml logs service-name

# Reset environment
docker-compose -f docker-compose.test.yml down -v
```

#### Test Failures
```bash
# Run specific test with verbose output
npm run test:integration:docker -- --verbose test-file-name

# Check test results
cat test-results/integration-test-report.md

# View performance metrics
cat test-results/performance-metrics.json
```

#### Performance Issues
```bash
# Monitor resource usage
docker stats

# Check Sei node status
curl http://localhost:26657/status

# View performance dashboard
open http://localhost:3000  # Grafana
```

## 🧩 Extending Tests

### Adding New Protocol Tests
1. Create test file in `test/integration/protocols/`
2. Implement protocol wrapper if needed
3. Add property-based tests for invariants
4. Update Docker configuration if external service needed

### Adding Agent Tests
1. Create agent test file in `test/integration/agents/`
2. Use `AgentTestHarness` for coordination testing
3. Add performance benchmarks
4. Validate decision-making properties

### Adding Property Tests
1. Create generators in `PropertyTestRunner`
2. Define mathematical invariants
3. Implement property validation functions
4. Add to property test suite

## 📚 Best Practices

### Test Design
- **Functional Programming**: Use fp-ts for composable test logic
- **Property-Based**: Validate mathematical properties with generators
- **Isolation**: Each test should be independent and repeatable
- **Performance**: Include timing and resource validation

### Error Handling
- **Graceful Degradation**: Tests should handle service failures
- **Meaningful Errors**: Provide context for test failures
- **Recovery Testing**: Test failure and recovery scenarios

### Metrics Collection
- **Comprehensive Coverage**: Measure latency, throughput, and resources
- **Trend Analysis**: Track metrics over time
- **Alerting**: Set up alerts for performance degradation

## 🤝 Contributing

When adding new tests:
1. Follow functional programming patterns
2. Include property-based validation
3. Add performance benchmarks
4. Update documentation
5. Ensure Docker compatibility

## 📞 Support

For issues with the testing infrastructure:
1. Check Docker service health
2. Review test logs and reports
3. Validate environment configuration
4. Consult debugging section above

---

**Note**: This testing infrastructure is designed for the Sei Agent Kit DeFi protocol system and includes comprehensive validation of mathematical invariants, economic properties, and performance characteristics essential for production deployment.