# API Reference

Complete API reference for the Sei AI Portfolio Manager backend with functional programming patterns using fp-ts TaskEither and Either types.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Portfolio Endpoints](#portfolio-endpoints)
- [AI Services](#ai-services)
- [Chat System](#chat-system)
- [WebSocket Events](#websocket-events)
- [Types and Interfaces](#types-and-interfaces)

## Overview

All API endpoints follow functional programming principles:
- **Consistent** error handling with Either types
- **Immutable** data structures
- **Type-safe** request/response patterns
- **Composable** service methods

### Base URL
```
http://localhost:8000/api
```

### Response Format
All endpoints return a consistent response structure:

```typescript
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
}
```

## Authentication

### Wallet Validation
The API uses wallet address validation middleware that supports:
- Ethereum addresses (`0x...`)
- Sei addresses (`sei1...`)
- Cosmos-based addresses

Headers, query parameters, or request body can contain the wallet address.

## Error Handling

### Error Response Format
```typescript
interface ErrorResponse {
  success: false;
  error: string;
  details?: {
    field?: string;
    code?: string;
    context?: any;
  };
}
```

### HTTP Status Codes
- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized
- `404` - Not Found
- `429` - Rate Limited
- `500` - Internal Server Error

## Portfolio Endpoints

### Get Portfolio Data

**GET** `/api/portfolio/data`

Retrieves complete portfolio data for a wallet address.

#### Parameters
| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| walletAddress | string | query | Yes | Valid wallet address |

#### Response
```typescript
interface PortfolioDataResponse {
  success: true;
  data: {
    walletAddress: string;
    totalValueUSD: number;
    lendingPositions: LendingPosition[];
    liquidityPositions: LiquidityPosition[];
    tokenBalances: TokenBalance[];
    lastUpdated: string;
  };
}
```

#### Example Request
```bash
curl -X GET "http://localhost:8000/api/portfolio/data?walletAddress=0x123..."
```

#### Example Response
```json
{
  "success": true,
  "data": {
    "walletAddress": "0x123...",
    "totalValueUSD": 15750.25,
    "lendingPositions": [
      {
        "id": "yei_supply_usdc_001",
        "type": "supply",
        "platform": "YeiFinance",
        "tokenSymbol": "USDC",
        "amount": "10000",
        "valueUSD": 10000,
        "apy": 5.5,
        "healthContribution": 8500
      }
    ],
    "liquidityPositions": [
      {
        "id": "dragon_pool_001",
        "platform": "DragonSwap",
        "token0Symbol": "SEI",
        "token1Symbol": "USDC",
        "valueUSD": 5000,
        "feeApr": 12.3,
        "isInRange": true
      }
    ],
    "tokenBalances": [
      {
        "symbol": "SEI",
        "balance": "1500000000000000000000",
        "balanceFormatted": "1500.0000",
        "valueUSD": 750.25,
        "priceUSD": 0.5
      }
    ],
    "lastUpdated": "2024-01-15T10:30:00Z"
  }
}
```

### Get Portfolio Summary

**GET** `/api/portfolio/summary`

Retrieves key portfolio metrics and summary.

#### Parameters
| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| walletAddress | string | query | Yes | Valid wallet address |

#### Response
```typescript
interface PortfolioSummaryResponse {
  success: true;
  data: {
    totalValue: number;
    totalSupplied: number;
    totalBorrowed: number;
    totalLiquidity: number;
    healthFactor: number;
    apy: {
      lending: number;
      liquidity: number;
      total: number;
    };
  };
}
```

### Supply Tokens

**POST** `/api/portfolio/lending/supply`

Supply tokens to a lending protocol.

#### Request Body
```typescript
interface SupplyRequest {
  walletAddress: string;
  asset: string;
  amount: string; // In token units (will be converted to wei)
  onBehalfOf?: string;
}
```

#### Response
```typescript
interface TransactionResponse {
  success: true;
  data: {
    txHash: string;
    newSnapshot: PortfolioSnapshot;
  };
}
```

#### Functional Implementation
The endpoint uses TaskEither for error handling:

```typescript
router.post('/lending/supply', async (req, res) => {
  const { walletAddress, asset, amount, onBehalfOf } = req.body;

  const result = await pipe(
    req.services.portfolio.executeLendingOperation('supply', {
      asset,
      amount: BigInt(Math.floor(parseFloat(amount) * 1e18)),
      onBehalfOf: onBehalfOf || walletAddress
    }),
    TE.fold(
      (error) => TE.of({ success: false, error: error.message }),
      (txResult) => {
        // Send real-time update
        req.services.socket.sendTransactionUpdate(
          walletAddress,
          txResult.txHash,
          'pending'
        );
        return TE.of({ success: true, data: txResult });
      }
    )
  )();

  res.json(result);
});
```

### Withdraw Tokens

**POST** `/api/portfolio/lending/withdraw`

Withdraw tokens from a lending protocol.

#### Request Body
```typescript
interface WithdrawRequest {
  walletAddress: string;
  asset: string;
  amount: string;
  to?: string;
}
```

### Borrow Tokens

**POST** `/api/portfolio/lending/borrow`

Borrow tokens from a lending protocol.

#### Request Body
```typescript
interface BorrowRequest {
  walletAddress: string;
  asset: string;
  amount: string;
}
```

### Repay Loan

**POST** `/api/portfolio/lending/repay`

Repay borrowed tokens.

#### Request Body
```typescript
interface RepayRequest {
  walletAddress: string;
  asset: string;
  amount: string;
}
```

### Add Liquidity

**POST** `/api/portfolio/liquidity/add`

Add liquidity to a DEX pool.

#### Request Body
```typescript
interface AddLiquidityRequest {
  walletAddress: string;
  token0: string;
  token1: string;
  fee: number;
  amount0Desired: string;
  amount1Desired: string;
  tickLower: number;
  tickUpper: number;
}
```

### Remove Liquidity

**POST** `/api/portfolio/liquidity/remove`

Remove liquidity from a position.

#### Request Body
```typescript
interface RemoveLiquidityRequest {
  walletAddress: string;
  positionId: string;
  liquidity: string;
}
```

### Collect Fees

**POST** `/api/portfolio/liquidity/collect`

Collect fees from a liquidity position.

#### Request Body
```typescript
interface CollectFeesRequest {
  walletAddress: string;
  positionId: string;
}
```

## AI Services

### Analyze Portfolio

**POST** `/api/ai/analyze`

Generate AI-powered portfolio analysis.

#### Request Body
```typescript
interface AnalyzeRequest {
  walletAddress: string;
  includeRecommendations?: boolean;
  analysisType?: 'basic' | 'detailed' | 'risk_focused';
}
```

#### Response
```typescript
interface AnalysisResponse {
  success: true;
  data: {
    analysis: string;
    recommendations?: string[];
    riskAssessment: {
      level: 'low' | 'medium' | 'high' | 'critical';
      factors: string[];
    };
    opportunities: string[];
  };
}
```

### Get Suggestions

**POST** `/api/ai/suggest`

Get optimization suggestions for portfolio.

#### Request Body
```typescript
interface SuggestRequest {
  walletAddress: string;
  goals?: string[];
  riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
}
```

### Explain DeFi Concepts

**POST** `/api/ai/explain`

Get explanations for DeFi concepts and strategies.

#### Request Body
```typescript
interface ExplainRequest {
  concept: string;
  context?: string;
  complexity?: 'beginner' | 'intermediate' | 'advanced';
}
```

### Risk Assessment

**POST** `/api/ai/risk-assessment`

Assess risks of a proposed strategy.

#### Request Body
```typescript
interface RiskAssessmentRequest {
  strategy: string;
  portfolioContext?: {
    walletAddress: string;
    currentPositions: any[];
  };
}
```

### Market Insights

**GET** `/api/ai/market-insights`

Get current market insights and trends.

#### Parameters
| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| focus | string | query | No | 'defi', 'lending', 'dex', 'general' |
| timeframe | string | query | No | '1d', '7d', '30d' |

## Chat System

### Send Message

**POST** `/api/chat/message`

Send a message to the AI chat system.

#### Request Body
```typescript
interface ChatMessageRequest {
  walletAddress: string;
  message: string;
  context?: {
    includePortfolio?: boolean;
    includeMarketData?: boolean;
  };
}
```

#### Response
```typescript
interface ChatMessageResponse {
  success: true;
  data: {
    response: string;
    suggestions?: string[];
    actions?: {
      type: string;
      label: string;
      data: any;
    }[];
  };
}
```

### Get Chat History

**GET** `/api/chat/history`

Retrieve conversation history.

#### Parameters
| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| walletAddress | string | query | Yes | Valid wallet address |
| limit | number | query | No | Max messages to return (default: 50) |
| offset | number | query | No | Messages to skip (default: 0) |

### Clear History

**DELETE** `/api/chat/history`

Clear conversation history for a wallet.

#### Request Body
```typescript
interface ClearHistoryRequest {
  walletAddress: string;
}
```

### Generate Analysis

**POST** `/api/chat/analysis`

Generate a comprehensive portfolio analysis via chat.

#### Request Body
```typescript
interface ChatAnalysisRequest {
  walletAddress: string;
  focus?: 'performance' | 'risk' | 'opportunities' | 'comprehensive';
}
```

## WebSocket Events

### Client Events

#### Join Portfolio Updates
```typescript
socket.emit('join_portfolio', {
  walletAddress: string;
});
```

#### Send Chat Message
```typescript
socket.emit('chat_message', {
  walletAddress: string;
  message: string;
  context?: any;
});
```

#### Disconnect
```typescript
socket.emit('disconnect');
```

### Server Events

#### Portfolio Update
```typescript
interface PortfolioUpdateEvent {
  type: 'position_update' | 'transaction_update' | 'error';
  data: any;
  timestamp: string;
}

socket.on('portfolio_update', (event: PortfolioUpdateEvent) => {
  // Handle portfolio update
});
```

#### Chat Response
```typescript
interface ChatResponseEvent {
  response: string;
  suggestions?: string[];
  actions?: any[];
  timestamp: string;
}

socket.on('chat_response', (event: ChatResponseEvent) => {
  // Handle AI response
});
```

#### Transaction Update
```typescript
interface TransactionUpdateEvent {
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: string;
}

socket.on('transaction_update', (event: TransactionUpdateEvent) => {
  // Handle transaction status change
});
```

#### System Message
```typescript
interface SystemMessageEvent {
  type: 'info' | 'warning' | 'error';
  message: string;
  timestamp: string;
}

socket.on('system_message', (event: SystemMessageEvent) => {
  // Handle system notification
});
```

## Types and Interfaces

### Core Portfolio Types

```typescript
// Base position interface
interface BasePosition {
  id: string;
  walletAddress: string;
  platform: string;
  createdAt: string;
  lastUpdated: string;
}

// Lending position
interface LendingPosition extends BasePosition {
  type: 'supply' | 'borrow';
  token: string;
  tokenSymbol: string;
  amount: string;
  amountFormatted: string;
  valueUSD: number;
  apy: number;
  collateralFactor?: number;
  liquidationThreshold?: number;
  healthContribution: number;
}

// Liquidity position
interface LiquidityPosition extends BasePosition {
  poolId: string;
  token0: string;
  token1: string;
  token0Symbol: string;
  token1Symbol: string;
  liquidity: string;
  token0Amount: string;
  token1Amount: string;
  valueUSD: number;
  feeApr: number;
  totalApr: number;
  uncollectedFees: {
    token0: string;
    token1: string;
    valueUSD: number;
  };
  priceRange: {
    lower: number;
    upper: number;
    current: number;
  };
  isInRange: boolean;
}

// Token balance
interface TokenBalance {
  token: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: bigint;
  balanceFormatted: string;
  valueUSD: number;
  priceUSD: number;
  change24h?: number;
}

// Portfolio snapshot
interface PortfolioSnapshot {
  walletAddress: string;
  totalValueUSD: number;
  totalSuppliedUSD: number;
  totalBorrowedUSD: number;
  totalLiquidityUSD: number;
  netWorth: number;
  healthFactor: number;
  lendingPositions: LendingPosition[];
  liquidityPositions: LiquidityPosition[];
  tokenBalances: TokenBalance[];
  timestamp: string;
  blockNumber?: number;
}
```

### Risk Types

```typescript
type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface RiskMetrics {
  healthFactor: number;
  liquidationRisk: RiskLevel;
  concentrationRisk: number;
  correlationRisk: number;
  impermanentLossRisk: number;
  alerts: RiskAlert[];
}

interface RiskAlert {
  id: string;
  type: 'health_factor' | 'liquidation' | 'concentration' | 'correlation' | 'impermanent_loss';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  acknowledged: boolean;
  metadata?: any;
}
```

### Functional Types

```typescript
// Async result type using TaskEither
type AsyncResult<T> = TE.TaskEither<Error, T>;

// API response wrapper
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Validation result
type ValidationResult<T> = E.Either<ValidationError[], T>;
```

## Rate Limiting

### Default Limits
- General endpoints: 100 requests per 15 minutes
- AI endpoints: 50 requests per hour  
- WebSocket connections: 10 concurrent per IP

### Headers
Rate limit information is returned in response headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642781400
```

## Examples

### Complete Portfolio Workflow

```typescript
// 1. Get initial portfolio data
const portfolioData = await fetch('/api/portfolio/data?walletAddress=0x123...')
  .then(res => res.json());

// 2. Analyze portfolio with AI
const analysis = await fetch('/api/ai/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    walletAddress: '0x123...',
    includeRecommendations: true
  })
}).then(res => res.json());

// 3. Execute a supply operation
const supplyResult = await fetch('/api/portfolio/lending/supply', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    walletAddress: '0x123...',
    asset: 'USDC',
    amount: '1000'
  })
}).then(res => res.json());

// 4. Monitor via WebSocket
const socket = io();
socket.emit('join_portfolio', { walletAddress: '0x123...' });
socket.on('portfolio_update', (update) => {
  console.log('Portfolio updated:', update);
});
```

---

This API reference provides comprehensive documentation for all endpoints with functional programming patterns and fp-ts integration examples.