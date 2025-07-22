# Comprehensive Testing and Validation Guide

This guide provides step-by-step instructions for testing and validating the secure backend flow, deployment readiness, and security configuration for the Seiron backend.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Testing](#local-development-testing)
3. [Security Validation](#security-validation)
4. [Railway Deployment Testing](#railway-deployment-testing)
5. [Performance and Load Testing](#performance-and-load-testing)
6. [Security Checklist](#security-checklist)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Environment Variables

Before running any tests, ensure the following environment variables are configured:

```bash
# Core Configuration
NODE_ENV=development|production
PORT=3001
FRONTEND_URL=http://localhost:3000

# Authentication & Security
JWT_SECRET=your-jwt-secret-here
INTERNAL_API_KEY=your-internal-api-key
MCP_API_KEY=mcp_your-mcp-api-key

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-key-here

# Database Configuration
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional Services
REDIS_URL=redis://localhost:6379
SEI_RPC_URL=https://rpc.sei-apis.com
SEI_EVM_RPC_URL=https://evm-rpc.sei-apis.com
MCP_ENDPOINT=ws://localhost:3003

# Testing Configuration
TEST_API_KEY=test-api-key-for-testing
RUN_LOAD_TESTS=false
```

### Test Dependencies

Install test dependencies:

```bash
npm install --dev
```

## Local Development Testing

### 1. Unit Tests

Run all unit tests to verify individual components:

```bash
# Run all unit tests
npm run test:unit

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test -- --testPathPattern=security
npm run test -- --testPathPattern=orchestration
```

### 2. API Endpoint Testing

Test API endpoints and security middleware:

```bash
# Start the server in test mode
NODE_ENV=test npm run dev

# In another terminal, run API tests
npm run test -- src/__tests__/e2e/api-endpoints.test.ts

# Test specific endpoints manually
curl -X GET http://localhost:3001/health
curl -X GET http://localhost:3001/metrics
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "0x1234567890123456789012345678901234567890"}'
```

### 3. Security Validation Tests

Run security-specific tests:

```bash
# Test security middleware
npm run test -- src/__tests__/security/middleware-validation.test.ts

# Validate security configuration
npm run validate:security

# Test API key validation
curl -X GET http://localhost:3001/api/security/audit \
  -H "x-api-key: invalid-key"  # Should return 401

curl -X GET http://localhost:3001/api/security/audit \
  -H "x-api-key: $TEST_API_KEY"  # Should return 200
```

### 4. OpenAI Orchestration Testing

Test that OpenAI communication is secure:

```bash
# Run OpenAI security tests
npm run test -- src/__tests__/orchestration/openai-security.test.ts

# Test orchestration endpoint with valid auth
curl -X POST http://localhost:3001/api/chat/orchestrate \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Analyze my portfolio",
    "walletAddress": "0x1234567890123456789012345678901234567890"
  }'
```

### 5. Integration Tests

Test service integration:

```bash
# Run integration tests
npm run test:integration

# Test Supabase integration
npm run test:supabase

# Test with Docker
npm run docker:test
```

## Security Validation

### 1. Authentication Flow Testing

#### JWT Token Validation
```bash
# Generate a valid JWT token for testing
node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { walletAddress: '0x1234567890123456789012345678901234567890' },
  process.env.JWT_SECRET || 'test-secret',
  { expiresIn: '1h' }
);
console.log('Valid JWT:', token);
"

# Test with valid token
export JWT_TOKEN="your-generated-token"
curl -X GET http://localhost:3001/api/portfolio \
  -H "Authorization: Bearer $JWT_TOKEN"

# Test with invalid token
curl -X GET http://localhost:3001/api/portfolio \
  -H "Authorization: Bearer invalid-token"
```

#### API Key Validation
```bash
# Test API key formats
curl -X GET http://localhost:3001/api/security/audit \
  -H "x-api-key: invalid-format"  # Should fail

curl -X GET http://localhost:3001/api/security/audit \
  -H "x-api-key: $INTERNAL_API_KEY"  # Should succeed
```

### 2. Rate Limiting Tests

```bash
# Test auth endpoint rate limiting
for i in {1..15}; do
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"walletAddress": "0x1234567890123456789012345678901234567890"}' &
done
wait

# Test AI endpoint rate limiting
for i in {1..25}; do
  curl -X POST http://localhost:3001/api/chat/orchestrate \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"message": "test", "walletAddress": "0x1234567890123456789012345678901234567890"}' &
done
wait
```

### 3. Input Sanitization Tests

```bash
# Test XSS protection
curl -X POST http://localhost:3001/api/chat/orchestrate \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "<script>alert(\"xss\")</script>",
    "walletAddress": "0x1234567890123456789012345678901234567890"
  }'

# Test SQL injection protection
curl -X POST http://localhost:3001/api/chat/orchestrate \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "\"; DROP TABLE users; --",
    "walletAddress": "0x1234567890123456789012345678901234567890"
  }'
```

## Railway Deployment Testing

### 1. Environment Configuration Validation

Before deploying to Railway, validate the configuration:

```bash
# Validate deployment configuration
npm run validate:deployment

# Check Railway environment variables
railway variables

# Test Railway health checks locally
NODE_ENV=production npm run start:prod
```

### 2. Production Environment Tests

```bash
# Run Railway deployment tests
npm run test -- src/__tests__/integration/railway-deployment.test.ts

# Test production security configuration
NODE_ENV=production npm run validate:security

# Verify Railway-specific environment variables
node -e "
console.log('Railway Environment:', process.env.RAILWAY_ENVIRONMENT_NAME);
console.log('Railway Service:', process.env.RAILWAY_SERVICE_NAME);
console.log('Railway Domain:', process.env.RAILWAY_PUBLIC_DOMAIN);
"
```

### 3. Live Deployment Testing

After deploying to Railway:

```bash
# Get Railway deployment URL
export RAILWAY_URL=$(railway status --json | jq -r '.deployments[0].url')

# Test health endpoints
curl -X GET $RAILWAY_URL/health
curl -X GET $RAILWAY_URL/ready
curl -X GET $RAILWAY_URL/alive
curl -X GET $RAILWAY_URL/metrics

# Test security headers
curl -I $RAILWAY_URL/health

# Test HTTPS enforcement
curl -X GET http://your-railway-domain.railway.app/health  # Should redirect to HTTPS
```

### 4. Database and Service Connectivity

```bash
# Test Supabase connection
curl -X GET $RAILWAY_URL/api/security/health

# Test MCP server connectivity (if deployed)
curl -X GET $RAILWAY_URL/api/mcp \
  -H "x-mcp-key: $MCP_API_KEY"

# Monitor Railway logs
railway logs -f
```

## Performance and Load Testing

### 1. Basic Performance Tests

```bash
# Run performance tests
npm run test -- src/__tests__/performance/load-testing.test.ts

# Enable load testing
RUN_LOAD_TESTS=true npm run test -- --testNamePattern="Load Testing"
```

### 2. Stress Testing with External Tools

#### Using Artillery (install with `npm install -g artillery`)

Create `load-test.yml`:
```yaml
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 10
  defaults:
    headers:
      Authorization: 'Bearer your-jwt-token'

scenarios:
  - name: 'Health check load'
    requests:
      - get:
          url: '/health'
  - name: 'API endpoint load'
    requests:
      - get:
          url: '/api/portfolio'
```

Run load test:
```bash
artillery run load-test.yml
```

#### Using Apache Bench
```bash
# Test health endpoint
ab -n 1000 -c 10 http://localhost:3001/health

# Test with authentication
ab -n 100 -c 5 -H "Authorization: Bearer your-jwt-token" \
   http://localhost:3001/api/portfolio
```

### 3. Memory and Resource Monitoring

```bash
# Monitor memory usage during tests
node --expose-gc -e "
const http = require('http');
setInterval(() => {
  if (global.gc) global.gc();
  const mem = process.memoryUsage();
  console.log(\`Memory: \${Math.round(mem.heapUsed/1024/1024)}MB heap, \${Math.round(mem.rss/1024/1024)}MB RSS\`);
}, 5000);

// Keep process alive
http.createServer((req, res) => res.end('OK')).listen(8000);
"
```

## Security Checklist

### ✅ Pre-Deployment Security Checklist

- [ ] All environment variables are properly configured
- [ ] API keys follow correct format (OpenAI: `sk-*`, MCP: `mcp_*`)
- [ ] JWT_SECRET is at least 32 characters long
- [ ] HTTPS is enforced in production
- [ ] CORS is configured for production domains only
- [ ] Rate limiting is enabled for all endpoints
- [ ] Input sanitization is working
- [ ] SQL injection protection is active
- [ ] XSS protection is enabled
- [ ] API keys are not exposed in responses
- [ ] Error messages don't leak sensitive information
- [ ] Authentication is required for protected routes
- [ ] MCP communication uses proper authentication
- [ ] OpenAI API calls are backend-only
- [ ] Security headers are present
- [ ] Request/response logging excludes sensitive data
- [ ] Health checks work correctly
- [ ] Database connections are secure
- [ ] Redis connections are secure (if used)

### ✅ Runtime Security Validation

Run these commands to verify security in production:

```bash
# 1. Test security headers
curl -I https://your-domain.railway.app/health

# 2. Verify no sensitive data in responses
curl https://your-domain.railway.app/health | grep -i "api\|key\|secret\|password"

# 3. Test authentication enforcement
curl https://your-domain.railway.app/api/portfolio  # Should return 401

# 4. Test rate limiting
for i in {1..20}; do curl https://your-domain.railway.app/api/auth/login -d '{}' & done

# 5. Test input sanitization
curl -X POST https://your-domain.railway.app/api/chat/orchestrate \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"message":"<script>alert(1)</script>","walletAddress":"0x123"}'

# 6. Verify HTTPS redirect
curl -I http://your-domain.railway.app/health

# 7. Test CORS policy
curl -H "Origin: https://malicious-site.com" https://your-domain.railway.app/api/portfolio
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Test Failures Due to Missing Environment Variables
```bash
# Solution: Create .env.test file
cp .env.example .env.test
# Edit .env.test with test values
```

#### 2. Rate Limiting Interfering with Tests
```bash
# Solution: Temporarily disable rate limiting for tests
NODE_ENV=test npm run test
```

#### 3. Database Connection Errors
```bash
# Check Supabase configuration
curl -X GET "https://your-supabase-url.supabase.co/rest/v1/" \
  -H "apikey: your-anon-key"

# Test connection from code
npm run test:supabase
```

#### 4. OpenAI API Errors
```bash
# Verify API key format
echo $OPENAI_API_KEY | grep -E '^sk-[A-Za-z0-9]{48,}$'

# Test API key validity
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

#### 5. Railway Deployment Issues
```bash
# Check Railway status
railway status

# View deployment logs
railway logs

# Restart service
railway service restart
```

#### 6. Memory or Performance Issues
```bash
# Profile memory usage
node --inspect src/server.ts
# Open chrome://inspect in Chrome

# Check for memory leaks
npm run test -- --detect-leaks
```

### Debug Mode Testing

Enable debug mode for detailed logging:

```bash
# Enable debug logging
DEBUG=* NODE_ENV=development npm run dev

# Test with verbose logging
LOG_LEVEL=debug npm run test
```

### Health Check Verification

Use this script to continuously monitor health:

```bash
#!/bin/bash
# health-monitor.sh
URL=${1:-http://localhost:3001}
while true; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" $URL/health)
  if [ $STATUS -eq 200 ]; then
    echo "$(date): Health check OK ($STATUS)"
  else
    echo "$(date): Health check FAILED ($STATUS)"
  fi
  sleep 30
done
```

Run with:
```bash
chmod +x health-monitor.sh
./health-monitor.sh https://your-domain.railway.app
```

## Continuous Testing

Set up continuous testing with GitHub Actions by adding `.github/workflows/test.yml`:

```yaml
name: Comprehensive Testing
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run validate:security
      - run: npm run test:coverage
```

This guide ensures comprehensive testing of the secure backend flow, proper deployment validation, and security verification for production readiness.