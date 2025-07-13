# AI Adapters Implementation Guide

This document describes the real AI adapter implementations for the Seiron backend.

## Overview

The Seiron backend now includes three real AI adapter implementations:

1. **HiveIntelligenceAdapter** - AI-powered search and analytics using OpenAI
2. **SeiAgentKitAdapter** - Protocol interactions and DeFi operations
3. **SeiMCPAdapter** - Real-time blockchain data via WebSocket

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ HiveIntelligence│     │ SeiAgentKit      │     │ SeiMCP          │
│ Adapter         │     │ Adapter          │     │ Adapter         │
└────────┬────────┘     └────────┬─────────┘     └────────┬────────┘
         │                       │                          │
         │                       │                          │
         └───────────────────────┴──────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │ SeiIntegrationService   │
                    └────────────┬────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │      AIService          │
                    └─────────────────────────┘
```

## Adapter Implementations

### 1. HiveIntelligenceAdapter

Located at: `/backend/src/adapters/HiveIntelligenceAdapter.ts`

**Features:**
- Uses OpenAI GPT-4 for natural language understanding
- Integrates with DexScreener API for real-time token data
- Implements caching for improved performance
- Rate limiting to prevent API abuse

**Configuration:**
```env
OPENAI_API_KEY=your_openai_api_key
HIVE_ENABLED=true
HIVE_BASE_URL=https://api.dexscreener.com/latest
HIVE_RATE_LIMIT=60
HIVE_CACHE_ENABLED=true
HIVE_CACHE_TTL=300000
```

**Methods:**
- `search(query, metadata)` - AI-powered blockchain search
- `getAnalytics(query, metadata)` - Generate analytics and insights
- `installHivePlugin()` - Initialize the adapter
- `getCreditUsage()` - Track API usage

### 2. SeiAgentKitAdapter

Located at: `/backend/src/adapters/SeiAgentKitAdapter.ts`

**Features:**
- Supports both EVM and CosmWasm interfaces
- Real protocol interactions (token transfers, DeFi operations)
- Tool-based architecture for extensibility
- Rate limiting per operation

**Configuration:**
```env
SAK_ENABLED=true
SEI_RPC_URL=https://rpc-testnet.sei.io
SEI_EVM_RPC_URL=https://evm-rpc-testnet.sei.io
SAK_WALLET_PRIVATE_KEY=optional_private_key
SAK_WALLET_MNEMONIC=optional_mnemonic
SAK_RATE_LIMIT=60
```

**Available Tools:**
- `get_native_balance` - Get SEI balance
- `get_token_balance` - Get ERC20/CW20 token balance
- `transfer_token` - Transfer tokens
- `get_liquidity_pools` - Get DEX liquidity pools
- `get_lending_markets` - Get lending market data
- `estimate_swap` - Estimate token swap

### 3. SeiMCPAdapter

Located at: `/backend/src/adapters/SeiMCPAdapter.ts`

**Features:**
- WebSocket connection for real-time updates
- Automatic reconnection with exponential backoff
- Event subscription system
- Response caching for performance

**Configuration:**
```env
MCP_ENABLED=true
MCP_ENDPOINT=localhost
MCP_PORT=8765
MCP_SECURE=false
MCP_API_KEY=optional_api_key
MCP_CONNECTION_TIMEOUT=30000
MCP_HEARTBEAT_INTERVAL=30000
MCP_MAX_RECONNECT_ATTEMPTS=5
```

**Methods:**
- `getBlockchainState()` - Get current blockchain state
- `getWalletBalance(address)` - Get wallet balance
- `subscribeToEvents(types, filters)` - Subscribe to real-time events
- `connectToMCP()` - Establish WebSocket connection
- `disconnectFromMCP()` - Close connection

## Integration with Services

### SeiIntegrationService

The `SeiIntegrationService` orchestrates all three adapters:

```typescript
// Initialize adapters
const adapterInitializer = new AdapterInitializer(adapterConfig);
await adapterInitializer.registerAdapters(seiIntegrationService, aiService);

// Use integrated search
const result = await seiIntegrationService.performIntegratedSearch(
  "Find high yield opportunities",
  walletAddress,
  {
    includeHive: true,
    includeSAK: true,
    includeMCP: true
  }
)();
```

### AIService

The `AIService` can use adapters for enhanced responses:

```typescript
// Process message with adapter data
const response = await aiService.processMessageEnhanced(
  "What's my portfolio performance?",
  walletAddress,
  portfolioData
)();

// Generate enhanced analysis
const analysis = await aiService.generateEnhancedPortfolioAnalysis(
  portfolioData,
  walletAddress,
  {
    includeHiveInsights: true,
    includeSAKData: true,
    includeMCPRealtime: true
  }
)();
```

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

3. **Enable/Disable Adapters**
   Set these in your `.env`:
   - `HIVE_ENABLED=true/false`
   - `SAK_ENABLED=true/false`
   - `MCP_ENABLED=true/false`

4. **Start Server**
   ```bash
   npm run dev
   ```

## Error Handling

All adapters implement comprehensive error handling:

- **Rate Limiting**: Automatic rate limit enforcement
- **Retry Logic**: Configurable retry with exponential backoff
- **Graceful Degradation**: Service continues if adapters fail
- **Logging**: Detailed logging for debugging

## Performance Considerations

1. **Caching**: All adapters implement caching to reduce API calls
2. **Rate Limiting**: Prevents API abuse and ensures reliability
3. **Connection Pooling**: Efficient resource usage
4. **Async Operations**: Non-blocking operations with fp-ts

## Security

1. **API Key Management**: Use environment variables
2. **Input Validation**: All inputs are validated
3. **Error Sanitization**: Sensitive data is not exposed in errors
4. **HTTPS/WSS**: Secure connections in production

## Testing

Run tests for adapters:

```bash
# Unit tests
npm test -- adapters

# Integration tests
npm run test:integration -- adapters

# Test with Docker
npm run docker:test
```

## Monitoring

Adapters emit events for monitoring:

```typescript
// Hive events
hiveAdapter.on('hive:credit:alert', (data) => {
  console.log('Low credits:', data.remainingCredits);
});

// SAK events
sakAdapter.on('sak:operation:completed', (data) => {
  console.log('Operation completed:', data.toolName);
});

// MCP events
mcpAdapter.on('mcp:disconnected', () => {
  console.log('MCP connection lost');
});
```

## Future Enhancements

1. **Additional SAK Tools**: More DeFi protocol integrations
2. **Advanced Hive Analytics**: Machine learning models
3. **MCP Event Processing**: Complex event pattern detection
4. **Cross-Adapter Optimization**: Coordinated operations

## Troubleshooting

### OpenAI API Issues
- Verify `OPENAI_API_KEY` is set correctly
- Check API usage limits
- Monitor rate limiting

### Blockchain Connection Issues
- Verify RPC URLs are accessible
- Check network configuration
- Ensure wallet has sufficient balance for gas

### WebSocket Issues
- Check MCP server is running
- Verify firewall settings
- Monitor connection logs

## Support

For issues or questions:
1. Check adapter logs in `winston` output
2. Review error messages in responses
3. Enable debug logging: `LOG_LEVEL=debug`
4. Check adapter status: `/api/ai/status`