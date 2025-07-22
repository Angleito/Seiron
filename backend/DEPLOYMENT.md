# Railway Deployment Guide for Seiron Backend API

## Overview

This guide covers the complete Railway deployment process for the Seiron Backend API, including setup, configuration, security practices, and monitoring.

## Prerequisites

### Required Tools
- [Railway CLI](https://docs.railway.app/develop/cli) installed globally
- Node.js 20+ and npm
- Git
- Docker (optional, for local testing)

### Railway Account Setup
1. Create a Railway account at [railway.app](https://railway.app)
2. Install Railway CLI: `npm install -g @railway/cli`
3. Login: `railway login`

## Quick Deployment

### 1. Initial Setup
```bash
# Clone and navigate to backend directory
cd /path/to/seiron/backend

# Install dependencies
npm install

# Validate deployment readiness
npm run validate:deployment
```

### 2. Railway Project Setup
```bash
# Create new Railway project (or use existing)
railway login
railway init

# Link to existing project (if you have one)
# railway link [project-id]
```

### 3. Environment Configuration
```bash
# Copy the environment template
cp .env.railway.template .env.railway.local

# Edit the file with your actual values
# Replace all placeholder values with real configuration
```

### 4. Deploy
```bash
# Quick deployment
npm run deploy:railway

# Or deploy with custom options
npm run deploy:railway:skip-tests      # Skip tests
npm run deploy:railway:auto-rollback   # Auto-rollback on failure
```

## Detailed Configuration

### Environment Variables Setup

#### Core Variables (Required)
```bash
# Set in Railway dashboard or via CLI
railway variables set NODE_ENV=production
railway variables set SERVICE_NAME=seiron-backend
railway variables set SERVICE_VERSION=1.0.0
```

#### Database Configuration
```bash
# PostgreSQL (use Railway's PostgreSQL service)
railway add postgresql
railway variables set DATABASE_URL=${{ Postgres.DATABASE_URL }}
```

#### Cache Configuration  
```bash
# Redis (use Railway's Redis service)
railway add redis
railway variables set REDIS_URL=${{ Redis.REDIS_URL }}
```

#### API Keys and Secrets
```bash
# Store sensitive data in Railway secrets
railway variables set OPENAI_API_KEY=your_openai_key
railway variables set JWT_SECRET=your_jwt_secret
railway variables set SUPABASE_SERVICE_ROLE_KEY=your_supabase_key
```

#### External Service URLs
```bash
# Frontend and callback URLs
railway variables set FRONTEND_URL=https://your-frontend.railway.app
railway variables set WEBHOOK_URL=https://${{ RAILWAY_PUBLIC_DOMAIN }}
```

### Security Configuration

#### CORS Setup
```bash
railway variables set CORS_ORIGIN=https://your-frontend.railway.app
railway variables set CORS_CREDENTIALS=true
```

#### Rate Limiting
```bash
railway variables set RATE_LIMIT_ENABLED=true
railway variables set RATE_LIMIT_MAX_REQUESTS=100
railway variables set RATE_LIMIT_WINDOW_MS=900000
```

#### Security Headers
```bash
railway variables set HELMET_ENABLED=true
railway variables set HELMET_CSP_ENABLED=true
```

## Service Dependencies

### Required Railway Services

#### 1. PostgreSQL Database
```bash
railway add postgresql
```

#### 2. Redis Cache
```bash
railway add redis
```

#### 3. Environment Variables
Ensure all variables from `.env.railway.template` are configured.

### External Dependencies

#### 1. MCP Servers
Deploy the three MCP servers separately:
- `hive-intelligence`: Market data and sentiment analysis
- `sei-blockchain`: Blockchain operations
- `portfolio-manager`: Portfolio analytics

#### 2. Frontend Application
Deploy the Next.js frontend and configure CORS accordingly.

## Health Checks and Monitoring

### Health Check Endpoints
- `/health` - Comprehensive system health with dependency checks
- `/ready` - Simple readiness probe for Railway
- `/alive` - Basic liveness probe
- `/metrics` - System metrics and performance data

### Railway Health Check Configuration
The `railway.toml` includes:
```toml
[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 30
healthcheckInterval = 10
```

### Monitoring and Logging
```bash
# View logs
npm run logs:railway

# Follow logs in real-time
npm run logs:railway:follow

# Check service status
npm run railway:status

# Open service in browser
npm run railway:open
```

## Deployment Scripts

### Available Scripts
- `npm run deploy:railway` - Full deployment with validation
- `npm run deploy:railway:skip-tests` - Deploy without running tests
- `npm run deploy:railway:auto-rollback` - Auto-rollback on failure
- `npm run validate:deployment` - Pre-deployment validation
- `npm run health:check` - Test health endpoints locally

### Manual Deployment
```bash
# Build and validate
npm run build:railway

# Deploy via Railway CLI
railway up --detach
```

## Troubleshooting

### Common Issues

#### 1. Build Failures
```bash
# Check TypeScript compilation
npm run type-check

# Validate deployment configuration
npm run validate:deployment

# Check build logs
railway logs --deployment [deployment-id]
```

#### 2. Health Check Failures
```bash
# Test health endpoint locally
npm run health:check

# Check service dependencies
railway logs | grep -E "(ERROR|WARN)"
```

#### 3. Environment Variable Issues
```bash
# List all variables
railway variables

# Set missing variables
railway variables set VARIABLE_NAME=value
```

#### 4. Port Configuration Issues
Ensure `PORT` is set to Railway's provided port:
```bash
railway variables set PORT=${{ RAILWAY_PORT }}
```

### Debug Mode
```bash
# Enable debug logging
railway variables set LOG_LEVEL=debug

# Enable additional debugging
railway variables set DEBUG_ENABLED=true
```

## Security Best Practices

### 1. Environment Variables
- Never commit `.env` files to version control
- Use Railway's secrets for sensitive data
- Rotate API keys regularly

### 2. CORS Configuration
- Whitelist only trusted domains
- Use specific origins instead of wildcards
- Enable credentials only when necessary

### 3. Rate Limiting
- Configure appropriate limits for each endpoint type
- Monitor rate limit violations
- Implement IP-based blocking for abuse

### 4. Security Headers
- Enable all Helmet security headers
- Configure CSP for your specific use case
- Use HTTPS only in production

### 5. Input Validation
- Validate all input data
- Sanitize user inputs
- Use parameterized queries for database operations

## Performance Optimization

### 1. Resource Limits
```toml
[deploy.resources]
memoryLimit = "1Gi"
cpuLimit = "1000m"
```

### 2. Node.js Optimization
```bash
railway variables set NODE_OPTIONS="--max-old-space-size=512 --enable-source-maps"
```

### 3. Caching Strategy
- Use Redis for session and data caching
- Implement HTTP caching headers
- Cache expensive computations

### 4. Database Optimization
- Use connection pooling
- Optimize database queries
- Monitor slow queries

## Backup and Recovery

### Database Backups
Railway automatically backs up PostgreSQL databases.

### Application State
- Store critical state in PostgreSQL/Redis
- Avoid storing state in memory only
- Use Railway's volume persistence if needed

### Disaster Recovery
- Document rollback procedures
- Test recovery processes
- Monitor deployment health

## Scaling and High Availability

### Horizontal Scaling
```toml
[deploy]
numReplicas = 3  # Scale based on load
```

### Load Balancing
Railway automatically load balances between replicas.

### Database Scaling
Consider Railway's PostgreSQL scaling options for high-load scenarios.

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Deploy to Railway
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run validate:deployment
      - run: npm run build
      - uses: railway/cli@v3
        with:
          railway-token: ${{ secrets.RAILWAY_TOKEN }}
        run: railway up --detach
```

## Support and Maintenance

### Regular Tasks
- Monitor application logs
- Update dependencies regularly
- Review security configurations
- Monitor performance metrics

### Railway CLI Commands
```bash
# Project management
railway status              # Check service status
railway logs                # View logs
railway open                # Open service in browser
railway variables           # Manage environment variables
railway rollback            # Rollback to previous deployment

# Debugging
railway logs --deployment [id]  # Specific deployment logs
railway shell               # Access service shell
railway connect             # Connect to databases
```

### Getting Help
- Railway Documentation: https://docs.railway.app/
- Railway Discord: https://discord.gg/railway
- Seiron Team Support: (internal channels)

## Security Checklist

Before going to production, ensure:

- [ ] All environment variables are configured
- [ ] Secrets are stored securely (not in plain text)
- [ ] CORS is configured for specific domains
- [ ] Rate limiting is enabled
- [ ] Security headers are configured
- [ ] Health checks are working
- [ ] SSL/TLS is enabled (Railway handles this)
- [ ] Database connections are secure
- [ ] API keys are rotated regularly
- [ ] Input validation is implemented
- [ ] Error messages don't leak sensitive information
- [ ] Logging doesn't include sensitive data
- [ ] Dependencies are updated and secure

---

## Next Steps

1. Deploy MCP servers following similar patterns
2. Configure frontend CORS settings
3. Set up monitoring and alerting
4. Implement automated backups
5. Plan scaling strategy
6. Document operational procedures

For additional support, consult the Railway documentation or reach out to the development team.