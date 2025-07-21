# Hackathon MCP Setup Guide

Quick setup guide for MCP (Model Context Protocol) integration during the hackathon.

## Architecture

```
Frontend (Vercel) → API Routes → MCP Servers
```

All requests go through Vercel API routes to protect API keys and handle CORS.

## Required Environment Variables

Add these to Vercel Dashboard → Settings → Environment Variables:

```bash
# MCP Server URLs (Required)
MCP_HIVE_URL=https://your-hive-mcp-server.com
MCP_SEI_URL=https://your-sei-mcp-server.com  
MCP_PORTFOLIO_URL=https://your-portfolio-mcp-server.com

# API Keys (Required)
HIVE_INTELLIGENCE_API_KEY=your_hive_api_key
SEI_API_KEY=your_sei_api_key
PORTFOLIO_API_KEY=your_portfolio_api_key

# Other Required Keys
OPENAI_API_KEY=sk-your_openai_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Quick Start

1. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

2. **Set Environment Variables**
   - Go to Vercel Dashboard
   - Select your project
   - Settings → Environment Variables
   - Add all required variables above

3. **Test the Integration**
   ```javascript
   // Frontend usage
   import { useVercelMCP } from '@/hooks/useVercelMCP';
   
   const { getMarketData } = useVercelMCP();
   const data = await getMarketData(['SEI']);
   ```

## Available MCP Tools

### Hive Intelligence
- `getMarketData` - Real-time crypto market data
- `getSentimentAnalysis` - Market sentiment analysis
- `getPricePredictions` - AI-powered price predictions
- `getTradingSignals` - Trading recommendations
- `getNewsAggregation` - Crypto news aggregation
- `getOnChainMetrics` - Blockchain analytics
- `getPortfolioAnalysis` - Portfolio insights

### SEI Blockchain
- `getWalletBalance` - Get wallet balances
- `getTransactionHistory` - Transaction history
- `getDeFiPositions` - DeFi positions
- `swapTokens` - Execute token swaps
- `transferTokens` - Transfer tokens
- `getLiquidityPools` - Pool information
- `getStakingInfo` - Staking details
- `getValidatorInfo` - Validator data
- `getProposals` - Governance proposals
- `getTokenInfo` - Token metadata

### Portfolio Manager
- `analyzePortfolioComposition` - Portfolio breakdown
- `getHistoricalPerformance` - Performance history
- `calculateRiskMetrics` - Risk assessment
- `assessLiquidityRisk` - Liquidity analysis
- `generateRebalancingSuggestions` - Rebalancing tips
- `optimizeTaxStrategy` - Tax optimization
- `trackPerformanceMetrics` - Performance tracking
- `generatePerformanceReport` - Detailed reports

## Testing

Visit `/api/mcp/execute` (GET) to check server status:
```json
{
  "status": "ok",
  "servers": {
    "hive": {
      "configured": true,
      "url": "https://your-hive-server.com",
      "tools": 7
    }
  }
}
```

## Example Component

```tsx
import { useVercelMCP } from '@/hooks/useVercelMCP';

function CryptoData() {
  const { getMarketData, loading, error } = useVercelMCP();
  
  const fetchData = async () => {
    const result = await getMarketData(['SEI', 'BTC']);
    console.log(result); // Natural language response
  };
  
  return (
    <button onClick={fetchData} disabled={loading}>
      {loading ? 'Loading...' : 'Get Market Data'}
    </button>
  );
}
```

## Troubleshooting

1. **"MCP server not configured"**
   - Check environment variables in Vercel dashboard
   - Ensure all required URLs and API keys are set

2. **CORS errors**
   - Make sure you're using the Vercel proxy (`/api/mcp`)
   - Don't connect directly to MCP servers from frontend

3. **Rate limiting**
   - Default: 100 requests/minute per IP
   - Implement client-side throttling if needed

## Support

For hackathon support:
- Check API route logs in Vercel dashboard
- Use the health check endpoint to verify configuration
- All responses are formatted as natural language text for easy AI/voice integration