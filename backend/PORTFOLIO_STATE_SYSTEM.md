# Sei AI Portfolio Manager - State Management System

## Overview

This document outlines the comprehensive portfolio state management and position tracking system built for the Sei AI Portfolio Manager. The system provides real-time portfolio monitoring, advanced analytics, caching strategies, and risk management for DeFi positions on the Sei Network.

## Architecture

### Core Components

1. **Portfolio State Management** (`src/state/PortfolioState.ts`)
   - In-memory portfolio state management with event-driven updates
   - Historical data tracking with configurable retention
   - Real-time snapshot comparison and change detection
   - Automatic cache synchronization

2. **Position Tracking** (`src/tracking/PositionTracker.ts`)
   - Real-time monitoring of lending and liquidity positions
   - Position change detection with granular diff tracking
   - Risk alert generation based on configurable thresholds
   - Historical position analysis and pattern detection

3. **Portfolio Analytics** (`src/analytics/PortfolioAnalytics.ts`)
   - Comprehensive performance metrics calculation
   - Multi-period performance analysis (1h, 1d, 7d, 30d, 90d, 1y)
   - Risk assessment and diversification scoring
   - Yield optimization and APY tracking

4. **Intelligent Caching** (`src/caching/PortfolioCacheManager.ts`)
   - Redis-based caching with dynamic TTL calculation
   - Multi-layer caching strategy for optimal performance
   - Cache invalidation rules and dependency management
   - Bulk operations and statistics tracking

5. **Position Comparison** (`src/comparison/PositionComparator.ts`)
   - Advanced position diff tracking with change significance analysis
   - Historical pattern detection and trend analysis
   - Automated recommendation generation
   - Position stability and volatility assessment

6. **Data Export/Import** (`src/export/PortfolioExporter.ts`)
   - Complete portfolio data serialization and backup
   - Multiple format support (JSON, CSV, XLSX)
   - Encryption and compression options
   - Incremental backup and restore capabilities

7. **Error Handling & Risk Management** (`src/errors/PortfolioErrorHandler.ts`)
   - Comprehensive error classification and recovery strategies
   - Real-time risk monitoring and alert generation
   - Automated escalation and notification system
   - Error statistics and recovery success tracking

### Protocol Adapters

1. **Yei Finance Adapter** (`src/adapters/YeiFinanceAdapter.ts`)
   - Lending protocol integration for Sei Network
   - Supply, withdraw, borrow, and repay operations
   - Health factor calculation and position monitoring
   - APY tracking and yield optimization

2. **DragonSwap V2 Adapter** (`src/adapters/DragonSwapAdapter.ts`)
   - Liquidity protocol integration for concentrated liquidity
   - Position management and fee collection
   - Impermanent loss monitoring and analysis
   - Range optimization and rebalancing suggestions

### Enhanced PortfolioService

The existing `PortfolioService` has been completely rewritten to integrate all new components:
- **Real-time state management** with automatic updates
- **WebSocket integration** for live portfolio streaming
- **Comprehensive caching** with intelligent invalidation
- **Advanced analytics** and performance tracking
- **Risk monitoring** with automated alerts
- **Transaction monitoring** with state synchronization

## Features

### Real-time Monitoring
- Automatic portfolio updates every 30 seconds (configurable)
- WebSocket-based real-time data streaming
- Instant position change notifications
- Risk alert broadcasting

### Advanced Analytics
- **Performance Metrics**: Returns, APY, volatility, Sharpe ratio, max drawdown
- **Risk Assessment**: Health factor, liquidation risk, concentration analysis
- **Portfolio Optimization**: Diversification scoring, yield recommendations
- **Historical Analysis**: Trend detection, pattern recognition, stability analysis

### Intelligent Caching
- **Dynamic TTL**: Cache duration based on portfolio risk and value
- **Multi-layer Strategy**: Position-level, portfolio-level, and analytics caching
- **Dependency Tracking**: Automatic invalidation on related data changes
- **Performance Optimization**: Bulk operations, cache statistics, hit rate monitoring

### Risk Management
- **Real-time Monitoring**: Continuous health factor and liquidation risk assessment
- **Alert System**: Configurable thresholds with severity-based escalation
- **Recovery Strategies**: Automated error handling with fallback mechanisms
- **Pattern Detection**: Historical risk pattern analysis and prediction

### Data Management
- **Complete Backup**: Full portfolio state export with compression and encryption
- **Incremental Sync**: Efficient data synchronization and restoration
- **Format Flexibility**: JSON, CSV, XLSX export options
- **Data Integrity**: Checksum validation and error detection

## Configuration

### Environment Variables
```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0
REDIS_TTL=3600

# Cache Configuration
CACHE_PORTFOLIO_TTL=300
CACHE_POSITIONS_TTL=180
CACHE_PRICES_TTL=60
CACHE_METRICS_TTL=240

# Risk Thresholds
HEALTH_FACTOR_WARNING=1.5
HEALTH_FACTOR_CRITICAL=1.2
VALUE_CHANGE_THRESHOLD=1000
CONCENTRATION_RISK_THRESHOLD=70
```

### Initialization
```typescript
import { PortfolioService } from './services/PortfolioService';
import { SocketService } from './services/SocketService';

// Initialize with WebSocket support
const socketService = new SocketService(io);
const portfolioService = new PortfolioService(socketService);

// Initialize user portfolio tracking
await portfolioService.initializeUser(walletAddress)();

// Get real-time portfolio data
const snapshot = await portfolioService.getPortfolioSnapshot(walletAddress)();
const analytics = await portfolioService.getAnalyticsDashboard(walletAddress)();
const tracking = portfolioService.getPositionTracking(walletAddress);
```

## API Endpoints

### Portfolio Data
- `GET /portfolio/:address` - Get current portfolio snapshot
- `GET /portfolio/:address/summary` - Get portfolio summary (legacy)
- `GET /portfolio/:address/metrics` - Get comprehensive metrics
- `GET /portfolio/:address/performance/:period` - Get performance analysis
- `GET /portfolio/:address/risks` - Get risk assessment
- `GET /portfolio/:address/analytics` - Get full analytics dashboard

### Position Management
- `POST /portfolio/:address/refresh` - Force portfolio refresh
- `GET /portfolio/:address/tracking` - Get position tracking data
- `GET /portfolio/:address/alerts` - Get active risk alerts
- `POST /portfolio/:address/alerts/:id/acknowledge` - Acknowledge alert

### Operations
- `POST /portfolio/lending/:operation` - Execute lending operation
- `POST /portfolio/liquidity/:operation` - Execute liquidity operation
- `GET /portfolio/:address/history` - Get portfolio history
- `POST /portfolio/:address/export` - Export portfolio data

### Analytics
- `GET /portfolio/:address/comparison` - Get position comparisons
- `GET /portfolio/:address/patterns` - Get detected patterns
- `GET /portfolio/:address/recommendations` - Get optimization recommendations

## WebSocket Events

### Client → Server
```typescript
// Subscribe to portfolio updates
socket.emit('subscribe_portfolio', { walletAddress });

// Acknowledge risk alert
socket.emit('acknowledge_alert', { walletAddress, alertId });
```

### Server → Client
```typescript
// Portfolio updates
socket.on('portfolio_update', (data: PortfolioUpdate) => {
  // Handle position updates, balance changes, etc.
});

// Risk alerts
socket.on('risk_alert', (alert: RiskAlert) => {
  // Handle critical risk notifications
});

// Transaction updates
socket.on('transaction_update', (update: TransactionUpdate) => {
  // Handle transaction status changes
});
```

## Performance Considerations

### Caching Strategy
- **L1 Cache**: In-memory state management (instant access)
- **L2 Cache**: Redis caching with dynamic TTL (sub-second access)
- **L3 Cache**: Blockchain data caching (multi-second access)

### Optimization Techniques
- **Bulk Operations**: Batch cache operations for efficiency
- **Lazy Loading**: Load data only when requested
- **Smart Invalidation**: Selective cache clearing based on dependencies
- **Connection Pooling**: Efficient Redis connection management

### Monitoring & Metrics
- Cache hit rates and performance statistics
- Error tracking and recovery success rates
- WebSocket connection monitoring
- Real-time portfolio update frequency

## Security Considerations

### Data Protection
- **Encryption**: Portfolio export encryption with user-provided keys
- **Access Control**: Wallet-based authentication and authorization
- **Data Isolation**: Per-user state isolation and privacy
- **Audit Logging**: Comprehensive operation logging

### Error Handling
- **Input Validation**: Comprehensive data validation and sanitization
- **Rate Limiting**: API endpoint protection against abuse
- **Recovery Mechanisms**: Automated error recovery and fallback strategies
- **Alert Systems**: Real-time notification of security events

## Deployment

### Prerequisites
- Node.js 18+
- Redis 6+
- TypeScript 5+
- Required dependencies (see package.json)

### Installation
```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the service
npm start
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
CMD ["node", "dist/server.js"]
```

## Monitoring & Maintenance

### Health Checks
- Portfolio state consistency validation
- Cache performance monitoring
- WebSocket connection health
- Error rate and recovery tracking

### Maintenance Tasks
- Regular cache cleanup and optimization
- Portfolio state backup and archival
- Performance metric analysis
- Risk threshold adjustment

### Alerting
- Critical error notifications
- Performance degradation alerts
- Risk threshold breaches
- System resource monitoring

## Future Enhancements

### Planned Features
- Machine learning-based risk prediction
- Advanced portfolio optimization algorithms
- Multi-chain support expansion
- Enhanced visualization and reporting
- API rate limiting and usage analytics

### Scalability Improvements
- Horizontal scaling with clustering
- Database sharding for large user bases
- Advanced caching strategies
- Real-time data streaming optimization

This comprehensive system provides a robust foundation for portfolio state management and position tracking in the Sei AI Portfolio Manager, with extensive monitoring, analytics, and risk management capabilities.