# API Integration Tests

Comprehensive integration tests for API connectivity, MCP server integration, and performance benchmarking.

## Overview

These tests validate:
- API endpoint connectivity and health
- OpenAI and Anthropic API integration
- MCP server connectivity and functionality
- Authentication and middleware behavior
- Rate limiting and security features
- Streaming response handling
- Performance metrics and benchmarks

## Prerequisites

1. **Environment Setup**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Configure required variables:
   OPENAI_API_KEY=your_openai_key
   ANTHROPIC_API_KEY=your_anthropic_key
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
   JWT_SECRET=your_jwt_secret
   ```

2. **Start Services**
   ```bash
   # Start API server
   npm run dev
   
   # Start MCP servers (optional)
   ./start-mcp-servers.sh
   ```

## Running Tests

### Install Dependencies
```bash
cd test/api-integration
npm install
```

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Environment validation
npm run test:env

# Health check tests
npm run test:health

# Chat endpoint tests
npm run test:chat

# MCP connectivity tests
npm run test:mcp

# Authentication/middleware tests
npm run test:auth

# Streaming response tests
npm run test:streaming

# Performance benchmarks
npm run test:performance
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

## Test Suites

### 1. Environment Validation (`env-validation.test.ts`)
- Validates all required environment variables
- Checks API key formats
- Verifies security configurations
- Reports missing or misconfigured variables

### 2. Health Check (`health-check.test.ts`)
- Tests `/api/health` endpoint
- Validates response format and headers
- Checks CORS configuration
- Tests concurrent request handling

### 3. Chat Endpoint (`chat-endpoint.test.ts`)
- Tests chat functionality with real AI APIs
- Validates streaming and non-streaming responses
- Tests MCP context integration
- Verifies rate limiting behavior
- Tests error handling and validation

### 4. MCP Connectivity (`mcp-connectivity.test.ts`)
- Tests direct MCP server connections
- Validates available tools from each server
- Tests MCP query execution
- Checks failover and resilience

### 5. Authentication & Middleware (`auth-middleware.test.ts`)
- Tests JWT authentication
- Validates rate limiting behavior
- Tests CSRF protection
- Verifies input sanitization
- Tests session management

### 6. Streaming Responses (`streaming-response.test.ts`)
- Tests Server-Sent Events (SSE)
- Validates streaming format and performance
- Tests concurrent streaming
- Checks memory efficiency
- Tests error handling in streams

### 7. Performance Benchmarks (`performance-benchmark.test.ts`)
- Measures response time metrics
- Tests concurrent request performance
- Validates performance thresholds
- Monitors resource usage
- Generates performance reports

## Test Configuration

### Timeouts
- Default test timeout: 30 seconds
- Adjustable per test with `jest.setTimeout()`

### Rate Limiting
Tests respect API rate limits:
- Delays between requests
- Handles 429 responses gracefully
- Tests both authenticated and public limits

### Environment Variables
Tests adapt based on available services:
- Skip MCP tests if servers not running
- Warn about missing API keys
- Use defaults for optional configs

## CI/CD Integration

For continuous integration:
```bash
npm run test:ci
```

This runs tests with:
- Coverage reporting
- CI-optimized output
- Limited parallelization
- Fail-fast on critical tests

## Troubleshooting

### Common Issues

1. **API Server Not Running**
   ```
   ❌ API server is not accessible
   ```
   Solution: Start the API server with `npm run dev`

2. **Missing Environment Variables**
   ```
   ⚠️  Missing environment variables: OPENAI_API_KEY
   ```
   Solution: Configure required variables in `.env`

3. **Rate Limiting**
   ```
   Error 429: Too Many Requests
   ```
   Solution: Tests handle this automatically with retries

4. **MCP Servers Unavailable**
   ```
   ⚠️  sei-blockchain server not running
   ```
   Solution: Optional - start MCP servers or tests will skip

### Debug Mode

Enable detailed logging:
```bash
DEBUG=api:* npm test
```

## Best Practices

1. **API Usage**
   - Tests use minimal tokens to reduce costs
   - Rate limiting prevents excessive requests
   - Concurrent tests are limited

2. **Test Isolation**
   - Each test uses unique session IDs
   - Tests clean up after themselves
   - No shared state between tests

3. **Performance**
   - Tests run in parallel where safe
   - Reuse API client instances
   - Cache environment checks

## Adding New Tests

1. Create test file: `new-feature.test.ts`
2. Follow existing test patterns
3. Add to test runner configuration
4. Update this README

## Monitoring Test Health

Check test trends:
- Review `test-results/api-integration/` for reports
- Monitor performance degradation
- Track flaky test patterns
- Analyze coverage gaps