# Security Implementation Guide

This document describes the comprehensive API key validation and security system implemented in the Seiron backend.

## Overview

The security system provides:
- ✅ **API Key Validation** - Comprehensive validation with rotation and audit capabilities
- ✅ **Environment Variable Validation** - Startup checks for all required API keys
- ✅ **MCP Server Authentication** - Internal communications security
- ✅ **Security Audit Logging** - Comprehensive event tracking and monitoring
- ✅ **Smart Rate Limiting** - API key-aware rate limiting with burst protection
- ✅ **Error Handling** - Production-ready error handling for security events

## Architecture

### Core Services

#### 1. ApiKeyValidationService (`src/services/ApiKeyValidationService.ts`)
Provides comprehensive API key validation, rotation, and security auditing.

**Features:**
- Secure key storage with hashing
- Rate limiting per API key
- Key rotation capabilities
- Usage analytics
- Security audit integration

**Usage:**
```typescript
import { apiKeyValidationService } from '../services/ApiKeyValidationService';

const result = await apiKeyValidationService.validateKey(
  apiKey,
  ['required', 'scopes'],
  { ip: req.ip, userAgent: req.get('User-Agent') }
);
```

#### 2. SecurityAuditService (`src/services/SecurityAuditService.ts`)
Comprehensive security event logging and monitoring system.

**Features:**
- Real-time security event logging
- Automated alert system
- Security metrics and reporting
- Suspicious activity detection

**Usage:**
```typescript
import { securityAuditService } from '../services/SecurityAuditService';

securityAuditService.logApiKeyEvent(
  success,
  keyName,
  req.ip,
  req.get('User-Agent'),
  reason
);
```

### Middleware

#### 1. API Key Rate Limiting (`src/middleware/apiKeyRateLimit.ts`)
Smart rate limiting that adapts based on API key type and usage patterns.

**Features:**
- API key-aware rate limiting
- Burst protection
- Adaptive limits based on key type
- Request pattern analysis

#### 2. MCP Authentication (`src/middleware/mcpAuthentication.ts`)
Secure authentication for internal MCP server communications.

**Features:**
- MCP server identification
- Permission-based access control
- Session tracking
- Rate limiting per server

#### 3. API Key Error Handling (`src/middleware/apiKeyErrorHandler.ts`)
Comprehensive error handling for API key-related errors.

**Features:**
- Standardized error responses
- Security event logging
- Correlation ID tracking
- Documentation links

## Configuration

### Required Environment Variables

#### Production Requirements
```bash
# Core API Keys
OPENAI_API_KEY=sk-...           # OpenAI API access
SUPABASE_URL=https://...        # Supabase database URL
SUPABASE_ANON_KEY=eyJ...        # Supabase anonymous key
SUPABASE_SERVICE_ROLE_KEY=eyJ...# Supabase service role key

# Security
INTERNAL_API_KEY=...            # Internal service authentication
JWT_SECRET=...                  # JWT token signing secret

# Optional but Recommended
MCP_API_KEY=...                 # MCP server authentication
HIVE_API_KEY=...               # Hive Intelligence API
REDIS_URL=redis://...          # Redis for enhanced security features
```

#### Development Settings
```bash
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Optional Development Keys
MCP_API_KEY=dev-key
INTERNAL_API_KEY=dev-internal-key
```

### Security Levels

The system automatically adjusts security based on the environment:

- **Development**: Relaxed validation, optional keys, detailed error messages
- **Staging**: Moderate validation, required keys, limited error details
- **Production**: Strict validation, all keys required, minimal error disclosure

## API Key Types and Scopes

### Internal API Keys

#### 1. OpenAI API Key
- **Scopes**: `ai_processing`, `chat`
- **Rate Limit**: 1000 requests/hour
- **Required**: Yes
- **Format**: `sk-[a-zA-Z0-9]{48,}`

#### 2. MCP Server API Key
- **Scopes**: `mcp_communication`, `portfolio_data`, `blockchain_operations`
- **Rate Limit**: 5000 requests/hour
- **Required**: No (optional)
- **Format**: 32+ character string

#### 3. Internal Service API Key
- **Scopes**: `internal_operations`, `health_checks`, `admin`
- **Rate Limit**: 10000 requests/hour
- **Required**: Yes (production)
- **Format**: 32+ character string

### MCP Server Keys

#### 1. Hive Intelligence
- **Scopes**: `market_data`, `sentiment_analysis`, `price_predictions`
- **Rate Limit**: 1000 requests/hour

#### 2. Sei Blockchain
- **Scopes**: `blockchain_operations`, `wallet_queries`, `defi_interactions`
- **Rate Limit**: 500 requests/hour

#### 3. Portfolio Manager
- **Scopes**: `portfolio_analytics`, `risk_assessment`, `optimization_strategies`
- **Rate Limit**: 800 requests/hour

## Rate Limiting

### Smart Rate Limiting

The system provides intelligent rate limiting that adapts to:
- API key type (internal vs external)
- Endpoint type (health checks vs AI processing)
- Historical usage patterns
- Security events

```typescript
// Pre-configured rate limits
app.use('/api/auth', rateLimitMiddleware.auth);      // 10 requests/15min
app.use('/api/chat', rateLimitMiddleware.ai);        // 100 requests/10min
app.use('/api/portfolio', rateLimitMiddleware.portfolio); // 500 requests/15min
```

### Burst Protection

Automatic detection and prevention of burst traffic patterns:
- **Burst Limit**: 20 requests/minute
- **Action**: Temporary rate limit reduction
- **Recovery**: Automatic after burst window expires

## Security Monitoring

### Event Types

The system monitors and logs the following security events:

- `authentication_success/failure`
- `api_key_validation_success/failure`
- `rate_limit_exceeded`
- `unauthorized_access_attempt`
- `mcp_authentication_success/failure`
- `suspicious_activity`
- `security_violation`

### Automated Alerts

Configurable alerts trigger based on:
- Failed authentication attempts (5+ in 5 minutes)
- Invalid API key attempts (10+ in 10 minutes)
- Rate limit violations (20+ in 15 minutes)
- Suspicious activity patterns

### Security Dashboard

Access security metrics via the API:

```bash
GET /api/security/audit
Headers:
  X-API-Key: your-internal-api-key
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "metrics": {
    "totalEvents": 1234,
    "eventsByType": {...},
    "eventsBySeverity": {...},
    "recentAlerts": 2
  },
  "recentEvents": [...]
}
```

## Error Handling

### Error Types

The system provides standardized error responses:

```typescript
{
  "error": "API Key Error",
  "message": "Invalid API key",
  "code": "API_KEY_INVALID",
  "type": "INVALID_API_KEY",
  "statusCode": 401,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "correlationId": "apierr_1234567890_000001",
  "documentation": "/docs/api-keys#api_key_invalid"
}
```

### Error Codes

- `API_KEY_MISSING` (401) - No API key provided
- `API_KEY_INVALID` (401) - Invalid or malformed key
- `API_KEY_EXPIRED` (401) - Key has expired
- `API_KEY_INSUFFICIENT_PERMISSIONS` (403) - Missing required scopes
- `API_KEY_RATE_LIMIT_EXCEEDED` (429) - Rate limit exceeded
- `API_KEY_SUSPICIOUS_ACTIVITY` (403) - Suspicious usage detected

## Validation and Testing

### Security Validation Script

Run comprehensive security validation:

```bash
npm run validate:security
```

This script checks:
- ✅ Environment variable configuration
- ✅ API key format and strength
- ✅ Security middleware setup
- ✅ MCP server connectivity
- ✅ Rate limiting configuration
- ✅ Audit service functionality

### Testing

```bash
# Run security-focused tests
npm run test:security

# Run integration tests with security
npm run test:integration

# Run all tests with coverage
npm run test:coverage
```

## Deployment

### Railway Deployment

The security system is optimized for Railway deployment with:

- Environment variable validation at startup
- Automatic security configuration based on environment
- Health check endpoints for monitoring
- Graceful error handling and logging

### Security Checklist

Before deploying to production:

- [ ] All required environment variables configured
- [ ] API keys have sufficient entropy and strength
- [ ] Rate limiting configured appropriately
- [ ] Security audit service enabled
- [ ] Error handling tested
- [ ] Security validation script passes
- [ ] Monitoring and alerting configured

## Best Practices

### API Key Management

1. **Rotation**: Regularly rotate API keys using the built-in rotation system
2. **Scoping**: Use minimal required scopes for each API key
3. **Storage**: Never store API keys in code or logs
4. **Monitoring**: Monitor API key usage patterns for anomalies

### Rate Limiting

1. **Tiered Limits**: Different limits for different endpoint types
2. **Burst Protection**: Enable burst protection for all endpoints
3. **Monitoring**: Monitor rate limit metrics and adjust as needed
4. **Graceful Degradation**: Provide helpful error messages when limits exceeded

### Security Monitoring

1. **Real-time Alerts**: Configure alerts for critical security events
2. **Regular Audits**: Review security logs regularly
3. **Metrics Dashboard**: Monitor security metrics and trends
4. **Incident Response**: Have procedures for responding to security events

## Troubleshooting

### Common Issues

#### "API key validation failed"
- Check that the API key is properly formatted
- Verify the key has required scopes
- Check rate limiting status

#### "Rate limit exceeded"
- Review rate limiting configuration
- Check for burst traffic patterns
- Consider increasing limits for legitimate use cases

#### "MCP authentication failed"
- Verify MCP server configuration
- Check API key configuration for MCP servers
- Review server ID and permissions

### Debugging

Enable detailed security logging:

```bash
LOG_LEVEL=debug npm run dev
```

View security audit events:

```bash
curl -H "X-API-Key: your-internal-api-key" \
     http://localhost:3001/api/security/audit
```

## Support

For security-related issues:

1. Check this documentation
2. Run the security validation script
3. Review security audit logs
4. Check the troubleshooting section
5. Contact the development team with correlation IDs for specific errors