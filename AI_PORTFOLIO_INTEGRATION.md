# AI Portfolio Manager - Complete Integration Guide

## Overview

The AI Portfolio Manager has been enhanced with a sophisticated multi-agent system, high-performance caching, and batch processing capabilities. This guide covers the integrated components and how to use them.

## Architecture

### 1. Multi-Agent System (ElizaOS Integration)

The system now includes specialized AI agents for different DeFi operations:

- **Lending Agent**: Handles deposit, withdraw, borrow, and repay operations
- **Liquidity Agent**: Manages liquidity pools, swaps, and LP positions  
- **Portfolio Agent**: Monitors positions, rebalances, and optimizes yields
- **Market Agent**: Analyzes market conditions and identifies opportunities

### 2. Orchestrator

The orchestrator coordinates multiple agents to handle complex operations:

```typescript
// The orchestrator automatically:
- Parses user intents from natural language
- Routes tasks to appropriate agents
- Coordinates multi-agent workflows
- Handles errors with fallback strategies
```

### 3. Performance Layer

Integrated high-performance modules for scalability:

- **Smart Cache**: Multi-layer caching (L1: Memory, L2: Redis, L3: Disk)
- **Batch Processor**: Groups operations for efficient execution
- **Performance Monitor**: Real-time metrics and alerting

## Getting Started

### 1. Environment Setup

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your configuration:
# - WALLET_ADDRESS
# - PRIVATE_KEY
# - SEI_RPC_URL
```

### 2. Start the API Server

```bash
# Start the API server with WebSocket support
npm run api

# For development with auto-reload
npm run api:dev
```

### 3. Using the Enhanced Manager

```typescript
import { AIPortfolioManagerEnhanced } from './src/AIPortfolioManagerEnhanced';

const manager = new AIPortfolioManagerEnhanced({
  network: 'sei-mainnet',
  wallet: process.env.WALLET_ADDRESS,
  aiModel: 'balanced-defi',
  autoExecute: true
});

// Start chat interface
const chat = await manager.startChat();

// Send natural language commands
const response = await chat.send('Lend 1000 USDC');
```

## Agent Actions

### Lending Operations

```typescript
// Available actions in src/agents/actions/lending/
- deposit: Supply assets to earn yield
- withdraw: Remove supplied assets
- borrow: Take loans against collateral
- repay: Pay back borrowed amounts
- getHealthFactor: Check position health
- monitorPosition: Set up alerts
```

### Liquidity Operations

```typescript
// Available actions in src/agents/actions/liquidity/
- addLiquidity: Provide liquidity to pools
- removeLiquidity: Withdraw LP positions
- swap: Execute token swaps
- collectFees: Claim trading fees
- getPositionDetails: View LP info
- monitorPositions: Track IL and suggest rebalancing
```

### Market Operations

```typescript
// Available actions in src/agents/actions/market/
- monitor: Real-time market monitoring
- analyze: Technical and fundamental analysis
- findOpportunities: Identify profitable trades
```

## Evaluators

The system includes intelligent evaluators that assess:

### Risk Assessment
- Portfolio health factor
- Exposure concentration
- Volatility scoring
- Liquidity risk analysis

### Yield Optimization
- Current vs optimal APY
- Opportunity identification
- Risk-adjusted recommendations

### Market Conditions
- Trend analysis
- Volatility assessment
- Correlation analysis

## Performance Features

### Caching

The system implements a 3-layer cache for >95% hit rate:

```typescript
// Cached endpoints with configurable TTL
- Portfolio summaries (1 min)
- Lending rates (5 min)
- Market data (30 sec)
- Pool data (2 min)
```

### Batch Processing

Operations are automatically batched for efficiency:

```typescript
// Batch types
- Blockchain transactions (50 per batch)
- API requests (100 per batch)
- Analytics (500 per batch)
```

### Monitoring

Real-time performance metrics:

```typescript
// Access metrics
const metrics = manager.getPerformanceMetrics();
console.log(metrics.cache.hitRate);     // Cache hit rate
console.log(metrics.api.p95);           // API response time
console.log(metrics.batch.queueLength); // Batch queue size
```

## Frontend Integration

### Chat Interface

The frontend chat seamlessly integrates with the agent system:

```typescript
// In frontend/app/api/chat/route.ts
- Parses user messages into intents
- Routes to appropriate agents
- Formats agent responses
- Provides real-time updates via WebSocket
```

### WebSocket Updates

Connect to receive real-time updates:

```javascript
const ws = new WebSocket(`ws://localhost:3001?session=${sessionId}`);

ws.on('message', (data) => {
  const update = JSON.parse(data);
  // Handle agent status, progress, results
});
```

## Advanced Usage

### Batch Strategy Execution

```typescript
const strategy = {
  lending: [
    { type: 'deposit', asset: 'USDC', amount: 1000 }
  ],
  liquidity: [
    { type: 'add', pair: 'USDC/ETH', amounts: [500, 0.25] }
  ],
  swaps: [
    { from: 'USDC', to: 'SEI', amount: 200 }
  ]
};

await manager.executeStrategyBatch(strategy);
```

### Autonomous Management

```typescript
await manager.start({
  initialCapital: 10000,
  assets: ['USDC', 'ETH', 'SEI'],
  rebalanceThreshold: 0.05,
  maxGasPrice: 50
});
```

### Cache Warming

```typescript
// Pre-load frequently accessed data
await manager.warmCache();
```

## API Endpoints

The API server exposes:

- `POST /api/process-intent` - Process user intents
- `GET /api/portfolio/status` - Get portfolio summary
- `GET /api/metrics` - Performance metrics
- `GET /health` - Health check
- `WS ws://localhost:3001` - WebSocket for real-time updates

## Configuration

### Production Settings

See `src/config/production.ts` for optimized settings:

- Cache: 200MB L1, 2GB L2, 10GB L3
- Batch: 16 workers, dynamic sizing
- Monitoring: 5-second intervals, 7-day retention

### Environment-Specific

```typescript
// Override for different environments
development: { cache: { L1: { maxSize: 50MB } } }
staging: { batchProcessing: { workers: 8 } }
production: { /* use defaults */ }
```

## Troubleshooting

### Common Issues

1. **Low cache hit rate**: Check TTL settings and warm cache on startup
2. **Slow batch processing**: Adjust batch sizes and worker count
3. **Agent timeouts**: Increase timeout in orchestrator config
4. **WebSocket disconnects**: Check connection limits and keepalive settings

### Debug Mode

```typescript
// Enable debug logging
process.env.DEBUG = 'ai-portfolio:*';
```

## Next Steps

1. **Custom Agents**: Create new agents in `src/agents/`
2. **New Actions**: Add actions in `src/agents/actions/`
3. **Custom Evaluators**: Build evaluators in `src/agents/evaluators/`
4. **Performance Tuning**: Adjust settings in `src/config/production.ts`

For more examples, see `src/example-usage.ts`.