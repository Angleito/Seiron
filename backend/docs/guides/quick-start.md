# Quick Start Developer Guide

Get up and running with the Sei AI Portfolio Manager backend in minutes. This guide covers setup, basic usage, and key functional programming patterns.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [First Steps](#first-steps)
- [Key Concepts](#key-concepts)
- [Common Patterns](#common-patterns)
- [Testing](#testing)
- [Next Steps](#next-steps)

## Prerequisites

- **Node.js** 18+ and npm
- **Redis** (optional, for caching)
- **OpenAI API Key** (for AI features)
- Basic understanding of **TypeScript** and **functional programming**

## Installation

### 1. Clone and Install

```bash
cd backend
npm install
```

### 2. Environment Setup

Create your environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Server
PORT=8000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# OpenAI (required for AI features)
OPENAI_API_KEY=your-openai-api-key-here

# Redis (optional, improves performance)
REDIS_URL=redis://localhost:6379

# Blockchain
SEI_RPC_URL=https://evm-rpc.sei-apis.com
```

### 3. Start Development Server

```bash
# Quick start with script
./start.sh

# Or manually
npm run dev
```

The server will start on `http://localhost:8000`

## Configuration

### Functional Configuration System

The app uses a functional configuration system with fp-ts validation:

```typescript
// src/config/index.ts
import { Either, fold } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';

const loadConfig = (): AppConfig => {
  const configResult = validateConfig();
  
  return pipe(
    configResult,
    fold(
      (errors) => {
        const errorMessage = formatConfigErrors(errors);
        throw new Error(errorMessage);
      },
      (config) => config
    )
  );
};
```

### Environment-Specific Settings

```typescript
// Development defaults
const developmentDefaults = {
  LOG_LEVEL: 'debug',
  CACHE_TTL: '300',
  RATE_LIMIT_WINDOW: '900000'
};

// Production overrides
const productionDefaults = {
  LOG_LEVEL: 'info',
  CACHE_TTL: '600',
  RATE_LIMIT_WINDOW: '900000'
};
```

## First Steps

### 1. Test the Server

```bash
# Health check
curl http://localhost:8000/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

### 2. Get Portfolio Data

```bash
# Replace with a valid wallet address
curl "http://localhost:8000/api/portfolio/data?walletAddress=0x123..."
```

### 3. WebSocket Connection

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:8000');

// Join portfolio updates
socket.emit('join_portfolio', {
  walletAddress: '0x123...'
});

// Listen for updates
socket.on('portfolio_update', (update) => {
  console.log('Portfolio updated:', update);
});
```

## Key Concepts

### 1. TaskEither for Async Operations

All service methods return `TaskEither<Error, T>` for composable error handling:

```typescript
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';

// Service method signature
public getPortfolioData = (walletAddress: WalletAddress): AsyncResult<PortfolioData> =>
  pipe(
    this.getOrUpdatePortfolioSnapshot(walletAddress),
    TE.map(snapshot => this.convertSnapshotToLegacyData(snapshot))
  );

// Usage in routes
const result = await pipe(
  req.services.portfolio.getPortfolioData(walletAddress),
  TE.fold(
    (error) => TE.of({ success: false, error: error.message }),
    (portfolioData) => TE.of({ success: true, data: portfolioData })
  )
)();

res.json(result);
```

### 2. Immutable State Management

Portfolio state is managed immutably:

```typescript
// State update creates new objects
const updatedState: PortfolioState = {
  ...currentState,
  previous: currentState.current,
  current: newSnapshot,
  updateCount: currentState.updateCount + 1
};
```

### 3. Functional Data Transformations

Use fp-ts for data processing:

```typescript
import * as A from 'fp-ts/Array';
import { pipe } from 'fp-ts/function';

const calculateAssetAllocations = (positions: Position[]): AssetAllocation[] =>
  pipe(
    positions,
    A.filter(p => p.valueUSD > 0),
    A.groupBy(p => p.symbol),
    A.map(calculateAllocation),
    A.sortBy([Ord.contramap((a: AssetAllocation) => a.weight * -1)(N.Ord)])
  );
```

## Common Patterns

### 1. Service Composition

```typescript
// Compose multiple service operations
const analyzePortfolio = (walletAddress: WalletAddress) =>
  pipe(
    portfolioService.getPortfolioSnapshot(walletAddress),
    TE.chain(snapshot => riskService.calculateRisk(snapshot)),
    TE.chain(risk => aiService.generateAnalysis(risk)),
    TE.map(analysis => ({ snapshot, risk, analysis }))
  );
```

### 2. Error Handling Pipeline

```typescript
// Convert errors to user-friendly messages
const handlePortfolioRequest = async (req: Request, res: Response) => {
  const result = await pipe(
    validateWalletAddress(req.query.walletAddress),
    TE.fromEither,
    TE.chain(address => portfolioService.getPortfolioData(address)),
    TE.mapLeft(error => ({
      code: getErrorCode(error),
      message: getUserFriendlyMessage(error),
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })),
    TE.fold(
      (error) => TE.of({ success: false, error }),
      (data) => TE.of({ success: true, data })
    )
  )();

  res.json(result);
};
```

### 3. Caching with Functional Interface

```typescript
// Cache operations return TaskEither
const getCachedOrFresh = <T>(
  cacheKey: string,
  fetchFresh: () => TE.TaskEither<Error, T>,
  ttl: number
): TE.TaskEither<Error, T> =>
  pipe(
    cache.get(cacheKey),
    TE.chain(cached => 
      cached 
        ? TE.right(JSON.parse(cached) as T)
        : pipe(
            fetchFresh(),
            TE.chain(fresh => 
              pipe(
                cache.set(cacheKey, JSON.stringify(fresh), ttl),
                TE.map(() => fresh)
              )
            )
          )
    )
  );
```

### 4. Real-time Updates

```typescript
// Event-driven architecture with functional handlers
portfolioState.on('state_updated', async (event) => {
  await pipe(
    validateEvent(event),
    TE.fromEither,
    TE.chain(validEvent => socketService.broadcastUpdate(validEvent)),
    TE.chain(() => notificationService.sendAlerts(validEvent.alerts)),
    TE.fold(
      (error) => TE.of(logger.error('Event handling failed', error)),
      () => TE.of(logger.debug('Event processed successfully'))
    )
  )();
});
```

## Testing

### 1. Unit Tests with fp-ts

```typescript
// Test TaskEither operations
describe('PortfolioService', () => {
  test('getPortfolioData returns Right on success', async () => {
    const result = await portfolioService.getPortfolioData('0x123...')();
    
    expect(E.isRight(result)).toBe(true);
    if (E.isRight(result)) {
      expect(result.right.walletAddress).toBe('0x123...');
    }
  });

  test('getPortfolioData returns Left on error', async () => {
    mockAdapter.getUserPositions.mockReturnValue(TE.left(new Error('Network error')));
    
    const result = await portfolioService.getPortfolioData('0x123...')();
    
    expect(E.isLeft(result)).toBe(true);
    if (E.isLeft(result)) {
      expect(result.left.message).toContain('Network error');
    }
  });
});
```

### 2. Property-Based Testing

```typescript
import fc from 'fast-check';

// Test functional properties
describe('Risk Calculations', () => {
  test('health factor is always non-negative', () => {
    fc.assert(fc.property(
      fc.float({ min: 0, max: 1000000 }),
      fc.float({ min: 0, max: 1000000 }),
      (supplied, borrowed) => {
        const snapshot = createMockSnapshot({ supplied, borrowed });
        const healthFactor = calculateHealthFactor(snapshot);
        return healthFactor >= 0;
      }
    ));
  });
});
```

### 3. Integration Tests

```typescript
// Test complete workflows
describe('Portfolio Workflow', () => {
  test('complete portfolio lifecycle', async () => {
    const walletAddress = '0x123...';
    
    // Initialize
    const initResult = await portfolioService.initializeUser(walletAddress)();
    expect(E.isRight(initResult)).toBe(true);
    
    // Get data
    const dataResult = await portfolioService.getPortfolioData(walletAddress)();
    expect(E.isRight(dataResult)).toBe(true);
    
    // Execute transaction
    const txResult = await portfolioService.executeLendingOperation('supply', {
      walletAddress,
      asset: 'USDC',
      amount: '1000'
    })();
    expect(E.isRight(txResult)).toBe(true);
  });
});
```

### 4. Run Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Specific test patterns
npm test -- --testNamePattern="PortfolioService"
```

## Next Steps

### 1. Explore the Codebase

Start with these key files:
- `/src/services/PortfolioService.ts` - Main business logic
- `/src/risk/calculations.ts` - Risk calculation functions
- `/src/routes/portfolio.ts` - API endpoints
- `/src/config/index.ts` - Configuration system

### 2. Add Custom Functionality

```typescript
// Example: Add custom risk calculation
export const calculateCustomRiskMetric = (
  snapshot: PortfolioSnapshot,
  customParams: CustomParams
): number =>
  pipe(
    snapshot.lendingPositions,
    A.filter(p => p.type === 'borrow'),
    A.map(calculatePositionRisk),
    A.reduce(0, (acc, risk) => acc + risk * customParams.weight)
  );

// Register in risk service
riskService.registerCustomMetric('custom_risk', calculateCustomRiskMetric);
```

### 3. Extend API Endpoints

```typescript
// Add new route
router.get('/custom-analysis', async (req, res) => {
  const { walletAddress } = req.query;
  
  const result = await pipe(
    portfolioService.getPortfolioSnapshot(walletAddress),
    TE.chain(snapshot => customAnalysisService.analyze(snapshot)),
    TE.fold(
      (error) => TE.of({ success: false, error: error.message }),
      (analysis) => TE.of({ success: true, data: analysis })
    )
  )();
  
  res.json(result);
});
```

### 4. Read the Documentation

- [Functional Programming Guide](./functional-programming.md) - Deep dive into fp-ts patterns
- [Risk Management Module](../modules/risk-management.md) - Risk calculation system
- [Portfolio Management Module](../modules/portfolio-management.md) - Portfolio services
- [API Reference](../api/api-reference.md) - Complete API documentation

### 5. Development Best Practices

1. **Always use TaskEither for async operations**
2. **Prefer immutable data structures**
3. **Use pipe for function composition**
4. **Write property-based tests for pure functions**
5. **Handle errors functionally with Either/TaskEither**

### 6. Common Issues and Solutions

#### TypeScript Compilation Issues
```bash
# Clear compiled output
rm -rf dist/

# Rebuild
npm run build
```

#### Redis Connection Issues
```bash
# Check Redis status
redis-cli ping

# Start Redis (macOS with Homebrew)
brew services start redis

# Docker alternative
docker run -d -p 6379:6379 redis:alpine
```

#### OpenAI API Issues
```bash
# Test API key
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models
```

## Development Workflow

### 1. Feature Development

```bash
# 1. Create feature branch
git checkout -b feature/new-risk-metric

# 2. Implement with tests
npm run test:watch

# 3. Build and lint
npm run build
npm run lint

# 4. Integration test
npm test

# 5. Commit and push
git add .
git commit -m "Add custom risk metric calculation"
git push origin feature/new-risk-metric
```

### 2. Production Deployment

```bash
# 1. Build production bundle
npm run build

# 2. Start production server
NODE_ENV=production npm start

# 3. Monitor logs
tail -f logs/app.log
```

---

You're now ready to start developing with the Sei AI Portfolio Manager backend! The functional programming patterns with fp-ts provide a robust foundation for building reliable, composable, and testable DeFi applications.