# Vercel Environment Variables Setup

Since you're already deployed on Vercel, here are the environment variables you need to add to your Vercel project.

## Required Environment Variables

Go to your Vercel Dashboard → Project Settings → Environment Variables and add:

### MCP Server Configuration
```
MCP_HIVE_URL=https://your-hive-mcp-server.com
MCP_SEI_URL=https://your-sei-mcp-server.com
MCP_PORTFOLIO_URL=https://your-portfolio-mcp-server.com

HIVE_INTELLIGENCE_API_KEY=your_hive_api_key
SEI_API_KEY=your_sei_api_key
PORTFOLIO_API_KEY=your_portfolio_api_key
```

### Other Required Services
```
OPENAI_API_KEY=sk-your_openai_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
ELEVENLABS_API_KEY=your_elevenlabs_key (if using voice)
```

## Quick Test

After adding the environment variables:

1. Redeploy your project (happens automatically when you save env vars)
2. Test the MCP connection: `GET https://your-app.vercel.app/api/mcp/execute`
3. You should see the health check response showing configured servers

## Using MCP in Your App

```javascript
import { useVercelMCP } from '@/hooks/useVercelMCP';

function MyComponent() {
  const { getMarketData } = useVercelMCP();
  
  const data = await getMarketData(['SEI']);
  // Returns natural language text ready for AI/voice
}
```

That's it! Your MCP integration is ready to use through the Vercel API routes.