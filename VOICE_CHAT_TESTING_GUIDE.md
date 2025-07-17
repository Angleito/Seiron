# Seiron Voice Chat E2E Testing Guide

## Overview

This guide provides comprehensive instructions for running the voice chat E2E testing infrastructure that was implemented for the Seiron blockchain investment platform.

## Prerequisites

### System Requirements
- **Docker**: Version 20.10+ with Docker Compose
- **Node.js**: Version 18+ (for local development)
- **Memory**: At least 4GB RAM available for Docker containers
- **Storage**: At least 5GB free disk space
- **OS**: macOS, Linux, or Windows with WSL2

### Environment Setup

1. **Start Docker**
   ```bash
   # Ensure Docker is running
   docker --version
   docker-compose --version
   ```

2. **Clone and Navigate**
   ```bash
   cd /Users/angel/Projects/Seiron
   ```

3. **Set Environment Variables**
   ```bash
   export ELEVENLABS_API_KEY="your_elevenlabs_api_key"
   export OPENAI_API_KEY="your_openai_api_key"
   ```

4. **Create Required Directories**
   ```bash
   mkdir -p test-results
   ```

## Testing Infrastructure Components

### 1. Docker Services

The testing infrastructure includes 4 Docker services:

| Service | Port | Purpose |
|---------|------|---------|
| **postgres-test** | 5433 | Test database with seed data |
| **redis-test** | 6380 | Test cache and session storage |
| **backend-test** | 4000 | Backend API with test configuration |
| **frontend-test** | 3001 | Frontend with test environment |

### 2. Test Categories

- **Unit Tests**: Individual component testing
- **Integration Tests**: Service interaction testing
- **E2E Tests**: Complete voice chat workflows
- **Performance Tests**: Load testing and benchmarks
- **Voice Tests**: Voice-specific functionality

### 3. Real Services Integration

The testing infrastructure now uses real services instead of mocks:

- **ElevenLabs**: Real voice synthesis API (requires API key)
- **Audio Processing**: Real browser audio APIs and device access
- **Blockchain**: Real Sei blockchain integration for portfolio data

## Running Tests

### Quick Start

```bash
# Make script executable
chmod +x frontend/scripts/test-docker.sh

# Run full test suite
./frontend/scripts/test-docker.sh

# Run specific test types
./frontend/scripts/test-docker.sh --test-suite voice
./frontend/scripts/test-docker.sh --test-suite e2e
./frontend/scripts/test-docker.sh --test-suite performance
```

### Detailed Commands

#### 1. Setup Test Environment
```bash
# Setup infrastructure without running tests
./frontend/scripts/test-docker.sh --setup-only

# Check service health
./frontend/scripts/test-docker.sh --health-check

# View running containers
./frontend/scripts/test-docker.sh --ps
```

#### 2. Run Test Suites
```bash
# Voice chat specific tests
./frontend/scripts/test-docker.sh -t voice -j 4 -v

# Integration tests
./frontend/scripts/test-docker.sh -t integration

# Performance tests with reports
./frontend/scripts/test-docker.sh -t performance --serve-reports

# CI mode (optimized for continuous integration)
./frontend/scripts/test-docker.sh --ci
```

#### 3. View Logs and Debug
```bash
# View all service logs
./frontend/scripts/test-docker.sh --logs

# View specific service logs
./frontend/scripts/test-docker.sh --logs backend-test

# View container status
./frontend/scripts/test-docker.sh --ps
```

#### 4. Cleanup
```bash
# Clean up containers after tests
./frontend/scripts/test-docker.sh --cleanup-success

# Full cleanup including volumes
./frontend/scripts/test-docker.sh --clean-all
```

## Test Structure

### 1. Voice Chat E2E Tests

Located in `frontend/e2e/voice-chat/`:

- **voice-chat-flow.spec.ts**: Complete voice conversation workflows
- **voice-permissions.spec.ts**: Microphone permission handling
- **voice-activity-detection.spec.ts**: Voice activity detection testing
- **voice-error-recovery.spec.ts**: Error scenarios and recovery
- **voice-memory-persistence.spec.ts**: Conversation memory testing
- **voice-mobile.spec.ts**: Mobile device compatibility

### 2. Integration Tests

Located in `frontend/lib/__tests__/`:

- **audio-integration.test.ts**: Audio pipeline integration
- **voice-chat-integration.test.ts**: Voice chat component integration
- **sei-voice-integration.test.ts**: Sei blockchain integration

### 3. Property-Based Tests

Located in `frontend/lib/__tests__/`:

- **voice-chat-properties.test.ts**: Voice chat invariants
- **voice-state-properties.test.ts**: State management properties
- **voice-flow-properties.test.ts**: End-to-end flow properties

## Test Data and Fixtures

### Database Test Data
- **Test Users**: 3 users with different wallet types
- **Chat Sessions**: Multiple voice chat sessions
- **AI Memory**: Conversation context and preferences
- **Load Test Data**: 100 users, 500 sessions for performance testing

### Audio Samples
- **User Samples**: Greeting, portfolio queries, questions
- **Assistant Samples**: Welcome messages, responses
- **Quality Tests**: Low, medium, high bitrate samples
- **Noise Samples**: Background noise simulation

### Mock Data
- **Portfolio Data**: Realistic holdings and balances
- **Market Data**: Time-series price data
- **DeFi Opportunities**: Lending and liquidity options

## Performance Expectations

### Response Times
- **Voice Processing**: < 50ms latency
- **Database Queries**: < 10ms average
- **API Responses**: < 100ms average
- **E2E Test Suite**: < 10 minutes total

### Resource Usage
- **Memory**: ~2GB total for all containers
- **CPU**: ~20% utilization during tests
- **Storage**: ~1GB for test data and artifacts

## Troubleshooting

### Common Issues

1. **Docker Not Running**
   ```bash
   # Start Docker Desktop or Docker service
   sudo systemctl start docker  # Linux
   open -a Docker            # macOS
   ```

2. **Port Conflicts**
   ```bash
   # Check port usage
   netstat -tulpn | grep :3333
   
   # Kill conflicting processes
   sudo kill -9 <PID>
   ```

3. **Memory Issues**
   ```bash
   # Free up memory
   docker system prune -f
   
   # Increase Docker memory limit
   # Docker Desktop > Settings > Resources > Memory
   ```

4. **Build Failures**
   ```bash
   # Clean build cache
   docker builder prune -f
   
   # Rebuild with no cache
   docker-compose -f docker-compose.test.yml build --no-cache
   ```

### Debug Commands

```bash
# Container logs
docker-compose -f docker-compose.test.yml logs -f <service-name>

# Service health
docker-compose -f docker-compose.test.yml ps

# Container shell access
docker-compose -f docker-compose.test.yml exec <service-name> /bin/sh

# Network inspection
docker network ls
docker network inspect seiron_test-network
```

## Continuous Integration

### CI Configuration

The test suite supports CI environments with optimized settings:

```bash
# CI mode
./frontend/scripts/test-docker.sh --ci

# Environment variables
export CI=true
export CI_PARALLEL_JOBS=2
export CI_TEST_TIMEOUT=180000
export CI_MEMORY_LIMIT=1G
```

### Expected CI Runtime
- **Unit Tests**: 2-3 minutes
- **Integration Tests**: 3-5 minutes
- **E2E Tests**: 5-8 minutes
- **Performance Tests**: 3-5 minutes
- **Total**: 15-20 minutes

## Test Reports

### Generated Reports
- **HTML Reports**: Test results with screenshots
- **JSON Reports**: Machine-readable test data
- **Coverage Reports**: Code coverage analysis
- **Performance Reports**: Benchmark results

### Viewing Reports
```bash
# Serve reports locally
./frontend/scripts/test-docker.sh --serve-reports

# Reports available at: http://localhost:8080
```

## Contributing

### Adding New Tests

1. **Voice Tests**: Add to `frontend/e2e/voice-chat/`
2. **Integration Tests**: Add to `frontend/lib/__tests__/`
3. **Mock Data**: Update mock services in `docker/test/`
4. **Test Fixtures**: Add to `frontend/e2e/fixtures/`

### Test Best Practices

1. **Use Page Objects**: For consistent UI interactions
2. **Mock External Services**: Use provided mock services
3. **Test Isolation**: Each test should be independent
4. **Descriptive Names**: Clear test descriptions
5. **Cleanup**: Proper test cleanup and resource management

## Additional Resources

### Documentation
- **Voice Chat Implementation**: `/comms.md`
- **API Documentation**: `/docs/api/`
- **Architecture Guide**: `/docs/architecture/`

### Tools
- **Playwright**: E2E testing framework
- **Jest**: Unit testing framework
- **Docker**: Container orchestration
- **MockServer**: API mocking

### Support
- **Issues**: Report issues in project repository
- **Logs**: Check container logs for debugging
- **Performance**: Monitor resource usage during tests

---

## Summary

This comprehensive testing infrastructure provides:
- **Complete Voice Chat Testing**: End-to-end voice conversation workflows
- **Mock Services**: Realistic API responses for isolated testing
- **Performance Testing**: Load testing and benchmarking
- **CI/CD Ready**: Optimized for continuous integration
- **Detailed Reporting**: Comprehensive test results and coverage

The test suite ensures the voice chat functionality works correctly across all browsers, devices, and network conditions while maintaining performance and reliability standards.