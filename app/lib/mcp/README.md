# MCP Client Library

A unified client library for interacting with MCP (Model Context Protocol) servers in the Seiron application.

## Overview

This library provides a centralized way to interact with three MCP servers:
- **Hive Intelligence**: Market data, trending tokens, and token analysis
- **Sei Blockchain**: Wallet balances, transactions, and staking information
- **Portfolio Manager**: Portfolio analysis, performance metrics, and risk assessment

## Features

- **Type-safe API**: Full TypeScript support with typed requests and responses
- **Retry logic**: Automatic retry with exponential backoff
- **Error handling**: Comprehensive error types and handling
- **Health monitoring**: Built-in server health checks
- **React integration**: Custom hooks for easy use in components
- **Batch operations**: Execute multiple tool calls efficiently
- **Next.js compatible**: Works with both API routes and React Server Components

## Installation

The library is already included in the project. Import from:

```typescript
import { callMCPTool, handleMCPRequests } from '@/app/lib/mcp';
```

## Basic Usage

### Direct Tool Call

```typescript
import { callMCPTool } from '@/app/lib/mcp';

// Get market data
const marketData = await callMCPTool('hive', 'getMarketData', {
  symbols: ['SEI', 'BTC', 'ETH']
});

// Get wallet balance
const balance = await callMCPTool('sei', 'getWalletBalance', {
  address: 'sei1...'
});
```

### Request Handler (AI Integration)

```typescript
import { handleMCPRequests } from '@/app/lib/mcp';

// Process user message and fetch relevant data
const mcpResponse = await handleMCPRequests({
  message: "What's my portfolio performance?",
  walletAddress: 'sei1...',
  sessionId: 'session_123'
});

// Use in AI prompt
const aiPrompt = `
  User: ${message}
  Data: ${mcpResponse.context}
`;
```

### React Hook Usage

```typescript
import { useMCP } from '@/app/lib/mcp/useMCP';

function MarketDataComponent() {
  const { callTool, loading, error } = useMCP();
  
  const fetchData = async () => {
    const data = await callTool('hive', 'getMarketData', {
      symbols: ['SEI']
    });
    // Use data...
  };
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <button onClick={fetchData}>Get Market Data</button>;
}
```

## Available Tools

### Hive Intelligence
- `getMarketData`: Fetch price data for multiple tokens
- `getTrendingTokens`: Get trending tokens list
- `getTokenAnalysis`: Detailed token analysis with sentiment

### Sei Blockchain
- `getWalletBalance`: Get wallet balances and total value
- `getTransactionHistory`: Fetch recent transactions
- `getStakingInfo`: Get staking positions and rewards

### Portfolio Manager
- `analyzePortfolioComposition`: Asset allocation analysis
- `getHistoricalPerformance`: Performance over time
- `getRiskMetrics`: Risk assessment and scores

## Error Handling

```typescript
import { callMCPTool, MCPError, MCPErrorCode } from '@/app/lib/mcp';

try {
  const data = await callMCPTool('hive', 'getMarketData', { symbols: ['SEI'] });
} catch (error) {
  if (error instanceof MCPError) {
    switch (error.code) {
      case MCPErrorCode.TIMEOUT:
        // Handle timeout
        break;
      case MCPErrorCode.SERVER_ERROR:
        // Handle server error
        break;
      default:
        // Handle other errors
    }
  }
}
```

## Health Monitoring

```typescript
import { checkAllMCPServers } from '@/app/lib/mcp';

// Check all servers
const health = await checkAllMCPServers();
health.forEach(server => {
  console.log(`${server.server}: ${server.status}`);
});
```

## Configuration

The library uses environment variables for server URLs:

```env
MCP_HIVE_URL=https://hive-intelligence-mcp-production.up.railway.app
MCP_SEI_URL=https://sei-blockchain-mcp-production.up.railway.app
MCP_PORTFOLIO_URL=https://portfolio-manager-mcp-production.up.railway.app
```

## Advanced Usage

### Batch Operations

```typescript
import { batchCallMCPTools } from '@/app/lib/mcp';

const results = await batchCallMCPTools([
  { server: 'sei', tool: 'getWalletBalance', args: { address: 'sei1...' } },
  { server: 'portfolio', tool: 'getRiskMetrics', args: { walletAddress: 'sei1...' } }
]);
```

### Server-Specific Hook

```typescript
import { useMCPServer } from '@/app/lib/mcp/useMCP';

function SeiComponent() {
  const sei = useMCPServer('sei');
  
  const getBalance = async () => {
    const balance = await sei.call('getWalletBalance', {
      address: 'sei1...'
    });
  };
}
```

## Migration Guide

To migrate from the old implementation to the new library:

1. Replace direct fetch calls with `callMCPTool()`
2. Use `handleMCPRequests()` instead of custom request handlers
3. Update error handling to use `MCPError`
4. Use the provided React hooks in components

## Examples

See `/app/lib/mcp/example-usage.ts` for comprehensive examples.