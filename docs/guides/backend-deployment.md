# Deployment and Operations Guide

Complete guide for deploying and operating the Sei AI Portfolio Manager backend in production environments with functional programming best practices.

## Table of Contents

- [Production Setup](#production-setup)
- [Environment Configuration](#environment-configuration)
- [Docker Deployment](#docker-deployment)
- [Monitoring and Logging](#monitoring-and-logging)
- [Performance Optimization](#performance-optimization)
- [Security Hardening](#security-hardening)
- [Backup and Recovery](#backup-and-recovery)
- [Troubleshooting](#troubleshooting)

## Production Setup

### System Requirements

**Minimum Requirements:**
- CPU: 2 cores (4 recommended)
- RAM: 4GB (8GB recommended)
- Storage: 20GB SSD
- Network: 100Mbps

**Recommended Production Setup:**
- CPU: 4+ cores
- RAM: 16GB+
- Storage: 100GB+ NVMe SSD
- Network: 1Gbps
- Load balancer for high availability

### Dependencies

```bash
# Node.js 18+ LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Redis 6+
sudo apt-get install redis-server

# PM2 for process management
npm install -g pm2

# Optional: Docker & Docker Compose
sudo apt-get install docker.io docker-compose
```

## Environment Configuration

### Production Environment Variables

Create a comprehensive `.env.production` file:

```bash
# ============ Server Configuration ============
NODE_ENV=production
PORT=8000
HOST=0.0.0.0

# ============ Application Settings ============
FRONTEND_URL=https://yourdomain.com
API_BASE_URL=https://api.yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# ============ Security ============
JWT_SECRET=your-super-secure-jwt-secret-here
ENCRYPTION_KEY=your-32-byte-encryption-key-here
SESSION_SECRET=your-session-secret-here

# ============ Database & Cache ============
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password
DATABASE_URL=postgresql://user:pass@localhost:5432/portfolio_db

# ============ External Services ============
OPENAI_API_KEY=your-openai-api-key
SEI_RPC_URL=https://evm-rpc.sei-apis.com
COINGECKO_API_KEY=your-coingecko-api-key

# ============ Monitoring & Logging ============
LOG_LEVEL=info
LOG_FILE_PATH=/var/log/portfolio-manager/app.log
ERROR_LOG_PATH=/var/log/portfolio-manager/error.log
SENTRY_DSN=your-sentry-dsn-here

# ============ Rate Limiting ============
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
AI_RATE_LIMIT_MAX=100
AI_RATE_LIMIT_WINDOW_MS=3600000

# ============ Cache Configuration ============
CACHE_TTL_PORTFOLIO=300
CACHE_TTL_POSITIONS=60
CACHE_TTL_PRICES=30
CACHE_TTL_METRICS=120

# ============ Performance ============
CLUSTER_WORKERS=auto
MAX_REQUEST_SIZE=10mb
REQUEST_TIMEOUT=30000
```

### Configuration Validation

The functional configuration system validates all settings:

```typescript
// Production configuration validation
const validateProductionConfig = (): Either<ConfigError[], AppConfig> => {
  const errors: ConfigError[] = [];
  
  // Validate required production settings
  validateRequired(process.env.JWT_SECRET, 'JWT_SECRET', errors);
  validateRequired(process.env.ENCRYPTION_KEY, 'ENCRYPTION_KEY', errors);
  validateRequired(process.env.OPENAI_API_KEY, 'OPENAI_API_KEY', errors);
  
  // Validate security settings
  validateMinLength(process.env.JWT_SECRET, 32, 'JWT_SECRET', errors);
  validateUrl(process.env.FRONTEND_URL, 'FRONTEND_URL', errors);
  
  // Validate numeric settings
  validatePort(process.env.PORT, 'PORT', errors);
  validatePositiveNumber(process.env.CACHE_TTL_PORTFOLIO, 'CACHE_TTL_PORTFOLIO', errors);
  
  return errors.length > 0 ? E.left(errors) : E.right(createConfig());
};
```

## Docker Deployment

### Dockerfile

```dockerfile
# Multi-stage build for optimized production image
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S portfolio -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=portfolio:nodejs /app/dist ./dist
COPY --from=builder --chown=portfolio:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=portfolio:nodejs /app/package*.json ./

# Create log directory
RUN mkdir -p /var/log/portfolio-manager && chown portfolio:nodejs /var/log/portfolio-manager

# Switch to non-root user
USER portfolio

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
    const options = { hostname: 'localhost', port: process.env.PORT || 8000, path: '/health', timeout: 2000 }; \
    const req = http.request(options, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); \
    req.on('error', () => process.exit(1)); \
    req.end();"

EXPOSE 8000

CMD ["node", "dist/server.js"]
```

### Docker Compose Production

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  portfolio-backend:
    build:
      context: .
      target: production
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    ports:
      - "8000:8000"
    depends_on:
      - redis
      - postgres
    volumes:
      - ./logs:/var/log/portfolio-manager
    networks:
      - portfolio-network
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
        reservations:
          memory: 512M
          cpus: '0.25'

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    networks:
      - portfolio-network
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.1'

  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: portfolio_db
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - portfolio-network

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - portfolio-backend
    networks:
      - portfolio-network

volumes:
  redis-data:
  postgres-data:

networks:
  portfolio-network:
    driver: bridge
```

### Deployment Commands

```bash
# Build and deploy
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Scale application
docker-compose -f docker-compose.prod.yml up -d --scale portfolio-backend=3

# Update deployment
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --force-recreate

# View logs
docker-compose -f docker-compose.prod.yml logs -f portfolio-backend

# Health check
curl -f http://localhost:8000/health || exit 1
```

## Monitoring and Logging

### Structured Logging Setup

```typescript
// Production logging configuration
import winston from 'winston';
import 'winston-daily-rotate-file';

const createProductionLogger = (): winston.Logger => {
  const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
      return JSON.stringify({
        '@timestamp': timestamp,
        level,
        message,
        service: 'portfolio-backend',
        environment: process.env.NODE_ENV,
        ...meta
      });
    })
  );

  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports: [
      // Rotate daily log files
      new winston.transports.DailyRotateFile({
        filename: '/var/log/portfolio-manager/app-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '100m',
        maxFiles: '30d',
        level: 'info'
      }),
      
      // Separate error log
      new winston.transports.DailyRotateFile({
        filename: '/var/log/portfolio-manager/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '100m',
        maxFiles: '30d',
        level: 'error'
      }),
      
      // Console output for development
      ...(process.env.NODE_ENV !== 'production' ? [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ] : [])
    ]
  });
};
```

### Performance Monitoring

```typescript
// Application performance monitoring
import { performance } from 'perf_hooks';

const createPerformanceMonitor = () => {
  const metrics = new Map<string, { count: number; totalTime: number; avgTime: number }>();
  
  const track = <T>(operation: string, fn: () => Promise<T>): Promise<T> => {
    const start = performance.now();
    
    return fn()
      .finally(() => {
        const duration = performance.now() - start;
        const current = metrics.get(operation) || { count: 0, totalTime: 0, avgTime: 0 };
        const newCount = current.count + 1;
        const newTotal = current.totalTime + duration;
        
        metrics.set(operation, {
          count: newCount,
          totalTime: newTotal,
          avgTime: newTotal / newCount
        });
        
        // Log slow operations
        if (duration > 1000) {
          logger.warn(`Slow operation detected: ${operation} took ${duration.toFixed(2)}ms`);
        }
      });
  };
  
  const getMetrics = () => Object.fromEntries(metrics);
  
  return { track, getMetrics };
};

// Usage in services
export class PortfolioService {
  private monitor = createPerformanceMonitor();
  
  public getPortfolioData = (walletAddress: WalletAddress): AsyncResult<PortfolioData> =>
    TE.fromTask(() => 
      this.monitor.track('portfolio.getData', () =>
        pipe(
          this.getOrUpdatePortfolioSnapshot(walletAddress),
          TE.map(snapshot => this.convertSnapshotToLegacyData(snapshot))
        )()
      )
    );
}
```

### Health Checks

```typescript
// Comprehensive health check endpoint
router.get('/health', async (req, res) => {
  const checks = await pipe(
    TE.Do,
    TE.bind('redis', () => checkRedisHealth()),
    TE.bind('database', () => checkDatabaseHealth()),
    TE.bind('openai', () => checkOpenAIHealth()),
    TE.bind('memory', () => TE.of(checkMemoryUsage())),
    TE.bind('uptime', () => TE.of(process.uptime())),
    TE.fold(
      (error) => TE.of({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      (results) => TE.of({
        status: 'healthy',
        checks: results,
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version
      })
    )
  )();
  
  const status = checks.status === 'healthy' ? 200 : 503;
  res.status(status).json(checks);
});

const checkRedisHealth = (): TE.TaskEither<Error, { status: string; latency: number }> =>
  TE.tryCatch(
    async () => {
      const start = Date.now();
      await redis.ping();
      return { status: 'connected', latency: Date.now() - start };
    },
    (error) => new Error(`Redis health check failed: ${error}`)
  );
```

## Performance Optimization

### PM2 Process Management

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'portfolio-backend',
    script: 'dist/server.js',
    instances: process.env.CLUSTER_WORKERS || 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 8000
    },
    error_file: '/var/log/portfolio-manager/pm2-error.log',
    out_file: '/var/log/portfolio-manager/pm2-out.log',
    log_file: '/var/log/portfolio-manager/pm2.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    kill_timeout: 5000,
    watch: false,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

### Nginx Configuration

```nginx
# nginx.conf
upstream portfolio_backend {
    least_conn;
    server portfolio-backend:8000 max_fails=3 fail_timeout=30s;
    # Add more backend servers for load balancing
    # server portfolio-backend-2:8000 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain application/json application/javascript text/css;

    location / {
        proxy_pass http://portfolio_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://portfolio_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Redis Optimization

```bash
# Redis production configuration (/etc/redis/redis.conf)
maxmemory 512mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
timeout 300
tcp-keepalive 300
```

## Security Hardening

### Application Security

```typescript
// Security middleware configuration
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const securityMiddleware = (app: Express) => {
  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "https://evm-rpc.sei-apis.com"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));

  // Rate limiting
  const createRateLimiter = (windowMs: number, max: number) =>
    rateLimit({
      windowMs,
      max,
      message: { error: 'Too many requests, please try again later.' },
      standardHeaders: true,
      legacyHeaders: false,
    });

  app.use('/api/', createRateLimiter(15 * 60 * 1000, 1000)); // 1000 requests per 15 minutes
  app.use('/api/ai/', createRateLimiter(60 * 60 * 1000, 100)); // 100 AI requests per hour
};
```

### Environment Isolation

```bash
# Firewall rules (UFW)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Restrict Redis access
sudo ufw allow from 10.0.0.0/8 to any port 6379
```

## Backup and Recovery

### Database Backup Strategy

```bash
#!/bin/bash
# backup.sh - Daily backup script

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/portfolio-manager"
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# PostgreSQL backup
pg_dump -U $DB_USER -h localhost portfolio_db > $BACKUP_DIR/postgres_backup_$DATE.sql

# Redis backup
redis-cli --rdb $BACKUP_DIR/redis_backup_$DATE.rdb

# Application logs backup
tar -czf $BACKUP_DIR/logs_backup_$DATE.tar.gz /var/log/portfolio-manager/

# Clean old backups
find $BACKUP_DIR -name "*.sql" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.rdb" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $DATE"
```

### Recovery Procedures

```bash
# Database recovery
psql -U $DB_USER -h localhost -d portfolio_db < /var/backups/portfolio-manager/postgres_backup_20240115_120000.sql

# Redis recovery
redis-cli --rdb /var/backups/portfolio-manager/redis_backup_20240115_120000.rdb

# Application restart
docker-compose -f docker-compose.prod.yml restart portfolio-backend
```

## Troubleshooting

### Common Issues

#### High Memory Usage

```bash
# Monitor memory usage
docker stats portfolio-backend

# Check Node.js heap usage
curl http://localhost:8000/metrics | grep heap

# Restart with memory limit
docker-compose -f docker-compose.prod.yml up -d --force-recreate
```

#### Redis Connection Issues

```bash
# Test Redis connectivity
redis-cli -h localhost -p 6379 ping

# Check Redis logs
docker-compose -f docker-compose.prod.yml logs redis

# Clear Redis cache
redis-cli flushall
```

#### Performance Degradation

```typescript
// Performance debugging endpoint
router.get('/debug/performance', async (req, res) => {
  const metrics = {
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    uptime: process.uptime(),
    loadAverage: os.loadavg(),
    cacheStats: await cache.info(),
    activeConnections: socketService.getConnectionCount()
  };
  
  res.json(metrics);
});
```

### Maintenance Commands

```bash
# Update application
git pull origin main
npm run build
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d --force-recreate

# View application logs
docker-compose -f docker-compose.prod.yml logs -f --tail=100 portfolio-backend

# Database maintenance
docker-compose -f docker-compose.prod.yml exec postgres psql -U $DB_USER -d portfolio_db -c "VACUUM ANALYZE;"

# Redis maintenance
docker-compose -f docker-compose.prod.yml exec redis redis-cli INFO memory
```

### Deployment Checklist

- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database migrations applied
- [ ] Redis cluster configured
- [ ] Monitoring setup complete
- [ ] Backup procedures tested
- [ ] Load balancer configured
- [ ] Health checks passing
- [ ] Performance baselines established
- [ ] Security scan completed

---

This deployment guide ensures a robust, secure, and scalable production environment for the functional portfolio management backend.