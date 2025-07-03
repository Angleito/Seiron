# Sei Agent Kit Performance Testing Guide

## Overview

This comprehensive performance testing framework is specifically designed to benchmark and optimize the Sei Agent Kit integration for Sei Network's unique characteristics, including 400ms block finality and parallel execution capabilities.

## 🏗️ Architecture

### Core Components

1. **Sei Network Performance Tests** (`test/performance/sei/`)
   - Block time optimization tests (400ms compliance)
   - Gas optimization and batching tests
   - Parallel execution efficiency tests
   - Network latency adaptation tests

2. **Protocol Performance Tests** (`test/performance/protocols/`)
   - Symphony Protocol optimization
   - DragonSwap liquidity management
   - Yei Finance lending operations
   - Cross-protocol arbitrage detection

3. **Memory Performance Tests** (`test/performance/memory/`)
   - Conversation memory scaling
   - LangChain context management
   - Memory leak detection
   - Cache efficiency optimization

4. **Docker Infrastructure** (`docker-compose.perf.yml`)
   - Isolated performance testing environment
   - Load generation and stress testing
   - Real-time monitoring with Prometheus/Grafana
   - Resource constraint simulation

5. **Performance Optimization** (`src/core/optimization/`)
   - Automated performance tuning
   - Machine learning-based optimization
   - Continuous performance improvement
   - Configuration optimization

## 🚀 Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 18+
- At least 8GB RAM for full test suite
- Network access to Sei testnet (optional)

### Quick Start

1. **Start the performance testing environment:**
```bash
docker-compose -f docker-compose.perf.yml up -d
```

2. **Run basic performance tests:**
```bash
npm run test:performance
```

3. **Access monitoring dashboards:**
- Grafana: http://localhost:3000 (admin/admin)
- Prometheus: http://localhost:9090
- Kibana: http://localhost:5601

### Advanced Testing

1. **Run comprehensive load tests:**
```bash
docker-compose -f docker-compose.perf.yml run --rm load-generator
```

2. **Execute protocol-specific tests:**
```bash
npm run test:protocols
```

3. **Perform memory endurance testing:**
```bash
npm run test:endurance
```

## 📊 Test Scenarios

### 1. Sei Network Optimization Tests

**Purpose:** Validate operations complete within Sei's 400ms block time

**Key Metrics:**
- Block time compliance rate (target: >95%)
- Parallel execution efficiency (target: >80%)
- Gas optimization score (target: >85%)

**Test Configuration:**
```typescript
{
  scenario: 'sei_optimized',
  users: 200,
  duration: 300,
  seiBlockTime: 400,
  parallelExecution: true
}
```

### 2. Protocol Performance Tests

**Purpose:** Optimize performance across integrated DeFi protocols

**Covered Protocols:**
- Symphony (DEX operations)
- DragonSwap (Liquidity management)
- Yei Finance (Lending/borrowing)

**Performance Targets:**
- Symphony: <200ms response time, >50 ops/sec
- DragonSwap: <300ms response time, >30 ops/sec  
- Yei Finance: <400ms response time, >25 ops/sec

### 3. Memory Performance Tests

**Purpose:** Ensure efficient memory usage and prevent leaks

**Test Areas:**
- Conversation memory scaling
- Context management efficiency
- Cache hit rates (target: >80%)
- Memory growth rate (target: <10% per 1000 ops)

### 4. Load Testing Scenarios

#### Mixed Workload
- 40% Swap operations
- 20% Liquidity operations
- 20% Lending operations
- 20% Portfolio queries

#### Stress Testing
- Escalating load: 50 → 1000 users
- Breaking point detection
- Recovery time measurement

#### Endurance Testing
- 2+ hour continuous load
- Memory leak detection
- Performance degradation monitoring

## 🎯 Performance Targets

### Response Time Targets
- **Sei Block Compliance:** <400ms (87.5% of block time)
- **API Responses:** <1000ms (95th percentile)
- **Protocol Operations:** <500ms average
- **Memory Operations:** <100ms
- **Cache Retrieval:** <50ms

### Throughput Targets
- **Overall System:** >100 requests/second
- **Concurrent Users:** Support 1000+ concurrent users
- **Protocol Operations:** >50 operations/second per protocol
- **Memory Operations:** >1000 operations/second

### Resource Efficiency
- **Memory Usage:** <2GB under normal load
- **CPU Usage:** <80% under peak load
- **Cache Hit Rate:** >80%
- **Error Rate:** <2%

## 🔧 Configuration

### Environment Variables

```bash
# Load Testing Configuration
CONCURRENT_USERS=100
DURATION=3600
RAMP_UP_TIME=300
TEST_SCENARIO=mixed_workload

# Performance Thresholds
SEI_BLOCK_TIME_MS=400
MAX_RESPONSE_TIME_MS=1000
MIN_THROUGHPUT_RPS=100
MAX_MEMORY_USAGE_MB=2048

# Monitoring Configuration
PROMETHEUS_ENDPOINT=http://prometheus:9090
GRAFANA_ENDPOINT=http://grafana:3000
METRICS_COLLECTION_INTERVAL=5000
```

### Test Configuration Files

#### Jest Configuration
```javascript
// jest.config.performance.js
module.exports = {
  testMatch: ['**/test/performance/**/*.test.ts'],
  testTimeout: 300000, // 5 minutes for performance tests
  maxWorkers: '50%',
  setupFilesAfterEnv: ['<rootDir>/test/performance/setup.ts']
};
```

#### Performance Test Setup
```typescript
// test/performance/setup.ts
beforeAll(async () => {
  await startPerformanceMonitoring();
  await warmUpSystem();
});

afterAll(async () => {
  await generatePerformanceReport();
  await cleanupResources();
});
```

## 📈 Monitoring and Metrics

### Real-Time Dashboards

1. **System Overview Dashboard**
   - Response time trends
   - Throughput metrics
   - Error rates
   - Resource utilization

2. **Sei Network Dashboard**
   - Block time compliance
   - Gas optimization metrics
   - Parallel execution efficiency
   - Protocol performance comparison

3. **Memory Dashboard**
   - Heap usage trends
   - GC frequency and duration
   - Memory leak detection
   - Cache performance

### Key Performance Indicators (KPIs)

#### Primary KPIs
- **Sei Block Compliance Rate:** Percentage of operations completing within 400ms
- **Overall System Throughput:** Requests per second across all endpoints
- **Error Rate:** Percentage of failed requests
- **Resource Efficiency:** CPU and memory utilization

#### Secondary KPIs
- **Protocol Response Times:** Average response time per protocol
- **Cache Hit Rate:** Percentage of cache hits vs misses
- **Memory Stability:** Memory growth rate over time
- **Network Efficiency:** Connection pool utilization

### Alerting Rules

```yaml
# Prometheus alerting rules
groups:
  - name: sei_performance_alerts
    rules:
      - alert: HighResponseTime
        expr: sei:response_time:p95 > 1000
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          
      - alert: LowBlockCompliance
        expr: sei:block_time_compliance:rate_1m < 0.9
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Sei block time compliance below 90%"
```

## 🛠️ Performance Optimization

### Automated Optimization

The framework includes automated performance optimization:

```typescript
const optimizer = new PerformanceOptimizer(monitor, config);

// Start continuous optimization
await optimizer.startContinuousOptimization({
  targetLatency: 400,
  targetThroughput: 100,
  memoryBudget: 2048 * 1024 * 1024,
  seiBlockTime: 400,
  protocols: ['symphony', 'dragonswap', 'yeifinance'],
  concurrentUsers: 1000
});
```

### Optimization Strategies

1. **Sei Network Optimizations**
   - Batch operation sizing
   - Parallel execution tuning
   - Gas price optimization
   - Block time alignment

2. **Memory Optimizations**
   - Garbage collection tuning
   - Cache size optimization
   - Memory leak prevention
   - Context compression

3. **Protocol Optimizations**
   - Adaptive routing
   - Load balancing
   - Circuit breaker patterns
   - Response caching

## 📋 Running Specific Tests

### Block Time Optimization Tests
```bash
npm test -- test/performance/sei/block-time-optimization.test.ts
```

### Protocol Performance Tests
```bash
npm test -- test/performance/protocols/multi-protocol-performance.test.ts
```

### Memory Performance Tests
```bash
npm test -- test/performance/memory/conversation-memory-performance.test.ts
```

### Docker-based Load Tests
```bash
# Run comprehensive load tests
docker-compose -f docker-compose.perf.yml run --rm load-generator load --users 500 --duration 1800

# Run stress tests
docker-compose -f docker-compose.perf.yml run --rm load-generator stress --max-users 1000

# Run protocol-specific tests
docker-compose -f docker-compose.perf.yml run --rm load-generator protocol --protocol symphony --users 100
```

## 📊 Report Generation

### Automated Reports

Performance reports are automatically generated after each test run:

1. **HTML Reports:** Comprehensive visual reports with charts and metrics
2. **JSON Reports:** Raw data for analysis and integration
3. **CSV Reports:** Tabular data for spreadsheet analysis
4. **PDF Reports:** Executive summaries for stakeholders

### Custom Report Generation

```bash
# Generate comprehensive performance report
npm run performance:report

# Generate protocol comparison report
npm run performance:protocol-comparison

# Generate memory analysis report
npm run performance:memory-analysis
```

## 🔍 Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Check for memory leaks in conversation history
   - Adjust cache sizes and TTL values
   - Enable garbage collection optimization

2. **Slow Response Times**
   - Verify network connectivity
   - Check database connection pool settings
   - Analyze slow query logs

3. **Low Throughput**
   - Increase concurrent connection limits
   - Optimize protocol selection algorithms
   - Enable request batching

### Debug Mode

Enable detailed logging for troubleshooting:

```bash
DEBUG=sei:performance,sei:optimization npm test
```

## 🚀 Best Practices

### Performance Testing
1. **Warm up** the system before running performance tests
2. **Isolate** performance tests from unit tests
3. **Monitor** resource usage during tests
4. **Baseline** performance before making changes
5. **Automate** performance regression testing

### Optimization
1. **Profile** before optimizing
2. **Measure** the impact of optimizations
3. **Test** optimizations under load
4. **Document** performance improvements
5. **Rollback** if optimizations cause issues

### Monitoring
1. **Set up alerts** for performance degradation
2. **Monitor trends** over time
3. **Correlate** performance with business metrics
4. **Review** performance regularly
5. **Optimize** based on real usage patterns

## 📚 Additional Resources

- [Sei Network Documentation](https://docs.sei.io/)
- [Performance Testing Best Practices](./PERFORMANCE_BEST_PRACTICES.md)
- [Monitoring Setup Guide](./MONITORING_SETUP.md)
- [Optimization Strategies](./OPTIMIZATION_STRATEGIES.md)

## 🤝 Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines on contributing to the performance testing framework.

## 📄 License

This performance testing framework is part of the Sei Agent Kit and is licensed under the MIT License.