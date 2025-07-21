# Vercel MCP Setup Guide

This guide explains how to set up MCP (Model Context Protocol) servers with Vercel deployment using API routes as a secure proxy.

## Architecture Overview

```
┌─────────────────┐
│  Frontend App   │
│   (Vercel)      │
└────────┬────────┘
         │
         │ HTTPS (Secure)
         ↓
┌─────────────────┐
│ Vercel API      │
│ Routes (Proxy)  │
└────────┬────────┘
         │
         │ Internal Network
         ↓
┌─────────────────────────────────────┐
│        MCP Servers                  │
├─────────────┬─────────────┬────────┤
│    Hive     │     SEI     │Portfolio│
│   (8765)    │   (8766)    │ (8767)  │
└─────────────┴─────────────┴────────┘
```

## Benefits

1. **Security**: API keys are never exposed to the frontend
2. **CORS**: No CORS issues as requests go through same origin
3. **Rate Limiting**: Built-in rate limiting at the API route level
4. **Caching**: Can implement caching at the edge
5. **Analytics**: Track API usage through Vercel analytics

## Setup Instructions

### 1. Environment Variables in Vercel

Go to your Vercel project settings and add these environment variables:

```bash
# Hive Intelligence MCP
HIVE_INTELLIGENCE_API_KEY=dev_2f4c0b23e5fb8a9d039e8620b4f52cdc
MCP_HIVE_URL=http://localhost:8765  # For local dev
# MCP_HIVE_URL=https://your-hive-mcp-server.com  # For production

# SEI Blockchain MCP
SEI_API_KEY=your_sei_api_key_here
MCP_SEI_URL=http://localhost:8766  # For local dev
# MCP_SEI_URL=https://your-sei-mcp-server.com  # For production

# Portfolio Manager MCP
PORTFOLIO_API_KEY=your_portfolio_api_key_here
MCP_PORTFOLIO_URL=http://localhost:8767  # For local dev
# MCP_PORTFOLIO_URL=https://your-portfolio-mcp-server.com  # For production
```

### 2. API Routes Created

The following API routes have been created:

#### `/api/mcp/execute` (POST)
Main endpoint for executing MCP tools.

```typescript
// Example request
POST /api/mcp/execute
{
  "server": "hive",
  "tool": "getMarketData",
  "arguments": {
    "symbols": ["SEI", "BTC"]
  }
}

// Example response
{
  "success": true,
  "server": "hive",
  "tool": "getMarketData",
  "result": "SEI is trading at $0.8500\n  24h change: +5.20%..."
}
```

#### `/api/mcp/execute` (GET)
Health check endpoint.

```typescript
// Example response
GET /api/mcp/execute
{
  "status": "ok",
  "servers": {
    "hive": {
      "configured": true,
      "url": "http://localhost:8765",
      "tools": 7
    },
    "sei": {
      "configured": false,
      "url": "http://localhost:8766",
      "tools": 10
    },
    "portfolio": {
      "configured": false,
      "url": "http://localhost:8767",
      "tools": 8
    }
  }
}
```

### 3. Frontend Usage

Use the provided hook in your components:

```typescript
import { useVercelMCP } from '@/hooks/useVercelMCP';

function MyComponent() {
  const { getMarketData, loading, error } = useVercelMCP();
  
  const fetchData = async () => {
    const result = await getMarketData(['SEI', 'BTC']);
    console.log(result); // Natural language text response
  };
}
```

Or use the client directly:

```typescript
import { getMCPClient } from '@/lib/mcp/vercel-client';

const client = getMCPClient();
const result = await client.executeTool('hive', 'getMarketData', {
  symbols: ['SEI']
});
```

### 4. Local Development

For local development with the MCP servers:

1. Start the MCP servers locally:
   ```bash
   ./start-mcp-servers.sh
   ```

2. Run the Next.js dev server:
   ```bash
   npm run dev
   ```

3. The API routes will proxy to `localhost:8765-8767`

### 5. Production Deployment

For production:

1. Deploy MCP servers to a cloud provider (AWS, GCP, etc.)
2. Update Vercel environment variables with production URLs
3. Ensure MCP servers are accessible from Vercel's network
4. Consider using private networking for additional security

## Security Features

1. **API Key Protection**: Keys are stored in Vercel env vars, never exposed
2. **Rate Limiting**: Built-in rate limiting (100 requests/minute per IP)
3. **Input Validation**: All inputs are validated before forwarding
4. **Error Handling**: Errors don't expose sensitive information
5. **HTTPS Only**: All communication is encrypted

## Available Tools

### Hive Intelligence
- `getMarketData` - Real-time market data
- `getSentimentAnalysis` - Market sentiment
- `getPricePredictions` - Price forecasts
- `getTradingSignals` - Trading recommendations
- `getNewsAggregation` - Crypto news
- `getOnChainMetrics` - Blockchain metrics
- `getPortfolioAnalysis` - Portfolio insights

### SEI Blockchain
- `getWalletBalance` - Wallet balances
- `getTransactionHistory` - Transaction history
- `getDeFiPositions` - DeFi positions
- `swapTokens` - Token swaps
- `transferTokens` - Token transfers
- Plus 5 more...

### Portfolio Manager
- `analyzePortfolioComposition` - Portfolio analysis
- `calculateRiskMetrics` - Risk assessment
- `generateRebalancingSuggestions` - Rebalancing
- Plus 5 more...

## Monitoring

Monitor your MCP usage in Vercel:

1. **Function Logs**: View API route execution logs
2. **Analytics**: Track API usage and response times
3. **Error Tracking**: Monitor errors in real-time
4. **Usage Metrics**: Track which tools are used most

## Troubleshooting

### API returns 500 error
- Check Vercel environment variables are set correctly
- Verify MCP servers are running and accessible
- Check Vercel function logs for detailed errors

### Rate limit errors
- Implement client-side throttling
- Consider increasing rate limits for production
- Use caching to reduce API calls

### Connection timeouts
- Ensure MCP servers are accessible from Vercel
- Check firewall rules
- Consider using Vercel's private networking

## Example Implementation

See `/frontend/components/examples/VercelMCPExample.tsx` for a complete example of using the MCP proxy with proper error handling and loading states.